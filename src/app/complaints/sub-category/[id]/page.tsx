'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import ComplaintCard from '@/components/ComplaintCard';

interface SubCategory {
  id: number;
  name: string;
  icon: string | null;
  main_category: number | null;
  description?: string | null;
  created_at?: string;
}

interface MainCategory {
  id: number;
  name: string;
  service_type: string | null;
}

interface SubCategoryWithDetails extends SubCategory {
  mainCategoryDetails?: MainCategory;
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
  Complaint_Subcategory?: number | null;
}

interface StatusSubcategory {
  id: number;
  name: string;
  Complaint_Subcategory?: number | null;
  district?: number | null;
  districtName?: string;
  created_at?: string;
}

export default function SubCategoryDetailsPage({ params }: { params: { id: string } }) {
  const [category, setCategory] = useState<SubCategoryWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [statusSubcategories, setStatusSubcategories] = useState<StatusSubcategory[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [loadingStatusSubcategories, setLoadingStatusSubcategories] = useState(false);
  const [showComplaints, setShowComplaints] = useState(false);
  const [showStatusSubcategories, setShowStatusSubcategories] = useState(false);
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentStatusPage, setCurrentStatusPage] = useState(1);
  const complaintsPerPage = 6;
  const statusSubcategoriesPerPage = 6;
  const router = useRouter();

  useEffect(() => {
    fetchCategoryDetails();
  }, [params.id]);

  const fetchCategoryDetails = async () => {
    try {
      // Fetch sub-category details
      const res = await fetch(`https://complaint.top-wp.com/items/Complaint_sub_category/${params.id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch sub-category details');
      }
      const data = await res.json();
      const subCategory: SubCategoryWithDetails = data.data;

      // If there's a main category, fetch its details
      if (subCategory.main_category) {
        try {
          const mainCategoryRes = await fetch(`https://complaint.top-wp.com/items/Complaint_main_category/${subCategory.main_category}`);
          if (mainCategoryRes.ok) {
            const mainCategoryData = await mainCategoryRes.json();
            subCategory.mainCategoryDetails = mainCategoryData.data;
          }
        } catch (error) {
          console.error('Error fetching main category details:', error);
        }
      }

      setCategory(subCategory);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sub-category details:', error);
      setLoading(false);
    }
  };

  const fetchCategoryComplaints = async () => {
    try {
      setLoadingComplaints(true);
      
      // Make sure we have the category ID
      if (!params.id) {
        console.error('Category ID is not available for filtering');
        setLoadingComplaints(false);
        return;
      }
      
      console.log('Filtering by subcategory ID:', params.id);
      
      // Get auth token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        setLoadingComplaints(false);
        return;
      }
      
      // Use direct fetch with the simplest URL format
      const directUrl = `https://complaint.top-wp.com/items/Complaint?filter[Complaint_Subcategory][_eq]=${params.id}`;
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
      
      const data = await response.json();
      console.log('API response:', data);
      
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid API response format');
      }
      
      console.log(`Received ${data.data.length} complaints from API`);
      
      // Process complaints data
      let complaintsData = data.data;
      
      // Fetch districts to get district names using direct fetch for consistency
      const districtsResponse = await fetch('https://complaint.top-wp.com/items/District', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let districtsMap = new Map();
      if (districtsResponse.ok) {
        const districtsData = await districtsResponse.json();
        if (districtsData?.data && Array.isArray(districtsData.data)) {
          districtsMap = new Map(
            districtsData.data
              .filter((district: any) => district && district.id && district.name)
              .map((district: any) => [district.id, district.name])
          );
        }
      }
      
      // Add district names to complaints
      const processedComplaints = complaintsData
        .filter((complaint: any) => complaint !== null)
        .map((complaint: Complaint) => {
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

  const fetchStatusSubcategories = async () => {
    try {
      setLoadingStatusSubcategories(true);
      
      // Make sure we have the category ID
      if (!params.id) {
        console.error('Category ID is not available for filtering');
        setLoadingStatusSubcategories(false);
        return;
      }
      
      console.log('Filtering status subcategories by complaint subcategory ID:', params.id);
      
      // Get auth token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        setLoadingStatusSubcategories(false);
        return;
      }
      
      // Use direct fetch with the URL format for status subcategories
      const directUrl = `https://complaint.top-wp.com/items/Status_subcategory?filter[complaint_subcategory][_eq]=${params.id}`;
      console.log('Direct API request URL for status subcategories:', directUrl);
      
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
      
      const data = await response.json();
      console.log('API response for status subcategories:', data);
      
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid API response format');
      }
      
      console.log(`Received ${data.data.length} status subcategories from API`);
      
      // Process status subcategories data
      let statusSubcategoryData = data.data;
      
      // Fetch districts to get district names using direct fetch for consistency
      const districtsResponse = await fetch('https://complaint.top-wp.com/items/District', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let districtsMap = new Map();
      if (districtsResponse.ok) {
        const districtsData = await districtsResponse.json();
        if (districtsData?.data && Array.isArray(districtsData.data)) {
          districtsMap = new Map(
            districtsData.data
              .filter((district: any) => district && district.id && district.name)
              .map((district: any) => [district.id, district.name])
          );
        }
      }
      
      // Add district names to status subcategories
      const processedStatusSubcategories = statusSubcategoryData
        .filter((item: any) => item !== null)
        .map((item: StatusSubcategory) => {
          let districtName = 'غير محدد';
          if (item.district) {
            const mappedName = districtsMap.get(item.district);
            if (mappedName) {
              districtName = mappedName;
            }
          }
          
          return {
            ...item,
            districtName
          };
        });
      
      setStatusSubcategories(processedStatusSubcategories);
      setLoadingStatusSubcategories(false);
      setShowStatusSubcategories(true);
      
    } catch (error) {
      console.error('Error fetching status subcategories:', error);
      setLoadingStatusSubcategories(false);
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

  // Pagination calculation for status subcategories
  const indexOfLastStatusSubcategory = currentStatusPage * statusSubcategoriesPerPage;
  const indexOfFirstStatusSubcategory = indexOfLastStatusSubcategory - statusSubcategoriesPerPage;
  const currentStatusSubcategories = statusSubcategories.slice(indexOfFirstStatusSubcategory, indexOfLastStatusSubcategory);
  const totalStatusPages = Math.ceil(statusSubcategories.length / statusSubcategoriesPerPage);

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
        <div className="text-xl text-gray-600">لم يتم العثور على الفئة الفرعية</div>
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
          <div className="text-gray-500">
            {category.mainCategoryDetails?.name || 'لا توجد فئة رئيسية'}
          </div>
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
              الفئة الرئيسية
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {category.mainCategoryDetails ? (
                <div>
                  <div>{category.mainCategoryDetails.name}</div>
                  <div className="text-sm text-gray-500">
                    {category.mainCategoryDetails.service_type || 'خدمة عامة'}
                  </div>
                </div>
              ) : (
                'لا توجد فئة رئيسية'
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              تاريخ الإنشاء
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {category.created_at ? new Date(category.created_at).toLocaleDateString('ar-EG') : 'غير محدد'}
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

        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => {
              if (!showStatusSubcategories) {
                fetchStatusSubcategories();
              } else {
                setShowStatusSubcategories(false);
              }
            }}
            className="bg-[#4664AD] text-white px-6 py-2 rounded-lg hover:bg-[#3A5499]"
          >
            {showStatusSubcategories ? 'إخفاء الحالات المرتبطة' : 'عرض الحالات المرتبطة'}
          </button>
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
          {category.mainCategoryDetails && (
            <button
              onClick={() => router.push(`/complaints/main-category/${category.main_category}`)}
              className="bg-white text-[#4664AD] border border-[#4664AD] px-6 py-2 rounded-lg hover:bg-gray-50"
            >
              عرض الفئة الرئيسية
            </button>
          )}
        </div>
      </div>

      {/* Status Subcategories Section */}
      {showStatusSubcategories && (
        <div className="mt-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">الحالات المرتبطة بـ {category?.name}</h2>
          
          {loadingStatusSubcategories ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-xl text-gray-500">جاري تحميل الحالات...</div>
            </div>
          ) : statusSubcategories.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-xl text-gray-500 mb-2">لا توجد حالات مرتبطة بهذه الفئة</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentStatusSubcategories.map((status) => (
                  <div key={status.id} className="bg-white rounded-lg shadow-md p-4 relative">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-gray-500">{status.created_at ? new Date(status.created_at).toLocaleDateString('ar-EG') : 'غير محدد'}</div>
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-2 text-right">{status.name}</h3>
                    
                    <div className="flex justify-between items-center mt-8 mb-4 text-right">
                      <div className="text-gray-600">رقم التعريف: {status.id}</div>
                      <div className="text-gray-600">المحافظة: {status.districtName}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination for status subcategories */}
              {statusSubcategories.length > statusSubcategoriesPerPage && (
                <div className="mt-8 flex justify-center items-center">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentStatusPage(page => Math.max(1, page - 1))}
                      disabled={currentStatusPage === 1}
                      className={`p-2 rounded-lg ${currentStatusPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#4664AD] text-white hover:bg-[#3A5499]'}`}
                    >
                      <FaChevronRight />
                    </button>
                    <div className="flex items-center justify-center px-4 py-2 bg-white rounded-lg shadow-sm">
                      <span>{currentStatusPage}</span>
                      <span className="mx-2">/</span>
                      <span>{totalStatusPages || 1}</span>
                    </div>
                    <button 
                      onClick={() => setCurrentStatusPage(page => Math.min(totalStatusPages, page + 1))}
                      disabled={currentStatusPage === totalStatusPages || totalStatusPages === 0}
                      className={`p-2 rounded-lg ${currentStatusPage === totalStatusPages || totalStatusPages === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#4664AD] text-white hover:bg-[#3A5499]'}`}
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