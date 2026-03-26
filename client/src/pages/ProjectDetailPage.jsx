import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import JobStatusBadge from '../components/JobStatusBadge';
import PipelineTracker from '../components/PipelineTracker';
import ConfirmDialog from '../components/ConfirmDialog';

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
    new: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'New' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
  }[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function StatsCard({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const INTERVAL_HOURS = { '3h': 3, '5h': 5, '6h': 6, '8h': 8, '12h': 12 };

function NextRunCountdown({ automation }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!automation?.enabled || !automation?.last_trigger_at) {
    return <span className="text-gray-400">—</span>;
  }
  const hours = INTERVAL_HOURS[automation.interval];
  if (!hours) return <span className="text-gray-400">—</span>;

  const nextRun = new Date(automation.last_trigger_at).getTime() + hours * 3600000;
  const remaining = nextRun - Date.now();
  if (remaining <= 0) return <span className="text-green-600 font-medium">Due now</span>;

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return <span className="text-blue-600 font-mono text-sm">{h}h {m}m {s}s</span>;
}

const TABS = [
  { key: 'recipes', label: 'All Recipes', icon: '📋' },
  { key: 'queue', label: 'Queue', icon: '⏳' },
  { key: 'completed', label: 'Completed', icon: '✅' },
  { key: 'failed', label: 'Failed', icon: '❌' },
  { key: 'activity', label: 'Activity', icon: '📊' },
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
  const [activeTab, setActiveTab] = useState('recipes');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedJob, setExpandedJob] = useState(null);
  const [runningRecipeId, setRunningRecipeId] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const pollRef = useRef(null);

  // Delete state
  const [deleteProject, setDeleteProject] = useState(false);
  const [deleteJobTarget, setDeleteJobTarget] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

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
        setError(`✓ Imported ${data.imported} new recipes from sheet`);
      } else {
        setError('✓ Sheet is already in sync — no new recipes');
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

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading project...</div>;
  }
  if (!project) {
    return <div className="text-center py-12 text-red-500">Project not found</div>;
  }

  const hasRunningJob = jobs.some((j) => j.status === 'pending' || j.status === 'running');
  const rc = stats?.recipeCounts || { total: 0, new: 0, processing: 0, completed: 0, failed: 0 };
  const automation = stats?.automation || {};

  // Filtered recipes per tab
  const getFilteredRecipes = () => {
    let filtered = recipes;
    if (activeTab === 'queue') filtered = recipes.filter((r) => r.status === 'new');
    else if (activeTab === 'completed') filtered = recipes.filter((r) => r.status === 'completed');
    else if (activeTab === 'failed') filtered = recipes.filter((r) => r.status === 'failed');
    else if (statusFilter !== 'all') filtered = recipes.filter((r) => r.status === statusFilter);
    return filtered;
  };

  const filteredRecipes = getFilteredRecipes();

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-500">&larr; Back to Projects</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{project.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            {automation.enabled ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Auto: every {automation.interval}
              </span>
            ) : (
              <span className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                Manual mode
              </span>
            )}
            {!automation.has_sheet && (
              <span className="text-xs text-amber-600">⚠ No Google Sheet connected</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncSheet}
            disabled={syncLoading || !automation.has_sheet}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            {syncLoading ? '⟳ Syncing...' : '⟳ Sync Sheet'}
          </button>
          <button
            onClick={handleRunNext}
            disabled={hasRunningJob}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
          >
            ▶ Run Next
          </button>
          <Link to={`/projects/${id}/settings`}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
            ⚙ Settings
          </Link>
          <button onClick={() => setDeleteProject(true)}
            className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 cursor-pointer">
            Delete
          </button>
        </div>
      </div>

      {/* Error / info banner */}
      {error && (
        <div className={`mb-4 p-3 rounded-md text-sm border ${
          error.startsWith('✓') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>{error}</div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatsCard label="Total Recipes" value={rc.total} />
        <StatsCard label="In Queue" value={rc.new} color="text-gray-600" />
        <StatsCard label="Processing" value={rc.processing} color="text-blue-600" />
        <StatsCard label="Completed" value={rc.completed} color="text-green-600" />
        <StatsCard label="Failed" value={rc.failed} color="text-red-600" />
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-sm font-medium text-gray-700 mb-1">Next Run</div>
          <NextRunCountdown automation={automation} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => {
            const count = tab.key === 'queue' ? rc.new
              : tab.key === 'completed' ? rc.completed
              : tab.key === 'failed' ? rc.failed
              : tab.key === 'activity' ? jobs.length
              : rc.total;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setStatusFilter('all'); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{count}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'activity' ? (
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
      ) : (
        <RecipesTab
          recipes={filteredRecipes}
          activeTab={activeTab}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          runningRecipeId={runningRecipeId}
          handleRunRecipe={handleRunRecipe}
          expandedRecipe={expandedRecipe}
          setExpandedRecipe={setExpandedRecipe}
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

/* ── Recipes Tab (used for All Recipes, Queue, Completed, Failed) ── */
function RecipesTab({ recipes, activeTab, statusFilter, setStatusFilter, runningRecipeId, handleRunRecipe, expandedRecipe, setExpandedRecipe }) {
  return (
    <div>
      {/* Filter bar (only on All Recipes tab) */}
      {activeTab === 'recipes' && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">Filter:</span>
          {['all', 'new', 'processing', 'completed', 'failed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 text-xs rounded-full border cursor-pointer transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg border border-gray-200 text-gray-500 text-sm">
          {activeTab === 'queue' ? 'No recipes in queue. Sync your Google Sheet to import recipes.'
            : activeTab === 'completed' ? 'No completed recipes yet.'
            : activeTab === 'failed' ? 'No failed recipes — looking good!'
            : 'No recipes found. Sync your Google Sheet to get started.'}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-[40%]">Recipe</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Step</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recipes.map((recipe) => (
                <RecipeRow
                  key={recipe.id}
                  recipe={recipe}
                  runningRecipeId={runningRecipeId}
                  handleRunRecipe={handleRunRecipe}
                  expanded={expandedRecipe === recipe.id}
                  onToggle={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RecipeRow({ recipe, runningRecipeId, handleRunRecipe, expanded, onToggle }) {
  const canRun = recipe.status === 'new' || recipe.status === 'failed';
  const isRunning = runningRecipeId === recipe.id;

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900 truncate max-w-xs">{recipe.title}</div>
        </td>
        <td className="px-4 py-3"><RecipeStatusBadge status={recipe.status} /></td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {recipe.status === 'processing'
            ? <span className="text-blue-600">{PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step || '—'}</span>
            : recipe.status === 'failed'
              ? <span className="text-red-500">{PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step || '—'}</span>
              : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">
          {new Date(recipe.updatedAt || recipe.createdAt).toLocaleDateString()}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {canRun && (
              <button
                onClick={(e) => { e.stopPropagation(); handleRunRecipe(recipe.id); }}
                disabled={isRunning}
                className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 disabled:opacity-50 cursor-pointer"
              >
                {isRunning ? '...' : recipe.status === 'failed' ? '↻ Retry' : '▶ Run'}
              </button>
            )}
            {recipe.published_url && (
              <a
                href={recipe.published_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-2.5 py-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded hover:bg-green-100"
              >
                🔗 View
              </a>
            )}
            <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="5" className="px-4 py-4 bg-gray-50">
            <RecipeDetail recipe={recipe} />
          </td>
        </tr>
      )}
    </>
  );
}

function RecipeDetail({ recipe }) {
  return (
    <div className="space-y-3 text-sm">
      {/* Error message */}
      {recipe.status === 'failed' && recipe.error_message && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-xs font-semibold text-red-600 mb-1">
            Failed at: {PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step || 'Unknown step'}
          </div>
          <div className="text-red-700 text-xs">{recipe.error_message}</div>
        </div>
      )}

      {/* Processing status */}
      {recipe.status === 'processing' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-blue-700 text-xs">
            Currently running: {PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step || 'Starting...'}
          </span>
        </div>
      )}

      {/* Info grid */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
        <div>
          <dt className="text-gray-400">Created</dt>
          <dd className="text-gray-700">{new Date(recipe.createdAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Updated</dt>
          <dd className="text-gray-700">{new Date(recipe.updatedAt).toLocaleString()}</dd>
        </div>
        {recipe.wp_post_id && (
          <div>
            <dt className="text-gray-400">WP Post ID</dt>
            <dd className="text-gray-700">#{recipe.wp_post_id}</dd>
          </div>
        )}
        {recipe.published_url && (
          <div className="col-span-2">
            <dt className="text-gray-400">Published URL</dt>
            <dd>
              <a href={recipe.published_url} target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-500 break-all">{recipe.published_url}</a>
            </dd>
          </div>
        )}
        {recipe.pinterest_board && (
          <div>
            <dt className="text-gray-400">Pin Board</dt>
            <dd className="text-gray-700">{recipe.pinterest_board}</dd>
          </div>
        )}
      </dl>

      {/* Images preview */}
      {(recipe.mj_image1 || recipe.pin_image_url) && (
        <div>
          <div className="text-xs text-gray-400 mb-1">Generated Images</div>
          <div className="flex gap-2 flex-wrap">
            {[recipe.mj_image1, recipe.mj_image2, recipe.mj_image3, recipe.mj_image4].filter(Boolean).map((img, i) => (
              <img key={i} src={img} alt={`MJ ${i + 1}`} className="h-16 w-auto rounded border border-gray-200 object-cover" />
            ))}
            {recipe.pin_image_url && (
              <img src={recipe.pin_image_url} alt="Pin" className="h-16 w-auto rounded border border-purple-200 object-cover" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Activity Tab (Job History) ── */
function ActivityTab({ jobs, projectId, expandedJob, setExpandedJob, handleRetryJob, retryingId, setDeleteJobTarget, fetchData }) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg border border-gray-200 text-gray-500 text-sm">
        No pipeline activity yet. Run a recipe to see it here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="bg-white rounded-lg border border-gray-200">
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
          >
            <div className="flex items-center gap-3">
              <JobStatusBadge status={job.status} />
              <span className="text-sm font-medium text-gray-900">{job.description || job.type}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{new Date(job.createdAt).toLocaleString()}</span>
              {job.status === 'failed' && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRetryJob(job); }}
                  disabled={retryingId === job.id}
                  className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
                >
                  {retryingId === job.id ? '...' : '↻ Retry'}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteJobTarget(job); }}
                className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
              >
                Delete
              </button>
              <span className="text-gray-400 text-xs">{expandedJob === job.id ? '▲' : '▼'}</span>
            </div>
          </div>
          {expandedJob === job.id && (
            <div className="px-4 pb-4">
              <PipelineTracker projectId={projectId} job={job} onUpdate={fetchData} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
