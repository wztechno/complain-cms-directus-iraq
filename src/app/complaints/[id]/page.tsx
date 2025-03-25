'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/api';
import { getUserPermissions, hasPermission, complaintMatchesPermissions } from '@/utils/permissions';

interface ComplaintData {
  id: string;
  title: string;
  description: string;
  Service_type: string;
  governorate_name: string;
  status_subcategory: string;
  completion_percentage: number;
  district: string | number;
}

export default function ComplaintPage({ params }: { params: { id: string } }) {
  const [complaint, setComplaint] = useState<ComplaintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchComplaint();
  }, []);

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      
      // Get user permissions
      const userPermissions = await getUserPermissions();
      
      // Check if user has permission to read complaints
      if (!hasPermission(userPermissions, 'Complaint', 'read')) {
        setError('ليس لديك صلاحية لعرض هذه الشكوى');
        setLoading(false);
        return;
      }

      // Fetch the complaint using authenticated request
      const response = await fetchWithAuth(`/items/Complaint/${params.id}`);
      
      if (!response || !response.data) {
        setError('لم يتم العثور على الشكوى');
        setLoading(false);
        return;
      }
      
      const complaintData = response.data;
      
      // Check if this specific complaint is accessible based on user permissions
      if (!complaintMatchesPermissions(complaintData, userPermissions)) {
        setError('ليس لديك صلاحية لعرض هذه الشكوى');
        setLoading(false);
        return;
      }
      
      setComplaint(complaintData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching complaint:', error);
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

  if (!complaint) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64 flex justify-center items-center">
        <div className="text-xl text-gray-600">لم يتم العثور على الشكوى</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 mr-64">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">شكوى مياه</h1>
        <button className="bg-[#4664AD] text-white px-4 py-2 rounded-lg">
          تعديل
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                الرقم
              </label>
              <div className="bg-gray-100 p-2 rounded text-right">
                {complaint.id}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                عنوان الشكوى
              </label>
              <div className="bg-gray-100 p-2 rounded text-right">
                {complaint.title}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                وصف الشكوى
              </label>
              <div className="bg-gray-100 p-2 rounded text-right">
                {complaint.description}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                نوع الخدمة
              </label>
              <div className="bg-gray-100 p-2 rounded text-right">
                {complaint.Service_type}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                المحافظة
              </label>
              <div className="bg-gray-100 p-2 rounded text-right">
                {complaint.governorate_name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                القضاء
              </label>
              <div className="bg-gray-100 p-2 rounded text-right">
                <select className="w-full bg-transparent outline-none">
                  <option>اختر القضاء</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                الفئة الفرعية للشكوى
              </label>
              <div className="bg-gray-100 p-2 rounded text-right">
                <select className="w-full bg-transparent outline-none">
                  <option>اختر الفئة</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                الفئة الفرعية للحالة
              </label>
              <div className="bg-gray-100 p-2 rounded text-right">
                <select className="w-full bg-transparent outline-none">
                  <option>اختر الفئة</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                الفئة الفرعية للشكوى
              </label>
              <div className="bg-gray-100 p-2 rounded text-right">
                {complaint.status_subcategory}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                المستخدم
              </label>
              <div className="bg-gray-100 p-2 rounded text-right">
                مرفوض او غير مرفوض
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                استقبال شكوى
              </label>
              <div className="bg-gray-100 p-2 rounded text-right">
                {complaint.completion_percentage}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 