import { AlertTriangle, X } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'danger' | 'neon';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'danger',
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  const isDanger = confirmColor === 'danger';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 modal-backdrop"
      onClick={onClose}
    >
      <div className="glass w-full max-w-sm rounded-2xl p-6 page-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={17} style={{ color: isDanger ? 'var(--coral)' : 'var(--neon)' }} />
            <h2 className="font-display font-700 text-base">{title}</h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
          {message}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="py-2.5 rounded-xl text-sm font-display font-700 transition-all disabled:opacity-50"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="py-2.5 rounded-xl text-sm font-display font-700 transition-all disabled:opacity-50"
            style={isDanger ? { background: 'var(--coral)', color: '#0C0C0F' } : { background: 'var(--neon)', color: '#0C0C0F' }}
          >
            {loading ? 'Working...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

