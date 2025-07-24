'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import ComplaintCard from '@/components/ComplaintCard';
import { fetchWithAuth } from '@/utils/api';
interface MainCategory {
  id: number;
  name: string;
  service_type: string | null;
  icon: string | null;
  description?: string | null;
  created_at?: string;
}

interface Complaint {
  id: string;
  title: string;
  description: string;
  Service_type: string;
  district: number | null;
  districtName?: string;
  status_subcategory: string | number;
  completion_percentage: number;
  Complaint_main_category?: number | null;
  status?: string | number;
}

export default function MainCategoryDetailsPage({ params }: { params: { id: string } }) {
  const [category, setCategory] = useState<MainCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [showComplaints, setShowComplaints] = useState(false);
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const complaintsPerPage = 6;
  const router = useRouter();

  useEffect(() => {
    fetchCategoryDetails();
  }, [params.id]);

  const fetchCategoryDetails = async () => {
    try {
      const res = await fetchWithAuth(`/items/Complaint_main_category/${params.id}`);
      // if (!res.ok) {
      //   throw new Error('Failed to fetch category details');
      // }
      const data = await res;
      setCategory(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching category details:', error);
      setLoading(false);
    }
  };

  const fetchCategoryComplaints = async () => {
    try {
      setLoadingComplaints(true);
      
      // Make sure we have the category name
      if (!category || !category.name) {
        console.error('Category name is not available for filtering');
        setLoadingComplaints(false);
        return;
      }
      
      console.log('Filtering by category name:', category.name);
      
      // Get auth token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        setLoadingComplaints(false);
        return;
      }
      
      // Use direct fetch with the simplest URL format
      const directUrl = `/items/Complaint?filter[title][_eq]=${encodeURIComponent(category.name)}`;
      console.log('Direct API request URL:', directUrl);
      
      const response = await fetch(directUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        throw new Error(`API call failed: ${response.status}`);
      }
      
      const data = (await response.json()) as { data: Complaint[] };
      console.log('API response:', data);
      
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid API response format');
      }
      
      console.log(`Received ${data.data.length} complaints from API`);
      
      // Process complaints data
      const complaintsData: Complaint[] = data.data;
      
      // Fetch districts to get district names using direct fetch for consistency
      const districtsResponse = await fetchWithAuth('/items/District', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let districtsMap = new Map<number, string>();
      if (districtsResponse.ok) {
        // Expect data in the shape { data: { id: number; name: string }[] }
        const districtsJson = (await districtsResponse.json()) as { data: { id: number; name: string }[] };
        if (Array.isArray(districtsJson.data)) {
          districtsMap = new Map(districtsJson.data.map(({ id, name }) => [id, name]));
        }
      }
      
      // Add district names to complaints
      const processedComplaints = complaintsData.map((complaint) => {
        let districtName = 'غير محدد';
        if (complaint.district) {
          const mappedName = districtsMap.get(complaint.district);
          if (mappedName) {
            districtName = mappedName;
          }
        }
        
        return {
          ...complaint,
          districtName
        };
      });
      
      setComplaints(processedComplaints);
      setLoadingComplaints(false);
      setShowComplaints(true);
      
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setLoadingComplaints(false);
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

  // Pagination calculation
  const indexOfLastComplaint = currentPage * complaintsPerPage;
  const indexOfFirstComplaint = indexOfLastComplaint - complaintsPerPage;
  const currentComplaints = complaints.slice(indexOfFirstComplaint, indexOfLastComplaint);
  const totalPages = Math.ceil(complaints.length / complaintsPerPage);

  if (loading) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">لم يتم العثور على الفئة</div>
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

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="text-3xl font-bold">{category.name}</div>
          <div className="text-gray-500">{category.service_type || 'خدمة عامة'}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              الوصف
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {category.description || 'لا يوجد وصف'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              الأيقونة
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {category.icon || 'لا توجد أيقونة'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              تاريخ الإنشاء
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {new Date(category.created_at || '').toLocaleDateString('ar-EG')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              رقم التعريف
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {category.id}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => {
              if (!showComplaints) {
                fetchCategoryComplaints();
              } else {
                setShowComplaints(false);
              }
            }}
            className="bg-[#4664AD] text-white px-6 py-2 rounded-lg hover:bg-[#3A5499]"
          >
            {showComplaints ? 'إخفاء الشكاوى المرتبطة' : 'عرض الشكاوى المرتبطة'}
          </button>
        </div>
      </div>

      {/* Complaints Section */}
      {showComplaints && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6">الشكاوى المرتبطة بـ {category.name}</h2>
          
          {loadingComplaints ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-xl text-gray-500">جاري تحميل الشكاوى...</div>
            </div>
          ) : complaints.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-xl text-gray-500 mb-2">لا توجد شكاوى مرتبطة بهذه الفئة</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentComplaints.map((complaint) => (
                  <ComplaintCard
                    key={complaint.id}
                    id={complaint.id}
                    title={complaint.title || 'بدون عنوان'}
                    status={String(complaint.status ? complaint.status : "")}
                    mainCategory={category!.name}
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
              {complaints.length > complaintsPerPage && (
                <div className="mt-8 flex justify-center items-center">
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
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
} 