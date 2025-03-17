'use client';

import React, { useState, useEffect } from 'react';
import TimelineTableRow from '@/components/TimelineTableRow';
import { GrFilter } from 'react-icons/gr';
import { fetchWithAuth } from '@/utils/api';
import { exportToCSV } from '@/utils/export';

interface TimelineEntry {
  id: number;
  complaint_id: string;
  status_subcategory: string;
  statusDate: string;
  date: string;
}

export default function TimelinePage() {
  const [complaints, setComplaints] = useState<TimelineEntry[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: ''
  });

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    handleFilter();
  }, [filters]);

  const fetchComplaints = async () => {
    try {
      const response = await fetchWithAuth('/items/ComplaintTimeline');
      const data = response.data;
      setComplaints(data);
      setFilteredComplaints(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
      setLoading(false);
    }
  };

  const handleFilter = () => {
    let filtered = [...complaints];

    if (filters.status) {
      filtered = filtered.filter(complaint => 
        complaint.status_subcategory === filters.status
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

  const handleExport = () => {
    const headers = ['complaint_id', 'status_subcategory', 'statusDate'];
    exportToCSV(filteredComplaints, headers, 'timeline_export');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64 flex justify-center items-center">
        <div className="text-xl text-gray-600">جاري تحميل البيانات...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold mb-6 text-right">الحالة الزمنية للشكاوى</h1>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="h-10 w-10 hover:bg-[#4664AD] text-[#4664AD] hover:text-[#F9FAFB] p-2 rounded-lg bg-[#F9FAFB] flex items-center justify-center"
          >
            <GrFilter />
          </button>
          <button 
            onClick={handleExport}
            className="bg-[#4664AD] hover:bg-[#F9FAFB] hover:text-[#4664AD] text-[#F9FAFB] px-4 py-2 rounded-lg"
          >
            تصدير البيانات
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                الحالة
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
              >
                <option value="">الكل</option>
                {Array.from(new Set(complaints.map(c => c.status_subcategory)))
                  .filter(Boolean)
                  .map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))
                }
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

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">رقم الشكوى</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الفئة الفرعية للحالة</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredComplaints.map((complaint) => (
                <TimelineTableRow key={complaint.id} complaint={complaint} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 