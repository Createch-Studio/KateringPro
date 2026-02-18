import { useState } from 'react';
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
import { Supplier } from '@/lib/types';
import { getPocketBaseErrorMessage } from '@/lib/api';

interface AddSupplierDialogProps {
  pb: any;
  onSupplierAdded: (supplier: Supplier) => void;
}

export function AddSupplierDialog({ pb, onSupplierAdded }: AddSupplierDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    category: 'bahan_baku' as Supplier['category'],
    npwp: '',
    notes: '',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nama supplier wajib diisi');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Nomor telepon wajib diisi');
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        name: formData.name,
        contact_person: formData.contact_person || undefined,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        category: formData.category,
        npwp: formData.npwp || undefined,
        notes: formData.notes || undefined,
        is_active: formData.is_active,
      };

      const created = await pb.collection('suppliers').create(payload);
      onSupplierAdded(created as Supplier);
      toast.success('Supplier berhasil ditambahkan');
      setOpen(false);
      setFormData({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        category: 'bahan_baku',
        npwp: '',
        notes: '',
        is_active: true,
      });
    } catch (error: any) {
      console.error('[v0] Add supplier error:', error);
      toast.error(getPocketBaseErrorMessage(error, 'Gagal menambahkan supplier'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={18} className="mr-2" />
          Tambah Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Tambah Supplier</DialogTitle>
          <DialogDescription className="text-slate-400">
            Tambahkan pemasok baru untuk bahan baku atau kebutuhan lainnya.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nama Supplier *
            </label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              placeholder="Contoh: Toko Sumber Bahan Segar"
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Kontak
              </label>
              <Input
                value={formData.contact_person}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contact_person: e.target.value,
                  })
                }
                placeholder="Nama PIC"
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Telepon *
              </label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: e.target.value,
                  })
                }
                placeholder="08xxxxxxxxxx"
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  })
                }
                placeholder="email@contoh.com"
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Kategori
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as Supplier['category'],
                  })
                }
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
              >
                <option value="bahan_baku">Bahan baku</option>
                <option value="peralatan">Peralatan</option>
                <option value="packaging">Packaging</option>
                <option value="jasa">Jasa</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Alamat
            </label>
            <Input
              value={formData.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: e.target.value,
                })
              }
              placeholder="Alamat lengkap pemasok"
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                NPWP
              </label>
              <Input
                value={formData.npwp}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    npwp: e.target.value,
                  })
                }
                placeholder="Opsional"
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_active: e.target.value === 'active',
                  })
                }
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Tidak aktif</option>
              </select>
            </div>
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
              {loading ? 'Menyimpan...' : 'Simpan Supplier'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

