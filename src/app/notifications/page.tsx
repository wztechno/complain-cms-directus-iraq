'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaPlus, FaTrash, FaBell, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { GrFilter } from 'react-icons/gr';
import { fetchWithAuth } from '@/utils/api';
import { useRouter } from 'next/navigation';
import PermissionGuard from '@/components/PermissionGuard';

// Interface for User
interface User {
  id: string;
  full_name: string;
  email: string;
  district?: number | null;  // Add district field to User interface
}

// Interface for embedded user records
interface UserRecord {
  id?: string | number;
  user?: {
    id: string | number;
    full_name: string;
    email?: string;
  };
  Users_id?: string | number;
  users_id?: string | number;
  full_name?: string;
}

// Interface for Notification
interface Notification {
  id: string;
  name: string;
  content: string;
  users: string | UserRecord[] | null;
  district: number | null;
  date_created?: string;
  user_created?: string;
}

// Interface for District
interface District {
  id: number;
  name: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{ district:string; name:string; startDate:string; endDate:string }>({
    district: '', name: '', startDate: '', endDate: ''
  });
  const [users, setUsers] = useState<User[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  
  // New state for user search
  const [userSearchTerm, setUserSearchTerm] = useState<string>("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [focusedUserIndex, setFocusedUserIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [notificationForm, setNotificationForm] = useState({
    name: '',
    content: '',
    sendToAll: false,
    filterByDistrict: false
  });

  const notificationsPerPage = 10;

  const [usersInSelectedDistrict, setUsersInSelectedDistrict] = useState<User[]>([]);
  const [fetchingDistrictUsers, setFetchingDistrictUsers] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchUsers();
    fetchDistricts();
    fetchNotifications();
  }, []);

  // Add a debugging effect to see the users when they change
  useEffect(() => {
    console.log('Users data updated:', users.map(u => ({id: u.id, name: u.full_name, type: typeof u.id})));
  }, [users]);

  const checkAdminStatus = () => {
    const ADMIN_ROLE_ID = '8A8C7803-08E5-4430-9C56-B2F20986FA56';
    try {
      const storedUserInfo = localStorage.getItem('user_info');
      if (storedUserInfo) {
        const userInfoData = JSON.parse(storedUserInfo);
        const admin = userInfoData?.role === ADMIN_ROLE_ID;
        setIsAdmin(admin);
        
        // Redirect non-admin users
        if (!admin && typeof window !== 'undefined') {
          router.replace('/');
        }
      } else if (typeof window !== 'undefined') {
        // No user info means not logged in or not admin
        router.replace('/');
      }
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
      if (typeof window !== 'undefined') {
        router.replace('/');
      }
    }
  };

  const fetchUsers = async () => {
    try {
      // Modify to include district information in the response
      const response = await fetchWithAuth('/items/Users?fields=id,full_name,email,district');
      
      if (response && response.data) {
        console.log(`Successfully fetched ${response.data.length} users`);
        // Ensure user IDs are consistently stored as strings for easier comparison
        const processedUsers = (response.data as User[]).map((user) => ({
          ...user,
          id: user.id.toString() // Ensure IDs are strings
        }));
        console.log('Processed users with string IDs:', processedUsers.map((u: User) => `${u.id} (${u.full_name})`));
        setUsers(processedUsers);
      } else {
        console.warn('No users data returned from API');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Continue with empty users array
      setUsers([]);
    }
  };

  const fetchDistricts = async () => {
    try {
      const response = await fetchWithAuth('/items/District');
      
      if (response && response.data) {
        console.log(`Successfully fetched ${response.data.length} districts`);
        setDistricts(response.data);
      } else {
        console.warn('No districts data returned from API');
        setDistricts([]);
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
      // Continue with empty districts array
      setDistricts([]);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Admin-only page, so fetch all notifications
      // Include the 'users' field to get the users data
      const endpoint = '/items/notification?fields=*,users.*,users.user.*';
      const response = await fetchWithAuth(endpoint);
      
      if (response && response.data) {
        // Sort by date created (newest first)
        const sortedNotifications = response.data.sort((a: Notification, b: Notification) => {
          const dateA = new Date(a.date_created || '').getTime();
          const dateB = new Date(b.date_created || '').getTime();
          return dateB - dateA;
        });
        
        console.log("Fetched notifications with user data:", sortedNotifications);
        setNotifications(sortedNotifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Add function to fetch users by district
  const fetchUsersByDistrict = async (districtId: number) => {
    try {
      setFetchingDistrictUsers(true);
      // Fetch users filtered by district
      const response = await fetchWithAuth(`/items/Users?filter[district][_eq]=${districtId}&fields=id,full_name,email,district`);
      
      if (response && response.data) {
        console.log(`Found ${response.data.length} users in district ${districtId}`);
        setUsersInSelectedDistrict(response.data);
        return response.data;
      } else {
        console.warn(`No users found in district ${districtId}`);
        setUsersInSelectedDistrict([]);
        return [];
      }
    } catch (error) {
      console.error(`Error fetching users for district ${districtId}:`, error);
      setUsersInSelectedDistrict([]);
      return [];
    } finally {
      setFetchingDistrictUsers(false);
    }
  };

  // Update the district selection handler
  useEffect(() => {
    if (selectedDistrict) {
      fetchUsersByDistrict(selectedDistrict);
    } else {
      setUsersInSelectedDistrict([]);
    }
  }, [selectedDistrict]);

  // Filter users based on search term
  useEffect(() => {
    if (userSearchTerm.trim() === "") {
      setFilteredUsers([]);
      return;
    }
    
    const searchTerm = userSearchTerm.toLowerCase();
    const filtered = users.filter(user => 
      user.full_name.toLowerCase().includes(searchTerm) || 
      (user.email && user.email.toLowerCase().includes(searchTerm))
    );
    
    setFilteredUsers(filtered);
  }, [userSearchTerm, users]);

  // Clear search when selection changes or modal closes
  useEffect(() => {
    setUserSearchTerm("");
    setFilteredUsers([]);
    setShowUserDropdown(false);
  }, [selectedUser, showCreateModal]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset focused index when filtered users change
  useEffect(() => {
    setFocusedUserIndex(-1);
  }, [filteredUsers]);

  // Handle keyboard navigation in dropdown
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showUserDropdown || filteredUsers.length === 0) return;
    
    // Arrow down
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedUserIndex(prev => 
        prev < filteredUsers.length - 1 ? prev + 1 : prev
      );
    }
    
    // Arrow up
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedUserIndex(prev => (prev > 0 ? prev - 1 : 0));
    }
    
    // Enter
    else if (e.key === 'Enter' && focusedUserIndex >= 0) {
      e.preventDefault();
      const selectedUser = filteredUsers[focusedUserIndex];
      setSelectedUser(selectedUser.id);
      setUserSearchTerm(selectedUser.full_name);
      setShowUserDropdown(false);
    }
    
    // Escape
    else if (e.key === 'Escape') {
      e.preventDefault();
      setShowUserDropdown(false);
    }
  };

  const handleCreateNotification = async () => {
    try {
      if (!notificationForm.name || !notificationForm.content) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      // Get the user info from localStorage to verify admin status again
      const userInfoStr = localStorage.getItem('user_info');
      if (!userInfoStr) {
        alert('معلومات المستخدم غير متوفرة. يرجى تسجيل الدخول مرة أخرى.');
        return;
      }

      const userInfo = JSON.parse(userInfoStr);
      const ADMIN_ROLE_ID = '8A8C7803-08E5-4430-9C56-B2F20986FA56';
      const isUserAdmin = userInfo?.role === ADMIN_ROLE_ID;
      
      console.log('Current user info:', {
        id: userInfo.id,
        role: userInfo.role,
        isAdmin: isUserAdmin,
        firstName: userInfo.first_name,
        lastName: userInfo.last_name
      });
      
      if (!isUserAdmin) {
        alert('عذراً، فقط المسؤول يمكنه إنشاء إشعارات.');
        return;
      }

      // Variable to store the final user IDs for the many-to-many relationship
      let userIds: number[] = [];
      let districtId: number | null = null;
      
      // If sending to a specific user
      if (!notificationForm.sendToAll && !notificationForm.filterByDistrict && selectedUser) {
        // Convert to number and ensure it's valid
        const userId = parseInt(selectedUser, 10);
        if (!isNaN(userId)) {
          userIds = [userId];
        }
        console.log(`Notification will be sent to user ID: ${userId}`);
      } 
      // If filtering by district
      else if (notificationForm.filterByDistrict && selectedDistrict) {
        districtId = selectedDistrict;
        
        // Use the users we already fetched for this district
        if (usersInSelectedDistrict.length > 0) {
          // Convert all user IDs to numbers directly
          userIds = usersInSelectedDistrict
            .map((user: User) => parseInt(user.id, 10))
            .filter((id: number) => !isNaN(id));
          console.log(`Using ${userIds.length} users from district ${selectedDistrict}`);
        } else {
          // If our cached list is empty, try fetching again just to be sure
          const districtUsers = await fetchUsersByDistrict(selectedDistrict);
          
          if (districtUsers.length > 0) {
            userIds = districtUsers
              .map((user: User) => parseInt(user.id, 10))
              .filter((id: number) => !isNaN(id));
            console.log(`Fetched ${userIds.length} users from district ${selectedDistrict}`);
          } else {
            console.warn(`No users found in district ${selectedDistrict}, notification may not be delivered to anyone`);
            userIds = []; // Empty array means no recipients
          }
        }
        
        console.log(`Notification will be sent to ${userIds.length} users in district ID: ${selectedDistrict}`);
      } 
      // If sending to all users
      else if (notificationForm.sendToAll) {
        // For all users, use the users we already have in state
        districtId = null;
        
        // Use all available users
        userIds = users
          .map(user => parseInt(user.id, 10))
          .filter(id => !isNaN(id));
          
        console.log(`Notification will be sent to all ${userIds.length} users`);
      }
      // Default case - no valid selection
      else {
        alert('يرجى تحديد خيار واحد على الأقل لإرسال الإشعار');
        return;
      }

      // Get the token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('جلسة تسجيل الدخول منتهية. يرجى تسجيل الدخول مرة أخرى.');
        return;
      }

      // Create the notification data with the exact format needed
      const notificationData: Record<string, unknown> = {
        name: notificationForm.name,
        content: notificationForm.content
      };
      
      // Add district if specified
      if (districtId !== null) {
        notificationData.district = districtId;
      }
      
      // Format users field based on selection type
      if (userIds.length > 0) {
        // Include users for both specific selection and send to all
        notificationData.users = {
          create: userIds.map(id => ({ Users_id: id })),
          delete: []
        };
      } else {
        // No users selected, show warning
        console.warn('No users specified for notification - it may not be delivered');
      }

      console.log('Sending notification with exact format:', JSON.stringify(notificationData));
      
      try {
        // Use direct fetch with the correct format
        const response = await fetch('https://complaint.top-wp.com/items/notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(notificationData)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Notification created successfully:', result);
          
          // Reset form and show success message
          setNotificationForm({
            name: '',
            content: '',
            sendToAll: false,
            filterByDistrict: false
          });
          setSelectedUser("");
          setSelectedDistrict(null);
          setUsersInSelectedDistrict([]);
          setShowCreateModal(false);
          
          // Refresh notifications
          fetchNotifications();
          
          // Show success message
          alert('تم إنشاء الإشعار بنجاح');
        } else {
          // If it fails, get the error details
          let errorDetails = '';
          try {
            // Try to parse as JSON first
            const errorJson = await response.json();
            console.error('Error response (JSON):', errorJson);
            
            interface ErrorDetail { message?: string; extensions?: { code?: string } }
            if (errorJson.errors && errorJson.errors.length > 0) {
              errorDetails = (errorJson.errors as ErrorDetail[]).map((err) =>
                `${err.message || ''} (${err.extensions?.code || 'UNKNOWN_ERROR'})`
              ).join('; ');
            } else {
              errorDetails = JSON.stringify(errorJson);
            }
          } catch {
            // If not JSON, get as text
            errorDetails = await response.text();
            console.error('Error response (text):', errorDetails);
          }
          
          // Show error message
          alert(`حدث خطأ أثناء إنشاء الإشعار: ${response.status} - ${errorDetails}`);
        }
      } catch (err: unknown) {
        console.error('Error creating notification:', err);
        alert(`حدث خطأ أثناء الاتصال بالخادم: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
      }
    } catch (error) {
      console.error('Error in notification creation process:', error);
      alert('حدث خطأ أثناء إنشاء الإشعار');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الإشعار؟')) {
      return;
    }

    try {
      // Use a custom method that doesn't try to parse a JSON response
      await fetch(`https://complaint.top-wp.com/items/notification/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Notification ${id} deleted successfully`);
      
      // Update local state to remove the deleted notification
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('حدث خطأ أثناء حذف الإشعار');
    }
  };

  // Generate filtered notifications based on filter panel
  const filteredNotifications = notifications.filter(n => {
    if (filters.district && n.district?.toString() !== filters.district) return false;
    if (filters.name && !n.name.includes(filters.name)) return false;
    if (filters.startDate && (!n.date_created || new Date(n.date_created) < new Date(filters.startDate))) return false;
    if (filters.endDate && (!n.date_created || new Date(n.date_created) > new Date(filters.endDate))) return false;
    return true;
  });
  const indexOfLastNotification = currentPage * notificationsPerPage;
  const indexOfFirstNotification = indexOfLastNotification - notificationsPerPage;
  const currentNotifications = filteredNotifications.slice(indexOfFirstNotification, indexOfLastNotification);
  const totalPages = Math.ceil(filteredNotifications.length / notificationsPerPage);

  return (
    <PermissionGuard requiredPermissions={[{ resource: 'Notification', action: 'read' }]}>
    <div className="min-h-screen bg-gray-100 flex">
      <main className="flex-1 p-8 mr-64">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">الإشعارات</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 w-10 hover:bg-[#4664AD] text-[#4664AD] hover:text-[#F9FAFB] p-2 rounded-lg bg-[#F9FAFB] flex items-center justify-center"
            >
              <GrFilter />
            </button>
            {isAdmin && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-[#4664AD] hover:bg-[#3A5499] text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <FaPlus size={14} />
                <span>إنشاء إشعار جديد</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">المحافظة</label>
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1 text-right"
                  value={filters.district}
                  onChange={e => setFilters({...filters, district: e.target.value})}
                >
                  <option value="">كل المحافظات</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.id.toString()}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">عنوان الإشعار</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded p-2 text-right"
                  placeholder="ابحث بالعنوان"
                  value={filters.name}
                  onChange={e => setFilters({...filters, name: e.target.value})}
                />
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-500">جاري تحميل البيانات...</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex justify-center items-center h-64 flex-col">
            <div className="text-xl text-gray-500 mb-2">لا توجد إشعارات</div>
            {isAdmin && (
              <div className="text-md text-gray-400">
                يمكنك إنشاء إشعارات جديدة لإرسالها للمستخدمين
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Notifications List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className="bg-white rounded-lg shadow-sm p-5"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FaBell className="text-[#4664AD]" />
                        <h3 className="text-lg font-semibold">{notification.name}</h3>
                      </div>
                      <p className="text-gray-700 mb-3 whitespace-pre-line">{notification.content}</p>
                      <div className="text-sm text-gray-500">
                        {notification.date_created && 
                          new Date(notification.date_created).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        }
                      </div>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash size={16} />
                      </button>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-sm text-gray-500">
                        {notification.users && notification.district ? (
                            (() => {
                            const districtId = notification.district?.toString();
                            const district = districts.find(d => d.id.toString() === districtId);
                            console.log(`Finding district ${districtId}:`, district?.name || 'Not found');
                            
                            return (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded inline-block">
                                {district ? `محافظة: ${district.name}` : `محافظة رقم ${districtId}`} جميع المستخدمين
                              </span>
                            );
                          })()
                          
                        ) : notification.users ? (
                          (() => {
                            console.log(`Notification ${notification.id} users:`, notification.users);

                            // Extract user IDs more reliably
                            let userIds: string[] = [];
                            let embeddedUsers: User[] = [];
                            
                            if (typeof notification.users === 'string') {
                              // Handle case where users might be a JSON string
                              try {
                                const parsedUsers = JSON.parse(notification.users);
                                if (Array.isArray(parsedUsers)) {
                                  userIds = parsedUsers.map(u => u.toString());
                                }
                              } catch {
                                // If not valid JSON, try as single user ID
                                userIds = [notification.users];
                              }
                            } else if (Array.isArray(notification.users)) {
                              // Process array of users - handle various formats
                              
                              // First check if we have embedded user objects with full_name
                              embeddedUsers = (notification.users as UserRecord[])
                                .filter(user => 
                                  typeof user === 'object' && 
                                  user !== null && 
                                  (
                                    // Check if the object has user data directly
                                    (user.full_name && typeof user.full_name === 'string') ||
                                    // Or has a nested user object
                                    (user.user && typeof user.user === 'object' && 
                                     user.user.full_name && typeof user.user.full_name === 'string')
                                  )
                                )
                                .map(user => {
                                  // If user data is nested, extract it
                                  if (user.user && typeof user.user === 'object' && user.user.full_name) {
                                    return {
                                      id: user.user.id.toString(),
                                      full_name: user.user.full_name,
                                      email: user.user.email || ''
                                    };
                                  }
                                  // Otherwise return the user object itself as a User
                                  return {
                                    id: user.id?.toString() || '',
                                    full_name: user.full_name || '',
                                    email: ''
                                  };
                                });
                              
                              // If we don't have embedded users, extract IDs only
                              if (embeddedUsers.length === 0) {
                                userIds = (notification.users as Array<UserRecord | string | number>).map(user => {
                                  if (typeof user === 'string' || typeof user === 'number') {
                                    return user.toString();
                                  } else if (user && typeof user === 'object') {
                                    // Check for common ID properties in nested objects
                                    const obj = user as Record<string, unknown>;
                                    if (obj.Users_id) return obj.Users_id.toString();
                                    if (obj.users_id) return obj.users_id.toString();
                                    if (obj.id) return obj.id.toString();
                                    
                                    // Handle nested user object
                                    if (obj.user && typeof obj.user === 'object' && obj.user && 'id' in obj.user) {
                                      return (obj.user as {id: string | number}).id.toString();
                                    }
                                  }
                                  return '';
                                }).filter(id => id !== '');
                              }
                            }
                            
                            console.log('Extracted user IDs:', userIds);
                            console.log('Embedded users:', embeddedUsers);
                            
                            if (userIds.length === 0 && embeddedUsers.length === 0) {
                              return <span>لا يوجد مستخدمين محددين</span>;
                            }
                            
                            return (
                              <div className="flex flex-wrap gap-1">
                                {/* Display embedded users first if we have them */}
                                {embeddedUsers.map((user) => (
                                  <span key={user.id} className="bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block text-xs mr-1 mb-1">
                                    {user.full_name}
                                  </span>
                                ))}
                                
                                {/* Then look up and display users by ID */}
                                {userIds.map((userId: string) => {
                                  // Find the user by ID
                                  const user = users.find(u => u.id.toString() === userId.toString());
                                  
                                  return (
                                    <span key={userId} className="bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block text-xs mr-1 mb-1">
                                      {user ? user.full_name : `مستخدم #${userId}`}
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()
                        ) : (
                          <span>لا يوجد مستخدم</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  عرض {indexOfFirstNotification + 1} - {Math.min(indexOfLastNotification, filteredNotifications.length)} من {filteredNotifications.length} إشعار
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
            )}
          </>
        )}
      </main>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-right">إنشاء إشعار جديد</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  عنوان الإشعار
                </label>
                <input
                  type="text"
                  value={notificationForm.name}
                  onChange={(e) => setNotificationForm({...notificationForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-right"
                  placeholder="أدخل عنوان الإشعار"
                  dir="rtl"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  محتوى الإشعار
                </label>
                <textarea
                  value={notificationForm.content}
                  onChange={(e) => setNotificationForm({...notificationForm, content: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2 text-right"
                  rows={4}
                  placeholder="أدخل محتوى الإشعار"
                  dir="rtl"
                />
              </div>
              
              {/* Filter Options */}
              <div className="space-y-3 border-t border-gray-200 pt-3">
                <p className="font-medium text-gray-700 text-right">خيارات الإرسال:</p>
                <div className="flex items-center gap-2 justify-end">
                  <input
                    type="radio"
                    id="sendToUser"
                    checked={!notificationForm.sendToAll && !notificationForm.filterByDistrict}
                    onChange={() => {
                      setNotificationForm({
                        ...notificationForm, 
                        sendToAll: false,
                        filterByDistrict: false
                      });
                      setSelectedDistrict(null);
                      // Clear user search when switching to this option
                      setUserSearchTerm("");
                      setFilteredUsers([]);
                    }}
                    className="h-4 w-4"
                  />
                  <label htmlFor="sendToUser" className="text-sm font-medium text-gray-700">
                    إرسال إلى مستخدم محدد
                  </label>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <input
                    type="radio"
                    id="sendToAll"
                    checked={notificationForm.sendToAll}
                    onChange={() => {
                      setNotificationForm({
                        ...notificationForm, 
                        sendToAll: true,
                        filterByDistrict: false
                      });
                      setSelectedUser("");
                      setSelectedDistrict(null);
                      // Clear user search when switching to this option
                      setUserSearchTerm("");
                      setFilteredUsers([]);
                      setShowUserDropdown(false);
                    }}
                    className="h-4 w-4"
                  />
                  <label htmlFor="sendToAll" className="text-sm font-medium text-gray-700">
                    إرسال إلى جميع المستخدمين 
                  </label>
                </div>
                
                <div className="flex items-center gap-2 justify-end">
                  <input
                    type="radio"
                    id="filterByDistrict"
                    checked={notificationForm.filterByDistrict}
                    onChange={() => {
                      setNotificationForm({
                        ...notificationForm, 
                        filterByDistrict: true,
                        sendToAll: false
                      });
                      setSelectedUser("");
                      // Clear user search when switching to this option
                      setUserSearchTerm("");
                      setFilteredUsers([]);
                      setShowUserDropdown(false);
                    }}
                    className="h-4 w-4"
                  />
                  <label htmlFor="filterByDistrict" className="text-sm font-medium text-gray-700">
                    إرسال حسب المحافظة
                  </label>
                </div>
              </div>
              
              {/* User Selection */}
              {!notificationForm.sendToAll && !notificationForm.filterByDistrict ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    المستخدم
                  </label>
                  <div className="relative" ref={searchRef}>
                    <input
                      type="text"
                      value={userSearchTerm}
                      onChange={(e) => {
                        setUserSearchTerm(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      onKeyDown={handleSearchKeyDown}
                      className="w-full border border-gray-300 rounded-lg p-2 text-right"
                      placeholder="ابحث عن مستخدم بالاسم أو البريد الإلكتروني"
                      dir="rtl"
                    />
                    {showUserDropdown && filteredUsers.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md overflow-auto border border-gray-300">
                        {filteredUsers.map((user, index) => (
                          <div
                            key={user.id}
                            className={`p-2 hover:bg-blue-50 cursor-pointer text-right border-b border-gray-100 ${focusedUserIndex === index ? 'bg-blue-100' : ''}`}
                            onClick={() => {
                              setSelectedUser(user.id);
                              setUserSearchTerm(user.full_name);
                              setShowUserDropdown(false);
                            }}
                          >
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {userSearchTerm && filteredUsers.length === 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300 p-2 text-right">
                        <span className="text-gray-500">لا توجد نتائج</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 text-right">
                    ابحث واختر مستخدم واحد لإرسال الإشعار له
                  </p>
                  {selectedUser && (
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <div className="text-sm font-medium text-right">المستخدم المحدد:</div>
                      <div className="flex flex-wrap gap-1 mt-1 justify-end">
                        {(() => {
                          const user = users.find(u => u.id === selectedUser);
                          return (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {user ? `${user.full_name} (${user.email})` : selectedUser}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : notificationForm.filterByDistrict ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    المحافظة
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2 text-right"
                    value={selectedDistrict || ""}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value ? Number(e.target.value) : null);
                      console.log("Selected district ID:", e.target.value);
                    }}
                    dir="rtl"
                  >
                    <option value="">اختر محافظة</option>
                    {districts.map(district => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1 text-right">
                    اختر محافظة لإرسال الإشعار للمستخدمين المرتبطين بها
                  </p>
                  {fetchingDistrictUsers && (
                    <div className="mt-2 text-sm text-gray-500 text-right">
                      جاري البحث عن المستخدمين في هذه المحافظة...
                    </div>
                  )}
                  {selectedDistrict && !fetchingDistrictUsers && (
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <div className="text-sm font-medium">المحافظة المحددة:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(() => {
                          const district = districts.find(d => d.id === selectedDistrict);
                          return (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {district ? `${district.name}` : `محافظة رقم ${selectedDistrict}`}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="mt-2 text-sm">
                        {usersInSelectedDistrict.length > 0 ? (
                          <div className="text-green-600">
                            سيتم إرسال الإشعار إلى {usersInSelectedDistrict.length} مستخدم من هذه المحافظة
                          </div>
                        ) : (
                          <div className="text-yellow-600">
                            لم يتم العثور على مستخدمين في هذه المحافظة
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreateNotification}
                  className="px-4 py-2 bg-[#4664AD] text-white rounded-lg"
                >
                  إنشاء
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