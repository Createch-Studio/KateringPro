import { MainLayout } from '@/components/layout/MainLayout';

export default function EmployeesPage() {
  return (
    <MainLayout title="Karyawan">
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-white mb-2">Karyawan</h1>
          <p className="text-slate-400 text-sm">
            Modul SDM / karyawan belum diimplementasikan. Halaman ini akan digunakan untuk mengelola data
            karyawan dan tim produksi.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

