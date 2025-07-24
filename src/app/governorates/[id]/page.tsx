'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight } from 'react-icons/fa';
import { fetchWithAuth } from '@/utils/api';

interface District {
  id: number;
  name: string;
  governorate: number;
}

interface Governorate {
  id: number;
  name: string;
  created_at?: string;
  districts?: District[];
}

export default function GovernorateDetailsPage({ params }: { params: { id: string } }) {
  const [governorate, setGovernorate] = useState<Governorate | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchGovernorateDetails();
  }, [params.id]);

  const fetchGovernorateDetails = async () => {
    try {
      // Fetch governorate details
      const res = await fetchWithAuth(`/items/District/${params.id}`);
      if (!res) {
        throw new Error('Failed to fetch governorate details');
      }
      const data = await res;
      const governorateData: Governorate = data.data;

      // Fetch districts for this governorate
      try {
        const districtsRes = await fetchWithAuth(`/items/Governorate?filter[district][_eq]=${params.id}`);
        if (districtsRes.data) {
          const districtsData = await districtsRes.data;
          governorateData.districts = districtsData;
        }
      } catch (error) {
        console.error('Error fetching districts:', error);
      }

      setGovernorate(governorateData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching governorate details:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  if (!governorate) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">لم يتم العثور على المحافظة</div>
      </div>
    );
  }

  return (
    <div className="p-8 mr-64">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#4664AD] hover:text-[#3A5499]"
        >
          <FaArrowRight />
          <span>العودة إلى القائمة</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="text-3xl font-bold">{governorate.name}</div>
          <div className="text-gray-500">
            {governorate.districts?.length || 0} قضاء
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              رقم التعريف
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {governorate.id}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              تاريخ الإنشاء
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {governorate.created_at ? new Date(governorate.created_at).toLocaleDateString('ar-EG') : 'غير محدد'}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              الأقضية
            </label>
            <div className="bg-gray-50 p-4 rounded-lg">
              {governorate.districts && governorate.districts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {governorate.districts.map((district) => (
                    <div
                      key={district.id}
                      className="bg-white p-3 rounded-lg shadow-sm text-right"
                    >
                      <div className="font-medium">{district.name}</div>
                      <div className="text-sm text-gray-500">رقم التعريف: {district.id}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-right">لا توجد أقضية مسجلة</div>
              )}
            </div>
          </div>
        </div>

        {/* <div className="mt-8 flex justify-end">
          <button
            onClick={() => router.push(`/complaints?governorate=${governorate.name}`)}
            className="bg-[#4664AD] text-white px-6 py-2 rounded-lg hover:bg-[#3A5499]"
          >
            عرض الشكاوى المرتبطة
          </button>
        </div> */}
      </div>
    </div>
  );
} 