import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import JobStatusBadge from '../components/JobStatusBadge';
import PipelineTracker from '../components/PipelineTracker';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobLoading, setJobLoading] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);

  // Delete state
  const [deleteProject, setDeleteProject] = useState(false);
  const [deleteJobTarget, setDeleteJobTarget] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const fetchData = async () => {
    try {
      const [projRes, jobsRes] = await Promise.all([
        client.get(`/projects/${id}`),
        client.get(`/projects/${id}/jobs`),
      ]);
      setProject(projRes.data);
      setJobs(jobsRes.data);
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleRunPipeline = async () => {
    setJobLoading(true);
    setError('');
    try {
      const { data } = await client.post(`/projects/${id}/jobs`, {
        type: 'pipeline',
        description: 'Full recipe pipeline',
      });
      setJobs((prev) => [data, ...prev]);
      setExpandedJob(data.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start pipeline');
    } finally {
      setJobLoading(false);
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
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!project) {
    return <div className="text-center py-12 text-red-500">Project not found</div>;
  }

  const hasRunningJob = jobs.some((j) => j.status === 'pending' || j.status === 'running');

  return (
    <div>
      {/* Project Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-500">&larr; Back to Projects</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{project.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/projects/${id}/settings`}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
          >
            Settings
          </Link>
          <Link
            to={`/projects/${id}/edit`}
            className="px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50"
          >
            Edit
          </Link>
          <button
            onClick={() => setDeleteProject(true)}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
      )}

      {/* Project Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">API URL</dt>
            <dd className="mt-1 text-gray-900 break-all">{project.wp_api_url}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Username</dt>
            <dd className="mt-1 text-gray-900">{project.wp_username}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="mt-1 text-gray-900">{new Date(project.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Password</dt>
            <dd className="mt-1 text-gray-400">••••••••  (encrypted)</dd>
          </div>
        </dl>
      </div>

      {/* Pipeline Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Pipeline Jobs</h2>
        <button
          onClick={handleRunPipeline}
          disabled={jobLoading || hasRunningJob}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center gap-2"
        >
          {jobLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Starting...
            </>
          ) : (
            <>▶ Run Pipeline</>
          )}
        </button>
      </div>

      {hasRunningJob && (
        <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
          A pipeline is currently running. Wait for it to finish before starting another.
        </div>
      )}

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg border border-gray-200 text-gray-500 text-sm">
          No pipeline jobs yet. Click "Run Pipeline" to process the next recipe.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-lg border border-gray-200">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
              >
                <div className="flex items-center gap-3">
                  <JobStatusBadge status={job.status} />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {job.description || job.type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {new Date(job.createdAt).toLocaleString()}
                  </span>
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
                  <span className="text-gray-400 text-xs">
                    {expandedJob === job.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {expandedJob === job.id && (
                <div className="px-4 pb-4">
                  <PipelineTracker
                    projectId={id}
                    job={job}
                    onUpdate={fetchData}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
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
