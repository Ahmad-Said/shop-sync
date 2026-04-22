import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { signToken, requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ error: 'All fields required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const colors = ['#00F5A0', '#FF6B6B', '#FFD93D', '#6C5CE7', '#74B9FF', '#FD79A8', '#55EFC4'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, avatar_color)
       VALUES ($1, $2, $3, $4) RETURNING id, username, email, avatar_color`,
      [username.trim(), email.toLowerCase().trim(), hash, avatarColor]
    );
    const user = rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username or email already taken' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, username, email, password_hash, avatar_color FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const { password_hash: _, ...safeUser } = user;
    res.json({ token: signToken(safeUser), user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, email, avatar_color FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
