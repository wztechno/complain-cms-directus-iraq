'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/api';
import { getUserPermissions } from '@/utils/permissions';

interface StatusSubCategory {
  id: number;
  name: string;
  status_category: StatusCategory | null;
  district: District | null;
  complaint_subcategory: number | null;
  nextstatus: StatusSubCategory | null;
}

interface District {
  id: number;
  name: string;
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

export default function StatusSubCategoryPage() {
  const [subCategories, setSubCategories] = useState<StatusSubCategoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSubCategory, setShowAddSubCategory] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [statusCategories, setStatusCategories] = useState<StatusCategory[]>([]);
  const [newSubCategory, setNewSubCategory] = useState({
    name: '',
    status_category: '',
    district: '',
    nextstatus: '',
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Add a state to track active district filtering
  const [activeDistrictFilter, setActiveDistrictFilter] = useState<string[]>([]);

  useEffect(() => {
    const userInfoStr = localStorage.getItem('user_info');
    const hasReloaded = localStorage.getItem('reload_once');
  
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
  
      let res;
  
      if (userPermissions.isAdmin) {
        // Admin: Fetch all subcategories
        res = await fetchWithAuth(`/items/Status_subcategory?fields=*,district.*,status_category.*,nextstatus.*`);
        setIsAdmin(true);
      } else {
        // Non-admin: Filter by district
        res = await fetchWithAuth(`/items/Status_subcategory?filter[district][_eq]=${district_id}&fields=*,district.*,status_category.*,nextstatus.*`);
        setIsAdmin(false);
      }
  
      if (res && res.data) {
        let subCategoriesData = res.data;
  
        console.log(`Fetched ${subCategoriesData.length} subcategories`);
  
        setSubCategories(subCategoriesData);
      } else {
        throw new Error('Failed to fetch subcategories');
      }
  
      setLoading(false);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setLoading(false);
    }
  };
  

  const fetchDistricts = async () => {
    try {
      // Get user info for role matching
      const userInfoStr = localStorage.getItem('user_info');
      const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
      const userPermissions = await getUserPermissions();
      
      const res = await fetchWithAuth('/items/District');
      if (res && res.data) {
        let districtsData = res.data;
        
        // Filter districts for non-admin users
        if (!userPermissions.isAdmin && userPermissions.districtIds && userPermissions.districtIds.length > 0) {
          console.log('Filtering districts based on user permissions:', userPermissions.districtIds);
          
          // Convert to numbers for consistent comparison
          const userDistrictIds = userPermissions.districtIds.map(id => Number(id));
          
          // If user has a role title, try to match it with districts
          if (userInfo?.role_title && districtsData.length > 0) {
            console.log("Attempting to match role_title with district in fetchDistricts:", userInfo.role_title);
            
            // English district names that might be in role titles (same mapping as in fetchSubCategories)
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
              // Same mappings as above
            };
            
            // Try to match role title with districts
            const roleLower = userInfo.role_title.toLowerCase();
            let matchedDistrictIds: number[] = [];
            
            // Check all possible mappings
            Object.entries(districtMapping).forEach(([englishName, arabicVariants]) => {
              if (roleLower.includes(englishName)) {
                console.log(`Found match in fetchDistricts: role contains "${englishName}"`);
                // Find districts with matching names
                const matchingDistricts = districtsData.filter((district: any) => 
                  arabicVariants.some(variant => 
                    district.name.includes(variant) || variant.includes(district.name)
                  )
                );
                
                if (matchingDistricts.length > 0) {
                  console.log("Matched districts for dropdown:", matchingDistricts.map((d: any) => ({id: d.id, name: d.name})));
                  matchedDistrictIds = [...matchedDistrictIds, ...matchingDistricts.map((d: any) => Number(d.id))];
                }
              }
            });
            
            // If we found matches, add them to userDistrictIds
            if (matchedDistrictIds.length > 0) {
              console.log("Adding matched district IDs from role for dropdown:", matchedDistrictIds);
              // Combine both sets of IDs and remove duplicates
              const combinedIds = [...new Set([...userDistrictIds, ...matchedDistrictIds])];
              console.log("Combined district IDs for dropdown:", combinedIds);
              
              // Filter districts based on combined IDs
              districtsData = districtsData.filter((district: District) => 
                combinedIds.includes(Number(district.id))
              );
            } else {
              // Fallback to original district IDs if no matches found
              districtsData = districtsData.filter((district: District) => 
                userDistrictIds.includes(Number(district.id))
              );
            }
          } else {
            // Standard filtering if no role title
            districtsData = districtsData.filter((district: District) => 
              userDistrictIds.includes(Number(district.id))
            );
          }
          
          console.log(`Filtered to ${districtsData.length} districts based on user permissions`);
        }
        
        setDistricts(districtsData);
      } else {
        throw new Error('Failed to fetch districts');
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

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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
      // Check permissions before adding
      const userPermissions = await getUserPermissions();
      // if (!userPermissions.isAdmin && 
      //     newSubCategory.district && 
      //     userPermissions.districtIds && 
      //     !userPermissions.districtIds.includes(Number(newSubCategory.district))) {
      //   alert('ليس لديك صلاحية لإضافة فئة فرعية لهذه المحافظة');
      //   return;
      // }
      
      const res = await fetchWithAuth('/items/Status_subcategory', {
        method: 'POST',
        body: JSON.stringify({
          name: newSubCategory.name,
          status_category: newSubCategory.status_category ? Number(newSubCategory.status_category) : null,
          district: newSubCategory.district ? Number(newSubCategory.district) : null,
          nextstatus: newSubCategory.nextstatus ? Number(newSubCategory.nextstatus) : null,
        })
      });

      if (!res) {
        throw new Error('Failed to add sub-category');
      }

      setShowAddSubCategory(false);
      setNewSubCategory({ name: '', status_category: '', district: '', nextstatus: '' });
      fetchSubCategories();
    } catch (error) {
      console.error('Error adding sub-category:', error);
      alert('حدث خطأ أثناء إضافة الفئة الفرعية');
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
    <div className="p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">الفئة الفرعية للحالة</h1>
        <div className="flex gap-4">
          <button
            onClick={handleExport}
            className="bg-[#4664AD] text-white px-4 py-2 rounded-lg hover:bg-[#3A5499]"
          >
            تصدير البيانات
          </button>
        </div>
      </div>

      {activeDistrictFilter.length > 0 && (
        <div className="mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
          <div className="flex items-center text-blue-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold ml-1">تصفية حسب:</span>
            <div className="ml-3 text-blue-600">
              {activeDistrictFilter.map((filter, index) => (
                <span key={index} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                  {filter}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subCategories.map((subCategory) => (
          <div 
            key={subCategory.id} 
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => router.push(`/status/sub-category/${subCategory.id}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-500">
                {subCategory.status_category?.name}
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">⋮</span>
              </button>
            </div>

            <h3 className="text-xl font-semibold text-right mb-4">{subCategory.name}</h3>

            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
              <span>{subCategory.nextstatus?.name}</span>
              <span>{subCategory.district?.name}</span>
            </div>

            <div className="border-t pt-4 mt-2">
              <div className="text-right text-sm text-gray-600">
                <span className="font-semibold ml-2">الحالة التالية:</span>
                <span>{subCategory.nextStatusDetails?.name || 'ابلاغ المواطن بضرورة الترخيص'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <button 
          onClick={() => setShowAddSubCategory(true)}
          className="w-full bg-[#4664AD] text-white py-3 rounded-lg text-lg hover:bg-[#3A5499] transition-colors"
        >
          إضافة فئة فرعية جديدة
        </button>
      </div>

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
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, district: e.target.value })}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الحالة التالية
                </label>
                <select
                  value={newSubCategory.nextstatus}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, nextstatus: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="">اختر الحالة التالية</option>
                  {subCategories.map((subCategory) => (
                    <option key={subCategory.id} value={subCategory.id}>
                      {subCategory.name}
                    </option>
                  ))}
                </select>
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
  );
} 