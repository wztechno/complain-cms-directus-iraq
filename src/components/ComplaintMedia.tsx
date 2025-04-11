import React, { useState } from 'react';
import { FaImage, FaVideo, FaVolumeUp, FaFileAlt, FaEye, FaDownload, FaPlay, FaPause, FaStop, FaSpinner, FaExternalLinkAlt } from 'react-icons/fa';

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

const ComplaintMedia: React.FC<ComplaintMediaProps> = ({
  images = [],
  videos = [],
  audios = [],
  files = []
}) => {
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
      {images.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FaImage className="text-[#4664AD]" />
            <h3 className="text-lg font-semibold">الصور المرفقة</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div key={image.id} className="bg-gray-50 rounded-lg overflow-hidden">
                <div className="relative group">
                  <img 
                    src={image.src} 
                    alt={image.title || image.filename_download} 
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <a 
                      href={image.src} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-white rounded-full mx-2 hover:bg-blue-100"
                    >
                      <FaEye className="text-[#4664AD]" />
                    </a>
                    <a 
                      href={image.src} 
                      download={image.filename_download}
                      className="p-2 bg-white rounded-full mx-2 hover:bg-blue-100"
                    >
                      <FaDownload className="text-[#4664AD]" />
                    </a>
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
      {videos.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FaVideo className="text-[#4664AD]" />
            <h3 className="text-lg font-semibold">مقاطع الفيديو المرفقة</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((video) => (
              <div key={video.id} className="bg-gray-50 rounded-lg overflow-hidden">
                <video 
                  controls 
                  className="w-full h-auto"
                  poster={video.src + '?preview=true'}
                >
                  <source src={video.src} type="video/mp4" />
                  متصفحك لا يدعم عرض الفيديو
                </video>
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
      {audios.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FaVolumeUp className="text-[#4664AD]" />
            <h3 className="text-lg font-semibold">التسجيلات الصوتية المرفقة</h3>
          </div>
          <div className="space-y-3">
            {audios.map((audio) => (
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

      {/* Other Files Section */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FaFileAlt className="text-[#4664AD]" />
            <h3 className="text-lg font-semibold">الملفات المرفقة</h3>
          </div>
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex justify-between items-center border-b border-gray-100 py-2">
                <div className="flex items-center">
                  <FaFileAlt className="text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">{file.title || file.filename_download}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500">{formatFileSize(file.filesize)}</span>
                  <a 
                    href={file.src} 
                    download={file.filename_download}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                  >
                    <FaDownload size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {images.length === 0 && videos.length === 0 && audios.length === 0 && files.length === 0 && (
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
  const [base64Audio, setBase64Audio] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const mounted = React.useRef(true);
  
  // Setup cleanup on unmount
  React.useEffect(() => {
    return () => {
      mounted.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Update the fetchAudioAsBase64 function to handle 400 errors better:
  const fetchAudioAsBase64 = async () => {
    try {
      if (!mounted.current) return;
      
      setIsLoading(true);
      setError(null);

      // Extract token from URL if it exists
      const token = audioSrc.match(/access_token=([^&]+)/)?.[1] || localStorage.getItem('auth_token');
      
      // Check if we need to refresh the token
      const tokenData = token ? JSON.parse(atob(token.split('.')[1])) : null;
      const isTokenExpired = tokenData && tokenData.exp * 1000 < Date.now();
      
      // Try refreshing token if expired (simplified approach)
      let urlToFetch = audioSrc;
      if (isTokenExpired) {
        const freshToken = localStorage.getItem('auth_token'); // Get the latest token
        urlToFetch = audioSrc.replace(/access_token=[^&]+/, `access_token=${freshToken}`);
      }

      console.log('Fetching audio from:', urlToFetch);
      
      // Attempt to fetch directly without conversion to base64
      if (!mounted.current) return;
      
      // First try direct approach
      if (audioRef.current) {
        audioRef.current.src = urlToFetch;
        audioRef.current.load();
        setIsLoading(false);
        return;
      }
      
      // If direct approach fails, try fetch with proxy approach
      const response = await fetch(urlToFetch, {
        method: 'GET',
        headers: {
          // Avoid setting content-type and accept headers that could trigger preflight
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }
      
      const blob = await response.blob();
      const dataUrl = URL.createObjectURL(blob);
      
      if (mounted.current) {
        setBase64Audio(dataUrl);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching audio as base64:', error);
      if (mounted.current) {
        setError("حدث خطأ أثناء تحميل الملف الصوتي");
        setIsLoading(false);
      }
    }
  };

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
      // Extract and validate token
      const token = audioSrc.match(/access_token=([^&]+)/)?.[1] || localStorage.getItem('auth_token');
      
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
  }, [audioSrc]);

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
  const [base64Audio, setBase64Audio] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const mounted = React.useRef(true);
  
  // Setup cleanup on unmount
  React.useEffect(() => {
    return () => {
      mounted.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Update the fetchAudioAsBase64 function to handle 400 errors better:
  const fetchAudioAsBase64 = async () => {
    try {
      if (!mounted.current) return;
      
      setIsLoading(true);
      setError(null);

      // Extract token from URL if it exists
      const token = audioSrc.match(/access_token=([^&]+)/)?.[1] || localStorage.getItem('auth_token');
      
      // Check if we need to refresh the token
      const tokenData = token ? JSON.parse(atob(token.split('.')[1])) : null;
      const isTokenExpired = tokenData && tokenData.exp * 1000 < Date.now();
      
      // Try refreshing token if expired (simplified approach)
      let urlToFetch = audioSrc;
      if (isTokenExpired) {
        const freshToken = localStorage.getItem('auth_token'); // Get the latest token
        urlToFetch = audioSrc.replace(/access_token=[^&]+/, `access_token=${freshToken}`);
      }

      console.log('Fetching audio from:', urlToFetch);
      
      // Attempt to fetch directly without conversion to base64
      if (!mounted.current) return;
      
      // First try direct approach
      if (audioRef.current) {
        audioRef.current.src = urlToFetch;
        audioRef.current.load();
        setIsLoading(false);
        return;
      }
      
      // If direct approach fails, try fetch with proxy approach
      const response = await fetch(urlToFetch, {
        method: 'GET',
        headers: {
          // Avoid setting content-type and accept headers that could trigger preflight
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }
      
      const blob = await response.blob();
      const dataUrl = URL.createObjectURL(blob);
      
      if (mounted.current) {
        setBase64Audio(dataUrl);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching audio as base64:', error);
      if (mounted.current) {
        setError("حدث خطأ أثناء تحميل الملف الصوتي");
        setIsLoading(false);
      }
    }
  };

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
      // Extract and validate token
      const token = audioSrc.match(/access_token=([^&]+)/)?.[1] || localStorage.getItem('auth_token');
      
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
  }, [audioSrc]);

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

export default ComplaintMedia; 