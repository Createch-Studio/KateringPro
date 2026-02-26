'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LogOut, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PosLayoutProps {
  title: string;
  children: ReactNode;
}

export function PosLayout({ title, children }: PosLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, employeeRole } = useAuth();

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen flex flex-col">
      {/* POS Topbar */}
      <header className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-lg font-bold text-white">
            L
          </div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          {employeeRole !== 'cashier' && (
             <Link href="/dashboard">
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 gap-2">
                    <Home size={18} />
                    <span className="hidden sm:inline">Dashboard</span>
                </Button>
             </Link>
          )}
          
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
