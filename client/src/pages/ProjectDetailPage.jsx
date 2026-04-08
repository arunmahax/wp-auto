import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import JobStatusBadge from '../components/JobStatusBadge';
import PipelineTracker from '../components/PipelineTracker';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  ArrowLeft,
  RefreshCw,
  Play,
  Settings,
  Trash2,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  X,
  Image,
  Calendar,
  Timer,
  Loader2,
  FolderKanban,
  ListFilter,
  Activity,
  Inbox,
  Rss,
  Plus,
  Check
} from 'lucide-react';

const PIPELINE_STEP_LABELS = {
  starting: 'Starting',
  image_generation: 'Image Generation',
  image_upload: 'Image Upload',
  article_generation: 'Article Generation',
  publishing: 'Publishing',
  pin_generation: 'Pin Generation',
  pin_submission: 'Pin Submission',
  done: 'Done',
};

function RecipeStatusBadge({ status }) {
  const config = {
    new: { bg: 'rgba(100, 116, 139, 0.2)', text: 'var(--text-300)', icon: Clock, label: 'Queued' },
    processing: { bg: 'rgba(99, 102, 241, 0.2)', text: 'var(--primary-400)', icon: Zap, label: 'Processing', spin: true },
    completed: { bg: 'rgba(5, 150, 105, 0.2)', text: 'var(--success-400)', icon: CheckCircle2, label: 'Completed' },
    failed: { bg: 'rgba(220, 38, 38, 0.2)', text: 'var(--error-400)', icon: XCircle, label: 'Failed' },
  }[status] || { bg: 'rgba(100, 116, 139, 0.2)', text: 'var(--text-300)', icon: Clock, label: status };
  const Icon = config.icon;
  
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: config.bg, color: config.text }}
    >
      <Icon className={`w-3.5 h-3.5 ${config.spin ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
}

function StatsCard({ label, value, icon: Icon, variant = 'default' }) {
  const variants = {
    default: { iconBg: 'var(--bg-700)', iconColor: 'var(--text-300)' },
    primary: { iconBg: 'rgba(99, 102, 241, 0.2)', iconColor: 'var(--primary-400)' },
    success: { iconBg: 'rgba(5, 150, 105, 0.2)', iconColor: 'var(--success-400)' },
    warning: { iconBg: 'rgba(217, 119, 6, 0.2)', iconColor: 'var(--warning-400)' },
    danger: { iconBg: 'rgba(220, 38, 38, 0.2)', iconColor: 'var(--error-400)' },
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

const INTERVAL_HOURS = { '3h': 3, '5h': 5, '6h': 6, '8h': 8, '12h': 12 };

function NextRunCountdown({ automation }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!automation?.enabled || !automation?.last_trigger_at) {
    return <span style={{ color: 'var(--text-500)' }}>--:--:--</span>;
  }
  const hours = INTERVAL_HOURS[automation.interval];
  if (!hours) return <span style={{ color: 'var(--text-500)' }}>--:--:--</span>;

  const nextRun = new Date(automation.last_trigger_at).getTime() + hours * 3600000;
  const remaining = nextRun - Date.now();
  if (remaining <= 0) return <span className="text-gradient font-bold">Due now</span>;

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return (
    <span className="text-gradient font-mono text-lg font-bold tracking-tight">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

const TABS = [
  { key: 'kanban', label: 'Pipeline', icon: FolderKanban },
  { key: 'recipes', label: 'All Recipes', icon: FileText },
  { key: 'spy', label: 'Recipe Spy', icon: Rss },
  { key: 'activity', label: 'Activity', icon: Activity },
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('kanban');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [expandedJob, setExpandedJob] = useState(null);
  const [runningRecipeId, setRunningRecipeId] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const pollRef = useRef(null);

  // Delete state
  const [deleteProject, setDeleteProject] = useState(false);
  const [deleteJobTarget, setDeleteJobTarget] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  // Spy state
  const [spyItems, setSpyItems] = useState([]);
  const [spyLoading, setSpyLoading] = useState(false);
  const [selectedSpyItems, setSelectedSpyItems] = useState(new Set());
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [spyStats, setSpyStats] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, recipesRes, jobsRes, statsRes] = await Promise.all([
        client.get(`/projects/${id}`),
        client.get(`/projects/${id}/recipes`),
        client.get(`/projects/${id}/jobs`),
        client.get(`/projects/${id}/stats`),
      ]);
      setProject(projRes.data);
      setRecipes(recipesRes.data);
      setJobs(jobsRes.data);
      setStats(statsRes.data);
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(fetchData, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchData]);

  const handleRunRecipe = async (recipeId) => {
    setRunningRecipeId(recipeId);
    setError('');
    try {
      await client.post(`/projects/${id}/recipes/${recipeId}/run`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start recipe');
    } finally {
      setRunningRecipeId(null);
    }
  };

  const handleRunNext = async () => {
    setError('');
    try {
      const { data } = await client.post(`/projects/${id}/jobs`, {
        type: 'pipeline',
        description: 'Full recipe pipeline',
      });
      setJobs((prev) => [data, ...prev]);
      setActiveTab('activity');
      setExpandedJob(data.id);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start pipeline');
    }
  };

  const handleSyncSheet = async () => {
    setSyncLoading(true);
    setError('');
    try {
      const { data } = await client.post(`/projects/${id}/sync-sheet`);
      setError('');
      await fetchData();
      if (data.imported > 0) {
        setError(`Imported ${data.imported} new recipes from sheet`);
      } else {
        setError('Sheet is already in sync');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sync sheet');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    try {
      await client.delete(`/projects/${id}`);
      navigate('/');
    } catch {
      setError('Failed to delete project');
    }
    setDeleteProject(false);
  };

  const handleDeleteJob = async () => {
    if (!deleteJobTarget) return;
    try {
      await client.delete(`/projects/${id}/jobs/${deleteJobTarget.id}`);
      setJobs((prev) => prev.filter((j) => j.id !== deleteJobTarget.id));
    } catch {
      setError('Failed to delete job');
    }
    setDeleteJobTarget(null);
  };

  const handleRetryJob = async (job) => {
    setRetryingId(job.id);
    setError('');
    try {
      await client.post(`/projects/${id}/jobs/${job.id}/retry`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  // Spy handlers
  const fetchSpyData = async () => {
    setSpyLoading(true);
    setError('');
    setSpyItems([]);
    setSelectedSpyItems(new Set());
    setSpyStats(null);
    try {
      const { data } = await client.get(`/projects/${id}/spy/fetch`);
      setSpyItems(data.items || []);
      setSpyStats(data.stats || null);
      if (data.items?.length === 0 && data.stats) {
        const s = data.stats;
        if (s.skippedKeyword > 0 && s.totalFromFeeds > 0) {
          setError(`Found ${s.totalFromFeeds} recipes but ${s.skippedKeyword} filtered by keywords. Try removing keyword filters.`);
        } else if (s.skippedExisting > 0) {
          setError(`All ${s.skippedExisting} recipes already exist in your queue.`);
        } else if (s.feedsFailed > 0 && s.feedsSucceeded === 0) {
          setError(`All ${s.feedsFailed} feeds failed to fetch. Check feed URLs.`);
        } else {
          setError('No new recipes found.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch spy data');
    } finally {
      setSpyLoading(false);
    }
  };

  const toggleSpyItem = (idx) => {
    setSelectedSpyItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAllSpyItems = () => {
    if (selectedSpyItems.size === spyItems.length) {
      setSelectedSpyItems(new Set());
    } else {
      setSelectedSpyItems(new Set(spyItems.map((_, i) => i)));
    }
  };

  const addSpyToQueue = async () => {
    if (selectedSpyItems.size === 0) return;
    setAddingToQueue(true);
    setError('');
    try {
      const itemsToAdd = [...selectedSpyItems].map((i) => spyItems[i]);
      const { data } = await client.post(`/projects/${id}/spy/add`, { items: itemsToAdd });
      setError(data.message || `Added ${data.created?.length || 0} recipes to queue`);
      // Remove added items from spy list
      setSpyItems((prev) => prev.filter((_, i) => !selectedSpyItems.has(i)));
      setSelectedSpyItems(new Set());
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add to queue');
    } finally {
      setAddingToQueue(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary-500)' }} />
        <span style={{ color: 'var(--text-400)' }}>Loading project...</span>
      </div>
    );
  }
  if (!project) {
    return <div className="text-center py-12" style={{ color: 'var(--error-400)' }}>Project not found</div>;
  }

  const hasRunningJob = jobs.some((j) => j.status === 'pending' || j.status === 'running');
  const rc = stats?.recipeCounts || { total: 0, new: 0, processing: 0, completed: 0, failed: 0 };
  const automation = stats?.automation || {};

  // Filtered recipes per tab
  const getFilteredRecipes = () => {
    let filtered = recipes;
    if (statusFilter !== 'all') filtered = recipes.filter((r) => r.status === statusFilter);
    return filtered;
  };

  const filteredRecipes = getFilteredRecipes();

  // Time filter helper
  const filterByTime = (items) => {
    if (timeFilter === 'all') return items;
    const now = new Date();
    const getThreshold = () => {
      switch (timeFilter) {
        case '24h': return new Date(now - 24 * 60 * 60 * 1000);
        case 'yesterday': {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);
          return { start: yesterday, end: todayStart };
        }
        case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
        case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
        default: return null;
      }
    };
    const threshold = getThreshold();
    if (!threshold) return items;
    
    return items.filter(r => {
      const date = new Date(r.updatedAt || r.createdAt);
      if (threshold.start && threshold.end) {
        return date >= threshold.start && date < threshold.end;
      }
      return date >= threshold;
    });
  };

  // Kanban columns (with time filter)
  const kanbanColumns = [
    { key: 'new', label: 'Queued', icon: Clock, items: filterByTime(recipes.filter(r => r.status === 'new')), color: 'var(--text-400)' },
    { key: 'processing', label: 'Processing', icon: Zap, items: filterByTime(recipes.filter(r => r.status === 'processing')), color: 'var(--primary-400)' },
    { key: 'completed', label: 'Published', icon: CheckCircle2, items: filterByTime(recipes.filter(r => r.status === 'completed')), color: 'var(--success-400)' },
    { key: 'failed', label: 'Failed', icon: XCircle, items: filterByTime(recipes.filter(r => r.status === 'failed')), color: 'var(--error-400)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
          <div>
            <Link 
              to="/" 
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors mb-3"
              style={{ color: 'var(--primary-400)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-50)' }}>
              {project.name}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              {automation.enabled ? (
                <span 
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(5, 150, 105, 0.2)', color: 'var(--success-400)' }}
                >
                  <span className="status-dot status-dot-running" style={{ background: 'var(--success-400)' }} />
                  Automated every {automation.interval}
                </span>
              ) : (
                <span 
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--bg-700)', color: 'var(--text-400)' }}
                >
                  <span className="status-dot" style={{ background: 'var(--text-500)' }} />
                  Manual mode
                </span>
              )}
              {!automation.has_sheet && (
                <span 
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(217, 119, 6, 0.2)', color: 'var(--warning-400)' }}
                >
                  No sheet linked
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSyncSheet}
              disabled={syncLoading || !automation.has_sheet}
              className="btn btn-secondary"
            >
              <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
              {syncLoading ? 'Syncing...' : 'Sync Sheet'}
            </button>
            <button
              onClick={handleRunNext}
              disabled={hasRunningJob}
              className="btn btn-primary"
            >
              <Play className="w-4 h-4" />
              Run Next
            </button>
            <Link to={`/projects/${id}/settings`} className="btn btn-secondary">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button 
              onClick={() => setDeleteProject(true)}
              className="btn btn-ghost"
              style={{ color: 'var(--error-400)' }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error/Info Banner */}
      {error && (
        <div 
          className="p-4 rounded-lg border text-sm font-medium flex items-center gap-2"
          style={{ 
            background: error.includes('Imported') || error.includes('sync') 
              ? 'rgba(5, 150, 105, 0.1)' 
              : 'rgba(220, 38, 38, 0.1)',
            borderColor: error.includes('Imported') || error.includes('sync')
              ? 'rgba(5, 150, 105, 0.3)'
              : 'rgba(220, 38, 38, 0.3)',
            color: error.includes('Imported') || error.includes('sync')
              ? 'var(--success-400)'
              : 'var(--error-400)'
          }}
        >
          {error.includes('Imported') || error.includes('sync') ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard label="Total" value={rc.total} icon={FileText} variant="default" />
        <StatsCard label="Queued" value={rc.new} icon={Clock} variant="default" />
        <StatsCard label="Processing" value={rc.processing} icon={Zap} variant="warning" />
        <StatsCard label="Published" value={rc.completed} icon={CheckCircle2} variant="success" />
        <StatsCard label="Failed" value={rc.failed} icon={XCircle} variant="danger" />
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99, 102, 241, 0.2)' }}
            >
              <Timer className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
            </div>
            <div className="text-right">
              <NextRunCountdown automation={automation} />
              <div className="stat-label">Next Run</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="border-b px-2 pt-1" style={{ borderColor: 'var(--glass-border)' }}>
          <nav className="flex gap-0.5 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count = tab.key === 'activity' ? jobs.length : rc.total;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setStatusFilter('all'); }}
                  className="px-5 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer flex items-center gap-2"
                  style={{
                    borderColor: isActive ? 'var(--primary-500)' : 'transparent',
                    color: isActive ? 'var(--primary-400)' : 'var(--text-400)'
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.key === 'activity' && count > 0 && (
                    <span 
                      className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
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

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === 'kanban' && (
            <>
              {/* Time Filter */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs font-medium" style={{ color: 'var(--text-400)' }}>Filter:</span>
                {[
                  { key: 'all', label: 'All Time' },
                  { key: '24h', label: 'Last 24h' },
                  { key: 'yesterday', label: 'Yesterday' },
                  { key: '7d', label: 'Last 7 Days' },
                  { key: '30d', label: 'Last 30 Days' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTimeFilter(f.key)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer"
                    style={{
                      background: timeFilter === f.key ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-700)',
                      color: timeFilter === f.key ? 'var(--primary-400)' : 'var(--text-400)',
                      border: timeFilter === f.key ? '1px solid var(--primary-500)' : '1px solid transparent'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <KanbanView
                columns={kanbanColumns}
                onSelectRecipe={setSelectedRecipe}
                handleRunRecipe={handleRunRecipe}
                runningRecipeId={runningRecipeId}
              />
            </>
          )}
          
          {activeTab === 'recipes' && (
            <RecipesTab
              recipes={filteredRecipes}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              runningRecipeId={runningRecipeId}
              handleRunRecipe={handleRunRecipe}
              onSelectRecipe={setSelectedRecipe}
            />
          )}

          {activeTab === 'spy' && (
            <SpyTab
              spyItems={spyItems}
              spyLoading={spyLoading}
              selectedSpyItems={selectedSpyItems}
              toggleSpyItem={toggleSpyItem}
              selectAllSpyItems={selectAllSpyItems}
              fetchSpyData={fetchSpyData}
              addSpyToQueue={addSpyToQueue}
              addingToQueue={addingToQueue}
              project={project}
            />
          )}
          
          {activeTab === 'activity' && (
            <ActivityTab
              jobs={jobs}
              projectId={id}
              expandedJob={expandedJob}
              setExpandedJob={setExpandedJob}
              handleRetryJob={handleRetryJob}
              retryingId={retryingId}
              setDeleteJobTarget={setDeleteJobTarget}
              fetchData={fetchData}
            />
          )}
        </div>
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onRun={handleRunRecipe}
          runningRecipeId={runningRecipeId}
        />
      )}

      {/* Delete Dialogs */}
      <ConfirmDialog
        open={deleteProject}
        title="Delete Project"
        message={`Delete "${project.name}" and all its jobs? This cannot be undone.`}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteProject(false)}
      />
      <ConfirmDialog
        open={!!deleteJobTarget}
        title="Delete Job"
        message={`Delete job "${deleteJobTarget?.type}"?`}
        onConfirm={handleDeleteJob}
        onCancel={() => setDeleteJobTarget(null)}
      />
    </div>
  );
}

/* ── Kanban View ── */
function KanbanView({ columns, onSelectRecipe, handleRunRecipe, runningRecipeId }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => {
        const Icon = column.icon;
        return (
          <div key={column.key} className="kanban-column">
            <div className="kanban-header">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color: column.color }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-100)' }}>
                  {column.label}
                </span>
              </div>
              <span className="kanban-count">{column.items.length}</span>
            </div>
            <div className="kanban-body">
              {column.items.length === 0 ? (
                <div className="text-center py-8">
                  <Inbox className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-500)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-500)' }}>No recipes</p>
                </div>
              ) : (
                column.items.map((recipe) => (
                  <KanbanCard
                    key={recipe.id}
                    recipe={recipe}
                    onClick={() => onSelectRecipe(recipe)}
                    onRun={() => handleRunRecipe(recipe.id)}
                    isRunning={runningRecipeId === recipe.id}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ recipe, onClick, onRun, isRunning }) {
  const canRun = recipe.status === 'new' || recipe.status === 'failed';
  const pinImage = recipe.wp_pin_image || recipe.pin_image_url || recipe.wp_featured_image;
  
  return (
    <div className="recipe-card" onClick={onClick}>
      {pinImage && (
        <div className="recipe-card-image">
          <img 
            src={`/api/image-proxy?url=${encodeURIComponent(pinImage)}`} 
            alt={recipe.title}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
      <div className="recipe-card-title">{recipe.title}</div>
      {recipe.status === 'completed' && recipe.updatedAt && (
        <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-500)' }}>
          <Calendar className="w-3 h-3" />
          {new Date(recipe.updatedAt).toLocaleDateString()} {new Date(recipe.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
      {recipe.status === 'processing' && recipe.pipeline_step && (
        <div className="recipe-card-status flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--primary-400)' }} />
          <span>{PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step}</span>
        </div>
      )}
      {recipe.status === 'failed' && (
        <div className="recipe-card-status" style={{ color: 'var(--error-400)' }}>
          {recipe.error_message?.slice(0, 50) || 'Failed'}
        </div>
      )}
      {canRun && (
        <button
          onClick={(e) => { e.stopPropagation(); onRun(); }}
          disabled={isRunning}
          className="btn btn-sm mt-2 w-full"
          style={{ 
            background: recipe.status === 'failed' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(99, 102, 241, 0.2)',
            color: recipe.status === 'failed' ? 'var(--warning-400)' : 'var(--primary-400)',
            border: 'none'
          }}
        >
          {isRunning ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : recipe.status === 'failed' ? (
            <><RotateCcw className="w-3 h-3" /> Retry</>
          ) : (
            <><Play className="w-3 h-3" /> Run</>
          )}
        </button>
      )}
    </div>
  );
}

/* ── Proxy URL helper to bypass Cloudflare ── */
function getProxiedUrl(url) {
  if (!url) return null;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

/* ── Image with loading/error state ── */
function ImageWithFallback({ src, alt, className, labelText }) {
  const [status, setStatus] = useState('loading');
  const imgRef = useRef(null);
  const proxiedSrc = getProxiedUrl(src);
  
  useEffect(() => {
    setStatus('loading');
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setStatus('loaded');
    }
  }, [proxiedSrc]);
  
  if (!src) return null;
  
  return (
    <div 
      className={`relative group rounded-xl overflow-hidden ${className || ''}`}
      style={{ background: 'var(--bg-700)', border: '1px solid var(--glass-border)' }}
    >
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-500)' }} />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ color: 'var(--text-500)' }}>
          <Image className="w-8 h-8 mb-1" />
          <span className="text-xs">Failed to load</span>
        </div>
      )}
      <img 
        ref={imgRef}
        src={proxiedSrc} 
        alt={alt} 
        className={`w-full h-full object-cover transition-opacity ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
      {labelText && (
        <span 
          className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded-md"
          style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))' }}
        >
          {labelText}
        </span>
      )}
      {status === 'loaded' && (
        <a 
          href={src} 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span 
            className="text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1"
            style={{ background: 'var(--bg-800)', color: 'var(--text-100)' }}
          >
            <ExternalLink className="w-3 h-3" />
            Open Full Size
          </span>
        </a>
      )}
    </div>
  );
}

/* ── Recipe Detail Modal ── */
function RecipeModal({ recipe, onClose, onRun, runningRecipeId }) {
  const canRun = recipe.status === 'new' || recipe.status === 'failed';
  const isRunning = runningRecipeId === recipe.id;
  const pinImage = recipe.wp_pin_image || recipe.pin_image_url;
  
  const wpImages = [
    { url: recipe.wp_image1, label: 'Image 1' },
    { url: recipe.wp_image2, label: 'Image 2' },
    { url: recipe.wp_featured_image, label: 'Featured' },
  ].filter(i => i.url);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--text-50)' }}>
              {recipe.title}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <RecipeStatusBadge status={recipe.status} />
              {recipe.status === 'processing' && recipe.pipeline_step && (
                <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--primary-400)' }}>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-ghost p-1.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body space-y-6">
          {/* Error banner */}
          {recipe.status === 'failed' && recipe.error_message && (
            <div 
              className="p-4 rounded-lg"
              style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5" style={{ color: 'var(--error-400)' }} />
                <span className="text-sm font-bold" style={{ color: 'var(--error-400)' }}>
                  Failed at: {PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step || 'Unknown step'}
                </span>
              </div>
              <div className="text-sm pl-7" style={{ color: 'var(--error-400)' }}>{recipe.error_message}</div>
            </div>
          )}

          {/* Processing banner */}
          {recipe.status === 'processing' && (
            <div 
              className="p-4 rounded-lg flex items-center gap-3"
              style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)' }}
            >
              <div className="status-dot status-dot-running" />
              <span className="text-sm font-semibold" style={{ color: 'var(--primary-400)' }}>
                Running: {PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step || 'Starting...'}
              </span>
            </div>
          )}

          {/* WordPress Images */}
          {wpImages.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-400)' }}>
                Blog Images
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {wpImages.map((img, i) => (
                  <ImageWithFallback
                    key={i}
                    src={img.url}
                    alt={img.label}
                    className="h-36"
                    labelText={img.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pinterest Pin Design */}
          {pinImage && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-400)' }}>
                Pinterest Pin
              </h3>
              <ImageWithFallback
                src={pinImage}
                alt="Pinterest Pin"
                className="h-80 w-auto inline-block"
                labelText="PIN"
              />
            </div>
          )}

          {/* Info grid */}
          <div className="rounded-lg p-5" style={{ background: 'var(--bg-700)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-400)' }}>
              Details
            </h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium" style={{ color: 'var(--text-500)' }}>Created</dt>
                <dd className="font-medium mt-0.5" style={{ color: 'var(--text-100)' }}>
                  {new Date(recipe.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium" style={{ color: 'var(--text-500)' }}>Updated</dt>
                <dd className="font-medium mt-0.5" style={{ color: 'var(--text-100)' }}>
                  {new Date(recipe.updatedAt).toLocaleString()}
                </dd>
              </div>
              {recipe.wp_post_id && (
                <div>
                  <dt className="text-xs font-medium" style={{ color: 'var(--text-500)' }}>WP Post ID</dt>
                  <dd className="font-medium mt-0.5" style={{ color: 'var(--text-100)' }}>#{recipe.wp_post_id}</dd>
                </div>
              )}
              {recipe.pinterest_board && (
                <div>
                  <dt className="text-xs font-medium" style={{ color: 'var(--text-500)' }}>Pinterest Board</dt>
                  <dd className="font-medium mt-0.5" style={{ color: 'var(--text-100)' }}>{recipe.pinterest_board}</dd>
                </div>
              )}
              {recipe.published_url && (
                <div className="col-span-2">
                  <dt className="text-xs font-medium" style={{ color: 'var(--text-500)' }}>Published URL</dt>
                  <dd className="mt-0.5">
                    <a 
                      href={recipe.published_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-sm break-all flex items-center gap-1"
                      style={{ color: 'var(--primary-400)' }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {recipe.published_url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {canRun && (
            <button
              onClick={() => onRun(recipe.id)}
              disabled={isRunning}
              className={`btn ${recipe.status === 'failed' ? 'btn-warning' : 'btn-primary'}`}
              style={recipe.status === 'failed' ? {
                background: 'linear-gradient(135deg, var(--warning-500), var(--warning-400))',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)'
              } : {}}
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : recipe.status === 'failed' ? (
                <><RotateCcw className="w-4 h-4" /> Retry Pipeline</>
              ) : (
                <><Play className="w-4 h-4" /> Run Pipeline</>
              )}
            </button>
          )}
          {recipe.published_url && (
            <a
              href={recipe.published_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success"
            >
              <ExternalLink className="w-4 h-4" />
              View Post
            </a>
          )}
          <button onClick={onClose} className="btn btn-secondary ml-auto">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Spy Tab ── */
function SpyTab({ spyItems, spyLoading, selectedSpyItems, toggleSpyItem, selectAllSpyItems, fetchSpyData, addSpyToQueue, addingToQueue, project }) {
  const hasFeeds = project?.rss_feeds?.length > 0;
  
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSpyData}
            disabled={spyLoading || !hasFeeds}
            className="btn-primary flex items-center gap-2"
          >
            {spyLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Rss className="w-4 h-4" />
            )}
            {spyLoading ? 'Fetching...' : 'Fetch Latest'}
          </button>
          {spyItems.length > 0 && (
            <>
              <button
                onClick={selectAllSpyItems}
                className="btn-secondary text-sm"
              >
                {selectedSpyItems.size === spyItems.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-xs" style={{ color: 'var(--text-400)' }}>
                {selectedSpyItems.size} of {spyItems.length} selected
              </span>
            </>
          )}
        </div>
        {selectedSpyItems.size > 0 && (
          <button
            onClick={addSpyToQueue}
            disabled={addingToQueue}
            className="btn-success flex items-center gap-2"
          >
            {addingToQueue ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add {selectedSpyItems.size} to Queue
          </button>
        )}
      </div>

      {/* No feeds configured */}
      {!hasFeeds && (
        <div className="text-center py-12">
          <Rss className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-500)' }} />
          <p className="text-sm" style={{ color: 'var(--text-400)' }}>No RSS feeds configured</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-500)' }}>
            Add competitor RSS feeds in project settings to discover new recipes
          </p>
        </div>
      )}

      {/* Loading state */}
      {spyLoading && (
        <div className="flex items-center justify-center py-12 gap-3">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary-500)' }} />
          <span style={{ color: 'var(--text-400)' }}>Fetching recipes from {project?.rss_feeds?.length || 0} feeds...</span>
        </div>
      )}

      {/* Empty state after fetch */}
      {!spyLoading && hasFeeds && spyItems.length === 0 && (
        <div className="text-center py-12">
          <Inbox className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-500)' }} />
          <p className="text-sm" style={{ color: 'var(--text-400)' }}>No new recipes found</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-500)' }}>
            Click "Fetch Latest" to check your RSS feeds for new recipes
          </p>
        </div>
      )}

      {/* Results grid */}
      {!spyLoading && spyItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {spyItems.map((item, idx) => {
            const isSelected = selectedSpyItems.has(idx);
            return (
              <div
                key={idx}
                onClick={() => toggleSpyItem(idx)}
                className="spy-card relative rounded-xl overflow-hidden cursor-pointer transition-all"
                style={{
                  background: 'var(--bg-800)',
                  border: isSelected ? '2px solid var(--primary-500)' : '2px solid transparent',
                  boxShadow: isSelected ? '0 0 0 3px rgba(99, 102, 241, 0.2)' : 'none'
                }}
              >
                {/* Selection indicator */}
                <div
                  className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: isSelected ? 'var(--primary-500)' : 'rgba(0,0,0,0.5)',
                    border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.3)'
                  }}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>

                {/* Image */}
                <div className="aspect-video overflow-hidden" style={{ background: 'var(--bg-700)' }}>
                  {item.image ? (
                    <img
                      src={`/api/image-proxy?url=${encodeURIComponent(item.image)}`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8" style={{ color: 'var(--text-500)' }} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3">
                  <h4 className="font-medium text-sm line-clamp-2 mb-2" style={{ color: 'var(--text-100)' }}>
                    {item.title}
                  </h4>
                  {item.pubDate && (
                    <div className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-500)' }}>
                      <Calendar className="w-3 h-3" />
                      {new Date(item.pubDate).toLocaleDateString()} {new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {item.categories && item.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.categories.slice(0, 3).map((cat, ci) => (
                        <span
                          key={ci}
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(5, 150, 105, 0.15)', color: 'var(--success-400)' }}
                        >
                          {cat}
                        </span>
                      ))}
                      {item.categories.length > 3 && (
                        <span className="text-xs" style={{ color: 'var(--text-500)' }}>+{item.categories.length - 3}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ 
                        background: 'rgba(99, 102, 241, 0.15)', 
                        color: 'var(--primary-400)' 
                      }}
                    >
                      {item.domain}
                    </span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs opacity-60 hover:opacity-100"
                        style={{ color: 'var(--text-400)' }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Recipes Tab ── */
function RecipesTab({ recipes, statusFilter, setStatusFilter, runningRecipeId, handleRunRecipe, onSelectRecipe }) {
  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-5">
        <ListFilter className="w-4 h-4" style={{ color: 'var(--text-500)' }} />
        <span className="text-xs font-medium uppercase tracking-wider mr-1" style={{ color: 'var(--text-500)' }}>Filter</span>
        {['all', 'new', 'processing', 'completed', 'failed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all"
            style={{
              background: statusFilter === s ? 'linear-gradient(135deg, var(--primary-500), var(--accent-500))' : 'var(--bg-700)',
              color: statusFilter === s ? 'white' : 'var(--text-300)',
              border: 'none'
            }}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-500)' }} />
          <div className="text-sm font-medium" style={{ color: 'var(--text-400)' }}>
            No recipes found
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-500)' }}>
            Sync your Google Sheet to import recipes
          </div>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-700)' }}>
                <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wider w-[40%]" style={{ color: 'var(--text-400)' }}>Recipe</th>
                <th className="text-left px-4 py-3.5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-400)' }}>Status</th>
                <th className="text-left px-4 py-3.5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-400)' }}>Step</th>
                <th className="text-left px-4 py-3.5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-400)' }}>Date</th>
                <th className="text-right px-5 py-3.5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-400)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((recipe, idx) => (
                <RecipeRow
                  key={recipe.id}
                  recipe={recipe}
                  runningRecipeId={runningRecipeId}
                  handleRunRecipe={handleRunRecipe}
                  onClick={() => onSelectRecipe(recipe)}
                  isLast={idx === recipes.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RecipeRow({ recipe, runningRecipeId, handleRunRecipe, onClick, isLast }) {
  const canRun = recipe.status === 'new' || recipe.status === 'failed';
  const isRunning = runningRecipeId === recipe.id;

  return (
    <tr 
      className="cursor-pointer transition-colors group"
      style={{ 
        borderBottom: isLast ? 'none' : '1px solid var(--glass-border)',
        background: 'var(--bg-800)'
      }}
      onClick={onClick}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-700)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-800)'}
    >
      <td className="px-5 py-3.5">
        <div className="font-medium truncate max-w-xs transition-colors" style={{ color: 'var(--text-100)' }}>
          {recipe.title}
        </div>
      </td>
      <td className="px-4 py-3.5"><RecipeStatusBadge status={recipe.status} /></td>
      <td className="px-4 py-3.5 text-xs">
        {recipe.status === 'processing' ? (
          <span className="inline-flex items-center gap-1 font-medium" style={{ color: 'var(--primary-400)' }}>
            <Loader2 className="w-3 h-3 animate-spin" />
            {PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step || '-'}
          </span>
        ) : recipe.status === 'failed' ? (
          <span className="font-medium" style={{ color: 'var(--error-400)' }}>
            {PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step || '-'}
          </span>
        ) : (
          <span style={{ color: 'var(--text-500)' }}>-</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-xs font-medium" style={{ color: 'var(--text-400)' }}>
        {new Date(recipe.updatedAt || recipe.createdAt).toLocaleDateString()}
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          {canRun && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRunRecipe(recipe.id); }}
              disabled={isRunning}
              className="btn btn-sm"
              style={{ 
                background: recipe.status === 'failed' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                color: recipe.status === 'failed' ? 'var(--warning-400)' : 'var(--primary-400)',
                border: 'none'
              }}
            >
              {isRunning ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : recipe.status === 'failed' ? (
                <><RotateCcw className="w-3 h-3" /> Retry</>
              ) : (
                <><Play className="w-3 h-3" /> Run</>
              )}
            </button>
          )}
          {recipe.published_url && (
            <a
              href={recipe.published_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn btn-sm"
              style={{ 
                background: 'rgba(5, 150, 105, 0.2)',
                color: 'var(--success-400)',
                border: 'none'
              }}
            >
              <ExternalLink className="w-3 h-3" />
              View
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ── Activity Tab (Job History) ── */
function ActivityTab({ jobs, projectId, expandedJob, setExpandedJob, handleRetryJob, retryingId, setDeleteJobTarget, fetchData }) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-16">
        <Activity className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-500)' }} />
        <div className="text-sm font-medium" style={{ color: 'var(--text-400)' }}>
          No pipeline activity yet
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--text-500)' }}>
          Run a recipe to see it here
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div 
          key={job.id} 
          className="card overflow-hidden"
        >
          <div
            className="p-4 flex items-center justify-between cursor-pointer transition-colors"
            style={{ background: expandedJob === job.id ? 'var(--bg-700)' : 'transparent' }}
            onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
          >
            <div className="flex items-center gap-3">
              <JobStatusBadge status={job.status} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-100)' }}>
                {job.description || job.type}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium" style={{ color: 'var(--text-500)' }}>
                {new Date(job.createdAt).toLocaleDateString()} {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {job.status === 'failed' && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRetryJob(job); }}
                  disabled={retryingId === job.id}
                  className="btn btn-sm"
                  style={{ 
                    background: 'rgba(217, 119, 6, 0.2)',
                    color: 'var(--warning-400)',
                    border: 'none'
                  }}
                >
                  {retryingId === job.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <><RotateCcw className="w-3 h-3" /> Retry</>
                  )}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteJobTarget(job); }}
                className="btn btn-ghost p-1"
                style={{ color: 'var(--text-500)' }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {expandedJob === job.id ? (
                <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-400)' }} />
              ) : (
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-400)' }} />
              )}
            </div>
          </div>
          {expandedJob === job.id && (
            <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
              <PipelineTracker projectId={projectId} job={job} onUpdate={fetchData} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
