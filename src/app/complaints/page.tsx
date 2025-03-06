'use client';

import React, { useState, useEffect } from 'react';
import { GrFilter } from 'react-icons/gr';
import ComplaintCard from '@/components/ComplaintCard';

export default function ComplaintsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    governorate: '',
    startDate: '',
    endDate: ''
  });

  const governorates = [
    'بغداد',
    'البصرة',
    'نينوى',
    'أربيل',
    'النجف',
    'كربلاء',
    'كركوك',
    'الأنبار',
    'ديالى',
    'واسط',
    'ميسان',
    'المثنى',
    'القادسية',
    'بابل',
    'ذي قار',
    'صلاح الدين',
    'دهوك',
    'السليمانية'
  ];

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    handleFilter();
  }, [filters]); // Run filter whenever filters change

  const fetchComplaints = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Complaint');
      if (!res.ok) {
        throw new Error('Failed to fetch complaints');
      }
      const data = await res.json();
      setComplaints(data.data);
      setFilteredComplaints(data.data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    }
  };

  const handleFilter = () => {
    let filtered = [...complaints];

    if (filters.governorate) {
      filtered = filtered.filter(complaint => 
        complaint.governorate_name === filters.governorate
      );
    }

    if (filters.startDate) {
      filtered = filtered.filter(complaint => {
        const complaintDate = new Date(complaint.statusDate || complaint.date);
        return complaintDate >= new Date(filters.startDate);
      });
    }

    if (filters.endDate) {
      filtered = filtered.filter(complaint => {
        const complaintDate = new Date(complaint.statusDate || complaint.date);
        return complaintDate <= new Date(filters.endDate);
      });
    }

    setFilteredComplaints(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <main className="flex-1 p-8 mr-64">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">قائمة الشكاوى</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 w-10 hover:bg-[#4664AD] text-[#4664AD] hover:text-[#F9FAFB] p-2 rounded-lg bg-[#F9FAFB] flex items-center justify-center"
            >
              <GrFilter />
            </button>
            <button className="bg-[#4664AD] hover:bg-[#F9FAFB] hover:text-[#4664AD] text-[#F9FAFB] px-4 py-2 rounded-lg">
              انشاء شكوى
            </button>
            <button className="bg-[#4664AD] hover:bg-[#F9FAFB] hover:text-[#4664AD] text-[#F9FAFB] px-4 py-2 rounded-lg">
              تصدير البيانات
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  المحافظة
                </label>
                <select
                  value={filters.governorate}
                  onChange={(e) => {
                    setFilters({ ...filters, governorate: e.target.value });
                  }}
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                >
                  <option value="">الكل</option>
                  {governorates.map((gov) => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  الى تاريخ
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredComplaints.map((complaint: any) => (
            <ComplaintCard
              key={complaint.id}
              title={complaint.title || 'بدون عنوان'}
              type={complaint.Service_type || 'غير محدد'}
              location={complaint.governorate_name || 'غير محدد'}
              issue={complaint.description || 'لا يوجد وصف'}
              progress={complaint.completion_percentage || 0}
            />
          ))}
        </div>
      </main>
    </div>
  );
} 