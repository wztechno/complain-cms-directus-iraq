import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7CWGbsbVSHaBJHKp8hlUp8iBO3tYeE28",
  authDomain: "complain-app-iraq.firebaseapp.com",
  projectId: "complain-app-iraq",
  storageBucket: "complain-app-iraq.firebasestorage.app",
  messagingSenderId: "24329536049",
  appId: "1:24329536049:web:423ac43f38e64f92914b10"
};

// Validate Firebase configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

if (missingFields.length > 0) {
  console.error('Missing Firebase configuration fields:', missingFields);
  throw new Error(`Missing Firebase configuration: ${missingFields.join(', ')}`);
}


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Set language to Arabic for Firebase Auth
auth.languageCode = 'ar';

export default app; 