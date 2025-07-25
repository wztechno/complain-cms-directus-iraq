'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight } from 'react-icons/fa';
import { buildStatusToUserMap } from '@/utils/responsible-users';
import { fetchWithAuth } from '@/utils/api';
interface StatusSubCategory {
  id: number;
  name: string;
  status_category: number;
  district: number | null;
  complaint_subcategory: number | null;
  nextstatus: number | null;
  created_at?: string;
}

interface StatusCategory {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
}

interface StatusSubCategoryWithDetails extends StatusSubCategory {
  statusCategoryDetails?: StatusCategory;
  districtDetails?: District;
  nextStatusDetails?: StatusSubCategory;
}

export default function StatusSubCategoryDetailsPage({ params }: { params: { id: string } }) {
  const [subCategory, setSubCategory] = useState<StatusSubCategoryWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [responsibleUser, setResponsibleUser] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    fetchSubCategoryDetails();
  }, [params.id]);

  const fetchSubCategoryDetails = async () => {
    try {
      // Fetch subcategory details
      const res = await fetchWithAuth(`/items/Status_subcategory/${params.id}`);
      // if (!res.ok) {
      //   throw new Error('Failed to fetch subcategory details');
      // }
      const data = await res;
      const subCategoryData: StatusSubCategoryWithDetails = data.data;

      // Fetch related data in parallel
      const [categoryRes, districtRes, nextStatusRes] = await Promise.all([
        // Fetch main category details
        subCategoryData.status_category ? 
          fetchWithAuth(`/items/Status_category/${subCategoryData.status_category}`) : 
          Promise.resolve(null),
        
        // Fetch district details
        subCategoryData.district ? 
          fetchWithAuth(`/items/District/${subCategoryData.district}`) : 
          Promise.resolve(null),
        
        // Fetch next status details
        subCategoryData.nextstatus ? 
          fetchWithAuth(`/items/Status_subcategory/${subCategoryData.nextstatus}`) : 
          Promise.resolve(null)
      ]);

      // Process category details
      if (categoryRes) {
        const categoryData = await categoryRes;
        subCategoryData.statusCategoryDetails = categoryData.data;
      }

      // Process district details
      if (districtRes) {
        const districtData = await districtRes;
        subCategoryData.districtDetails = districtData.data;
      }

      // Process next status details
      if (nextStatusRes) {
        const nextStatusData = await nextStatusRes;
        subCategoryData.nextStatusDetails = nextStatusData.data;
      }

      // Fetch responsible user
      const responsibleUsersMap = await buildStatusToUserMap();
      const responsibleUserName = responsibleUsersMap[params.id] || 'غير محدد';
      setResponsibleUser(responsibleUserName);

      setSubCategory(subCategoryData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching subcategory details:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  if (!subCategory) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">لم يتم العثور على الفئة الفرعية</div>
      </div>
    );
  }

  return (
    <div className="p-8 mr-64">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="text-[#4664AD] hover:text-[#3A5499]"
          >
            <FaArrowRight size={24} />
          </button>
          <h1 className="text-3xl font-bold">{subCategory.name}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              المحافظة
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {subCategory.districtDetails?.name || 'غير محدد'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              المسؤول
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {responsibleUser}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              الحالة التالية
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {subCategory.nextStatusDetails?.name || 'لا توجد حالة تالية'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              الفئة الرئيسية
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {subCategory.statusCategoryDetails?.name || 'غير محدد'}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          {subCategory.status_category && (
            <button
              onClick={() => router.push(`/status/main-category/${subCategory.status_category}`)}
              className="bg-white text-[#4664AD] border border-[#4664AD] px-6 py-2 rounded-lg hover:bg-gray-50"
            >
              عرض الفئة الرئيسية
            </button>
          )}
          {subCategory.nextstatus && (
            <button
              onClick={() => router.push(`/status/sub-category/${subCategory.nextstatus}`)}
              className="bg-[#4664AD] text-white px-6 py-2 rounded-lg hover:bg-[#3A5499]"
            >
              عرض الحالة التالية
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 