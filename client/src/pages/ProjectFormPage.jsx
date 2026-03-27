import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';
import { FolderPlus, Loader2, XCircle } from 'lucide-react';

export default function ProjectFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', wp_api_url: '', wp_username: '', wp_app_password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    client.get(`/projects/${id}`)
      .then(({ data }) => {
        setForm({
          name: data.name || '',
          wp_api_url: data.wp_api_url || '',
          wp_username: data.wp_username || '',
          wp_app_password: '',
        });
      })
      .catch(() => setError('Failed to load project'))
      .finally(() => setFetching(false));
  }, [id, isEdit]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.wp_api_url || !form.wp_username) {
      setError('Name, API URL, and username are required');
      return;
    }
    if (!isEdit && !form.wp_app_password) {
      setError('App password is required for new projects');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.wp_app_password) {
        delete payload.wp_app_password;
      }
      if (isEdit) {
        await client.put(`/projects/${id}`, payload);
      } else {
        await client.post('/projects', payload);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${isEdit ? 'update' : 'create'} project`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-400)' }}>
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))' }}
        >
          <FolderPlus className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-50)' }}>
          {isEdit ? 'Edit Project' : 'New Project'}
        </h1>
      </div>

      {error && (
        <div 
          className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
          style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', color: 'var(--error-400)' }}
        >
          <XCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label htmlFor="name" className="label">Project Name</label>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="input"
            placeholder="My WordPress Blog"
          />
        </div>
        <div>
          <label htmlFor="wp_api_url" className="label">WordPress API URL</label>
          <input
            id="wp_api_url"
            name="wp_api_url"
            value={form.wp_api_url}
            onChange={handleChange}
            className="input"
            placeholder="https://yourblog.com/wp-json/wp/v2"
          />
        </div>
        <div>
          <label htmlFor="wp_username" className="label">WordPress Username</label>
          <input
            id="wp_username"
            name="wp_username"
            value={form.wp_username}
            onChange={handleChange}
            className="input"
            placeholder="admin"
          />
        </div>
        <div>
          <label htmlFor="wp_app_password" className="label">
            WordPress App Password 
            {isEdit && <span style={{ color: 'var(--text-500)' }}> (leave blank to keep current)</span>}
          </label>
          <input
            id="wp_app_password"
            name="wp_app_password"
            type="password"
            value={form.wp_app_password}
            onChange={handleChange}
            className="input"
            placeholder={isEdit ? '••••••••' : 'xxxx xxxx xxxx xxxx'}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn btn-primary flex-1">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : isEdit ? 'Update Project' : 'Create Project'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
