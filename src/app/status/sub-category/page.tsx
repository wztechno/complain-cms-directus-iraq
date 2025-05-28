'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/api';
import { getUserPermissions } from '@/utils/permissions';
import { GrFilter } from 'react-icons/gr';
import PermissionGuard from '@/components/PermissionGuard';
import { buildStatusToUserMap, StatusToUserMap } from '@/utils/responsible-users';

interface StatusSubCategory {
  id: number;
  name: string;
  status_category: StatusCategory | null;
  district: District | null;
  complaint_subcategory: ComplaintSubCategory | null;
  nextstatus: StatusSubCategory | null;
}

interface ComplaintSubCategory {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
  active?: boolean;
  [key: string]: unknown;
}

interface StatusCategory {
  id: number;
  name: string;
}

interface StatusSubCategoryWithDetails extends StatusSubCategory {
  district: District;
  nextStatusDetails?: StatusSubCategory;
  statusCategoryDetails?: StatusCategory;
}

interface RoleData {
  id: string;
  name: string;
  district_id?: number;
  [key: string]: unknown;
}

interface StatusSubCategoryOption {
  id: number;
  name: string;
  district?: District;
  complaint_subcategory?: ComplaintSubCategory;
  [key: string]: unknown;
}

export default function StatusSubCategoryPage() {
  const [subCategories, setSubCategories] = useState<StatusSubCategoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSubCategory, setShowAddSubCategory] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [statusCategories, setStatusCategories] = useState<StatusCategory[]>([]);
  const [complaintSubCategories, setComplaintSubCategories] = useState<ComplaintSubCategory[]>([]);
  const [filteredComplaintSubCategories, setFilteredComplaintSubCategories] = useState<ComplaintSubCategory[]>([]);
  const [filteredNextStatusOptions, setFilteredNextStatusOptions] = useState<StatusSubCategoryWithDetails[]>([]);
  const [responsibleUsers, setResponsibleUsers] = useState<StatusToUserMap>({});
  const [newSubCategory, setNewSubCategory] = useState({
    name: '',
    status_category: '',
    district: '',
    nextstatus: '',
    complaint_subcategory: '',
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  // Add a state to track active district filtering
  const [activeDistrictFilter, setActiveDistrictFilter] = useState<number | ''>('');
  const [activeStatusCategoryFilter, setActiveStatusCategoryFilter] = useState<string>('');

  // Function to fetch complaint subcategories by district ID
  const fetchComplaintSubcategoriesByDistrict = async (districtId: string | number) => {
    try {
      console.log(`Fetching complaint subcategories for district ID: ${districtId}`);
      // Make sure we're using a direct API call to avoid any permission issues
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        return [];
      }
      
      const response = await fetch(`https://complaint.top-wp.com/items/Complaint_sub_category?filter[district][_eq]=${districtId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`Error fetching complaint subcategories: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      if (data && data.data) {
        console.log(`Found ${data.data.length} complaint subcategories for district ${districtId}`);
        return data.data;
      } else {
        console.warn(`No complaint subcategories found for district ${districtId}`);
        return [];
      }
    } catch (error) {
      console.error(`Error fetching complaint subcategories for district ${districtId}:`, error);
      return [];
    }
  };

  // Handle district selection change with immediate subcategory update
  const handleDistrictChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDistrictId = e.target.value;
    console.log("Selected district changed to:", newDistrictId);
    
    // Update the form state with the new district
    setNewSubCategory({ 
      ...newSubCategory, 
      district: newDistrictId,
      // Reset complaint subcategory when district changes
      complaint_subcategory: '',
      // Also reset next status when district changes
      nextstatus: ''
    });
    
    // Immediately fetch and update the filtered subcategories
    if (newDistrictId) {
      const filteredData = await fetchComplaintSubcategoriesByDistrict(newDistrictId);
      console.log("Setting filtered subcategories:", filteredData);
      setFilteredComplaintSubCategories(filteredData);
      
      // Reset filtered next status options since district changed
      setFilteredNextStatusOptions([]);
    } else {
      // If no district selected, show all subcategories
      console.log("No district selected, showing all subcategories");
      setFilteredComplaintSubCategories(complaintSubCategories);
      setFilteredNextStatusOptions(subCategories);
    }
  };

  // Effect to initialize filtered subcategories when complaint subcategories change
  useEffect(() => {
    // Initialize filtered with all subcategories when they're first loaded
    if (complaintSubCategories.length > 0 && !newSubCategory.district) {
      console.log("Initializing filtered subcategories with all subcategories:", complaintSubCategories);
      setFilteredComplaintSubCategories(complaintSubCategories);
    }
  }, [complaintSubCategories, newSubCategory.district]);

  // Let's add more detailed logging for dropdown state
  useEffect(() => {
    console.log("Current form state:", {
      name: newSubCategory.name,
      district: newSubCategory.district,
      complaint_subcategory: newSubCategory.complaint_subcategory,
      nextstatus: newSubCategory.nextstatus,
      subcategories_count: filteredComplaintSubCategories.length
    });
  }, [newSubCategory, filteredComplaintSubCategories]);

  // Effect to initialize filtered next status options on load
  useEffect(() => {
    // Initialize filtered next status options with all status subcategories
    if (subCategories.length > 0 && !newSubCategory.complaint_subcategory) {
      console.log("Initializing filtered next status options with all status subcategories:", subCategories);
      setFilteredNextStatusOptions(subCategories);
    }
  }, [subCategories, newSubCategory.complaint_subcategory]);

  // Let's add a debug effect to log when filterComplaintSubCategories changes
  useEffect(() => {
    console.log("Filtered complaint subcategories updated:", filteredComplaintSubCategories);
  }, [filteredComplaintSubCategories]);

  // Debug effect to log when filtered next status options change
  useEffect(() => {
    console.log("Filtered next status options updated:", filteredNextStatusOptions);
  }, [filteredNextStatusOptions]);

  useEffect(() => {
    const userInfoStr = localStorage.getItem('user_info');
    const hasReloaded = localStorage.getItem('reload_once');
    const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
    const previousUserId = localStorage.getItem('current_user_id');
    const currentUserId = userInfo?.id;
    
    // Check if this is a post-logout navigation
    const isPostLogout = sessionStorage.getItem('logged_out');
    if (isPostLogout) {
      // Clear the flag so we don't keep reloading
      sessionStorage.removeItem('logged_out');
      // If we're coming back to this page after login, make sure we get fresh data
      console.log('Detected post-logout navigation, refreshing page...');
      window.location.reload();
      return;
    }
    
    // If we have a user ID and it's different from the previous one stored, reload
    if (currentUserId && previousUserId && currentUserId !== previousUserId) {
      console.log('User changed, reloading page...');
      window.location.reload();
      return;
    }
    
    // Store the current user ID for future comparison
    if (currentUserId) {
      localStorage.setItem('current_user_id', currentUserId);
    }

    if (!userInfoStr && !hasReloaded) {
      localStorage.setItem('reload_once', 'true');
      window.location.reload();
      return;
    }

    if (hasReloaded) {
      localStorage.removeItem('reload_once');
    }
    
    fetchSubCategories();
    fetchDistricts();
    fetchStatusCategories();
  }, []);

  const fetchSubCategories = async () => {
    try {
      setLoading(true);  
      const userPermissions = await getUserPermissions();

      // Get user info for role matching
      const userInfoStr = localStorage.getItem('user_info');
      const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
  
      // Get role title from userInfo
      const role = userInfo?.role;
      const rolesData = await fetchWithAuth(`/roles/${role}`);
      const district_id = rolesData.data.district_id;
      console.log("User's district ID from role:", district_id);
  
      let resData;
  
      if (userPermissions.isAdmin) {
        // Admin: Fetch all subcategories
        resData = await fetch(`https://complaint.top-wp.com/items/Status_subcategory?fields=*,district.*,status_category.*,nextstatus.*,complaint_subcategory.*`);
        setIsAdmin(true);
      } else {
        // Non-admin: Filter by district
        resData = await fetch(`https://complaint.top-wp.com/items/Status_subcategory?filter[district][_eq]=${district_id}&fields=*,district.*,status_category.*,nextstatus.*,complaint_subcategory.*`);
        setIsAdmin(false);
      }
      
      const res = await resData.json();
      console.log("res", res);
      if (!res?.data) throw new Error("No data returned");
      setSubCategories(res.data);

      // Fetch complaint subcategories based on user's district or all if admin
      const  complaintSubCategoriesData = await fetch(`https://complaint.top-wp.com/items/Complaint_sub_category?filter[district][_eq]=${district_id}`);
      const complaintSubCategoriesResponse = await complaintSubCategoriesData.json();
      if (complaintSubCategoriesResponse && complaintSubCategoriesResponse.data) {
        console.log("complaintSubCategories", complaintSubCategoriesResponse.data);
        setComplaintSubCategories(complaintSubCategoriesResponse.data);
        // Also set the filtered list initially to the same as all complaint subcategories
        setFilteredComplaintSubCategories(complaintSubCategoriesResponse.data);
      }

      // Fetch responsible users
      const responsibleUsersMap = await buildStatusToUserMap();
      setResponsibleUsers(responsibleUsersMap);
  
      setLoading(false);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setLoading(false);
    }
  };
  

  const fetchDistricts = async () => {
    try {
      const userInfoStr = localStorage.getItem('user_info');
      const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
      const userPermissions = await getUserPermissions();
      
      const res = await fetchWithAuth('/items/District?filter[active][_eq]=true');
      if (res && res.data) {
        let districtsData = res.data;
        
        if (!userPermissions.isAdmin && userPermissions.districtIds && userPermissions.districtIds.length > 0) {
          console.log('Filtering districts based on user permissions:', userPermissions.districtIds);
          
          const userDistrictIds = userPermissions.districtIds.map(id => Number(id));
          
          if (userInfo?.role_title && districtsData.length > 0) {
            console.log("Attempting to match role_title with district in fetchDistricts:", userInfo.role_title);
            
            const districtMapping: {[key: string]: string[]} = {
              'baghdad': ['بغداد', 'Baghdad', 'بغداد الكرخ', 'بغداد الرصافة'],
              'basra': ['البصرة', 'Basra', 'البصره'],
              'najaf': ['النجف', 'Najaf'],
              'karbala': ['كربلاء', 'Karbala'],
              'anbar': ['الأنبار', 'Anbar', 'الانبار'],
              'diyala': ['ديالى', 'Diyala'],
              'kirkuk': ['كركوك', 'Kirkuk'],
              'wasit': ['واسط', 'Wasit'],
              'nineveh': ['نينوى', 'Nineveh'],
              'saladin': ['صلاح الدين', 'Saladin'],
              'babil': ['بابل', 'Babil'],
            };
            
            const roleLower = userInfo.role_title.toLowerCase();
            let matchedDistrictIds: number[] = [];
            
            Object.entries(districtMapping).forEach(([englishName, arabicVariants]) => {
              if (roleLower.includes(englishName)) {
                console.log(`Found match in fetchDistricts: role contains "${englishName}"`);
                const matchingDistricts = districtsData.filter((district: District) => 
                  arabicVariants.some(variant => 
                    district.name.includes(variant) || variant.includes(district.name)
                  )
                );
                
                if (matchingDistricts.length > 0) {
                  console.log("Matched districts for dropdown:", matchingDistricts.map((d: District) => ({id: d.id, name: d.name})));
                  matchedDistrictIds = [...matchedDistrictIds, ...matchingDistricts.map((d: District) => Number(d.id))];
                }
              }
            });
            
            if (matchedDistrictIds.length > 0) {
              const combinedIds = [...new Set([...userDistrictIds, ...matchedDistrictIds])];
              districtsData = districtsData.filter((district: District) => 
                combinedIds.includes(Number(district.id))
              );
            } else {
              districtsData = districtsData.filter((district: District) => 
                userDistrictIds.includes(Number(district.id))
              );
            }
          } else {
            districtsData = districtsData.filter((district: District) => 
              userDistrictIds.includes(Number(district.id))
            );
          }
        }
        
        setDistricts(districtsData);
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  };

  const fetchStatusCategories = async () => {
    try {
      const res = await fetchWithAuth('/items/Status_category');
      const data = await res.data;
        setStatusCategories(data);
        console.log("data", data);
    } catch (error) {
      console.error('Error fetching status categories:', error);
    }
  };

  const handleExport = async () => {
    try {
      if (subCategories.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
      }
      
      const csvData = subCategories.map(subCategory => ({
        ID: subCategory.id,
        Name: subCategory.name,
        Category: subCategory.statusCategoryDetails?.name || '',
        District: subCategory.district?.name || '',
        NextStatus: subCategory.nextStatusDetails?.name || '',
      }));

      const headers = Object.keys(csvData[0]);
      const csv = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
      ].join('\n');

      const bom = '\uFEFF';
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'status_subcategories.csv';
      link.click();
    } catch (error) {
      console.error('Error exporting sub-categories:', error);
      alert('حدث خطأ أثناء تصدير البيانات');
    }
  };

  const handleAddSubCategory = async () => {
    try {
      const res = await fetchWithAuth('/items/Status_subcategory', {
        method: 'POST',
        body: JSON.stringify({
          name: newSubCategory.name,
          status_category: newSubCategory.status_category ? Number(newSubCategory.status_category) : null,
          district: newSubCategory.district ? Number(newSubCategory.district) : null,
          nextstatus: newSubCategory.nextstatus ? Number(newSubCategory.nextstatus) : null,
          complaint_subcategory: newSubCategory.complaint_subcategory ? Number(newSubCategory.complaint_subcategory) : null,
        })
      });

      if (!res) {
        throw new Error('Failed to add sub-category');
      }

      setShowAddSubCategory(false);
      setNewSubCategory({ name: '', status_category: '', district: '', nextstatus: '', complaint_subcategory: '' });
      fetchSubCategories();
    } catch (error) {
      console.error('Error adding sub-category:', error);
      alert('حدث خطأ أثناء إضافة الفئة الفرعية');
    }
  };

  // Function to fetch status subcategories filtered by complaint subcategory
  const fetchNextStatusByComplaintSubcategory = async (complaintSubcategoryId: string | number) => {
    try {
      if (!complaintSubcategoryId) {
        console.log("No complaint subcategory ID provided");
        setFilteredNextStatusOptions(subCategories);
        return;
      }
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      // Get the current selected district ID
      const selectedDistrictId = newSubCategory.district;
      
      console.log(`Fetching next status options for complaint subcategory ID: ${complaintSubcategoryId} and district ID: ${selectedDistrictId || 'none'}`);
      
      // Log the first few subcategories to understand their structure
      if (subCategories.length > 0) {
        console.log("Example subcategory structure:", JSON.stringify(subCategories[0], null, 2));
      }
      
      // Build URL with proper filtering - if we have a district, filter by both district and complaint subcategory
      let url = `https://complaint.top-wp.com/items/Status_subcategory?filter[complaint_subcategory][_eq]=${complaintSubcategoryId}`;
      
      if (selectedDistrictId) {
        url += `&filter[district][_eq]=${selectedDistrictId}`;
      }
      
      // Add fields to include all related data
      url += `&fields=*,complaint_subcategory.*,district.*,nextstatus.*,status_category.*`;
      
      console.log(`Making direct API request to: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`Error fetching status subcategories: ${response.status}`);
        setFilteredNextStatusOptions([]);
        return;
      }
      
      const data = await response.json();
      
      if (data && data.data && Array.isArray(data.data)) {
        console.log(`Found ${data.data.length} matching next status options from API:`, data.data);
        
        // Make sure we have all fields needed for display
        const processedOptions = data.data.map((option: StatusSubCategoryOption) => {
          return {
            ...option,
            id: option.id,
            name: option.name || `Status ID: ${option.id}`,
            district: option.district || null,
            complaint_subcategory: option.complaint_subcategory || null
          };
        });
        
        setFilteredNextStatusOptions(processedOptions);
        
        // Reset next status selection
        setNewSubCategory(prev => ({
          ...prev,
          nextstatus: ""
        }));
      } else {
        console.warn(`No matching next status options found for complaint subcategory ID: ${complaintSubcategoryId} and district ID: ${selectedDistrictId || 'none'}`);
        setFilteredNextStatusOptions([]);
      }
    } catch (error) {
      console.error('Error fetching next status by complaint subcategory:', error);
      setFilteredNextStatusOptions([]);
    }
  };

  // Handler for complaint subcategory change
  const handleComplaintSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const complaintSubcategoryId = e.target.value;
    console.log(`Complaint subcategory changed to: ${complaintSubcategoryId}`);
    
    // Update the form state with the selected complaint subcategory
    setNewSubCategory(prev => ({
      ...prev,
      complaint_subcategory: complaintSubcategoryId,
      nextstatus: "" // Reset next status when complaint subcategory changes
    }));

    // If a valid complaint subcategory is selected, fetch filtered next status options
    if (complaintSubcategoryId) {
      fetchNextStatusByComplaintSubcategory(complaintSubcategoryId);
    } else {
      // If no complaint subcategory is selected, reset to all status subcategories
      setFilteredNextStatusOptions(subCategories);
    }
  };

  if (loading) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }
  
  return (
    <PermissionGuard requiredPermissions={[{ resource: 'Status_subcategory', action: 'read' }]}>
    <div className="p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">الفئة الفرعية للحالة</h1>
        <div className="flex gap-4">
          <button 
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 w-10 hover:bg-[#4664AD] text-[#4664AD] hover:text-[#F9FAFB] p-2 rounded-lg bg-[#F9FAFB] flex items-center justify-center"
            >
              <GrFilter />
          </button>
          <button 
            onClick={() => setShowAddSubCategory(true)}
            className="bg-[#4664AD] hover:bg-[#F9FAFB] hover:text-[#4664AD] text-[#F9FAFB] px-4 py-2 rounded-lg flex items-center gap-2"
            >
            إضافة فئة فرعية جديدة
          </button>
          <button
            onClick={handleExport}
            className="bg-[#4664AD] text-white px-4 py-2 rounded-lg hover:bg-[#3A5499]"
          >
            تصدير البيانات
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (   
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* District Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المحافظة
              </label>
              <select
                value={activeDistrictFilter}
                onChange={(e) => setActiveDistrictFilter(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="">جميع المحافظات</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الفئة الرئيسية
              </label>
              <select
                value={activeStatusCategoryFilter}
                onChange={(e) => setActiveStatusCategoryFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="">جميع الفئات</option>
                {statusCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {(activeDistrictFilter || activeStatusCategoryFilter) && (
        <div className="mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
          <div className="flex items-center text-blue-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold ml-1">تصفية حسب:</span>
            <div className="ml-3 text-blue-600 flex gap-2">
              {activeDistrictFilter && (
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {districts.find(d => d.id === activeDistrictFilter)?.name}
                </span>
              )}
              {activeStatusCategoryFilter && (
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {statusCategories.find(c => c.id === Number(activeStatusCategoryFilter))?.name}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subCategories
          .filter(subCategory => {
            // Apply district filter
            if (activeDistrictFilter && subCategory.district?.id !== activeDistrictFilter) {
              return false;
            }
            // Apply status category filter
            if (activeStatusCategoryFilter && subCategory.status_category?.id !== Number(activeStatusCategoryFilter)) {
              return false;
            }
            return true;
          })
          .map((subCategory) => (
          <div 
            key={subCategory.id} 
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => router.push(`/status/sub-category/${subCategory.id}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <span>{subCategory.complaint_subcategory?.name}</span>
              <span className="text-gray-500">
                {subCategory.status_category?.name}
              </span>
            </div>

            <h3 className="text-xl font-semibold text-right mb-4">{subCategory.name}</h3>

            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
              <div className="text-right text-sm text-gray-600">
                <span className="font-semibold ml-2">المسؤول:</span>
              <span>{responsibleUsers[String(subCategory.id)] || 'غير محدد'}</span>
              </div>
              <span>{subCategory.district?.name}</span>
            </div>

            <div className="border-t pt-4 mt-2">
              <div className="text-right text-sm text-gray-600 mb-2">
                <span className="font-semibold ml-2">الحالة التالية:</span>
                <span>{subCategory.nextstatus?.name || 'ابلاغ المواطن بضرورة الترخيص'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* <div className="mt-8">
        <button 
          onClick={() => setShowAddSubCategory(true)}
          className="w-full bg-[#4664AD] text-white py-3 rounded-lg text-lg hover:bg-[#3A5499] transition-colors"
        >
          إضافة فئة فرعية جديدة
        </button>
      </div> */}

      {showAddSubCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">إضافة فئة فرعية جديدة</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم الفئة الفرعية
                </label>
                <input
                  type="text"
                  value={newSubCategory.name}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  placeholder="أدخل اسم الفئة الفرعية"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الفئة الرئيسية
                </label>
                <select
                  value={newSubCategory.status_category}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, status_category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  required
                >
                  <option value="">اختر الفئة الرئيسية</option>
                  {statusCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المحافظة
                </label>
                <select
                  value={newSubCategory.district}
                  onChange={handleDistrictChange}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="">اختر المحافظة</option>
                  {districts.length > 0 && isAdmin ? (
                    districts?.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))
                  ) : (
                    <option value={subCategories[0].district.id}>{subCategories[0].district.name}</option>
                  )}
                </select>
                {/* <p className='text-gray-500 rounded-lg p-2 w-full border border-gray-300'>{subCategories[0].district.name}</p> */}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="complaint_subcategory" className="block text-sm font-medium text-gray-700 mb-1">
                  نوع الشكوى
                </label>
                <select
                  id="complaint_subcategory"
                  name="complaint_subcategory"
                  value={newSubCategory.complaint_subcategory}
                  onChange={handleComplaintSubcategoryChange}
                  className={`w-full border border-gray-300 rounded-lg p-2 ${!newSubCategory.district ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  required={false}
                  disabled={!newSubCategory.district}
                >
                  <option value="">اختر نوع الشكوى</option>
                  {filteredComplaintSubCategories && filteredComplaintSubCategories.length > 0 ? (
                    filteredComplaintSubCategories.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name || `خيار ${subcategory.id}`}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>لا توجد خيارات متاحة</option>
                  )}
                </select>
                {!newSubCategory.district ? (
                  <p className="text-sm text-yellow-500 mt-1">الرجاء اختيار المحافظة أولاً</p>
                ) : filteredComplaintSubCategories.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">لا توجد أنواع شكاوى متاحة لهذه المحافظة</p>
                )}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="nextstatus" className="block text-sm font-medium text-gray-700 mb-1">
                  الحالة التالية
                </label>
                <select
                  id="nextstatus"
                  name="nextstatus"
                  value={newSubCategory.nextstatus}
                  onChange={(e) => setNewSubCategory(prev => ({ ...prev, nextstatus: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  required={false}
                >
                  <option value="">اختر الحالة التالية</option>
                  {filteredNextStatusOptions && filteredNextStatusOptions.length > 0 ? (
                    filteredNextStatusOptions.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name || `حالة ${subcategory.id}`}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>لا توجد خيارات متاحة</option>
                  )}
                </select>
                {newSubCategory.complaint_subcategory && filteredNextStatusOptions.length === 0 && (
                  <p className="text-sm text-yellow-500 mt-1">لا توجد حالات مرتبطة بنوع الشكوى المحدد</p>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowAddSubCategory(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddSubCategory}
                  className="px-4 py-2 bg-[#4664AD] text-white rounded-lg"
                  disabled={!newSubCategory.name || !newSubCategory.status_category}
                >
                  إضافة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </PermissionGuard>
  );
} 