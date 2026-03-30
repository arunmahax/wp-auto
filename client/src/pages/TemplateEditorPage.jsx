import { useState, useEffect, useCallback } from 'react';
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
  Square,
  Circle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Download,
  Undo,
  Redo
} from 'lucide-react';
import * as templateApi from '../api/templates';

// Collapsible Section Component
function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b" style={{ borderColor: 'var(--border)' }}>
      <button
        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Icon className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
        <span className="font-medium flex-1 text-left" style={{ color: 'var(--text-100)' }}>
          {title}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-400)' }} />
        ) : (
          <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-400)' }} />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// Form Field Components
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-300)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border-0"
        style={{ background: 'transparent' }}
      />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="input flex-1"
        placeholder="#000000"
      />
    </div>
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="input w-full"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function RangeInput({ value, onChange, min = 0, max = 100, step = 1, suffix = '' }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        value={value || 0}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <span className="text-xs w-12 text-right" style={{ color: 'var(--text-400)' }}>
        {value}{suffix}
      </span>
    </div>
  );
}

function TemplateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fonts, setFonts] = useState([]);
  const [layouts, setLayouts] = useState([]);
  
  // Template state
  const [template, setTemplate] = useState({
    name: 'Untitled Template',
    description: '',
    layout: 'text-bar',
    width: 1000,
    height: 1500,
    background_color: '#1a1a2e',
    background_gradient: null,
    background_image: null,
    text_bar_enabled: true,
    text_bar_position: 'bottom',
    text_bar_height: 45,
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
    title_outline_color: '#000000',
    title_outline_width: 2,
    title_has_shadow: false,
    title_shadow_color: 'rgba(0,0,0,0.5)',
    title_shadow_blur: 4,
    title_shadow_offset_x: 2,
    title_shadow_offset_y: 2,
    subtitle_enabled: false,
    subtitle_text: '',
    subtitle_font_family: 'Open Sans',
    subtitle_font_size: 18,
    subtitle_color: '#666666',
    website_enabled: false,
    website_text: '',
    website_position: 'top',
    website_font_family: 'Open Sans',
    website_font_size: 14,
    website_color: '#ffffff',
    website_background: 'rgba(0,0,0,0.3)',
    badge_enabled: false,
    badge_text: '',
    badge_position: 'top-left',
    badge_font_family: 'Montserrat',
    badge_font_size: 14,
    badge_color: '#ffffff',
    badge_background: '#e63946',
    badge_shape: 'rectangle',
    image_overlay_color: 'rgba(0,0,0,0.2)',
    image_overlay_enabled: true,
    decorations: null
  });
  
  // Load fonts and layouts on mount
  useEffect(() => {
    loadResources();
  }, []);
  
  // Load template if editing
  useEffect(() => {
    if (!isNew) {
      loadTemplate();
    }
  }, [id]);
  
  const loadResources = async () => {
    try {
      const [fontsData, layoutsData] = await Promise.all([
        templateApi.getFonts(),
        templateApi.getLayouts()
      ]);
      setFonts(fontsData);
      setLayouts(layoutsData);
    } catch (err) {
      console.error('Failed to load resources:', err);
    }
  };
  
  const loadTemplate = async () => {
    try {
      setLoading(true);
      const data = await templateApi.getTemplate(id);
      setTemplate(data);
      if (data.preview_image) {
        setPreviewUrl(data.preview_image);
      }
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
  
  const generatePreview = async () => {
    try {
      setGenerating(true);
      const result = await templateApi.generatePreview({
        templateConfig: template,
        title: 'Sample Recipe Title That Wraps',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'
      });
      setPreviewUrl(result.imageUrl);
    } catch (err) {
      alert('Failed to generate preview');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };
  
  // Font options
  const fontOptions = fonts.map(f => ({ value: f.family, label: f.family }));
  
  // Layout options
  const layoutOptions = layouts.map(l => ({ value: l.id, label: l.name }));
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-400)' }} />
      </div>
    );
  }
  
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
            className="bg-transparent border-0 text-lg font-semibold focus:outline-none focus:ring-0"
            style={{ color: 'var(--text-100)' }}
            placeholder="Template Name"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost flex items-center gap-2"
            onClick={generatePreview}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            Preview
          </button>
          
          <button
            className="btn btn-primary flex items-center gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Settings */}
        <div 
          className="w-80 overflow-y-auto border-r"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-800)' }}
        >
          {/* Layout Section */}
          <Section title="Layout" icon={Layout}>
            <Field label="Template Layout">
              <SelectInput
                value={template.layout}
                onChange={(v) => updateTemplate({ layout: v })}
                options={layoutOptions.length ? layoutOptions : [
                  { value: 'text-bar', label: 'Text Bar' },
                  { value: 'two-photo-stack', label: 'Two Photo Stack' },
                  { value: 'badge-style', label: 'Badge Style' },
                  { value: 'full-background', label: 'Full Background' },
                  { value: 'minimal', label: 'Minimal' }
                ]}
              />
            </Field>
            
            <Field label="Dimensions">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={template.width}
                  onChange={(e) => updateTemplate({ width: Number(e.target.value) })}
                  className="input w-full"
                  placeholder="Width"
                />
                <span className="text-lg" style={{ color: 'var(--text-400)' }}>×</span>
                <input
                  type="number"
                  value={template.height}
                  onChange={(e) => updateTemplate({ height: Number(e.target.value) })}
                  className="input w-full"
                  placeholder="Height"
                />
              </div>
            </Field>
          </Section>
          
          {/* Background Section */}
          <Section title="Background" icon={Palette}>
            <Field label="Background Color">
              <ColorInput
                value={template.background_color}
                onChange={(v) => updateTemplate({ background_color: v })}
              />
            </Field>
            
            <Field label="Background Image URL">
              <input
                type="text"
                value={template.background_image || ''}
                onChange={(e) => updateTemplate({ background_image: e.target.value })}
                className="input w-full"
                placeholder="https://..."
              />
            </Field>
            
            <Field label="Image Overlay">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={template.image_overlay_enabled}
                  onChange={(e) => updateTemplate({ image_overlay_enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm" style={{ color: 'var(--text-300)' }}>Enable overlay</span>
              </div>
              {template.image_overlay_enabled && (
                <input
                  type="text"
                  value={template.image_overlay_color || ''}
                  onChange={(e) => updateTemplate({ image_overlay_color: e.target.value })}
                  className="input w-full"
                  placeholder="rgba(0,0,0,0.3)"
                />
              )}
            </Field>
          </Section>
          
          {/* Text Bar Section */}
          <Section title="Text Bar" icon={Square}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={template.text_bar_enabled}
                onChange={(e) => updateTemplate({ text_bar_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm" style={{ color: 'var(--text-300)' }}>Enable text bar</span>
            </div>
            
            {template.text_bar_enabled && (
              <>
                <Field label="Position">
                  <SelectInput
                    value={template.text_bar_position}
                    onChange={(v) => updateTemplate({ text_bar_position: v })}
                    options={[
                      { value: 'top', label: 'Top' },
                      { value: 'bottom', label: 'Bottom' },
                      { value: 'center', label: 'Center' }
                    ]}
                  />
                </Field>
                
                <Field label="Height (%)">
                  <RangeInput
                    value={template.text_bar_height}
                    onChange={(v) => updateTemplate({ text_bar_height: v })}
                    min={10}
                    max={80}
                    suffix="%"
                  />
                </Field>
                
                <Field label="Bar Color">
                  <ColorInput
                    value={template.text_bar_color}
                    onChange={(v) => updateTemplate({ text_bar_color: v })}
                  />
                </Field>
                
                <Field label="Opacity">
                  <RangeInput
                    value={template.text_bar_opacity}
                    onChange={(v) => updateTemplate({ text_bar_opacity: v })}
                    suffix="%"
                  />
                </Field>
              </>
            )}
          </Section>
          
          {/* Title Section */}
          <Section title="Title" icon={Type}>
            <Field label="Font Family">
              <SelectInput
                value={template.title_font_family}
                onChange={(v) => updateTemplate({ title_font_family: v })}
                options={fontOptions.length ? fontOptions : [
                  { value: 'Montserrat', label: 'Montserrat' },
                  { value: 'Playfair Display', label: 'Playfair Display' },
                  { value: 'Roboto', label: 'Roboto' },
                  { value: 'Open Sans', label: 'Open Sans' }
                ]}
              />
            </Field>
            
            <Field label="Font Size">
              <RangeInput
                value={template.title_font_size}
                onChange={(v) => updateTemplate({ title_font_size: v })}
                min={16}
                max={120}
                suffix="px"
              />
            </Field>
            
            <Field label="Font Weight">
              <SelectInput
                value={template.title_font_weight}
                onChange={(v) => updateTemplate({ title_font_weight: Number(v) })}
                options={[
                  { value: 300, label: 'Light' },
                  { value: 400, label: 'Regular' },
                  { value: 500, label: 'Medium' },
                  { value: 600, label: 'Semi Bold' },
                  { value: 700, label: 'Bold' },
                  { value: 800, label: 'Extra Bold' },
                  { value: 900, label: 'Black' }
                ]}
              />
            </Field>
            
            <Field label="Color">
              <ColorInput
                value={template.title_color}
                onChange={(v) => updateTemplate({ title_color: v })}
              />
            </Field>
            
            <Field label="Alignment">
              <SelectInput
                value={template.title_alignment}
                onChange={(v) => updateTemplate({ title_alignment: v })}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Right' }
                ]}
              />
            </Field>
            
            <Field label="Max Width (%)">
              <RangeInput
                value={template.title_max_width}
                onChange={(v) => updateTemplate({ title_max_width: v })}
                min={50}
                max={100}
                suffix="%"
              />
            </Field>
            
            {/* Outline */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={template.title_has_outline}
                  onChange={(e) => updateTemplate({ title_has_outline: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm" style={{ color: 'var(--text-300)' }}>Text Outline</span>
              </div>
              {template.title_has_outline && (
                <div className="space-y-2 pl-6">
                  <ColorInput
                    value={template.title_outline_color}
                    onChange={(v) => updateTemplate({ title_outline_color: v })}
                  />
                  <RangeInput
                    value={template.title_outline_width}
                    onChange={(v) => updateTemplate({ title_outline_width: v })}
                    min={1}
                    max={10}
                    suffix="px"
                  />
                </div>
              )}
            </div>
            
            {/* Shadow */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={template.title_has_shadow}
                  onChange={(e) => updateTemplate({ title_has_shadow: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm" style={{ color: 'var(--text-300)' }}>Text Shadow</span>
              </div>
              {template.title_has_shadow && (
                <div className="space-y-2 pl-6">
                  <input
                    type="text"
                    value={template.title_shadow_color || ''}
                    onChange={(e) => updateTemplate({ title_shadow_color: e.target.value })}
                    className="input w-full"
                    placeholder="rgba(0,0,0,0.5)"
                  />
                  <RangeInput
                    value={template.title_shadow_blur}
                    onChange={(v) => updateTemplate({ title_shadow_blur: v })}
                    min={0}
                    max={20}
                    suffix="px"
                  />
                </div>
              )}
            </div>
          </Section>
          
          {/* Badge Section */}
          <Section title="Badge" icon={Sparkles} defaultOpen={false}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={template.badge_enabled}
                onChange={(e) => updateTemplate({ badge_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm" style={{ color: 'var(--text-300)' }}>Enable badge</span>
            </div>
            
            {template.badge_enabled && (
              <>
                <Field label="Badge Text">
                  <input
                    type="text"
                    value={template.badge_text || ''}
                    onChange={(e) => updateTemplate({ badge_text: e.target.value })}
                    className="input w-full"
                    placeholder="NEW RECIPE"
                  />
                </Field>
                
                <Field label="Position">
                  <SelectInput
                    value={template.badge_position}
                    onChange={(v) => updateTemplate({ badge_position: v })}
                    options={[
                      { value: 'top-left', label: 'Top Left' },
                      { value: 'top-right', label: 'Top Right' },
                      { value: 'bottom-left', label: 'Bottom Left' },
                      { value: 'bottom-right', label: 'Bottom Right' }
                    ]}
                  />
                </Field>
                
                <Field label="Background Color">
                  <ColorInput
                    value={template.badge_background}
                    onChange={(v) => updateTemplate({ badge_background: v })}
                  />
                </Field>
                
                <Field label="Text Color">
                  <ColorInput
                    value={template.badge_color}
                    onChange={(v) => updateTemplate({ badge_color: v })}
                  />
                </Field>
                
                <Field label="Shape">
                  <SelectInput
                    value={template.badge_shape}
                    onChange={(v) => updateTemplate({ badge_shape: v })}
                    options={[
                      { value: 'rectangle', label: 'Rectangle' },
                      { value: 'rounded', label: 'Rounded' },
                      { value: 'pill', label: 'Pill' },
                      { value: 'circle', label: 'Circle' }
                    ]}
                  />
                </Field>
              </>
            )}
          </Section>
          
          {/* Website Section */}
          <Section title="Website Branding" icon={Circle} defaultOpen={false}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={template.website_enabled}
                onChange={(e) => updateTemplate({ website_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm" style={{ color: 'var(--text-300)' }}>Show website</span>
            </div>
            
            {template.website_enabled && (
              <>
                <Field label="Website Text">
                  <input
                    type="text"
                    value={template.website_text || ''}
                    onChange={(e) => updateTemplate({ website_text: e.target.value })}
                    className="input w-full"
                    placeholder="yoursite.com"
                  />
                </Field>
                
                <Field label="Position">
                  <SelectInput
                    value={template.website_position}
                    onChange={(v) => updateTemplate({ website_position: v })}
                    options={[
                      { value: 'top', label: 'Top' },
                      { value: 'bottom', label: 'Bottom' }
                    ]}
                  />
                </Field>
                
                <Field label="Text Color">
                  <ColorInput
                    value={template.website_color}
                    onChange={(v) => updateTemplate({ website_color: v })}
                  />
                </Field>
                
                <Field label="Background">
                  <input
                    type="text"
                    value={template.website_background || ''}
                    onChange={(e) => updateTemplate({ website_background: e.target.value })}
                    className="input w-full"
                    placeholder="rgba(0,0,0,0.3)"
                  />
                </Field>
              </>
            )}
          </Section>
        </div>
        
        {/* Center - Preview */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <div 
            className="relative shadow-2xl rounded-lg overflow-hidden"
            style={{ 
              width: Math.min(400, template.width / 2.5),
              aspectRatio: `${template.width}/${template.height}`
            }}
          >
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              // CSS Preview (approximate)
              <div
                className="w-full h-full flex flex-col relative"
                style={{ background: template.background_color }}
              >
                {/* Simulated background image area */}
                <div 
                  className="flex-1 flex items-center justify-center"
                  style={{ 
                    background: template.background_image 
                      ? `url(${template.background_image}) center/cover` 
                      : 'linear-gradient(45deg, var(--bg-700) 25%, transparent 25%, transparent 75%, var(--bg-700) 75%)'
                  }}
                >
                  <ImageIcon 
                    className="w-12 h-12 opacity-30" 
                    style={{ color: 'var(--text-500)' }} 
                  />
                </div>
                
                {/* Text bar simulation */}
                {template.text_bar_enabled && (
                  <div
                    className="flex items-center justify-center p-4"
                    style={{ 
                      background: template.text_bar_color,
                      height: `${template.text_bar_height}%`,
                      opacity: template.text_bar_opacity / 100
                    }}
                  >
                    <span
                      style={{
                        fontFamily: template.title_font_family,
                        fontSize: `${template.title_font_size / 4}px`,
                        fontWeight: template.title_font_weight,
                        color: template.title_color,
                        textAlign: template.title_alignment
                      }}
                    >
                      Sample Title
                    </span>
                  </div>
                )}
                
                {/* Badge simulation */}
                {template.badge_enabled && template.badge_text && (
                  <div
                    className="absolute px-2 py-1 text-xs font-bold"
                    style={{
                      background: template.badge_background,
                      color: template.badge_color,
                      borderRadius: template.badge_shape === 'pill' ? '999px' : 
                                    template.badge_shape === 'rounded' ? '4px' : '0',
                      top: template.badge_position.includes('top') ? '8px' : 'auto',
                      bottom: template.badge_position.includes('bottom') ? '8px' : 'auto',
                      left: template.badge_position.includes('left') ? '8px' : 'auto',
                      right: template.badge_position.includes('right') ? '8px' : 'auto'
                    }}
                  >
                    {template.badge_text}
                  </div>
                )}
              </div>
            )}
            
            {/* Generate overlay */}
            {generating && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>
          
          {/* Preview hint */}
          {!previewUrl && (
            <div 
              className="absolute bottom-8 text-center"
              style={{ color: 'var(--text-500)' }}
            >
              <p className="text-sm">Click "Preview" to generate a full render</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplateEditorPage;
