'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight, FaUpload } from 'react-icons/fa';

interface NewsFormData {
  title: string;
  content: string;
  image?: string | null;
  newImage?: File | null;
}

interface NewsPageParams {
  params: {
    id: string;
  };
}

export default function EditNewsPage({ params }: NewsPageParams) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [originalImageId, setOriginalImageId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewsFormData>({
    title: '',
    content: '',
    image: null,
    newImage: null,
  });
  const [errors, setErrors] = useState({
    title: '',
    content: '',
  });

  useEffect(() => {
    checkAdminStatus();
    fetchNewsItem();
  }, [params.id]);

  const checkAdminStatus = () => {
    const ADMIN_ROLE_ID = '8A8C7803-08E5-4430-9C56-B2F20986FA56';
    try {
      const storedUserInfo = localStorage.getItem('user_info');
      if (storedUserInfo) {
        const userInfoData = JSON.parse(storedUserInfo);
        const admin = userInfoData?.role === ADMIN_ROLE_ID;
        
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
      
      // Get token for authentication
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('جلسة تسجيل الدخول منتهية. يرجى تسجيل الدخول مرة أخرى.');
        router.push('/login');
        return;
      }
      
      // Fetch news item
      const response = await fetch(`https://complaint.top-wp.com/items/news/${params.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('فشل في جلب بيانات الخبر');
      }
      
      const data = await response.json();
      
      // Set form data
      setFormData({
        title: data.data.title || '',
        content: data.data.content || '',
        image: data.data.image,
      });
      
      // Save original image ID
      if (data.data.image) {
        setOriginalImageId(data.data.image);
        
        // Fetch image URL for preview
        const imageResponse = await fetch(`https://complaint.top-wp.com/assets/${data.data.image}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (imageResponse.ok) {
          const blob = await imageResponse.blob();
          const imageUrl = URL.createObjectURL(blob);
          setImagePreview(imageUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching news item:', error);
      alert(`حدث خطأ أثناء جلب بيانات الخبر: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      
      setFormData({
        ...formData,
        newImage: file,
      });
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors = {
      title: '',
      content: '',
    };
    
    if (!formData.title.trim()) {
      newErrors.title = 'يرجى إدخال عنوان الخبر';
      isValid = false;
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'يرجى إدخال محتوى الخبر';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Get token for authentication
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('جلسة تسجيل الدخول منتهية. يرجى تسجيل الدخول مرة أخرى.');
        router.push('/login');
        return;
      }
      
      let imageId = originalImageId;
      
      // Upload new image if selected
      if (formData.newImage) {
        // Create form data for image upload
        const imageFormData = new FormData();
        imageFormData.append('file', formData.newImage);
        
        // Upload image
        const uploadResponse = await fetch('https://complaint.top-wp.com/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: imageFormData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('فشل في رفع الصورة');
        }
        
        const uploadResult = await uploadResponse.json();
        imageId = uploadResult.data.id;
      }
      
      // Update news item
      const newsData = {
        title: formData.title,
        content: formData.content,
        image: imageId,
      };
      
      const updateResponse = await fetch(`https://complaint.top-wp.com/items/news/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newsData),
      });
      
      if (!updateResponse.ok) {
        throw new Error('فشل في تحديث الخبر');
      }
      
      // Success
      alert('تم تحديث الخبر بنجاح');
      router.push('/news');
    } catch (error) {
      console.error('Error updating news:', error);
      alert(`حدث خطأ أثناء تحديث الخبر: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setSubmitting(false);
    }
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
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6 text-right">تعديل الخبر</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                عنوان الخبر
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-lg p-2 text-right`}
                placeholder="أدخل عنوان الخبر"
                dir="rtl"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500 text-right">{errors.title}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                محتوى الخبر
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows={10}
                className={`w-full border ${errors.content ? 'border-red-500' : 'border-gray-300'} rounded-lg p-2 text-right`}
                placeholder="أدخل محتوى الخبر"
                dir="rtl"
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-500 text-right">{errors.content}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                صورة الخبر (اختياري)
              </label>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                <input
                  type="file"
                  name="image"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                  accept="image/*"
                />
                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                  {imagePreview ? (
                    <div className="w-full max-w-md mb-4">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg" 
                      />
                    </div>
                  ) : (
                    <FaUpload className="text-gray-400 h-12 w-12 mb-2" />
                  )}
                  <span className="text-sm text-gray-500">
                    {imagePreview ? 'تغيير الصورة' : 'انقر لاختيار صورة'}
                  </span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
              <button
                type="submit"
                disabled={submitting}
                className={`bg-[#4664AD] hover:bg-[#3A5499] text-white px-6 py-3 rounded-lg ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'جاري التحديث...' : 'تحديث الخبر'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 