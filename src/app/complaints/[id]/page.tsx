'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/utils/api';
import { getUserPermissions, hasPermission, complaintMatchesPermissions } from '@/utils/permissions';
import ComplaintMedia from '@/components/ComplaintMedia';

// Utility function to get the correct media URL based on file type
const getMediaUrl = (fileId: string, fileType: string): string => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.error("No auth token found in localStorage");
    return ''; // Return empty string if no token
  }
  
  // Check if token is valid and not expired
  try {
    const tokenData = JSON.parse(atob(token.split('.')[1]));
    const isTokenExpired = tokenData.exp * 1000 < Date.now();
    
    if (isTokenExpired) {
      console.warn("Token is expired, user might need to re-authenticate");
      // In a real app, you might want to trigger a token refresh here
    }
  } catch (e) {
    console.error("Error parsing token:", e);
  }
  
  const baseUrl = `https://complaint.top-wp.com/assets/${fileId}`;
  
  // For document files (PDF, DOCX, DOC), don't add download=true
  if (fileType.startsWith('application/pdf') || 
      fileType.includes('word') || 
      fileType.includes('pdf') ||
      fileType.includes('document')) {
    return `${baseUrl}?access_token=${token}`;
  }
  
  // For audio files, force download=true and ensure we have the correct auth token
  if (fileType.startsWith('audio/')) {
    // Handle m4a files specifically - they often have decoding issues
    if (fileType === 'audio/x-m4a' || fileType === 'audio/mp4' || fileType.includes('m4a')) {
      // For mp4 audio files, always use download=true and add cache-busting
      return `${baseUrl}?download=true&access_token=${token}&t=${Date.now()}`;
    }
    // For other audio types, also use download=true parameter
    return `${baseUrl}?download=true&access_token=${token}&t=${Date.now()}`;
  }
  
  // For video files, specify the video format
  if (fileType.startsWith('video/')) {
    return `${baseUrl}?access_token=${token}`;
  }
  
  // For images, use a specific format for better compatibility
  if (fileType.startsWith('image/')) {
    return `${baseUrl}?access_token=${token}`;
  }
  
  // For other file types, use the standard asset URL
  return `${baseUrl}?download=true&access_token=${token}`;
};

// Media file interfaces
interface MediaFile {
  id: string;
  type: string;
  filename_download: string;
  title?: string;
  filesize?: number;
  width?: number;
  height?: number;
  duration?: number;
  src: string;
}

interface ImageFile extends MediaFile {
  type: 'image';
  width?: number;
  height?: number;
}

interface VideoFile extends MediaFile {
  type: 'video';
  duration?: number;
}

interface AudioFile extends MediaFile {
  type: 'audio';
  duration?: number;
}

interface FileFile extends MediaFile {
  type: 'file';
}

interface ComplaintData {
  id: number;
  title: string;
  description: string;
  Service_type: string;
  governorate_name: string;
  street_name_or_number: string;
  status_subcategory: number;
  Complaint_Subcategory: number;
  district: number;
  completion_percentage: number;
  user: number | null;
  // Media file IDs
  image?: string | null;
  video?: string | null;
  voice?: string | null;
  files?: string[] | string | null;
  // Processed media files
  images?: ImageFile[];
  videos?: VideoFile[];
  audios?: AudioFile[];
  processedFiles?: FileFile[];
}

export default function ComplaintPage({ params }: { params: { id: string } }) {
  const [complaint, setComplaint] = useState<ComplaintData | null>(null);
  const [districts, setDistricts] = useState<Record<number, string>>({});
  const [subcategories, setSubcategories] = useState<Record<number, string>>({});
  const [complaintSubcategories, setComplaintSubcategories] = useState<Record<number, string>>({});
  const [statusSubcategories, setStatusSubcategories] = useState<Record<number, string>>({});
  const [usedStatusSubcategories, setUsedStatusSubcategories] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ComplaintData>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const userPermissions = await getUserPermissions();

      if (!hasPermission(userPermissions, 'Complaint', 'read')) {
        setError('ليس لديك صلاحية لعرض هذه الشكوى');
        setLoading(false);
        return;
      }

      // First fetch the complaint data
      const complaintRes = await fetchWithAuth(`/items/Complaint/${params.id}`);
      
      if (!complaintRes?.data) {
        setError('لم يتم العثور على الشكوى');
        setLoading(false);
        return;
      }

      if (!complaintMatchesPermissions(complaintRes.data, userPermissions)) {
        setError('ليس لديك صلاحية لعرض هذه الشكوى');
        setLoading(false);
        return;
      }

      // Now fetch other data using the complaint data
      const [districtsRes, subcategoriesRes, complaintSubcategoriesRes, timelineRes] = await Promise.all([
        fetchWithAuth('/items/District'),
        fetchWithAuth(`/items/Status_subcategory?filter[complaint_subcategory][_eq]=${complaintRes.data.Complaint_Subcategory}&filter[district][_eq]=${complaintRes.data.district}`),
        fetch('https://complaint.top-wp.com/items/Complaint_sub_category'),
        fetchWithAuth(`/items/ComplaintTimeline?filter[complaint_id][_eq]=${complaintRes.data.id}`),
      ]);

      const complaintSubcategoriesData = await complaintSubcategoriesRes?.json();
      const data = complaintRes.data;

      console.log("data: ", subcategoriesRes);
      // Process media files (if they exist)
      const images: ImageFile[] = [];
      const videos: VideoFile[] = [];
      const audios: AudioFile[] = [];
      const files: FileFile[] = [];
      
      // Fetch media files details
      const mediaPromises = [];
      
      // Handle image
      if (data.image) {
        mediaPromises.push(
          fetchWithAuth(`/files/${data.image}`)
            .then(response => {
              if (response && response.data) {
                const imageData = response.data;
                console.log("Image file data:", imageData);
                
                // Create the image file object with the correct URL
                const imageFile: ImageFile = {
                  id: imageData.id,
                  type: 'image',
                  filename_download: imageData.filename_download,
                  title: imageData.title || imageData.filename_download,
                  filesize: parseInt(imageData.filesize || '0'),
                  width: imageData.width,
                  height: imageData.height,
                  // Ensure the URL is correct and includes any necessary tokens
                  src: getMediaUrl(imageData.id, imageData.type)
                };
                
                console.log("Created image object with src:", imageFile.src);
                images.push(imageFile);
              } else {
                console.error("No data returned for image file:", data.image);
              }
            })
            .catch(err => console.error("Error fetching image file:", data.image, err))
        );
      } else {
        console.log("No image file found in complaint data");
      }
      
      // Handle video
      if (data.video) {
        mediaPromises.push(
          fetchWithAuth(`/files/${data.video}`)
            .then(response => {
              if (response && response.data) {
                const videoData = response.data;
                console.log("Video file data:", videoData);
                
                // Create the video file object with the correct URL
                const videoFile: VideoFile = {
                  id: videoData.id,
                  type: 'video',
                  filename_download: videoData.filename_download,
                  title: videoData.title || videoData.filename_download,
                  filesize: parseInt(videoData.filesize || '0'),
                  duration: videoData.duration,
                  // Ensure the URL is correct and includes any necessary tokens
                  src: getMediaUrl(videoData.id, videoData.type)
                };
                
                console.log("Created video object with src:", videoFile.src);
                videos.push(videoFile);
              } else {
                console.error("No data returned for video file:", data.video);
              }
            })
            .catch(err => console.error("Error fetching video file:", data.video, err))
        );
      } else {
        console.log("No video file found in complaint data");
      }
      
      // Handle voice/audio
      if (data.voice) {
        mediaPromises.push(
          fetchWithAuth(`/files/${data.voice}`)
            .then(response => {
              if (response && response.data) {
                const audioData = response.data;
                console.log("Audio file data:", audioData);
                
                // Create the audio file object with the correct URL
                const audioFile: AudioFile = {
                  id: audioData.id,
                  type: 'audio',
                  filename_download: audioData.filename_download,
                  title: audioData.title || audioData.filename_download,
                  filesize: parseInt(audioData.filesize || '0'),
                  duration: audioData.duration,
                  // Try a different URL format that might work better with the audio player
                  src: getMediaUrl(audioData.id, audioData.type)
                };
                
                console.log("Created audio object with src:", audioFile.src);
                audios.push(audioFile);
              } else {
                console.error("No data returned for voice file:", data.voice);
              }
            })
            .catch(err => console.error("Error fetching voice file:", data.voice, err))
        );
      } else {
        console.log("No voice file found in complaint data");
      }
      
      // Handle any additional files (if present)
      if (data.files) {
        console.log("Found files in complaint data:", data.files);
        const fileIds = Array.isArray(data.files) 
          ? data.files 
          : [data.files].filter(Boolean);
          
        console.log("Processing file IDs:", fileIds);
        
        for (const fileId of fileIds) {
          mediaPromises.push(
            fetchWithAuth(`/files/${fileId}`)
              .then(response => {
                if (response && response.data) {
                  const fileData = response.data;
                  console.log("File data:", fileData);
                  
                  // Create the file object with the correct URL
                  const regularFile: FileFile = {
                    id: fileData.id,
                    type: 'file',
                    filename_download: fileData.filename_download,
                    title: fileData.title || fileData.filename_download,
                    filesize: parseInt(fileData.filesize || '0'),
                    // Ensure the URL is correct and includes any necessary tokens
                    src: getMediaUrl(fileData.id, fileData.type)
                  };
                  
                  console.log("Created file object with src:", regularFile.src);
                  files.push(regularFile);
                } else {
                  console.error("No data returned for file:", fileId);
                }
              })
              .catch(err => console.error("Error fetching file:", fileId, err))
          );
        }
      } else {
        console.log("No files found in complaint data");
      }
      
      // Also check for 'file' property in case the API is using a different name
      if (data.file && !data.files) {
        console.log("Found 'file' property in complaint data:", data.file);
        const fileIds = Array.isArray(data.file) 
          ? data.file 
          : [data.file].filter(Boolean);
          
        console.log("Processing file IDs from 'file' property:", fileIds);
        
        for (const fileId of fileIds) {
          mediaPromises.push(
            fetchWithAuth(`/files/${fileId}`)
              .then(response => {
                if (response && response.data) {
                  const fileData = response.data;
                  console.log("File data:", fileData);
                  
                  // Create the file object with the correct URL
                  const regularFile: FileFile = {
                    id: fileData.id,
                    type: 'file',
                    filename_download: fileData.filename_download,
                    title: fileData.title || fileData.filename_download,
                    filesize: parseInt(fileData.filesize || '0'),
                    // Ensure the URL is correct and includes any necessary tokens
                    src: getMediaUrl(fileData.id, fileData.type)
                  };
                  
                  console.log("Created file object with src:", regularFile.src);
                  files.push(regularFile);
                } else {
                  console.error("No data returned for file:", fileId);
                }
              })
              .catch(err => console.error("Error fetching file:", fileId, err))
          );
        }
      }
      
      // Wait for all media files to be fetched
      await Promise.all(mediaPromises);
      console.log("Media fetch complete - Images:", images.length, "Videos:", videos.length, "Audio:", audios.length, "Files:", files.length);

      // Add processed media to complaint data
      const complaintWithMedia = {
        ...data,
        images,
        videos,
        audios,
        processedFiles: files
      };

      setComplaint(complaintWithMedia);
      setDistricts(Object.fromEntries(districtsRes.data.map((d: any) => [d.id, d.name])));
      setSubcategories(Object.fromEntries(subcategoriesRes.data.map((s: any) => [s.id, s.name])));
      setStatusSubcategories(Object.fromEntries(subcategoriesRes.data.map((s: any) => [s.id, s.name])));
      setComplaintSubcategories(Object.fromEntries(complaintSubcategoriesData.data.map((s: any) => [s.id, s.name])));
      setLoading(false);

      // In the fetchData function, add logging to see what's coming back from the API
      if (complaintRes?.data) {
        console.log('Received complaint data from API:', {
          id: complaintRes.data.id,
          completion_percentage: complaintRes.data.completion_percentage,
          completion_percentage_type: typeof complaintRes.data.completion_percentage
        });
      }

      // Extract used status subcategories from timeline
      const usedStatuses = timelineRes?.data?.map((item: any) => item.status_subcategory) || [];
      // Include current status in the used list
      if (data.status_subcategory && !usedStatuses.includes(data.status_subcategory)) {
        usedStatuses.push(data.status_subcategory);
      }
      setUsedStatusSubcategories(usedStatuses);
    } catch (err) {
      console.error('Error:', err);
      setError('حدث خطأ أثناء تحميل الشكوى');
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!complaint?.id) return;
    
    try {
      setIsUpdating(true);
      
      // Include both status_subcategory and completion_percentage in the update data
      const updateData = {
        status_subcategory: editForm.status_subcategory,
        completion_percentage: editForm.completion_percentage
      };
      
      console.log('Updating complaint with data:', updateData);
      
      // Send update request
      const response = await fetchWithAuth(`/items/Complaint/${complaint.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
      
      if (response) {
        // Exit edit mode
        setIsEditing(false);
        
        // Show success message
        alert('تم تحديث حالة الشكوى بنجاح');
        
        // After the successful update, log what was returned
        if (response && response.data) {
          console.log('Update response data:', {
            id: response.data.id,
            status_subcategory: response.data.status_subcategory
          });
        }
        
        try {
          // Refresh the whole complaint data to get the latest state
          await fetchData();
        } catch (fetchError) {
          console.error('Error refreshing data after update:', fetchError);
        } finally {
          setIsUpdating(false);
        }
      } else {
        throw new Error('Failed to update complaint');
      }
    } catch (error) {
      console.error('Error updating complaint:', error);
      alert('حدث خطأ أثناء تحديث حالة الشكوى');
      setIsUpdating(false);
    }
  };

  const handleDeleteComplaint = async () => {
    if (!complaint?.id) return;
    
    try {
      // First check if user has permission to delete complaints
      const userPermissions = await getUserPermissions();
      if (!hasPermission(userPermissions, 'Complaint', 'delete')) {
        alert('ليس لديك صلاحية لحذف هذه الشكوى');
        return;
      }

      // Show confirmation dialog
      const confirmed = window.confirm('هل أنت متأكد من رغبتك في حذف هذه الشكوى؟ لا يمكن التراجع عن هذا الإجراء.');
      if (!confirmed) return;
      
      setIsUpdating(true); // Reuse the loading state

      try {
        // Instead of using fetchWithAuth, use the fetch API directly to better control the response
        const response = await fetch(`https://complaint.top-wp.com/items/Complaint/${complaint.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Directus DELETE operations often don't return content, so we'll consider any 2xx status as success
        if (response.ok) {
          alert('تم حذف الشكوى بنجاح');
          // Ensure redirect happens even if there are other minor issues
          router.push('/complaints');
          return; // Exit early to prevent further execution
        } else {
          throw new Error(`Server responded with status: ${response.status}`);
        }
      } catch (deleteError) {
        console.error('Error during delete operation:', deleteError);
        throw deleteError; // Re-throw to be caught by the outer try-catch
      }
    } catch (error) {
      console.error('Error deleting complaint:', error);
      alert('حدث خطأ أثناء حذف الشكوى');
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64 flex justify-center items-center">
        <div className="text-xl text-gray-600">جاري تحميل البيانات...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold text-red-500 text-center mb-4">{error}</h2>
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">تفاصيل الشكوى</h1>
        <div className="flex gap-3">
          {!isEditing && (
            <button 
              onClick={handleDeleteComplaint}
              disabled={isUpdating}
              className={`bg-red-600 text-white px-4 py-2 rounded-lg ${isUpdating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-700'}`}
            >
              {isUpdating ? 'جاري الحذف...' : 'حذف الشكوى'}
            </button>
          )}
          <button 
            onClick={() => {
              if (isEditing && !isUpdating) {
                handleSaveEdit();
              } else if (!isEditing) {
                setEditForm({
                  status_subcategory: complaint?.status_subcategory,
                  completion_percentage: complaint?.completion_percentage || 0,
                });
                setIsEditing(true);
              }
            }}
            disabled={isUpdating}
            className={`bg-[#4664AD] text-white px-4 py-2 rounded-lg ${isUpdating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#3a5499]'}`}
          >
            {isUpdating ? 'جاري الحفظ...' : (isEditing ? 'حفظ تغيير الحالة' : 'تغيير الحالة')}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="bg-white rounded-lg p-6 shadow space-y-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                عنوان الشكوى
              </label>
              <div className="w-full bg-gray-100 p-2 rounded text-right">
                {complaint?.title || '—'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                نوع الخدمة
              </label>
              <div className="w-full bg-gray-100 p-2 rounded text-right">
                {complaint?.Service_type || '—'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                المحافظة
              </label>
              <div className="w-full bg-gray-100 p-2 rounded text-right">
                {districts[complaint?.district || 0] || '—'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                القضاء
              </label>
              <div className="w-full bg-gray-100 p-2 rounded text-right">
                {complaint?.governorate_name || '—'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                رقم أو اسم الشارع
              </label>
              <div className="w-full bg-gray-100 p-2 rounded text-right">
                {complaint?.street_name_or_number || '—'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                الفئة الفرعية للشكوى
              </label>
              <div className="w-full bg-gray-100 p-2 rounded text-right">
                {complaintSubcategories[complaint?.Complaint_Subcategory || 0] || '—'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                الفئة الفرعية للحالة
              </label>
              <select
                value={editForm.status_subcategory || ''}
                onChange={(e) => setEditForm({...editForm, status_subcategory: Number(e.target.value)})}
                className="w-full border border-gray-300 p-2 rounded text-right"
              >
                <option value="">اختر الحالة</option>
                {Object.entries(statusSubcategories).map(([id, name]) => {
                  const isDisabled = usedStatusSubcategories.includes(Number(id));
                  return (
                    <option 
                      key={id} 
                      value={id}
                      disabled={isDisabled}
                      className={isDisabled ? 'text-gray-400' : ''}
                    >
                      {name} {isDisabled ? '(تم استخدامها)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                نسبة الإنجاز
              </label>
              <div className="w-full flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.completion_percentage || 0}
                  onChange={(e) => setEditForm({...editForm, completion_percentage: Number(e.target.value)})}
                  className="w-full border border-gray-300 p-2 rounded text-right"
                />
                <span className="mr-2">%</span>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                وصف الشكوى
              </label>
              <div className="w-full bg-gray-100 p-2 rounded text-right min-h-[6rem]">
                {complaint?.description || '—'}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end mt-4">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-6 shadow space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            <Field label="الرقم" value={complaint?.id || null} />
            <Field label="عنوان الشكوى" value={complaint?.title || null} />
            <Field label="وصف الشكوى" value={complaint?.description || null} />
            <Field label="نوع الخدمة" value={complaint?.Service_type || null} />
            <Field label="المحافظة" value={districts[complaint?.district || 0] || null} />
            <Field label="رقم أو اسم الشارع" value={complaint?.street_name_or_number || null} />
            <Field label="القضاء" value={complaint?.governorate_name || null} />
            <Field label="الفئة الفرعية للشكوى" value={complaintSubcategories[complaint?.Complaint_Subcategory || 0] || null} />
            <Field label="الفئة الفرعية للحالة" value={statusSubcategories[complaint?.status_subcategory || 0] || null} />
            <Field label="نسبة الإنجاز" value={`${complaint?.completion_percentage || 0}%`} />
            <Field label="وصف الشكوى" value={`${complaint?.description || 0}`} />
          </div>
        </div>
      )}

      {/* Media Attachments Section */}
      <div className="bg-white rounded-lg p-6 shadow mt-6">
        <h2 className="text-xl font-bold mb-4 text-right">المرفقات والوسائط</h2>
        <ComplaintMedia 
          images={complaint?.images} 
          videos={complaint?.videos} 
          audios={complaint?.audios} 
          files={complaint?.processedFiles} 
        />
      </div>
    </div>
  );
}

const Field = ({ label, value }: { label: string; value: string | number | null }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 text-right mb-1">
      {label}
    </label>
    <div className="bg-gray-100 p-2 rounded text-right">
      {value ?? '—'}
    </div>
  </div>
);
