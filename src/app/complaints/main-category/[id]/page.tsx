'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight } from 'react-icons/fa';

interface MainCategory {
  id: number;
  name: string;
  service_type: string | null;
  icon: string | null;
  description?: string | null;
  created_at?: string;
}

export default function MainCategoryDetailsPage({ params }: { params: { id: string } }) {
  const [category, setCategory] = useState<MainCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCategoryDetails();
  }, [params.id]);

  const fetchCategoryDetails = async () => {
    try {
      const res = await fetch(`https://complaint.top-wp.com/items/Complaint_main_category/${params.id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch category details');
      }
      const data = await res.json();
      setCategory(data.data);
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
          <div className="text-gray-500">{category.service_type || 'خدمة عامة'}</div>
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
              تاريخ الإنشاء
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {new Date(category.created_at || '').toLocaleDateString('ar-EG')}
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

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => router.push(`/complaints?category=${category.id}`)}
            className="bg-[#4664AD] text-white px-6 py-2 rounded-lg hover:bg-[#3A5499]"
          >
            عرض الشكاوى المرتبطة
          </button>
        </div>
      </div>
    </div>
  );
} 