'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/api';
import { FaArrowRight, FaUserPlus, FaCheck } from 'react-icons/fa';
import { BsPersonFill } from 'react-icons/bs';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface StatusSubCategory {
  id: number;
  name: string;
  status_category: number;
}

interface District {
  id: number;
  name: string;
}

interface PolicyUser {
  userId: string;
  districts: number[];
  statusSubCategories: number[];
}

interface Policy {
  id: string;
  name: string;
  description: string | null;
  users: string[];
  created_at?: string;
}

export default function PolicyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [statusSubCategories, setStatusSubCategories] = useState<StatusSubCategory[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedDistricts, setSelectedDistricts] = useState<number[]>([]);
  const [selectedStatusSubCategories, setSelectedStatusSubCategories] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);

  useEffect(() => {
    fetchPolicyData();
    fetchUsers();
    fetchDistricts();
    fetchStatusSubCategories();
  }, [params.id]);

  const fetchPolicyData = async () => {
    try {
      const data = await fetchWithAuth(`/policies/${params.id}`);
      setPolicy(data.data);
    } catch (error) {
      console.error('Error fetching policy:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await fetchWithAuth('/users');
      setUsers(data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDistricts = async () => {
    try {
      const data = await fetchWithAuth('/items/District');
      setDistricts(data.data);
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  };

  const fetchStatusSubCategories = async () => {
    try {
      const data = await fetchWithAuth('/items/Status_subcategory');
      setStatusSubCategories(data.data.filter((item: StatusSubCategory) => item.name !== null));
    } catch (error) {
      console.error('Error fetching status subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUser) return;

    try {
      // Update policy users
      const updatedUsers = [...(policy?.users || []), selectedUser];
      await fetchWithAuth(`/policies/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          users: updatedUsers
        })
      });

      // Add user permissions
      await fetchWithAuth('/policies', {
        method: 'POST',
        body: JSON.stringify({
          policy_id: params.id,
          user_id: selectedUser,
          districts: selectedDistricts,
          status_subcategories: selectedStatusSubCategories
        })
      });

      // Refresh policy data
      fetchPolicyData();
      setShowAddUser(false);
      setSelectedUser('');
      setSelectedDistricts([]);
      setSelectedStatusSubCategories([]);
    } catch (error) {
      console.error('Error adding user:', error);
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
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#4664AD] hover:text-[#3A5499]"
        >
          <FaArrowRight />
          <span>العودة إلى القائمة</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold">{policy?.name}</h1>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 bg-[#4664AD] text-white px-4 py-2 rounded-lg"
          >
            <FaUserPlus />
            <span>إضافة مستخدم</span>
          </button>
        </div>

        {showAddUser && (
          <div className="mb-8 bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">إضافة مستخدم جديد</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المستخدم
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="">اختر مستخدم</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المحافظات
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {districts.map((district) => (
                    <label key={district.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedDistricts.includes(district.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDistricts([...selectedDistricts, district.id]);
                          } else {
                            setSelectedDistricts(selectedDistricts.filter(id => id !== district.id));
                          }
                        }}
                        className="rounded text-[#4664AD]"
                      />
                      <span>{district.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  حالات الشكوى
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {statusSubCategories.map((status) => (
                    <label key={status.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedStatusSubCategories.includes(status.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStatusSubCategories([...selectedStatusSubCategories, status.id]);
                          } else {
                            setSelectedStatusSubCategories(selectedStatusSubCategories.filter(id => id !== status.id));
                          }
                        }}
                        className="rounded text-[#4664AD]"
                      />
                      <span>{status.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddUser}
                  className="px-4 py-2 bg-[#4664AD] text-white rounded-lg"
                >
                  إضافة
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">المستخدمون المضافون</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policy?.users.map((userId) => {
              const user = users.find(u => u.id === userId);
              return user ? (
                <div key={userId} className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#4664AD] flex items-center justify-center">
                      <BsPersonFill className="text-white text-xl" />
                    </div>
                    <div>
                      <div className="font-medium">{user.first_name} {user.last_name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <button className="text-red-500 hover:text-red-600">
                    حذف
                  </button>
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 