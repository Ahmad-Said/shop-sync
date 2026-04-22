import { useState, useRef, useEffect } from 'react';
import { X, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsApi } from '../api/client';
import { Event } from '../types';

interface Props {
  onJoined: (event: Event) => void;
  onClose: () => void;
}

export default function JoinEventModal({ onJoined, onClose }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await eventsApi.join(code.trim());
      onJoined(res.data);
      toast.success('Joined the trip!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid code');
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
            <Hash size={17} style={{ color: 'var(--amber)' }} />
            <h2 className="font-display font-700 text-base">Join a Trip</h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          Enter the invite code shared by your group.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <input
            ref={inputRef}
            className="input-dark text-center font-mono text-xl tracking-widest uppercase"
            placeholder="XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            required
            maxLength={8}
            minLength={6}
            style={{ letterSpacing: '0.2em' }}
          />

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-display font-700 text-sm transition-all disabled:opacity-40"
            style={{
              background: 'var(--amber)',
              color: '#0C0C0F',
            }}
          >
            {loading ? (
              <div className="spinner" style={{ borderTopColor: '#0C0C0F', borderColor: 'rgba(12,12,15,0.3)' }} />
            ) : (
              'Join Trip'
            )}
          </button>
        </form>
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
