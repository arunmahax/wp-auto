import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import JobStatusBadge from '../components/JobStatusBadge';
import PipelineTracker from '../components/PipelineTracker';
import {
  LayoutDashboard,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  FolderKanban,
  Plus,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Inbox,
  Activity
} from 'lucide-react';

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'running', label: 'Running', icon: Zap },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
  { key: 'failed', label: 'Failed', icon: XCircle },
];

function StatCard({ label, value, icon: Icon, variant = 'default' }) {
  const variants = {
    default: { iconBg: 'var(--bg-700)', iconColor: 'var(--text-300)', glow: 'none' },
    primary: { iconBg: 'rgba(99, 102, 241, 0.2)', iconColor: 'var(--primary-400)', glow: 'var(--glow-primary)' },
    success: { iconBg: 'rgba(5, 150, 105, 0.2)', iconColor: 'var(--success-400)', glow: 'var(--glow-success)' },
    warning: { iconBg: 'rgba(217, 119, 6, 0.2)', iconColor: 'var(--warning-400)', glow: 'none' },
    danger: { iconBg: 'rgba(220, 38, 38, 0.2)', iconColor: 'var(--error-400)', glow: 'var(--glow-error)' },
  };
  const v = variants[variant];

  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ background: v.iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: v.iconColor }} />
        </div>
        <div className="text-right">
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
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
    <div className="card overflow-hidden animate-slide-up">
      <div
        className="p-4 flex items-center gap-4 cursor-pointer transition-colors"
        style={{ background: expanded ? 'var(--bg-700)' : 'transparent' }}
        onClick={() => onExpand(job.id)}
      >
        {/* Status */}
        <JobStatusBadge status={job.status} />

        {/* Project + Recipe */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/projects/${job.project_id}`}
              className="text-sm font-semibold transition-colors"
              style={{ color: 'var(--primary-400)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {job.project_name}
            </Link>
            {job.pipeline_step && (
              <span 
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'var(--bg-700)', color: 'var(--text-400)' }}
              >
                {job.pipeline_step}
              </span>
            )}
          </div>
          <div className="text-sm truncate mt-0.5" style={{ color: 'var(--text-200)' }}>
            {job.recipe_title || 'Waiting for recipe...'}
          </div>
          {job.status === 'failed' && job.error_message && (
            <div className="text-xs mt-1 truncate" style={{ color: 'var(--error-400)' }}>
              {job.error_message}
            </div>
          )}
        </div>

        {/* Published URL */}
        {job.published_url && (
          <a
            href={job.published_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--success-400)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            View Post
          </a>
        )}

        {/* Retry button for failed */}
        {job.status === 'failed' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRetry(job); }}
            disabled={retrying}
            className="btn btn-sm"
            style={{ 
              background: 'rgba(217, 119, 6, 0.2)', 
              color: 'var(--warning-400)',
              border: '1px solid rgba(217, 119, 6, 0.3)'
            }}
          >
            {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            <span className="hidden sm:inline">Retry</span>
          </button>
        )}

        {/* Time */}
        <div className="text-xs whitespace-nowrap" style={{ color: 'var(--text-500)' }}>
          <TimeAgo date={job.createdAt} />
        </div>

        {/* Expand arrow */}
        {expanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-400)' }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-400)' }} />
        )}
      </div>

      {/* Expanded: PipelineTracker */}
      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
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
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
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
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-50)' }}>Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-400)' }}>
            Monitor all pipelines across your projects
          </p>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {error && (
        <div 
          className="mb-6 p-4 rounded-lg border text-sm"
          style={{ background: 'rgba(220, 38, 38, 0.1)', borderColor: 'var(--error-500)', color: 'var(--error-400)' }}
        >
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Projects" value={stats.projects} icon={FolderKanban} variant="primary" />
        <StatCard label="Running" value={stats.running} icon={Zap} variant="warning" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} variant="success" />
        <StatCard label="Failed" value={stats.failed} icon={XCircle} variant="danger" />
        <StatCard label="Queued" value={stats.queued} icon={Clock} variant="default" />
      </div>

      {/* Tabs */}
      <div className="border-b mb-6" style={{ borderColor: 'var(--glass-border)' }}>
        <nav className="flex gap-0 -mb-px">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            const count = tabCounts[t.key];
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
                style={{
                  borderColor: isActive ? 'var(--primary-500)' : 'transparent',
                  color: isActive ? 'var(--primary-400)' : 'var(--text-400)'
                }}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {count !== undefined && count > 0 && (
                  <span 
                    className="ml-1 px-2 py-0.5 text-xs rounded-full"
                    style={{ 
                      background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-700)',
                      color: isActive ? 'var(--primary-400)' : 'var(--text-400)'
                    }}
                  >
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
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-400)' }}>
                Your Projects
              </h2>
              <Link 
                to="/projects/new" 
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: 'var(--primary-400)' }}
              >
                <Plus className="w-3 h-3" />
                Add project
              </Link>
            </div>
            {stats.projects === 0 ? (
              <EmptyState 
                message="No projects yet." 
                action={<Link to="/projects/new" className="text-gradient underline">Create one</Link>}
                icon={FolderKanban}
              />
            ) : (
              <ProjectQuickList projects={data?.projects || []} jobs={allJobs} />
            )}
          </div>

          {/* Recent activity */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-400)' }}>
              Recent Activity
            </h2>
            {visibleJobs.length === 0 ? (
              <EmptyState 
                message="No pipeline activity yet. Run a pipeline from one of your projects." 
                icon={Activity}
              />
            ) : (
              <div className="space-y-3">
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
            <EmptyState message="No pipelines are currently running." icon={Zap} />
          ) : (
            <div className="space-y-3">
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
            <EmptyState message="No completed pipelines yet." icon={CheckCircle2} />
          ) : (
            <div className="space-y-3">
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
            <EmptyState message="No failed pipelines. Everything is running smoothly!" icon={CheckCircle2} />
          ) : (
            <>
              <div 
                className="mb-4 p-3 rounded-lg border text-xs flex items-center gap-2"
                style={{ 
                  background: 'rgba(220, 38, 38, 0.1)', 
                  borderColor: 'rgba(220, 38, 38, 0.3)',
                  color: 'var(--error-400)'
                }}
              >
                <XCircle className="w-4 h-4" />
                {failedJobs.length} failed pipeline{failedJobs.length > 1 ? 's' : ''}. Click "Retry" to re-run.
              </div>
              <div className="space-y-3">
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => {
        const c = countMap[p.id] || { running: 0, completed: 0, failed: 0 };
        const total = c.running + c.completed + c.failed;
        const progress = total > 0 ? Math.round((c.completed / total) * 100) : 0;
        
        return (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className="card card-hover p-4 block"
          >
            <div className="flex items-start justify-between mb-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--bg-700)' }}
              >
                <FolderKanban className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
              </div>
              {c.running > 0 && (
                <span className="status-dot status-dot-running" />
              )}
            </div>
            
            <div className="text-sm font-semibold truncate mb-1" style={{ color: 'var(--text-100)' }}>
              {p.name}
            </div>
            
            {/* Progress bar */}
            <div className="progress-bar mb-3">
              <div 
                className="progress-fill progress-fill-success"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="flex gap-4 text-xs">
              {c.running > 0 && (
                <span className="flex items-center gap-1" style={{ color: 'var(--warning-400)' }}>
                  <Zap className="w-3 h-3" /> {c.running}
                </span>
              )}
              <span className="flex items-center gap-1" style={{ color: 'var(--success-400)' }}>
                <CheckCircle2 className="w-3 h-3" /> {c.completed}
              </span>
              {c.failed > 0 && (
                <span className="flex items-center gap-1" style={{ color: 'var(--error-400)' }}>
                  <XCircle className="w-3 h-3" /> {c.failed}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({ message, icon: Icon = Inbox, action }) {
  return (
    <div className="card text-center py-12 px-6">
      <div 
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'var(--bg-700)' }}
      >
        <Icon className="w-7 h-7" style={{ color: 'var(--text-500)' }} />
      </div>
      <p className="text-sm" style={{ color: 'var(--text-400)' }}>
        {message} {action}
      </p>
    </div>
  );
}
