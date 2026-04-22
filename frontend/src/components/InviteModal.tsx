import { Copy, X, Check } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import AppDialog from './ui/AppDialog';

interface Props {
  inviteCode: string;
  eventName: string;
  onClose: () => void;
}

export default function InviteModal({ inviteCode, eventName, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  }

  return (
    <AppDialog onClose={onClose}>
      <div className="glass w-full max-w-sm rounded-2xl p-6 page-enter">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-700 text-base">Invite to Trip</h2>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          Share this code with your group. They can join{' '}
          <span style={{ color: 'var(--text)' }}>"{eventName}"</span> using it.
        </p>

        <div
          className="rounded-2xl p-5 mb-4 text-center"
          style={{ background: 'var(--base)', border: '1px solid rgba(0,245,160,0.15)' }}
        >
          <p className="invite-code">{inviteCode}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
            Entry code
          </p>
        </div>

        <button
          onClick={copyCode}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-display font-600 text-sm transition-all"
          style={{
            background: copied ? 'rgba(0,245,160,0.15)' : 'var(--surface-2)',
            color: copied ? 'var(--neon)' : 'var(--text)',
            border: `1px solid ${copied ? 'rgba(0,245,160,0.3)' : 'var(--border)'}`,
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
    </AppDialog>
  );
}
