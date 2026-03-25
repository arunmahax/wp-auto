import { useState, useEffect } from 'react';
import client from '../api/client';

export default function SettingsPage() {
  const [form, setForm] = useState({
    ttapi_api_key: '',
    content_api_url: '',
    content_api_key: '',
    pin_generator_url: '',
    pin_generator_key: '',
  });
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    client.get('/settings')
      .then(({ data }) => {
        setMeta({
          ttapi_api_key_set: data.ttapi_api_key_set,
          content_api_key_set: data.content_api_key_set,
          pin_generator_key_set: data.pin_generator_key_set,
          pinboards_jwt_token_set: data.pinboards_jwt_token_set,
        });
        setForm({
          ttapi_api_key: '',
          content_api_url: data.content_api_url || '',
          content_api_key: '',
          pin_generator_url: data.pin_generator_url || '',
          pin_generator_key: '',
          pinboards_jwt_token: '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      // Only send fields that have values
      const payload = {};
      Object.entries(form).forEach(([key, val]) => {
        if (val) payload[key] = val;
      });
      if (Object.keys(payload).length === 0) {
        setError('Provide at least one field to update');
        setSaving(false);
        return;
      }
      const { data } = await client.put('/settings', payload);
      setMeta({
        ttapi_api_key_set: data.ttapi_api_key_set,
        content_api_key_set: data.content_api_key_set,
        pin_generator_key_set: data.pin_generator_key_set,
      });
      setForm((prev) => ({
        ...prev,
        ttapi_api_key: '',
        content_api_key: '',
        pin_generator_key: '',
        content_api_url: data.content_api_url || prev.content_api_url,
        pin_generator_url: data.pin_generator_url || prev.pin_generator_url,
      }));
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Global Service Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Configure API keys for external services. Keys are encrypted at rest. Leave key fields blank to keep existing values.</p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* TTAPI */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">TTAPI.io (Midjourney)</h2>
          <p className="text-xs text-gray-400 mb-4">Image generation via Midjourney API</p>
          <div>
            <label htmlFor="ttapi_api_key" className="block text-sm font-medium text-gray-700 mb-1">
              API Key {meta.ttapi_api_key_set && <span className="text-green-600 text-xs ml-1">✓ configured</span>}
            </label>
            <input id="ttapi_api_key" name="ttapi_api_key" type="password" value={form.ttapi_api_key} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={meta.ttapi_api_key_set ? '••••••••  (leave blank to keep)' : 'Enter TTAPI API key'}
            />
          </div>
        </section>

        {/* Content Writer */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Content Writer API</h2>
          <p className="text-xs text-gray-400 mb-4">Recipe article generation service</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="content_api_url" className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
              <input id="content_api_url" name="content_api_url" value={form.content_api_url} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="http://75.119.157.40:3090"
              />
            </div>
            <div>
              <label htmlFor="content_api_key" className="block text-sm font-medium text-gray-700 mb-1">
                API Key {meta.content_api_key_set && <span className="text-green-600 text-xs ml-1">✓ configured</span>}
              </label>
              <input id="content_api_key" name="content_api_key" type="password" value={form.content_api_key} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={meta.content_api_key_set ? '••••••••  (leave blank to keep)' : 'Enter x-api-key'}
              />
            </div>
          </div>
        </section>

        {/* Pin Generator */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Pin Generator</h2>
          <p className="text-xs text-gray-400 mb-4">Pinterest pin image creation service</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="pin_generator_url" className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
              <input id="pin_generator_url" name="pin_generator_url" value={form.pin_generator_url} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="http://75.119.157.40:3001"
              />
            </div>
            <div>
              <label htmlFor="pin_generator_key" className="block text-sm font-medium text-gray-700 mb-1">
                API Key (optional) {meta.pin_generator_key_set && <span className="text-green-600 text-xs ml-1">✓ configured</span>}
              </label>
              <input id="pin_generator_key" name="pin_generator_key" type="password" value={form.pin_generator_key} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={meta.pin_generator_key_set ? '••••••••  (leave blank to keep)' : 'Enter API key if required'}
              />
            </div>
          </div>
        </section>

        <button type="submit" disabled={saving}
          className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
