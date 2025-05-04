'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/api';
import { getUserPermissions, hasPermission } from '@/utils/permissions';
import { FaImage, FaVideo, FaFileAudio, FaFile, FaUpload, FaTimes } from 'react-icons/fa';

export default function CreateComplaintPage() {
  const router = useRouter();
  const [governorates, setGovernorates] = useState<{ id: number, name: string }[]>([]);
  const [districts, setDistricts] = useState<{id: number, name: string}[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [statusSubcategories, setStatusSubcategories] = useState<{ id: number, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [loadingGovernorates, setLoadingGovernorates] = useState(false);
  
  // File upload refs and state
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    Service_type: '',
    district: '',
    status_subcategory: '',
    governorate_name: '',
    completion_percentage: 0,
    // These will store the file IDs after upload
    image: '',
    video: '',
    voice: '',
    file: '' // Changed from array to single string
  });

  useEffect(() => {
    const checkPermissionsAndFetchData = async () => {
      try {
        const userPermissions = await getUserPermissions();
        if (!hasPermission(userPermissions, 'Complaint', 'create')) {
          setPermissionError('ليس لديك صلاحية لإنشاء شكاوى جديدة');
          setLoading(false);
          return;
        }

        const [distRes, complaintRes, statusRes, govRes] = await Promise.all([
          fetchWithAuth('/items/District?filter[active]=true'),
          fetchWithAuth('/items/Complaint'),
          fetchWithAuth('/items/Status_subcategory'),
          fetchWithAuth('/items/Governorate'),
        ]);

        if (distRes?.data) {
          setDistricts(distRes?.data);
        }

        if (govRes?.data) {
          // No need to store all governorates for filtering
          // setAllGovernorates(govRes?.data);
        }

        if (complaintRes?.data) {
          const uniqueServices = [...new Set(
            complaintRes.data.map((item: { Service_type?: string }) => item.Service_type).filter(Boolean)
          )] as string[];
          setServiceTypes(uniqueServices);
        }

        if (statusRes?.data) {
          setStatusSubcategories(statusRes.data);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error initializing create complaint page:', error);
        setLoading(false);
      }
    };

    checkPermissionsAndFetchData();
  }, []);

  // Filter governorates when district selection changes
  useEffect(() => {
    const filterGovernorates = async () => {
      if (!formData.district) {
        setGovernorates([]);
        return;
      }

      try {
        setLoadingGovernorates(true);
        
        // Get the filtered governorates based on the selected district
        const response = await fetchWithAuth(`/items/Governorate?filter[district][_eq]=${formData.district}`);
        
        if (response?.data) {
          setGovernorates(response.data);
          
          // If only one governorate is available, auto-select it
          if (response.data.length === 1) {
            setFormData(prev => ({
              ...prev,
              governorate_name: response.data[0].name // Use the name instead of ID
            }));
          }
        } else {
          setGovernorates([]);
        }
      } catch (error) {
        console.error('Error filtering governorates by district:', error);
        setGovernorates([]);
      } finally {
        setLoadingGovernorates(false);
      }
    };

    filterGovernorates();
  }, [formData.district]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Clear governorate selection when district changes
    if (name === 'district') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        governorate_name: '' // Reset the governorate when district changes
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };
  
  // File input handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedImage(e.target.files[0]);
    }
  };
  
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedVideo(e.target.files[0]);
    }
  };
  
  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedAudio(e.target.files[0]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Clear previous files and only use the newly selected ones
      const newFiles = Array.from(e.target.files);
      setUploadedFiles(newFiles); // Replace instead of append
      
      if (newFiles.length > 1) {
        alert('يمكن إرفاق ملف واحد فقط. سيتم استخدام الملف الأول فقط.');
      }
    }
  };
  
  // Remove uploaded file
  const removeImage = () => setUploadedImage(null);
  const removeVideo = () => setUploadedVideo(null);
  const removeAudio = () => setUploadedAudio(null);
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Update handleSubmit to address file upload timing issues
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const userPermissions = await getUserPermissions();
      if (!hasPermission(userPermissions, 'Complaint', 'create')) {
        setPermissionError('ليس لديك صلاحية لإنشاء شكاوى جديدة');
        setSubmitting(false);
        return;
      }
      
      // Collect files to upload
      const filesToUpload = [];
      let fileId = '';
      
      if (uploadedImage) filesToUpload.push({ file: uploadedImage, type: 'image' });
      if (uploadedVideo) filesToUpload.push({ file: uploadedVideo, type: 'video' });
      if (uploadedAudio) filesToUpload.push({ file: uploadedAudio, type: 'voice' });
      
      // Only take the first file for the file field
      if (uploadedFiles.length > 0) {
        filesToUpload.push({ file: uploadedFiles[0], type: 'file' });
      }
      
      // Define the complaint submission type with explicit types
      interface ComplaintSubmission {
        title: string;
        description: string;
        Service_type: string;
        district: number | null;
        status_subcategory: number | null;
        governorate_name: string;
        completion_percentage: number;
        image?: string;
        video?: string;
        voice?: string;
        file?: string; // Single string UUID
      }
      
      // Create the base version of the form data
      const finalFormData: ComplaintSubmission = {
        title: formData.title,
        description: formData.description,
        Service_type: formData.Service_type,
        district: formData.district ? parseInt(formData.district, 10) : null,
        status_subcategory: formData.status_subcategory ? parseInt(formData.status_subcategory, 10) : null,
        governorate_name: formData.governorate_name,
        completion_percentage: formData.completion_percentage
      };
      
      if (filesToUpload.length > 0) {
        try {
          setUploadingFiles(true);
          setUploadError(null); // Reset any previous error
          console.log(`Starting upload of ${filesToUpload.length} files...`);
          
          // Upload files one by one
          for (const { file, type } of filesToUpload) {
            try {
              console.log(`Uploading ${type} file: ${file.name} (${file.type}, ${file.size} bytes)`);
              
              const formData = new FormData();
              formData.append('file', file);
              
              const response = await fetch('https://complaint.top-wp.com/files', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: formData,
              });
              
              if (!response.ok) {
                // Set specific error message based on file type
                if (type === 'file') {
                  setUploadError(`فشل في رفع الملف: ${file.name}`);
                } else {
                  setUploadError(`فشل في رفع ${type === 'image' ? 'الصورة' : type === 'video' ? 'الفيديو' : 'الصوت'}`);
                }
                throw new Error(`Upload failed with status ${response.status}: ${response.statusText}`);
              }
              
              // Parse response and get file ID
              const data = await response.json();
              const uploadedId = data.data.id;
              
              if (!uploadedId) {
                throw new Error('File upload succeeded but no ID was returned');
              }
              
              console.log(`Successfully uploaded ${type} file. Got ID: ${uploadedId}`);
              
              // Directly add to the final form data based on type
              if (type === 'image') {
                finalFormData.image = uploadedId;
                console.log('Added image ID to submission data:', uploadedId);
              } else if (type === 'video') {
                finalFormData.video = uploadedId;
                console.log('Added video ID to submission data:', uploadedId);
              } else if (type === 'voice') {
                finalFormData.voice = uploadedId;
                console.log('Added voice ID to submission data:', uploadedId);
              } else if (type === 'file') {
                // Save this specifically to track it
                fileId = uploadedId;
                finalFormData.file = uploadedId;
                console.log('Added file ID to submission data:', uploadedId);
              }
            } catch (fileError) {
              console.error(`Error uploading ${type} file:`, fileError);
              // Continue with other files
            }
          }
        } finally {
          setUploadingFiles(false);
        }
      }
      
      // Double-verify the file ID is in the final data to be submitted
      if (fileId && fileId.length > 10) {
        console.log('File ID verified to be in final submission:', fileId);
        finalFormData.file = fileId;
      }
      
      console.log('FINAL submission data to be sent to API:', finalFormData);
      
      // Send the complete form data
      const response = await fetchWithAuth('/items/Complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalFormData),
      });

      if (!response.data) {
        throw new Error('Failed to create complaint');
      }
      
      console.log('Complaint created successfully:', response.data);
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

  if (permissionError) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold text-red-500 text-center mb-4">{permissionError}</h2>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/complaints')}
              className="bg-[#4664AD] text-white px-4 py-2 rounded-lg"
            >
              العودة إلى الشكاوى
            </button>
          </div>
        </div>
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
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                >
                  <option value="">اختر المحافظة</option>
                  {districts.map((dis) => (
                    <option key={dis.id} value={dis.id}>{dis.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              القضاء *
              </label>
              <select
                name="governorate_name"
                value={formData.governorate_name}
                onChange={handleInputChange}
                required
                disabled={!formData.district || loadingGovernorates}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
              >
                <option value="">
                  {loadingGovernorates 
                    ? 'جاري تحميل الاقضية...' 
                    : !formData.district 
                      ? 'اختر المحافظة أولاً' 
                      : 'اختر القضاء'}
                </option>
                {governorates.map((gov) => (
                  <option key={gov.id} value={gov.name}>{gov.name}</option>
                ))}
              </select>
            </div>

            {/* Status Subcategory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                التصنيف الفرعي للحالة
              </label>
              <select
                name="status_subcategory"
                value={formData.status_subcategory}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md p-2 text-right"
              >
                <option value="">اختر تصنيف الحالة</option>
                {statusSubcategories.map((status) => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </select>
            </div>
            
            {/* File Uploads Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 text-right mb-4">
                المرفقات
              </h3>
              
              {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 mb-4 text-right">
                  {uploadError}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                    صورة
                  </label>
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  {uploadedImage ? (
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <button 
                        type="button"
                        onClick={removeImage}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTimes />
                      </button>
                      <div className="flex items-center">
                        <FaImage className="text-blue-500 mr-2" />
                        <span className="text-sm text-gray-700 truncate max-w-[200px]">
                          {uploadedImage.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 p-4 rounded-md hover:bg-gray-50"
                    >
                      <FaImage className="text-gray-400" />
                      <span className="text-gray-500">اضغط لإضافة صورة</span>
                    </button>
                  )}
                </div>
                
                {/* Video Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                    فيديو
                  </label>
                  <input
                    type="file"
                    ref={videoInputRef}
                    onChange={handleVideoChange}
                    accept="video/*"
                    className="hidden"
                  />
                  
                  {uploadedVideo ? (
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <button 
                        type="button"
                        onClick={removeVideo}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTimes />
                      </button>
                      <div className="flex items-center">
                        <FaVideo className="text-blue-500 mr-2" />
                        <span className="text-sm text-gray-700 truncate max-w-[200px]">
                          {uploadedVideo.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 p-4 rounded-md hover:bg-gray-50"
                    >
                      <FaVideo className="text-gray-400" />
                      <span className="text-gray-500">اضغط لإضافة فيديو</span>
                    </button>
                  )}
                </div>
                
                {/* Audio Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                    تسجيل صوتي
                  </label>
                  <input
                    type="file"
                    ref={audioInputRef}
                    onChange={handleAudioChange}
                    accept="audio/*"
                    className="hidden"
                  />
                  
                  {uploadedAudio ? (
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <button 
                        type="button"
                        onClick={removeAudio}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTimes />
                      </button>
                      <div className="flex items-center">
                        <FaFileAudio className="text-blue-500 mr-2" />
                        <span className="text-sm text-gray-700 truncate max-w-[200px]">
                          {uploadedAudio.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 p-4 rounded-md hover:bg-gray-50"
                    >
                      <FaFileAudio className="text-gray-400" />
                      <span className="text-gray-500">اضغط لإضافة ملف صوتي</span>
                    </button>
                  )}
                </div>
                
                {/* Other Files Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                    ملف مرفق
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 p-4 rounded-md hover:bg-gray-50 mb-2"
                  >
                    <FaUpload className="text-gray-400" />
                    <span className="text-gray-500">اضغط لإضافة ملف</span>
                  </button>
                  
                  {uploadedFiles.length > 0 && (
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-2 space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded">
                          <button 
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTimes />
                          </button>
                          <div className="flex items-center">
                            <FaFile className="text-blue-500 mr-2" />
                            <span className="text-sm text-gray-700 truncate max-w-[200px]">
                              {file.name}
                            </span>
                            {index === 0 && uploadedFiles.length > 1 && (
                              <span className="text-xs text-yellow-600 ml-2">
                                (سيتم استخدام هذا الملف فقط)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                disabled={submitting || uploadingFiles}
                className="px-4 py-2 bg-[#4664AD] text-white rounded-md hover:bg-[#3A5499] disabled:bg-gray-400"
              >
                {submitting ? 'جاري الإنشاء...' : uploadingFiles ? 'جاري رفع الملفات...' : 'إنشاء الشكوى'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
