import React from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';

export default function GovernoratesPage() {
  const governorates = [
    { id: 1, name: 'بغداد', complaints: 250, resolved: 180 },
    { id: 2, name: 'البصرة', complaints: 150, resolved: 100 },
    { id: 3, name: 'نينوى', complaints: 120, resolved: 80 },
    { id: 4, name: 'أربيل', complaints: 90, resolved: 70 },
    { id: 5, name: 'النجف', complaints: 80, resolved: 60 },
    { id: 6, name: 'كربلاء', complaints: 70, resolved: 50 },
  ];

  return (
    <div className="p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          إضافة محافظة
        </button>
        <h1 className="text-3xl font-bold">المحافظات</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {governorates.map((governorate) => (
          <div key={governorate.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <FaMapMarkerAlt className="text-blue-500 text-xl" />
              <h3 className="text-xl font-semibold">{governorate.name}</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-600 font-semibold">{governorate.complaints}</span>
                <span className="text-gray-500">إجمالي الشكاوى</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600 font-semibold">{governorate.resolved}</span>
                <span className="text-gray-500">الشكاوى المحلولة</span>
              </div>
              <div className="relative pt-2">
                <div className="h-2 bg-gray-200 rounded">
                  <div 
                    className="h-2 bg-green-500 rounded" 
                    style={{ width: `${(governorate.resolved / governorate.complaints) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 