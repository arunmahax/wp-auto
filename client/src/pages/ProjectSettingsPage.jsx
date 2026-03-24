import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';

export default function ProjectSettingsPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    google_sheet_url: '',
    trigger_interval: 'disabled',
    trigger_enabled: false,
    content_categories: '',
    content_authors: '',
  });

  const [fetchingCats, setFetchingCats] = useState(false);
  const [fetchingBoards, setFetchingBoards] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    Promise.all([
      client.get(`/projects/${id}`),
      client.get(`/projects/${id}/recipes`),
    ])
      .then(([projRes, recipesRes]) => {
        const data = projRes.data;
        setProject(data);
        setForm({
          google_sheet_url: data.google_sheet_url || '',
          trigger_interval: data.trigger_interval || 'disabled',
          trigger_enabled: data.trigger_enabled || false,
          content_categories: data.content_categories || '',
          content_authors: data.content_authors || '',
        });
        setRecipes(recipesRes.data);
      })
      .catch(() => setError('Failed to load project'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.google_sheet_url) payload.google_sheet_url = null;
      if (!payload.content_categories) payload.content_categories = null;
      if (!payload.content_authors) payload.content_authors = null;
      const { data } = await client.put(`/projects/${id}`, payload);
      setProject(data);
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleFetchCategories = async () => {
    setFetchingCats(true);
    setError('');
    try {
      const { data } = await client.post(`/projects/${id}/fetch-categories`);
      setProject((prev) => ({ ...prev, wp_categories: JSON.stringify(data.categories) }));
      setSuccess(`Fetched ${data.categories.length} categories`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch categories');
    } finally {
      setFetchingCats(false);
    }
  };

  const handleFetchBoards = async () => {
    setFetchingBoards(true);
    setError('');
    try {
      const { data } = await client.post(`/projects/${id}/fetch-boards`);
      setProject((prev) => ({ ...prev, wp_pinboards: JSON.stringify(data.boards) }));
      setSuccess(`Fetched ${data.boards.length} boards`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch boards');
    } finally {
      setFetchingBoards(false);
    }
  };

  const handleSyncSheet = async () => {
    setSyncing(true);
    setError('');
    setSyncResult(null);
    try {
      const { data } = await client.post(`/projects/${id}/sync-sheet`);
      setSyncResult(data);
      setSuccess(`Imported ${data.imported} new recipes (${data.already_existed} duplicates skipped)`);
      // Refresh recipes list
      const recipesRes = await client.get(`/projects/${id}/recipes`);
      setRecipes(recipesRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sync sheet');
    } finally {
      setSyncing(false);
    }
  };

  const parseJson = (str) => {
    if (!str) return [];
    try { return JSON.parse(str); } catch { return []; }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!project) return <div className="text-center py-12 text-red-500">Project not found</div>;

  const categories = parseJson(project.wp_categories);
  const boards = parseJson(project.wp_pinboards);

  return (
    <div className="max-w-2xl mx-auto">
      <Link to={`/projects/${id}`} className="text-sm text-indigo-600 hover:text-indigo-500">&larr; Back to Project</Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">{project.name} — Settings</h1>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">{success}</div>}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Google Sheet */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Google Sheet Spy Data</h2>
          <p className="text-xs text-gray-400 mb-4">Public Google Sheet URL containing recipe spy data for ingestion</p>
          <div>
            <label htmlFor="google_sheet_url" className="block text-sm font-medium text-gray-700 mb-1">Sheet URL</label>
            <input id="google_sheet_url" name="google_sheet_url" value={form.google_sheet_url} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </div>
        </section>

        {/* Trigger / Scheduler */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Automation Trigger</h2>
          <p className="text-xs text-gray-400 mb-4">How often the scheduler picks the next recipe for processing</p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input id="trigger_enabled" name="trigger_enabled" type="checkbox" checked={form.trigger_enabled} onChange={handleChange}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="trigger_enabled" className="text-sm font-medium text-gray-700">Enable automation</label>
            </div>
            <div>
              <label htmlFor="trigger_interval" className="block text-sm font-medium text-gray-700 mb-1">Interval</label>
              <select id="trigger_interval" name="trigger_interval" value={form.trigger_interval} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="disabled">Disabled</option>
                <option value="3h">Every 3 hours</option>
                <option value="5h">Every 5 hours</option>
                <option value="6h">Every 6 hours</option>
                <option value="8h">Every 8 hours</option>
                <option value="12h">Every 12 hours</option>
              </select>
            </div>
            {project.last_trigger_at && (
              <p className="text-xs text-gray-400">Last trigger: {new Date(project.last_trigger_at).toLocaleString()}</p>
            )}
          </div>
        </section>

        {/* Content Generation */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Content Generation</h2>
          <p className="text-xs text-gray-400 mb-4">Categories and authors passed to the Content Writer API. Format: Name (id), Name (id)</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="content_categories" className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
              <textarea id="content_categories" name="content_categories" value={form.content_categories} onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Dinner (5), Desserts (12), Breakfast (3)"
              />
            </div>
            <div>
              <label htmlFor="content_authors" className="block text-sm font-medium text-gray-700 mb-1">Authors</label>
              <textarea id="content_authors" name="content_authors" value={form.content_authors} onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="John (1), Jane (2)"
              />
            </div>
          </div>
        </section>

        <button type="submit" disabled={saving}
          className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* WP Categories */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 mt-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-900">WordPress Categories</h2>
          <button onClick={handleFetchCategories} disabled={fetchingCats}
            className="px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 cursor-pointer">
            {fetchingCats ? 'Fetching...' : 'Fetch Categories'}
          </button>
        </div>
        {categories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Slug</th><th className="py-2">Count</th>
              </tr></thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-1.5 pr-4 text-gray-900">{c.name}</td>
                    <td className="py-1.5 pr-4 text-gray-500">{c.slug}</td>
                    <td className="py-1.5 text-gray-500">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No categories fetched yet. Click "Fetch Categories" to pull from WordPress.</p>
        )}
      </section>

      {/* Pinboards */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 mt-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Pinterest Boards</h2>
          <button onClick={handleFetchBoards} disabled={fetchingBoards}
            className="px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 cursor-pointer">
            {fetchingBoards ? 'Fetching...' : 'Fetch Boards'}
          </button>
        </div>
        {boards.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Slug</th><th className="py-2">Recipes</th>
              </tr></thead>
              <tbody>
                {boards.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50">
                    <td className="py-1.5 pr-4 text-gray-900">{b.name}</td>
                    <td className="py-1.5 pr-4 text-gray-500">{b.slug}</td>
                    <td className="py-1.5 text-gray-500">{b.recipe_count ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No boards fetched yet. Click "Fetch Boards" to pull from the Pinboards plugin.</p>
        )}
      </section>

      {/* Recipes */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 mt-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recipes</h2>
            <p className="text-xs text-gray-400">{recipes.length} total</p>
          </div>
          <button onClick={handleSyncSheet} disabled={syncing || !project.google_sheet_url}
            className="px-3 py-1.5 text-sm bg-indigo-100 border border-indigo-300 text-indigo-700 rounded-md hover:bg-indigo-200 disabled:opacity-50 cursor-pointer">
            {syncing ? 'Syncing...' : 'Sync Sheet'}
          </button>
        </div>
        {syncResult && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            Sheet: {syncResult.total_in_sheet} rows | Imported: {syncResult.imported} | Skipped: {syncResult.already_existed}
          </div>
        )}
        {recipes.length > 0 ? (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white"><tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-4">Title</th><th className="py-2 pr-4">Status</th><th className="py-2">Created</th>
              </tr></thead>
              <tbody>
                {recipes.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-1.5 pr-4 text-gray-900 max-w-xs truncate">{r.title}</td>
                    <td className="py-1.5 pr-4">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        r.status === 'completed' ? 'bg-green-100 text-green-700' :
                        r.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                        r.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-1.5 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No recipes yet. Configure a Google Sheet URL and click "Sync Sheet" to import.</p>
        )}
      </section>
    </div>
  );
}
