'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ADMIN_TOKEN_KEY } from '@/lib/api/client';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Client-side route guard: no admin token → bounce to login. (A server-side
  // Next middleware can be layered on later using the admin_token cookie.)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    if (!token) {
      router.replace('/');
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b]">
        <Loader2 className="animate-spin text-[#FFFFFF60]" size={28} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#09090b] text-white">
      <Toaster position="top-right" richColors theme="dark" />
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}