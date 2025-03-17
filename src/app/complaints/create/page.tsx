'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateComplaintPage() {
  const router = useRouter();
  const [governorates, setGovernorates] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    Service_type: '',
    governorate_name: '',
    completion_percentage: 0,
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        // Fetch governorates
        const govRes = await fetch('https://complaint.top-wp.com/items/Complaint');
        if (govRes.ok) {
          const govData = await govRes.json();
          const uniqueGovs = [...new Set(govData.data
            .map((item: any) => item.governorate_name)
            .filter(Boolean))] as string[];
          setGovernorates(uniqueGovs);
        }
        
        // Fetch service types
        const serviceRes = await fetch('https://complaint.top-wp.com/items/Complaint');
        if (serviceRes.ok) {
          const serviceData = await serviceRes.json();
          const uniqueServices = [...new Set(serviceData.data
            .map((item: any) => item.Service_type)
            .filter(Boolean))] as string[];
          setServiceTypes(uniqueServices);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching metadata:', error);
        setLoading(false);
      }
    };
    
    fetchMetadata();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const res = await fetch('https://complaint.top-wp.com/items/Complaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        throw new Error('Failed to create complaint');
      }
      
      // Redirect to complaints page on success
      router.push('/complaints');
    } catch (error) {
      console.error('Error creating complaint:', error);
      alert('حدث خطأ أثناء إنشاء الشكوى. يرجى المحاولة مرة أخرى.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64 flex justify-center items-center">
        <div className="text-xl text-gray-600">جاري تحميل البيانات...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 mr-64">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">إنشاء شكوى جديدة</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                عنوان الشكوى *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-md p-2 text-right"
                placeholder="أدخل عنوان الشكوى"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                وصف الشكوى *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
                placeholder="أدخل وصف تفصيلي للشكوى"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  نوع الخدمة *
                </label>
                <select
                  name="Service_type"
                  value={formData.Service_type}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                >
                  <option value="">اختر نوع الخدمة</option>
                  {serviceTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  المحافظة *
                </label>
                <select
                  name="governorate_name"
                  value={formData.governorate_name}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                >
                  <option value="">اختر المحافظة</option>
                  {governorates.map((gov) => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-8">
              <button
                type="button"
                onClick={() => router.push('/complaints')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#4664AD] text-white rounded-md hover:bg-[#3A5499] disabled:bg-gray-400"
              >
                {submitting ? 'جاري الإنشاء...' : 'إنشاء الشكوى'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 