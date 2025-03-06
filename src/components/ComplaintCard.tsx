'use client';

import { useRouter } from 'next/navigation';

interface ComplaintCardProps {
  id: string;
  title: string;
  type: string;
  location: string;
  issue: string;
  progress: number;
}

const ComplaintCard = ({ id, title, type, location, issue, progress }: ComplaintCardProps) => {
  const router = useRouter();

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-4 relative cursor-pointer"
      onClick={() => router.push(`/complaints/${id}`)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="text-gray-500">{type}</div>
        <button className="text-gray-400 hover:text-gray-600">
          <span className="text-2xl">⋮</span>
        </button>
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