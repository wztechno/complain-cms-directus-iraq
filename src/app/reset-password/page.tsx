'use client';

import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/utils/firebase';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // useEffect(() => {
  //   console.log('🚀 Reset Password Page loaded successfully');
  //   console.log('📍 Current URL:', window.location.href);
  //   console.log('🔧 Firebase auth object:', auth);
  //   console.log('⚙️ Environment variables check:', {
  //     hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  //     hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  //     hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  //   });
  //   console.log('🌐 Firebase auth domain:', auth?.config?.authDomain);
  //   console.log('🗣️ Firebase language:', auth?.languageCode);
  // }, []);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with email:', email);
    
    // Clear previous messages
    setError('');
    setMessage('');
    
    // Client-side email validation
    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    
    if (!isValidEmail(email)) {
      setError('البريد الإلكتروني المدخل غير صحيح');
      return;
    }
    
    setLoading(true);

    try {
      console.log('🔥 Attempting to send password reset email...');
      console.log('📧 Email:', email);
      console.log('🏠 Auth domain:', auth.config.authDomain);
      console.log('🌐 Continue URL:', window.location.origin + '/login');
      
      // Send password reset email using Firebase Auth
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
        handleCodeInApp: false
      });
      
      console.log('✅ Password reset email sent successfully by Firebase');
      console.log('📮 Email should be sent from: noreply@complain-app-iraq.firebaseapp.com');
      console.log('📋 Check these locations for the email:');
      console.log('  1. Inbox');
      console.log('  2. Spam/Junk folder (most common)');
      console.log('  3. Promotions tab (Gmail)');
      console.log('  4. All Mail folder');
      
      setEmailSent(true);
      setMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
      
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      
      // Handle different Firebase error codes with Arabic messages
      const firebaseError = error as { code?: string; message?: string };
      console.log('Firebase error code:', firebaseError.code);
      console.log('Firebase error message:', firebaseError.message);
      
      switch (firebaseError.code) {
        case 'auth/user-not-found':
          setError('لم يتم العثور على حساب بهذا البريد الإلكتروني');
          break;
        case 'auth/invalid-email':
          setError('البريد الإلكتروني المدخل غير صحيح');
          break;
        case 'auth/too-many-requests':
          setError('تم إرسال الكثير من الطلبات. يرجى المحاولة مرة أخرى لاحقاً');
          break;
        case 'auth/network-request-failed':
          setError('فشل في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت');
          break;
        case 'auth/internal-error':
          setError('حدث خطأ داخلي. يرجى المحاولة مرة أخرى');
          break;
        default:
          setError('حدث خطأ أثناء إرسال البريد الإلكتروني. يرجى المحاولة مرة أخرى');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = () => {
    setEmailSent(false);
    setMessage('');
    setError('');
    setEmail(''); // Clear email for fresh input
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100" dir="rtl">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Logo" className="w-32 h-28" />
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-8 text-[#4664AD]">
          إعادة تعيين كلمة المرور
        </h1>

        {emailSent ? (
          // Step 3: Success State - Email Sent
          <div className="text-center">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 text-right">
              <div className="flex items-center justify-center mb-4">
                <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-center font-semibold mb-2 text-lg">تم إرسال البريد الإلكتروني بنجاح!</p>
              <p className="text-sm text-center mb-2">
                تم إرسال رابط إعادة تعيين كلمة المرور إلى:
              </p>
              <p className="text-center font-medium text-[#4664AD] mb-3">
                {email}
              </p>
              <div className="text-xs text-gray-600 text-center border-t pt-3">
                <p className="mb-2">📍 يرجى التحقق من بريدك الإلكتروني واتباع التعليمات</p>
                <p className="text-red-600 font-medium mb-1">⚠️ تحقق من مجلد الرسائل غير المرغوب فيها (Spam)</p>
                <p className="text-xs text-gray-500">البريد مرسل من: noreply@complain-app-iraq.firebaseapp.com</p>
                <div className="mt-2 text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                  <p className="font-medium text-yellow-800">أماكن البحث عن البريد:</p>
                  <ul className="text-yellow-700 text-right list-none mt-1">
                    <li>• صندوق الوارد (Inbox)</li>
                    <li>• الرسائل غير المرغوبة (Spam/Junk)</li>
                    <li>• العروض الترويجية (Promotions - Gmail)</li>
                    <li>• جميع الرسائل (All Mail)</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleResendEmail}
                className="w-full bg-gray-500 text-white py-3 rounded-md font-semibold hover:bg-gray-600 transition-colors"
              >
                إرسال مرة أخرى
              </button>
              
              <Link
                href="/login"
                className="block w-full bg-[#4664AD] text-white py-3 rounded-md font-semibold text-center hover:bg-[#3A5499] transition-colors"
              >
                العودة إلى تسجيل الدخول
              </Link>
            </div>
          </div>
        ) : (
          // Step 1 & 2: Reset Method Selection and Email Input
          <>
            <div className="text-center mb-6">
              <p className="text-gray-600 text-right mb-4">
                أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
              </p>
              
              {/* Reset Method Selection (Email only, as per Flutter implementation) */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center space-x-2 space-x-reverse">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-blue-800 font-medium">إعادة التعيين عبر البريد الإلكتروني</span>
                </div>
              </div>
            </div>

            {message && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-right">
                {message}
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-right">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                  البريد الإلكتروني <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full border border-gray-300 rounded-md p-3 text-left focus:ring-2 focus:ring-[#4664AD] focus:border-transparent transition-colors"
                  placeholder="example@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className={`w-full bg-[#4664AD] text-white py-3 rounded-md font-semibold transition-colors ${
                  loading || !email.trim() 
                    ? 'opacity-70 cursor-not-allowed' 
                    : 'hover:bg-[#3A5499] active:bg-[#2A4088]'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2 space-x-reverse">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>جاري الإرسال...</span>
                  </div>
                ) : (
                  'إرسال رابط إعادة التعيين'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-[#4664AD] hover:text-[#3A5499] font-medium transition-colors text-sm"
              >
                ← العودة إلى تسجيل الدخول
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 