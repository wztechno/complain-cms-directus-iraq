'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/api';
import { getUserPermissions, hasPermission, complaintMatchesPermissions } from '@/utils/permissions';

interface ComplaintData {
  id: number;
  title: string;
  description: string;
  Service_type: string;
  governorate_name: string;
  street_name_or_number: string;
  status_subcategory: number;
  Complaint_Subcategory: number;
  district: number;
  completion_percentage: number;
  user: number | null;
}

export default function ComplaintPage({ params }: { params: { id: string } }) {
  const [complaint, setComplaint] = useState<ComplaintData | null>(null);
  const [districts, setDistricts] = useState<Record<number, string>>({});
  const [subcategories, setSubcategories] = useState<Record<number, string>>({});
  const [statusSubcategories, setStatusSubcategories] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const userPermissions = await getUserPermissions();

      if (!hasPermission(userPermissions, 'Complaint', 'read')) {
        setError('ليس لديك صلاحية لعرض هذه الشكوى');
        setLoading(false);
        return;
      }

      const [complaintRes, districtsRes, subcategoriesRes] = await Promise.all([
        fetchWithAuth(`/items/Complaint/${params.id}`),
        fetchWithAuth('/items/District'),
        fetchWithAuth('/items/Status_subcategory'),
      ]);

      if (!complaintRes?.data) {
        setError('لم يتم العثور على الشكوى');
        setLoading(false);
        return;
      }

      const data = complaintRes.data;

      if (!complaintMatchesPermissions(data, userPermissions)) {
        setError('ليس لديك صلاحية لعرض هذه الشكوى');
        setLoading(false);
        return;
      }

      setComplaint(data);

      setDistricts(Object.fromEntries(districtsRes.data.map((d: any) => [d.id, d.name])));
      setSubcategories(Object.fromEntries(subcategoriesRes.data.map((s: any) => [s.id, s.name])));
      setStatusSubcategories(Object.fromEntries(subcategoriesRes.data.map((s: any) => [s.id, s.name])));
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setError('حدث خطأ أثناء تحميل الشكوى');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64 flex justify-center items-center">
        <div className="text-xl text-gray-600">جاري تحميل البيانات...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold text-red-500 text-center mb-4">{error}</h2>
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">تفاصيل الشكوى</h1>
        <button className="bg-[#4664AD] text-white px-4 py-2 rounded-lg">
          تعديل
        </button>
      </div>

      <div className="bg-white rounded-lg p-6 shadow space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
          <Field label="الرقم" value={complaint?.id || null} />
          <Field label="عنوان الشكوى" value={complaint?.title || null} />
          <Field label="وصف الشكوى" value={complaint?.description || null} />
          <Field label="نوع الخدمة" value={complaint?.Service_type || null} />
          <Field label="المحافظة" value={districts[complaint?.district || 0] || null} />
          <Field label="رقم أو اسم الشارع" value={complaint?.street_name_or_number || null} />
          <Field label="القضاء" value={complaint?.governorate_name || null} />
          <Field label="الفئة الفرعية للشكوى" value={subcategories[complaint?.Complaint_Subcategory || 0] || null} />
          <Field label="الفئة الفرعية للحالة" value={statusSubcategories[complaint?.status_subcategory || 0] || null} />
          <Field label="نسبة الإنجاز" value={`${complaint?.completion_percentage || 0}%`} />
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, value }: { label: string; value: string | number | null }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 text-right mb-1">
      {label}
    </label>
    <div className="bg-gray-100 p-2 rounded text-right">
      {value ?? '—'}
    </div>
  </div>
);
