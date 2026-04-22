import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, ShoppingCart, LogOut, Store, Users, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsApi } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { Event } from '../types';
import CreateEventModal from '../components/CreateEventModal';
import JoinEventModal from '../components/JoinEventModal';

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    eventsApi.list()
      .then((r) => setEvents(r.data))
      .catch(() => toast.error('Failed to load trips'))
      .finally(() => setLoading(false));
  }, []);

  function handleCreated(event: Event) {
    setEvents((prev) => [event, ...prev]);
    setShowCreate(false);
    navigate(`/events/${event.id}`);
  }

  function handleJoined(event: Event) {
    setEvents((prev) => {
      if (prev.find((e) => e.id === event.id)) return prev;
      return [event, ...prev];
    });
    setShowJoin(false);
    navigate(`/events/${event.id}`);
  }

  const now = new Date();

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 page-enter">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00F5A0, #00CCFF)' }}
          >
            <ShoppingCart size={17} color="#0C0C0F" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display font-800 text-lg leading-none">ShopSync</h1>
            <p className="text-xs leading-none mt-0.5" style={{ color: 'var(--muted)' }}>
              Hey, {user?.username}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="avatar"
            style={{ background: user?.avatar_color || '#00F5A0', width: 34, height: 34, fontSize: 12 }}
          >
            {user?.username?.slice(0, 2).toUpperCase()}
          </div>
          <button
            onClick={() => { clearAuth(); navigate('/auth'); }}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--muted)', background: 'var(--surface)' }}
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-8 page-enter" style={{ animationDelay: '0.05s' }}>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-neon py-4 rounded-2xl flex flex-col items-center gap-2 text-sm"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>New Trip</span>
        </button>
        <button
          onClick={() => setShowJoin(true)}
          className="py-4 rounded-2xl flex flex-col items-center gap-2 text-sm transition-all"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--amber)',
          }}
        >
          <LogIn size={20} strokeWidth={2} />
          <span style={{ color: 'var(--text)' }}>Join Trip</span>
        </button>
      </div>

      {/* Trips list */}
      <div className="page-enter" style={{ animationDelay: '0.1s' }}>
        <h2 className="font-display font-700 text-xs mb-3" style={{ color: 'var(--muted)' }}>
          YOUR TRIPS
        </h2>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="spinner" />
          </div>
        ) : events.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'var(--surface)', border: '1px dashed var(--border)' }}
          >
            <ShoppingCart size={28} style={{ color: 'var(--muted)', margin: '0 auto 12px' }} />
            <p className="font-display font-600 text-sm mb-1">No trips yet</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Create or join a shopping trip to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, i) => {
              const progress = event.item_count > 0
                ? Math.round((event.items_done / event.item_count) * 100)
                : 0;

              return (
                <button
                  key={event.id}
                  onClick={() => navigate(`/events/${event.id}`)}
                  className="glass w-full rounded-2xl p-4 text-left transition-all hover:border-white/10 item-card"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {event.store_name && (
                          <Store size={12} style={{ color: 'var(--neon)', flexShrink: 0 }} />
                        )}
                        <h3 className="font-display font-700 text-sm truncate">{event.name}</h3>
                      </div>
                      {event.store_name && (
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {event.store_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                        {new Date(event.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs mb-3" style={{ color: 'var(--muted)' }}>
                    <span className="flex items-center gap-1">
                      <Users size={11} />
                      {event.member_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package size={11} />
                      {event.item_count} items
                    </span>
                    {event.item_count > 0 && (
                      <span style={{ color: 'var(--neon)' }}>
                        {event.items_done}/{event.item_count} done
                      </span>
                    )}
                  </div>

                  {event.item_count > 0 && (
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateEventModal onCreated={handleCreated} onClose={() => setShowCreate(false)} />
      )}
      {showJoin && (
        <JoinEventModal onJoined={handleJoined} onClose={() => setShowJoin(false)} />
      )}
    </div>
  );
}
