/* Estudio v3 · editor de posts y carruseles para Instagram
   Fuentes ilimitadas (biblioteca, cualquier Google Font o la tuya), tipografía por elemento,
   color por palabra, efectos, carrusel de hasta 20 slides, deshacer/rehacer y edición tocando el texto. */
window.YCStudio = (() => {
  'use strict';
  const FORMATS = { post: [1080, 1350, 'Post 4:5'], cuadrado: [1080, 1080, 'Cuadrado'], historia: [1080, 1920, 'Historia'] };
  const TPL = { titular: 'Titular', charts: 'Charts', hito: 'Récord', top5: 'Top 5', datos: 'En números', meta: 'Próximo hito', portada: 'Estreno', versus: 'Versus', cita: 'Cita', noticia: 'Noticia' };
  const LOGOS = { cuernos: 'Cuernos', corona: 'Corona', estrella: 'Estrella', rayo: 'Rayo', nada: 'Sin icono', imagen: 'Tu logo' };
  const SWATCHES = ['#ffffff', '#ff2b3d', '#ff3b30', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#0a84ff', '#bf5af2', '#ff6ec7', '#c9a227', '#b4b4bc', '#111111'];
  const PARTS = { colTit: ['Titular', '#ffffff'], acento: ['Resaltado', '#ff2b3d'], colNum: ['Número', ''], colPeq: ['Textos pequeños', '#ffffff'], colMarca: ['Marca', '#ffffff'], neonColor: ['Neón', ''] };
  const PRESETS = [
    ['Noir', { colTit: '#ffffff', acento: '#ff2b3d', colNum: '', colPeq: '#ffffff', colMarca: '#ffffff', neon: false, fondo: 'foto' }],
    ['Sangre', { colTit: '#ffffff', acento: '#ff1a1a', colNum: '#ff1a1a', colPeq: '#ff1a1a', colMarca: '#ff1a1a', neon: true, neonColor: '#ff0022', neonFuerza: 60 }],
    ['Cromo', { colTit: '#e8e8ee', acento: '#b4b4bc', colNum: '#ffffff', colPeq: '#b4b4bc', colMarca: '#e8e8ee', neon: false }],
    ['Oro', { colTit: '#ffffff', acento: '#c9a227', colNum: '#ffd60a', colPeq: '#c9a227', colMarca: '#ffd60a', neon: false }],
    ['Neón azul', { colTit: '#ffffff', acento: '#64d2ff', colNum: '#ffffff', colPeq: '#64d2ff', colMarca: '#ffffff', neon: true, neonColor: '#0a84ff', neonFuerza: 70 }],
    ['Tóxico', { colTit: '#ffffff', acento: '#30d158', colNum: '#30d158', colPeq: '#ffffff', colMarca: '#30d158', neon: true, neonColor: '#30d158', neonFuerza: 50 }],
    ['Hielo', { colTit: '#eaf6ff', acento: '#9fdcff', colNum: '#ffffff', colPeq: '#cfeaff', colMarca: '#ffffff', neon: true, neonColor: '#64d2ff', neonFuerza: 35 }],
    ['Rosa', { colTit: '#ffffff', acento: '#ff6ec7', colNum: '#ff6ec7', colPeq: '#ffffff', colMarca: '#ff6ec7', neon: false }]
  ];

  // ---------- biblioteca de fuentes (Google Fonts) ----------
  // [familia, categoría, pesos, tiene cursiva, escala visual]
  const CATS = { todas: 'Todas', impacto: 'Impacto', gruesas: 'Gruesas', goticas: 'Góticas', serif: 'Elegantes', calle: 'Calle', script: 'Firma', tech: 'Tech', mias: 'Mis fuentes' };
  const LIB = [
    ['Anton', 'impacto', [400], 0, 1], ['Bebas Neue', 'impacto', [400], 0, 1.05], ['Oswald', 'impacto', [400, 500, 600, 700], 0, 0.95],
    ['League Gothic', 'impacto', [400], 0, 1.12], ['Big Shoulders Display', 'impacto', [400, 700, 800, 900], 0, 1], ['Teko', 'impacto', [400, 500, 600, 700], 0, 1.1],
    ['Barlow Condensed', 'impacto', [400, 600, 700, 800, 900], 1, 0.95], ['Fjalla One', 'impacto', [400], 0, 0.9], ['Antonio', 'impacto', [400, 700], 0, 1],
    ['Saira Extra Condensed', 'impacto', [400, 700, 800, 900], 0, 1.1], ['Six Caps', 'impacto', [400], 0, 1.35],
    ['Archivo Black', 'gruesas', [400], 0, 0.8], ['Montserrat', 'gruesas', [400, 600, 700, 800, 900], 1, 0.8], ['Poppins', 'gruesas', [400, 600, 700, 800, 900], 1, 0.8],
    ['Inter', 'gruesas', [400, 600, 700, 800, 900], 1, 0.85], ['Rubik', 'gruesas', [400, 600, 700, 800, 900], 1, 0.85], ['Unbounded', 'gruesas', [400, 700, 900], 0, 0.72],
    ['Syne', 'gruesas', [400, 700, 800], 0, 0.8], ['Lexend', 'gruesas', [400, 700, 900], 0, 0.82], ['Russo One', 'gruesas', [400], 0, 0.8],
    ['Bowlby One', 'gruesas', [400], 0, 0.75], ['Titan One', 'gruesas', [400], 0, 0.8], ['Dela Gothic One', 'gruesas', [400], 0, 0.72], ['Kanit', 'gruesas', [400, 700, 900], 1, 0.85],
    ['UnifrakturMaguntia', 'goticas', [400], 0, 0.95], ['UnifrakturCook', 'goticas', [700], 0, 0.95], ['Pirata One', 'goticas', [400], 0, 1],
    ['Grenze Gotisch', 'goticas', [400, 700, 900], 0, 0.95], ['New Rocker', 'goticas', [400], 0, 0.9], ['Metal Mania', 'goticas', [400], 0, 0.9],
    ['Germania One', 'goticas', [400], 0, 1], ['Jacquard 24', 'goticas', [400], 0, 0.9], ['Texturina', 'goticas', [400, 700, 900], 1, 0.85],
    ['Instrument Serif', 'serif', [400], 1, 1.15], ['Playfair Display', 'serif', [400, 700, 900], 1, 0.85], ['DM Serif Display', 'serif', [400], 1, 0.9],
    ['Bodoni Moda', 'serif', [400, 700, 900], 1, 0.85], ['Abril Fatface', 'serif', [400], 0, 0.85], ['Cormorant Garamond', 'serif', [500, 700], 1, 1.05],
    ['Prata', 'serif', [400], 0, 0.85], ['Source Serif 4', 'serif', [400, 700, 900], 1, 0.9], ['Cinzel', 'serif', [400, 700, 900], 0, 0.8],
    ['Permanent Marker', 'calle', [400], 0, 0.85], ['Rock Salt', 'calle', [400], 0, 0.62], ['Sedgwick Ave Display', 'calle', [400], 0, 0.95],
    ['Bangers', 'calle', [400], 0, 1], ['Bungee', 'calle', [400], 0, 0.75], ['Rubik Glitch', 'calle', [400], 0, 0.85], ['Rubik Spray Paint', 'calle', [400], 0, 0.85],
    ['Rubik Wet Paint', 'calle', [400], 0, 0.85], ['Monoton', 'calle', [400], 0, 0.7], ['Black Ops One', 'calle', [400], 0, 0.8], ['Righteous', 'calle', [400], 0, 0.85],
    ['Pacifico', 'script', [400], 0, 0.85], ['Yellowtail', 'script', [400], 0, 1], ['Lobster', 'script', [400], 0, 0.9], ['Kaushan Script', 'script', [400], 0, 0.9],
    ['Great Vibes', 'script', [400], 0, 1.1], ['Satisfy', 'script', [400], 0, 1], ['Mrs Saint Delafield', 'script', [400], 0, 1.25],
    ['Orbitron', 'tech', [400, 700, 900], 0, 0.7], ['Audiowide', 'tech', [400], 0, 0.75], ['Michroma', 'tech', [400], 0, 0.65], ['Space Mono', 'tech', [400, 700], 1, 0.75],
    ['JetBrains Mono', 'tech', [400, 700, 800], 1, 0.75], ['Space Grotesk', 'tech', [400, 700], 0, 0.85], ['Major Mono Display', 'tech', [400], 0, 0.7]
  ];
  const LIBMAP = new Map(LIB.map(r => [r[0], { f: r[0], cat: r[1], w: r[2], it: !!r[3], k: r[4] }]));
  const WNAMES = { 100: 'Fina', 200: 'Extrafina', 300: 'Ligera', 400: 'Normal', 500: 'Media', 600: 'Semi', 700: 'Bold', 800: 'Extra', 900: 'Black' };
  // combinaciones listas
  const COMBOS = [
    ['Charts clásico', { tit: { f: 'Anton', w: 400 }, num: { f: 'Anton', w: 400 }, peq: { f: 'Inter', w: 800, ls: 4 }, marca: { f: 'Inter', w: 800, i: 1 } }],
    ['Bold total', { tit: { f: 'Archivo Black', w: 400, ls: -2 }, num: { f: 'Archivo Black', w: 400 }, peq: { f: 'Inter', w: 900, ls: 2 }, marca: { f: 'Inter', w: 900, i: 1 } }],
    ['Gótico RHLM', { tit: { f: 'UnifrakturMaguntia', w: 400 }, num: { f: 'Anton', w: 400 }, peq: { f: 'Inter', w: 800, ls: 6 }, marca: { f: 'Pirata One', w: 400 } }],
    ['Revista', { tit: { f: 'Playfair Display', w: 900, i: 1, ls: -2 }, num: { f: 'Playfair Display', w: 900 }, peq: { f: 'Inter', w: 700, ls: 8 }, marca: { f: 'Instrument Serif', w: 400, i: 1 } }],
    ['Calle', { tit: { f: 'Permanent Marker', w: 400 }, num: { f: 'Bebas Neue', w: 400 }, peq: { f: 'Bebas Neue', w: 400, ls: 6 }, marca: { f: 'Permanent Marker', w: 400 } }],
    ['Lujo', { tit: { f: 'Bodoni Moda', w: 900, ls: -1 }, num: { f: 'Bodoni Moda', w: 700 }, peq: { f: 'Montserrat', w: 600, ls: 12 }, marca: { f: 'Cinzel', w: 700 } }],
    ['Wrapped', { tit: { f: 'Unbounded', w: 900, ls: -3 }, num: { f: 'Unbounded', w: 900 }, peq: { f: 'Unbounded', w: 700, ls: 2 }, marca: { f: 'Unbounded', w: 900 } }],
    ['Futuro', { tit: { f: 'Orbitron', w: 900, ls: 2 }, num: { f: 'Orbitron', w: 900 }, peq: { f: 'Space Mono', w: 700, ls: 4 }, marca: { f: 'Audiowide', w: 400 } }],
    ['Condensada', { tit: { f: 'Big Shoulders Display', w: 900 }, num: { f: 'Big Shoulders Display', w: 900 }, peq: { f: 'Barlow Condensed', w: 700, ls: 6 }, marca: { f: 'Barlow Condensed', w: 800, i: 1 } }]
  ];
  const ELS = { tit: 'Titular', num: 'Números', peq: 'Textos pequeños', marca: 'Marca', cuerpo: 'Noticia' };
  const TYPO_DEF = {
    tit: { f: 'Anton', w: 400, i: 0, ls: 0, lh: 100, sz: 100 },
    num: { f: 'Anton', w: 400, i: 0, ls: 0, lh: 100, sz: 100 },
    peq: { f: 'Inter', w: 800, i: 0, ls: 4, lh: 100, sz: 100 },
    marca: { f: 'Inter', w: 800, i: 1, ls: 0, lh: 100, sz: 100 },
    cuerpo: { f: 'Source Serif 4', w: 400, i: 0, ls: 0, lh: 150, sz: 100 }
  };
  const EFFECTS = { nada: 'Relleno', contorno: 'Contorno', sombra: 'Sombra', degradado: 'Degradado', cromo: 'Cromo', d3: '3D' };

  const DEF = {
    plantilla: 'titular', formato: 'post', marca: 'lvcifercharts', logo: 'cuernos', logoImg: '', marcaPos: 'izq',
    etiqueta: 'DALE SWIPE', titular: 'ANUEL AA LA ROMPE EN *SPOTIFY*', sub: '¿QUÉ OPINAN?', efectoTit: 'nada', efectoNum: 'nada', wordColors: {},
    cuerpo: 'Escribe aquí el texto de la noticia. Usa cifras reales con su fuente.',
    numero: '#1', numeroTxt: 'TOP 50 · PUERTO RICO', acento: '#ff2b3d', zoom: 1, px: 0, py: 0, progreso: 75,
    listaTitulo: 'LO MÁS ESCUCHADO HOY', lista: 'Canción 1 | cifra\nCanción 2 | cifra\nCanción 3 | cifra\nCanción 4 | cifra\nCanción 5 | cifra',
    datos: 'Oyentes | cifra\nStreams hoy | cifra\nVistas YouTube | cifra\nPaíses en listas | cifra',
    vsA: 'SPOTIFY', vsANum: 'CIFRA', vsB: 'YOUTUBE', vsBNum: 'CIFRA',
    cita: 'Real hasta la muerte.', autor: '@anuel',
    fondo: 'foto', fondo1: '#0b0b0f', fondo2: '#5a0a14',
    brillo: 100, contraste: 108, saturacion: 100, calidez: 0, vineta: 45, grano: 10, sombra: 80, puntos: true, firma: true, mayus: true, calidad: 2, guias: false,
    colTit: '#ffffff', colNum: '', colPeq: '#ffffff', colMarca: '#ffffff', parte: 'colTit',
    neon: false, neonColor: '', neonFuerza: 55, neonTit: false, neonNum: true, neonPeq: false, neonMarca: false,
    typo: null, elT: 'tit', imgUrl: ''
  };
  // lo que cambia en cada slide del carrusel; el resto (estilo, marca, fuentes) es común a todas
  const SLIDE_KEYS = ['plantilla', 'etiqueta', 'titular', 'sub', 'cuerpo', 'numero', 'numeroTxt', 'progreso', 'listaTitulo', 'lista', 'datos', 'vsA', 'vsANum', 'vsB', 'vsBNum', 'cita', 'autor', 'wordColors',
    'zoom', 'px', 'py', 'brillo', 'contraste', 'saturacion', 'calidez', 'imgUrl'];
  const STYLE_KEYS = ['marca', 'logo', 'logoImg', 'marcaPos', 'typo', 'efectoTit', 'efectoNum', 'acento', 'colTit', 'colNum', 'colPeq', 'colMarca', 'neon', 'neonColor', 'neonFuerza', 'neonTit', 'neonNum', 'neonPeq', 'neonMarca',
    'fondo', 'fondo1', 'fondo2', 'vineta', 'grano', 'sombra', 'puntos', 'firma', 'mayus'];
  const MAX_SLIDES = 20;

  let PXK = 1;
  let S = null, api = null, root = null, cv = null, cx = null;
  let slides = [], cur = 0;
  const IMGS = new Map(); // id de slide -> { src, graded, tainted }
  let gradeTimer = 0, rafId = 0, logoImgEl = null, noiseTile = null, selWords = new Set(), sec = 'plantilla';
  let HITS = [], CURSLIDE = { i: 0, n: 1 };

  // ---------- utilidades ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const pick = (o, keys) => { const r = {}; keys.forEach(k => { if (k in o) r[k] = clone(o[k]); }); return r; };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } } };
  const dims = () => FORMATS[S.formato] || FORMATS.post;
  const toast = (t) => api && api.toast && api.toast(t);

  // IndexedDB: fotos de cada slide y fuentes subidas (no caben en localStorage)
  const idb = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      try {
        const r = indexedDB.open('aa-studio', 1);
        r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('fonts')) db.createObjectStore('fonts'); if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos'); };
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    }));
    const run = (st, mode, fn) => open().then(db => new Promise((res, rej) => {
      const t = db.transaction(st, mode), req = fn(t.objectStore(st));
      t.oncomplete = () => res(req ? req.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    }));
    return {
      get: (st, k) => run(st, 'readonly', s => s.get(k)).catch(() => null),
      set: (st, k, v) => run(st, 'readwrite', s => s.put(v, k)).catch(() => null),
      del: (st, k) => run(st, 'readwrite', s => s.delete(k)).catch(() => null),
      entries: (st) => open().then(db => new Promise((res) => {
        const out = []; const t = db.transaction(st, 'readonly'); const c = t.objectStore(st).openCursor();
        c.onsuccess = () => { const cu = c.result; if (cu) { out.push([cu.key, cu.value]); cu.continue(); } else res(out); }; c.onerror = () => res(out);
      })).catch(() => [])
    };
  })();

  // ---------- carga de fuentes ----------
  const FAM_INFO = new Map(); // familia -> { w:[pesos], it:bool, k, cat }
  const CSS_DONE = new Map(); // familia -> Promise<bool>
  const UPLOADED = new Set();
  const info = (f) => FAM_INFO.get(f) || LIBMAP.get(f) || { f, cat: 'mias', w: [400, 700, 900], it: true, k: 0.9 };
  const gUrl = (fam, spec) => 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(fam).replace(/%20/g, '+') + (spec ? ':' + spec : '') + '&display=swap';
  function specsFor(fam) {
    const L = LIBMAP.get(fam), out = [];
    if (L) {
      const ws = L.w;
      if (L.it) out.push('ital,wght@' + [...ws.map(w => '0,' + w), ...ws.map(w => '1,' + w)].join(';'));
      if (ws.length > 1 || ws[0] !== 400) out.push('wght@' + ws.join(';'));
    } else {
      out.push('ital,wght@0,400;0,700;0,900;1,400;1,700;1,900', 'wght@400;700;900', 'wght@400;700');
    }
    out.push('');
    return out;
  }
  // descarga el CSS de Google Fonts (los archivos de letra solo se bajan cuando se usan)
  function ensureCss(fam) {
    if (!fam || UPLOADED.has(fam) || fam === 'system-ui') return Promise.resolve(true);
    if (CSS_DONE.has(fam)) return CSS_DONE.get(fam);
    const p = (async () => {
      for (const spec of specsFor(fam)) {
        try {
          const r = await fetch(gUrl(fam, spec));
          if (!r.ok) continue;
          const css = await r.text();
          if (!/@font-face/.test(css)) continue;
          const ws = [...new Set([...css.matchAll(/font-weight:\s*(\d+)(?:\s+(\d+))?/g)].flatMap(m => {
            const a = +m[1], b = m[2] ? +m[2] : a; return [100, 200, 300, 400, 500, 600, 700, 800, 900].filter(w => w >= a && w <= b);
          }))].sort((a, b) => a - b);
          const L = LIBMAP.get(fam);
          FAM_INFO.set(fam, { f: fam, cat: L ? L.cat : 'mias', w: ws.length ? ws : [400], it: /font-style:\s*italic/.test(css), k: L ? L.k : 0.9 });
          document.head.append(h('style', { 'data-font': fam, text: css }));
          return true;
        } catch (e) { /* sin conexión o bloqueado: siguiente intento */ }
      }
      return false;
    })();
    CSS_DONE.set(fam, p);
    p.then(ok => { if (!ok) CSS_DONE.delete(fam); });
    return p;
  }
  function nearestW(fam, w) { const ws = info(fam).w; return ws.reduce((a, b) => Math.abs(b - w) < Math.abs(a - w) ? b : a, ws[0] || 400); }
  const typo = (el) => Object.assign({}, TYPO_DEF[el], (S.typo || {})[el] || {});
  const kOf = (el) => (info(typo(el).f).k || 0.9) * typo(el).sz / 100;
  const FALLBACK = { tit: 'Impact, sans-serif', num: 'Impact, sans-serif', peq: 'system-ui, sans-serif', marca: 'system-ui, sans-serif', cuerpo: 'Georgia, serif' };
  function fontOf(el, size, over) {
    const t = Object.assign(typo(el), over || {});
    return `${t.i ? 'italic ' : ''}${nearestW(t.f, t.w)} ${Math.max(1, size).toFixed(1)}px "${t.f}", ${FALLBACK[el] || 'sans-serif'}`;
  }
  // espera a que estén listas las letras que usa el diseño (para medir y exportar bien)
  async function fontsReady() {
    if (!document.fonts) return;
    const els = Object.keys(TYPO_DEF);
    await Promise.all(els.map(e => ensureCss(typo(e).f)));
    await Promise.all(els.map(e => document.fonts.load(fontOf(e, 80)).catch(() => null)));
  }
  function loadUsedFonts() { fontsReady().then(() => { measureCache.clear(); schedule(); drawThumbs(); }); }

  // fuentes subidas por ti (.ttf / .otf / .woff / .woff2), guardadas en este navegador
  async function addFontFile(file) {
    if (!file) return null;
    if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) { toast('Elige un archivo de letra: .ttf, .otf, .woff o .woff2'); return null; }
    if (file.size > 8 * 1048576) { toast('Esa fuente pesa demasiado (máx. 8 MB)'); return null; }
    const buf = await file.arrayBuffer();
    const fam = 'Mi ' + file.name.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/[-_]+/g, ' ').trim().slice(0, 28);
    try {
      const ff = new FontFace(fam, buf); await ff.load(); document.fonts.add(ff);
    } catch (e) { toast('No se pudo leer esa fuente.'); return null; }
    UPLOADED.add(fam); FAM_INFO.set(fam, { f: fam, cat: 'mias', w: [400], it: false, k: 0.9, up: true });
    await idb.set('fonts', fam, buf);
    return fam;
  }
  async function restoreUploaded() {
    for (const [fam, buf] of await idb.entries('fonts')) {
      try { const ff = new FontFace(fam, buf); await ff.load(); document.fonts.add(ff); UPLOADED.add(fam); FAM_INFO.set(fam, { f: fam, cat: 'mias', w: [400], it: false, k: 0.9, up: true }); } catch (e) { /* archivo dañado */ }
    }
  }
  const myGoogle = () => LS.get('aa.studio.gfonts', []);
  const recentFonts = () => LS.get('aa.studio.recent', []);
  function pushRecent(f) { LS.set('aa.studio.recent', [f, ...recentFonts().filter(x => x !== f)].slice(0, 8)); }

  // ---------- zip mínimo (para descargar el carrusel entero en PC) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function makeZip(files) {
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    const d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff, dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(8, 0, true); lh.setUint16(10, dt, true); lh.setUint16(12, dd, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, name.length, true);
      parts.push(new Uint8Array(lh.buffer), name, f.data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(12, dt, true); ch.setUint16(14, dd, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), name);
      off += 30 + name.length + sz;
    }
    const csz = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csz, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  // ---------- fotos (una por slide) ----------
  const slideId = () => slides[cur] && slides[cur].id;
  const imgOf = (id) => IMGS.get(id || slideId()) || null;
  function setImage(im, external, id) {
    id = id || slideId();
    IMGS.set(id, { src: im, cache: {}, tainted: false });
    if (id === slideId()) { regrade(true); syncPhoto(); if (external) setTimeout(() => { const e = imgOf(id); if (e && e.tainted) toast('Esa foto no deja exportarse desde la web: guárdala y súbela con «Foto».'); }, 500); }
    else drawThumbs();
  }
  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast('Elige una imagen (JPG o PNG).'); return; }
    const id = slideId(), im = new Image();
    im.onload = () => { S.zoom = 1; S.px = 0; S.py = 0; S.imgUrl = 'local'; setImage(im, false, id); syncInputs(); commit(); };
    im.onerror = () => toast('No se pudo abrir esa imagen.');
    im.src = URL.createObjectURL(file);
    idb.set('photos', id, file);
  }
  function loadUrl(url, id, keepFrame) {
    if (!url) return;
    id = id || slideId();
    const im = new Image(); im.crossOrigin = 'anonymous';
    let tries = [url.replace('/mqdefault.jpg', '/maxresdefault.jpg').replace('ab67616d00001e02', 'ab67616d0000b273').replace('ab6761610000f178', 'ab6761610000e5eb'), url.replace('/maxresdefault.jpg', '/hqdefault.jpg'), url];
    tries = tries.filter((u, i) => tries.indexOf(u) === i);
    im.onload = () => {
      if (id === slideId() && !keepFrame) { S.zoom = 1; S.px = 0; S.py = 0; }
      if (id === slideId()) S.imgUrl = url; else { const sl = slides.find(s => s.id === id); if (sl) sl.imgUrl = url; }
      setImage(im, true, id); syncInputs(); persist();
    };
    im.onerror = () => { if (tries.length) im.src = tries.shift(); else if (id === slideId()) toast('No se pudo cargar esa foto. Súbela desde tu dispositivo.'); };
    im.src = tries.shift();
  }
  async function restorePhoto(sl) {
    if (!sl.imgUrl || IMGS.has(sl.id)) return;
    if (sl.imgUrl === 'local') {
      const blob = await idb.get('photos', sl.id);
      if (!blob) return;
      const im = new Image(); im.onload = () => setImage(im, false, sl.id); im.src = URL.createObjectURL(blob);
    } else loadUrl(sl.imgUrl, sl.id, true);
  }
  function removePhoto() { const id = slideId(); IMGS.delete(id); S.imgUrl = ''; commit(); schedule(); drawThumbs(); syncPhoto(); }
  function loadLogo(file) {
    if (!file || !/^image\//.test(file.type)) return;
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 256 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      S.logoImg = c.toDataURL('image/png'); S.logo = 'imagen'; logoImgEl = null; syncInputs(); commit(); schedule();
    };
    im.src = URL.createObjectURL(file);
  }
  function getLogoImg() {
    if (!S.logoImg) return null;
    if (!logoImgEl) { logoImgEl = new Image(); logoImgEl.onload = () => { schedule(); drawThumbs(); }; logoImgEl.src = S.logoImg; }
    return logoImgEl.complete && logoImgEl.naturalWidth ? logoImgEl : null;
  }
  function grade(entry, maxDim) {
    if (!entry || !entry.src) return null;
    const src = entry.src, iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height;
    const k = Math.min(1, maxDim / Math.max(iw, ih));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(iw * k)); c.height = Math.max(1, Math.round(ih * k));
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
    const b = S.brillo / 100, ct = S.contraste / 100, sa = S.saturacion / 100, w = S.calidez * 0.6;
    if (b === 1 && ct === 1 && sa === 1 && w === 0) return c;
    let d; try { d = g.getImageData(0, 0, c.width, c.height); } catch (e) { entry.tainted = true; return c; }
    const a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      let r = a[i] * b, gg = a[i + 1] * b, bb = a[i + 2] * b;
      r = (r - 128) * ct + 128; gg = (gg - 128) * ct + 128; bb = (bb - 128) * ct + 128;
      const l = 0.2126 * r + 0.7152 * gg + 0.0722 * bb;
      r = l + (r - l) * sa; gg = l + (gg - l) * sa; bb = l + (bb - l) * sa; r += w; bb -= w;
      a[i] = r < 0 ? 0 : r > 255 ? 255 : r; a[i + 1] = gg < 0 ? 0 : gg > 255 ? 255 : gg; a[i + 2] = bb < 0 ? 0 : bb > 255 ? 255 : bb;
    }
    g.putImageData(d, 0, 0); return c;
  }
  function regrade(now) {
    clearTimeout(gradeTimer);
    const run = () => { gradedFor(); schedule(); drawThumbs(); };
    if (now) run(); else gradeTimer = setTimeout(run, 90);
  }
  const gradeKey = () => [S.brillo, S.contraste, S.saturacion, S.calidez].join('|');
  // la foto ya retocada se guarda por ajustes y tamaño (no se recalcula en cada fotograma)
  function gradedFor(id, maxDim) {
    const e = imgOf(id); if (!e) return null;
    const k = gradeKey() + '|' + (maxDim || 1600);
    e.cache = e.cache || {};
    if (!e.cache[k]) { const keys = Object.keys(e.cache); if (keys.length > 4) delete e.cache[keys[0]]; e.cache[k] = grade(e, maxDim || 1600); }
    return e.cache[k];
  }
  function noise() {
    if (noiseTile) return noiseTile;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), d = g.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); noiseTile = c; return c;
  }

  // ---------- fondo ----------
  function cover(g, img, x, y, w, hh, z, px, py) {
    const s = Math.max(w / img.width, hh / img.height) * (z || 1);
    g.drawImage(img, x + (w - img.width * s) / 2 + (px || 0) * w, y + (hh - img.height * s) / 2 + (py || 0) * hh, img.width * s, img.height * s);
  }
  function drawBg(g, W, H, img, forceBlur) {
    const mode = S.fondo;
    if (mode === 'liso' || mode === 'degradado' || !img) {
      if (mode === 'liso') { g.fillStyle = S.fondo1; g.fillRect(0, 0, W, H); }
      else { const gr = g.createLinearGradient(0, 0, W * 0.6, H); gr.addColorStop(0, S.fondo1); gr.addColorStop(1, S.fondo2); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
      return;
    }
    g.save();
    if (mode === 'desenfoque' || forceBlur) g.filter = `blur(${Math.round(W * 0.03)}px)`;
    g.imageSmoothingQuality = 'high'; cover(g, img, 0, 0, W, H, S.zoom, S.px, S.py); g.restore();
  }
  function finish(g, W, H) {
    if (S.vineta > 0) {
      const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${S.vineta / 100 * 0.85})`); g.fillStyle = v; g.fillRect(0, 0, W, H);
    }
    if (S.grano > 0) { g.save(); g.globalAlpha = S.grano / 100 * 0.5; g.globalCompositeOperation = 'overlay'; g.fillStyle = g.createPattern(noise(), 'repeat'); g.fillRect(0, 0, W, H); g.restore(); }
  }
  function shade(g, W, H, from, k = 1) {
    const gr = g.createLinearGradient(0, H * from, 0, H);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.45, `rgba(0,0,0,${S.sombra / 100 * 0.55 * k})`); gr.addColorStop(1, `rgba(0,0,0,${Math.min(1, S.sombra / 100 * 0.95 * k)})`);
    g.fillStyle = gr; g.fillRect(0, H * from, W, H * (1 - from));
  }
  const veil = (g, W, H, a) => { g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(0, 0, W, H); };

  // ---------- motor de texto (cualquier fuente, espaciado, efectos) ----------
  let EXPORTING = false;
  const measureCache = new Map();
  const HAS_LS = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;
  const up = (t) => (S.mayus ? String(t == null ? '' : t).toUpperCase() : String(t == null ? '' : t));
  const clean = (w) => w.replace(/\*/g, '');
  const lsOf = (el, size) => size * (typo(el).ls || 0) / 100;
  function tw(g, t, ls) {
    if (!ls) return g.measureText(t).width;
    if (HAS_LS) { g.letterSpacing = ls + 'px'; const w = g.measureText(t).width - ls; g.letterSpacing = '0px'; return w; }
    return g.measureText(t).width + ls * Math.max(0, [...t].length - 1);
  }
  function rawText(g, t, x, y, ls, stroke) {
    if (!ls) { stroke ? g.strokeText(t, x, y) : g.fillText(t, x, y); return; }
    if (HAS_LS) { g.letterSpacing = ls + 'px'; stroke ? g.strokeText(t, x, y) : g.fillText(t, x, y); g.letterSpacing = '0px'; return; }
    let xx = x; for (const ch of t) { stroke ? g.strokeText(ch, xx, y) : g.fillText(ch, xx, y); xx += g.measureText(ch).width + ls; }
  }
  // altura de mayúscula real de cada fuente (para colocar bien cualquier letra)
  function capA(g, font) {
    const key = 'cap|' + font;
    if (measureCache.has(key)) return measureCache.get(key);
    g.save(); g.font = font; const m = g.measureText('HÁMB'); g.restore();
    const size = parseFloat(font.match(/([\d.]+)px/)[1]);
    let a = m.actualBoundingBoxAscent; if (!(a > 0)) a = size * 0.8;
    a = Math.min(a, size * 1.1);
    measureCache.set(key, a); return a;
  }
  const col = (k, auto) => S[k] || auto || '#ffffff';
  const NEON_OF = { tit: 'neonTit', num: 'neonNum', peq: 'neonPeq', marca: 'neonMarca' };
  const neonOn = (el) => S.neon && el && S[NEON_OF[el]];
  function glow(g, el, size, fallbackColor, draw) {
    if (!neonOn(el)) { draw(); return; }
    const c = S.neonColor || fallbackColor || S.acento, f = S.neonFuerza / 100;
    g.save(); g.shadowColor = c; g.shadowOffsetX = g.shadowOffsetY = 0;
    g.shadowBlur = size * (0.25 + 0.75 * f) * PXK; draw();
    g.shadowBlur = size * (0.08 + 0.22 * f) * PXK; draw();
    if (f > 0.6) { g.shadowBlur = size * 0.6 * f * PXK; draw(); }
    g.restore(); draw();
  }
  function shadeHex(hex, k) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 'rgba(0,0,0,.6)';
    const n = parseInt(m[1], 16), r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    return `rgb(${Math.round(r * k)},${Math.round(gg * k)},${Math.round(b * k)})`;
  }
  // pinta un trozo de texto con el efecto elegido (x = borde izquierdo, y = línea base)
  function paintText(g, t, x, y, size, color, el, ls, effect) {
    const m = g.measureText(t), top = y - (m.actualBoundingBoxAscent || size * 0.8), bot = y + (m.actualBoundingBoxDescent || size * 0.1);
    const base = () => {
      if (effect === 'contorno') { g.lineWidth = Math.max(2, size * 0.035); g.strokeStyle = color; g.lineJoin = 'round'; rawText(g, t, x, y, ls, true); return; }
      if (effect === 'degradado') { const gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, color); gr.addColorStop(1, S.acento); g.fillStyle = gr; }
      else if (effect === 'cromo') { const gr = g.createLinearGradient(0, top, 0, bot); [['#ffffff', 0], ['#d9d9e0', 0.32], ['#6e6e78', 0.5], ['#f4f4f8', 0.62], ['#9a9aa4', 0.85], ['#ffffff', 1]].forEach(([c, s]) => gr.addColorStop(s, c)); g.fillStyle = gr; }
      else g.fillStyle = color;
      rawText(g, t, x, y, ls, false);
    };
    if (effect === 'sombra' && !neonOn(el)) { g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = size * 0.18 * PXK; g.shadowOffsetY = size * 0.06 * PXK; base(); g.restore(); return; }
    if (effect === 'd3') {
      const depth = Math.max(3, Math.round(size * 0.06)), dark = shadeHex(S.acento, 0.55);
      g.save(); g.fillStyle = dark; for (let i = depth; i > 0; i--) rawText(g, t, x + i * 0.7, y + i, ls, false); g.restore();
      glow(g, el, size, color, base); return;
    }
    if (effect === 'cromo') { g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = size * 0.08 * PXK; g.shadowOffsetY = size * 0.03 * PXK; base(); g.restore(); if (neonOn(el)) glow(g, el, size, color, base); return; }
    glow(g, el, size, color, base);
  }
  function hit(key, x, y, w, hh, el) { if (!EXPORTING && key) HITS.push({ key, x, y, w, h: hh, el }); }

  function layout(g, text, font, size, maxW, ls) {
    g.font = font;
    const words = String(text || '').split(/\s+/).filter(Boolean), lines = []; let line = [];
    for (const w of words) {
      const test = [...line, w].map(clean).join(' ');
      if (tw(g, test, ls) > maxW && line.length) { lines.push(line); line = [w]; } else line.push(w);
    }
    if (line.length) lines.push(line);
    return lines;
  }
  // texto grande con salto de línea automático: busca el tamaño que cabe
  function fitText(g, el, text, maxSize, minSize, maxW, maxLines) {
    const k = kOf(el); let size = maxSize * k, lines = [], font;
    const min = minSize * k;
    for (; size >= min; size -= Math.max(1, size * 0.03)) {
      font = fontOf(el, size); const ls = lsOf(el, size);
      lines = layout(g, text, font, size, maxW, ls);
      g.font = font;
      if (lines.length <= maxLines && lines.every(l => tw(g, l.map(clean).join(' '), ls) <= maxW)) break;
    }
    size = Math.max(size, min); font = fontOf(el, size);
    const cat = info(typo(el).f).cat, lhBase = cat === 'script' ? 1.18 : cat === 'serif' ? 1.02 : cat === 'goticas' ? 1.08 : 1.04;
    const lineH = size * lhBase * (typo(el).lh || 100) / 100, ca = capA(g, font);
    return { el, lines, size, font, lineH, cap: ca, h: ca + (lines.length - 1) * lineH + size * 0.16, ls: lsOf(el, size) };
  }
  // dibuja varias líneas; cada palabra puede tener su color y *asteriscos* = resaltado
  function drawBlock(g, r, x, yTop, color, align, colorMap, key, effect) {
    g.font = r.font; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const space = tw(g, ' ', r.ls) + r.ls * 2;
    let hot = false, wi = 0, minX = Infinity, maxX = -Infinity;
    r.lines.forEach((words, i) => {
      const y = yTop + r.cap + i * r.lineH;
      const pieces = words.map(w => { const st = w.startsWith('*'), en = w.endsWith('*'); if (st) hot = true; const p = { t: clean(w), hot, wi: wi++ }; if (en) hot = false; return p; });
      const widths = pieces.map(p => tw(g, p.t, r.ls));
      const total = widths.reduce((a, b) => a + b, 0) + space * (pieces.length - 1);
      let xx = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
      minX = Math.min(minX, xx); maxX = Math.max(maxX, xx + total);
      pieces.forEach((p, j) => {
        const c = (colorMap && colorMap[p.wi]) || (p.hot ? S.acento : color);
        paintText(g, p.t, xx, y, r.size, c, r.el, r.ls, effect);
        xx += widths[j] + space;
      });
    });
    if (r.lines.length) hit(key, minX, yTop, maxX - minX, r.h, r.el);
    return yTop + r.h;
  }
  const headline = (g, text, maxSize, minSize, maxW, maxLines) => fitText(g, 'tit', up(text), maxSize, minSize, maxW, maxLines);
  const drawHead = (g, r, x, y, align, key) => drawBlock(g, r, x, y, col('colTit'), align || 'center', S.wordColors, key || 'titular', S.efectoTit);
  // una sola línea con la fuente de un elemento; se encoge si no cabe en maxW
  function line(g, el, text, x, y, size, color, align, base, key, maxW, effect) {
    if (!text) return 0;
    let s = size * kOf(el), font = fontOf(el, s); g.font = font; let ls = lsOf(el, s), w = tw(g, text, ls);
    if (maxW && w > maxW) { s *= maxW / w; font = fontOf(el, s); g.font = font; ls = lsOf(el, s); w = tw(g, text, ls); }
    const ca = capA(g, font);
    const yb = base === 'top' ? y + ca : base === 'middle' ? y + ca / 2 : y;
    const x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    g.save(); g.font = font; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    paintText(g, text, x0, yb, s, color, el, ls, effect || 'nada');
    g.restore();
    hit(key, x0, yb - ca, w, ca * 1.25, el);
    return ca;
  }
  const small = (g, text, x, y, size, color, align, base, key, maxW) => line(g, 'peq', text, x, y, size, color || col('colPeq'), align || 'center', base, key, maxW);
  const bigNum = (g, text, x, y, size, color, align, key, maxW) => line(g, 'num', text, x, y, size, color, align || 'center', 'top', key || 'numero', maxW, S.efectoNum);
  function tagBox(g, text, cxp, y, size, filled, key) {
    if (!text) return y;
    const s = size * kOf('peq'), font = fontOf('peq', s), ls = lsOf('peq', s);
    g.save(); g.font = font;
    const t = up(text), w = tw(g, t, ls), padX = s * 0.7, bh = s * 1.7, x = cxp - w / 2 - padX, r = bh / 2, ca = capA(g, font);
    const tc = filled ? (S.colPeq && S.colPeq.toLowerCase() !== S.acento.toLowerCase() ? S.colPeq : '#ffffff') : col('colPeq');
    const path = () => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w + padX * 2, bh, r) : g.rect(x, y, w + padX * 2, bh); };
    if (filled) { g.fillStyle = S.acento; glow(g, 'peq', s * 1.4, S.acento, () => { path(); g.fill(); }); }
    else { g.fillStyle = 'rgba(0,0,0,.35)'; path(); g.fill(); g.strokeStyle = tc; g.lineWidth = s * 0.1; glow(g, 'peq', s * 1.4, tc, () => { path(); g.stroke(); }); }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = tc; rawText(g, t, cxp - w / 2, y + bh / 2 + ca / 2, ls, false);
    g.restore();
    hit(key || 'etiqueta', x, y, w + padX * 2, bh, 'peq');
    return y + bh;
  }

  // ---------- marca (nombre + icono) ----------
  function icon(g, kind, cx0, base, s, color) {
    g.fillStyle = color; g.strokeStyle = color;
    if (kind === 'cuernos') {
      const one = (dir) => {
        const bx = cx0 + dir * s * 0.32, bw = s * 0.36, ix = bx - dir * bw / 2, ox = bx + dir * bw / 2, tx = bx + dir * s * 0.16, ty = base - s * 1.02;
        g.beginPath(); g.moveTo(ox, base);
        g.bezierCurveTo(ox + dir * s * 0.42, base - s * 0.3, tx + dir * s * 0.4, ty + s * 0.2, tx, ty);
        g.bezierCurveTo(tx + dir * s * 0.12, ty + s * 0.4, ix + dir * s * 0.1, base - s * 0.25, ix, base);
        g.quadraticCurveTo(bx, base + s * 0.08, ox, base); g.closePath(); g.fill();
      };
      one(-1); one(1);
    } else if (kind === 'corona') {
      const w = s * 1.1, y = base;
      g.beginPath(); g.moveTo(cx0 - w / 2, y); g.lineTo(cx0 - w / 2, y - s * 0.7); g.lineTo(cx0 - w / 4, y - s * 0.32); g.lineTo(cx0, y - s * 0.9); g.lineTo(cx0 + w / 4, y - s * 0.32); g.lineTo(cx0 + w / 2, y - s * 0.7); g.lineTo(cx0 + w / 2, y); g.closePath(); g.fill();
    } else if (kind === 'estrella') {
      const R = s * 0.55, r = R * 0.45, cy = base - R;
      g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; g.lineTo(cx0 + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill();
    } else if (kind === 'rayo') {
      const y = base, k = s;
      g.beginPath(); g.moveTo(cx0 + k * 0.15, y - k * 1.05); g.lineTo(cx0 - k * 0.35, y - k * 0.35); g.lineTo(cx0 - k * 0.02, y - k * 0.35); g.lineTo(cx0 - k * 0.18, y + k * 0.1); g.lineTo(cx0 + k * 0.35, y - k * 0.6); g.lineTo(cx0 + k * 0.02, y - k * 0.6); g.closePath(); g.fill();
    }
  }
  function brand(g, W, y, size, color, pos) {
    const name = String(S.marca || '').replace(/^@/, '');
    const c = color || col('colMarca'); pos = pos || S.marcaPos;
    const s = size * kOf('marca') * 1.1, font = fontOf('marca', s), ls = lsOf('marca', s);
    g.save(); g.font = font; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const w = tw(g, name, ls), ca = capA(g, font);
    const li = S.logo === 'imagen' ? getLogoImg() : null;
    const lw = li ? ca * 1.5 * (li.width / li.height) : 0, gap = li ? ca * 0.4 : 0;
    const iconW = S.logo !== 'nada' && S.logo !== 'imagen' ? ca * 0.2 : 0;
    const total = lw + gap + w + iconW, mx = W * 0.065;
    const x0 = pos === 'centro' ? (W - total) / 2 : pos === 'der' ? W - mx - total : mx;
    const draw = () => {
      if (li) g.drawImage(li, x0, y - ca * 1.25, lw, ca * 1.5);
      g.fillStyle = c; rawText(g, name, x0 + lw + gap, y, ls, false);
      if (iconW) icon(g, S.logo, x0 + lw + gap + w - ca * 0.15, y - ca * 0.98, ca * 0.62, c);
    };
    if (neonOn('marca')) glow(g, 'marca', s, c, draw); else { g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = s * 0.3 * PXK; draw(); }
    g.restore();
    hit('marca', x0, y - ca * 1.3, total, ca * 1.6, 'marca');
  }
  function firma(g, W, H) {
    if (!S.firma) return;
    g.save(); g.font = `600 ${W * 0.019}px Inter, system-ui, sans-serif`; g.fillStyle = 'rgba(255,255,255,.72)'; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    g.fillText('diseño @' + String(S.marca).replace(/^@/, ''), W - W * 0.045, H - H * 0.022); g.restore();
  }
  // puntos del carrusel: si hay varias slides marcan cuál es esta
  function dots(g, W, y) {
    if (!S.puntos) return;
    const n = CURSLIDE.n > 1 ? Math.min(CURSLIDE.n, 10) : 3, act = CURSLIDE.n > 1 ? Math.min(CURSLIDE.i, 9) : 0, gap = W * 0.022;
    for (let i = 0; i < n; i++) { g.beginPath(); g.arc(W / 2 + (i - (n - 1) / 2) * gap, y, W * 0.0058, 0, Math.PI * 2); g.fillStyle = i === act ? '#fff' : 'rgba(255,255,255,.45)'; g.fill(); }
  }
  function roundImg(g, img, x, y, w, hh, r) {
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 50 * PXK; g.shadowOffsetY = 20 * PXK;
    g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, r) : g.rect(x, y, w, hh); g.fillStyle = '#000'; g.fill(); g.restore();
    g.save(); g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, r) : g.rect(x, y, w, hh); g.clip(); cover(g, img, x, y, w, hh, S.zoom, S.px, S.py); g.restore();
  }
  const rowsOf = (txt, n) => String(txt || '').split('\n').map(l => l.split('|').map(x => x.trim())).filter(r => r[0]).slice(0, n);
  function glass(g, x, y, w, hh, r, a) {
    g.save(); g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, r) : g.rect(x, y, w, hh);
    g.fillStyle = `rgba(255,255,255,${a || 0.08})`; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.14)'; g.stroke(); g.restore();
  }

  // ---------- plantillas ----------
  const TEMPLATES = {
    titular(g, W, H, img) {
      drawBg(g, W, H, img); shade(g, W, H, 0.38); finish(g, W, H);
      brand(g, W, W * 0.115, W * 0.054);
      const r = headline(g, S.titular, W * 0.125, W * 0.05, W * 0.86, 3);
      const subH = S.sub ? W * 0.075 : 0, dotsH = S.puntos ? W * 0.06 : W * 0.03;
      const yHead = H - dotsH - subH - r.h - W * 0.035;
      tagBox(g, S.etiqueta, W / 2, yHead - W * 0.085, W * 0.026, false);
      drawHead(g, r, W / 2, yHead);
      if (S.sub) small(g, up(S.sub), W / 2, H - dotsH - W * 0.03, W * 0.026, null, 'center', 'alphabetic', 'sub', W * 0.86);
      dots(g, W, H - W * 0.04); firma(g, W, H);
    },
    charts(g, W, H, img) {
      drawBg(g, W, H, img, true); veil(g, W, H, 0.55);
      const side = Math.min(W * 0.6, H * 0.4), x = (W - side) / 2, y = H * 0.12;
      if (img) roundImg(g, img, x, y, side, side, 28); else glass(g, x, y, side, side, 28, 0.06);
      finish(g, W, H);
      brand(g, W, W * 0.09, W * 0.04);
      let yy = y + side + H * 0.035;
      yy = tagBox(g, S.etiqueta, W / 2, yy, W * 0.022, true) + H * 0.018;
      yy += bigNum(g, up(S.numero), W / 2, yy, W * 0.17, S.colNum || S.acento, 'center', 'numero', W * 0.86) + W * 0.035;
      yy += small(g, up(S.numeroTxt), W / 2, yy, W * 0.028, null, 'center', 'top', 'numeroTxt', W * 0.86) + W * 0.04;
      const r = headline(g, S.titular, W * 0.06, W * 0.032, W * 0.84, 2);
      drawHead(g, r, W / 2, yy);
      firma(g, W, H);
    },
    hito(g, W, H, img) {
      drawBg(g, W, H, img); shade(g, W, H, 0.3); finish(g, W, H); veil(g, W, H, 0.18);
      brand(g, W, W * 0.115, W * 0.05);
      const r = headline(g, S.titular, W * 0.075, W * 0.04, W * 0.86, 2);
      const bottom = H - (S.puntos ? W * 0.08 : W * 0.05);
      const yHead = bottom - r.h;
      drawHead(g, r, W / 2, yHead);
      const yTxt = yHead - W * 0.065;
      const capTxt = small(g, up(S.numeroTxt), W / 2, yTxt, W * 0.032, S.colPeq && S.colPeq !== '#ffffff' ? S.colPeq : S.acento, 'center', 'alphabetic', 'numeroTxt', W * 0.86);
      const numSize = W * 0.24, yNumTop = yTxt - capTxt - W * 0.05 - numSize * kOf('num') * 0.8;
      bigNum(g, up(S.numero), W / 2, yNumTop, numSize, S.colNum || '#ffffff', 'center', 'numero', W * 0.9);
      tagBox(g, S.etiqueta || 'NUEVO RÉCORD', W / 2, yNumTop - W * 0.1, W * 0.026, true);
      dots(g, W, H - W * 0.04); firma(g, W, H);
    },
    top5(g, W, H, img) {
      drawBg(g, W, H, img, true); veil(g, W, H, 0.62); finish(g, W, H);
      brand(g, W, W * 0.1, W * 0.045);
      const rows = rowsOf(S.lista, 5);
      let y = H * 0.17;
      tagBox(g, S.etiqueta, W / 2, y - W * 0.08, W * 0.024, true);
      const r = fitText(g, 'tit', up(S.listaTitulo), W * 0.085, W * 0.045, W * 0.86, 2);
      y = drawBlock(g, r, W / 2, y, col('colTit'), 'center', S.wordColors, 'listaTitulo', S.efectoTit) + H * 0.04;
      const rowH = Math.min(W * 0.16, (H * 0.92 - y) / Math.max(rows.length, 1)), mx = W * 0.07, y0 = y;
      rows.forEach((row, i) => {
        const ry = y + i * rowH;
        glass(g, mx, ry, W - mx * 2, rowH * 0.84, 24, i === 0 ? 0.13 : 0.06);
        line(g, 'num', String(i + 1), mx + W * 0.07, ry + rowH * 0.42, rowH * 0.5, i === 0 ? S.acento : (S.colNum || '#ffffff'), 'center', 'middle', null, null, S.efectoNum);
        if (row[1]) small(g, up(row[1]), W - mx - W * 0.04, ry + rowH * 0.42, rowH * 0.2, i === 0 ? S.acento : null, 'right', 'middle', null);
        g.save(); g.font = fontOf('peq', rowH * 0.25); const vw = row[1] ? tw(g, up(row[1]), 0) + W * 0.06 : 0; g.restore();
        small(g, up(row[0]), mx + W * 0.15, ry + rowH * 0.42, rowH * 0.25, col('colTit'), 'left', 'middle', null, W - mx * 2 - W * 0.19 - vw);
      });
      if (rows.length) hit('lista', mx, y0, W - mx * 2, rowH * rows.length, 'peq');
      firma(g, W, H);
    },
    datos(g, W, H, img) {
      drawBg(g, W, H, img, true); veil(g, W, H, 0.6); finish(g, W, H);
      brand(g, W, W * 0.1, W * 0.045);
      let y = H * 0.16;
      tagBox(g, S.etiqueta, W / 2, y - W * 0.08, W * 0.024, true);
      const r = headline(g, S.titular, W * 0.09, W * 0.045, W * 0.86, 2);
      y = drawHead(g, r, W / 2, y) + H * 0.04;
      const rows = rowsOf(S.datos, 6), cols = 2, gap = W * 0.03, mx = W * 0.07, cw = (W - mx * 2 - gap) / cols;
      const n = Math.max(1, Math.ceil(rows.length / cols)), avail = H - y - (S.puntos ? W * 0.1 : W * 0.07), ch = Math.min(cw * 0.78, (avail - gap * (n - 1)) / n);
      rows.forEach((row, i) => {
        const cxp = mx + (i % cols) * (cw + gap), cyp = y + Math.floor(i / cols) * (ch + gap);
        glass(g, cxp, cyp, cw, ch, 30, i === 0 ? 0.12 : 0.07);
        small(g, up(row[0]), cxp + W * 0.035, cyp + ch * 0.2, Math.min(W * 0.024, ch * 0.13), i === 0 ? S.acento : null, 'left', 'top', null, cw - W * 0.07);
        bigNum(g, up(row[1] || '—'), cxp + W * 0.035, cyp + ch * 0.45, Math.min(W * 0.085, ch * 0.36), S.colNum || '#ffffff', 'left', null, cw - W * 0.07);
      });
      if (rows.length) hit('datos', mx, y, W - mx * 2, n * (ch + gap), 'num');
      dots(g, W, H - W * 0.04); firma(g, W, H);
    },
    meta(g, W, H, img) {
      drawBg(g, W, H, img, true); veil(g, W, H, 0.58); finish(g, W, H);
      brand(g, W, W * 0.1, W * 0.045, null, 'centro');
      const R = W * 0.27, cxp = W / 2, cyp = H * 0.44, p = Math.max(0, Math.min(100, Number(S.progreso) || 0)) / 100;
      g.save(); g.lineCap = 'round'; g.lineWidth = W * 0.028;
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(cxp, cyp, R, 0, Math.PI * 2); g.stroke();
      const gr = g.createLinearGradient(cxp - R, cyp - R, cxp + R, cyp + R); gr.addColorStop(0, S.acento); gr.addColorStop(1, S.colNum || '#ffffff');
      g.strokeStyle = gr; glow(g, 'num', W * 0.05, S.acento, () => { g.beginPath(); g.arc(cxp, cyp, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, p)); g.stroke(); });
      g.restore();
      const pct = Math.round(p * 100) + '%';
      bigNum(g, pct, cxp, cyp - W * 0.08, W * 0.15, S.colNum || '#ffffff', 'center', 'progreso', R * 1.5);
      small(g, up(S.numeroTxt), cxp, cyp + W * 0.11, W * 0.024, null, 'center', 'top', 'numeroTxt', R * 1.5);
      let y = cyp + R + W * 0.08;
      y += bigNum(g, up(S.numero), W / 2, y, W * 0.09, S.acento, 'center', 'numero', W * 0.86) + W * 0.04;
      const r = headline(g, S.titular, W * 0.07, W * 0.035, W * 0.86, 2);
      drawHead(g, r, W / 2, y);
      tagBox(g, S.etiqueta, W / 2, cyp - R - W * 0.12, W * 0.024, true);
      dots(g, W, H - W * 0.04); firma(g, W, H);
    },
    portada(g, W, H, img) {
      drawBg(g, W, H, img, true); veil(g, W, H, 0.5);
      const side = Math.min(W * 0.7, H * 0.46), x = (W - side) / 2, y = H * 0.16;
      if (img) roundImg(g, img, x, y, side, side, 18); else glass(g, x, y, side, side, 18, 0.06);
      finish(g, W, H);
      brand(g, W, W * 0.095, W * 0.042, null, 'centro');
      let yy = y + side + H * 0.045;
      yy += small(g, up(S.etiqueta || 'NUEVO LANZAMIENTO'), W / 2, yy, W * 0.026, S.acento, 'center', 'top', 'etiqueta', W * 0.86) + W * 0.035;
      const r = headline(g, S.titular, W * 0.1, W * 0.05, W * 0.84, 2);
      yy = drawHead(g, r, W / 2, yy) + W * 0.02;
      if (S.sub) small(g, up(S.sub), W / 2, yy, W * 0.028, 'rgba(255,255,255,.8)', 'center', 'top', 'sub', W * 0.84);
      firma(g, W, H);
    },
    versus(g, W, H, img) {
      drawBg(g, W, H, img); veil(g, W, H, 0.6); finish(g, W, H);
      brand(g, W, W * 0.11, W * 0.05);
      const r = headline(g, S.titular, W * 0.085, W * 0.045, W * 0.86, 2);
      drawHead(g, r, W / 2, H * 0.18);
      const cy = H * 0.58, colW = W * 0.3;
      [[S.vsA, S.vsANum, W * 0.25, 'vsA'], [S.vsB, S.vsBNum, W * 0.75, 'vsB']].forEach(([lab, num, x, key], i) => {
        small(g, up(lab), x, cy - W * 0.13, W * 0.032, i === 0 ? S.acento : col('colPeq'), 'center', 'top', key, colW);
        bigNum(g, up(num), x, cy - W * 0.06, W * 0.13, S.colNum || '#ffffff', 'center', key + 'Num', colW);
      });
      g.save(); g.fillStyle = S.acento; g.beginPath(); g.arc(W / 2, cy, W * 0.06, 0, Math.PI * 2); g.fill(); g.restore();
      line(g, 'num', 'VS', W / 2, cy, W * 0.05, '#ffffff', 'center', 'middle');
      if (S.sub) small(g, up(S.sub), W / 2, H - W * 0.12, W * 0.028, null, 'center', 'alphabetic', 'sub', W * 0.86);
      dots(g, W, H - W * 0.04); firma(g, W, H);
    },
    cita(g, W, H, img) {
      drawBg(g, W, H, img); shade(g, W, H, 0.2, 1.2); finish(g, W, H); veil(g, W, H, 0.2);
      brand(g, W, W * 0.115, W * 0.05);
      const r = fitText(g, 'tit', S.cita, W * 0.1, W * 0.05, W * 0.84, 5);
      const yT = H - W * 0.25 - r.h;
      g.save(); g.font = `400 ${W * 0.36}px "Instrument Serif", Georgia, serif`; g.fillStyle = S.acento; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('“', W * 0.06, yT + W * 0.12); g.restore();
      drawBlock(g, r, W * 0.08, yT, col('colTit'), 'left', S.wordColors, 'cita', S.efectoTit);
      small(g, '— ' + S.autor, W * 0.08, H - W * 0.12, W * 0.034, S.acento, 'left', 'alphabetic', 'autor', W * 0.84);
      firma(g, W, H);
    },
    noticia(g, W, H, img) {
      drawBg(g, W, H, img); finish(g, W, H);
      brand(g, W, W * 0.115, W * 0.054);
      const pad = W * 0.06, cw = W - pad * 2, inner = cw - W * 0.08;
      const bs = W * 0.03 * typo('cuerpo').sz / 100, bfont = fontOf('cuerpo', bs), bls = lsOf('cuerpo', bs);
      const lines = layout(g, S.cuerpo, bfont, bs, inner, bls).map(l => l.join(' '));
      const lh = bs * (typo('cuerpo').lh || 150) / 100, headH = W * 0.085, ch = headH + lines.length * lh + W * 0.06, y0 = H - ch - pad * 1.2;
      g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 40 * PXK; g.shadowOffsetY = 10 * PXK; g.fillStyle = '#fbfaf7';
      g.beginPath(); g.roundRect ? g.roundRect(pad, y0, cw, ch, 14) : g.rect(pad, y0, cw, ch); g.fill(); g.restore();
      g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); g.moveTo(pad + W * 0.03, y0 + headH); g.lineTo(pad + cw - W * 0.03, y0 + headH); g.stroke();
      const keep = [S.colMarca, S.neon]; S.colMarca = '#111'; S.neon = false; brand(g, W, y0 + headH * 0.7, W * 0.04, '#111', 'centro'); [S.colMarca, S.neon] = keep;
      g.save(); g.font = bfont; g.fillStyle = '#1a1a1a'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      lines.forEach((l, i) => rawText(g, l, pad + W * 0.04, y0 + headH + W * 0.05 + i * lh, bls, false)); g.restore();
      hit('cuerpo', pad, y0 + headH, cw, ch - headH, 'cuerpo');
      const r = headline(g, S.titular, W * 0.085, W * 0.045, W * 0.86, 2);
      const yT = y0 - W * 0.04 - r.h;
      const sh = g.createLinearGradient(0, yT - W * 0.2, 0, y0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, `rgba(0,0,0,${S.sombra / 100 * 0.7})`);
      g.fillStyle = sh; g.fillRect(0, yT - W * 0.2, W, y0 - yT + W * 0.2);
      drawHead(g, r, W / 2, yT);
      if (S.etiqueta) tagBox(g, S.etiqueta, W / 2, yT - W * 0.08, W * 0.024, true);
    }
  };
  function guides(g, W, H) {
    g.save(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.setLineDash([14, 10]); g.lineWidth = 3;
    if (S.formato === 'historia') g.strokeRect(0, 250, W, H - 250 - 340);
    else if (S.formato === 'post') { const s = (H - W) / 2; g.strokeRect(0, s, W, W); }
    g.restore();
  }
  function render(g, W, H, img, preview) {
    if (preview) HITS = [];
    g.clearRect(0, 0, W, H);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    (TEMPLATES[S.plantilla] || TEMPLATES.titular)(g, W, H, img);
    if (preview && S.guias) guides(g, W, H);
  }
  function schedule() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      if (!cv || !S) return;
      const [W, H] = dims();
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      CURSLIDE = { i: cur, n: slides.length };
      render(cx, W, H, gradedFor(), true);
      drawSel();
    });
  }
  // contorno del texto que estás editando
  let selKey = null;
  function drawSel() {
    if (!selKey) return;
    const hs = HITS.filter(x => x.key === selKey); if (!hs.length) return;
    cx.save(); cx.strokeStyle = 'rgba(255,255,255,.9)'; cx.lineWidth = 3; cx.setLineDash([10, 8]);
    hs.forEach(b => { cx.beginPath(); cx.roundRect ? cx.roundRect(b.x - 14, b.y - 12, b.w + 28, b.h + 24, 14) : cx.rect(b.x - 14, b.y - 12, b.w + 28, b.h + 24); cx.stroke(); });
    cx.restore();
  }
  // dibuja otra slide (miniaturas y exportar) cambiando temporalmente el contenido
  function withSlide(i, fn) {
    if (i === cur) { CURSLIDE = { i, n: slides.length }; return fn(slides[i].id); }
    const keep = pick(S, SLIDE_KEYS);
    Object.assign(S, clone(slides[i].c));
    CURSLIDE = { i, n: slides.length };
    try { return fn(slides[i].id); } finally { Object.assign(S, keep); CURSLIDE = { i: cur, n: slides.length }; }
  }

  // ---------- guardar, deshacer y rehacer ----------
  const KEY = 'aa.studio3';
  let warnedQuota = false, hist = [], hi = -1, histTimer = 0;
  const snapshot = () => JSON.stringify({ S, slides, cur });
  function persist() {
    if (!slides[cur]) return;
    slides[cur].c = pick(S, SLIDE_KEYS);
    if (!LS.set(KEY, { S, slides, cur }) && !warnedQuota) { warnedQuota = true; toast('El navegador no tiene más espacio: usa un logo más pequeño.'); }
  }
  function commit(now) {
    persist();
    clearTimeout(histTimer);
    const push = () => { const s = snapshot(); if (hist[hi] === s) return; hist = hist.slice(0, hi + 1); hist.push(s); if (hist.length > 60) hist.shift(); hi = hist.length - 1; syncUndo(); };
    if (now) push(); else histTimer = setTimeout(push, 350);
  }
  function restore(s) {
    const o = JSON.parse(s); S = o.S; slides = o.slides; cur = Math.min(o.cur, slides.length - 1);
    logoImgEl = null; selWords.clear(); persist(); syncInputs(); loadUsedFonts(); schedule(); drawStrip(); drawThumbs(); slides.forEach(restorePhoto);
  }
  function undo() { clearTimeout(histTimer); if (hi <= 0) return; hi--; restore(hist[hi]); syncUndo(); }
  function redo() { if (hi >= hist.length - 1) return; hi++; restore(hist[hi]); syncUndo(); }
  let undoBtns = [];
  function syncUndo() { if (undoBtns.length) { undoBtns[0].disabled = hi <= 0; undoBtns[1].disabled = hi >= hist.length - 1; } }
  function set(k, v) {
    S[k] = v; schedule(); commit();
    if (['titular', 'listaTitulo', 'cita', 'plantilla'].includes(k)) drawWords();
    if (k === 'formato') drawStrip();
    if (['brillo', 'contraste', 'saturacion', 'calidez'].includes(k)) regrade(); else drawThumbs();
    syncInputs(k);
  }
  function setTypo(el, patch) {
    S.typo = Object.assign({}, S.typo || {});
    S.typo[el] = Object.assign(typo(el), patch);
    measureCache.clear(); loadUsedFonts(); commit(); syncInputs(); schedule();
  }

  // ---------- carrusel ----------
  function selectSlide(i) {
    if (i === cur || !slides[i]) return;
    persist(); cur = i;
    Object.assign(S, clone(slides[i].c)); selWords.clear(); closeQuick();
    syncInputs(); syncPhoto(); schedule(); drawStrip(); commit();
  }
  async function addSlide(dup) {
    if (slides.length >= MAX_SLIDES) { toast(`Máximo ${MAX_SLIDES} slides por carrusel`); return; }
    persist();
    const from = slides[cur], id = uid();
    const c = dup ? clone(from.c) : Object.assign(clone(from.c), { titular: 'NUEVA SLIDE', wordColors: {}, imgUrl: '', zoom: 1, px: 0, py: 0 });
    if (dup && IMGS.has(from.id)) { IMGS.set(id, IMGS.get(from.id)); if (from.c.imgUrl === 'local') { const b = await idb.get('photos', from.id); if (b) idb.set('photos', id, b); } }
    slides.splice(cur + 1, 0, { id, c });
    cur++; Object.assign(S, clone(c)); selWords.clear();
    syncInputs(); schedule(); drawStrip(); drawThumbs(); commit(true);
    toast(dup ? 'Slide duplicada' : 'Slide añadida');
  }
  function delSlide() {
    if (slides.length < 2) { toast('El carrusel necesita al menos una slide'); return; }
    slides.splice(cur, 1); cur = Math.max(0, cur - 1);
    Object.assign(S, clone(slides[cur].c)); selWords.clear();
    syncInputs(); schedule(); drawStrip(); drawThumbs(); commit(true);
    toast('Slide borrada · puedes deshacer');
  }
  function moveSlide(d) {
    const j = cur + d; if (j < 0 || j >= slides.length) return;
    persist(); [slides[cur], slides[j]] = [slides[j], slides[cur]]; cur = j;
    schedule(); drawStrip(); drawThumbs(); commit(true);
  }
  // varias slides de golpe con datos reales (lo prepara la web)
  function autoCarousel() {
    const list = api.carousel && api.carousel();
    if (!list || !list.length) { toast('Aún no hay datos para el carrusel automático'); return; }
    if (slides.length > 1 && !confirm(`Se cambiarán tus ${slides.length} slides por ${list.length} nuevas con las cifras de hoy. ¿Seguir?`)) return;
    persist();
    const base = pick(S, SLIDE_KEYS);
    slides = list.slice(0, MAX_SLIDES).map(pre => {
      const c = Object.assign(clone(base), { wordColors: {}, zoom: 1, px: 0, py: 0, imgUrl: '' }, applyPre({}, pre));
      return { id: uid(), c, img: pre.imagen };
    });
    cur = 0; Object.assign(S, clone(slides[0].c)); selWords.clear();
    slides.forEach(sl => { if (sl.img) loadUrl(sl.img, sl.id); delete sl.img; });
    syncInputs(); schedule(); drawStrip(); drawThumbs(); commit(true);
    toast(`Carrusel listo: ${slides.length} slides`);
  }
  let strip = null, counter = null;
  const thumbCvs = new Map();
  function drawStrip() {
    if (!strip) return;
    if (counter) counter.textContent = slides.length > 1 ? `${cur + 1} / ${slides.length}` : '1 slide';
    const [W, H] = dims();
    strip.replaceChildren(...slides.map((sl, i) => {
      let c = thumbCvs.get(sl.id); if (!c) { c = h('canvas', { class: 'sx-thumb-cv' }); thumbCvs.set(sl.id, c); }
      c.width = 96; c.height = Math.round(96 * H / W);
      return h('button', { type: 'button', class: 'sx-thumb' + (i === cur ? ' on' : ''), 'aria-label': `Slide ${i + 1}`, 'aria-current': i === cur ? 'true' : null, onclick: () => selectSlide(i) }, c, h('span', { text: String(i + 1) }));
    }), h('button', { type: 'button', class: 'sx-thumb add', 'aria-label': 'Añadir slide', onclick: () => addSlide(false) }, h('b', { text: '+' }), h('span', { text: 'Nueva' })));
    const on = strip.querySelector('.sx-thumb.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    drawThumbs();
  }
  let thumbTimer = 0;
  function drawThumbs() {
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(() => {
      if (!strip || !S) return;
      persist();
      const [W, H] = dims();
      EXPORTING = true;
      try {
        slides.forEach((sl, i) => {
          const c = thumbCvs.get(sl.id); if (!c) return;
          const g = c.getContext('2d'), k = c.width / W;
          g.setTransform(k, 0, 0, k, 0, 0); PXK = k;
          withSlide(i, id => render(g, W, H, gradedFor(id, 420), false));
        });
      } finally { EXPORTING = false; PXK = 1; }
    }, 260);
  }

  // ---------- exportar ----------
  const MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function exportScale() {
    const [W, H] = dims(); let k = S.calidad; const cap = MOBILE ? 16e6 : 40e6;
    while (k > 1 && W * H * k * k > cap) k -= 0.25;
    return k;
  }
  async function exportBlob(i, type) {
    const [W, H] = dims(), k = exportScale();
    const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
    const g = c.getContext('2d'); g.scale(k, k);
    PXK = k; EXPORTING = true;
    let tainted = false;
    try { withSlide(i, id => { const e = imgOf(id); const full = e ? grade(e, MOBILE ? 2600 : 4000) : null; tainted = !!(e && e.tainted); render(g, W, H, full, false); }); }
    finally { PXK = 1; EXPORTING = false; }
    const b = await new Promise((res, rej) => { try { c.toBlob(x => x ? res(x) : rej(new Error('vacío')), type, 0.95); } catch (e) { rej(e); } });
    c.width = c.height = 1;
    if (tainted) throw new Error('tainted');
    return { blob: b, w: Math.round(W * k), h: Math.round(H * k) };
  }
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const baseName = () => String(S.marca || 'post').replace(/[^\w-]/g, '') || 'post';
  let busy = false;
  function sheet(children, onClose) {
    const close = () => { ov.classList.add('out'); setTimeout(() => { ov.remove(); onClose && onClose(); }, 220); };
    const ov = h('div', { class: 'sx-modal', role: 'dialog', 'aria-modal': 'true', onclick: (e) => { if (e.target === ov) close(); } },
      h('div', { class: 'sx-modal-card' }, h('button', { type: 'button', class: 'sx-x', 'aria-label': 'Cerrar', onclick: () => close() }, '×'), ...children(close)));
    document.body.append(ov);
    const esc = (e) => { if (e.key === 'Escape') { close(); removeEventListener('keydown', esc); } };
    addEventListener('keydown', esc);
    return close;
  }
  async function download(type, all) {
    if (busy) return; busy = true;
    const ext = type === 'image/png' ? 'png' : 'jpg', idx = all ? slides.map((_, i) => i) : [cur];
    toast(all ? `Preparando ${idx.length} imágenes…` : 'Preparando la imagen…');
    persist();
    try {
      await fontsReady();
      const out = [];
      for (const i of idx) { const r = await exportBlob(i, type); out.push(Object.assign(r, { name: `${baseName()}-${idx.length > 1 ? String(i + 1).padStart(2, '0') + '-' : ''}${stamp()}.${ext}` })); }
      const files = out.map(o => new File([o.blob], o.name, { type }));
      if (!MOBILE) {
        const blob = out.length > 1 ? makeZip(await Promise.all(out.map(async o => ({ name: o.name, data: new Uint8Array(await o.blob.arrayBuffer()) })))) : out[0].blob;
        const url = URL.createObjectURL(blob), a = h('a', { href: url, download: out.length > 1 ? `${baseName()}-carrusel-${stamp()}.zip` : out[0].name });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast(out.length > 1 ? `Carrusel guardado (${out.length} imágenes en un .zip)` : `Guardada en ${out[0].w}×${out[0].h}`);
        return;
      }
      const urls = out.map(o => URL.createObjectURL(o.blob));
      const canShare = navigator.canShare && navigator.canShare({ files });
      sheet((close) => [
        h('h3', { class: 'sx-modal-t', text: out.length > 1 ? `Tu carrusel · ${out.length} imágenes` : 'Tu imagen' }),
        h('div', { class: 'sx-export-imgs' + (out.length > 1 ? ' multi' : '') }, urls.map((u, i) => h('img', { src: u, alt: `Slide ${i + 1}` }))),
        h('p', { class: 'sx-note', text: `${out[0].w}×${out[0].h} px` }),
        canShare ? h('button', { class: 'sx-btn pri', type: 'button', text: out.length > 1 ? `Guardar las ${out.length} en Fotos` : 'Guardar en Fotos / Compartir', onclick: async () => { try { await navigator.share({ files }); close(); } catch (e) { if (!e || e.name !== 'AbortError') toast('Mantén pulsada cada imagen y elige «Guardar en Fotos».'); } } }) : null,
        out.length === 1 ? h('a', { class: 'sx-btn', href: urls[0], download: out[0].name, text: 'Descargar archivo' }) : null,
        h('p', { class: 'sx-note', text: 'También puedes mantener pulsada una imagen y elegir «Guardar en Fotos».' })
      ], () => urls.forEach(u => URL.revokeObjectURL(u)));
    } catch (e) {
      toast(e && e.message === 'tainted' ? 'Una foto no se puede exportar desde la web: súbela desde tu dispositivo.' : 'No se pudo exportar. Prueba con calidad 1080 px.');
    } finally { busy = false; }
  }

  // ---------- interfaz ----------
  const KEYLAB = { titular: 'Titular', listaTitulo: 'Título de la lista', cita: 'Frase', etiqueta: 'Etiqueta', sub: 'Subtítulo', numero: 'Número grande', numeroTxt: 'Texto del número', cuerpo: 'Texto de la noticia', lista: 'Filas del Top 5', datos: 'Datos', vsA: 'Izquierda', vsANum: 'Cifra izquierda', vsB: 'Derecha', vsBNum: 'Cifra derecha', autor: 'Autor', marca: 'Tu marca', progreso: 'Progreso' };
  const MULTI = new Set(['titular', 'listaTitulo', 'cita', 'cuerpo', 'lista', 'datos']);
  const KEYEL = { titular: 'tit', listaTitulo: 'tit', cita: 'tit', numero: 'num', vsANum: 'num', vsBNum: 'num', progreso: 'num', datos: 'num', marca: 'marca', cuerpo: 'cuerpo' };
  const KEYPART = { titular: 'colTit', listaTitulo: 'colTit', cita: 'colTit', numero: 'colNum', vsANum: 'colNum', vsBNum: 'colNum', progreso: 'colNum', datos: 'colNum', marca: 'colMarca', etiqueta: 'acento' };
  const inputs = {};
  const reg = (k, el) => { (inputs[k] = inputs[k] || []).push(el); return el; };
  const autosize = (el) => { if (el.tagName === 'TEXTAREA') { el.style.height = 'auto'; el.style.height = Math.min(320, el.scrollHeight + 2) + 'px'; } };
  function syncInputs(skip) {
    if (!root) return;
    for (const [k, els] of Object.entries(inputs)) for (const el of els) {
      if (!el.isConnected || el === document.activeElement || k === skip) continue;
      if (el.type === 'checkbox') el.checked = !!S[k]; else { el.value = S[k] == null ? '' : S[k]; autosize(el); }
    }
    root.querySelectorAll('[data-seg]').forEach(b => b.setAttribute('aria-pressed', String(String(S[b.dataset.seg]) === b.dataset.v)));
    root.querySelectorAll('[data-tpl]').forEach(el => { const on = el.dataset.tpl.split(' ').includes(S.plantilla); el.hidden = el.classList.contains('sx-not') ? on : !on; });
    root.querySelectorAll('.sx-sec').forEach(el => { el.hidden = el.dataset.sec !== sec; });
    root.querySelectorAll('.sx-secbar button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === sec)));
    const lu = root.querySelector('.sx-logo-up'); if (lu) lu.hidden = S.logo !== 'imagen';
    const fc = root.querySelector('.sx-fondo-cols'); if (fc) fc.hidden = S.fondo === 'foto' || S.fondo === 'desenfoque';
    syncParts(); drawWords(); syncTypo(); syncPhoto();
  }
  function field(label, k, type, opts = {}) {
    let el;
    if (type === 'textarea') el = h('textarea', { rows: opts.rows || 2, class: 'sx-in', placeholder: opts.ph || '', spellcheck: 'false' });
    else if (type === 'range') el = h('input', { type: 'range', min: opts.min, max: opts.max, step: opts.step || 1, class: 'sx-range' });
    else if (type === 'check') el = h('input', { type: 'checkbox', class: 'sx-switch' });
    else if (type === 'color') el = h('input', { type: 'color', class: 'sx-color' });
    else el = h('input', { type: 'text', class: 'sx-in', maxlength: opts.max || 200, placeholder: opts.ph || '', autocomplete: 'off', spellcheck: 'false' });
    reg(k, el);
    el.addEventListener('input', () => { autosize(el); set(k, type === 'range' ? Number(el.value) : type === 'check' ? el.checked : el.value); });
    if (type === 'check') return h('label', { class: 'sx-check' }, h('span', { text: label }), el);
    const out = h('span', { class: 'sx-val' });
    if (type === 'range') { const upd = () => { out.textContent = el.value + (opts.unit || ''); }; el.addEventListener('input', upd); reg(k, { isConnected: true, set value(v) { out.textContent = v + (opts.unit || ''); }, type: 'mirror' }); }
    return h('label', { class: 'sx-field' + (type === 'range' ? ' range' : '') + (type === 'color' ? ' colorf' : '') }, h('span', { class: 'sx-lab', text: label }), el, type === 'range' ? out : null);
  }
  function seg(k, options, cls) {
    return h('div', { class: 'sx-seg' + (cls ? ' ' + cls : ''), role: 'group' }, Object.entries(options).map(([v, l]) => h('button', { type: 'button', 'data-seg': k, 'data-v': v, onclick: () => { set(k, k === 'calidad' ? Number(v) : v); }, text: Array.isArray(l) ? l[2] : l })));
  }
  const group = (title, ...kids) => h('section', { class: 'sx-group' }, title ? h('h4', { class: 'sx-gt', text: title }) : null, ...kids);
  const hint = (t) => h('p', { class: 'sx-hint', text: t });
  function swatches(fn, list, withAuto) {
    return h('div', { class: 'sx-swatches' },
      withAuto ? h('button', { type: 'button', class: 'sx-sw auto', 'aria-label': 'Automático', onclick: () => fn(''), text: 'A' }) : null,
      (list || SWATCHES).map(c => h('button', { type: 'button', class: 'sx-sw', 'data-c': c, style: { background: c }, 'aria-label': 'Color ' + c, onclick: () => fn(c) })),
      (() => { const c = h('input', { type: 'color', 'aria-label': 'Cualquier color' }); c.addEventListener('input', () => fn(c.value)); return h('label', { class: 'sx-sw pick', title: 'Cualquier color' }, c); })());
  }

  // colores por parte
  function setPart(c) { S[S.parte] = c; if (S.parte === 'neonColor' && c) S.neon = true; commit(); syncInputs(); schedule(); drawThumbs(); }
  function syncParts() {
    root.querySelectorAll('.sx-part').forEach(b => { const k = b.dataset.part; b.setAttribute('aria-pressed', String(S.parte === k)); b.querySelector('i').style.background = S[k] || (k === 'colNum' ? S.acento : k === 'neonColor' ? 'conic-gradient(#ff2d55,#ffd60a,#30d158,#0a84ff,#bf5af2,#ff2d55)' : '#fff'); });
    const curc = String(S[S.parte] || '').toLowerCase();
    root.querySelectorAll('.sx-partcols .sx-sw[data-c]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === curc)));
    const no = root.querySelector('.sx-neon-opts'); if (no) no.classList.toggle('off', !S.neon);
  }
  // color por palabra
  let wordsBox = null;
  function curText() { return S.plantilla === 'top5' ? S.listaTitulo : S.plantilla === 'cita' ? S.cita : S.titular; }
  function drawWords() {
    if (!wordsBox) return;
    const words = String(curText() || '').split(/\s+/).filter(Boolean);
    for (const k of Object.keys(S.wordColors || {})) if (+k >= words.length) delete S.wordColors[k];
    for (const i of [...selWords]) if (i >= words.length) selWords.delete(i);
    wordsBox.replaceChildren(...words.map((w, i) => {
      const c = S.wordColors[i];
      return h('button', { type: 'button', class: 'sx-word' + (selWords.has(i) ? ' sel' : ''), style: c ? { '--wc': c } : null, 'data-c': c ? '1' : null, 'aria-pressed': String(selWords.has(i)), onclick: () => { selWords.has(i) ? selWords.delete(i) : selWords.add(i); drawWords(); } }, up(clean(w)));
    }));
  }
  function paintWords(c) {
    if (!selWords.size) { toast('Primero toca una o varias palabras'); return; }
    S.wordColors = Object.assign({}, S.wordColors);
    for (const i of selWords) { if (c) S.wordColors[i] = c; else delete S.wordColors[i]; }
    commit(); drawWords(); schedule(); drawThumbs();
  }

  // ---------- panel de tipografía ----------
  let typoBox = null;
  const typoCtl = {};
  function fontCss(f, w, it) { return { fontFamily: `"${f}", system-ui, sans-serif`, fontWeight: String(w || 400), fontStyle: it ? 'italic' : 'normal' }; }
  function buildTypo() {
    typoCtl.card = h('button', { type: 'button', class: 'sx-fontcard', onclick: () => openPicker(S.elT) },
      typoCtl.cardName = h('b'), typoCtl.cardCat = h('small'), h('span', { class: 'sx-fontcard-go', text: 'Cambiar ›' }));
    typoCtl.weights = h('div', { class: 'sx-seg sx-weights', role: 'group' });
    typoCtl.italic = h('input', { type: 'checkbox', class: 'sx-switch' });
    typoCtl.italic.addEventListener('change', () => setTypo(S.elT, { i: typoCtl.italic.checked ? 1 : 0 }));
    const rng = (key, label, min, max, unit) => {
      const el = h('input', { type: 'range', min, max, class: 'sx-range' }), out = h('span', { class: 'sx-val' });
      el.addEventListener('input', () => { out.textContent = el.value + unit; setTypo(S.elT, { [key]: Number(el.value) }); });
      typoCtl[key] = { el, out };
      return h('label', { class: 'sx-field range', 'data-r': key }, h('span', { class: 'sx-lab', text: label }), el, out);
    };
    typoCtl.eff = h('div', { class: 'sx-effwrap' });
    typoBox = h('div', { class: 'sx-typo' },
      h('div', { class: 'sx-seg sx-els', role: 'group' }, Object.entries(ELS).map(([k, l]) => h('button', { type: 'button', 'data-seg': 'elT', 'data-v': k, onclick: () => { S.elT = k; syncInputs(); }, text: l }))),
      typoCtl.card,
      h('div', { class: 'sx-sub' }, hint('Grosor'), typoCtl.weights),
      h('label', { class: 'sx-check' }, h('span', { text: 'Cursiva' }), typoCtl.italic),
      rng('sz', 'Tamaño', 60, 150, '%'), rng('ls', 'Espaciado', -10, 40, ''), rng('lh', 'Interlineado', 70, 170, '%'),
      typoCtl.eff,
      h('div', { class: 'sx-row2' },
        h('button', { type: 'button', class: 'sx-btn sm', text: 'Usar en todos los textos', onclick: () => { const t = typo(S.elT); ['tit', 'num', 'peq', 'marca'].forEach(e => setTypo(e, { f: t.f, w: nearestW(t.f, typo(e).w), i: t.i })); toast(`«${t.f}» en todos los textos`); } }),
        h('button', { type: 'button', class: 'sx-btn sm', text: 'Restablecer', onclick: () => { S.typo = Object.assign({}, S.typo); delete S.typo[S.elT]; measureCache.clear(); loadUsedFonts(); commit(); syncInputs(); schedule(); } })));
    return typoBox;
  }
  function syncTypo() {
    if (!typoBox) return;
    const el = S.elT || 'tit', t = typo(el), inf = info(t.f);
    typoCtl.cardName.textContent = t.f.replace(/^Mi /, '');
    Object.assign(typoCtl.cardName.style, fontCss(t.f, nearestW(t.f, t.w), t.i));
    typoCtl.cardCat.textContent = `${CATS[inf.cat] || 'Google Fonts'} · ${ELS[el]}`;
    ensureCss(t.f);
    const ws = inf.w.length ? inf.w : [400];
    typoCtl.weights.replaceChildren(...ws.map(w => h('button', { type: 'button', 'aria-pressed': String(nearestW(t.f, t.w) === w), onclick: () => setTypo(el, { w }), style: { fontWeight: String(w) } }, WNAMES[w] || String(w))));
    typoCtl.weights.parentNode.hidden = ws.length < 2;
    typoCtl.italic.checked = !!t.i;
    for (const key of ['sz', 'ls', 'lh']) { typoCtl[key].el.value = t[key]; typoCtl[key].out.textContent = t[key] + (key === 'ls' ? '' : '%'); }
    typoBox.querySelector('[data-r="lh"]').hidden = !(el === 'tit' || el === 'cuerpo');
    const effKey = el === 'tit' ? 'efectoTit' : el === 'num' ? 'efectoNum' : null;
    typoCtl.eff.replaceChildren(...(effKey ? [hint('Efecto'), h('div', { class: 'sx-seg sx-wrapseg', role: 'group' }, Object.entries(EFFECTS).map(([v, l]) => h('button', { type: 'button', 'aria-pressed': String(S[effKey] === v), onclick: () => set(effKey, v), text: l })))] : []));
  }
  function comboRow() {
    const row = h('div', { class: 'sx-combos' }, COMBOS.map(([n, c]) => {
      const t = Object.assign({}, TYPO_DEF.tit, c.tit);
      const b = h('button', { type: 'button', class: 'sx-combo', 'data-f': t.f, onclick: () => {
        S.typo = Object.assign({}, S.typo || {});
        for (const [el, v] of Object.entries(c)) S.typo[el] = Object.assign({}, TYPO_DEF[el], v);
        measureCache.clear(); loadUsedFonts(); commit(); syncInputs(); schedule(); toast('Fuentes: ' + n);
      } }, h('b', { style: fontCss(t.f, t.w, t.i), text: 'Aa' }), h('span', { text: n }));
      return b;
    }));
    lazyFonts(row, '.sx-combo');
    return row;
  }
  // carga el CSS de cada fuente solo cuando su tarjeta aparece en pantalla
  function lazyFonts(container, sel, rootEl) {
    if (!('IntersectionObserver' in window)) { container.querySelectorAll(sel).forEach(b => ensureCss(b.dataset.f)); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { ensureCss(e.target.dataset.f); io.unobserve(e.target); } }), { root: rootEl || null, rootMargin: '300px' });
    requestAnimationFrame(() => container.querySelectorAll(sel).forEach(b => io.observe(b)));
  }

  // ---------- selector de fuentes ----------
  function openPicker(el) {
    S.elT = el; syncInputs();
    let cat = 'todas', q = '';
    const sampleTxt = () => (clean(up(curText() || '')).split(/\s+/).slice(0, 3).join(' ') || 'Anuel AA').slice(0, 24);
    const grid = h('div', { class: 'sx-fgrid' });
    let scroller = null;
    const fonts = () => [
      ...[...UPLOADED].map(f => ({ f, cat: 'mias', up: true })),
      ...myGoogle().map(f => ({ f, cat: 'mias', g: true })),
      ...LIB.map(r => ({ f: r[0], cat: r[1] }))
    ];
    const choose = (f, close) => {
      pushRecent(f);
      setTypo(el, { f, w: nearestW(f, typo(el).w) });
      ensureCss(f).then(() => { setTypo(el, { w: nearestW(f, typo(el).w) }); });
      close();
      toast(`${ELS[el]}: ${f.replace(/^Mi /, '')}`);
    };
    let closeFn = null;
    const draw = () => {
      const ql = q.toLowerCase(), curF = typo(el).f, txt = sampleTxt();
      const list = fonts().filter(x => (cat === 'todas' ? true : x.cat === cat) && (!ql || x.f.toLowerCase().includes(ql)));
      grid.replaceChildren(...(list.length ? list.map(x => {
        const inf = info(x.f), w = inf.w.includes(typo(el).w) ? typo(el).w : nearestW(x.f, 900);
        return h('div', { class: 'sx-fcell' },
          h('button', { type: 'button', class: 'sx-fcard' + (x.f === curF ? ' on' : ''), 'data-f': x.f, onclick: () => choose(x.f, closeFn) },
            h('span', { class: 'sx-fsample', style: fontCss(x.f, w, 0), text: txt }),
            h('small', { text: x.f.replace(/^Mi /, '') })),
          x.up || x.g ? h('button', { type: 'button', class: 'sx-fdel', 'aria-label': 'Quitar ' + x.f, onclick: async () => {
            if (x.up) { UPLOADED.delete(x.f); await idb.del('fonts', x.f); } else LS.set('aa.studio.gfonts', myGoogle().filter(n => n !== x.f));
            draw();
          } }, '×') : null);
      }) : [h('p', { class: 'sx-hint', text: cat === 'mias' ? 'Aún no tienes fuentes propias. Añade una de Google Fonts o sube la tuya abajo.' : 'No hay fuentes con ese nombre. Puedes añadirla abajo si existe en Google Fonts.' })]));
      lazyFonts(grid, '.sx-fcard', scroller);
    };
    const search = h('input', { class: 'sx-in', type: 'search', placeholder: 'Buscar fuente…', autocomplete: 'off', oninput: (e) => { q = e.target.value.trim(); draw(); } });
    const cats = h('div', { class: 'sx-chips' }, Object.entries(CATS).map(([k, l]) => h('button', { type: 'button', class: 'sx-chip', 'aria-pressed': String(k === cat), onclick: (e) => { cat = k; cats.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); draw(); }, text: l })));
    const rec = recentFonts().filter(f => f !== typo(el).f);
    const gIn = h('input', { class: 'sx-in', placeholder: 'Nombre exacto, ej.: Rubik Mono One', autocomplete: 'off', autocapitalize: 'words' });
    const gBtn = h('button', { type: 'button', class: 'sx-btn sm pri', text: 'Añadir' });
    gBtn.onclick = async () => {
      const raw = gIn.value.trim().replace(/\s+/g, ' '); if (!raw) return;
      gBtn.disabled = true; gBtn.textContent = 'Buscando…';
      const title = raw.replace(/\b\w/g, c => c.toUpperCase());
      let name = null;
      for (const n of [...new Set([title, raw])]) { if (await ensureCss(n)) { name = n; break; } }
      gBtn.disabled = false; gBtn.textContent = 'Añadir';
      if (!name) { toast(`No encontré «${raw}» en Google Fonts. Revisa el nombre exacto.`); return; }
      LS.set('aa.studio.gfonts', [name, ...myGoogle().filter(n => n !== name)].slice(0, 40));
      choose(name, closeFn);
    };
    const upIn = h('input', { type: 'file', accept: '.ttf,.otf,.woff,.woff2,font/*', hidden: true, onchange: async (e) => { const fam = await addFontFile(e.target.files[0]); if (fam) choose(fam, closeFn); } });
    closeFn = sheet((close) => {
      closeFn = close;
      return [
        h('h3', { class: 'sx-modal-t', text: `Fuente · ${ELS[el]}` }),
        h('div', { class: 'sx-pick-top' }, search, cats,
          rec.length ? h('div', { class: 'sx-recent' }, h('span', { class: 'sx-hint', text: 'Recientes' }), rec.map(f => h('button', { type: 'button', class: 'sx-chip', style: fontCss(f, nearestW(f, 700), 0), onclick: () => choose(f, close), text: f.replace(/^Mi /, '') }))) : null),
        scroller = h('div', { class: 'sx-fscroll' }, grid,
          h('div', { class: 'sx-group sx-more' },
            h('h4', { class: 'sx-gt', text: 'Cualquier fuente de Google Fonts' }),
            hint('Hay más de 1.700. Busca una en fonts.google.com y escribe aquí su nombre.'),
            h('div', { class: 'sx-row2 tight' }, gIn, gBtn),
            h('a', { class: 'sx-link', href: 'https://fonts.google.com/?categories=Display', target: '_blank', rel: 'noopener', text: 'Abrir catálogo de Google Fonts ↗' })),
          h('div', { class: 'sx-group sx-more' },
            h('h4', { class: 'sx-gt', text: 'Tu propia fuente' }),
            hint('Sube un archivo .ttf, .otf o .woff2. Se guarda solo en este navegador.'),
            h('button', { type: 'button', class: 'sx-btn', text: 'Subir archivo de fuente', onclick: () => upIn.click() }), upIn))
      ];
    });
    draw();
    setTimeout(() => { if (!MOBILE) search.focus(); }, 60);
  }

  // ---------- edición rápida tocando el texto ----------
  let quick = null, quickInput = null;
  function openQuick(b) {
    const key = b.key; selKey = key; schedule();
    const el = KEYEL[key] || b.el || 'peq', part = KEYPART[key] || 'colPeq';
    if (quickInput) inputs[quickInput.dataset.k] = (inputs[quickInput.dataset.k] || []).filter(x => x !== quickInput);
    if (key === 'progreso') quickInput = h('input', { type: 'range', min: 0, max: 100, class: 'sx-range' });
    else if (key === 'datos' || key === 'lista') quickInput = h('textarea', { class: 'sx-in', rows: 4, spellcheck: 'false' });
    else if (MULTI.has(key)) quickInput = h('textarea', { class: 'sx-in', rows: 2, spellcheck: 'false' });
    else quickInput = h('input', { class: 'sx-in', type: 'text', autocomplete: 'off', spellcheck: 'false' });
    quickInput.dataset.k = key; quickInput.value = S[key] == null ? '' : S[key];
    reg(key, quickInput);
    quickInput.addEventListener('input', () => { autosize(quickInput); set(key, key === 'progreso' ? Number(quickInput.value) : quickInput.value); });
    quick.replaceChildren(
      h('div', { class: 'sx-quick-h' }, h('b', { text: KEYLAB[key] || 'Texto' }),
        key === 'lista' || key === 'datos' ? h('small', { text: 'Una por línea: Nombre | cifra' }) : MULTI.has(key) && key !== 'cuerpo' ? h('small', { text: '*asteriscos* = color resaltado' }) : null,
        h('button', { type: 'button', class: 'sx-btn sm pri', text: 'Listo', onclick: closeQuick })),
      quickInput,
      h('div', { class: 'sx-quick-tools' },
        h('button', { type: 'button', class: 'sx-btn sm', onclick: () => openPicker(el) }, h('b', { style: fontCss(typo(el).f, nearestW(typo(el).f, typo(el).w), typo(el).i), text: 'Aa' }), ' Fuente'),
        swatches((c) => { S.parte = part; setPart(c || PARTS[part][1]); }, ['#ffffff', S.acento, '#ff3b30', '#ffd60a', '#30d158', '#64d2ff', '#bf5af2', '#111111'])));
    quick.hidden = false; quick.classList.add('in');
    autosize(quickInput);
    if (!MOBILE || key !== 'marca') setTimeout(() => { try { quickInput.focus({ preventScroll: true }); if (quickInput.select && !MULTI.has(key)) quickInput.select(); } catch (e) { /* */ } }, 30);
  }
  function closeQuick() { if (!quick) return; selKey = null; quick.hidden = true; quick.classList.remove('in'); if (document.activeElement && quick.contains(document.activeElement)) document.activeElement.blur(); schedule(); }
  function tapAt(e) {
    const r = cv.getBoundingClientRect(), [W, H] = dims();
    const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H, pad = W * 0.02;
    for (let i = HITS.length - 1; i >= 0; i--) { const b = HITS[i]; if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) { openQuick(b); return; } }
    closeQuick();
  }
  let photoBtns = null;
  function syncPhoto() {
    if (photoBtns) photoBtns.forEach(b => { b.hidden = !imgOf(); });
    const w = cv && cv.parentNode; if (w) w.classList.toggle('nophoto', !imgOf() && (S.fondo === 'foto' || S.fondo === 'desenfoque'));
  }

  // ---------- montar el editor ----------
  const SECS = { plantilla: 'Plantilla', textos: 'Textos', fuentes: 'Fuentes', colores: 'Colores', marca: 'Marca', foto: 'Foto', exportar: 'Exportar' };
  const ICON = {
    undo: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    redo: '<svg viewBox="0 0 24 24"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>',
    photo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
    dup: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/></svg>'
  };
  const ib = (name, label, fn, cls) => { const b = h('button', { type: 'button', class: 'sx-ib' + (cls ? ' ' + cls : ''), 'aria-label': label, title: label, onclick: fn }); b.innerHTML = ICON[name]; if (cls && cls.includes('txt')) b.append(h('span', { text: label })); return b; };

  function mount(el, apiIn) {
    api = apiIn; root = el;
    const saved = LS.get(KEY, null);
    S = Object.assign({}, DEF, api.defaults || {}, saved ? saved.S : {});
    S.wordColors = Object.assign({}, S.wordColors || {});
    S.typo = Object.assign({}, S.typo || {});
    if (!TPL[S.plantilla]) S.plantilla = 'titular';
    if (!PARTS[S.parte]) S.parte = 'colTit';
    if (!ELS[S.elT]) S.elT = 'tit';
    slides = saved && Array.isArray(saved.slides) && saved.slides.length ? saved.slides : [{ id: uid(), c: pick(S, SLIDE_KEYS) }];
    cur = saved ? Math.min(saved.cur || 0, slides.length - 1) : 0;
    Object.assign(S, clone(slides[cur].c));
    for (const k of Object.keys(inputs)) delete inputs[k];

    cv = h('canvas', { class: 'sx-canvas', 'aria-label': 'Vista previa: toca un texto para editarlo' });
    cx = cv.getContext('2d');
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => { loadFile(e.target.files[0]); e.target.value = ''; } });
    const logoFile = h('input', { type: 'file', accept: 'image/png,image/*', hidden: true, onchange: (e) => loadLogo(e.target.files[0]) });
    undoBtns = [ib('undo', 'Deshacer', undo), ib('redo', 'Rehacer', redo)];
    counter = h('span', { class: 'sx-count' });
    quick = h('div', { class: 'sx-quick', hidden: true });
    strip = h('div', { class: 'sx-strip', role: 'list' });
    const stage = h('div', { class: 'sx-stage' },
      h('div', { class: 'sx-bar' }, ...undoBtns, counter, h('span', { class: 'sx-sp' }),
        ib('photo', 'Foto', () => file.click(), 'txt'), ib('down', 'Guardar', () => download('image/png', false), 'txt pri')),
      h('div', { class: 'sx-canvas-wrap' }, cv),
      quick,
      h('div', { class: 'sx-strip-wrap' },
        h('div', { class: 'sx-strip-h' }, h('b', { text: 'Carrusel' }), h('span', { class: 'sx-sp' }),
          ib('left', 'Mover a la izquierda', () => moveSlide(-1)), ib('right', 'Mover a la derecha', () => moveSlide(1)),
          ib('dup', 'Duplicar slide', () => addSlide(true)), ib('trash', 'Borrar slide', delSlide)),
        strip));
    const preview = h('div', { class: 'sx-preview' }, stage,
      hint('Toca cualquier texto de la imagen para editarlo · arrastra la foto para encuadrarla · pellizca o usa la rueda para el zoom'),
      file, logoFile);

    const evs = (api.events && api.events()) || [];
    const evSel = h('select', { class: 'sx-in sx-select', onchange: (e) => { const ev = evs[Number(e.target.value)]; if (ev) load(ev); e.target.value = ''; } },
      h('option', { value: '', text: 'Rellenar con una novedad o cifra…' }), evs.map((ev, i) => h('option', { value: i, text: String(ev.titular).slice(0, 80) })));
    wordsBox = h('div', { class: 'sx-words' });
    const stylesBox = h('div', { class: 'sx-styles' });
    const getStyles = () => LS.get('aa.studio.styles', []);
    const drawStyles = () => {
      const L = getStyles();
      stylesBox.replaceChildren(...(L.length ? L.map((st, i) => h('span', { class: 'sx-style' },
        h('button', { type: 'button', class: 'sx-preset', style: { '--a': st.v.acento, '--b': st.v.colTit }, onclick: () => { Object.assign(S, clone(st.v)); logoImgEl = null; measureCache.clear(); loadUsedFonts(); commit(true); syncInputs(); schedule(); drawThumbs(); toast('Estilo aplicado: ' + st.n); } }, h('i'), st.n),
        h('button', { type: 'button', class: 'sx-style-x', 'aria-label': 'Borrar estilo ' + st.n, onclick: () => { const l = getStyles(); l.splice(i, 1); LS.set('aa.studio.styles', l); drawStyles(); } }, '×'))) : [hint('Aún no has guardado ningún estilo.')]));
    };
    const styleName = h('input', { class: 'sx-in', placeholder: 'Nombre del estilo', maxlength: 24 });
    const fill = (label, fn) => h('button', { class: 'sx-btn', type: 'button', onclick: fn, text: label });

    const sections = [
      h('div', { class: 'sx-sec', 'data-sec': 'plantilla' },
        group('Plantilla', h('div', { class: 'sx-tpls' }, Object.entries(TPL).map(([k, l]) => h('button', { type: 'button', class: 'sx-tpl', 'data-seg': 'plantilla', 'data-v': k, onclick: () => set('plantilla', k) }, h('i', { class: 'sx-tpl-ic ' + k }), h('span', { text: l }))))),
        group('Formato', seg('formato', Object.fromEntries(Object.entries(FORMATS).map(([k, v]) => [k, v[2]])))),
        group('Contenido con datos reales', evSel,
          h('div', { 'data-tpl': 'top5' }, fill('Rellenar con lo más escuchado hoy', () => { const L = api.top5 && api.top5(); if (L) { S.lista = L.lista; S.listaTitulo = L.titulo; commit(); syncInputs(); schedule(); drawWords(); drawThumbs(); } else toast('Aún no hay datos'); })),
          h('div', { 'data-tpl': 'datos' }, fill('Rellenar con las cifras de hoy', () => { const D = api.datos && api.datos(); if (D) { S.datos = D.datos; if (D.titulo) S.titular = D.titulo; commit(); syncInputs(); schedule(); drawThumbs(); } else toast('Aún no hay datos'); }))),
        group('Carrusel automático', hint('Crea varias slides seguidas con las cifras de hoy (titular, top 5, números y récord). Luego puedes editarlas una a una.'), fill('Crear carrusel con los datos de hoy', autoCarousel))),
      h('div', { class: 'sx-sec', 'data-sec': 'textos', hidden: true },
        group('Textos',
          field('Etiqueta', 'etiqueta', 'text', { max: 40 }),
          h('div', { class: 'sx-not', 'data-tpl': 'top5 cita' }, field('Titular · *asteriscos* = color resaltado', 'titular', 'textarea', { rows: 2 })),
          h('div', { 'data-tpl': 'top5' }, field('Título de la lista', 'listaTitulo', 'text', { max: 60 }), field('Filas (una por línea: Canción | cifra)', 'lista', 'textarea', { rows: 5 })),
          h('div', { 'data-tpl': 'datos' }, field('Datos (una por línea: Nombre | cifra, hasta 6)', 'datos', 'textarea', { rows: 4 })),
          h('div', { 'data-tpl': 'cita' }, field('Frase', 'cita', 'textarea', { rows: 3 }), field('Autor', 'autor', 'text', { max: 40 })),
          h('div', { 'data-tpl': 'titular portada versus' }, field('Subtítulo', 'sub', 'text', { max: 70 })),
          h('div', { 'data-tpl': 'noticia' }, field('Texto de la noticia', 'cuerpo', 'textarea', { rows: 5 })),
          h('div', { 'data-tpl': 'charts hito meta' }, field('Número grande', 'numero', 'text', { max: 16 }), field('Texto del número', 'numeroTxt', 'text', { max: 60 })),
          h('div', { 'data-tpl': 'meta' }, field('Progreso hacia el hito', 'progreso', 'range', { min: 0, max: 100, unit: '%' })),
          h('div', { class: 'sx-vs', 'data-tpl': 'versus' }, field('Izquierda', 'vsA', 'text', { max: 20 }), field('Cifra', 'vsANum', 'text', { max: 14 }), field('Derecha', 'vsB', 'text', { max: 20 }), field('Cifra', 'vsBNum', 'text', { max: 14 })),
          field('Todo en mayúsculas', 'mayus', 'check')),
        group('Color por palabra', hint('Toca una o varias palabras y elige su color.'), wordsBox,
          swatches(paintWords),
          h('div', { class: 'sx-row2' }, h('button', { class: 'sx-btn sm', type: 'button', onclick: () => paintWords(''), text: 'Quitar color' }), h('button', { class: 'sx-btn sm', type: 'button', onclick: () => { S.wordColors = {}; selWords.clear(); commit(); drawWords(); schedule(); drawThumbs(); }, text: 'Quitar todos' })))),
      h('div', { class: 'sx-sec', 'data-sec': 'fuentes', hidden: true },
        group('Combinaciones listas', comboRow()),
        group('Fuente de cada texto', buildTypo())),
      h('div', { class: 'sx-sec', 'data-sec': 'colores', hidden: true },
        group('Estilos rápidos', h('div', { class: 'sx-presets' }, PRESETS.map(([n, p]) => h('button', { type: 'button', class: 'sx-preset', style: { '--a': p.acento, '--b': p.neon ? p.neonColor : p.colTit }, onclick: () => { Object.assign(S, p); commit(); syncInputs(); schedule(); drawThumbs(); } }, h('i'), n)))),
        group('Colores', hint('1 · Qué texto'),
          h('div', { class: 'sx-parts' }, Object.entries(PARTS).map(([k, [l]]) => h('button', { type: 'button', class: 'sx-part', 'data-part': k, onclick: () => { S.parte = k; syncInputs(); } }, h('i'), l))),
          hint('2 · Su color'),
          h('div', { class: 'sx-partcols' }, swatches(setPart, SWATCHES, true))),
        group('Neón', field('Brillo neón', 'neon', 'check'),
          h('div', { class: 'sx-neon-opts' },
            h('div', { class: 'sx-checks' }, field('Titular', 'neonTit', 'check'), field('Número', 'neonNum', 'check'), field('Textos pequeños', 'neonPeq', 'check'), field('Marca', 'neonMarca', 'check')),
            field('Intensidad', 'neonFuerza', 'range', { min: 0, max: 100 }),
            swatches((c) => { S.parte = 'neonColor'; setPart(c); }, ['#ff2b3d', '#ff1a1a', '#ff2d95', '#bf5af2', '#0a84ff', '#64d2ff', '#30d158', '#ffd60a', '#ffffff'], true))),
        group('Detalles', field('Puntos de carrusel', 'puntos', 'check'), field('Firma «diseño @tu cuenta»', 'firma', 'check'), field('Guías de recorte de Instagram (no salen en la imagen)', 'guias', 'check')),
        group('Mis estilos', hint('Guarda colores, fuentes, marca y fondo para usarlos en cualquier post.'), stylesBox,
          h('div', { class: 'sx-row2 tight' }, styleName, h('button', { class: 'sx-btn sm pri', type: 'button', text: 'Guardar', onclick: () => {
            const n = styleName.value.trim() || `Estilo ${getStyles().length + 1}`;
            const l = getStyles().filter(x => x.n !== n); l.unshift({ n, v: pick(S, STYLE_KEYS) });
            if (!LS.set('aa.studio.styles', l.slice(0, 12))) toast('No queda espacio para guardar más estilos'); else toast('Estilo guardado: ' + n);
            styleName.value = ''; drawStyles();
          } })))),
      h('div', { class: 'sx-sec', 'data-sec': 'marca', hidden: true },
        group('Tu marca', field('Nombre (sale en cada post)', 'marca', 'text', { max: 30, ph: 'tucuenta' }),
          hint('Icono'), seg('logo', LOGOS, 'sx-wrapseg'),
          h('div', { class: 'sx-logo-up' }, h('button', { class: 'sx-btn', type: 'button', onclick: () => logoFile.click(), text: 'Subir tu logo (PNG con fondo transparente)' })),
          hint('Posición'), seg('marcaPos', { izq: 'Izquierda', centro: 'Centro', der: 'Derecha' }),
          h('button', { class: 'sx-btn', type: 'button', onclick: () => { S.elT = 'marca'; sec = 'fuentes'; syncInputs(); }, text: 'Cambiar la fuente de la marca ›' }))),
      h('div', { class: 'sx-sec', 'data-sec': 'foto', hidden: true },
        group('Foto de esta slide',
          h('div', { class: 'sx-row2' }, h('button', { class: 'sx-btn pri', type: 'button', onclick: () => file.click(), text: 'Subir foto' }),
            api.defaults && api.defaults.imagen ? h('button', { class: 'sx-btn', type: 'button', onclick: () => loadUrl(api.defaults.imagen), text: 'Foto del artista' }) : null),
          (photoBtns = [h('button', { class: 'sx-btn sm', type: 'button', onclick: removePhoto, text: 'Quitar foto' })])[0]),
        group('Fondo', seg('fondo', { foto: 'Foto', desenfoque: 'Desenfocada', degradado: 'Degradado', liso: 'Liso' }),
          h('div', { class: 'sx-fondo-cols sx-row2' }, field('Color 1', 'fondo1', 'color'), field('Color 2', 'fondo2', 'color'))),
        group('Edición de la foto',
          field('Zoom', 'zoom', 'range', { min: 1, max: 3, step: 0.01 }),
          field('Brillo', 'brillo', 'range', { min: 50, max: 150 }),
          field('Contraste', 'contraste', 'range', { min: 50, max: 160 }),
          field('Saturación', 'saturacion', 'range', { min: 0, max: 200 }),
          field('Calidez', 'calidez', 'range', { min: -50, max: 50 }),
          field('Sombra abajo', 'sombra', 'range', { min: 0, max: 100 }),
          field('Viñeta', 'vineta', 'range', { min: 0, max: 100 }),
          field('Grano', 'grano', 'range', { min: 0, max: 60 }),
          h('button', { class: 'sx-btn sm', type: 'button', onclick: () => { Object.assign(S, { zoom: 1, px: 0, py: 0, brillo: DEF.brillo, contraste: DEF.contraste, saturacion: DEF.saturacion, calidez: 0, vineta: DEF.vineta, grano: DEF.grano, sombra: DEF.sombra }); commit(true); syncInputs(); regrade(true); }, text: 'Restablecer edición' }))),
      h('div', { class: 'sx-sec', 'data-sec': 'exportar', hidden: true },
        group('Calidad', seg('calidad', { 1: [0, 0, '1080 px'], 2: [0, 0, '2160 px'], 3: [0, 0, '3240 px'] }), hint('Instagram muestra los posts a 1080 px; exportar a 2160 px da más nitidez al recomprimir.')),
        group('Esta slide', h('div', { class: 'sx-row2' }, h('button', { class: 'sx-btn pri', type: 'button', onclick: () => download('image/png', false), text: 'PNG' }), h('button', { class: 'sx-btn', type: 'button', onclick: () => download('image/jpeg', false), text: 'JPG ligero' }))),
        group('Todo el carrusel', hint('En el móvil se guardan todas de una vez en Fotos; en el ordenador se descargan en un .zip, numeradas en orden.'),
          h('div', { class: 'sx-row2' }, h('button', { class: 'sx-btn pri', type: 'button', onclick: () => download('image/png', true), text: 'Guardar todas (PNG)' }), h('button', { class: 'sx-btn', type: 'button', onclick: () => download('image/jpeg', true), text: 'Todas en JPG' }))))
    ];
    const secBar = h('nav', { class: 'sx-secbar', 'aria-label': 'Secciones del editor' }, Object.entries(SECS).map(([k, l]) => h('button', { type: 'button', 'data-s': k, onclick: () => { sec = k; syncInputs(); secBar.scrollIntoView && root.getBoundingClientRect().top < 0 && controls.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, text: l })));
    const controls = h('div', { class: 'sx-controls' }, secBar, ...sections);
    el.replaceChildren(h('div', { class: 'sx-wrap' }, preview, controls));

    // tocar, arrastrar y pellizcar en la vista previa
    const pts = new Map(); let last = null, pinch0 = null, down = null;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = { x: e.clientX, y: e.clientY };
      down = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), z: S.zoom }; down.moved = true; }
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && pinch0) { const [a, b] = [...pts.values()]; S.zoom = Math.min(3, Math.max(1, pinch0.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch0.d)); syncInputs(); schedule(); return; }
      if (down && !down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) down.moved = true;
      if (!down || !down.moved || !imgOf()) { last = { x: e.clientX, y: e.clientY }; return; }
      const r = cv.getBoundingClientRect(); S.px += (e.clientX - last.x) / r.width; S.py += (e.clientY - last.y) / r.height; last = { x: e.clientX, y: e.clientY }; schedule();
    });
    const endP = (e) => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch0 = null;
      if (down && !down.moved && Date.now() - down.t < 600 && e.type === 'pointerup') tapAt(e);
      else if (down && down.moved) { commit(); drawThumbs(); }
      if (!pts.size) down = null;
    };
    cv.addEventListener('pointerup', endP); cv.addEventListener('pointercancel', endP);
    cv.addEventListener('wheel', (e) => { if (!imgOf()) return; e.preventDefault(); S.zoom = Math.min(3, Math.max(1, S.zoom * (e.deltaY < 0 ? 1.05 : 0.95))); syncInputs(); schedule(); clearTimeout(histTimer); histTimer = setTimeout(() => commit(true), 400); }, { passive: false });
    cv.addEventListener('dragover', (e) => e.preventDefault());
    cv.addEventListener('drop', (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });
    if (!window.__sxKeys) {
      window.__sxKeys = true;
      document.addEventListener('paste', (e) => { if (!root || !root.isConnected) return; const f = [...((e.clipboardData || {}).files || [])].find(x => /^image\//.test(x.type)); if (f) loadFile(f); });
      document.addEventListener('keydown', (e) => {
        if (!root || !root.isConnected) return;
        const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
        else if (e.key === 'Escape' && quick && !quick.hidden && !document.querySelector('.sx-modal')) closeQuick();
      });
    }
    // en el móvil, al bajar a los controles la vista previa se hace compacta (sigue visible arriba)
    const wrapEl = el.querySelector('.sx-wrap');
    const onScroll = () => { if (!wrapEl.isConnected) { removeEventListener('scroll', onScroll); return; } const small = innerWidth < 960 && controls.getBoundingClientRect().top < innerHeight * 0.62; if (small !== wrapEl.classList.contains('compact')) wrapEl.classList.toggle('compact', small); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    // escribir en el móvil: la vista previa se encoge para que se vea el teclado
    root.addEventListener('focusin', (e) => { if (e.target.matches('.sx-in')) root.classList.add('typing'); });
    root.addEventListener('focusout', () => setTimeout(() => { if (!root.contains(document.activeElement) || !document.activeElement.matches('.sx-in')) root.classList.remove('typing'); }, 60));

    syncInputs(); drawStyles(); drawStrip();
    hist = [snapshot()]; hi = 0; syncUndo();
    schedule();
    restoreUploaded().then(loadUsedFonts);
    loadUsedFonts();
    slides.forEach(restorePhoto);
    if (api.pre) load(api.pre);
  }
  function applyPre(o, pre) {
    if (pre.titular) { o.titular = pre.titular; o.wordColors = {}; }
    if (pre.plantilla && TPL[pre.plantilla]) o.plantilla = pre.plantilla;
    if (pre.etiqueta != null) o.etiqueta = pre.etiqueta;
    if (pre.texto) o.cuerpo = pre.texto;
    if (pre.numero) { o.numero = pre.numero; if (!pre.plantilla && (!o.plantilla || o.plantilla === 'titular' || o.plantilla === 'noticia')) o.plantilla = 'charts'; }
    if (pre.sub) o.numeroTxt = pre.sub;
    if (pre.numeroTxt) o.numeroTxt = pre.numeroTxt;
    if (pre.subtitulo != null) o.sub = pre.subtitulo;
    if (pre.lista) { o.lista = pre.lista; if (pre.listaTitulo) o.listaTitulo = pre.listaTitulo; }
    if (pre.datos) o.datos = pre.datos;
    if (pre.progreso != null) o.progreso = Math.max(0, Math.min(100, Math.round(pre.progreso)));
    ['vsA', 'vsANum', 'vsB', 'vsBNum', 'cita', 'autor'].forEach(k => { if (pre[k] != null) o[k] = pre[k]; });
    return o;
  }
  function load(pre) {
    if (!S || !pre) return;
    applyPre(S, pre);
    if (pre.formato && FORMATS[pre.formato]) S.formato = pre.formato;
    selWords.clear(); closeQuick();
    commit(true); syncInputs(); schedule(); drawStrip();
    if (pre.imagen) loadUrl(pre.imagen);
    if (root) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return { mount, load };
})();
