'use client';

import React, { useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';

interface Rating {
  id: number;
  rating_value: string;
  comment: string | null;
  user: number;
  Complaint: number;
}

interface ComplaintDetails {
  title?: string;
  Service_type?: string;
}

interface UserDetails {
  full_name?: string;
  email?: string;
}

interface RatingWithDetails extends Rating {
  complaintDetails?: ComplaintDetails;
  userDetails?: UserDetails;
}

export default function RatingsPage() {
  const [ratings, setRatings] = useState<RatingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Complaint_ratings');
      if (!res.ok) {
        throw new Error('Failed to fetch ratings');
      }
      const data = await res.json();
      
      // Fetch both complaint and user details for each rating
      const ratingsWithDetails = await Promise.all(
        data.data.map(async (rating: Rating) => {
          const details: RatingWithDetails = { ...rating };
          
          try {
            // Fetch complaint details
            const complaintRes = await fetch(`https://complaint.top-wp.com/items/Complaint/${rating.Complaint}`);
            if (complaintRes.ok) {
              const complaintData = await complaintRes.json();
              details.complaintDetails = complaintData.data;
            }

            // Fetch user details
            const userRes = await fetch(`https://complaint.top-wp.com/items/Users/${rating.user}`);
            if (userRes.ok) {
              const userData = await userRes.json();
              details.userDetails = userData.data;
            }
          } catch (error) {
            console.error('Error fetching details:', error);
          }
          
          return details;
        })
      );

      setRatings(ratingsWithDetails);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ratings:', error);
      setLoading(false);
    }
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
    if (userDetails?.full_name ) {
      return `${userDetails.full_name || ''}`.trim();
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
          <button className="bg-[#4664AD] text-white px-4 py-2 rounded-lg">
            تصدير التقييمات
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ratings.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
            {/* Header - User Name and Menu */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">
                {getUserName(item.userDetails)}
              </h3>
              <button className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">⋮</span>
              </button>
            </div>

            {/* Body - Complaint Title and Rating */}
            <div className="mb-6 flex justify-between">
              <div className="text-xl font-semibold mb-3 text-right">
                {item.complaintDetails?.title || 'شكوى رقم ' + item.Complaint}
              </div>
              <div className="flex justify-end gap-1">
                {renderStars(parseInt(item.rating_value))}
              </div>
            </div>

            {/* Footer - Comment */}
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