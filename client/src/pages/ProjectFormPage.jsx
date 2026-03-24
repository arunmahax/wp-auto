import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';

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
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Project' : 'New Project'}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="My WordPress Blog"
          />
        </div>
        <div>
          <label htmlFor="wp_api_url" className="block text-sm font-medium text-gray-700 mb-1">WordPress API URL</label>
          <input
            id="wp_api_url"
            name="wp_api_url"
            value={form.wp_api_url}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="https://yourblog.com/wp-json/wp/v2"
          />
        </div>
        <div>
          <label htmlFor="wp_username" className="block text-sm font-medium text-gray-700 mb-1">WordPress Username</label>
          <input
            id="wp_username"
            name="wp_username"
            value={form.wp_username}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="admin"
          />
        </div>
        <div>
          <label htmlFor="wp_app_password" className="block text-sm font-medium text-gray-700 mb-1">
            WordPress App Password {isEdit && <span className="text-gray-400">(leave blank to keep current)</span>}
          </label>
          <input
            id="wp_app_password"
            name="wp_app_password"
            type="password"
            value={form.wp_app_password}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={isEdit ? '••••••••' : 'xxxx xxxx xxxx xxxx'}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
