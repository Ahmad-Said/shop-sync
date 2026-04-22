import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { Item, Member } from '../types';

interface SocketHandlers {
  onItemAdded?: (item: Item) => void;
  onItemUpdated?: (item: Item) => void;
  onItemDeleted?: (data: { id: string; event_id: string }) => void;
  onPresenceUpdate?: (members: Member[]) => void;
}

export function useSocket(eventId: string | null, handlers: SocketHandlers) {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!token || !eventId) return;

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_event', { eventId });
    });

    socket.on('item_added', (item: Item) => {
      handlersRef.current.onItemAdded?.(item);
    });

    socket.on('item_updated', (item: Item) => {
      handlersRef.current.onItemUpdated?.(item);
    });

    socket.on('item_deleted', (data: { id: string; event_id: string }) => {
      handlersRef.current.onItemDeleted?.(data);
    });

    socket.on('presence_update', (members: Member[]) => {
      handlersRef.current.onPresenceUpdate?.(members);
    });

    return () => {
      socket.emit('leave_event', { eventId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, eventId]);
}
