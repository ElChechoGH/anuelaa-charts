/* Charts — app (el artista sale de config.json → data.json) */
(() => {
  'use strict';

  // ---------- utilidades ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v; // solo para iconos estáticos
      else if (k === 'style') el.setAttribute('style', v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k.replace(/^yc\./, 'aa.')); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k.replace(/^yc\./, 'aa.'), JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  const nf = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
    const isNum = (v) => typeof v === 'number' && isFinite(v);
  const full = (v) => isNum(v) ? nf.format(Math.round(v)) : '—';
  const n1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, useGrouping: 'always' }), n2 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, useGrouping: 'always' });
  const comp = (v, f) => { const a = Math.abs(v); return a >= 1e6 ? f.format(v / 1e6) + ' M' : a >= 1e4 ? f.format(v / 1e3) + ' mil' : nf.format(Math.round(v)); };
  const short = (v) => isNum(v) ? comp(v, n1) : '—';
  const short2 = (v) => isNum(v) ? comp(v, n2) : '—';
  const pct = (v) => isNum(v) ? (v * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' %' : '—';
  const signed = (v) => !isNum(v) ? '' : (v > 0 ? '+' : v < 0 ? '−' : '±') + short(Math.abs(v));
  const parseD = (s) => { if (!s) return null; const d = new Date(String(s).slice(0, 10) + 'T00:00:00Z'); return isNaN(d) ? null : d; };
  const today = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
  const days = (a, b) => { const x = parseD(a), y = b instanceof Date ? b : parseD(b); return x && y ? Math.round((y - x) / 864e5) : null; };
  const dfmt = (s, opt) => { const d = parseD(s); return d ? d.toLocaleDateString('es-ES', Object.assign({ day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }, opt || {})) : '—'; };
  const ago = (iso) => {
    const t = new Date(iso); if (isNaN(t)) return '';
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'ahora mismo'; if (m < 60) return `hace ${m} min`;
    const hh = Math.round(m / 60); if (hh < 24) return `hace ${hh} h`;
    const d = Math.round(hh / 24); return `hace ${d} día${d > 1 ? 's' : ''}`;
  };
  const base = (t) => String(t || '').toLowerCase().split(' (')[0].replace(/\s+/g, ' ').trim();
  const flag = (cc) => {
    if (!cc || cc === 'WW' || cc === 'Global' || cc.length !== 2) return '🌎';
    return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
  };
  function flagEl(cc, size) {
    const box = h('span', { class: 'yc-flag' + (size === 'sm' ? ' sm' : ''), title: cc || 'Global' });
    if (!cc || cc === 'WW' || cc.length !== 2) { box.classList.add('globe'); box.append(icon('globe')); return box; }
    const c = cc.toLowerCase();
    const im = h('img', { src: `https://flagcdn.com/w40/${c}.png`, srcset: `https://flagcdn.com/w80/${c}.png 2x`, alt: cc, loading: 'lazy', decoding: 'async' });
    im.addEventListener('error', () => { im.remove(); box.classList.add('txt'); box.textContent = cc.toUpperCase(); });
    box.append(im); return box;
  }
  const COUNTRY = { 'Global': 'WW', 'España': 'ES', 'Colombia': 'CO', 'Costa Rica': 'CR', 'Chile': 'CL', 'Venezuela': 'VE', 'Rep. Dominicana': 'DO', 'Ecuador': 'EC', 'Perú': 'PE', 'Panamá': 'PA', 'México': 'MX', 'EE. UU.': 'US', 'Nicaragua': 'NI', 'Honduras': 'HN', 'El Salvador': 'SV', 'Italia': 'IT', 'Paraguay': 'PY', 'Uruguay': 'UY', 'Guatemala': 'GT', 'Bolivia': 'BO', 'Argentina': 'AR', 'Canadá': 'CA', 'Portugal': 'PT', 'Suiza': 'CH', 'Puerto Rico': 'PR', 'Mundial': 'WW' };
  const ccOf = (pais, code) => code || COUNTRY[pais] || '';
  const hue = (s) => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) % 360; return x; };
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2400); };
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); toast('Copiado ✓'); } catch (e) { toast('No se pudo copiar'); } };

  const IC = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    spark: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.4 0 4 1.5 4.6 4"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    spotify: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7 9.5c3.5-1 7.5-.6 10.5 1M7.5 12.6c3-.8 6-.4 8.5 1M8 15.5c2.4-.6 4.6-.3 6.6.8" stroke="#000" stroke-width="1.6"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" stroke="none"/><path d="M10 9v6l5-3z" fill="#fff" stroke="none"/>',
    apple: '<path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    shazam: '<circle cx="12" cy="12" r="10"/><path d="M10 8.5 7.5 11a1.5 1.5 0 0 0 0 2.1L9 14.5M14 15.5l2.5-2.5a1.5 1.5 0 0 0 0-2.1L15 9.5"/>',
    ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
    tiktok: '<path d="M14 3v11a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.2 4.2 5 4.5"/>',
    wave: '<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4M21 12h0"/>',
    deezer: '<path d="M3 17h3M8 17h3M13 17h3M18 17h3M8 13h3M13 13h3M18 13h3M13 9h3M18 9h3M18 5h3"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.6 0-3.3-2.2-5.4-3.6-7.4-.5 2-1.6 3-2.8 3.4C13 8 12 5 9.5 2.5 9.8 6 5 8.5 5 15.4 5 19.3 8 22 12 22z"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    cake: '<path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M5 16c2 1.5 4 1.5 7 0s5-1.5 7 0M12 12V9M12 6.5a1.2 1.2 0 0 1 0-2.4c0 .9 1.2 1.2 0 2.4z"/>',
    rss: '<path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8"/><circle cx="6" cy="18" r="1.6" fill="currentColor"/>',
    up: '<path d="M4 17l6-6 4 4 6-7"/><path d="M14 8h6v6"/>',
    bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    x: '<path d="M4 4l16 16M20 4 4 20" stroke-width="2.4"/>',
    fb: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" fill="currentColor" stroke="none"/>',
    radio: '<rect x="3" y="8" width="18" height="12" rx="3"/><circle cx="15.5" cy="14" r="2.5"/><path d="M7 12h4M7 16h4M7 8l10-4"/>',
    cm: '<path d="M4 19V9M9 19V5M14 19v-7M19 19V3"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    dots: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    news: '<rect x="3" y="4" width="15" height="16" rx="2"/><path d="M18 8h3v10a2 2 0 0 1-2 2M7 8h7M7 12h7M7 16h4"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>',
    megaphone: '<path d="M3 10v4l11 5V5z"/><path d="M14 8a4 4 0 0 1 0 8M6 15l1 5h3l-1-4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };
  const icon = (n, extra) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.innerHTML = IC[n] || ''; if (extra) s.setAttribute('class', extra); return s; };
  const PLAT = {
    spotify: { name: 'Spotify', color: '#1db954', icon: 'spotify' }, youtube: { name: 'YouTube', color: '#ff0033', icon: 'youtube' },
    apple: { name: 'Apple Music', color: '#fa2d48', icon: 'apple' }, shazam: { name: 'Shazam', color: '#0a84ff', icon: 'shazam' },
    instagram: { name: 'Instagram', color: '#e1306c', icon: 'ig' }, tiktok: { name: 'TikTok', color: '#111111', icon: 'tiktok' },
    audiomack: { name: 'Audiomack', color: '#ffa200', icon: 'wave' }, deezer: { name: 'Deezer', color: '#a238ff', icon: 'deezer' }, x: { name: 'X (Twitter)', color: '#111111', icon: 'x' },
    itunes: { name: 'iTunes', color: '#ea4cc0', icon: 'apple' },
    facebook: { name: 'Facebook', color: '#1877f2', icon: 'fb' }, pandora: { name: 'Pandora', color: '#3668ff', icon: 'radio' }, chartmetric: { name: 'Chartmetric', color: '#5b5bd6', icon: 'cm' }
  };
  const PLAT_BY_NAME = { 'Spotify': 'spotify', 'YouTube': 'youtube', 'Apple Music': 'apple', 'Shazam': 'shazam', 'Deezer': 'deezer', 'iTunes': 'itunes' };
  const pico = (k) => { const p = PLAT[k]; return h('span', { class: 'yc-pico', style: `background:${p.color}` }, icon(p.icon)); };

  // número animado
  let QUIET = false; // al aplicar datos nuevos en segundo plano no se repiten las animaciones
  function countUp(el, to, fmt = short) {
    if (!isNum(to)) { el.textContent = '—'; return; }
    if (QUIET || document.documentElement.classList.contains('lite')) { el.textContent = fmt(to); return; }
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = fmt(to); return; }
    const dur = 1100, t0 = performance.now();
    const step = (t) => { const p = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 4); el.textContent = fmt(to * e); if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to); };
    requestAnimationFrame(step);
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -5% 0px' }) : null;
  const reveal = (el, i = 0) => { el.classList.add('reveal'); el.style.transitionDelay = Math.min(i * 25, 200) + 'ms'; if (io) io.observe(el); else el.classList.add('in'); return el; };

  // ---------- color de las portadas (Liquid Glass) ----------
  // saca 3 colores vivos de una imagen para teñir el fondo y las tarjetas
  const PAL = (() => { try { return JSON.parse(localStorage.getItem('aa.pal') || '{}'); } catch (e) { return {}; } })();
  const PALP = new Map();
  const toHex = (r, g, b) => '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  function palette(url) {
    if (!url) return Promise.resolve(null);
    if (PAL[url]) return Promise.resolve(PAL[url]);
    if (PALP.has(url)) return PALP.get(url);
    const p = new Promise(res => {
      const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
      im.onload = () => {
        try {
          const N = 36, c = document.createElement('canvas'); c.width = c.height = N;
          const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, N, N);
          const d = g.getImageData(0, 0, N, N).data, bins = Array.from({ length: 18 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
          let ar = 0, ag = 0, ab = 0, an = 0;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b) / 255, mn = Math.min(r, gg, b) / 255, l = (mx + mn) / 2, dl = mx - mn;
            ar += r; ag += gg; ab += b; an++;
            if (dl < 0.12 || l < 0.1 || l > 0.93) continue;
            const sat = dl / (1 - Math.abs(2 * l - 1) || 1);
            let hh = mx === mn ? 0 : mx === r / 255 ? ((gg - b) / 255 / dl) % 6 : mx === gg / 255 ? (b - r) / 255 / dl + 2 : (r - gg) / 255 / dl + 4;
            hh = (hh * 60 + 360) % 360;
            const w = sat * (1 - Math.abs(l - 0.5) * 1.3), k = Math.floor(hh / 20) % 18;
            bins[k].w += w; bins[k].r += r * w; bins[k].g += gg * w; bins[k].b += b * w;
          }
          const top = bins.filter(x => x.w > 0.6).sort((a, b) => b.w - a.w).slice(0, 3).map(x => toHex(x.r / x.w, x.g / x.w, x.b / x.w));
          const avg = toHex(ar / an, ag / an, ab / an);
          while (top.length < 3) top.push(top.length ? avg : avg);
          PAL[url] = top;
          const keys = Object.keys(PAL); if (keys.length > 160) delete PAL[keys[0]];
          try { localStorage.setItem('aa.pal', JSON.stringify(PAL)); } catch (e) { /* sin espacio */ }
          res(top);
        } catch (e) { res(null); } // la imagen no deja leer sus colores
      };
      im.onerror = () => res(null);
      im.src = url;
    });
    PALP.set(url, p); return p;
  }
  const fallbackPal = (seed) => { const x = hue(seed || 'aa'); return [`hsl(${x} 75% 50%)`, `hsl(${(x + 40) % 360} 70% 45%)`, `hsl(${(x + 300) % 360} 65% 40%)`]; };
  function setAmbient(cols) {
    const r = document.documentElement.style;
    (cols || ['#ff2b3d', '#7a1020', '#ff7a45']).forEach((c, i) => r.setProperty('--amb' + (i + 1), c));
  }
  // tiñe un elemento con los colores de una imagen (variables --t1 --t2 --t3)
  function tint(el, url, seed) {
    const apply = (cols) => { (cols || fallbackPal(seed)).forEach((c, i) => el.style.setProperty('--t' + (i + 1), c)); el.classList.add('tinted'); };
    if (PAL[url]) apply(PAL[url]); else { apply(null); palette(url).then(c => { if (c) apply(c); }); }
    return el;
  }
  const coverOf = (s) => s && (s.portada ? hd(s.portada_hd || s.portada, 640) : (s.yt && s.yt.video_id ? `https://i.ytimg.com/vi/${s.yt.video_id}/hqdefault.jpg` : null));

  // ---------- datos ----------
  let DATA = null;
  // artista y web (salen de config.json a través de data.json)
  const AN = () => (DATA && DATA.artista && DATA.artista.nombre) || 'Artista';
  const AU = () => (DATA && DATA.artista && DATA.artista.instagram) || AN().toLowerCase().replace(/\s+/g, '');
  const AH = () => (DATA && DATA.artista && DATA.artista.hashtag) || AN().replace(/\s+/g, '');
  const MK = () => { const m = store.get('yc.marca', '') || (DATA && DATA.sitio && DATA.sitio.marca) || ''; return m === 'lvcifercharts' ? '' : m; };
  const CREADOR = 'chechodev';
  const mkTag = () => MK() ? ` #${MK()}` : '';
  const mkSig = () => MK() ? `\n🎨 @${MK()}` : '';
  const SITE = () => (DATA && DATA.sitio && DATA.sitio.nombre) || (AN() + ' Charts');
  const initials = () => AN().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const artRx = () => { try { return new RegExp((DATA && DATA.artista && DATA.artista.alias_regex) || AN().replace(/\s+/g, '\\s*'), 'i'); } catch (e) { return new RegExp(AN(), 'i'); } };
  let LIVE = store.get('yc.live.yt', { at: null, v: {} });
  const GH = (() => {
    const saved = store.get('yc.gh', {});
    const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
    const repo = location.pathname.split('/').filter(Boolean)[0];
    return { owner: saved.owner || (m ? m[1] : ''), repo: saved.repo || (m && repo ? repo : ''), branch: saved.branch || 'main', token: saved.token || '', workflow: saved.workflow || 'update.yml' };
  })();
  const saveGH = () => store.set('yc.gh', GH);

  async function fetchJSON(url, opts) { const r = await fetch(url, opts); if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.json(); }
  async function loadData(fromApi) {
    if (fromApi && GH.owner && GH.repo) {
      const headers = { Accept: 'application/vnd.github.raw' };
      if (GH.token) headers.Authorization = 'Bearer ' + GH.token;
      return fetchJSON(`https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/data/data.json?ref=${encodeURIComponent(GH.branch)}&t=${Date.now()}`, { headers, cache: 'no-store' });
    }
    try { return await fetchJSON('data/data.json?t=' + Date.now(), { cache: 'no-store' }); }
    catch (e) {
      const seed = document.getElementById('seed');
      if (seed) return JSON.parse(seed.textContent);
      throw e;
    }
  }

  // canciones enriquecidas
  let SONGS = [];
  function derive() {
    const T = today();
    const charts = DATA.charts || [];
    SONGS = DATA.canciones.map(s => {
      const o = Object.assign({}, s);
      const yt = s.youtube ? Object.assign({}, s.youtube) : null;
      if (yt && LIVE.v[yt.video_id]) { const L = LIVE.v[yt.video_id]; if (isNum(L.vistas) && !(DATA.generado && L.at < DATA.generado) && !(isNum(yt.vistas) && L.vistas < yt.vistas)) { yt.vistas = L.vistas; yt.likes = L.likes; yt.fecha = L.at.slice(0, 10); yt.live = L.at; } }
      o.yt = yt;
      o.sp = s.spotify || {};
      o.b = base(s.titulo);
      o.diasPublicado = s.lanzamiento ? days(s.lanzamiento, T) : null;
      o.diasSp = s.lanzamiento && o.sp.fecha ? Math.max(1, days(s.lanzamiento, o.sp.fecha)) : null;
      o.spMedia = isNum(o.sp.total) && o.diasSp ? o.sp.total / o.diasSp : null;
      const ytDays = yt && (yt.publicado || s.lanzamiento) ? Math.max(1, days(yt.publicado || s.lanzamiento, yt.fecha || T)) : null;
      o.ytMedia = yt && isNum(yt.vistas) && ytDays ? yt.vistas / ytDays : null;
      o.likeRate = yt && isNum(yt.likes) && yt.vistas ? yt.likes / yt.vistas : null;
      o.combinado = (isNum(o.sp.total) ? o.sp.total : 0) + (yt && isNum(yt.vistas) ? yt.vistas : 0) + (s.audiomack && isNum(s.audiomack.reproducciones) ? s.audiomack.reproducciones : 0);
      o.hoy = charts.filter(c => c.posicion != null && base(c.cancion) === o.b);
      o.best = [...(s.picos || []).map(p => ({ p: p.pico, t: `#${p.pico} Spotify ${p.pais}`, cc: p.codigo })), ...o.hoy.map(c => ({ p: c.posicion, t: `#${c.posicion} ${c.plataforma} ${c.pais}`, cc: ccOf(c.pais, c.codigo) })), ...(s.listas || []).filter(x => isNum(x.puesto)).map(x => ({ p: x.puesto, t: `#${x.puesto} ${x.plataforma} ${x.pais || ''}`.trim(), cc: ccOf(x.pais) }))].sort((a, b) => a.p - b.p)[0] || null;
      o.isNew = o.diasPublicado != null && o.diasPublicado <= 60 && o.diasPublicado >= 0;
      return o;
    });
    const rank = (key) => { const arr = SONGS.filter(x => isNum(key(x))).sort((a, b) => key(b) - key(a)); arr.forEach((x, i) => { x['rank_' + key.name] = i + 1; }); return arr.length; };
    const spTotal = (x) => x.sp.total; const ytViews = (x) => x.yt && x.yt.vistas; const spDaily = (x) => x.sp.diarios;
    Object.defineProperty(spTotal, 'name', { value: 'sp' }); Object.defineProperty(ytViews, 'name', { value: 'yt' }); Object.defineProperty(spDaily, 'name', { value: 'spd' });
    SONGS.nSp = rank(spTotal); SONGS.nYt = rank(ytViews); SONGS.nSpd = rank(spDaily);
  }
  const songById = (id) => SONGS.find(s => s.id === id);
  const releases = () => SONGS.filter(s => s.lanzamiento).sort((a, b) => String(b.lanzamiento).localeCompare(String(a.lanzamiento)));
  const ytSum = () => SONGS.reduce((t, s) => t + (s.yt && isNum(s.yt.vistas) ? s.yt.vistas : 0), 0);
  const histSorted = () => (DATA.historial || []).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const HKEY = {
    'spotify:Oyentes mensuales': 'spotify_oyentes_mensuales', 'spotify:Seguidores': 'spotify_seguidores', 'spotify:Streams totales': 'spotify_streams_totales', 'spotify:Streams al día': 'spotify_streams_diarios',
    'youtube:Suscriptores': 'youtube_suscriptores', 'youtube:Vistas del canal': 'youtube_vistas_totales', 'youtube:Videos subidos': 'youtube_videos', 'youtube:Vistas de sus canciones': 'youtube_vistas_canciones',
    'instagram:Seguidores': 'instagram_seguidores', 'tiktok:Seguidores': 'tiktok_seguidores', 'shazam:Shazams totales': 'shazams', 'deezer:Fans': 'deezer_fans',
    'audiomack:Seguidores': 'audiomack_seguidores', 'audiomack:Reproducciones': 'audiomack_reproducciones', 'x:Seguidores': 'x_seguidores', 'facebook:Seguidores': 'facebook_seguidores'
  };
  // cambio respecto al registro anterior, a hace 7 días y a hace 30 días, más la media diaria
  function growth(key) {
    const hs = histSorted().filter(r => isNum(r[key]));
    if (hs.length < 2) return null;
    const last = hs[hs.length - 1], T = parseD(last.fecha);
    const back = (n) => { const lim = T - n * 864e5; const r = [...hs].reverse().find(x => parseD(x.fecha) <= lim); return r ? last[key] - r[key] : null; };
    const first = hs[0], span = Math.max(1, days(first.fecha, last.fecha));
    return { d1: last[key] - hs[hs.length - 2][key], d7: back(7), d30: back(30), media: (last[key] - first[key]) / span, serie: hs.map(r => r[key]) };
  }
  function spark(vals, color) {
    if (!vals || vals.length < 2) return null;
    const W = 120, H = 30, lo = Math.min(...vals), hi = Math.max(...vals), r = hi - lo || 1;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1) * W).toFixed(1)},${(H - 2 - (v - lo) / r * (H - 4)).toFixed(1)}`).join(' ');
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', `0 0 ${W} ${H}`); s.setAttribute('class', 'yc-spark');
    s.innerHTML = `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    return s;
  }
  function growthStat(label, value, g, color) {
    const el = h('div', { class: 'yc-stat' }, h('span', { text: label }), h('b', { text: short2(value) }));
    if (g) {
      const line = (v, txt) => isNum(v) ? h('small', { class: v > 0 ? 'yc-up' : v < 0 ? 'yc-down' : '', text: `${signed(v)} ${txt}` }) : null;
      el.append(...[line(g.d1, 'vs anterior'), line(g.d7, 'en 7 días'), line(g.d30, 'en 30 días'), isNum(g.media) ? h('small', { text: `media ${signed(g.media)}/día` }) : null, spark(g.serie, color)].filter(Boolean));
    } else el.append(h('small', { text: isNum(value) && value >= 10000 ? full(value) : '' }), h('small', { class: 'yc-muted', text: 'Ganancia diaria: desde la próxima actualización' }));
    return el;
  }
  function deltaOf(key) { const hs = histSorted(); if (hs.length < 2) return null; const a = hs[hs.length - 2][key], b = hs[hs.length - 1][key]; return isNum(a) && isNum(b) ? b - a : null; }
  function nextMilestone(total, daily) {
    if (!isNum(total) || !isNum(daily) || daily <= 0) return null;
    const marks = [1e6, 2e6, 5e6, 10e6, 20e6, 25e6, 50e6, 75e6, 100e6, 150e6, 200e6, 250e6, 300e6, 350e6, 400e6, 500e6, 750e6, 1e9];
    const m = marks.find(x => x > total); if (!m) return null;
    return { hito: m, faltan: m - total, dias: Math.ceil((m - total) / daily) };
  }

  // ---------- imágenes en la máxima calidad disponible ----------
  // Apple Music da hasta 3000 px, Deezer 1000 px, Spotify 640 px y YouTube 1280×720 (maxres)
  function hd(url, size) {
    if (!url) return url;
    size = size || 1200;
    if (/mzstatic\.com/.test(url)) return url.replace(/\/\d+x\d+(?:bb|cc|bf)?(?:-\d+)?\.(jpg|jpeg|png|webp)$/i, `/${size}x${size}bb.jpg`);
    if (/dzcdn\.net|deezer/.test(url)) return url.replace(/\/\d+x\d+-/, `/${Math.min(size, 1000)}x${Math.min(size, 1000)}-`);
    if (/scdn\.co|spotifycdn\.com/.test(url)) {
      if (size > 300) return url.replace('ab67616d00001e02', 'ab67616d0000b273').replace('ab67616d00004851', 'ab67616d0000b273').replace('ab6761610000f178', 'ab6761610000e5eb').replace('ab67616100005174', 'ab6761610000e5eb');
      return url;
    }
    return url;
  }
  const bigCover = (s) => s && (s.portada_hd ? hd(s.portada_hd, 1400) : s.portada ? hd(s.portada, 1400) : null);

  // ---------- componentes ----------
  // miniatura de YouTube en la mejor calidad disponible (maxres → sd → hq)
  function ytThumb(id, sizes, attrs) {
    const im = h('img', Object.assign({ alt: '', decoding: 'async' }, attrs || {}));
    let i = 0;
    const next = () => { if (i < sizes.length) im.src = `https://i.ytimg.com/vi/${id}/${sizes[i++]}.jpg`; else im.remove(); };
    im.addEventListener('error', next);
    im.addEventListener('load', () => { if (im.naturalWidth <= 120 && i < sizes.length) next(); });
    next();
    return im;
  }
  function art(s, size) {
    const box = h('div', { class: 'yc-art', style: `background:linear-gradient(135deg,hsl(${hue(s.titulo)} 80% 55%),hsl(${(hue(s.titulo) + 60) % 360} 70% 40%))${size ? `;width:${size}px;height:${size}px` : ''}` }, s.titulo.replace(/[^A-Za-z0-9ÁÉÍÓÚÑ]/g, '').slice(0, 2).toUpperCase());
    if (s.portada) {
      const img = h('img', { src: hd(s.portada_hd || s.portada, size && size > 100 ? 800 : 300), alt: '', loading: 'lazy', decoding: 'async', class: 'cover' });
      img.addEventListener('error', () => img.remove());
      img.addEventListener('load', () => { box.firstChild && box.firstChild.nodeType === 3 && box.firstChild.remove(); });
      box.append(img);
    } else if (s.sp && s.sp.id) {
      // sin portada guardada: se pide a Spotify desde el navegador (y se recuerda)
      spCover(s).then(u => { if (!u) return; s.portada = u; const img = h('img', { src: u, alt: '', decoding: 'async', class: 'cover' }); img.addEventListener('load', () => { box.firstChild && box.firstChild.nodeType === 3 && box.firstChild.remove(); }); img.addEventListener('error', () => img.remove()); box.append(img); });
    } else if (s.yt && s.yt.video_id) {
      const img = ytThumb(s.yt.video_id, ['mqdefault', 'hqdefault'], { loading: 'lazy' });
      img.addEventListener('load', () => { box.firstChild && box.firstChild.nodeType === 3 && box.firstChild.remove(); });
      box.append(img);
    }
    return box;
  }
  const COV = (() => { try { return JSON.parse(localStorage.getItem('aa.cov') || '{}'); } catch (e) { return {}; } })();
  const COVP = new Map();
  function spCover(s) {
    const id = s.sp.id;
    if (COV[id]) return Promise.resolve(COV[id]);
    if (COVP.has(id)) return COVP.get(id);
    const p = fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent('https://open.spotify.com/track/' + id)}`).then(r => r.ok ? r.json() : null).then(j => {
      const u = j && j.thumbnail_url ? hd(j.thumbnail_url, 640) : null;
      if (u) { COV[id] = u; try { localStorage.setItem('aa.cov', JSON.stringify(COV)); } catch (e) { /* sin espacio */ } }
      return u;
    }).catch(() => null);
    COVP.set(id, p); return p;
  }
  function artistPhoto(cls) {
    const box = h('div', { class: cls || 'yc-avatar' });
    const src = DATA && DATA.artista && DATA.artista.imagen;
    if (src) { const im = h('img', { src, alt: `${AN()}`, decoding: 'async' }); im.addEventListener('error', () => { im.remove(); box.textContent = initials(); }); box.append(im); } else box.textContent = initials();
    return box;
  }
  function songRow(s, opts = {}) {
    const tags = h('span', { class: 'yc-tags' });
    if (s.isNew) tags.append(h('span', { class: 'yc-tag new', text: 'Nuevo' }));
    if (s.hoy.length) tags.append(h('span', { class: 'yc-tag chart', text: 'En listas' }));
    const metric = opts.metric || 'sp';
    const m = METRICS[metric];
    const row = h('div', { class: 'yc-row', role: 'button', tabindex: '0', onclick: () => openSong(s.id), onkeydown: (e) => { if (e.key === 'Enter') openSong(s.id); } },
      opts.rank != null ? h('span', { class: 'yc-rank', text: opts.rank }) : null,
      art(s),
      h('div', { class: 'yc-row-main' }, h('b', null, s.titulo.replace(/\s*\((with|feat\.)[^)]*\)/i, ''), tags), h('small', { text: `${s.artistas}${s.lanzamiento ? ' · ' + dfmt(s.lanzamiento, { day: undefined, month: 'short' }) : ''}` }),
        opts.bar != null ? h('div', { class: 'yc-bar' }, h('i', { style: `background:${opts.barColor || 'var(--green)'}`, 'data-w': opts.bar })) : null),
      h('div', { class: 'yc-row-meta' }, h('b', { text: m.fmt(m.get(s)) }), h('small', { text: m.label })),
      icon('chev', 'yc-chev'));
    return row;
  }
  const METRICS = {
    sp: { label: 'streams Spotify', get: s => s.sp.total, fmt: short },
    spd: { label: 'streams hoy', get: s => s.sp.diarios, fmt: short },
    yt: { label: 'vistas YouTube', get: s => s.yt && s.yt.vistas, fmt: short },
    ytl: { label: 'likes YouTube', get: s => s.yt && s.yt.likes, fmt: short },
    comb: { label: 'total combinado', get: s => s.combinado || null, fmt: short },
    sh: { label: 'Shazams', get: s => s.shazam && s.shazam.total, fmt: short },
    fecha: { label: 'lanzamiento', get: s => s.lanzamiento ? parseD(s.lanzamiento).getTime() : null, fmt: (v) => isNum(v) ? new Date(v).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' }) : '—' },
    media: { label: 'Spotify/día desde salida', get: s => s.spMedia, fmt: short }
  };
  const animateBars = (root) => requestAnimationFrame(() => requestAnimationFrame(() => $$('[data-w]', root).forEach(i => { i.style.width = i.dataset.w + '%'; })));

  function lineChart(box, pts, color, fmt = full) {
    box.replaceChildren();
    if (!pts.length) { box.append(h('p', { class: 'yc-empty', text: 'Aún no hay registros de esta cifra.' })); return; }
    const W = Math.max(300, box.clientWidth || 600), H = 220, ml = 8, mr = 8, mt = 16, mb = 26;
    let lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v));
    if (lo === hi) { lo *= .98; hi = hi * 1.02 || 1; }
    const pad = (hi - lo) * .15; lo -= pad; hi += pad;
    let t0 = pts[0].d.getTime(), t1 = pts[pts.length - 1].d.getTime(); if (t0 === t1) { t0 -= 3 * 864e5; t1 += 3 * 864e5; }
    const X = (d) => ml + (d.getTime() - t0) / (t1 - t0) * (W - ml - mr), Y = (v) => mt + (1 - (v - lo) / (hi - lo)) * (H - mt - mb);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('height', H);
    const gid = 'g' + Math.random().toString(36).slice(2);
    let path = '', area = '';
    pts.forEach((p, i) => { path += (i ? 'L' : 'M') + X(p.d).toFixed(1) + ' ' + Y(p.v).toFixed(1); });
    area = path + `L${X(pts[pts.length - 1].d)} ${H - mb}L${X(pts[0].d)} ${H - mb}Z`;
    svg.innerHTML = `<defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`
      + [0, .5, 1].map(f => `<line x1="${ml}" x2="${W - mr}" y1="${mt + f * (H - mt - mb)}" y2="${mt + f * (H - mt - mb)}" stroke="var(--sep)"/>`).join('')
      + (pts.length > 1 ? `<path d="${area}" fill="url(#${gid})"/><path class="ln" d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : '')
      + pts.map(p => `<circle cx="${X(p.d)}" cy="${Y(p.v)}" r="${pts.length > 40 ? 0 : 4}" fill="${color}" stroke="var(--card-solid)" stroke-width="2"/>`).join('');
    const ticks = pts.length <= 6 ? pts : pts.filter((p, i) => i % Math.ceil(pts.length / 6) === 0);
    ticks.forEach(p => { const t = document.createElementNS(ns, 'text'); t.setAttribute('x', X(p.d)); t.setAttribute('y', H - 6); t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '11'); t.setAttribute('fill', 'var(--text3)'); t.textContent = p.d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }); svg.append(t); });
    const hl = document.createElementNS(ns, 'circle'); hl.setAttribute('r', 6); hl.setAttribute('fill', color); hl.setAttribute('stroke', '#fff'); hl.setAttribute('stroke-width', 2); hl.style.opacity = 0; svg.append(hl);
    const tip = h('div', { class: 'yc-tip' });
    box.append(svg, tip);
    const ln = svg.querySelector('.ln');
    if (ln && ln.getTotalLength) { const L = ln.getTotalLength(); ln.style.strokeDasharray = L; ln.style.strokeDashoffset = L; ln.getBoundingClientRect(); ln.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.32,.72,0,1)'; ln.style.strokeDashoffset = 0; }
    svg.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * W;
      let best = pts[0]; for (const p of pts) if (Math.abs(X(p.d) - x) < Math.abs(X(best.d) - x)) best = p;
      hl.setAttribute('cx', X(best.d)); hl.setAttribute('cy', Y(best.v)); hl.style.opacity = 1;
      tip.replaceChildren(h('span', { text: best.d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) }), h('b', { text: fmt(best.v) }));
      const sx = X(best.d) / W * r.width; tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, sx - tip.offsetWidth / 2)) + 'px'; tip.style.top = Math.max(0, Y(best.v) / H * r.height - tip.offsetHeight - 12) + 'px'; tip.style.opacity = 1;
    });
    svg.addEventListener('pointerleave', () => { hl.style.opacity = 0; tip.style.opacity = 0; });
  }
  function hbars(rows, { label, value, color, fmt = short, onclick, max = 15, lead }) {
    const data = rows.filter(r => isNum(value(r))).slice(0, max);
    const top = Math.max(...data.map(value), 1);
    const box = h('div', { class: 'yc-hbars' }, data.map(r => h('div', { class: 'yc-hbar', onclick: onclick ? () => onclick(r) : null },
      h('span', { title: label(r) }, lead ? lead(r) : null, label(r)), h('div', { class: 'track' }, h('i', { style: `background:${typeof color === 'function' ? color(r) : color}`, 'data-w': (value(r) / top * 100).toFixed(1) })), h('b', { text: fmt(value(r)) }))));
    if (!data.length) box.append(h('p', { class: 'yc-empty', text: 'Sin datos.' }));
    animateBars(box);
    return box;
  }
  const section = (title, sub) => h('h2', { class: 'yc-h2' }, h('span', { text: title }), sub ? h('small', { text: sub }) : null);
  const card = (...kids) => h('div', { class: 'yc-card' }, ...kids);

  // ---------- páginas ----------
  const PAGES = [
    ['inicio', 'Inicio', 'home'], ['canciones', 'Canciones', 'music'], ['listas', 'Listas', 'chart'], ['novedades', 'Lo nuevo', 'bell'], ['logros', 'Logros y metas', 'trophy'],
    ['records', 'Récords', 'star'], ['comparar', 'Comparar', 'bolt'], ['trayectoria', 'Trayectoria', 'spark'], ['albumes', 'Discografía', 'disc'], ['lanzamientos', 'Estrenos', 'flame'], ['redes', 'Perfiles', 'people'], ['estudio', 'Estudio', 'pen']
  ];
  const MOBILE_MAIN = ['inicio', 'canciones', 'listas', 'novedades', 'estudio'];
  let current = 'inicio';
  function buildTabs() {
    const nav = $('#tabs'); nav.replaceChildren();
    for (const [id, label, ic] of PAGES) nav.append(h('button', { class: 'yc-tab' + (MOBILE_MAIN.includes(id) ? '' : ' more-only'), role: 'tab', 'data-id': id, 'aria-selected': String(id === current), onclick: () => go(id) }, icon(ic), h('span', { text: label })));
    nav.append(h('button', { class: 'yc-tab more-btn', type: 'button', onclick: openMore }, icon('dots'), h('span', { text: 'Más' })));
  }
  function openMore() {
    const b = h('div', { class: 'yc-list' }, PAGES.filter(p => !MOBILE_MAIN.includes(p[0])).map(([id, label, ic]) => h('div', { class: 'yc-row', onclick: () => { closeSheet(); go(id); } }, h('span', { class: 'yc-moreic' }, icon(ic)), h('div', { class: 'yc-row-main' }, h('b', { text: label })), icon('chev', 'yc-chev'))));
    openSheet('Más', b);
  }
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const haptic = () => { try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) { /* nada */ } };
  function go(id, push = true) {
    if (!PAGES.some(p => p[0] === id)) id = 'inicio';
    if (document.startViewTransition && !REDUCED && current !== id && RENDERED.size) {
      haptic();
      const t = document.startViewTransition(() => goNow(id, push));
      t.finished.finally(() => glideAll());
      return;
    }
    goNow(id, push);
  }
  function goNow(id, push = true) {
    current = id;
    $$('.yc-tab[data-id]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.id === id)));
    const mb = $('.more-btn'); if (mb) mb.setAttribute('aria-selected', String(!MOBILE_MAIN.includes(id)));
    $$('.yc-page').forEach(p => p.classList.toggle('on', p.dataset.page === id));
    renderPage(id);
    if (push) history.replaceState(null, '', '#' + id);
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (id === 'inicio') drawHist();
    watchTitle(); requestAnimationFrame(glideAll);
  }

  // ---------- movimiento estilo Apple ----------
  // indicador que se desliza bajo la opción elegida (segmentos y pestañas en PC)
  function glide(box) {
    if (!box || !box.isConnected) return;
    const sel = box.classList.contains('yc-tabs') ? [...box.querySelectorAll('.yc-tab[aria-selected="true"]')].find(t => t.offsetWidth) : box.querySelector(':scope > button[aria-pressed="true"]');
    let g = box.querySelector(':scope > .yc-glide');
    if (!sel || !sel.offsetWidth) { if (g) g.style.opacity = '0'; return; }
    const first = !g;
    if (!g) { g = document.createElement('span'); g.className = 'yc-glide'; box.prepend(g); box.classList.add('has-glide'); }
    if (first) g.style.transition = 'none';
    g.style.opacity = '1';
    g.style.width = sel.offsetWidth + 'px'; g.style.height = sel.offsetHeight + 'px';
    g.style.transform = `translate(${sel.offsetLeft}px, ${sel.offsetTop}px)`;
    if (first) requestAnimationFrame(() => { g.style.transition = ''; });
  }
  function glideAll() { document.querySelectorAll('.yc-seg, .yc-tabs').forEach(glide); }
  let glideRaf = 0;
  const glideSoon = () => { cancelAnimationFrame(glideRaf); glideRaf = requestAnimationFrame(glideAll); };
  new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'childList' || /aria-(pressed|selected)/.test(m.attributeName || '')) { glideSoon(); return; } } })
    .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-selected'] });
  addEventListener('resize', glideSoon, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(glideSoon);
  // título grande que sube a la barra al hacer scroll
  let titleIO = null;
  function watchTitle() {
    const nav = $('#nav'); if (!nav) return;
    let nt = nav.querySelector('.yc-navpage'); if (!nt) { nt = h('span', { class: 'yc-navpage' }); nav.append(nt); }
    const page = PAGES.find(p => p[0] === current); nt.textContent = page ? page[1] : '';
    const h1 = $(`#p-${current} .yc-h1`);
    if (titleIO) titleIO.disconnect();
    nav.classList.remove('titled');
    if (!h1 || !('IntersectionObserver' in window)) return;
    titleIO = new IntersectionObserver(([e]) => nav.classList.toggle('titled', !e.isIntersecting && e.boundingClientRect.top < 80), { rootMargin: '-70px 0px 0px 0px' });
    titleIO.observe(h1);
  }

  // Inicio
  let histKey = 'spotify_streams_diarios';
  function renderInicio() {
    const P = DATA.perfil, el = $('#p-inicio'); el.replaceChildren();
    const sp = P.spotify || {}, yt = P.youtube || {};
    const lastRel = releases()[0];
    el.append(h('div', { class: 'lg-searchrow' },
      h('button', { class: 'lg-search', type: 'button', onclick: () => openSearch(), 'aria-label': 'Buscar' }, icon('search'), h('span', { text: 'Busca una canción, disco, país o lista…' }), h('kbd', { text: '/' })),
      h('div', { class: 'lg-quick' },
        h('button', { type: 'button', onclick: () => go('canciones') }, icon('flame'), 'Lo más escuchado'),
        h('button', { type: 'button', onclick: () => go('listas') }, icon('chart'), 'Listas de hoy'),
        h('button', { type: 'button', onclick: () => go('records') }, icon('star'), 'Récords'),
        h('button', { type: 'button', onclick: () => go('albumes') }, icon('disc'), 'Discos'),
        h('button', { type: 'button', onclick: () => go('comparar') }, icon('bolt'), 'Comparar'))));
    el.append(bento(sp, yt, lastRel));
    if (!SONGS.length) el.append(h('div', { class: 'yc-card', style: 'margin-top:14px' }, h('b', { text: 'Preparando la primera actualización' }), h('p', { class: 'yc-note', style: 'margin:4px 0 0', text: 'En unos minutos aparecerán todas sus canciones, listas, playlists y cifras. La web se recarga sola.' })));
    renderFavs(el);
    renderToday(el);
    renderAnivs(el);
    const hot = logrosList().filter(n => (n.fecha || '') >= new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)).slice(0, 8);
    if (hot.length) {
      const sh = section('Para publicar', ''); sh.append(h('button', { class: 'yc-h2-link', onclick: () => go('logros'), text: 'Ver todos' })); el.append(sh);
      el.append(h('div', { class: 'yc-list' }, hot.slice(0, 3).map(logroRow)));
    }

    el.append(section('Hoy en cada plataforma', `datos al ${dfmt(DATA.generado)}`));
    const w = h('div', { class: 'yc-widgets' },
      widget('spotify', 'Oyentes', sp.oyentes_mensuales, deltaOf('spotify_oyentes_mensuales'), 'oyentes mensuales', 'redes'),
      widget('spotify', 'Streams hoy', sp.streams_diarios, deltaOf('spotify_streams_diarios'), `dato del ${dfmt(sp.fecha)}`, 'canciones'),
      widget('youtube', 'Suscriptores', yt.suscriptores, deltaOf('youtube_suscriptores'), `${short(yt.videos)} videos`, 'redes'),
      widget('youtube', 'Vistas canal', yt.vistas, deltaOf('youtube_vistas_totales'), 'canal oficial', 'redes'),
      widget('instagram', 'Seguidores', P.instagram && P.instagram.seguidores, deltaOf('instagram_seguidores'), 'Instagram', 'redes'),
      widget('tiktok', 'Seguidores', P.tiktok && P.tiktok.seguidores, deltaOf('tiktok_seguidores'), `${short(P.tiktok && P.tiktok.me_gusta)} me gusta`, 'redes'),
      widget('shazam', 'Shazams', P.shazam && P.shazam.total, deltaOf('shazams'), 'total del artista', 'redes'),
      widget('audiomack', 'Reproducciones', P.audiomack && P.audiomack.reproducciones, null, `${short(P.audiomack && P.audiomack.seguidores)} seguidores`, 'redes'),
      widget('deezer', 'Fans', P.deezer && P.deezer.fans, deltaOf('deezer_fans'), 'Deezer', 'redes'),
      P.x ? widget('x', 'Seguidores', P.x.seguidores, deltaOf('x_seguidores'), 'X (Twitter)', 'redes') : null,
      P.chartmetric ? widget('chartmetric', 'Ranking', null, null, 'Chartmetric · mundial', 'redes', '#' + full(P.chartmetric.rank)) : null,
      widget('apple', 'Último', null, null, P.apple_music ? `${P.apple_music.ultimo_lanzamiento} · ${dfmt(P.apple_music.fecha_ultimo)}` : '', 'lanzamientos', P.apple_music && P.apple_music.ultimo_lanzamiento ? P.apple_music.ultimo_lanzamiento.replace(' - Single', '') : '—'));
    el.append(w); $$('.yc-widget', w).forEach(reveal);

    if (lastRel) {
      el.append(section('Último lanzamiento', lastRel.diasPublicado != null ? `hace ${lastRel.diasPublicado} días` : ''));
      el.append(reveal(releaseCard(lastRel, true)));
    }
    const inCharts = (DATA.charts || []).filter(c => c.posicion != null).sort((a, b) => a.posicion - b.posicion);
    el.append(section('En listas ahora', `${inCharts.length} de ${new Set((DATA.charts || []).map(c => c.plataforma + c.pais)).size} listas`));
    const lc = h('div', { class: 'yc-list reveal' });
    if (!inCharts.length) lc.append(h('p', { class: 'yc-empty', text: 'Hoy no aparece en ninguna de las listas revisadas.' }));
    for (const c of inCharts) {
      const s = SONGS.find(x => x.b === base(c.cancion));
      lc.append(h('div', { class: 'yc-row', onclick: () => s ? openSong(s.id) : go('listas') },
        flagEl(ccOf(c.pais, c.codigo)),
        h('div', { class: 'yc-row-main' }, h('b', { text: c.cancion }), h('small', { text: `${c.plataforma} · ${c.lista} · ${c.pais} · ${c.fecha_lista ? dfmt(c.fecha_lista) : 'consultada ' + dfmt(c.consultado)}` })),
        h('div', { class: 'yc-row-meta' }, h('b', { text: '#' + c.posicion }), h('small', { class: String(c.cambio || '').startsWith('+') ? 'yc-up' : String(c.cambio || '').startsWith('-') ? 'yc-down' : '', text: c.cambio || '' })), icon('chev', 'yc-chev')));
    }
    el.append(lc); reveal(lc);

    el.append(section('Lo que más suena hoy', 'streams diarios en Spotify'));
    const top = SONGS.filter(s => isNum(s.sp.diarios)).sort((a, b) => b.sp.diarios - a.sp.diarios).slice(0, 8);
    const mx = top[0] ? top[0].sp.diarios : 1;
    const tl = h('div', { class: 'yc-list reveal' }, top.map((s, i) => songRow(s, { rank: i + 1, metric: 'spd', bar: (s.sp.diarios / mx * 100).toFixed(1) })));
    el.append(tl); animateBars(tl);

    const hist = h('div', { class: 'yc-card reveal', id: 'evolucion' });
    el.append(section('Evolución día a día', `${histSorted().length} registros`), hist);
    const OPTS = [['spotify_streams_diarios', 'Streams/día'], ['spotify_oyentes_mensuales', 'Oyentes'], ['spotify_streams_totales', 'Streams totales'], ['youtube_vistas_totales', 'Vistas YT'], ['youtube_suscriptores', 'Subs YT'], ['instagram_seguidores', 'Instagram'], ['tiktok_seguidores', 'TikTok'], ['shazams', 'Shazams']];
    const seg = h('div', { class: 'yc-seg' }, OPTS.map(([k, l]) => h('button', { 'aria-pressed': String(k === histKey), onclick: (e) => { histKey = k; $$('button', seg).forEach(b => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); drawHist(); }, text: l })));
    hist.append(seg, h('div', { class: 'yc-chart', id: 'hist-chart', style: 'margin-top:12px' }), h('p', { class: 'yc-note', id: 'hist-note' }));

    const ms = SONGS.map(s => Object.assign({ s }, nextMilestone(s.sp.total, s.sp.diarios))).filter(x => x.hito && x.dias <= 90).sort((a, b) => a.dias - b.dias).slice(0, 8);
    el.append(section('Próximos hitos', 'al ritmo de streams del último dato'));
    const ml = h('div', { class: 'yc-list reveal' }, ms.map(x => h('div', { class: 'yc-row', onclick: () => openSong(x.s.id) }, art(x.s),
      h('div', { class: 'yc-row-main' }, h('b', { text: x.s.titulo }), h('small', { text: `Le faltan ${full(x.faltan)} streams · dato del ${dfmt(x.s.sp.fecha)}` })),
      h('div', { class: 'yc-row-meta' }, h('b', { text: short(x.hito) }), h('small', { text: `~${x.dias} días` })))));
    if (!ms.length) ml.append(h('p', { class: 'yc-empty', text: 'Ningún hito cercano.' }));
    el.append(ml);
  }
  // ---------- inicio en bento (Liquid Glass) ----------
  function ring(pct, size) {
    const r = 42, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('class', 'lg-ring'); if (size) s.style.width = s.style.height = size + 'px';
    s.innerHTML = `<circle cx="50" cy="50" r="${r}" class="lg-ring-bg"/><circle cx="50" cy="50" r="${r}" class="lg-ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${(c * (1 - p / 100)).toFixed(1)}"/>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const f = s.querySelector('.lg-ring-fg'); if (f) f.style.strokeDashoffset = f.dataset.off; }));
    return s;
  }
  function tile(cls, kids, onclick, label) {
    const t = h('div', { class: 'lg-tile ' + cls, role: onclick ? 'button' : null, tabindex: onclick ? '0' : null, 'aria-label': label || null, onclick: onclick ? () => { haptic(); onclick(); } : null, onkeydown: onclick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick(); } } : null }, ...kids);
    return t;
  }
  const tLabel = (txt, ic) => h('span', { class: 'lg-lab' }, ic ? icon(ic) : null, txt);
  function deltaTag(v) { return isNum(v) && v !== 0 ? h('span', { class: 'lg-delta ' + (v > 0 ? 'up' : 'down'), text: (v > 0 ? '▲ ' : '▼ ') + short(Math.abs(v)) }) : null; }
  function bento(sp, yt, lastRel) {
    const g = h('div', { class: 'lg-bento' });
    const img = DATA.artista.imagen ? hd(DATA.artista.imagen, 1400) : null;
    // portada del artista
    const hero = tile('hero', [
      img ? h('img', { class: 'lg-hero-img', src: img, alt: '', decoding: 'async', fetchpriority: 'high' }) : null,
      h('div', { class: 'lg-hero-in' },
        h('span', { class: 'lg-kicker' }, h('i'), DATA.artista.lema || 'En directo'),
        h('h1', { class: 'lg-name', text: DATA.artista.nombre }),
        h('p', { class: 'lg-hero-sub', text: [DATA.artista.origen, SONGS.length ? `${SONGS.length} canciones` : '', (DATA.albumes || []).filter(a => a.tracks).length ? `${(DATA.albumes || []).filter(a => a.tracks).length} discos` : ''].filter(Boolean).join(' · ') }),
        h('div', { class: 'lg-links' }, Object.entries(DATA.artista.links || {}).map(([k, u]) => h('a', { href: u, target: '_blank', rel: 'noopener', onclick: (e) => e.stopPropagation(), text: { spotify: 'Spotify', youtube: 'YouTube', apple_music: 'Apple Music', instagram: 'Instagram', tiktok: 'TikTok', deezer: 'Deezer', audiomack: 'Audiomack', shazam: 'Shazam', x: 'X' }[k] || k }))))
    ], openArtist, 'Ficha de ' + DATA.artista.nombre);
    hero.append(h('span', { class: 'ax-hint' }, 'Ficha al día', icon('chev')));
    g.append(hero);
    // oyentes y streams con su evolución
    const metric = (cls, label, ic, v, key, sub, color, goTo) => {
      const b = h('b', { class: 'lg-big num', text: '—' }), gr = growth(key);
      const t = tile(cls, [tLabel(label, ic), b, h('div', { class: 'lg-row' }, deltaTag(gr ? gr.d1 : null), h('small', { text: sub || '' })), gr ? spark(gr.serie.slice(-30), color) : null], goTo ? () => go(goTo) : null, label);
      countUp(b, v); return t;
    };
    g.append(metric('m1', 'Oyentes mensuales', 'people', sp.oyentes_mensuales, 'spotify_oyentes_mensuales', 'Spotify', 'var(--green)', 'redes'));
    g.append(metric('m2', 'Streams hoy', 'music', sp.streams_diarios, 'spotify_streams_diarios', sp.fecha ? `dato del ${dfmt(sp.fecha, { year: undefined })}` : 'Spotify', 'var(--accent)', 'canciones'));
    // lo que más suena
    const top = SONGS.filter(x => isNum(x.sp.diarios)).sort((a, b) => b.sp.diarios - a.sp.diarios).slice(0, 3);
    if (top[0]) {
      const s0 = top[0], mx = s0.sp.diarios;
      const t = tile('now', [
        h('div', { class: 'lg-now-cov' }, art(s0)),
        h('div', { class: 'lg-now-main' }, tLabel('Lo que más suena hoy', 'flame'), h('b', { class: 'lg-title', text: s0.titulo }), h('small', { class: 'lg-clip', text: s0.artistas || AN() }),
          h('div', { class: 'lg-bars' }, top.map((x, i) => h('div', { class: 'lg-bar', onclick: (e) => { e.stopPropagation(); openSong(x.id); } }, h('span', { text: `${i + 1}. ${x.titulo}` }), h('i', null, h('i', { 'data-w': (x.sp.diarios / mx * 100).toFixed(1) })), h('em', { text: short(x.sp.diarios) })))))
      ], () => openTopHoy('sp'), 'Lo más escuchado hoy');
      t.querySelector('.lg-now-main').append(h('small', { class: 'lg-now-date', text: s0.sp.fecha ? `Spotify · dato del ${dfmt(s0.sp.fecha, { year: undefined })} · toca para ver el top` : 'toca para ver el top' }));
      tint(t, coverOf(s0), s0.titulo); animateBars(t); g.append(t);
    }
    // mejor puesto en listas hoy
    const inCharts = (DATA.charts || []).filter(c => c.posicion != null).sort((a, b) => a.posicion - b.posicion);
    const best = inCharts[0];
    g.append(tile('chart', best ? [tLabel('Mejor puesto hoy', 'chart'), h('div', { class: 'lg-chart' }, flagEl(ccOf(best.pais, best.codigo), 34), h('b', { class: 'lg-big num', text: '#' + best.posicion })), h('small', { class: 'lg-clip', text: best.cancion }), h('small', { class: 'lg-dim lg-clip', text: `${best.plataforma} · ${best.pais}` })]
      : [tLabel('En listas', 'chart'), h('b', { class: 'lg-big', text: '—' }), h('small', { class: 'lg-dim', text: 'Hoy no aparece en las listas revisadas' })], () => go('listas'), 'Listas'));
    // próximo hito
    const m = typeof proximosHitos === 'function' ? proximosHitos()[0] : null;
    if (m) {
      const t = tile('hito', [tLabel('Próximo hito', 'trophy'), h('div', { class: 'lg-hito' }, ring(m.pct), h('div', null, h('b', { class: 'lg-mid num', text: short(m.meta) }), h('small', { text: m.aPunto ? '¡A punto! 🔥' : `≈ ${m.dias} ${m.dias === 1 ? 'día' : 'días'}` }))), h('small', { class: 'lg-clip', text: m.s.titulo })], () => go('logros'), 'Próximo hito');
      tint(t, coverOf(m.s), m.s.titulo); g.append(t);
    }
    // último estreno
    if (lastRel) {
      const t = tile('rel', [h('div', { class: 'lg-rel-cov' }, art(lastRel)), h('div', { class: 'lg-now-main' }, tLabel(lastRel.diasPublicado != null && lastRel.diasPublicado <= 30 ? 'Nuevo' : 'Último estreno', 'spark'), h('b', { class: 'lg-title', text: lastRel.titulo }),
        h('small', { text: [lastRel.diasPublicado != null ? (lastRel.diasPublicado === 0 ? 'salió hoy' : `hace ${lastRel.diasPublicado} ${lastRel.diasPublicado === 1 ? 'día' : 'días'}`) : '', lastRel.combinado ? `${short(lastRel.combinado)} reproducciones` : ''].filter(Boolean).join(' · ') }))], () => openSong(lastRel.id), lastRel.titulo);
      tint(t, coverOf(lastRel), lastRel.titulo); g.append(t);
    }
    // youtube
    const ytb = h('b', { class: 'lg-big num', text: '—' });
    g.append(tile('yt', [tLabel('Vistas en YouTube', 'play'), ytb, h('small', { text: `${SONGS.filter(x => x.yt).length} videos · ${short(yt.suscriptores)} suscriptores` })], () => go('redes'), 'YouTube'));
    countUp(ytb, ytSum() || null);
    // en listas
    const paises = new Set(inCharts.map(c => c.pais)).size;
    g.append(tile('lists', [tLabel('En listas ahora', 'globe'), h('b', { class: 'lg-big num', text: String(inCharts.length) }), h('small', { text: paises ? `${paises} ${paises === 1 ? 'país' : 'países'} · ${new Set(inCharts.map(c => c.plataforma)).size} plataformas` : 'listas revisadas hoy' })], () => go('listas'), 'Listas'));
    // ideas para publicar
    const ti = todayIdeas();
    if (ti.length) g.append(tile('ideas', [tLabel('Para publicar hoy', 'megaphone'), h('b', { class: 'lg-mid', text: `${ti.length} ${ti.length === 1 ? 'idea' : 'ideas'}` }), h('small', { class: 'lg-clip2', text: ti[0].it.t })], () => openIdeas(), 'Ideas para publicar hoy'));
    // estudio
    g.append(tile('studio', [tLabel('Estudio', 'pen'), h('b', { class: 'lg-mid', text: 'Crea tu post' }), h('small', { text: 'Plantillas, fuentes y carrusel con los datos de hoy' })], () => go('estudio'), 'Estudio'));
    $$('.lg-tile', g).forEach((t, i) => reveal(t, i));
    return g;
  }
  function heroStat(label, v, sub) { const b = h('b', { class: 'num', 'data-v': isNum(v) ? v : '' , text: '—' }); return h('div', { class: 'yc-hero-stat' }, h('span', { text: label }), b, sub ? h('em', { text: sub }) : null); }
  function widget(plat, label, v, delta, sub, goTo, textValue) {
    const b = h('b', { class: 'num', text: textValue || '—' });
    const wd = h('div', { class: 'yc-widget', 'data-go': goTo || null, onclick: goTo ? () => go(goTo) : null },
      h('div', { class: 'yc-widget-head' }, pico(plat), h('span', { text: label })), b,
      isNum(delta) && delta !== 0 ? h('span', { class: 'yc-delta ' + (delta > 0 ? 'yc-up' : 'yc-down'), text: signed(delta) + ' vs anterior' }) : null,
      h('small', { text: sub || '' }));
    if (!textValue) countUp(b, v); else b.style.fontSize = '20px';
    return wd;
  }
  function drawHist() {
    const box = $('#hist-chart'); if (!box || !box.isConnected || current !== 'inicio') return;
    const pts = histSorted().filter(r => isNum(r[histKey])).map(r => ({ d: parseD(r.fecha), v: r[histKey] })).filter(p => p.d);
    const color = histKey.startsWith('youtube') ? '#ff0033' : histKey.startsWith('spotify') ? '#1db954' : histKey.startsWith('insta') ? '#e1306c' : histKey.startsWith('shaz') ? '#0a84ff' : '#af52de';
    lineChart(box, pts, color);
    $('#hist-note').textContent = pts.length <= 1 ? 'Solo hay un registro: la línea irá creciendo con cada actualización automática (3 al día).' : `Del ${dfmt(pts[0].d.toISOString())} al ${dfmt(pts[pts.length - 1].d.toISOString())}.`;
  }

  // Canciones
  const SF = { q: '', f: 'todas', sort: 'sp' };
  function renderCanciones() {
    const el = $('#p-canciones'); el.replaceChildren();
    el.append(h('h1', { class: 'yc-h1', text: 'Canciones' }), h('p', { class: 'yc-sub', text: 'Todas sus canciones y colaboraciones, también las nuevas. Toca una para ver todas sus cifras.' }));
    const inp = h('input', { type: 'search', placeholder: 'Buscar canción, artista o álbum', value: SF.q, 'aria-label': 'Buscar canción' });
    inp.addEventListener('input', () => { SF.q = inp.value; drawSongList(); });
    el.append(h('div', { class: 'yc-search' }, icon('search'), inp));
    const FILTERS = [['todas', 'Todas'], ['propias', 'Propias'], ['colab', 'Colaboraciones'], ['nuevas', 'Nuevas'], ['listas', 'En listas'], ['video', 'Con video'], ['2026', '2026']];
    const chips = h('div', { class: 'yc-chips' }, FILTERS.map(([k, l]) => h('button', { class: 'yc-chip', 'aria-pressed': String(SF.f === k), onclick: (e) => { SF.f = k; $$('.yc-chip', chips).forEach(c => c.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); drawSongList(); }, text: l })));
    const sel = h('select', { class: 'yc-select', 'aria-label': 'Ordenar' }, [['sp', 'Streams Spotify'], ['spd', 'Streams hoy'], ['yt', 'Vistas YouTube'], ['ytl', 'Likes YouTube'], ['comb', 'Total combinado'], ['sh', 'Shazams'], ['media', 'Media diaria Spotify'], ['fecha', 'Más recientes']].map(([k, l]) => h('option', { value: k, text: 'Orden: ' + l })));
    sel.value = SF.sort; sel.addEventListener('change', () => { SF.sort = sel.value; drawSongList(); });
    el.append(chips, h('div', { class: 'yc-toolbar' }, h('span', { class: 'yc-count', id: 'song-count' }), sel), h('div', { class: 'yc-list', id: 'song-list' }));
    drawSongList();
  }
  function drawSongList() {
    const list = $('#song-list'); if (!list) return;
    const q = SF.q.trim().toLowerCase();
    let rows = SONGS.filter(s => {
      if (SF.f === 'propias' && s.rol !== 'Principal') return false;
      if (SF.f === 'colab' && s.rol === 'Principal') return false;
      if (SF.f === 'nuevas' && !s.isNew) return false;
      if (SF.f === 'listas' && !s.hoy.length) return false;
      if (SF.f === 'video' && !s.yt) return false;
      if (SF.f === '2026' && !String(s.lanzamiento || '').startsWith('2026')) return false;
      if (q && !`${s.titulo} ${s.artistas} ${s.album || ''} ${s.yt ? s.yt.titulo : ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const m = METRICS[SF.sort];
    rows.sort((a, b) => { const x = m.get(a), y = m.get(b); if (!isNum(x)) return 1; if (!isNum(y)) return -1; return y - x; });
    const mx = Math.max(...rows.map(r => m.get(r)).filter(isNum), 1);
    list.replaceChildren(...rows.map((s, i) => songRow(s, { rank: i + 1, metric: SF.sort, bar: isNum(m.get(s)) && SF.sort !== 'fecha' ? (m.get(s) / mx * 100).toFixed(1) : null, barColor: SF.sort.startsWith('yt') ? 'var(--yt)' : SF.sort === 'sh' ? 'var(--shazam)' : 'var(--green)' })));
    if (!rows.length) list.append(h('p', { class: 'yc-empty', text: 'Nada coincide con la búsqueda.' }));
    $('#song-count').textContent = `${rows.length} de ${SONGS.length} canciones`;
    animateBars(list);
  }

  // Lanzamientos
  function releaseCard(s, wide) {
    const img = h('div', { class: 'yc-rel-img' });
    if (s.yt) img.append(ytThumb(s.yt.video_id, ['maxresdefault', 'sddefault', 'hqdefault'], { loading: 'lazy' }));
    else {
      img.classList.add('cov');
      const put = (u) => { if (!u) return; const bg = h('img', { class: 'blur', src: u, alt: '', loading: 'lazy', decoding: 'async' }), fg = h('img', { class: 'sq', src: u, alt: s.titulo, loading: 'lazy', decoding: 'async' }); img.prepend(bg, fg); };
      if (s.portada) put(hd(s.portada_hd || s.portada, 800)); else if (s.sp && s.sp.id) spCover(s).then(put);
    }
    if (s.isNew) img.append(h('span', { class: 'yc-badge green' }, h('span', { class: 'dot' }), `Nuevo · hace ${s.diasPublicado} días`));
    else if (s.lanzamiento) img.append(h('span', { class: 'yc-badge', text: dfmt(s.lanzamiento) }));
    if (s.yt) img.append(h('button', { class: 'yc-play', type: 'button', 'aria-label': 'Reproducir el video', onclick: (e) => { e.stopPropagation(); openSong(s.id, true, { play: true }); } }, icon('play')));
    const kv = h('div', { class: 'yc-kv' },
      kvItem('#1db954', 'Spotify', short2(s.sp.total), s.sp.fecha ? `dato ${dfmt(s.sp.fecha, { year: undefined })}` : 'sin dato'),
      kvItem('#ff0033', 'YouTube', short2(s.yt && s.yt.vistas), s.yt ? `${short(s.yt.likes)} likes${s.yt.live ? ' · en vivo' : ''}` : 'sin video'),
      kvItem('#1db954', 'Media/día Spotify', short(s.spMedia), s.diasSp ? `${s.diasSp} días con dato` : '—'),
      kvItem('#ff0033', 'Media/día YouTube', short(s.ytMedia), s.yt && s.yt.fecha ? `hasta ${dfmt(s.yt.fecha, { year: undefined })}` : '—'),
      kvItem('#0a84ff', 'Shazam', short(s.shazam && s.shazam.total), s.shazam ? 'total' : 'sin dato'),
      kvItem('#ffa200', 'Audiomack', short(s.audiomack && s.audiomack.reproducciones), s.audiomack ? 'reproducciones aprox.' : 'sin dato'),
      kvItem('#ff2d55', 'Mejor puesto', s.best ? '#' + s.best.p : '—', s.best ? s.best.t.replace(/^#\d+\s*/, '') : 'sin listas'),
      kvItem('#34c759', 'En listas hoy', s.hoy.length ? String(s.hoy.length) : 'Ninguna', s.hoy.length ? s.hoy.map(c => `#${c.posicion} ${c.plataforma} ${c.pais}`).join(' · ') : 'revisadas hoy'));
    return h('div', { class: 'yc-rel' + (wide ? ' wide' : ''), role: 'button', tabindex: '0', onclick: () => openSong(s.id), onkeydown: (e) => { if (e.key === 'Enter') openSong(s.id); }, style: wide ? 'max-width:100%' : null },
      img, h('div', { class: 'yc-rel-body' }, h('h3', { text: s.titulo }), h('p', { text: `${s.artistas} · ${s.rol}` }), kv));
  }
  // carrusel deslizable: con el dedo en el móvil, con flechas, arrastrando o con la rueda en el PC
  function slider(items) {
    const track = h('div', { class: 'yc-carousel lg-track' }, items);
    const dots = h('div', { class: 'lg-dots' }, items.map((_, i) => h('button', { type: 'button', 'aria-label': `Ir a ${i + 1}`, onclick: () => to(i) })));
    const step = () => { const c = track.children[0]; return c ? c.getBoundingClientRect().width + 12 : track.clientWidth; };
    const to = (i) => { const c = track.children[Math.max(0, Math.min(items.length - 1, i))]; if (c) track.scrollTo({ left: c.offsetLeft - track.offsetLeft - 2, behavior: 'smooth' }); };
    const prev = h('button', { class: 'lg-arrow prev', type: 'button', 'aria-label': 'Anterior', onclick: () => track.scrollBy({ left: -step(), behavior: 'smooth' }) }, icon('chev'));
    const next = h('button', { class: 'lg-arrow next', type: 'button', 'aria-label': 'Siguiente', onclick: () => track.scrollBy({ left: step(), behavior: 'smooth' }) }, icon('chev'));
    const sync = () => {
      const max = track.scrollWidth - track.clientWidth - 4;
      prev.disabled = track.scrollLeft <= 4; next.disabled = track.scrollLeft >= max;
      const i = Math.round(track.scrollLeft / Math.max(1, step()));
      [...dots.children].forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    };
    track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    // arrastrar con el ratón
    let dx = null, sl = 0, moved = false;
    track.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; dx = e.clientX; sl = track.scrollLeft; moved = false; track.classList.add('drag'); });
    addEventListener('pointermove', (e) => { if (dx == null) return; const d = e.clientX - dx; if (Math.abs(d) > 5) moved = true; track.scrollLeft = sl - d; });
    addEventListener('pointerup', () => { if (dx == null) return; dx = null; track.classList.remove('drag'); });
    track.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    requestAnimationFrame(sync); setTimeout(sync, 400);
    return h('div', { class: 'lg-slider' }, track, prev, next, dots);
  }
  const kvItem = (color, label, value, sub) => h('div', null, h('span', null, h('i', { style: `background:${color}` }), label), h('b', { text: value }), h('small', { text: sub || '' }));
  function renderLanz() {
    const el = $('#p-lanzamientos'); el.replaceChildren();
    const rel = releases();
    el.append(h('h1', { class: 'yc-h1', text: 'Lanzamientos' }), h('p', { class: 'yc-sub', text: 'Sus 5 últimos temas con todas sus cifras. Cuando salga uno nuevo, aparece aquí solo.' }));
    el.append(slider(rel.slice(0, 5).map(s => releaseCard(s))));
    el.append(section('¿Cuál arrancó mejor?', 'media diaria desde que salió'));
    const recent = rel.filter(s => String(s.lanzamiento) >= '2025-01-01');
    el.append(h('div', { class: 'yc-grid' },
      card(h('b', { text: 'Spotify · streams por día' }), h('p', { class: 'yc-note', style: 'margin:2px 0 12px', text: 'Streams totales ÷ días desde la salida (hasta la fecha del dato).' }),
        hbars(recent.slice().sort((a, b) => (b.spMedia || 0) - (a.spMedia || 0)), { label: s => s.titulo, value: s => s.spMedia, color: '#1db954', onclick: s => openSong(s.id) })),
      card(h('b', { text: 'YouTube · vistas por día' }), h('p', { class: 'yc-note', style: 'margin:2px 0 12px', text: 'Vistas del video ÷ días desde que se publicó.' }),
        hbars(recent.slice().sort((a, b) => (b.ytMedia || 0) - (a.ytMedia || 0)), { label: s => s.titulo, value: s => s.ytMedia, color: '#ff0033', onclick: s => openSong(s.id) }))));
    el.append(section('Línea de tiempo', `${rel.length} temas con fecha`));
    const tl = h('div', { class: 'yc-timeline' });
    let lastY = '';
    for (const s of rel) {
      const y = String(s.lanzamiento).slice(0, 7);
      const item = h('div', { class: 'yc-tl' });
      if (y !== lastY) { item.append(h('div', { class: 'yc-tl-date', text: parseD(s.lanzamiento).toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }) })); lastY = y; }
      item.append(h('div', { class: 'yc-list' }, songRow(s, { metric: 'comb' })));
      tl.append(reveal(item));
    }
    el.append(tl);
  }

  // Listas
  const LF = { plat: '', dentro: false, q: '' };
  function renderListas() {
    const el = $('#p-listas'); el.replaceChildren();
    const C = DATA.charts || [];
    el.append(h('h1', { class: 'yc-h1', text: 'Listas' }), h('p', { class: 'yc-sub', text: 'Spotify, Apple Music, YouTube, Shazam, Deezer e iTunes en Latinoamérica, España, EE. UU. y Europa, más las playlists oficiales.' }));
    const plats = ['Spotify', 'Apple Music', 'YouTube', 'Shazam', 'Deezer', 'iTunes'];
    el.append(h('div', { class: 'yc-widgets' }, plats.map(p => {
      const rows = C.filter(c => c.plataforma === p); const inn = rows.filter(c => c.posicion != null);
      const k = PLAT_BY_NAME[p];
      return h('div', { class: 'yc-widget', 'data-go': '1', onclick: () => { LF.plat = p; drawCharts(); } },
        h('div', { class: 'yc-widget-head' }, pico(k), h('span', { text: p })),
        h('b', { text: `${inn.length}/${new Set(rows.map(r => r.pais)).size}` }),
        h('small', { text: inn.length ? `mejor #${Math.min(...inn.map(r => r.posicion))}` : 'fuera de todas' }));
    })));
    const seg = h('div', { class: 'yc-seg', id: 'chart-seg' }, [['', 'Todas'], ...plats.map(p => [p, p])].map(([k, l]) => h('button', { 'aria-pressed': String(LF.plat === k), 'data-k': k, onclick: () => { LF.plat = k; drawCharts(); }, text: l })));
    const tog = h('button', { class: 'yc-chip', 'aria-pressed': String(LF.dentro), onclick: (e) => { LF.dentro = !LF.dentro; e.currentTarget.setAttribute('aria-pressed', String(LF.dentro)); drawCharts(); }, text: 'Solo dentro' });
    const inp = h('input', { type: 'search', placeholder: 'Buscar país o canción', 'aria-label': 'Buscar lista', value: LF.q || '' }); inp.addEventListener('input', () => { LF.q = inp.value; drawCharts(); });
    el.append(section('Hoy', 'cada lista con su fecha'), h('div', { class: 'yc-toolbar' }, seg, tog), h('div', { class: 'yc-search' }, icon('search'), inp), h('div', { class: 'yc-list', id: 'chart-list' }),
      h('p', { class: 'yc-note', text: '«Revisado hasta» = último puesto que se pudo leer. Las listas de Apple Music y Shazam no publican fecha: se muestra el día de consulta.' }));
    drawCharts();
    renderPlaylists(el);
    // mejor puesto por país
    const best = new Map();
    for (const s of SONGS) for (const p of s.picos || []) { const cur = best.get(p.pais); if (!cur || p.pico < cur.pico) best.set(p.pais, { pais: p.pais, cc: p.codigo, pico: p.pico, s, fecha: p.fecha }); }
    const rows = [...best.values()].sort((a, b) => a.pico - b.pico);
    el.append(section('Su mejor puesto en cada país', `Spotify Top 200 diario · ${rows.length} mercados`));
    el.append(card(hbars(rows, { lead: r => flagEl(r.cc, 'sm'), label: r => r.pais, value: r => 201 - r.pico, fmt: v => '#' + (201 - v), color: r => r.pico <= 10 ? '#34c759' : r.pico <= 50 ? '#0a84ff' : 'var(--text3)', onclick: r => openSong(r.s.id), max: 40 }),
      h('p', { class: 'yc-note', text: 'Toca un país para ver la canción con la que lo logró.' })));
    el.append(section('Picos de cada canción', 'mejor puesto por país'));
    const songsWithPeaks = SONGS.filter(s => (s.picos || []).length).sort((a, b) => Math.min(...a.picos.map(p => p.pico)) - Math.min(...b.picos.map(p => p.pico)));
    el.append(h('div', { class: 'yc-list' }, songsWithPeaks.map(s => {
      const top = s.picos.slice().sort((a, b) => a.pico - b.pico);
      return h('div', { class: 'yc-row', onclick: () => openSong(s.id) }, art(s), h('div', { class: 'yc-row-main' }, h('b', { text: s.titulo }), h('small', { text: top.slice(0, 6).map(p => `${p.codigo === 'WW' ? 'Global' : p.codigo} #${p.pico}`).join('  ') })),
        h('div', { class: 'yc-row-meta' }, h('b', { text: '#' + top[0].pico }), h('small', { text: `${top.length} países` })), icon('chev', 'yc-chev'));
    })));
  }
  function drawCharts() {
    const list = $('#chart-list'); if (!list) return;
    $$('#chart-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === LF.plat)));
    const q = LF.q.trim().toLowerCase();
    const rows = (DATA.charts || []).filter(c => (!LF.plat || c.plataforma === LF.plat) && (!LF.dentro || c.posicion != null) && (!q || `${c.pais} ${c.cancion || ''}`.toLowerCase().includes(q)))
      .sort((a, b) => (a.posicion == null) - (b.posicion == null) || (a.posicion || 0) - (b.posicion || 0) || a.plataforma.localeCompare(b.plataforma) || a.pais.localeCompare(b.pais, 'es'));
    list.replaceChildren(...rows.map(c => {
      const s = c.cancion ? SONGS.find(x => x.b === base(c.cancion)) : null;
      return h('div', { class: 'yc-row', onclick: s ? () => openSong(s.id) : null, style: s ? null : 'cursor:default' },
        flagEl(ccOf(c.pais, c.codigo)),
        h('div', { class: 'yc-row-main' }, h('b', { text: `${c.pais} · ${c.plataforma}` }), h('small', { text: `${c.lista} · ${c.cancion || 'No aparece'} · ${c.fecha_lista ? dfmt(c.fecha_lista) : 'consultada ' + dfmt(c.consultado)}${c.revisado_hasta ? ' · revisado hasta #' + c.revisado_hasta : ''}` })),
        h('div', { class: 'yc-row-meta' }, c.posicion != null ? h('b', { style: 'color:var(--up)', text: '#' + c.posicion }) : h('b', { style: 'color:var(--text3)', text: 'Fuera' }), h('small', { text: c.cambio || '' })));
    }));
    if (!rows.length) list.append(h('p', { class: 'yc-empty', text: 'Nada coincide.' }));
  }

  // Álbumes
  function renderAlbumes() {
    const el = $('#p-albumes'); el.replaceChildren();
    el.append(h('h1', { class: 'yc-h1', text: 'Discografía' }), h('p', { class: 'yc-sub', text: 'Cada disco con su tracklist completo y lo que ha generado: streams en Spotify y vistas de sus vídeos en YouTube.' }));
    const albums = (DATA.albumes || []).map(a => {
      const tracks = SONGS.filter(s => s.album === a.album);
      a = Object.assign({}, a, { disco: a.tracks || [] });
      const ytv = tracks.reduce((t, s) => t + (s.yt && isNum(s.yt.vistas) ? s.yt.vistas : 0), 0);
      return Object.assign({}, a, { tracks, ytv, comb: (a.spotify_streams || 0) + ytv });
    }).sort((a, b) => b.comb - a.comb);
    el.append(card(h('b', { text: 'Total por álbum (Spotify + YouTube)' }), h('p', { class: 'yc-note', style: 'margin:2px 0 12px', text: 'Verde: álbumes suyos. Azul: álbumes de otros artistas donde colabora (solo cuentan sus canciones).' }),
      hbars(albums, { label: a => a.album, value: a => a.comb, color: a => String(a.tipo).startsWith('Álbum propio') ? '#1db954' : '#0a84ff' })));
    for (const a of albums) {
      const c = h('div', { class: 'yc-card reveal', style: 'margin-top:12px;scroll-margin-top:90px', 'data-alb': a.album });
      c.append(h('div', { style: 'display:flex;gap:12px;align-items:center;margin-bottom:12px;cursor:pointer', role: 'button', tabindex: '0', onclick: () => openAlbum(a.album) },
        albumCover(a, 96),
        h('div', { style: 'min-width:0' }, h('b', { style: 'font-size:19px;display:block', text: a.album }), h('small', { style: 'color:var(--text2)', text: `${a.artista_principal || '—'} · ${a.tipo}${a.fecha_lanzamiento ? ' · ' + dfmt(a.fecha_lanzamiento) : ''}` }))));
      c.append(h('div', { class: 'yc-stats' },
        stat('Spotify total', full(a.spotify_streams), `dato ${dfmt(a.fecha_dato)}`), stat('Spotify hoy', full(a.spotify_diarios), 'streams/día'),
        stat('YouTube', a.ytv ? full(a.ytv) : '—', `${a.tracks.filter(t => t.yt).length} de ${a.canciones || a.tracks.length} con vídeo`), stat('Canciones', a.canciones || (a.tracks.length || '—'), a.tracks.length ? `${a.tracks.length} en el catálogo` : '')));
      if ((a.disco || []).length) {
        const totMs = a.disco.reduce((t, x) => t + (x.duracion_ms || 0), 0);
        c.append(h('div', { class: 'yc-tl-head' }, h('b', { text: 'Disco completo' }), h('small', { text: `${a.disco.length} canciones${totMs ? ' · ' + Math.round(totMs / 60000) + ' min' : ''}` })));
        c.append(h('div', { class: 'yc-list yc-tracklist', style: 'box-shadow:none' }, a.disco.map(x => {
          const s = SONGS.find(z => normT(z.titulo) === normT(x.titulo));
          const dur = x.duracion_ms ? Math.floor(x.duracion_ms / 60000) + ':' + String(Math.round(x.duracion_ms / 1000) % 60).padStart(2, '0') : '';
          return h('div', { class: 'yc-row', style: s ? null : 'cursor:default', onclick: s ? () => openSong(s.id) : null },
            h('span', { class: 'yc-rank', text: x.n || '' }),
            h('div', { class: 'yc-row-main' }, h('b', { text: x.titulo }), h('small', { text: `${x.artistas || ''}${dur ? ' · ' + dur : ''}` })),
            h('div', { class: 'yc-row-meta' }, h('b', { text: s && isNum(s.sp.total) ? short(s.sp.total) : '—' }), h('small', { text: s && s.yt ? `${short(s.yt.vistas)} en YouTube` : 'streams Spotify' })),
            s ? icon('chev', 'yc-chev') : null);
        })));
      } else if (a.tracks.length) c.append(h('div', { class: 'yc-list', style: 'margin-top:12px;box-shadow:none' }, a.tracks.sort((x, y) => (y.combinado || 0) - (x.combinado || 0)).map(s => songRow(s, { metric: 'comb' }))));
      c.append(h('button', { class: 'yc-btn sec', type: 'button', style: 'margin-top:12px', onclick: () => openAlbum(a.album), text: 'Ver ficha completa del disco' }));
      if (a.apple_url) c.append(h('a', { class: 'yc-linkbtn', href: a.apple_url, target: '_blank', rel: 'noopener', text: 'Escuchar en Apple Music ↗' }));
      c.append(h('p', { class: 'yc-src', text: 'Fuente: ' + (a.fuente || 'kworb.net') + '. Apple Music y Deezer no publican reproducciones.' }));
      el.append(c); reveal(c);
    }
  }
  // ---------- frescura de cada dato: de hoy, de ayer o atrasado ----------
  function freshTag(date, prefix) {
    const d = date ? days(date, today()) : null;
    if (d == null) return h('span', { class: 'lg-fresh old', text: `${prefix || 'Dato'} sin fecha` });
    const cls = d <= 0 ? 'hoy' : d === 1 ? 'ayer' : d <= 3 ? 'reciente' : 'old';
    const txt = d <= 0 ? 'de hoy' : d === 1 ? 'de ayer' : `del ${dfmt(date, { year: undefined })} · hace ${d} días`;
    return h('span', { class: 'lg-fresh ' + cls, title: dfmt(date) }, h('i'), `${prefix || 'Dato'} ${txt}`);
  }
  const modeDate = (arr) => { const c = {}; arr.filter(Boolean).forEach(x => { c[x] = (c[x] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] || null; };

  // ---------- lo más escuchado hoy (al tocar el bloque del inicio) ----------
  function openTopHoy(tab) {
    tab = tab || 'sp';
    const TABS = {
      sp: { label: 'Spotify hoy', get: s => s.sp.diarios, date: s => s.sp.fecha, unit: 'streams', src: 'kworb.net · streams diarios de Spotify (se publican una vez al día)' },
      yt: { label: 'YouTube ayer', get: s => s.yt && (isNum(s.yt.ayer) ? s.yt.ayer : ytDaily(s)), date: s => s.yt && s.yt.fecha, unit: 'vistas', src: 'kworb.net y YouTube · vistas del último día' },
      racha: { label: 'En racha', get: s => isNum(s.sp.diarios) && isNum(s.spMedia) && s.spMedia > 0 && s.sp.diarios >= 20000 ? s.sp.diarios / s.spMedia : null, date: s => s.sp.fecha, unit: '× su media', src: 'Streams de hoy ÷ su media diaria desde que salió: más de 1× = está sonando más que nunca' }
    };
    const T = TABS[tab];
    const list = SONGS.filter(x => isNum(T.get(x))).sort((a, b) => T.get(b) - T.get(a)).slice(0, 30);
    const body = h('div');
    const seg = h('div', { class: 'yc-seg', style: 'margin-bottom:12px' }, Object.entries(TABS).map(([k, v]) => h('button', { 'aria-pressed': String(k === tab), onclick: () => openTopHoy(k), text: v.label })));
    const fecha = modeDate(list.map(T.date));
    body.append(seg, h('div', { class: 'lg-topnote' }, freshTag(fecha, 'Datos'), h('small', { text: T.src })));
    const fmtV = (v) => tab === 'racha' ? v.toFixed(1).replace('.', ',') + '×' : short(v);
    // podio
    body.append(h('div', { class: 'lg-podium' }, list.slice(0, 3).map((x, i) => {
      const t = h('div', { class: 'lg-pod p' + (i + 1), role: 'button', tabindex: '0', onclick: () => openSong(x.id) },
        h('span', { class: 'lg-pod-n', text: String(i + 1) }), h('div', { class: 'lg-pod-cov' }, art(x, 200)),
        h('b', { class: 'lg-clip', text: x.titulo }), h('small', { class: 'lg-clip', text: x.artistas || AN() }),
        h('em', { text: fmtV(T.get(x)) + (tab === 'racha' ? '' : ' ' + T.unit) }));
      tint(t, coverOf(x), x.titulo); return t;
    })));
    const mx = list[0] ? T.get(list[0]) : 1;
    body.append(h('div', { class: 'yc-list', style: 'margin-top:12px' }, list.slice(3).map((x, i) => h('div', { class: 'yc-row', onclick: () => openSong(x.id) },
      h('span', { class: 'yc-rank', text: String(i + 4) }), art(x),
      h('div', { class: 'yc-row-main' }, h('b', { text: x.titulo }), h('small', { text: [x.artistas, T.date(x) ? `dato ${dfmt(T.date(x), { year: undefined })}` : ''].filter(Boolean).join(' · ') }),
        h('div', { class: 'yc-bar' }, h('i', { 'data-w': (T.get(x) / mx * 100).toFixed(1) }))),
      h('div', { class: 'yc-row-meta' }, h('b', { text: fmtV(T.get(x)) }), h('small', { text: tab === 'racha' ? `${short(x.sp.diarios)}/día` : T.unit })), icon('chev', 'yc-chev')))));
    const top5 = list.slice(0, 5);
    const cap = `🔥 Lo más escuchado de @${AU()} ${tab === 'yt' ? 'en @youtube' : 'en @spotify'} ${tab === 'racha' ? 'ahora mismo (en racha)' : 'hoy'}:\n\n` + top5.map((x, i) => `${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]} ${x.titulo.replace(/\s*\((with|feat\.)[^)]*\)/i, '')} — ${tab === 'racha' ? fmtV(T.get(x)) + ' su media' : full(T.get(x)) + ' ' + T.unit}`).join('\n') + `\n\n📊 Datos: ${tab === 'yt' ? 'YouTube' : 'kworb.net'} · ${dfmt(fecha)}\n#${AH()}${mkTag()}`;
    body.append(h('div', { class: 'lg-cmp-act' },
      h('button', { class: 'yc-btn', type: 'button', onclick: () => copy(cap), text: 'Copiar caption del top 5' }),
      h('button', { class: 'yc-btn sec', type: 'button', onclick: () => { closeSheet(); setTimeout(() => toStudio({ plantilla: 'top5', listaTitulo: tab === 'yt' ? 'LO MÁS VISTO AYER EN YOUTUBE' : tab === 'racha' ? 'LO QUE ESTÁ EN RACHA' : 'LO MÁS ESCUCHADO HOY', etiqueta: tab === 'yt' ? 'YOUTUBE' : 'SPOTIFY', lista: top5.map(x => `${x.titulo.replace(/\s*\((with|feat\.)[^)]*\)/i, '')} | ${fmtV(T.get(x))}`).join('\n'), imagen: coverOf(top5[0]) }), 250); }, text: 'Hacer post Top 5' })));
    openSheet('Lo más escuchado', body);
    animateBars(body); glideSoon();
  }

  // ---------- kit para posts de cada canción ----------
  function bestPositions(s) {
    const out = new Map();
    const add = (o) => { const k = o.plat + '|' + o.pais + '|' + o.lista; const cur = out.get(k); if (!cur || o.p < cur.p || (o.p === cur.p && o.hoy)) out.set(k, Object.assign({}, cur || {}, o)); };
    for (const p of s.picos || []) if (isNum(p.pico)) add({ p: p.pico, plat: 'Spotify', pais: p.pais, lista: 'Top 200 diario', fecha: p.fecha, cc: p.codigo, tipo: 'pico' });
    for (const x of s.listas || []) if (isNum(x.puesto)) add({ p: x.puesto, plat: x.plataforma, pais: x.pais || 'Global', lista: String(x.lista || '').replace(/\s*\(.*?\)/, ''), fecha: x.fecha, cc: ccOf(x.pais), tipo: 'pico' });
    for (const c of s.hoy || []) { const k = c.plataforma + '|' + c.pais + '|' + c.lista; const prev = out.get(k); add({ p: Math.min(c.posicion, prev ? prev.p : Infinity), plat: c.plataforma, pais: c.pais, lista: c.lista, fecha: prev ? prev.fecha : c.fecha_lista, cc: ccOf(c.pais, c.codigo) }); out.get(k).hoy = c.posicion; out.get(k).hoyFecha = c.fecha_lista || c.consultado; }
    return [...out.values()].sort((a, b) => a.p - b.p || (b.hoy ? 1 : 0) - (a.hoy ? 1 : 0));
  }
  function postIdeas(s) {
    const I = [], tt = s.titulo.replace(/\s*\((with|feat\.)[^)]*\)/i, '');
    const nx = nextHito(s.sp.total), d = s.sp.diarios || s.spMedia;
    if (nx && d) { const dd = Math.ceil((nx - s.sp.total) / d); if (dd <= 30) I.push({ ic: dd <= 1 ? '🔥' : '⏳', t: dd <= 1 ? `¡A punto! «${tt}» ya estaría pasando los ${short(nx)} en Spotify (compruébalo en la app antes de publicar)` : `Cuenta atrás: «${tt}» llegará a ${short(nx)} en ≈ ${dd} días`, pre: { plantilla: 'meta', titular: `${tt} va a por los ${short(nx)}`, etiqueta: 'PRÓXIMO HITO', numero: `FALTAN ${short(nx - s.sp.total)}`, numeroTxt: `≈ ${dd} ${dd === 1 ? 'DÍA' : 'DÍAS'} A ESTE RITMO`, progreso: s.sp.total / nx * 100, imagen: coverOf(s) }, cap: `⏳ «${tt}» de @${AU()} está a solo ${full(nx - s.sp.total)} streams de los ${short(nx)} en @spotify. Al ritmo de ${short(d)} al día, lo logrará en unos ${dd} días 🔥` }); }
    const past = HITOS.filter(x => x <= (s.sp.total || 0)).pop();
    if (past && isNum(s.sp.diarios) && s.sp.total - s.sp.diarios * 2 < past) I.push({ ic: '🏆', t: `Acaba de superar los ${short(past)} en Spotify`, pre: { plantilla: 'hito', titular: tt, etiqueta: 'NUEVO RÉCORD', numero: short(past).replace(/\s/g, ''), numeroTxt: 'STREAMS EN SPOTIFY', imagen: coverOf(s) }, cap: `🏆 «${tt}» de @${AU()} supera los ${short(past)} de streams en @spotify 💿🔥` });
    const bp = bestPositions(s);
    const best = bp[0];
    if (best && best.hoy) I.push({ ic: '📈', t: `Hoy está Top ${best.hoy} en ${best.plat} ${best.pais}${s.hoy.length > 1 ? ` (y en ${s.hoy.length - 1} listas más)` : ''}`, pre: { plantilla: 'charts', titular: tt, etiqueta: String(best.lista).toUpperCase(), numero: '#' + best.hoy, numeroTxt: `${best.plat} · ${best.pais}`.toUpperCase(), imagen: coverOf(s) }, cap: `📈 «${tt}» de @${AU()} está hoy en el #${best.hoy} de ${best.plat} ${best.pais}${s.hoy.length > 1 ? ` y en ${s.hoy.length} listas en total` : ''} 🔥` });
    if (s.rank_spd && s.rank_spd <= 3) I.push({ ic: '🔥', t: `Es su canción nº ${s.rank_spd} más escuchada hoy (${short(s.sp.diarios)} streams)`, pre: { plantilla: 'titular', titular: `${tt} *ARRASA* HOY`, etiqueta: `${short(s.sp.diarios)} STREAMS HOY`, imagen: coverOf(s) }, cap: `🔥 «${tt}» es hoy la ${s.rank_spd === 1 ? 'canción más escuchada' : `${s.rank_spd}ª canción más escuchada`} de @${AU()} en @spotify con ${full(s.sp.diarios)} streams en un día` });
    const pls = songPlaylists(s.id);
    if (pls.length) I.push({ ic: '📋', t: `Está en ${pls.length} ${pls.length === 1 ? 'playlist oficial' : 'playlists oficiales'}: Top ${pls[0].t.pos} en «${plName(pls[0].p)}»`, pre: { plantilla: 'charts', titular: tt, etiqueta: plName(pls[0].p).toUpperCase(), numero: '#' + pls[0].t.pos, numeroTxt: `PLAYLIST DE ${pls[0].p.plataforma.toUpperCase()}`, imagen: coverOf(s) }, cap: `📋 «${tt}» de @${AU()} está en el #${pls[0].t.pos} de la playlist «${plName(pls[0].p)}» de ${pls[0].p.plataforma}${pls.length > 1 ? ` y en ${pls.length - 1} playlists oficiales más` : ''} 💿` });
    if (s.yt && isNum(s.yt.vistas)) { const yd = ytDaily(s); if (isNum(yd) && yd > 50000) I.push({ ic: '▶️', t: `Su vídeo suma ${short(yd)} vistas al día (${short(s.yt.vistas)} en total)`, pre: { plantilla: 'versus', titular: tt, vsA: 'SPOTIFY', vsANum: short(s.sp.total).replace(/\s/g, ''), vsB: 'YOUTUBE', vsBNum: short(s.yt.vistas).replace(/\s/g, ''), subtitulo: '¿DÓNDE LO ESCUCHAS TÚ?', imagen: coverOf(s) }, cap: `▶️ El vídeo de «${tt}» de @${AU()} ya tiene ${full(s.yt.vistas)} vistas en @youtube y suma unas ${short(yd)} al día 🔥` }); }
    if (s.isNew && s.diasPublicado != null) I.push({ ic: '🆕', t: `Estreno de hace ${s.diasPublicado} días: ${short(s.combinado)} reproducciones entre plataformas`, pre: { plantilla: 'portada', titular: tt, etiqueta: 'NUEVO LANZAMIENTO', subtitulo: `${short(s.combinado)} REPRODUCCIONES EN ${s.diasPublicado} DÍAS`, imagen: coverOf(s) }, cap: `🆕 «${tt}» de @${AU()} suma ${full(s.combinado)} reproducciones entre @spotify y @youtube en solo ${s.diasPublicado} días 🚀` });
    return I;
  }
  function ideaRow(it, s) {
    const sig = `${mkSig()}\n\n#${AH()}${mkTag()}`;
    return h('div', { class: 'lg-idea' }, h('span', { class: 'lg-idea-ic', text: it.ic }),
      h('div', { class: 'lg-idea-main' }, h('b', { text: it.t }), s ? h('small', { class: 'lg-clip', text: s.titulo }) : null,
        h('div', { class: 'lg-idea-act' },
          h('button', { class: 'yc-chip', type: 'button', onclick: (e) => { e.stopPropagation(); copy(it.cap + sig); }, text: 'Copiar caption' }),
          h('button', { class: 'yc-chip', type: 'button', onclick: (e) => { e.stopPropagation(); closeSheet(); setTimeout(() => toStudio(it.pre), 250); }, text: 'Hacer post' }))));
  }
  function songPostKit(s) {
    const box = h('div', { class: 'lg-kit' });
    box.append(h('h3', { class: 'lg-sh', text: 'Para tu post' }));
    if (s.hoy.length || songPlaylists(s.id).length) box.append(h('button', { class: 'yc-btn lg-panbtn', type: 'button', onclick: () => {
      const R = songPanels(s.id, ['spotify', 'apple', 'youtube', 'shazam'].filter(k => s.hoy.some(c => c.plataforma === { spotify: 'Spotify', apple: 'Apple Music', youtube: 'YouTube', shazam: 'Shazam' }[k])).concat(songPlaylists(s.id).length ? ['playlists'] : []).slice(0, 4), 6);
      if (R) { closeSheet(); setTimeout(() => toStudio(Object.assign({ plantilla: 'paneles', panTema: s.id }, R)), 250); }
    } }, icon('chart'), 'Post con sus listas por plataforma'));
    const ideas = postIdeas(s);
    if (ideas.length) box.append(h('div', { class: 'yc-card lg-ideas' }, h('span', { class: 'lg-lab', text: 'Ideas con sus cifras de hoy' }), ideas.map(it => ideaRow(it))));
    const bp = bestPositions(s);
    if (bp.length) box.append(h('div', { class: 'yc-card lg-best' }, h('span', { class: 'lg-lab', text: `Sus mejores puestos en listas (${bp.length})` }),
      bp.slice(0, 10).map(x => h('div', { class: 'lg-best-r' }, flagEl(x.cc, 'sm'), h('b', { class: 'lg-best-p', text: '#' + x.p }),
        h('div', { class: 'lg-best-m' }, h('span', { text: `${x.plat} · ${x.pais}` }), h('small', { text: [x.lista, x.fecha ? (x.hoy && x.hoy !== x.p ? `pico el ${dfmt(x.fecha)}` : dfmt(x.fecha)) : ''].filter(Boolean).join(' · ') })),
        x.hoy ? h('span', { class: 'lg-now-tag', text: `hoy #${x.hoy}` }) : null))));
    const pls = songPlaylists(s.id);
    if (pls.length) box.append(h('div', { class: 'yc-card lg-best' }, h('span', { class: 'lg-lab', text: `En playlists oficiales ahora (${pls.length})` }),
      pls.map(({ p, t }) => h('div', { class: 'lg-best-r', role: 'button', tabindex: '0', onclick: () => window.open(p.url, '_blank', 'noopener') }, h('span', { class: 'lg-pl-ic' }, pico(PLAT_BY_NAME[p.plataforma] || 'spotify')), h('b', { class: 'lg-best-p', text: '#' + t.pos }),
        h('div', { class: 'lg-best-m' }, h('span', { text: plName(p) }), h('small', { text: [p.plataforma, t.antes ? (t.antes > t.pos ? `sube desde #${t.antes}` : t.antes < t.pos ? `baja desde #${t.antes}` : 'se mantiene') : 'nueva entrada', p.consultado ? `revisada ${dfmt(p.consultado, { year: undefined })}` : ''].filter(Boolean).join(' · ') })),
        t.antes && t.antes > t.pos ? h('span', { class: 'lg-now-tag up', text: `▲${t.antes - t.pos}` }) : null))));
    // captions completos
    const capBox = h('div', { class: 'yc-card lg-caps' }, h('span', { class: 'lg-lab', text: 'Caption completo' }));
    let est = 'largo';
    const pre = h('p', { class: 'lg-cap-txt' });
    const draw = () => { pre.textContent = songCaption(s, est); };
    const sg = h('div', { class: 'yc-seg' }, [['largo', 'Largo'], ['corto', 'Corto']].map(([k, l]) => h('button', { 'aria-pressed': String(k === est), onclick: (e) => { est = k; $$('button', sg).forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); draw(); glideSoon(); }, text: l })));
    draw();
    capBox.append(sg, pre, h('div', { class: 'lg-cmp-act' }, h('button', { class: 'yc-btn', type: 'button', onclick: () => copy(pre.textContent), text: 'Copiar caption' }), h('button', { class: 'yc-btn sec', type: 'button', onclick: () => copy(songText(s)), text: 'Copiar ficha con datos' })));
    box.append(capBox);
    return box;
  }
  // ---------- paneles por plataforma para el Estudio ----------
  function studioSongs() {
    return SONGS.slice().sort((a, b) => (b.hoy.length - a.hoy.length) || ((b.sp.diarios || 0) - (a.sp.diarios || 0))).slice(0, 150)
      .map(x => ({ id: x.id, label: `${x.titulo}${x.hoy.length ? ` · en ${x.hoy.length} ${x.hoy.length === 1 ? 'lista' : 'listas'}` : ''}` }));
  }
  function songPanels(id, kinds, max) {
    const s = songById(id); if (!s) return null;
    max = max || 6;
    const P = [], vacios = [], names = [];
    const dd = (d) => d ? dfmt(d, { year: undefined }).toUpperCase() : '';
    const cc2 = (c) => { const k = ccOf(c.pais, c.codigo); return k && k.length === 2 && k !== 'WW' ? k.toUpperCase() : 'GL'; };
    const DEF = {
      spotify: ['Spotify Top 200', 'Spotify', 'SPOTIFY TOP 200'], apple: ['Apple Music Top 200', 'Apple Music', 'APPLE MUSIC'],
      youtube: ['YouTube', 'YouTube', 'YOUTUBE'], shazam: ['Shazam Top 200', 'Shazam', 'SHAZAM']
    };
    for (const k of kinds) {
      if (DEF[k]) {
        const [title, plat, short_] = DEF[k];
        const seen = new Set();
        const L = s.hoy.filter(c => c.plataforma === plat).sort((a, b) => a.posicion - b.posicion).filter(c => { if (seen.has(c.pais)) return false; seen.add(c.pais); return true; });
        if (!L.length) { vacios.push(title); continue; }
        const f = modeDate(L.map(c => c.fecha_lista || c.consultado));
        const t2 = k === 'youtube' ? (L.every(c => String(c.lista).startsWith('Top')) ? 'YouTube Charts' : 'YouTube Tendencias') : title;
        P.push(`## ${t2} | ${k} | ${(plat === 'Apple Music' || plat === 'Shazam') ? 'CONSULTADO ' : ''}${dd(f)}\n` + L.slice(0, max).map(c => `${cc2(c)} ${c.pais} | #${c.posicion}`).join('\n'));
        names.push(short_);
      } else if (k === 'mejores') {
        const L = bestPositions(s).filter(x => x.plat === 'Spotify');
        if (!L.length) { vacios.push('Mejores puestos'); continue; }
        P.push(`## Mejores puestos | mejores | SPOTIFY TOP 200\n` + L.slice(0, max).map(x => `${x.cc && x.cc.length === 2 && x.cc !== 'WW' ? x.cc.toUpperCase() : 'GL'} ${x.pais} | #${x.p}`).join('\n'));
        names.push('RÉCORDS');
      } else if (k === 'playlists') {
        const L = songPlaylists(s.id);
        if (!L.length) { vacios.push('Playlists'); continue; }
        P.push(`## Playlists oficiales | playlists | ${dd(modeDate(L.map(x => x.p.consultado)) || DATA.generado)}\n` + L.slice(0, max).map(({ p, t }) => `${p.plataforma === 'Apple Music' ? 'AM' : p.plataforma === 'Deezer' ? 'DZ' : 'SP'} ${plName(p).replace(/ on Apple Music$/, '')} | #${t.pos}`).join('\n'));
        names.push('PLAYLISTS');
      }
    }
    if (!P.length) return null;
    const tt = s.titulo.replace(/\s*\((with|feat\.)[^)]*\)/i, '');
    return { paneles: P.join('\n'), titular: `${tt.toUpperCase()} EN LOS *CHARTS*`, etiqueta: names.join(' & '), imagen: bigCover(s) || coverOf(s), vacios };
  }

  // ---------- ideas para publicar hoy (todas las canciones) ----------
  function todayIdeas() {
    const out = [];
    const cand = SONGS.filter(x => x.hoy.length || (x.rank_spd && x.rank_spd <= 10) || x.isNew || (nextHito(x.sp.total) && (x.sp.diarios || 0) > 0));
    for (const x of cand) for (const it of postIdeas(x)) {
      const w = { '🏆': 100, '⏳': 60, '📈': 70, '🆕': 65, '🔥': 55, '📋': 40, '▶️': 35 }[it.ic] || 10;
      out.push({ it, s: x, w: w + (x.sp.diarios || 0) / 1e5 });
    }
    return out.sort((a, b) => b.w - a.w);
  }
  function openIdeas() {
    const L = todayIdeas().slice(0, 30);
    const body = h('div');
    body.append(h('p', { class: 'yc-sub', style: 'margin-top:0', text: 'Lo más publicable de hoy según sus cifras: récords recién superados, cuentas atrás, puestos en listas y estrenos. Cada idea trae su caption y su plantilla.' }));
    body.append(L.length ? h('div', { class: 'yc-card lg-ideas' }, L.map(x => { const r = ideaRow(x.it, x.s); r.addEventListener('click', () => openSong(x.s.id)); return r; })) : h('p', { class: 'yc-empty', text: 'Hoy no hay nada destacable todavía.' }));
    openSheet('Ideas para publicar hoy', body);
  }

  // ---------- discos con sus totales (lo usan Discografía y el Comparador) ----------
  function albumsAgg() {
    return (DATA.albumes || []).map(a => {
      const tracks = SONGS.filter(s => s.album === a.album);
      const ytv = tracks.reduce((t, s) => t + (s.yt && isNum(s.yt.vistas) ? s.yt.vistas : 0), 0);
      return Object.assign({}, a, { tracks, ytv, comb: (a.spotify_streams || 0) + ytv, id: 'alb:' + a.album, titulo: a.album });
    }).sort((a, b) => b.comb - a.comb);
  }

  // ---------- récords e hitos ----------
  const CLUBS = [[1e9, 'Club de los mil millones'], [500e6, 'Club 500 M'], [100e6, 'Club 100 M'], [50e6, 'Club 50 M'], [10e6, 'Club 10 M']];
  function hitoCard(m, i) {
    const eta = new Date(Date.now() + m.dias * 864e5).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const t = h('div', { class: 'lg-hcard reveal', role: 'button', tabindex: '0', onclick: () => openSong(m.s.id) },
      h('div', { class: 'lg-hcard-ring' }, ring(m.pct, 76), h('b', { text: Math.floor(m.pct) + '%' })),
      h('div', { class: 'lg-hcard-main' },
        h('small', { class: 'lg-lab', text: `Hacia ${short(m.meta)} en Spotify` }),
        h('b', { class: 'lg-title', text: m.s.titulo }),
        h('small', { text: m.aPunto ? `¡A punto! 🔥 Le faltaban ${full(m.faltan)} en el último dato y suma ${short(m.s.sp.diarios)} al día: en Spotify ya lo habría superado o está a punto` : `Faltan ${full(m.faltan)} · ≈ ${m.dias} ${m.dias === 1 ? 'día' : 'días'} (${eta}) al ritmo de ${short(m.s.sp.diarios)}/día` }),
        h('div', { class: 'lg-hcard-act' }, h('button', { class: 'yc-chip', type: 'button', onclick: (e) => { e.stopPropagation(); toStudio({ plantilla: 'meta', titular: `${m.s.titulo} va a por los ${short(m.meta)}`, etiqueta: 'PRÓXIMO HITO', numero: `FALTAN ${short(m.faltan)}`, numeroTxt: `≈ ${m.dias} ${m.dias === 1 ? 'DÍA' : 'DÍAS'} A ESTE RITMO`, progreso: m.pct, imagen: coverOf(m.s) }); }, text: 'Hacer post' }))));
    tint(t, coverOf(m.s), m.s.titulo);
    return t;
  }
  function renderRecords() {
    const el = $('#p-records'); el.replaceChildren();
    el.append(h('h1', { class: 'yc-h1' }, 'Récords'), h('p', { class: 'yc-sub', text: `Las cifras más grandes de ${AN()} y los próximos números redondos, con la cuenta atrás calculada al ritmo de streams del último dato.` }));
    if (!SONGS.length) { el.append(h('p', { class: 'yc-empty', text: 'Aún no hay datos.' })); return; }
    const sp = (x) => x.sp.total;
    const bySp = SONGS.filter(x => isNum(sp(x))).sort((a, b) => sp(b) - sp(a));
    const byYt = SONGS.filter(x => x.yt && isNum(x.yt.vistas)).sort((a, b) => b.yt.vistas - a.yt.vistas);
    const byDay = SONGS.filter(x => isNum(x.sp.diarios)).sort((a, b) => b.sp.diarios - a.sp.diarios);
    const byLists = SONGS.filter(x => x.hoy.length).sort((a, b) => b.hoy.length - a.hoy.length);
    const bestPos = SONGS.filter(x => x.best && isNum(x.best.p)).map(x => ({ s: x, b: x.best })).sort((a, b) => a.b.p - b.b.p)[0];
    // los récords
    const rec = (label, s, value, sub) => s ? (() => { const t = h('div', { class: 'lg-rec reveal', role: 'button', tabindex: '0', onclick: () => openSong(s.id) }, h('div', { class: 'lg-rec-cov' }, art(s)), h('div', { class: 'lg-rec-main' }, h('small', { class: 'lg-lab', text: label }), h('b', { class: 'lg-mid num', text: value }), h('span', { class: 'lg-clip', text: s.titulo }), sub ? h('small', { class: 'lg-clip', text: sub }) : null)); tint(t, coverOf(s), s.titulo); return t; })() : null;
    el.append(section('Sus récords', 'entre todas sus canciones'));
    el.append(h('div', { class: 'lg-recs' },
      rec('Más streams en Spotify', bySp[0], short(bySp[0] && sp(bySp[0])), bySp[0] && bySp[0].sp.fecha ? `dato del ${dfmt(bySp[0].sp.fecha)}` : ''),
      rec('Video más visto', byYt[0], short(byYt[0] && byYt[0].yt.vistas), byYt[0] ? `${short(byYt[0].yt.likes)} likes` : ''),
      rec('Más streams en un día (hoy)', byDay[0], short(byDay[0] && byDay[0].sp.diarios), 'streams diarios en Spotify'),
      bestPos ? rec('Mejor puesto en listas', bestPos.s, '#' + bestPos.b.p, bestPos.b.t.replace(/^#\d+\s*/, '')) : null,
      rec('En más listas hoy', byLists[0], byLists[0] ? String(byLists[0].hoy.length) : '—', 'listas de distintos países'),
      rec('Mayor total combinado', SONGS.slice().sort((a, b) => (b.combinado || 0) - (a.combinado || 0))[0], short(SONGS.reduce((m, x) => Math.max(m, x.combinado || 0), 0)), 'Spotify + YouTube + Audiomack')));
    $$('.lg-rec', el).forEach(reveal);
    // próximos hitos
    el.append(h('button', { class: 'mt-link reveal', type: 'button', onclick: () => go('logros') }, h('span', { text: '🎯' }), h('span', null, h('b', { text: 'Cuenta atrás y metas' }), h('small', { text: 'Ahora en «Logros», con avisos de lo que está a punto de caer' })), icon('chev', 'yc-chev')));
    // clubs
    el.append(section('Clubs de streams', 'canciones que superan cada cifra en Spotify'));
    const clubs = h('div', { class: 'lg-clubs' });
    for (const [lim, name] of CLUBS) {
      const L = bySp.filter(x => sp(x) >= lim); if (!L.length) continue;
      clubs.append(h('details', { class: 'lg-club yc-card reveal', open: lim >= 100e6 ? true : null },
        h('summary', null, h('b', { class: 'lg-club-n', text: short(lim) }), h('span', null, h('b', { text: name }), h('small', { text: `${L.length} ${L.length === 1 ? 'canción' : 'canciones'}` })), icon('chev', 'yc-chev')),
        h('div', { class: 'yc-list', style: 'box-shadow:none;background:none!important;border:0!important' }, L.map((x, i) => songRow(x, { rank: i + 1, metric: 'sp' })))));
    }
    el.append(clubs); $$('.lg-club', clubs).forEach(reveal);
    // vídeos
    const ytClubs = [[1e9, '1.000 M'], [500e6, '500 M'], [100e6, '100 M']].map(([l, n]) => [n, byYt.filter(x => x.yt.vistas >= l).length]).filter(x => x[1]);
    if (ytClubs.length) { el.append(section('En YouTube', 'videos que superan cada cifra')); el.append(h('div', { class: 'lg-ytclubs' }, ytClubs.map(([n, c]) => h('div', { class: 'lg-tile reveal' }, h('span', { class: 'lg-lab', text: `+${n} vistas` }), h('b', { class: 'lg-big', text: String(c) }), h('small', { text: c === 1 ? 'video' : 'videos' }))))); $$('.lg-ytclubs .lg-tile', el).forEach(reveal); }
    el.append(h('p', { class: 'yc-src', text: 'Fuentes: kworb.net (Spotify), YouTube. La cuenta atrás es una estimación: si cambia el ritmo de streams, cambia la fecha.' }));
  }

  // ---------- comparador ----------
  const CMP = { mode: 'canciones', a: null, b: null };
  function cmpItems() { return CMP.mode === 'discos' ? albumsAgg() : SONGS.slice().sort((a, b) => (b.combinado || 0) - (a.combinado || 0)); }
  function cmpGet(id) { return cmpItems().find(x => x.id === id); }
  function openCompare(idA, idB) { CMP.mode = String(idA).startsWith('alb:') ? 'discos' : 'canciones'; CMP.a = idA; if (idB) CMP.b = idB; else CMP.b = null; RENDERED.delete('comparar'); closeSheet(); go('comparar'); }
  function cmpPick(slot, done) {
    const items = cmpItems();
    const list = h('div', { class: 'yc-list' });
    const draw = (q) => { const f = fold(q); list.replaceChildren(...items.filter(x => !f || fold(x.titulo + ' ' + (x.artistas || x.artista_principal || '')).includes(f)).slice(0, 80).map(x => h('div', { class: 'yc-row', onclick: () => { CMP[slot] = x.id; closeSheet(); done(); } },
      CMP.mode === 'discos' ? albumCover(x, 44) : art(x), h('div', { class: 'yc-row-main' }, h('b', { text: x.titulo }), h('small', { text: CMP.mode === 'discos' ? (x.tipo || '') : (x.artistas || '') })), h('div', { class: 'yc-row-meta' }, h('b', { text: short(CMP.mode === 'discos' ? x.comb : x.combinado) }), h('small', { text: 'total' }))))); };
    const inp = h('input', { class: 'yc-in', type: 'search', placeholder: CMP.mode === 'discos' ? 'Buscar disco…' : 'Buscar canción…', oninput: (e) => draw(e.target.value) });
    draw('');
    openSheet(slot === 'a' ? 'Elige la primera' : 'Elige la segunda', h('div', { style: 'display:grid;gap:12px' }, inp, list));
    setTimeout(() => { try { inp.focus(); } catch (e) { /* */ } }, 350);
  }
  function renderComparar() {
    const el = $('#p-comparar'); el.replaceChildren();
    el.append(h('h1', { class: 'yc-h1' }, 'Compa', h('em', { text: 'rador' })), h('p', { class: 'yc-sub', text: 'Pon dos canciones o dos discos cara a cara: streams, vistas, ritmo diario, listas y quién gana en cada cifra.' }));
    if (!SONGS.length) { el.append(h('p', { class: 'yc-empty', text: 'Aún no hay datos.' })); return; }
    const modes = h('div', { class: 'yc-seg' }, [['canciones', 'Canciones'], ['discos', 'Discos']].map(([k, l]) => h('button', { 'aria-pressed': String(CMP.mode === k), onclick: () => { if (CMP.mode === k) return; CMP.mode = k; CMP.a = CMP.b = null; RENDERED.delete('comparar'); renderComparar(); glideSoon(); }, text: l })));
    el.append(modes);
    const items = cmpItems();
    if (!items.length) { el.append(h('p', { class: 'yc-empty', text: 'No hay discos con datos.' })); return; }
    if (!cmpGet(CMP.a)) CMP.a = items[0].id;
    if (!cmpGet(CMP.b) || CMP.b === CMP.a) CMP.b = (items.find(x => x.id !== CMP.a) || items[0]).id;
    const A = cmpGet(CMP.a), B = cmpGet(CMP.b), isAlb = CMP.mode === 'discos';
    const side = (x, slot) => { const t = h('button', { class: 'lg-vs-side', type: 'button', onclick: () => cmpPick(slot, () => { RENDERED.delete('comparar'); renderComparar(); }) },
      h('div', { class: 'lg-vs-cov' }, isAlb ? albumCover(x, 160) : art(x)), h('b', { text: x.titulo }), h('small', { text: isAlb ? (x.tipo || '') : (x.artistas || '') }), h('span', { class: 'lg-vs-change', text: 'Cambiar' }));
      tint(t, isAlb ? x.portada : coverOf(x), x.titulo); return t; };
    el.append(h('div', { class: 'lg-vs reveal in' }, side(A, 'a'), h('div', { class: 'lg-vs-mid' }, h('b', { text: 'VS' }), h('button', { class: 'yc-iconbtn lg-swap', type: 'button', 'aria-label': 'Intercambiar', onclick: () => { [CMP.a, CMP.b] = [CMP.b, CMP.a]; RENDERED.delete('comparar'); renderComparar(); } }, '⇄')), side(B, 'b')));
    const M = isAlb ? [
      ['Total combinado', x => x.comb, short], ['Streams en Spotify', x => x.spotify_streams, short], ['Spotify hoy', x => x.spotify_diarios, short], ['Vistas en YouTube', x => x.ytv || null, short],
      ['Canciones', x => x.canciones || x.tracks.length || null, String], ['Media por canción', x => (x.spotify_streams && (x.canciones || x.tracks.length)) ? x.spotify_streams / (x.canciones || x.tracks.length) : null, short],
      ['Días desde la salida', x => x.fecha_lanzamiento ? days(x.fecha_lanzamiento, today()) : null, v => full(v), true]
    ] : [
      ['Total combinado', x => x.combinado || null, short], ['Streams en Spotify', x => x.sp.total, short], ['Streams hoy', x => x.sp.diarios, short], ['Media diaria Spotify', x => x.spMedia, short],
      ['Vistas en YouTube', x => x.yt && x.yt.vistas, short], ['Likes en YouTube', x => x.yt && x.yt.likes, short], ['Vistas por día', x => x.ytMedia, short], ['Shazams', x => x.shazam && x.shazam.total, short],
      ['Mejor puesto', x => x.best && isNum(x.best.p) ? x.best.p : null, v => '#' + v, true], ['Listas hoy', x => x.hoy.length || null, String],
      ['Días desde la salida', x => x.diasPublicado, v => full(v), true]
    ];
    let wa = 0, wb = 0;
    const rows = M.map(([label, get, fmt, lowerWins]) => {
      const va = get(A), vb = get(B); if (!isNum(va) && !isNum(vb)) return null;
      const max = Math.max(isNum(va) ? va : 0, isNum(vb) ? vb : 0) || 1;
      let win = 0; if (isNum(va) && isNum(vb) && va !== vb && label !== 'Días desde la salida') win = (lowerWins ? va < vb : va > vb) ? 1 : 2;
      if (win === 1) wa++; if (win === 2) wb++;
      const bar = (v, w) => h('div', { class: 'lg-cmp-bar' + (w ? ' win' : '') }, h('i', { 'data-w': isNum(v) ? (lowerWins ? (Math.min(va || Infinity, vb || Infinity) / v * 100) : v / max * 100).toFixed(1) : 0 }));
      return h('div', { class: 'lg-cmp-row' },
        h('div', { class: 'lg-cmp-v a' + (win === 1 ? ' win' : '') }, h('b', { text: isNum(va) ? fmt(va) : '—' }), bar(va, win === 1)),
        h('span', { class: 'lg-cmp-l', text: label }),
        h('div', { class: 'lg-cmp-v b' + (win === 2 ? ' win' : '') }, h('b', { text: isNum(vb) ? fmt(vb) : '—' }), bar(vb, win === 2)));
    }).filter(Boolean);
    const score = h('div', { class: 'lg-cmp-score' }, h('b', { text: String(wa) }), h('span', { text: wa === wb ? 'Empate' : `Gana ${wa > wb ? A.titulo : B.titulo}` }), h('b', { text: String(wb) }));
    const box = h('div', { class: 'yc-card lg-cmp reveal' }, score, ...rows);
    el.append(box); reveal(box); animateBars(box);
    const k = isAlb ? (x) => x.comb : (x) => x.combinado;
    el.append(h('div', { class: 'lg-cmp-act' },
      h('button', { class: 'yc-btn', type: 'button', onclick: () => toStudio({ plantilla: 'versus', titular: `${A.titulo} *VS* ${B.titulo}`, vsA: A.titulo.slice(0, 18), vsANum: short(k(A)).replace(/\s/g, ''), vsB: B.titulo.slice(0, 18), vsBNum: short(k(B)).replace(/\s/g, ''), subtitulo: 'TOTAL COMBINADO · ¿CUÁL PREFIERES?', imagen: isAlb ? A.portada : coverOf(A) }), text: 'Hacer post Versus' }),
      h('button', { class: 'yc-btn sec', type: 'button', onclick: () => copy(`⚔️ ${A.titulo} vs ${B.titulo}\n` + M.map(([l, g, f]) => { const a = g(A), b = g(B); return isNum(a) || isNum(b) ? `• ${l}: ${isNum(a) ? f(a) : '—'} vs ${isNum(b) ? f(b) : '—'}` : null; }).filter(Boolean).join('\n') + `\n\nFuentes: kworb.net, YouTube · ${dfmt(DATA.generado)}`), text: 'Copiar comparación' })));
    el.append(h('p', { class: 'yc-src', text: `Datos del ${dfmt(DATA.generado)}. Fuentes: kworb.net (Spotify), YouTube, Shazam.` }));
  }

  // ---------- ficha de disco (detallada y fácil de leer) ----------
  function openAlbum(name, push = true) {
    const a = albumsAgg().find(x => x.album === name); if (!a) return;
    const disco = (a.tracks && a.tracks.length ? a.tracks : []).slice();
    const rows = (a.disco || []).length ? a.disco.map(x => ({ x, s: SONGS.find(z => normT(z.titulo) === normT(x.titulo)) })) : disco.map(s => ({ x: { titulo: s.titulo, artistas: s.artistas, n: s.pista, duracion_ms: s.duracion_ms }, s }));
    const totMs = rows.reduce((t, r) => t + (r.x.duracion_ms || 0), 0);
    const sp = rows.reduce((t, r) => t + (r.s && isNum(r.s.sp.total) ? r.s.sp.total : 0), 0);
    const spTot = isNum(a.spotify_streams) ? a.spotify_streams : sp || null;
    const ytv = rows.reduce((t, r) => t + (r.s && r.s.yt && isNum(r.s.yt.vistas) ? r.s.yt.vistas : 0), 0) || a.ytv || null;
    const top = rows.filter(r => r.s && isNum(r.s.sp.total)).sort((p, q) => q.s.sp.total - p.s.sp.total);
    const dias = a.fecha_lanzamiento ? days(a.fecha_lanzamiento, today()) : null;
    const body = h('div');
    const cov = hd(a.portada || (top[0] && top[0].s.portada), 1400);
    body.append(h('div', { class: 'lg-song-head' },
      h('div', { class: 'lg-song-bg' }, cov ? h('img', { src: cov, alt: '', decoding: 'async', onerror: (e) => e.target.remove() }) : null),
      h('div', { class: 'lg-song-cov' }, albumCover(Object.assign({}, a, { portada: a.portada || (top[0] && top[0].s.portada) }), 400)),
      h('div', { class: 'lg-song-info' },
        h('span', { class: 'lg-kicker' }, h('i'), a.tipo || 'Disco'),
        h('h2', { class: 'lg-song-t', text: a.album }),
        h('p', { class: 'lg-song-a', text: [a.artista_principal && a.artista_principal !== '—' ? a.artista_principal : AN(), a.fecha_lanzamiento ? dfmt(a.fecha_lanzamiento) : '', rows.length ? `${rows.length} canciones` : '', totMs ? `${Math.round(totMs / 60000)} min` : ''].filter(Boolean).join(' · ') }),
        h('div', { class: 'lg-song-act' },
          a.apple_url ? h('a', { class: 'yc-btn sec', href: a.apple_url, target: '_blank', rel: 'noopener' }, icon('apple'), 'Apple Music') : null,
          h('a', { class: 'yc-btn sec', href: `https://open.spotify.com/search/${encodeURIComponent(a.album + ' ' + AN())}`, target: '_blank', rel: 'noopener' }, icon('spotify'), 'Spotify'),
          h('button', { class: 'yc-btn sec', type: 'button', onclick: () => { closeSheet(); setTimeout(() => toStudio({ plantilla: 'portada', titular: a.album, etiqueta: (a.tipo || 'DISCO').toUpperCase(), subtitulo: spTot ? `${short(spTot)} STREAMS EN SPOTIFY` : '', imagen: hd(a.portada, 1400) }), 250); } }, icon('pen'), 'Hacer post'),
          h('button', { class: 'yc-btn sec', type: 'button', onclick: () => openCompare('alb:' + a.album) }, icon('bolt'), 'Comparar')))));
    // en pocas palabras
    const frase = [
      spTot ? `«${a.album}» suma ${full(spTot)} streams en Spotify` : `«${a.album}» aún no tiene dato de streams`,
      isNum(a.spotify_diarios) ? ` y hoy lleva ${full(a.spotify_diarios)}` : '', '.',
      ytv ? ` Sus vídeos tienen ${full(ytv)} vistas en YouTube.` : '',
      top[0] ? ` La más escuchada es «${top[0].s.titulo}» (${short(top[0].s.sp.total)}).` : '',
      dias != null && dias >= 0 ? ` Salió hace ${full(dias)} ${dias === 1 ? 'día' : 'días'}.` : ''
    ].join('');
    body.append(h('div', { class: 'lg-sum' }, h('b', { text: 'En pocas palabras' }), h('p', { text: frase })));
    const kb = (label, v, sub) => { const b = h('b', { class: 'lg-mid num', text: '—' }); countUp(b, isNum(v) ? v : null); return h('div', { class: 'lg-tile lg-k' }, h('span', { class: 'lg-lab', text: label }), b, sub ? h('small', { class: 'lg-clip', text: sub }) : null); };
    body.append(h('div', { class: 'lg-kpis' },
      kb('Spotify total', spTot, a.fecha_dato ? `dato del ${dfmt(a.fecha_dato)}` : 'suma de sus canciones'),
      kb('Spotify hoy', a.spotify_diarios, 'streams al día'),
      kb('YouTube', ytv, `${rows.filter(r => r.s && r.s.yt).length} de ${rows.length} con vídeo`),
      kb('Media por canción', spTot && rows.length ? spTot / rows.length : null, 'streams en Spotify')));
    // reparto: qué canciones pesan más
    if (top.length) {
      const mx = top[0].s.sp.total;
      body.append(h('h3', { class: 'lg-sh', text: 'Las más escuchadas del disco' }));
      body.append(h('div', { class: 'yc-card lg-share' }, top.slice(0, 8).map(r => h('div', { class: 'lg-share-r', role: 'button', tabindex: '0', onclick: () => openSong(r.s.id) },
        h('span', { class: 'lg-clip', text: r.s.titulo }), h('i', null, h('i', { 'data-w': (r.s.sp.total / mx * 100).toFixed(1) })),
        h('b', { text: short(r.s.sp.total) }), h('small', { text: spTot ? Math.round(r.s.sp.total / spTot * 100) + '%' : '' })))));
    }
    // tracklist completo
    body.append(h('h3', { class: 'lg-sh', text: `Disco completo · ${rows.length} canciones` }));
    body.append(h('div', { class: 'yc-list' }, rows.map((r, i) => {
      const s2 = r.s, dur = r.x.duracion_ms ? Math.floor(r.x.duracion_ms / 60000) + ':' + String(Math.round(r.x.duracion_ms / 1000) % 60).padStart(2, '0') : '';
      return h('div', { class: 'yc-row', style: s2 ? null : 'cursor:default', onclick: s2 ? () => openSong(s2.id) : null },
        h('span', { class: 'yc-rank', text: r.x.n || i + 1 }),
        h('div', { class: 'yc-row-main' }, h('b', { text: r.x.titulo }), h('small', { text: [r.x.artistas, dur].filter(Boolean).join(' · ') })),
        h('div', { class: 'yc-row-meta' }, h('b', { text: s2 && isNum(s2.sp.total) ? short(s2.sp.total) : '—' }),
          h('small', { text: [s2 && isNum(s2.sp.diarios) ? `${short(s2.sp.diarios)}/día` : '', s2 && s2.yt && isNum(s2.yt.vistas) ? `▶ ${short(s2.yt.vistas)}` : ''].filter(Boolean).join(' · ') || 'Spotify' })),
        s2 ? icon('chev', 'yc-chev') : null);
    })));
    body.append(h('p', { class: 'yc-src', text: `Fuentes: ${a.fuente || 'kworb.net'} (Spotify), Apple Music (canciones y duración), YouTube. Apple Music y Deezer no publican reproducciones.` }));
    openSheet(a.album, body);
    $('#sheet').classList.add('song'); tint($('#sheet'), hd(a.portada, 640), a.album);
    animateBars(body);
    if (push) history.replaceState(null, '', '#disco/' + encodeURIComponent(a.album));
  }
  // en pocas palabras (canción)
  function songSummary(s) {
    const L = [];
    L.push(isNum(s.sp.total) ? `«${s.titulo}» suma ${full(s.sp.total)} streams en Spotify` : `«${s.titulo}» aún no tiene dato de Spotify`);
    if (isNum(s.sp.diarios)) L.push(` y hoy lleva ${full(s.sp.diarios)}${s.rank_spd ? ` (la nº ${s.rank_spd} de sus canciones hoy)` : ''}`);
    L.push('.');
    if (s.yt && isNum(s.yt.vistas)) { const d = ytDaily(s); L.push(` En YouTube tiene ${full(s.yt.vistas)} vistas${isNum(d) ? ` (+${full(d)} al día)` : ''}.`); }
    if (s.hoy.length) L.push(` Hoy está en ${s.hoy.length} ${s.hoy.length === 1 ? 'lista' : 'listas'}${s.best ? `, su mejor puesto: ${s.best.t}` : ''}.`);
    else if (s.best) L.push(` Su mejor puesto: ${s.best.t}.`);
    const nx = nextHito(s.sp.total), d2 = s.sp.diarios || s.spMedia;
    if (nx && d2) L.push(nx - s.sp.total <= d2 ? ` ¡A punto! Le faltaban ${short(nx - s.sp.total)} para los ${short(nx)} y suma ${short(d2)} al día: en Spotify ya los habría superado o está a punto.` : ` Le faltan ${short(nx - s.sp.total)} para los ${short(nx)} (≈ ${Math.ceil((nx - s.sp.total) / d2)} días).`);
    return L.join('');
  }

  // ---------- trayectoria: su carrera año a año ----------
  function goAlbum(name) {
    if ((DATA.albumes || []).some(x => x.album === name)) { openAlbum(name); return; }
    go('albumes');
    setTimeout(() => { const c = [...document.querySelectorAll('#p-albumes [data-alb]')].find(x => x.dataset.alb === name); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 450);
  }
  function renderTrayectoria() {
    const el = $('#p-trayectoria'); el.replaceChildren();
    el.append(h('h1', { class: 'yc-h1' }, 'Trayec', h('em', { text: 'toria' })), h('p', { class: 'yc-sub', text: `La carrera de ${AN()} año a año: discos, sus temas más grandes y los puestos que logró.` }));
    const own = (DATA.albumes || []).filter(a => a.tracks && a.fecha_lanzamiento);
    const dated = SONGS.filter(s => s.lanzamiento);
    const years = dated.map(s => +s.lanzamiento.slice(0, 4)).concat(own.map(a => +a.fecha_lanzamiento.slice(0, 4))).filter(Boolean);
    const first = years.length ? Math.min(...years) : null;
    const picos = SONGS.flatMap(s => (s.picos || []).map(p => Object.assign({ s }, p)));
    const n1 = new Set(picos.filter(p => p.pico === 1).map(p => p.s.id + p.pais)).size;
    const glob = picos.filter(p => ['WW', 'GLOBAL'].includes(String(p.codigo).toUpperCase()) || p.pais === 'Global').sort((a, b) => a.pico - b.pico)[0];
    const paises = new Set(picos.map(p => p.pais)).size;
    const P = DATA.perfil || {};
    const ytAll = SONGS.reduce((t, s) => t + (s.yt && isNum(s.yt.vistas) ? s.yt.vistas : 0), 0);
    const kpi = (label, val, sub) => h('div', null, h('small', { text: label }), h('b', { text: val }), sub ? h('span', { text: sub }) : null);
    el.append(h('div', { class: 'yc-career' },
      kpi('Años de carrera', first ? String(new Date().getFullYear() - first + 1) : '—', first ? `desde ${first}` : ''),
      kpi('Canciones', String(SONGS.length), `${SONGS.filter(s => s.rol === 'Principal').length} como principal`),
      kpi('Discos', String(own.length), 'con tracklist completo'),
      kpi('Streams Spotify', short(P.spotify && P.spotify.streams_totales), 'en toda su carrera'),
      kpi('Vistas YouTube', short(ytAll), 'sumando sus vídeos'),
      kpi('Números 1', String(n1), 'en listas de Spotify por país'),
      kpi('Mejor puesto global', glob ? '#' + glob.pico : '—', glob ? glob.s.titulo : 'Spotify Top 200 Global'),
      kpi('Países', String(paises), 'donde entró al Top 200')));
    const ys = [...new Set(years)].sort((a, b) => b - a);
    const tl = h('div', { class: 'yc-tl' });
    for (const y of ys) {
      const albs = own.filter(a => a.fecha_lanzamiento.startsWith(String(y))).sort((a, b) => a.fecha_lanzamiento.localeCompare(b.fecha_lanzamiento));
      const songsY = dated.filter(s => s.lanzamiento.startsWith(String(y))).sort((a, b) => (b.sp.total || 0) - (a.sp.total || 0));
      const tot = songsY.reduce((t, s) => t + (s.sp.total || 0), 0);
      tl.append(h('div', { class: 'yc-tl-y' }, h('b', { text: String(y) }), h('small', { text: `${songsY.length} tema${songsY.length === 1 ? '' : 's'}${albs.length ? ` · ${albs.length} disco${albs.length > 1 ? 's' : ''}` : ''}${tot ? ` · ${short(tot)} streams` : ''}` })));
      if (albs.length) tl.append(h('div', { class: 'yc-tl-albums' }, albs.map(a => h('div', { class: 'yc-tl-alb', role: 'button', tabindex: 0, onclick: () => goAlbum(a.album) },
        h('div', { class: 'cov' }, a.portada ? h('img', { src: a.portada, alt: a.album, loading: 'lazy', decoding: 'async' }) : null),
        h('b', { text: a.album }), h('small', { text: `${dfmt(a.fecha_lanzamiento, { year: undefined })} · ${(a.tracks || []).length} temas` })))));
      if (songsY.length) {
        const box = h('div', { class: 'yc-list yc-tl-hits' }, songsY.slice(0, 5).map((s, i) => songRow(s, { rank: i + 1 })));
        if (songsY.length > 5) box.append(h('button', { class: 'yc-row yc-addrow', type: 'button', onclick: (e) => { e.currentTarget.replaceWith(...songsY.slice(5).map((s, i) => songRow(s, { rank: i + 6 }))); } }, h('b', { text: `Ver los ${songsY.length - 5} temas restantes de ${y}` })));
        tl.append(box);
      }
    }
    if (!ys.length) tl.append(h('p', { class: 'yc-note', text: 'La trayectoria se completa con la primera actualización completa (fechas de Apple Music).' }));
    el.append(section('Año a año', ys.length ? `${ys.length} años` : ''), tl);
    const sinFecha = SONGS.filter(s => !s.lanzamiento).length;
    if (sinFecha) el.append(h('p', { class: 'yc-note', text: `${sinFecha} temas aún sin fecha de salida: se irán completando con los datos de Apple Music.` }));
  }
  const normT = (x) => String(x || '').toLowerCase().replace(/\s*[\(\[](with|feat\.?|ft\.?)[^\)\]]*[\)\]]/g, '').replace(/\s+/g, ' ').trim();
  function albumCover(a, size) {
    const src0 = a.portada || (SONGS.find(s => s.album === a.album && s.portada) || {}).portada, src = hd(src0, size > 120 ? 1000 : 400);
    const box = h('div', { class: 'yc-art yc-albumart', style: `width:${size}px;height:${size}px;background:linear-gradient(135deg,hsl(${hue(a.album)} 80% 55%),hsl(${(hue(a.album) + 80) % 360} 70% 35%))` }, src ? null : a.album.slice(0, 2).toUpperCase());
    if (src) { const im = h('img', { src, alt: a.album, loading: 'lazy', decoding: 'async', class: 'cover' }); im.addEventListener('error', () => { im.remove(); box.textContent = a.album.slice(0, 2).toUpperCase(); }); box.append(im); }
    return box;
  }
  const stat = (label, value, sub) => h('div', { class: 'yc-stat' }, h('span', { text: label }), h('b', { text: value }), sub ? h('small', { text: sub }) : null);

  // Novedades
  const NOV_T = { logro: ['Logros', 'trophy', '#ffb800'], lanzamiento: ['Estrenos', 'spark', '#ff2d55'], listas: ['Listas', 'chart', '#34c759'], hito: ['Hitos', 'trophy', '#ff9f0a'], youtube: ['Sus vídeos', 'youtube', '#ff0033'],
    instagram: ['Instagram', 'ig', '#e1306c'], tiktok: ['TikTok', 'tiktok', '#00c2cb'],
    mencion: ['Lo mencionan', 'megaphone', '#af52de'], noticia: ['Noticias', 'news', '#0a84ff'], redes: ['Redes y fuentes', 'people', '#ff2d95'] };
  let novF = 'todo';
  function renderNovedades() {
    const el = $('#p-novedades'); el.replaceChildren();
    const N = (DATA.novedades || []).slice().sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')) || String(b.detectado || '').localeCompare(String(a.detectado || '')));
    el.append(h('h1', { class: 'yc-h1', text: 'Lo nuevo' }), h('p', { class: 'yc-sub', text: `Todo lo que pasa con ${AN()}: estrenos, listas, hitos, sus vídeos, quién lo menciona en YouTube, noticias y actividad en redes. Se revisa cada 30 minutos.` }));
    el.append(h('div', { class: 'yc-toolbar' }, h('span'), h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, h('button', { class: 'yc-chip', onclick: openFeeds }, '➕ Fuentes'))));
    const chips = h('div', { class: 'yc-chips' }, [['todo', 'Todo'], ...Object.entries(NOV_T).map(([k, v]) => [k, v[0]])].map(([k, l]) => h('button', { class: 'yc-chip', 'aria-pressed': String(novF === k), onclick: () => { novF = k; renderNovedades(); }, text: l + (k !== 'todo' ? ` · ${N.filter(n => n.tipo === k).length}` : '') })));
    el.append(chips);
    const rows = N.filter(n => novF === 'todo' || n.tipo === novF);
    if (!rows.length) {
      el.append(h('div', { class: 'yc-card yc-empty-state' }, h('b', { text: 'Todavía no hay novedades aquí' }), h('p', { text: 'Aparecen en la próxima actualización automática (cada 30 minutos).' })));
      return;
    }
    const lim = new Date(Date.now() - 2 * 864e5).toISOString();
    let last = '';
    const list = h('div', { class: 'yc-feed' });
    for (const n of rows.slice(0, 150)) {
      const d = n.fecha || ''; const t = NOV_T[n.tipo] || ['Otro', 'spark', '#888'];
      if (d !== last) { list.append(h('div', { class: 'yc-tl-date', text: d ? parseD(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : 'Sin fecha' })); last = d; }
      const s = n.cancion ? songById(n.cancion) : null;
      const img = n.imagen || (s && s.portada);
      const cardEl = h('div', { class: 'yc-nov reveal' },
        img ? (() => { const box = h('div', { class: 'yc-nov-img' }); const im = h('img', { src: img, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }); im.addEventListener('error', () => box.replaceWith(h('div', { class: 'yc-nov-ic', style: `background:${t[2]}` }, icon(t[1])))); box.append(im); return box; })() : h('div', { class: 'yc-nov-ic', style: `background:${t[2]}` }, icon(t[1])),
        h('div', { class: 'yc-nov-main' },
          h('span', { class: 'yc-nov-tag', style: `color:${t[2]}`, text: t[0] + (n.detectado && n.detectado > lim ? ' · nuevo' : '') }),
          h('b', { text: n.titulo }),
          h('small', { text: [n.texto, n.fuente].filter(Boolean).join(' · ') }),
          h('div', { class: 'yc-nov-actions' },
            n.url ? h('a', { href: n.url, target: '_blank', rel: 'noopener', text: 'Abrir ↗' }) : null,
            s ? h('button', { type: 'button', onclick: () => openSong(s.id), text: 'Ver canción' }) : null,
            h('button', { type: 'button', onclick: () => toStudio({ titular: n.titulo, etiqueta: t[0].toUpperCase(), imagen: img, texto: n.texto }), text: 'Crear post' }))));
      list.append(cardEl); reveal(cardEl);
    }
    el.append(list);
    el.append(h('p', { class: 'yc-note', text: 'Sus últimos posts de Instagram (y las colaboraciones) y sus vídeos de TikTok se leen de sus perfiles públicos en cada actualización; si alguna de las dos plataformas bloquea la lectura ese día, se mantiene lo último que se leyó. Los posts de otras cuentas que lo etiquetan se añaden con «➕ Fuentes». Las menciones salen de la búsqueda de YouTube y las noticias de Google Noticias.' }));
  }

  // Logros: lo que merece post
  const LG_CAT = { todo: 'Todo', mundial: 'Mundial', numero1: '#1', top10: 'Top 10', playlist: 'Playlists', aniversario: 'Aniversarios', debut: 'Debuts', pico: 'Picos', record: 'Récords', cifra: 'Cifras', billboard: 'Billboard', rival: 'Supera a' };
  const LG_NIVEL = { 3: ['Bombazo', 'n3'], 2: ['Importante', 'n2'], 1: ['Bueno', 'n1'] };
  // un logro de cifra solo cuenta si es actual: si la canción ya va muy por encima de esa cifra, es antiguo (o vino de cambiar el vídeo)
  function cifraVieja(n) {
    const p = String(n.id || '').replace(/^logro:/, '').split(':'); if (p[0] !== 'cifra' || p.length < 4) return false;
    const marca = Number(p[p.length - 1]); if (!isNum(marca)) return false;
    const s = (n.cancion && songById(n.cancion)) || SONGS.find(x => base(x.titulo) === base(p.slice(2, -1).join(':')));
    if (!s) return false;
    const actual = p[1] === 'YouTube' ? s.yt && s.yt.vistas : s.sp.total;
    return isNum(actual) && actual > marca * 1.5;
  }
  function logrosList() {
    return (DATA.novedades || []).filter(n => (n.tipo === 'logro' || n.tipo === 'hito') && !cifraVieja(n))
      .map(n => n.tipo === 'hito' ? Object.assign({ cat: 'cifra', nivel: 1, etiqueta: 'NUEVA CIFRA' }, n) : n)
      .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')) || (b.nivel || 0) - (a.nivel || 0));
  }
  function logroCaption(n) {
    const em = { aniversario: '🎂', playlist: '📋', mundial: '🌍', numero1: '🥇', top10: '🔟', debut: '🚀', pico: '📈', record: '💥', cifra: '🏆', billboard: '📊', rival: '⚔️' }[n.cat] || '🏆';
    const topN = (t) => String(t || '').replace(/#(\d+)/g, 'Top $1');
    return `${em} ${topN(n.titulo).toUpperCase()}\n\n${topN(n.texto)}${n.fuente ? `\n\nFuente: ${n.fuente}` : ''}\n\n#${AH()}${mkTag()} #charts #musicaurbana${mkSig()}`;
  }
  function logroPost(n) {
    const s = n.cancion ? songById(n.cancion) : null;
    const tpl = ['cifra', 'record'].includes(n.cat) ? 'hito' : 'charts';
    toStudio({ plantilla: tpl, titular: s ? `${s.titulo.toUpperCase()}` : `${AN()}`, etiqueta: n.etiqueta || 'LOGRO', numero: n.numero || '', sub: n.sub || '', imagen: n.imagen || (s && s.portada), texto: n.texto });
  }
  const LG_IC = { aniversario: 'cake', playlist: 'music', mundial: 'globe', numero1: 'trophy', top10: 'chart', debut: 'spark', pico: 'up', record: 'bolt', cifra: 'trophy' };
  function lgThumb(n, size) {
    const s = n.cancion ? songById(n.cancion) : null;
    const img = n.imagen || (s && s.portada);
    const box = h('div', { class: 'yc-lgt n' + (n.nivel || 1), style: `width:${size}px;height:${size}px` });
    const fb = () => box.replaceChildren(h('span', { class: 'yc-lgt-ic' }, icon(LG_IC[n.cat] || 'trophy')), h('i'));
    if (img) { const im = h('img', { src: img, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }); im.addEventListener('error', fb); box.append(im, h('i')); } else fb();
    return box;
  }
  // puesto actual del logro (los logros de listas y playlists muestran cómo están ahora)
  const platJS = (c) => c.plataforma === 'YouTube' && String(c.lista || '').startsWith('Top canciones') ? 'YouTube Charts' : c.plataforma;
  function logroRef(n) {
    if (n.ref) return n.ref;
    const p = String(n.id || '').split(':'); const k = p[1];
    if (['top10', 'n1', 'debut'].includes(k)) return { tipo: 'lista', plat: p[2], pais: p[3], cancion: p.slice(4).join(':') };
    if (k === 'pico') return { tipo: 'lista', plat: p[2], pais: p[3], cancion: p.slice(4, -1).join(':') };
    if (k === 'global') return { tipo: 'lista', plat: p[2], global: true, cancion: p.slice(3).join(':') };
    if (k === 'globalpico') return { tipo: 'lista', plat: p[2], global: true, cancion: p.slice(3, -1).join(':') };
    return null;
  }
  function logroLive(n) {
    const r = logroRef(n); if (!r) return null;
    if (r.tipo === 'playlist') {
      const pl = (DATA.playlists || []).find(x => x.url === r.url); if (!pl) return null;
      const t = (pl.temas || []).find(x => base(x.titulo) === base(r.cancion));
      return { pos: t ? t.pos : null, fecha: pl.consultado };
    }
    const isG = (c) => ['WW', 'GLOBAL'].includes(String(c.codigo || '').toUpperCase()) || ['Global', 'Mundial'].includes(c.pais);
    const rows = (DATA.charts || []).filter(c => platJS(c) === r.plat && (r.global ? isG(c) : c.pais === r.pais));
    if (!rows.length) return null;
    const mine = rows.filter(c => c.posicion != null && c.cancion && base(c.cancion) === base(r.cancion));
    return { pos: mine.length ? Math.min(...mine.map(c => c.posicion)) : null, fecha: rows.map(c => c.fecha_lista || c.consultado).sort().pop() };
  }
  function liveTxt(n) {
    const L = logroLive(n); if (!L) return null;
    const orig = parseInt(String(n.numero || '').replace('#', ''), 10);
    if (L.pos == null) return { num: n.numero, txt: `Llegó al ${n.numero} · ahora fuera`, cls: 'off' };
    if (isNum(orig) && L.pos === orig) return { num: '#' + L.pos, txt: `Sigue en el #${L.pos}`, cls: 'eq' };
    return { num: '#' + L.pos, txt: `Llegó al ${n.numero} · ahora #${L.pos}`, cls: isNum(orig) && L.pos < orig ? 'up' : 'down' };
  }
  function logroRow(n) {
    const lv = LG_NIVEL[n.nivel || 1] || LG_NIVEL[1];
    const lt = liveTxt(n);
    return h('div', { class: 'yc-row yc-lgrow', role: 'button', tabindex: 0, onclick: () => openLogro(n), onkeydown: (e) => { if (e.key === 'Enter') openLogro(n); } },
      lgThumb(n, 46),
      h('div', { class: 'yc-row-main' },
        h('b', { class: 'yc-lg-title', text: n.titulo }),
        h('small', null, h('span', { class: 'yc-lg-dot n' + (n.nivel || 1) }), `${lv[0].replace(/^\S+ /, '')} · ${(LG_CAT[n.cat] || 'Logro')}`),
        lt ? h('small', { class: 'yc-lg-live ' + lt.cls, text: lt.txt }) : null),
      h('div', { class: 'yc-lg-n n' + (n.nivel || 1) + (lt && lt.cls === 'off' ? ' faded' : ''), text: lt ? lt.num : (n.numero || '') }),
      icon('chev', 'yc-chev'));
  }
  function openLogro(n) {
    const s = n.cancion ? songById(n.cancion) : null;
    const lv = LG_NIVEL[n.nivel || 1] || LG_NIVEL[1];
    const body = h('div', { class: 'yc-lgd' },
      h('div', { class: 'yc-lgd-hero' }, lgThumb(n, 88),
        h('div', null, h('span', { class: 'yc-lgd-lv n' + (n.nivel || 1), text: lv[0].replace(/^\S+ /, '') + ' · ' + (LG_CAT[n.cat] || 'Logro') }),
          h('div', { class: 'yc-lgd-num', text: (liveTxt(n) || {}).num || n.numero || '🏆' }), n.sub ? h('small', { text: n.sub }) : null)),
      liveTxt(n) ? h('p', { class: 'yc-lg-live big ' + liveTxt(n).cls, text: liveTxt(n).txt + ' (dato de la última actualización)' }) : null,
      h('h3', { class: 'yc-lgd-t', text: n.titulo }),
      n.texto ? h('p', { class: 'yc-sub', text: n.texto }) : null,
      h('p', { class: 'yc-note', text: [n.fuente, dfmt(n.fecha)].filter(Boolean).join(' · ') }),
      h('div', { class: 'yc-list yc-actions-list' },
        h('div', { class: 'yc-row yc-act pri', onclick: () => { closeSheet(); logroPost(n); } }, h('span', { class: 'yc-moreic' }, icon('pen')), h('div', { class: 'yc-row-main' }, h('b', { text: 'Crear post' }), h('small', { text: 'Abre el Estudio con la plantilla rellenada' })), icon('chev', 'yc-chev')),
        h('div', { class: 'yc-row yc-act', onclick: () => copy(logroCaption(n)) }, h('span', { class: 'yc-moreic' }, icon('copy')), h('div', { class: 'yc-row-main' }, h('b', { text: 'Copiar caption' }), h('small', { text: 'Con emojis, fuente, hashtags y tu firma' }))),
        s ? h('div', { class: 'yc-row yc-act', onclick: () => { closeSheet(); setTimeout(() => openSong(s.id), 350); } }, h('span', { class: 'yc-moreic' }, icon('music')), h('div', { class: 'yc-row-main' }, h('b', { text: 'Ver canción' }), h('small', { text: s.titulo })), icon('chev', 'yc-chev')) : null,
        n.url ? h('a', { class: 'yc-row yc-act', href: n.url, target: '_blank', rel: 'noopener' }, h('span', { class: 'yc-moreic' }, icon('link')), h('div', { class: 'yc-row-main' }, h('b', { text: 'Abrir la fuente' })), icon('chev', 'yc-chev')) : null));
    openSheet('Logro', body);
  }
  function lgDay(d) {
    const t = today().toISOString().slice(0, 10), y = new Date(today() - 864e5).toISOString().slice(0, 10);
    if (d === t) return 'Hoy'; if (d === y) return 'Ayer';
    return d ? parseD(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : 'Sin fecha';
  }
  let lgF = 'todo';
  // ---------- METAS Y LOGROS (nueva sección) ----------
  // siguiente número redondo: 28,3 M → 30 M · 1,2 M → 1,5 M · 840 mil → 900 mil
  function metaRedonda(v) {
    if (!isNum(v) || v <= 0) return null;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    for (const f of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 7.5, 8, 9, 10]) { const m = f * mag; if (m > v) return m; }
    return 10 * mag;
  }
  const PERFIL_METAS = [
    ['spotify', 'Oyentes mensuales', 'spotify_oyentes_mensuales', P => (P.spotify || {}).oyentes_mensuales, 'Spotify'],
    ['spotify', 'Seguidores', 'spotify_seguidores', P => (P.spotify || {}).seguidores, 'Spotify'],
    ['spotify', 'Streams totales', 'spotify_streams_totales', P => (P.spotify || {}).streams_totales, 'Spotify'],
    ['youtube', 'Suscriptores', 'youtube_suscriptores', P => (P.youtube || {}).suscriptores, 'YouTube'],
    ['youtube', 'Vistas del canal', 'youtube_vistas_totales', P => (P.youtube || {}).vistas, 'YouTube'],
    ['instagram', 'Seguidores', 'instagram_seguidores', P => (P.instagram || {}).seguidores, 'Instagram'],
    ['tiktok', 'Seguidores', 'tiktok_seguidores', P => (P.tiktok || {}).seguidores, 'TikTok'],
    ['shazam', 'Shazams', 'shazams', P => (P.shazam || {}).total, 'Shazam'],
  ];
  function metasPerfil() {
    const P = DATA.perfil || {};
    return PERFIL_METAS.map(([k, label, key, get, plat]) => {
      const v = get(P); if (!isNum(v) || v <= 0) return null;
      const paso = v >= 100e6 ? 10e6 : v >= 10e6 ? 5e6 : v >= 1e6 ? 1e6 : 250e3;  // seguidores: cada 5 M / 10 M
      const meta = /seguidores|suscriptores|oyentes/i.test(label) ? (Math.floor(v / paso) + 1) * paso : metaRedonda(v), g = growth(key);
      const ritmo = g && isNum(g.d7) && g.d7 > 0 ? g.d7 / 7 : g && isNum(g.media) && g.media > 0 ? g.media : null;
      const faltan = meta - v, dias = ritmo ? Math.ceil(faltan / ritmo) : null;
      return { k, label, plat, v, meta, faltan, ritmo, dias, pct: v / meta * 100, aPunto: dias != null && dias <= 1 };
    }).filter(Boolean).sort((a, b) => (a.dias ?? 1e9) - (b.dias ?? 1e9));
  }
  function metaCard(m) {
    const rb = h('div', { class: 'mt-ringbox' }, ring(m.pct, 64), pico(m.k));
    const LBL = { 'Oyentes mensuales': 'Oyentes mensuales', 'Seguidores': 'Seguidores', 'Streams totales': 'Streams totales', 'Suscriptores': 'Suscriptores', 'Vistas del canal': 'Vistas del canal', 'Shazams': 'Shazams totales' };
    return h('div', { class: 'mt-card reveal mt-clk' + (m.aPunto ? ' hot' : ''), role: 'button', tabindex: '0', onclick: () => openMetric(m.k, LBL[m.label] || m.label, m.v) },
      rb,
      h('div', { class: 'mt-body' },
        h('div', { class: 'mt-top' }, h('span', { class: 'mt-plat', text: m.label.toLowerCase().startsWith(m.plat.toLowerCase().slice(0, 5)) ? m.plat : `${m.label} · ${m.plat}` }), m.aPunto ? h('span', { class: 'mt-badge', text: 'A punto' }) : null),
        h('div', { class: 'mt-nums' }, h('b', { class: 'mt-now num', text: short2(m.v) }), h('span', { class: 'mt-arrow', text: '→' }), h('b', { class: 'mt-goal num', text: short(m.meta) })),
        h('small', { class: 'mt-sub', text: m.ritmo ? (m.aPunto ? `Faltan ${full(m.faltan)} · lo consigue hoy o mañana` : `Faltan ${full(m.faltan)} · ≈ ${m.dias} ${m.dias === 1 ? 'día' : 'días'} a +${short(Math.round(m.ritmo))}/día`) : `Faltan ${full(m.faltan)}` })));
  }
  function songMetaCard(m) {
    const t = h('div', { class: 'mt-card mt-song reveal' + (m.aPunto ? ' hot' : ''), role: 'button', tabindex: '0', onclick: () => openSong(m.s.id) },
      h('div', { class: 'mt-cov' }, art(m.s)),
      h('div', { class: 'mt-main' },
        h('div', { class: 'mt-top' }, h('span', { class: 'mt-plat', text: `${short(m.meta)} en Spotify` }), m.aPunto ? h('span', { class: 'mt-badge', text: 'A punto' }) : null),
        h('b', { class: 'mt-title', text: m.s.titulo }),
        h('small', { class: 'mt-sub', text: m.aPunto ? `Faltaban ${full(m.faltan)} · suma ${short(m.s.sp.diarios)} al día, ya casi` : `${short2(m.s.sp.total)} · faltan ${short(m.faltan)} · ≈ ${m.dias} ${m.dias === 1 ? 'día' : 'días'}` }),
        h('div', { class: 'mt-line' }, h('i', { style: `--w:${Math.min(100, m.pct).toFixed(2)}%` }))));
    return t;
  }
  function logroBig(n) {
    const s = n.cancion ? songById(n.cancion) : null;
    const em = { aniversario: '🎂', playlist: '📋', mundial: '🌍', numero1: '🥇', top10: '🔟', debut: '🚀', pico: '📈', record: '💥', cifra: '🏆' }[n.cat] || '🏆';
    const t = h('div', { class: 'lgx-card reveal n' + (n.nivel || 1), role: 'button', tabindex: '0', onclick: () => openLogro(n) },
      h('div', { class: 'lgx-bg' }), h('div', { class: 'lgx-shine' }),
      h('div', { class: 'lgx-in' },
        lgThumb(n, 64),
        h('div', { class: 'lgx-main' },
          h('span', { class: 'lgx-tag', text: `${em}  ${LG_CAT[n.cat] || 'Logro'} · ${lgDay(n.fecha)}` }),
          h('b', { class: 'lgx-t', text: n.titulo }),
          n.numero ? h('span', { class: 'lgx-n num', text: String(n.numero).replace(/^#(\d+)/, 'Top $1') }) : null),
        h('button', { class: 'yc-chip lgx-post', type: 'button', onclick: (e) => { e.stopPropagation(); logroPost(n); } }, icon('pen'), 'Post')));
    if (s) tint(t, coverOf(s), s.titulo);
    return t;
  }
  function renderLogros() {
    const el = $('#p-logros'); el.replaceChildren();
    const all = logrosList();
    const T = today().toISOString().slice(0, 10), hace3 = new Date(today() - 3 * 864e5).toISOString().slice(0, 10);
    const recientes = all.filter(n => (n.fecha || '') >= hace3).sort((a, b) => (b.nivel || 1) - (a.nivel || 1)).slice(0, 6);
    const mp = metasPerfil(), ms = proximosHitos();
    const calientes = [...mp.filter(m => m.dias != null && m.dias <= 7).map(m => ({ t: 'p', m, d: m.dias })), ...ms.filter(m => m.dias <= 7).map(m => ({ t: 's', m, d: m.dias }))].sort((a, b) => a.d - b.d);
    el.append(h('div', { class: 'mt-hero' },
      h('div', { class: 'mt-hero-glow' }),
      h('span', { class: 'mt-hero-k', text: 'Logros y metas' }),
      h('h1', { class: 'yc-h1 mt-h1', text: recientes.length ? `${recientes.length} ${recientes.length === 1 ? 'logro nuevo' : 'logros nuevos'}` : 'Metas y logros' }),
      h('p', { class: 'yc-sub', text: calientes.length ? `${calientes.filter(c => c.m.aPunto).length ? `${calientes.filter(c => c.m.aPunto).length} a punto de caer · ` : ''}${calientes.length} ${calientes.length === 1 ? 'meta' : 'metas'} en los próximos 7 días. Se detecta todo solo, con datos reales.` : 'Todo lo que merece post, detectado solo con datos reales.' })));
    el.append(fichaLink());
    if (recientes.length) {
      el.append(section('Desbloqueados', 'últimos 3 días'));
      el.append(h('div', { class: 'lgx-grid' }, recientes.map(logroBig)));
    }
    if (calientes.length) {
      el.append(section('A punto de caer', 'próximos 7 días'));
      el.append(h('div', { class: 'mt-grid' }, calientes.slice(0, 9).map(c => c.t === 'p' ? metaCard(c.m) : songMetaCard(c.m))));
    }
    el.append(section('Metas del perfil', 'cada plataforma'));
    el.append(mp.length ? h('div', { class: 'mt-grid' }, mp.filter(m => !(m.dias != null && m.dias <= 7)).map(metaCard)) : h('p', { class: 'yc-empty', text: 'Faltan datos del perfil.' }));
    el.append(section('Cuenta atrás', 'canciones en Spotify'));
    const resto = ms.filter(m => m.dias > 7).slice(0, 12);
    el.append(resto.length ? h('div', { class: 'mt-grid' }, resto.map(songMetaCard)) : h('p', { class: 'yc-empty', text: 'Ningún hito cercano.' }));
    // historial
    el.append(section('Todos los logros', `${all.length}`));
    const cats = Object.keys(LG_CAT).filter(k => k === 'todo' || all.some(n => n.cat === k));
    el.append(h('div', { class: 'yc-seg yc-lg-seg' }, cats.map(k => h('button', { type: 'button', 'aria-pressed': String(lgF === k), onclick: () => { lgF = k; renderLogros(); }, text: LG_CAT[k] }))));
    const rows = all.filter(n => lgF === 'todo' || n.cat === lgF);
    if (!rows.length) { el.append(h('div', { class: 'yc-lg-empty' }, h('span', { class: 'yc-moreic' }, icon('trophy')), h('b', { text: 'Aún no hay logros' }))); }
    let day = null, list = null;
    for (const n of rows.slice(0, 150)) {
      if (n.fecha !== day) { day = n.fecha; el.append(h('div', { class: 'yc-group-h', text: lgDay(day) })); list = h('div', { class: 'yc-list' }); el.append(list); }
      list.append(logroRow(n));
    }
    $$('.reveal', el).forEach(x => typeof reveal === 'function' ? reveal(x) : x.classList.add('in'));
  }
  // ---------- celebración: aviso a pantalla completa con confeti cuando hay un logro nuevo ----------
  function celebrar() {
    try {
      const hace2 = new Date(today() - 2 * 864e5).toISOString().slice(0, 10);
      const vistos = new Set(store.get('aa.lg.vistos', []));
      const nuevos = logrosList().filter(n => (n.fecha || '') >= hace2 && !vistos.has(n.id)).sort((a, b) => (b.nivel || 1) - (a.nivel || 1));
      const aPunto = [...metasPerfil().filter(m => m.aPunto), ...proximosHitos().filter(m => m.aPunto)];
      if (!nuevos.length && !aPunto.length) return;
      const clave = 'aa.lg.apunto.' + today().toISOString().slice(0, 10);
      if (!nuevos.length && store.get(clave, false)) return;
      const n = nuevos[0];
      const ov = h('div', { class: 'cel-ov', role: 'dialog', 'aria-modal': 'true' });
      const cv = h('canvas', { class: 'cel-cv' });
      const close = () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 380); store.set('aa.lg.vistos', [...vistos, ...nuevos.map(x => x.id)].slice(-400)); store.set(clave, true); };
      const em = n ? ({ aniversario: '🎂', playlist: '📋', mundial: '🌍', numero1: '🥇', top10: '🔟', debut: '🚀', pico: '📈', record: '💥', cifra: '🏆' }[n.cat] || '🏆') : '🔥';
      const m0 = aPunto[0];
      ov.append(cv, h('div', { class: 'cel-card' },
        h('div', { class: 'cel-ring' }), h('div', { class: 'cel-em', text: em }),
        h('span', { class: 'cel-k', text: n ? (nuevos.length > 1 ? `${nuevos.length} logros nuevos` : 'Logro desbloqueado') : 'A punto de caer' }),
        h('b', { class: 'cel-t', text: n ? n.titulo : (m0.s ? `«${m0.s.titulo}» va a superar los ${short(m0.meta)} en Spotify` : `${AN()} va a llegar a ${short(m0.meta)} ${m0.label.toLowerCase()} en ${m0.plat}`) }),
        n && n.numero ? h('div', { class: 'cel-n num', text: String(n.numero).replace(/^#(\d+)/, 'Top $1') }) : null,
        nuevos.length > 1 ? h('div', { class: 'cel-more' }, nuevos.slice(1, 4).map(x => h('small', { text: '• ' + x.titulo }))) : null,
        aPunto.length && n ? h('small', { class: 'cel-hot', text: `Y ${aPunto.length} ${aPunto.length === 1 ? 'meta está' : 'metas están'} a punto de caer` }) : null,
        h('div', { class: 'cel-act' },
          n ? h('button', { class: 'yc-btn', type: 'button', onclick: () => { close(); logroPost(n); } }, 'Crear post') : null,
          h('button', { class: 'yc-btn sec', type: 'button', onclick: () => { close(); go('logros'); } }, 'Ver metas y logros'),
          h('button', { class: 'cel-x', type: 'button', 'aria-label': 'Cerrar', onclick: close }, '✕'))));
      ov.addEventListener('click', (e) => { if (e.target === ov || e.target === cv) close(); });
      document.body.append(ov);
      requestAnimationFrame(() => ov.classList.add('on'));
      if (!REDUCED) confeti(cv);
    } catch (e) { /* nunca rompe la web */ }
  }
  function confeti(cv) {
    const ctx = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    const W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
    const ac = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff2b3d'; const cols = [ac, ac, '#ffffff', '#ffffff', '#ffd27a'];
    const P = Array.from({ length: 90 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .45, vx: (Math.random() - .5) * 26 * dpr, vy: (-Math.random() * 24 - 8) * dpr, r: (4 + Math.random() * 6) * dpr, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, va: (Math.random() - .5) * .4 }));
    let t = 0;
    const tick = () => {
      t++; ctx.clearRect(0, 0, W, H);
      for (const p of P) { p.vy += .55 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - t / 200); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-p.r, -p.r / 3, p.r * 2, p.r * .66, p.r / 3) : ctx.rect(-p.r, -p.r / 3, p.r * 2, p.r * .66); ctx.fill(); ctx.restore(); }
      if (t < 200 && cv.isConnected) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(tick);
  }

  // ---------- playlists oficiales ----------
  const PL_K = { 'Spotify': 'spotify', 'Apple Music': 'apple', 'Deezer': 'deezer' };
  const plName = (p) => p.nombre_oficial || p.nombre;
  function songPlaylists(id) {
    const out = [];
    for (const p of DATA.playlists || []) for (const t of p.temas || []) if (t.cancion === id) out.push({ p, t });
    return out.sort((a, b) => a.t.pos - b.t.pos);
  }
  function renderPlaylists(el) {
    const P = (DATA.playlists || []).slice();
    const sh = section('Playlists oficiales', ''); sh.append(h('button', { class: 'yc-h2-link', onclick: openPlaylistsSheet, text: 'Añadir' })); el.append(sh);
    if (!P.length) { el.append(h('p', { class: 'yc-note', text: 'Se revisan en la próxima actualización completa (FRONTEO, Viva Latino, Mansión Reggaetón, CALLE de Apple Music…).' })); return; }
    const withHim = P.filter(p => (p.temas || []).length).sort((a, b) => a.temas[0].pos - b.temas[0].pos);
    const without = P.filter(p => !(p.temas || []).length);
    const row = (p) => {
      const k = PL_K[p.plataforma] || 'spotify', n = (p.temas || []).length;
      return h('div', { class: 'yc-row', onclick: () => openPlaylist(p) }, pico(k),
        h('div', { class: 'yc-row-main' }, h('b', { text: plName(p) }), h('small', { text: n ? `${n} tema${n > 1 ? 's' : ''} suyo${n > 1 ? 's' : ''} · ${p.temas.slice().sort((a, b) => a.pos - b.pos).map(t => `#${t.pos} ${t.titulo}`).slice(0, 4).join(' · ')}` : `${p.plataforma} · ahora sin temas suyos` })),
        h('div', { class: 'yc-row-meta' }, n ? h('b', { style: 'color:var(--up)', text: '#' + Math.min(...p.temas.map(t => t.pos)) }) : h('b', { style: 'color:var(--text3)', text: '—' }), h('small', { text: n ? `su mejor tema${p.total ? ` · de ${p.total}` : ''}` : (p.total ? `de ${p.total}` : '') })), icon('chev', 'yc-chev'));
    };
    if (withHim.length) el.append(h('div', { class: 'yc-list' }, withHim.map(row)));
    if (without.length) { el.append(h('div', { class: 'yc-group-h', text: 'Sin temas suyos ahora' })); el.append(h('div', { class: 'yc-list' }, without.map(row))); }
    el.append(h('p', { class: 'yc-note', text: 'Se revisan en cada actualización completa (cada 5 horas). Cuando un tema entra, sube o llega al top 10 de una playlist, sale en Lo nuevo y en Logros.' }));
  }
  function openPlaylist(p) {
    const body = h('div');
    body.append(h('p', { class: 'yc-sub', text: `${p.plataforma}${p.curador ? ' · ' + p.curador : ''}${p.total ? ` · ${p.total} canciones revisadas` : ''} · ${dfmt(p.consultado)}` }));
    body.append(h('div', { class: 'yc-list' }, (p.temas || []).length ? p.temas.map(t => {
      const s = t.cancion ? songById(t.cancion) : null;
      const mv = t.antes == null ? 'nuevo' : t.antes > t.pos ? `▲ ${t.antes - t.pos}` : t.antes < t.pos ? `▼ ${t.pos - t.antes}` : '=';
      return h('div', { class: 'yc-row', onclick: s ? () => { closeSheet(); setTimeout(() => openSong(s.id), 350); } : null, style: s ? null : 'cursor:default' },
        s ? art(s) : h('span', { class: 'yc-stepn', text: '♪' }),
        h('div', { class: 'yc-row-main' }, h('b', { text: t.titulo }), h('small', { text: t.artistas })),
        h('div', { class: 'yc-row-meta' }, h('b', { text: '#' + t.pos }), h('small', { style: `color:${mv.startsWith('▲') ? 'var(--up)' : mv.startsWith('▼') ? 'var(--down)' : 'var(--text2)'}`, text: mv })));
    }) : [h('div', { class: 'yc-row', style: 'cursor:default' }, h('div', { class: 'yc-row-main' }, h('small', { text: 'Ahora mismo no hay temas suyos en esta playlist.' })))]));
    body.append(h('a', { class: 'yc-btn yc-btn-wide', href: p.url, target: '_blank', rel: 'noopener', text: 'Abrir la playlist ↗' }));
    openSheet(plName(p), body);
  }
  function openPlaylistsSheet() {
    let list = store.get('yc.playlists', []);
    const body = h('div', { class: 'yc-form' });
    const st = h('p', { class: 'yc-note yc-form-st' });
    const ul = h('div', { class: 'yc-list' });
    const kind = (u) => /spotify/.test(u) ? 'spotify' : /apple/.test(u) ? 'apple' : /deezer/.test(u) ? 'deezer' : 'music';
    const draw = () => ul.replaceChildren(...(list.length ? list.map((f, i) => h('div', { class: 'yc-row yc-frow' }, PLAT[kind(f.url)] ? pico(kind(f.url)) : h('span', { class: 'yc-fic' }, icon('music')),
      h('div', { class: 'yc-row-main' }, h('b', { text: f.nombre }), h('small', { text: f.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48) })),
      h('button', { class: 'yc-del', type: 'button', 'aria-label': 'Quitar', onclick: () => { list.splice(i, 1); draw(); saveB.disabled = false; } }))) :
      [h('div', { class: 'yc-row yc-frow', style: 'cursor:default' }, h('div', { class: 'yc-row-main' }, h('small', { text: 'Ya se revisan 13 playlists oficiales. Aquí puedes añadir más.' })))]));
    const nm = h('input', { class: 'yc-in', placeholder: 'Trap Hits', 'aria-label': 'Nombre' });
    const url = h('input', { class: 'yc-in', type: 'url', inputmode: 'url', autocapitalize: 'off', placeholder: 'https://open.spotify.com/playlist/…', 'aria-label': 'Enlace' });
    const saveB = h('button', { class: 'yc-btn yc-btn-wide', type: 'button', text: 'Guardar', disabled: true });
    const add = () => { const u = url.value.trim(); if (!/(open\.spotify\.com\/.*playlist|music\.apple\.com\/.*playlist|deezer\.com\/.*playlist)/.test(u)) { st.textContent = 'Pega el enlace de una playlist de Spotify, Apple Music o Deezer (Compartir → Copiar enlace).'; return; } list.push({ nombre: nm.value.trim().replace(/\|/g, ' ') || 'Playlist', url: u.split('?')[0] }); nm.value = url.value = ''; st.textContent = ''; draw(); saveB.disabled = false; };
    saveB.addEventListener('click', async () => {
      store.set('yc.playlists', list);
      if (!(GH.owner && GH.repo && GH.token)) { openGitHubConnect(); return; }
      saveB.disabled = true; saveB.textContent = 'Guardando…';
      try { await ghVar('PLAYLISTS_EXTRA', list.map(f => `${f.nombre}|${f.url}`).join('\n')); toast('Playlists guardadas ✓'); saveB.textContent = 'Guardado'; st.textContent = 'Se revisarán en la próxima actualización completa.'; }
      catch (e) { st.textContent = 'No se pudo guardar en GitHub (' + e.message + ').'; saveB.disabled = false; saveB.textContent = 'Guardar'; }
    });
    body.append(h('p', { class: 'yc-form-intro', text: 'Añade cualquier playlist de Spotify, Apple Music o Deezer: se mira en qué puesto están sus temas.' }),
      h('div', { class: 'yc-group-h', text: 'Tus playlists' }), ul, h('div', { class: 'yc-group-h', text: 'Añadir' }),
      h('div', { class: 'yc-list' }, h('label', { class: 'yc-frow-in' }, h('span', { text: 'Nombre' }), nm), h('label', { class: 'yc-frow-in' }, h('span', { text: 'Enlace' }), url),
        h('button', { class: 'yc-row yc-addrow', type: 'button', onclick: add }, h('span', { class: 'yc-plus' }), h('b', { text: 'Añadir playlist' }))), st, saveB);
    draw(); openSheet('Playlists', body);
    if (GH.owner && GH.repo && GH.token) ghVar('PLAYLISTS_EXTRA').then(v => { if (!v) return; list = v.split(/\n/).map(l => l.split('|')).filter(x => x[1]).map(([n, u]) => ({ nombre: n.trim(), url: u.trim() })); store.set('yc.playlists', list); draw(); }).catch(() => null);
  }

  // ---------- favoritas ----------
  const FAV_MAX = 4;
  const favs = () => store.get('yc.favs', []).filter(id => songById(id));
  const isFav = (id) => store.get('yc.favs', []).includes(id);
  function toggleFav(id) {
    let f = store.get('yc.favs', []);
    if (f.includes(id)) { f = f.filter(x => x !== id); toast('Quitada de favoritas'); }
    else { if (f.length >= FAV_MAX) { toast(`Máximo ${FAV_MAX} favoritas: quita una primero`); return; } f.push(id); toast('⭐ Añadida a favoritas: sale arriba en Inicio'); }
    store.set('yc.favs', f); haptic();
    if (RENDERED.has('inicio')) { RENDERED.delete('inicio'); if (current === 'inicio') renderPage('inicio'); }
  }
  const bestNow = (s) => { const r = (s.hoy || []).slice().sort((a, b) => a.posicion - b.posicion)[0]; return r ? { p: r.posicion, pais: r.pais, cc: ccOf(r.pais, r.codigo), plat: platJS(r) } : null; };
  function renderFavs(el) {
    const F = favs().map(songById);
    const sh = section('Tus favoritas', ''); el.append(sh);
    if (!F.length) { el.append(h('div', { class: 'yc-list' }, h('div', { class: 'yc-row', style: 'cursor:default' }, h('span', { class: 'yc-moreic' }, icon('star')), h('div', { class: 'yc-row-main' }, h('b', { text: 'Sigue tus canciones' }), h('small', { style: 'white-space:normal', text: `Abre cualquier canción y toca «☆ Seguir». Hasta ${FAV_MAX} salen aquí con su evolución del día.` }))))); return; }
    el.append(h('div', { class: 'yc-favs' }, F.map(s => {
      const yd = ytDaily(s), b = bestNow(s), pl = songPlaylists(s.id)[0];
      return h('div', { class: 'yc-fav', role: 'button', tabindex: 0, onclick: () => openSong(s.id) },
        h('div', { class: 'yc-fav-h' }, art(s, 40), h('div', { class: 'yc-row-main' }, h('b', { text: s.titulo }), h('small', { text: s.lanzamiento ? `hace ${s.diasPublicado} días` : (s.artistas || '') }))),
        h('div', { class: 'yc-fav-k' },
          h('div', null, h('span', { class: 'dot sp' }), h('b', { text: short(s.sp.total) }), h('small', { text: isNum(s.sp.diarios) ? `+${short(s.sp.diarios)} hoy` : 'Spotify' })),
          h('div', null, h('span', { class: 'dot yt' }), h('b', { text: short(s.yt && s.yt.vistas) }), h('small', { text: isNum(yd) ? `+${short(yd)} hoy` : 'YouTube' }))),
        h('div', { class: 'yc-fav-f' }, b ? [flagEl(b.cc, 'sm'), ` #${b.p} ${b.plat} ${b.pais}`] : pl ? `📋 #${pl.t.pos} en ${plName(pl.p)}` : 'Hoy fuera de listas'));
    })));
  }

  // ---------- hoy en números ----------
  function todayData() {
    const P = DATA.perfil, hs = histSorted(), T = today().toISOString().slice(0, 10);
    const d = (k) => { if (hs.length < 2) return null; const a = hs[hs.length - 2][k], b = hs[hs.length - 1][k]; return isNum(a) && isNum(b) ? b - a : null; };
    const ytToday = SONGS.reduce((t, s) => { const v = ytDaily(s); return t + (isNum(v) ? v : 0); }, 0);
    const charts = (DATA.charts || []).filter(c => c.posicion != null);
    const best = charts.slice().sort((a, b) => a.posicion - b.posicion)[0];
    const movers = charts.map(c => ({ c, up: parseInt(String(c.cambio || '').replace('+', ''), 10) })).filter(x => x.up > 0 && /^\+/.test(String(x.c.cambio))).sort((a, b) => b.up - a.up);
    const lgs = logrosList().filter(n => n.fecha === T);
    const news = (DATA.novedades || []).filter(n => n.fecha === T && n.tipo !== 'logro');
    return { T, sp: P.spotify || {}, yt: P.youtube || {}, dOy: d('spotify_oyentes_mensuales'), dSubs: d('youtube_suscriptores'), dIg: d('instagram_seguidores'), dTt: d('tiktok_seguidores'), ytToday, nCharts: charts.length, best, mover: movers[0], lgs, news };
  }
  const sgn = (v) => isNum(v) && v !== 0 ? (v > 0 ? '+' : '−') + short(Math.abs(v)) : null;
  function todayText(t) {
    const L = [`📊 ${AN()} HOY (${dfmt(t.T, { year: undefined })})`, ''];
    if (isNum(t.sp.streams_diarios)) L.push(`🟢 @spotify: ${short2(t.sp.streams_diarios)} streams en un día${isNum(t.sp.oyentes_mensuales) ? ` · ${short2(t.sp.oyentes_mensuales)} oyentes mensuales${sgn(t.dOy) ? ` (${sgn(t.dOy)})` : ''}` : ''}`);
    if (t.ytToday) L.push(`🔴 @youtube: +${short2(t.ytToday)} views en sus vídeos${isNum(t.yt.suscriptores) ? ` · ${short2(t.yt.suscriptores)} suscriptores${sgn(t.dSubs) ? ` (${sgn(t.dSubs)})` : ''}` : ''}`);
    if (t.nCharts) L.push(`📈 En ${t.nCharts} listas${t.best ? ` · mejor puesto Top ${t.best.posicion} en ${t.best.lista} de ${t.best.plataforma} ${t.best.pais} ${flagEmoji(t.best.codigo || ccOf(t.best.pais))}` : ''}`);
    if (t.mover) L.push(`🚀 La que más sube: ${String(t.mover.c.cancion).split(' (')[0]} (${t.mover.c.cambio}) en ${t.mover.c.plataforma} ${t.mover.c.pais}`);
    if (sgn(t.dIg) || sgn(t.dTt)) L.push(`📱 Redes: ${[sgn(t.dIg) ? `Instagram ${sgn(t.dIg)}` : '', sgn(t.dTt) ? `TikTok ${sgn(t.dTt)}` : ''].filter(Boolean).join(' · ')}`);
    if (t.lgs.length) { L.push('', '🏆 Logros de hoy:'); t.lgs.slice(0, 5).forEach(n => L.push(`• ${n.titulo}`)); }
    L.push('', `#${AH()}${mkTag()} #charts`); if (MK()) L.push(`🎨 @${MK()}`);
    return L.join('\n');
  }
  function renderToday(el) {
    const t = todayData();
    const sh = section('Hoy en números', dfmt(t.T, { year: undefined })); el.append(sh);
    const chip = (label, val, sub, cls) => h('div', { class: 'yc-today-c' + (cls ? ' ' + cls : '') }, h('small', { text: label }), h('b', { text: val }), sub ? h('span', { text: sub }) : null);
    const card = h('div', { class: 'yc-today' },
      h('div', { class: 'yc-today-g' },
        chip('Streams del día', short(t.sp.streams_diarios), 'Spotify', 'sp'),
        chip('Views hoy', t.ytToday ? '+' + short(t.ytToday) : '—', 'YouTube', 'yt'),
        chip('Oyentes', short2(t.sp.oyentes_mensuales), sgn(t.dOy) || 'Spotify'),
        chip('En listas', String(t.nCharts), t.best ? `mejor #${t.best.posicion}` : 'hoy'),
        chip('Logros hoy', String(t.lgs.length), t.lgs.length ? 'para publicar' : 'aún ninguno', t.lgs.length ? 'hot' : ''),
        chip('Novedades', String(t.news.length), 'hoy')),
      t.mover ? h('p', { class: 'yc-today-l' }, '🚀 ', h('b', { text: String(t.mover.c.cancion).split(' (')[0] }), ` sube ${t.mover.c.cambio} en ${t.mover.c.plataforma} ${t.mover.c.pais}`) : null,
      h('div', { class: 'st-actions' },
        h('button', { class: 'yc-btn', type: 'button', onclick: () => copy(todayText(todayData())), text: 'Copiar resumen' }),
        h('button', { class: 'yc-btn sec', type: 'button', onclick: () => toStudio({ plantilla: 'hito', formato: 'historia', titular: `${AN()} HOY`, etiqueta: 'HOY EN NÚMEROS', numero: short(t.sp.streams_diarios).replace(/\s/g, ''), sub: 'STREAMS EN UN DÍA EN SPOTIFY', imagen: DATA.artista.imagen }), text: 'Hacer historia' })));
    el.append(card);
  }

  // ---------- aniversarios ----------
  const ANIV = [[1, '1 mes'], [3, '3 meses'], [6, '6 meses'], [12, '1 año'], [24, '2 años'], [36, '3 años'], [48, '4 años'], [60, '5 años']];
  function addMonths(d, m) { const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m, d.getUTCDate())); if (r.getUTCDate() !== d.getUTCDate()) r.setUTCDate(0); return r; }
  function anivs(from = -2, to = 14) {
    const out = [], T = today();
    for (const s of SONGS) {
      const d0 = parseD(s.lanzamiento); if (!d0) continue;
      for (const [m, label] of ANIV) {
        const d = addMonths(d0, m), diff = Math.round((d - T) / 864e5);
        if (diff >= from && diff <= to) out.push({ s, m, label, d, diff });
      }
    }
    return out.sort((a, b) => a.diff - b.diff || b.m - a.m);
  }
  function anivText(a) {
    const s = a.s, spT = s.sp.total, ytT = s.yt && s.yt.vistas, b = bestNow(s);
    const tt = '«' + s.titulo.replace(/\s*\(.*?\)\s*/g, '').trim() + '»';
    const L = [`🎂 ${tt} de @${AU()} cumple ${a.label} 🎉`, '', `Salió el ${dfmt(s.lanzamiento)} y desde entonces lleva:`];
    if (isNum(spT)) L.push(`🟢 ${esN(spT)} de streams en @spotify`.replace(/(\d+k) de/, '$1'));
    if (isNum(ytT)) L.push(`🔴 ${esN(ytT)} de views en @youtube`.replace(/(\d+k) de/, '$1'));
    if (isNum(spT) && isNum(ytT)) L.push(`🔥 Total: ${esN(spT + ytT)} de reproducciones`.replace(/(\d+k) de/, '$1'));
    const pk = (s.picos || []).slice().sort((x, y) => x.pico - y.pico)[0];
    if (pk) L.push(`📈 Su mejor puesto en Spotify: Top ${pk.pico} en ${pk.pais} ${flagEmoji(pk.codigo)}`);
    if (b) L.push(`📍 Hoy sigue en el Top ${b.p} de ${b.plat} ${b.pais} ${flagEmoji(b.cc)}`);
    L.push('', `#${AH()}${mkTag()}`); if (MK()) L.push(`🎨 @${MK()}`);
    return L.join('\n');
  }
  function renderAnivs(el) {
    const A = anivs();
    if (!A.length) return;
    el.append(section('Aniversarios', 'próximas 2 semanas'));
    el.append(h('div', { class: 'yc-list' }, A.slice(0, 5).map(a => h('div', { class: 'yc-row', onclick: () => openAniv(a) }, art(a.s),
      h('div', { class: 'yc-row-main' }, h('b', { text: `${a.s.titulo} cumple ${a.label}` }), h('small', { text: a.diff === 0 ? '🎂 ¡Hoy!' : a.diff < 0 ? `fue hace ${-a.diff} día${a.diff < -1 ? 's' : ''}` : `en ${a.diff} día${a.diff > 1 ? 's' : ''} · ${dfmt(a.d.toISOString(), { year: undefined })}` })),
      h('div', { class: 'yc-row-meta' }, h('b', { class: a.diff === 0 ? 'yc-top gold' : '', text: a.label })), icon('chev', 'yc-chev')))));
  }
  function openAniv(a) {
    const txt = h('textarea', { class: 'st-in yc-capout', rows: 10 }); txt.value = anivText(a);
    openSheet(`${a.s.titulo} · ${a.label}`, h('div', null,
      h('p', { class: 'yc-sub', text: a.diff === 0 ? 'Cumple hoy. Caption listo con sus cifras desde la salida:' : `Cumple el ${dfmt(a.d.toISOString())}. Caption preparado con sus cifras de ahora:` }), txt,
      h('div', { class: 'st-actions' }, h('button', { class: 'yc-btn', type: 'button', onclick: () => copy(txt.value), text: 'Copiar caption' }),
        h('button', { class: 'yc-btn sec', type: 'button', onclick: () => { closeSheet(); toStudio({ plantilla: 'hito', titular: a.s.titulo.toUpperCase(), etiqueta: 'ANIVERSARIO', numero: a.label.toUpperCase(), sub: 'DESDE SU SALIDA', imagen: a.s.portada }); }, text: 'Hacer imagen' }))));
  }

  // ---------- buscador global (⌘K / Ctrl+K, «/» o deslizando hacia abajo en el móvil) ----------
  const fold = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let spot = null;
  function searchIndex() {
    const out = [];
    for (const s of SONGS) out.push({ k: 'Canciones', t: s.titulo, sub: [s.artistas, s.album].filter(Boolean).join(' · '), q: fold(`${s.titulo} ${s.artistas} ${s.album || ''}`), lead: () => art(s, 36), go: () => openSong(s.id) });
    for (const p of DATA.playlists || []) out.push({ k: 'Playlists', t: plName(p), sub: `${p.plataforma} · ${(p.temas || []).length ? (p.temas || []).length + ' temas suyos' : 'sin temas suyos ahora'}`, q: fold(`${plName(p)} ${p.nombre} ${p.plataforma}`), lead: () => pico(PL_K[p.plataforma] || 'spotify'), go: () => openPlaylist(p) });
    const paises = {};
    for (const c of DATA.charts || []) { const x = paises[c.pais] = paises[c.pais] || { n: 0, best: null, cc: ccOf(c.pais, c.codigo) }; if (c.posicion != null) { x.n++; if (!x.best || c.posicion < x.best) x.best = c.posicion; } }
    for (const [pais, x] of Object.entries(paises)) out.push({ k: 'Países y listas', t: pais, sub: x.n ? `En ${x.n} lista${x.n > 1 ? 's' : ''} · mejor #${x.best}` : 'Fuera de sus listas hoy', q: fold(pais), lead: () => flagEl(x.cc), go: () => goChartsQuery(pais) });
    for (const pl of ['Spotify', 'Apple Music', 'YouTube', 'Shazam', 'Deezer', 'iTunes']) out.push({ k: 'Países y listas', t: pl, sub: 'Todas sus listas', q: fold(pl), lead: () => pico(PLAT_BY_NAME[pl]), go: () => { LF.plat = pl; goChartsQuery(''); } });
    for (const a of DATA.albumes || []) out.push({ k: 'Discos', t: a.album, sub: [a.tipo, a.fecha_lanzamiento ? dfmt(a.fecha_lanzamiento) : '', isNum(a.spotify_streams) ? short(a.spotify_streams) + ' streams' : ''].filter(Boolean).join(' · ') || 'Disco', q: fold(a.album + ' disco album'), lead: () => albumCover(a, 36), go: () => openAlbum(a.album) });
    for (const n of logrosList().slice(0, 80)) out.push({ k: 'Logros', t: n.titulo, sub: dfmt(n.fecha), q: fold(n.titulo), lead: () => h('span', { class: 'yc-moreic' }, icon('trophy')), go: () => openLogro(n) });
    for (const [id, label, ic] of PAGES) out.push({ k: 'Secciones', t: label, sub: 'Ir a la sección', q: fold(label), lead: () => h('span', { class: 'yc-moreic' }, icon(ic)), go: () => go(id) });
    return out;
  }
  function goChartsQuery(q) {
    LF.q = q; RENDERED.delete('listas'); go('listas');
    setTimeout(() => { const i = $('#p-listas input[type=search]'); if (i) i.value = q; drawCharts(); const l = $('#chart-list'); if (l) l.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 450);
  }
  function openSearch() {
    if (!DATA) return;
    if (spot) { spot.input.focus(); return; }
    const idx = searchIndex();
    const input = h('input', { class: 'yc-spot-in', type: 'search', placeholder: 'Buscar canción, playlist, país…', autocomplete: 'off', enterkeyhint: 'search', 'aria-label': 'Buscar' });
    const res = h('div', { class: 'yc-spot-res' });
    let items = [], sel = 0;
    const close = () => { if (!spot) return; spot.el.classList.remove('on'); const el_ = spot.el; spot = null; setTimeout(() => el_.remove(), 300); document.body.style.overflow = sheetOpen ? 'hidden' : ''; };
    const pick = (it) => { if (!it) return; const rec = store.get('yc.recent', []).filter(x => x !== it.t); rec.unshift(it.t); store.set('yc.recent', rec.slice(0, 6)); close(); setTimeout(it.go, 180); };
    const draw = () => {
      const q = fold(input.value.trim());
      if (!q) {
        const rec = store.get('yc.recent', []);
        const favI = favs().map(id => idx.find(x => x.k === 'Canciones' && x.go && songById(id) && x.t === songById(id).titulo)).filter(Boolean);
        items = [...rec.map(t => idx.find(x => x.t === t)).filter(Boolean), ...favI.filter(x => !rec.includes(x.t))].slice(0, 8);
        res.replaceChildren(items.length ? h('div', { class: 'yc-group-h', text: 'Recientes y favoritas' }) : h('p', { class: 'yc-spot-hint', text: 'Prueba con «china», «real hasta la muerte» o «españa».' }), items.length ? h('div', { class: 'yc-list' }, items.map((it, i) => row(it, i))) : '');
        sel = 0; mark(); return;
      }
      const words = q.split(/\s+/);
      const scored = idx.map(it => { if (!words.every(w => it.q.includes(w))) return null; const tq = fold(it.t); return { it, sc: (tq === q ? 0 : tq.startsWith(q) ? 1 : it.q.startsWith(q) ? 2 : 3) + ({ 'Canciones': 0, 'Playlists': .1, 'Países y listas': .2, 'Álbumes': .3, 'Logros': .4, 'Secciones': .5 }[it.k] || 0) }; }).filter(Boolean).sort((a, b) => a.sc - b.sc);
      const groups = {}; scored.forEach(({ it }) => { (groups[it.k] = groups[it.k] || []).length < 6 && groups[it.k].push(it); });
      items = []; res.replaceChildren();
      if (!scored.length) { res.append(h('p', { class: 'yc-spot-hint', text: 'Sin resultados.' })); return; }
      for (const [k, arr] of Object.entries(groups).sort((a, b) => scored.findIndex(x => x.it.k === a[0]) - scored.findIndex(x => x.it.k === b[0]))) {
        res.append(h('div', { class: 'yc-group-h', text: k }));
        res.append(h('div', { class: 'yc-list' }, arr.map(it => { items.push(it); return row(it, items.length - 1); })));
      }
      sel = 0; mark();
    };
    const row = (it, i) => h('div', { class: 'yc-row', 'data-i': i, onclick: () => pick(it), onmouseenter: () => { sel = i; mark(); } }, it.lead(), h('div', { class: 'yc-row-main' }, h('b', { text: it.t }), h('small', { text: it.sub })), icon('chev', 'yc-chev'));
    const mark = () => res.querySelectorAll('.yc-row[data-i]').forEach(r => r.classList.toggle('sel', Number(r.dataset.i) === sel));
    input.addEventListener('input', draw);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); mark(); e.preventDefault(); const r = res.querySelector('.yc-row.sel'); r && r.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); mark(); e.preventDefault(); const r = res.querySelector('.yc-row.sel'); r && r.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { pick(items[sel]); }
      else if (e.key === 'Escape') close();
    });
    const el_ = h('div', { class: 'yc-spot', role: 'dialog', 'aria-label': 'Buscar', onclick: (e) => { if (e.target === el_) close(); } },
      h('div', { class: 'yc-spot-box' }, h('div', { class: 'yc-spot-bar' }, icon('search'), input, h('button', { class: 'yc-spot-x', type: 'button', onclick: close, text: 'Cancelar' })), res));
    document.body.append(el_); document.body.style.overflow = 'hidden';
    spot = { el: el_, input };
    requestAnimationFrame(() => { el_.classList.add('on'); input.focus(); });
    draw(); haptic();
  }
  function searchSetup() {
    const nav = $('#nav');
    const b = h('button', { class: 'yc-iconbtn', id: 'search-btn', type: 'button', 'aria-label': 'Buscar (Ctrl+K)', onclick: openSearch }, icon('search'));
    $('#bell-btn') ? $('#bell-btn').before(b) : $('#theme-btn').before(b);
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); }
      else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') && !spot) { e.preventDefault(); openSearch(); }
    });
    // móvil: deslizar hacia abajo estando arriba del todo (como la búsqueda del iPhone)
    let y0 = null, pulled = 0;
    const pill = h('div', { class: 'yc-pullhint' }, icon('search'), h('span', { text: 'Suelta para buscar' }));
    document.body.append(pill);
    addEventListener('touchstart', (e) => { y0 = (scrollY <= 0 && !sheetOpen && !spot && !e.target.closest('input,textarea,canvas,.yc-sheet,.yc-tabs,.yc-seg,.yc-carousel')) ? e.touches[0].clientY : null; pulled = 0; }, { passive: true });
    addEventListener('touchmove', (e) => { if (y0 == null) return; pulled = e.touches[0].clientY - y0; if (scrollY > 0) { y0 = null; pill.classList.remove('on', 'go'); return; } pill.classList.toggle('on', pulled > 30); pill.classList.toggle('go', pulled > 90); }, { passive: true });
    addEventListener('touchend', () => { if (y0 != null && pulled > 90) openSearch(); y0 = null; pill.classList.remove('on', 'go'); }, { passive: true });
  }

  // ---------- ficha de la canción: listas y playlists ----------
  function songChartsBlock(s) {
    const wrap = h('div', { class: 'yc-sc' });
    const flagOf = (pais, cc) => flagEl(cc || ccOf(pais));
    // ahora
    let now = s.hoy.map(c => ({ plat: platJS(c), lista: c.lista, pais: c.pais, cc: ccOf(c.pais, c.codigo), p: c.posicion, cambio: c.cambio, fecha: c.fecha_lista || c.consultado }));
    const lastF = {}; now.forEach(r => { const k = r.plat + r.lista + r.pais; if (String(r.fecha || '') > String(lastF[k] || '')) lastF[k] = r.fecha; });
    now = now.filter(r => String(r.fecha || '') === String(lastF[r.plat + r.lista + r.pais] || '')).sort((a, b) => a.p - b.p);
    // mejores: mejor puesto de cada lista y país (hoy + historial + picos de Spotify)
    const best = new Map();
    const put = (r) => { const k = r.plat + '|' + r.lista + '|' + r.pais; const o = best.get(k); if (!o || r.p < o.p || (r.p === o.p && String(r.fecha || '') < String(o.fecha || ''))) best.set(k, r); };
    now.forEach(put);
    (s.listas || []).forEach(x => isNum(x.puesto) && put({ plat: x.plataforma === 'YouTube' && String(x.lista || '').startsWith('Top canciones') ? 'YouTube Charts' : x.plataforma, lista: x.lista, pais: x.pais, cc: ccOf(x.pais), p: x.puesto, fecha: x.fecha }));
    (s.picos || []).forEach(x => put({ plat: 'Spotify', lista: 'Top 200 diario', pais: x.pais, cc: x.codigo, p: x.pico, fecha: x.fecha }));
    const bests = [...best.values()].sort((a, b) => a.p - b.p);
    // playlists
    const plNow = songPlaylists(s.id);
    const hist = Object.entries(s.playlists_hist || {}).map(([url, e]) => Object.assign({ url }, e));
    const plPast = hist.filter(e => e.actual == null);
    const plNot = (DATA.playlists || []).filter(p => !plNow.some(x => x.p.url === p.url) && !plPast.some(e => e.url === p.url));
    // resumen
    const top = bests[0];
    wrap.append(h('div', { class: 'yc-sc-sum' },
      h('div', null, h('b', { text: String(now.length) }), h('small', { text: now.length === 1 ? 'lista hoy' : 'listas hoy' })),
      h('div', null, h('b', { text: top ? '#' + top.p : '—' }), h('small', { text: top ? `mejor · ${top.pais === 'Global' || top.pais === 'Mundial' ? 'Global' : top.pais}` : 'sin puestos' })),
      h('div', null, h('b', { text: String(plNow.length) }), h('small', { text: plNow.length === 1 ? 'playlist oficial' : 'playlists oficiales' }))));
    const tabs = [['ahora', `Ahora · ${now.length}`], ['mejores', `Mejores · ${bests.length}`], ['playlists', `Playlists · ${plNow.length}`], ['historial', 'Historial']];
    let cur = now.length ? 'ahora' : bests.length ? 'mejores' : 'playlists';
    const seg = h('div', { class: 'yc-seg yc-sc-seg' });
    const list = h('div');
    const row = (lead, title, sub, num, numCls, small) => h('div', { class: 'yc-row', style: 'cursor:default;min-height:54px' }, lead, h('div', { class: 'yc-row-main' }, h('b', { text: title }), h('small', { text: sub })), h('div', { class: 'yc-row-meta' }, h('b', { class: numCls || '', text: num }), small ? h('small', { text: small }) : null));
    const empty = (t) => h('div', { class: 'yc-list' }, h('div', { class: 'yc-row', style: 'cursor:default' }, h('div', { class: 'yc-row-main' }, h('small', { style: 'white-space:normal', text: t }))));
    const draw = () => {
      seg.replaceChildren(...tabs.map(([k, l]) => h('button', { type: 'button', 'aria-pressed': String(cur === k), onclick: () => { cur = k; draw(); }, text: l })));
      list.replaceChildren();
      if (cur === 'ahora') {
        if (!now.length) { list.append(empty('Hoy no aparece en ninguna de las listas que se siguen.')); return; }
        const byP = {}; now.forEach(r => (byP[r.plat] = byP[r.plat] || []).push(r));
        for (const [pl, rs] of Object.entries(byP)) {
          list.append(h('div', { class: 'yc-group-h', text: `${pl} · ${rs.length}` }));
          list.append(h('div', { class: 'yc-list' }, rs.map(r => row(flagOf(r.pais, r.cc), r.pais, `${r.lista} · ${dfmt(r.fecha)}`, '#' + r.p, r.p <= 10 ? 'yc-top' : '', r.cambio || ''))));
        }
      } else if (cur === 'mejores') {
        if (!bests.length) { list.append(empty('Todavía no hay puestos registrados.')); return; }
        list.append(h('div', { class: 'yc-list' }, bests.map(r => row(flagOf(r.pais, r.cc), `${r.pais} · ${r.plat}`, `${r.lista}${r.fecha ? ' · lo logró el ' + dfmt(r.fecha) : ''}`, '#' + r.p, r.p === 1 ? 'yc-top gold' : r.p <= 10 ? 'yc-top' : '', now.some(n => n.plat === r.plat && n.pais === r.pais && n.lista === r.lista) ? 'sigue dentro' : ''))));
      } else if (cur === 'playlists') {
        list.append(h('div', { class: 'yc-group-h', text: `Ahora · ${plNow.length}` }));
        list.append(plNow.length ? h('div', { class: 'yc-list' }, plNow.map(({ p, t }) => {
          const e = (s.playlists_hist || {})[p.url];
          const r = row(pico(PL_K[p.plataforma] || 'spotify'), plName(p), `${p.plataforma}${e && e.primera ? ' · desde el ' + dfmt(e.primera) : ''}${e && e.mejor && e.mejor < t.pos ? ' · mejor #' + e.mejor : ''}`, '#' + t.pos, t.pos <= 10 ? 'yc-top' : '', t.antes == null ? 'nueva' : t.antes > t.pos ? `▲ ${t.antes - t.pos}` : t.antes < t.pos ? `▼ ${t.pos - t.antes}` : `de ${p.total || '?'}`);
          r.style.cursor = 'pointer'; r.onclick = () => window.open(p.url, '_blank', 'noopener'); return r;
        })) : empty('Ahora mismo no está en ninguna de las playlists oficiales que se siguen.'));
        if (plPast.length) {
          list.append(h('div', { class: 'yc-group-h', text: `Estuvo en · ${plPast.length}` }));
          list.append(h('div', { class: 'yc-list' }, plPast.map(e => row(pico(PL_K[e.plataforma] || 'spotify'), e.nombre, `${e.plataforma} · del ${dfmt(e.primera)} al ${dfmt(e.ultima)}`, '#' + e.mejor, 'faded', 'su mejor'))));
        }
        if (plNot.length) {
          const det = h('details', { class: 'yc-sc-not' }, h('summary', { text: `No está en ${plNot.length} playlist${plNot.length > 1 ? 's' : ''}` }),
            h('div', { class: 'yc-list' }, plNot.map(p => row(pico(PL_K[p.plataforma] || 'spotify'), plName(p), p.plataforma, '—', 'faded', ''))));
          list.append(det);
        }
      } else {
        const ev = [];
        (s.listas || []).forEach(x => ev.push({ f: x.fecha, t: `#${x.puesto} en ${x.pais} · ${x.plataforma}`, d: x.lista, p: x.puesto, cc: ccOf(x.pais) }));
        hist.forEach(e => { ev.push({ f: e.primera, t: `Entra en «${e.nombre}»`, d: e.plataforma, p: null, pl: e.plataforma }); if (e.mejor_fecha && e.mejor_fecha !== e.primera) ev.push({ f: e.mejor_fecha, t: `#${e.mejor} en «${e.nombre}»`, d: `${e.plataforma} · su mejor puesto`, p: e.mejor, pl: e.plataforma }); if (e.actual == null && e.ultima) ev.push({ f: e.ultima, t: `Sale de «${e.nombre}»`, d: e.plataforma, p: null, pl: e.plataforma }); });
        if (s.lanzamiento) ev.push({ f: s.lanzamiento, t: 'Sale el tema', d: s.artistas || '', p: null });
        ev.sort((a, b) => String(b.f || '').localeCompare(String(a.f || '')));
        if (!ev.length) { list.append(empty('Todavía no hay historial de esta canción.')); return; }
        let day = null, box = null;
        for (const e of ev.slice(0, 200)) {
          if (e.f !== day) { day = e.f; list.append(h('div', { class: 'yc-group-h', text: e.f ? dfmt(e.f) : 'Sin fecha' })); box = h('div', { class: 'yc-list' }); list.append(box); }
          box.append(row(e.pl ? pico(PL_K[e.pl] || 'spotify') : e.cc ? flagOf(null, e.cc) : h('span', { class: 'yc-stepn', text: '★' }), e.t, e.d, e.p ? '#' + e.p : '', e.p && e.p <= 10 ? 'yc-top' : '', ''));
        }
      }
    };
    draw();
    wrap.prepend(section('Listas y playlists', ''));
    wrap.append(seg, list);
    return wrap;
  }

  // ---------- caption de una canción (estilo hilo de logros) ----------
  const esN = (v) => {
    if (!isNum(v)) return null;
    if (v >= 1e9) return (v / 1e9).toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',') + ' mil millones';
    if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '').replace('.', ',') + ' millones';
    if (v >= 1e3) return Math.round(v / 1e3) + 'k';
    return String(Math.round(v));
  };
  const esK = (v) => !isNum(v) ? null : v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '').replace('.', ',') + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : String(Math.round(v));
  const flagEmoji = (cc) => { cc = String(cc || '').toUpperCase().replace('UK', 'GB'); return /^[A-Z]{2}$/.test(cc) && cc !== 'WW' ? String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '🌍'; };
  function ytDaily(s) {
    const hs = ((s.yt && s.yt.hist) || []).filter(x => isNum(x.v));
    if (hs.length < 2) return s.yt && isNum(s.yt.ayer) ? s.yt.ayer : null;
    const a = hs[hs.length - 1], b = hs[hs.length - 2];
    const days = (new Date(a.t) - new Date(b.t)) / 864e5;
    return days > 0.3 && a.v >= b.v ? Math.round((a.v - b.v) / days) : null;
  }
  function songArtists(s) {
    return String(s.artistas || `${AN()}`).split(/\s*(?:,|&|\bfeat\.?|\bft\.?|\bx\b|\by\b|\bwith\b)\s*/i).map(x => x.trim()).filter(Boolean);
  }
  function handleOf(name) {
    const H = store.get('yc.handles', {});
    if (H[name]) return H[name];
    if (artRx().test(name)) return AU();
    return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._]/g, '');
  }
  function sinceTxt(days) {
    if (days == null) return null;
    if (days < 1) return 'hoy';
    if (days < 7) return `${days} día${days > 1 ? 's' : ''}`;
    if (days < 31) { const w = Math.round(days / 7); return `${w} semana${w > 1 ? 's' : ''}`; }
    if (days < 365) { const m = Math.round(days / 30); return `${m} mes${m > 1 ? 'es' : ''}`; }
    const y = Math.floor(days / 365); return `${y} año${y > 1 ? 's' : ''}`;
  }
  function songCaption(s, estilo) {
    const arts = songArtists(s);
    const tags = arts.map(a => '@' + handleOf(a));
    const ti = tags.indexOf(`@${AU()}`); if (ti > 0) tags.splice(ti, 1); if (ti !== 0) tags.unshift(`@${AU()}`);
    const de = (v, u) => { const t = esN(v); return /millones/.test(t) ? `${t} de ${u}` : `${t} ${u}`; };
    const days = s.lanzamiento ? Math.round((today() - parseD(s.lanzamiento)) / 864e5) : null;
    const since = sinceTxt(days);
    const sp = s.sp || {}, spT = sp.total, spD = sp.diarios;
    const ytT = s.yt && s.yt.vistas, ytD = ytDaily(s);
    const pls = songPlaylists(s.id);
    const seen = new Set();
    const charts = (DATA.charts || []).filter(c => c.posicion != null && c.cancion && base(c.cancion) === s.b).sort((a, b) => a.posicion - b.posicion)
      .filter(c => { const k = c.plataforma + c.lista + c.pais; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3);
    const alb = s.album && base(s.album) !== s.b ? '«' + s.album.trim() + '»' : null;
    const atPl = (p) => ({ 'Spotify': '@spotify', 'Apple Music': '@applemusic', 'Deezer': '@deezer' }[p.plataforma] || p.plataforma);
    const chartTxt = (c) => `Top ${c.posicion} ${c.plataforma === 'YouTube' ? (String(c.lista).startsWith('Top') ? 'del top diario de @youtube' : 'de tendencias de @youtube') : `de @${c.plataforma.toLowerCase().replace(/\s+/g, '')}`} ${c.pais} ${flagEmoji(c.codigo)}`;
    const tt = '«' + s.titulo.replace(/\s*\(.*?\)\s*/g, '').trim() + '»';
    if (estilo === 'corto') {
      const L = [`${tt} ${tags.join(' / ')} 💿${since ? ` · ${since} desde su salida` : ''}`, ''];
      if (isNum(spT)) L.push(`🟢 @spotify: ${de(spT, 'streams')}${isNum(spD) ? ` (+${esK(spD)} al día)` : ''}`);
      if (isNum(ytT)) L.push(`🔴 @youtube: ${de(ytT, 'views')}${isNum(ytD) ? ` (+${esK(ytD)} al día)` : ''}`);
      pls.slice(0, 3).forEach(({ p, t }) => L.push(`📋 Top ${t.pos} en “${plName(p)}” (${atPl(p)})`));
      charts.forEach(c => L.push(`📈 ${chartTxt(c)}`));
      if (isNum(spT) && isNum(ytT)) L.push('', `🔥 Total: ${de(spT + ytT, 'reproducciones')}${since && days < 400 ? ` en ${since}` : ''} 🏆`);
      return L.join('\n');
    }
    const P = [];
    P.push(`${tt} ${tags.join(' / ')}💿, un tema${alb ? ` el cual pertenece también al álbum ${alb}` : ''}${since ? `, desde su fecha de salida (${since}) 🔙 hasta ahora` : ''} ha logrado los siguientes logros💿✅ :`);
    if (isNum(spT)) {
      let t = `Para comenzar el tema actualmente tiene ${de(spT, 'streams')} en @spotify 🔥${isNum(spD) ? ` y alrededor de ${esK(spD)} streams diarios 💯` : ''}`;
      const sp1 = pls.find(x => x.p.plataforma === 'Spotify');
      if (sp1) t += ` El tema también sigue siendo parte de la playlist oficial de @spotify llamada “${plName(sp1.p)}” estando en el número ${sp1.t.pos}º${sp1.t.pos <= 3 ? (sp1.t.antes && sp1.t.antes > 3 ? ' y estaría entrando al top 3 de esta' : ', dentro del top 3 de esta') : sp1.t.antes && sp1.t.antes > sp1.t.pos ? ` (antes estaba en el ${sp1.t.antes}º)` : ''}.`;
      const others = pls.filter(x => x !== sp1).slice(0, 2);
      if (others.length) t += ` Además aparece en ${others.map(({ p, t: q }) => `“${plName(p)}” de ${atPl(p)} (Top ${q.pos})`).join(' y ')}.`;
      P.push(t);
    }
    if (isNum(ytT)) {
      let t = `En cuanto a @youtube el tema tiene ${/millones/.test(esN(ytT)) ? 'los ' : ''}${de(ytT, 'views')}${isNum(ytD) ? ` y tiene aproximadamente unas ${esK(ytD)} views diarias🔥` : ''}`;
      if (isNum(ytD) && isNum(spD)) t += ` , es decir entre @spotify y @youtube este tema logra acumular unas ${esK(ytD + spD)} reproducciones diarias, ${esK(ytD)} por @youtube y ${esK(spD)} por @spotify 🔥🩸🏆`;
      P.push(t);
    }
    if (charts.length) P.push(`En las listas ahora mismo está en el ${charts.map(chartTxt).join(', en el ')} 📈`);
    if (isNum(spT) && isNum(ytT)) P.push(`La suma total de @spotify y @youtube sería de ${de(spT + ytT, 'reproducciones')}!!${since && days < 400 ? ` Y esto solo en ${days < 31 ? 'menos de un mes' : since}` : ''} 🔥🔥🏆`);
    return P.join('\n\n');
  }
  let capSong = null;
  function captionBlock() {
    const wrap = h('div', { class: 'yc-capgen' });
    const list = SONGS.slice().sort((a, b) => String(b.lanzamiento || '').localeCompare(String(a.lanzamiento || '')));
    if (!capSong || !songById(capSong)) capSong = (list[0] || {}).id;
    let estilo = store.get('yc.capstyle', 'largo');
    const sel = h('select', { class: 'yc-select yc-in', 'aria-label': 'Canción' }, list.map(s => h('option', { value: s.id, text: s.titulo + (s.lanzamiento ? ` · ${s.lanzamiento.slice(0, 4)}` : ''), selected: s.id === capSong || null })));
    const handles = h('div', { class: 'yc-list' });
    const out = h('textarea', { class: 'st-in yc-capout', rows: 12, 'aria-label': 'Caption' });
    const segB = h('div', { class: 'yc-seg' }, [['largo', 'Largo'], ['corto', 'Corto']].map(([k, l]) => h('button', { type: 'button', 'data-k': k, 'aria-pressed': String(estilo === k), onclick: () => { estilo = k; store.set('yc.capstyle', k); $$('button', segB).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k))); gen(); }, text: l })));
    const gen = () => { const s = songById(capSong); if (s) out.value = songCaption(s, estilo); };
    const drawHandles = () => {
      const s = songById(capSong); if (!s) return;
      handles.replaceChildren(...songArtists(s).map(a => {
        const inp = h('input', { class: 'yc-in', value: handleOf(a), autocapitalize: 'off', 'aria-label': 'Usuario de ' + a });
        inp.addEventListener('input', () => { const H = store.get('yc.handles', {}); H[a] = inp.value.replace(/^@/, '').trim(); store.set('yc.handles', H); gen(); });
        return h('label', { class: 'yc-frow-in' }, h('span', { text: a }), h('b', { class: 'yc-at', text: '@' }), inp);
      }));
    };
    sel.addEventListener('change', () => { capSong = sel.value; drawHandles(); gen(); });
    wrap.append(h('div', { class: 'yc-list' }, h('label', { class: 'yc-frow-in' }, h('span', { text: 'Canción' }), sel)),
      h('div', { class: 'yc-group-h', text: 'Sus cuentas de Instagram' }), handles,
      h('p', { class: 'yc-note', text: 'Revisa los usuarios: se guardan para la próxima vez.' }),
      h('div', { class: 'yc-toolbar', style: 'margin-top:12px' }, segB), out,
      h('div', { class: 'st-actions' },
        h('button', { class: 'yc-btn', type: 'button', onclick: () => copy(out.value), text: 'Copiar caption' }),
        h('button', { class: 'yc-btn sec', type: 'button', onclick: gen, text: 'Rehacer' }),
        h('button', { class: 'yc-btn sec', type: 'button', onclick: () => { const s = songById(capSong); toStudio({ titular: s.titulo.toUpperCase(), etiqueta: 'LOGROS', numero: esK(((s.sp || {}).total || 0) + ((s.yt && s.yt.vistas) || 0)), sub: 'REPRODUCCIONES ENTRE SPOTIFY Y YOUTUBE', imagen: s.portada || (s.yt && `https://i.ytimg.com/vi/${s.yt.video_id}/maxresdefault.jpg`), plantilla: 'hito' }); }, text: 'Hacer imagen' })),
      h('p', { class: 'yc-note', text: 'Solo usa cifras reales de la web. Las views diarias de YouTube se calculan con las dos últimas lecturas (aprox.).' }));
    drawHandles(); gen();
    return wrap;
  }
  function toCaption(id) { capSong = id; go('estudio'); setTimeout(() => { const c = $('#cap-song'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 400); }

  // Perfiles
  function clickStat(el, fn) {
    el.classList.add('mt-clk'); el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.addEventListener('click', fn); el.addEventListener('keydown', (e) => { if (e.key === 'Enter') fn(); });
    el.append(h('span', { class: 'mt-clk-i', 'aria-hidden': 'true' }, icon('chev')));
    return el;
  }
  const PERFIL_LOGRO_KEY = { oyentes: 'spotify_oyentes_mensuales', sp_seg: 'spotify_seguidores', total_sp: 'spotify_streams_totales', subs: 'youtube_suscriptores', yt_vistas: 'youtube_vistas_totales', ig: 'instagram_seguidores', tt: 'tiktok_seguidores' };
  const pasoDe = (label, v) => /seguidores|suscriptores|oyentes|fans/i.test(label) ? (v >= 100e6 ? 10e6 : v >= 10e6 ? 5e6 : v >= 1e6 ? 1e6 : 250e3) : null;
  function bigChart(vals, dates, color) {
    if (vals.length < 2) return null;
    const W = 600, H = 170, lo = Math.min(...vals), hi = Math.max(...vals), r = hi - lo || 1;
    const xy = vals.map((v, i) => [i / (vals.length - 1) * W, H - 14 - (v - lo) / r * (H - 34)]);
    const line = xy.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1)).join(' ');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'mt-chart'); svg.setAttribute('preserveAspectRatio', 'none');
    const id = 'g' + Math.random().toString(36).slice(2, 8);
    svg.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <path d="${line} L${W},${H} L0,${H} Z" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${xy[xy.length - 1][0]}" cy="${xy[xy.length - 1][1]}" r="4.5" fill="${color}"/>`;
    return h('div', { class: 'mt-chartbox' }, svg, h('div', { class: 'mt-chart-x' }, h('small', { text: dfmt(dates[0]) }), h('small', { text: dfmt(dates[dates.length - 1]) })));
  }
  function openMetric(k, label, valor) {
    const key = HKEY[k + ':' + label]; if (!key) return;
    const hs = histSorted().filter(r => isNum(r[key]));
    const v = isNum(valor) ? valor : hs.length ? hs[hs.length - 1][key] : null;
    const g = growth(key), color = PLAT[k].color;
    const paso = pasoDe(label, v || 0);
    const meta = paso ? (Math.floor(v / paso) + 1) * paso : metaRedonda(v);
    const ritmo = g && isNum(g.d7) && g.d7 > 0 ? g.d7 / 7 : g && isNum(g.media) && g.media > 0 ? g.media : null;
    const dias = ritmo && meta ? Math.ceil((meta - v) / ritmo) : null;
    // metas conseguidas: las que se cruzan en el historial + las que registró la actualización
    const hechas = new Map();
    for (let i = 1; i < hs.length; i++) {
      const a = hs[i - 1][key], b = hs[i][key], st = pasoDe(label, a) || (metaRedonda(a) - a > 0 ? null : null);
      if (st && Math.floor(b / st) > Math.floor(a / st)) for (let m = (Math.floor(a / st) + 1) * st; m <= b; m += st) hechas.set(m, hs[i].fecha);
    }
    for (const n of DATA.novedades || []) {
      const p = String(n.id || '').replace(/^logro:/, '').split(':');
      if (p[0] === 'perfil' && PERFIL_LOGRO_KEY[p[1]] === key && isNum(Number(p[2]))) { const m = Number(p[2]); if (!hechas.has(m) || (n.fecha || '') < hechas.get(m)) hechas.set(m, n.fecha); }
    }
    const lista = [...hechas.entries()].sort((a, b) => b[0] - a[0]);
    const body = h('div', { class: 'mt-sheet' });
    body.append(h('div', { class: 'mt-sh-hero' },
      h('div', { class: 'mt-ringbox big' }, ring(meta ? v / meta * 100 : 0, 96), pico(k)),
      h('div', null, h('span', { class: 'mt-plat', text: `${label} · ${PLAT[k].name}` }), h('b', { class: 'mt-sh-v num', text: short2(v) }), h('small', { class: 'mt-sub', text: isNum(v) ? full(v) : '' }))));
    if (meta) body.append(h('div', { class: 'mt-card mt-next' + (dias != null && dias <= 1 ? ' hot' : '') },
      h('div', { class: 'mt-body', style: 'grid-column:1/-1' },
        h('div', { class: 'mt-top' }, h('span', { class: 'mt-plat', text: 'Próxima meta' }), dias != null && dias <= 1 ? h('span', { class: 'mt-badge', text: 'A punto' }) : null),
        h('div', { class: 'mt-nums' }, h('b', { class: 'mt-now num', text: short(meta) })),
        h('small', { class: 'mt-sub', text: `Faltan ${full(meta - v)}${dias != null ? ` · ≈ ${dias} ${dias === 1 ? 'día' : 'días'} al ritmo de +${short(Math.round(ritmo))}/día` : ' · el ritmo se calcula con unos días de datos'}` }),
        h('div', { class: 'mt-line' }, h('i', { style: `--w:${Math.min(100, v / meta * 100).toFixed(2)}%;width:var(--w)` })))));
    if (g) body.append(h('div', { class: 'mt-kpis' }, [['Último dato', g.d1], ['7 días', g.d7], ['30 días', g.d30], ['Media/día', isNum(g.media) ? Math.round(g.media) : null]].filter(([, x]) => isNum(x)).map(([l, x]) => h('div', { class: 'mt-kpi' }, h('small', { text: l }), h('b', { class: 'num ' + (x > 0 ? 'yc-up' : x < 0 ? 'yc-down' : ''), text: signed(x) })))));
    const ch = bigChart(hs.map(r => r[key]), hs.map(r => r.fecha), color);
    if (ch) { body.append(h('h3', { class: 'lg-sh', text: 'Evolución' })); body.append(ch); }
    body.append(h('h3', { class: 'lg-sh', text: 'Metas conseguidas' }));
    body.append(lista.length ? h('div', { class: 'yc-list' }, lista.map(([m, f]) => h('div', { class: 'yc-row', style: 'cursor:default' },
      h('span', { class: 'mt-dot', style: `background:${color}` }),
      h('div', { class: 'yc-row-main' }, h('b', { text: `${short(m)} ${label.toLowerCase()}` }), h('small', { text: f ? `Lo consiguió el ${dfmt(f)}` : '' })),
      h('div', { class: 'yc-row-meta' }, h('b', { class: 'num', style: `color:${color}`, text: short(m) }))))) :
      h('p', { class: 'yc-note', text: `Aún no ha pasado ninguna meta desde que se guardan datos${hs.length ? ` (${dfmt(hs[0].fecha)})` : ''}. Cuando llegue a ${short(meta)}, aparecerá aquí con su fecha.` }));
    if (hs.length) {
      body.append(h('h3', { class: 'lg-sh', text: 'Registro' }));
      body.append(h('div', { class: 'yc-list' }, hs.slice(-14).reverse().map((r, i, arr) => {
        const prev = arr[i + 1]; const d = prev ? r[key] - prev[key] : null;
        return h('div', { class: 'yc-row', style: 'cursor:default' }, h('div', { class: 'yc-row-main' }, h('b', { class: 'num', text: full(r[key]) }), h('small', { text: dfmt(r.fecha) })),
          h('div', { class: 'yc-row-meta' }, isNum(d) ? h('b', { class: 'num ' + (d > 0 ? 'yc-up' : d < 0 ? 'yc-down' : ''), text: signed(d) }) : null));
      })));
    }
    openSheet(`${PLAT[k].name} · ${label}`, body);
  }
  // ---------- Ficha del artista: su sitio en el mundo, Billboard, clubs de cifras y debuts ----------
  const ordN = (n) => n + 'º';
  const bigN = (v) => isNum(v) && v >= 1e9 ? (v / 1e9).toFixed(2).replace(/\.?0+$/, '').replace('.', ',') + ' MIL M' : short(v);
  function fichaLink() {
    const mu = DATA.mundo || {}, t = mu.total || {}, oy = mu.oyentes || {};
    const sub = [t.rank_latino ? `#${t.rank_latino} latino de la historia en Spotify` : '', oy.rank ? `#${oy.rank} en oyentes` : '', Object.values(DATA.billboard || {}).some(b => (b.entradas || []).length) ? 'en Billboard esta semana' : ''].filter(Boolean).join(' · ');
    return h('button', { class: 'mt-link ax-link reveal', type: 'button', onclick: openArtist },
      DATA.artista.imagen ? h('img', { class: 'ax-av', src: hd(DATA.artista.imagen, 200), alt: '' }) : h('span', { text: '⭐' }),
      h('span', null, h('b', { text: 'Ficha de ' + DATA.artista.nombre + ' al día' }), h('small', { text: sub || 'Rankings mundiales, Billboard, récords y debuts' })), icon('chev', 'yc-chev'));
  }
  // escalera: quién tiene arriba y abajo
  function ladder(arriba, abajo, yo, key, unit, fmt = short) {
    const rows = [...(arriba || []).slice().reverse().map(x => ({ ...x, pos: 'up' })), { nombre: DATA.artista.nombre, rank: yo.rank, [key]: yo.v, yo: true }, ...(abajo || []).map(x => ({ ...x, pos: 'dn' }))];
    return h('div', { class: 'ax-ladder' }, rows.map(r => h('div', { class: 'ax-step' + (r.yo ? ' me' : '') },
      h('span', { class: 'ax-rk num', text: r.rank ? '#' + r.rank : '' }),
      h('b', { class: 'ax-nm', text: r.nombre }),
      h('span', { class: 'ax-v num', text: fmt(r[key]) }),
      h('small', { class: 'ax-gap', text: r.yo ? unit : isNum(r[key]) && isNum(yo.v) ? (r.pos === 'up' ? `le faltan ${fmt(r[key] - yo.v)}` : `le saca ${fmt(yo.v - r[key])}`) : '' }))));
  }
  const srcLink = (u, t) => h('a', { class: 'ax-src', href: u, target: '_blank', rel: 'noopener', text: t + ' ↗' });
  function axCard(kicker, big, sub, extra) {
    return h('div', { class: 'ax-card' }, h('span', { class: 'ax-k', text: kicker }), h('b', { class: 'ax-big num', text: big }), sub ? h('small', { class: 'ax-sub', text: sub }) : null, extra || null);
  }
  // cuántas canciones ha llevado a cada cifra (Spotify o YouTube)
  function clubs(plat) {
    const val = s => plat === 'sp' ? s.sp.total : s.yt && s.yt.vistas;
    const rate = s => plat === 'sp' ? (s.sp.diarios || s.spMedia) : (s.yt && (s.ytMedia || null));
    const conV = SONGS.filter(s => isNum(val(s)));
    const marks = [2e9, 1.5e9, 1e9, 900e6, 800e6, 700e6, 600e6, 500e6, 400e6, 300e6, 200e6, 100e6];
    const out = [];
    for (const m of marks) {
      const dentro = conV.filter(s => val(s) >= m).sort((a, b) => val(b) - val(a));
      const cerca = conV.filter(s => val(s) < m && val(s) >= m * 0.85).map(s => ({ s, dias: rate(s) ? Math.ceil((m - val(s)) / rate(s)) : null })).sort((a, b) => (a.dias ?? 1e9) - (b.dias ?? 1e9))[0];
      if (dentro.length || cerca) out.push({ m, dentro, cerca });
    }
    return out;
  }
  function clubBlock(plat) {
    const cl = clubs(plat).filter(c => c.dentro.length || (c.cerca && c.cerca.dias != null && c.cerca.dias <= 90)); if (!cl.length) return null;
    const unit = plat === 'sp' ? 'streams' : 'views';
    return h('div', { class: 'ax-clubs' }, cl.slice(0, 8).map(c => h('details', { class: 'ax-club' },
      h('summary', null, h('b', { class: 'ax-club-m num', text: short(c.m) }), h('span', { class: 'ax-club-n', text: c.dentro.length ? `${c.dentro.length} ${c.dentro.length === 1 ? 'canción' : 'canciones'}` : 'ninguna aún' }),
        c.cerca ? h('small', { class: 'ax-club-next' + (c.cerca.dias != null && c.cerca.dias <= 7 ? ' hot' : '') }, `Próxima: ${c.cerca.s.titulo}${c.cerca.dias != null ? ` · ≈ ${c.cerca.dias} ${c.cerca.dias === 1 ? 'día' : 'días'}` : ''}${c.cerca.dias != null && c.cerca.dias <= 7 ? ` · sería la ${ordN(c.dentro.length + 1)}` : ''}`) : null),
      h('div', { class: 'ax-club-list' }, c.dentro.map((s, i) => h('button', { type: 'button', class: 'ax-club-row', onclick: () => openSong(s.id) }, h('span', { class: 'num', text: i + 1 }), h('b', { text: s.titulo }), h('em', { class: 'num', text: short(plat === 'sp' ? s.sp.total : s.yt.vistas) })))))),
      h('p', { class: 'yc-note', text: `Toca una cifra para ver qué temas la han pasado. Cuando otra llega, sale como logro: «es la canción Nª en lograrlo» (${unit}).` }));
  }
  function bbBlock() {
    const ORD = { artista: 0, cancion: 1, album: 2 }, TIT = { artista: 'Como artista', cancion: 'Canciones', album: 'Álbumes' };
    const bb = Object.entries(DATA.billboard || {}).filter(([, b]) => (b.entradas || []).length).sort((a, b) => (ORD[a[1].tipo || 'cancion'] - ORD[b[1].tipo || 'cancion']));
    if (!bb.length) return null;
    let last = null;
    const kids = [];
    for (const it of bb) { const tp = it[1].tipo || 'cancion'; if (tp !== last) { kids.push(h('span', { class: 'ax-k ax-bb-grp', text: TIT[tp] })); last = tp; } kids.push(it); }
    return h('div', { class: 'ax-bb' }, kids.map(k => !Array.isArray(k) ? k : (([slug, b]) => h('div', { class: 'ax-bb-card' },
      h('div', { class: 'ax-bb-h' }, h('b', { text: b.nombre }), h('small', { text: b.semana ? `semana del ${dfmt(b.semana)}` : '' }), b.url ? h('a', { href: b.url, target: '_blank', rel: 'noopener', text: '↗' }) : null),
      (b.entradas || []).slice().sort((x, y) => x.pos - y.pos).map(f => {
        const s = SONGS.find(x => x.b === base(f.titulo));
        const mov = f.nuevo ? h('span', { class: 'ax-tag new', text: f.reentrada ? 'RE' : 'NEW' }) : isNum(f.lw) ? h('span', { class: 'ax-tag ' + (f.lw > f.pos ? 'up' : f.lw < f.pos ? 'dn' : ''), text: f.lw > f.pos ? '▲' + (f.lw - f.pos) : f.lw < f.pos ? '▼' + (f.pos - f.lw) : '=' }) : null;
        return h('div', { class: 'ax-bb-row', onclick: s ? () => openSong(s.id) : null, style: s ? '' : 'cursor:default' },
          h('b', { class: 'ax-bb-pos num', text: f.pos }), s ? h('div', { class: 'ax-bb-cov' }, art(s)) : null,
          h('div', { class: 'ax-bb-main' }, h('b', { text: f.titulo }), h('small', { text: [f.artistas, f.semanas ? `${f.semanas} ${f.semanas === 1 ? 'semana' : 'semanas'}` : ''].filter(Boolean).join(' · ') }),
            (f.debut_pos || f.pico) ? h('small', { class: 'ax-bb-hist', text: f.debut_pos && f.debut_pos === (f.pico_pos || f.pico) && f.debut_fecha && f.debut_fecha === f.pico_fecha ? `Debutó en el Top ${f.debut_pos} el ${dfmt(f.debut_fecha, { year: undefined })}, su pico` : [f.debut_pos ? `Debutó en el Top ${f.debut_pos}${f.debut_fecha ? ' el ' + dfmt(f.debut_fecha, { year: undefined }) : ''}` : '', (f.pico_pos || f.pico) ? `pico Top ${f.pico_pos || f.pico}${f.pico_fecha ? ' el ' + dfmt(f.pico_fecha, { year: undefined }) : ''}` : ''].filter(Boolean).join(' · ') }) : null), mov);
      })))(k)),
      h('p', { class: 'yc-note', text: 'Billboard publica las listas cada martes. Las entradas se cuentan desde que la web las lee.' }));
  }
  function openArtist() {
    const mu = DATA.mundo || {}, P = DATA.perfil || {}, sp = P.spotify || {};
    const t = mu.total || {}, oy = mu.oyentes || {}, di = mu.diarios || {}, hist = mu.hist || [];
    const body = h('div', { class: 'mt-sheet ax' });
    body.append(h('div', { class: 'ax-head' },
      DATA.artista.imagen ? h('img', { class: 'ax-photo', src: hd(DATA.artista.imagen, 400), alt: '' }) : null,
      h('div', null, h('span', { class: 'mt-hero-k', text: 'Ficha al día' }), h('h2', { class: 'ax-name', text: DATA.artista.nombre }), h('small', { class: 'ax-sub', text: `${mu.fecha ? 'Datos del ' + dfmt(mu.fecha) : ''}${mu.fuente ? ' · ' + mu.fuente : ''}` }))));
    // un vistazo
    const chips = [
      t.rank_latino ? [`#${t.rank_latino}`, 'latino más escuchado de la historia en Spotify'] : null,
      t.rank ? [`#${t.rank}`, 'artista más escuchado de la historia'] : null,
      oy.rank ? [`#${oy.rank}`, 'en oyentes mensuales del mundo'] : null,
      di.rank ? [`#${di.rank}`, 'en streams del día'] : null,
      ...Object.values(DATA.billboard || {}).filter(b => b.tipo === 'artista' && (b.entradas || [])[0]).map(b => [`#${b.entradas[0].pos}`, 'en ' + b.nombre]),
    ].filter(Boolean);
    if (chips.length) body.append(h('div', { class: 'ax-glance' }, chips.map(([a, b]) => h('div', { class: 'ax-gl' }, h('b', { class: 'num', text: a }), h('small', { text: b })))));
    // streams totales
    const tot = t.total || sp.streams_totales;
    if (isNum(tot)) {
      const meta = (Math.floor(tot / 1e9) + 1) * 1e9, ritmo = di.streams || sp.streams_diarios, dias = ritmo ? Math.ceil((meta - tot) / ritmo) : null;
      body.append(h('h3', { class: 'lg-sh', text: 'Streams totales en Spotify' }));
      const rb = h('div', { class: 'mt-ringbox big' }, ring((tot % 1e9) / 1e9 * 100, 96), h('span', { class: 'mt-pct', text: Math.floor(tot % 1e9 / 1e7) + '%' }));
      body.append(h('div', { class: 'ax-card ax-row' }, rb, h('div', null, h('b', { class: 'ax-big num', text: bigN(tot) }),
        h('small', { class: 'ax-sub', text: `${full(tot)} streams` }),
        h('small', { class: 'ax-sub' + (dias != null && dias <= 3 ? ' hot' : '') }, `Próxima: ${bigN(meta)} · faltan ${short(meta - tot)}${dias != null ? ` · ≈ ${dias} ${dias === 1 ? 'día' : 'días'}` : ''}${dias != null && dias <= 1 ? ' · ¡A punto!' : ''}`))));
      if ((t.arriba || []).length || (t.abajo || []).length) body.append(ladder(t.arriba, t.abajo, { rank: t.rank, v: tot }, 'total', 'él', bigN)); body.append(srcLink('https://kworb.net/spotify/artists.html', 'Comprobar en kworb (ordena por «Streams»)'));
      if (t.rank_latino) {
        const latR = (x, me) => h('div', { class: 'ax-lat-r' + (me ? ' me' : '') }, h('span', { class: 'num', text: x.rank }), h('div', { class: 'ax-lat-n' }, h('b', { text: x.nombre }), h('small', { text: [x.pais, x.rank_global ? `#${x.rank_global} mundial` : ''].filter(Boolean).join(' · ') })),
          h('em', { class: 'num', text: bigN(x.total) }), h('small', { text: me ? '' : x.total >= tot ? `+${bigN(x.total - tot)}` : `−${bigN(tot - x.total)}` }));
        body.append(h('div', { class: 'ax-card' }, h('span', { class: 'ax-k', text: `Latinos más escuchados de la historia en Spotify · es el ${ordN(t.rank_latino)}` }),
          h('div', { class: 'ax-lat' }, (t.latinos_arriba || []).map(x => latR(x)), latR({ nombre: DATA.artista.nombre, total: tot, rank: t.rank_latino, rank_global: t.rank, pais: 'Puerto Rico' }, true), (t.latinos_abajo || []).map(x => latR(x))),
          h('small', { class: 'ax-sub', text: `Streams: kworb.net (contadores de Spotify) · ${mu.fecha ? 'actualizado el ' + dfmt(mu.fecha) : 'diario'}. Quién es latino: ${t.latinos_fuente || 'lista manual'} (nacionalidad o país de origen).` })));
      }
    }
    // oyentes mensuales
    if (oy.rank) {
      body.append(h('h3', { class: 'lg-sh', text: 'Oyentes mensuales en el mundo' }));
      body.append(h('div', { class: 'ax-duo' },
        axCard('Puesto mundial', '#' + oy.rank, `${full(oy.oyentes)} oyentes${isNum(oy.cambio) && oy.cambio ? ` · ${signed(oy.cambio)} hoy` : ''}`),
        axCard('Su pico', oy.pico_rank ? '#' + oy.pico_rank : '—', oy.pico_oyentes ? `máximo: ${short(oy.pico_oyentes)} oyentes${oy.oyentes >= oy.pico_oyentes ? ' · ¡ahora mismo!' : ''}` : '')));
      body.append(ladder(oy.arriba, oy.abajo, { rank: oy.rank, v: oy.oyentes }, 'oyentes', 'él')); body.append(srcLink('https://kworb.net/spotify/listeners.html', 'Comprobar en kworb · oyentes mensuales'));
      const hs = hist.filter(x => isNum(x.oy_rank));
      if (hs.length > 1) { const ch = bigChart(hs.map(x => -x.oy_rank), hs.map(x => x.d), 'var(--green)'); if (ch) body.append(h('small', { class: 'ax-sub', text: 'Evolución de su puesto (arriba = mejor)' }), ch); }
    }
    // streams del día
    if (di.streams) {
      body.append(h('h3', { class: 'lg-sh', text: 'Streams del día' }));
      body.append(h('div', { class: 'ax-duo' },
        axCard('Último día', short(di.streams), `#${di.rank} entre todos los artistas`),
        axCard('Mejor día registrado', mu.mejor_dia && mu.mejor_dia.v ? short(mu.mejor_dia.v) : '—', mu.mejor_dia && mu.mejor_dia.d ? dfmt(mu.mejor_dia.d) : '')));
      body.append(ladder(di.arriba, di.abajo, { rank: di.rank, v: di.streams }, 'streams', 'él')); body.append(srcLink('https://kworb.net/spotify/artists.html', 'Comprobar en kworb (ordena por «Daily»)'));
      const hs = hist.filter(x => isNum(x.dia));
      if (hs.length > 1) { const ch = bigChart(hs.map(x => x.dia), hs.map(x => x.d), 'var(--accent)'); if (ch) body.append(ch); }
    }
    if (!oy.rank && !di.streams && !isNum(tot)) body.append(h('p', { class: 'yc-note', text: 'Los rankings mundiales aparecerán tras la próxima actualización completa.' }));
    // Billboard
    body.append(h('h3', { class: 'lg-sh', text: 'Billboard esta semana' }));
    body.append(bbBlock() || h('p', { class: 'yc-note', text: Object.keys(DATA.billboard || {}).length ? 'Esta semana no aparece en las listas de Billboard revisadas.' : 'Billboard se leerá en la próxima actualización completa.' }));
    // clubs de cifras
    body.append(h('h3', { class: 'lg-sh', text: 'Sus temas por cifra · Spotify' }));
    const cs = clubBlock('sp'); if (cs) body.append(cs);
    const cy = clubBlock('yt'); if (cy) { body.append(h('h3', { class: 'lg-sh', text: 'Sus temas por cifra · YouTube' })); body.append(cy); }
    // debuts recientes
    const nuevos = SONGS.filter(s => s.diasPublicado != null && s.diasPublicado <= 60 && ((s.sp.dias || []).length || (s.yt && (s.yt.dias || []).length))).sort((a, b) => a.diasPublicado - b.diasPublicado);
    if (nuevos.length) {
      body.append(h('h3', { class: 'lg-sh', text: 'Debuts recientes' }));
      body.append(h('div', { class: 'yc-list' }, nuevos.slice(0, 8).map(s => { const d = debutStats(s); return h('div', { class: 'yc-row', onclick: () => openSong(s.id) }, h('div', { class: 'ax-bb-cov' }, art(s)),
        h('div', { class: 'yc-row-main' }, h('b', { text: s.titulo }), h('small', { text: [d.yt1 ? `YouTube 24 h: ${short(d.yt1)}` : '', d.sp1 ? `Spotify día 1: ${short(d.sp1)}` : '', `hace ${s.diasPublicado} días`].filter(Boolean).join(' · ') })),
        h('div', { class: 'yc-row-meta' }, h('b', { class: 'num', text: short(d.spSem || d.ytSem) }), h('small', { text: d.spSem ? (d.spN >= 7 ? '1ª semana SP' : `${d.spN} días SP`) : d.ytSem ? (d.ytN >= 7 ? '1ª semana YT' : `${d.ytN} días YT`) : '' }))); })));
    }
    // logros de este tipo
    const lg = logrosList().filter(n => ['rival', 'billboard', 'mundial', 'record'].includes(n.cat)).slice(0, 8);
    if (lg.length) { body.append(h('h3', { class: 'lg-sh', text: 'Últimos hitos' })); body.append(h('div', { class: 'yc-list' }, lg.map(n => logroRow(n)))); }
    body.append(h('p', { class: 'yc-note', text: 'Fuentes: kworb.net (Spotify y YouTube), billboard.com. Se actualiza solo varias veces al día.' }));
    openSheet('Ficha de ' + DATA.artista.nombre, body);
  }
  // primeras horas / días de una canción nueva
  function debutStats(s) {
    const prim = (arr) => { const a = (arr || []).filter(x => isNum(x.v) || isNum(x.t)).slice().sort((x, y) => String(x.d).localeCompare(String(y.d))); return a; };
    const sp = prim(s.sp.dias), yt = prim(s.yt && s.yt.dias);
    const lan = s.lanzamiento ? s.lanzamiento.slice(0, 10) : null;
    const dayN = (d) => lan ? Math.round((new Date(d) - new Date(lan)) / 864e5) + 1 : null;
    const sem = (a) => { const w = a.filter(x => dayN(x.d) != null && dayN(x.d) <= 7); return w.length ? (w[w.length - 1].t || w.reduce((t, x) => t + (x.v || 0), 0)) : null; };
    const nd = (a) => Math.min(7, Math.max(0, ...a.map(x => dayN(x.d) || 0)));
    const d1 = (a) => { const x = a.find(x => dayN(x.d) === 1) || (a[0] && dayN(a[0].d) <= 2 ? a[0] : null); return x ? (x.v || x.t) : null; };
    return { sp, yt, dayN, sp1: d1(sp), yt1: d1(yt), spSem: sem(sp), ytSem: sem(yt), spN: nd(sp), ytN: nd(yt) };
  }
  function debutBlock(s) {
    if (s.diasPublicado == null || s.diasPublicado > 60) return null;
    const d = debutStats(s); if (!d.sp.length && !d.yt.length) return null;
    const box = h('div', { class: 'yc-card ax-debut' }, h('span', { class: 'ax-k', text: 'Debut · día a día' }));
    const kp = [[d.yt1, 'YouTube · primeras 24 h'], [d.sp1, 'Spotify · día 1'], [d.ytN > 1 ? d.ytSem : null, d.ytN >= 7 ? 'YouTube · 1ª semana' : `YouTube · primeros ${d.ytN} días`], [d.spN > 1 ? d.spSem : null, d.spN >= 7 ? 'Spotify · 1ª semana' : `Spotify · primeros ${d.spN} días`]].filter(([v]) => isNum(v));
    if (kp.length) box.append(h('div', { class: 'ax-glance' }, kp.map(([v, l]) => h('div', { class: 'ax-gl' }, h('b', { class: 'num', text: short(v) }), h('small', { text: l })))));
    for (const [arr, name, color] of [[d.sp, 'Spotify', 'var(--green)'], [d.yt, 'YouTube', '#ff3b30']]) {
      const a = arr.map(x => ({ ...x, v: isNum(x.v) ? x.v : d.dayN(x.d) === 1 ? x.t : null })).filter(x => isNum(x.v)).slice(0, 14); if (!a.length) continue;
      const mx = Math.max(...a.map(x => x.v));
      box.append(h('small', { class: 'ax-sub', text: name + ' · streams/views por día' }),
        h('div', { class: 'ax-days' }, a.map(x => h('div', { class: 'ax-day' }, h('em', { class: 'num', text: short(x.v) }), h('i', null, h('i', { style: `height:${Math.max(4, x.v / mx * 100).toFixed(0)}%;background:${color}` })), h('small', { text: d.dayN(x.d) ? 'Día ' + d.dayN(x.d) : dfmt(x.d, { year: undefined }) })))));
    }
    box.append(h('small', { class: 'ax-sub', text: 'Fuente: kworb.net. Cada día suma lo contado ese día.' }));
    return box;
  }
  function renderRedes() {
    const el = $('#p-redes'); el.replaceChildren();
    const P = DATA.perfil, L = DATA.artista.links;
    el.append(h('h1', { class: 'yc-h1', text: 'Perfiles' }), h('p', { class: 'yc-sub', text: 'Todas sus cuentas con sus cifras, su fuente y su fecha.' }));
    el.append(fichaLink());
    const blocks = [
      ['spotify', L.spotify, [['Oyentes mensuales', P.spotify.oyentes_mensuales], ['Seguidores', P.spotify.seguidores], ['Streams totales', P.spotify.streams_totales], ['Streams al día', P.spotify.streams_diarios], ['Como principal', P.spotify.como_principal], ['En colaboraciones', P.spotify.como_feat], ['Canciones', P.spotify.canciones]], P.spotify],
      ['youtube', L.youtube, [['Suscriptores', P.youtube.suscriptores], ['Vistas del canal', P.youtube.vistas], ['Videos subidos', P.youtube.videos], ['Vistas de sus canciones', ytSum()], ['Likes de sus canciones', SONGS.reduce((t, s) => t + (s.yt && isNum(s.yt.likes) ? s.yt.likes : 0), 0)]], P.youtube],
      ['instagram', L.instagram, [['Seguidores', P.instagram && P.instagram.seguidores], ['Publicaciones', P.instagram && P.instagram.publicaciones], ['Siguiendo', P.instagram && P.instagram.siguiendo], ['Interacción', P.instagram && P.instagram.engagement != null ? P.instagram.engagement : null], ['Me gusta por post', P.instagram && P.instagram.likes_medios], ['Comentarios por post', P.instagram && P.instagram.comentarios_medios]], P.instagram],
      ['tiktok', L.tiktok, [['Seguidores', P.tiktok && P.tiktok.seguidores], ['Me gusta', P.tiktok && P.tiktok.me_gusta]], P.tiktok],
      ['shazam', L.shazam, [['Shazams totales', P.shazam && P.shazam.total], ['Canciones con dato', SONGS.filter(s => s.shazam).length]], P.shazam],
      ['apple', L.apple_music, [], P.apple_music],
      ['audiomack', L.audiomack, [['Seguidores', P.audiomack && P.audiomack.seguidores], ['Reproducciones', P.audiomack && P.audiomack.reproducciones]], P.audiomack],
      ['deezer', L.deezer, [['Fans', P.deezer && P.deezer.fans]], P.deezer],
      ['x', L.x, [['Seguidores', P.x && P.x.seguidores]], P.x],
      ['facebook', L.facebook, [['Seguidores', P.facebook && P.facebook.seguidores]], P.facebook],
      ['pandora', L.pandora, [['Oyentes mensuales', P.pandora && P.pandora.oyentes_mensuales], ['Streams', P.pandora && P.pandora.streams]], P.pandora],
      ['chartmetric', L.chartmetric, [['Ranking mundial', P.chartmetric && P.chartmetric.rank], ['Playlists de Spotify', P.chartmetric && P.chartmetric.playlists_spotify], ['Alcance de esas playlists', P.chartmetric && P.chartmetric.alcance_playlists], ['Vistas con sus sonidos en TikTok', P.chartmetric && P.chartmetric.tiktok_vistas_videos]], P.chartmetric]
    ].filter(b => b[3]);
    const grid = h('div', { class: 'yc-grid' });
    for (const [k, url, items, meta] of blocks) {
      const c = h('div', { class: 'yc-plat reveal', style: 'margin:0' }, h('div', { class: 'yc-plat-h' }, pico(k), h('b', { text: PLAT[k].name }), url ? h('a', { href: url, target: '_blank', rel: 'noopener', text: 'Abrir ↗' }) : null));
      if (items.length) c.append(h('div', { class: 'yc-stats' }, items.filter(([, v]) => v != null).map(([l, v]) => l === 'Interacción' ? stat(l, pct(v), 'likes + comentarios / seguidores') : l === 'Ranking mundial' ? stat(l, '#' + full(v), 'entre todos los artistas') : HKEY[k + ':' + l] ? clickStat(growthStat(l, v, growth(HKEY[k + ':' + l]), PLAT[k].color), () => openMetric(k, l, v)) : stat(l, short2(v), isNum(v) && v >= 10000 ? full(v) : ''))));
      if (k === 'apple' && meta) c.append(h('div', { class: 'yc-stats' }, stat('Último lanzamiento', meta.ultimo_lanzamiento || '—', dfmt(meta.fecha_ultimo))), h('p', { class: 'yc-note', text: meta.nota || '' }));
      if (meta) c.append(h('p', { class: 'yc-src', text: `Fuente: ${meta.fuente || '—'} · ${dfmt(meta.fecha)}${meta.aprox || meta.oyentes_aprox || meta.suscriptores_aprox ? ' · algunas cifras vienen redondeadas' : ''}` }));
      grid.append(c);
    }
    el.append(grid);
    el.append(section('Crecimiento por día', 'cuánto gana cada cuenta'));
    const GROWS = [['spotify', 'Oyentes mensuales'], ['spotify', 'Seguidores'], ['spotify', 'Streams al día'], ['spotify', 'Streams totales'], ['youtube', 'Suscriptores'], ['youtube', 'Vistas del canal'], ['youtube', 'Vistas de sus canciones'], ['instagram', 'Seguidores'], ['tiktok', 'Seguidores'], ['x', 'Seguidores'], ['facebook', 'Seguidores'], ['shazam', 'Shazams totales'], ['deezer', 'Fans'], ['audiomack', 'Seguidores']];
    const hs = histSorted(); const lastH = hs[hs.length - 1] || {};
    const gl = h('div', { class: 'yc-list' }, GROWS.filter(([k, l]) => isNum(lastH[HKEY[k + ':' + l]])).map(([k, l]) => {
      const key = HKEY[k + ':' + l], g = growth(key);
      const sub = g ? [isNum(g.d1) ? `${signed(g.d1)} vs anterior` : '', isNum(g.d7) ? `${signed(g.d7)} en 7 días` : '', isNum(g.d30) ? `${signed(g.d30)} en 30 días` : ''].filter(Boolean).join(' · ') : 'Ganancia diaria: desde la próxima actualización';
      return h('div', { class: 'yc-row', style: 'cursor:default' }, pico(k), h('div', { class: 'yc-row-main' }, h('b', { text: `${PLAT[k].name} · ${l}` }), h('small', { text: sub })),
        g ? spark(g.serie, PLAT[k].color) : null,
        h('div', { class: 'yc-row-meta' }, h('b', { text: short2(lastH[key]) }), h('small', { class: g && g.media > 0 ? 'yc-up' : g && g.media < 0 ? 'yc-down' : '', text: g ? `${signed(g.media)}/día` : full(lastH[key]) })));
    }));
    el.append(gl, h('p', { class: 'yc-note', text: `Calculado con ${hs.length} registro${hs.length === 1 ? '' : 's'} (uno por día). Las cifras que las fuentes dan redondeadas (p. ej. 1,1 M) solo cambian cuando cambia el redondeo.` }));
    // Top Apple
    if ((DATA.apple_top || []).length) {
      el.append(section('Top canciones en Apple Music', 'orden de su perfil'));
      el.append(h('div', { class: 'yc-list' }, DATA.apple_top.slice().sort((a, b) => a.puesto - b.puesto).map(r => {
        const s = SONGS.find(x => x.b === base(r.cancion) || x.b.replace(/\s*\(.*$/, '') === base(r.cancion).replace(' el ', ' el '));
        return h('div', { class: 'yc-row', onclick: s ? () => openSong(s.id) : null }, h('span', { class: 'yc-rank', text: r.puesto }), s ? art(s) : h('div', { class: 'yc-art', style: 'background:var(--apple)', text: '♪' }),
          h('div', { class: 'yc-row-main' }, h('b', { text: r.cancion }), h('small', { text: `${r.lanzamiento} · ${r.anio}` })), s ? icon('chev', 'yc-chev') : null);
      })));
    }
    // YouTube diario
    const yd = (DATA.yt_diario || []).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).slice(-21);
    if (yd.length) {
      el.append(section('Vistas nuevas por día en su canal', 'Social Blade'));
      const mx = Math.max(...yd.map(r => r.vistas_dia || 0), 1);
      const vb = h('div', { class: 'yc-vbars' }, yd.map(r => h('div', { title: `${dfmt(r.fecha)}: ${r.vistas_dia == null ? 'sin cambio registrado' : full(r.vistas_dia)}` }, h('i', { 'data-hh': ((r.vistas_dia || 0) / mx * 100).toFixed(1) }), h('span', { text: parseD(r.fecha).getUTCDate() }))));
      el.append(card(vb, h('p', { class: 'yc-note', text: 'Los días sin barra son días en que Social Blade no registró cambio en el contador.' })));
      requestAnimationFrame(() => requestAnimationFrame(() => $$('i[data-hh]', vb).forEach(i => { i.style.height = i.dataset.hh + '%'; })));
    }
    el.append(section('Videos más vistos', 'todas sus canciones con video'));
    const tv = SONGS.filter(s => s.yt).sort((a, b) => b.yt.vistas - a.yt.vistas).slice(0, 15);
    el.append(card(hbars(tv, { label: s => s.titulo, value: s => s.yt.vistas, color: '#ff0033', onclick: s => openSong(s.id) })));
  }

  // Estudio: editor de imágenes + captions + ideas
  let studioPending = null;
  function toStudio(pre) { studioPending = pre; go('estudio'); if (window.YCStudio && RENDERED.has('estudio') && $('#studio canvas')) { window.YCStudio.load(pre); studioPending = null; } }
  // el editor y sus fuentes solo se descargan al entrar en el Estudio
  let studioP = null;
  function loadStudio() {
    if (window.YCStudio) return Promise.resolve();
    if (studioP) return studioP;
    if (!document.querySelector('link[data-studio]')) { const f = document.createElement('link'); f.rel = 'stylesheet'; f.href = 'assets/studio.css?v=3'; f.dataset.studio = '1'; document.head.append(f); }
    studioP = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'assets/studio.js?v=3'; sc.onload = res; sc.onerror = () => { studioP = null; rej(); }; document.head.append(sc); });
    return studioP;
  }
  function renderPosts() {
    const el = $('#p-estudio'); el.replaceChildren();
    el.append(h('h1', { class: 'yc-h1', text: 'Estudio' }), h('p', { class: 'yc-sub', text: 'Crea tus posts de Instagram con tu estilo: sube una foto, edítala y descárgala en alta calidad. Abajo tienes captions listos con las cifras de ahora.' }));
    const holder = h('div', { id: 'studio' }, h('div', { class: 'yc-loading' }, h('i', { style: 'height:420px' }), h('i', { style: 'height:180px' })));
    el.append(holder);
    loadStudio().then(() => { holder.replaceChildren(); window.YCStudio.mount(holder, { toast, copy, store, events: studioEvents, pre: studioPending,
      defaults: { marca: MK(), titular: `${AN().toUpperCase()} LA ROMPE EN *SPOTIFY*`, autor: '@' + AU(), imagen: hd(DATA.artista.imagen, 1400) },
      datos: studioDatos, carousel: studioCarousel, songs: studioSongs, songPanels,
      top5: () => { const L = SONGS.filter(x => isNum(x.sp.diarios)).sort((a, b) => b.sp.diarios - a.sp.diarios).slice(0, 5); return L.length ? { titulo: 'LO MÁS ESCUCHADO HOY', lista: L.map(x => `${x.titulo} | ${short(x.sp.diarios)}`).join('\n') } : null; } }); studioPending = null; glideSoon(); })
      .catch(() => holder.replaceChildren(h('p', { class: 'yc-empty', text: 'No se pudo cargar el editor. Revisa la conexión.' })));
    const capH = section('Caption de logros de una canción', ''); capH.id = 'cap-song'; el.append(capH, captionBlock());
    const posts = buildPosts();
    el.append(section('Captions listos', `${posts.length} textos con las cifras de ahora`));
    const firma = `\n\n📊 Datos: ${'{F}'}${mkSig()}`;
    el.append(h('div', { class: 'yc-list' }, posts.map(p => {
      const tags = `\n\n#${AH()}${mkTag()} #trap #musicaurbana #charts`;
      const full_ = p.t + firma.replace('{F}', p.f) + tags;
      return h('div', { class: 'yc-post' }, h('p', null, p.t, h('small', { text: 'Fuente: ' + p.f })),
        h('div', { class: 'yc-post-btns' }, h('button', { class: 'yc-copy', onclick: () => copy(full_), text: 'Copiar caption' }), h('button', { class: 'yc-copy sec', onclick: () => toStudio({ titular: p.t.replace(/^\S+\s/, ''), etiqueta: SITE().toUpperCase(), texto: p.t }), text: 'Hacer imagen' })));
    })));
    const IDEAS = [
      ['Cada día', [
        ['«Lo que más suena hoy»', 'Inicio → Lo que más suena hoy', 'Top 3 con streams del día. Formato: historia con barras.'],
        ['Parte de listas', 'Listas → Solo dentro', 'Dónde está, su puesto y si subió o bajó. Usa la bandera de cada país.'],
        ['Contador del estreno', 'Nuevos → tarjeta del tema', 'Día X: streams en Spotify, vistas en YouTube y media diaria. Funciona los primeros 14 días.'],
        ['Vistas en vivo', 'Botón Actualizar → abre la canción', 'Las vistas y likes de YouTube se actualizan al momento: «X ya pasa de N vistas».']]],
      ['Cada 3 días', [
        ['Hitos a la vista', 'Inicio → Próximos hitos', '«A X streams de los 100 M». Luego el post de «¡Lo logró!».'],
        ['Duelo de estrenos', 'Nuevos → ¿Cuál arrancó mejor?', 'Compara la media diaria de sus últimos singles en Spotify y YouTube.'],
        ['Propias vs colaboraciones', 'Perfiles → Spotify', 'Qué parte de sus streams viene de sus temas y cuánta de sus featurings.'],
        ['Ranking de likes', 'Canciones → Orden: Likes YouTube', 'Top 5 de videos con más likes y su % de likes por vista.']]],
      ['Cada semana', [
        ['Resumen semanal', 'Inicio → Evolución día a día', 'Cuánto ganó en la semana en oyentes, streams y vistas.'],
        ['Mapa de picos', 'Listas → Su mejor puesto en cada país', 'En cuántos países entró al Top 200 y su mejor puesto en cada uno.'],
        ['Álbumes en cifras', 'Álbumes', 'Lo que suma cada álbum entre Spotify y YouTube.'],
        ['Total combinado', 'Canciones → Orden: Total combinado', 'Sus canciones más grandes sumando todas las plataformas.']]],
      ['Cuando pase algo', [
        ['Estreno', 'Nuevos (etiqueta «Nuevo»)', 'Día 1: fecha y artistas. Día 3 y 7: cifras y puestos en tendencias.'],
        ['Entrada en una lista', 'Listas', 'Cuando un país pase a «Dentro», publica puesto y país. Si es su primera vez allí, dilo.'],
        ['Récord personal', 'Ficha de la canción → Picos', 'Si un tema supera su mejor puesto anterior en un país.'],
        ['Cifra redonda', 'Perfiles', '2.500 M de streams, 800 M de vistas, 2 M de seguidores…']]]];
    el.append(section('Ideas para tu calendario', 'qué mirar y cómo contarlo'));
    /* ideas */
    el.append(h('div', { class: 'yc-grid' }, IDEAS.map(([t, items]) => h('div', { class: 'yc-card reveal' }, h('span', { class: 'yc-pill hot', text: t }), items.map(([a, b, c]) => h('div', { class: 'yc-idea' }, h('b', { text: a }), h('p', null, 'Mira: ', h('em', { text: b }), '. ' + c)))))));
    $$('.reveal', el).forEach(reveal);
  }
  // próximos hitos de streams (Spotify) para el Estudio y la página de récords
  const HITOS = [1e6, 5e6, 10e6, 25e6, 50e6, 75e6, 100e6, 150e6, 200e6, 250e6, 300e6, 400e6, 500e6, 600e6, 700e6, 750e6, 800e6, 900e6, 1e9, 1.25e9, 1.5e9, 1.75e9, 2e9, 2.5e9, 3e9, 4e9, 5e9];
  const nextHito = (v) => isNum(v) ? HITOS.find(x => x > v) || null : null;
  function proximosHitos() {
    return SONGS.filter(s => isNum(s.sp.total) && isNum(s.sp.diarios) && s.sp.diarios > 0).map(s => {
      const meta = nextHito(s.sp.total); if (!meta) return null;
      const faltan = meta - s.sp.total, dias = Math.ceil(faltan / s.sp.diarios);
      return { s, meta, faltan, dias, pct: s.sp.total / meta * 100, aPunto: faltan <= s.sp.diarios };
    }).filter(Boolean).sort((a, b) => a.dias - b.dias);
  }
  function studioDatos() {
    const P = DATA.perfil || {}, sp = P.spotify || {}, yt = P.youtube || {};
    const enListas = (DATA.charts || []).filter(c => c.posicion != null).length;
    const rows = [['Oyentes mensuales', sp.oyentes_mensuales], ['Streams hoy · Spotify', sp.streams_diarios], ['Streams totales · Spotify', sp.streams_totales], ['Vistas · YouTube', ytSum()], ['Suscriptores · YouTube', yt.suscriptores], ['Listas en las que está hoy', enListas || null]]
      .filter(r => isNum(r[1])).map(([l, v]) => `${l} | ${l.startsWith('Listas') ? v : short(v)}`);
    return rows.length ? { datos: rows.slice(0, 6).join('\n'), titulo: `${AN().toUpperCase()} HOY EN *NÚMEROS*` } : null;
  }
  function studioCarousel() {
    if (!SONGS.length) return null;
    const out = [], img = DATA.artista.imagen, hoy = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }).toUpperCase();
    out.push({ plantilla: 'titular', titular: `${AN().toUpperCase()} HOY EN *NÚMEROS*`, etiqueta: hoy, subtitulo: 'DESLIZA →', imagen: img });
    const D = studioDatos(); if (D) out.push({ plantilla: 'datos', titular: 'SUS CIFRAS DE HOY', etiqueta: 'EN NÚMEROS', datos: D.datos, imagen: img });
    const top = SONGS.filter(x => isNum(x.sp.diarios)).sort((a, b) => b.sp.diarios - a.sp.diarios).slice(0, 5);
    if (top.length) out.push({ plantilla: 'top5', listaTitulo: 'LO MÁS ESCUCHADO HOY', etiqueta: 'SPOTIFY', lista: top.map(x => `${x.titulo} | ${short(x.sp.diarios)}`).join('\n'), imagen: top[0].portada || img });
    const best = (DATA.charts || []).filter(c => c.posicion != null).sort((a, b) => a.posicion - b.posicion)[0];
    if (best) { const s = SONGS.find(x => x.b === base(best.cancion)); out.push({ plantilla: 'charts', titular: best.cancion, etiqueta: best.lista.toUpperCase(), numero: '#' + best.posicion, numeroTxt: `${best.plataforma} · ${best.pais}`.toUpperCase(), imagen: (s && s.portada) || img }); }
    const m = proximosHitos()[0];
    if (m) out.push({ plantilla: 'meta', titular: `${m.s.titulo} va a por los ${short(m.meta)}`, etiqueta: 'PRÓXIMO HITO', numero: `FALTAN ${short(m.faltan)}`, numeroTxt: `≈ ${m.dias} ${m.dias === 1 ? 'DÍA' : 'DÍAS'} A ESTE RITMO`, progreso: m.pct, imagen: m.s.portada || img });
    const rel = releases()[0];
    if (rel && rel.diasPublicado != null && rel.diasPublicado <= 30) out.push({ plantilla: 'portada', titular: rel.titulo, etiqueta: 'ÚLTIMO ESTRENO', subtitulo: `${short(rel.combinado)} REPRODUCCIONES`, imagen: rel.portada || img });
    return out;
  }
  function studioEvents() {
    const out = [];
    for (const n of (DATA.novedades || []).slice(0, 30)) out.push({ titular: n.titulo, etiqueta: (NOV_T[n.tipo] || ['NOVEDAD'])[0].toUpperCase(), imagen: n.imagen || ((n.cancion && songById(n.cancion)) || {}).portada, texto: n.texto });
    for (const c of (DATA.charts || []).filter(c => c.posicion != null)) { const s = SONGS.find(x => x.b === base(c.cancion)); out.push({ titular: `#${c.posicion} en ${c.plataforma} ${c.pais}`, etiqueta: c.lista.toUpperCase(), imagen: s && (s.portada || (s.yt && `https://i.ytimg.com/vi/${s.yt.video_id}/maxresdefault.jpg`)), texto: c.cancion, numero: '#' + c.posicion, sub: `${c.plataforma.toUpperCase()} · ${c.pais.toUpperCase()}` }); }
    const rel = releases()[0]; if (rel) out.push({ titular: `"${rel.titulo}" ya suma ${short(rel.combinado)} reproducciones`, etiqueta: 'NUEVO', imagen: rel.portada || (rel.yt && `https://i.ytimg.com/vi/${rel.yt.video_id}/maxresdefault.jpg`), numero: short(rel.combinado), sub: 'REPRODUCCIONES' });
    return out;
  }
  function buildPosts() {
    const out = []; const P = DATA.perfil;
    const rel = releases();
    const n = rel[0];
    if (n) {
      const bits = [];
      if (isNum(n.sp.total)) bits.push(`${full(n.sp.total)} streams en Spotify (dato del ${dfmt(n.sp.fecha)})`);
      if (n.yt) bits.push(`${full(n.yt.vistas)} vistas y ${full(n.yt.likes)} likes en YouTube`);
      if (n.shazam) bits.push(`${full(n.shazam.total)} Shazams`);
      out.push({ t: `🆕 "${n.titulo}" (${n.artistas}) salió hace ${n.diasPublicado} días y ya suma ${bits.join(', ')}.`, f: 'kworb.net · YouTube · Shazam' });
      const L = (n.listas || []).filter(x => isNum(x.puesto) && x.fecha).sort((a, b) => a.puesto - b.puesto).slice(0, 3);
      if (L.length) out.push({ t: `🚀 "${n.titulo}" en listas: ${L.map(x => `#${x.puesto} en ${x.lista} de ${x.plataforma}${x.pais ? ' ' + x.pais : ''}${x.fecha ? ' (' + dfmt(x.fecha) + ')' : ''}`).join(' · ')}.`, f: 'kworb.net' });
    }
    for (const s of rel.slice(0, 5)) if (isNum(s.spMedia) && s.yt) out.push({ t: `📀 "${s.titulo}": ${full(s.sp.total)} streams en Spotify (${full(s.spMedia)}/día de media) y ${full(s.yt.vistas)} vistas en YouTube.`, f: `kworb.net (${dfmt(s.sp.fecha)}) · YouTube (${dfmt(s.yt.fecha)})` });
    out.push({ t: `🎧 ${AN()} suma ${full(P.spotify.streams_totales)} streams en Spotify y ${full(P.spotify.streams_diarios)} cada día.`, f: `kworb.net · ${dfmt(P.spotify.fecha)}` });
    out.push({ t: `▶️ Los videos de sus canciones suman ${full(ytSum())} vistas en YouTube.`, f: `YouTube · ${dfmt(DATA.generado)}` });
    const top = SONGS.filter(s => isNum(s.sp.diarios)).sort((a, b) => b.sp.diarios - a.sp.diarios).slice(0, 3);
    if (top.length) out.push({ t: `🔥 Lo que más suena hoy de ${AN()} en Spotify: ${top.map((s, i) => `${i + 1}. ${s.titulo.replace(/\s*\((with|feat\.)[^)]*\)/i, '')} (${full(s.sp.diarios)})`).join(' · ')}.`, f: 'kworb.net' });
    const yv = SONGS.filter(s => s.yt).sort((a, b) => b.yt.vistas - a.yt.vistas)[0];
    if (yv) out.push({ t: `🎬 "${yv.titulo}" es su video más visto: ${full(yv.yt.vistas)} vistas y ${full(yv.yt.likes)} likes.`, f: 'YouTube' });
    for (const c of (DATA.charts || []).filter(c => c.posicion != null)) out.push({ t: `📈 "${c.cancion}" está en el #${c.posicion}${c.cambio ? ` (${c.cambio})` : ''} de ${c.lista} de ${c.plataforma} en ${c.pais} ${flag(ccOf(c.pais, c.codigo))}.`, f: `${c.plataforma} vía kworb.net · ${dfmt(c.fecha_lista || c.consultado)}` });
    const ms = SONGS.map(s => Object.assign({ s }, nextMilestone(s.sp.total, s.sp.diarios))).filter(x => x.hito && x.dias <= 45).sort((a, b) => a.dias - b.dias).slice(0, 3);
    for (const x of ms) out.push({ t: `⏳ "${x.s.titulo}" estaba a ${full(x.faltan)} streams de los ${short(x.hito)} en Spotify el ${dfmt(x.s.sp.fecha)}. A ese ritmo, lo logra en ~${x.dias} días.`, f: 'kworb.net' });
    const peaks = SONGS.flatMap(s => (s.picos || []).map(p => ({ s, p })));
    if (peaks.length) { const b = peaks.sort((a, c) => a.p.pico - c.p.pico)[0]; out.push({ t: `🌎 ${AN()} ha entrado al Top 200 diario de Spotify en ${new Set(peaks.map(x => x.p.pais)).size} mercados. Su mejor puesto: #${b.p.pico} en ${b.p.pais} ${flag(b.p.codigo)} con "${b.s.titulo}".`, f: 'kworb.net' }); }
    const own = SONGS.filter(s => s.rol === 'Principal').reduce((t, s) => t + (s.sp.total || 0), 0), all = SONGS.reduce((t, s) => t + (s.sp.total || 0), 0);
    if (all) out.push({ t: `🤝 El ${Math.round((1 - own / all) * 100)} % de sus streams en Spotify vienen de colaboraciones.`, f: 'kworb.net' });
    out.push({ t: `📱 ${AN()} en redes: ${full(P.instagram && P.instagram.seguidores)} en Instagram, ${short2(P.tiktok && P.tiktok.seguidores)} en TikTok, ${short2(P.youtube.suscriptores)} suscriptores en YouTube y ${short2(P.shazam && P.shazam.total)} Shazams.`, f: 'Social Blade · Chartmetric' });
    return out;
  }

  // ---------- ficha de canción ----------
  function playVideo(hero, id) {
    hero.classList.add('playing');
    hero.replaceChildren(h('iframe', { src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`, title: 'Video de YouTube', allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin' }));
  }
  function openSong(id, push = true, opts = {}) {
    const s = songById(id); if (!s) return;
    const body = h('div');
    // cabecera deluxe: portada grande sobre su propio color
    const bigCov = bigCover(s) || (s.yt ? `https://i.ytimg.com/vi/${s.yt.video_id}/maxresdefault.jpg` : null);
    const favB = h('button', { class: 'yc-pill yc-favbtn', type: 'button', 'aria-pressed': String(isFav(s.id)), onclick: () => { toggleFav(s.id); favB.setAttribute('aria-pressed', String(isFav(s.id))); favB.lastChild.textContent = isFav(s.id) ? 'En favoritas' : 'Seguir'; } }, icon('star'), h('span', { text: isFav(s.id) ? 'En favoritas' : 'Seguir' }));
    const hero = h('div', { class: 'yc-detail-hero' });
    if (s.yt) hero.append(ytThumb(s.yt.video_id, ['maxresdefault', 'sddefault', 'hqdefault']));
    if (s.yt) { hero.append(h('button', { class: 'yc-play big', type: 'button', 'aria-label': 'Reproducir el video aquí', onclick: (e) => { e.stopPropagation(); playVideo(hero, s.yt.video_id); } }, icon('play'))); hero.classList.add('can-play'); hero.addEventListener('click', () => { if (!hero.classList.contains('playing')) playVideo(hero, s.yt.video_id); }); }
    const covBox = h('div', { class: 'lg-song-cov' }, bigCov ? h('img', { src: bigCov, alt: s.titulo, decoding: 'async', onerror: (e) => { e.target.replaceWith(art(s)); } }) : art(s));
    const head = h('div', { class: 'lg-song-head' },
      h('div', { class: 'lg-song-bg' }, bigCov ? h('img', { src: bigCov, alt: '', decoding: 'async', onerror: (e) => e.target.remove() }) : null),
      covBox,
      h('div', { class: 'lg-song-info' },
        h('span', { class: 'lg-kicker' }, h('i'), s.isNew ? 'Nuevo lanzamiento' : (s.rol === 'Principal' ? 'Canción' : 'Colaboración')),
        h('h2', { class: 'lg-song-t', text: s.titulo }),
        h('p', { class: 'lg-song-a', text: s.artistas }),
        h('div', { class: 'lg-song-act' },
          s.yt ? h('button', { class: 'yc-btn', type: 'button', onclick: () => { hero.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => playVideo(hero, s.yt.video_id), 400); } }, icon('play'), 'Ver video') : null,
          s.sp.id ? h('a', { class: 'yc-btn sec', href: `https://open.spotify.com/track/${s.sp.id}`, target: '_blank', rel: 'noopener' }, icon('spotify'), 'Spotify') : null,
          h('button', { class: 'yc-btn sec', type: 'button', onclick: () => { closeSheet(); setTimeout(() => toStudio({ plantilla: 'charts', titular: s.titulo, etiqueta: isNum(s.sp.diarios) ? `${short(s.sp.diarios)} AL DÍA` : 'SPOTIFY', numero: short(s.sp.total || s.combinado).replace(/\s/g, ''), numeroTxt: 'STREAMS EN SPOTIFY', imagen: coverOf(s) }), 250); } }, icon('pen'), 'Hacer post'),
          h('button', { class: 'yc-btn sec', type: 'button', onclick: () => openCompare(s.id) }, icon('bolt'), 'Comparar'))));
    body.append(head);
    if (opts.play && s.yt) setTimeout(() => playVideo(hero, s.yt.video_id), 350);
    body.append(h('div', { class: 'yc-pills' }, favB,
      h('span', { class: 'yc-pill' + (s.rol === 'Principal' ? ' hot' : ''), text: s.rol === 'Principal' ? 'Artista principal' : 'Colaboración' }),
      s.lanzamiento ? h('span', { class: 'yc-pill', text: `Salió el ${dfmt(s.lanzamiento)}${s.diasPublicado != null ? ` · hace ${full(s.diasPublicado)} días` : ''}` }) : null,
      s.album ? h('span', { class: 'yc-pill', text: '💿 ' + s.album + (s.pista ? ` · pista ${s.pista}` : '') }) : null,
      s.duracion_ms ? h('span', { class: 'yc-pill', text: '⏱ ' + Math.floor(s.duracion_ms / 60000) + ':' + String(Math.round(s.duracion_ms / 1000) % 60).padStart(2, '0') }) : null,
      s.hoy.length ? h('span', { class: 'yc-pill hot', text: `📈 En ${s.hoy.length} lista${s.hoy.length > 1 ? 's' : ''} hoy` }) : null));
    // cifras clave
    const kb = (label, v, sub, fmt) => { const b = h('b', { class: 'lg-mid num', text: '—' }); countUp(b, isNum(v) ? v : null, fmt || short); return h('div', { class: 'lg-tile lg-k' }, h('span', { class: 'lg-lab', text: label }), b, sub ? h('small', { class: 'lg-clip', text: sub }) : null); };
    body.append(h('div', { class: 'lg-kpis' },
      kb('Total combinado', s.combinado || null, 'Spotify + YouTube + Audiomack'),
      kb('Spotify', s.sp.total, s.rank_sp ? `#${s.rank_sp} de ${SONGS.nSp} en su catálogo` : ''),
      kb('Streams hoy', s.sp.diarios, s.rank_spd ? `#${s.rank_spd} hoy` : 'sin dato diario'),
      kb('YouTube', s.yt && s.yt.vistas, s.yt ? `${short(s.yt.likes)} likes` : 'sin video')));
    body.append(h('div', { class: 'lg-sum' }, h('b', { text: 'En pocas palabras' }), h('p', { text: songSummary(s) })));
    // hitos de la canción
    if (isNum(s.sp.total)) {
      const past = HITOS.filter(x => x <= s.sp.total).slice(-4), nx = nextHito(s.sp.total), daily = s.sp.diarios || s.spMedia;
      const dd = nx && daily ? Math.ceil((nx - s.sp.total) / daily) : null;
      body.append(h('div', { class: 'yc-card lg-song-hitos' },
        h('div', { class: 'lg-song-hito' }, nx ? ring(s.sp.total / nx * 100, 68) : null,
          h('div', null, h('span', { class: 'lg-lab', text: 'Próximo hito en Spotify' }), h('b', { class: 'lg-mid', text: nx ? short(nx) : '—' }), h('small', { text: nx ? (daily && nx - s.sp.total <= daily ? `¡A punto! 🔥 faltaban ${full(nx - s.sp.total)} · en Spotify ya lo habría superado` : `faltan ${full(nx - s.sp.total)}${dd ? ` · ≈ ${dd} ${dd === 1 ? 'día' : 'días'}` : ''}`) : '' }))),
        past.length ? h('div', { class: 'lg-chips' }, h('small', { class: 'lg-lab', text: 'Ya superó' }), past.reverse().map(x => h('span', { class: 'lg-chip', text: '✓ ' + short(x) }))) : null));
    }
    const deb = debutBlock(s); if (deb) body.append(deb);
    body.append(songPostKit(s));
    if (s.yt) { const tt = String(s.yt.titulo || ''); const tipo = /visuali[sz]er/i.test(tt) ? 'Visualizer oficial' : (/audio/i.test(tt) && !/video|v[ií]deo/i.test(tt.replace(/audio/ig, '')) ? 'Audio oficial' : 'Videoclip'); body.append(h('h3', { class: 'lg-sh', text: tipo })); body.append(hero); }

    // Spotify
    const ms = nextMilestone(s.sp.total, s.sp.diarios || s.spMedia);
    body.append(platBlock('spotify', s.sp.id ? `https://open.spotify.com/track/${s.sp.id}` : null, [
      stat('Streams totales', full(s.sp.total), s.rank_sp ? `#${s.rank_sp} de ${SONGS.nSp} en su catálogo` : ''),
      stat('Streams del día', full(s.sp.diarios), s.rank_spd ? `#${s.rank_spd} hoy` : 'sin dato diario'),
      stat('Media diaria', full(s.spMedia), s.diasSp ? `en ${s.diasSp} días desde la salida` : 'sin fecha de salida'),
      stat('Próximo hito', ms ? short(ms.hito) : '—', ms ? `faltan ${short(ms.faltan)} · ~${ms.dias} días${s.sp.diarios ? '' : ' (según su media)'}` : '')],
      `Fuente: ${s.sp.fuente || 'kworb.net'}${s.sp.fecha ? ' · dato del ' + dfmt(s.sp.fecha) : ''}`));
    if (s.sp.id) body.lastChild.append(h('iframe', { class: 'yc-spembed', src: `https://open.spotify.com/embed/track/${s.sp.id}?utm_source=generator&theme=0`, title: 'Escuchar en Spotify', loading: 'lazy', allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture' }));
    // YouTube
    if (s.yt) {
      const ytb = platBlock('youtube', `https://www.youtube.com/watch?v=${s.yt.video_id}`, [
        stat('Vistas', full(s.yt.vistas), s.rank_yt ? `#${s.rank_yt} de ${SONGS.nYt} videos` : ''),
        stat('Likes', full(s.yt.likes), s.likeRate ? `${pct(s.likeRate)} de las vistas` : ''),
        stat('Vistas por día', full(s.ytMedia), s.yt.publicado ? `desde ${dfmt(s.yt.publicado)}` : (s.lanzamiento ? `desde ${dfmt(s.lanzamiento)}` : 'sin fecha')),
        stat('Canal', s.yt.canal || '—', s.yt.titulo ? s.yt.titulo.slice(0, 60) : '')],
        `Fuente: ${s.yt.live ? 'YouTube en vivo (returnyoutubedislikeapi.com) · ' + ago(s.yt.live) : (s.yt.fuente || 'YouTube') + ' · ' + dfmt(s.yt.fecha)}`);
      if (s.yt.live) $('.yc-plat-h b', ytb).prepend(h('span', { class: 'yc-livedot' }));
      body.append(ytb);
      liveOne(s);
    } else body.append(platBlock('youtube', `https://www.youtube.com/results?search_query=${encodeURIComponent(s.titulo.split(' (')[0] + ' ' + (s.artistas || AN()))}`, [], 'Todavía no está vinculado su vídeo: se busca en cada actualización completa. Mientras, «Abrir» te lleva a buscarlo en YouTube.'));
    // Shazam / Audiomack / Apple
    body.append(platBlock('shazam', s.shazam && s.shazam.url, [stat('Shazams', full(s.shazam && s.shazam.total), s.shazam ? 'total de la canción' : 'sin dato')], s.shazam && s.shazam.total ? `Fuente: shazam.com · ${dfmt(s.shazam.fecha)}` : 'Se leerá de shazam.com en la próxima actualización completa.'));
    if (s.audiomack) body.append(platBlock('audiomack', s.audiomack.url, [stat('Reproducciones', full(s.audiomack.reproducciones), 'aprox.'), stat('Me gusta', full(s.audiomack.likes)), stat('En playlists', full(s.audiomack.playlists))], `Fuente: audiomack.com · ${dfmt(s.audiomack.fecha)} · cifras redondeadas por Audiomack`));
    body.append(platBlock('apple', (s.apple && s.apple.url) || `https://music.apple.com/us/search?term=${encodeURIComponent(s.titulo.split(' (')[0] + ` ${AN()}`)}`, [stat('En listas de Apple hoy', s.hoy.filter(c => c.plataforma === 'Apple Music').map(c => `#${c.posicion} ${c.pais}`).join(', ') || 'No')], 'Apple Music no publica reproducciones por canción.'));

    // listas y playlists, todo junto y ordenado
    body.append(songChartsBlock(s));
    body.append(h('div', { style: 'display:grid;gap:8px;margin-top:16px' }, h('button', { class: 'yc-btn sec', onclick: () => copy(songText(s)), text: 'Copiar ficha para un post' })));
    body.append(h('button', { class: 'yc-btn yc-btn-wide', type: 'button', onclick: () => { closeSheet(); setTimeout(() => toCaption(s.id), 300); }, text: '📝 Caption de logros' }));
    openSheet(s.titulo, body);
    $('#sheet').classList.add('song'); tint($('#sheet'), coverOf(s), s.titulo);
    if (push) history.replaceState(null, '', '#cancion/' + s.id);
  }
  function platBlock(k, url, stats, src) {
    return h('div', { class: 'yc-plat' }, h('div', { class: 'yc-plat-h' }, pico(k), h('b', { text: PLAT[k].name }), url ? h('a', { href: url, target: '_blank', rel: 'noopener', text: 'Abrir ↗' }) : null),
      stats.length ? h('div', { class: 'yc-stats' }, stats) : null, src ? h('p', { class: 'yc-src', text: src }) : null);
  }
  function songText(s) {
    const L = [`🎵 ${s.titulo} — ${s.artistas}`];
    if (s.lanzamiento) L.push(`📅 Salió el ${dfmt(s.lanzamiento)} (hace ${s.diasPublicado} días)`);
    if (isNum(s.sp.total)) L.push(`🟢 Spotify: ${full(s.sp.total)} streams${isNum(s.sp.diarios) ? ` · ${full(s.sp.diarios)} al día` : ''}`);
    if (s.yt) L.push(`🔴 YouTube: ${full(s.yt.vistas)} vistas · ${full(s.yt.likes)} likes`);
    if (s.shazam) L.push(`🔵 Shazam: ${full(s.shazam.total)}`);
    if (s.audiomack) L.push(`🟠 Audiomack: ${full(s.audiomack.reproducciones)} reproducciones`);
    if (s.best) L.push(`🏆 Mejor puesto: ${s.best.t} ${flag(s.best.cc)}`);
    if (s.combinado) L.push(`➕ Total combinado: ${full(s.combinado)}`);
    return L.join('\n') + `\n\nFuentes: kworb.net, YouTube, Shazam, Audiomack · ${dfmt(new Date().toISOString())}`;
  }

  // ---------- hoja ----------
  let sheetOpen = false;
  function openSheet(title, content) {
    $('#sheet-title').textContent = title;
    $('#sheet').classList.remove('song', 'tinted');
    const b = $('#sheet-body'); b.replaceChildren(content); b.scrollTop = 0;
    $('#sheet').classList.add('on'); $('#sheet-bg').classList.add('on'); document.body.style.overflow = 'hidden'; sheetOpen = true; haptic();
    animateBars(b); glideSoon();
  }
  function closeSheet() { setTimeout(() => { if (AUTO.pending && !busyNow()) applyData(AUTO.pending); }, 450); $('#sheet').classList.remove('on'); $('#sheet-bg').classList.remove('on'); document.body.style.overflow = ''; sheetOpen = false; $('#sheet').style.transform = ''; if (location.hash.startsWith('#cancion/') || location.hash.startsWith('#disco/') || location.hash === '#actualizar') history.replaceState(null, '', '#' + current); }
  function sheetDrag() {
    const g = $('#sheet-grab'), sh = $('#sheet'); let y0 = null, dy = 0;
    g.addEventListener('pointerdown', (e) => { y0 = e.clientY; dy = 0; sh.style.transition = 'none'; g.setPointerCapture(e.pointerId); });
    g.addEventListener('pointermove', (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = `translateY(${dy}px)`; });
    const end = () => { if (y0 == null) return; sh.style.transition = ''; if (dy > 120) closeSheet(); else sh.style.transform = ''; y0 = null; };
    g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
  }

  // ---------- en vivo: YouTube ----------
  async function rydFetch(id) {
    const r = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (!isNum(j.viewCount)) throw new Error('sin datos');
    return { vistas: j.viewCount, likes: j.likes, at: new Date().toISOString() };
  }
  async function liveOne(s) {
    const prev = LIVE.v[s.yt.video_id];
    if (prev && Date.now() - new Date(prev.at) < 10 * 60e3) return;
    try { LIVE.v[s.yt.video_id] = await rydFetch(s.yt.video_id); LIVE.at = new Date().toISOString(); store.set('yc.live.yt', LIVE); } catch (e) { /* sin conexión al API */ }
  }
  async function liveAll(onProgress) {
    const vids = SONGS.filter(s => s.yt).map(s => s.yt.video_id);
    let done = 0, ok = 0; const q = vids.slice();
    const worker = async () => { while (q.length) { const id = q.shift(); try { LIVE.v[id] = await rydFetch(id); ok++; } catch (e) { /* uno falla, sigue */ } done++; onProgress(done, vids.length, ok); } };
    await Promise.all(Array.from({ length: 6 }, worker));
    LIVE.at = new Date().toISOString(); store.set('yc.live.yt', LIVE);
    return { ok, total: vids.length };
  }

  let liveBgT = 0;
  async function liveBackground() {
    clearTimeout(liveBgT);
    try {
      if (document.visibilityState === 'visible' && SONGS.length) {
        const lim = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
        const top = SONGS.filter(s => s.yt && s.yt.video_id).sort((a, b) => (b.yt.vistas || 0) - (a.yt.vistas || 0)).slice(0, 20);
        const rec = SONGS.filter(s => s.yt && s.yt.video_id && (s.lanzamiento || '') >= lim);
        const lista = [...new Set([...rec, ...top])].slice(0, 30);
        let n = 0;
        for (const s of lista) { const prev = LIVE.v[s.yt.video_id]; if (prev && Date.now() - new Date(prev.at) < 10 * 60e3) continue; try { LIVE.v[s.yt.video_id] = await rydFetch(s.yt.video_id); n++; } catch (e) { /* sigue */ } }
        if (n) { LIVE.at = new Date().toISOString(); store.set('yc.live.yt', LIVE); const lab = $('#updated-label'); if (lab && DATA.generado) lab.textContent = `Datos ${ago(DATA.generado)} · ${new Date(DATA.generado).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · YouTube en vivo ${ago(LIVE.at)}`; }
      }
    } catch (e) { /* sin conexión */ }
    liveBgT = setTimeout(liveBackground, 10 * 60e3);
  }

  // ---------- actualización completa (GitHub Actions) ----------
  async function gh(path, opts = {}) {
    const r = await fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}${path}`, Object.assign({}, opts, { headers: Object.assign({ Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + GH.token, 'X-GitHub-Api-Version': '2022-11-28' }, opts.headers || {}) }));
    if (!r.ok && r.status !== 204) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 140)}`);
    return r.status === 204 ? null : r.json();
  }
  async function runWorkflow(step) {
    const t0 = new Date(Date.now() - 5000).toISOString();
    await gh(`/actions/workflows/${GH.workflow}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: GH.branch }) });
    step('Lanzada. Buscando la ejecución…');
    let run = null;
    for (let i = 0; i < 200; i++) {
      await new Promise(r => setTimeout(r, i < 5 ? 4000 : 7000));
      const j = await gh(`/actions/workflows/${GH.workflow}/runs?event=workflow_dispatch&per_page=5`);
      run = (j.workflow_runs || []).find(r => r.created_at >= t0) || run;
      if (!run) { step('Esperando a que GitHub arranque…'); continue; }
      if (run.status === 'completed') return run;
      const mins = Math.round((Date.now() - new Date(run.created_at)) / 60000);
      step(`${run.status === 'in_progress' ? 'Recogiendo datos de todas las plataformas' : 'En cola'} · ${mins} min`);
    }
    throw new Error('Tardó demasiado; mira la pestaña Actions de GitHub.');
  }
  // conectar GitHub (solo para guardar fuentes y playlists desde la web)
  function openGitHubConnect(onDone) {
    const body = h('div', { class: 'yc-form' });
    const fOwner = h('input', { class: 'yc-in', value: GH.owner, autocapitalize: 'off', 'aria-label': 'Usuario' });
    const fRepo = h('input', { class: 'yc-in', value: GH.repo, autocapitalize: 'off', 'aria-label': 'Repositorio' });
    const fTok = h('input', { class: 'yc-in', type: 'password', autocapitalize: 'off', placeholder: GH.token ? '•••••• guardado' : 'github_pat_…', 'aria-label': 'Token' });
    body.append(h('p', { class: 'yc-form-intro', text: 'Hace falta una sola vez en cada dispositivo para guardar tus fuentes y playlists. El token se queda solo en este navegador.' }),
      h('div', { class: 'yc-list' }, h('label', { class: 'yc-frow-in' }, h('span', { text: 'Usuario' }), fOwner), h('label', { class: 'yc-frow-in' }, h('span', { text: 'Repo' }), fRepo), h('label', { class: 'yc-frow-in' }, h('span', { text: 'Token' }), fTok)),
      h('p', { class: 'yc-note', text: 'Token «fine-grained» solo para este repositorio con permisos: Actions (lectura y escritura), Contents (lectura) y Variables (lectura y escritura).' }),
      h('button', { class: 'yc-btn yc-btn-wide', type: 'button', text: 'Guardar', onclick: () => { GH.owner = fOwner.value.trim(); GH.repo = fRepo.value.trim(); if (fTok.value.trim()) GH.token = fTok.value.trim(); saveGH(); toast('GitHub conectado ✓'); closeSheet(); if (onDone) setTimeout(onDone, 450); } }),
      ...(GH.token ? [h('button', { class: 'yc-btn sec yc-btn-wide', type: 'button', text: 'Borrar token de este dispositivo', onclick: () => { GH.token = ''; saveGH(); toast('Token borrado'); closeSheet(); } })] : []));
    openSheet('Conectar GitHub', body);
  }
  function openRefresh(auto) {
    const body = h('div');
    const mkStep = (title) => { const li = h('li', null, h('i', { text: '' }), h('div', null, h('b', { text: title }), h('small', { text: 'Pendiente' }))); return li; };
    const s1 = mkStep('Vistas y likes de YouTube en vivo'), s2 = mkStep('Todas las plataformas (Spotify, listas, perfiles…)'), s3 = mkStep('Cargar los datos nuevos');
    const prog = h('div', { class: 'yc-progress' }, h('i'));
    const set = (li, st, msg) => { li.className = st; $('i', li).textContent = st === 'ok' ? '✓' : st === 'err' ? '!' : ''; if (msg != null) $('small', li).textContent = msg; };
    body.append(h('p', { class: 'yc-sub', text: 'Busca de nuevo todos los datos con la fecha de hoy: perfiles, canciones, nuevos temas, listas y videos.' }), prog, h('ul', { class: 'yc-steps' }, s1, s2, s3));
    const cfg = h('div', { class: 'yc-card', style: 'margin-top:12px' });
    const fOwner = h('input', { class: 'yc-field', placeholder: 'usuario de GitHub', value: GH.owner, 'aria-label': 'Usuario' });
    const fRepo = h('input', { class: 'yc-field', placeholder: 'nombre del repositorio', value: GH.repo, 'aria-label': 'Repositorio' });
    const fTok = h('input', { class: 'yc-field', type: 'password', placeholder: GH.token ? '•••••• (guardado en este dispositivo)' : 'token de GitHub (github_pat_…)', 'aria-label': 'Token' });
    cfg.append(h('b', { text: 'Conectar con GitHub' }), h('p', { class: 'yc-note', style: 'margin:4px 0 8px', text: 'Para la actualización completa la web lanza la acción «Actualizar datos» de tu repositorio. Crea un token «fine-grained» solo para este repositorio con permiso Actions: lectura y escritura (y Contents: lectura). Se guarda solo en este navegador.' }),
      fOwner, fRepo, fTok, h('button', { class: 'yc-btn sec', onclick: () => { GH.owner = fOwner.value.trim(); GH.repo = fRepo.value.trim(); if (fTok.value.trim()) GH.token = fTok.value.trim(); saveGH(); toast('Guardado'); start(); }, text: 'Guardar y actualizar' }),
      ...(GH.token ? [h('button', { class: 'yc-btn sec', style: 'margin-top:8px', onclick: () => { GH.token = ''; saveGH(); toast('Token borrado de este dispositivo'); }, text: 'Borrar token' })] : []));
    const goBtn = h('button', { class: 'yc-btn', style: 'margin-top:12px', onclick: () => start(), text: 'Actualizar todo ahora' });
    body.append(goBtn, cfg);
    openSheet('Actualizar todo', body);
    history.replaceState(null, '', '#actualizar');
    let running = false;
    async function start() {
      if (running) return; running = true; goBtn.disabled = true; $('#refresh-btn').classList.add('spin');
      set(s1, 'run', 'Consultando cada video…');
      const r1 = await liveAll((d, t, ok) => { $('i', prog).style.width = (d / t * 50) + '%'; $('small', s1).textContent = `${d} de ${t} videos (${ok} actualizados)`; });
      set(s1, r1.ok ? 'ok' : 'err', r1.ok ? `${r1.ok} de ${r1.total} videos actualizados ahora` : 'El servicio de vistas no respondió (prueba más tarde).');
      derive(); renderAll(false);
      if (GH.owner && GH.repo && GH.token) {
        set(s2, 'run', 'Lanzando la actualización en GitHub…');
        try {
          const run = await runWorkflow((m) => { $('small', s2).textContent = m; $('i', prog).style.width = Math.min(90, parseFloat($('i', prog).style.width) + 2) + '%'; });
          set(s2, run.conclusion === 'success' ? 'ok' : 'err', run.conclusion === 'success' ? 'Terminada correctamente' : `Terminó con estado «${run.conclusion}». Revisa Actions en GitHub.`);
          set(s3, 'run', 'Descargando…');
          DATA = await loadData(true); derive(); renderAll(false);
          set(s3, 'ok', `Datos del ${new Date(DATA.generado).toLocaleString('es-ES')}`);
        } catch (e) { set(s2, 'err', String(e.message || e)); set(s3, 'err', 'No se cargaron datos nuevos'); }
      } else {
        set(s2, 'err', 'Falta conectar GitHub (abajo). Mientras tanto, la acción se ejecuta sola 3 veces al día.');
        set(s3, 'run', 'Cargando la última versión publicada…');
        try { DATA = await loadData(false); derive(); renderAll(false); set(s3, 'ok', `Datos del ${new Date(DATA.generado).toLocaleString('es-ES')}`); } catch (e) { set(s3, 'err', 'No se pudo cargar'); }
      }
      $('i', prog).style.width = '100%';
      $('#refresh-btn').classList.remove('spin'); goBtn.disabled = false; running = false;
      toast('Actualización terminada');
    }
    if (auto) start();
  }

  // ---------- fuentes extra (RSS) ----------
  async function ghVar(name, value) {
    const H = { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + GH.token };
    const base = `https://api.github.com/repos/${GH.owner}/${GH.repo}/actions/variables`;
    if (value === undefined) { const r = await fetch(`${base}/${name}`, { headers: H }); if (r.status === 404) return ''; if (!r.ok) throw new Error('GitHub ' + r.status); return (await r.json()).value || ''; }
    const r = await fetch(`${base}/${name}`, { method: 'PATCH', headers: H, body: JSON.stringify({ name, value }) });
    if (r.status === 404) { const c = await fetch(base, { method: 'POST', headers: H, body: JSON.stringify({ name, value }) }); if (!c.ok) throw new Error('GitHub ' + c.status); }
    else if (!r.ok) throw new Error('GitHub ' + r.status);
  }
  function openFeeds() {
    let list = store.get('yc.feeds', []);
    const body = h('div', { class: 'yc-form' });
    const st = h('p', { class: 'yc-note yc-form-st' });
    const ul = h('div', { class: 'yc-list' });
    const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
    const draw = () => ul.replaceChildren(...(list.length ? list.map((f, i) => h('div', { class: 'yc-row yc-frow' },
      h('span', { class: 'yc-fic' }, icon(/instagram/i.test(f.nombre + f.url) ? 'ig' : /tiktok/i.test(f.nombre + f.url) ? 'tiktok' : 'rss')),
      h('div', { class: 'yc-row-main' }, h('b', { text: f.nombre }), h('small', { text: host(f.url) })),
      h('button', { class: 'yc-del', type: 'button', 'aria-label': 'Quitar ' + f.nombre, onclick: () => { list.splice(i, 1); draw(); dirty(); } }))) :
      [h('div', { class: 'yc-row yc-frow', style: 'cursor:default' }, h('div', { class: 'yc-row-main' }, h('small', { text: 'Aún no hay fuentes. Añade la primera abajo.' })))]));
    const nm = h('input', { class: 'yc-in', placeholder: 'Etiquetas en Instagram', 'aria-label': 'Nombre' });
    const url = h('input', { class: 'yc-in', type: 'url', inputmode: 'url', autocapitalize: 'off', placeholder: 'https://rss.app/feeds/….xml', 'aria-label': 'Dirección RSS' });
    const saveB = h('button', { class: 'yc-btn yc-btn-wide', type: 'button', text: 'Guardar', disabled: true });
    const dirty = () => { saveB.disabled = false; };
    const add = () => { const u = url.value.trim(); if (!/^https?:\/\/\S+$/.test(u)) { st.textContent = 'Pega una dirección que empiece por https://'; url.focus(); return; } list.push({ nombre: nm.value.trim().replace(/\|/g, ' ') || host(u), url: u }); nm.value = url.value = ''; st.textContent = ''; draw(); dirty(); };
    saveB.addEventListener('click', async () => {
      store.set('yc.feeds', list);
      if (!(GH.owner && GH.repo && GH.token)) { openGitHubConnect(); return; }
      saveB.disabled = true; saveB.textContent = 'Guardando…';
      try { await ghVar('FEEDS_EXTRA', list.map(f => `${f.nombre}|${f.url}`).join('\n')); st.textContent = ''; toast('Fuentes guardadas ✓'); saveB.textContent = 'Guardado'; }
      catch (e) { st.textContent = 'No se pudo guardar en GitHub (' + e.message + ').'; saveB.disabled = false; saveB.textContent = 'Guardar'; }
    });
    body.append(
      h('p', { class: 'yc-form-intro', text: 'Sus publicaciones aparecen en Lo nuevo.' }),
      h('div', { class: 'yc-group-h', text: 'Tus fuentes' }), ul,
      h('div', { class: 'yc-group-h', text: 'Añadir' }),
      h('div', { class: 'yc-list' },
        h('label', { class: 'yc-frow-in' }, h('span', { text: 'Nombre' }), nm),
        h('label', { class: 'yc-frow-in' }, h('span', { text: 'RSS' }), url),
        h('button', { class: 'yc-row yc-addrow', type: 'button', onclick: add }, h('span', { class: 'yc-plus' }), h('b', { text: 'Añadir fuente' }))),
      st, saveB,
      h('div', { class: 'yc-group-h', text: 'Cómo conseguir un RSS' }),
      h('div', { class: 'yc-list' }, [
        ['Entra en rss.app', 'O fetchrss.com. Elige Instagram o TikTok.'],
        ['Pega lo que quieras seguir', `Un perfil, instagram.com/${AU()}/tagged/, o un hashtag.`],
        ['Copia el enlace .xml', 'Pégalo arriba, pulsa Añadir y luego Guardar.']].map(([t, d], i) =>
        h('div', { class: 'yc-row yc-frow', style: 'cursor:default' }, h('span', { class: 'yc-stepn', text: String(i + 1) }), h('div', { class: 'yc-row-main' }, h('b', { text: t }), h('small', { style: 'white-space:normal', text: d }))))));
    draw(); openSheet('Fuentes', body);
    if (GH.owner && GH.repo && GH.token) ghVar('FEEDS_EXTRA').then(v => { if (!v) return; list = v.split(/\n/).map(l => l.split('|')).filter(x => x[1]).map(([n, u]) => ({ nombre: n.trim(), url: u.trim() })); store.set('yc.feeds', list); draw(); }).catch(() => null);
  }

  const infoRow = (a, b) => h('div', { class: 'yc-row', style: 'cursor:default' }, h('div', { class: 'yc-row-main' }, h('b', { text: a }), h('small', { style: 'white-space:normal', text: b })));

  // ---------- general ----------
  const RENDERED = new Set();
  const RENDER = { inicio: () => renderInicio(), canciones: () => renderCanciones(), novedades: () => renderNovedades(), logros: () => renderLogros(), trayectoria: () => renderTrayectoria(), records: () => renderRecords(), comparar: () => renderComparar(), lanzamientos: () => renderLanz(), listas: () => renderListas(), albumes: () => renderAlbumes(), redes: () => renderRedes(), estudio: () => renderPosts() };
  function renderPage(id) { if (RENDERED.has(id) || !RENDER[id]) return; RENDERED.add(id); RENDER[id](); if (typeof glideSoon === 'function') glideSoon(); }
  function renderAll(first) {
    $('#updated-label').textContent = !DATA.generado ? 'Preparando la primera actualización…' : `Datos ${ago(DATA.generado)} · ${new Date(DATA.generado).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${LIVE.at && (!DATA.generado || LIVE.at > DATA.generado) ? ' · YouTube en vivo ' + ago(LIVE.at) : ''}`;
    RENDERED.clear(); renderPage(current);
    const ig = (u) => h('a', { href: `https://www.instagram.com/${u}/`, target: '_blank', rel: 'noopener', text: '@' + u });
    $('#foot').replaceChildren(
      h('div', { class: 'yc-foot-brand' }, h('b', { text: SITE().toUpperCase() }), h('span', { text: 'Estadísticas de ' + AN() })),
      h('p', { class: 'yc-foot-txt' }, 'Proyecto independiente, sin publicidad ni ningún tipo de monetización, creado para apoyar a ', ig(AU()), '.'),
      h('p', { class: 'yc-foot-txt small', text: 'Página no oficial, sin afiliación con el artista, su sello ni las plataformas. La música, las imágenes y las marcas pertenecen a sus respectivos propietarios.' }),
      h('details', { class: 'yc-foot-src' }, h('summary', { text: 'Fuentes de datos' }),
        h('p', { text: 'Spotify, YouTube, Apple Music, Shazam, Deezer, iTunes, kworb.net, Chartmetric y Social Blade. Cada cifra indica su fuente y su fecha.' })),
      h('div', { class: 'yc-foot-bottom' }, h('span', null, `© ${new Date().getFullYear()} `, ig(CREADOR), ' · Todos los derechos reservados'), h('span', null, 'Página creada por ', ig(CREADOR))));
    const logo = $('.yc-logo'); if (logo && DATA.artista.imagen && !logo.querySelector('img')) logo.replaceChildren(artistPhoto('yc-logo-in'));
    if (first) { go(current, false); setTimeout(liveBackground, 4000); setTimeout(celebrar, 1200); } else { $$('.yc-page').forEach(p => p.classList.toggle('on', p.dataset.page === current)); if (current === 'inicio') drawHist(); }
  }
  // ---------- auto-actualización: isla de estado estilo iOS ----------
  const AUTO = { timer: 0, runId: null, runStart: null, waiting: false, pending: null, lastRunsCheck: 0, lastDataCheck: 0, backoff: 0 };
  let island = null;
  function islandSet(state, title, sub, opts = {}) {
    if (!island) {
      island = h('div', { class: 'yc-island', role: 'status', 'aria-live': 'polite', onclick: () => island.onTap && island.onTap() },
        h('span', { class: 'yc-isl-ic' }), h('span', { class: 'yc-isl-tx' }, h('b'), h('small')));
      document.body.append(island);
    }
    clearTimeout(island.hideT);
    if (!state) { island.classList.remove('on'); return; }
    island.dataset.state = state;
    island.querySelector('b').textContent = title;
    island.querySelector('small').textContent = sub || '';
    island.onTap = opts.onTap || null;
    island.classList.toggle('tap', !!opts.onTap);
    requestAnimationFrame(() => island.classList.add('on'));
    if (opts.hide) island.hideT = setTimeout(() => island.classList.remove('on'), opts.hide);
  }
  const busyNow = () => sheetOpen || current === 'estudio' || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  function applyData(nd) {
    const y = scrollY;
    QUIET = true; DATA = nd; derive(); renderAll(false); QUIET = false;
    requestAnimationFrame(() => scrollTo(0, y));
    AUTO.pending = null;
    islandSet('done', 'Datos actualizados', 'hace un momento', { hide: 3500 });
  }
  async function checkData(fresh) {
    AUTO.lastDataCheck = Date.now();
    let nd;
    try { nd = await loadData(!!fresh); } catch (e) { try { nd = await loadData(false); } catch (e2) { return false; } }
    if (!nd || !DATA || nd.generado === DATA.generado || (nd.generado || '') < (DATA.generado || '')) return false;
    if (busyNow()) {
      AUTO.pending = nd;
      islandSet('new', 'Datos nuevos', 'Toca para verlos', { onTap: () => AUTO.pending && applyData(AUTO.pending) });
    } else applyData(nd);
    return true;
  }
  async function checkRuns() {
    if (!(GH.owner && GH.repo) || Date.now() < AUTO.backoff) return null;
    AUTO.lastRunsCheck = Date.now();
    const headers = { Accept: 'application/vnd.github+json' };
    if (GH.token) headers.Authorization = 'Bearer ' + GH.token;
    try {
      const r = await fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}/actions/runs?per_page=3&t=${Date.now()}`, { headers, cache: 'no-store' });
      if (r.status === 403 || r.status === 429) { AUTO.backoff = Date.now() + 15 * 60e3; return null; }
      if (!r.ok) return null;
      const j = await r.json();
      return (j.workflow_runs || []).find(x => x.status !== 'completed') || null;
    } catch (e) { return null; }
  }
  const minsAgo = (t) => { const m = Math.max(0, Math.round((Date.now() - new Date(t)) / 60000)); return m < 1 ? 'ahora mismo' : `hace ${m} min`; };
  async function autoTick() {
    clearTimeout(AUTO.timer);
    if (document.hidden || !DATA) { AUTO.timer = setTimeout(autoTick, 60e3); return; }
    const now = Date.now();
    let next = 90e3;
    if (now - AUTO.lastRunsCheck > 80e3 || AUTO.runId) {
      const run = await checkRuns();
      if (run) {
        AUTO.runId = run.id; AUTO.runStart = run.run_started_at || run.created_at;
        islandSet('run', 'Actualizando datos', `Pronto disponibles · ${minsAgo(AUTO.runStart)}`, { onTap: () => toast(run.status === 'queued' ? 'En cola en GitHub: empieza en unos segundos.' : 'Recogiendo Spotify, YouTube, listas y redes. La web se recarga sola al terminar.') });
        next = 30e3;
      } else if (AUTO.runId) {
        // terminó: espera a que los datos nuevos estén publicados
        AUTO.runId = null; AUTO.waiting = Date.now();
        islandSet('pub', 'Publicando datos', 'Ya casi');
      }
    }
    if (AUTO.waiting) {
      const got = await checkData(true);
      if (got || Date.now() - AUTO.waiting > 6 * 60e3) { AUTO.waiting = false; if (!got) islandSet(null); }
      else next = 15e3;
    } else if (now - AUTO.lastDataCheck > 2.5 * 60e3) {
      await checkData(false);
    }
    $('#updated-label') && DATA && DATA.generado && ($('#updated-label').textContent = `Datos ${ago(DATA.generado)} · ${new Date(DATA.generado).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · se actualiza cada 30 min`);
    AUTO.timer = setTimeout(autoTick, next);
  }
  function autoStart() {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { AUTO.lastDataCheck = 0; autoTick(); } });
    addEventListener('hashchange', () => { if (AUTO.pending && !busyNow()) applyData(AUTO.pending); });
    AUTO.timer = setTimeout(autoTick, 4000);
  }

  function themeBtn() {
    const modes = ['auto', 'light', 'dark'];
    let m = store.get('yc.theme', 'dark');
    const apply = () => { if (m === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', m); const b = $('#theme-btn'); b.replaceChildren(icon(m === 'auto' ? 'auto' : m === 'light' ? 'sun' : 'moon')); b.setAttribute('aria-label', 'Tema: ' + { auto: 'automático', light: 'claro', dark: 'oscuro' }[m]); };
    $('#theme-btn').addEventListener('click', () => { m = modes[(modes.indexOf(m) + 1) % 3]; store.set('yc.theme', m); apply(); toast('Tema ' + { auto: 'automático', light: 'claro', dark: 'oscuro' }[m]); });
    apply();
  }
  async function init() {
    if (document.startViewTransition && !REDUCED) document.documentElement.classList.add('vt');
    const sk = $('#p-inicio'); if (sk && !sk.children.length) { sk.classList.add('on'); sk.append(h('div', { class: 'yc-loading' }, h('i', { style: 'height:210px' }), h('i', { style: 'height:22px;width:40%;border-radius:8px' }), h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px' }, h('i', { style: 'height:120px' }), h('i', { style: 'height:120px' }), h('i', { style: 'height:120px' }), h('i', { style: 'height:120px' })))); }
    themeBtn(); buildTabs(); sheetDrag();
    $('#sheet-close').addEventListener('click', closeSheet); $('#sheet-bg').addEventListener('click', closeSheet);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetOpen) closeSheet(); });
    searchSetup();
    const nav = $('#nav'); addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true });
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawHist, 150); });
    try { DATA = await loadData(false); } catch (e) { $('#updated-label').textContent = 'No se pudieron cargar los datos'; return; }
    derive();
    setAmbient(PAL[DATA.artista.imagen] || null); palette(DATA.artista.imagen).then(c => { if (c) setAmbient(c); });
    { const t = $('.yc-nav-title-x'); if (t) t.textContent = SITE(); document.title = SITE(); }
    const hash = location.hash.slice(1);
    if (PAGES.some(p => p[0] === hash)) current = hash;
    renderAll(true);
    autoStart();
    if (hash.startsWith('cancion/')) openSong(hash.slice(8), false);
    else if (hash.startsWith('disco/')) openAlbum(decodeURIComponent(hash.slice(6)), false);
    addEventListener('hashchange', () => {
      const hs = location.hash.slice(1);
      if (PAGES.some(p => p[0] === hs) && hs !== current) go(hs, false);
      else if (hs.startsWith('cancion/')) openSong(hs.slice(8), false);
    });
  }
  init();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
    addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {}));
  }
})();
