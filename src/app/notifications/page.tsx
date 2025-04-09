'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaBell, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { fetchWithAuth } from '@/utils/api';
import { useRouter } from 'next/navigation';

// Interface for Notification
interface Notification {
  id: string;
  name: string;
  content: string;
  users: string | null;
  date_created?: string;
  user_created?: string;
}

// Interface for User
interface User {
  id: string;
  full_name: string;
  email: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  
  // Form state
  const [notificationForm, setNotificationForm] = useState({
    name: '',
    content: '',
    sendToAll: false
  });

  const notificationsPerPage = 10;

  useEffect(() => {
    checkAdminStatus();
    fetchUsers();
    fetchNotifications();
  }, []);

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
      // Use the correct endpoint for users - system collection, not a custom collection
      const response = await fetchWithAuth('/items/Users');
      
      if (response && response.data) {
        console.log(`Successfully fetched ${response.data.length} users`);
        setUsers(response.data);
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

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Admin-only page, so fetch all notifications
      const endpoint = '/items/notification';
      const response = await fetchWithAuth(endpoint);
      
      if (response && response.data) {
        // Sort by date created (newest first)
        const sortedNotifications = response.data.sort((a: Notification, b: Notification) => {
          const dateA = new Date(a.date_created || '').getTime();
          const dateB = new Date(b.date_created || '').getTime();
          return dateB - dateA;
        });
        
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

  const handleCreateNotification = async () => {
    try {
      if (!notificationForm.name || !notificationForm.content) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      // For one-to-one relationship, we need a single user ID, not an array
      let userId = null;
      if (!notificationForm.sendToAll && selectedUser) {
        userId = selectedUser;
        console.log(`Notification will be sent to user: ${selectedUser}`);
      } else {
        // If sendToAll is true or no user selected, set to null for all users
        userId = null;
        console.log('Notification will be sent to all users');
      }

      const data = {
        name: notificationForm.name,
        content: notificationForm.content,
        users: userId // Single user ID, not an array
      };

      console.log('Creating notification with data:', {
        name: data.name,
        content: data.content,
        userId: data.users
      });

      const response = await fetchWithAuth('/items/notification', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      console.log('Notification created successfully:', response);

      // Reset form and close modal
      setNotificationForm({
        name: '',
        content: '',
        sendToAll: false
      });
      setSelectedUser("");
      setSelectedUsers([]);
      setShowCreateModal(false);
      
      // Refresh notifications
      fetchNotifications();
    } catch (error) {
      console.error('Error creating notification:', error);
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

  // Generate paginated notifications
  const indexOfLastNotification = currentPage * notificationsPerPage;
  const indexOfFirstNotification = indexOfLastNotification - notificationsPerPage;
  const currentNotifications = notifications.slice(indexOfFirstNotification, indexOfLastNotification);
  const totalPages = Math.ceil(notifications.length / notificationsPerPage);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <main className="flex-1 p-8 mr-64">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">الإشعارات</h1>
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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-500">جاري تحميل البيانات...</div>
          </div>
        ) : notifications.length === 0 ? (
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
                        {notification.users === null ? (
                          <span>جميع المستخدمين</span>
                        ) : notification.users ? (
                          (() => {
                            const user = users.find(u => u.id === notification.users);
                            return (
                              <span className="bg-gray-100 px-2 py-1 rounded inline-block">
                                {user ? `${user.full_name}` : 'مستخدم غير معروف'}
                              </span>
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
                  عرض {indexOfFirstNotification + 1} - {Math.min(indexOfLastNotification, notifications.length)} من {notifications.length} إشعار
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
              
              {/* <div className="flex items-center gap-2 justify-end">
                <input
                  type="checkbox"
                  id="sendToAll"
                  checked={notificationForm.sendToAll}
                  onChange={(e) => {
                    setNotificationForm({...notificationForm, sendToAll: e.target.checked});
                    if (e.target.checked) {
                      setSelectedUser("");
                    }
                  }}
                  className="h-4 w-4"
                />
                <label htmlFor="sendToAll" className="text-sm font-medium text-gray-700">
                  إرسال إلى جميع المستخدمين
                </label>
              </div> */}
              
              {!notificationForm.sendToAll && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    المستخدم
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2 text-right"
                    value={selectedUser}
                    onChange={(e) => {
                      setSelectedUser(e.target.value);
                      console.log("Selected user ID:", e.target.value);
                    }}
                    dir="rtl"
                  >
                    <option value="">اختر مستخدم</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1 text-right">
                    اختر مستخدم واحد لإرسال الإشعار له
                  </p>
                  {selectedUser && (
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <div className="text-sm font-medium">المستخدم المحدد:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(() => {
                          const user = users.find(u => u.id === selectedUser);
                          return (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {user ? `${user.full_name}` : selectedUser}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
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
  );
} 