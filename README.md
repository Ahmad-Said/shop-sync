# ShopSync

Real-time group shopping coordinator. Create a shopping trip, add items, and coordinate with your group in-store — no two people grab the same thing.

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

Then open **http://localhost:5173**

## How it works

1. **Register / Sign in** — create your account
2. **New Trip** — give it a name and pick a store (Lidl, Action, etc.)
3. **Invite your group** — share the 6-char invite code from the ↑ button in the event
4. **Add items** — type the shopping list (with qty, category, notes)
5. **Claim items** — tap the circle to claim an item. It locks to you in real time for everyone else
6. **Advance status** — as you shop: Claimed → Found → In Cart
7. **Live presence** — see which group members are active in the store

## Architecture

```
frontend/   React + TypeScript + Vite + Tailwind CSS
backend/    Node.js + Express + Socket.io
database/   PostgreSQL 16
```

### Socket events

| Direction | Event | Payload |
|---|---|---|
| → Server | `join_event` | `{ eventId }` |
| → Server | `leave_event` | `{ eventId }` |
| ← Client | `item_added` | Item object |
| ← Client | `item_updated` | Item object |
| ← Client | `item_deleted` | `{ id, event_id }` |
| ← Client | `presence_update` | `Member[]` |

## Item lifecycle

```
unassigned  →  claimed  →  found  →  in_cart
    ↑_______________↩ (unclaim)
```

## Development without Docker

```bash
# Start postgres separately, then:

# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

Set `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN` env vars for the backend.
