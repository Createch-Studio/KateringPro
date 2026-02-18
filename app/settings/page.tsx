'use client';

import { useAuth } from '@/lib/auth-context';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { formatDate, getPocketBaseErrorMessage } from '@/lib/api';
import type { EmployeeRole, RolePermission } from '@/lib/types';

const ALL_ROLES: EmployeeRole[] = [
  'admin',
  'manager',
  'cashier',
  'production',
  'accounting',
  'waiter',
  'driver',
];

export default function SettingsPage() {
  const { user, logout, pb, employeeRole } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<EmployeeRole>('admin');
  const [permissionInput, setPermissionInput] = useState('');
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);

  const isAdmin = employeeRole === 'admin';

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!pb || !isAdmin) return;
      try {
        setPermissionLoading(true);
        const res = await pb
          .collection('role_permissions')
          .getList<RolePermission>(1, 50, {
            sort: 'role',
          });
        setRolePermissions(res.items);
      } catch (error: any) {
        const message = getPocketBaseErrorMessage(
          error,
          'Gagal memuat pengaturan permission role'
        );
        console.error('[v0] Fetch role permissions error:', message);
        toast.error(message);
      } finally {
        setPermissionLoading(false);
      }
    };

    fetchPermissions();
  }, [pb, isAdmin]);

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

  const currentPermissions = useMemo(() => {
    const existing = rolePermissions.find((rp) => rp.role === selectedRole);
    return existing?.permissions || [];
  }, [rolePermissions, selectedRole]);

  const handleAddPermission = () => {
    const value = permissionInput.trim();
    if (!value) return;
    if (currentPermissions.includes(value)) {
      setPermissionInput('');
      return;
    }
    setRolePermissions((prev) => {
      const existing = prev.find((rp) => rp.role === selectedRole);
      if (!existing) {
        return [
          ...prev,
          {
            id: '',
            collectionId: '',
            collectionName: 'role_permissions',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            role: selectedRole,
            permissions: [value],
          },
        ];
      }
      return prev.map((rp) =>
        rp.role === selectedRole
          ? { ...rp, permissions: [...rp.permissions, value] }
          : rp
      );
    });
    setPermissionInput('');
  };

  const handleRemovePermission = (perm: string) => {
    setRolePermissions((prev) =>
      prev.map((rp) =>
        rp.role === selectedRole
          ? { ...rp, permissions: rp.permissions.filter((p) => p !== perm) }
          : rp
      )
    );
  };

  const handleSavePermissions = async () => {
    if (!pb || !isAdmin) return;

    const entry = rolePermissions.find((rp) => rp.role === selectedRole);
    if (!entry) {
      toast.success('Tidak ada perubahan permission untuk disimpan');
      return;
    }

    try {
      setPermissionSaving(true);

      const payload = {
        role: entry.role,
        permissions: entry.permissions,
      };

      if (entry.id) {
        const updated = await pb
          .collection('role_permissions')
          .update<RolePermission>(entry.id, payload);
        setRolePermissions((prev) =>
          prev.map((rp) => (rp.role === selectedRole ? updated : rp))
        );
      } else {
        const created = await pb
          .collection('role_permissions')
          .create<RolePermission>(payload);
        setRolePermissions((prev) =>
          prev.map((rp) =>
            rp.role === selectedRole ? created : rp
          )
        );
      }

      toast.success('Permission role berhasil disimpan');
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(
        error,
        'Gagal menyimpan permission role'
      );
      console.error('[v0] Save role permissions error:', message);
      toast.error(message);
    } finally {
      setPermissionSaving(false);
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

        {isAdmin && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-6">
              Pengaturan Permission Role (Admin)
            </h2>

            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Pilih Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as EmployeeRole)}
                    disabled={permissionLoading || permissionSaving}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
                  >
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Permission untuk role ini
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Contoh: <span className="font-mono">orders.create</span>,{' '}
                  <span className="font-mono">payments.approve</span>,{' '}
                  <span className="font-mono">reports.view</span>. Tambahkan sesuai kebutuhan
                  bisnis Anda.
                </p>

                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Masukkan nama permission lalu Enter / klik Tambah"
                    value={permissionInput}
                    onChange={(e) => setPermissionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPermission();
                      }
                    }}
                    disabled={permissionLoading || permissionSaving}
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                  />
                  <Button
                    type="button"
                    onClick={handleAddPermission}
                    disabled={
                      !permissionInput.trim() ||
                      permissionLoading ||
                      permissionSaving
                    }
                    className="bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap"
                  >
                    Tambah
                  </Button>
                </div>

                <div className="min-h-[48px] rounded-md border border-dashed border-slate-700 bg-slate-900/50 px-3 py-2 flex flex-wrap gap-2">
                  {permissionLoading ? (
                    <span className="text-xs text-slate-400">
                      Memuat permission role...
                    </span>
                  ) : currentPermissions.length === 0 ? (
                    <span className="text-xs text-slate-500">
                      Belum ada permission untuk role ini.
                    </span>
                  ) : (
                    currentPermissions.map((perm) => (
                      <span
                        key={perm}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-800 text-slate-100 border border-slate-700"
                      >
                        <span className="font-mono">{perm}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePermission(perm)}
                          disabled={permissionSaving}
                          className="ml-1 text-slate-400 hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={permissionSaving || permissionLoading}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {permissionSaving ? 'Menyimpan...' : 'Simpan Permission Role'}
                </Button>
              </div>
            </div>
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
