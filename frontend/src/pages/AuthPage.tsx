import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShoppingCart, Zap } from 'lucide-react';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await authApi.login({ email: form.email, password: form.password })
        : await authApi.register(form);
      setAuth(res.data.user, res.data.token);
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 ambient-glow">
      {/* Logo */}
      <div className="mb-8 text-center page-enter">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00F5A0, #00CCFF)' }}>
            <ShoppingCart size={20} color="#0C0C0F" strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl font-bold text-white">ShopSync</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Coordinate your shopping trip in real time
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm glass rounded-2xl p-6 page-enter" style={{ animationDelay: '0.05s' }}>
        {/* Tabs */}
        <div className="flex rounded-xl p-1 mb-6" style={{ background: 'var(--base)' }}>
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-lg text-sm font-display font-600 transition-all duration-200"
              style={{
                background: mode === m ? 'var(--surface-2)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--muted)',
                border: mode === m ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-600 mb-1.5" style={{ color: 'var(--muted)' }}>
                USERNAME
              </label>
              <input
                className="input-dark"
                placeholder="your_handle"
                value={form.username}
                onChange={update('username')}
                required
                minLength={2}
                maxLength={50}
                autoComplete="username"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-600 mb-1.5" style={{ color: 'var(--muted)' }}>
              EMAIL
            </label>
            <input
              className="input-dark"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update('email')}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-600 mb-1.5" style={{ color: 'var(--muted)' }}>
              PASSWORD
            </label>
            <input
              className="input-dark"
              type="password"
              placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
              value={form.password}
              onChange={update('password')}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-neon w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm mt-2"
          >
            {loading ? (
              <div className="spinner" style={{ borderTopColor: '#0C0C0F', borderColor: 'rgba(12,12,15,0.3)' }} />
            ) : (
              <>
                <Zap size={15} strokeWidth={2.5} />
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs page-enter" style={{ color: 'var(--muted)', animationDelay: '0.1s' }}>
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="underline"
          style={{ color: 'var(--neon)' }}
        >
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
