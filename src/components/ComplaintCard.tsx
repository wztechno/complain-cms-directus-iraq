'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheck } from 'react-icons/fa';

interface ComplaintCardProps {
  id: string;
  title: string;
  type: string;
  location: string;
  issue: string;
  progress: number;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

const ComplaintCard = ({ 
  id, 
  title, 
  type, 
  location, 
  issue, 
  progress, 
  isSelected = false,
  onSelect 
}: ComplaintCardProps) => {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleCardClick = () => {
    router.push(`/complaints/${id}`);
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

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-4 relative cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="text-gray-500">{type}</div>
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
      
      <h3 className="text-xl font-semibold mb-2 text-right">{title}</h3>

      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div className="text-left">
            <span className="text-xs font-semibold inline-block text-blue-600">
              {progress}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-blue-600">
              استقبال شكوى
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

      <div className="flex justify-between items-center mt-8 mb-4 text-right">
        <div className="text-gray-600">{issue}</div>
        <div className="text-gray-600">{location}</div>
      </div>
    </div>
  );
};

export default ComplaintCard; 