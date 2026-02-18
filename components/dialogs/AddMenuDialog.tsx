import { useState, useEffect } from 'react';
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
import { MenuItem, MenuCategory } from '@/lib/types';

interface AddMenuDialogProps {
  pb: any;
  categories: MenuCategory[];
  onMenuAdded: (menu: MenuItem) => void;
}

export function AddMenuDialog({ pb, categories, onMenuAdded }: AddMenuDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    sku: '',
    description: '',
    price: 0,
    unit: 'porsi',
    min_order: 1,
    is_active: true,
  });

  useEffect(() => {
    if (categories.length > 0 && !formData.category_id) {
      setFormData((prev) => ({ ...prev, category_id: categories[0].id }));
    }
  }, [categories, formData.category_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.category_id) {
      toast.error('Nama dan kategori wajib diisi');
      return;
    }

    if (formData.price <= 0) {
      toast.error('Harga harus lebih besar dari 0');
      return;
    }

    try {
      setLoading(true);
      const newMenu = await pb.collection('menus').create({
        name: formData.name,
        category_id: formData.category_id,
        sku: formData.sku,
        description: formData.description,
        price: formData.price,
        unit: formData.unit,
        min_order: formData.min_order,
        is_active: formData.is_active,
      });

      onMenuAdded(newMenu);
      toast.success('Menu berhasil ditambahkan');
      setOpen(false);
      setFormData({
        name: '',
        category_id: categories[0]?.id || '',
        sku: '',
        description: '',
        price: 0,
        unit: 'porsi',
        min_order: 1,
        is_active: true,
      });
    } catch (error: any) {
      console.error('[v0] Add menu error:', error);
      toast.error(error.message || 'Gagal menambahkan menu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={18} className="mr-2" />
          Tambah Menu
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Menu Item</DialogTitle>
          <DialogDescription className="text-slate-400">
            Buat menu atau paket baru untuk usaha katering Anda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nama Menu *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Nasi Goreng Spesial"
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Category *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                disabled={loading || categories.length === 0}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
              >
                {categories.length === 0 ? (
                  <option>Tidak ada kategori</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Satuan
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
              >
                <option value="porsi">Porsi</option>
                <option value="box">Box</option>
                <option value="pax">Pax</option>
                <option value="paket">Paket</option>
                <option value="loyang">Loyang</option>
                <option value="kg">Kg</option>
                <option value="liter">Liter</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              SKU
            </label>
            <Input
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g., NASI-GORENG-001"
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Deskripsi
            </label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Menu description..."
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
              Harga (Rp) *
              </label>
              <Input
                type="number"
                min="1"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                placeholder="50000"
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
              Min Order
              </label>
              <Input
                type="number"
                min="1"
                value={formData.min_order}
                onChange={(e) => setFormData({ ...formData, min_order: parseInt(e.target.value) || 1 })}
                placeholder="1"
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Status
            </label>
            <select
              value={formData.is_active ? 'active' : 'inactive'}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
              disabled={loading}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
              {loading ? 'Menyimpan...' : 'Simpan Menu'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
