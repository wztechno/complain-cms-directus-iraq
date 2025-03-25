'use client';

import React, { useState, useEffect } from 'react';
import { GrFilter } from 'react-icons/gr';
import { FaFileDownload, FaPlus, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import ComplaintCard from '@/components/ComplaintCard';
import { fetchWithAuth } from '@/utils/api';
import { getUserPermissions, hasPermission, applyPermissionFilters, complaintMatchesPermissions } from '@/utils/permissions';

// Add interface for District
interface District {
  id: number;
  name: string;
}

// Add interface for Complaint with district relationship
interface Complaint {
  id: string;
  title: string;
  description: string;
  Service_type: string;
  district: number | null;
  districtName?: string; // This will store the district name after joining
  status_subcategory: string | number;
  completion_percentage: number;
  date?: string;
  statusDate?: string;
  // Add other fields as needed
}

export default function ComplaintsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
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

  useEffect(() => {
    fetchDistrictsAndComplaints();
  }, []);

  useEffect(() => {
    handleFilter();
  }, [filters]); // Run filter whenever filters change

  // New function to fetch districts first, then complaints
  const fetchDistrictsAndComplaints = async () => {
    try {
      setLoading(true);
      
      // First fetch districts
      const districtsData = await fetchWithAuth('/items/District');
      
      if (!districtsData || !districtsData.data) {
        console.error("No districts data returned from API");
        setDistricts([]);
      } else {
        // Log the first few districts to see their structure
        console.log("Districts data sample:", districtsData.data.slice(0, 3));
        console.log("Districts data types:", 
          districtsData.data.slice(0, 3).map((d: any) => ({
            id: d.id, 
            idType: typeof d.id,
            name: d.name
          }))
        );
        
        setDistricts(districtsData.data);
        console.log(`Fetched ${districtsData.data.length} districts`);
      }
      
      // Then fetch complaints
      await fetchComplaints();
    } catch (error) {
      console.error("Error fetching districts and complaints:", error);
      setLoading(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);

      // Get user permissions and info
      const userPermissions = await getUserPermissions();
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
      const ADMIN_ROLE_ID = '8A8C7803-08E5-4430-9C56-B2F20986FA56';
      const isAdmin = userInfo?.role?.id === ADMIN_ROLE_ID;

      let url = '/items/Complaint';
      
      // If not admin, apply filters based on user's permissions
      if (!isAdmin && userPermissions) {
        const filters = [];
        
        // Filter by district if user has district restrictions
        if (userPermissions.districtIds && userPermissions.districtIds.length > 0) {
          const districtFilter = `district={${userPermissions.districtIds.join(',')}}`;
          filters.push(districtFilter);
        }

        // Filter by status subcategory if user has status restrictions
        if (userPermissions.statusSubcategoryIds && userPermissions.statusSubcategoryIds.length > 0) {
          const statusFilter = `status_subcategory={${userPermissions.statusSubcategoryIds.join(',')}}`;
          filters.push(statusFilter);
        }

        // Add filters to URL if any exist
        if (filters.length > 0) {
          url += `?filter[_or]=[${filters.join(',')}]`;
        }
      }

      console.log('Fetching complaints with URL:', url);
      const response = await fetchWithAuth(url);

      if (!response || !response.data) {
        throw new Error('Failed to fetch complaints');
      }

      // Get district names for all complaints
      const districtsResponse = await fetchWithAuth('/items/District');
      const districtsMap = new Map(
        districtsResponse.data.map((district: District) => [district.id, district.name])
      );

      // Add district names to complaints
      let processedComplaints = response.data.map((complaint: Complaint) => ({
        ...complaint,
        districtName: complaint.district ? districtsMap.get(complaint.district) : 'غير محدد'
      }));

      // Additional permission filtering if needed
      if (!isAdmin) {
        processedComplaints = processedComplaints.filter((complaint: Complaint) => 
          complaintMatchesPermissions(complaint, userPermissions)
        );
      }

      // Sort complaints by date (newest first)
      processedComplaints = sortComplaintsByDate(processedComplaints);

      setComplaints(processedComplaints);
      setFilteredComplaints(processedComplaints);

      // Extract unique service types for filter dropdown
      const uniqueServiceTypes = Array.from(
        new Set(processedComplaints.map((c: Complaint) => c.Service_type || '').filter(Boolean))
      ) as string[];
      setServiceTypes(uniqueServiceTypes);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setLoading(false);
      setComplaints([]);
      setFilteredComplaints([]);
    }
  };

  const handleFilter = () => {
    try {
      let filtered = [...complaints];
      console.log(`Filtering from ${complaints.length} complaints`);

      if (filters.governorate) {
        filtered = filtered.filter(complaint => {
          if (!complaint.districtName) return false;
          return complaint.districtName === filters.governorate;
        });
        console.log(`After governorate filter (${filters.governorate}): ${filtered.length} complaints`);
      }

      if (filters.serviceType) {
        filtered = filtered.filter(complaint => 
          complaint.Service_type === filters.serviceType
        );
        console.log(`After service type filter (${filters.serviceType}): ${filtered.length} complaints`);
      }

      if (filters.startDate) {
        filtered = filtered.filter(complaint => {
          if (!complaint.statusDate && !complaint.date) return false;
          
          try {
            const dateStr = complaint.statusDate || complaint.date;
            if (!dateStr) return false;
            
            const complaintDate = new Date(dateStr);
            return !isNaN(complaintDate.getTime()) && complaintDate >= new Date(filters.startDate);
          } catch (error) {
            console.error('Error comparing dates:', error);
            return false;
          }
        });
        console.log(`After start date filter (${filters.startDate}): ${filtered.length} complaints`);
      }

      if (filters.endDate) {
        filtered = filtered.filter(complaint => {
          if (!complaint.statusDate && !complaint.date) return false;
          
          try {
            const dateStr = complaint.statusDate || complaint.date;
            if (!dateStr) return false;
            
            const complaintDate = new Date(dateStr);
            return !isNaN(complaintDate.getTime()) && complaintDate <= new Date(filters.endDate);
          } catch (error) {
            console.error('Error comparing dates:', error);
            return false;
          }
        });
        console.log(`After end date filter (${filters.endDate}): ${filtered.length} complaints`);
      }

      // Use the sortComplaintsByDate helper function to maintain newest to oldest order
      const sortedFiltered = sortComplaintsByDate(filtered);
      console.log('Sorted filtered complaints from newest to oldest');

      setFilteredComplaints(sortedFiltered);
      setCurrentPage(1); // Reset to first page when filtering
    } catch (error) {
      console.error('Error during filtering:', error);
      // If filtering fails, at least show something
      setFilteredComplaints(complaints);
    }
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
        `"${c.districtName || ''}"`,
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

  // Add a new function to fetch district details for a specific complaint if needed
  const fetchDistrictForComplaint = async (complaint: Complaint) => {
    if (!complaint.district || complaint.districtName) {
      return complaint; // No district ID or already has district name
    }
    
    try {
      const districtResponse = await fetchWithAuth(`/items/District/${complaint.district}`);
      if (districtResponse && districtResponse.data && districtResponse.data.name) {
        console.log(`Fetched district name "${districtResponse.data.name}" for complaint ${complaint.id}`);
        return {
          ...complaint,
          districtName: districtResponse.data.name
        };
      }
    } catch (error) {
      console.error(`Error fetching district for complaint ${complaint.id}:`, error);
    }
    
    return complaint;
  };
  
  // Update function to handle any missing district names
  const updateMissingDistrictNames = async (complaintsArray: Complaint[]) => {
    const complaintsWithoutDistricts = complaintsArray.filter(c => !c.districtName && c.district);
    
    if (complaintsWithoutDistricts.length === 0) {
      return complaintsArray; // No complaints need updating
    }
    
    console.log(`Found ${complaintsWithoutDistricts.length} complaints without district names. Fetching...`);
    
    // Process in smaller batches to avoid overloading the API
    const batchSize = 5;
    let updatedComplaints = [...complaintsArray];
    
    for (let i = 0; i < complaintsWithoutDistricts.length; i += batchSize) {
      const batch = complaintsWithoutDistricts.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(complaintsWithoutDistricts.length/batchSize)}`);
      
      const updatedBatch = await Promise.all(batch.map(complaint => fetchDistrictForComplaint(complaint)));
      
      // Update the complaints in the main array
      updatedBatch.forEach(updatedComplaint => {
        const index = updatedComplaints.findIndex(c => c.id === updatedComplaint.id);
        if (index !== -1) {
          updatedComplaints[index] = updatedComplaint;
        }
      });
    }
    
    // Sort complaints from newest to oldest before returning
    const sortedComplaints = sortComplaintsByDate(updatedComplaints);
    console.log("Ensuring complaints are sorted by date after district updates");
    return sortedComplaints;
  };

  // Helper function to sort complaints from newest to oldest
  const sortComplaintsByDate = (complaints: Complaint[]): Complaint[] => {
    return [...complaints].sort((a, b) => {
      // Helper function to safely get date values
      const getDateValue = (complaint: Complaint): number => {
        // Try to use statusDate first, then date, then fallback to 0
        if (complaint.statusDate) {
          const date = new Date(complaint.statusDate);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        }
        if (complaint.date) {
          const date = new Date(complaint.date);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        }
        return 0;
      };

      // Sort from newest (highest timestamp) to oldest (lowest timestamp)
      return getDateValue(b) - getDateValue(a);
    });
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
                  {districts.map((district) => (
                    <option key={district.id} value={district.name}>{district.name}</option>
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
                  location={complaint.districtName || 'غير محدد'}
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