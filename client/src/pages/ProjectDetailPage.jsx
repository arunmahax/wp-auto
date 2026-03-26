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
    new: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400', label: 'New' },
    processing: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500 animate-pulse', label: 'Processing' },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Completed' },
    failed: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', label: 'Failed' },
  }[status] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function StatsCard({ label, value, icon, color = 'text-gray-900', accent = 'from-white to-white' }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${accent} border border-gray-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-3xl font-extrabold tracking-tight ${color}`}>{value}</div>
          <div className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">{label}</div>
        </div>
        {icon && <div className="text-2xl opacity-40">{icon}</div>}
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
    return <span className="text-gray-400 text-sm">—</span>;
  }
  const hours = INTERVAL_HOURS[automation.interval];
  if (!hours) return <span className="text-gray-400 text-sm">—</span>;

  const nextRun = new Date(automation.last_trigger_at).getTime() + hours * 3600000;
  const remaining = nextRun - Date.now();
  if (remaining <= 0) return <span className="text-emerald-600 font-semibold text-sm">Due now</span>;

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return (
    <span className="text-indigo-600 font-mono text-lg font-bold tracking-tight">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
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
  const [selectedRecipe, setSelectedRecipe] = useState(null);
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
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <svg className="animate-spin h-5 w-5 text-indigo-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        <span className="text-gray-500 text-sm">Loading project...</span>
      </div>
    );
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
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back to Projects
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2 tracking-tight">{project.name}</h1>
            <div className="flex items-center gap-3 mt-3">
              {automation.enabled ? (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Automated · every {automation.interval}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                  <span className="w-2 h-2 bg-slate-300 rounded-full" />
                  Manual mode
                </span>
              )}
              {!automation.has_sheet && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  ⚠ No sheet linked
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSyncSheet}
              disabled={syncLoading || !automation.has_sheet}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm disabled:opacity-40 cursor-pointer transition-all"
            >
              <svg className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {syncLoading ? 'Syncing...' : 'Sync Sheet'}
            </button>
            <button
              onClick={handleRunNext}
              disabled={hasRunningJob}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 disabled:opacity-40 cursor-pointer transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
              Run Next
            </button>
            <Link to={`/projects/${id}/settings`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Settings
            </Link>
            <button onClick={() => setDeleteProject(true)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 shadow-sm cursor-pointer transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Error / info banner ── */}
      {error && (
        <div className={`p-4 rounded-xl text-sm font-medium border shadow-sm ${
          error.startsWith('✓')
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>{error}</div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard label="Total" value={rc.total} icon="📋" accent="from-slate-50 to-white" />
        <StatsCard label="In Queue" value={rc.new} icon="⏳" color="text-slate-700" accent="from-slate-50 to-white" />
        <StatsCard label="Processing" value={rc.processing} icon="⚡" color="text-blue-600" accent="from-blue-50 to-white" />
        <StatsCard label="Completed" value={rc.completed} icon="✅" color="text-emerald-600" accent="from-emerald-50 to-white" />
        <StatsCard label="Failed" value={rc.failed} icon="❌" color="text-rose-600" accent="from-rose-50 to-white" />
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-white border border-gray-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Next Run</div>
          <NextRunCountdown automation={automation} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-2 pt-1">
          <nav className="flex gap-0.5 -mb-px">
            {TABS.map((tab) => {
              const count = tab.key === 'queue' ? rc.new
                : tab.key === 'completed' ? rc.completed
                : tab.key === 'failed' ? rc.failed
                : tab.key === 'activity' ? jobs.length
                : rc.total;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setStatusFilter('all'); }}
                  className={`relative px-5 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {tab.icon} {tab.label}
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-semibold ${
                      isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                    }`}>{count}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-5">
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
              onSelectRecipe={setSelectedRecipe}
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

/* ── Recipe Detail Modal ── */
function RecipeModal({ recipe, onClose, onRun, runningRecipeId }) {
  const canRun = recipe.status === 'new' || recipe.status === 'failed';
  const isRunning = runningRecipeId === recipe.id;
  const wpImages = [
    { url: recipe.wp_image1, label: 'WP Image 1' },
    { url: recipe.wp_image2, label: 'WP Image 2' },
    { url: recipe.wp_featured_image, label: 'Featured Image' },
  ].filter(i => i.url);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-start justify-between gap-4 z-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{recipe.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              <RecipeStatusBadge status={recipe.status} />
              {recipe.status === 'processing' && recipe.pipeline_step && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Error banner */}
          {recipe.status === 'failed' && recipe.error_message && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-sm font-bold">!</span>
                <span className="text-sm font-bold text-rose-700">
                  Failed at: {PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step || 'Unknown step'}
                </span>
              </div>
              <div className="text-rose-600 text-sm leading-relaxed pl-8">{recipe.error_message}</div>
            </div>
          )}

          {/* Processing banner */}
          {recipe.status === 'processing' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
              <div className="relative flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500 items-center justify-center">
                  <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </span>
              </div>
              <span className="text-blue-700 text-sm font-semibold">
                Running: {PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step || 'Starting...'}
              </span>
            </div>
          )}

          {/* WordPress Images */}
          {wpImages.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">WordPress Images</h3>
              <div className="grid grid-cols-2 gap-3">
                {wpImages.map((img, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img src={img.url} alt={img.label} className="w-full h-48 object-cover" />
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">{img.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pinterest Pin Design */}
          {recipe.pin_image_url && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pinterest Pin</h3>
              <div className="relative inline-block rounded-xl overflow-hidden border-2 border-purple-200 bg-purple-50">
                <img src={recipe.pin_image_url} alt="Pinterest Pin" className="h-72 w-auto object-contain" />
                <span className="absolute top-2 left-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">PIN</span>
              </div>
            </div>
          )}

          {/* Info grid */}
          <div className="bg-gray-50 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Details</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-gray-400 text-xs font-medium">Created</dt>
                <dd className="text-gray-800 font-medium mt-0.5">{new Date(recipe.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs font-medium">Updated</dt>
                <dd className="text-gray-800 font-medium mt-0.5">{new Date(recipe.updatedAt).toLocaleString()}</dd>
              </div>
              {recipe.wp_post_id && (
                <div>
                  <dt className="text-gray-400 text-xs font-medium">WP Post ID</dt>
                  <dd className="text-gray-800 font-medium mt-0.5">#{recipe.wp_post_id}</dd>
                </div>
              )}
              {recipe.pinterest_board && (
                <div>
                  <dt className="text-gray-400 text-xs font-medium">Pinterest Board</dt>
                  <dd className="text-gray-800 font-medium mt-0.5">{recipe.pinterest_board}</dd>
                </div>
              )}
              {recipe.published_url && (
                <div className="col-span-2">
                  <dt className="text-gray-400 text-xs font-medium">Published URL</dt>
                  <dd className="mt-0.5">
                    <a href={recipe.published_url} target="_blank" rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-500 font-medium text-sm break-all">{recipe.published_url}</a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            {canRun && (
              <button
                onClick={() => onRun(recipe.id)}
                disabled={isRunning}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl shadow-sm cursor-pointer transition-all disabled:opacity-40 ${
                  recipe.status === 'failed'
                    ? 'text-white bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                    : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
              >
                {isRunning ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : recipe.status === 'failed' ? (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Retry Pipeline</>
                ) : (
                  <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg> Run Pipeline</>
                )}
              </button>
            )}
            {recipe.published_url && (
              <a
                href={recipe.published_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                View Post
              </a>
            )}
            <button
              onClick={onClose}
              className="ml-auto px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Recipes Tab (used for All Recipes, Queue, Completed, Failed) ── */
function RecipesTab({ recipes, activeTab, statusFilter, setStatusFilter, runningRecipeId, handleRunRecipe, onSelectRecipe }) {
  return (
    <div>
      {/* Filter bar (only on All Recipes tab) */}
      {activeTab === 'recipes' && (
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1">Filter</span>
          {['all', 'new', 'processing', 'completed', 'failed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-all ${
                statusFilter === s
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">
            {activeTab === 'queue' ? '⏳' : activeTab === 'completed' ? '🎉' : activeTab === 'failed' ? '✅' : '📋'}
          </div>
          <div className="text-sm font-medium text-gray-500">
            {activeTab === 'queue' ? 'No recipes in queue'
              : activeTab === 'completed' ? 'No completed recipes yet'
              : activeTab === 'failed' ? 'No failed recipes — looking good!'
              : 'No recipes found'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {activeTab === 'queue' || activeTab === 'recipes' ? 'Sync your Google Sheet to import recipes' : ''}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider w-[40%]">Recipe</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Step</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Date</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recipes.map((recipe) => (
                <RecipeRow
                  key={recipe.id}
                  recipe={recipe}
                  runningRecipeId={runningRecipeId}
                  handleRunRecipe={handleRunRecipe}
                  onClick={() => onSelectRecipe(recipe)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RecipeRow({ recipe, runningRecipeId, handleRunRecipe, onClick }) {
  const canRun = recipe.status === 'new' || recipe.status === 'failed';
  const isRunning = runningRecipeId === recipe.id;

  return (
    <tr className="hover:bg-indigo-50/30 cursor-pointer transition-colors group" onClick={onClick}>
      <td className="px-5 py-3.5">
        <div className="font-medium text-gray-900 truncate max-w-xs group-hover:text-indigo-700 transition-colors">{recipe.title}</div>
      </td>
      <td className="px-4 py-3.5"><RecipeStatusBadge status={recipe.status} /></td>
      <td className="px-4 py-3.5 text-xs">
        {recipe.status === 'processing'
          ? <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              {PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step || '—'}
            </span>
          : recipe.status === 'failed'
            ? <span className="text-rose-500 font-medium">{PIPELINE_STEP_LABELS[recipe.pipeline_step] || recipe.pipeline_step || '—'}</span>
            : <span className="text-gray-400">—</span>}
      </td>
      <td className="px-4 py-3.5 text-xs text-gray-500 font-medium">
        {new Date(recipe.updatedAt || recipe.createdAt).toLocaleDateString()}
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          {canRun && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRunRecipe(recipe.id); }}
              disabled={isRunning}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-all disabled:opacity-40 ${
                recipe.status === 'failed'
                  ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                  : 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              {isRunning ? (
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : recipe.status === 'failed' ? '↻ Retry' : '▶ Run'}
            </button>
          )}
          {recipe.published_url && (
            <a
              href={recipe.published_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              View
            </a>
          )}
          <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
      </td>
    </tr>
  );
}

/* ── Activity Tab (Job History) ── */
function ActivityTab({ jobs, projectId, expandedJob, setExpandedJob, handleRetryJob, retryingId, setDeleteJobTarget, fetchData }) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-sm font-medium text-gray-500">No pipeline activity yet</div>
        <div className="text-xs text-gray-400 mt-1">Run a recipe to see it here</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors shadow-sm">
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
            onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
          >
            <div className="flex items-center gap-3">
              <JobStatusBadge status={job.status} />
              <span className="text-sm font-semibold text-gray-900">{job.description || job.type}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-medium">{new Date(job.createdAt).toLocaleString()}</span>
              {job.status === 'failed' && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRetryJob(job); }}
                  disabled={retryingId === job.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 cursor-pointer transition-all"
                >
                  {retryingId === job.id ? (
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : '↻ Retry'}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteJobTarget(job); }}
                className="text-xs text-gray-400 hover:text-rose-600 cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedJob === job.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
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
