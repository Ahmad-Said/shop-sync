import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { itemsApi } from '../api/client';
import { Item } from '../types';

const CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Bakery', 'Frozen', 'Beverages', 'Snacks', 'Cleaning', 'Personal Care', 'Other'];

interface Props {
  item: Item;
  onUpdated: (item: Item) => void;
  onClose: () => void;
}

export default function EditItemModal({ item, onUpdated, onClose }: Props) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(String(item.quantity || 1));
  const [unit, setUnit] = useState(item.unit || '');
  const [category, setCategory] = useState(item.category || '');
  const [notes, setNotes] = useState(item.notes || '');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await itemsApi.update(item.id, {
        name: name.trim(),
        quantity: parseInt(quantity, 10) || 1,
        unit: unit.trim() || undefined,
        category: category || undefined,
        notes: notes.trim() || undefined,
      });
      onUpdated(res.data);
      toast.success('Item updated');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update item');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 modal-backdrop">
      <div className="glass w-full max-w-sm rounded-2xl p-6 page-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Pencil size={17} style={{ color: 'var(--neon)' }} />
            <h2 className="font-display font-700 text-base">Edit Item</h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="input-dark"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            autoFocus
          />

          <div className="flex gap-2">
            <input
              className="input-dark w-20"
              type="number"
              min="1"
              max="999"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <input
              className="input-dark flex-1"
              placeholder="Unit (kg, L, pcs...)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(category === cat ? '' : cat)}
                className="px-2.5 py-1 rounded-lg text-xs font-500 transition-all"
                style={{
                  background: category === cat ? 'rgba(167,139,250,0.2)' : 'var(--surface-2)',
                  color: category === cat ? '#C4B5FD' : 'var(--muted)',
                  border: `1px solid ${category === cat ? 'rgba(167,139,250,0.35)' : 'var(--border)'}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <input
            className="input-dark"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-neon w-full py-3 rounded-xl text-sm disabled:opacity-40"
          >
            {loading ? 'Saving...' : 'Save Item'}
          </button>
        </form>
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

