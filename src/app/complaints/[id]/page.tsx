/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/api";
import {
  getUserPermissions,
  hasPermission,
  complaintMatchesPermissions,
} from "@/utils/permissions";
import ComplaintMedia from "@/components/ComplaintMedia";
import ComplaintPercentageCalculator from "./ComplaintPercentageCalculator";
import PermissionGuard from "@/components/PermissionGuard";

/*************************
 * Helpers & Type Aliases *
 *************************/

const getMediaUrl = (fileId: string, fileType: string): string => {
  const token = localStorage.getItem("auth_token");
  if (!token) return "";
  const baseUrl = `https://complaint.top-wp.com/assets/${fileId}`;

  // First check for image files
  if (fileType.startsWith("image/")) {
    return `${baseUrl}?access_token=${token}`;
  }

  // Then check for PDF and document files
  if (
    fileType.startsWith("application/pdf") ||
    fileType.includes("word") ||
    fileType.includes("pdf")
  ) {
    return `${baseUrl}?access_token=${token}`;
  }

  // Handle audio files
  if (fileType.startsWith("audio/")) {
    return `${baseUrl}?download=true&access_token=${token}&t=${Date.now()}`;
  }

  // Handle video files
  if (fileType.startsWith("video/")) {
    return `${baseUrl}?access_token=${token}`;
  }

  // Default case for other file types
  return `${baseUrl}?download=true&access_token=${token}`;
};

interface MediaFileBase {
  id: string;
  filename_download: string;
  title?: string;
  filesize?: number;
  src: string;
}
interface ImageFile extends MediaFileBase {
  type: "image";
  width?: number;
  height?: number;
}
interface VideoFile extends MediaFileBase {
  type: "video";
  duration?: number;
}
interface AudioFile extends MediaFileBase {
  type: "audio";
  duration?: number;
}
interface FileFile extends MediaFileBase {
  type: "file";
}

type AnyMedia = ImageFile | VideoFile | AudioFile | FileFile;

interface ComplaintData {
  id: number;
  title: string;
  description: string;
  Service_type: string;
  governorate_name: string;
  street_name_or_number: string;
  status_subcategory: number | null;
  Complaint_Subcategory: number | null;
  district: number | null;
  completion_percentage: number;
  note?: string;
  user?: { full_name: string };
  image?: string | null;
  video?: string | null;
  voice?: string | null;
  files?: string[] | string | null;
  file?: string[] | string | null;
  images?: ImageFile[];
  videos?: VideoFile[];
  audios?: AudioFile[];
  processedFiles?: FileFile[];
  status?: 'قيد المراجعة' | 'منجزة';
  location?: {
    id: number;
    latitude: number;
    longitude: number;
    city: string;
    district: string;
    district_id: number | null;
  };

  [key: string]: unknown;
}

interface SelectOptions {
  [key: string]: string;
}

/** Fetch meta for a single Directus file and convert → MediaFile object */
const mapFileToMedia = async (
  fileId: string,
  explicitType?: "image" | "video" | "audio" | "file"
): Promise<AnyMedia | undefined> => {
  const res = await fetchWithAuth(`/files/${fileId}`);
  if (!res?.data) return;
  const f = res.data;

  // Get file extension and mime type
  const extension = f.filename_download.toLowerCase().split('.').pop();
  const mimeType = f.type?.toLowerCase() || '';

  const common = {
    id: f.id,
    filename_download: f.filename_download,
    title: f.title || f.filename_download,
    filesize: parseInt(f.filesize || "0", 10),
    src: getMediaUrl(f.id, f.type),
  } as const;

  // If explicit type is provided, use it
  if (explicitType) {
    switch (explicitType) {
      case "image":
        return { type: "image", width: f.width, height: f.height, ...common };
      case "video":
        return { type: "video", duration: f.duration, ...common };
      case "audio":
        return { type: "audio", duration: f.duration, ...common };
      default:
        return { type: "file", ...common };
    }
  }

  // Check MIME type first
  if (mimeType.startsWith('image/')) {
    return { type: "image", width: f.width, height: f.height, ...common };
  }
  if (mimeType.startsWith('video/')) {
    return { type: "video", duration: f.duration, ...common };
  }
  if (mimeType.startsWith('audio/')) {
    return { type: "audio", duration: f.duration, ...common };
  }

  // Fallback to extension check
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  const videoExts = ['mp4', 'webm', 'ogg', 'mov'];
  const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];

  if (imageExts.includes(extension)) {
    return { type: "image", width: f.width, height: f.height, ...common };
  }
  if (videoExts.includes(extension)) {
    return { type: "video", duration: f.duration, ...common };
  }
  if (audioExts.includes(extension)) {
    return { type: "audio", duration: f.duration, ...common };
  }

  // Default to file type
  return { type: "file", ...common };
};

const unique = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

/*********************************
 * Presentational helper component
 *********************************/
const Field: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 text-right mb-1">
      {label}
    </label>
    <div className="bg-gray-100 p-2 rounded text-right">{value ?? "—"}</div>
  </div>
);

/*****************
 * Main Component *
 *****************/

export default function ComplaintPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<ComplaintData | null>(null);
  const [statusOptions] = useState<SelectOptions>({
    'قيد المراجعة': 'قيد المراجعة',
    'منجزة': 'منجزة'
  });

  const [districts, setDistricts] = useState<SelectOptions>({});
  const [subcategoryStatusOptions, setSubcategoryStatusOptions] = useState<SelectOptions>({});
  const [complaintSubcats, setComplaintSubcats] = useState<SelectOptions>({});
  const [nextStatusOptions, setNextStatusOptions] = useState<SelectOptions>({});

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<
    Partial<ComplaintData & { is_done?: boolean }>
  >({});

  const [statusIsDone, setStatusIsDone] = useState(false);
  const [timelineId, setTimelineId] = useState<number | null>(null);

  /***********************
   * Data-loading helpers *
   ***********************/
  const fetchStatusSubcategory = useCallback(async (id: number) => {
    const res = await fetch(
      `https://complaint.top-wp.com/items/Status_subcategory/${id}?fields=*,nextstatus.*`
    ).then((r) => r.json());
    return res?.data as
      | undefined
      | { id: number; name: string; done?: boolean; nextstatus?: any };
  }, []);

  const fetchComplaintData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      /* 1️⃣ Permission check */
      const userPerms = await getUserPermissions();
      if (!hasPermission(userPerms, "Complaint", "read")) {
        setError("ليس لديك صلاحية لعرض هذه الشكوى");
        return;
      }

      /* 2️⃣ Core complaint */
      const compRes = await fetch(
        `https://complaint.top-wp.com/items/Complaint/${params.id}?fields=*,user.*,location.*`
      ).then((r) => r.json());
      if (!compRes?.data) throw new Error("Complaint not found");

      if (!complaintMatchesPermissions(compRes.data, userPerms as unknown as any[])) {
        setError("ليس لديك صلاحية لعرض هذه الشكوى");
        return;
      }
      const core: ComplaintData = compRes.data;

      /* 3️⃣ Parallel look-ups including location */
      const [districtsRes, statusSubRes, complaintSubRes] = await Promise.all([
        fetch("https://complaint.top-wp.com/items/District").then((r) => r.json()),
        fetch(
          `https://complaint.top-wp.com/items/Status_subcategory?filter[complaint_subcategory][_eq]=${core.complaint_subcategory}&filter[district][_eq]=${core.district}`
        ).then((r) => r.json()),
        fetch("https://complaint.top-wp.com/items/Complaint_sub_category").then((r) => r.json())
      ]);

      /* 3-A 👉  if complaint has NO status yet, show them *all* valid ones */
      if (core.status_subcategory == null) {
        setNextStatusOptions(
          Object.fromEntries(statusSubRes.data.map((s: any) => [s.id, s.name]))
        );
      }

      /* 4️⃣ Media */
      const mediaIds: string[] = unique([
        core.image,
        core.video,
        core.voice,
        ...(Array.isArray(core.files) ? core.files : core.files ? [core.files] : []),
        ...(Array.isArray(core.file) ? core.file : core.file ? [core.file] : []),
      ].filter(Boolean) as string[]);

      const mediaObjects = await Promise.all(mediaIds.map(async (id) => {
        // Try to determine the type based on the source field
        let explicitType: "image" | "video" | "audio" | "file" | undefined;
        if (id === core.image) explicitType = "image";
        if (id === core.video) explicitType = "video";
        if (id === core.voice) explicitType = "audio";
        
        return mapFileToMedia(id, explicitType);
      }));

      const images = mediaObjects.filter((m): m is ImageFile => m?.type === "image");
      const videos = mediaObjects.filter((m): m is VideoFile => m?.type === "video");
      const audios = mediaObjects.filter((m): m is AudioFile => m?.type === "audio");
      const files = mediaObjects.filter((m): m is FileFile => m?.type === "file");

      /* 5️⃣ Status done + next status when we *do* have one */
      let doneFlag = false;
      if (core.status_subcategory) {
        const statusData = await fetchStatusSubcategory(core.status_subcategory);
        doneFlag = !!statusData?.done;
        if (statusData?.nextstatus)
          setNextStatusOptions({ [statusData.nextstatus.id]: statusData.nextstatus.name });
      }

      /* 6️⃣ Timeline id */
      const tlRes = await fetch(
        `https://complaint.top-wp.com/items/ComplaintTimeline?fields=id&filter[complaint_id][_eq]=${params.id}`
      ).then((r) => r.json());
      const tlId = tlRes?.data?.[0]?.id ?? null;

      /* 7️⃣ Commit state */
      setComplaint({
        ...core,
        images,
        videos,
        audios,
        processedFiles: files,
        location: core.location // Use the location directly from core data
      });
      setDistricts(Object.fromEntries(districtsRes.data.map((d: any) => [d.id, d.name])));
      setSubcategoryStatusOptions(Object.fromEntries(statusSubRes.data.map((s: any) => [s.id, s.name])));
      if (complaintSubRes?.data) {
        setComplaintSubcats(Object.fromEntries(complaintSubRes.data.map((s: any) => [s.id, s.name])));
      }
      setStatusIsDone(doneFlag);
      setTimelineId(tlId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ أثناء تحميل الشكوى");
    } finally {
      setLoading(false);
    }
  }, [params.id, fetchStatusSubcategory]);

  useEffect(() => {
    fetchComplaintData();
  }, [fetchComplaintData]);

  /************************
   * Handlers (save/delete) *
   ************************/

  const handleSave = async () => {
    if (!complaint) return;
    setUpdating(true);
    try {
      // Calculate the new percentage first
      const compRes = await fetch(
        `https://complaint.top-wp.com/items/Complaint/${complaint.id}`
      ).then((r) => r.json());
      if (!compRes?.data) throw new Error("Could not fetch complaint data");
      
      const districtId = compRes.data.district;
      const subCatId = compRes.data.Complaint_Subcategory ?? compRes.data.complaint_subcategory;

      // Fetch all the data needed for percentage calculation
      const [catRes, timelineRes, subRes] = await Promise.all([
        fetch("https://complaint.top-wp.com/items/Status_category?sort=id").then((r) => r.json()),
        fetch(
          `https://complaint.top-wp.com/items/ComplaintTimeline?filter[complaint_id][_eq]=${complaint.id}`
        ).then((r) => r.json()),
        fetch(
          `https://complaint.top-wp.com/items/Status_subcategory?filter[district][_eq]=${districtId}${
            subCatId ? `&filter[complaint_subcategory][_eq]=${subCatId}` : ""
          }&fields=*,status_category.*`
        ).then((r) => r.json()),
      ]);

      const categories = catRes.data ?? [];
      const timeline = timelineRes.data ?? [];
      const allSubs = subRes.data ?? [];

      // Calculate done steps
      const doneIds = new Set<string>();
      timeline.forEach((t: any) => {
        const id = typeof t.status_subcategory === "object" ? t.status_subcategory.id : t.status_subcategory;
        if (id != null) doneIds.add(String(id));
      });
      // Add the new status we're saving
      if (editForm.status_subcategory) {
        doneIds.add(String(editForm.status_subcategory));
      }

      // Group by category
      const byCat: Record<number, any[]> = {};
      allSubs.forEach((s: any) => {
        const catId = typeof s.status_category === "object" ? s.status_category.id : s.status_category;
        if (!byCat[catId]) byCat[catId] = [];
        byCat[catId].push(s);
      });

      // Calculate total steps and done steps
      let totalSteps = 0;
      let totalDone = 0;
      categories.forEach((cat: any) => {
        const subs = byCat[cat.id] ?? [];
        const doneCount = subs.filter((s) => doneIds.has(String(s.id))).length;
        totalSteps += subs.length;
        totalDone += doneCount;
      });

      const newPercentage = totalSteps ? Math.round((totalDone / totalSteps) * 100) : 0;

      // Update everything in one request
      const updateBody: any = {
        status_subcategory: editForm.status_subcategory,
        note: editForm.note,
        completion_percentage: newPercentage,
        status: editForm.status,
      };

      await fetch(`https://complaint.top-wp.com/items/Complaint/${complaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateBody),
      });

      // Only try to update the status_subcategory done field if we have admin permissions
      if (editForm.status_subcategory && editForm.is_done !== undefined) {
        try {
          const perms = await getUserPermissions();
          if (hasPermission(perms, "Status_subcategory", "update")) {
            await fetch(`https://complaint.top-wp.com/items/Status_subcategory/${editForm.status_subcategory}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ done: editForm.is_done }),
            });
          }
        } catch (e) {
          // Silently handle permission errors - the main status update still worked
          console.warn("Unable to update status_subcategory done field:", e);
        }
      }

      // After successful update, update the local state
      setComplaint(prev => prev ? {
        ...prev,
        status_subcategory: editForm.status_subcategory || null,
        note: editForm.note || "",
        completion_percentage: newPercentage,
        status: editForm.status || prev.status
      } : null);

      alert("تم تحديث حالة الشكوى بنجاح");
      setIsEditing(false);
      
      // Refresh the data to ensure everything is in sync
      await fetchComplaintData();
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء تحديث حالة الشكوى");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!complaint) return;
    const perms = await getUserPermissions();
    if (!hasPermission(perms, "Complaint", "delete")) {
      alert("ليس لديك صلاحية لحذف هذه الشكوى");
      return;
    }
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذه الشكوى؟")) return;

    setUpdating(true);
    try {
      const res = await fetch(`https://complaint.top-wp.com/items/Complaint/${complaint.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);

      alert("تم حذف الشكوى بنجاح");
      router.push("/complaints");
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء حذف الشكوى");
    } finally {
      setUpdating(false);
    }
  };

  /************
   * Render   *
   ***********/
console.log("locations", complaint?.location);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64 flex justify-center items-center">
        <div className="text-xl text-gray-600">جاري تحميل البيانات...</div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold text-red-500 text-center mb-4">{error}</h2>
          <div className="flex justify-center">
            <button
              onClick={() => router.push("/complaints")}
              className="bg-[#4664AD] text-white px-4 py-2 rounded-lg"
            >
              العودة إلى الشكاوى
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <PermissionGuard
      requiredPermissions={[{ resource: 'Complaint', action: 'read' }]}
      complaintData={complaint || undefined}
    >
      <div className="min-h-screen bg-gray-100 p-8 mr-64">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">تفاصيل الشكوى</h1>
          <div className="flex gap-3">
            {!isEditing && (
              <button
                onClick={handleDelete}
                disabled={updating}
                className={`bg-red-600 text-white px-4 py-2 rounded-lg ${
                  updating ? "opacity-70 cursor-not-allowed" : "hover:bg-red-700"
                }`}
              >
                {updating ? "جاري الحذف..." : "حذف الشكوى"}
              </button>
            )}
            <button
              onClick={() => {
                if (isEditing) return handleSave();
                setEditForm({
                  status_subcategory: complaint?.status_subcategory || undefined,
                  completion_percentage: complaint?.completion_percentage ?? 0,
                  note: complaint?.note ?? "",
                  is_done: statusIsDone,
                });
                setIsEditing(true);
              }}
              disabled={updating}
              className={`bg-[#4664AD] text-white px-4 py-2 rounded-lg ${
                updating ? "opacity-70 cursor-not-allowed" : "hover:bg-[#3a5499]"
              }`}
            >
              {updating ? "جاري الحفظ..." : isEditing ? "حفظ تغيير الحالة" : "تغيير الحالة"}
            </button>
          </div>
        </div>

        {/* Form / View */}
        {isEditing ? (
          <EditForm
            complaint={complaint!}
            districts={districts}
            complaintSubcats={complaintSubcats}
            nextStatusOpts={nextStatusOptions}
            editForm={editForm}
            setEditForm={setEditForm}
            onStatusChange={async (id) => {
              if (!id) return setNextStatusOptions({});
              const stat = await fetchStatusSubcategory(id);
              if (stat?.nextstatus)
                setNextStatusOptions({ [stat.nextstatus.id]: stat.nextstatus.name });
              setEditForm((p) => ({ ...p, is_done: stat?.done ?? false }));
            }}
            statusOptions={statusOptions}
          />
        ) : (
          <DisplayCard
            complaint={complaint!}
            districts={districts}
            complaintSubcats={complaintSubcats}
            statusOpts={subcategoryStatusOptions}
            timelineId={timelineId}
            statusOptions={statusOptions}
          />
        )}

        {/* Media */}
        <div className="bg-white rounded-lg p-6 shadow mt-6">
          <h2 className="text-xl font-bold mb-4 text-right">المرفقات والوسائط</h2>
          <ComplaintMedia
            images={complaint?.images}
            videos={complaint?.videos}
            audios={complaint?.audios}
            files={complaint?.processedFiles}
          />
        </div>
      </div>
    </PermissionGuard>
  );
}

/****************************
 * Sub-components (Edit/View)
 ***************************/

const EditForm: React.FC<{
  complaint: ComplaintData;
  districts: SelectOptions;
  complaintSubcats: SelectOptions;
  nextStatusOpts: SelectOptions;
  editForm: Partial<ComplaintData & { is_done?: boolean }>;
  setEditForm: React.Dispatch<
    React.SetStateAction<Partial<ComplaintData & { is_done?: boolean }>>
  >;
  onStatusChange: (id: number) => void;
  statusOptions: SelectOptions;
}> = ({
  complaint,
  districts,
  complaintSubcats,
  nextStatusOpts,
  editForm,
  setEditForm,
  onStatusChange,
  statusOptions,
}) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow space-y-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
        {/* Static fields */}
        <Field label="عنوان الشكوى" value={complaint.title} />
        <Field label="نوع الخدمة" value={complaint.Service_type} />
        <Field label="المحافظة" value={districts[complaint.district || 0]} />
        <Field label="القضاء" value={complaint.governorate_name} />
        <Field label="رقم أو اسم الشارع" value={complaint.street_name_or_number} />
        <Field
          label="الفئة الفرعية للشكوى"
          value={complaintSubcats[complaint.Complaint_Subcategory || 0]}
        />

        {/* Status dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 text-right mb-1">
            حالة الشكوى
          </label>
          <select
            value={editForm.status ?? ""}
            onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as ComplaintData['status'] }))}
            className="w-full border border-gray-300 p-2 rounded text-right"
          >
            <option value="">اختر الحالة</option>
            {Object.entries(statusOptions).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Location display (read-only) */}
        {complaint.location && (
          <Field
            label="الموقع"
            value={`${complaint.location.city} (${complaint.location.latitude}, ${complaint.location.longitude})`}
          />
        )}

        {/* Editable status subcategory */}
        <div>
          <label className="block text-sm font-medium text-gray-700 text-right mb-1">
            الفئة الفرعية للحالة
          </label>
          <select
            value={editForm.status_subcategory ?? ""}
            onChange={(e) => {
              const newVal = e.target.value ? Number(e.target.value) : undefined;
              if (newVal) onStatusChange(newVal);
              setEditForm((p) => ({ ...p, status_subcategory: newVal }));
            }}
            className="w-full border border-gray-300 p-2 rounded text-right"
          >
            <option value="">اختر الحالة</option>
            {Object.entries(nextStatusOpts).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          {/* Toggle done */}
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 text-right">
                هل تم الانتهاء من هذه الحالة؟
              </label>
              <div className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  id="statusDoneToggle"
                  checked={!!editForm.is_done}
                  disabled={!editForm.status_subcategory}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, is_done: e.target.checked }))
                  }
                  className="opacity-0 w-0 h-0"
                />
                <label
                  htmlFor="statusDoneToggle"
                  className={`absolute cursor-pointer inset-0 rounded-full transition ${
                    editForm.status_subcategory
                      ? editForm.is_done
                        ? "bg-green-500"
                        : "bg-gray-300"
                      : "bg-gray-200 cursor-not-allowed"
                  }`}
                >
                  <span
                    className={`absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition ${
                      editForm.is_done ? "translate-x-6" : ""
                    }`}
                  />
                </label>
              </div>
            </div>
            <p className="text-sm text-gray-500 text-right mt-1">
              {editForm.is_done ? "نعم، الحالة مكتملة" : "لا، الحالة قيد المعالجة"}
            </p>
          </div>
        </div>

        {/* Auto percentage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 text-right mb-1">
            نسبة الإنجاز (تُحدّث تلقائياً)
          </label>
          <ComplaintPercentageCalculator complaintId={complaint.id} />
        </div>

        {/* Description / Note */}
        <div className="md:col-span-2">
          <Field label="وصف الشكوى" value={complaint.description} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 text-right mb-1">
            ملاحظة
          </label>
          <textarea
            value={editForm.note ?? ""}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, note: e.target.value }))
            }
            className="w-full border border-gray-300 p-2 rounded text-right min-h-[6rem]"
          />
        </div>
      </div>
    </div>
  );
};


const DisplayCard: React.FC<{
  complaint: ComplaintData;
  districts: SelectOptions;
  complaintSubcats: SelectOptions;
  statusOpts: SelectOptions;
  timelineId: number | null;
  statusOptions: SelectOptions;
}> = ({
  complaint,
  districts,
  complaintSubcats,
  statusOpts,
  timelineId,
  statusOptions,
}) => {
  const router = useRouter();
  
  return (
    <div className="bg-white rounded-lg p-6 shadow space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
        <Field label="الرقم" value={complaint.id} />
        <Field label="عنوان الشكوى" value={complaint.title} />
        <Field label="وصف الشكوى" value={complaint.description} />
        <Field label="نوع الخدمة" value={complaint.Service_type} />
        <Field label="المحافظة" value={districts[complaint.district || 0]} />
        <Field label="المواطن" value={complaint.user?.full_name} />
        <Field label="رقم أو اسم الشارع" value={complaint.street_name_or_number} />
        <Field label="القضاء" value={complaint.governorate_name} />
        <Field
          label="الفئة الفرعية للشكوى"
          value={complaintSubcats[complaint.Complaint_Subcategory || 0]}
        />
        <Field
          label="الفئة الفرعية للحالة"
          value={statusOpts[complaint.status_subcategory || 0]}
        />
        
        {/* Status field */}
        <Field
          label="حالة الشكوى"
          value={complaint.status ? statusOptions[complaint.status] : '—'}
        />
        
        {/* Location field (read-only) */}
        {complaint.location && (
          <Field
            label="الموقع"
            value={`${complaint.location.city} (${complaint.location.latitude}, ${complaint.location.longitude})`}
          />
        )}

        {/* Auto percentage */}
        <ComplaintPercentageCalculator complaintId={complaint.id} />

        {/* Status done indicator */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 text-right mb-1">
            حالة الإنجاز
          </label>
          <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${complaint.completion_percentage}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
              {complaint.completion_percentage}%
            </span>
          </div>
        </div> */}

        <Field label="ملاحظة" value={complaint.note} />
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() =>
            timelineId
              ? router.push(`/timeline/${timelineId}`)
              : router.push("/timeline")
          }
          className="bg-[#4664AD] text-white px-6 py-2 rounded-lg hover:bg-[#3A5499]"
        >
          الانتقال الى الحالة الزمنية
        </button>
      </div>
    </div>
  );
};
