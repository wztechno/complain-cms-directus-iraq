'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight, FaUserCircle } from 'react-icons/fa';

interface User {
  id: number;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  national_id_number: string | null;
  communication_method: string | null;
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
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUserDetails();
  }, [params.id]);

  const fetchUserDetails = async () => {
    try {
      // Fetch user details
      const res = await fetch(`https://complaint.top-wp.com/items/Users/${params.id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch user details');
      }
      const data = await res.json();
      const userData: UserWithComplaints = data.data;

      // Fetch user's complaints
      try {
        const complaintsRes = await fetch(`https://complaint.top-wp.com/items/Complaint?filter[user][_eq]=${params.id}`);
        if (complaintsRes.ok) {
          const complaintsData = await complaintsRes.json();
          userData.complaints = complaintsData.data;
        }
      } catch (error) {
        console.error('Error fetching user complaints:', error);
      }

      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user details:', error);
      setLoading(false);
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
        </div>

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
              {user.communication_method || 'غير محدد'}
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