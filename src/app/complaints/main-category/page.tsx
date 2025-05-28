'use client';

import React, { useEffect, useState } from 'react';
import ServiceCard from '@/components/ServiceCard';
import { useRouter } from 'next/navigation';
import { exportToCSV } from '@/utils/export';
import PermissionGuard from '@/components/PermissionGuard';

interface MainCategory {
  id: number;
  name: string;
  service_type: string | null;
  icon: string | null;
}

export default function MainCategoryPage() {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Complaint_main_category');
      if (!res.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await res.json();
      setCategories(data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCardClick = (categoryId: number) => {
    router.push(`/complaints/main-category/${categoryId}`);
  };

  const handleExport = () => {
    const headers = ['id', 'name', 'service_type'];
    exportToCSV(categories, headers, 'main_category_export');
  };
  

  return (
    <PermissionGuard requiredPermissions={[{ resource: 'Complaint_main_category', action: 'read' }]}>
    <div className="p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">الفئات الأساسية للشكاوى</h1>
        <button 
          onClick={handleExport}
          className="bg-[#4664AD] text-white px-4 py-2 rounded-lg">
          تصدير التقييمات 
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <ServiceCard
            key={category.id}
            id={category.id}
            title={category.name}
            serviceType={category.service_type || undefined}
            icon={category.icon || undefined}
            onClick={() => handleCardClick(category.id)}
          />
        ))}
      </div>
    </div>
    </PermissionGuard>
  );
} 