'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface StatusSubCategory {
  id: number;
  name: string | null;
  status_category: number | null;
  district: number | null;
  complaint_subcategory: number | null;
  nextstatus: number | null;
}

interface District {
  id: number;
  name: string;
}

interface StatusSubCategoryWithDetails extends StatusSubCategory {
  districtDetails?: District;
  nextStatusDetails?: StatusSubCategory;
}

export default function StatusSubCategoryPage() {
  const [subCategories, setSubCategories] = useState<StatusSubCategoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('category');

  useEffect(() => {
    fetchSubCategories();
  }, [categoryId]);

  const fetchSubCategories = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Status_subcategory');
      if (!res.ok) {
        throw new Error('Failed to fetch status sub-categories');
      }
      const data = await res.json();
      const allSubCategories = data.data;
      
      // Filter by category if categoryId is provided
      let filteredData = categoryId 
        ? allSubCategories.filter((item: StatusSubCategory) => item.status_category === Number(categoryId))
        : allSubCategories;

      // Filter out null names
      filteredData = filteredData.filter((item: StatusSubCategory) => item.name !== null);

      // Fetch district and next status details for each sub-category
      const subCategoriesWithDetails = await Promise.all(
        filteredData.map(async (subCategory: StatusSubCategory) => {
          const details: StatusSubCategoryWithDetails = { ...subCategory };
          
          // Fetch district details
          if (subCategory.district) {
            try {
              const districtRes = await fetch(`https://complaint.top-wp.com/items/District/${subCategory.district}`);
              if (districtRes.ok) {
                const districtData = await districtRes.json();
                details.districtDetails = districtData.data;
              }
            } catch (error) {
              console.error('Error fetching district details:', error);
            }
          }

          // Get next status details from all sub-categories
          if (subCategory.nextstatus) {
            details.nextStatusDetails = allSubCategories.find(
              (item: StatusSubCategory) => item.id === subCategory.nextstatus
            );
          }

          return details;
        })
      );

      setSubCategories(subCategoriesWithDetails);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sub-categories:', error);
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

  return (
    <div className="p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">الفئة الفرعية للحالة</h1>
        <div className="flex gap-4">
          <button className="bg-[#4664AD] text-white px-4 py-2 rounded-lg">
            تصدير البيانات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subCategories.map((subCategory) => (
          <div 
            key={subCategory.id} 
            className="bg-white rounded-lg shadow-md p-6"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-500">تلوث المياه</span>
              <button className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">⋮</span>
              </button>
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-right mb-4">{subCategory.name}</h3>

            {/* Status Info */}
            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
              <span>تنفيذ المعالجة</span>
              <span>{subCategory.districtDetails?.name || 'بغداد'}</span>
            </div>

            {/* Next Status */}
            <div className="border-t pt-4 mt-2">
              <div className="text-right text-sm text-gray-600">
                <span className="font-semibold ml-2" >الحالة التالية  :</span>
                <span>{subCategory.nextStatusDetails?.name || 'ابلاغ المواطن بضرورة الترخيص'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 