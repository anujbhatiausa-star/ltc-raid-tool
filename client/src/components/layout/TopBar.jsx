import { useAuth } from '../../hooks/useAuth.jsx';

export default function TopBar({ title }) {
  const { userName, user, role } = useAuth();
  const display = userName || user?.email || '';
  const initials = display.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-2 lg:gap-4 pl-10 lg:pl-0">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <span className="hidden sm:inline text-gray-300">|</span>
        <span className="hidden sm:inline text-sm text-gray-500">Lead to Cash Transformation Programme</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden md:block text-sm text-gray-600">{display}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold">
          {initials}
        </div>
      </div>
    </header>
  );
}
