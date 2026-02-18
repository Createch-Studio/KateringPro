import { MainLayout } from '@/components/layout/MainLayout';

export default function PaymentsPage() {
  return (
    <MainLayout title="Pembayaran">
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-white mb-2">Pembayaran</h1>
          <p className="text-slate-400 text-sm">
            Modul pembayaran (pencatatan pembayaran invoice dan order) belum diimplementasikan. Halaman ini
            akan menampilkan daftar pembayaran yang masuk.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

