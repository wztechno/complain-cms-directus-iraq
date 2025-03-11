import React from 'react';
import TimelineTableRow from '@/components/TimelineTableRow';
import { GrFilter } from 'react-icons/gr';

async function getComplaints() {
  const res = await fetch('https://complaint.top-wp.com/items/ComplaintTimeline');
  if (!res.ok) {
    throw new Error('Failed to fetch complaints');
  }
  return res.json();
}

export default async function TimelinePage() {
  const { data: complaints } = await getComplaints();

  return (
    <div className="min-h-screen bg-gray-100 p-8 mr-64">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold mb-6 text-right">الحالة الزمنية للشكاوى</h1>
            <div className="flex gap-4">
                <button 
                    className="h-10 w-10 hover:bg-[#4664AD] text-[#4664AD] hover:text-[#F9FAFB] p-2 rounded-lg bg-[#F9FAFB] flex items-center justify-center"
                    >
                    <GrFilter />
                    </button>
                    <button className="bg-[#4664AD] hover:bg-[#F9FAFB] hover:text-[#4664AD] text-[#F9FAFB] px-4 py-2 rounded-lg">
                    تصدير البيانات
                </button>
            </div>
        </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">رقم الشكوى</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الفئة الفرعية للشكوى</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ الحالة</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {complaints.map((complaint: any) => (
                <TimelineTableRow key={complaint.id} complaint={complaint} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 