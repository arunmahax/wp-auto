import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  Loader2,
  Type,
  Palette,
  Image as ImageIcon,
  Layout,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Minus,
  RotateCcw,
  Download,
  Copy,
  Layers,
  Move,
  ChevronDown,
  Paintbrush,
  Sparkles,
  Globe,
  ArrowUp,
  ArrowDown,
  Square,
  RectangleVertical,
  Maximize2,
  Upload
} from 'lucide-react';
import * as templateApi from '../api/templates';

// Extended Google Fonts for Pinterest
const FONT_OPTIONS = [
  // Sans-Serif
  { value: 'Montserrat', label: 'Montserrat', category: 'sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'sans-serif' },
  { value: 'Raleway', label: 'Raleway', category: 'sans-serif' },
  { value: 'Oswald', label: 'Oswald', category: 'sans-serif' },
  { value: 'Josefin Sans', label: 'Josefin Sans', category: 'sans-serif' },
  { value: 'Quicksand', label: 'Quicksand', category: 'sans-serif' },
  { value: 'Nunito', label: 'Nunito', category: 'sans-serif' },
  { value: 'Source Sans 3', label: 'Source Sans 3', category: 'sans-serif' },
  { value: 'Inter', label: 'Inter', category: 'sans-serif' },
  { value: 'Work Sans', label: 'Work Sans', category: 'sans-serif' },
  { value: 'Rubik', label: 'Rubik', category: 'sans-serif' },
  { value: 'Karla', label: 'Karla', category: 'sans-serif' },
  { value: 'Manrope', label: 'Manrope', category: 'sans-serif' },
  { value: 'DM Sans', label: 'DM Sans', category: 'sans-serif' },
  { value: 'Outfit', label: 'Outfit', category: 'sans-serif' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'sans-serif' },
  { value: 'Space Grotesk', label: 'Space Grotesk', category: 'sans-serif' },
  { value: 'Barlow', label: 'Barlow', category: 'sans-serif' },
  { value: 'Barlow Condensed', label: 'Barlow Condensed', category: 'sans-serif' },
  { value: 'Archivo Black', label: 'Archivo Black', category: 'sans-serif' },
  { value: 'Teko', label: 'Teko', category: 'sans-serif' },
  { value: 'Exo 2', label: 'Exo 2', category: 'sans-serif' },
  { value: 'Cabin', label: 'Cabin', category: 'sans-serif' },
  { value: 'Titillium Web', label: 'Titillium Web', category: 'sans-serif' },
  { value: 'Mukta', label: 'Mukta', category: 'sans-serif' },
  // Serif
  { value: 'Playfair Display', label: 'Playfair Display', category: 'serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'serif' },
  { value: 'Cinzel', label: 'Cinzel', category: 'serif' },
  { value: 'DM Serif Display', label: 'DM Serif Display', category: 'serif' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'serif' },
  { value: 'Libre Baskerville', label: 'Libre Baskerville', category: 'serif' },
  { value: 'Lora', label: 'Lora', category: 'serif' },
  { value: 'Crimson Text', label: 'Crimson Text', category: 'serif' },
  { value: 'EB Garamond', label: 'EB Garamond', category: 'serif' },
  { value: 'Bitter', label: 'Bitter', category: 'serif' },
  { value: 'Noto Serif', label: 'Noto Serif', category: 'serif' },
  { value: 'Spectral', label: 'Spectral', category: 'serif' },
  { value: 'Fraunces', label: 'Fraunces', category: 'serif' },
  // Display
  { value: 'Bebas Neue', label: 'Bebas Neue', category: 'display' },
  { value: 'Anton', label: 'Anton', category: 'display' },
  { value: 'Abril Fatface', label: 'Abril Fatface', category: 'display' },
  { value: 'Lobster', label: 'Lobster', category: 'display' },
  { value: 'Righteous', label: 'Righteous', category: 'display' },
  { value: 'Alfa Slab One', label: 'Alfa Slab One', category: 'display' },
  { value: 'Russo One', label: 'Russo One', category: 'display' },
  { value: 'Fjalla One', label: 'Fjalla One', category: 'display' },
  { value: 'Staatliches', label: 'Staatliches', category: 'display' },
  { value: 'Black Ops One', label: 'Black Ops One', category: 'display' },
  { value: 'Bungee', label: 'Bungee', category: 'display' },
  { value: 'Fredoka One', label: 'Fredoka One', category: 'display' },
  { value: 'Passion One', label: 'Passion One', category: 'display' },
  { value: 'Lilita One', label: 'Lilita One', category: 'display' },
  { value: 'Dela Gothic One', label: 'Dela Gothic One', category: 'display' },
  { value: 'Bree Serif', label: 'Bree Serif', category: 'display' },
  { value: 'Changa One', label: 'Changa One', category: 'display' },
  { value: 'Crete Round', label: 'Crete Round', category: 'display' },
  { value: 'Patua One', label: 'Patua One', category: 'display' },
  { value: 'Secular One', label: 'Secular One', category: 'display' },
  // Handwriting / Script
  { value: 'Pacifico', label: 'Pacifico', category: 'handwriting' },
  { value: 'Dancing Script', label: 'Dancing Script', category: 'handwriting' },
  { value: 'Permanent Marker', label: 'Permanent Marker', category: 'handwriting' },
  { value: 'Satisfy', label: 'Satisfy', category: 'handwriting' },
  { value: 'Caveat', label: 'Caveat', category: 'handwriting' },
  { value: 'Shadows Into Light', label: 'Shadows Into Light', category: 'handwriting' },
  { value: 'Great Vibes', label: 'Great Vibes', category: 'handwriting' },
  { value: 'Sacramento', label: 'Sacramento', category: 'handwriting' },
  { value: 'Kalam', label: 'Kalam', category: 'handwriting' },
  { value: 'Indie Flower', label: 'Indie Flower', category: 'handwriting' },
  { value: 'Amatic SC', label: 'Amatic SC', category: 'handwriting' },
  { value: 'Architects Daughter', label: 'Architects Daughter', category: 'handwriting' },
  { value: 'Courgette', label: 'Courgette', category: 'handwriting' },
  { value: 'Gloria Hallelujah', label: 'Gloria Hallelujah', category: 'handwriting' },
  { value: 'Homemade Apple', label: 'Homemade Apple', category: 'handwriting' },
];

// Preset pin sizes
const SIZE_PRESETS = [
  { name: 'Pinterest Standard', width: 1000, height: 1500, icon: RectangleVertical },
  { name: 'Pinterest Tall', width: 1000, height: 2100, icon: RectangleVertical },
  { name: 'Pinterest Short', width: 1000, height: 1000, icon: Square },
  { name: 'Instagram Story', width: 1080, height: 1920, icon: RectangleVertical },
  { name: 'Wide Pin', width: 1000, height: 750, icon: Maximize2 },
];

// Preset layouts
const LAYOUT_PRESETS = [
  {
    id: 'classic-bar',
    name: 'Classic Bar',
    description: 'White text bar at bottom',
    config: {
      layout: 'text-bar',
      text_bar_enabled: true,
      text_bar_position: 'bottom',
      text_bar_height: 350,
      text_bar_color: '#ffffff',
      text_bar_opacity: 1.0,
      title_color: '#1a1a2e',
      title_font: 'Montserrat',
      title_size: 64,
      title_weight: 700,
      image_overlay_enabled: false,
    }
  },
  {
    id: 'overlay-bold',
    name: 'Bold Overlay',
    description: 'Text over dark overlay',
    config: {
      layout: 'full-background',
      text_bar_enabled: false,
      image_overlay_enabled: true,
      image_overlay_color: 'rgba(0,0,0,0.5)',
      title_color: '#ffffff',
      title_font: 'Oswald',
      title_size: 72,
      title_weight: 700,
      title_shadow_enabled: true,
      title_shadow_blur: 8,
    }
  },
  {
    id: 'minimal-white',
    name: 'Minimal White',
    description: 'Clean white background',
    config: {
      layout: 'minimal',
      background_color: '#ffffff',
      text_bar_enabled: true,
      text_bar_color: '#ffffff',
      text_bar_height: 400,
      text_bar_position: 'center',
      title_color: '#1a1a2e',
      title_font: 'Playfair Display',
      title_size: 64,
      title_weight: 700,
      image_overlay_enabled: false,
    }
  },
  {
    id: 'badge-style',
    name: 'Badge Style',
    description: 'With category badge',
    config: {
      layout: 'badge-style',
      text_bar_enabled: true,
      text_bar_position: 'bottom',
      text_bar_height: 300,
      text_bar_color: '#ffffff',
      badge_enabled: true,
      badge_text: 'RECIPE',
      badge_position: 'top-left',
      badge_background: '#e63946',
      badge_color: '#ffffff',
      title_font: 'Bebas Neue',
      title_size: 68,
      title_weight: 400,
    }
  },
];

// Color presets
const COLOR_PRESETS = [
  '#ffffff', '#000000', '#1a1a2e', '#e63946', '#f4a261',
  '#2a9d8f', '#264653', '#e9c46a', '#f72585', '#7209b7',
  '#3a86ff', '#8338ec', '#ff006e', '#fb5607', '#ffbe0b',
];

// Image position options
const IMAGE_POSITIONS = [
  { value: 'cover', label: 'Cover (fill)' },
  { value: 'contain', label: 'Contain (fit)' },
  { value: 'top', label: 'Align Top' },
  { value: 'center', label: 'Align Center' },
  { value: 'bottom', label: 'Align Bottom' },
];

function TemplateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const previewRef = useRef(null);
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('text'); // text, background, layout, badge
  
  // Template state - MATCHING BACKEND MODEL FIELD NAMES
  const [template, setTemplate] = useState({
    name: 'Untitled Template',
    description: '',
    layout: 'text-bar',
    width: 1000,
    height: 1500,
    background_type: 'images',
    background_color: '#1a1a2e',
    // Image settings
    image_position: 'cover',
    image_opacity: 1.0,
    image_overlay_enabled: true,
    image_overlay_color: 'rgba(0,0,0,0.2)',
    // Two-photo-stack image sizing
    top_image_height: 50,
    bottom_image_height: 50,
    image_gap: 0,
    // Text bar
    text_bar_enabled: true,
    text_bar_position: 'bottom',
    text_bar_height: 350,
    text_bar_color: '#ffffff',
    text_bar_opacity: 1.0,
    // Title
    title_font: 'Montserrat',
    title_size: 64,
    title_weight: 700,
    title_color: '#1a1a2e',
    title_alignment: 'center',
    title_line_height: 1.2,
    title_max_width: 90,
    title_outline_enabled: false,
    title_outline_color: '#ffffff',
    title_outline_width: 3,
    title_shadow_enabled: false,
    title_shadow_color: 'rgba(0,0,0,0.5)',
    title_shadow_blur: 4,
    title_max_lines: 3,
    // Subtitle
    subtitle_enabled: false,
    subtitle_text: 'EASY | DELICIOUS | THE BEST',
    subtitle_font: 'Montserrat',
    subtitle_size: 24,
    subtitle_weight: 400,
    subtitle_color: '#666666',
    // Website
    website_enabled: false,
    website_text: 'yoursite.com',
    website_font: 'Montserrat',
    website_size: 24,
    website_color: '#333333',
    website_position: 'bottom',
    website_background: '',
    // Badge
    badge_enabled: false,
    badge_text: 'RECIPE',
    badge_position: 'top-left',
    badge_background: '#e63946',
    badge_color: '#ffffff',
    badge_font: 'Montserrat',
    badge_size: 24,
  });
  
  // Sample text for preview
  const [previewTitle, setPreviewTitle] = useState('Easy Chicken Recipe');
  
  // Load template if editing
  useEffect(() => {
    if (!isNew) {
      loadTemplate();
    }
    loadGoogleFonts();
  }, [id]);
  
  const loadGoogleFonts = () => {
    const existingLink = document.querySelector('link[data-google-fonts]');
    if (existingLink) return;
    
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${FONT_OPTIONS.map(f => f.value.replace(/ /g, '+')).join('&family=')}&display=swap`;
    link.rel = 'stylesheet';
    link.setAttribute('data-google-fonts', 'true');
    document.head.appendChild(link);
  };
  
  const loadTemplate = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await templateApi.getTemplate(id);
      // Merge with defaults to handle any missing fields
      setTemplate(prev => ({ ...prev, ...data }));
    } catch (err) {
      setError('Failed to load template');
      console.error('Load template error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const updateTemplate = useCallback((updates) => {
    setTemplate(prev => ({ ...prev, ...updates }));
  }, []);
  
  const applyPreset = (preset) => {
    updateTemplate(preset.config);
  };
  
  const applySizePreset = (preset) => {
    updateTemplate({ width: preset.width, height: preset.height });
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      // Prepare data - remove any fields that shouldn't be sent
      const saveData = { ...template };
      delete saveData.id;
      delete saveData.user_id;
      delete saveData.created_at;
      delete saveData.updated_at;
      delete saveData.createdAt;
      delete saveData.updatedAt;
      
      if (isNew) {
        const created = await templateApi.createTemplate(saveData);
        navigate(`/templates/${created.id}/edit`, { replace: true });
      } else {
        await templateApi.updateTemplate(id, saveData);
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleExportJSON = () => {
    const exportData = { ...template };
    delete exportData.id;
    delete exportData.user_id;
    delete exportData.created_at;
    delete exportData.updated_at;
    delete exportData.createdAt;
    delete exportData.updatedAt;
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(template.name || 'template').replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          if (!data || typeof data !== 'object') throw new Error('Invalid');
          delete data.id;
          delete data.user_id;
          delete data.created_at;
          delete data.updated_at;
          delete data.createdAt;
          delete data.updatedAt;
          setTemplate(prev => ({ ...prev, ...data }));
        } catch {
          setError('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-400)' }} />
      </div>
    );
  }
  
  // Calculate preview styles
  const previewScale = Math.min(350 / template.width, 500 / template.height);
  
  // Compute layout positions (shared between preview elements)
  const getLayoutPositions = () => {
    const totalHeight = template.height * previewScale;
    const textBarHeight = template.text_bar_enabled ? (template.text_bar_height * previewScale) : 0;
    const availableHeight = totalHeight - textBarHeight;
    const imageGap = (template.image_gap || 0) * previewScale;
    
    const topPct = template.top_image_height || 50;
    const bottomPct = template.bottom_image_height || 50;
    const topHeight = availableHeight * (topPct / 100);
    const bottomHeight = availableHeight * (bottomPct / 100);
    
    let topY = 0, textBarY = 0, bottomY = 0;
    if (template.text_bar_position === 'top') {
      textBarY = 0;
      topY = textBarHeight;
      bottomY = topY + topHeight + imageGap;
    } else if (template.text_bar_position === 'bottom') {
      topY = 0;
      bottomY = topHeight + imageGap;
      textBarY = totalHeight - textBarHeight;
    } else {
      topY = 0;
      textBarY = topHeight;
      bottomY = topHeight + textBarHeight;
    }
    
    return { totalHeight, textBarHeight, topHeight, bottomHeight, topY, textBarY, bottomY, imageGap };
  };
  
  const getTextBarStyle = () => {
    if (!template.text_bar_enabled) return { display: 'none' };
    const layout = getLayoutPositions();
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: layout.textBarY,
      height: layout.textBarHeight,
      background: template.text_bar_color,
      opacity: template.text_bar_opacity,
      ...(template.text_bar_stroke_enabled ? {
        borderTop: `${template.text_bar_stroke_width || 2}px solid ${template.text_bar_stroke_color || '#000000'}`,
        borderBottom: `${template.text_bar_stroke_width || 2}px solid ${template.text_bar_stroke_color || '#000000'}`,
        boxSizing: 'border-box',
      } : {}),
    };
  };
  
  const getTitleContainerStyle = () => {
    if (!template.text_bar_enabled) {
      return { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' };
    }
    const layout = getLayoutPositions();
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: layout.textBarY,
      height: layout.textBarHeight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
    };
  };
  
  const getTitleStyle = () => {
    const style = {
      fontFamily: `"${template.title_font}", sans-serif`,
      fontSize: `${template.title_size * previewScale}px`,
      fontWeight: template.title_weight,
      color: template.title_color,
      textAlign: template.title_alignment,
      lineHeight: template.title_line_height,
      maxWidth: `${template.title_max_width}%`,
      textTransform: 'uppercase',
      letterSpacing: '0.02em',
      wordBreak: 'break-word',
    };
    
    if (template.title_outline_enabled) {
      style.WebkitTextStroke = `${template.title_outline_width * previewScale}px ${template.title_outline_color}`;
      style.paintOrder = 'stroke fill';
    }
    
    if (template.title_shadow_enabled) {
      const blur = template.title_shadow_blur * previewScale;
      style.textShadow = `${blur / 2}px ${blur / 2}px ${blur}px ${template.title_shadow_color}`;
    }
    
    return style;
  };
  
  const getBadgeStyle = () => {
    const pos = template.badge_position;
    return {
      position: 'absolute',
      padding: `${4 * previewScale}px ${10 * previewScale}px`,
      background: template.badge_background,
      color: template.badge_color,
      fontFamily: `"${template.badge_font}", sans-serif`,
      fontSize: `${template.badge_size * previewScale}px`,
      fontWeight: 700,
      borderRadius: `${4 * previewScale}px`,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      top: pos.includes('top') ? `${12 * previewScale}px` : 'auto',
      bottom: pos.includes('bottom') ? `${12 * previewScale}px` : 'auto',
      left: pos.includes('left') ? `${12 * previewScale}px` : 'auto',
      right: pos.includes('right') ? `${12 * previewScale}px` : 'auto',
    };
  };
  
  const getWebsiteStyle = () => {
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      padding: `${6 * previewScale}px`,
      background: template.website_background || 'rgba(0,0,0,0.3)',
      color: template.website_color,
      fontFamily: `"${template.website_font}", sans-serif`,
      fontSize: `${template.website_size * previewScale}px`,
      textAlign: 'center',
      top: template.website_position === 'top' ? 0 : 'auto',
      bottom: template.website_position === 'bottom' ? 0 : 'auto',
    };
  };
  
  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-900)' }}>
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-800)' }}
      >
        <div className="flex items-center gap-4">
          <button
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => navigate('/templates')}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-300)' }} />
          </button>
          
          <input
            type="text"
            value={template.name}
            onChange={(e) => updateTemplate({ name: e.target.value })}
            className="bg-transparent border-0 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2"
            style={{ color: 'var(--text-100)' }}
            placeholder="Template Name"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-sm px-3 py-1 rounded" style={{ color: 'var(--error-400)', background: 'rgba(220,38,38,0.1)' }}>
              {error}
            </span>
          )}
          <button
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={handleImportJSON}
            title="Import design from JSON"
          >
            <Upload className="w-4 h-4" style={{ color: 'var(--text-300)' }} />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={handleExportJSON}
            title="Export design as JSON"
          >
            <Download className="w-4 h-4" style={{ color: 'var(--text-300)' }} />
          </button>
          <button
            className="btn btn-primary flex items-center gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Template
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Tools */}
        <div 
          className="w-80 flex flex-col border-r overflow-hidden"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-800)' }}
        >
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
            {[
              { id: 'text', icon: Type, label: 'Text' },
              { id: 'background', icon: ImageIcon, label: 'Image' },
              { id: 'layout', icon: Layout, label: 'Layout' },
              { id: 'badge', icon: Sparkles, label: 'Extras' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
                  activeTab === tab.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="w-4 h-4" style={{ color: activeTab === tab.id ? 'var(--primary-400)' : 'var(--text-400)' }} />
                <span className="text-xs" style={{ color: activeTab === tab.id ? 'var(--text-100)' : 'var(--text-400)' }}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
          
          {/* Tool Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TEXT TAB */}
            {activeTab === 'text' && (
              <>
                {/* Preview Text */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Preview Text
                  </label>
                  <input
                    type="text"
                    value={previewTitle}
                    onChange={(e) => setPreviewTitle(e.target.value)}
                    className="input w-full"
                    placeholder="Enter preview text..."
                  />
                </div>
                
                {/* Font Family */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Title Font ({FONT_OPTIONS.length} fonts)
                  </label>
                  <select
                    value={template.title_font}
                    onChange={(e) => updateTemplate({ title_font: e.target.value })}
                    className="input w-full"
                    style={{ fontFamily: template.title_font }}
                  >
                    {FONT_OPTIONS.map(font => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Font Size */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Font Size: {template.title_size}px
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-sm btn-ghost p-2"
                      onClick={() => updateTemplate({ title_size: Math.max(16, template.title_size - 4) })}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      value={template.title_size}
                      onChange={(e) => updateTemplate({ title_size: Number(e.target.value) })}
                      min={16}
                      max={150}
                      className="flex-1"
                    />
                    <button
                      className="btn btn-sm btn-ghost p-2"
                      onClick={() => updateTemplate({ title_size: Math.min(150, template.title_size + 4) })}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Font Weight */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Font Weight
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[400, 500, 600, 700, 800, 900].map(weight => (
                      <button
                        key={weight}
                        className={`py-2 rounded text-xs transition-colors ${
                          template.title_weight === weight 
                            ? 'bg-primary-500 text-white' 
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                        style={{ color: template.title_weight === weight ? 'white' : 'var(--text-300)' }}
                        onClick={() => updateTemplate({ title_weight: weight })}
                      >
                        {weight}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Text Color */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Text Color
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COLOR_PRESETS.slice(0, 10).map(color => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          template.title_color === color ? 'border-primary-400 ring-2 ring-primary-400/50' : 'border-transparent'
                        }`}
                        style={{ background: color }}
                        onClick={() => updateTemplate({ title_color: color })}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={template.title_color}
                      onChange={(e) => updateTemplate({ title_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={template.title_color}
                      onChange={(e) => updateTemplate({ title_color: e.target.value })}
                      className="input flex-1"
                    />
                  </div>
                </div>
                
                {/* Alignment */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Alignment
                  </label>
                  <div className="flex gap-1">
                    {[
                      { value: 'left', icon: AlignLeft },
                      { value: 'center', icon: AlignCenter },
                      { value: 'right', icon: AlignRight },
                    ].map(({ value, icon: Icon }) => (
                      <button
                        key={value}
                        className={`flex-1 py-2 rounded flex items-center justify-center transition-colors ${
                          template.title_alignment === value
                            ? 'bg-primary-500'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                        onClick={() => updateTemplate({ title_alignment: value })}
                      >
                        <Icon className="w-4 h-4" style={{ color: template.title_alignment === value ? 'white' : 'var(--text-300)' }} />
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Line Height */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Line Height: {template.title_line_height}
                  </label>
                  <input
                    type="range"
                    value={template.title_line_height}
                    onChange={(e) => updateTemplate({ title_line_height: Number(e.target.value) })}
                    min={0.8}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                {/* Stroke / Outline */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-700)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-200)' }}>Text Stroke</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.title_outline_enabled}
                        onChange={(e) => updateTemplate({ title_outline_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-600 peer-checked:bg-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                  
                  {template.title_outline_enabled && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-16" style={{ color: 'var(--text-400)' }}>Color</span>
                        <input
                          type="color"
                          value={template.title_outline_color}
                          onChange={(e) => updateTemplate({ title_outline_color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={template.title_outline_color}
                          onChange={(e) => updateTemplate({ title_outline_color: e.target.value })}
                          className="input flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-16" style={{ color: 'var(--text-400)' }}>Width</span>
                        <input
                          type="range"
                          value={template.title_outline_width}
                          onChange={(e) => updateTemplate({ title_outline_width: Number(e.target.value) })}
                          min={1}
                          max={10}
                          className="flex-1"
                        />
                        <span className="text-xs w-8" style={{ color: 'var(--text-300)' }}>{template.title_outline_width}px</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Shadow */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-700)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-200)' }}>Text Shadow</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.title_shadow_enabled}
                        onChange={(e) => updateTemplate({ title_shadow_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-600 peer-checked:bg-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                  
                  {template.title_shadow_enabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-16" style={{ color: 'var(--text-400)' }}>Blur</span>
                      <input
                        type="range"
                        value={template.title_shadow_blur}
                        onChange={(e) => updateTemplate({ title_shadow_blur: Number(e.target.value) })}
                        min={0}
                        max={30}
                        className="flex-1"
                      />
                      <span className="text-xs w-8" style={{ color: 'var(--text-300)' }}>{template.title_shadow_blur}px</span>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* IMAGE/BACKGROUND TAB */}
            {activeTab === 'background' && (
              <>
                {/* Image Position */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Image Position
                  </label>
                  <select
                    value={template.image_position}
                    onChange={(e) => updateTemplate({ image_position: e.target.value })}
                    className="input w-full"
                  >
                    {IMAGE_POSITIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                
                {/* Image Opacity */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Image Opacity: {Math.round(template.image_opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    value={template.image_opacity}
                    onChange={(e) => updateTemplate({ image_opacity: Number(e.target.value) })}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                </div>
                
                {/* Two-Photo Stack Image Sizing */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-700)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-200)' }}>Image Stack Layout</span>
                  </div>
                  
                  {/* Top Image Height */}
                  <div className="mb-3">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-400)' }}>
                      Top Image Height: {template.top_image_height}%
                    </label>
                    <input
                      type="range"
                      value={template.top_image_height}
                      onChange={(e) => {
                        const topHeight = Number(e.target.value);
                        updateTemplate({ 
                          top_image_height: topHeight,
                          bottom_image_height: 100 - topHeight - (template.image_gap / template.height * 100)
                        });
                      }}
                      min={20}
                      max={80}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Bottom Image Height */}
                  <div className="mb-3">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-400)' }}>
                      Bottom Image Height: {template.bottom_image_height}%
                    </label>
                    <input
                      type="range"
                      value={template.bottom_image_height}
                      onChange={(e) => {
                        const bottomHeight = Number(e.target.value);
                        updateTemplate({ 
                          bottom_image_height: bottomHeight,
                          top_image_height: 100 - bottomHeight - (template.image_gap / template.height * 100)
                        });
                      }}
                      min={20}
                      max={80}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Image Gap */}
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-400)' }}>
                      Gap Between Images: {template.image_gap}px
                    </label>
                    <input
                      type="range"
                      value={template.image_gap}
                      onChange={(e) => updateTemplate({ image_gap: Number(e.target.value) })}
                      min={0}
                      max={100}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Quick presets */}
                  <div className="flex gap-2 mt-3">
                    <button
                      className="flex-1 py-1.5 text-xs rounded bg-white/5 hover:bg-white/10"
                      style={{ color: 'var(--text-300)' }}
                      onClick={() => updateTemplate({ top_image_height: 50, bottom_image_height: 50, image_gap: 0 })}
                    >
                      50/50
                    </button>
                    <button
                      className="flex-1 py-1.5 text-xs rounded bg-white/5 hover:bg-white/10"
                      style={{ color: 'var(--text-300)' }}
                      onClick={() => updateTemplate({ top_image_height: 60, bottom_image_height: 40, image_gap: 0 })}
                    >
                      60/40
                    </button>
                    <button
                      className="flex-1 py-1.5 text-xs rounded bg-white/5 hover:bg-white/10"
                      style={{ color: 'var(--text-300)' }}
                      onClick={() => updateTemplate({ top_image_height: 40, bottom_image_height: 60, image_gap: 0 })}
                    >
                      40/60
                    </button>
                    <button
                      className="flex-1 py-1.5 text-xs rounded bg-white/5 hover:bg-white/10"
                      style={{ color: 'var(--text-300)' }}
                      onClick={() => updateTemplate({ top_image_height: 47, bottom_image_height: 47, image_gap: 20 })}
                    >
                      With Gap
                    </button>
                  </div>
                </div>
                
                {/* Background Color (for areas without image) */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Background Color
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COLOR_PRESETS.slice(0, 10).map(color => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          template.background_color === color ? 'border-primary-400 ring-2 ring-primary-400/50' : 'border-transparent'
                        }`}
                        style={{ background: color }}
                        onClick={() => updateTemplate({ background_color: color })}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={template.background_color}
                      onChange={(e) => updateTemplate({ background_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={template.background_color}
                      onChange={(e) => updateTemplate({ background_color: e.target.value })}
                      className="input flex-1"
                    />
                  </div>
                </div>
                
                {/* Image Overlay */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-700)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-medium block" style={{ color: 'var(--text-200)' }}>Image Overlay</span>
                      <span className="text-xs" style={{ color: 'var(--text-500)' }}>Darken image for readability</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.image_overlay_enabled}
                        onChange={(e) => updateTemplate({ image_overlay_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-600 peer-checked:bg-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                  {template.image_overlay_enabled && (
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-400)' }}>Overlay Color (rgba)</label>
                      <input
                        type="text"
                        value={template.image_overlay_color}
                        onChange={(e) => updateTemplate({ image_overlay_color: e.target.value })}
                        className="input w-full"
                        placeholder="rgba(0,0,0,0.3)"
                      />
                      <div className="flex gap-1 mt-2">
                        {['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(255,255,255,0.3)'].map(c => (
                          <button
                            key={c}
                            className="flex-1 py-1 text-xs rounded bg-white/5 hover:bg-white/10"
                            style={{ color: 'var(--text-400)' }}
                            onClick={() => updateTemplate({ image_overlay_color: c })}
                          >
                            {c.includes('255') ? 'Light' : c.includes('0.2') ? '20%' : c.includes('0.4') ? '40%' : '60%'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* LAYOUT TAB */}
            {activeTab === 'layout' && (
              <>
                {/* Size Presets */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Pin Size Presets
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {SIZE_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        className={`p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                          template.width === preset.width && template.height === preset.height
                            ? 'bg-primary-500/20 border border-primary-500'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                        onClick={() => applySizePreset(preset)}
                      >
                        <preset.icon className="w-5 h-5" style={{ color: 'var(--text-300)' }} />
                        <div>
                          <span className="block text-sm font-medium" style={{ color: 'var(--text-100)' }}>
                            {preset.name}
                          </span>
                          <span className="block text-xs" style={{ color: 'var(--text-500)' }}>
                            {preset.width} × {preset.height}px
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Custom Size */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Custom Size
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs" style={{ color: 'var(--text-500)' }}>Width</span>
                      <input
                        type="number"
                        value={template.width}
                        onChange={(e) => updateTemplate({ width: Number(e.target.value) })}
                        className="input w-full mt-1"
                        min={100}
                        max={3000}
                      />
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: 'var(--text-500)' }}>Height</span>
                      <input
                        type="number"
                        value={template.height}
                        onChange={(e) => updateTemplate({ height: Number(e.target.value) })}
                        className="input w-full mt-1"
                        min={100}
                        max={4000}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Quick Presets */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Style Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {LAYOUT_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        className="p-3 rounded-lg text-left transition-colors hover:bg-white/10"
                        style={{ background: 'var(--bg-700)' }}
                        onClick={() => applyPreset(preset)}
                      >
                        <span className="block text-sm font-medium" style={{ color: 'var(--text-100)' }}>
                          {preset.name}
                        </span>
                        <span className="block text-xs mt-1" style={{ color: 'var(--text-500)' }}>
                          {preset.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Text Bar */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-700)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-200)' }}>Text Bar</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.text_bar_enabled}
                        onChange={(e) => updateTemplate({ text_bar_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-600 peer-checked:bg-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                  
                  {template.text_bar_enabled && (
                    <div className="space-y-3">
                      {/* Position */}
                      <div>
                        <span className="block text-xs mb-2" style={{ color: 'var(--text-400)' }}>Position</span>
                        <div className="flex gap-1">
                          {['top', 'center', 'bottom'].map(pos => (
                            <button
                              key={pos}
                              className={`flex-1 py-2 rounded text-xs capitalize transition-colors ${
                                template.text_bar_position === pos
                                  ? 'bg-primary-500 text-white'
                                  : 'bg-white/5 hover:bg-white/10'
                              }`}
                              style={{ color: template.text_bar_position === pos ? 'white' : 'var(--text-300)' }}
                              onClick={() => updateTemplate({ text_bar_position: pos })}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Height */}
                      <div>
                        <span className="block text-xs mb-2" style={{ color: 'var(--text-400)' }}>
                          Height: {template.text_bar_height}px
                        </span>
                        <input
                          type="range"
                          value={template.text_bar_height}
                          onChange={(e) => updateTemplate({ text_bar_height: Number(e.target.value) })}
                          min={100}
                          max={800}
                          step={10}
                          className="w-full"
                        />
                      </div>
                      
                      {/* Bar Color */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-400)' }}>Bar Color</span>
                        <input
                          type="color"
                          value={template.text_bar_color}
                          onChange={(e) => updateTemplate({ text_bar_color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer ml-auto border-0"
                        />
                      </div>
                      
                      {/* Bar Opacity */}
                      <div>
                        <span className="block text-xs mb-2" style={{ color: 'var(--text-400)' }}>
                          Opacity: {Math.round(template.text_bar_opacity * 100)}%
                        </span>
                        <input
                          type="range"
                          value={template.text_bar_opacity}
                          onChange={(e) => updateTemplate({ text_bar_opacity: Number(e.target.value) })}
                          min={0}
                          max={1}
                          step={0.05}
                          className="w-full"
                        />
                      </div>
                      
                      {/* Bar Stroke */}
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs" style={{ color: 'var(--text-400)' }}>Stroke (Border)</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={template.text_bar_stroke_enabled || false}
                              onChange={(e) => updateTemplate({ text_bar_stroke_enabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-gray-600 peer-checked:bg-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                          </label>
                        </div>
                        {template.text_bar_stroke_enabled && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs" style={{ color: 'var(--text-400)' }}>Color</span>
                              <input
                                type="color"
                                value={template.text_bar_stroke_color || '#000000'}
                                onChange={(e) => updateTemplate({ text_bar_stroke_color: e.target.value })}
                                className="w-8 h-8 rounded cursor-pointer ml-auto border-0"
                              />
                            </div>
                            <div>
                              <span className="block text-xs mb-1" style={{ color: 'var(--text-400)' }}>
                                Width: {template.text_bar_stroke_width || 2}px
                              </span>
                              <input
                                type="range"
                                value={template.text_bar_stroke_width || 2}
                                onChange={(e) => updateTemplate({ text_bar_stroke_width: Number(e.target.value) })}
                                min={1}
                                max={10}
                                step={1}
                                className="w-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* EXTRAS TAB (Badge, Subtitle, Website) */}
            {activeTab === 'badge' && (
              <>
                {/* Badge */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-700)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-200)' }}>Badge</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.badge_enabled}
                        onChange={(e) => updateTemplate({ badge_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-600 peer-checked:bg-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                  
                  {template.badge_enabled && (
                    <div className="space-y-3">
                      {/* Badge Text */}
                      <div>
                        <span className="block text-xs mb-1" style={{ color: 'var(--text-400)' }}>Badge Text</span>
                        <input
                          type="text"
                          value={template.badge_text}
                          onChange={(e) => updateTemplate({ badge_text: e.target.value })}
                          className="input w-full"
                          placeholder="RECIPE"
                        />
                      </div>
                      
                      {/* Position */}
                      <div>
                        <span className="block text-xs mb-2" style={{ color: 'var(--text-400)' }}>Position</span>
                        <div className="grid grid-cols-2 gap-1">
                          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                            <button
                              key={pos}
                              className={`py-2 rounded text-xs transition-colors ${
                                template.badge_position === pos
                                  ? 'bg-primary-500 text-white'
                                  : 'bg-white/5 hover:bg-white/10'
                              }`}
                              style={{ color: template.badge_position === pos ? 'white' : 'var(--text-300)' }}
                              onClick={() => updateTemplate({ badge_position: pos })}
                            >
                              {pos.replace('-', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Colors */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-400)' }}>Background</span>
                        <input
                          type="color"
                          value={template.badge_background}
                          onChange={(e) => updateTemplate({ badge_background: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer ml-auto border-0"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-400)' }}>Text Color</span>
                        <input
                          type="color"
                          value={template.badge_color}
                          onChange={(e) => updateTemplate({ badge_color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer ml-auto border-0"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Subtitle */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-700)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-200)' }}>Subtitle</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.subtitle_enabled}
                        onChange={(e) => updateTemplate({ subtitle_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-600 peer-checked:bg-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                  
                  {template.subtitle_enabled && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={template.subtitle_text}
                        onChange={(e) => updateTemplate({ subtitle_text: e.target.value })}
                        className="input w-full"
                        placeholder="EASY | DELICIOUS | THE BEST"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs" style={{ color: 'var(--text-500)' }}>Font</span>
                          <select
                            value={template.subtitle_font}
                            onChange={(e) => updateTemplate({ subtitle_font: e.target.value })}
                            className="input w-full mt-1"
                          >
                            {FONT_OPTIONS.map(font => (
                              <option key={font.value} value={font.value}>{font.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="text-xs" style={{ color: 'var(--text-500)' }}>Size</span>
                          <input
                            type="number"
                            value={template.subtitle_size}
                            onChange={(e) => updateTemplate({ subtitle_size: Number(e.target.value) })}
                            className="input w-full mt-1"
                            min={10}
                            max={60}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-400)' }}>Color</span>
                        <input
                          type="color"
                          value={template.subtitle_color}
                          onChange={(e) => updateTemplate({ subtitle_color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer ml-auto border-0"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Website */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-700)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-200)' }}>Website Branding</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.website_enabled}
                        onChange={(e) => updateTemplate({ website_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-600 peer-checked:bg-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                  
                  {template.website_enabled && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={template.website_text}
                        onChange={(e) => updateTemplate({ website_text: e.target.value })}
                        className="input w-full"
                        placeholder="yoursite.com"
                      />
                      <div className="flex gap-1">
                        {['top', 'bottom'].map(pos => (
                          <button
                            key={pos}
                            className={`flex-1 py-2 rounded text-xs capitalize transition-colors ${
                              template.website_position === pos
                                ? 'bg-primary-500 text-white'
                                : 'bg-white/5 hover:bg-white/10'
                            }`}
                            style={{ color: template.website_position === pos ? 'white' : 'var(--text-300)' }}
                            onClick={() => updateTemplate({ website_position: pos })}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-400)' }}>Color</span>
                        <input
                          type="color"
                          value={template.website_color}
                          onChange={(e) => updateTemplate({ website_color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer ml-auto border-0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Center - Live Preview */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto" style={{ background: 'var(--bg-900)' }}>
          <div className="text-center">
            {/* Preview Canvas */}
            <div 
              ref={previewRef}
              className="relative shadow-2xl rounded-lg overflow-hidden mx-auto"
              style={{ 
                width: template.width * previewScale,
                height: template.height * previewScale,
                background: template.background_color,
              }}
            >
              {/* Two-photo stack layout preview */}
              {(template.layout === 'text-bar' || template.layout === 'two-photo-stack') ? (
                <>
                  {(() => {
                    const totalHeight = template.height * previewScale;
                    const textBarHeight = template.text_bar_enabled ? (template.text_bar_height * previewScale) : 0;
                    const availableHeight = totalHeight - textBarHeight;
                    const imageGap = (template.image_gap || 0) * previewScale;
                    
                    const topPct = template.top_image_height || 50;
                    const bottomPct = template.bottom_image_height || 50;
                    const topHeight = availableHeight * (topPct / 100);
                    const bottomHeight = availableHeight * (bottomPct / 100);
                    
                    let topY = 0, textBarY = 0, bottomY = 0;
                    if (template.text_bar_position === 'top') {
                      textBarY = 0;
                      topY = textBarHeight;
                      bottomY = topY + topHeight + imageGap;
                    } else if (template.text_bar_position === 'bottom') {
                      topY = 0;
                      bottomY = topHeight + imageGap;
                      textBarY = totalHeight - textBarHeight;
                    } else {
                      topY = 0;
                      textBarY = topHeight;
                      bottomY = topHeight + textBarHeight;
                    }
                    
                    return (
                      <>
                        {/* Top Image */}
                        <div 
                          className="absolute left-0 right-0"
                          style={{
                            top: topY,
                            height: topHeight,
                            backgroundImage: 'url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: template.image_opacity,
                          }}
                        />
                        {template.image_overlay_enabled && (
                          <div 
                            className="absolute left-0 right-0"
                            style={{ top: topY, height: topHeight, background: template.image_overlay_color }}
                          />
                        )}
                        {imageGap > 0 && template.text_bar_position !== 'center' && (
                          <div 
                            className="absolute left-0 right-0"
                            style={{
                              top: template.text_bar_position === 'top' ? topY + topHeight : topHeight,
                              height: imageGap,
                              background: template.background_color,
                            }}
                          />
                        )}
                        {/* Bottom Image */}
                        <div 
                          className="absolute left-0 right-0"
                          style={{
                            top: bottomY,
                            height: bottomHeight,
                            backgroundImage: 'url(https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: template.image_opacity,
                          }}
                        />
                        {template.image_overlay_enabled && (
                          <div 
                            className="absolute left-0 right-0"
                            style={{ top: bottomY, height: bottomHeight, background: template.image_overlay_color }}
                          />
                        )}
                      </>
                    );
                  })()}
                </>
              ) : (
                <>
                  <div 
                    className="absolute inset-0"
                    style={{
                      backgroundImage: 'url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800)',
                      backgroundSize: template.image_position === 'contain' ? 'contain' : 'cover',
                      backgroundPosition: template.image_position === 'top' ? 'top' : template.image_position === 'bottom' ? 'bottom' : 'center',
                      backgroundRepeat: 'no-repeat',
                      opacity: template.image_opacity,
                    }}
                  />
                  {template.image_overlay_enabled && (
                    <div 
                      className="absolute inset-0"
                      style={{ background: template.image_overlay_color }}
                    />
                  )}
                </>
              )}
              
              {/* Text Bar */}
              {template.text_bar_enabled && (
                <div style={getTextBarStyle()} />
              )}
              
              {/* Title Container */}
              <div style={getTitleContainerStyle()}>
                <div style={getTitleStyle()}>
                  {previewTitle}
                </div>
              </div>
              
              {/* Subtitle */}
              {template.subtitle_enabled && template.subtitle_text && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: template.text_bar_enabled && template.text_bar_position === 'bottom' 
                      ? `${(template.text_bar_height * previewScale) - 50}px` 
                      : `${20 * previewScale}px`,
                    textAlign: 'center',
                    fontFamily: `"${template.subtitle_font}", sans-serif`,
                    fontSize: `${template.subtitle_size * previewScale}px`,
                    fontWeight: template.subtitle_weight,
                    color: template.subtitle_color,
                    letterSpacing: '0.1em',
                  }}
                >
                  {template.subtitle_text}
                </div>
              )}
              
              {/* Badge */}
              {template.badge_enabled && template.badge_text && (
                <div style={getBadgeStyle()}>
                  {template.badge_text}
                </div>
              )}
              
              {/* Website */}
              {template.website_enabled && template.website_text && (
                <div style={getWebsiteStyle()}>
                  {template.website_text}
                </div>
              )}
            </div>
            
            {/* Size indicator */}
            <p className="mt-4 text-xs" style={{ color: 'var(--text-500)' }}>
              {template.width} × {template.height}px (preview at {Math.round(previewScale * 100)}%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateEditorPage;
