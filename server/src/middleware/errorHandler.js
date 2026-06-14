export default function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  // Supabase PostgREST errors carry a code and message
  if (err.code && err.message) {
    const status = err.code === 'PGRST116' ? 404 : 400;
    return res.status(status).json({ error: err.message, code: err.code });
  }

  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
}
