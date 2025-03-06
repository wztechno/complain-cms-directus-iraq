import React from 'react';

async function getComplaintTimeline(id: string) {
  const res = await fetch(`https://complaint.top-wp.com/items/Complaint/${id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch complaint details');
  }
  return res.json();
}

export default async function ComplaintTimelinePage({ params }: { params: { id: string } }) {
  const complaint = await getComplaintTimeline(params.id);

  const timelineSteps = [
    { id: 1, subcategory: "الفئة الفرعية للشكوى", date: "٢٥/٢/٢٠٢٤" },
    { id: 2, subcategory: "الفئة الفرعية للشكوى", date: "٢٥/٢/٢٠٢٤" },
    { id: 3, subcategory: "الفئة الفرعية للشكوى", date: "٢٥/٢/٢٠٢٤" },
    { id: 4, subcategory: "الفئة الفرعية للشكوى", date: "٢٥/٢/٢٠٢٤" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8 mr-64">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-right">الحالة الزمنية للشكوى {params.id}</h1>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">رقم</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الفئة الفرعية للشكوى</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timelineSteps.map((step) => (
                <tr key={step.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-right text-sm text-gray-900">{step.id}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">{step.subcategory}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">{step.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 