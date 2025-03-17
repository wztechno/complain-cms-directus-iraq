'use client';

import React, { useEffect, useState } from 'react';
import ServiceCard from '@/components/ServiceCard';
import { useRouter } from 'next/navigation';
import { exportToCSV } from '@/utils/export';

interface District {
  id: number;
  name: string;
}

export default function GovernoratesPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDistricts();
  }, []);

  const fetchDistricts = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/District');
      if (!res.ok) {
        throw new Error('Failed to fetch districts');
      }
      const data = await res.json();
      setDistricts(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching districts:', error);
      setLoading(false);
    }
  };

  const handleCardClick = (districtId: number) => {
    router.push(`/governorates/${districtId}`);
  };

  const handleExport = () => {
    const exportData = districts.map(district => ({
      ID: district.id,
      Name: district.name
    }));

    exportToCSV(exportData, ['ID', 'Name'], 'governorates');
  };

  if (loading) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">المحافظات</h1>
        <div className="flex gap-4">
          <button 
            onClick={handleExport}
            className="bg-[#4664AD] text-white px-4 py-2 rounded-lg hover:bg-[#3A5499]"
          >
            تصدير البيانات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {districts.map((district) => (
          <div 
            key={district.id} 
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => handleCardClick(district.id)}
          >
            <div className="flex justify-between items-start">
              <span className="text-gray-500">{district.id}</span>
              <button className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">⋮</span>
              </button>
            </div>
            <h3 className="text-xl font-semibold text-right mt-4">{district.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
} 