'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GrFilter } from 'react-icons/gr';
import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { fetchWithAuth } from '@/utils/api';
import { exportToCSV } from '@/utils/export';
import PermissionGuard from '@/components/PermissionGuard';

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  created_at?: string;
  district?: number;
  stats?: {
    complaints: number;
    ratings: number;
    notifications: number;
  };
}

interface District {
  id: number;
  name: string;
}

interface Complaint {
  id: number;
  user: number;
}

interface Rating {
  id: number;
  user: number;
}

interface Notification {
  id: number;
  users: {
    users_id: number;
  }[];
}

export default function CitizensPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtMap, setDistrictMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // Show 12 users per page (3x4 grid)
  
  const router = useRouter();

  const [filters, setFilters] = useState({
    name: '',
    email: '',
    phone: '',
    startDate: '',
    endDate: '',
    district: '',
  });

  useEffect(() => {
    fetchUsersAndDistricts();
  }, []);

  useEffect(() => {
    handleFilter();
  }, [filters]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const fetchUsersAndDistricts = async () => {
    try {
      setLoading(true);
      const [userRes, districtRes] = await Promise.all([
        fetchWithAuth('/items/users'),
        fetchWithAuth('/items/District'),
      ]);

      // if (!userRes.ok || !districtRes?.data) {
      //   throw new Error('Failed to fetch users or districts');
      // }

      const userData = await userRes;
      const filteredData = userData.data.filter(
        (user: User) => user.full_name !== null && user.email !== null
      );

      // Get district mapping
      const districtLookup = districtRes.data.reduce((acc: Record<number, string>, district: District) => {
        acc[district.id] = district.name;
        return acc;
      }, {});
      setDistrictMap(districtLookup);
      
      // Set initial users without stats
      setUsers(filteredData);
      setFilteredUsers(filteredData);
      setDistricts(districtRes.data);
      setLoading(false);
      
      // Then fetch statistics in bulk (don't block the UI)
      setLoadingStats(true);
      try {
        // Extract all user IDs for bulk filtering
        const userIds = filteredData.map((user: User) => user.id);
        const userIdsParam = userIds.join(',');
        
        console.log('Fetching notifications for user IDs:', userIdsParam);
        
        // Fetch all statistics in parallel using bulk queries with _in operator
        const [complaintsRes, ratingsRes, notificationsRes] = await Promise.all([
          fetchWithAuth(`/items/Complaint?filter[user][_in]=${userIdsParam}&fields=id,user&limit=-1`),
          fetchWithAuth(`/items/Complaint_ratings?filter[user][_in]=${userIdsParam}&fields=id,user&limit=-1`),
          fetchWithAuth(`/items/notification?filter[users][users_id][_in]=${userIdsParam}&fields=id,users.users_id&limit=-1`)
        ]);

        // Process the bulk responses
        const complaintsData = await complaintsRes;
        const ratingsData = await ratingsRes;
        const notificationsData = await notificationsRes;

        // Debug logging for notifications
        console.log('Notifications API response:', notificationsData);
        if (notificationsData?.data) {
          console.log('Notifications data:', notificationsData.data);
          console.log('Sample notification structure:', notificationsData.data[0]);
        }

        // Create user statistics maps for O(1) lookup
        const complaintsMap = new Map<number, number>();
        const ratingsMap = new Map<number, number>();
        const notificationsMap = new Map<number, number>();

        // Process complaints data
        if (complaintsData?.data && Array.isArray(complaintsData.data)) {
          complaintsData.data.forEach((complaint: Complaint) => {
            const userId = complaint.user;
            if (userId) {
              complaintsMap.set(userId, (complaintsMap.get(userId) || 0) + 1);
            }
          });
        }

        // Process ratings data
        if (ratingsData?.data && Array.isArray(ratingsData.data)) {
          ratingsData.data.forEach((rating: Rating) => {
            const userId = rating.user;
            if (userId) {
              ratingsMap.set(userId, (ratingsMap.get(userId) || 0) + 1);
            }
          });
        }

        // Process notifications data (handle nested structure)
        if (notificationsData?.data && Array.isArray(notificationsData.data)) {
          if (notificationsData.data.length > 0) {
            setShowNotifications(true);
          }
          
          notificationsData.data.forEach((notification: Notification) => {
            // Handle the users array structure - each notification can have multiple users
            if (notification.users && Array.isArray(notification.users)) {
              notification.users.forEach((userRelation) => {
                const userId = userRelation.users_id;
                if (userId) {
                  notificationsMap.set(userId, (notificationsMap.get(userId) || 0) + 1);
                }
              });
            }
          });
        }

        // Apply statistics to users in a single pass
        const usersWithStats = filteredData.map((user: User) => ({
          ...user,
          stats: {
            complaints: complaintsMap.get(user.id) || 0,
            ratings: ratingsMap.get(user.id) || 0,
            notifications: notificationsMap.get(user.id) || 0
          }
        }));

        setUsers(usersWithStats);
        setFilteredUsers(handleFilterWithData(usersWithStats)); // Apply current filters to new data
      } catch (statsError) {
        console.error('Error fetching user statistics:', statsError);
        // Set users with empty stats if error occurs
        const usersWithEmptyStats = filteredData.map((user: User) => ({
          ...user,
          stats: {
            complaints: 0,
            ratings: 0,
            notifications: 0
          }
        }));
        setUsers(usersWithEmptyStats);
        setFilteredUsers(handleFilterWithData(usersWithEmptyStats));
      } finally {
        setLoadingStats(false);
      }
    } catch (error) {
      console.error('Error fetching users or districts:', error);
      setLoading(false);
      setLoadingStats(false);
    }
  };

  // Helper function to apply filters to user data
  const handleFilterWithData = (userData: User[]) => {
    let filtered = [...userData];

    if (filters.name) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.email) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(filters.email.toLowerCase())
      );
    }

    if (filters.phone) {
      filtered = filtered.filter(user =>
        user.phone?.includes(filters.phone)
      );
    }

    if (filters.startDate) {
      filtered = filtered.filter(user => {
        const userDate = new Date(user.created_at || '');
        return userDate >= new Date(filters.startDate);
      });
    }

    if (filters.endDate) {
      filtered = filtered.filter(user => {
        const userDate = new Date(user.created_at || '');
        return userDate <= new Date(filters.endDate);
      });
    }

    if (filters.district) {
      filtered = filtered.filter(user => {
        const name = districtMap[user.district || 0];
        return name?.includes(filters.district);
      });
    }

    return filtered;
  };

  const handleFilter = () => {
    setFilteredUsers(handleFilterWithData(users));
  };

  const handleExport = () => {
    const headers = ['id', 'full_name', 'email', 'phone', 'created_at'];
    exportToCSV(filteredUsers, headers, 'citizens_export');
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return '';
    return phone.startsWith('+') ? phone : `+964 ${phone}`;
  };

  const handleCardClick = (userId: number) => {
    router.push(`/citizens/${userId}`);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
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
    <PermissionGuard requiredPermissions={[{ resource: 'Users', action: 'read' }]}>
    <div className="p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">المواطنين</h1>
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
                الاسم
              </label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
                placeholder="بحث بالاسم..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="text"
                value={filters.email}
                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
                placeholder="بحث بالبريد الإلكتروني..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                رقم الهاتف
              </label>
              <input
                type="text"
                value={filters.phone}
                onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
                placeholder="بحث برقم الهاتف..."
              />
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
                إلى تاريخ
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                المحافظة
              </label>
              <select
                value={filters.district}
                onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
              >
                <option value="">كل المحافظات</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results count and pagination info */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          عرض {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} من {filteredUsers.length} مواطن
        </div>
        {totalPages > 1 && (
          <div className="text-sm text-gray-600">
            الصفحة {currentPage} من {totalPages}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentUsers.map((user) => (
          <div
            key={user.id}
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick(user.id)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="text-gray-500 text-sm">
                {new Date(user.created_at || '').toLocaleDateString('ar-EG')}
              </div>
              <button className="text-gray-400">
                <span className="text-xl">⋮</span>
              </button>
            </div>

            <h3 className="text-xl font-semibold mb-2">{user.full_name}</h3>
            <p className="text-gray-600 mb-2">{user.email}</p>
            {user.phone && (
              <p className="text-gray-600">{formatPhoneNumber(user.phone)}</p>
            )}
            {user.district && (
              <p className="text-sm text-gray-500 mt-2">
                المحافظة: {districtMap[user.district] || 'غير معروفة'}
              </p>
            )}
            {/* User Statistics Section */}
            {showNotifications && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2 text-right">الإحصائيات</h4>
              {loadingStats ? (
                <div className="flex justify-center items-center py-3">
                  <div className="animate-pulse text-gray-400 text-sm">جاري تحميل الإحصائيات...</div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <div className="text-lg font-semibold text-blue-600">{user.stats?.complaints || 0}</div>
                    <div className="text-xs text-gray-500">الشكاوى</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <div className="text-lg font-semibold text-yellow-600">{user.stats?.ratings || 0}</div>
                    <div className="text-xs text-gray-500">التقييمات</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <div className="text-lg font-semibold text-green-600">{user.stats?.notifications || 0}</div>
                    <div className="text-xs text-gray-500">الإشعارات</div>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            عرض {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} من {filteredUsers.length} مواطن
          </div>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg ${currentPage === 1 ? 'bg-gray-200 text-gray-400' : 'bg-[#4664AD] text-white'}`}
            >
              <FaChevronRight />
            </button>
            <div className="flex items-center justify-center px-4 py-2 bg-white rounded-lg shadow-sm">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg ${currentPage === totalPages ? 'bg-gray-200 text-gray-400' : 'bg-[#4664AD] text-white'}`}
            >
              <FaChevronLeft />
            </button>
          </div>
        </div>
      )}
    </div>
    </PermissionGuard>
  );
} 