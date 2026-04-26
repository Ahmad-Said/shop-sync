import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { offlineAddItem } from '../api/offlineClient';
import { Item, Member } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Bakery', 'Frozen', 'Beverages', 'Snacks', 'Cleaning', 'Personal Care', 'Other'];

interface Props {
  eventId: string;
  members: Member[];
  currentUserId: string;
  onAdded: (item: Item) => void;
  onClose: () => void;
}

export default function AddItemForm({ eventId, members, currentUserId, onAdded, onClose }: Props) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [requestedFor, setRequestedFor] = useState(currentUserId);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const item = await offlineAddItem(
        {
          event_id: eventId,
          name: name.trim(),
          quantity: parseInt(quantity) || 1,
          unit: unit.trim() || undefined,
          category: category || undefined,
          notes: notes.trim() || undefined,
          requested_for: requestedFor,
        },
        user!,
      );
      onAdded(item);
      if (item._pending) toast('Added offline — will sync when reconnected', { icon: '📶' });
      setName('');
      setQuantity('1');
      setUnit('');
      setCategory('');
      setNotes('');
      setRequestedFor(currentUserId);
      nameRef.current?.focus();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-4" style={{ border: '1px solid rgba(0,245,160,0.2)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-700 text-sm" style={{ color: 'var(--neon)' }}>
          ADD ITEM
        </h3>
        <button onClick={onClose} style={{ color: 'var(--muted)' }}>
          <X size={16} />
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {/* Name */}
        <input
          ref={nameRef}
          className="input-dark text-base"
          placeholder="Item name (e.g. Whole milk)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={255}
        />

        {/* Qty + Unit row */}
        <div className="flex gap-2">
          <input
            className="input-dark w-20"
            type="number"
            min="1"
            max="999"
            placeholder="Qty"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <input
            className="input-dark flex-1"
            placeholder="Unit (kg, L, pcs…)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            maxLength={50}
          />
        </div>

        {/* For whom — only shown when there are multiple members */}
        {members.length > 1 && (
          <div>
            <p className="text-xs font-display font-600 mb-1.5" style={{ color: 'var(--muted)' }}>FOR</p>
            <div className="flex gap-1.5 flex-wrap">
              {members.map((member) => {
                const isSelected = requestedFor === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setRequestedFor(member.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-500 transition-all"
                    style={{
                      background: isSelected ? 'rgba(0,245,160,0.12)' : 'var(--surface-2)',
                      color: isSelected ? 'var(--neon)' : 'var(--muted)',
                      border: `1px solid ${isSelected ? 'rgba(0,245,160,0.25)' : 'var(--border)'}`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: member.avatar_color }}
                    />
                    {member.username}
                    {member.id === currentUserId && (
                      <span style={{ opacity: 0.6 }}>(me)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Category */}
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

        {/* Notes */}
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
          className="btn-neon w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="spinner" style={{ borderTopColor: '#0C0C0F', borderColor: 'rgba(12,12,15,0.3)' }} />
          ) : (
            <>
              <Plus size={15} strokeWidth={2.5} />
              Add to List
            </>
          )}
        </button>
      </form>
    </div>
  );
}
