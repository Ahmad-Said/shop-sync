# ShopSync

A real-time group shopping coordinator that helps teams collaborate while shopping in brick-and-mortar stores. ShopSync eliminates the classic problem of two people grabbing the same item — or nobody grabbing one at all.

## Why ShopSync

When a group shops together (or splits up across store sections), coordination breaks down fast: someone doubles up on milk, nobody grabbed coffee, and half the group is waiting at checkout while the other half is still searching. Texting back and forth doesn't cut it.

ShopSync gives everyone a **live shared list** where items can be claimed, tracked, and checked off in real time as the group moves through the store. Everyone sees the same state, instantly.

## How it works

1. **Register / Sign in** — create your account
2. **New Trip** — give it a name and pick a store (Lidl, Action, etc.)
3. **Invite your group** — share the 6-char invite code with teammates
4. **Add items** — build the shopping list with qty, category, and notes
5. **Claim items** — tap the circle to claim an item; it locks to you in real time for everyone else
6. **Advance status** — as you shop: Claimed → Found → In Cart
7. **Live presence** — see which group members are active in the store right now

### Item lifecycle

```
unassigned  →  claimed  →  found  →  in_cart
    ↑_______________↩ (unclaim)
```

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

Open **http://localhost:5173**

## Architecture

```
frontend/   React 18 + TypeScript + Vite + Tailwind CSS + Zustand
backend/    Node.js + Express + TypeScript + Socket.IO
database/   PostgreSQL 16
```

All three services are wired together via Docker Compose with hot reload enabled for development. The app uses REST for state mutations and WebSockets for real-time broadcasting — after each database write, the backend emits a socket event to all members of that event room.

### Socket events

| Direction | Event | Payload |
|-----------|-------|---------|
| → Server | `join_event` | `{ eventId }` |
| → Server | `leave_event` | `{ eventId }` |
| ← Client | `item_added` | Item object |
| ← Client | `item_updated` | Item object |
| ← Client | `item_deleted` | `{ id, event_id }` |
| ← Client | `presence_update` | `Member[]` |

## Development without Docker

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Set `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN` env vars for the backend.
