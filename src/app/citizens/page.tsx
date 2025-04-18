'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GrFilter } from 'react-icons/gr';
import { fetchWithAuth } from '@/utils/api';
import { exportToCSV } from '@/utils/export';

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  created_at?: string;
  district?: number;
}

interface District {
  id: number;
  name: string;
}

export default function CitizensPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtMap, setDistrictMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
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

  const fetchUsersAndDistricts = async () => {
    try {
      const [userRes, districtRes] = await Promise.all([
        fetch('https://complaint.top-wp.com/items/Users'),
        fetchWithAuth('/items/District'),
      ]);

      if (!userRes.ok || !districtRes?.data) {
        throw new Error('Failed to fetch users or districts');
      }

      const userData = await userRes.json();
      const filteredData = userData.data.filter(
        (user: User) => user.full_name !== null && user.email !== null
      );

      setUsers(filteredData);
      setFilteredUsers(filteredData);
      setDistricts(districtRes.data);

      const districtLookup = districtRes.data.reduce((acc: Record<number, string>, district: District) => {
        acc[district.id] = district.name;
        return acc;
      }, {});
      setDistrictMap(districtLookup);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching users or districts:', error);
      setLoading(false);
    }
  };

  const handleFilter = () => {
    let filtered = [...users];

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

    setFilteredUsers(filtered);
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}
