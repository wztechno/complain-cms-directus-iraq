// ------------------------------
// Firebase + Directus auth proxy
// ------------------------------
const http = require('http');
const httpProxy = require('http-proxy');
const admin = require('firebase-admin');
const { URL } = require('url');

// If you're on Node <18, install node-fetch and uncomment the next line:
// const fetch = require('node-fetch');

const serviceAccount = require('./service-account.json');

// ⚠️ Use environment variables in production
const DIRECTUS_STATIC_TOKEN = 'Uzw3ZQDmA6COgqCnJOrjXgqq2X_D0ryL';
const DIRECTUS_URL = 'http://127.0.0.1:8055';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const proxy = httpProxy.createProxyServer({
  target: DIRECTUS_URL,
  changeOrigin: true,
});

// Inject static token for (a) verified restricted requests OR (b) whitelisted public ones
proxy.on('proxyReq', (proxyReq, req) => {
  if (req.__firebaseVerified === true || req.__publicAllowed === true) {
    proxyReq.setHeader('Authorization', `Bearer ${DIRECTUS_STATIC_TOKEN}`);
    if (req.__firebaseUID) proxyReq.setHeader('x-firebase-uid', req.__firebaseUID);
    if (req.__firebaseEmail) proxyReq.setHeader('x-firebase-email', req.__firebaseEmail);
    if (req.__directusUserId) proxyReq.setHeader('x-directus-user-id', String(req.__directusUserId));
  }
});

// ------------------------
// Routing / helper config
// ------------------------

// Paths that require Firebase auth when no Directus session exists
const restrictedPrefixes = [
  '/items/Complaint',
  '/items/Complaint_main_category',
  '/items/Complaint_ratings',
  '/items/Complaint_sub_category',
  '/items/Status_category',
  '/items/Status_subcategory',
  '/items/Governorate',
  '/items/notification_users',
  '/items/device_tokens',
  '/items/notification',
  '/files',
  '/items/users', // users is restricted except POST (see isPublic below)
];

// Public endpoints allowed for any method — but only used when NO bearer or a Firebase bearer is present
const publicAnyMethodPrefixes = [
  '/items/ComplaintTimeline',
  '/items/District',
  '/items/terms_and_conditions',
  '/assets',
  '/items/location',
  '/items/aboutUs',
  '/items/news',
];

// Method-aware public rule: allow POST to /items/users (signup) & /items/device_tokens (FCM) without Firebase
function isPublic(method, url) {
  if (publicAnyMethodPrefixes.some((p) => url.startsWith(p))) return true;
  if (url.startsWith('/items/users') && method.toUpperCase() === 'POST') return true;
  if (url.startsWith('/items/device_tokens') && method.toUpperCase() === 'POST') return true; // ← NEW
  return false;
}

function isRestricted(url) {
  return restrictedPrefixes.some((p) => url.startsWith(p));
}

function getDetailId(url, collection) {
  const u = new URL(url, 'http://placeholder');
  const parts = u.pathname.split('/').filter(Boolean); // ["items","Collection","id", ...]
  if (parts[0] === 'items' && parts[1] === collection && parts.length >= 3) {
    return decodeURIComponent(parts[2]);
  }
  return null;
}

// NEW: dedicated helper for /files/:id
function getFileIdFromPath(url) {
  const u = new URL(url, 'http://placeholder');
  const parts = u.pathname.split('/').filter(Boolean); // ["files","<id>", ...]
  if (parts[0] === 'files' && parts.length >= 2) {
    return decodeURIComponent(parts[1]);
  }
  return null;
}

/** Directus user lookup by email (custom "users" collection) */
async function getDirectusUserIdByEmail(email) {
  const url = `${DIRECTUS_URL}/items/users?filter[email]=${encodeURIComponent(email)}&limit=1`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${DIRECTUS_STATIC_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Directus user lookup failed (${resp.status}): ${text}`);
  }
  const json = await resp.json();
  const row = Array.isArray(json?.data) ? json.data[0] : null;
  return row?.id ?? null;
}

/** Force filter[user]=<id> for list reads on /items/Complaint (collection root only) */
function enforceComplaintUserFilter(originalUrl, userId) {
  const u = new URL(originalUrl, 'http://placeholder');
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] === 'items' && parts[1] === 'Complaint' && parts.length === 2) {
    u.searchParams.set('filter[user]', String(userId));
  }
  return u.pathname + (u.search ? u.search : '');
}

/** Force filter[id]=<id> on /items/users list GET so only self is returned */
function enforceUsersSelfFilter(originalUrl, userId) {
  const u = new URL(originalUrl, 'http://placeholder');
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] === 'items' && parts[1] === 'users' && parts.length === 2) {
    u.searchParams.set('filter[id]', String(userId));
    u.searchParams.set('limit', '1');
  }
  return u.pathname + (u.search ? u.search : '');
}

/** Validate that complaint :id belongs to the user, using a safe pre-check */
async function complaintBelongsToUser(complaintId, userId) {
  const url = `${DIRECTUS_URL}/items/Complaint?filter[id][_eq]=${encodeURIComponent(
    complaintId
  )}&filter[user][_eq]=${encodeURIComponent(userId)}&limit=1`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${DIRECTUS_STATIC_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) return false;
  const json = await resp.json();
  return Array.isArray(json?.data) && json.data.length === 1;
}

// ------------------------
// NEW: Notification helpers
// ------------------------

/** Force filter[users][users_id][_eq]=<id> for /items/notification list GETs */
function enforceNotificationUserFilter(originalUrl, userId) {
  const u = new URL(originalUrl, 'http://placeholder');
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] === 'items' && parts[1] === 'notification' && parts.length === 2) {
    u.searchParams.set('filter[users][users_id][_eq]', String(userId));
  }
  return u.pathname + (u.search ? u.search : '');
}

/** Validate notification :id includes the user via pivot relation */
async function notificationBelongsToUser(notificationId, userId) {
  const url = `${DIRECTUS_URL}/items/notification?filter[id][_eq]=${encodeURIComponent(
    notificationId
  )}&filter[users][users_id][_eq]=${encodeURIComponent(userId)}&limit=1`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${DIRECTUS_STATIC_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) return false;
  const json = await resp.json();
  return Array.isArray(json?.data) && json.data.length === 1;
}

// ------------------------
// NEW: Device-tokens helpers
// ------------------------

/** Force filter[user_id][_eq]=<id> for /items/device_tokens list GETs */
function enforceDeviceTokensUserFilter(originalUrl, userId) {
  const u = new URL(originalUrl, 'http://placeholder');
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] === 'items' && parts[1] === 'device_tokens' && parts.length === 2) {
    u.searchParams.set('filter[user_id][_eq]', String(userId)); // ← FIXED
  }
  return u.pathname + (u.search ? u.search : '');
}

/** Validate device_tokens :id belongs to the user (expects field "user_id") */
async function deviceTokenBelongsToUser(tokenId, userId) {
  const url = `${DIRECTUS_URL}/items/device_tokens?filter[id][_eq]=${encodeURIComponent(
    tokenId
  )}&filter[user_id][_eq]=${encodeURIComponent(userId)}&limit=1`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${DIRECTUS_STATIC_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) return false;
  const json = await resp.json();
  return Array.isArray(json?.data) && json.data.length === 1;
}

// ------------------------
// NEW: Complaint_ratings helpers
// ------------------------

/** Force filter[user][_eq]=<id> for /items/Complaint_ratings list GETs */
function enforceComplaintRatingsUserFilter(originalUrl, userId) {
  const u = new URL(originalUrl, 'http://placeholder');
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] === 'items' && parts[1] === 'Complaint_ratings' && parts.length === 2) {
    u.searchParams.set('filter[user][_eq]', String(userId));
  }
  return u.pathname + (u.search ? u.search : '');
}

/** Validate Complaint_ratings :id belongs to the user (expects field "user") */
async function complaintRatingBelongsToUser(ratingId, userId) {
  const url = `${DIRECTUS_URL}/items/Complaint_ratings?filter[id][_eq]=${encodeURIComponent(
    ratingId
  )}&filter[user][_eq]=${encodeURIComponent(userId)}&limit=1`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${DIRECTUS_STATIC_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) return false;
  const json = await resp.json();
  return Array.isArray(json?.data) && json.data.length === 1;
}

// ------------------------
// NEW: Files helpers (restrict /files to assets referenced by caller's complaints)
// ------------------------

/** Collect all file IDs referenced by the user's complaints in fields: image, voice, video, file */
async function getUserComplaintFileIds(userId) {
  const url =
    `${DIRECTUS_URL}/items/Complaint` +
    `?filter[user][_eq]=${encodeURIComponent(userId)}` +
    `&fields[]=image&fields[]=voice&fields[]=video&fields[]=file` +
    `&limit=-1`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${DIRECTUS_STATIC_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    return new Set();
  }
  const json = await resp.json();
  const set = new Set();
  const rows = Array.isArray(json?.data) ? json.data : [];
  for (const r of rows) {
    for (const key of ['image', 'voice', 'video', 'file']) {
      const v = r?.[key];
      if (!v) continue;
      // Support both single file id and arrays (just in case)
      if (Array.isArray(v)) {
        v.forEach((id) => id && set.add(String(id)));
      } else {
        set.add(String(v));
      }
    }
  }
  return set;
}

/** Force filter[id][_in]=<csv> for /files list GET */
function enforceFilesIdsFilter(originalUrl, idsSet) {
  const u = new URL(originalUrl, 'http://placeholder');
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] === 'files' && parts.length === 1) {
    const ids = [...idsSet];
    if (ids.length > 0) {
      u.searchParams.set('filter[id][_in]', ids.join(','));
    } else {
      // ensure empty result deterministically
      u.searchParams.set('filter[id][_eq]', '__no_access__');
    }
  }
  return u.pathname + (u.search ? u.search : '');
}

/** Validate a single file id is referenced by one of the user's complaints */
async function fileBelongsToUser(fileId, userId) {
  const url =
    `${DIRECTUS_URL}/items/Complaint?` +
    `filter[user][_eq]=${encodeURIComponent(userId)}` +
    `&filter[_or][0][image][_eq]=${encodeURIComponent(fileId)}` +
    `&filter[_or][1][voice][_eq]=${encodeURIComponent(fileId)}` +
    `&filter[_or][2][video][_eq]=${encodeURIComponent(fileId)}` +
    `&filter[_or][3][file][_eq]=${encodeURIComponent(fileId)}` +
    `&limit=1&fields[]=id`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${DIRECTUS_STATIC_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) return false;
  const json = await resp.json();
  return Array.isArray(json?.data) && json.data.length === 1;
}

// ------------------------
// Server
// ------------------------

const server = http.createServer(async (req, res) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers':
        req.headers['access-control-request-headers'] || 'content-type,authorization',
      'Access-Control-Allow-Credentials': 'true',
    });
    return res.end();
  }

  const url = req.url || '';
  const method = (req.method || 'GET').toUpperCase();
  const hasDirectusCookie = (req.headers.cookie || '').includes('directus_session_token');

  // Peek at any incoming bearer token once, up-front
  const authHeaderRaw = req.headers.authorization || '';
  const incomingBearer = authHeaderRaw.replace(/^Bearer\s+/i, '').trim();

  const passthrough = () =>
    proxy.web(req, res, {}, (err) => {
      console.error('Proxy error:', err?.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad gateway' }));
    });

  // 0) If a Directus session cookie already exists, just proxy (CMS UI)
  if (hasDirectusCookie) {
    return passthrough();
  }

  // 0.1) Distinguish bearer types early:
  //  - No bearer    -> mode 'none'
  //  - Firebase     -> mode 'firebase'
  //  - Not Firebase -> assume Directus/PAT -> BYPASS (passthrough) immediately
  let authMode = 'none'; // 'none' | 'firebase'
  let decoded = null;
  let email = null;

  if (incomingBearer && incomingBearer !== DIRECTUS_STATIC_TOKEN) {
    try {
      decoded = await admin.auth().verifyIdToken(incomingBearer);
      email = decoded.email || null;
      authMode = 'firebase';
    } catch {
      // Not a Firebase token → assume Directus token, bypass entirely
      return passthrough();
    }
  }

  // 1) Public endpoints are allowed ONLY if:
  //    - authMode === 'none'  (no bearer), OR
  //    - authMode === 'firebase' (valid Firebase bearer).
  //    Directus bearer never reaches this branch (already bypassed above).
  if (isPublic(method, url) && (authMode === 'none' || authMode === 'firebase')) {
    req.__publicAllowed = true;
    req.headers.authorization = `Bearer ${DIRECTUS_STATIC_TOKEN}`;
    // If Firebase, we can also pass identity hints downstream (optional)
    if (authMode === 'firebase') {
      req.__firebaseVerified = true;
      req.__firebaseUID = decoded.uid;
      req.__firebaseEmail = email || '';
      req.headers['x-firebase-uid'] = decoded.uid;
      if (email) req.headers['x-firebase-email'] = email;
    }
    return passthrough();
  }

  // 2) Non-restricted endpoints → passthrough unchanged
  if (!isRestricted(url)) {
    return passthrough();
  }

  // 3) Restricted path without session/cookie:
  //    - If we don't have Firebase auth, reject
  if (authMode !== 'firebase') {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'No token provided or invalid token' }));
  }

  // 4) Map Firebase user → Directus user
  if (!email) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'No email in Firebase token' }));
  }

  let directusUserId;
  try {
    directusUserId = await getDirectusUserIdByEmail(email);
    if (!directusUserId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'No Directus user found for this email' }));
    }
  } catch (e) {
    console.error('Firebase->Directus mapping failed:', e?.message);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid token or user mapping failed' }));
  }

  // Mark for proxyReq hook and ensure Directus sees only the static token
  req.__firebaseVerified = true;
  req.__firebaseUID = decoded.uid;
  req.__firebaseEmail = email;
  req.__directusUserId = directusUserId;
  req.headers.authorization = `Bearer ${DIRECTUS_STATIC_TOKEN}`;
  req.headers['x-firebase-uid'] = decoded.uid;
  req.headers['x-firebase-email'] = email;
  req.headers['x-directus-user-id'] = String(directusUserId);

  // 5) Enforcement rules
  try {
    // (a) /items/users → GET list must return only self; detail must match self
    if (url.startsWith('/items/users') && method === 'GET') {
      const idInPath = getDetailId(url, 'users');
      if (idInPath) {
        if (String(idInPath) !== String(directusUserId)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Forbidden: not your user record' }));
        }
        // OK → pass through as-is
      } else {
        // list → force filter[id]=<directusUserId> & limit=1
        req.url = enforceUsersSelfFilter(url, directusUserId);
      }
    }

    // (b) /items/Complaint → list enforced; detail must belong to caller
    if (url.startsWith('/items/Complaint') && method === 'GET') {
      const complaintId = getDetailId(url, 'Complaint');
      if (complaintId) {
        const ok = await complaintBelongsToUser(complaintId, directusUserId);
        if (!ok) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Forbidden: complaint does not belong to you' }));
        }
      } else {
        // list → always enforce owner filter
        req.url = enforceComplaintUserFilter(url, directusUserId);
      }
    }

    // (c) /items/notification → list filtered by pivot; detail must include caller
    if (url.startsWith('/items/notification') && method === 'GET') {
      const notifId = getDetailId(url, 'notification');
      if (notifId) {
        const ok = await notificationBelongsToUser(notifId, directusUserId);
        if (!ok) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Forbidden: notification not addressed to you' }));
        }
      } else {
        // list → force filter[users][users_id][_eq]=<directusUserId>
        req.url = enforceNotificationUserFilter(url, directusUserId);
      }
    }

    // (d) /items/device_tokens → list filtered by user_id; detail must belong to caller
    if (url.startsWith('/items/device_tokens') && method === 'GET') {
      const tokenId = getDetailId(url, 'device_tokens');
      if (tokenId) {
        const ok = await deviceTokenBelongsToUser(tokenId, directusUserId);
        if (!ok) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Forbidden: device token not yours' }));
        }
      } else {
        // list → force filter[user_id][_eq]=<directusUserId>
        req.url = enforceDeviceTokensUserFilter(url, directusUserId);
      }
    }

    // (e) /items/Complaint_ratings → list filtered by user; detail must belong to caller
    if (url.startsWith('/items/Complaint_ratings') && method === 'GET') {
      const ratingId = getDetailId(url, 'Complaint_ratings');
      if (ratingId) {
        const ok = await complaintRatingBelongsToUser(ratingId, directusUserId);
        if (!ok) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Forbidden: rating does not belong to you' }));
        }
      } else {
        // list → force filter[user][_eq]=<directusUserId>
        req.url = enforceComplaintRatingsUserFilter(url, directusUserId);
      }
    }

    // (f) /files → list restricted to assets referenced by caller's complaints; detail must be referenced
    if (url.startsWith('/files') && method === 'GET') {
      const fileId = getFileIdFromPath(url);
      if (fileId) {
        const ok = await fileBelongsToUser(fileId, directusUserId);
        if (!ok) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Forbidden: file not associated with your complaints' }));
        }
        // OK → pass through as-is
      } else {
        // list → compute allowed IDs and enforce filter[id][_in]=...
        const idsSet = await getUserComplaintFileIds(directusUserId);
        req.url = enforceFilesIdsFilter(url, idsSet);
      }
    }

    // 6) Proxy after enforcement
    return passthrough();
  } catch (err) {
    console.error('Auth/Filter failed:', err?.message);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid token or user mapping failed' }));
  }
});

server.listen(3000, () => {
  console.log('Proxy server running on port 3000');
});