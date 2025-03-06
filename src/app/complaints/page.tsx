import React from 'react';
import ComplaintCard from '@/components/ComplaintCard';

export default function ComplaintsPage() {
  const complaints = [
    {
      title: 'شكوى مياه',
      type: 'خدمة عامة',
      location: 'بغداد',
      issue: 'عدم وجود مياه',
      progress: 60,
    },
    // Add more complaints as needed
  ];

  return (
    <div className="p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <div className="flex space-x-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            انشاء شكوى
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            تصدير البيانات
          </button>
        </div>
        <h1 className="text-3xl font-bold">قائمة الشكاوى</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {complaints.map((complaint, index) => (
          <ComplaintCard
            key={index}
            {...complaint}
          />
        ))}
      </div>
    </div>
  );
} 