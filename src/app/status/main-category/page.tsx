'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StatusCategory {
  id: number;
  name: string;
}

export default function StatusMainCategoryPage() {
  const [categories, setCategories] = useState<StatusCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Status_category');
      if (!res.ok) {
        throw new Error('Failed to fetch status categories');
      }
      const data = await res.json();
      setCategories(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching status categories:', error);
      setLoading(false);
    }
  };

  const handleCardClick = (categoryId: number) => {
    router.push(`/status/sub-category?category=${categoryId}`);
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
        <h1 className="text-3xl font-bold">الفئة الأساسية للحالة</h1>
        <div className="flex gap-4">
          <button className="bg-[#4664AD] text-white px-4 py-2 rounded-lg">
            تصدير البيانات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category) => (
          <div 
            key={category.id} 
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => handleCardClick(category.id)}
          >
            <div className="flex justify-between items-start">
              <span className="text-gray-500">{category.id}</span>
              <button className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">⋮</span>
              </button>
            </div>
            <h3 className="text-xl font-semibold text-right mt-4">{category.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
} 