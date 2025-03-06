'use client';

import React, { useEffect, useState } from 'react';

interface ComplaintData {
  id: string;
  title: string;
  description: string;
  Service_type: string;
  governorate_name: string;
  status_subcategory: string;
  completion_percentage: number;
}

export default function ComplaintPage({ params }: { params: { id: string } }) {
  const [complaint, setComplaint] = useState<ComplaintData | null>(null);

  useEffect(() => {
    fetchComplaint();
  }, []);

  const fetchComplaint = async () => {
    try {
      const res = await fetch(`https://complaint.top-wp.com/items/Complaint/${params.id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch complaint');
      }
      const data = await res.json();
      setComplaint(data.data);
    } catch (error) {
      console.error('Error fetching complaint:', error);
    }
  };

  if (!complaint) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 mr-64">
      <div className="flex justify-between items-center mb-6">
        <button className="bg-[#4664AD] text-white px-4 py-2 rounded-lg">
          تعديل
        </button>
        <h1 className="text-2xl font-bold">شكوى مياه</h1>
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