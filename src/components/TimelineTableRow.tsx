'use client';

import { useRouter } from 'next/navigation';

interface TimelineEntry {
  id: number;
  complaint_id: string;
  status_subcategory: string;
  statusDate: string;
  date: string;
}

interface TimelineTableRowProps {
  complaint: TimelineEntry;
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
        {complaint.status_subcategory || 'غير محدد'}
      </td>
      <td className="px-6 py-4 text-right text-sm text-gray-900">
        {new Date(complaint.statusDate || complaint.date || '').toLocaleDateString('ar-EG')}
      </td>
    </tr>
  );
} 