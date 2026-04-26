/**
 * Offline-aware wrappers around itemsApi.
 * When online, calls the real API and persists results to IDB.
 * When offline, enqueues the action and returns an optimistic item.
 */
import { itemsApi } from './client';
import { Item, ItemStatus } from '../types';
import { useOfflineStore } from '../store/useOfflineStore';
import { putCachedEventDetail, getCachedEventDetail } from '../store/db';

// ── helpers ──────────────────────────────────────────────────────────────────

function getStore() {
  return useOfflineStore.getState();
}

async function patchCachedItems(
  eventId: string,
  updater: (items: Item[]) => Item[],
) {
  const cached = await getCachedEventDetail(eventId);
  if (cached) {
    await putCachedEventDetail({ ...cached, items: updater(cached.items) });
  }
}

// ── public API ────────────────────────────────────────────────────────────────

export type AddItemPayload = Parameters<typeof itemsApi.add>[0];

export async function offlineAddItem(
  payload: AddItemPayload,
  currentUser: { id: string; username: string; avatar_color: string },
): Promise<Item> {
  if (navigator.onLine) {
    const res = await itemsApi.add(payload);
    await patchCachedItems(payload.event_id, (items) => {
      if (items.find((i) => i.id === res.data.id)) return items;
      return [...items, res.data];
    });
    return res.data;
  }

  const tempId = `tmp_${crypto.randomUUID()}`;
  const optimistic: Item = {
    id: tempId,
    _tempId: tempId,
    _pending: true,
    event_id: payload.event_id,
    name: payload.name,
    quantity: payload.quantity ?? 1,
    unit: payload.unit ?? null,
    category: payload.category ?? null,
    notes: payload.notes ?? null,
    requested_for: payload.requested_for ?? currentUser.id,
    requested_for_username: currentUser.username,
    requested_for_color: currentUser.avatar_color,
    assigned_to: null,
    assigned_username: null,
    assigned_color: null,
    status: 'unassigned',
    added_by: currentUser.id,
    created_at: new Date().toISOString(),
  };

  await getStore().enqueue(
    { type: 'ADD_ITEM', itemId: tempId, payload: payload as unknown as Record<string, unknown>, createdAt: Date.now() },
    () => patchCachedItems(payload.event_id, (items) => [...items, optimistic]),
  );

  return optimistic;
}

export async function offlineClaim(item: Item): Promise<Item> {
  if (navigator.onLine) {
    const res = await itemsApi.claim(item.id);
    await patchCachedItems(item.event_id, (items) => items.map((i) => i.id === item.id ? res.data : i));
    return res.data;
  }
  const optimistic: Item = { ...item, _pending: true };
  await getStore().enqueue(
    { type: 'CLAIM_ITEM', itemId: item.id, payload: {}, createdAt: Date.now() },
    () => patchCachedItems(item.event_id, (items) => items.map((i) => i.id === item.id ? optimistic : i)),
  );
  return optimistic;
}

export async function offlineUnclaim(item: Item): Promise<Item> {
  if (navigator.onLine) {
    const res = await itemsApi.unclaim(item.id);
    await patchCachedItems(item.event_id, (items) => items.map((i) => i.id === item.id ? res.data : i));
    return res.data;
  }
  const optimistic: Item = { ...item, assigned_to: null, assigned_username: null, assigned_color: null, status: 'unassigned', _pending: true };
  await getStore().enqueue(
    { type: 'UNCLAIM_ITEM', itemId: item.id, payload: {}, createdAt: Date.now() },
    () => patchCachedItems(item.event_id, (items) => items.map((i) => i.id === item.id ? optimistic : i)),
  );
  return optimistic;
}

export async function offlineUpdateStatus(item: Item, status: ItemStatus): Promise<Item> {
  if (navigator.onLine) {
    const res = await itemsApi.updateStatus(item.id, status);
    await patchCachedItems(item.event_id, (items) => items.map((i) => i.id === item.id ? res.data : i));
    return res.data;
  }
  const optimistic: Item = { ...item, status, _pending: true };
  await getStore().enqueue(
    { type: 'UPDATE_STATUS', itemId: item.id, payload: { status }, createdAt: Date.now() },
    () => patchCachedItems(item.event_id, (items) => items.map((i) => i.id === item.id ? optimistic : i)),
  );
  return optimistic;
}

export async function offlineUpdateRequestedFor(item: Item, requested_for: string): Promise<Item> {
  if (navigator.onLine) {
    const res = await itemsApi.updateRequestedFor(item.id, requested_for);
    await patchCachedItems(item.event_id, (items) => items.map((i) => i.id === item.id ? res.data : i));
    return res.data;
  }
  const optimistic: Item = { ...item, requested_for, _pending: true };
  await getStore().enqueue(
    { type: 'UPDATE_REQUESTED_FOR', itemId: item.id, payload: { requested_for }, createdAt: Date.now() },
    () => patchCachedItems(item.event_id, (items) => items.map((i) => i.id === item.id ? optimistic : i)),
  );
  return optimistic;
}

export async function offlineUpdateItem(
  item: Item,
  data: { name?: string; quantity?: number; unit?: string; category?: string; notes?: string },
): Promise<Item> {
  if (navigator.onLine) {
    const res = await itemsApi.update(item.id, data);
    await patchCachedItems(item.event_id, (items) => items.map((i) => i.id === item.id ? res.data : i));
    return res.data;
  }
  const optimistic: Item = { ...item, ...data, unit: data.unit ?? item.unit, category: data.category ?? item.category, _pending: true };
  await getStore().enqueue(
    { type: 'UPDATE_ITEM', itemId: item.id, payload: data as Record<string, unknown>, createdAt: Date.now() },
    () => patchCachedItems(item.event_id, (items) => items.map((i) => i.id === item.id ? optimistic : i)),
  );
  return optimistic;
}

export async function offlineDeleteItem(item: Item): Promise<void> {
  if (navigator.onLine) {
    await itemsApi.delete(item.id);
    await patchCachedItems(item.event_id, (items) => items.filter((i) => i.id !== item.id));
    return;
  }
  // If it's an unsynced temp item, we can just drop it without queuing a DELETE
  if (item._tempId) {
    await patchCachedItems(item.event_id, (items) => items.filter((i) => i.id !== item.id));
    return;
  }
  await getStore().enqueue(
    { type: 'DELETE_ITEM', itemId: item.id, payload: {}, createdAt: Date.now() },
    () => patchCachedItems(item.event_id, (items) => items.filter((i) => i.id !== item.id)),
  );
}



