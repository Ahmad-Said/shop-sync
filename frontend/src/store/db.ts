import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Event, EventDetail, OfflineAction } from '../types';

interface ShopSyncDB extends DBSchema {
  events: {
    key: string;
    value: Event;
  };
  eventDetails: {
    key: string;
    value: EventDetail;
  };
  offlineQueue: {
    key: number;
    value: OfflineAction;
    autoIncrement: true;
  };
}

let dbPromise: Promise<IDBPDatabase<ShopSyncDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ShopSyncDB>('shopsync-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('events')) {
          db.createObjectStore('events', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('eventDetails')) {
          db.createObjectStore('eventDetails', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offlineQueue')) {
          db.createObjectStore('offlineQueue', { keyPath: 'queueId', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function getCachedEvents(): Promise<Event[]> {
  try {
    const db = await getDB();
    return db.getAll('events');
  } catch {
    return [];
  }
}

export async function putCachedEvents(events: Event[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('events', 'readwrite');
    await Promise.all(events.map((e) => tx.store.put(e)));
    await tx.done;
  } catch {
    // ignore storage errors
  }
}

// ── Event details ─────────────────────────────────────────────────────────────

export async function getCachedEventDetail(id: string): Promise<EventDetail | undefined> {
  try {
    const db = await getDB();
    return db.get('eventDetails', id);
  } catch {
    return undefined;
  }
}

export async function putCachedEventDetail(detail: EventDetail): Promise<void> {
  try {
    const db = await getDB();
    await db.put('eventDetails', detail);
  } catch {
    // ignore
  }
}

// ── Offline queue ─────────────────────────────────────────────────────────────

export async function enqueueAction(action: Omit<OfflineAction, 'queueId'>): Promise<number> {
  const db = await getDB();
  return db.add('offlineQueue', action as OfflineAction);
}

export async function getAllQueuedActions(): Promise<OfflineAction[]> {
  try {
    const db = await getDB();
    return db.getAll('offlineQueue');
  } catch {
    return [];
  }
}

export async function clearQueuedAction(queueId: number): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('offlineQueue', queueId);
  } catch {
    // ignore
  }
}

