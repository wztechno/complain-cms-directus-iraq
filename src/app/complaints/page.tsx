'use client';

import React, { useState, useEffect } from 'react';
import { GrFilter } from 'react-icons/gr';
import { FaFileDownload, FaPlus, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import ComplaintCard from '@/components/ComplaintCard';
import { fetchWithAuth } from '@/utils/api';
import { getUserPermissions, complaintMatchesPermissions } from '@/utils/permissions';
import { buildStatusToUserMap, StatusToUserMap } from '@/utils/responsible-users';

// Add BASE_URL constant
const BASE_URL = 'https://complaint.top-wp.com';

// Define interface for Permission
interface Permission {
  permissions?: {
    _and?: Array<{
      id?: {
        _eq?: string;
      };
    }>;
  };
  policy?: string;
  action?: string;
  collection?: string;
}

// Define District interface
interface District {
  id: number;
  name: string;
}

// Interface for Complaint
interface Complaint {
  id: string;
  title: string;
  description: string;
  Service_type: string;
  district: number | null;
  districtName?: string;
  status_subcategory: string | number;
  completion_percentage: string | number;
  date?: string;
  statusDate?: string;
  status?: string;
  [key: string]: any; // Allow additional properties
}

// Update UserPolicy interface
interface UserPolicy {
  id: string;
  policy: string;
  policy_id?: string | string[];
  user_id: {
    id: string;
    first_name: string;
    last_name: string;
  } | Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
}

// User interface for the user map
interface User {
  firstName: string;
  lastName: string;
}

// Status subcategory interface
interface StatusSubcategory {
  id: string | number;
  name?: string;
  status_category?: {
    id?: number;
    name?: string;
  };
}

export default function ComplaintsPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const complaintsPerPage = 10;
  const [complaintNames, setComplaintNames] = useState<string[]>([]); // Add this line
  const [isUserAdmin , setIsUserAdmin] = useState(false);
  const [filters, setFilters] = useState({
    governorate: '',
    title: '',
    startDate: '',
    endDate: '',
    serviceType: '',
    status:'',
    compelation_percentage:'',
    id: ''
  });
// app/complaints/page.tsx  (inside the component)
const [statusPermissions, setStatusPermissions] = useState<Record<string,string>>({});
const [usersByPolicy   , setUsersByPolicy   ] = useState<Record<string,User>>({});
const [statusToUserMap, setStatusToUserMap] = useState<StatusToUserMap>({});

useEffect(() => {
  (async () => {
    try {
      console.log("Fetching responsible users mapping...");
      const map = await buildStatusToUserMap();
      console.log("Status to user map received:", map);
      setStatusToUserMap(map); // still useful to store
      await fetchComplaints(map); // pass directly
    } catch (err) {
      console.error('Responsible-user map failed:', err);
      await fetchComplaints({}); // fallback
    }
  })();
}, []);


  useEffect(() => {
    fetchDistrictsAndComplaints();
    // fetchResponsibleUsersData();
  }, []);

  useEffect(() => {
    handleFilter();
  }, [filters]); // Run filter whenever filters change

  // New function to fetch districts first, then complaints
  const fetchDistrictsAndComplaints = async () => {
    try {
      setLoading(true);
      
      // First fetch districts
      const districtsData = await fetchWithAuth('/items/District?filter[active][_eq]=true');
      
      if (!districtsData || !districtsData.data) {
        console.error("No districts data returned from API");
        setDistricts([]);
      } else {
        // Log the first few districts to see their structure
        console.log("Districts data sample:", districtsData.data.slice(0, 3));
        console.log("Districts data types:", 
          districtsData.data.slice(0).map((d: any) => ({
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

  const fetchComplaints = async (statusUserMapOverride: StatusToUserMap = {}) => {
    try {
      setLoading(true);

      // Get user permissions and info
      const userPermissions = await getUserPermissions();
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
      const ADMIN_ROLE_ID = '8A8C7803-08E5-4430-9C56-B2F20986FA56';
      const isAdmin = userInfo?.role === ADMIN_ROLE_ID;

      setIsUserAdmin(isAdmin); 
      console.log("isUserAdmin: ", isUserAdmin)
      console.log("isAdmin: ", isAdmin)

      // Make sure responsible users data is loaded
      if (Object.keys(usersByPolicy).length === 0) {
        console.log("Responsible users data not loaded yet, loading now...");
      } else {
        console.log("Responsible users data already loaded", usersByPolicy);
      }

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
        console.error('No response or data from complaints API:', response);
        throw new Error('Failed to fetch complaints - No data returned');
      }

      console.log(`Received ${response.data.length} complaints from API`);
      
      // Check if the API returned an array of IDs or full complaint objects
      let complaintsData = response.data;
      let complaintsWithPermissions = 0;
      
      if (complaintsData.length > 0) {
        const firstItem = complaintsData[0];
        console.log('First complaint data type:', typeof firstItem);
        
        if (typeof firstItem === 'number' || typeof firstItem === 'string') {
          console.warn('API returned IDs instead of full complaint objects. Fetching individual complaints...');
          
          // Handle case where our fetchWithAuth method didn't convert IDs to full objects
          const complaintIds = complaintsData;
          const fullComplaints = [];
          
          // Process in smaller batches to avoid overwhelming the API
          const batchSize = 5;
          for (let i = 0; i < complaintIds.length; i += batchSize) {
            const batch = complaintIds.slice(i, i + batchSize);
            console.log(`Fetching details for complaints batch ${Math.floor(i/batchSize) + 1} (${batch.length} items)`);
            
            const batchResults = await Promise.all(
              batch.map(async (id: string | number) => {
                try {
                  // Use the direct URL to fetch each complaint by ID
                  // NOTE: We're using fetchWithAuthSafe to avoid throwing exceptions on 403 errors
                  const detailResponse = await fetch(`${BASE_URL}/items/Complaint/${id}`, {
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    }
                  });
                  
                  if (detailResponse.status === 403) {
                    console.log(`No permission to access complaint #${id} (403 Forbidden)`);
                    return null;
                  }
                  
                  if (!detailResponse.ok) {
                    console.error(`Error fetching complaint #${id}: ${detailResponse.status}`);
                    return null;
                  }
                  
                  const detailData = await detailResponse.json();
                  complaintsWithPermissions++;
                  console.log(`Successfully fetched complaint #${id}`);
                  return detailData?.data || null;
                } catch (error) {
                  console.error(`Error fetching detail for complaint ID ${id}:`, error);
                  return null;
                }
              })
            );
            
            // Add valid complaints to our result array
            const validResults = batchResults.filter(c => c !== null);
            console.log(`Got ${validResults.length}/${batch.length} valid complaints in this batch`);
            fullComplaints.push(...validResults);
          }
          
          console.log(`Successfully fetched ${fullComplaints.length}/${complaintIds.length} full complaint objects (${complaintIds.length - fullComplaints.length} were inaccessible due to permissions)`);
          complaintsData = fullComplaints;
        }
      }

      // Get district names for all complaints
      let districtsMap = new Map();
      try {
        const districtsResponse = await fetchWithAuth('/items/District');
        console.log('Districts response:', districtsResponse);
        
        if (districtsResponse?.data && Array.isArray(districtsResponse.data)) {
          console.log('Districts count:', districtsResponse.data.length);
          
          // Check if districts are properly formed objects
          const validDistricts = districtsResponse.data.filter((district: any) => 
            district && typeof district === 'object' && district.id !== undefined && district.name !== undefined
          );
          
          console.log(`Found ${validDistricts.length} valid districts out of ${districtsResponse.data.length}`);
          
          if (validDistricts.length > 0) {
            console.log('Sample district data:', validDistricts[0]);
            
            districtsMap = new Map(
              validDistricts.map((district: District) => [district.id, district.name])
            );
            console.log(`Created district map with ${districtsMap.size} entries`);
            
            if (districtsMap.size > 0) {
              console.log('Sample district mapping:', 
                Array.from(districtsMap.entries()).slice(0, 3)
              );
            }
          } else {
            console.warn('No valid district objects found in the response');
          }
        } else {
          console.warn('Districts response does not contain an array of districts');
        }
        // Move this after processedComplaints is defined
        const uniqueNames = Array.from(
          new Set(complaintsData.map((c: Complaint) => c.title || '').filter(Boolean))
        ) as string[];
        setComplaintNames(uniqueNames);
        console.log(`Found ${uniqueNames.length} unique complaint names`);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching districts:', error);
        console.log('Proceeding without district names');
      }

      // Add district names to complaints - with safety checks
      let processedComplaints = complaintsData
        .filter((complaint: any) => complaint !== null) // Filter out null entries
        .map((complaint: Complaint) => {
          // Ensure complaint is an object
          if (typeof complaint !== 'object' || complaint === null) {
            console.warn(`Invalid complaint data: ${complaint}`);
            return null; // This will be filtered out
          }
          
          // Handle district mapping
          let districtName = 'غير محدد'; // Default value
          if (complaint.district) {
            const mappedName = districtsMap.get(complaint.district);
            if (mappedName) {
              districtName = mappedName;
            } else {
              console.warn(`No district name found for ID: ${complaint.district}`);
            }
          }
          
          return {
            ...complaint,
            districtName
          };
        })
        .filter((complaint: any) => complaint !== null); // Filter out any nulls from invalid complaints

      console.log(`Processed ${processedComplaints.length} valid complaints`);
      
      // Add a sample of processed complaints for debugging
      if (processedComplaints.length > 0) {
        console.log('Sample processed complaint:', processedComplaints[0]);
      } else {
        console.warn('No valid complaints after processing');
        
        // Check if we received IDs but had permission issues
        if (response.data.length > 0 && complaintsWithPermissions === 0) {
          console.warn('You have permission to see complaint IDs but not their content');
        }
      }

      // Additional permission filtering if needed
      if (!isAdmin) {
        const beforeFilterCount = processedComplaints.length;
        processedComplaints = processedComplaints.filter((complaint: Complaint) => 
          complaintMatchesPermissions(complaint, userPermissions)
        );
        console.log(`Permission filtering: ${beforeFilterCount} -> ${processedComplaints.length} complaints`);
      }
      
      // Sort complaints by date (newest first)
      const sortedComplaints = processedComplaints.length > 0 ? processedComplaints.sort((a: Complaint, b: Complaint) => {
        const dateA = new Date(a.statusDate || a.date || '');
        const dateB = new Date(b.statusDate || b.date || '');
        return dateB.getTime() - dateA.getTime();
      }) : [];

      console.log(`Final complaint count: ${sortedComplaints.length}`);
      setComplaints(sortedComplaints);
      setFilteredComplaints(sortedComplaints);

      // Extract unique Status for filter dropdown
      const uniqueStatus = Array.from(
        new Set(processedComplaints.map((c: Complaint) => c.status || '').filter(Boolean))
      ) as string[];
      setStatus(uniqueStatus);
      console.log(`Found ${uniqueStatus.length} unique Status types`);

      // Extract unique Percentation for filter dropdown
      const uniquePercentation = Array.from(
        new Set(processedComplaints.map((c: Complaint) => c.completion_percentage || '').filter(Boolean))
      ) as string[];
      
      // Sort completion percentages numerically
      uniquePercentation.sort((a, b) => {
        const numA = parseFloat(String(a));
        const numB = parseFloat(String(b));
        return numA - numB;
      });
      
      setCompletionPercentage(uniquePercentation);
      console.log(`Found ${uniquePercentation.length} unique Percentage values:`, uniquePercentation);

      const status_subcategories = await fetch('https://complaint.top-wp.com/items/Status_subcategory?fields=*,status_category.*');
      const res = await status_subcategories.json();
      
      const enrichedComplaints = sortedComplaints.map((c: Complaint) => {
        const matched = res.data.find(
          (item: any) => String(item.id) === String(c.status_subcategory)
        );
      
        let responsibleUser = 'غير محدد';
        const statusId = String(c.status_subcategory);
      
        if (statusId && statusUserMapOverride[statusId]) {
          responsibleUser = statusUserMapOverride[statusId];
          console.log(`✓ Found responsible user "${responsibleUser}" for complaint ${c.id} with status_subcategory ${statusId}`);
        } else {
          console.log(`⚠️ No responsible user in map for status_subcategory ${statusId}`);
        }
      
        return {
          ...c,
          mainCategory: matched?.status_category?.name || null,
          responsibleUser
        };
      });
      
      
      setComplaints(enrichedComplaints);
      setFilteredComplaints(enrichedComplaints);
      console.log("Enriched and final complaints:", enrichedComplaints);
      console.log("complaints",complaints);
      console.log("filteredComplaints",filteredComplaints);
      console.log("currentComplaints",currentComplaints);
    
      
      
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

      // Add ID filter
      if (filters.id) {
        filtered = filtered.filter(complaint => 
          complaint.id.toString().includes(filters.id)
        );
        console.log(`After ID filter (${filters.id}): ${filtered.length} complaints`);
      }

      if (filters.governorate) {
        filtered = filtered.filter(complaint => {
          if (!complaint.districtName) return false;
          return complaint.districtName === filters.governorate;
        });
        console.log(`After governorate filter (${filters.governorate}): ${filtered.length} complaints`);
      }

      // Add name filter
      if (filters.title) {
        filtered = filtered.filter(complaint => 
          complaint.title === filters.title
        );
        console.log(`After name filter (${filters.title}): ${filtered.length} complaints`);
      }

      if (filters.serviceType) {
        filtered = filtered.filter(complaint => {
          // Match the complaint's Service_type against our two categories
          if (filters.serviceType === 'خدمات فردية') {
            return complaint.Service_type === 'خدمات فردية';
          } else if (filters.serviceType === 'خدمات عامة') {
            return complaint.Service_type === 'خدمات عامة';
          }
          return complaint.Service_type === filters.serviceType;
        });
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

      if (filters.status) {
        filtered = filtered.filter(complaint => 
          complaint.status === filters.status
        );
        // console.log(`After service type filter (${filters.serviceType}): ${filtered.length} complaints`);
      }

      if (filters.compelation_percentage) {
        filtered = filtered.filter(complaint => {
          // Convert both values to strings for comparison to handle mixed types
          const filterValue = String(filters.compelation_percentage);
          const complaintValue = String(complaint.completion_percentage);
          return complaintValue === filterValue;
        });
        console.log(`After completion percentage filter (${filters.compelation_percentage}): ${filtered.length} complaints remaining. Filter type: ${typeof filters.compelation_percentage}, Sample complaint value type: ${typeof filtered[0]?.completion_percentage}`);
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
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
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
    const updatedComplaints = [...complaintsArray];
    
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
                  رقم الشكوى
                </label>
                <input
                  type="text"
                  value={filters.id}
                  onChange={(e) => setFilters({ ...filters, id: e.target.value })}
                  placeholder="ابحث برقم الشكوى"
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  فئة الشكوى
                </label>
                <select
                  value={filters.title}
                  onChange={(e) => setFilters({ ...filters, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                >
                  <option value="">الكل</option>
                  {complaintNames.map(name => (
                    <option key={name} value={name}>{name || 'بدون عنوان'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                الشكوى
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                >
                  <option value="">الكل</option>
                  {status.map(status => (
                    <option key={status} value={status}>{status || 'بدون عنوان'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                نسبة الإنجاز
                </label>
                <select
                  value={filters.compelation_percentage}
                  onChange={(e) => setFilters({ ...filters, compelation_percentage: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                >
                  <option value="">الكل</option>
                  {completionPercentage.map(percent => (
                    <option key={percent} value={percent}>
                      {percent}%
                    </option>
                  ))}
                </select>
              </div>
              {isUserAdmin &&
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
              }

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
                  <option value="خدمات فردية">خدمات فردية</option>
                  <option value="خدمات عامة">خدمات عامة</option>
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
          <div className="flex justify-center items-center h-64 flex-col">
            <div className="text-xl text-gray-500 mb-2">لا توجد شكاوى</div>
            <div className="text-md text-gray-400 max-w-md text-center">
              قد يكون هذا بسبب عدم وجود شكاوى مسجلة، أو بسبب عدم وجود صلاحيات للوصول إلى الشكاوى المتاحة.
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentComplaints.map((complaint: any) => (
                <ComplaintCard
                  key={complaint.id}
                  id={complaint.id}
                  title={complaint.title || 'بدون عنوان'}
                  status={complaint.status}
                  mainCategory={complaint.mainCategory}
                  type={complaint.Service_type || 'غير محدد'}
                  location={complaint.districtName || 'غير محدد'}
                  issue={complaint.description || 'لا يوجد وصف'}
                  progress={complaint.completion_percentage || 0}
                  isSelected={selectedComplaints.includes(complaint.id)}
                  onSelect={toggleComplaintSelection}
                  responsibleUser={complaint.responsibleUser}
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