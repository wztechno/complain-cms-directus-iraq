'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import { exportToCSV } from '@/utils/export';
import PermissionGuard from '@/components/PermissionGuard';
import { fetchWithAuth } from '@/utils/api';

interface StatusCategory {
  id: number;
  name: string;
  created_at?: string;
  subCategoriesCount?: number;
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
      // Fetch status categories
      const res = await fetchWithAuth('/items/Status_category');
      // if (!res.ok) {
      //   throw new Error('Failed to fetch status categories');
      // }
      const data = await res;
      const categoriesData = data.data;

      // Fetch all subcategories to count them for each category
      const subCategoriesRes = await fetchWithAuth('/items/Status_subcategory');
      // if (!subCategoriesRes.ok) {
      //   throw new Error('Failed to fetch subcategories');
      // }
      const subCategoriesData = await subCategoriesRes;
      const allSubCategories = subCategoriesData.data;

      // Add subcategories count to each category
      const categoriesWithCounts = categoriesData.map((category: StatusCategory) => ({
        ...category,
        subCategoriesCount: allSubCategories.filter(
          (sub: any) => sub.status_category === category.id && sub.name !== null
        ).length
      }));

      setCategories(categoriesWithCounts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching status categories:', error);
      setLoading(false);
    }
  };

  const handleCardClick = (categoryId: number) => {
    router.push(`/status/main-category/${categoryId}`);
  };

  const handleExport = () => {
    const exportData = categories.map(category => ({
      ID: category.id,
      Name: category.name,
      'Created At': category.created_at ? new Date(category.created_at).toLocaleDateString('ar-EG') : '',
      'Sub Categories Count': category.subCategoriesCount || 0
    }));

    exportToCSV(exportData, ['ID', 'Name', 'Created At', 'Sub Categories Count'], 'status_categories');
  };

  if (loading) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <PermissionGuard requiredPermissions={[{ resource: 'Status_category', action: 'read' }]}>
    <div className="p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">الفئة الأساسية للحالة</h1>
        <div className="flex gap-4">
          <button 
            onClick={handleExport}
            className="bg-[#4664AD] text-white px-4 py-2 rounded-lg hover:bg-[#3A5499]"
          >
            تصدير البيانات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </PermissionGuard>
  );
} 