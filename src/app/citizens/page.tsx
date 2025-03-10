'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaUserCircle } from 'react-icons/fa';

interface User {
  id: number;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  national_id_number: string | null;
  communication_method: string | null;
}

export default function CitizensPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Users');
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      // Filter out users with null names or emails
      const filteredUsers = data.data.filter((user: User) => user.full_name !== null && user.email !== null);
      setUsers(filteredUsers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return '';
    // Add +964 prefix if not present
    return phone.startsWith('+') ? phone : `+964 ${phone}`;
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
        <h1 className="text-3xl font-bold">المواطنون</h1>
        <div className="flex gap-4">
          <button className="bg-[#4664AD] text-white px-4 py-2 rounded-lg">
            تصدير البيانات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {users.map((user) => (
          <div 
            key={user.id} 
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 text-gray-400">
                  <FaUserCircle size={40} />
                </div>
                <h3 className="text-lg font-semibold">{user.full_name}</h3>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">⋮</span>
              </button>
            </div>

            <div className="space-y-2 text-right">
              <p className="text-gray-600 text-sm">{user.email}</p>
              <p className="text-gray-500 text-sm font-medium" dir="ltr">
                {formatPhoneNumber(user.phone_number)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 