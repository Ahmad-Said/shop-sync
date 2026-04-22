import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsApi } from '../api/client';
import { Event } from '../types';

interface Props {
  event: Event;
  onUpdated: (event: Event) => void;
  onClose: () => void;
}

export default function EditEventModal({ event, onUpdated, onClose }: Props) {
  const [name, setName] = useState(event.name);
  const [storeName, setStoreName] = useState(event.store_name || '');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await eventsApi.update(event.id, {
        name: name.trim(),
        store_name: storeName.trim() || undefined,
      });
      onUpdated(res.data);
      toast.success('Trip updated');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update trip');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 modal-backdrop"
      onClick={onClose}
    >
      <div className="glass w-full max-w-sm rounded-2xl p-6 page-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Pencil size={17} style={{ color: 'var(--neon)' }} />
            <h2 className="font-display font-700 text-base">Edit Trip</h2>
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-600 mb-1.5" style={{ color: 'var(--muted)' }}>
              STORE (OPTIONAL)
            </label>
            <input
              className="input-dark"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              maxLength={255}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-neon w-full py-3 rounded-xl text-sm disabled:opacity-40"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

