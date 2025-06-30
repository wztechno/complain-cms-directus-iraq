'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Logo" className="w-32 h-28" />
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-8 text-[#4664AD]">
          تسجيل الدخول
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-right">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md p-2 text-right focus:ring-2 focus:ring-[#4664AD] focus:border-transparent"
              placeholder="أدخل البريد الإلكتروني"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md p-2 text-right focus:ring-2 focus:ring-[#4664AD] focus:border-transparent"
              placeholder="أدخل كلمة المرور"
            />
            <div className="flex items-center justify-between mt-2">
              <Link 
                href="/reset-password" 
                className="text-sm text-[#4664AD] hover:text-[#3A5499] transition-colors"
                onClick={() => {
                  console.log('🔗 Forgot password link clicked - navigating to /reset-password');
                }}
              >
                هل نسيت كلمة المرور؟
              </Link>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600" />
                <label className="block text-sm font-medium text-gray-700 text-right">
                  تذكر كلمة المرور
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-[#4664AD] text-white py-2 rounded-md font-semibold transition-colors ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#3A5499]'
            }`}
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
} 