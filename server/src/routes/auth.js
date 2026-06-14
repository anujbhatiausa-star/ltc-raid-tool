import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Body: { email: string, password: string }
// Returns: { session, user: { id, email, name, role } }
// ---------------------------------------------------------------------------
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Surface auth errors as 401 rather than 500
      return res.status(401).json({ error: error.message });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', data.user.id)
      .single();

    res.json({
      session: data.session,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name ?? data.user.email,
        role: profile?.role ?? 'viewer',
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// Requires: Authorization: Bearer <token>
// JWTs are stateless — the client must discard the token on receipt of 200.
// ---------------------------------------------------------------------------
router.post('/logout', requireAuth, (req, res) => {
  // Token validation already happened in requireAuth.
  // We return 200 and rely on the client clearing the token.
  // For refresh-token revocation, call supabase.auth.admin.signOut in a
  // future implementation once Supabase exposes that method.
  res.json({ message: 'Logged out successfully' });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// Returns the authenticated user and their role from profiles.
// ---------------------------------------------------------------------------
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', req.user.id)
      .single();

    res.json({
      id: req.user.id,
      email: req.user.email,
      name: profile?.name ?? req.user.email,
      role: profile?.role ?? 'viewer',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
