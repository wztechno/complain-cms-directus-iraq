'use client';

import React from 'react';
import { FaUserCircle, FaEllipsisH } from 'react-icons/fa';

interface UserRole {
  id: number;
  name: string;
  date: string;
  userCount: number;
}

export default function SettingsPage() {
  // Example data - replace with actual API data when available
  const userRoles: UserRole[] = [
    { id: 1, name: 'Public', date: 'December 10, 2020', userCount: 3 },
    { id: 2, name: 'Baghdad', date: 'December 10, 2020', userCount: 3 },
    { id: 3, name: 'Anbar', date: 'December 10, 2020', userCount: 3 },
    { id: 4, name: 'Dohuk', date: 'December 10, 2020', userCount: 3 },
    { id: 5, name: 'Basra', date: 'December 10, 2020', userCount: 3 },
    { id: 6, name: 'Arbil', date: 'December 10, 2020', userCount: 3 },
  ];

  const renderUserIcons = (count: number) => {
    return (
      <div className="flex items-center">
        <div className="flex -space-x-3 rtl:space-x-reverse">
          {[...Array(Math.min(2, count))].map((_, index) => (
            <div
              key={index}
              className="w-8 h-8 rounded-full bg-[#4664AD] flex items-center justify-center -mr-2 border-2 border-white"
            >
              <FaUserCircle className="text-white" size={20} />
            </div>
          ))}
          {count > 2 && (
            <div className="w-8 h-8 rounded-full bg-[#4664AD] flex items-center justify-center border-2 border-white">
              <span className="text-white text-xs font-medium">+{count - 2}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <div className="flex gap-4">
          <button className="bg-[#4664AD] text-white px-4 py-2 rounded-lg">
            إضافة سياسات مخصصة
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">أدوار المستخدمين</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userRoles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex justify-between items-start mb-6">
              <button className="text-gray-400 hover:text-gray-600">
                <FaEllipsisH />
              </button>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{role.name}</h3>
                <div className="flex items-center">
                  {renderUserIcons(role.userCount)}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">=</span>
              </button>
              <p className="text-gray-500 text-sm">{role.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 