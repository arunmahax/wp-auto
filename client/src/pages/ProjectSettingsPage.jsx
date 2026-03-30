import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';
import * as templateApi from '../api/templates';
import TemplatePreview from '../components/TemplatePreview';
import { 
  ArrowLeft, Settings, FileSpreadsheet, Clock, FileText, Image, Palette, 
  FolderTree, Layout, Users, ChefHat, RefreshCw, Loader2, XCircle, CheckCircle2,
  Rss, Plus, Trash2, Eye, Layers, ExternalLink
} from 'lucide-react';

export default function ProjectSettingsPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [templates, setTemplates] = useState([]);

  const [form, setForm] = useState({
    google_sheet_url: '',
    trigger_interval: 'disabled',
    trigger_enabled: false,
    content_categories: '',
    content_authors: '',
    image_prompt_template: '',
    pin_design_config: '',
    template_ids: [],
    pin_design_mode: 'json', // 'json' or 'template'
    rss_feeds: [],
    spy_keywords: [],
  });

  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [suggestedFeeds, setSuggestedFeeds] = useState([]);
  const [showSuggested, setShowSuggested] = useState(false);

  const [fetchingCats, setFetchingCats] = useState(false);
  const [fetchingBoards, setFetchingBoards] = useState(false);
  const [fetchingAuthors, setFetchingAuthors] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    Promise.all([
      client.get(`/projects/${id}`),
      client.get(`/projects/${id}/recipes`),
      client.get('/projects/spy/suggested-feeds'),
      templateApi.getTemplates(),
    ])
      .then(([projRes, recipesRes, suggestedRes, templatesRes]) => {
        const data = projRes.data;
        setProject(data);
        setTemplates(templatesRes || []);
        const templateIds = data.template_ids || [];
        setForm({
          google_sheet_url: data.google_sheet_url || '',
          trigger_interval: data.trigger_interval || 'disabled',
          trigger_enabled: data.trigger_enabled || false,
          content_categories: data.content_categories || '',
          content_authors: data.content_authors || '',
          image_prompt_template: data.image_prompt_template || '',
          pin_design_config: data.pin_design_config || '',
          template_ids: templateIds,
          pin_design_mode: templateIds.length > 0 ? 'template' : 'json',
          rss_feeds: data.rss_feeds || [],
          spy_keywords: data.spy_keywords || [],
        });
        setRecipes(recipesRes.data);
        setSuggestedFeeds(suggestedRes.data.feeds || []);
      })
      .catch((err) => {
        console.error('Failed to load project:', err);
        setError('Failed to load project');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // RSS Feed management
  const addFeed = () => {
    if (!newFeedUrl.trim()) return;
    try {
      new URL(newFeedUrl); // Validate URL
      if (form.rss_feeds.includes(newFeedUrl.trim())) {
        setError('This feed is already added');
        return;
      }
      setForm((prev) => ({ ...prev, rss_feeds: [...prev.rss_feeds, newFeedUrl.trim()] }));
      setNewFeedUrl('');
      setError('');
    } catch {
      setError('Please enter a valid URL');
    }
  };

  const removeFeed = (url) => {
    setForm((prev) => ({ ...prev, rss_feeds: prev.rss_feeds.filter(f => f !== url) }));
  };

  const addSuggestedFeed = (url) => {
    if (!form.rss_feeds.includes(url)) {
      setForm((prev) => ({ ...prev, rss_feeds: [...prev.rss_feeds, url] }));
    }
  };

  // Keyword management
  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    if (form.spy_keywords.includes(newKeyword.trim().toLowerCase())) {
      setError('This keyword is already added');
      return;
    }
    setForm((prev) => ({ ...prev, spy_keywords: [...prev.spy_keywords, newKeyword.trim().toLowerCase()] }));
    setNewKeyword('');
    setError('');
  };

  const removeKeyword = (kw) => {
    setForm((prev) => ({ ...prev, spy_keywords: prev.spy_keywords.filter(k => k !== kw) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = { ...form };
      // Remove non-API fields
      delete payload.pin_design_mode;
      
      if (!payload.google_sheet_url) payload.google_sheet_url = null;
      if (!payload.content_categories) payload.content_categories = null;
      if (!payload.content_authors) payload.content_authors = null;
      if (!payload.image_prompt_template) payload.image_prompt_template = null;
      
      // Handle template vs JSON mode
      if (form.pin_design_mode === 'template') {
        payload.pin_design_config = null; // Clear JSON when using template
      } else {
        payload.template_ids = []; // Clear templates when using JSON
        if (!payload.pin_design_config) payload.pin_design_config = null;
      }
      
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
      const recipesRes = await client.get(`/projects/${id}/recipes`);
      setRecipes(recipesRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sync sheet');
    } finally {
      setSyncing(false);
    }
  };

  const handleFetchAuthors = async () => {
    setFetchingAuthors(true);
    setError('');
    try {
      const { data } = await client.post(`/projects/${id}/fetch-authors`);
      setProject((prev) => ({ ...prev, wp_authors: JSON.stringify(data.authors) }));
      setSuccess(`Fetched ${data.authors.length} authors`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch authors');
    } finally {
      setFetchingAuthors(false);
    }
  };

  const parseJson = (str) => {
    if (!str) return [];
    try { return JSON.parse(str); } catch { return []; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-400)' }}>
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }
  if (!project) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--error-400)' }}>Project not found</div>
    );
  }

  const categories = parseJson(project.wp_categories);
  const boards = parseJson(project.wp_pinboards);
  const authors = parseJson(project.wp_authors);

  const getRecipeStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'var(--success-400)';
      case 'processing': return 'var(--warning-400)';
      case 'failed': return 'var(--error-400)';
      default: return 'var(--text-400)';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link 
        to={`/projects/${id}`} 
        className="text-sm flex items-center gap-1 mb-2 hover:opacity-80 transition-opacity"
        style={{ color: 'var(--primary-400)' }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Project
      </Link>
      
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))' }}
        >
          <Settings className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-50)' }}>{project.name} — Settings</h1>
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
      {success && (
        <div 
          className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
          style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: 'var(--success-400)' }}
        >
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Google Sheet */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>Google Sheet Spy Data</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-500)' }}>
            Public Google Sheet URL containing recipe spy data for ingestion
          </p>
          <div>
            <label htmlFor="google_sheet_url" className="label">Sheet URL</label>
            <input id="google_sheet_url" name="google_sheet_url" value={form.google_sheet_url} onChange={handleChange}
              className="input"
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </div>
        </section>

        {/* RSS Spy Feeds */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Rss className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>Competitor RSS Feeds</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-500)' }}>
            Add RSS feeds from competitor recipe sites. Use the Spy tab to fetch and import recipes.
          </p>
          
          {/* Add feed input */}
          <div className="flex gap-2 mb-4">
            <input
              type="url"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              className="input flex-1"
              placeholder="https://example.com/feed/"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeed())}
            />
            <button type="button" onClick={addFeed} className="btn btn-secondary">
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Current feeds */}
          {form.rss_feeds.length > 0 && (
            <div className="space-y-2 mb-4">
              {form.rss_feeds.map((url) => (
                <div 
                  key={url} 
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ background: 'var(--bg-700)' }}
                >
                  <span className="text-sm truncate flex-1" style={{ color: 'var(--text-200)' }}>{url}</span>
                  <button 
                    type="button" 
                    onClick={() => removeFeed(url)}
                    className="p-1 rounded hover:bg-red-500/20 transition-colors ml-2"
                    style={{ color: 'var(--error-400)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Suggested feeds */}
          <div>
            <button 
              type="button" 
              onClick={() => setShowSuggested(!showSuggested)}
              className="text-sm flex items-center gap-1 cursor-pointer hover:opacity-80"
              style={{ color: 'var(--primary-400)' }}
            >
              <Eye className="w-4 h-4" />
              {showSuggested ? 'Hide' : 'Show'} suggested feeds
            </button>
            
            {showSuggested && suggestedFeeds.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestedFeeds.map((feed) => (
                  <button
                    key={feed.url}
                    type="button"
                    onClick={() => addSuggestedFeed(feed.url)}
                    disabled={form.rss_feeds.includes(feed.url)}
                    className="p-2 rounded-lg text-left text-sm transition-all cursor-pointer disabled:opacity-50"
                    style={{ 
                      background: form.rss_feeds.includes(feed.url) ? 'var(--bg-600)' : 'var(--bg-700)',
                      color: 'var(--text-200)',
                      border: '1px solid var(--glass-border)'
                    }}
                  >
                    <div className="font-medium">{feed.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-500)' }}>{feed.category}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Spy Keywords Filter */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>Spy Keywords Filter</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-500)' }}>
            Optional: Only show recipes containing these keywords (e.g., chicken, pasta, dinner). Leave empty to show all.
          </p>
          
          {/* Add keyword input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="input flex-1"
              placeholder="chicken, pasta, etc."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            />
            <button type="button" onClick={addKeyword} className="btn btn-secondary">
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Current keywords */}
          {form.spy_keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.spy_keywords.map((kw) => (
                <span 
                  key={kw}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                  style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary-400)' }}
                >
                  {kw}
                  <button 
                    type="button" 
                    onClick={() => removeKeyword(kw)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Trigger / Scheduler */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>Automation Trigger</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-500)' }}>
            How often the scheduler picks the next recipe for processing
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input id="trigger_enabled" name="trigger_enabled" type="checkbox" checked={form.trigger_enabled} onChange={handleChange}
                className="h-4 w-4 rounded focus:ring-2"
                style={{ accentColor: 'var(--primary-500)' }}
              />
              <label htmlFor="trigger_enabled" className="text-sm font-medium" style={{ color: 'var(--text-200)' }}>
                Enable automation
              </label>
            </div>
            <div>
              <label htmlFor="trigger_interval" className="label">Interval</label>
              <select id="trigger_interval" name="trigger_interval" value={form.trigger_interval} onChange={handleChange}
                className="input"
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
              <p className="text-xs" style={{ color: 'var(--text-500)' }}>
                Last trigger: {new Date(project.last_trigger_at).toLocaleString()}
              </p>
            )}
          </div>
        </section>

        {/* Content Generation */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>Content Generation</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-500)' }}>
            Categories and authors passed to the Content Writer API. Format: Name (id), Name (id)
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="content_categories" className="label">Categories</label>
              <textarea id="content_categories" name="content_categories" value={form.content_categories} onChange={handleChange}
                rows={3}
                className="input"
                placeholder="Dinner (5), Desserts (12), Breakfast (3)"
              />
            </div>
            <div>
              <label htmlFor="content_authors" className="label">Authors</label>
              <textarea id="content_authors" name="content_authors" value={form.content_authors} onChange={handleChange}
                rows={2}
                className="input"
                placeholder="John (1), Jane (2)"
              />
            </div>
          </div>
        </section>

        {/* Image Prompt Template */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Image className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>Image Generation Prompt</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-500)' }}>
            Midjourney prompt template. Use <code className="px-1 rounded text-xs" style={{ background: 'var(--bg-600)', color: 'var(--text-300)' }}>{'{title}'}</code> for the recipe name
            and <code className="px-1 rounded text-xs" style={{ background: 'var(--bg-600)', color: 'var(--text-300)' }}>{'{image}'}</code> for the spy reference image URL.
          </p>
          <div>
            <label htmlFor="image_prompt_template" className="label">Prompt Template</label>
            <textarea id="image_prompt_template" name="image_prompt_template" value={form.image_prompt_template} onChange={handleChange}
              rows={3}
              className="input font-mono text-sm"
              placeholder="{image} {title}, food photography, professional, high quality, appetizing, 4k --ar 16:9"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-500)' }}>Leave blank to use the default prompt shown above.</p>
          </div>
        </section>

        {/* Pin Design Config */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>Pin Design</h2>
            </div>
            <Link 
              to="/templates" 
              className="text-sm flex items-center gap-1 hover:opacity-80"
              style={{ color: 'var(--primary-400)' }}
            >
              <Layers className="w-4 h-4" />
              Manage Templates
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          
          {/* Mode Selector */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                form.pin_design_mode === 'template' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-white/5 hover:bg-white/10'
              }`}
              style={{ color: form.pin_design_mode === 'template' ? 'white' : 'var(--text-300)' }}
              onClick={() => setForm(prev => ({ ...prev, pin_design_mode: 'template' }))}
            >
              <Layers className="w-4 h-4" />
              Use Template
            </button>
            <button
              type="button"
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                form.pin_design_mode === 'json' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-white/5 hover:bg-white/10'
              }`}
              style={{ color: form.pin_design_mode === 'json' ? 'white' : 'var(--text-300)' }}
              onClick={() => setForm(prev => ({ ...prev, pin_design_mode: 'json' }))}
            >
              <FileText className="w-4 h-4" />
              Custom JSON
            </button>
          </div>
          
          {/* Template Selection */}
          {form.pin_design_mode === 'template' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Select Templates</label>
                {form.template_ids.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--primary-500)/20', color: 'var(--primary-400)' }}>
                    {form.template_ids.length} selected
                  </span>
                )}
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-500)' }}>
                Select one or more templates. When multiple are selected, the pipeline randomly picks one each time.
              </p>
              {templates.length === 0 ? (
                <div 
                  className="p-4 rounded-lg text-center"
                  style={{ background: 'var(--bg-700)', color: 'var(--text-400)' }}
                >
                  <p className="mb-2">No templates found.</p>
                  <Link 
                    to="/templates/new" 
                    className="text-sm hover:underline"
                    style={{ color: 'var(--primary-400)' }}
                  >
                    Create your first template →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {templates.map((tpl) => {
                    const isSelected = form.template_ids.includes(tpl.id);
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        className={`relative rounded-lg overflow-hidden transition-all ${
                          isSelected 
                            ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-slate-900' 
                            : 'hover:ring-1 hover:ring-white/20'
                        }`}
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            template_ids: isSelected
                              ? prev.template_ids.filter(id => id !== tpl.id)
                              : [...prev.template_ids, tpl.id]
                          }));
                        }}
                      >
                        {/* Template Preview */}
                        <div 
                          className="aspect-[2/3] w-full relative flex items-center justify-center"
                          style={{ background: tpl.background_color || '#1a1a2e' }}
                        >
                          <TemplatePreview template={tpl} containerWidth={160} containerHeight={240} />
                          
                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Template info */}
                        <div className="p-2 text-left" style={{ background: 'var(--bg-700)' }}>
                          <span className="font-medium text-xs block truncate" style={{ color: 'var(--text-100)' }}>
                            {tpl.name}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-500)' }}>
                            {tpl.width}×{tpl.height}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Selection actions */}
              {templates.length > 0 && (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--text-300)' }}
                    onClick={() => setForm(prev => ({ ...prev, template_ids: templates.map(t => t.id) }))}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--text-300)' }}
                    onClick={() => setForm(prev => ({ ...prev, template_ids: [] }))}
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* JSON Config */}
          {form.pin_design_mode === 'json' && (
            <div>
              <p className="text-xs mb-4" style={{ color: 'var(--text-500)' }}>
                JSON configuration for the Pin Designer service. <code className="px-1 rounded text-xs" style={{ background: 'var(--bg-600)', color: 'var(--text-300)' }}>topImageUrl</code>, <code className="px-1 rounded text-xs" style={{ background: 'var(--bg-600)', color: 'var(--text-300)' }}>bottomImageUrl</code>, and <code className="px-1 rounded text-xs" style={{ background: 'var(--bg-600)', color: 'var(--text-300)' }}>recipeTitle</code> are set automatically.
              </p>
              <label htmlFor="pin_design_config" className="label">Design JSON</label>
              <textarea id="pin_design_config" name="pin_design_config" value={form.pin_design_config} onChange={handleChange}
                rows={10}
                className="input font-mono text-xs"
                placeholder={'{\n  "smartLayoutOptions": { "line1FontSize": 70 },\n  "textOptions": { "fontFamily": "Comic Sans MS", "fontSize": 80 },\n  "topTags": []\n}'}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-500)' }}>Leave blank to use Pin Designer defaults. Must be valid JSON.</p>
            </div>
          )}
        </section>

        <button type="submit" disabled={saving} className="btn btn-primary w-full">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Settings'}
        </button>
      </form>

      {/* WP Categories */}
      <section className="card p-6 mt-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>WordPress Categories</h2>
          </div>
          <button onClick={handleFetchCategories} disabled={fetchingCats} className="btn btn-secondary text-sm">
            {fetchingCats ? <><Loader2 className="w-4 h-4 animate-spin" /> Fetching...</> : <><RefreshCw className="w-4 h-4" /> Fetch</>}
          </button>
        </div>
        {categories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-600)', color: 'var(--text-400)' }}>
                  <th className="py-2 pr-4 text-left font-medium">Name</th>
                  <th className="py-2 pr-4 text-left font-medium">Slug</th>
                  <th className="py-2 text-left font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--bg-700)' }}>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-100)' }}>{c.name}</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-400)' }}>{c.slug}</td>
                    <td className="py-2" style={{ color: 'var(--text-400)' }}>{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-500)' }}>No categories fetched yet. Click "Fetch" to pull from WordPress.</p>
        )}
      </section>

      {/* Pinboards */}
      <section className="card p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Layout className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>Pinterest Boards</h2>
          </div>
          <button onClick={handleFetchBoards} disabled={fetchingBoards} className="btn btn-secondary text-sm">
            {fetchingBoards ? <><Loader2 className="w-4 h-4 animate-spin" /> Fetching...</> : <><RefreshCw className="w-4 h-4" /> Fetch</>}
          </button>
        </div>
        {boards.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-600)', color: 'var(--text-400)' }}>
                  <th className="py-2 pr-4 text-left font-medium">Name</th>
                  <th className="py-2 pr-4 text-left font-medium">Slug</th>
                  <th className="py-2 text-left font-medium">Recipes</th>
                </tr>
              </thead>
              <tbody>
                {boards.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--bg-700)' }}>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-100)' }}>{b.name}</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-400)' }}>{b.slug}</td>
                    <td className="py-2" style={{ color: 'var(--text-400)' }}>{b.recipe_count ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-500)' }}>No boards fetched yet. Click "Fetch" to pull from the Pinboards plugin.</p>
        )}
      </section>

      {/* Authors */}
      <section className="card p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>WordPress Authors</h2>
          </div>
          <button onClick={handleFetchAuthors} disabled={fetchingAuthors} className="btn btn-secondary text-sm">
            {fetchingAuthors ? <><Loader2 className="w-4 h-4 animate-spin" /> Fetching...</> : <><RefreshCw className="w-4 h-4" /> Fetch</>}
          </button>
        </div>
        {authors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-600)', color: 'var(--text-400)' }}>
                  <th className="py-2 pr-4 text-left font-medium">ID</th>
                  <th className="py-2 pr-4 text-left font-medium">Name</th>
                  <th className="py-2 text-left font-medium">Slug</th>
                </tr>
              </thead>
              <tbody>
                {authors.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--bg-700)' }}>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-400)' }}>{a.id}</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-100)' }}>{a.name}</td>
                    <td className="py-2" style={{ color: 'var(--text-400)' }}>{a.slug}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-500)' }}>No authors fetched yet. Click "Fetch" to pull from WordPress.</p>
        )}
      </section>

      {/* Recipes */}
      <section className="card p-6 mt-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-100)' }}>Recipes</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-600)', color: 'var(--text-400)' }}>
              {recipes.length} total
            </span>
          </div>
          <button onClick={handleSyncSheet} disabled={syncing || !project.google_sheet_url} className="btn btn-primary text-sm">
            {syncing ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing...</> : <><RefreshCw className="w-4 h-4" /> Sync Sheet</>}
          </button>
        </div>
        {syncResult && (
          <div 
            className="mb-4 p-2 rounded text-xs flex items-center gap-2"
            style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: 'var(--primary-300)' }}
          >
            Sheet: {syncResult.total_in_sheet} rows | Imported: {syncResult.imported} | Skipped: {syncResult.already_existed}
          </div>
        )}
        {recipes.length > 0 ? (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: 'var(--bg-700)' }}>
                <tr style={{ borderBottom: '1px solid var(--bg-600)', color: 'var(--text-400)' }}>
                  <th className="py-2 pr-4 text-left font-medium">Title</th>
                  <th className="py-2 pr-4 text-left font-medium">Status</th>
                  <th className="py-2 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--bg-700)' }}>
                    <td className="py-2 pr-4 max-w-xs truncate" style={{ color: 'var(--text-100)' }}>{r.title}</td>
                    <td className="py-2 pr-4">
                      <span 
                        className="inline-block px-2 py-0.5 text-xs rounded-full"
                        style={{ 
                          background: `color-mix(in srgb, ${getRecipeStatusColor(r.status)} 15%, transparent)`,
                          color: getRecipeStatusColor(r.status)
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 text-xs" style={{ color: 'var(--text-500)' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-500)' }}>
            No recipes yet. Configure a Google Sheet URL and click "Sync Sheet" to import.
          </p>
        )}
      </section>
    </div>
  );
}
