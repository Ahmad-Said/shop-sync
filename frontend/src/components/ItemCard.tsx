import { useState } from 'react';
import { CheckCircle2, Circle, ShoppingCart, Search, Trash2, MoreVertical, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { Item, ItemStatus } from '../types';
import { itemsApi } from '../api/client';

const STATUS_ORDER: ItemStatus[] = ['unassigned', 'claimed', 'found', 'in_cart'];

const STATUS_LABELS: Record<ItemStatus, string> = {
  unassigned: 'Available',
  claimed: 'Claimed',
  found: 'Found',
  in_cart: 'In Cart',
};

const STATUS_ICONS: Record<ItemStatus, React.ReactNode> = {
  unassigned: <Circle size={13} />,
  claimed: <User size={13} />,
  found: <Search size={13} />,
  in_cart: <CheckCircle2 size={13} />,
};

interface Props {
  item: Item;
  currentUserId: string;
  onUpdated: (item: Item) => void;
  onDeleted: (id: string) => void;
}

export default function ItemCard({ item, currentUserId, onUpdated, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isMyItem = item.assigned_to === currentUserId;
  const isClaimed = !!item.assigned_to;

  async function handleClaim() {
    if (loading) return;
    setLoading(true);
    try {
      if (isMyItem) {
        const res = await itemsApi.unclaim(item.id);
        onUpdated(res.data);
        toast('Item released', { icon: '↩️' });
      } else {
        const res = await itemsApi.claim(item.id);
        onUpdated(res.data);
        toast.success('Item claimed!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusAdvance() {
    if (!isMyItem || loading) return;
    const currentIdx = STATUS_ORDER.indexOf(item.status);
    const next = STATUS_ORDER[Math.min(currentIdx + 1, STATUS_ORDER.length - 1)];
    if (next === item.status) return;
    setLoading(true);
    try {
      const res = await itemsApi.updateStatus(item.id, next);
      onUpdated(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setShowMenu(false);
    if (!confirm(`Delete "${item.name}"?`)) return;
    setLoading(true);
    try {
      await itemsApi.delete(item.id);
      onDeleted(item.id);
      toast('Item removed');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  }

  const isDone = item.status === 'in_cart';

  return (
    <div
      className={`item-card glass rounded-xl p-3.5 status-${item.status} relative`}
      style={{ opacity: isDone ? 0.65 : 1 }}
    >
      <div className="flex items-start gap-3">
        {/* Claim button */}
        <button
          onClick={handleClaim}
          disabled={loading || (isClaimed && !isMyItem)}
          className="mt-0.5 flex-shrink-0 transition-all duration-150 disabled:cursor-not-allowed"
          style={{
            color: isClaimed
              ? isMyItem ? 'var(--neon)' : 'var(--muted)'
              : 'var(--muted)',
            opacity: (isClaimed && !isMyItem) ? 0.4 : 1,
          }}
          title={isMyItem ? 'Release item' : isClaimed ? 'Claimed by ' + item.assigned_username : 'Claim this item'}
        >
          {loading ? (
            <div className="spinner" style={{ width: 16, height: 16 }} />
          ) : isDone ? (
            <CheckCircle2 size={18} color="var(--neon)" />
          ) : isClaimed && isMyItem ? (
            <CheckCircle2 size={18} />
          ) : isClaimed ? (
            <CheckCircle2 size={18} />
          ) : (
            <Circle size={18} />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p
                className="font-body font-500 leading-snug"
                style={{
                  textDecoration: isDone ? 'line-through' : 'none',
                  color: isDone ? 'var(--muted)' : 'var(--text)',
                }}
              >
                {item.name}
                {item.quantity > 1 && (
                  <span className="ml-2 font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    ×{item.quantity}{item.unit ? ` ${item.unit}` : ''}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.category && (
                  <span className="category-chip">{item.category}</span>
                )}
                <span className={`badge badge-${item.status}`}>
                  {STATUS_ICONS[item.status]}
                  {STATUS_LABELS[item.status]}
                </span>
                {item.assigned_username && (
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    → {item.assigned_username}
                  </span>
                )}
              </div>
              {item.notes && (
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  {item.notes}
                </p>
              )}
            </div>

            {/* Action menu */}
            <div className="relative flex-shrink-0 flex items-center gap-1">
              {/* Advance status button for owner */}
              {isMyItem && item.status !== 'in_cart' && (
                <button
                  onClick={handleStatusAdvance}
                  disabled={loading}
                  className="px-2 py-1 rounded-lg text-xs font-display font-600 transition-all"
                  style={{
                    background: 'rgba(0,245,160,0.1)',
                    color: 'var(--neon)',
                    border: '1px solid rgba(0,245,160,0.2)',
                  }}
                  title="Advance status"
                >
                  {item.status === 'claimed' ? '→ Found' : '→ Cart'}
                </button>
              )}

              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--muted)' }}
              >
                <MoreVertical size={14} />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div
                    className="absolute right-0 top-6 z-20 rounded-xl overflow-hidden shadow-xl"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      minWidth: 140,
                    }}
                  >
                    {isMyItem && item.status !== 'in_cart' && (
                      <button
                        onClick={() => { handleStatusAdvance(); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-white/5"
                        style={{ color: 'var(--text)' }}
                      >
                        <ShoppingCart size={13} />
                        Advance status
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-white/5"
                      style={{ color: 'var(--coral)' }}
                    >
                      <Trash2 size={13} />
                      Delete item
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assigned color strip */}
      {item.assigned_color && (
        <div
          className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
          style={{ background: item.assigned_color }}
          title={item.assigned_username || ''}
        />
      )}
    </div>
  );
}
