import React from 'react';

export default function TimelinePage() {
  return (
    <div className="p-8 mr-64">
      <h1 className="text-3xl font-bold mb-8 text-right">الحالة الزمنية للشكوى</h1>
      
      <div className="relative border-r-2 border-blue-500 mr-4">
        {[1, 2, 3].map((item, index) => (
          <div key={index} className="mb-8 mr-6">
            <div className="absolute right-[-9px] w-4 h-4 bg-blue-500 rounded-full"></div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="font-bold mb-2">حالة الشكوى {item}</div>
              <div className="text-gray-600">تفاصيل الحالة وتاريخ التحديث</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 