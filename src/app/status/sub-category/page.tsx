'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StatusSubCategory {
  id: number;
  name: string;
  status_category: number | null;
  district: number | null;
  complaint_subcategory: number | null;
  nextstatus: number | null;
}

interface District {
  id: number;
  name: string;
}

interface StatusCategory {
  id: number;
  name: string;
}

interface StatusSubCategoryWithDetails extends StatusSubCategory {
  districtDetails?: District;
  nextStatusDetails?: StatusSubCategory;
  statusCategoryDetails?: StatusCategory;
}

export default function StatusSubCategoryPage() {
  const [subCategories, setSubCategories] = useState<StatusSubCategoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSubCategory, setShowAddSubCategory] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [statusCategories, setStatusCategories] = useState<StatusCategory[]>([]);
  const [newSubCategory, setNewSubCategory] = useState({
    name: '',
    status_category: '',
    district: '',
    nextstatus: '',
  });
  
  const router = useRouter();

  useEffect(() => {
    fetchSubCategories();
    fetchDistricts();
    fetchStatusCategories();
  }, []);

  const fetchSubCategories = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Status_subcategory');
      if (!res.ok) {
        throw new Error('Failed to fetch status sub-categories');
      }
      const resData = await res.json();
      let filteredData = resData.data;
      
      filteredData = filteredData.filter((item: StatusSubCategory) => item.name !== null);

      const subCategoriesWithDetails = await Promise.all(
        filteredData.map(async (subCategory: StatusSubCategory) => {
          const details: StatusSubCategoryWithDetails = { ...subCategory };
          
          if (subCategory.district) {
            try {
              const districtRes = await fetch(`https://complaint.top-wp.com/items/District/${subCategory.district}`);
              const districtData = await districtRes.json();
              details.districtDetails = districtData.data;
            } catch (error) {
              console.error('Error fetching district details:', error);
            }
          }

          if (subCategory.status_category) {
            try {
              const categoryRes = await fetch(`https://complaint.top-wp.com/items/Status_category/${subCategory.status_category}`);
              const categoryData = await categoryRes.json();
              details.statusCategoryDetails = categoryData.data;
            } catch (error) {
              console.error('Error fetching category details:', error);
            }
          }

          if (subCategory.nextstatus) {
            try {
              const nextStatusRes = await fetch(`https://complaint.top-wp.com/items/Status_subcategory/${subCategory.nextstatus}`);
              const nextStatusData = await nextStatusRes.json();
              details.nextStatusDetails = nextStatusData.data;
            } catch (error) {
              console.error('Error fetching next status details:', error);
            }
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

  const fetchDistricts = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/District');
      if (!res.ok) {
        throw new Error('Failed to fetch districts');
      }
      const data = await res.json();
      setDistricts(data.data);
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  };

  const fetchStatusCategories = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Status_category');
      if (!res.ok) {
        throw new Error('Failed to fetch status categories');
      }
      const data = await res.json();
      setStatusCategories(data.data);
    } catch (error) {
      console.error('Error fetching status categories:', error);
    }
  };

  const handleExport = async () => {
    try {
      const csvData = subCategories.map(subCategory => ({
        ID: subCategory.id,
        Name: subCategory.name,
        Category: subCategory.statusCategoryDetails?.name || '',
        District: subCategory.districtDetails?.name || '',
        NextStatus: subCategory.nextStatusDetails?.name || '',
      }));

      const headers = Object.keys(csvData[0]);
      const csv = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'status_subcategories.csv';
      link.click();
    } catch (error) {
      console.error('Error exporting sub-categories:', error);
    }
  };

  const handleAddSubCategory = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Status_subcategory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSubCategory.name,
          status_category: newSubCategory.status_category ? Number(newSubCategory.status_category) : null,
          district: newSubCategory.district ? Number(newSubCategory.district) : null,
          nextstatus: newSubCategory.nextstatus ? Number(newSubCategory.nextstatus) : null,
        })
      });

      if (!res.ok) {
        throw new Error('Failed to add sub-category');
      }

      setShowAddSubCategory(false);
      setNewSubCategory({ name: '', status_category: '', district: '', nextstatus: '' });
      fetchSubCategories();
    } catch (error) {
      console.error('Error adding sub-category:', error);
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
          <button
            onClick={handleExport}
            className="bg-[#4664AD] text-white px-4 py-2 rounded-lg hover:bg-[#3A5499]"
          >
            تصدير البيانات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subCategories.map((subCategory) => (
          <div 
            key={subCategory.id} 
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => router.push(`/status/sub-category/${subCategory.id}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-500">
                {subCategory.statusCategoryDetails?.name || 'تلوث المياه'}
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">⋮</span>
              </button>
            </div>

            <h3 className="text-xl font-semibold text-right mb-4">{subCategory.name}</h3>

            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
              <span>تنفيذ المعالجة</span>
              <span>{subCategory.districtDetails?.name || 'بغداد'}</span>
            </div>

            <div className="border-t pt-4 mt-2">
              <div className="text-right text-sm text-gray-600">
                <span className="font-semibold ml-2">الحالة التالية:</span>
                <span>{subCategory.nextStatusDetails?.name || 'ابلاغ المواطن بضرورة الترخيص'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <button 
          onClick={() => setShowAddSubCategory(true)}
          className="w-full bg-[#4664AD] text-white py-3 rounded-lg text-lg hover:bg-[#3A5499] transition-colors"
        >
          إضافة فئة فرعية جديدة
        </button>
      </div>

      {showAddSubCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">إضافة فئة فرعية جديدة</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم الفئة الفرعية
                </label>
                <input
                  type="text"
                  value={newSubCategory.name}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الفئة الرئيسية
                </label>
                <select
                  value={newSubCategory.status_category}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, status_category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="">اختر الفئة الرئيسية</option>
                  {statusCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المحافظة
                </label>
                <select
                  value={newSubCategory.district}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, district: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="">اختر المحافظة</option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الحالة التالية
                </label>
                <select
                  value={newSubCategory.nextstatus}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, nextstatus: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="">اختر الحالة التالية</option>
                  {subCategories.map((subCategory) => (
                    <option key={subCategory.id} value={subCategory.id}>
                      {subCategory.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAddSubCategory(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddSubCategory}
                  className="px-4 py-2 bg-[#4664AD] text-white rounded-lg"
                >
                  إضافة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 