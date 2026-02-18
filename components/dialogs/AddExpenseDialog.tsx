import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Expense, Supplier } from '@/lib/types';
import { getPocketBaseErrorMessage } from '@/lib/api';

interface AddExpenseDialogProps {
  pb: any;
  onExpenseAdded: (expense: Expense) => void;
}

export function AddExpenseDialog({ pb, onExpenseAdded }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'bahan_baku' as Expense['category'],
    description: '',
    amount: 0,
    supplier_id: '',
    notes: '',
  });

  useEffect(() => {
    const fetchSuppliers = async () => {
      if (!pb || !open) return;
      try {
        const res = await pb.collection('suppliers').getList(1, 100, {
          sort: 'name',
        });
        setSuppliers(res.items as Supplier[]);
      } catch (error) {
        console.error('[v0] Failed to fetch suppliers for expenses:', error);
      }
    };

    fetchSuppliers();
  }, [pb, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast.error('Deskripsi pengeluaran wajib diisi');
      return;
    }

    if (!formData.expense_date) {
      toast.error('Tanggal pengeluaran wajib diisi');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      toast.error('Nominal pengeluaran harus lebih besar dari 0');
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        expense_date: formData.expense_date,
        category: formData.category,
        description: formData.description,
        amount: formData.amount,
        supplier_id: formData.supplier_id || undefined,
        notes: formData.notes || undefined,
        is_deleted: false,
      };

      const created = await pb.collection('expenses').create(payload);
      onExpenseAdded(created as Expense);
      toast.success('Pengeluaran berhasil ditambahkan');
      setOpen(false);

      const today = new Date().toISOString().split('T')[0];
      setFormData({
        expense_date: today,
        category: 'bahan_baku',
        description: '',
        amount: 0,
        supplier_id: '',
        notes: '',
      });
    } catch (error: any) {
      console.error('[v0] Add expense error:', error);
      toast.error(getPocketBaseErrorMessage(error, 'Gagal menambahkan pengeluaran'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={18} className="mr-2" />
          Tambah Pengeluaran
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Tambah Pengeluaran</DialogTitle>
          <DialogDescription className="text-slate-400">
            Catat pengeluaran operasional atau bahan baku usaha katering.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tanggal *
              </label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expense_date: e.target.value,
                  })
                }
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Kategori *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as Expense['category'],
                  })
                }
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
              >
                <option value="bahan_baku">Bahan baku</option>
                <option value="tenaga_kerja">Tenaga kerja</option>
                <option value="transportasi">Transportasi</option>
                <option value="peralatan">Peralatan</option>
                <option value="marketing">Marketing</option>
                <option value="utilities">Utilities</option>
                <option value="sewa">Sewa</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Deskripsi *
            </label>
            <Input
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              placeholder="Contoh: Belanja bahan baku sayuran"
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nominal *
            </label>
            <Input
              type="number"
              min={0}
              value={formData.amount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amount: Number(e.target.value) || 0,
                })
              }
              placeholder="0"
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Supplier
            </label>
            <select
              value={formData.supplier_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  supplier_id: e.target.value,
                })
              }
              disabled={loading || suppliers.length === 0}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
            >
              <option value="">Tanpa supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Catatan
            </label>
            <Input
              value={formData.notes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notes: e.target.value,
                })
              }
              placeholder="Catatan tambahan (opsional)"
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="border-slate-700 text-slate-300 hover:text-white"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? 'Menyimpan...' : 'Simpan Pengeluaran'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

