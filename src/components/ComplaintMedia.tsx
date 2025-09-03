import React, { useState } from 'react';
import { FaImage, FaVideo, FaVolumeUp, FaFileAlt, FaEye, FaDownload, FaPlay, FaStop, FaSpinner, FaExternalLinkAlt, FaFilePdf, FaFileWord, FaTimes } from 'react-icons/fa';
import { fetchAssetWithAuth } from '@/utils/assets';

// Authenticated Image Component
interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({ src, alt, className, onClick }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    const fetchImage = async () => {
      try {
        // Extract file ID from URL
        const fileId = src.split('/assets/')[1];
        if (!fileId) {
          setError(true);
          setIsLoading(false);
          return;
        }

        const blob = await fetchAssetWithAuth(fileId);
        const blobUrl = URL.createObjectURL(blob);
        setImageSrc(blobUrl);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching image:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [src]);

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-200`}>
        <FaSpinner className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-200 text-gray-500`}>
        <FaImage className="text-2xl" />
      </div>
    );
  }

  return (
    <img 
      src={imageSrc} 
      alt={alt} 
      className={className}
      onClick={onClick}
    />
  );
};

// Helper function for authenticated downloads
const downloadWithAuth = async (url: string, filename: string) => {
  try {
    // Extract file ID from URL
    const fileId = url.split('/assets/')[1];
    if (!fileId) {
      throw new Error('Invalid asset URL');
    }

    const blob = await fetchAssetWithAuth(fileId);
    const blobUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download error:', error);
    // Fallback to direct link
    window.open(url, '_blank');
  }
};

// Authenticated Video Component
interface AuthenticatedVideoProps {
  src: string;
  className?: string;
  onClick?: () => void;
}

const AuthenticatedVideo: React.FC<AuthenticatedVideoProps> = ({ src, className, onClick }) => {
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    const fetchVideo = async () => {
      try {
        // Extract file ID from URL
        const fileId = src.split('/assets/')[1];
        if (!fileId) {
          setError(true);
          setIsLoading(false);
          return;
        }

        const blob = await fetchAssetWithAuth(fileId);
        const blobUrl = URL.createObjectURL(blob);
        setVideoSrc(blobUrl);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching video:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    fetchVideo();
  }, [src]);

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-200`}>
        <FaSpinner className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-200 text-gray-500`}>
        <FaVideo className="text-2xl" />
      </div>
    );
  }

  return (
    <video 
      className={className}
      onClick={onClick}
    >
      <source src={videoSrc} type="video/mp4" />
    </video>
  );
};

interface MediaFile {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  filename_download: string;
  title?: string;
  filesize?: number;
  width?: number;
  height?: number;
  duration?: number;
  src: string;
}

interface ComplaintMediaProps {
  images?: MediaFile[];
  videos?: MediaFile[];
  audios?: MediaFile[];
  files?: MediaFile[];
}

// Function to get file type icon based on filename
const getFileIcon = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch(extension) {
    case 'pdf':
      return <FaFilePdf className="text-red-500 mr-2" />;
    case 'doc':
    case 'docx':
      return <FaFileWord className="text-blue-600 mr-2" />;
    default:
      return <FaFileAlt className="text-gray-400 mr-2" />;
  }
};

// Function to check if file is viewable in browser
const isViewableInBrowser = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension === 'pdf' || extension === 'docx' || extension === 'doc';
};

// Modal component for media preview
const MediaPreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <FaTimes />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

const mapFileToMedia = (file: MediaFile): MediaFile => {
  // Check file extension
  const extension = file.filename_download.toLowerCase().split('.').pop();
  
  // Image extensions
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension || '')) {
    return { ...file, type: 'image' };
  }
  
  // Video extensions
  if (['mp4', 'webm', 'ogg', 'mov'].includes(extension || '')) {
    return { ...file, type: 'video' };
  }
  
  // Audio extensions
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension || '')) {
    return { ...file, type: 'audio' };
  }
  
  // Default to file type
  return { ...file, type: 'file' };
};

const ComplaintMedia: React.FC<ComplaintMediaProps> = ({
  images = [],
  videos = [],
  audios = [],
  files = []
}) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Process each media array to ensure correct type assignment
  const processedImages = images.map(img => mapFileToMedia(img)).filter(file => file.type === 'image');
  const processedVideos = videos.map(vid => mapFileToMedia(vid)).filter(file => file.type === 'video');
  const processedAudios = audios.map(aud => mapFileToMedia(aud)).filter(file => file.type === 'audio');
  const processedFiles = files.map(file => mapFileToMedia(file)).filter(file => file.type === 'file');

  // Function to format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'غير معروف';
    
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Function to format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="space-y-6 mt-4">
      {/* Images Section */}
      {processedImages.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FaImage className="text-[#4664AD]" />
            <h3 className="text-lg font-semibold">الصور المرفقة</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedImages.map((image) => (
              <div key={image.id} className="bg-gray-50 rounded-lg overflow-hidden">
                <div className="relative group">
                  <AuthenticatedImage 
                    src={image.src} 
                    alt={image.title || image.filename_download} 
                    className="w-full h-48 object-cover cursor-pointer"
                    onClick={() => {
                      setSelectedMedia(image);
                      setIsPreviewOpen(true);
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setSelectedMedia(image);
                        setIsPreviewOpen(true);
                      }}
                      className="p-2 bg-white rounded-full mx-2 hover:bg-blue-100"
                    >
                      <FaEye className="text-[#4664AD]" />
                    </button>
                    <button 
                      onClick={() => downloadWithAuth(image.src, image.filename_download)}
                      className="p-2 bg-white rounded-full mx-2 hover:bg-blue-100"
                    >
                      <FaDownload className="text-[#4664AD]" />
                    </button>
                  </div>
                </div>
                <div className="p-2 text-xs text-gray-500 truncate">
                  {image.title || image.filename_download}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos Section */}
      {processedVideos.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FaVideo className="text-[#4664AD]" />
            <h3 className="text-lg font-semibold">مقاطع الفيديو المرفقة</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processedVideos.map((video) => (
              <div key={video.id} className="bg-gray-50 rounded-lg overflow-hidden">
                <div className="relative group">
                  <AuthenticatedVideo 
                    src={video.src}
                    className="w-full h-auto cursor-pointer"
                    onClick={() => {
                      setSelectedMedia(video);
                      setIsPreviewOpen(true);
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setSelectedMedia(video);
                        setIsPreviewOpen(true);
                      }}
                      className="p-2 bg-white rounded-full mx-2 hover:bg-blue-100"
                    >
                      <FaPlay className="text-[#4664AD]" />
                    </button>
                    <button 
                      onClick={() => downloadWithAuth(video.src, video.filename_download)}
                      className="p-2 bg-white rounded-full mx-2 hover:bg-blue-100"
                    >
                      <FaDownload className="text-[#4664AD]" />
                    </button>
                  </div>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <div className="text-sm text-gray-700 truncate">
                    {video.title || video.filename_download}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{formatDuration(video.duration)}</span>
                    <span>•</span>
                    <span>{formatFileSize(video.filesize)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio Section */}
      {processedAudios.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FaVolumeUp className="text-[#4664AD]" />
            <h3 className="text-lg font-semibold">التسجيلات الصوتية المرفقة</h3>
          </div>
          <div className="space-y-3">
            {processedAudios.map((audio) => (
              <div key={audio.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium text-gray-700">
                    {audio.title || audio.filename_download}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDuration(audio.duration)} • {formatFileSize(audio.filesize)}
                  </div>
                </div>
                
                {/* Handle m4a/mp4 files specifically */}
                {(audio.filename_download.toLowerCase().endsWith('.m4a') || 
                  audio.filename_download.toLowerCase().endsWith('.mp4') ||
                  String(audio.type).toLowerCase().includes('m4a') || 
                  String(audio.type).toLowerCase().includes('mp4') ||
                  String(audio.type).toLowerCase() === 'audio/mp4' ||
                  String(audio.type).toLowerCase() === 'audio/x-m4a') ? (
                  <M4AAudioPlayer 
                    audioSrc={audio.src} 
                    audioTitle={audio.filename_download} 
                  />
                ) : (
                  <CustomAudioPlayer 
                    audioSrc={audio.src} 
                    audioTitle={audio.filename_download} 
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      {processedFiles.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FaFileAlt className="text-[#4664AD]" />
            <h3 className="text-lg font-semibold">الملفات المرفقة</h3>
          </div>
          <div className="space-y-4">
            {processedFiles.map((file) => {
              const isViewable = isViewableInBrowser(file.filename_download);
              
              return (
                <div key={file.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center p-3 bg-gray-50">
                    <div className="flex items-center">
                      {getFileIcon(file.filename_download)}
                      <span className="text-sm text-gray-700">{file.title || file.filename_download}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-gray-500">{formatFileSize(file.filesize)}</span>
                      
                      {isViewable && (
                        <button
                          onClick={() => {
                            setSelectedMedia(file);
                            setIsPreviewOpen(true);
                          }}
                          className="p-1.5 bg-gray-100 hover:bg-blue-100 rounded text-gray-700 hover:text-blue-700"
                          title="عرض المستند"
                        >
                          <FaEye size={12} />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => downloadWithAuth(file.src, file.filename_download)}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                        title="تنزيل الملف"
                      >
                        <FaDownload size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Preview Modal */}
      <MediaPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedMedia(null);
        }}
        title={selectedMedia?.title || selectedMedia?.filename_download || ''}
      >
        {selectedMedia?.type === 'image' && (
          <div className="flex items-center justify-center">
            <AuthenticatedImage
              src={selectedMedia.src}
              alt={selectedMedia.title || selectedMedia.filename_download}
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>
        )}
        {selectedMedia?.type === 'video' && (
          <div className="flex items-center justify-center">
            <AuthenticatedVideo
              src={selectedMedia.src}
              className="max-w-full max-h-[70vh]"
            />
          </div>
        )}
        {selectedMedia?.type === 'file' && (
          <div className="w-full h-[70vh]">
            <DocumentViewer file={selectedMedia} />
          </div>
        )}
      </MediaPreviewModal>
      
      {processedImages.length === 0 && processedVideos.length === 0 && processedAudios.length === 0 && processedFiles.length === 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm text-center">
          <p className="text-gray-500">لا توجد مرفقات لهذه الشكوى</p>
        </div>
      )}
    </div>
  );
};

// Custom Audio Player Component
interface CustomAudioPlayerProps {
  audioSrc: string;
  audioTitle: string;
}

const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({ audioSrc, audioTitle }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [base64Audio] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const mounted = React.useRef(true);
  
  // Setup cleanup on unmount
  React.useEffect(() => {
    return () => {
      mounted.current = false;
      const audioElement = audioRef.current;
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, []);

  // Update the fetchAudioAsBase64 function to handle 400 errors better:
  const fetchAudioAsBase64 = React.useCallback(async () => {
    try {
      if (!mounted.current) return;
      
      setIsLoading(true);
      setError(null);

      console.log('Fetching audio from:', audioSrc);
      
      // Attempt to fetch directly without conversion to base64
      if (!mounted.current) return;
      
      // First try direct approach with headers
      if (audioRef.current) {
        // Extract file ID from URL
        const fileId = audioSrc.split('/assets/')[1];
        if (!fileId) {
          throw new Error('Invalid asset URL');
        }

        const blob = await fetchAssetWithAuth(fileId);
        const blobUrl = URL.createObjectURL(blob);
        audioRef.current.src = blobUrl;
        audioRef.current.load();
        setIsLoading(false);
        return;
      }
      
    } catch (error) {
      console.error('Error fetching audio as base64:', error);
      if (mounted.current) {
        setError("حدث خطأ أثناء تحميل الملف الصوتي");
        setIsLoading(false);
      }
    }
  }, [audioSrc]);

  // Update the handlePlay method to be more resilient
  const handlePlay = () => {
    if (error || isLoading) return;
    
    try {
      if (audioRef.current) {
        if (base64Audio) {
          audioRef.current.src = base64Audio;
        } else {
          audioRef.current.src = audioSrc;
        }
        
        // Add specific error handling for audio element
        audioRef.current.onerror = () => {
          console.log("HTML Audio element error. Trying direct URL approach.");
          handleOpenInNewTab();
        };
        
        audioRef.current.load();
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(err => {
            console.error("Error playing audio:", err);
            // If autoplay fails, open in a new tab as a fallback
            handleOpenInNewTab();
          });
      } else {
        handleOpenInNewTab();
      }
    } catch (e) {
      console.error("Playback error:", e);
      handleOpenInNewTab();
    }
  };
  
  // Update the handleOpenInNewTab function to ensure it uses a fresh token
  const handleOpenInNewTab = () => {
    try {
      // Get fresh URL with latest token if needed
      let urlToOpen = audioSrc;
      // Add cache busting to avoid any caching issues
      if (urlToOpen.includes('?')) {
        urlToOpen = `${urlToOpen}&t=${Date.now()}`;
      } else {
        urlToOpen = `${urlToOpen}?t=${Date.now()}`;
      }
      
      // Force download parameter for direct playback
      urlToOpen = urlToOpen.includes('download=true') 
        ? urlToOpen 
        : `${urlToOpen}&download=true`;
      
      // Create a new HTML document with an audio player
      const playerWindow = window.open('', '_blank');
      if (playerWindow) {
        playerWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>تشغيل ${audioTitle}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background-color: #f5f5f5;
                direction: rtl;
              }
              h1 {
                color: #4664AD;
                margin-bottom: 20px;
                text-align: center;
              }
              .player-container {
                width: 100%;
                max-width: 500px;
                background-color: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .download-btn {
                display: inline-block;
                background-color: #4664AD;
                color: white;
                padding: 10px 15px;
                border-radius: 4px;
                text-decoration: none;
                margin-top: 10px;
                cursor: pointer;
                border: none;
                font-size: 16px;
              }
              .message {
                margin: 20px 0;
                text-align: center;
                color: #555;
              }
              .success-message {
                color: green;
                margin-top: 10px;
                display: none;
              }
              .error-message {
                color: red;
                margin-top: 10px;
                display: none;
              }
              .audio-player {
                width: 100%;
                margin: 20px 0;
              }
              .iframe-fallback {
                width: 100%;
                height: 80px;
                border: none;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="player-container">
              <h1>تشغيل الملف الصوتي</h1>
              <p>العنوان: ${audioTitle}</p>
              
              <!-- HTML5 Audio Player -->
              <audio id="audio-player" controls class="audio-player">
                <source src="${urlToOpen}" type="audio/mp4">
                <source src="${urlToOpen}" type="audio/mpeg">
                <source src="${urlToOpen}" type="audio/x-m4a">
                <source src="${urlToOpen}" type="audio/aac">
                متصفحك لا يدعم تشغيل الملفات الصوتية
              </audio>
              
              <div id="error-message" class="error-message">
                حدث خطأ أثناء تشغيل الملف الصوتي
              </div>
              
              <div class="message">
                يمكنك تنزيل الملف الصوتي مباشرة للاستماع إليه
              </div>
              
              <div style="text-align: center;">
                <a href="${urlToOpen}" download="${audioTitle}" class="download-btn" id="download-btn">
                  تنزيل الملف الصوتي
                </a>
              </div>
              
              <div id="success-message" class="success-message">
                تم بدء التنزيل
              </div>
              
              <!-- Iframe Fallback for browsers that need separate context -->
              <iframe id="iframe-fallback" class="iframe-fallback" style="display: none;"></iframe>
            </div>
            
            <script>
              // Handle audio errors
              const audioPlayer = document.getElementById('audio-player');
              const errorMessage = document.getElementById('error-message');
              const downloadBtn = document.getElementById('download-btn');
              const successMessage = document.getElementById('success-message');
              const iframeFallback = document.getElementById('iframe-fallback');
              
              // Initialize error handling
              audioPlayer.addEventListener('error', function() {
                errorMessage.style.display = 'block';
                console.error('Audio playback error:', this.error);
                
                // Show iframe fallback
                iframeFallback.style.display = 'block';
                iframeFallback.src = '${urlToOpen}';
              });
              
              // Track download click
              downloadBtn.addEventListener('click', function() {
                successMessage.style.display = 'block';
                
                // Create a fallback download method using Blob
                fetch('${urlToOpen}')
                  .then(response => response.blob())
                  .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = '${audioTitle}';
                    document.body.appendChild(a);
                    a.click();
                    URL.revokeObjectURL(url);
                  })
                  .catch(error => {
                    console.error('Download error:', error);
                  });
              });
              
              // Explicitly load audio file
              audioPlayer.load();
            </script>
          </body>
          </html>
        `);
        playerWindow.document.close();
      } else {
        // If popup is blocked, try direct navigation
        window.open(urlToOpen, '_blank');
      }
    } catch (error) {
      console.error('Error opening audio in new tab:', error);
      // Final fallback: just navigate directly to the URL with download=true
      const downloadUrl = audioSrc.includes('download=true') 
        ? audioSrc 
        : audioSrc + (audioSrc.includes('?') ? '&' : '?') + 'download=true';
      window.open(downloadUrl, '_blank');
    }
  };
  
  // Handling audio events
  React.useEffect(() => {
    if (!audioRef.current) return;
    
    const audioElement = audioRef.current;
    
    const handleEnded = () => {
      if (mounted.current) {
        setIsPlaying(false);
      }
    };
    
    const handleError = () => {
      if (mounted.current) {
        setIsPlaying(false);
        setIsLoading(false);
        setError("خطأ في تشغيل الملف الصوتي");
      }
    };
    
    // Set up event listeners
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);
    
    // Clean up
    return () => {
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
    };
  }, []);
  
  React.useEffect(() => {
    fetchAudioAsBase64();
  }, [audioSrc, fetchAudioAsBase64]);

  const handleStop = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      handleStop();
    } else {
      handlePlay();
    }
  };

  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 space-x-reverse rtl:space-x-reverse">
          {isLoading ? (
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-400 text-white">
              <FaSpinner className="animate-spin" size={14} />
            </div>
          ) : base64Audio ? (
            <button
              onClick={togglePlayPause}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-[#4664AD] hover:bg-[#3A5499]'
              } text-white`}
              title={isPlaying ? 'إيقاف' : 'تشغيل'}
            >
              {isPlaying ? <FaStop size={14} /> : <FaPlay size={14} />}
            </button>
          ) : (
            <button
              onClick={handleOpenInNewTab}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-[#4664AD] text-white hover:bg-[#3A5499]"
              title="فتح في نافذة جديدة"
            >
              <FaPlay size={14} />
            </button>
          )}
          
          <div className="flex flex-col">
            <span className="text-gray-800 font-semibold text-sm truncate max-w-[150px]">
              {audioTitle || 'ملف صوتي'}
            </span>
            <span className="text-xs text-gray-500">
              صوتي
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse rtl:space-x-reverse">
          <button
            onClick={handleOpenInNewTab}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#4664AD] hover:bg-gray-200"
            title="فتح في نافذة جديدة"
            disabled={isLoading}
          >
            <FaExternalLinkAlt size={14} />
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mt-2 text-red-500 text-sm">
          {error}
        </div>
      )}
      
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="none" className="hidden" />
    </div>
  );
};

// M4A Audio Player Component
interface M4AAudioPlayerProps {
  audioSrc: string;
  audioTitle: string;
}

const M4AAudioPlayer: React.FC<M4AAudioPlayerProps> = ({ audioSrc, audioTitle }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [base64Audio] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const mounted = React.useRef(true);
  
  // Setup cleanup on unmount
  React.useEffect(() => {
    return () => {
      mounted.current = false;
      const audioElement = audioRef.current;
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, []);

  // Update the fetchAudioAsBase64 function to handle 400 errors better:
  const fetchAudioAsBase64 = React.useCallback(async () => {
    try {
      if (!mounted.current) return;
      
      setIsLoading(true);
      setError(null);

      console.log('Fetching audio from:', audioSrc);
      
      // Attempt to fetch directly without conversion to base64
      if (!mounted.current) return;
      
      // First try direct approach with headers
      if (audioRef.current) {
        // Extract file ID from URL
        const fileId = audioSrc.split('/assets/')[1];
        if (!fileId) {
          throw new Error('Invalid asset URL');
        }

        const blob = await fetchAssetWithAuth(fileId);
        const blobUrl = URL.createObjectURL(blob);
        audioRef.current.src = blobUrl;
        audioRef.current.load();
        setIsLoading(false);
        return;
      }
      
    } catch (error) {
      console.error('Error fetching audio as base64:', error);
      if (mounted.current) {
        setError("حدث خطأ أثناء تحميل الملف الصوتي");
        setIsLoading(false);
      }
    }
  }, [audioSrc]);

  // Update the handlePlay method to be more resilient
  const handlePlay = () => {
    if (error || isLoading) return;
    
    try {
      if (audioRef.current) {
        if (base64Audio) {
          audioRef.current.src = base64Audio;
        } else {
          audioRef.current.src = audioSrc;
        }
        
        // Add specific error handling for audio element
        audioRef.current.onerror = () => {
          console.log("HTML Audio element error. Trying direct URL approach.");
          handleOpenInNewTab();
        };
        
        audioRef.current.load();
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(err => {
            console.error("Error playing audio:", err);
            // If autoplay fails, open in a new tab as a fallback
            handleOpenInNewTab();
          });
      } else {
        handleOpenInNewTab();
      }
    } catch (e) {
      console.error("Playback error:", e);
      handleOpenInNewTab();
    }
  };
  
  // Update the handleOpenInNewTab function to ensure it uses a fresh token
  const handleOpenInNewTab = () => {
    try {
      // Get fresh URL with latest token if needed
      let urlToOpen = audioSrc;
      // Add cache busting to avoid any caching issues
      if (urlToOpen.includes('?')) {
        urlToOpen = `${urlToOpen}&t=${Date.now()}`;
      } else {
        urlToOpen = `${urlToOpen}?t=${Date.now()}`;
      }
      
      // Force download parameter for direct playback
      urlToOpen = urlToOpen.includes('download=true') 
        ? urlToOpen 
        : `${urlToOpen}&download=true`;
      
      // Create a new HTML document with an audio player
      const playerWindow = window.open('', '_blank');
      if (playerWindow) {
        playerWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>تشغيل ${audioTitle}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background-color: #f5f5f5;
                direction: rtl;
              }
              h1 {
                color: #4664AD;
                margin-bottom: 20px;
                text-align: center;
              }
              .player-container {
                width: 100%;
                max-width: 500px;
                background-color: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .download-btn {
                display: inline-block;
                background-color: #4664AD;
                color: white;
                padding: 10px 15px;
                border-radius: 4px;
                text-decoration: none;
                margin-top: 10px;
                cursor: pointer;
                border: none;
                font-size: 16px;
              }
              .message {
                margin: 20px 0;
                text-align: center;
                color: #555;
              }
              .success-message {
                color: green;
                margin-top: 10px;
                display: none;
              }
              .error-message {
                color: red;
                margin-top: 10px;
                display: none;
              }
              .audio-player {
                width: 100%;
                margin: 20px 0;
              }
              .iframe-fallback {
                width: 100%;
                height: 80px;
                border: none;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="player-container">
              <h1>تشغيل الملف الصوتي</h1>
              <p>العنوان: ${audioTitle}</p>
              
              <!-- HTML5 Audio Player -->
              <audio id="audio-player" controls class="audio-player">
                <source src="${urlToOpen}" type="audio/mp4">
                <source src="${urlToOpen}" type="audio/mpeg">
                <source src="${urlToOpen}" type="audio/x-m4a">
                <source src="${urlToOpen}" type="audio/aac">
                متصفحك لا يدعم تشغيل الملفات الصوتية
              </audio>
              
              <div id="error-message" class="error-message">
                حدث خطأ أثناء تشغيل الملف الصوتي
              </div>
              
              <div class="message">
                يمكنك تنزيل الملف الصوتي مباشرة للاستماع إليه
              </div>
              
              <div style="text-align: center;">
                <a href="${urlToOpen}" download="${audioTitle}" class="download-btn" id="download-btn">
                  تنزيل الملف الصوتي
                </a>
              </div>
              
              <div id="success-message" class="success-message">
                تم بدء التنزيل
              </div>
              
              <!-- Iframe Fallback for browsers that need separate context -->
              <iframe id="iframe-fallback" class="iframe-fallback" style="display: none;"></iframe>
            </div>
            
            <script>
              // Handle audio errors
              const audioPlayer = document.getElementById('audio-player');
              const errorMessage = document.getElementById('error-message');
              const downloadBtn = document.getElementById('download-btn');
              const successMessage = document.getElementById('success-message');
              const iframeFallback = document.getElementById('iframe-fallback');
              
              // Initialize error handling
              audioPlayer.addEventListener('error', function() {
                errorMessage.style.display = 'block';
                console.error('Audio playback error:', this.error);
                
                // Show iframe fallback
                iframeFallback.style.display = 'block';
                iframeFallback.src = '${urlToOpen}';
              });
              
              // Track download click
              downloadBtn.addEventListener('click', function() {
                successMessage.style.display = 'block';
                
                // Create a fallback download method using Blob
                fetch('${urlToOpen}')
                  .then(response => response.blob())
                  .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = '${audioTitle}';
                    document.body.appendChild(a);
                    a.click();
                    URL.revokeObjectURL(url);
                  })
                  .catch(error => {
                    console.error('Download error:', error);
                  });
              });
              
              // Explicitly load audio file
              audioPlayer.load();
            </script>
          </body>
          </html>
        `);
        playerWindow.document.close();
      } else {
        // If popup is blocked, try direct navigation
        window.open(urlToOpen, '_blank');
      }
    } catch (error) {
      console.error('Error opening audio in new tab:', error);
      // Final fallback: just navigate directly to the URL with download=true
      const downloadUrl = audioSrc.includes('download=true') 
        ? audioSrc 
        : audioSrc + (audioSrc.includes('?') ? '&' : '?') + 'download=true';
      window.open(downloadUrl, '_blank');
    }
  };
  
  // Handling audio events
  React.useEffect(() => {
    if (!audioRef.current) return;
    
    const audioElement = audioRef.current;
    
    const handleEnded = () => {
      if (mounted.current) {
        setIsPlaying(false);
      }
    };
    
    const handleError = () => {
      if (mounted.current) {
        setIsPlaying(false);
        setIsLoading(false);
        setError("خطأ في تشغيل الملف الصوتي");
      }
    };
    
    // Set up event listeners
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);
    
    // Clean up
    return () => {
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
    };
  }, []);
  
  React.useEffect(() => {
    fetchAudioAsBase64();
  }, [audioSrc, fetchAudioAsBase64]);

  const handleStop = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      handleStop();
    } else {
      handlePlay();
    }
  };

  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 space-x-reverse rtl:space-x-reverse">
          {isLoading ? (
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-400 text-white">
              <FaSpinner className="animate-spin" size={14} />
            </div>
          ) : base64Audio ? (
            <button
              onClick={togglePlayPause}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-[#4664AD] hover:bg-[#3A5499]'
              } text-white`}
              title={isPlaying ? 'إيقاف' : 'تشغيل'}
            >
              {isPlaying ? <FaStop size={14} /> : <FaPlay size={14} />}
            </button>
          ) : (
            <button
              onClick={handleOpenInNewTab}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-[#4664AD] text-white hover:bg-[#3A5499]"
              title="فتح في نافذة جديدة"
            >
              <FaPlay size={14} />
            </button>
          )}
          
          <div className="flex flex-col">
            <span className="text-gray-800 font-semibold text-sm truncate max-w-[150px]">
              {audioTitle || 'ملف صوتي'}
            </span>
            <span className="text-xs text-gray-500">
              صوتي mp4/m4a
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse rtl:space-x-reverse">
          <button
            onClick={handleOpenInNewTab}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#4664AD] hover:bg-gray-200"
            title="فتح في نافذة جديدة"
            disabled={isLoading}
          >
            <FaExternalLinkAlt size={14} />
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mt-2 text-red-500 text-sm">
          {error}
        </div>
      )}
      
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

// Document Viewer Component
interface DocumentViewerProps {
  file: MediaFile;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ file }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'default' | 'google' | 'office'>('default');
  const extension = file.filename_download.split('.').pop()?.toLowerCase();

  // Prepare a preview URL that won't trigger download
  const getPreviewUrl = () => {
    // Remove any download=true parameters that might force downloading
    let previewUrl = file.src;
    previewUrl = previewUrl.replace(/[&?]download=true/g, '');
    
    // Add view parameter for PDFs if not already present
    if (extension === 'pdf' && !previewUrl.includes('#')) {
      previewUrl = `${previewUrl}#toolbar=1&view=FitH&navpanes=1`;
    }
    
    return previewUrl;
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    // If default viewer fails, try Google Docs viewer for supported file types
    if (viewerType === 'default' && (extension === 'pdf' || extension === 'docx' || extension === 'doc')) {
      setViewerType('google');
      setIsLoading(true);
    } else if (viewerType === 'google' && (extension === 'docx' || extension === 'doc')) {
      // If Google fails for Office docs, try Microsoft Office Online
      setViewerType('office');
      setIsLoading(true);
    } else {
      // If all viewers fail, show error
      setError('حدث خطأ أثناء تحميل المستند.');
      setIsLoading(false);
    }
  };

  return (
    <div className="p-3 border-t border-gray-200">
      <h4 className="text-sm font-medium mb-2">معاينة المستند</h4>
      
      {isLoading && (
        <div className="flex justify-center items-center p-4">
          <FaSpinner className="animate-spin text-blue-500 mr-2" />
          <span>جاري تحميل المستند...</span>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded text-center">
          {error}
          <div className="mt-2">
            <button 
              onClick={() => downloadWithAuth(file.src, file.filename_download)}
              className="text-blue-600 underline"
            >
              يمكنك تنزيل الملف بدلاً من ذلك
            </button>
          </div>
        </div>
      )}
      
      {/* Document viewer based on file type and current viewer type */}
      {extension === 'pdf' && !error && (
        <div className="w-full h-[500px] border border-gray-300 rounded">
          {viewerType === 'default' ? (
            <iframe 
              src={getPreviewUrl()} 
              title={file.title || file.filename_download}
              className="w-full h-full"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            ></iframe>
          ) : viewerType === 'google' && (
            <iframe 
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(file.src)}&embedded=true`} 
              title={file.title || file.filename_download}
              className="w-full h-full"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            ></iframe>
          )}
        </div>
      )}
      
      {(extension === 'docx' || extension === 'doc') && !error && (
        <div className="w-full h-[500px] border border-gray-300 rounded">
          {viewerType === 'default' ? (
            <iframe 
              src={getPreviewUrl()} 
              title={file.title || file.filename_download}
              className="w-full h-full"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            ></iframe>
          ) : viewerType === 'google' ? (
            <iframe 
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(file.src)}&embedded=true`} 
              title={file.title || file.filename_download}
              className="w-full h-full"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            ></iframe>
          ) : viewerType === 'office' && (
            <iframe 
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.src)}`} 
              title={file.title || file.filename_download}
              className="w-full h-full"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            ></iframe>
          )}
          
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
            {viewerType !== 'default' ? (
              <>
                مشاهدة المستند باستخدام {viewerType === 'google' ? 'Google Docs' : 'Microsoft Office Online'}.{' '}
                <button 
                  onClick={() => {
                    setViewerType(viewerType === 'google' ? 'office' : 'google');
                    setIsLoading(true);
                  }}
                  className="text-blue-600 underline"
                >
                  تبديل إلى {viewerType === 'google' ? 'Microsoft Office Online' : 'Google Docs'}
                </button>
              </>
            ) : (
              <>
                إذا واجهت مشكلة في عرض المستند، يمكنك{' '}
                <button 
                  onClick={() => {
                    setViewerType('google');
                    setIsLoading(true);
                  }}
                  className="text-blue-600 underline"
                >
                  عرضه في Google Docs
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      {extension !== 'pdf' && extension !== 'docx' && extension !== 'doc' && !error && (
        <div className="p-4 bg-gray-100 rounded text-center">
          هذا النوع من الملفات لا يمكن عرضه مباشرة. يرجى تنزيل الملف لعرضه.
        </div>
      )}
      
      <div className="mt-4 flex justify-end">
        <button 
          onClick={() => downloadWithAuth(file.src, file.filename_download)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center"
        >
          <FaDownload className="mr-2" /> تنزيل الملف
        </button>
      </div>
    </div>
  );
};

export default ComplaintMedia; 