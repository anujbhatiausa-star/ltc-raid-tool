import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Hero */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1e2433]">
            <span className="text-lg font-bold text-white">LTC</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">LTC RAID Management</h1>
          <p className="mt-1 text-sm font-semibold text-[#185FA5]">Lead to Cash Transformation Programme</p>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            A programme governance tool for tracking Risks, Assumptions, Issues and Decisions
            across the full Lead to Cash lifecycle.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Demo credential cards */}
        <div className="mt-4 space-y-2">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Click a card to auto-fill
          </p>
          {[
            { role: 'Programme Manager', email: 'pm@ltc-demo.com', password: 'Demo@1234' },
            { role: 'Executive Sponsor (Karin Maday)', email: 'exec@ltc-demo.com', password: 'Demo@1234' },
          ].map(({ role, email, password }) => (
            <button
              key={email}
              type="button"
              onClick={() => { setEmail(email); setPassword(password); }}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-[#185FA5] hover:bg-blue-50 group"
            >
              <p className="text-xs font-semibold text-gray-700 group-hover:text-[#185FA5]">{role}</p>
              <p className="mt-0.5 font-mono text-xs text-gray-400">{email} / {password}</p>
            </button>
          ))}
          <p className="pt-1 text-center text-xs text-gray-400">
            PM view has full access. Exec view is read-only dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
