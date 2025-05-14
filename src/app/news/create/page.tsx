'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight, FaUpload } from 'react-icons/fa';

interface NewsFormData {
  title: string;
  content: string;
  image: File | null;
}

export default function CreateNewsPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewsFormData>({
    title: '',
    content: '',
    image: null,
  });
  const [errors, setErrors] = useState({
    title: '',
    content: '',
    image: '',
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

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
        image: file,
      });
      
      // Clear error
      setErrors({
        ...errors,
        image: '',
      });
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors = {
      title: '',
      content: '',
      image: '',
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
      
      let imageId = null;
      
      // Upload image if selected
      if (formData.image) {
        // Create form data for image upload
        const imageFormData = new FormData();
        imageFormData.append('file', formData.image);
        
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
      
      // Now create the news item with the uploaded image (if any)
      const newsData = {
        title: formData.title,
        content: formData.content,
        image: imageId,
      };
      
      // Create news item
      const createResponse = await fetch('https://complaint.top-wp.com/items/news', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newsData),
      });
      
      if (!createResponse.ok) {
        throw new Error('فشل في إنشاء الخبر');
      }
      
      // Success
      alert('تم إضافة الخبر بنجاح');
      router.push('/news');
    } catch (error) {
      console.error('Error creating news:', error);
      alert(`حدث خطأ أثناء إنشاء الخبر: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className="text-2xl font-bold mb-6 text-right">إضافة خبر جديد</h1>
          
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
                {errors.image && (
                  <p className="mt-2 text-sm text-red-500">{errors.image}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
              <button
                type="submit"
                disabled={submitting}
                className={`bg-[#4664AD] hover:bg-[#3A5499] text-white px-6 py-3 rounded-lg ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {submitting ? 'جاري الإضافة...' : 'إضافة الخبر'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 