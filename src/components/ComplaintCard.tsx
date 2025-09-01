'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheck } from 'react-icons/fa';

interface ComplaintCardProps {
  id: string;
  title: string;
  type: string;
  location: string;
  status: string;
  mainCategory:string;
  issue: string;
  progress: number;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  responsibleUser?: string;
  currentPage?: number;
}

const ComplaintCard = ({ 
  id, 
  title, 
  status,
  type, 
  location, 
  issue, 
  mainCategory,
  progress, 
  isSelected = false,
  responsibleUser,
  onSelect,
  currentPage
}: ComplaintCardProps) => {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleCardClick = () => {
    const url = currentPage ? `/complaints/${id}?page=${currentPage}` : `/complaints/${id}`;
    router.push(url);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(id);
    }
    setShowMenu(false);
  };
  console.log("responsibleUser",responsibleUser);

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-4 relative cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="text-gray-500">{id} - {type}</div>
        <div className="relative">
          <button 
            className="text-gray-400 hover:text-gray-600"
            onClick={handleMenuClick}
          >
            <span className="text-2xl">⋮</span>
          </button>
          {showMenu && (
            <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-md w-40 z-10">
              <button
                className="flex items-center justify-between w-full px-4 py-2 text-right hover:bg-gray-100 rounded-lg"
                onClick={handleSelectClick}
              >
                <span>{isSelected ? 'إلغاء التحديد' : 'تحديد'}</span>
                {isSelected && <FaCheck className="text-green-600" />}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <h3 className="text-xl font-semibold mb-2 text-right">{title} - {status && status}</h3>

      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div className="text-left">
            <span className="text-xs font-semibold inline-block text-blue-600">
              {mainCategory}
            </span>
          </div>
          <div className="text-right">
          <span className="text-xs font-semibold inline-block text-blue-600">
              {progress}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
          <div 
            style={{ width: `${progress}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"
          />
        </div>
      </div>
      <div className="mt-2 text-sm">
        <span className="font-bold">المسؤول:</span> {responsibleUser || 'غير محدد'}
      </div>

      <div className="flex justify-between items-center mt-8 mb-4 text-right">
        <div className="text-gray-600 break-words w-[50%] line-clamp-1">{issue}</div>
        <div className="text-gray-600">{location}</div>
      </div>
    </div>
  );
};

export default ComplaintCard; 