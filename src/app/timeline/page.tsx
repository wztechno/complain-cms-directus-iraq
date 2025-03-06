import React from 'react';
import TimelineTableRow from '@/components/TimelineTableRow';

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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-right">الحالة الزمنية للشكاوى</h1>
        
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