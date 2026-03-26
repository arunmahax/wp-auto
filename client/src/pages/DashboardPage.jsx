import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import JobStatusBadge from '../components/JobStatusBadge';
import PipelineTracker from '../components/PipelineTracker';

const TABS = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'running', label: 'Running', icon: '⚡' },
  { key: 'completed', label: 'Completed', icon: '✅' },
  { key: 'failed', label: 'Failed', icon: '❌' },
];

function StatCard({ label, value, color, icon }) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <div className="mt-1 text-sm font-medium opacity-80">{label}</div>
    </div>
  );
}

function TimeAgo({ date }) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return <span>{diff}s ago</span>;
  if (diff < 3600) return <span>{Math.floor(diff / 60)}m ago</span>;
  if (diff < 86400) return <span>{Math.floor(diff / 3600)}h ago</span>;
  return <span>{d.toLocaleDateString()}</span>;
}

function JobRow({ job, onRetry, onExpand, expanded, retrying }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onExpand(job.id)}
      >
        {/* Status */}
        <JobStatusBadge status={job.status} />

        {/* Project + Recipe */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/projects/${job.project_id}`}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              onClick={(e) => e.stopPropagation()}
            >
              {job.project_name}
            </Link>
            {job.pipeline_step && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {job.pipeline_step}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-700 truncate mt-0.5">
            {job.recipe_title || 'Waiting for recipe...'}
          </div>
          {job.status === 'failed' && job.error_message && (
            <div className="text-xs text-red-500 mt-1 truncate">{job.error_message}</div>
          )}
        </div>

        {/* Published URL */}
        {job.published_url && (
          <a
            href={job.published_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex text-xs text-emerald-600 hover:text-emerald-500 underline"
            onClick={(e) => e.stopPropagation()}
          >
            View Post
          </a>
        )}

        {/* Retry button for failed */}
        {job.status === 'failed' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRetry(job); }}
            disabled={retrying}
            className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {retrying ? '...' : '↻ Retry'}
          </button>
        )}

        {/* Time */}
        <div className="text-xs text-gray-400 whitespace-nowrap">
          <TimeAgo date={job.createdAt} />
        </div>

        {/* Expand arrow */}
        <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded: PipelineTracker */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <PipelineTracker
            projectId={job.project_id}
            job={job}
            onUpdate={() => {}}
          />
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedJob, setExpandedJob] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const pollRef = useRef(null);

  const fetchDashboard = async () => {
    try {
      const { data: d } = await client.get('/dashboard');
      setData(d);
      setError('');
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    pollRef.current = setInterval(fetchDashboard, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const handleRetry = async (job) => {
    setRetryingId(job.id);
    try {
      await client.post(`/projects/${job.project_id}/jobs/${job.id}/retry`);
      await fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const handleExpand = (jobId) => {
    setExpandedJob(expandedJob === jobId ? null : jobId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const stats = data?.stats || { projects: 0, running: 0, completed: 0, failed: 0, queued: 0 };
  const allJobs = data?.jobs || [];

  const runningJobs = allJobs.filter((j) => j.status === 'running' || j.status === 'pending');
  const completedJobs = allJobs.filter((j) => j.status === 'completed');
  const failedJobs = allJobs.filter((j) => j.status === 'failed');

  const tabCounts = {
    running: runningJobs.length,
    completed: completedJobs.length,
    failed: failedJobs.length,
  };

  const getVisibleJobs = () => {
    switch (tab) {
      case 'running': return runningJobs;
      case 'completed': return completedJobs;
      case 'failed': return failedJobs;
      default: return allJobs.slice(0, 20);
    }
  };

  const visibleJobs = getVisibleJobs();

  return (
    <div>
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor all pipelines across your projects</p>
        </div>
        <Link
          to="/projects/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          + New Project
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Projects" value={stats.projects} color="indigo" icon="📁" />
        <StatCard label="Running" value={stats.running} color="blue" icon="⚡" />
        <StatCard label="Completed" value={stats.completed} color="green" icon="✅" />
        <StatCard label="Failed" value={stats.failed} color="red" icon="❌" />
        <StatCard label="Queued Recipes" value={stats.queued} color="amber" icon="📋" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            const count = tabCounts[t.key];
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t.icon} {t.label}
                {count !== undefined && count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div>
          {/* Projects quick list */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Your Projects</h2>
              <Link to="/projects/new" className="text-xs text-indigo-600 hover:text-indigo-500">+ Add project</Link>
            </div>
            {stats.projects === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg border border-gray-200 text-gray-500 text-sm">
                No projects yet.{' '}
                <Link to="/projects/new" className="text-indigo-600 underline">Create one</Link>
              </div>
            ) : (
              <ProjectQuickList projects={data?.projects || []} jobs={allJobs} />
            )}
          </div>

          {/* Recent activity */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Recent Activity</h2>
            {visibleJobs.length === 0 ? (
              <EmptyState message="No pipeline activity yet. Run a pipeline from one of your projects." />
            ) : (
              <div className="space-y-2">
                {visibleJobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onRetry={handleRetry}
                    onExpand={handleExpand}
                    expanded={expandedJob === job.id}
                    retrying={retryingId === job.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'running' && (
        <div>
          {runningJobs.length === 0 ? (
            <EmptyState message="No pipelines are currently running." icon="⚡" />
          ) : (
            <div className="space-y-2">
              {runningJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  onRetry={handleRetry}
                  onExpand={handleExpand}
                  expanded={expandedJob === job.id}
                  retrying={retryingId === job.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'completed' && (
        <div>
          {completedJobs.length === 0 ? (
            <EmptyState message="No completed pipelines yet." icon="✅" />
          ) : (
            <div className="space-y-2">
              {completedJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  onRetry={handleRetry}
                  onExpand={handleExpand}
                  expanded={expandedJob === job.id}
                  retrying={retryingId === job.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'failed' && (
        <div>
          {failedJobs.length === 0 ? (
            <EmptyState message="No failed pipelines. Everything is running smoothly!" icon="🎉" />
          ) : (
            <>
              <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                {failedJobs.length} failed pipeline{failedJobs.length > 1 ? 's' : ''}. Click "Retry" to re-run from the beginning.
              </div>
              <div className="space-y-2">
                {failedJobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onRetry={handleRetry}
                    onExpand={handleExpand}
                    expanded={expandedJob === job.id}
                    retrying={retryingId === job.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Helper sub-components ---- */

function ProjectQuickList({ projects, jobs }) {
  // Build job counts per project
  const countMap = {};
  jobs.forEach((j) => {
    if (!countMap[j.project_id]) countMap[j.project_id] = { running: 0, completed: 0, failed: 0 };
    if (j.status === 'running' || j.status === 'pending') countMap[j.project_id].running++;
    else if (j.status === 'completed') countMap[j.project_id].completed++;
    else if (j.status === 'failed') countMap[j.project_id].failed++;
  });

  if (projects.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => {
        const c = countMap[p.id] || { running: 0, completed: 0, failed: 0 };
        return (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow block"
          >
            <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
            <div className="flex gap-3 mt-2 text-xs">
              {c.running > 0 && <span className="text-blue-600">⚡ {c.running} running</span>}
              <span className="text-green-600">✅ {c.completed}</span>
              {c.failed > 0 && <span className="text-red-600">❌ {c.failed}</span>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({ message, icon = '📭' }) {
  return (
    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
