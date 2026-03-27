import { useState, useEffect } from 'react';
import client from '../api/client';
import { Settings, Key, Loader2, XCircle, CheckCircle2 } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-400)' }}>
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  const ConfiguredBadge = () => (
    <span className="text-xs ml-2 flex items-center gap-1" style={{ color: 'var(--success-400)' }}>
      <CheckCircle2 className="w-3 h-3" /> configured
    </span>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))' }}
        >
          <Settings className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-50)' }}>Global Service Settings</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--text-400)' }}>
        Configure API keys for external services. Keys are encrypted at rest. Leave key fields blank to keep existing values.
      </p>

      {error && (
        <div 
          className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
          style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', color: 'var(--error-400)' }}
        >
          <XCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div 
          className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
          style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: 'var(--success-400)' }}
        >
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TTAPI */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>TTAPI.io (Midjourney)</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-500)' }}>Image generation via Midjourney API</p>
          <div>
            <label htmlFor="ttapi_api_key" className="label flex items-center">
              API Key {meta.ttapi_api_key_set && <ConfiguredBadge />}
            </label>
            <input id="ttapi_api_key" name="ttapi_api_key" type="password" value={form.ttapi_api_key} onChange={handleChange}
              className="input"
              placeholder={meta.ttapi_api_key_set ? '••••••••  (leave blank to keep)' : 'Enter TTAPI API key'}
            />
          </div>
        </section>

        {/* Content Writer */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>Content Writer API</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-500)' }}>Recipe article generation service</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="content_api_url" className="label">Base URL</label>
              <input id="content_api_url" name="content_api_url" value={form.content_api_url} onChange={handleChange}
                className="input"
                placeholder="http://75.119.157.40:3090"
              />
            </div>
            <div>
              <label htmlFor="content_api_key" className="label flex items-center">
                API Key {meta.content_api_key_set && <ConfiguredBadge />}
              </label>
              <input id="content_api_key" name="content_api_key" type="password" value={form.content_api_key} onChange={handleChange}
                className="input"
                placeholder={meta.content_api_key_set ? '••••••••  (leave blank to keep)' : 'Enter x-api-key'}
              />
            </div>
          </div>
        </section>

        {/* Pin Generator */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>Pin Generator</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-500)' }}>Pinterest pin image creation service</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="pin_generator_url" className="label">Base URL</label>
              <input id="pin_generator_url" name="pin_generator_url" value={form.pin_generator_url} onChange={handleChange}
                className="input"
                placeholder="http://75.119.157.40:3001"
              />
            </div>
            <div>
              <label htmlFor="pin_generator_key" className="label flex items-center">
                API Key (optional) {meta.pin_generator_key_set && <ConfiguredBadge />}
              </label>
              <input id="pin_generator_key" name="pin_generator_key" type="password" value={form.pin_generator_key} onChange={handleChange}
                className="input"
                placeholder={meta.pin_generator_key_set ? '••••••••  (leave blank to keep)' : 'Enter API key if required'}
              />
            </div>
          </div>
        </section>

        <button type="submit" disabled={saving} className="btn btn-primary w-full">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
