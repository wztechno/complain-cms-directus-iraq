/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetchWithAuth } from "@/utils/api";
import { useState, useEffect, useCallback } from "react";
// import { fetchWithAuth } from "@/utils/api";
// import { getUserPermissions, hasPermission } from "@/utils/permissions";

/**
 * ComplaintPercentageCalculator
 * ---------------------------------
 * Calculates (and displays) overall progress for a complaint by walking the
 * timeline + workflow metadata. All reads use plain `fetch`; the only
 * authenticated call is the *optional* PATCH back to `/items/Complaint`.
 */
const ComplaintPercentageCalculator = ({
  complaintId,
}: {
  complaintId: string | number;
}) => {
  /* reactive state */
  const [loading, setLoading] = useState(true);
  const [percentage, setPercentage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryDetails, setCategoryDetails] = useState<
    Array<{
      categoryId: number;
      categoryName: string;
      totalSteps: number;
      completedSteps: number;
      percentage: number;
    }>
  >([]);

  /* helpers – explicit response types */
  interface Category {
    id: number;
    name: string;
  }
  interface StatusSub {
    id: number;
    name: string;
    status_category: number | { id: number; name: string };
    district?: number;
    complaint_subcategory?: number;
  }
  interface TimelineEntry {
    id: number;
    complaint_id: string | number;
    status_subcategory: number | { id: number };
  }

  /********************
   * core calculation *
   *******************/
  const calculate = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      /* ————————— 1. complaint meta (district + subcat) */
      const compRes = await fetchWithAuth(
        `/items/Complaint/${complaintId}`
      );
      if (!compRes) throw new Error("تعذر جلب بيانات الشكوى");
      const comp = compRes.data as any;
      const districtId: number = comp.district;
      const subCatId: number | undefined = comp.Complaint_Subcategory ?? comp.complaint_subcategory;

      /* ————————— 2. taxonomy look-ups */
      const [catRes, timelineRes, subRes] = await Promise.all([
        fetchWithAuth("/items/Status_category?sort=id"),
        fetch(
          `https://complaint.top-wp.com/items/ComplaintTimeline?filter[complaint_id][_eq]=${complaintId}`
        ).then((r) => r.json()),
        fetchWithAuth(
          `/items/Status_subcategory?filter[district][_eq]=${districtId}${
            subCatId ? `&filter[complaint_subcategory][_eq]=${subCatId}` : ""
          }&fields=*,status_category.*&t=${Date.now()}`
        ),
      ]);

      const categories: Category[] = catRes?.data ?? [];
      const timeline: TimelineEntry[] = timelineRes?.data ?? [];
      const allSubs: StatusSub[] = subRes?.data ?? [];

      /* ————————— 3. done-set from timeline IDs */
      const doneIds = new Set<string>();
      timeline.forEach((t) => {
        const id = typeof t?.status_subcategory === "object" ? t?.status_subcategory?.id : t?.status_subcategory;
        if (id != null) doneIds.add(String(id));
      });
      const hasTimeline = doneIds.size > 0;

      /* ————————— 4. group subcategories by category */
      const byCat: Record<number, StatusSub[]> = {};
      allSubs.forEach((s) => {
        const catId = typeof s?.status_category === "object" ? s?.status_category?.id : s?.status_category;
        if (!byCat[catId]) byCat[catId] = [];
        byCat[catId].push(s);
      });

      /* ————————— 5. workflow auto-fill (only if timeline present) */
      if (hasTimeline) {
        // complete earlier steps in same category
        Object.values(byCat).forEach((subs) => {
          subs
            .sort((a, b) => a.id - b.id)
            .forEach((s, idx, arr) => {
              const laterDoneIdx = arr.findIndex((l) => doneIds.has(String(l?.id)) && l?.id > s?.id);
              if (laterDoneIdx >= 0) doneIds.add(String(s?.id));
            });
        });
        // propagate back to earlier categories if later ones have progress
        const catsSorted = [...categories].sort((a, b) => a.id - b.id);
        let laterDone = false;
        for (let i = catsSorted.length - 1; i >= 0; i--) {
          const cId = catsSorted[i].id;
          const subs = byCat[cId] ?? [];
          const catHasDone = subs.some((s) => doneIds.has(String(s?.id)));
          if (catHasDone) laterDone = true;
          else if (laterDone) subs.forEach((s) => doneIds.add(String(s?.id)));
        }
      }

      /* ————————— 6. per-category + overall percentages */
      let totalSteps = 0,
        totalDone = 0;
      const catDetails = categories.map((cat) => {
        const subs = byCat[cat.id] ?? [];
        const doneCount = subs.filter((s) => doneIds.has(String(s?.id))).length;
        totalSteps += subs.length;
        totalDone += doneCount;
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          totalSteps: subs.length,
          completedSteps: doneCount,
          percentage: subs.length ? Math.round((doneCount / subs.length) * 100) : 0,
        };
      });
      const overallPct = totalSteps ? Math.round((totalDone / totalSteps) * 100) : 0;

      /* ————————— 7. persist if allowed */
      try {
        // const perms = await getUserPermissions();
        // if (hasPermission(perms, "Complaint", "update")) {
          await fetchWithAuth(`/items/Complaint/${complaintId}`, {
            method: "PATCH",
            body: JSON.stringify({ completion_percentage: overallPct }),
          });
        // }
      } catch (e) {
        // Non-admin users may not be allowed – swallow silently
        console.warn("Unable to persist completion_percentage", e);
      }

      setCategoryDetails(catDetails);
      setPercentage(overallPct);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ أثناء حساب نسبة الإنجاز");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [complaintId]);

  /* initial + manual refresh */
  useEffect(() => {
    calculate();
  }, [calculate]);

  const handleRefresh = () => {
    setRefreshing(true);
    calculate();
  };

  /*****************
   *   RENDER UI   *
   *****************/
  if (loading)
    return (
      <div className="p-6 mb-2 mt-2 text-center">
        <div className="text-xl text-gray-600">جاري حساب نسبة الإنجاز...</div>
      </div>
    );
  if (error)
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={handleRefresh}
          className="mt-2 bg-[#4664AD] text-white px-4 py-2 rounded-lg inline-block"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  return (
    <div className="mt-6">
      <div className="flex items-center">
        <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
            {percentage}%
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-blue-300"
        >
          {refreshing ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default ComplaintPercentageCalculator;