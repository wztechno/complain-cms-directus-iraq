'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight } from 'react-icons/fa';
import { fetchWithAuth } from '@/utils/api';
interface StatusCategory {
  id: number;
  name: string;
  created_at?: string;
}

interface StatusSubCategory {
  id: number;
  name: string;
  status_category: number;
}

interface StatusCategoryWithDetails extends StatusCategory {
  subCategories?: StatusSubCategory[];
}

export default function StatusCategoryDetailsPage({ params }: { params: { id: string } }) {
  const [category, setCategory] = useState<StatusCategoryWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCategoryDetails();
  }, [params.id]);

  const fetchCategoryDetails = async () => {
    try {
      // Fetch status category details
      const res = await fetchWithAuth(`/items/Status_category/${params.id}`);
      // if (!res.ok) {
      //   throw new Error('Failed to fetch status category details');
      // }
      const data = await res;
      const categoryData: StatusCategoryWithDetails = data.data;

      // Fetch subcategories for this status category
      try {
        const subCategoriesRes = await fetchWithAuth(`/items/Status_subcategory?filter[status_category][_eq]=${params.id}`);
        // if (subCategoriesRes.ok) {
          const subCategoriesData = await subCategoriesRes;
          categoryData.subCategories = subCategoriesData.data.filter(
            (subCategory: StatusSubCategory) => subCategory.name !== null
          );
        // }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
      }

      setCategory(categoryData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching category details:', error);
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

  if (!category) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">لم يتم العثور على الفئة</div>
      </div>
    );
  }

  return (
    <div className="p-8 mr-64">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#4664AD] hover:text-[#3A5499]"
        >
          <FaArrowRight />
          <span>العودة إلى القائمة</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="text-3xl font-bold">{category.name}</div>
          <div className="text-gray-500">
            {category.subCategories?.length || 0} فئة فرعية
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              رقم التعريف
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {category.id}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              تاريخ الإنشاء
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {category.created_at ? new Date(category.created_at).toLocaleDateString('ar-EG') : 'غير محدد'}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              الفئات الفرعية
            </label>
            <div className="bg-gray-50 p-4 rounded-lg">
              {category.subCategories && category.subCategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.subCategories.map((subCategory) => (
                    <div
                      key={subCategory.id}
                      className="bg-white p-3 rounded-lg shadow-sm text-right"
                    >
                      <div className="font-medium">{subCategory.name}</div>
                      <div className="text-sm text-gray-500">رقم التعريف: {subCategory.id}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-right">لا توجد فئات فرعية مسجلة</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => router.push(`/status/sub-category?category=${category.id}`)}
            className="bg-[#4664AD] text-white px-6 py-2 rounded-lg hover:bg-[#3A5499]"
          >
            عرض الفئات الفرعية
          </button>
        </div>
      </div>
    </div>
  );
} 