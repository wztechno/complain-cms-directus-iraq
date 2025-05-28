'use client';

import React, { useEffect, useState } from 'react';
import ServiceCard from '@/components/ServiceCard';
import { useRouter } from 'next/navigation';
import { exportToCSV } from '@/utils/export';
import PermissionGuard from '@/components/PermissionGuard';

interface SubCategory {
  id: number;
  main_category: number | null;
  name: string;
  icon: string | null;
}

interface MainCategory {
  id: number;
  name: string;
}

interface SubCategoryWithDetails extends SubCategory {
  mainCategoryDetails?: MainCategory;
}

export default function SubCategoryPage() {
  const [categories, setCategories] = useState<SubCategoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Complaint_sub_category');
      if (!res.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await res.json();
      
      // Fetch main category details for each sub-category
      const categoriesWithDetails = await Promise.all(
        data.data.map(async (category: SubCategory) => {
          const details: SubCategoryWithDetails = { ...category };
          
          if (category.main_category) {
            try {
              const mainCategoryRes = await fetch(`https://complaint.top-wp.com/items/Complaint_main_category/${category.main_category}`);
              if (mainCategoryRes.ok) {
                const mainCategoryData = await mainCategoryRes.json();
                details.mainCategoryDetails = mainCategoryData.data;
              }
            } catch (error) {
              console.error('Error fetching main category details:', error);
            }
          }
          
          return details;
        })
      );

      setCategories(categoriesWithDetails);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setLoading(false);
    }
  };

  const handleCardClick = (categoryId: number) => {
    router.push(`/complaints/sub-category/${categoryId}`);
  };

  const handleExport = () => {
    const exportData = categories.map(category => ({
      ID: category.id,
      Name: category.name,
      'Main Category': category.mainCategoryDetails?.name || '',
      Icon: category.icon || ''
    }));

    exportToCSV(exportData, ['ID', 'Name', 'Main Category', 'Icon'], 'complaint_subcategories');
  };

  if (loading) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <PermissionGuard requiredPermissions={[{ resource: 'Complaint_sub_category', action: 'read' }]}>
    <div className="p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">الفئة الفرعية للشكوى</h1>
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
          <ServiceCard
            key={category.id}
            id={category.id}
            title={category.name}
            serviceType="خدمة عامة"
            icon={category.icon || undefined}
            actionText={category.mainCategoryDetails?.name || 'شكوى عامة'}
            onClick={() => handleCardClick(category.id)}
            className="hover:shadow-lg transition-shadow duration-200"
          />
        ))}
      </div>
    </div>
    </PermissionGuard>
  );
} 