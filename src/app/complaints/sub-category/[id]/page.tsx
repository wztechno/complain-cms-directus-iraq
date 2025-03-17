'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight } from 'react-icons/fa';

interface SubCategory {
  id: number;
  name: string;
  icon: string | null;
  main_category: number | null;
  description?: string | null;
  created_at?: string;
}

interface MainCategory {
  id: number;
  name: string;
  service_type: string | null;
}

interface SubCategoryWithDetails extends SubCategory {
  mainCategoryDetails?: MainCategory;
}

export default function SubCategoryDetailsPage({ params }: { params: { id: string } }) {
  const [category, setCategory] = useState<SubCategoryWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCategoryDetails();
  }, [params.id]);

  const fetchCategoryDetails = async () => {
    try {
      // Fetch sub-category details
      const res = await fetch(`https://complaint.top-wp.com/items/Complaint_sub_category/${params.id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch sub-category details');
      }
      const data = await res.json();
      const subCategory: SubCategoryWithDetails = data.data;

      // If there's a main category, fetch its details
      if (subCategory.main_category) {
        try {
          const mainCategoryRes = await fetch(`https://complaint.top-wp.com/items/Complaint_main_category/${subCategory.main_category}`);
          if (mainCategoryRes.ok) {
            const mainCategoryData = await mainCategoryRes.json();
            subCategory.mainCategoryDetails = mainCategoryData.data;
          }
        } catch (error) {
          console.error('Error fetching main category details:', error);
        }
      }

      setCategory(subCategory);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sub-category details:', error);
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
        <div className="text-xl text-gray-600">لم يتم العثور على الفئة الفرعية</div>
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
            {category.mainCategoryDetails?.name || 'لا توجد فئة رئيسية'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              الوصف
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {category.description || 'لا يوجد وصف'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              الأيقونة
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {category.icon || 'لا توجد أيقونة'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              الفئة الرئيسية
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {category.mainCategoryDetails ? (
                <div>
                  <div>{category.mainCategoryDetails.name}</div>
                  <div className="text-sm text-gray-500">
                    {category.mainCategoryDetails.service_type || 'خدمة عامة'}
                  </div>
                </div>
              ) : (
                'لا توجد فئة رئيسية'
              )}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              رقم التعريف
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {category.id}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => router.push(`/complaints?subcategory=${category.id}`)}
            className="bg-[#4664AD] text-white px-6 py-2 rounded-lg hover:bg-[#3A5499]"
          >
            عرض الشكاوى المرتبطة
          </button>
          {category.mainCategoryDetails && (
            <button
              onClick={() => router.push(`/complaints/main-category/${category.main_category}`)}
              className="bg-white text-[#4664AD] border border-[#4664AD] px-6 py-2 rounded-lg hover:bg-gray-50"
            >
              عرض الفئة الرئيسية
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 