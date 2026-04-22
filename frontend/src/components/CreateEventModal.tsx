import { useState } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsApi } from '../api/client';
import { Event } from '../types';

const STORES = ['Lidl', 'Action', 'Albert Heijn', 'Jumbo', 'ALDI', 'Carrefour', 'Tesco', 'Other'];

interface Props {
  onCreated: (event: Event) => void;
  onClose: () => void;
}

export default function CreateEventModal({ onCreated, onClose }: Props) {
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await eventsApi.create({ name: name.trim(), store_name: storeName.trim() || undefined });
      onCreated(res.data);
      toast.success('Trip created!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 modal-backdrop">
      <div
        className="glass w-full max-w-sm rounded-2xl p-6 page-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ShoppingBag size={17} style={{ color: 'var(--neon)' }} />
            <h2 className="font-display font-700 text-base">New Shopping Trip</h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-600 mb-1.5" style={{ color: 'var(--muted)' }}>
              TRIP NAME
            </label>
            <input
              className="input-dark"
              placeholder="e.g. Saturday Lidl Run"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-600 mb-2" style={{ color: 'var(--muted)' }}>
              STORE (OPTIONAL)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {STORES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStoreName(storeName === s ? '' : s)}
                  className="px-2.5 py-1 rounded-lg text-xs font-500 transition-all"
                  style={{
                    background: storeName === s ? 'rgba(0,245,160,0.12)' : 'var(--surface-2)',
                    color: storeName === s ? 'var(--neon)' : 'var(--muted)',
                    border: `1px solid ${storeName === s ? 'rgba(0,245,160,0.25)' : 'var(--border)'}`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              className="input-dark"
              placeholder="Or type store name…"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              maxLength={255}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-neon w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-40"
          >
            {loading ? (
              <div className="spinner" style={{ borderTopColor: '#0C0C0F', borderColor: 'rgba(12,12,15,0.3)' }} />
            ) : (
              'Create Trip'
            )}
          </button>
        </form>
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
