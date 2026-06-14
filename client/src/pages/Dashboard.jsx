import { useRAIDItems } from '../hooks/useRAID.js';
import MetricCards from '../components/dashboard/MetricCards.jsx';
import PipelineView from '../components/dashboard/PipelineView.jsx';
import RiskHeatmap from '../components/dashboard/RiskHeatmap.jsx';
import PriorityMatrix from '../components/dashboard/PriorityMatrix.jsx';
import EscalationTimeline from '../components/dashboard/EscalationTimeline.jsx';

function Skeleton({ h = 'h-32' }) {
  return <div className={`rounded-lg border border-gray-200 bg-white ${h} animate-pulse`} />;
}

export default function Dashboard() {
  const { data: items = [], isLoading, error } = useRAIDItems({});

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load dashboard data: {error.message}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0,1,2,3].map((i) => <Skeleton key={i} h="h-24" />)}
        </div>
        <Skeleton h="h-36" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Skeleton h="h-64" />
          <Skeleton h="h-64" />
        </div>
        <Skeleton h="h-48" />
      </div>
    );
  }

  // --- Derived metrics ---
  const CLOSED = ['Resolved', 'Closed'];
  const openItems = items.filter((i) => !CLOSED.includes(i.status));
  const critical  = openItems.filter((i) => i.priority === 'Critical' || i.status === 'Escalated');
  const overdue   = openItems.filter((i) => i.due_date && new Date(i.due_date) < new Date());
  const weekAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const resolved  = items.filter((i) => CLOSED.includes(i.status) && i.resolved_at && new Date(i.resolved_at) > weekAgo);

  const metrics = {
    total:    openItems.length,
    critical: critical.length,
    overdue:  overdue.length,
    resolved: resolved.length,
  };

  // Risks with both dimensions set (for heatmap)
  const risks = items.filter(
    (i) => i.category === 'R' && i.likelihood != null && i.impact_score != null && !CLOSED.includes(i.status)
  );

  // Escalation timeline: critical or escalated, open items
  const escalated = openItems
    .filter((i) => i.status === 'Escalated' || i.priority === 'Critical')
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });

  return (
    <div className="space-y-6">
      {/* Date banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Programme Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Live data
        </span>
      </div>

      <MetricCards metrics={metrics} />
      <PipelineView items={items} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RiskHeatmap risks={risks} />
        <PriorityMatrix items={items} />
      </div>

      <EscalationTimeline items={escalated} />
    </div>
  );
}
