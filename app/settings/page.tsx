'use client';

import { useAuth } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/api';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Semua field password wajib diisi');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Password baru dan konfirmasi tidak sama');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    toast.success('Fitur ganti password segera hadir');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowChangePassword(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Berhasil logout');
    } catch (error) {
      console.error('[v0] Logout error:', error);
      toast.error('Gagal logout');
    }
  };

  return (
    <MainLayout title="Pengaturan">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-6">Profil Pengguna</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">User ID</label>
                <Input
                  type="text"
                  value={user?.id || ''}
                  disabled
                  className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Bergabung Sejak</label>
                <Input
                  type="text"
                  value={user?.created ? formatDate(user.created) : '-'}
                  disabled
                  className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Akun</h2>
            <div className="space-y-3">
              <Button
                onClick={() => setShowChangePassword(!showChangePassword)}
                variant="outline"
                className="w-full border-slate-700 text-slate-300 hover:text-white"
              >
                Ganti Password
              </Button>
              <Button
                onClick={handleLogout}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {showChangePassword && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Ganti Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password Saat Ini
                </label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password Baru
                </label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Konfirmasi Password Baru
                </label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="border-slate-700 text-slate-300 hover:text-white"
                >
                  Batal
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white">
                  Simpan Password
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Informasi Sistem</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Aplikasi</p>
              <p className="text-sm font-medium text-white">KateringPro ERP</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Versi</p>
              <p className="text-sm font-medium text-white">1.0.0</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Lingkungan</p>
              <p className="text-sm font-medium text-white">Production</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Backend</p>
              <p className="text-sm font-medium text-white">PocketBase</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
