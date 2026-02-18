'use client';

import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-700 sticky top-0 z-40 flex items-center justify-between px-6">
      <h1 className="text-xl font-bold text-white">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2 max-w-xs">
          <Search size={18} className="text-slate-400" />
          <Input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-0 text-sm placeholder-slate-500 focus:outline-none focus:ring-0"
          />
        </div>

        <button className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
