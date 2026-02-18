import { MainLayout } from '@/components/layout/MainLayout';

export default function JournalPage() {
  return (
    <MainLayout title="Jurnal">
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-white mb-2">Jurnal</h1>
          <p className="text-slate-400 text-sm">
            Modul jurnal umum belum diimplementasikan. Halaman ini akan menampilkan dan mencatat transaksi
            akuntansi harian.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

