import { create } from 'zustand';
import { OfflineAction, EventDetail } from '../types';
import {
  enqueueAction,
  getAllQueuedActions,
  clearQueuedAction,
  putCachedEventDetail,
  getCachedEventDetail,
} from './db';
import { eventsApi, itemsApi } from '../api/client';

interface OfflineStore {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  /** tempId -> real server id mapping built during processQueue */
  tempIdMap: Map<string, string>;

  setOnline: (online: boolean) => void;
  enqueue: (action: Omit<OfflineAction, 'queueId'>, optimisticApply?: () => void) => Promise<void>;
  processQueue: () => Promise<void>;
  refreshEventDetail: (eventId: string) => Promise<EventDetail | null>;
}

export const useOfflineStore = create<OfflineStore>((set, get) => ({
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  tempIdMap: new Map(),

  setOnline(online) {
    const wasOffline = !get().isOnline;
    set({ isOnline: online });
    if (online && wasOffline) {
      get().processQueue();
    }
  },

  async enqueue(action, optimisticApply) {
    await enqueueAction(action);
    set((s) => ({ pendingCount: s.pendingCount + 1 }));
    optimisticApply?.();
  },

  async processQueue() {
    if (get().isSyncing) return;
    const actions = await getAllQueuedActions();
    if (actions.length === 0) return;

    set({ isSyncing: true });
    const tempIdMap = new Map(get().tempIdMap);

    for (const action of actions) {
      try {
        // Resolve tempId to real id if we mapped it already
        const resolvedId = tempIdMap.get(action.itemId) ?? action.itemId;

        switch (action.type) {
          case 'ADD_ITEM': {
            const payload = action.payload as Parameters<typeof itemsApi.add>[0];
            const res = await itemsApi.add(payload);
            // Map temp id -> real id for subsequent queued actions
            tempIdMap.set(action.itemId, res.data.id);
            break;
          }
          case 'CLAIM_ITEM':
            await itemsApi.claim(resolvedId);
            break;
          case 'UNCLAIM_ITEM':
            await itemsApi.unclaim(resolvedId);
            break;
          case 'UPDATE_STATUS':
            await itemsApi.updateStatus(resolvedId, action.payload.status as string);
            break;
          case 'UPDATE_REQUESTED_FOR':
            await itemsApi.updateRequestedFor(resolvedId, action.payload.requested_for as string);
            break;
          case 'UPDATE_ITEM': {
            const p = action.payload as Parameters<typeof itemsApi.update>[1];
            await itemsApi.update(resolvedId, p);
            break;
          }
          case 'DELETE_ITEM':
            await itemsApi.delete(resolvedId);
            break;
        }

        if (action.queueId != null) await clearQueuedAction(action.queueId);
        set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) }));
      } catch (err: any) {
        // 404 = item already deleted on server, safe to discard
        if (err?.response?.status === 404) {
          if (action.queueId != null) await clearQueuedAction(action.queueId);
          set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) }));
        } else {
          // Stop on first unrecoverable error to preserve order
          console.error('[OfflineSync] Error replaying action', action, err);
          break;
        }
      }
    }

    set({ isSyncing: false, tempIdMap });
  },

  async refreshEventDetail(eventId) {
    try {
      const res = await eventsApi.get(eventId);
      const detail: EventDetail = res.data;
      await putCachedEventDetail(detail);
      return detail;
    } catch {
      const cached = await getCachedEventDetail(eventId);
      return cached ?? null;
    }
  },
}));



