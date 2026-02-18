'use client';

import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';

export default function SalesReportsPage() {
  return (
    <MainLayout title="Sales Reports">
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Sales Reports</h1>
            <p className="text-sm text-slate-400">Detailed sales analysis and trends.</p>
          </div>
          <div>
            <Link
              href="/accounting/reports/sales?view=full"
              className="inline-flex items-center px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-sm font-medium text-white"
            >
              View Full Report
            </Link>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <p className="text-sm text-slate-300 mb-3">Track your sales performance over time</p>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>Daily, weekly, and monthly sales trends</li>
            <li>Sales by payment method</li>
            <li>Sales by product category</li>
            <li>Top-selling products</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}

