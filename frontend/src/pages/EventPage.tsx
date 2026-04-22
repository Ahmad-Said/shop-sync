import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, Plus, Package,
  CheckCircle2, ShoppingCart, Search, Circle, Store, MoreVertical, Pencil, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsApi } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useSocket } from '../hooks/useSocket';
import { EventDetail, Item, Member, ItemStatus } from '../types';
import ItemCard from '../components/ItemCard';
import AddItemForm from '../components/AddItemForm';
import MemberPresence from '../components/MemberPresence';
import InviteModal from '../components/InviteModal';
import ConfirmModal from '../components/ConfirmModal';
import EditEventModal from '../components/EditEventModal';

type FilterStatus = 'all' | ItemStatus;

const STATUS_TABS: { key: FilterStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Package size={13} /> },
  { key: 'unassigned', label: 'Open', icon: <Circle size={13} /> },
  { key: 'claimed', label: 'Claimed', icon: <Search size={13} /> },
  { key: 'found', label: 'Found', icon: <Search size={13} /> },
  { key: 'in_cart', label: 'Done', icon: <CheckCircle2 size={13} /> },
];

function itemRequestedFor(item: Item): string {
  return item.requested_for ?? item.added_by;
}

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [personFilter, setPersonFilter] = useState<'all' | string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showTripMenu, setShowTripMenu] = useState(false);
  const [showDeleteTrip, setShowDeleteTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!id) return;
    eventsApi.get(id)
      .then((r) => setEvent(r.data))
      .catch(() => { toast.error('Trip not found'); navigate('/'); })
      .finally(() => setLoading(false));
  }, [id]);

  useSocket(id || null, {
    onItemAdded: (item) => {
      setEvent((prev) => {
        if (!prev) return prev;
        if (prev.items.find((i) => i.id === item.id)) return prev;
        return { ...prev, items: [...prev.items, item] };
      });
    },
    onItemUpdated: (item) => {
      setEvent((prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.map((i) => i.id === item.id ? item : i) };
      });
    },
    onItemDeleted: ({ id: itemId }) => {
      setEvent((prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.filter((i) => i.id !== itemId) };
      });
    },
    onPresenceUpdate: (members) => setOnlineMembers(members),
    onEventUpdated: (updated) => {
      if (updated.id !== id) return;
      setEvent((prev) => (prev ? { ...prev, ...updated } : prev));
    },
    onEventDeleted: ({ id: deletedId }) => {
      if (deletedId !== id) return;
      if (deletingTrip) return;
      toast('This trip was deleted', { icon: '🗑️' });
      navigate('/');
    },
  });

  function handleItemAdded(item: Item) {
    setEvent((prev) => {
      if (!prev) return prev;
      if (prev.items.find((i) => i.id === item.id)) return prev;
      return { ...prev, items: [...prev.items, item] };
    });
  }

  function handleItemUpdated(item: Item) {
    setEvent((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.map((i) => i.id === item.id ? item : i) };
    });
  }

  function handleItemDeleted(itemId: string) {
    setEvent((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter((i) => i.id !== itemId) };
    });
  }

  async function handleDeleteTrip() {
    if (!event) return;
    setDeletingTrip(true);
    try {
      await eventsApi.delete(event.id);
      toast.success('Trip deleted');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete trip');
    } finally {
      setDeletingTrip(false);
      setShowDeleteTrip(false);
    }
  }

  const filteredItems = useMemo(() => {
    if (!event) return [];
    let items = event.items;
    if (statusFilter !== 'all') items = items.filter((i) => i.status === statusFilter);
    if (personFilter !== 'all') items = items.filter((i) => itemRequestedFor(i) === personFilter);
    return items;
  }, [event?.items, statusFilter, personFilter]);

  const stats = useMemo(() => {
    if (!event) return { total: 0, done: 0, claimed: 0, pct: 0 };
    const total = event.items.length;
    const done = event.items.filter((i) => i.status === 'in_cart').length;
    const claimed = event.items.filter((i) => i.status !== 'unassigned').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, claimed, pct };
  }, [event?.items]);

  const onlineIds = useMemo(() => onlineMembers.map((m) => m.id), [onlineMembers]);

  const showPersonFilter = (event?.members.length ?? 0) > 1;

  // Current user's section first, then others in join order
  const orderedMembers = useMemo(() => {
    if (!event) return [];
    return [...event.members].sort((a, b) => {
      if (a.id === user?.id) return -1;
      if (b.id === user?.id) return 1;
      return 0;
    });
  }, [event?.members, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  if (!event) return null;

  const groupByPerson = statusFilter === 'all' && personFilter === 'all' && showPersonFilter;
  const canManageTrip = event.creator_id === user?.id;

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{ background: 'rgba(12,12,15,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl transition-colors"
            style={{ background: 'var(--surface)', color: 'var(--muted)' }}
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-display font-800 text-base leading-tight truncate">{event.name}</h1>
            {event.store_name && (
              <div className="flex items-center gap-1 mt-0.5">
                <Store size={11} style={{ color: 'var(--neon)' }} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{event.store_name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInvite(true)}
              className="p-2 rounded-xl transition-colors"
              style={{ background: 'var(--surface)', color: 'var(--muted)' }}
              title="Invite members"
            >
              <UserPlus size={16} />
            </button>
            {canManageTrip && (
              <div className="relative">
                <button
                  onClick={() => setShowTripMenu((prev) => !prev)}
                  className="p-2 rounded-xl transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--muted)' }}
                  title="Trip actions"
                >
                  <MoreVertical size={16} />
                </button>
                {showTripMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowTripMenu(false)} />
                    <div
                      className="absolute right-0 top-11 z-20 rounded-xl overflow-hidden shadow-xl"
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        minWidth: 150,
                      }}
                    >
                      <button
                        onClick={() => { setShowTripMenu(false); setShowEditTrip(true); }}
                        className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-white/5"
                        style={{ color: 'var(--text)' }}
                      >
                        <Pencil size={13} />
                        Edit trip
                      </button>
                      <button
                        onClick={() => { setShowTripMenu(false); setShowDeleteTrip(true); }}
                        className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-white/5"
                        style={{ color: 'var(--coral)' }}
                      >
                        <Trash2 size={13} />
                        Delete trip
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress + presence */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex-1">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${stats.pct}%` }} />
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              <span style={{ color: 'var(--neon)' }}>{stats.done}</span>/{stats.total} in cart
              {stats.claimed > stats.done && (
                <span>· {stats.claimed - stats.done} in progress</span>
              )}
            </div>
          </div>
          <MemberPresence members={event.members} onlineIds={onlineIds} />
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 no-scrollbar">
          {STATUS_TABS.map((tab) => {
            const base = personFilter === 'all' ? event.items : event.items.filter((i) => itemRequestedFor(i) === personFilter);
            const count = tab.key === 'all' ? base.length : base.filter((i) => i.status === tab.key).length;
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  background: isActive ? 'rgba(0,245,160,0.12)' : 'var(--surface)',
                  color: isActive ? 'var(--neon)' : 'var(--muted)',
                  border: `1px solid ${isActive ? 'rgba(0,245,160,0.25)' : 'var(--border)'}`,
                  fontSize: 12,
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 600,
                }}
              >
                {tab.icon}
                {tab.label}
                {count > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 font-mono"
                    style={{
                      background: isActive ? 'rgba(0,245,160,0.2)' : 'var(--border)',
                      fontSize: 10,
                      minWidth: 18,
                      textAlign: 'center',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Person filter chips — only when multiple members */}
        {showPersonFilter && (
          <div className="flex gap-1.5 overflow-x-auto pt-1.5 pb-0.5 -mx-1 px-1 no-scrollbar">
            <button
              onClick={() => setPersonFilter('all')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: personFilter === 'all' ? 'rgba(167,139,250,0.15)' : 'var(--surface)',
                color: personFilter === 'all' ? '#C4B5FD' : 'var(--muted)',
                border: `1px solid ${personFilter === 'all' ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`,
                fontSize: 12,
                fontFamily: 'Syne, sans-serif',
                fontWeight: 600,
              }}
            >
              Everyone
            </button>
            {event.members.map((member) => {
              const base = statusFilter === 'all' ? event.items : event.items.filter((i) => i.status === statusFilter);
              const count = base.filter((i) => itemRequestedFor(i) === member.id).length;
              const isActive = personFilter === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => setPersonFilter(isActive ? 'all' : member.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex-shrink-0"
                  style={{
                    background: isActive ? 'rgba(167,139,250,0.15)' : 'var(--surface)',
                    color: isActive ? '#C4B5FD' : 'var(--muted)',
                    border: `1px solid ${isActive ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`,
                    fontSize: 12,
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: member.avatar_color }}
                  />
                  {member.id === user?.id ? 'Mine' : member.username}
                  {count > 0 && (
                    <span
                      className="rounded-full px-1.5 py-0.5 font-mono"
                      style={{
                        background: isActive ? 'rgba(167,139,250,0.25)' : 'var(--border)',
                        fontSize: 10,
                        minWidth: 18,
                        textAlign: 'center',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 space-y-2.5 pb-32">
        {showAdd && (
          <AddItemForm
            eventId={event.id}
            members={event.members}
            currentUserId={user!.id}
            onAdded={(item) => { handleItemAdded(item); }}
            onClose={() => setShowAdd(false)}
          />
        )}

        {filteredItems.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}
          >
            {statusFilter === 'all' && personFilter === 'all' ? (
              <>
                <ShoppingCart size={28} style={{ color: 'var(--muted)', margin: '0 auto 12px' }} />
                <p className="font-display font-600 text-sm mb-1">Empty list</p>
                <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                  Add items your group needs to buy
                </p>
                <button
                  onClick={() => setShowAdd(true)}
                  className="btn-neon px-4 py-2 rounded-xl text-sm inline-flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add First Item
                </button>
              </>
            ) : (
              <p className="font-display font-600 text-sm" style={{ color: 'var(--muted)' }}>
                No items
              </p>
            )}
          </div>
        ) : groupByPerson ? (
          /* Group by person when viewing all statuses + all persons */
          <>
            {orderedMembers.map((member) => {
              const memberItems = filteredItems.filter((i) => itemRequestedFor(i) === member.id);
              if (memberItems.length === 0) return null;
              const isMe = member.id === user?.id;
              return (
                <div key={member.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: member.avatar_color }}
                    />
                    <p
                      className="text-xs font-display font-600"
                      style={{ color: isMe ? 'var(--neon)' : 'var(--muted)' }}
                    >
                      {isMe ? 'MY LIST' : member.username.toUpperCase()} ({memberItems.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {memberItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        members={event.members}
                        currentUserId={user!.id}
                        eventCreatorId={event.creator_id}
                        onUpdated={handleItemUpdated}
                        onDeleted={handleItemDeleted}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {/* Items with no member match (shouldn't happen but safety net) */}
            {(() => {
              const memberIds = event.members.map((m) => m.id);
              const orphaned = filteredItems.filter((i) => !memberIds.includes(itemRequestedFor(i)));
              if (orphaned.length === 0) return null;
              return (
                <div>
                  <p className="text-xs font-display font-600 mb-2" style={{ color: 'var(--muted)' }}>
                    OTHER ({orphaned.length})
                  </p>
                  <div className="space-y-2">
                    {orphaned.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        members={event.members}
                        currentUserId={user!.id}
                        eventCreatorId={event.creator_id}
                        onUpdated={handleItemUpdated}
                        onDeleted={handleItemDeleted}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          /* Flat list for status-filtered or person-filtered views */
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                members={event.members}
                currentUserId={user!.id}
                eventCreatorId={event.creator_id}
                onUpdated={handleItemUpdated}
                onDeleted={handleItemDeleted}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating add button */}
      {!showAdd && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setShowAdd(true)}
            className="btn-neon px-6 py-3.5 rounded-2xl flex items-center gap-2 font-display font-700 text-sm shadow-2xl"
            style={{ boxShadow: '0 8px 32px rgba(0, 245, 160, 0.35)' }}
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Item
          </button>
        </div>
      )}

      {showInvite && (
        <InviteModal
          inviteCode={event.invite_code}
          eventName={event.name}
          onClose={() => setShowInvite(false)}
        />
      )}
      {showEditTrip && (
        <EditEventModal
          event={event}
          onUpdated={(updated) => setEvent((prev) => (prev ? { ...prev, ...updated } : prev))}
          onClose={() => setShowEditTrip(false)}
        />
      )}
      {showDeleteTrip && (
        <ConfirmModal
          title="Delete trip?"
          message={`Delete \"${event.name}\" and all items in this list? This cannot be undone.`}
          confirmText="Delete"
          loading={deletingTrip}
          onConfirm={handleDeleteTrip}
          onClose={() => setShowDeleteTrip(false)}
        />
      )}
    </div>
  );
}
