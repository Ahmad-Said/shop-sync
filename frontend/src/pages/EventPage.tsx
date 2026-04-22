import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, Plus, Package,
  CheckCircle2, ShoppingCart, Search, Circle, Store
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

type FilterStatus = 'all' | ItemStatus;

const FILTER_TABS: { key: FilterStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Package size={13} /> },
  { key: 'unassigned', label: 'Open', icon: <Circle size={13} /> },
  { key: 'claimed', label: 'Claimed', icon: <Search size={13} /> },
  { key: 'found', label: 'Found', icon: <Search size={13} /> },
  { key: 'in_cart', label: 'Done', icon: <CheckCircle2 size={13} /> },
];

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!id) return;
    eventsApi.get(id)
      .then((r) => setEvent(r.data))
      .catch(() => { toast.error('Trip not found'); navigate('/'); })
      .finally(() => setLoading(false));
  }, [id]);

  // Real-time socket
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
        return {
          ...prev,
          items: prev.items.map((i) => i.id === item.id ? item : i),
        };
      });
    },
    onItemDeleted: ({ id: itemId }) => {
      setEvent((prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.filter((i) => i.id !== itemId) };
      });
    },
    onPresenceUpdate: (members) => {
      setOnlineMembers(members);
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

  const filteredItems = useMemo(() => {
    if (!event) return [];
    const items = filter === 'all'
      ? event.items
      : event.items.filter((i) => i.status === filter);
    return items;
  }, [event?.items, filter]);

  const stats = useMemo(() => {
    if (!event) return { total: 0, done: 0, claimed: 0, pct: 0 };
    const total = event.items.length;
    const done = event.items.filter((i) => i.status === 'in_cart').length;
    const claimed = event.items.filter((i) => i.status !== 'unassigned').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, claimed, pct };
  }, [event?.items]);

  const onlineIds = useMemo(() => onlineMembers.map((m) => m.id), [onlineMembers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  if (!event) return null;

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

          <button
            onClick={() => setShowInvite(true)}
            className="p-2 rounded-xl transition-colors"
            style={{ background: 'var(--surface)', color: 'var(--muted)' }}
            title="Invite members"
          >
            <UserPlus size={16} />
          </button>
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
          <MemberPresence
            members={event.members}
            onlineIds={onlineIds}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 no-scrollbar">
          {FILTER_TABS.map((tab) => {
            const count = tab.key === 'all'
              ? event.items.length
              : event.items.filter((i) => i.status === tab.key).length;
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
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
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 space-y-2.5 pb-32">
        {/* Add item form */}
        {showAdd && (
          <AddItemForm
            eventId={event.id}
            onAdded={(item) => { handleItemAdded(item); }}
            onClose={() => setShowAdd(false)}
          />
        )}

        {filteredItems.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}
          >
            {filter === 'all' ? (
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
              <>
                <p className="font-display font-600 text-sm" style={{ color: 'var(--muted)' }}>
                  No {FILTER_TABS.find(t => t.key === filter)?.label.toLowerCase()} items
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* My items section */}
            {filter === 'all' && (() => {
              const mine = filteredItems.filter((i) => i.assigned_to === user?.id);
              const others = filteredItems.filter((i) => i.assigned_to !== user?.id);
              return (
                <>
                  {mine.length > 0 && (
                    <div>
                      <p className="text-xs font-display font-600 mb-2" style={{ color: 'var(--neon)' }}>
                        MY ITEMS ({mine.length})
                      </p>
                      <div className="space-y-2">
                        {mine.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            currentUserId={user!.id}
                            onUpdated={handleItemUpdated}
                            onDeleted={handleItemDeleted}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {others.length > 0 && (
                    <div>
                      {mine.length > 0 && (
                        <p className="text-xs font-display font-600 mb-2 mt-4" style={{ color: 'var(--muted)' }}>
                          ALL ITEMS ({others.length})
                        </p>
                      )}
                      <div className="space-y-2">
                        {others.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            currentUserId={user!.id}
                            onUpdated={handleItemUpdated}
                            onDeleted={handleItemDeleted}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {filter !== 'all' && (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    currentUserId={user!.id}
                    onUpdated={handleItemUpdated}
                    onDeleted={handleItemDeleted}
                  />
                ))}
              </div>
            )}
          </>
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
    </div>
  );
}
