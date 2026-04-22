import { Router, Response } from 'express';
import { Server } from 'socket.io';
import { pool } from '../db/pool.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

function getIO(req: AuthRequest): Server | null {
  return (req as any).io || null;
}

async function isMember(eventId: string, userId: string): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT 1 FROM event_members WHERE event_id = $1 AND user_id = $2',
    [eventId, userId]
  );
  return rows.length > 0;
}

async function getItemWithUser(itemId: string) {
  const { rows } = await pool.query(
    `SELECT i.*, u.username as assigned_username, u.avatar_color as assigned_color
     FROM items i
     LEFT JOIN users u ON u.id = i.assigned_to
     WHERE i.id = $1`,
    [itemId]
  );
  return rows[0] || null;
}

router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { event_id, name, quantity, unit, category, notes } = req.body;

  if (!event_id || !name?.trim()) {
    res.status(400).json({ error: 'event_id and name are required' });
    return;
  }

  if (!(await isMember(event_id, req.user!.id))) {
    res.status(403).json({ error: 'Not a member of this event' });
    return;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO items (event_id, name, quantity, unit, category, notes, added_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [event_id, name.trim(), quantity || 1, unit?.trim() || null, category?.trim() || null, notes?.trim() || null, req.user!.id]
    );
    const item = await getItemWithUser(rows[0].id);
    getIO(req)?.to(event_id).emit('item_added', item);
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

router.patch('/:id/claim', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows: itemRows } = await pool.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    const item = itemRows[0];

    if (!item) { res.status(404).json({ error: 'Item not found' }); return; }

    if (!(await isMember(item.event_id, req.user!.id))) {
      res.status(403).json({ error: 'Not a member of this event' }); return;
    }

    if (item.assigned_to && item.assigned_to !== req.user!.id) {
      res.status(409).json({ error: 'Item already claimed by someone else' }); return;
    }

    await pool.query(
      `UPDATE items SET assigned_to = $1, status = 'claimed' WHERE id = $2`,
      [req.user!.id, req.params.id]
    );

    const updated = await getItemWithUser(req.params.id);
    getIO(req)?.to(item.event_id).emit('item_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to claim item' });
  }
});

router.patch('/:id/unclaim', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows: itemRows } = await pool.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    const item = itemRows[0];

    if (!item) { res.status(404).json({ error: 'Item not found' }); return; }

    if (item.assigned_to !== req.user!.id) {
      res.status(403).json({ error: 'You did not claim this item' }); return;
    }

    await pool.query(
      `UPDATE items SET assigned_to = NULL, status = 'unassigned' WHERE id = $1`,
      [req.params.id]
    );

    const updated = await getItemWithUser(req.params.id);
    getIO(req)?.to(item.event_id).emit('item_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unclaim item' });
  }
});

router.patch('/:id/status', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  const validStatuses = ['unassigned', 'claimed', 'found', 'in_cart'];

  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status' }); return;
  }

  try {
    const { rows: itemRows } = await pool.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    const item = itemRows[0];

    if (!item) { res.status(404).json({ error: 'Item not found' }); return; }

    if (!(await isMember(item.event_id, req.user!.id))) {
      res.status(403).json({ error: 'Not a member of this event' }); return;
    }

    await pool.query('UPDATE items SET status = $1 WHERE id = $2', [status, req.params.id]);
    const updated = await getItemWithUser(req.params.id);
    getIO(req)?.to(item.event_id).emit('item_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows: itemRows } = await pool.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    const item = itemRows[0];

    if (!item) { res.status(404).json({ error: 'Item not found' }); return; }

    if (item.added_by !== req.user!.id) {
      const { rows: eventRows } = await pool.query('SELECT creator_id FROM events WHERE id = $1', [item.event_id]);
      if (eventRows[0]?.creator_id !== req.user!.id) {
        res.status(403).json({ error: 'Only the item adder or event creator can delete items' }); return;
      }
    }

    await pool.query('DELETE FROM items WHERE id = $1', [req.params.id]);
    getIO(req)?.to(item.event_id).emit('item_deleted', { id: req.params.id, event_id: item.event_id });
    res.json({ id: req.params.id, event_id: item.event_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
