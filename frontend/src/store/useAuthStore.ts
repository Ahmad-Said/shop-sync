import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

function loadFromStorage(): { user: User | null; token: string | null } {
  try {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    return { token, user };
  } catch {
    return { user: null, token: null };
  }
}

const initial = loadFromStorage();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initial.user,
  token: initial.token,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },

  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  isAuthenticated: () => !!(get().token && get().user),
}));
