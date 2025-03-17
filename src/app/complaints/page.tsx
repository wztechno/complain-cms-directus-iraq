'use client';

import React, { useState, useEffect } from 'react';
import { GrFilter } from 'react-icons/gr';
import { FaFileDownload, FaPlus, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import ComplaintCard from '@/components/ComplaintCard';

export default function ComplaintsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<any[]>([]);
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const complaintsPerPage = 10;
  
  const [filters, setFilters] = useState({
    governorate: '',
    startDate: '',
    endDate: '',
    serviceType: ''
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
    setLoading(true);
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Complaint');
      if (!res.ok) {
        throw new Error('Failed to fetch complaints');
      }
      const data = await res.json();
      
      // Sort complaints by date, newest first
      const sortedComplaints = data.data.sort((a: any, b: any) => {
        const dateA = new Date(a.statusDate || a.date || 0);
        const dateB = new Date(b.statusDate || b.date || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setComplaints(sortedComplaints);
      setFilteredComplaints(sortedComplaints);
      
      // Extract unique service types for filter
      const types = [...new Set(sortedComplaints.map((complaint: any) => complaint.Service_type))]
        .filter(Boolean) as string[];
      setServiceTypes(types);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setLoading(false);
    }
  };

  const handleFilter = () => {
    let filtered = [...complaints];

    if (filters.governorate) {
      filtered = filtered.filter(complaint => 
        complaint.governorate_name === filters.governorate
      );
    }

    if (filters.serviceType) {
      filtered = filtered.filter(complaint => 
        complaint.Service_type === filters.serviceType
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

    // Maintain newest to oldest order after filtering
    filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.statusDate || a.date || 0);
      const dateB = new Date(b.statusDate || b.date || 0);
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredComplaints(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const toggleComplaintSelection = (id: string) => {
    setSelectedComplaints(prev => {
      if (prev.includes(id)) {
        return prev.filter(complaintId => complaintId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleExport = (exportType: 'all' | 'selected') => {
    // Determine which complaints to export
    const complaintsToExport = exportType === 'all' 
      ? filteredComplaints 
      : filteredComplaints.filter(complaint => selectedComplaints.includes(complaint.id));
    
    if (complaintsToExport.length === 0) {
      alert('لا توجد شكاوى للتصدير');
      return;
    }
    
    // Create CSV content
    const headers = ['ID', 'العنوان', 'الوصف', 'نوع الخدمة', 'المحافظة', 'نسبة الإكمال', 'التاريخ'];
    const csvContent = [
      headers.join(','),
      ...complaintsToExport.map(c => [
        c.id,
        `"${c.title || ''}"`,
        `"${c.description || ''}"`,
        `"${c.Service_type || ''}"`,
        `"${c.governorate_name || ''}"`,
        c.completion_percentage || 0,
        c.date || ''
      ].join(','))
    ].join('\n');
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `complaints_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Close export options dropdown
    setShowExportOptions(false);
  };
  
  // Pagination calculation
  const indexOfLastComplaint = currentPage * complaintsPerPage;
  const indexOfFirstComplaint = indexOfLastComplaint - complaintsPerPage;
  const currentComplaints = filteredComplaints.slice(indexOfFirstComplaint, indexOfLastComplaint);
  const totalPages = Math.ceil(filteredComplaints.length / complaintsPerPage);

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
            <button 
              onClick={() => window.location.href = '/complaints/create'} 
              className="bg-[#4664AD] hover:bg-[#F9FAFB] hover:text-[#4664AD] text-[#F9FAFB] px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FaPlus size={14} />
              <span>انشاء شكوى</span>
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowExportOptions(!showExportOptions)} 
                className="bg-[#4664AD] hover:bg-[#F9FAFB] hover:text-[#4664AD] text-[#F9FAFB] px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <FaFileDownload size={14} />
                <span>تصدير البيانات</span>
              </button>
              {showExportOptions && (
                <div className="absolute left-0 mt-2 bg-white rounded-lg shadow-lg w-48 z-10">
                  <button 
                    onClick={() => handleExport('all')} 
                    className="block w-full text-right px-4 py-2 hover:bg-gray-100 rounded-t-lg"
                  >
                    تصدير كل الشكاوى
                  </button>
                  <button 
                    onClick={() => handleExport('selected')} 
                    className="block w-full text-right px-4 py-2 hover:bg-gray-100 rounded-b-lg"
                  >
                    تصدير الشكاوى المحددة ({selectedComplaints.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  نوع الخدمة
                </label>
                <select
                  value={filters.serviceType}
                  onChange={(e) => {
                    setFilters({ ...filters, serviceType: e.target.value });
                  }}
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                >
                  <option value="">الكل</option>
                  {serviceTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-500">جاري تحميل البيانات...</div>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-500">لا توجد شكاوى</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentComplaints.map((complaint: any) => (
                <ComplaintCard
                  key={complaint.id}
                  id={complaint.id}
                  title={complaint.title || 'بدون عنوان'}
                  type={complaint.Service_type || 'غير محدد'}
                  location={complaint.governorate_name || 'غير محدد'}
                  issue={complaint.description || 'لا يوجد وصف'}
                  progress={complaint.completion_percentage || 0}
                  isSelected={selectedComplaints.includes(complaint.id)}
                  onSelect={toggleComplaintSelection}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                عرض {indexOfFirstComplaint + 1} - {Math.min(indexOfLastComplaint, filteredComplaints.length)} من {filteredComplaints.length} شكوى
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#4664AD] text-white hover:bg-[#3A5499]'}`}
                >
                  <FaChevronRight />
                </button>
                <div className="flex items-center justify-center px-4 py-2 bg-white rounded-lg shadow-sm">
                  <span>{currentPage}</span>
                  <span className="mx-2">/</span>
                  <span>{totalPages || 1}</span>
                </div>
                <button 
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`p-2 rounded-lg ${currentPage === totalPages || totalPages === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#4664AD] text-white hover:bg-[#3A5499]'}`}
                >
                  <FaChevronLeft />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
} 