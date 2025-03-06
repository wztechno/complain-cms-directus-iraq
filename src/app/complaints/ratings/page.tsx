import React from 'react';
import { FaStar } from 'react-icons/fa';

export default function RatingsPage() {
  const ratings = [
    { id: 1, complaint: 'شكوى مياه', rating: 4, feedback: 'تم حل المشكلة بسرعة' },
    { id: 2, complaint: 'شكوى كهرباء', rating: 5, feedback: 'خدمة ممتازة' },
    { id: 3, complaint: 'شكوى طرق', rating: 3, feedback: 'حل جزئي للمشكلة' },
  ];

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, index) => (
      <FaStar
        key={index}
        className={index < rating ? 'text-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  return (
    <div className="p-8 mr-64">
      <h1 className="text-3xl font-bold mb-8 text-right">تقييمات الشكاوى</h1>

      <div className="space-y-4">
        {ratings.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-1">
                {renderStars(item.rating)}
              </div>
              <h3 className="text-xl font-semibold">{item.complaint}</h3>
            </div>
            <p className="text-gray-600 text-right">{item.feedback}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 