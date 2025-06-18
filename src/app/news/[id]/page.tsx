'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight, FaPen, FaTrash, FaCalendarAlt } from 'react-icons/fa';

interface NewsItem {
  id: string;
  date_created: string;
  title: string;
  content: string;
  image: string;
}

interface NewsPageParams {
  params: {
    id: string;
  };
}

export default function NewsDetailPage({ params }: NewsPageParams) {
  const router = useRouter();
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchNewsItem();
  }, [params.id]);

  const checkAdminStatus = () => {
    const ADMIN_ROLE_ID = '0FE8C81C-035D-41AC-B3B9-72A35678C558';
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
      if (typeof window !== 'undefined') {
        router.replace('/');
      }
    }
  };

  const fetchNewsItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://complaint.top-wp.com/items/news/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch news item');
      }
      
      const data = await response.json();
      setNewsItem(data.data);
    } catch (error) {
      console.error('Error fetching news item:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('ar-IQ', options);
  };
  
  const confirmDelete = () => {
    if (newsItem && confirm('هل أنت متأكد من حذف هذا الخبر؟')) {
      deleteNews();
    }
  };
  
  const deleteNews = async () => {
    if (!newsItem) return;
    
    try {
      setDeleting(true);
      
      // Get token for authentication
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('جلسة تسجيل الدخول منتهية. يرجى تسجيل الدخول مرة أخرى.');
        router.push('/login');
        return;
      }
      
      const response = await fetch(`https://complaint.top-wp.com/items/news/${newsItem.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('فشل في حذف الخبر');
      }
      
      alert('تم حذف الخبر بنجاح');
      router.push('/news');
    } catch (error) {
      console.error('Error deleting news:', error);
      alert(`حدث خطأ أثناء حذف الخبر: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setDeleting(false);
    }
  };

  const renderAdminControls = () => {
    if (!isAdmin || !newsItem) return null;
    
    return (
      <div className="flex space-x-2 mt-6 gap-2">
        <button 
          onClick={() => router.push(`/news/edit/${newsItem.id}`)}
          className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded flex items-center gap-2"
        >
          <FaPen />
          تعديل الخبر
        </button>
        <button 
          onClick={confirmDelete}
          disabled={deleting}
          className={`bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded flex items-center gap-2 ${deleting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <FaTrash />
          {deleting ? 'جاري الحذف...' : 'حذف الخبر'}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <main className="flex-1 p-8 mr-64">
          <div className="bg-white rounded-lg shadow-md p-6 flex justify-center items-center h-64">
            <p className="text-xl">جاري تحميل البيانات...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <main className="flex-1 p-8 mr-64">
          <div className="bg-white rounded-lg shadow-md p-6 flex justify-center items-center h-64">
            <p className="text-xl">لم يتم العثور على الخبر</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <main className="flex-1 p-8 mr-64">
        <div className="mb-4">
          <button 
            onClick={() => router.push('/news')}
            className="bg-[#4664AD] hover:bg-[#3A5499] text-white px-4 py-2 rounded flex items-center gap-2 w-fit"
          >
            <FaArrowRight />
            العودة إلى الأخبار
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {newsItem.image ? (
            <div className="w-full h-64 md:h-96">
              <img
                src={`https://complaint.top-wp.com/assets/${newsItem.image}`}
                alt={newsItem.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-64 md:h-96 bg-gray-200 flex items-center justify-center">
              <p className="text-gray-500 text-xl">لا توجد صورة</p>
            </div>
          )}
          
          <div className="p-6">
            <div className="flex items-center text-gray-500 text-sm mb-4">
              <FaCalendarAlt className="ml-1" />
              <span>{formatDate(newsItem.date_created)}</span>
            </div>
            
            <h1 className="text-3xl font-bold mb-6 text-right">{newsItem.title}</h1>
            
            <div className="text-gray-700 text-right whitespace-pre-line text-lg" dir="rtl">
              {newsItem.content}
            </div>
            
            {renderAdminControls()}
          </div>
        </div>
      </main>
    </div>
  );
} 