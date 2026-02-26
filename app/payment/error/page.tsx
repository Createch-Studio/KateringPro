'use client';

import { Button } from '@/components/ui/button';
import { CircleCheck, AlertTriangle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function PaymentStatus() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const statusCode = searchParams.get('status_code');
  const transactionStatus = search-params.get('transaction_status');

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 text-center bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
        <div className="flex justify-center">
          <XCircle className="w-16 h-16 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-red-400">Pembayaran Gagal</h1>
        <p className="text-slate-300">
          Maaf, terjadi kesalahan saat memproses pembayaran Anda. Silakan coba lagi.
        </p>
        <div className="text-left bg-slate-900/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Status:</span>
            <span className="font-medium text-red-400 capitalize">{transactionStatus || 'Error'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Order ID:</span>
            <span className="font-medium">{orderId || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Kode Status:</span>
            <span className="font-medium">{statusCode || 'N/A'}</span>
          </div>
        </div>
        <Link href="/pos" passHref>
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            Kembali ke Halaman PoS
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function ErrorPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">Memuat...</div>}>
            <PaymentStatus />
        </Suspense>
    )
}
