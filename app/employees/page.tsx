import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/auth-context';
import { Employee } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { employeeRoles, getPocketBaseErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { Edit2, Plus, Search, Shield, Trash2, UserCircle2 } from 'lucide-react';

type EmployeeFormState = {
  name: string;
  email: string;
  phone: string;
  position: string;
  role: Employee['role'];
  status: Employee['status'];
  base_salary: number;
  join_date: string;
  note: string;
};

export default function EmployeesPage() {
  const { pb, isAuthenticated, employee: currentEmployee, isViewOnlyRole } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeFormState>({
    name: '',
    email: '',
    phone: '',
    position: '',
    role: 'cashier',
    status: 'active',
    base_salary: 0,
    join_date: new Date().toISOString().split('T')[0],
    note: '',
  });

  useEffect(() => {
    if (!pb || !isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const res = await pb.collection('employees').getList<Employee>(1, 100, {
          sort: 'name',
        });
        setEmployees(res.items);
      } catch (error: any) {
        const message = getPocketBaseErrorMessage(error, 'Gagal memuat data karyawan');
        console.error('[v0] Fetch employees error:', message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [pb, isAuthenticated]);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter((emp) => {
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        (emp.position || '').toLowerCase().includes(q) ||
        (emp.role || '').toLowerCase().includes(q)
      );
    });
  }, [employees, search]);

  const openCreateDialog = () => {
    if (isViewOnly) return;
    setSelected(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      position: '',
      role: 'cashier',
      status: 'active',
      base_salary: 0,
      join_date: new Date().toISOString().split('T')[0],
      note: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    if (isViewOnly) return;
    setSelected(employee);
    setForm({
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
      role: employee.role || 'cashier',
      status: employee.status || 'active',
      base_salary: employee.base_salary ?? 0,
      join_date:
        employee.join_date ||
        employee.created?.split('T')[0] ||
        new Date().toISOString().split('T')[0],
      note: employee.note || employee.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pb || isViewOnly) return;

    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Nama dan email wajib diisi');
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<Employee> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        position: form.position.trim() || undefined,
        role: form.role,
        status: form.status,
        base_salary: form.base_salary || 0,
        join_date: form.join_date,
        note: form.note.trim() || undefined,
      };

      if (selected) {
        const updated = (await pb
          .collection('employees')
          .update<Employee>(selected.id, payload)) as Employee;
        setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        toast.success('Data karyawan berhasil diperbarui');
      } else {
        const created = (await pb.collection('employees').create<Employee>(payload)) as Employee;
        setEmployees((prev) => [created, ...prev]);
        toast.success('Karyawan baru berhasil ditambahkan');
      }

      setDialogOpen(false);
      setSelected(null);
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal menyimpan data karyawan');
      console.error('[v0] Save employee error:', message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!pb || isViewOnly) return;
    if (!confirm(`Yakin ingin menghapus karyawan "${employee.name}"?`)) return;

    try {
      await pb.collection('employees').delete(employee.id);
      setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
      toast.success('Karyawan berhasil dihapus');
    } catch (error: any) {
      const message = getPocketBaseErrorMessage(error, 'Gagal menghapus karyawan');
      console.error('[v0] Delete employee error:', message);
      toast.error(message);
    }
  };

  const roleLabel = (role: Employee['role']) => {
    const found = employeeRoles.find((r) => r.value === role);
    return found?.label || role;
  };

  const roleDescription = (role: Employee['role']) => {
    const found = employeeRoles.find((r) => r.value === role);
    return found?.description || '';
  };

  return (
    <MainLayout title="Karyawan & Hak Akses">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <UserCircle2 className="text-orange-400" size={20} />
              Karyawan
            </h1>
            <p className="text-slate-400 text-sm">
              Kelola data karyawan, role, dan hak akses di sistem.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <Input
                placeholder="Cari karyawan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder-slate-500 w-56"
              />
            </div>
            {!isViewOnly && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    onClick={openCreateDialog}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Plus size={16} className="mr-2" />
                    Tambah Karyawan
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {selected ? 'Edit Karyawan' : 'Karyawan Baru'}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Lengkapi data karyawan dan role sesuai tugasnya di sistem.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Nama Lengkap *
                      </label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        No. Telepon
                      </label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Jabatan
                      </label>
                      <Input
                        value={form.position}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, position: e.target.value }))
                        }
                        placeholder="Kasir, Supervisor, dll"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Role
                      </label>
                      <select
                        value={form.role}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, role: e.target.value as Employee['role'] }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
                      >
                        {employeeRoles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {roleDescription(form.role)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Status
                      </label>
                      <select
                        value={form.status}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            status: e.target.value as Employee['status'],
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
                      >
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Gaji Pokok (Rp)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={form.base_salary}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            base_salary: Number(e.target.value) || 0,
                          }))
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Tanggal Bergabung
                      </label>
                      <Input
                        type="date"
                        value={form.join_date}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            join_date: e.target.value,
                          }))
                        }
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Catatan
                    </label>
                    <textarea
                      rows={3}
                      value={form.note}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-md text-sm text-white px-3 py-2"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      disabled={saving}
                      className="border-slate-700 text-slate-300 hover:text-white"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Memuat data karyawan...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {employees.length === 0
                ? 'Belum ada data karyawan'
                : 'Tidak ada karyawan yang cocok dengan pencarian'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Nama
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Jabatan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">
                      Telepon
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-white">{emp.name}</td>
                      <td className="px-6 py-4 text-slate-300">
                        {emp.position || <span className="text-slate-500">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
                          <Shield size={12} className="text-orange-400" />
                          {roleLabel(emp.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{emp.email}</td>
                      <td className="px-6 py-4 text-slate-300">
                        {emp.phone || <span className="text-slate-500">-</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                            emp.status === 'active'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-slate-600/10 text-slate-400'
                          }`}
                        >
                          {emp.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {!isViewOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditDialog(emp)}
                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(emp)}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-orange-400" />
            <h2 className="text-sm font-semibold text-white">Ringkasan Role & Permissions</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Role digunakan untuk mengatur hak akses karyawan di berbagai modul aplikasi. Implementasi
            pembatasan akses bisa ditambahkan bertahap di tiap halaman berdasarkan role ini.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {employeeRoles.map((role) => (
              <div
                key={role.value}
                className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-100 font-medium">{role.label}</span>
                </div>
                <p className="text-xs text-slate-400">{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
