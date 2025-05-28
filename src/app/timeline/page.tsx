'use client';

import React, { useState, useEffect } from 'react';
import TimelineTableRow from '@/components/TimelineTableRow';
import { GrFilter } from 'react-icons/gr';
import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { fetchWithAuth } from '@/utils/api';
import { exportToCSV } from '@/utils/export';
import { buildStatusToUserMap, StatusToUserMap } from '@/utils/responsible-users';
import PermissionGuard from '@/components/PermissionGuard';

interface TimelineEntry {
  id: number;
  complaint_id: string;
  user_id: string;
  status_subcategory: string;
  statusDate: string;
  date: string;
  complaint_name?: string;
  user_name?: string;
  status_name?: string;
  responsible_user?: string;
}

export default function TimelinePage() {
  const [complaints, setComplaints] = useState<TimelineEntry[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    complaintId: ''
  });

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    handleFilter();
  }, [filters, complaints]);

  const fetchComplaints = async () => {
    try {
      const [timelineRes, complaintsRes, usersRes, statusRes] = await Promise.all([
        fetchWithAuth('/items/ComplaintTimeline'),
        fetchWithAuth('/items/Complaint'),
        fetchWithAuth('/items/Users'),
        fetchWithAuth('/items/Status_subcategory')
      ]);
    
      // Get responsible users map
      const responsibleUsersMap = await buildStatusToUserMap();
    
      const timelineData = timelineRes.data;
    
      // Map: complaint.id -> complaint.title and complaint.user (user_id)
      const complaintMap = Object.fromEntries(
        complaintsRes.data.map((c: any) => [c.id, { title: c.title, user: c.user }])
      );
    
      // Map: user.id -> full name
      const userMap = Object.fromEntries(
        usersRes.data.map((u: any) => [Number(u.id), u.full_name])
      );
      console.log("userMap",userMap);
      
    
      // Map: status_subcategory.id -> name
      const statusMap = Object.fromEntries(
        statusRes.data.map((s: any) => [s.id, s.name])
      );
    
      const enriched = timelineData.map((entry: any) => {
        const complaint = complaintMap[entry.complaint_id];
        const userName = complaint?.user ? userMap[String(complaint.user)] : '—';
        const responsibleUser = responsibleUsersMap[String(entry.status_subcategory)] || 'غير محدد';
    //     console.log("complaint",complaint);
    // console.log("user",userName);
        return {
          ...entry,
          complaint_name: complaint?.title || '—',
          user_name: userName,
          status_name: statusMap[entry.status_subcategory] || '—',
          responsible_user: responsibleUser
        };
      });
    
      setComplaints(enriched);
      setFilteredComplaints(enriched);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
      setLoading(false);
    }    
  };

  const handleFilter = () => {
    let filtered = [...complaints];

    if (filters.complaintId) {
      filtered = filtered.filter(complaint => 
        complaint.complaint_id.toString().includes(filters.complaintId)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(complaint => complaint.status_subcategory === filters.status);
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
    const headers = ['complaint_name', 'user_name', 'status_name', 'statusDate'];
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
    <PermissionGuard requiredPermissions={[{ resource: 'ComplaintTimeline', action: 'read' }]}>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                رقم الشكوى
              </label>
              <input
                type="text"
                value={filters.complaintId}
                onChange={(e) => setFilters({ ...filters, complaintId: e.target.value })}
                placeholder="ابحث برقم الشكوى"
                className="w-full border border-gray-300 rounded-md p-2 text-right"
              />
            </div>
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
                {Array.from(new Set(complaints.map(c => c.status_name)))
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
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الشكوى</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المواطن</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الحالة</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المسؤول</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredComplaints
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((complaint) => (
                  <TimelineTableRow key={complaint.id} complaint={complaint} />
              ))}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          <div className="mt-8 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              عرض {Math.min((currentPage - 1) * itemsPerPage + 1, filteredComplaints.length)} إلى{' '}
              {Math.min(currentPage * itemsPerPage, filteredComplaints.length)} من{' '}
              {filteredComplaints.length} سجل
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#4664AD] text-white hover:bg-[#3A5499]'}`}
              >
                <FaChevronRight />
              </button>
              <div className="flex items-center justify-center px-4 py-2 bg-white rounded-lg shadow-sm">
                <span>{currentPage}</span>
                <span className="mx-2">/</span>
                <span>{Math.ceil(filteredComplaints.length / itemsPerPage) || 1}</span>
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredComplaints.length / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(filteredComplaints.length / itemsPerPage)}
                className={`p-2 rounded-lg ${currentPage === Math.ceil(filteredComplaints.length / itemsPerPage) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#4664AD] text-white hover:bg-[#3A5499]'}`}
              >
                <FaChevronLeft />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </PermissionGuard>
  );
}
