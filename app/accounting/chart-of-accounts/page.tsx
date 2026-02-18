import { MainLayout } from '@/components/layout/MainLayout';

export default function ChartOfAccountsPage() {
  return (
    <MainLayout title="Chart of Accounts">
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-white mb-2">Chart of Accounts</h1>
          <p className="text-slate-400 text-sm">
            Modul akun belum diimplementasikan. Halaman ini akan digunakan untuk mengelola daftar akun
            akuntansi (COA) di KateringPro.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

