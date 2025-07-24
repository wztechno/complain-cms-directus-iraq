'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight, FaUserCircle, FaBell } from 'react-icons/fa';
import { fetchWithAuth } from '@/utils/api';


interface User {
  id: number;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  national_id_number: string | null;
  communication_method: string | null;
  district?: number | null;
  created_at?: string;
}

interface Complaint {
  id: string;
  title: string;
  Service_type: string;
  governorate_name: string;
  completion_percentage: number;
}

interface UserWithComplaints extends User {
  complaints?: Complaint[];
}

export default function CitizenDetailsPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<UserWithComplaints | null>(null);
  const [districtName, setDistrictName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notification, setNotification] = useState({ name: '', content: '' });
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUserDetails();
    checkAdminStatus();
  }, [params.id]);

  const checkAdminStatus = () => {
    const ADMIN_ROLE_ID = '0FE8C81C-035D-41AC-B3B9-72A35678C558';
    try {
      const storedUserInfo = localStorage.getItem('user_info');
      if (storedUserInfo) {
        const userInfoData = JSON.parse(storedUserInfo);
        const admin = userInfoData?.role === ADMIN_ROLE_ID;
        setIsAdmin(admin);
      }
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    }
  };

  const fetchUserDetails = async () => {
    try {
      // Fetch user details
      const res = await fetchWithAuth(`/items/users/${params.id}`);
      // if (!res.ok) {
      //   throw new Error('Failed to fetch user details');
      // }
      const data = await res;
      const userData: UserWithComplaints = data.data;

      // Fetch user's complaints
      try {
        const complaintsRes = await fetchWithAuth(`/items/Complaint?filter[user][_eq]=${params.id}`);
        if (complaintsRes) {
          const complaintsData = await complaintsRes;
          userData.complaints = complaintsData.data;
        }
      } catch (error) {
        console.error('Error fetching user complaints:', error);
      }

      // Fetch district name
      if (userData.district) {
        try {
          const districtRes = await fetchWithAuth(`/items/District/${userData.district}`);
          if (districtRes) {
            const districtData = await districtRes;
            setDistrictName(districtData.data.name);
          }
        } catch (error) {
          console.error('Error fetching district:', error);
        }
      }

      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user details:', error);
      setLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!notification.name || !notification.content) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setIsSending(true);
      
      // Get the token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('جلسة تسجيل الدخول منتهية. يرجى تسجيل الدخول مرة أخرى.');
        setIsSending(false);
        return;
      }

      // Create the notification data
      const notificationData = {
        name: notification.name,
        content: notification.content,
        users: {
          create: [{ Users_id: parseInt(params.id, 10) }],
          delete: []
        }
      };
      
      // Send the notification
      const response = await fetch('https://complaint.top-wp.com/items/notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notificationData)
      });
      
      if (response.ok) {
        alert('تم إرسال الإشعار بنجاح');
        setNotification({ name: '', content: '' });
        setShowNotificationModal(false);
      } else {
        let errorDetails = '';
        try {
          const errorJson = await response.json();
          errorDetails = errorJson.errors ? errorJson.errors.map((err: { message: string }) => err.message).join('; ') : 'خطأ غير معروف';
        } catch {
          errorDetails = await response.text();
        }
        alert(`حدث خطأ أثناء إرسال الإشعار: ${errorDetails}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert(`حدث خطأ أثناء إرسال الإشعار: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setIsSending(false);
    }
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return '';
    return phone.startsWith('+') ? phone : `+964 ${phone}`;
  };

  if (loading) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">لم يتم العثور على المواطن</div>
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

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 text-gray-400">
              <FaUserCircle size={64} />
            </div>
            <div>
              <div className="text-3xl font-bold">{user.full_name}</div>
              <div className="text-gray-500">{user.email}</div>
            </div>
          </div>
          
          {/* {isAdmin && ( */}
            <button 
              onClick={() => setShowNotificationModal(true)}
              className="bg-[#4664AD] hover:bg-[#3A5499] text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FaBell size={14} />
              <span>إرسال إشعار</span>
            </button>
          {/* )} */}
        </div>

        {/* Notification Modal */}
        {showNotificationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-right">إرسال إشعار إلى {user.full_name}</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  عنوان الإشعار
                </label>
                <input 
                  type="text" 
                  value={notification.name}
                  onChange={(e) => setNotification({...notification, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg text-right"
                  placeholder="أدخل عنوان الإشعار"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  محتوى الإشعار
                </label>
                <textarea 
                  value={notification.content}
                  onChange={(e) => setNotification({...notification, content: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg text-right h-32"
                  placeholder="أدخل محتوى الإشعار"
                />
              </div>
              
              <div className="flex justify-between mt-6">
                <button 
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button 
                  onClick={sendNotification}
                  disabled={isSending}
                  className="bg-[#4664AD] hover:bg-[#3A5499] text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {isSending ? 'جاري الإرسال...' : 'إرسال الإشعار'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              رقم التعريف
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {user.id}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              رقم الهاتف
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right" dir="ltr">
              {formatPhoneNumber(user.phone_number)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              الرقم الوطني
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {user.national_id_number || 'غير محدد'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              طريقة التواصل المفضلة
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {user.communication_method || 'غير محددة'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              المحافظة
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {districtName || 'غير محددة'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              تاريخ الإنشاء
            </label>
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              {user.created_at ? new Date(user.created_at).toLocaleDateString('ar-EG') : 'غير محدد'}
            </div>
          </div>
        </div>

        {user.complaints && user.complaints.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 text-right">الشكاوى المقدمة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.complaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => router.push(`/complaints/${complaint.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-500">{complaint.Service_type}</span>
                    <span className="text-gray-500">{complaint.governorate_name}</span>
                  </div>
                  <h3 className="font-medium text-right">{complaint.title}</h3>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#4664AD] h-2 rounded-full"
                        style={{ width: `${complaint.completion_percentage}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-600 text-left mt-1">
                      {complaint.completion_percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
