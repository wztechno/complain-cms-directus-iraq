'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface TimelineEntry {
  id: number;
  complaint_id: string;
  user_id: string;
  status_subcategory: string;
  statusDate: string;
  date: string;
  complaint_name?: string;
  user_name?: string;
  status_name?: string;
  responsible_user?: string;
}

interface TimelineTableRowProps {
  complaint: TimelineEntry;
}

const TimelineTableRow: React.FC<TimelineTableRowProps> = ({ complaint }) => {
  const router = useRouter();

  const handleComplaintClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/complaints/${complaint.complaint_id}`);
  };

  return (
        <tr 
      className="hover:bg-gray-50 cursor-pointer" 
      onClick={() => router.push(`/timeline/${complaint.id}`)}
      key={complaint.id}>
      <td className="px-6 py-4 text-right text-sm text-gray-900">
        <a 
          href="#"
          className="text-[#4664AD] hover:underline cursor-pointer"
          onClick={handleComplaintClick}
        >
          {complaint.complaint_id}
        </a>
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-900">{complaint.complaint_name}</td>
      <td className="px-6 py-4 text-right text-sm text-gray-900">{complaint.user_name}</td>
      <td className="px-6 py-4 text-right text-sm text-gray-900">{complaint.status_name}</td>
      <td className="px-6 py-4 text-right text-sm text-gray-900">{complaint.responsible_user}</td>
      <td className="px-6 py-4 text-right text-sm text-gray-900">
        {new Date(complaint.statusDate || complaint.date).toLocaleDateString('ar-IQ')}
      </td>
    </tr>
  );
};

export default TimelineTableRow; 