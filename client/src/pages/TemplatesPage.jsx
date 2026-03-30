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
  Clock
} from 'lucide-react';
import * as templateApi from '../api/templates';

function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, my, system
  const [menuOpen, setMenuOpen] = useState(null);
  const [deleting, setDeleting] = useState(null);

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
        
        <button 
          className="btn btn-primary flex items-center gap-2"
          onClick={() => navigate('/templates/new')}
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
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
                  className="aspect-[2/3] relative overflow-hidden"
                  style={{ background: template.background_color || 'var(--bg-700)' }}
                >
                  {/* Live template preview */}
                  {(() => {
                    const tpl = template;
                    const textBarHeight = tpl.text_bar_enabled ? ((tpl.text_bar_height || 200) / (tpl.height || 1500) * 100) : 0;
                    const topPct = tpl.top_image_height || 50;
                    const bottomPct = tpl.bottom_image_height || 50;
                    const availablePct = 100 - textBarHeight;
                    const topH = availablePct * (topPct / 100);
                    const bottomH = availablePct * (bottomPct / 100);
                    
                    let topY = 0, barY = 0, bottomY = 0;
                    if (tpl.text_bar_position === 'top') {
                      barY = 0; topY = textBarHeight; bottomY = topY + topH;
                    } else if (tpl.text_bar_position === 'bottom') {
                      topY = 0; bottomY = topH; barY = 100 - textBarHeight;
                    } else {
                      topY = 0; barY = topH; bottomY = topH + textBarHeight;
                    }
                    
                    return (
                      <>
                        {/* Top image area */}
                        <div className="absolute left-0 right-0" style={{
                          top: `${topY}%`, height: `${topH}%`,
                          background: `linear-gradient(135deg, ${tpl.background_color || '#1a1a2e'} 0%, ${tpl.background_color || '#1a1a2e'}cc 100%)`,
                          opacity: tpl.image_opacity || 1,
                        }}>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
                          </div>
                        </div>
                        
                        {/* Text bar */}
                        {tpl.text_bar_enabled && (
                          <div className="absolute left-0 right-0 flex items-center justify-center" style={{
                            top: `${barY}%`, height: `${textBarHeight}%`,
                            background: tpl.text_bar_color || '#ffffff',
                            opacity: tpl.text_bar_opacity || 1,
                          }}>
                            <span style={{
                              fontFamily: `"${tpl.title_font || 'Montserrat'}", sans-serif`,
                              fontWeight: tpl.title_weight || 700,
                              fontSize: '0.65rem',
                              color: tpl.title_color || '#1a1a2e',
                              textAlign: 'center',
                              padding: '0 8px',
                              lineHeight: 1.2,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              Recipe Title
                            </span>
                          </div>
                        )}
                        
                        {/* Bottom image area */}
                        <div className="absolute left-0 right-0" style={{
                          top: `${bottomY}%`, height: `${bottomH}%`,
                          background: `linear-gradient(225deg, ${tpl.background_color || '#1a1a2e'} 0%, ${tpl.background_color || '#1a1a2e'}aa 100%)`,
                          opacity: tpl.image_opacity || 1,
                        }}>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
                          </div>
                        </div>
                        
                        {/* Website text */}
                        {tpl.website_enabled && tpl.website_text && (
                          <div className="absolute left-0 right-0 text-center" style={{
                            [tpl.website_position === 'top' ? 'top' : 'bottom']: '4px',
                            fontSize: '0.45rem',
                            color: tpl.website_color || '#000',
                            fontFamily: `"${tpl.website_font || 'Montserrat'}", sans-serif`,
                          }}>
                            {tpl.website_text}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  
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
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleDuplicate(template.id)}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
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
                    <Clock className="w-3 h-3" />
                    <span>{template.createdAt || template.created_at ? new Date(template.createdAt || template.created_at).toLocaleDateString() : ''}</span>
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
    </div>
  );
}

export default TemplatesPage;
