import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Palette,
  Plus,
  Edit3,
  Trash2,
  Copy,
  MoreVertical,
  Grid3X3,
  Type,
  Image as ImageIcon,
  Loader2,
  Search,
  Filter,
  Star,
  Clock,
  Wand2,
  Upload,
  X
} from 'lucide-react';
import * as templateApi from '../api/templates';
import TemplatePreview from '../components/TemplatePreview';

function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, my, system
  const [menuOpen, setMenuOpen] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneImage, setCloneImage] = useState(null);
  const [cloneImagePreview, setCloneImagePreview] = useState(null);
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await templateApi.getTemplates();
      setTemplates(data);
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      setDeleting(id);
      await templateApi.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (err) {
      alert('Failed to delete template');
    } finally {
      setDeleting(null);
      setMenuOpen(null);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const newTemplate = await templateApi.duplicateTemplate(id);
      setTemplates([newTemplate, ...templates]);
      setMenuOpen(null);
    } catch (err) {
      alert('Failed to duplicate template');
    }
  };

  const handleCloneImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setCloneError('Image must be under 10MB');
      return;
    }
    setCloneError('');
    setCloneImagePreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (evt) => setCloneImage(evt.target.result);
    reader.readAsDataURL(file);
  };

  const handleCloneSubmit = async () => {
    if (!cloneImage) return;
    try {
      setCloning(true);
      setCloneError('');
      const config = await templateApi.cloneFromImage(cloneImage);
      // Create the template
      const created = await templateApi.createTemplate(config);
      setShowCloneModal(false);
      setCloneImage(null);
      setCloneImagePreview(null);
      navigate(`/templates/${created.id}/edit`);
    } catch (err) {
      setCloneError(err.response?.data?.error || 'Failed to clone design. Check your OpenAI key in Settings.');
    } finally {
      setCloning(false);
    }
  };

  const filteredTemplates = templates.filter(t => {
    // Filter by search
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Filter by type
    if (filter === 'my' && t.is_system) return false;
    if (filter === 'system' && !t.is_system) return false;
    return true;
  });

  const layoutIcons = {
    'text-bar': Grid3X3,
    'two-photo-stack': ImageIcon,
    'badge-style': Star,
    'full-background': ImageIcon,
    'minimal': Type
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(236, 72, 153, 0.2)' }}
          >
            <Palette className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-100)' }}>
              Pin Templates
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-400)' }}>
              Design and manage your Pinterest pin templates
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            className="btn flex items-center gap-2"
            style={{ background: 'var(--bg-700)', color: 'var(--text-200)', border: '1px solid var(--border)' }}
            onClick={() => setShowCloneModal(true)}
          >
            <Wand2 className="w-4 h-4" />
            Clone Design
          </button>
          <button 
            className="btn btn-primary flex items-center gap-2"
            onClick={() => navigate('/templates/new')}
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: 'var(--text-500)' }} 
          />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`btn btn-sm ${filter === 'my' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('my')}
          >
            My Templates
          </button>
          <button
            className={`btn btn-sm ${filter === 'system' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('system')}
          >
            System
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-400)' }} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card p-6 text-center" style={{ background: 'rgba(220, 38, 38, 0.1)' }}>
          <p style={{ color: 'var(--error-400)' }}>{error}</p>
          <button className="btn btn-primary mt-4" onClick={loadTemplates}>
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredTemplates.length === 0 && (
        <div className="card p-12 text-center">
          <Palette 
            className="w-16 h-16 mx-auto mb-4" 
            style={{ color: 'var(--text-600)' }} 
          />
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-200)' }}>
            No templates found
          </h3>
          <p className="mb-6" style={{ color: 'var(--text-400)' }}>
            {searchQuery 
              ? 'Try a different search term'
              : 'Create your first template to start designing pins'}
          </p>
          {!searchQuery && (
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/templates/new')}
            >
              Create Template
            </button>
          )}
        </div>
      )}

      {/* Template Grid */}
      {!loading && !error && filteredTemplates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => {
            const LayoutIcon = layoutIcons[template.layout] || Grid3X3;
            
            return (
              <div 
                key={template.id}
                className="card overflow-hidden group transition-all hover:scale-[1.02]"
                style={{ background: 'var(--bg-800)' }}
              >
                {/* Preview */}
                <div 
                  className="relative overflow-hidden"
                  style={{ 
                    background: template.background_color || 'var(--bg-700)',
                    maxHeight: 500,
                  }}
                >
                  <TemplatePreview template={template} fillContainer />
                  
                  {/* System badge */}
                  {template.is_system && (
                    <div 
                      className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium"
                      style={{ 
                        background: 'rgba(99, 102, 241, 0.9)', 
                        color: 'white' 
                      }}
                    >
                      System
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                  >
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/templates/${template.id}/edit`)}
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleDuplicate(template.id)}
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {!template.is_system && (
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(220,38,38,0.8)', color: 'white' }}
                        onClick={() => handleDelete(template.id)}
                        disabled={deleting === template.id}
                        title="Delete"
                      >
                        {deleting === template.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-semibold truncate"
                        style={{ color: 'var(--text-100)' }}
                      >
                        {template.name}
                      </h3>
                      <p 
                        className="text-xs mt-0.5 truncate"
                        style={{ color: 'var(--text-400)' }}
                      >
                        {template.description || 'No description'}
                      </p>
                    </div>
                    
                    {/* Menu */}
                    <div className="relative">
                      <button
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === template.id ? null : template.id);
                        }}
                      >
                        <MoreVertical className="w-4 h-4" style={{ color: 'var(--text-400)' }} />
                      </button>
                      
                      {menuOpen === template.id && (
                        <div 
                          className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-10 min-w-[140px]"
                          style={{ background: 'var(--bg-700)', border: '1px solid var(--border)' }}
                        >
                          <button
                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
                            style={{ color: 'var(--text-200)' }}
                            onClick={() => {
                              navigate(`/templates/${template.id}/edit`);
                              setMenuOpen(null);
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
                            style={{ color: 'var(--text-200)' }}
                            onClick={() => handleDuplicate(template.id)}
                          >
                            <Copy className="w-4 h-4" />
                            Duplicate
                          </button>
                          {!template.is_system && (
                            <button
                              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
                              style={{ color: 'var(--error-400)' }}
                              onClick={() => handleDelete(template.id)}
                              disabled={deleting === template.id}
                            >
                              {deleting === template.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-500)' }}>
                    <LayoutIcon className="w-3 h-3" />
                    <span className="capitalize">{(template.layout || 'text-bar').replace(/-/g, ' ')}</span>
                    <span>•</span>
                    <span>{template.width}×{template.height}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Click outside to close menu */}
      {menuOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setMenuOpen(null)}
        />
      )}

      {/* Clone from Image Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-xl p-6" style={{ background: 'var(--bg-800)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-100)' }}>
                <Wand2 className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                Clone Competitor Design
              </h2>
              <button onClick={() => { setShowCloneModal(false); setCloneImage(null); setCloneImagePreview(null); setCloneError(''); }} className="p-1 rounded hover:bg-white/10">
                <X className="w-5 h-5" style={{ color: 'var(--text-400)' }} />
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--text-400)' }}>
              Upload a screenshot of a Pinterest pin design. AI will analyze the layout, colors, fonts, and styling to create a matching template.
            </p>

            {!cloneImagePreview ? (
              <label className="flex flex-col items-center justify-center gap-3 py-12 rounded-lg border-2 border-dashed cursor-pointer hover:border-primary-500 transition-colors"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-900)' }}>
                <Upload className="w-8 h-8" style={{ color: 'var(--text-500)' }} />
                <span className="text-sm" style={{ color: 'var(--text-400)' }}>Click to upload pin image</span>
                <span className="text-xs" style={{ color: 'var(--text-500)' }}>PNG, JPG, WebP — max 10MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleCloneImageSelect} />
              </label>
            ) : (
              <div className="relative mb-4">
                <img src={cloneImagePreview} alt="Pin to clone" className="w-full max-h-80 object-contain rounded-lg" style={{ background: 'var(--bg-900)' }} />
                <button
                  className="absolute top-2 right-2 p-1 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.6)' }}
                  onClick={() => { setCloneImage(null); setCloneImagePreview(null); }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {cloneError && (
              <div className="text-sm mt-3 p-2 rounded" style={{ color: 'var(--error-400)', background: 'rgba(220,38,38,0.1)' }}>
                {cloneError}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="btn"
                style={{ background: 'var(--bg-700)', color: 'var(--text-300)' }}
                onClick={() => { setShowCloneModal(false); setCloneImage(null); setCloneImagePreview(null); setCloneError(''); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary flex items-center gap-2"
                onClick={handleCloneSubmit}
                disabled={!cloneImage || cloning}
              >
                {cloning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Clone Design
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatesPage;
