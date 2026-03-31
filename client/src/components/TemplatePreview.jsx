import { useEffect, useRef, useState } from 'react';

/**
 * Reusable Template Preview Component
 * Renders a scaled-down preview of a pin template design
 * Used in: TemplatesPage cards, ProjectSettingsPage selector, TemplateEditorPage
 */

// Track which fonts have been loaded to avoid duplicate link tags
const loadedFonts = new Set();

function loadFontsForTemplate(tpl) {
  const fonts = new Set();
  if (tpl.title_font) fonts.add(tpl.title_font);
  if (tpl.pretitle_font) fonts.add(tpl.pretitle_font);
  if (tpl.subtitle_font) fonts.add(tpl.subtitle_font);
  if (tpl.website_font) fonts.add(tpl.website_font);
  if (tpl.badge_font) fonts.add(tpl.badge_font);
  
  const toLoad = [...fonts].filter(f => !loadedFonts.has(f));
  if (toLoad.length === 0) return;
  
  toLoad.forEach(f => loadedFonts.add(f));
  
  const existing = document.querySelector('link[data-template-preview-fonts]');
  if (existing) existing.remove();
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${[...loadedFonts].map(f => f.replace(/ /g, '+')).join('&family=')}&display=swap`;
  link.setAttribute('data-template-preview-fonts', 'true');
  document.head.appendChild(link);
}

export default function TemplatePreview({ template: tpl, containerWidth = 200, containerHeight = 300, showTitle = true, titleText = 'Easy Chicken Recipe', fillContainer = false }) {
  const fillRef = useRef(null);
  const [fillWidth, setFillWidth] = useState(0);

  useEffect(() => {
    if (tpl) loadFontsForTemplate(tpl);
  }, [tpl]);

  useEffect(() => {
    if (!fillContainer) return;
    const el = fillRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      if (w > 0) setFillWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fillContainer]);
  
  if (!tpl) return null;
  
  const width = tpl.width || 1000;
  const height = tpl.height || 1500;
  const scale = fillContainer
    ? (fillWidth || containerWidth) / width
    : Math.min(containerWidth / width, containerHeight / height);
  const pw = width * scale;
  const ph = height * scale;
  
  // Layout calculations — images fill FULL canvas, text bar overlays on top
  const textBarH = tpl.text_bar_enabled ? (tpl.text_bar_height || 200) * scale : 0;
  const gap = (tpl.image_gap || 0) * scale;
  const topPct = tpl.top_image_height || 50;
  const bottomPct = tpl.bottom_image_height || 50;
  const totalPct = topPct + bottomPct;
  const usableH = ph - gap;
  const topH = usableH * (topPct / totalPct);
  const bottomH = usableH - topH;
  
  // Images drawn contiguously (no gap for text bar)
  const topY = 0;
  const bottomY = topH + gap;
  
  // Text bar overlays at the appropriate position
  const pos = tpl.text_bar_position || 'center';
  let barY = 0;
  if (pos === 'top') {
    barY = 0;
  } else if (pos === 'bottom') {
    barY = ph - textBarH;
  } else {
    // Center: overlay at image split point
    const splitPoint = topH;
    barY = Math.max(0, Math.min(ph - textBarH, splitPoint - textBarH / 2));
  }
  
  const isStack = tpl.layout === 'text-bar' || tpl.layout === 'two-photo-stack';
  
  const topImgUrl = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600';
  const bottomImgUrl = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600';
  
  const titleFontSize = Math.max(8, (tpl.title_size || 64) * scale);
  
  const previewEl = (
    <div
      style={{
        position: 'relative',
        width: pw,
        height: ph,
        background: tpl.background_color || '#1a1a2e',
        overflow: 'hidden',
        borderRadius: 4 * scale,
        ...(!fillContainer ? { margin: '0 auto' } : {}),
      }}
    >
      {isStack ? (
        <>
          {/* Top Image */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: topY, height: topH,
            backgroundImage: `url(${topImgUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: tpl.image_opacity ?? 1,
          }} />
          {tpl.image_overlay_enabled && (
            <div style={{
              position: 'absolute', left: 0, right: 0,
              top: topY, height: topH,
              background: tpl.image_overlay_color || 'rgba(0,0,0,0.2)',
            }} />
          )}
          
          {/* Gap */}
          {gap > 0 && pos !== 'center' && (
            <div style={{
              position: 'absolute', left: 0, right: 0,
              top: pos === 'top' ? topY + topH : topH,
              height: gap,
              background: tpl.background_color || '#1a1a2e',
            }} />
          )}
          
          {/* Bottom Image */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: bottomY, height: bottomH,
            backgroundImage: `url(${bottomImgUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: tpl.image_opacity ?? 1,
          }} />
          {tpl.image_overlay_enabled && (
            <div style={{
              position: 'absolute', left: 0, right: 0,
              top: bottomY, height: bottomH,
              background: tpl.image_overlay_color || 'rgba(0,0,0,0.2)',
            }} />
          )}
        </>
      ) : (
        <>
          {/* Full background */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${topImgUrl})`,
            backgroundSize: tpl.image_position === 'contain' ? 'contain' : 'cover',
            backgroundPosition: tpl.image_position === 'top' ? 'top' : tpl.image_position === 'bottom' ? 'bottom' : 'center',
            backgroundRepeat: 'no-repeat',
            opacity: tpl.image_opacity ?? 1,
          }} />
          {tpl.image_overlay_enabled && (
            <div style={{
              position: 'absolute', inset: 0,
              background: tpl.image_overlay_color || 'rgba(0,0,0,0.3)',
            }} />
          )}
        </>
      )}
      
      {/* Text Bar Background (separate for independent opacity) */}
      {tpl.text_bar_enabled && (
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: barY, height: textBarH,
          background: tpl.text_bar_color || '#ffffff',
          opacity: tpl.text_bar_opacity ?? 1,
        }} />
      )}
      {/* Text Bar Stroke (separate for independent opacity) */}
      {tpl.text_bar_enabled && tpl.text_bar_stroke_enabled && (
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: barY, height: textBarH,
          borderTop: `${(tpl.text_bar_stroke_width || 2) * scale}px solid ${tpl.text_bar_stroke_color || '#000000'}`,
          borderBottom: `${(tpl.text_bar_stroke_width || 2) * scale}px solid ${tpl.text_bar_stroke_color || '#000000'}`,
          boxSizing: 'border-box',
          opacity: tpl.text_bar_stroke_opacity ?? 1,
        }} />
      )}
      
      {/* Title */}
      {showTitle && (
        <div style={{
          position: 'absolute', left: 0, right: 0,
          ...(tpl.text_bar_enabled
            ? { top: barY, height: textBarH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 8 * scale }
            : { inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12 * scale }
          ),
        }}>
          {/* Pre-title */}
          {tpl.pretitle_enabled && tpl.pretitle_text && (
            <span style={{
              fontFamily: `"${tpl.pretitle_font || 'Montserrat'}", sans-serif`,
              fontSize: Math.max(6, (tpl.pretitle_size || 28) * scale),
              fontWeight: tpl.pretitle_weight || 400,
              color: tpl.pretitle_color || '#666666',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 2 * scale,
            }}>
              {tpl.pretitle_text}
            </span>
          )}
          <span style={{
            fontFamily: `"${tpl.title_font || 'Montserrat'}", sans-serif`,
            fontSize: titleFontSize,
            fontWeight: tpl.title_weight || 700,
            color: tpl.title_color || '#1a1a2e',
            textAlign: tpl.title_alignment || 'center',
            lineHeight: tpl.title_line_height || 1.2,
            maxWidth: `${tpl.title_max_width || 90}%`,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            wordBreak: 'break-word',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            ...(tpl.title_outline_enabled ? {
              WebkitTextStroke: `${(tpl.title_outline_width || 3) * scale}px ${tpl.title_outline_color || '#ffffff'}`,
              paintOrder: 'stroke fill',
            } : {}),
            ...(tpl.title_shadow_enabled ? {
              textShadow: `${(tpl.title_shadow_blur || 4) * scale / 2}px ${(tpl.title_shadow_blur || 4) * scale / 2}px ${(tpl.title_shadow_blur || 4) * scale}px ${tpl.title_shadow_color || 'rgba(0,0,0,0.5)'}`,
            } : {}),
          }}>
            {titleText}
          </span>
        </div>
      )}
      
      {/* Subtitle */}
      {tpl.subtitle_enabled && tpl.subtitle_text && (
        <div style={{
          position: 'absolute', left: 0, right: 0,
          bottom: tpl.text_bar_enabled && pos === 'bottom'
            ? textBarH - 30 * scale
            : 12 * scale,
          textAlign: 'center',
          fontFamily: `"${tpl.subtitle_font || 'Montserrat'}", sans-serif`,
          fontSize: Math.max(6, (tpl.subtitle_size || 24) * scale),
          fontWeight: tpl.subtitle_weight || 400,
          color: tpl.subtitle_color || '#666666',
          letterSpacing: '0.1em',
        }}>
          {tpl.subtitle_text}
        </div>
      )}
      
      {/* Badge */}
      {tpl.badge_enabled && tpl.badge_text && (() => {
        const bp = tpl.badge_position || 'top-left';
        return (
          <div style={{
            position: 'absolute',
            padding: `${3 * scale}px ${8 * scale}px`,
            background: tpl.badge_background || '#e63946',
            color: tpl.badge_color || '#ffffff',
            fontFamily: `"${tpl.badge_font || 'Montserrat'}", sans-serif`,
            fontSize: Math.max(6, (tpl.badge_size || 24) * scale),
            fontWeight: 700,
            borderRadius: 3 * scale,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            top: bp.includes('top') ? 8 * scale : 'auto',
            bottom: bp.includes('bottom') ? 8 * scale : 'auto',
            left: bp.includes('left') ? 8 * scale : 'auto',
            right: bp.includes('right') ? 8 * scale : 'auto',
          }}>
            {tpl.badge_text}
          </div>
        );
      })()}
      
      {/* Website */}
      {tpl.website_enabled && tpl.website_text && (
        <div style={{
          position: 'absolute', left: 0, right: 0,
          textAlign: 'center',
          [tpl.website_position === 'top' ? 'top' : 'bottom']: 8 * scale,
          fontFamily: `"${tpl.website_font || 'Montserrat'}", sans-serif`,
          fontSize: Math.max(6, (tpl.website_size || 36) * scale),
          color: tpl.website_color || '#000000',
          ...(tpl.website_background ? {
            background: tpl.website_background,
            padding: `${2 * scale}px ${6 * scale}px`,
            display: 'inline-block',
            marginLeft: 'auto',
            marginRight: 'auto',
          } : {}),
        }}>
          {tpl.website_text}
        </div>
      )}
    </div>
  );

  if (fillContainer) {
    return (
      <div ref={fillRef} style={{ width: '100%', overflow: 'hidden' }}>
        {fillWidth > 0 ? previewEl : <div style={{ aspectRatio: `${width} / ${height}` }} />}
      </div>
    );
  }

  return previewEl;
}
