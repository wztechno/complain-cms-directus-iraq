'use client';

import { useEffect, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { fetchWithAuth } from '@/utils/api';
import PermissionGuard from '@/components/PermissionGuard';

interface TimelineEntry {
  id: number;
  statusDate: string;
  status_subcategory: string | null;
  complaint_id: string;
}

interface StatusCategory {
  id: number;
  name: string;
}

interface StatusSubCategory {
  id: number;
  name: string | null;
  status_category: number;
  nextstatus: number | null;
}

interface TimelineStatus {
  categoryId: number;
  categoryName: string;
  entries: {
    subCategory: StatusSubCategory;
    date: string;
  }[];
  isCompleted: boolean;
  isCurrent: boolean;
}

export default function ComplaintTimelinePage({ params }: { params: { id: string } }) {
  const [timelineStatuses, setTimelineStatuses] = useState<TimelineStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [complaintId, setComplaintId] = useState<string | null>(null);

  useEffect(() => {
    fetchTimelineData();
  }, [params.id]);

  const fetchTimelineData = async () => {
    try {
      // 1. First fetch the specific timeline entry to get the complaint_id
      const timelineEntryRes = await fetchWithAuth(`/items/ComplaintTimeline/${params.id}`);
      const timelineEntryJson = await timelineEntryRes;
      const complaintId = timelineEntryJson.data.complaint_id;
      setComplaintId(complaintId);

      // 2. Fetch all status categories
      const categoriesRes = await fetchWithAuth('/items/Status_category');
      const categoriesJson = await categoriesRes;
      const categories: StatusCategory[] = categoriesJson.data;

      // 3. Fetch all timeline entries for this complaint
      const timelineRes = await fetchWithAuth(`/items/ComplaintTimeline?filter[complaint_id][_eq]=${complaintId}`);
      const timelineJson = await timelineRes;
      const complaintTimelines: TimelineEntry[] = timelineJson.data;

      // 4. Fetch all status subcategories
      const subCategoriesRes = await fetchWithAuth('/items/Status_subcategory?limit=-1');
      const subCategoriesJson = await subCategoriesRes;
      const allSubCategories: StatusSubCategory[] = subCategoriesJson.data.filter(
        (sub: StatusSubCategory) => sub.name !== null
      );

      // Create maps for quick lookups
      const subCategoryMap = new Map(
        allSubCategories.map(sub => [sub.id, sub])
      );

      // Sort timeline entries by date (newest first)
      const sortedTimelines = [...complaintTimelines].sort(
        (a, b) => new Date(b.statusDate).getTime() - new Date(a.statusDate).getTime()
      );

      // Get the most recent status subcategory
      const latestEntry = sortedTimelines[0];
      const latestSubCategory = latestEntry?.status_subcategory 
        ? subCategoryMap.get(Number(latestEntry.status_subcategory))
        : null;
      const currentCategoryId = latestSubCategory?.status_category;

      // Find the index of the current category
      const currentCategoryIndex = categories.findIndex(cat => cat.id === currentCategoryId);

      // Group timeline entries by status category
      const timelineData = categories.map((category, index) => {
        // Get all timeline entries for this category's subcategories
        const categoryEntries = complaintTimelines
          .filter((entry: TimelineEntry) => {
            if (!entry.status_subcategory) return false;
            const subCategory = subCategoryMap.get(Number(entry.status_subcategory));
            return subCategory && subCategory.status_category === category.id;
          })
          .map(entry => ({
            subCategory: subCategoryMap.get(Number(entry.status_subcategory))!,
            date: new Date(entry.statusDate).toLocaleDateString('ar-EG')
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // A category is completed if:
        // 1. It has entries AND
        // 2. It's not the current category AND
        // 3. It comes before the current category
        const isCompleted = categoryEntries.length > 0 && index < currentCategoryIndex;

        // A category is current if it's the category of the latest status
        const isCurrent = category.id === currentCategoryId;

        return {
          categoryId: category.id,
          categoryName: category.name,
          entries: categoryEntries,
          isCompleted,
          isCurrent
        };
      });

      setTimelineStatuses(timelineData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching timeline data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64 flex justify-center items-center">
        <div className="text-xl text-gray-600">جاري تحميل البيانات...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 mr-64">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-right">الحالة الزمنية للشكوى {complaintId}</h1>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Timeline items */}
          <div className="space-y-8">
            {timelineStatuses.map((status) => (
              <div key={status.categoryId} className="relative flex items-center">
                {/* Status indicator */}
                <div className={`absolute right-0 w-8 h-8 rounded-full border-4 border-white 
                  ${status.isCompleted ? 'bg-green-500' : 
                    status.isCurrent ? 'bg-[#4664AD]' : 
                    'bg-gray-300'} 
                  flex items-center justify-center`}
                >
                  {status.isCompleted && <FaCheck className="text-white" />}
                </div>

                {/* Content */}
                <div className="mr-16 bg-white p-4 rounded-lg shadow-sm w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">{status.categoryName}</h3>
                    <span className="text-gray-500 text-sm">
                      {status.entries.length > 0 ? status.entries[0].date : 'قيد الانتظار'}
                    </span>
                  </div>

                  {status.entries.length > 0 && (
                    <div className="space-y-4">
                      {status.entries.map((entry, index) => (
                        <div 
                          key={`${entry.subCategory.id}-${index}`}
                          className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
                        >
                          <span className="text-[#4664AD] font-medium">
                            {entry.subCategory.name}
                          </span>
                          <span className="text-sm text-gray-500">{entry.date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 