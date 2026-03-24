import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import JobStatusBadge from '../components/JobStatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Job form
  const [jobType, setJobType] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobLoading, setJobLoading] = useState(false);

  // Delete state
  const [deleteProject, setDeleteProject] = useState(false);
  const [deleteJobTarget, setDeleteJobTarget] = useState(null);

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

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!jobType.trim()) return;
    setJobLoading(true);
    try {
      const { data } = await client.post(`/projects/${id}/jobs`, {
        type: jobType.trim(),
        description: jobDesc.trim() || undefined,
      });
      setJobs((prev) => [...prev, data]);
      setJobType('');
      setJobDesc('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create job');
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

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!project) {
    return <div className="text-center py-12 text-red-500">Project not found</div>;
  }

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

      {/* Jobs Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Jobs</h2>
      </div>

      {/* New Job Form */}
      <form onSubmit={handleCreateJob} className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="jobType" className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <input
            id="jobType"
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. content_generation"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="jobDesc" className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
          <input
            id="jobDesc"
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Brief description"
          />
        </div>
        <button
          type="submit"
          disabled={jobLoading || !jobType.trim()}
          className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
        >
          {jobLoading ? 'Adding...' : 'Add Job'}
        </button>
      </form>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg border border-gray-200 text-gray-500 text-sm">
          No jobs yet. Create one above to get started.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {jobs.map((job) => (
            <div key={job.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <JobStatusBadge status={job.status} />
                <div>
                  <span className="text-sm font-medium text-gray-900">{job.type}</span>
                  {job.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{job.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {new Date(job.createdAt).toLocaleString()}
                </span>
                <button
                  onClick={() => setDeleteJobTarget(job)}
                  className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                >
                  Delete
                </button>
              </div>
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
