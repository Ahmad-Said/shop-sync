import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

interface SocketUser {
  id: string;
  username: string;
  email: string;
  avatar_color?: string;
}

// eventId → Map<userId, { username, avatar_color, socketId }>
const eventPresence = new Map<string, Map<string, { username: string; avatar_color: string; socketId: string }>>();

function getPresenceList(eventId: string) {
  const presence = eventPresence.get(eventId);
  if (!presence) return [];
  return Array.from(presence.entries()).map(([userId, data]) => ({
    id: userId,
    username: data.username,
    avatar_color: data.avatar_color,
  }));
}

export function registerSocketHandlers(io: Server) {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET!) as SocketUser;
      (socket as any).user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user as SocketUser;

    // Personal room used for global updates (e.g., trip changes from home page)
    socket.join(user.id);

    // Load avatar color
    try {
      const { rows } = await pool.query('SELECT avatar_color FROM users WHERE id = $1', [user.id]);
      if (rows[0]) user.avatar_color = rows[0].avatar_color;
    } catch { /* non-critical */ }

    socket.on('join_event', async ({ eventId }: { eventId: string }) => {
      // Verify membership
      try {
        const { rows } = await pool.query(
          'SELECT 1 FROM event_members WHERE event_id = $1 AND user_id = $2',
          [eventId, user.id]
        );
        if (!rows.length) return;
      } catch {
        return;
      }

      socket.join(eventId);

      if (!eventPresence.has(eventId)) {
        eventPresence.set(eventId, new Map());
      }
      eventPresence.get(eventId)!.set(user.id, {
        username: user.username,
        avatar_color: user.avatar_color || '#00F5A0',
        socketId: socket.id,
      });

      io.to(eventId).emit('presence_update', getPresenceList(eventId));
    });

    socket.on('leave_event', ({ eventId }: { eventId: string }) => {
      socket.leave(eventId);
      const presence = eventPresence.get(eventId);
      if (presence) {
        presence.delete(user.id);
        if (presence.size === 0) eventPresence.delete(eventId);
        else io.to(eventId).emit('presence_update', getPresenceList(eventId));
      }
    });

    // Broadcast item updates to the event room (called from REST routes via io)
    // These are emitted by the REST handlers after DB mutations

    socket.on('disconnect', () => {
      for (const [eventId, presence] of eventPresence.entries()) {
        if (presence.has(user.id) && presence.get(user.id)?.socketId === socket.id) {
          presence.delete(user.id);
          if (presence.size === 0) {
            eventPresence.delete(eventId);
          } else {
            io.to(eventId).emit('presence_update', getPresenceList(eventId));
          }
        }
      }
    });
  });
}
