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
import { Ingredient, Supplier } from '@/lib/types';
import { formatCurrency, getPocketBaseErrorMessage } from '@/lib/api';

interface AddIngredientDialogProps {
  pb: any;
  suppliers: Supplier[];
  onIngredientAdded: (ingredient: Ingredient) => void;
}

export function AddIngredientDialog({ pb, suppliers, onIngredientAdded }: AddIngredientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg' as Ingredient['unit'],
    current_stock: 0,
    min_stock: 0,
    last_price: 0,
    supplier_id: '',
    category: 'lainnya' as Ingredient['category'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nama bahan baku wajib diisi');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        name: formData.name,
        unit: formData.unit,
        current_stock: formData.current_stock,
        is_active: true,
        category: formData.category,
      };

      if (formData.min_stock > 0) {
        payload.min_stock = formData.min_stock;
      }
      if (formData.last_price > 0) {
        payload.last_price = formData.last_price;
      }
      if (formData.supplier_id) {
        payload.supplier_id = formData.supplier_id;
      }

      const newIngredient = await pb.collection('ingredients').create(payload);
      onIngredientAdded(newIngredient);
      toast.success('Bahan baku berhasil ditambahkan');
      setOpen(false);
      setFormData({
        name: '',
        unit: 'kg',
        current_stock: 0,
        min_stock: 0,
        last_price: 0,
        supplier_id: '',
        category: 'lainnya',
      });
    } catch (error: any) {
      toast.error(getPocketBaseErrorMessage(error, 'Gagal menambahkan bahan baku'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={18} className="mr-2" />
          Tambah Bahan Baku
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Tambah Bahan Baku Baru</DialogTitle>
          <DialogDescription className="text-slate-400">
            Buat data bahan baku untuk kebutuhan stok & pembelian.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nama Bahan *
            </label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Satuan
              </label>
              <select
                value={formData.unit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unit: e.target.value as Ingredient['unit'],
                  })
                }
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
              >
                <option value="kg">kg</option>
                <option value="gram">gram</option>
                <option value="liter">liter</option>
                <option value="ml">ml</option>
                <option value="pcs">pcs</option>
                <option value="pack">pack</option>
                <option value="ikat">ikat</option>
                <option value="buah">buah</option>
                <option value="lembar">lembar</option>
              </select>
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
                    category: e.target.value as Ingredient['category'],
                  })
                }
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
              >
                <option value="sayuran">sayuran</option>
                <option value="daging">daging</option>
                <option value="bumbu">bumbu</option>
                <option value="minyak">minyak</option>
                <option value="tepung">tepung</option>
                <option value="minuman">minuman</option>
                <option value="packaging">packaging</option>
                <option value="lainnya">lainnya</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Stok Saat Ini
              </label>
              <Input
                type="number"
                min={0}
                value={formData.current_stock}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_stock: Number(e.target.value) || 0,
                  })
                }
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Stok Minimum
              </label>
              <Input
                type="number"
                min={0}
                value={formData.min_stock}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    min_stock: Number(e.target.value) || 0,
                  })
                }
                disabled={loading}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Harga Terakhir
            </label>
            <Input
              type="number"
              min={0}
              value={formData.last_price}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  last_price: Number(e.target.value) || 0,
                })
              }
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <p className="mt-1 text-xs text-slate-500">
              {formatCurrency(formData.last_price || 0)}
            </p>
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
              disabled={loading}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm"
            >
              <option value="">Tanpa supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
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
              {loading ? 'Menyimpan...' : 'Simpan Bahan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

