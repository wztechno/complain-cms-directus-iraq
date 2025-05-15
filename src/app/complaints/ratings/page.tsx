'use client';

import React, { useState, useEffect } from 'react';
import { FaStar } from 'react-icons/fa';
import { GrFilter } from 'react-icons/gr';
import { exportToCSV } from '@/utils/export';

interface UserDetails {
  full_name?: string;
  email?: string;
}

interface ComplaintDetails {
  title?: string;
  Service_type?: string;
}

interface Rating {
  id: string;
  Complaint: {
    id: string;
    title?: string;
    Service_type?: string;
  };
  user: {
    full_name?: string;
    email?: string;
  };
  rating_value: string;
  comment?: string;
  date_created?: string;
}

interface RatingWithDetails extends Rating {
  complaintDetails?: ComplaintDetails;
  userDetails?: UserDetails;
}

export default function RatingsPage() {
  const [ratings, setRatings] = useState<RatingWithDetails[]>([]);
  const [filteredRatings, setFilteredRatings] = useState<RatingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    rating: '',
    startDate: '',
    mainCategory:'',
    endDate: '',
    serviceType: '',
    complaintId: ''
  });

  useEffect(() => {
    fetchRatings();
  }, []);

  useEffect(() => {
    handleFilter();
  }, [filters]);

  const fetchRatings = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Complaint_ratings?fields=*,Complaint.*');
      if (!res.ok) {
        throw new Error('Failed to fetch ratings');
      }
      const data = await res.json();
      console.log("data", data);
      // Fetch both complaint and user details for each rating
      // const ratingsWithDetails = await Promise.all(
      //   data.data.map(async (rating: Rating) => {
      //     const details: RatingWithDetails = { ...rating };
          
      //     try {
      //       // Fetch complaint details
      //       const complaintRes = await fetchWithAuth(`/items/Complaint/${rating.Complaint.id}`);
      //       if (complaintRes.ok) {
      //         const complaintData = await complaintRes.json();
      //         details.complaintDetails = complaintData.data;
      //       }

      //       // Fetch user details
      //       const userRes = await fetchWithAuth(`/items/Users/${rating.user}`);
      //       if (userRes.ok) {
      //         const userData = await userRes.json();
      //         details.userDetails = userData.data;
      //       }
      //     } catch (error) {
      //       console.error('Error fetching details:', error);
      //     }
          
      //     return details;
      //   })
      // );

      setRatings(data.data);
      setFilteredRatings(data.data);
      console.log("filteredRatings", filteredRatings);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ratings:', error);
      setLoading(false);
    }
  };

  const handleFilter = () => {
    let filtered = [...ratings];

    if (filters.rating) {
      filtered = filtered.filter(rating => 
        rating.rating_value === filters.rating
      );
    }

    if (filters.complaintId) {
      filtered = filtered.filter(rating => 
        rating.Complaint?.id.toString().includes(filters.complaintId)
      );
      console.log(`After complaint ID filter (${filters.complaintId}): ${filtered.length} ratings`);
    }

    if (filters.serviceType) {
      filtered = filtered.filter(rating => 
        rating.Complaint?.Service_type === filters.serviceType
      );
      console.log(`After service type filter (${filters.serviceType}): ${filtered.length} complaints`);
    }

    if (filters.mainCategory) {
      filtered = filtered.filter(rating => 
        rating.Complaint?.title === filters.mainCategory
      );
    }

    if (filters.startDate) {
      filtered = filtered.filter(rating => {
        const ratingDate = new Date(rating.date_created || '');
        return ratingDate >= new Date(filters.startDate);
      });
    }

    if (filters.endDate) {
      filtered = filtered.filter(rating => {
        const ratingDate = new Date(rating.date_created || '');
        return ratingDate <= new Date(filters.endDate);
      });
    }

    setFilteredRatings(filtered);
  };

  const handleExport = () => {
    const headers = ['id', 'Complaint', 'user', 'rating_value', 'comment', 'date_created'];
    exportToCSV(filteredRatings, headers, 'ratings_export');
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, index) => (
      <FaStar
        key={index}
        className={`text-2xl ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getUserName = (userDetails?: UserDetails) => {
    if (userDetails?.full_name) {
      return userDetails.full_name.trim();
    }
    return userDetails?.email || 'مستخدم رقم ';
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
        <h1 className="text-3xl font-bold">تقييمات الشكاوى</h1>
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
            تصدير التقييمات
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                رقم الشكوى
              </label>
              <input
                type="text"
                value={filters.complaintId}
                onChange={(e) => setFilters({ ...filters, complaintId: e.target.value })}
                placeholder="أدخل رقم الشكوى"
                className="w-full border border-gray-300 rounded-md p-2 text-right"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                التقييم
              </label>
              <select
                value={filters.rating}
                onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
              >
                <option value="">الكل</option>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>{rating} نجوم</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                نوع الخدمة
              </label>
              <select
                value={filters.serviceType}
                onChange={(e) => setFilters({ ...filters, serviceType: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
              >
                {/* <option value="">الكل</option>
                {Array.from(new Set(ratings.map(r => r.Complaint?.Service_type)))
                  .filter(Boolean)
                  .map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))
                } */}

                  <option value="">الكل</option>
                  <option value="خدمات فردية">خدمات فردية</option>
                  <option value="خدمات عامة">خدمات عامة</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                فئة الشكوى
              </label>
              <select
                value={filters.mainCategory}
                onChange={(e) => setFilters({ ...filters, mainCategory: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
              >
                <option value="">الكل</option>
                {Array.from(new Set(ratings.map(r => r.Complaint?.title)))
                  .filter(Boolean)
                  .map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))
                }
              </select>
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
                الى تاريخ
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRatings.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="hover:text-gray-600">
                <span className="text-lg">{item.Complaint?.id}</span>
              </div>
              <h3 className="text-lg font-semibold">
                {getUserName(item.user)}
              </h3>
            </div>

            <div className="mb-6 flex justify-between">
              <div className="text-xl font-semibold mb-3 text-right">
                {item.Complaint?.title || 'شكوى رقم ' + item?.Complaint?.id}
              </div>
              <div className="flex justify-end gap-1">
                {renderStars(parseInt(item.rating_value))}
              </div>
            </div>

            {item.comment && (
              <div className="border-t pt-4">
                <p className="text-gray-600 text-right text-sm">
                  {item.comment}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 