'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/api';
import { getUserPermissions, hasPermission } from '@/utils/permissions';

export default function CreateComplaintPage() {
  const router = useRouter();
  const [governorates, setGovernorates] = useState<{ id: number, name: string }[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [statusSubcategories, setStatusSubcategories] = useState<{ id: number, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    Service_type: '',
    district: '',
    status_subcategory: '',
    completion_percentage: 0,
  });

  useEffect(() => {
    const checkPermissionsAndFetchData = async () => {
      try {
        const userPermissions = await getUserPermissions();
        if (!hasPermission(userPermissions, 'Complaint', 'create')) {
          setPermissionError('ليس لديك صلاحية لإنشاء شكاوى جديدة');
          setLoading(false);
          return;
        }

        const [govRes, complaintRes, statusRes] = await Promise.all([
          fetchWithAuth('/items/District'),
          fetchWithAuth('/items/Complaint'),
          fetchWithAuth('/items/Status_subcategory'),
        ]);

        if (govRes?.data) {
          // const uniqueGovs = govRes.data.map((item: any) => item.name).filter(Boolean);
          setGovernorates(govRes?.data);
        }

        if (complaintRes?.data) {
          const uniqueServices = [...new Set(
            complaintRes.data.map((item: any) => item.Service_type).filter(Boolean)
          )] as string[];
          setServiceTypes(uniqueServices);
        }

        if (statusRes?.data) {
          setStatusSubcategories(statusRes.data);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error initializing create complaint page:', error);
        setLoading(false);
      }
    };

    checkPermissionsAndFetchData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const userPermissions = await getUserPermissions();
      if (!hasPermission(userPermissions, 'Complaint', 'create')) {
        setPermissionError('ليس لديك صلاحية لإنشاء شكاوى جديدة');
        setSubmitting(false);
        return;
      }

      const response = await fetchWithAuth('/items/Complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.data) {
        throw new Error('Failed to create complaint');
      }

      router.push('/complaints');
    } catch (error) {
      console.error('Error creating complaint:', error);
      alert('حدث خطأ أثناء إنشاء الشكوى. يرجى المحاولة مرة أخرى.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64 flex justify-center items-center">
        <div className="text-xl text-gray-600">جاري تحميل البيانات...</div>
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold text-red-500 text-center mb-4">{permissionError}</h2>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/complaints')}
              className="bg-[#4664AD] text-white px-4 py-2 rounded-lg"
            >
              العودة إلى الشكاوى
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">إنشاء شكوى جديدة</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                عنوان الشكوى *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-md p-2 text-right"
                placeholder="أدخل عنوان الشكوى"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                وصف الشكوى *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
                placeholder="أدخل وصف تفصيلي للشكوى"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  نوع الخدمة *
                </label>
                <select
                  name="Service_type"
                  value={formData.Service_type}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                >
                  <option value="">اختر نوع الخدمة</option>
                  {serviceTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  المحافظة *
                </label>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                >
                  <option value="">اختر المحافظة</option>
                  {governorates.map((gov) => (
                    <option key={gov.id} value={gov.id}>{gov.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ✅ New: Status Subcategory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                التصنيف الفرعي للحالة
              </label>
              <select
                name="status_subcategory"
                value={formData.status_subcategory}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
              >
                <option value="">اختر تصنيف الحالة</option>
                {statusSubcategories.map((status) => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button
                type="button"
                onClick={() => router.push('/complaints')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#4664AD] text-white rounded-md hover:bg-[#3A5499] disabled:bg-gray-400"
              >
                {submitting ? 'جاري الإنشاء...' : 'إنشاء الشكوى'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
