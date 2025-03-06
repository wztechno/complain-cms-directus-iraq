import React from 'react';

export default function MainCategoryPage() {
  const categories = [
    { id: 1, name: 'مياه', count: 150 },
    { id: 2, name: 'كهرباء', count: 120 },
    { id: 3, name: 'طرق', count: 80 },
    // Add more categories as needed
  ];

  return (
    <div className="p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          إضافة فئة جديدة
        </button>
        <h1 className="text-3xl font-bold">الفئات الأساسية للشكاوى</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2 text-right">{category.name}</h3>
            <div className="flex justify-between items-center">
              <span className="text-blue-600 font-semibold">{category.count}</span>
              <span className="text-gray-500">عدد الشكاوى</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 