import Image from "next/image";
import Sidebar from '@/components/Sidebar';
import ComplaintCard from '@/components/ComplaintCard';

export default function Home() {
  // Sample data - in a real app, this would come from an API
  const complaints = [
    {
      title: 'شكوى مياه',
      type: 'خدمة عامة',
      location: 'بغداد',
      issue: 'عدم وجود مياه',
      progress: 60,
    },
    {
      title: 'شكوى مياه',
      type: 'خدمة عامة',
      location: 'بغداد',
      issue: 'عدم وجود مياه',
      progress: 60,
    },
    {
      title: 'شكوى مياه',
      type: 'خدمة عامة',
      location: 'بغداد',
      issue: 'عدم وجود مياه',
      progress: 60,
    },
    // Add more sample complaints as needed
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar />
      
      <main className="flex-1 p-8 mr-64">
        <div className="flex justify-between items-center mb-8">
          <div className="flex space-x-4">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              انشاء شكوى
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              تصدير البيانات
            </button>
          </div>
          <h1 className="text-3xl font-bold">قائمة الشكاوى</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complaints.map((complaint, index) => (
            <ComplaintCard
              key={index}
              title={complaint.title}
              type={complaint.type}
              location={complaint.location}
              issue={complaint.issue}
              progress={complaint.progress}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
