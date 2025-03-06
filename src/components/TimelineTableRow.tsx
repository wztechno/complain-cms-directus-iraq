'use client';

import { useRouter } from 'next/navigation';

interface TimelineTableRowProps {
  complaint: {
    id: string;
    complaint_id: string;
    Complaint_Subcategory?: string;
    statusDate?: string;
    date?: string;
    status_subcategory?: string;
  };
}

export default function TimelineTableRow({ complaint }: TimelineTableRowProps) {
  const router = useRouter();

  return (
    <tr 
      className="hover:bg-gray-50 cursor-pointer" 
      onClick={() => router.push(`/timeline/${complaint.id}`)}
    >
      <td className="px-6 py-4 text-right text-sm text-gray-900">{complaint.complaint_id}</td>
      <td className="px-6 py-4 text-right text-sm text-gray-900">
        {complaint.Complaint_Subcategory || 'غير محدد'}
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-900">
        {new Date(complaint.statusDate || complaint.date || '').toLocaleDateString('ar-EG')}
      </td>
      <td className="px-6 py-4 text-right text-sm">
        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 
          ${complaint.status_subcategory ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {complaint.status_subcategory ? 'مكتمل' : 'قيد المعالجة'}
        </span>
      </td>
    </tr>
  );
} 