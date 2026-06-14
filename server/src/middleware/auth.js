import { supabase } from '../services/supabase.js';

// Verifies the Supabase JWT from the Authorization: Bearer header.
// Attaches req.user (Supabase User), req.userRole, and req.userName.
export default async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single();

  req.user = user;
  req.userRole = profile?.role ?? 'viewer';
  req.userName = profile?.name ?? user.email;
  next();
}

// Use after requireAuth to restrict an endpoint to PM role only.
export function requirePM(req, res, next) {
  if (req.userRole !== 'pm') {
    return res.status(403).json({ error: 'PM role required for this action' });
  }
  next();
}
