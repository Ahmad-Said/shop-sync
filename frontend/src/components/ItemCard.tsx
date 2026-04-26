import { useState } from 'react';
import { CheckCircle2, Circle, ShoppingCart, Search, Trash2, MoreVertical, User, ChevronDown, Pencil, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Item, ItemStatus, Member } from '../types';
import { offlineClaim, offlineUnclaim, offlineUpdateStatus, offlineUpdateRequestedFor, offlineDeleteItem } from '../api/offlineClient';
import ConfirmModal from './ConfirmModal';
import EditItemModal from './EditItemModal';

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
  members: Member[];
  currentUserId: string;
  eventCreatorId?: string;
  onUpdated: (item: Item) => void;
  onDeleted: (id: string) => void;
}

export default function ItemCard({ item, members, currentUserId, eventCreatorId, onUpdated, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showForMenu, setShowForMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const isMyCartItem = item.assigned_to === currentUserId;
  const isClaimed = !!item.assigned_to;
  const isCreator = item.added_by === currentUserId;
  const isDone = item.status === 'in_cart';

  const requestedForName = item.requested_for_username;
  const requestedForColor = item.requested_for_color;
  const isForMe = item.requested_for === currentUserId || (!item.requested_for && item.added_by === currentUserId);

  async function handleClaim() {
    if (loading || item._pending) return;
    setLoading(true);
    try {
      if (isMyCartItem) {
        const updated = await offlineUnclaim(item);
        onUpdated(updated);
        toast('Item released', { icon: '↩️' });
      } else {
        const updated = await offlineClaim(item);
        onUpdated(updated);
        toast.success('Item claimed!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusAdvance() {
    if (!isMyCartItem || loading || item._pending) return;
    const currentIdx = STATUS_ORDER.indexOf(item.status);
    const next = STATUS_ORDER[Math.min(currentIdx + 1, STATUS_ORDER.length - 1)];
    if (next === item.status) return;
    setLoading(true);
    try {
      const updated = await offlineUpdateStatus(item, next);
      onUpdated(updated);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleReassign(memberId: string) {
    setShowForMenu(false);
    if (memberId === item.requested_for || item._pending) return;
    setLoading(true);
    try {
      const updated = await offlineUpdateRequestedFor(item, memberId);
      onUpdated(updated);
      toast.success('Reassigned');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  const canEdit = isCreator || eventCreatorId === currentUserId;

  async function handleDelete() {
    setLoading(true);
    try {
      await offlineDeleteItem(item);
      onDeleted(item.id);
      toast('Item removed');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div
      className={`item-card glass rounded-xl p-3.5 status-${item.status} relative`}
      style={{
        opacity: isDone ? 0.65 : 1,
        zIndex: showMenu || showForMenu ? 50 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Claim button */}
        <button
          onClick={handleClaim}
          disabled={loading || (isClaimed && !isMyCartItem)}
          className="mt-0.5 flex-shrink-0 transition-all duration-150 disabled:cursor-not-allowed"
          style={{
            color: isClaimed
              ? isMyCartItem ? 'var(--neon)' : 'var(--muted)'
              : 'var(--muted)',
            opacity: (isClaimed && !isMyCartItem) ? 0.4 : 1,
          }}
          title={isMyCartItem ? 'Release item' : isClaimed ? 'Picked up by ' + item.assigned_username : 'Pick up this item'}
        >
          {loading ? (
            <div className="spinner" style={{ width: 16, height: 16 }} />
          ) : isDone ? (
            <CheckCircle2 size={18} color="var(--neon)" />
          ) : isClaimed && isMyCartItem ? (
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
              {/* Name + qty */}
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
                {item._pending && (
                  <span
                    className="ml-2 inline-flex items-center gap-0.5 text-xs font-display font-600 px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', verticalAlign: 'middle' }}
                    title="Pending sync"
                  >
                    <Clock size={9} />
                    pending
                  </span>
                )}
              </p>

              {/* For whom */}
              {members.length > 1 && (
                <div className="relative flex items-center gap-1 mt-0.5">
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>for</span>
                  {isCreator ? (
                    <button
                      onClick={() => setShowForMenu(!showForMenu)}
                      className="flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors"
                      style={{
                        background: showForMenu ? 'var(--surface-2)' : 'transparent',
                        color: isForMe ? 'var(--neon)' : 'var(--text)',
                        fontSize: 11,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: requestedForColor || 'var(--muted)' }}
                      />
                      {isForMe ? 'me' : requestedForName || '—'}
                      <ChevronDown size={9} style={{ opacity: 0.6 }} />
                    </button>
                  ) : (
                    <span className="flex items-center gap-1" style={{ fontSize: 11, color: isForMe ? 'var(--neon)' : 'var(--text)' }}>
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: requestedForColor || 'var(--muted)' }}
                      />
                      {isForMe ? 'me' : requestedForName || '—'}
                    </span>
                  )}

                  {showForMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowForMenu(false)} />
                      <div
                        className="absolute left-0 top-6 z-20 rounded-xl overflow-hidden shadow-xl"
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          minWidth: 160,
                        }}
                      >
                        {members.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => handleReassign(member.id)}
                            className="w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors hover:bg-white/5"
                            style={{
                              fontSize: 13,
                              color: member.id === item.requested_for ? 'var(--neon)' : 'var(--text)',
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: member.avatar_color }}
                            />
                            {member.username}
                            {member.id === currentUserId && (
                              <span style={{ color: 'var(--muted)', fontSize: 11 }}>(me)</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Status + category + claimer */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.category && (
                  <span className="category-chip">{item.category}</span>
                )}
                <span className={`badge badge-${item.status}`}>
                  {STATUS_ICONS[item.status]}
                  {STATUS_LABELS[item.status]}
                </span>
                {item.assigned_username && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: item.assigned_color || 'var(--muted)' }}
                    />
                    {item.assigned_username}
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
              {isMyCartItem && item.status !== 'in_cart' && (
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
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div
                    className="absolute right-0 top-6 z-20 rounded-xl overflow-hidden shadow-xl"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      minWidth: 140,
                    }}
                  >
                    {isMyCartItem && item.status !== 'in_cart' && (
                      <button
                        onClick={() => { handleStatusAdvance(); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-white/5"
                        style={{ color: 'var(--text)' }}
                      >
                        <ShoppingCart size={13} />
                        Advance status
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => { setShowMenu(false); setShowEdit(true); }}
                        className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-white/5"
                        style={{ color: 'var(--text)' }}
                      >
                        <Pencil size={13} />
                        Edit item
                      </button>
                    )}
                    <button
                      onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
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

      {showEdit && (
        <EditItemModal item={item} onUpdated={onUpdated} onClose={() => setShowEdit(false)} />
      )}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete item?"
          message={`Remove \"${item.name}\" from this trip? This cannot be undone.`}
          confirmText="Delete"
          loading={loading}
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
