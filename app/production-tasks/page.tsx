import { MainLayout } from '@/components/layout/MainLayout';

export default function ProductionTasksPage() {
  return (
    <MainLayout title="Tugas Produksi">
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-white mb-2">Tugas Produksi</h1>
          <p className="text-slate-400 text-sm">
            Modul tugas produksi belum diimplementasikan. Halaman ini akan membantu mengelola dan
            memonitor tugas produksi harian dapur.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

