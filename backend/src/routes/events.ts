import { Router, Response } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*,
        (SELECT COUNT(*) FROM event_members WHERE event_id = e.id) as member_count,
        (SELECT COUNT(*) FROM items WHERE event_id = e.id) as item_count,
        (SELECT COUNT(*) FROM items WHERE event_id = e.id AND status = 'in_cart') as items_done
       FROM events e
       JOIN event_members em ON em.event_id = e.id
       WHERE em.user_id = $1
       ORDER BY e.created_at DESC`,
      [req.user!.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, store_name } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ error: 'Event name required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let invite_code = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await client.query('SELECT id FROM events WHERE invite_code = $1', [invite_code]);
      if (existing.rows.length === 0) break;
      invite_code = generateInviteCode();
      attempts++;
    }

    const { rows } = await client.query(
      `INSERT INTO events (name, store_name, invite_code, creator_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), store_name?.trim() || null, invite_code, req.user!.id]
    );
    const event = rows[0];

    await client.query(
      'INSERT INTO event_members (event_id, user_id) VALUES ($1, $2)',
      [event.id, req.user!.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...event, member_count: 1, item_count: 0, items_done: 0 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  } finally {
    client.release();
  }
});

router.post('/join', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { invite_code } = req.body;

  if (!invite_code?.trim()) {
    res.status(400).json({ error: 'Invite code required' });
    return;
  }

  try {
    const { rows: eventRows } = await pool.query(
      'SELECT * FROM events WHERE invite_code = $1 AND is_active = true',
      [invite_code.toUpperCase().trim()]
    );

    if (!eventRows[0]) {
      res.status(404).json({ error: 'Event not found or no longer active' });
      return;
    }

    const event = eventRows[0];

    await pool.query(
      'INSERT INTO event_members (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [event.id, req.user!.id]
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as member_count FROM event_members WHERE event_id = $1`,
      [event.id]
    );

    res.json({ ...event, member_count: parseInt(countRows[0].member_count), item_count: 0, items_done: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to join event' });
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows: eventRows } = await pool.query(
      `SELECT e.* FROM events e
       JOIN event_members em ON em.event_id = e.id
       WHERE e.id = $1 AND em.user_id = $2`,
      [req.params.id, req.user!.id]
    );

    if (!eventRows[0]) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const { rows: memberRows } = await pool.query(
      `SELECT u.id, u.username, u.avatar_color FROM users u
       JOIN event_members em ON em.user_id = u.id
       WHERE em.event_id = $1`,
      [req.params.id]
    );

    const { rows: itemRows } = await pool.query(
      `SELECT i.*, u.username as assigned_username, u.avatar_color as assigned_color
       FROM items i
       LEFT JOIN users u ON u.id = i.assigned_to
       WHERE i.event_id = $1
       ORDER BY i.created_at ASC`,
      [req.params.id]
    );

    res.json({ ...eventRows[0], members: memberRows, items: itemRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, store_name } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ error: 'Trip name required' });
    return;
  }

  try {
    const { rows: eventRows } = await pool.query(
      `UPDATE events
       SET name = $1, store_name = $2
       WHERE id = $3 AND creator_id = $4
       RETURNING *`,
      [name.trim(), store_name?.trim() || null, req.params.id, req.user!.id]
    );

    if (!eventRows[0]) {
      const { rows: anyRows } = await pool.query('SELECT creator_id FROM events WHERE id = $1', [req.params.id]);
      if (!anyRows[0]) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }
      res.status(403).json({ error: 'Only the trip creator can edit this trip' });
      return;
    }

    const event = eventRows[0];
    const { rows: countRows } = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM event_members WHERE event_id = $1) as member_count,
        (SELECT COUNT(*) FROM items WHERE event_id = $1) as item_count,
        (SELECT COUNT(*) FROM items WHERE event_id = $1 AND status = 'in_cart') as items_done`,
      [event.id]
    );

    res.json({
      ...event,
      member_count: parseInt(countRows[0].member_count),
      item_count: parseInt(countRows[0].item_count),
      items_done: parseInt(countRows[0].items_done),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows: eventRows } = await pool.query('SELECT id, creator_id FROM events WHERE id = $1', [req.params.id]);
    const event = eventRows[0];

    if (!event) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    if (event.creator_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the trip creator can delete this trip' });
      return;
    }

    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

export default router;
