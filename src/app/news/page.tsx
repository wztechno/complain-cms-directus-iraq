'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaCalendarAlt, FaFilter, FaPlus, FaPen, FaTrash } from 'react-icons/fa';
import { GrFilter } from 'react-icons/gr';
import PermissionGuard from '@/components/PermissionGuard';

interface NewsItem {
  id: string;
  date_created: string;
  title: string;
  content: string;
  image: string;
}

export default function NewsPage() {
  const router = useRouter();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    title: '',
  });
  const [deleting, setDeleting] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  
  const itemsPerPage = 6;
  
  useEffect(() => {
    checkAdminStatus();
    fetchNews();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [filters, newsItems]);
  
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
      if (typeof window !== 'undefined') {
        router.replace('/');
      }
    }
  };
  
  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://complaint.top-wp.com/items/news');
      
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      
      const data = await response.json();
      
      // Sort by date (newest first)
      const sortedNews = data.data.sort((a: NewsItem, b: NewsItem) => {
        return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
      });
      
      setNewsItems(sortedNews);
      setFilteredNews(sortedNews);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let filtered = [...newsItems];
    
    // Filter by start date
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date_created);
        return itemDate >= startDate;
      });
    }
    
    // Filter by end date
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59); // End of the day
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date_created);
        return itemDate <= endDate;
      });
    }
    
    // Filter by title
    if (filters.title) {
      const searchTerm = filters.title.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm)
      );
    }
    
    setFilteredNews(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };
  
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      title: '',
    });
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredNews.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
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
  
  const confirmDelete = (id: string) => {
    setDeleteItemId(id);
    if (confirm('هل أنت متأكد من حذف هذا الخبر؟')) {
      deleteNews(id);
    } else {
      setDeleteItemId(null);
    }
  };
  
  const deleteNews = async (id: string) => {
    try {
      setDeleting(true);
      
      // Get token for authentication
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('جلسة تسجيل الدخول منتهية. يرجى تسجيل الدخول مرة أخرى.');
        router.push('/login');
        return;
      }
      
      const response = await fetch(`https://complaint.top-wp.com/items/news/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('فشل في حذف الخبر');
      }
      
      // Remove the deleted item from state
      setNewsItems(prev => prev.filter(item => item.id !== id));
      setFilteredNews(prev => prev.filter(item => item.id !== id));
      
      alert('تم حذف الخبر بنجاح');
    } catch (error) {
      console.error('Error deleting news:', error);
      alert(`حدث خطأ أثناء حذف الخبر: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setDeleting(false);
      setDeleteItemId(null);
    }
  };
  
  // Use isAdmin to conditionally render admin controls
  const renderAdminControls = () => {
    if (!isAdmin) return null;
    
    return (
      <div className="flex space-x-2 gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="h-10 w-10 hover:bg-[#4664AD] text-[#4664AD] hover:text-[#F9FAFB] p-2 rounded-lg bg-[#F9FAFB] flex items-center justify-center"
          >
            <GrFilter />
        </button>
        <button
          onClick={() => router.push('/news/create')}
          className="bg-[#4664AD] hover:bg-[#3A5499] text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlus />
          إضافة خبر جديد
        </button>
      </div>
    );
  };
  
  return (
    <PermissionGuard requiredPermissions={[{ resource: 'News', action: 'read' }]}>
    <div className="min-h-screen bg-gray-100 flex">
      <main className="flex-1 p-8 mr-64">
        <div className="mb-6 flex flex-wrap justify-between items-center">
          <h1 className="text-3xl font-bold mb-2">الأخبار</h1>
          {renderAdminControls()}
        </div>
        
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  من تاريخ
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  العنوان
                </label>
                <input
                  type="text"
                  name="title"
                  value={filters.title}
                  onChange={handleFilterChange}
                  className="w-full border border-gray-300 rounded-lg p-2 text-right"
                  placeholder="ابحث عن طريق العنوان"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={resetFilters}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
              >
                إعادة ضبط
              </button>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-6 flex justify-center items-center h-64">
            <p className="text-xl">جاري تحميل الأخبار...</p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 flex justify-center items-center h-64">
            <p className="text-xl">لا توجد أخبار متاحة</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentItems.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                  <div className="relative h-48">
                    {item.image ? (
                      <img
                        src={`https://complaint.top-wp.com/assets/${item.image}`}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <p className="text-gray-500">لا توجد صورة</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center text-gray-500 text-sm mb-2">
                      <FaCalendarAlt className="ml-1" />
                      <span>{formatDate(item.date_created)}</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2 text-right line-clamp-2">{item.title}</h2>
                    <p className="text-gray-600 mb-4 text-right line-clamp-3" dir="rtl">
                      {item.content}
                    </p>
                    <div className="mt-auto flex justify-between">
                      <div className="flex space-x-2 gap-2">
                        <button 
                          onClick={() => router.push(`/news/edit/${item.id}`)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-1 py-1 rounded flex items-center gap-1"
                        >
                          <FaPen size={14} />
                          تعديل
                        </button>
                        <button 
                          onClick={() => confirmDelete(item.id)}
                          disabled={deleting && deleteItemId === item.id}
                          className={`bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded flex items-center gap-1 ${(deleting && deleteItemId === item.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <FaTrash size={14} />
                          {(deleting && deleteItemId === item.id) ? 'جاري الحذف...' : 'حذف'}
                        </button>
                      </div>
                      <Link href={`/news/${item.id}`} className="bg-[#4664AD] hover:bg-[#3A5499] text-white px-3 py-1 rounded">
                        عرض المزيد
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className={`bg-white border border-gray-300 rounded-lg px-4 py-2 ${
                      currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    السابق
                  </button>
                  <div className="text-gray-700">
                    صفحة {currentPage} من {totalPages}
                  </div>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className={`bg-white border border-gray-300 rounded-lg px-4 py-2 ${
                      currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    التالي
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </main>
    </div>
    </PermissionGuard>
  );
} 