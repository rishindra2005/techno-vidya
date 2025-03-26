'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Main() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page if logged in, otherwise to login page
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      router.push('/home');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-500 border-l-gray-200 border-r-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-xl">Loading Techno Vaidhya...</h1>
      </div>
    </div>
  );
}
