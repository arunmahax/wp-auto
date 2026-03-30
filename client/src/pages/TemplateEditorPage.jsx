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
  ArrowDown
} from 'lucide-react';
import * as templateApi from '../api/templates';

// Popular Google Fonts for Pinterest
const FONT_OPTIONS = [
  { value: 'Montserrat', label: 'Montserrat', category: 'sans-serif' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'serif' },
  { value: 'Oswald', label: 'Oswald', category: 'sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'sans-serif' },
  { value: 'Raleway', label: 'Raleway', category: 'sans-serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'serif' },
  { value: 'Bebas Neue', label: 'Bebas Neue', category: 'display' },
  { value: 'Anton', label: 'Anton', category: 'display' },
  { value: 'Pacifico', label: 'Pacifico', category: 'handwriting' },
  { value: 'Dancing Script', label: 'Dancing Script', category: 'handwriting' },
  { value: 'Abril Fatface', label: 'Abril Fatface', category: 'display' },
  { value: 'Lobster', label: 'Lobster', category: 'display' },
  { value: 'Permanent Marker', label: 'Permanent Marker', category: 'handwriting' },
  { value: 'Righteous', label: 'Righteous', category: 'display' },
  { value: 'Archivo Black', label: 'Archivo Black', category: 'sans-serif' },
  { value: 'Alfa Slab One', label: 'Alfa Slab One', category: 'display' },
  { value: 'Satisfy', label: 'Satisfy', category: 'handwriting' },
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
      text_bar_height: 40,
      text_bar_color: '#ffffff',
      title_color: '#1a1a2e',
      title_font_family: 'Montserrat',
      title_font_size: 48,
      title_font_weight: 700,
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
      title_font_family: 'Oswald',
      title_font_size: 64,
      title_font_weight: 700,
      title_has_shadow: true,
    }
  },
  {
    id: 'minimal-white',
    name: 'Minimal White',
    description: 'Clean white background',
    config: {
      layout: 'minimal',
      background_color: '#ffffff',
      text_bar_enabled: false,
      title_color: '#1a1a2e',
      title_font_family: 'Playfair Display',
      title_font_size: 56,
      title_font_weight: 700,
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
      text_bar_height: 35,
      badge_enabled: true,
      badge_text: 'RECIPE',
      badge_position: 'top-left',
      badge_background: '#e63946',
      title_font_family: 'Bebas Neue',
    }
  },
];

// Color presets
const COLOR_PRESETS = [
  '#ffffff', '#000000', '#1a1a2e', '#e63946', '#f4a261',
  '#2a9d8f', '#264653', '#e9c46a', '#f72585', '#7209b7',
];

function TemplateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const previewRef = useRef(null);
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('text'); // text, background, layout, badge
  
  // Template state
  const [template, setTemplate] = useState({
    name: 'Untitled Template',
    description: '',
    layout: 'text-bar',
    width: 1000,
    height: 1500,
    background_color: '#1a1a2e',
    background_image: null,
    text_bar_enabled: true,
    text_bar_position: 'bottom',
    text_bar_height: 40,
    text_bar_color: '#ffffff',
    text_bar_opacity: 100,
    title_font_family: 'Montserrat',
    title_font_size: 48,
    title_font_weight: 700,
    title_color: '#1a1a2e',
    title_alignment: 'center',
    title_line_height: 1.2,
    title_max_width: 90,
    title_has_outline: false,
    title_outline_color: '#ffffff',
    title_outline_width: 3,
    title_has_shadow: false,
    title_shadow_color: 'rgba(0,0,0,0.5)',
    title_shadow_blur: 4,
    subtitle_enabled: false,
    subtitle_text: '',
    subtitle_font_family: 'Open Sans',
    subtitle_font_size: 18,
    subtitle_color: '#666666',
    website_enabled: false,
    website_text: '',
    website_position: 'bottom',
    website_font_size: 14,
    website_color: '#ffffff',
    badge_enabled: false,
    badge_text: 'NEW',
    badge_position: 'top-left',
    badge_background: '#e63946',
    badge_color: '#ffffff',
    image_overlay_enabled: true,
    image_overlay_color: 'rgba(0,0,0,0.2)',
  });
  
  // Sample text for preview
  const [previewTitle, setPreviewTitle] = useState('Easy Chicken Recipe');
  
  // Load template if editing
  useEffect(() => {
    if (!isNew) {
      loadTemplate();
    }
    // Load Google Fonts
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${FONT_OPTIONS.map(f => f.value.replace(' ', '+')).join('&family=')}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, [id]);
  
  const loadTemplate = async () => {
    try {
      setLoading(true);
      const data = await templateApi.getTemplate(id);
      setTemplate(data);
    } catch (err) {
      alert('Failed to load template');
      navigate('/templates');
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
  
  const handleSave = async () => {
    try {
      setSaving(true);
      if (isNew) {
        const created = await templateApi.createTemplate(template);
        navigate(`/templates/${created.id}/edit`, { replace: true });
      } else {
        await templateApi.updateTemplate(id, template);
      }
    } catch (err) {
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-400)' }} />
      </div>
    );
  }
  
  // Calculate preview styles
  const getTextBarStyle = () => {
    if (!template.text_bar_enabled) return {};
    const height = `${template.text_bar_height}%`;
    const position = template.text_bar_position;
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      height,
      background: template.text_bar_color,
      opacity: template.text_bar_opacity / 100,
      ...(position === 'top' ? { top: 0 } : position === 'bottom' ? { bottom: 0 } : { top: '50%', transform: 'translateY(-50%)' })
    };
  };
  
  const getTitleStyle = () => {
    const style = {
      fontFamily: `"${template.title_font_family}", sans-serif`,
      fontSize: `${template.title_font_size / 3}px`,
      fontWeight: template.title_font_weight,
      color: template.title_color,
      textAlign: template.title_alignment,
      lineHeight: template.title_line_height,
      maxWidth: `${template.title_max_width}%`,
      margin: '0 auto',
      textTransform: 'uppercase',
      letterSpacing: '0.02em',
    };
    
    if (template.title_has_outline) {
      style.WebkitTextStroke = `${template.title_outline_width / 2}px ${template.title_outline_color}`;
      style.paintOrder = 'stroke fill';
    }
    
    if (template.title_has_shadow) {
      style.textShadow = `${template.title_shadow_blur / 2}px ${template.title_shadow_blur / 2}px ${template.title_shadow_blur}px ${template.title_shadow_color}`;
    }
    
    return style;
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
            className="bg-transparent border-0 text-lg font-semibold focus:outline-none"
            style={{ color: 'var(--text-100)' }}
            placeholder="Template Name"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className="btn btn-primary flex items-center gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
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
              { id: 'background', icon: Palette, label: 'Background' },
              { id: 'layout', icon: Layout, label: 'Layout' },
              { id: 'badge', icon: Sparkles, label: 'Badge' },
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
                    Font Family
                  </label>
                  <select
                    value={template.title_font_family}
                    onChange={(e) => updateTemplate({ title_font_family: e.target.value })}
                    className="input w-full"
                    style={{ fontFamily: template.title_font_family }}
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
                    Font Size: {template.title_font_size}px
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => updateTemplate({ title_font_size: Math.max(16, template.title_font_size - 4) })}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      value={template.title_font_size}
                      onChange={(e) => updateTemplate({ title_font_size: Number(e.target.value) })}
                      min={16}
                      max={120}
                      className="flex-1"
                    />
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => updateTemplate({ title_font_size: Math.min(120, template.title_font_size + 4) })}
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
                  <div className="grid grid-cols-4 gap-1">
                    {[400, 500, 600, 700, 800, 900].map(weight => (
                      <button
                        key={weight}
                        className={`py-2 rounded text-xs transition-colors ${
                          template.title_font_weight === weight 
                            ? 'bg-primary-500 text-white' 
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                        style={{ color: template.title_font_weight === weight ? 'white' : 'var(--text-300)' }}
                        onClick={() => updateTemplate({ title_font_weight: weight })}
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
                    {COLOR_PRESETS.map(color => (
                      <button
                        key={color}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                          template.title_color === color ? 'border-primary-400' : 'border-transparent'
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
                      className="w-10 h-10 rounded cursor-pointer"
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
                
                {/* Stroke / Outline */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-700)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-200)' }}>Text Stroke</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.title_has_outline}
                        onChange={(e) => updateTemplate({ title_has_outline: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-600 peer-checked:bg-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                  
                  {template.title_has_outline && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-16" style={{ color: 'var(--text-400)' }}>Color</span>
                        <input
                          type="color"
                          value={template.title_outline_color}
                          onChange={(e) => updateTemplate({ title_outline_color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer"
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
                        checked={template.title_has_shadow}
                        onChange={(e) => updateTemplate({ title_has_shadow: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-600 peer-checked:bg-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                  
                  {template.title_has_shadow && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-16" style={{ color: 'var(--text-400)' }}>Blur</span>
                      <input
                        type="range"
                        value={template.title_shadow_blur}
                        onChange={(e) => updateTemplate({ title_shadow_blur: Number(e.target.value) })}
                        min={0}
                        max={20}
                        className="flex-1"
                      />
                      <span className="text-xs w-8" style={{ color: 'var(--text-300)' }}>{template.title_shadow_blur}px</span>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* BACKGROUND TAB */}
            {activeTab === 'background' && (
              <>
                {/* Background Color */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Background Color
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COLOR_PRESETS.map(color => (
                      <button
                        key={color}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                          template.background_color === color ? 'border-primary-400' : 'border-transparent'
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
                      className="w-10 h-10 rounded cursor-pointer"
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
                    <span className="text-sm font-medium" style={{ color: 'var(--text-200)' }}>Image Overlay</span>
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
                  <p className="text-xs mb-2" style={{ color: 'var(--text-500)' }}>
                    Darken the image for better text readability
                  </p>
                  {template.image_overlay_enabled && (
                    <input
                      type="text"
                      value={template.image_overlay_color}
                      onChange={(e) => updateTemplate({ image_overlay_color: e.target.value })}
                      className="input w-full"
                      placeholder="rgba(0,0,0,0.3)"
                    />
                  )}
                </div>
              </>
            )}
            
            {/* LAYOUT TAB */}
            {activeTab === 'layout' && (
              <>
                {/* Presets */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Quick Presets
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
                          Height: {template.text_bar_height}%
                        </span>
                        <input
                          type="range"
                          value={template.text_bar_height}
                          onChange={(e) => updateTemplate({ text_bar_height: Number(e.target.value) })}
                          min={15}
                          max={60}
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
                          className="w-8 h-8 rounded cursor-pointer ml-auto"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Pin Size */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-400)' }}>
                    Pin Size
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs" style={{ color: 'var(--text-500)' }}>Width</span>
                      <input
                        type="number"
                        value={template.width}
                        onChange={(e) => updateTemplate({ width: Number(e.target.value) })}
                        className="input w-full mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: 'var(--text-500)' }}>Height</span>
                      <input
                        type="number"
                        value={template.height}
                        onChange={(e) => updateTemplate({ height: Number(e.target.value) })}
                        className="input w-full mt-1"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* BADGE TAB */}
            {activeTab === 'badge' && (
              <>
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-700)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-200)' }}>Show Badge</span>
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
                          className="w-8 h-8 rounded cursor-pointer ml-auto"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-400)' }}>Text Color</span>
                        <input
                          type="color"
                          value={template.badge_color}
                          onChange={(e) => updateTemplate({ badge_color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer ml-auto"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Website */}
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-700)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-200)' }}>Website URL</span>
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
                width: Math.min(350, template.width / 2.8),
                height: Math.min(350, template.width / 2.8) * (template.height / template.width),
                background: template.background_color,
              }}
            >
              {/* Sample Image Area */}
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  opacity: 0.1
                }}
              />
              
              {/* Image Overlay */}
              {template.image_overlay_enabled && (
                <div 
                  className="absolute inset-0"
                  style={{ background: template.image_overlay_color }}
                />
              )}
              
              {/* Text Bar */}
              {template.text_bar_enabled && (
                <div style={getTextBarStyle()} />
              )}
              
              {/* Title */}
              <div 
                className="absolute inset-0 flex items-center justify-center p-4"
                style={template.text_bar_enabled ? {
                  ...(template.text_bar_position === 'top' ? { top: 0, height: `${template.text_bar_height}%` } : {}),
                  ...(template.text_bar_position === 'bottom' ? { bottom: 0, top: 'auto', height: `${template.text_bar_height}%` } : {}),
                  ...(template.text_bar_position === 'center' ? { top: '50%', transform: 'translateY(-50%)', height: `${template.text_bar_height}%` } : {}),
                } : {}}
              >
                <div style={getTitleStyle()}>
                  {previewTitle}
                </div>
              </div>
              
              {/* Badge */}
              {template.badge_enabled && template.badge_text && (
                <div
                  className="absolute px-2 py-1 text-xs font-bold uppercase"
                  style={{
                    background: template.badge_background,
                    color: template.badge_color,
                    borderRadius: '4px',
                    top: template.badge_position.includes('top') ? '10px' : 'auto',
                    bottom: template.badge_position.includes('bottom') ? '10px' : 'auto',
                    left: template.badge_position.includes('left') ? '10px' : 'auto',
                    right: template.badge_position.includes('right') ? '10px' : 'auto',
                    fontSize: '10px',
                  }}
                >
                  {template.badge_text}
                </div>
              )}
              
              {/* Website */}
              {template.website_enabled && template.website_text && (
                <div
                  className="absolute left-0 right-0 text-center py-1 text-xs"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    color: template.website_color,
                    top: template.website_position === 'top' ? 0 : 'auto',
                    bottom: template.website_position === 'bottom' ? 0 : 'auto',
                    fontSize: '9px',
                  }}
                >
                  {template.website_text}
                </div>
              )}
            </div>
            
            {/* Size indicator */}
            <p className="mt-4 text-xs" style={{ color: 'var(--text-500)' }}>
              {template.width} × {template.height}px
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateEditorPage;
