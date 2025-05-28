'use client';

import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 p-8 mr-64 flex justify-center items-center">
      <div className="bg-white rounded-lg p-8 shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">غير مصرح</h1>
        <p className="text-gray-600 mb-6">
          عذراً، ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة.
        </p>
        <button
          onClick={() => router.push('/')}
          className="bg-[#4664AD] text-white px-6 py-2 rounded-lg hover:bg-[#3A5499]"
        >
          العودة إلى الرئيسية
        </button>
      </div>
    </div>
  );
} 