#!/usr/bin/env python3
"""
Actualiza data/data.json con los datos públicos del artista configurado en config.json.

Se ejecuta en GitHub Actions (3 veces al día y cuando pulsas «Actualizar» en la web).
Cada fuente es independiente: si una falla, se conserva su último dato (con su fecha)
y el fallo queda anotado en data["estado"]["fallos"]. Nunca se inventa una cifra.

Opcionales (secretos del repositorio):
  YT_API_KEY              -> YouTube Data API v3: vistas/likes/comentarios exactos y fechas de publicación
  SPOTIFY_CLIENT_ID/SECRET -> API de Spotify: seguidores exactos y nuevos lanzamientos con sus artistas
"""
import concurrent.futures as cf
import copy
import email.utils
import html as htmlmod
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import datetime as dt
import json
import os
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data' / 'data.json'
NOW = dt.datetime.now(dt.timezone.utc)
HOY = NOW.strftime('%Y-%m-%d')
# RAPIDO: '1' = rápida (cada 10 min), '0' = completa, 'auto' = completa si la última completa fue hace 5 h o más; si no, rápida
RAPIDO = os.environ.get('RAPIDO') == '1'

# todo lo del artista sale de config.json (así la misma web sirve para cualquier artista)
CFG = json.loads((ROOT / 'config.json').read_text(encoding='utf8'))
ART = CFG['artista']
SP_ARTIST = ART['spotify']
YT_CHANNEL = ART['youtube_canal']
YT_HANDLE = ART.get('youtube_handle') or ''
APPLE_ARTIST = ART['apple']
DEEZER_ARTIST = ART.get('deezer') or ''
IG_USER = ART.get('instagram') or ''
TT_USER = ART.get('tiktok') or ''
CM_ID = ART.get('chartmetric')
ARTISTA = ART['nombre']
BUSCAR = ART.get('buscar') or ARTISTA
NAME_RE = re.compile(ART['alias_regex'], re.I)

SPOTIFY_CC = ['global', 'es', 'do', 'cl', 've', 'pa', 'co', 'cr', 'us', 'mx', 'pe', 'ec', 'ni', 'hn', 'sv', 'gt', 'py', 'uy', 'bo', 'ar', 'it', 'ca', 'pt', 'ch',
              'br', 'fr', 'de', 'nl', 'be', 'at', 'gb', 'ie', 'lu', 'pl', 'se', 'dk', 'no', 'fi', 'gr']
APPLE_CC = ['us', 'es', 'do', 'cl', 'co', 'mx', 'pe', 'ec', 'cr', 'pa', 'gt', 'hn', 'ar', 'it', 've', 'bo', 'ni', 'uk', 'fr', 'de', 'nl', 'at', 'be']
SHAZAM_CC = ['ww', 'us', 'es', 'co', 'cl', 'mx', 'ar', 'cr', 'ec', 'pe', 'it', 'fr', 'de', 'nl', 'uk']
YT_TREND_CC = ['es', 'pr', 'us', 'uy', 'cl', 'co', 'mx', 'pa', 'do', 'ar', 'bo', 'cr', 'ec', 'sv', 'gt', 'hn', 'ni', 'py', 'pe', 'pt', 'it', 'fr', 'de', 'nl', 'be', 'at', 'ch', 'uk']
# listas oficiales de YouTube (top canciones diario por país)
YT_CHART_CC = ['es', 'pr', 'us', 'mx', 'co', 'ar', 'cl', 'pe', 'ec', 'do', 've', 'gt', 'hn', 'sv', 'ni', 'cr', 'pa', 'py', 'uy', 'bo', 'it', 'pt', 'fr', 'de', 'nl', 'be', 'ch', 'at', 'uk']
DEEZER_CC = ['ww', 'es', 'mx', 'co', 'cl', 'ar', 'pe', 'ec', 'cr', 'gt', 'hn', 'sv', 'bo', 'us', 'fr', 'de', 'it', 'be', 'nl', 'at', 'uk']
ITUNES_CC = ['es', 'us', 'mx', 'co', 'ar', 'cl', 'pe', 'do', 'ec', 'cr', 'pa', 'gt', 'hn', 'ni', 'sv', 'py', 'bo', 've', 'it', 'fr', 'de', 'uk']
# playlists oficiales que se revisan siempre (puedes añadir más desde la web: variable PLAYLISTS_EXTRA)
PLAYLISTS = [
    ('FRONTEO', 'https://open.spotify.com/playlist/37i9dQZF1DX6jW9mPgBGv2'),
    ('Viva Latino', 'https://open.spotify.com/playlist/37i9dQZF1DX10zKzsJ2jva'),
    ('Baila Reggaeton', 'https://open.spotify.com/playlist/37i9dQZF1DWY7IeIP1cdjF'),
    ('Mansión Reggaetón', 'https://open.spotify.com/playlist/37i9dQZF1DWZjqjZMudx9T'),
    ('TRAPando', 'https://open.spotify.com/playlist/37i9dQZF1DX6PsvyweoPP8'),
    ('Trap viejito', 'https://open.spotify.com/playlist/37i9dQZF1DX0JcH25923HT'),
    ('Novedades Viernes España', 'https://open.spotify.com/playlist/37i9dQZF1DX6PYajiT4pAf'),
    ('Novedades Viernes Andes', 'https://open.spotify.com/playlist/37i9dQZF1DX04JcEjRGskm'),
    ('Éxitos España', 'https://open.spotify.com/playlist/37i9dQZF1DXaxEKcoCdWHD'),
    ('CALLE', 'https://music.apple.com/us/playlist/tra-trap/pl.de229aec80e24805a661755900dff6e6'),
    ('Trap Kingz', 'https://music.apple.com/us/playlist/trap-kingz/pl.5030c32a73e9459d82fae6f7b046d3ec'),
    ('¡Dale Play!', 'https://music.apple.com/us/playlist/dale-play/pl.4b364b8b182f4115acbf6deb83bd5222'),
    ('Dale Reggaetón', 'https://music.apple.com/us/playlist/dale-reggaet%C3%B3n/pl.aa8915d9821d4bb3bf3b07c8301955c6'),
]
PAIS = {'global': 'Global', 'ww': 'Mundial', 'es': 'España', 'do': 'Rep. Dominicana', 'cl': 'Chile', 've': 'Venezuela', 'pa': 'Panamá', 'co': 'Colombia',
        'cr': 'Costa Rica', 'us': 'EE. UU.', 'mx': 'México', 'pe': 'Perú', 'ec': 'Ecuador', 'ni': 'Nicaragua', 'hn': 'Honduras', 'sv': 'El Salvador',
        'gt': 'Guatemala', 'py': 'Paraguay', 'uy': 'Uruguay', 'bo': 'Bolivia', 'ar': 'Argentina', 'it': 'Italia', 'ca': 'Canadá', 'pt': 'Portugal',
        'ch': 'Suiza', 'pr': 'Puerto Rico', 'br': 'Brasil', 'fr': 'Francia', 'de': 'Alemania', 'nl': 'Países Bajos', 'be': 'Bélgica', 'at': 'Austria',
        'gb': 'Reino Unido', 'uk': 'Reino Unido', 'ie': 'Irlanda', 'lu': 'Luxemburgo', 'pl': 'Polonia', 'se': 'Suecia', 'dk': 'Dinamarca', 'no': 'Noruega',
        'fi': 'Finlandia', 'gr': 'Grecia', 'ad': 'Andorra'}


def plat_of(c):
    """Nombre corto de la lista para comparar (las listas oficiales de YouTube van aparte de las tendencias)."""
    return 'YouTube Charts' if c.get('plataforma') == 'YouTube' and str(c.get('lista') or '').startswith('Top canciones') else c.get('plataforma')

S = requests.Session()
S.headers.update({'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
                  'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'})
FALLOS, HECHO = [], []


T0 = time.time()


def log(msg):
    print((f'[{int(time.time() - T0):>4}s] ' if msg and not msg.startswith(' ') else '') + msg, flush=True)


def fallo(fuente, err):
    msg = f'{fuente}: {err}'
    FALLOS.append(msg)
    log('  ✗ ' + msg)


def get(url, *, as_json=False, headers=None, params=None, tries=3):
    for i in range(tries):
        try:
            r = S.get(url, timeout=30, headers=headers, params=params)
            if r.status_code == 200:
                if as_json:
                    return r.json()
                try:
                    return r.content.decode('utf-8')
                except UnicodeDecodeError:
                    return r.text
            if r.status_code in (403, 404, 410):
                raise RuntimeError(f'HTTP {r.status_code}')
            if r.status_code == 429 and i < tries - 1:  # «demasiadas peticiones»: se espera lo que pide el servidor (máx. 20 s)
                try:
                    time.sleep(min(20, max(3, int(r.headers.get('Retry-After') or 5))))
                except ValueError:
                    time.sleep(5)
            raise RuntimeError(f'HTTP {r.status_code}')
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(str(err))


def to_int(s):
    if s is None:
        return None
    if isinstance(s, (int, float)):
        return int(s)
    d = re.sub(r'[^\d]', '', str(s))
    return int(d) if d else None


def compact(s):
    """'7M' -> 7000000, '1.16M' -> 1160000, '20.6K' -> 20600, '1,2 M' -> 1200000"""
    if s is None:
        return None
    s = str(s).strip().replace(' ', ' ')
    m = re.match(r'^([\d.,]+)\s*([KMB]|mil|M)?', s, re.I)
    if not m:
        return None
    n, suf = m.group(1), (m.group(2) or '').upper()
    if suf:
        n = n.replace(',', '.') if n.count(',') == 1 and '.' not in n else n.replace(',', '')
        mult = {'K': 1e3, 'MIL': 1e3, 'M': 1e6, 'B': 1e9}[suf]
        return int(round(float(n) * mult))
    return to_int(n)


def norm(t):
    t = str(t or '').lower().replace('’', "'")
    t = re.sub(r'\s*[\(\[](with|feat\.?|ft\.?|w/)[^\)\]]*[\)\]]', '', t)
    t = re.sub(r'\s*[\(\[]remix[\)\]]', ' - remix', t)
    t = re.sub(r'\s*\(dembow\)', '', t)
    t = re.sub(r'\s*-\s*(single|ep)$', '', t)
    return re.sub(r'\s+', ' ', t).strip()


def base(t):
    return str(t or '').lower().split(' (')[0].strip()


def slug(t):
    return re.sub(r'[^a-z0-9]+', '-', norm(t).replace('$', 's')).strip('-') or 'x'


def tables(html):
    """Devuelve [(cabeceras, filas)] donde cada fila es [(texto, href)]"""
    soup = BeautifulSoup(html, 'lxml')
    out = []
    for tb in soup.find_all('table'):
        heads = [th.get_text(' ', strip=True) for th in tb.find_all('th')]
        rows = []
        for tr in tb.find_all('tr'):
            tds = tr.find_all('td')
            if not tds:
                continue
            rows.append([(td.get_text(' ', strip=True), (td.find('a') or {}).get('href') if td.find('a') else None) for td in tds])
        out.append((heads, rows))
    return out, soup


def col(heads, *names):
    for i, h in enumerate(heads):
        if any(n.lower() == h.lower() or n.lower() in h.lower() for n in names):
            return i
    return None


# ---------------------------------------------------------------- Spotify (kworb)
def kworb_creditos(track_id):
    """Artistas acreditados de un tema (cabecera «Artists:» de su página en kworb)."""
    html = get(f'https://kworb.net/spotify/track/{track_id}.html', tries=2)
    i = html.find('Artists')
    zona = html[i:i + 3000] if i >= 0 else html[:30000]
    names = []
    for m in re.finditer(r'<a[^>]+href="[^"]*spotify/artist/[\w]+\.html"[^>]*>([^<]+)</a>', zona):
        n = htmlmod.unescape(m.group(1)).strip()
        if n and n not in names:
            names.append(n)
    if not names:
        raise ValueError('sin artistas')
    return names


def spotify_creditos(track_id):
    """Artistas del tema según su página pública de Spotify (título «… - song and lyrics by A, B | Spotify»)."""
    html = get(f'https://open.spotify.com/track/{track_id}', tries=2, headers={'Accept-Language': 'en'})
    m = re.search(r'<title>[^<]*?by ([^<|]+?)\s*\|\s*Spotify</title>', html) or re.search(r'<meta[^>]+(?:og:description|description)"\s+content="([^"·]+?)\s*·\s*(?:Song|Canción)', html)
    if not m:
        raise ValueError('sin artistas')
    return [htmlmod.unescape(n).strip() for n in m.group(1).split(',') if n.strip()]


def kworb_songs(artist_id):
    html = get(f'https://kworb.net/spotify/artist/{artist_id}_songs.html')
    tbs, soup = tables(html)
    m = re.search(r'Last updated:\s*(\d{4}/\d{2}/\d{2})', soup.get_text(' '))
    fecha = m.group(1).replace('/', '-') if m else HOY
    songs, resumen = [], {}
    for heads, rows in tbs:
        if heads and col(heads, 'Song Title', 'Title') is not None and col(heads, 'Streams') is not None and len(rows) > 2:
            it, ist, idl = col(heads, 'Song Title', 'Title'), col(heads, 'Streams'), col(heads, 'Daily')
            for r in rows:
                title, href = r[it]
                tid = re.search(r'track/([A-Za-z0-9]{22})', href or '')
                songs.append({'titulo': title.lstrip('* ').strip(), 'colab': title.strip().startswith('*'), 'total': to_int(r[ist][0]),
                              'diarios': to_int(r[idl][0]) if idl is not None and idl < len(r) else None, 'id': tid.group(1) if tid else None})
        elif rows and rows[0] and rows[0][0][0] in ('Streams', 'Daily', 'Tracks'):
            for r in rows:
                resumen[r[0][0]] = [to_int(c[0]) for c in r[1:]]
    return fecha, songs, resumen


def kworb_albums():
    html = get(f'https://kworb.net/spotify/artist/{SP_ARTIST}_albums.html')
    tbs, soup = tables(html)
    m = re.search(r'Last updated:\s*(\d{4}/\d{2}/\d{2})', soup.get_text(' '))
    fecha = m.group(1).replace('/', '-') if m else HOY
    out = []
    for heads, rows in tbs:
        if col(heads, 'Streams') is not None and len(rows) >= 1 and col(heads, 'Album', 'Title') is not None:
            it, ist, idl = col(heads, 'Album', 'Title'), col(heads, 'Streams'), col(heads, 'Daily')
            for r in rows:
                out.append({'album': r[it][0].lstrip('* '), 'spotify_streams': to_int(r[ist][0]), 'spotify_diarios': to_int(r[idl][0]) if idl is not None and idl < len(r) else None})
    return fecha, out


def kworb_peaks(artist_id=SP_ARTIST):
    html = get(f'https://kworb.net/spotify/artist/{artist_id}.html')
    tbs, _ = tables(html)
    out = []
    for heads, rows in tbs:
        if col(heads, 'Peak Date') is None:
            continue
        idate, it = col(heads, 'Peak Date'), col(heads, 'Title')
        ist = col(heads, 'Streams')
        for r in rows:
            for j in range((ist or it) + 1, min(len(heads), len(r))):
                v = r[j][0]
                if v and v != '--' and to_int(v):
                    code = heads[j].upper()
                    out.append({'cancion': r[it][0].lstrip('* '), 'codigo': code if code != 'GLOBAL' else 'WW', 'pais': PAIS.get(heads[j].lower(), heads[j]),
                                'pico': to_int(v), 'fecha': r[idate][0].replace('/', '-')})
    return out


def chart_scan(url, plataforma, pais, codigo, lista, date_re=r'(\d{4}/\d{2}/\d{2})', table_index=None):
    html = get(url)
    tbs, soup = tables(html)
    txt = soup.get_text(' ')
    m = re.search(date_re, txt)
    fecha = m.group(1).replace('/', '-') if m else None
    cand = [t for t in tbs if len(t[1]) >= 5]
    if table_index is not None:
        cand = cand[table_index:table_index + 1] if len(cand) > table_index else []
    rows_out, revisado = [], 0
    for heads, rows in cand[:1]:
        ia = col(heads, 'Artist and Title', 'Artist', 'Title', 'Video', 'Track')
        ip, ic = col(heads, 'Pos'), col(heads, 'P+')
        revisado = len(rows)
        for i, r in enumerate(rows):
            line = r[ia][0] if ia is not None and ia < len(r) else ' '.join(c[0] for c in r)
            if NAME_RE.search(line):
                pos = to_int(r[ip][0]) if ip is not None else i + 1
                cambio = r[ic][0] if ic is not None and ic < len(r) else None
                title = line.split(' - ', 1)[1] if ' - ' in line else line
                artists = line.split(' - ', 1)[0] if ' - ' in line else ''
                rows_out.append({'cancion': f'{title} ({artists})' if artists and '(' not in title else title, 'posicion': pos,
                                 'cambio': cambio if cambio and cambio not in ('=', '') else None})
    base_row = {'plataforma': plataforma, 'pais': pais, 'codigo': codigo, 'lista': lista, 'fecha_lista': fecha, 'revisado_hasta': revisado or None, 'consultado': HOY}
    if not rows_out:
        return [dict(base_row, cancion=None, posicion=None, cambio=None, estado='Fuera')]
    return [dict(base_row, **r, estado='Dentro') for r in rows_out]


# ---------------------------------------------------------------- YouTube
def ryd(video_id):
    j = get(f'https://returnyoutubedislikeapi.com/votes?videoId={video_id}', as_json=True, tries=2)
    return {'vistas': to_int(j.get('viewCount')), 'likes': to_int(j.get('likes'))}


def yt_watch(video_id):
    """Vistas exactas que muestra YouTube en la página del vídeo (sin clave)."""
    html = get(f'https://www.youtube.com/watch?v={video_id}&gl=ES&hl=es', headers={'Cookie': 'CONSENT=YES+1; SOCS=CAI', 'Accept-Language': 'es-ES,es;q=0.9'}, tries=2)
    m = re.search(r'"videoDetails":\{.*?"viewCount":"(\d+)"', html, re.S) or re.search(r'"viewCount":\{"videoViewCountRenderer":\{"viewCount":\{"simpleText":"([\d.,\s]+)', html)
    if not m:
        raise ValueError('sin contador')
    v = int(re.sub(r'\D', '', m.group(1)))
    lk = re.search(r'"likeCount":"?(\d+)', html)
    out = {'vistas': v, 'likes': int(lk.group(1)) if lk else None}
    tt = re.search(r'"videoDetails":\{.*?"title":"((?:[^"\\]|\\.)*)"', html, re.S)
    au = re.search(r'"videoDetails":\{.*?"author":"((?:[^"\\]|\\.)*)"', html, re.S)
    pd = re.search(r'"(?:publishDate|uploadDate)":"(\d{4}-\d{2}-\d{2})', html)
    if tt:
        out['titulo'] = json.loads('"' + tt.group(1) + '"')
    if au:
        out['canal'] = json.loads('"' + au.group(1) + '"')
    io = html.find('"videoOwnerRenderer"')
    if io >= 0:
        seg = html[io:io + 4000]
        out['verificado'] = 'artista' if 'BADGE_STYLE_TYPE_VERIFIED_ARTIST' in seg else ('verificado' if 'BADGE_STYLE_TYPE_VERIFIED' in seg else False)
    ci = re.search(r'"videoDetails":\{.*?"channelId":"(UC[\w-]{22})"', html, re.S)
    if ci:
        out['canal_id'] = ci.group(1)
    if pd:
        out['publicado'] = pd.group(1)
    # insignia en directo de YouTube (España): «N.º 29 en el top de vídeos musicales» / «#29 en tendencias para música»
    bd = re.search(r'(?:#|N\.?\s?º\s?)(\d{1,3})\s+(?:en|on|in)\s+(?:el\s+)?(?:top de v[ií]deos musicales|tendencias(?:\s+(?:para|de)\s+m[uú]sica)?|trending(?:\s+for\s+music)?)', html, re.I)
    out['tendencia_es'] = {'puesto': int(bd.group(1)), 'fecha': HOY, 'hora': NOW.strftime('%H:%M')} if bd else {}
    return out


BADGE_CC = list(dict.fromkeys(YT_TREND_CC + ['ve', 'ca', 'br', 'ie', 'se', 'pl', 'gr']))
BADGE_RE = re.compile(r'(?:#|N\.?\s?º\s?)(\d{1,3})\s+(?:en|on|in)\s+(?:el\s+)?(?:top de v[ií]deos musicales|tendencias(?:\s+(?:para|de)\s+m[uú]sica)?|trending(?:\s+for\s+music)?)', re.I)


def yt_badge(video_id, cc):
    """Puesto en tendencias de música que YouTube muestra AHORA MISMO en ese país (insignia del vídeo). None si no sale."""
    gl = 'GB' if cc == 'uk' else cc.upper()
    html = get(f'https://www.youtube.com/watch?v={video_id}&gl={gl}&hl=es', headers={'Cookie': 'CONSENT=YES+1; SOCS=CAI', 'Accept-Language': 'es-ES,es;q=0.9'}, tries=1)
    if '"videoDetails"' not in html:
        raise ValueError('página bloqueada')
    m = BADGE_RE.search(html)
    return int(m.group(1)) if m else None


def spotify_playcount(track_id):
    """Reproducciones que muestra la página pública del tema en Spotify (la misma cifra que ves en open.spotify.com)."""
    html = get(f'https://open.spotify.com/track/{track_id}', tries=2, headers={'Accept-Language': 'es-ES,es;q=0.9'})
    m = re.search(r'<script[^>]+id="initialState"[^>]*>([^<]+)</script>', html)
    if m:
        import base64
        try:
            raw = base64.b64decode(m.group(1) + '===').decode('utf8', 'ignore')
            mm = re.search(r'"playcount"\s*:\s*"?(\d+)', raw)
            if mm:
                return int(mm.group(1))
        except Exception:  # noqa: BLE001
            pass
    mm = re.search(r'"playcount"\s*:\s*"?(\d+)', html, re.I)
    if mm:
        return int(mm.group(1))
    try:  # reserva: el reproductor incrustado de Spotify
        emb = get(f'https://open.spotify.com/embed/track/{track_id}', tries=1)
        mm = re.search(r'"playcount"\s*:\s*"?(\d+)', emb, re.I)
        if mm:
            return int(mm.group(1))
    except Exception:  # noqa: BLE001
        pass
    raise ValueError('la página no muestra reproducciones')


def spotify_playcounts_browser(track_ids, limite_s=240):
    """Abre cada tema en un navegador real (como tú en open.spotify.com) y lee el contador de reproducciones.
    Solo si el workflow instaló Playwright; si no, devuelve {} y se usa kworb."""
    try:
        from playwright.sync_api import sync_playwright
    except Exception:  # noqa: BLE001
        return {}
    out, t0 = {}, time.time()
    with sync_playwright() as pw:
        br = pw.chromium.launch(args=['--disable-blink-features=AutomationControlled'])
        ctx = br.new_context(locale='es-ES', user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
                             viewport={'width': 1280, 'height': 900})
        pg = ctx.new_page()
        fallos = 0
        for tid in track_ids:
            if time.time() - t0 > limite_s or fallos >= 5:
                break
            try:
                pg.goto(f'https://open.spotify.com/track/{tid}', wait_until='domcontentloaded', timeout=25000)
                el = pg.wait_for_selector('[data-testid="playcount"]', timeout=12000)
                n = int(re.sub(r'\D', '', el.inner_text() or ''))
                if n:
                    out[tid] = n
                    fallos = 0
            except Exception:  # noqa: BLE001
                fallos += 1
        br.close()
    return out


def yt_api(key, video_ids):
    out = {}
    for i in range(0, len(video_ids), 50):
        j = get('https://www.googleapis.com/youtube/v3/videos', as_json=True,
                params={'part': 'statistics,snippet', 'id': ','.join(video_ids[i:i + 50]), 'key': key})
        for it in j.get('items', []):
            st, sn = it.get('statistics', {}), it.get('snippet', {})
            out[it['id']] = {'vistas': to_int(st.get('viewCount')), 'likes': to_int(st.get('likeCount')), 'comentarios': to_int(st.get('commentCount')),
                             'publicado': (sn.get('publishedAt') or '')[:10] or None, 'canal': sn.get('channelTitle'), 'canal_id': sn.get('channelId'), 'titulo': sn.get('title')}
    return out


def yt_channel_api(key):
    j = get('https://www.googleapis.com/youtube/v3/channels', as_json=True, params={'part': 'statistics,contentDetails', 'id': YT_CHANNEL, 'key': key})
    it = j['items'][0]
    st = it['statistics']
    up = it['contentDetails']['relatedPlaylists']['uploads']
    vids = []
    pl = get('https://www.googleapis.com/youtube/v3/playlistItems', as_json=True, params={'part': 'snippet', 'playlistId': up, 'maxResults': 50, 'key': key})
    for x in pl.get('items', []):
        sn = x['snippet']
        vids.append({'video_id': sn['resourceId']['videoId'], 'titulo': sn['title'], 'publicado': sn['publishedAt'][:10]})
    return {'suscriptores': to_int(st.get('subscriberCount')), 'vistas': to_int(st.get('viewCount')), 'videos': to_int(st.get('videoCount'))}, vids


def yt_search_api(key, query):
    j = get('https://www.googleapis.com/youtube/v3/search', as_json=True, params={'part': 'snippet', 'q': query, 'type': 'video', 'maxResults': 10, 'key': key})
    return [{'video_id': x['id']['videoId'], 'titulo': x['snippet']['title'], 'canal': x['snippet']['channelTitle'], 'canal_id': x['snippet'].get('channelId'),
             'verificado': None, 'publicado': x['snippet']['publishedAt'][:10]} for x in j.get('items', [])]


def yt_rss():
    xml = get(f'https://www.youtube.com/feeds/videos.xml?channel_id={YT_CHANNEL}')
    soup = BeautifulSoup(xml, 'xml')
    out = []
    for e in soup.find_all('entry'):
        vid = e.find('yt:videoId') or e.find('videoId')
        st = e.find('media:statistics') or e.find('statistics')
        out.append({'video_id': vid.text if vid else None, 'titulo': e.find('title').text, 'publicado': e.find('published').text[:10],
                    'vistas': to_int(st.get('views')) if st else None})
    return out


def fix_moji(t):
    """Arregla tildes rotas tipo 'ReggaetÃ³n' -> 'Reggaetón'."""
    if not isinstance(t, str) or not re.search('[ÃÂâ][\x80-\xbf€™œ\x9d‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜š›žŸ¡-¿]', t):
        return t
    for enc in ('cp1252', 'latin-1'):
        try:
            return t.encode(enc).decode('utf-8')
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue
    return t


def fix_all(o):
    if isinstance(o, dict):
        return {k: fix_all(v) for k, v in o.items()}
    if isinstance(o, list):
        return [fix_all(v) for v in o]
    return fix_moji(o)


def kworb_yt_artist():
    """Todos los vídeos del artista en kworb (vistas totales y de ayer). Página: kworb.net/youtube/artist/<handle>.html"""
    slug = (YT_HANDLE or ARTISTA).lower().replace(' ', '')
    soup = BeautifulSoup(get(f'https://kworb.net/youtube/artist/{slug}.html'), 'lxml')
    out = []
    for tr in soup.select('table tr'):
        tds = tr.find_all('td')
        a = tr.find('a', href=True)
        if len(tds) < 3 or not a:
            continue
        m = re.search(r'video/([\w-]{11})\.html|[?&]v=([\w-]{11})', a['href'])
        if not m:
            continue
        vid = m.group(1) or m.group(2)
        nums = [to_int(td.get_text()) for td in tds[1:]]
        pub = re.search(r'(\d{4})/(\d{2})', tr.get_text(' '))
        out.append({'video_id': vid, 'titulo': a.get_text(' ', strip=True).lstrip('*').strip(), 'vistas': nums[0] if nums else None,
                    'ayer': nums[1] if len(nums) > 1 else None, 'publicado': f'{pub.group(1)}-{pub.group(2)}-01' if pub else None})
    return out


def _fold(t):
    import unicodedata
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', unicodedata.normalize('NFD', str(t or '').lower()).encode('ascii', 'ignore').decode())).strip()


def yt_match_score(song_title, video_title):
    """Cuánto se parece el título de un vídeo al de la canción (0 = nada)."""
    b = _fold(re.split(r'\s+\((?:with|feat|ft|con)\b', song_title, flags=re.I)[0])
    if len(b) < 2:
        return 0
    vt = re.sub(r'\[.*?\]|\((?:[^)]*\b(?:video|official|oficial|audio|lyric|letra|visualizer|en vivo|live)\b[^)]*)\)', ' ', video_title, flags=re.I)
    parts = [_fold(re.sub(r'\b(?:ft|feat|featuring|prod)\b.*$', '', x, flags=re.I)) for x in re.split(r'\s[-–|]\s', vt)]
    if b in parts:
        return 3
    if len(b) >= 4:
        import difflib
        if any(difflib.SequenceMatcher(None, b, p).ratio() >= 0.85 for p in parts if p):
            return 2
    full = ' ' + _fold(vt) + ' '
    if len(b) >= 5 and f' {b} ' in full:
        return 2
    return 0


def socialblade(url, patterns):
    html = get(url)
    txt = re.sub(r'\s+', ' ', BeautifulSoup(html, 'lxml').get_text(' '))
    out = {}
    for k, pat in patterns.items():
        m = re.search(pat, txt, re.I)
        if m:
            out[k] = compact(m.group(1))
    return out


# ---------------------------------------------------------------- otras
def spotify_listeners():
    """Oyentes mensuales exactos desde kworb (ranking de oyentes); si no, la página de Spotify (redondeada)."""
    try:
        tbs, _ = tables(get('https://kworb.net/spotify/listeners.html'))
        for heads, rows in tbs:
            il, idl = col(heads, 'Listeners'), col(heads, 'Daily')
            if il is None:
                continue
            for r in rows:
                if any(SP_ARTIST in (href or '') for _, href in r):
                    return to_int(r[il][0]), False, (to_int(r[idl][0]) * (-1 if r[idl][0].strip().startswith('-') else 1) if idl is not None and r[idl][0].strip() not in ('', '--') else None)
    except Exception:  # noqa: BLE001
        pass
    html = get(f'https://open.spotify.com/artist/{SP_ARTIST}')
    m = re.search(r'"monthlyListeners"\s*:\s*(\d+)', html) or re.search(r'([\d.,]+\s*[KMB]?)\s+monthly listeners', html, re.I)
    if not m:
        raise RuntimeError('sin cifra de oyentes (ni en kworb ni en Spotify)')
    raw = m.group(1)
    return compact(raw), not raw.replace(',', '').replace('.', '').strip().isdigit(), None


def youtube_about():
    """Suscriptores, vistas y vídeos del canal leyendo su página «Más información»."""
    html = get(f'https://www.youtube.com/@{YT_HANDLE}/about', headers={'Cookie': 'CONSENT=YES+1; SOCS=CAI'})
    out = {}
    for k, pats in {'suscriptores': [r'"subscriberCountText"\s*:\s*"([\d.,]+\s*[KMB]?)\s*subscribers', r'([\d.,]+\s*[KMB]?)\s*subscribers'],
                    'vistas': [r'"viewCountText"\s*:\s*"([\d,]+)\s*views', r'([\d,]{7,})\s*views'],
                    'videos': [r'"videoCountText"\s*:\s*"([\d,]+)\s*videos', r'([\d,]+)\s*videos']}.items():
        for pat in pats:
            m = re.search(pat, html, re.I)
            if m:
                out[k] = compact(m.group(1))
                break
    if not out.get('vistas') and not out.get('suscriptores'):
        raise RuntimeError('YouTube no devolvió las cifras del canal')
    return out


def spotify_api():
    cid, sec = os.environ.get('SPOTIFY_CLIENT_ID'), os.environ.get('SPOTIFY_CLIENT_SECRET')
    if not (cid and sec):
        return None
    tok = S.post('https://accounts.spotify.com/api/token', data={'grant_type': 'client_credentials'}, auth=(cid, sec), timeout=30).json()['access_token']
    H = {'Authorization': 'Bearer ' + tok}
    art = get(f'https://api.spotify.com/v1/artists/{SP_ARTIST}', as_json=True, headers=H)
    rel = get(f'https://api.spotify.com/v1/artists/{SP_ARTIST}/albums', as_json=True, headers=H, params={'include_groups': 'album,single,appears_on', 'limit': 50, 'market': 'US'})
    return {'seguidores': (art.get('followers') or {}).get('total'), 'popularidad': art.get('popularity'), 'albums': rel.get('items', []), 'H': H}


def itunes_releases():
    j = get('https://itunes.apple.com/lookup', as_json=True, params={'id': APPLE_ARTIST, 'entity': 'album', 'limit': 200, 'sort': 'recent'})
    out = []
    for x in j.get('results', []):
        if x.get('wrapperType') != 'collection':
            continue
        out.append({'titulo': re.sub(r'\s*-\s*(Single|EP)$', '', x.get('collectionName', '')), 'artistas': x.get('artistName'), 'fecha': (x.get('releaseDate') or '')[:10],
                    'url': x.get('collectionViewUrl', '').split('?')[0], 'tracks': x.get('trackCount'), 'id': x.get('collectionId'),
                    'portada': (x.get('artworkUrl100') or '').replace('100x100bb', '1400x1400bb') or None})
    return out


def itunes_tracks(collection_id):
    j = get('https://itunes.apple.com/lookup', as_json=True, params={'id': collection_id, 'entity': 'song', 'limit': 200})
    col_, tracks = None, []
    for x in j.get('results', []):
        if x.get('wrapperType') == 'collection':
            col_ = x
        elif x.get('wrapperType') == 'track':
            tracks.append({'n': x.get('trackNumber'), 'disco': x.get('discNumber'), 'titulo': x.get('trackName'), 'artistas': x.get('artistName'),
                           'duracion_ms': x.get('trackTimeMillis'), 'apple_url': (x.get('trackViewUrl') or '').split('&uo')[0],
                           'portada': (x.get('artworkUrl100') or '').replace('100x100bb', '1400x1400bb') or None})
    tracks.sort(key=lambda r: ((r['disco'] or 1), (r['n'] or 0)))
    return col_, tracks


def oembed(url):
    j = get('https://open.spotify.com/oembed', as_json=True, params={'url': url}, tries=2)
    return j.get('thumbnail_url')


def yt_initial(html):
    m = re.search(r'var ytInitialData\s*=\s*(\{.*?\});\s*</script>', html, re.S) or re.search(r'ytInitialData"\]\s*=\s*(\{.*?\});', html, re.S)
    if not m:
        raise RuntimeError('YouTube no devolvió resultados')
    return json.loads(m.group(1))


def walk(o, key):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == key:
                yield v
            else:
                yield from walk(v, key)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v, key)


def rel_days(txt):
    """'3 days ago' / 'hace 3 días' / 'Streamed 5 hours ago' -> días (aprox.)"""
    t_ = (txt or '').lower()
    n = to_int(t_) or 1
    if re.search(r'(second|minute|hour|segundo|minuto|hora)', t_):
        return 0
    if re.search(r'(day|día|dia)', t_):
        return n
    if re.search(r'(week|semana)', t_):
        return 7 * n
    if re.search(r'(month|mes)', t_):
        return 30 * n
    return 999


_FALLOS_HOST = {}
DATA_VETO = []


def _host_ok(h):
    return _FALLOS_HOST.get(h, 0) < 3  # tras 3 fallos en esta vuelta, ese servicio no se vuelve a intentar


def _host_mal(h):
    _FALLOS_HOST[h] = _FALLOS_HOST.get(h, 0) + 1


def yt_search_scrape(query):
    """Busca en YouTube (por relevancia). Si YouTube bloquea a GitHub, prueba espejos públicos (Piped / Invidious)."""
    if not _host_ok('youtube'):
        raise_yt = True
    else:
        raise_yt = False
    try:
        if raise_yt:
            raise RuntimeError('YouTube bloqueado en esta vuelta')
        html = get('https://www.youtube.com/results', params={'search_query': query, 'hl': 'es', 'gl': 'US'},
                   headers={'Cookie': 'CONSENT=YES+1; SOCS=CAI', 'Accept-Language': 'es-ES,es;q=0.9'}, tries=2)
        out = []
        for vr in walk(yt_initial(html), 'videoRenderer'):
            try:
                own = (vr.get('ownerText') or {}).get('runs', [])
                badges = json.dumps(vr.get('ownerBadges') or [])
                out.append({'video_id': vr['videoId'], 'titulo': ''.join(r.get('text', '') for r in vr['title']['runs']),
                            'canal': ''.join(r.get('text', '') for r in own),
                            'canal_id': next((r['navigationEndpoint']['browseEndpoint'].get('browseId') for r in own if (r.get('navigationEndpoint') or {}).get('browseEndpoint')), None),
                            'verificado': 'artista' if 'VERIFIED_ARTIST' in badges else ('verificado' if 'VERIFIED' in badges else False),
                            'hace': (vr.get('publishedTimeText') or {}).get('simpleText', ''), 'vistas_txt': (vr.get('viewCountText') or {}).get('simpleText', '')})
            except (KeyError, TypeError):
                continue
        if out:
            return out
        _host_mal('youtube')
    except Exception:  # noqa: BLE001
        if not raise_yt:
            _host_mal('youtube')
    q = requests.utils.quote(query)
    for url in (f'https://pipedapi.kavin.rocks/search?q={q}&filter=videos', f'https://pipedapi.adminforge.de/search?q={q}&filter=videos'):
        h = url.split('/')[2]
        if not _host_ok(h):
            continue
        try:
            j = get(url, as_json=True, tries=1)
            out = [{'video_id': (it.get('url') or '').split('v=')[-1], 'titulo': it.get('title') or '', 'canal': it.get('uploaderName') or '',
                    'canal_id': (it.get('uploaderUrl') or '').split('/channel/')[-1] or None, 'verificado': None,
                    'vistas': it.get('views'), 'hace': it.get('uploadedDate') or '', 'vistas_txt': str(it.get('views') or '')} for it in (j.get('items') or []) if 'watch?v=' in (it.get('url') or '')]
            if out:
                return out
            _host_mal(h)
        except Exception:  # noqa: BLE001
            _host_mal(h)
            continue
    for host in ('https://inv.nadeko.net', 'https://invidious.nerdvpn.de', 'https://yewtu.be'):
        if not _host_ok(host):
            continue
        try:
            j = get(f'{host}/api/v1/search', as_json=True, params={'q': query, 'type': 'video'}, tries=1)
            out = [{'video_id': it['videoId'], 'titulo': it.get('title') or '', 'canal': it.get('author') or '', 'canal_id': it.get('authorId'), 'verificado': None, 'vistas': it.get('viewCount'),
                    'hace': it.get('publishedText') or '', 'vistas_txt': str(it.get('viewCount') or '')}
                   for it in (j or []) if it.get('videoId')]
            if out:
                return out
            _host_mal(host)
        except Exception:  # noqa: BLE001
            _host_mal(host)
            continue
    raise RuntimeError('YouTube y los espejos no devolvieron resultados')


FALSA_VERSION = re.compile(r'type beat|mashup|\\(versi[oó]n [^)]*\\)|\\bia\\b|-ia-|sped up|slowed|karaoke|originally performed|in the style of|made famous|tribute|tributo|instrumental version|backing track|cover version|as made famous|\\bcover\\b|lullaby|8-bit|piano version', re.I)
NO_OFICIAL = re.compile(r'lyric|letra|audio|visualizer|reaccion|reacción|reaction|cover|karaoke|slowed|speed|8d|instrumental|en vivo|live|preview|extended|clean|nightcore|tiktok', re.I)


def _f(t):
    import unicodedata
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', unicodedata.normalize('NFD', str(t or '').lower()).encode('ascii', 'ignore').decode())).strip()


def creditos(song):
    """Artistas acreditados en la canción (para aceptar el canal oficial de un colaborador)."""
    txt = ' , '.join([str(song.get('artistas') or ''), ', '.join(song.get('creditos') or []), ', '.join(song.get('creditos_sp') or []), ' '.join(re.findall(r'\((?:with|feat\.?|ft\.?|con)\s+([^)]*)\)', song.get('titulo') or '', re.I))])
    gruesas = re.split(r'\s*(?:,|\bfeat\.?|\bft\.?|\bwith\b)\s*', txt, flags=re.I)  # «Zion & Lennox» entero
    finas = re.split(r'\s*(?:,|&|\+|\bfeat\.?|\bft\.?|\bwith\b|\bx\b|\by\b)\s*', txt, flags=re.I)
    return {_f(p) for p in gruesas + finas if len(_f(p)) >= 2}


def _compacto(t):
    return re.sub(r'(?:tv|music|musica|oficial|official|records|vevo|topic)+$', '', _f(t).replace(' ', ''))


CANAL_VEVO_ANUEL = 'AnuelVEVO'


def es_canal_anuel(canal, cid):
    ofi = CFG.get('canales_oficiales') or []
    ofi = list(ofi.values()) if isinstance(ofi, dict) else list(ofi)
    # por ID: hay canales falsos que se llaman exactamente «AnuelVEVO» (p. ej. @anuelvevo9249)
    return bool(cid) and (cid == YT_CHANNEL or cid in ofi)


def canal_oficial(r, song):
    """¿Es el videoclip oficial? True / False.
    Vale: el canal de Anuel (ID) o uno de config.json («canales_oficiales»), un VEVO o «- Topic» de Anuel o de un acreditado,
    un vídeo publicado a la vez en varios canales («ROA and Anuel AA», «Chris Jedi y 2 más»), el canal de un artista
    acreditado en la canción (verificado o no, p. ej. un emergente) o un canal de ARTISTA (♪) cuyo título nombra a Anuel.
    No vale: canales de fans, de música/reacciones/sellos ajenos, ni otra canción que solo se llama igual."""
    cid, can = r.get('canal_id'), (r.get('canal') or '').strip()
    tit = r.get('titulo') or ''
    ofi = CFG.get('canales_oficiales') or []
    ofi = list(ofi.values()) if isinstance(ofi, dict) else list(ofi)
    ofi_ids = {YT_CHANNEL} | {x for x in ofi if str(x).startswith('UC')}
    ofi_nombres = {_compacto(x) for x in ofi if not str(x).startswith('UC')}
    cred_otros = {_compacto(c) for c in creditos(song) if not NAME_RE.search(c)} - {''}
    nombra_anuel = bool(NAME_RE.search(tit))
    comp = _compacto(re.sub(r'\s*-\s*topic$', '', can, flags=re.I))
    if cid and cid in set(CFG.get('canales_falsos') or []):
        return False
    if (cid and cid in ofi_ids) or es_canal_anuel(can, cid):
        return True
    if comp and comp in ofi_nombres:  # sello oficial (Flow La Movie, Hear This Music…): el título debe nombrar a Anuel o a un acreditado
        return nombra_anuel or any(c and c in _f(tit).replace(' ', '') for c in cred_otros if len(c) >= 4)
    if re.search(r'\b(?:y|and)\s+\d+\s+(?:m[aá]s|more)\b', can, re.I):  # «Chris Jedi y 2 más»: vale si el primer canal es de un acreditado
        primero = _compacto(re.split(r'\s+(?:y|and)\s+\d+', can)[0])
        return bool(primero) and (primero in cred_otros or primero in ofi_nombres or primero.startswith('anuel'))
    partes = [p.strip() for p in re.split(r'\s+(?:and|y)\s+|\s*&\s*|\s*,\s*', can) if p.strip()]
    if len(partes) >= 2 and (any(p.casefold() == ARTISTA.casefold() for p in partes) or any(_compacto(p) in cred_otros for p in partes)):
        return True
    if re.search(r'\s-\s*topic$', can, re.I):
        return comp.startswith('anuel') or comp in cred_otros
    if re.search(r'vevo$', can, re.I):  # VEVO de otro artista (OzunaVEVO, MarshmelloVEVO…); el de Anuel solo por su ID (config)
        if comp.startswith('anuel'):
            return False
        return comp in cred_otros or (bool(re.fullmatch(r'[A-Za-z0-9]+VEVO', can)) and nombra_anuel)
    if NAME_RE.search(can) or re.match(r'anuel', can, re.I):
        return False  # se llama «Anuel …» pero no es su canal: fan
    if comp and (comp in cred_otros or any(_compacto(p) in cred_otros for p in partes)):
        return True
    # canal con el nombre del artista + coletilla («ConepMusicPR» = Conep, «KendoKaponiTV» = Kendo Kaponi), pero no de fans/letras
    if comp and not re.search(r'fan|letra|lyric|edit|reac|clip|remix|slowed|karaoke|cover|sped|8d', comp) \
            and any(len(c) >= 4 and (comp.startswith(c) or c.startswith(comp) and len(comp) >= 5) for c in cred_otros):
        return True
    if r.get('verificado') == 'artista':  # canal de artista: vale si su nombre también sale en el título («Ozuna x Anuel AA - …»)
        return nombra_anuel and bool(comp) and len(comp) >= 3 and comp in _f(tit).replace(' ', '')
    return False


def yt_owner_verified(video_id):
    """¿El canal que subió el vídeo está verificado? (insignia junto al nombre del canal)."""
    html = get(f'https://www.youtube.com/watch?v={video_id}&hl=es', headers={'Cookie': 'CONSENT=YES+1; SOCS=CAI'}, tries=1)
    i = html.find('"videoOwnerRenderer"')
    if i < 0:
        raise ValueError('sin datos del canal')
    seg = html[i:i + 4000]
    return 'artista' if 'BADGE_STYLE_TYPE_VERIFIED_ARTIST' in seg else ('verificado' if 'BADGE_STYLE_TYPE_VERIFIED' in seg else False)


def yt_pick(song, res):
    """El videoclip oficial entre los resultados (solo canales oficiales). «Official Video/Video Oficial» primero; audios «- Topic» y letras al final."""
    t_ = _f(base(song['titulo']))
    if len(t_) < 2:
        return None
    def titulo_ok(r):
        tt = _f(r['titulo'])
        if t_ in tt:
            return True
        propio = r.get('canal_id') == YT_CHANNEL or re.match(r'anuel.*vevo$', (r.get('canal') or '').replace(' ', ''), re.I)
        if propio and len(t_) >= 4:  # en su propio canal se admite una pequeña diferencia («DE KILO» / «Del Kilo»)
            import difflib
            trozos = [_f(x) for x in re.split(r'\s[-–|❌x]\s|\||❌|\(|\)', r['titulo']) if _f(x)]
            return any(difflib.SequenceMatcher(None, t_, z).ratio() >= 0.85 for z in trozos)
        return False
    veto = set((DATA_VETO or []))
    cand = [r for r in res[:15] if r.get('video_id') not in veto and titulo_ok(r) and canal_oficial(r, song)]
    for r in cand:
        if not isinstance(r.get('vistas'), int):
            r['vistas'] = compact(re.sub(r'(?i)\s*(de\s+)?(visualizaciones|vistas|views).*$', '', str(r.get('vistas_txt') or ''))) or None
    falta = [r['video_id'] for r in cand if not r.get('vistas')]
    if falta and len(cand) > 1 and os.environ.get('YT_API_KEY'):
        try:
            got_ = yt_api(os.environ['YT_API_KEY'], falta)  # 1 unidad
            for r in cand:
                if (got_.get(r['video_id']) or {}).get('vistas'):
                    r['vistas'] = got_[r['video_id']]['vistas']
        except Exception:  # noqa: BLE001
            pass
    if not cand:
        return None

    def rank(r):
        tit, can = r['titulo'], r['canal'] or ''
        oficial = bool(re.search(r'official\s*(music\s*)?video|video\s*oficial|videoclip', tit, re.I))
        return (bool(NO_OFICIAL.search(tit)), can.endswith('- Topic'), -(r.get('vistas') or 0), r.get('canal_id') != YT_CHANNEL, not oficial)
    cand.sort(key=rank)
    return cand[0]


def es_oficial(y):
    return bool(y) and not NO_OFICIAL.search(y.get('titulo') or '') and not (y.get('canal') or '').endswith('- Topic')


def news_rss(query):
    out = []
    for url in (f'https://news.google.com/rss/search?q={requests.utils.quote(query)}&hl=es-419&gl=US&ceid=US:es-419',
                f'https://www.bing.com/news/search?q={requests.utils.quote(query)}&format=rss'):
        try:
            soup = BeautifulSoup(get(url, tries=2), 'xml')
        except Exception:  # noqa: BLE001
            continue
        for it in soup.find_all('item'):
            try:
                d = email.utils.parsedate_to_datetime(it.find('pubDate').text).astimezone(dt.timezone.utc)
            except Exception:  # noqa: BLE001
                continue
            src = it.find('source')
            out.append({'titulo': htmlmod.unescape(it.find('title').text), 'url': it.find('link').text.strip(), 'fecha': d.strftime('%Y-%m-%d'),
                        'fuente': src.text if src else re.sub(r'^https?://(www\.)?([^/]+).*$', r'\2', it.find('link').text.strip())})
        if out:
            break
    return out


def instagram_posts(user):
    """Últimas publicaciones públicas del perfil (incluye colaboraciones). Instagram a veces bloquea a GitHub."""
    j = get('https://i.instagram.com/api/v1/users/web_profile_info/', as_json=True, params={'username': user}, tries=2,
            headers={'x-ig-app-id': '936619743392459', 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0',
                     'Accept': '*/*', 'Referer': f'https://www.instagram.com/{user}/'})
    u = (j.get('data') or {}).get('user') or {}
    if not u:
        raise RuntimeError('Instagram no devolvió el perfil (bloqueo temporal)')
    out = []
    for e in ((u.get('edge_owner_to_timeline_media') or {}).get('edges') or []):
        n = e.get('node') or {}
        cap = ((n.get('edge_media_to_caption') or {}).get('edges') or [{}])
        cap = (cap[0].get('node') or {}).get('text', '') if cap else ''
        co = [c.get('username') for c in (n.get('coauthor_producers') or []) if c.get('username')]
        out.append({'code': n.get('shortcode'), 'fecha': dt.datetime.fromtimestamp(n.get('taken_at_timestamp') or 0, dt.timezone.utc).strftime('%Y-%m-%d'),
                    'texto': cap, 'img': n.get('thumbnail_src') or n.get('display_url'), 'likes': (n.get('edge_liked_by') or n.get('edge_media_preview_like') or {}).get('count'),
                    'comentarios': (n.get('edge_media_to_comment') or {}).get('count'), 'video': n.get('is_video'), 'colab': co})
    stats = {'seguidores': (u.get('edge_followed_by') or {}).get('count'), 'siguiendo': (u.get('edge_follow') or {}).get('count'),
             'publicaciones': (u.get('edge_owner_to_timeline_media') or {}).get('count')}
    return out, stats


def tiktok_profile(user):
    html = get(f'https://www.tiktok.com/@{user}', tries=2, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'})
    m = re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        raise RuntimeError('TikTok no devolvió datos del perfil')
    data = json.loads(m.group(1))
    ui = next(walk(data, 'userInfo'), None) or {}
    st = ui.get('statsV2') or ui.get('stats') or {}
    if not st:
        raise RuntimeError('TikTok sin estadísticas')
    items = []
    for it in walk(data, 'itemList'):
        for v in it or []:
            items.append({'id': v.get('id'), 'texto': v.get('desc'), 'fecha': dt.datetime.fromtimestamp(int(v.get('createTime') or 0), dt.timezone.utc).strftime('%Y-%m-%d'),
                          'img': (v.get('video') or {}).get('cover'), 'vistas': to_int((v.get('stats') or {}).get('playCount'))})
    return {'seguidores': to_int(st.get('followerCount')), 'me_gusta': to_int(st.get('heartCount')), 'videos': to_int(st.get('videoCount'))}, items


def playlist_read(name, url):
    """Lee una playlist pública (Spotify, Apple Music o Deezer) y devuelve sus temas en orden."""
    m_sp = re.search(r'open\.spotify\.com/(?:intl-\w+/)?(?:embed/)?playlist/([A-Za-z0-9]{22})', url)
    m_am = re.search(r'music\.apple\.com/.*?/playlist/[^/]*/?(pl\.[\w.-]+)', url)
    m_dz = re.search(r'deezer\.com/(?:\w+/)?playlist/(\d+)', url)
    tracks, info = [], {'nombre': name, 'url': url}
    if m_sp:
        info['plataforma'] = 'Spotify'
        html = get(f'https://open.spotify.com/embed/playlist/{m_sp.group(1)}', tries=2)
        m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
        if not m:
            raise RuntimeError('Spotify no devolvió la playlist')
        j = json.loads(m.group(1))
        ent = next((e for e in walk(j, 'entity') if isinstance(e, dict) and e.get('trackList')), None) or {}
        tl = ent.get('trackList') or next((t for t in walk(j, 'trackList') if isinstance(t, list)), [])
        info['nombre_oficial'] = ent.get('name') or ent.get('title')
        info['curador'] = ent.get('subtitle') or 'Spotify'
        for t in tl:
            tracks.append({'titulo': t.get('title') or '', 'artistas': t.get('subtitle') or ''})
    elif m_am:
        info['plataforma'] = 'Apple Music'
        html = get(url, tries=2)
        m = re.search(r'<script[^>]+id="serialized-server-data"[^>]*>(.*?)</script>', html, re.S)
        if m:
            j = json.loads(m.group(1))
            for d in walk(j, 'items'):
                if not isinstance(d, list):
                    continue
                cand = [x for x in d if isinstance(x, dict) and x.get('title') and x.get('artistName') and (x.get('duration') or x.get('trackNumber') is not None or 'contentDescriptor' in x)]
                if len(cand) > len(tracks):
                    tracks = [{'titulo': x['title'], 'artistas': x['artistName']} for x in cand]
        if not tracks:
            m = re.search(r'<script[^>]+name="schema:music-playlist"[^>]*>(.*?)</script>', html, re.S)
            if m:
                j = json.loads(m.group(1))
                for t in j.get('track') or []:
                    by = t.get('byArtist')
                    by = ', '.join(b.get('name', '') for b in by) if isinstance(by, list) else (by or {}).get('name', '') if isinstance(by, dict) else ''
                    tracks.append({'titulo': t.get('name') or '', 'artistas': by})
        mt = re.search(r'<meta property="og:title" content="([^"]+)"', html)
        info['nombre_oficial'] = htmlmod.unescape(mt.group(1)).split(' by ')[0].replace('\u200e', '').strip() if mt else None
        info['curador'] = 'Apple Music'
    elif m_dz:
        info['plataforma'] = 'Deezer'
        j = get(f'https://api.deezer.com/playlist/{m_dz.group(1)}', as_json=True, tries=2)
        info['nombre_oficial'], info['seguidores'] = j.get('title'), j.get('fans')
        info['curador'] = (j.get('creator') or {}).get('name')
        for t in ((j.get('tracks') or {}).get('data') or []):
            tracks.append({'titulo': t.get('title') or '', 'artistas': (t.get('artist') or {}).get('name', '')})
    else:
        raise RuntimeError('enlace no reconocido (usa Spotify, Apple Music o Deezer)')
    if not tracks:
        raise RuntimeError('la playlist no mostró canciones')
    info['total'] = len(tracks)
    info['temas'] = [dict(t, pos=i + 1) for i, t in enumerate(tracks) if NAME_RE.search(t['titulo'] + ' ' + t['artistas'])]
    return info


def extra_feeds():
    """Fuentes RSS que añades tú (p. ej. de rss.app para Instagram, etiquetas o hashtags): variable FEEDS_EXTRA, una por línea «nombre|url»."""
    out = []
    for line in (os.environ.get('FEEDS_EXTRA') or '').replace(';', '\n').splitlines():
        if '|' not in line:
            continue
        name, url = [x.strip() for x in line.split('|', 1)]
        try:
            soup = BeautifulSoup(get(url, tries=2), 'xml')
        except Exception as e:  # noqa: BLE001
            fallo(f'fuente RSS {name}', e)
            continue
        for it in soup.find_all(['item', 'entry'])[:20]:
            title = (it.find('title').text if it.find('title') else '').strip()
            link = it.find('link')
            link = (link.get('href') or link.text).strip() if link else None
            ds = it.find('pubDate') or it.find('published') or it.find('updated')
            try:
                d = email.utils.parsedate_to_datetime(ds.text) if ds and not re.match(r'\d{4}-', ds.text) else dt.datetime.fromisoformat(ds.text.replace('Z', '+00:00'))
                fecha = d.astimezone(dt.timezone.utc).strftime('%Y-%m-%d')
            except Exception:  # noqa: BLE001
                fecha = HOY
            img = None
            for tag in ('media:content', 'media:thumbnail', 'enclosure'):
                x = it.find(tag)
                if x and (x.get('url') or '').startswith('http'):
                    img = x.get('url')
                    break
            if not img:
                desc = it.find('description') or it.find('content')
                mm = re.search(r'<img[^>]+src="([^"]+)"', desc.text if desc else '')
                img = mm.group(1) if mm else None
            out.append({'fuente': name, 'titulo': htmlmod.unescape(BeautifulSoup(title, 'lxml').get_text(' ').strip())[:220] or name, 'url': link, 'fecha': fecha, 'img': img})
    return out


def logros(data, songs, P, prev_perfil, prev_sp, prev_yt, add):
    """Detecta logros publicables a partir de datos leídos hoy. Cada logro se guarda una sola vez (id fijo)."""
    st = data.setdefault('logros_estado', {})  # mejores marcas guardadas: posiciones, países, récords
    best = st.setdefault('mejor_pos', {})
    n0 = len(data.get('novedades', []))
    MILES = lambda v: f'{v:,}'.replace(',', '.')

    def corto(v):
        if v >= 1e9:
            return f'{v / 1e9:.2f}'.rstrip('0').rstrip('.').replace('.', ',') + ' MIL M'
        if v >= 1e6:
            return f'{v / 1e6:.1f}'.rstrip('0').rstrip('.').replace('.', ',') + ' M'
        if v >= 1e3:
            return f'{v / 1e3:.0f} K'
        return str(int(v))

    def song_of(name):
        b = base(name or '')
        return next((x for x in songs if base(x['titulo']) == b), None)

    cur_ref = [None]  # a qué lista se refiere el logro (para que la web muestre su puesto actual)

    def L(id_, nivel, cat, titulo, texto, numero, sub, etiqueta, fecha=None, s=None, fuente=None, url=None):
        add('logro:' + id_, 'logro', titulo, texto, fecha or HOY, url, fuente, (s or {}).get('portada'), (s or {}).get('id'),
            nivel=nivel, cat=cat, numero=numero, sub=sub, etiqueta=etiqueta, ref=cur_ref[0])

    # 1) listas: entrada global, #1, top 10, debut y pico histórico
    charts = [c for c in data.get('charts', []) if c.get('posicion') is not None and c.get('cancion')]
    paises_sp = set()
    for c in charts:
        s = song_of(c['cancion'])
        tit = (s or {}).get('titulo') or c['cancion'].split(' (')[0]
        pos, plat, pais, cod = c['posicion'], plat_of(c), c['pais'], str(c.get('codigo') or '')
        cur_ref[0] = {'tipo': 'lista', 'plat': plat, 'pais': pais, 'cancion': base(tit)}
        glob = cod.upper() in ('WW', 'GLOBAL') or pais in ('Global', 'Mundial')
        f = c.get('fecha_lista') or HOY
        if plat == 'Spotify' and not glob:
            paises_sp.add(pais)
        key = f'{plat}|{pais}|{base(tit)}'
        prev_best = best.get(key)
        # pico histórico según kworb (para Spotify) o lo que tenemos guardado
        hist = None
        if plat == 'Spotify' and s:
            hist = next((p_['pico'] for p_ in (s.get('picos') or []) if (p_.get('pais') == pais or str(p_.get('codigo') or '').upper() == cod.upper()) and p_.get('pico')), None)
        ref = min([x for x in (prev_best, hist) if x] or [None]) if (prev_best or hist) else None
        lista = f'{c.get("lista") or "Top"} de {plat}' + ('' if glob else f' {pais}')
        nuevo = bool(s and s.get('lanzamiento') and s['lanzamiento'] >= (NOW - dt.timedelta(days=10)).strftime('%Y-%m-%d'))
        if glob:
            L(f'global:{plat}:{base(tit)}', 3, 'mundial', f'{tit} entra en el top global de {plat}', f'Puesto #{pos} en {lista} ({f})', f'#{pos}',
              f'{plat.upper()} GLOBAL', 'WORLDWIDE', f, s, f'{plat} vía kworb.net')
            if prev_best and pos < prev_best:
                L(f'globalpico:{plat}:{base(tit)}:{pos}', 3, 'mundial', f'{tit} sube al #{pos} global en {plat}', f'Su mejor puesto mundial (antes #{prev_best})', f'#{pos}',
                  f'{plat.upper()} GLOBAL', 'NUEVO PICO MUNDIAL', f, s, f'{plat} vía kworb.net')
        if pos == 1:
            L(f'n1:{plat}:{pais}:{base(tit)}', 3, 'numero1', f'{tit} es #1 en {plat} {pais}', f'Número 1 en {lista} ({f})', '#1',
              f'{plat.upper()} · {pais.upper()}', '¡NÚMERO 1!', f, s, f'{plat} vía kworb.net')
        elif pos <= 10:
            L(f'top10:{plat}:{pais}:{base(tit)}', 2, 'top10', f'{tit} entra al top 10 de {plat} {pais}', f'Puesto #{pos} en {lista} ({f})', f'#{pos}',
              f'{plat.upper()} · {pais.upper()}', 'TOP 10', f, s, f'{plat} vía kworb.net')
        if nuevo and not prev_best:
            L(f'debut:{plat}:{pais}:{base(tit)}', 2 if pos <= 50 or glob else 1, 'debut', f'{tit} debuta en el #{pos} de {plat} {pais}', f'Recién estrenado y ya en {lista}', f'#{pos}',
              f'DEBUT · {plat.upper()} {pais.upper()}', 'DEBUT', f, s, f'{plat} vía kworb.net')
        if ref and pos < ref and not glob and pos != 1:
            L(f'pico:{plat}:{pais}:{base(tit)}:{pos}', 2 if pos <= 20 else 1, 'pico', f'{tit} logra su mejor puesto en {plat} {pais}: #{pos}', f'Antes su mejor puesto era el #{ref}', f'#{pos}',
              f'{plat.upper()} · {pais.upper()}', 'NUEVO PICO', f, s, f'{plat} vía kworb.net')
        if not prev_best or pos < prev_best:
            best[key] = pos
    # playlists oficiales: #1, top 3, top 10 y entradas
    for pl in data.get('playlists', []):
        nm = pl.get('nombre_oficial') or pl['nombre']
        for t in pl.get('temas', []):
            s = next((x for x in songs if x.get('id') == t.get('cancion')), None)
            key = slug(pl['url'][-24:]) + ':' + slug(t['titulo'])
            pos = t['pos']
            cur_ref[0] = {'tipo': 'playlist', 'url': pl['url'], 'cancion': t['titulo']}
            if pos == 1:
                L(f'pl1:{key}', 3, 'playlist', f'{t["titulo"]} es el #1 de «{nm}» en {pl["plataforma"]}', f'Abre la playlist oficial «{nm}»', '#1', f'«{nm.upper()}» · {pl["plataforma"].upper()}', 'PLAYLIST OFICIAL', None, s, pl['plataforma'], pl['url'])
            elif pos <= 3:
                L(f'pl3:{key}', 3, 'playlist', f'{t["titulo"]} entra al top 3 de «{nm}» en {pl["plataforma"]}', f'Puesto #{pos}' + (f' (antes #{t["antes"]})' if t.get('antes') else ''), f'#{pos}', f'«{nm.upper()}» · {pl["plataforma"].upper()}', 'TOP 3 PLAYLIST', None, s, pl['plataforma'], pl['url'])
            elif pos <= 10:
                L(f'pl10:{key}', 2, 'playlist', f'{t["titulo"]} está en el top 10 de «{nm}» en {pl["plataforma"]}', f'Puesto #{pos}', f'#{pos}', f'«{nm.upper()}» · {pl["plataforma"].upper()}', 'PLAYLIST OFICIAL', None, s, pl['plataforma'], pl['url'])
            elif t.get('antes') is None and not pl.get('primera') and pl.get('consultado') == HOY:
                L(f'plin:{key}', 2, 'playlist', f'{t["titulo"]} entra en la playlist oficial «{nm}»', f'Puesto #{pos} de {pl.get("total") or "?"} en {pl["plataforma"]}', f'#{pos}', f'«{nm.upper()}» · {pl["plataforma"].upper()}', 'NUEVA PLAYLIST', None, s, pl['plataforma'], pl['url'])
    cur_ref[0] = None
    # aniversarios: 1 mes, 3 y 6 meses, y cada año desde la salida (el mismo día)
    def add_months(d, m):
        y, mo = d.year + (d.month - 1 + m) // 12, (d.month - 1 + m) % 12 + 1
        import calendar
        return dt.date(y, mo, min(d.day, calendar.monthrange(y, mo)[1]))
    hoy_d = NOW.date()
    for s in songs:
        try:
            d0 = dt.date.fromisoformat((s.get('lanzamiento') or '')[:10])
        except ValueError:
            continue
        for m, label in ((1, '1 mes'), (3, '3 meses'), (6, '6 meses'), (12, '1 año'), (24, '2 años'), (36, '3 años'), (48, '4 años'), (60, '5 años')):
            if add_months(d0, m) == hoy_d:
                spT, ytT = (s.get('spotify') or {}).get('total'), (s.get('youtube') or {}).get('vistas')
                partes = [f'{MILES(spT)} streams en Spotify' if spT else '', f'{MILES(ytT)} views en YouTube' if ytT else '']
                L(f'aniv:{s.get("id")}:{m}', 3 if m >= 12 else 2, 'aniversario', f'{s["titulo"]} cumple {label}', 'Desde su salida: ' + ' y '.join(p for p in partes if p) if any(partes) else f'Salió el {d0.isoformat()}',
                  label.upper(), 'DESDE SU SALIDA', 'ANIVERSARIO', None, s, 'Spotify / YouTube')
    # países a la vez en Spotify
    np_, rec_p = len(paises_sp), st.get('max_paises_spotify') or 0
    if np_ >= 3 and np_ > rec_p and rec_p:
        L(f'paises:{np_}', 2, 'record', f'{ARTISTA} suena en {np_} países a la vez en Spotify', 'Su récord de países con canciones en el Top 200 diario: ' + ', '.join(sorted(paises_sp)),
          str(np_), 'PAÍSES EN SPOTIFY A LA VEZ', 'NUEVO RÉCORD', None, None, 'Spotify vía kworb.net')
    st['max_paises_spotify'] = max(np_, rec_p)

    # 2) cifras redondas por canción (streams y vistas)
    MARKS = [1e6, 5e6, 10e6, 25e6, 50e6, 100e6, 200e6, 300e6, 400e6, 500e6, 750e6, 1e9, 1.5e9, 2e9]
    for s in songs:
        k = norm(s['titulo'])
        for plat, old, new, unit in (('Spotify', prev_sp.get(k), (s.get('spotify') or {}).get('total'), 'STREAMS'), ('YouTube', prev_yt.get(k), (s.get('youtube') or {}).get('vistas'), 'VISTAS')):
            if old and new and new > old:
                for m in MARKS:
                    if old < m <= new:
                        L(f'cifra:{plat}:{k}:{int(m)}', 3 if m >= 100e6 else 2 if m >= 10e6 else 1, 'cifra', (f'{s["titulo"]} supera el millón de {unit.lower()} en {plat}' if m == 1e6 else f'{s["titulo"]} supera los {corto(m)} de {unit.lower()} en {plat}'),
                          f'Ahora {MILES(new)}', corto(m), f'{unit} EN {plat.upper()}', 'NUEVA CIFRA', None, s, plat)
    # 3) récords del perfil (máximos de siempre) y cifras redondas
    rec = st.setdefault('records', {})
    def paso(v):  # seguidores: cada 5 M (de 10 a 100 M), cada 10 M (desde 100 M), cada 1 M (de 1 a 10 M)
        return 10e6 if v >= 100e6 else 5e6 if v >= 10e6 else 1e6 if v >= 1e6 else 250e3
    for key_, path, label, sub, step in (('oyentes', ('spotify', 'oyentes_mensuales'), 'oyentes mensuales en Spotify', 'OYENTES MENSUALES', 'auto'),
                                         ('sp_seg', ('spotify', 'seguidores'), 'seguidores en Spotify', 'SEGUIDORES EN SPOTIFY', 'auto'),
                                         ('diarios', ('spotify', 'streams_diarios'), 'streams en un día en Spotify', 'STREAMS EN UN DÍA', None),
                                         ('total_sp', ('spotify', 'streams_totales'), 'streams totales en Spotify', 'STREAMS TOTALES EN SPOTIFY', 500e6),
                                         ('subs', ('youtube', 'suscriptores'), 'suscriptores en YouTube', 'SUSCRIPTORES EN YOUTUBE', 'auto'),
                                         ('yt_vistas', ('youtube', 'vistas'), 'vistas en YouTube', 'VISTAS EN YOUTUBE', 100e6),
                                         ('ig', ('instagram', 'seguidores'), 'seguidores en Instagram', 'SEGUIDORES EN INSTAGRAM', 'auto'),
                                         ('tt', ('tiktok', 'seguidores'), 'seguidores en TikTok', 'SEGUIDORES EN TIKTOK', 'auto')):
        n = (P.get(path[0]) or {}).get(path[1])
        o = (prev_perfil.get(path[0]) or {}).get(path[1])
        if not isinstance(n, (int, float)) or not n:
            continue
        if step == 'auto':
            step = paso(min(n, o or n))
        if step and o and int(n // step) > int(o // step):
            mark = int(n // step) * step
            L(f'perfil:{key_}:{int(mark)}', 3 if key_ in ('oyentes', 'total_sp') or mark >= 10e6 else 2, 'cifra', f'{ARTISTA} llega a {corto(mark)} de {label}', f'Ahora {MILES(int(n))}', corto(mark), sub, 'NUEVA CIFRA', None, None, path[0].capitalize())
        if key_ in ('oyentes', 'diarios'):
            r0 = rec.get(key_)
            if r0 and n > r0 * 1.01 and not (P.get(path[0]) or {}).get('oyentes_aprox' if key_ == 'oyentes' else '_'):
                L(f'record:{key_}:{int(n)}', 2, 'record', f'Récord: {MILES(int(n))} {label}', f'Su máximo hasta ahora era {MILES(int(r0))}', corto(n), sub, 'NUEVO RÉCORD', None, None, 'Spotify')
            if not r0 or n > r0:
                rec[key_] = n
    # 4) mejor día de una canción en Spotify
    bd = st.setdefault('mejor_dia', {})
    for s in songs:
        d_ = (s.get('spotify') or {}).get('diarios')
        k = norm(s['titulo'])
        if isinstance(d_, (int, float)) and d_:
            if bd.get(k) and d_ > bd[k] * 1.02 and d_ >= 100000:
                L(f'dia:{k}:{int(d_)}', 2 if d_ >= 500000 else 1, 'record', f'{s["titulo"]} bate su récord: {MILES(int(d_))} streams en un día', f'Antes su mejor día era {MILES(int(bd[k]))}',
                  corto(d_), 'STREAMS EN UN DÍA', 'MEJOR DÍA', None, s, 'Spotify vía kworb.net')
            bd[k] = max(d_, bd.get(k) or 0)
    return len(data.get('novedades', [])) - n0


def send_ntfy(items, site_url):
    """Notificaciones al móvil con ntfy (app gratuita, sin registro): variable NTFY_TOPIC."""
    topic = (os.environ.get('NTFY_TOPIC') or '').strip()
    if not topic:
        return 'sin configurar'
    prefs = {p.strip() for p in (os.environ.get('ALERT_PREFS') or '').split(',') if p.strip()}
    sel = [i for i in items if not prefs or i['tipo'] in prefs or i['tipo'] == 'logro']
    if not sel:
        return 'nada nuevo'
    sel.sort(key=lambda i: (i['tipo'] != 'logro', -(i.get('nivel') or 0)))
    ICON = {'logro': 'trophy', 'lanzamiento': 'new', 'listas': 'chart_with_upwards_trend', 'youtube': 'arrow_forward', 'mencion': 'mega', 'noticia': 'newspaper',
            'redes': 'iphone', 'instagram': 'camera', 'tiktok': 'musical_note', 'hito': 'trophy'}
    sent = 0

    def pub(**kw):
        r = S.post('https://ntfy.sh/', json=dict(topic=topic, **kw), timeout=20)
        if r.status_code >= 400:
            raise RuntimeError(f'ntfy HTTP {r.status_code}')
    for i in sel[:6]:  # las más importantes, una a una
        pub(title=i['titulo'], message=i.get('texto') or i.get('fuente') or ARTISTA, tags=[ICON.get(i['tipo'], 'bell')],
            priority=4 if (i.get('nivel') or 0) >= 3 else 3, click=f'{site_url}#logros' if i['tipo'] == 'logro' else (i.get('url') or f'{site_url}#novedades'))
        sent += 1
    if len(sel) > 6:
        pub(title=f'+{len(sel) - 6} novedades más de {ARTISTA}', message='\n'.join('• ' + i['titulo'] for i in sel[6:20]), tags=['bell'], priority=2, click=f'{site_url}#novedades')
        sent += 1
    return f'enviadas ({sent})'


def send_alerts(items, site_url):
    to, user, pw = os.environ.get('ALERT_EMAIL'), os.environ.get('MAIL_USERNAME'), os.environ.get('MAIL_PASSWORD')
    if not (to and user and pw):
        return 'sin configurar'
    prefs = {p.strip() for p in (os.environ.get('ALERT_PREFS') or '').split(',') if p.strip()}
    sel = [i for i in items if not prefs or i['tipo'] in prefs or i['tipo'] == 'logro']
    sel.sort(key=lambda i: (i['tipo'] != 'logro', -(i.get('nivel') or 0)))
    if not sel:
        return 'nada nuevo'
    ICON = {'lanzamiento': '🆕', 'listas': '📈', 'hito': '🏆', 'youtube': '▶️', 'mencion': '📣', 'noticia': '📰', 'redes': '📱', 'instagram': '📸', 'tiktok': '🎵', 'logro': '🏆'}
    rows = ''.join(f'<tr><td style="padding:10px 0;border-bottom:1px solid #eee;font:15px -apple-system,Segoe UI,Arial">{ICON.get(i["tipo"], "•")} <b>{htmlmod.escape(i["titulo"])}</b>'
                   f'<br><span style="color:#666;font-size:13px">{htmlmod.escape(i.get("texto") or "")} · {htmlmod.escape(i.get("fuente") or "")} · {i.get("fecha") or ""}</span>'
                   + (f'<br><a href="{htmlmod.escape(i["url"])}" style="color:#ff2d55;font-size:13px">Abrir</a>' if i.get('url') else '') + '</td></tr>' for i in sel[:40])
    body = (f'<div style="max-width:560px;margin:auto"><h2 style="font:800 22px -apple-system,Segoe UI,Arial;margin:0 0 4px">{ARTISTA} · {len(sel)} novedad{"es" if len(sel) != 1 else ""}</h2>'
            f'<p style="color:#666;font:14px -apple-system,Segoe UI,Arial;margin:0 0 12px">Actualización del {NOW.strftime("%d/%m/%Y %H:%M")} UTC</p><table style="width:100%;border-collapse:collapse">{rows}</table>'
            f'<p style="font:14px -apple-system,Segoe UI,Arial"><a href="{site_url}#novedades" style="color:#ff2d55">Ver todo en la web</a></p>'
            '<p style="color:#999;font:12px -apple-system,Segoe UI,Arial">{CFG["sitio"]["nombre"]} · diseñado por @{CFG["sitio"]["marca"]}</p></div>')
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'{ARTISTA}: {sel[0]["titulo"]}' + (f' (+{len(sel) - 1} más)' if len(sel) > 1 else '')
    msg['From'] = f'{CFG["sitio"]["nombre"]} <{user}>'
    msg['To'] = to
    msg.attach(MIMEText('\n'.join(f'- {i["titulo"]} ({i.get("fuente", "")}) {i.get("url") or ""}' for i in sel), 'plain', 'utf-8'))
    msg.attach(MIMEText(body, 'html', 'utf-8'))
    server, port = os.environ.get('MAIL_SERVER') or 'smtp.gmail.com', int(os.environ.get('MAIL_PORT') or 465)
    with smtplib.SMTP_SSL(server, port, timeout=30) as smtp:
        smtp.login(user, pw)
        smtp.sendmail(user, [a.strip() for a in to.split(',') if a.strip()], msg.as_string())
    return f'enviado ({len(sel)})'


def deezer():
    a = get(f'https://api.deezer.com/artist/{DEEZER_ARTIST}', as_json=True)
    al = get(f'https://api.deezer.com/artist/{DEEZER_ARTIST}/albums', as_json=True, params={'limit': 100})
    return a.get('nb_fan'), [{'titulo': x.get('title'), 'fecha': x.get('release_date'), 'tipo': x.get('record_type')} for x in al.get('data', [])]


def shazam_count(url):
    m = re.search(r'/song/(\d+)', url or '')
    if not m:
        return None
    html = get(url, tries=2)
    for pat in (r'"total"\s*:\s*(\d{2,})', r'"shazamCount"\s*:\s*(\d+)', r'"count"\s*:\s*(\d{3,})', r'([\d,.]+)\s*Shazams'):
        mm = re.search(pat, html, re.I)
        if mm:
            return to_int(mm.group(1))
    raise RuntimeError('la página no muestra el conteo')


def audiomack(url):
    html = get(url, tries=2)
    m = re.search(r'"plays"\s*:\s*"?(\d+)', html) or re.search(r'([\d.,]+[KMB]?)\s+(?:Plays|plays)', html)
    if not m:
        raise RuntimeError('sin reproducciones en la página')
    likes = re.search(r'"favorites"\s*:\s*"?(\d+)', html)
    pls = re.search(r'"playlists"\s*:\s*"?(\d+)', html)
    return {'reproducciones': compact(m.group(1)), 'likes': to_int(likes.group(1)) if likes else None, 'playlists': to_int(pls.group(1)) if pls else None}


# ================================================================= principal
def main():
    global RAPIDO
    data = json.loads(DATA_PATH.read_text(encoding='utf8')) if DATA_PATH.exists() else {}
    # el artista y la web salen de config.json; si el archivo de datos es nuevo, se crea su estructura
    art = data.setdefault('artista', {})
    art.update({'nombre': ARTISTA, 'alias_regex': ART['alias_regex'], 'origen': ART.get('origen'), 'lema': ART.get('lema'), 'hashtag': ART.get('hashtag'), 'instagram': IG_USER, 'tiktok': TT_USER,
                'links': {k: v for k, v in {'spotify': f'https://open.spotify.com/artist/{SP_ARTIST}', 'youtube': f'https://www.youtube.com/@{YT_HANDLE}' if YT_HANDLE else f'https://www.youtube.com/channel/{YT_CHANNEL}',
                                            'apple_music': f'https://music.apple.com/us/artist/{APPLE_ARTIST}', 'instagram': f'https://www.instagram.com/{IG_USER}/' if IG_USER else None,
                                            'tiktok': f'https://www.tiktok.com/@{TT_USER}' if TT_USER else None, 'deezer': f'https://www.deezer.com/artist/{DEEZER_ARTIST}' if DEEZER_ARTIST else None,
                                            'x': f'https://x.com/{ART["x"]}' if ART.get('x') else None}.items() if v}})
    data['sitio'] = CFG.get('sitio', {})
    for k in ('spotify', 'youtube', 'instagram', 'tiktok', 'shazam', 'deezer', 'audiomack', 'apple_music', 'x', 'facebook'):
        data.setdefault('perfil', {}).setdefault(k, {})
    for k in ('canciones', 'albumes', 'charts', 'novedades', 'historial', 'yt_diario', 'avisos'):
        data.setdefault(k, [])
    data.setdefault('config', {})
    if (os.environ.get('RAPIDO') or '').lower() == 'auto':
        # freno: aunque algo la lance más a menudo, la automática no se repite antes de 25 minutos
        try:
            last = dt.datetime.fromisoformat((data.get('generado') or '2000-01-01T00:00:00Z').replace('Z', '+00:00'))
            gap = int(os.environ.get('MIN_GAP_MIN') or 25)
            if NOW - last < dt.timedelta(minutes=gap):
                log(f'Saltada: la última actualización fue hace {int((NOW - last).total_seconds() // 60)} min (mínimo {gap} min).')
                return 0
        except ValueError:
            pass
        try:
            last_full = dt.datetime.fromisoformat((data.get('completa') or '2000-01-01T00:00:00Z').replace('Z', '+00:00'))
        except ValueError:
            last_full = dt.datetime(2000, 1, 1, tzinfo=dt.timezone.utc)
        RAPIDO = (NOW - last_full) < dt.timedelta(hours=5)
    log('Modo: ' + ('RÁPIDO (cada 10 min)' if RAPIDO else 'COMPLETO'))
    P = data['perfil']
    songs = data['canciones']
    # une canciones repetidas (mismo tema con otro título en otra fuente)
    uniq = {}
    for s in songs:
        k = norm(s['titulo'])
        if k in uniq:
            keep = uniq[k] if (uniq[k].get('spotify') or {}).get('total') else s
            other = s if keep is uniq[k] else uniq[k]
            for f, v in other.items():
                if keep.get(f) in (None, [], {}) and v not in (None, [], {}):
                    keep[f] = v
            uniq[k] = keep
        else:
            uniq[k] = s
    songs = data['canciones'] = list(uniq.values())
    by_norm = {norm(s['titulo']): s for s in songs}
    prev_charts = copy.deepcopy(data.get('charts', []))
    prev_sp = {norm(s['titulo']): (s.get('spotify') or {}).get('total') for s in songs}
    prev_yt = {norm(s['titulo']): (s.get('youtube') or {}).get('vistas') for s in songs}
    prev_perfil = copy.deepcopy(data['perfil'])
    cfg = data.setdefault('config', {})
    yt_key = os.environ.get('YT_API_KEY')

    if not RAPIDO:
        # --- Spotify: canciones (kworb)
        log('Spotify · kworb canciones')
        try:
            fecha, ks, resumen = kworb_songs(SP_ARTIST)
            for k in ks:
                s = by_norm.get(norm(k['titulo']))
                if not s:
                    s = {'titulo': k['titulo'], 'rol': 'Colaboración' if k['colab'] else 'Principal', 'artistas': ARTISTA, 'id': slug(k['titulo']),
                         'youtube': None, 'lanzamiento': None, 'album': None, 'shazam': None, 'audiomack': None, 'apple': None, 'picos': [], 'listas': [], 'spotify': {}}
                    songs.append(s)
                    by_norm[norm(k['titulo'])] = s
                sp = s.setdefault('spotify', {})
                old = sp.get('fecha') or ''
                if fecha >= old:
                    sp.update({'id': k['id'] or sp.get('id'), 'total': k['total'], 'diarios': k['diarios'], 'fecha': fecha, 'fuente': 'kworb.net'})
            if resumen.get('Streams'):
                st, dl, tr = resumen.get('Streams'), resumen.get('Daily') or [None] * 4, resumen.get('Tracks') or [None] * 4
                P['spotify'].update({'streams_totales': st[0], 'streams_diarios': dl[0], 'canciones': tr[0], 'como_principal': st[1] if len(st) > 1 else None,
                                     'como_feat': st[3] if len(st) > 3 else None, 'fecha': fecha})
            HECHO.append(f'kworb canciones ({len(ks)}, dato {fecha})')
        except Exception as e:  # noqa: BLE001
            fallo('kworb canciones', e)

        # --- Spotify de colaboraciones que kworb tiene en la página de otro artista (más actualizada)
        co = dict(cfg.get('kworb_coartistas', {}))
        for titulo, aid in co.items():
            try:
                f2, ks2, _ = kworb_songs(aid)
                for k in ks2:
                    s = by_norm.get(norm(k['titulo']))
                    if s:
                        sp = s.setdefault('spotify', {})
                        if f2 >= (sp.get('fecha') or ''):
                            sp.update({'id': k['id'] or sp.get('id'), 'total': k['total'], 'diarios': k['diarios'], 'fecha': f2, 'fuente': f'kworb.net (página {aid})'})
            except Exception as e:  # noqa: BLE001
                fallo(f'kworb coartista {titulo}', e)

        # --- Álbumes
        log('Spotify · kworb álbumes')
        try:
            fa, alb = kworb_albums()
            old = {a['album']: a for a in data.get('albumes', [])}
            for a in alb:
                o = old.get(a['album'])
                if o:
                    o.update({'spotify_streams': a['spotify_streams'], 'spotify_diarios': a['spotify_diarios'], 'fecha_dato': fa})
                else:
                    data['albumes'].append({'album': a['album'], 'artista_principal': None, 'tipo': 'Álbum', 'fecha_lanzamiento': None, 'canciones': None,
                                            'spotify_streams': a['spotify_streams'], 'spotify_diarios': a['spotify_diarios'], 'youtube_vistas': None, 'fecha_dato': fa, 'fuente': 'kworb.net'})
            HECHO.append('kworb álbumes')
        except Exception as e:  # noqa: BLE001
            fallo('kworb álbumes', e)

        # --- Picos
        log('Spotify · picos')
        try:
            pk = kworb_peaks()
            alias = CFG.get('alias_picos') or {}
            for s in songs:
                mine = [p for p in pk if alias.get(norm(p['cancion']), norm(p['cancion'])) == norm(s['titulo'])]
                if mine:
                    s['picos'] = [{'pais': p['pais'], 'codigo': p['codigo'], 'pico': p['pico'], 'fecha': p['fecha']} for p in mine]
            HECHO.append(f'picos ({len(pk)})')
        except Exception as e:  # noqa: BLE001
            fallo('kworb picos', e)

        # --- Oyentes y API de Spotify
        try:
            oy, aprox, cambio = spotify_listeners()
            P['spotify']['oyentes_mensuales'] = oy
            P['spotify']['oyentes_aprox'] = aprox
            P['spotify']['oyentes_cambio_dia'] = cambio
            P['spotify']['fecha_oyentes'] = HOY
            P['spotify']['fuente'] = 'kworb.net (oyentes exactos) · Chartmetric (seguidores) · kworb.net (streams)' if not aprox else P['spotify'].get('fuente')
            HECHO.append('oyentes Spotify')
        except Exception as e:  # noqa: BLE001
            fallo('Spotify oyentes', e)
        try:
            spa = spotify_api()
            if spa:
                if spa.get('seguidores'):
                    P['spotify'].update({'seguidores': spa['seguidores'], 'seguidores_aprox': False, 'popularidad': spa.get('popularidad')})
                for al in spa['albums']:
                    fecha = al.get('release_date', '')
                    if fecha < (NOW - dt.timedelta(days=150)).strftime('%Y-%m-%d'):
                        continue
                    tr = get(f"https://api.spotify.com/v1/albums/{al['id']}/tracks", as_json=True, headers=spa['H'], params={'limit': 50})
                    for t in tr.get('items', []):
                        names = [a['name'] for a in t.get('artists', [])]
                        if not any(NAME_RE.search(n) for n in names):
                            continue
                        s = by_norm.get(norm(t['name']))
                        if not s:
                            s = {'titulo': t['name'], 'rol': 'Principal' if NAME_RE.search(names[0]) else 'Colaboración', 'artistas': ', '.join(names), 'id': slug(t['name']),
                                 'youtube': None, 'lanzamiento': fecha, 'lanzamiento_fuente': 'Spotify', 'album': None, 'shazam': None, 'audiomack': None, 'apple': None,
                                 'picos': [], 'listas': [], 'spotify': {'id': t['id'], 'total': None, 'diarios': None, 'fecha': None, 'fuente': 'Spotify'}}
                            songs.append(s)
                            by_norm[norm(t['name'])] = s
                            log(f'  + nuevo tema: {t["name"]}')
                        s.setdefault('spotify', {})['id'] = s['spotify'].get('id') or t['id']
                        s['lanzamiento'] = s.get('lanzamiento') or fecha
                        for a in t.get('artists', []):
                            if not NAME_RE.search(a['name']) and s['titulo'] not in co:
                                cfg.setdefault('kworb_coartistas', {})[s['titulo']] = a['id']
                HECHO.append('API Spotify')
        except Exception as e:  # noqa: BLE001
            fallo('API Spotify', e)

        # --- Apple Music (iTunes) y Deezer: nuevos lanzamientos y fechas
        log('Apple Music / Deezer')
        rel = []
        try:
            rel = itunes_releases()
            nuevos_desde = (NOW - dt.timedelta(days=120)).strftime('%Y-%m-%d')
            for r in rel:
                if not r['fecha']:
                    continue
                if (r.get('tracks') or 1) >= 4:  # los discos se tratan aparte, canción por canción
                    continue
                s = by_norm.get(norm(r['titulo']))
                if not s and r['fecha'] < nuevos_desde:
                    continue
                if not s:
                    s = {'titulo': r['titulo'], 'rol': 'Principal' if NAME_RE.match(r['artistas'] or '') else 'Colaboración', 'artistas': r['artistas'], 'id': slug(r['titulo']),
                         'youtube': None, 'lanzamiento': r['fecha'], 'lanzamiento_fuente': 'Apple Music', 'album': None, 'shazam': None, 'audiomack': None,
                         'apple': {'url': r['url']}, 'picos': [], 'listas': [], 'spotify': {'id': None, 'total': None, 'diarios': None, 'fecha': None, 'fuente': 'Aún sin dato'}}
                    songs.append(s)
                    by_norm[norm(r['titulo'])] = s
                    log(f'  + nuevo tema (Apple): {r["titulo"]}')
                s['lanzamiento'] = s.get('lanzamiento') or r['fecha']
                if not s.get('apple'):
                    s['apple'] = {'url': r['url']}
            newest = max((r for r in rel if r['fecha']), key=lambda r: r['fecha'], default=None)
            if newest:
                P['apple_music'].update({'ultimo_lanzamiento': newest['titulo'], 'fecha_ultimo': newest['fecha'], 'fecha': HOY})
            HECHO.append('Apple Music')
        except Exception as e:  # noqa: BLE001
            fallo('Apple Music (iTunes)', e)
        try:
            fans, dz = deezer()
            if fans:
                P['deezer'].update({'fans': fans, 'fecha': HOY})
            for r in dz:
                s = by_norm.get(norm(r['titulo']))
                if s and not s.get('lanzamiento') and r.get('fecha'):
                    s['lanzamiento'] = r['fecha']
                    s['lanzamiento_fuente'] = 'Deezer'
            HECHO.append('Deezer')
        except Exception as e:  # noqa: BLE001
            fallo('Deezer', e)

    # --- Spotify: reproducciones exactas de la página de cada tema (más al día que kworb)
    lim_sp = (NOW - dt.timedelta(days=90)).strftime('%Y-%m-%d')
    sp_todo = []
    if CFG.get('spotify_por_tema'):
        con_id = [x for x in songs if (x.get('spotify') or {}).get('id')]
        recientes_sp = [x for x in con_id if (x.get('lanzamiento') or '') >= lim_sp]
        # cada 30 min: los temas de los últimos 90 días; en la completa, además los 120 que más suenan (sin saturar a Spotify)
        top_sp = [] if RAPIDO else sorted(con_id, key=lambda x: -((x.get('spotify') or {}).get('diarios') or 0))[:120]
        sp_todo = list({id(x): x for x in recientes_sp + top_sp}.values())
    if sp_todo:
        log('Spotify · reproducciones por tema')

        def spc(x):
            try:
                return x, spotify_playcount(x['spotify']['id'])
            except Exception:  # noqa: BLE001
                return x, None
        n_sp = 0
        prueba = [spc(x) for x in sp_todo[:8]]
        if not any(pc for _, pc in prueba):
            # sin sesión la página no trae la cifra: se abre en un navegador real (si el workflow lo instaló)
            orden = sorted(sp_todo, key=lambda x: ((x.get('lanzamiento') or '') < lim_sp, -((x.get('spotify') or {}).get('diarios') or 0)))[:(25 if RAPIDO else 70)]
            vivos = spotify_playcounts_browser([x['spotify']['id'] for x in orden], limite_s=150 if RAPIDO else 300)
            prueba = [(x, vivos.get(x['spotify']['id'])) for x in orden]
            sp_todo = []
            if vivos:
                log(f'  · contador de Spotify leído con navegador ({len(vivos)} temas)')
        with cf.ThreadPoolExecutor(3) as ex:
            for x, pc in prueba + list(ex.map(spc, sp_todo[8:])):
                if not pc:
                    continue
                sp = x['spotify']
                if pc >= (sp.get('total') or 0):
                    hh = [r for r in sp.get('hist', []) if r.get('d') != HOY]
                    hh.append({'d': HOY, 't': NOW.strftime('%Y-%m-%dT%H:%M:%SZ'), 'v': pc})
                    sp['hist'] = hh[-10:]
                    if len(hh) >= 2:
                        a_, b_ = hh[-1], hh[-2]
                        days = (dt.datetime.fromisoformat(a_['t'].replace('Z', '+00:00')) - dt.datetime.fromisoformat(b_['t'].replace('Z', '+00:00'))).total_seconds() / 86400
                        if days >= 0.5 and a_['v'] >= b_['v']:
                            sp['diarios'] = int((a_['v'] - b_['v']) / days)
                            sp['diarios_fuente'] = 'Spotify (calculado)'
                    sp.update({'total': pc, 'fecha': HOY, 'fuente': 'Spotify (página del tema)'})
                    n_sp += 1
        HECHO.append(f'Spotify por tema ({n_sp}/{len(sp_todo)})') if n_sp else None
        if not n_sp:
            fallo('Spotify por tema', 'Spotify no mostró el contador ni con navegador (se usa kworb)')

    # --- YouTube: canal, nuevos videos y vistas por video
    log('YouTube')
    channel_vids = []
    if yt_key:
        try:
            ch, channel_vids = yt_channel_api(yt_key)
            P['youtube'].update(ch, fecha=HOY, fuente='YouTube Data API', suscriptores_aprox=True)
            HECHO.append('YouTube API canal')
        except Exception as e:  # noqa: BLE001
            fallo('YouTube API canal', e)
    try:
        rss = yt_rss()
        data['yt_subidas'] = rss[:15]
        channel_vids += [v for v in rss if v['video_id'] not in {c['video_id'] for c in channel_vids}]
        HECHO.append('YouTube RSS')
    except Exception as e:  # noqa: BLE001
        fallo('YouTube RSS', e)
    kw_vids = []
    try:
        kw_vids = kworb_yt_artist()
        data['yt_kworb'] = len(kw_vids)
        HECHO.append(f'kworb YouTube ({len(kw_vids)} vídeos)')
    except Exception as e:  # noqa: BLE001
        fallo('kworb YouTube artista', e)
    # créditos reales de cada tema (quién colabora), para reconocer el canal oficial de cualquier artista, verificado o no
    # 1) kworb: créditos de Spotify (la referencia)
    try:
        lim_c = (NOW - dt.timedelta(days=60)).strftime('%Y-%m-%d')
        sin_c = [x for x in songs if (x.get('spotify') or {}).get('id') and not x.get('creditos_sp') and (not RAPIDO or (x.get('lanzamiento') or '') >= lim_c)]
        sin_c = sorted(sin_c, key=lambda x: (bool(x.get('youtube')), x.get('lanzamiento') or ''), reverse=False)[:(10 if RAPIDO else 500)]

        def _cr(x):
            try:
                return x, kworb_creditos(x['spotify']['id'])
            except Exception:  # noqa: BLE001
                try:
                    return x, spotify_creditos(x['spotify']['id'])
                except Exception:  # noqa: BLE001
                    return x, None
        n_c = 0
        with cf.ThreadPoolExecutor(6) as ex:
            for x, names in ex.map(_cr, sin_c):
                if names:
                    x['creditos_sp'] = names
                    if len(names) > 1:
                        x['artistas'] = ', '.join(names)
                    n_c += 1
        if sin_c:
            HECHO.append(f'créditos de artistas ({n_c}/{len(sin_c)})')
    except Exception as e:  # noqa: BLE001
        fallo('créditos de artistas', e)
    # 2) Apple/iTunes en lote (pocas consultas para todos los temas)
    try:
        def _aid(x):
            a = x.get('apple') or {}
            if a.get('id'):
                return str(a['id'])
            m = re.search(r'[?&]i=(\d+)|/song/[^/]+/(\d+)', a.get('url') or '')
            return (m.group(1) or m.group(2)) if m else None
        por_id = {}
        for x in songs:
            if _aid(x) and (not x.get('creditos') or not RAPIDO):
                por_id.setdefault(_aid(x), []).append(x)
        ids = list(por_id)
        n_a = 0
        for i in range(0, len(ids), 150):
            try:
                j = get('https://itunes.apple.com/lookup', as_json=True, params={'id': ','.join(ids[i:i + 150]), 'entity': 'song'}, tries=2)
            except Exception:  # noqa: BLE001
                continue
            for r in j.get('results', []):
                for x in por_id.get(str(r.get('trackId')), []):
                    if (x.get('apple') or {}).get('fijo'):
                        continue
                    dur, ad = x.get('duracion_ms'), r.get('trackTimeMillis')
                    año_s, año_a = (x.get('lanzamiento') or '')[:4], (r.get('releaseDate') or '')[:4]
                    otros_sp = {_f(n) for n in (x.get('creditos_sp') or []) if not NAME_RE.search(n)}
                    otros_ap = {_f(n) for n in re.split(r'\s*(?:,|&|\bfeat\.?|\bft\.?|\bwith\b)\s*', r.get('artistName') or '', flags=re.I) if n and not NAME_RE.search(n)}
                    def _solapa(a_, b_):
                        return any(p1 == p2 or (len(p1) >= 4 and (p1 in p2 or p2 in p1)) for p1 in a_ for p2 in b_)
                    def _nucleo(t):
                        return _f(re.sub(r'\s+-\s+(?:.*\b(?:remix|rmx|version|versión|live|en vivo|edit|mix|acoustic|acústico|sped|slowed)\b.*|single|ep)$', '', re.sub(r'\s*[\(\[].*?[\)\]]', '', str(t or '')), flags=re.I))
                    def _laxo(t):  # sin nada tras « - » («Familia - Spider-Man: …» = «Familia»)
                        return _f(re.sub(r'\s+-\s+.*$', '', re.sub(r'\s*[\(\[].*?[\)\]]', '', str(t or ''))))
                    falsa = bool(FALSA_VERSION.search(' '.join(str(r.get(k) or '') for k in ('trackName', 'artistName', 'collectionName')))) \
                        or not (NAME_RE.search(r.get('artistName') or '') or NAME_RE.search(r.get('trackName') or '')) \
                        or (_nucleo(r.get('trackName')) and _nucleo(x['titulo']) and _nucleo(r.get('trackName')) != _nucleo(x['titulo'])
                            and _laxo(r.get('trackName')) != _laxo(x['titulo']))
                    if falsa or (otros_sp and otros_ap and not _solapa(otros_sp, otros_ap)):
                        # el enlace de Apple era otra canción con el mismo nombre: se quita (y lo que vino de ella)
                        log(f'  - Apple desenlazado de {x["titulo"]}: era «{r.get("trackName")}» de {r.get("artistName")}')
                        art_ = x.get('portada_hd')
                        x.pop('apple', None); x.pop('apple_buscado', None)
                        if art_ and x.get('portada') == art_:
                            x.pop('portada', None)
                        x.pop('portada_hd', None)
                        if x.get('lanzamiento_fuente') == 'Apple Music':
                            x.pop('lanzamiento', None); x.pop('lanzamiento_fuente', None)
                        if x.get('creditos') == [r.get('artistName')]:
                            x.pop('creditos', None)
                        if x.get('artistas') == r.get('artistName'):
                            x['artistas'] = ', '.join(x['creditos_sp']) if x.get('creditos_sp') else ARTISTA
                        sh = x.get('shazam') or {}
                        if sh.get('url') and str(r.get('trackId')) in sh.get('url', ''):
                            x.pop('shazam', None)
                        continue
                    if r.get('artistName'):
                        x['creditos'] = [r['artistName']]
                        if not x.get('creditos_sp') and (not x.get('artistas') or x.get('artistas') == ARTISTA) and not NAME_RE.fullmatch(r['artistName'].strip()):
                            x['artistas'] = r['artistName']
                        n_a += 1
        if ids:
            HECHO.append(f'créditos Apple ({n_a}/{len(ids)})')
    except Exception as e:  # noqa: BLE001
        fallo('créditos Apple', e)
    if data.get('yt_reglas') != 5:  # reglas nuevas: se vuelve a dar oportunidad a los vídeos rechazados antes
        data['yt_vetados'] = []
        data['yt_reglas'] = 5
    def limpiar_videos():
        quitados = 0
        vetados = set(data.get('yt_vetados') or [])
        for s in songs:
            y = s.get('youtube') or {}
            if not y or y.get('fijo') or not y.get('canal'):
                continue
            can_ = y.get('canal') or ''
            _fan = bool(NAME_RE.search(can_) or re.match(r'anuel', can_, re.I)) and not can_.lower().endswith('- topic')
            if es_canal_anuel(can_, y.get('canal_id')):
                continue  # su canal oficial (o su VEVO)
            if y.get('canal_id') and y['canal_id'] in set(CFG.get('canales_falsos') or []):
                malo = True
            elif _fan and can_ in (ARTISTA, CANAL_VEVO_ANUEL) and not y.get('canal_id'):
                continue  # sin ID aún: se decide cuando la API dé su canal
            elif _fan and (y.get('canal_id') or can_ != ARTISTA):
                malo = True  # se llama «Anuel…» (AnuelVEVO, ANUEL AA OFICIAL…) pero no es su canal
            elif y.get('origen') == 'rss' or (y.get('origen') is None and can_ == ARTISTA):
                continue  # de su propio canal
            else:
                malo = bool(s.get('creditos') or s.get('creditos_sp')) and canal_oficial({'canal': can_, 'canal_id': y.get('canal_id'), 'verificado': y.get('verificado'), 'titulo': y.get('titulo')}, s) is False
            if malo:
                log(f'  - vídeo no oficial quitado de {s["titulo"]}: {can_}')
                vetados.add(y.get('video_id'))
                s.pop('youtube', None)
                s.pop('yt_buscado', None)
                quitados += 1
        vetados.discard(None)
        data['yt_vetados'] = sorted(vetados)[-2000:]
        DATA_VETO[:] = data['yt_vetados']
        return quitados
    _q = limpiar_videos()
    vetados = set(data.get('yt_vetados') or [])
    sin_video = {norm(t) for t in (CFG.get('sin_video') or [])}  # temas que no tienen vídeo oficial: no se les pone ninguno
    for s in songs:
        if norm(s['titulo']) in sin_video:
            if s.get('youtube'):
                vetados.add(s['youtube'].get('video_id'))
            s['youtube'] = None
            s['yt_buscado'] = s['yt_revisado'] = s['yt_api_buscado'] = '9999-12-31'
    manual = {norm(k): re.sub(r'^.*(?:v=|youtu\.be/|shorts/)([\w-]{11}).*$', r'\1', str(v).strip()) for k, v in (CFG.get('videos') or {}).items()}
    for s in songs:
        vid_ = manual.get(norm(s['titulo']))
        if vid_ and re.fullmatch(r'[\w-]{11}', vid_) and (s.get('youtube') or {}).get('video_id') != vid_:
            s['youtube'] = {'video_id': vid_, 'titulo': s['titulo'], 'canal': None, 'vistas': None, 'likes': None, 'publicado': None, 'fecha': HOY, 'fuente': 'videoclip fijado (config.json)', 'fijo': True, 'origen': 'fijo'}
            log(f'  = vídeo fijado para {s["titulo"]}: {vid_}')
        if vid_ and (s.get('youtube') or {}).get('fijo') and not s['youtube'].get('canal'):
            try:
                oe = get('https://www.youtube.com/oembed', as_json=True, params={'url': f'https://www.youtube.com/watch?v={vid_}', 'format': 'json'}, tries=2)
                s['youtube'].update(titulo=oe.get('title') or s['youtube']['titulo'], canal=oe.get('author_name'))
            except Exception:  # noqa: BLE001
                pass
    if kw_vids:
        by_id = {v['video_id']: v for v in kw_vids}
        lyric = re.compile(r'lyric|letra|audio|visualizer|en vivo|live|remix', re.I)
        for s in songs:
            if s.get('yt_buscado') == '9999-12-31':
                continue
            y = s.get('youtube')
            if y and y.get('video_id') in by_id:  # ya tenía vídeo: vistas y vistas de ayer de kworb
                v = by_id[y['video_id']]
                if v.get('vistas') and (not y.get('vistas') or v['vistas'] >= y['vistas']):
                    y['vistas'] = v['vistas']
                if v.get('ayer') is not None:
                    y['ayer'] = v['ayer']
                y.setdefault('publicado', v.get('publicado'))
                continue
            if y:
                continue
            best = None
            for v in kw_vids:
                if v['video_id'] in vetados:
                    continue
                sc = yt_match_score(s['titulo'], v['titulo'])
                if not sc:
                    continue
                if lyric.search(v['titulo']) and not lyric.search(s['titulo']):
                    sc -= 0.5
                key_ = (sc, v.get('vistas') or 0)
                if not best or key_ > best[0]:
                    best = (key_, v)
            if best and best[0][0] >= 2:
                v = best[1]
                s['youtube'] = {'video_id': v['video_id'], 'titulo': v['titulo'], 'canal': ARTISTA, 'vistas': v.get('vistas'), 'ayer': v.get('ayer'), 'likes': None,
                                'publicado': v.get('publicado'), 'fecha': HOY, 'fuente': 'kworb.net (YouTube)', 'origen': 'kworb'}
    for v in channel_vids:  # asigna videos nuevos a canciones sin video
        tv = norm(re.sub(r'\[.*?\]|\(.*?(video|visualizer|audio|lyric).*?\)', '', v['titulo'], flags=re.I))
        for s in songs:
            if s.get('youtube') or s.get('yt_buscado') == '9999-12-31':
                continue
            b = base(s['titulo'])
            if len(b) >= 3 and re.search(r'(^|[\s\-"“])' + re.escape(b) + r'($|[\s\-"”(])', tv):
                s['youtube'] = {'video_id': v['video_id'], 'titulo': v['titulo'], 'canal': ARTISTA, 'vistas': v.get('vistas'), 'likes': None,
                                'publicado': v.get('publicado'), 'fecha': HOY, 'fuente': 'YouTube RSS', 'origen': 'rss', 'canal_id': YT_CHANNEL}
                log(f'  + video para {s["titulo"]}: {v["video_id"]}')
    if True:  # búsqueda gratis (sin gastar cupo de la API): siempre primero
        hace7 = (NOW - dt.timedelta(days=7)).strftime('%Y-%m-%d')
        hace1 = (NOW - dt.timedelta(days=1)).strftime('%Y-%m-%d')
        lim120 = (NOW - dt.timedelta(days=120)).strftime('%Y-%m-%d')
        flojo = lambda x: not x.get('youtube') or (not x['youtube'].get('fijo') and not es_oficial(x['youtube']))  # sin vídeo o con audio/letra
        # recientes SIN vídeo: en cada actualización (cada 30 min) hasta encontrarlo; con audio/letra: se intenta mejorar una vez al día
        recientes = [x for x in songs if flojo(x) and x.get('yt_buscado') != '9999-12-31' and (x.get('lanzamiento') or '') >= lim120 and (not x.get('youtube') or (x.get('yt_buscado') or '') < hace1)]
        viejos = sorted([x for x in songs if flojo(x) and (x.get('lanzamiento') or '') < lim120 and (x.get('yt_buscado') or '') < hace7],
                        key=lambda x: (bool(x.get('youtube')), -((x.get('spotify') or {}).get('total') or 0)))
        cola = (sorted(recientes, key=lambda x: x.get('lanzamiento') or '', reverse=True)[:(12 if RAPIDO else 40)] + viejos[:(6 if RAPIDO else 40)])
        if not RAPIDO:  # una vez por semana se revisa si hay un vídeo oficial mejor (más visto) que el encontrado
            ya = {id(x) for x in cola}
            cola += sorted([x for x in songs if id(x) not in ya and (x.get('youtube') or {}).get('origen') == 'busqueda' and not x['youtube'].get('fijo')
                            and (x.get('yt_revisado') or '') < hace7], key=lambda x: x.get('yt_revisado') or '')[:25]
        hallados = errores = 0
        for x in cola:
            x['yt_buscado'] = HOY
            r = None
            x['_bloq'] = False
            for q_ in (f"{base(x['titulo'])} {BUSCAR} video oficial", f"{base(x['titulo'])} {BUSCAR}"):
                try:
                    r = yt_pick(x, yt_search_scrape(q_))
                except Exception:  # noqa: BLE001
                    errores += 1
                    x['_bloq'] = True
                    r = None
                if r and es_oficial(r):
                    break
                time.sleep(0.4)
            x['yt_revisado'] = HOY
            cur = x.get('youtube') or {}
            mejor = bool(r) and r['video_id'] != cur.get('video_id') and (
                not cur or (es_oficial(r) and not es_oficial(cur)) or
                (es_oficial(r) == es_oficial(cur) and (r.get('vistas') or 0) > 2 * (cur.get('vistas') or 0) and cur.get('origen') == 'busqueda'))
            if mejor:
                x['youtube'] = {'video_id': r['video_id'], 'titulo': r['titulo'], 'canal': r['canal'], 'canal_id': r.get('canal_id'), 'verificado': r.get('verificado'), 'vistas': r.get('vistas') if isinstance(r.get('vistas'), int) else None,
                                'likes': None, 'publicado': None, 'fecha': HOY, 'fuente': 'YouTube (búsqueda)', 'origen': 'busqueda'}
                hallados += 1
                log(f'  + videoclip para {x["titulo"]}: {r["video_id"]} ({r["canal"]})')
            time.sleep(0.6)
        if cola:
            HECHO.append(f'videoclips encontrados en YouTube ({hallados}/{len(cola)}' + (f', {errores} búsquedas bloqueadas' if errores else '') + ')')
    if yt_key:  # la API (100 unidades por búsqueda) solo para lo que la búsqueda gratis no pudo mirar, con tope diario
        cuota = data.get('yt_cuota') or {}
        if cuota.get('d') != HOY:
            cuota = {'d': HOY, 'busquedas': 0}
        TOPE = 40  # 40 búsquedas = 4.000 unidades/día como máximo (el límite gratis es 10.000)
        _lim = (NOW - dt.timedelta(days=120)).strftime('%Y-%m-%d')
        _sin = [x for x in songs if x.get('yt_buscado') != '9999-12-31' and (x.get('_bloq') or (x.get('_bloq') is False and not x.get('youtube') and (x.get('lanzamiento') or '') >= _lim))
                and (x.get('yt_api_buscado') or '') != HOY
                and (not x.get('youtube') or (not x['youtube'].get('fijo') and not es_oficial(x['youtube'])))]
        _sin.sort(key=lambda x: ((x.get('lanzamiento') or '') < _lim, bool(x.get('youtube')), -((x.get('spotify') or {}).get('total') or 0)))
        for s in _sin[:max(0, min(4 if RAPIDO else 12, TOPE - cuota['busquedas']))]:
            s['yt_api_buscado'] = HOY
            cuota['busquedas'] += 1
            try:
                res = yt_search_api(yt_key, f"{base(s['titulo'])} {BUSCAR}")
                hit = yt_pick(s, res)
                if hit and (not s.get('youtube') or es_oficial(hit)) and hit['video_id'] != (s.get('youtube') or {}).get('video_id'):
                    s['youtube'] = dict(hit, vistas=None, likes=None, fecha=HOY, fuente='YouTube Data API', origen='busqueda')
                    log(f'  + videoclip (API) para {s["titulo"]}: {hit["video_id"]} ({hit["canal"]})')
            except Exception as e:  # noqa: BLE001
                fallo(f'búsqueda YouTube {s["titulo"]}', e)
        data['yt_cuota'] = cuota
    for x in songs:
        x.pop('_bloq', None)
    vids = [s['youtube']['video_id'] for s in songs if s.get('youtube') and s['youtube'].get('video_id')]
    got = {}
    if yt_key:
        try:
            got = yt_api(yt_key, vids)
            HECHO.append(f'YouTube API videos ({len(got)})')
        except Exception as e:  # noqa: BLE001
            fallo('YouTube API videos', e)
    rest = [v for v in vids if v not in got]
    if RAPIDO and rest:  # cada 10 min: temas recientes y los 40 más vistos (el resto en la completa)
        lim_r = (NOW - dt.timedelta(days=120)).strftime('%Y-%m-%d')
        top = sorted([s for s in songs if s.get('youtube')], key=lambda s: -((s['youtube'].get('vistas')) or 0))[:40]
        keep_ = {s['youtube'].get('video_id') for s in top} | {s['youtube'].get('video_id') for s in songs if s.get('youtube') and (s.get('lanzamiento') or '') >= lim_r}
        rest = [v for v in rest if v in keep_]
    if rest:
        ok = 0
        # secuencial con pausa para no saturar el servicio
        exact = 0
        def watch(vid):
            try:
                return vid, yt_watch(vid)
            except Exception:  # noqa: BLE001
                return vid, {}
        with cf.ThreadPoolExecutor(4) as ex:  # en paralelo (4 a la vez) para que tarde poco
            exacts = dict(ex.map(watch, rest))
        for vid in rest:
            r_ = dict(exacts.get(vid) or {})
            if r_.get('vistas'):  # 1) cifra exacta de la página del vídeo
                r_['fuente'] = 'YouTube (página del vídeo)'
                exact += 1
            if not r_.get('likes') or not r_.get('vistas'):
                try:  # 2) returnyoutubedislikeapi (puede ir unas horas por detrás)
                    rd = ryd(vid)
                    if not r_.get('vistas'):
                        r_ = dict(rd, fuente='returnyoutubedislikeapi.com')
                    elif rd.get('likes') is not None:
                        r_['likes'] = rd['likes']
                except Exception:  # noqa: BLE001
                    pass
            if r_.get('vistas'):
                got[vid] = r_
                ok += 1
        HECHO.append(f'vistas YouTube ({ok}/{len(rest)}; {exact} exactas de YouTube)')
        if ok < len(rest):
            fallo('returnyoutubedislikeapi', f'{len(rest) - ok} videos sin respuesta (se conserva su dato anterior)')
    for s in songs:
        y = s.get('youtube')
        if y and y.get('video_id') in got:
            g = got[y['video_id']]
            for k, v in g.items():
                if v is not None and k != 'fuente':
                    y[k] = v
            y['fecha'] = HOY
            y['fuente'] = 'YouTube Data API' if 'comentarios' in g else g.get('fuente', 'returnyoutubedislikeapi.com')
            if y.get('vistas'):  # historial: último valor de cada día (para calcular las vistas diarias)
                hh = [x for x in y.get('hist', []) if x.get('d') != HOY]
                hh.append({'d': HOY, 't': NOW.strftime('%Y-%m-%dT%H:%M:%SZ'), 'v': y['vistas']})
                y['hist'] = hh[-10:]
    _q += limpiar_videos()  # ya con el canal real de cada vídeo: lo infiltrado no llega a publicarse
    if _q:
        HECHO.append(f'vídeos de canales no oficiales quitados ({_q})')

    # --- Tendencias de música EN DIRECTO en cada país (la insignia «N.º X en el top de vídeos musicales» de cada vídeo)
    try:
        lim_b = (NOW - dt.timedelta(days=45 if RAPIDO else 120)).strftime('%Y-%m-%d')
        cand_b = [x for x in songs if (x.get('youtube') or {}).get('video_id') and not (x['youtube'].get('canal') or '').endswith('- Topic')
                  and ((x.get('lanzamiento') or '') >= lim_b or (x['youtube'].get('tendencias') or {}).get('paises'))]
        cand_b = sorted(cand_b, key=lambda x: -((x['youtube'].get('ayer') or 0)))[:(8 if RAPIDO else 20)]
        pares = [(x, cc) for x in cand_b for cc in BADGE_CC]

        def _bd(par):
            x, cc = par
            try:
                return x, cc, yt_badge(x['youtube']['video_id'], cc), True
            except Exception:  # noqa: BLE001
                return x, cc, None, False
        res_b, leidos = {}, 0
        hechos_b = 0
        if pares:
            with cf.ThreadPoolExecutor(8) as ex:
                for i in range(0, len(pares), 16):
                    lote = pares[i:i + 16]
                    hechos_b += len(lote)
                    for x, cc, pos, ok_ in ex.map(_bd, lote):
                        if ok_:
                            leidos += 1
                            res_b.setdefault(x['id'], (x, {}))[1][cc] = pos
                    if leidos == 0:  # YouTube está bloqueando: no insistir
                        break
        for x, paises in res_b.values():
            dentro = {cc: p for cc, p in paises.items() if p}
            # si YouTube devolviera el mismo puesto en todos los países, no es por país: se queda solo España
            if len(dentro) >= 6 and len(set(dentro.values())) == 1:
                dentro = {k: v for k, v in dentro.items() if k == 'es'}
            x['youtube']['tendencias'] = {'paises': {cc.upper(): p for cc, p in sorted(dentro.items(), key=lambda kv: kv[1])},
                                          'fecha': HOY, 'hora': NOW.strftime('%H:%M'), 'revisados': len(paises)}
        if pares:
            HECHO.append(f'tendencias YouTube en directo ({len(res_b)} vídeos, {leidos}/{len(pares)} páginas)')
            if leidos < len(pares) * 0.5:
                fallo('tendencias YouTube en directo', f'YouTube bloqueó {hechos_b - leidos} de {hechos_b} consultas (se usan las de kworb)')
    except Exception as e:  # noqa: BLE001
        fallo('tendencias YouTube en directo', e)

    if not RAPIDO:
        # --- Social Blade (canal, Instagram, TikTok)
        if not yt_key:
            try:
                ya = youtube_about()
                P['youtube'].update({k: v for k, v in ya.items() if v}, fecha=HOY, fuente='YouTube (página del canal)', suscriptores_aprox=True)
                HECHO.append('YouTube canal')
                yt_ok = True
            except Exception as e:  # noqa: BLE001
                fallo('YouTube canal', e)
                yt_ok = False
        if not yt_key and not yt_ok:
            try:
                sb = socialblade(f'https://socialblade.com/youtube/handle/{YT_HANDLE}', {'suscriptores': r'Subscribers\s+([\d.,]+[KMB]?)', 'vistas': r'Video Views\s+([\d,]+)', 'videos': r'Uploads\s+([\d,]+)'})
                if sb.get('vistas'):
                    P['youtube'].update({k: v for k, v in sb.items() if v}, fecha=HOY, fuente='Social Blade')
                    HECHO.append('Social Blade YouTube')
                else:
                    raise RuntimeError('no se encontraron cifras')
            except Exception as e:  # noqa: BLE001
                fallo('Social Blade YouTube', e)
        try:
            ig = socialblade(f'https://socialblade.com/instagram/user/{IG_USER}', {'seguidores': r'Followers\s+([\d.,]+[KMB]?)', 'siguiendo': r'Following\s+([\d.,]+)', 'publicaciones': r'Media(?: Uploads)?\s+([\d.,]+)'})
            if ig.get('seguidores'):
                P['instagram'].update({k: v for k, v in ig.items() if v}, fecha=HOY, fuente='Social Blade')
                HECHO.append('Instagram')
            else:
                raise RuntimeError('no se encontraron cifras')
        except Exception as e:  # noqa: BLE001
            fallo('Instagram (Social Blade)', e)
        try:
            tt = socialblade(f'https://socialblade.com/tiktok/user/{TT_USER}', {'seguidores': r'Followers\s+([\d.,]+[KMB]?)', 'me_gusta': r'Likes\s+([\d.,]+[KMB]?)', 'videos': r'(?:Uploads|Videos)\s+([\d,]+)'})
            if tt.get('seguidores'):
                P['tiktok'].update({k: v for k, v in tt.items() if v}, fecha=HOY, fuente='Social Blade')
                HECHO.append('TikTok')
            else:
                raise RuntimeError('no se encontraron cifras')
        except Exception as e:  # noqa: BLE001
            fallo('TikTok (Social Blade)', e)

        # --- Chartmetric (X, Facebook, Pandora, ranking, playlists) y HypeAuditor (Instagram)
        try:
            if not CM_ID:
                raise RuntimeError('sin ID de Chartmetric en config.json (se omite)')
            txt = re.sub(r'\s+', ' ', BeautifulSoup(get(f'https://chartmetric.com/artist/{CM_ID}'), 'lxml').get_text(' '))
            num = r'([\d.,]+\s*[KMB]?)'
            found = {}
            for key, pat in {'x': r'X Followers\s*' + num, 'facebook': r'Facebook Followers\s*' + num, 'pandora_ml': r'Pandora.{0,40}?Monthly Listeners\s*' + num,
                             'rank': r'Chartmetric Rank\D{0,25}?([\d,]{2,})(?:st|nd|rd|th)', 'playlists': r'Playlist Count\s*' + num, 'reach': r'Playlist Reach\s*' + num,
                             'sp_followers': r'Spotify.{0,40}?Followers\s*' + num, 'tt_followers': r'TikTok.{0,40}?Followers\s*' + num, 'shazams': r'Shazams\s*' + num}.items():
                m = re.search(pat, txt, re.I)
                if not m and key == 'rank':
                    m = re.search(r'([\d,]{1,7})(?:st|nd|rd|th)\s*Chartmetric Rank', txt, re.I)
                if m:
                    found[key] = compact(m.group(1))
            if not found:
                raise RuntimeError('la página no trajo cifras (se cargan con JavaScript)')
            if found.get('x'): P.setdefault('x', {}).update(seguidores=found['x'], aprox=True, fecha=HOY, fuente='Chartmetric')
            if found.get('facebook'): P.setdefault('facebook', {}).update(seguidores=found['facebook'], aprox=True, fecha=HOY, fuente='Chartmetric')
            if found.get('pandora_ml'): P.setdefault('pandora', {}).update(oyentes_mensuales=found['pandora_ml'], aprox=True, fecha=HOY, fuente='Chartmetric')
            cm = P.setdefault('chartmetric', {})
            if found.get('rank'): cm.update(rank=found['rank'], fecha=HOY, fuente='chartmetric.com')
            if found.get('playlists'): cm.update(playlists_spotify=found['playlists'])
            if found.get('reach'): cm.update(alcance_playlists=found['reach'])
            if found.get('shazams'): P['shazam'].update(total=found['shazams'], aprox=True, fecha=HOY, fuente='Chartmetric')
            if found.get('sp_followers') and not P['spotify'].get('seguidores_aprox') is False:
                P['spotify'].update(seguidores=found['sp_followers'], seguidores_aprox=True)
            HECHO.append(f'Chartmetric ({len(found)} cifras)')
        except Exception as e:  # noqa: BLE001
            fallo('Chartmetric', e)

        # --- Apple Music por canción: ID (sirve para su Shazam) y portada en alta calidad
        def apple_id_of(x):
            m = re.search(r'[?&]i=(\d+)', ((x.get('apple') or {}).get('url') or ''))
            return m.group(1) if m else (x.get('apple') or {}).get('id')
        # enlaces de Apple fijados a mano en config.json («apple»: {"Tema": "enlace de canción o de álbum/single"})
        for tit_, url_ in (CFG.get('apple') or {}).items():
            x = next((y for y in songs if norm(y['titulo']) == norm(tit_)), None)
            if not x or ((x.get('apple') or {}).get('fijo') and (x.get('apple') or {}).get('fuente_url') == url_):
                continue
            try:
                m_ = re.search(r'[?&]i=(\d+)', url_) or re.search(r'/song/[^/]+/(\d+)', url_)
                if m_:
                    res_ = get('https://itunes.apple.com/lookup', as_json=True, params={'id': m_.group(1)}, tries=2).get('results', [])
                    r = res_[0] if res_ else None
                else:
                    alb = re.search(r'/album/[^/]+/(\d+)', url_).group(1)
                    res_ = get('https://itunes.apple.com/lookup', as_json=True, params={'id': alb, 'entity': 'song'}, tries=2).get('results', [])
                    pist = [y for y in res_ if y.get('wrapperType') == 'track']
                    r = next((y for y in pist if _fold(re.split(r' [(\[]', y.get('trackName') or '')[0]) == _fold(re.split(r' [(\[]', x['titulo'])[0])), pist[0] if len(pist) == 1 else None)
                if r:
                    x['apple'] = {'url': (r.get('trackViewUrl') or url_).split('&uo')[0], 'id': str(r.get('trackId')), 'fijo': True, 'fuente_url': url_}
                    art_ = (r.get('artworkUrl100') or '').replace('100x100bb', '1400x1400bb')
                    if art_:
                        x['portada_hd'] = art_
                    if r.get('artistName'):
                        x['creditos'] = [r['artistName']]
                    log(f'  = Apple fijado para {x["titulo"]}: {r.get("trackName")} ({r.get("artistName")})')
            except Exception as e:  # noqa: BLE001
                fallo(f'Apple fijado {tit_}', e)
        lim120a = (NOW - dt.timedelta(days=120)).strftime('%Y-%m-%d')
        hace10 = (NOW - dt.timedelta(days=10)).strftime('%Y-%m-%d')
        cola_a = [x for x in songs if not apple_id_of(x) and ((x.get('lanzamiento') or '') >= lim120a or (x.get('apple_buscado') or '') < hace10)]
        cola_a.sort(key=lambda x: ((x.get('lanzamiento') or '') < lim120a, -((x.get('spotify') or {}).get('total') or 0)))
        ap_ok = 0
        for x in cola_a[:80]:
            x['apple_buscado'] = HOY
            t0 = re.split(r'\s+\((?:with|feat|ft|con)\b|\s+-\s+', x['titulo'], flags=re.I)[0]
            try:
                j = get('https://itunes.apple.com/search', as_json=True, params={'term': f'{t0} {ARTISTA}', 'entity': 'song', 'limit': 15, 'country': 'us'}, tries=2)
            except Exception:  # noqa: BLE001
                time.sleep(3)
                continue
            ft = _fold(t0)
            def _nuc(t):
                return _f(re.sub(r'\s+-\s+(?:.*\b(?:remix|rmx|version|versión|live|en vivo|edit|mix|acoustic|acústico|sped|slowed)\b.*|single|ep)$', '', re.sub(r'\s*[\(\[].*?[\)\]]', '', str(t or '')), flags=re.I))
            def _lax(t):
                return _f(re.sub(r'\s+-\s+.*$', '', re.sub(r'\s*[\(\[].*?[\)\]]', '', str(t or ''))))
            hits = [r for r in j.get('results', []) if (_nuc(r.get('trackName')) == _nuc(x['titulo']) or _lax(r.get('trackName')) == _lax(x['titulo']))
                    and (NAME_RE.search(r.get('artistName') or '') or NAME_RE.search(r.get('trackName') or ''))
                    and not FALSA_VERSION.search(' '.join(str(r.get(k) or '') for k in ('trackName', 'artistName', 'collectionName')))]
            otros_sp = {_f(n) for n in (x.get('creditos_sp') or []) if not NAME_RE.search(n)}
            if otros_sp:  # mismos artistas que en Spotify (6ix9ine ≠ Ozuna)
                hits = [r for r in hits if otros_sp & {_f(n) for n in re.split(r'\s*(?:,|&|\bfeat\.?|\bft\.?|\bwith\b)\s*', r.get('artistName') or '', flags=re.I) if n}]
            dur = x.get('duracion_ms')
            if dur:  # se prefiere la de duración parecida (sin descartar)
                pass
            hits.sort(key=lambda r: (_fold(r.get('trackName')) != _fold(x['titulo']), 'remix' in (r.get('trackName') or '').lower() and 'remix' not in x['titulo'].lower(),
                                     abs((r.get('trackTimeMillis') or 0) - (dur or 0)) if dur else 0))
            if hits:
                r = hits[0]
                x['apple'] = dict(x.get('apple') or {}, url=(r.get('trackViewUrl') or '').split('&uo')[0], id=str(r.get('trackId')))
                art_ = (r.get('artworkUrl100') or '').replace('100x100bb', '1400x1400bb')
                if art_:
                    x['portada_hd'] = art_
                    if not x.get('portada'):
                        x['portada'] = art_
                if not x.get('lanzamiento') and r.get('releaseDate'):
                    x['lanzamiento'] = r['releaseDate'][:10]
                    x['lanzamiento_fuente'] = 'Apple Music'
                ap_ok += 1
            time.sleep(3.1)  # iTunes permite unas 20 búsquedas por minuto
        if cola_a:
            HECHO.append(f'Apple Music por canción ({ap_ok}/{min(45, len(cola_a))})')
        for x in songs:  # su página de Shazam usa el mismo ID que Apple Music
            aid = apple_id_of(x)
            if aid and not (x.get('shazam') or {}).get('url'):
                x['shazam'] = dict(x.get('shazam') or {}, url=f'https://www.shazam.com/song/{aid}/{slug(x["titulo"])}')

        # --- Shazam por canción (Audiomack no se puede leer sin navegador: se conserva su dato)
        sh_ok = sh_fail = 0
        # Shazam limita si se le pide mucho de golpe: de una en una, con pausa, empezando por las que llevan más tiempo sin leerse.
        # Si bloquea 6 seguidas, se para y sigue en la próxima actualización (así, poco a poco, se leen todas).
        cola_s = sorted([x for x in songs if (x.get('shazam') or {}).get('url')],
                        key=lambda x: (x['shazam'].get('fecha') or '', -((x.get('spotify') or {}).get('diarios') or 0)))[:60]
        seguidos = 0
        for x in cola_s:
            try:
                n = shazam_count(x['shazam']['url'])
            except Exception:  # noqa: BLE001
                n = None
            if n:
                x['shazam'].update({'total': n, 'fecha': HOY})
                sh_ok += 1
                seguidos = 0
            else:
                sh_fail += 1
                seguidos += 1
                if seguidos >= 6:
                    break
            time.sleep(2.5)
        pendientes = sum(1 for x in songs if (x.get('shazam') or {}).get('url') and (x['shazam'].get('fecha') or '') < (NOW - dt.timedelta(days=3)).strftime('%Y-%m-%d'))

        if sh_ok:
            HECHO.append(f'Shazam ({sh_ok} canciones leídas; {pendientes} por renovar, se leen poco a poco)')
        if sh_fail and not sh_ok:
            fallo('Shazam por canción', f'Shazam no respondió esta vez (se conserva el último dato; {pendientes} por renovar)')

    # --- Listas
    log('Listas')
    charts = []
    jobs = [(f'https://kworb.net/spotify/country/{cc}_daily.html', 'Spotify', PAIS[cc], 'WW' if cc == 'global' else cc.upper(), 'Top 200 diario', r'(\d{4}/\d{2}/\d{2})', None) for cc in SPOTIFY_CC]
    jobs += [(f'https://kworb.net/charts/apple_s/{cc}.html', 'Apple Music', PAIS[cc], cc.upper(), 'Top 200 canciones', r'(\d{4}/\d{2}/\d{2})', None) for cc in APPLE_CC]
    jobs += [('https://kworb.net/apple_songs/index.html', 'Apple Music', 'Mundial', 'WW', 'Top canciones mundial', r'(\d{4}/\d{2}/\d{2})', None)]
    jobs += [(f'https://kworb.net/charts/shazam/{cc}.html', 'Shazam', PAIS[cc], cc.upper(), 'Top 200 Shazam', r'(\d{4}/\d{2}/\d{2})', None) for cc in SHAZAM_CC]
    jobs += [(f'https://kworb.net/youtube/trending/{cc}.html', 'YouTube', PAIS[cc], cc.upper(), 'Tendencias de música', r'(\d{4}-\d{2}-\d{2})', 1) for cc in YT_TREND_CC]
    jobs += [(f'https://kworb.net/youtube/insights/{cc}_daily.html', 'YouTube', PAIS[cc], cc.upper(), 'Top canciones diario', r'(\d{4}/\d{2}/\d{2})', None) for cc in YT_CHART_CC]
    jobs += [(f'https://kworb.net/charts/deezer/{cc}.html', 'Deezer', PAIS[cc], cc.upper(), 'Top canciones', r'(\d{4}/\d{2}/\d{2})', None) for cc in DEEZER_CC]
    jobs += [(f'https://kworb.net/charts/itunes/{cc}.html', 'iTunes', PAIS[cc], cc.upper(), 'Top canciones', r'(\d{4}/\d{2}/\d{2})', None) for cc in ITUNES_CC]

    if RAPIDO:  # cada 10 min: solo las listas que cambian durante el día
        jobs = [j for j in jobs if (j[1] == 'YouTube' and j[4] == 'Tendencias de música') or j[1] in ('Apple Music', 'iTunes')]

    def run(job):
        url, pl, pa, code, lista, dre, ti = job
        try:
            return chart_scan(url, pl, pa, code, lista, dre, ti)
        except Exception as e:  # noqa: BLE001
            fallo(f'lista {pl} {pa}', e)
            return []
    with cf.ThreadPoolExecutor(6) as ex:
        for res in ex.map(run, jobs):
            charts += res
    if charts:
        # insignias en directo de YouTube → «Tendencias de música» de cada país (más actual que la foto de kworb)
        n_live = 0
        for x in songs:
            y = x.get('youtube') or {}
            tb = y.get('tendencias') or {}
            live = dict(tb.get('paises') or {}) if tb.get('fecha') == HOY else {}
            te = y.get('tendencia_es') or {}
            if te.get('puesto') and te.get('fecha') == HOY:
                live.setdefault('ES', te['puesto'])
            for code, pos in live.items():
                cc = code.lower()
                pais_ = PAIS.get(cc, code)
                rows_c = [c for c in charts if c['plataforma'] == 'YouTube' and c['lista'] == 'Tendencias de música' and c.get('pais') == pais_]
                if not rows_c:  # país que kworb no publica o que no se leyó en esta vuelta: se usa la última lectura guardada
                    rows_c = [c for c in data.get('charts', []) if c['plataforma'] == 'YouTube' and c['lista'] == 'Tendencias de música' and c.get('pais') == pais_]
                    charts += rows_c
                fuente_ = 'YouTube en directo (' + (tb.get('hora') or te.get('hora') or '') + ' UTC)'
                mine = [c for c in rows_c if c.get('cancion') and base(c['cancion']) == base(x['titulo'])]
                if mine:
                    for c in mine:
                        c.update(posicion=pos, fecha_lista=HOY, consultado=HOY, fuente=fuente_)
                else:
                    charts = [c for c in charts if not (c in rows_c and c.get('estado') == 'Fuera')]
                    base_c = rows_c[0] if rows_c else {'plataforma': 'YouTube', 'pais': pais_, 'codigo': code, 'lista': 'Tendencias de música', 'revisado_hasta': None}
                    charts.append(dict(base_c, cancion=x['titulo'], posicion=pos, cambio=None, estado='Dentro', fecha_lista=HOY, consultado=HOY, fuente=fuente_))
                n_live += 1
        if n_live:
            HECHO.append(f'tendencias en directo añadidas a las listas ({n_live})')
        nuevos = {(c['plataforma'], c['lista'], c['pais']) for c in charts}
        # las listas que hoy fallaron (o que no tocaban en la rápida) conservan su última lectura (con su fecha de consulta)
        charts += [c for c in data.get('charts', []) if (c['plataforma'], c['lista'], c['pais']) not in nuevos]
        data['charts'] = charts
        HECHO.append(f'listas ({len(charts)})')
        # guarda el historial de puestos de cada canción (cómo se posicionó)
        for c in charts:
            if c['posicion'] is None:
                continue
            s = next((x for x in songs if base(x['titulo']) == base(c['cancion'])), None)
            if not s:
                continue
            row = {'plataforma': c['plataforma'], 'lista': c['lista'], 'pais': c['pais'], 'puesto': c['posicion'], 'cambio': c['cambio'], 'fecha': c['fecha_lista'] or HOY, 'nota': None, 'fuente': 'kworb.net'}
            if not any(r['plataforma'] == row['plataforma'] and r['pais'] == row['pais'] and r['lista'] == row['lista'] and r['fecha'] == row['fecha'] for r in s.setdefault('listas', [])):
                s['listas'].append(row)

    if not RAPIDO:
        # --- Fotos: artista y portada de cada canción (Spotify)
        try:
            img = oembed(f'https://open.spotify.com/artist/{SP_ARTIST}')
            if img:
                data['artista']['imagen'] = img
            # la portada de Spotify manda: se pone a todo tema con id de Spotify que aún no la tenga (aunque tenga otra de Deezer/Apple)
            cola_p = [x for x in songs if (x.get('spotify') or {}).get('id') and 'scdn.co' not in str(x.get('portada') or '')][:500]
            def _ofoto(x):
                try:
                    return x, oembed(f'https://open.spotify.com/track/{x["spotify"]["id"]}')
                except Exception:  # noqa: BLE001
                    return x, None
            n_ok = 0
            with cf.ThreadPoolExecutor(6) as ex:
                for x, u in ex.map(_ofoto, cola_p):
                    if u:
                        x['portada'] = u
                        if not x.get('apple'):  # una portada «HD» sin enlace de Apple validado no se usa
                            x.pop('portada_hd', None)
                        n_ok += 1
            # sin Spotify: portada de Deezer (1000 px)
            n_dz = 0
            for x in [x for x in songs if not x.get('portada')][:80]:
                try:
                    q = f'artist:"{ARTISTA}" track:"{re.split(r" [(]", x["titulo"])[0]}"'
                    j = get('https://api.deezer.com/search', as_json=True, params={'q': q, 'limit': 5}, tries=1)
                    hit = next((r for r in j.get('data', []) if _fold(r.get('title')).startswith(_fold(re.split(r' [(]', x['titulo'])[0]))), None)
                    if hit and (hit.get('album') or {}).get('cover_xl'):
                        x['portada'] = hit['album']['cover_xl']
                        n_dz += 1
                    time.sleep(0.15)
                except Exception:  # noqa: BLE001
                    pass
            HECHO.append(f'fotos ({n_ok} de Spotify, {n_dz} de Deezer)')
        except Exception as e:  # noqa: BLE001
            fallo('Fotos de Spotify', e)

        # --- Discos completos (Apple Music): canciones, duración y portada, también de los álbumes futuros
        alb_by = {a['album'].lower(): a for a in data.get('albumes', [])}
        for r in rel:
            if not r.get('id') or (r.get('tracks') or 0) < 4 or not NAME_RE.match(r.get('artistas') or ''):
                continue
            a = alb_by.get(r['titulo'].lower())
            if not a:
                a = {'album': r['titulo'], 'artista_principal': r['artistas'], 'tipo': 'Álbum propio', 'fecha_lanzamiento': r['fecha'], 'canciones': r['tracks'],
                     'spotify_streams': None, 'spotify_diarios': None, 'youtube_vistas': None, 'fecha_dato': None, 'fuente': 'Apple Music'}
                data.setdefault('albumes', []).append(a)
                alb_by[r['titulo'].lower()] = a
                log(f'  + nuevo álbum: {r["titulo"]}')
            if a.get('tracks') and a.get('portada') and a.get('apple_id') == r['id'] and '1400x1400' in a['portada']:
                continue
            try:
                _, tr = itunes_tracks(r['id'])
                a.update({'apple_id': r['id'], 'apple_url': r['url'], 'portada': r.get('portada'), 'tracks': tr, 'canciones': len(tr) or a.get('canciones'),
                          'fecha_lanzamiento': a.get('fecha_lanzamiento') or r['fecha'], 'tipo': 'Álbum propio'})
                for x in tr:
                    s = by_norm.get(norm(x['titulo']))
                    if not s and (a.get('fecha_lanzamiento') or '') >= (NOW - dt.timedelta(days=120)).strftime('%Y-%m-%d'):
                        s = {'titulo': x['titulo'], 'rol': 'Principal' if NAME_RE.match(x['artistas'] or '') else 'Colaboración', 'artistas': x['artistas'], 'id': slug(x['titulo']),
                             'youtube': None, 'lanzamiento': a.get('fecha_lanzamiento'), 'lanzamiento_fuente': 'Apple Music', 'album': a['album'], 'shazam': None, 'audiomack': None,
                             'apple': {'url': x['apple_url']}, 'picos': [], 'listas': [], 'portada': r.get('portada'),
                             'spotify': {'id': None, 'total': None, 'diarios': None, 'fecha': None, 'fuente': 'Aún sin dato'}}
                        songs.append(s)
                        by_norm[norm(x['titulo'])] = s
                    if s:
                        s['album'] = a['album']
                        if x.get('portada'):
                            s['portada_hd'] = x['portada']
                            s.setdefault('portada', x['portada'])
                        s['pista'] = x['n']
                        s['duracion_ms'] = x['duracion_ms']
                        s['lanzamiento'] = s.get('lanzamiento') or a.get('fecha_lanzamiento')
                        s.setdefault('lanzamiento_fuente', 'Apple Music')
                        if not s.get('apple'):
                            s['apple'] = {'url': x['apple_url']}
                time.sleep(0.3)
            except Exception as e:  # noqa: BLE001
                fallo(f'disco {r["titulo"]}', e)
        for a in data.get('albumes', []):  # portada de álbumes de otros artistas: la de su canción
            if not a.get('portada'):
                s = next((x for x in songs if x.get('album') == a['album'] and x.get('portada')), None)
                if s:
                    a['portada'] = s['portada']

    # --- Playlists oficiales (Spotify, Apple Music, Deezer): en qué puesto está cada tema
    prev_pl = {p_['url']: p_ for p_ in data.get('playlists', [])}
    if not RAPIDO:
        log('Playlists')
        lst = list(PLAYLISTS)
        for line in (os.environ.get('PLAYLISTS_EXTRA') or '').replace(';', '\n').splitlines():
            if '|' in line:
                n_, u_ = [x.strip() for x in line.split('|', 1)]
                if u_ and u_ not in [u for _, u in lst]:
                    lst.append((n_ or 'Playlist', u_))
        out_pl, ok_pl = [], 0

        def runp(item):
            e = None
            for intento in range(3):  # si Spotify dice «demasiadas peticiones» (429), se espera y se reintenta
                try:
                    return playlist_read(*item), None
                except Exception as e_:  # noqa: BLE001
                    e = e_
                    if '429' not in str(e_):
                        break
                    time.sleep(8 * (intento + 1))
            return None, (item, e)
        with cf.ThreadPoolExecutor(2) as ex:
            for res, err in ex.map(runp, lst):
                if err:
                    (n_, u_), e = err
                    fallo(f'playlist {n_}', e)
                    if u_ in prev_pl:
                        out_pl.append(prev_pl[u_])  # se conserva la última lectura
                    continue
                ok_pl += 1
                for t in res['temas']:
                    sm = by_norm.get(norm(t['titulo'])) or next((x for x in songs if base(x['titulo']) == base(t['titulo'])), None)
                    t['cancion'] = sm['id'] if sm else None
                old = {t_.get('cancion') or t_['titulo']: t_['pos'] for t_ in (prev_pl.get(res['url']) or {}).get('temas', [])}
                for t in res['temas']:
                    t['antes'] = old.get(t.get('cancion') or t['titulo'])
                res['consultado'] = HOY
                res['primera'] = not prev_pl.get(res['url'])
                out_pl.append(res)
                # historial por canción: en qué playlists estuvo, su mejor puesto y desde/hasta cuándo
                nm_ = res.get('nombre_oficial') or res['nombre']
                dentro = {t['cancion']: t['pos'] for t in res['temas'] if t.get('cancion')}
                for x in songs:
                    ph = x.setdefault('playlists_hist', {})
                    e = ph.get(res['url'])
                    if x.get('id') in dentro:
                        pos_ = dentro[x['id']]
                        if not e:
                            e = ph[res['url']] = {'nombre': nm_, 'plataforma': res['plataforma'], 'primera': HOY, 'mejor': pos_, 'mejor_fecha': HOY}
                        e.update({'nombre': nm_, 'ultima': HOY, 'actual': pos_, 'total': res.get('total')})
                        if pos_ < (e.get('mejor') or 999):
                            e.update({'mejor': pos_, 'mejor_fecha': HOY})
                    elif e:
                        e['actual'] = None
                    if not ph:
                        x.pop('playlists_hist', None)
        if out_pl:
            data['playlists'] = out_pl
        HECHO.append(f'playlists ({ok_pl}/{len(lst)})')

    # --- Novedades: lanzamientos, listas, hitos, YouTube, menciones, noticias y redes
    nov = data.setdefault('novedades', [])
    known = {n['id'] for n in nov}
    nuevas = []

    def add(id_, tipo, titulo, texto=None, fecha=None, url=None, fuente=None, imagen=None, cancion=None, **extra):
        if id_ in known:
            return
        known.add(id_)
        it = {'id': id_, 'tipo': tipo, 'titulo': titulo, 'texto': texto, 'fecha': fecha or HOY, 'url': url, 'fuente': fuente, 'imagen': imagen,
              'cancion': cancion, 'detectado': NOW.strftime('%Y-%m-%dT%H:%M:%SZ'), **{k: v for k, v in extra.items() if v is not None}}
        nov.append(it)
        nuevas.append(it)

    lim = (NOW - dt.timedelta(days=45)).strftime('%Y-%m-%d')
    for a_ in data.get('albumes', []):
        if (a_.get('fecha_lanzamiento') or '') >= lim and a_.get('tracks'):
            add('album:' + slug(a_['album']), 'lanzamiento', f'Nuevo álbum: {a_["album"]}', f'{len(a_["tracks"])} canciones', a_['fecha_lanzamiento'], a_.get('apple_url'), 'Apple Music', a_.get('portada'))
    for s in songs:
        if s.get('lanzamiento') and s['lanzamiento'] >= lim:
            add('rel:' + norm(s['titulo']), 'lanzamiento', f'Nuevo tema: {s["titulo"]}', s.get('artistas'), s['lanzamiento'],
                f'https://open.spotify.com/track/{s["spotify"]["id"]}' if (s.get('spotify') or {}).get('id') else (s.get('apple') or {}).get('url'), s.get('lanzamiento_fuente') or 'Spotify / Apple Music', s.get('portada'), s.get('id'))
    pk = {(plat_of(c), c['pais'], base(c['cancion'] or '')): c for c in prev_charts if c.get('posicion') is not None}
    nk = {(plat_of(c), c['pais'], base(c['cancion'] or '')): c for c in data.get('charts', []) if c.get('posicion') is not None}
    for k, c in nk.items():
        o = pk.get(k)
        s = next((x for x in songs if base(x['titulo']) == k[2]), None)
        sid = s.get('id') if s else None
        if not o:
            add(f'in:{k[0]}:{k[1]}:{k[2]}:{c.get("fecha_lista") or HOY}', 'listas', f'{c["cancion"]} entra en {c["lista"]} de {c["plataforma"]} {c["pais"]} (#{c["posicion"]})',
                f'Puesto #{c["posicion"]}', c.get('fecha_lista') or HOY, None, f'{c["plataforma"]} vía kworb.net', (s or {}).get('portada'), sid)
        elif o['posicion'] - c['posicion'] >= 10:
            add(f'up:{k[0]}:{k[1]}:{k[2]}:{c["posicion"]}', 'listas', f'{c["cancion"]} sube al #{c["posicion"]} en {c["plataforma"]} {c["pais"]}',
                f'Antes #{o["posicion"]}', c.get('fecha_lista') or HOY, None, f'{c["plataforma"]} vía kworb.net', (s or {}).get('portada'), sid)
    for k, o in pk.items():
        if k not in nk and any((plat_of(c), c['pais']) == k[:2] for c in data.get('charts', []) if c.get('consultado') == HOY):
            add(f'out:{k[0]}:{k[1]}:{k[2]}:{HOY}', 'listas', f'{o["cancion"]} sale de {o["lista"]} de {o["plataforma"]} {o["pais"]}', f'Estaba en el #{o["posicion"]}', HOY, None, f'{o["plataforma"]} vía kworb.net')
    for pl in data.get('playlists', []):
        if pl.get('consultado') != HOY:
            continue
        nm = pl.get('nombre_oficial') or pl['nombre']
        for t in pl.get('temas', []):
            s = next((x for x in songs if x.get('id') == t.get('cancion')), None)
            key = slug(pl['url'][-24:]) + ':' + slug(t['titulo'])
            if t.get('antes') is None and not pl.get('primera'):
                add(f'pl-in:{key}', 'listas', f'{t["titulo"]} entra en la playlist «{nm}» de {pl["plataforma"]} (#{t["pos"]})', t.get('artistas'), HOY, pl['url'], pl['plataforma'], (s or {}).get('portada'), (s or {}).get('id'))
            elif t.get('antes') and t['antes'] - t['pos'] >= 5:
                add(f'pl-up:{key}:{t["pos"]}', 'listas', f'{t["titulo"]} sube al #{t["pos"]} en «{nm}» de {pl["plataforma"]}', f'Antes #{t["antes"]}', HOY, pl['url'], pl['plataforma'], (s or {}).get('portada'), (s or {}).get('id'))
    # (las cifras redondas y récords ahora salen como «logros», más abajo)
    for path, label in ((('instagram', 'publicaciones'), 'publicaciones nuevas en Instagram'), (('tiktok', 'videos'), 'vídeos nuevos en TikTok'), (('youtube', 'videos'), 'vídeos nuevos en YouTube')):
        o, n = (prev_perfil.get(path[0]) or {}).get(path[1]), (P.get(path[0]) or {}).get(path[1])
        if o and n and n > o:
            add(f'redes:{path[0]}:{n}', 'redes', f'Subió {n - o} {label}', f'Ahora tiene {n}', HOY, (data['artista'].get('links') or {}).get(path[0]), path[0].capitalize())
    for v in data.get('yt_subidas', []):
        if v.get('video_id'):
            add('yt:' + v['video_id'], 'youtube', f'Nuevo vídeo: {v["titulo"]}', f'{v["vistas"]:,} vistas'.replace(',', '.') if v.get('vistas') else None, v.get('publicado'),
                f'https://www.youtube.com/watch?v={v["video_id"]}', f'YouTube · canal {ARTISTA}', f'https://i.ytimg.com/vi/{v["video_id"]}/hqdefault.jpg')
    try:
        if yt_key:
            j = get('https://www.googleapis.com/youtube/v3/search', as_json=True, params={'part': 'snippet', 'q': BUSCAR, 'type': 'video', 'order': 'date', 'maxResults': 30,
                                                                                           'publishedAfter': (NOW - dt.timedelta(days=14)).strftime('%Y-%m-%dT%H:%M:%SZ'), 'key': yt_key})
            found = [{'video_id': x['id']['videoId'], 'titulo': htmlmod.unescape(x['snippet']['title']), 'canal': x['snippet']['channelTitle'], 'fecha': x['snippet']['publishedAt'][:10]} for x in j.get('items', [])]
        else:
            found = [dict(v, fecha=(NOW - dt.timedelta(days=rel_days(v['hace']))).strftime('%Y-%m-%d')) for v in yt_search_scrape(BUSCAR) if rel_days(v['hace']) <= 14]
        own = {v.get('video_id') for v in data.get('yt_subidas', [])}
        n_m = 0
        for v in found:
            if v['video_id'] in own or not NAME_RE.search(v['titulo'] + ' ' + v['canal']) or (NAME_RE.fullmatch(v['canal'].strip()) or v['canal'].strip().lower() in (ARTISTA.lower(), (YT_HANDLE or '').lower(), ARTISTA.lower().replace(' ', '') + 'vevo')):
                continue
            add('ytm:' + v['video_id'], 'mencion', v['titulo'], f'Canal: {v["canal"]}', v['fecha'], f'https://www.youtube.com/watch?v={v["video_id"]}', 'YouTube', f'https://i.ytimg.com/vi/{v["video_id"]}/hqdefault.jpg')
            n_m += 1
        HECHO.append(f'menciones en YouTube ({len(found)} revisadas)')
    except Exception as e:  # noqa: BLE001
        fallo('Menciones en YouTube', e)
    if not RAPIDO:
        try:
            posts, ig = instagram_posts(IG_USER)
            P['instagram'].update({k: v for k, v in ig.items() if v}, fecha=HOY, fuente='Instagram')
            for x in posts:
                if not x.get('code'):
                    continue
                colab = f' · colaboración con @{", @".join(x["colab"])}' if x['colab'] else ''
                add('ig:' + x['code'], 'instagram', (('🎬 ' if x['video'] else '') + (x['texto'].split('\n')[0][:140] or 'Nueva publicación')), 
                    (f'{x["likes"]:,} me gusta'.replace(',', '.') if x.get('likes') is not None else '') + colab, x['fecha'], f'https://www.instagram.com/p/{x["code"]}/', f'Instagram @{IG_USER}', x.get('img'))
            HECHO.append(f'Instagram ({len(posts)} publicaciones)')
        except Exception as e:  # noqa: BLE001
            if 'instagram' in (os.environ.get('FEEDS_EXTRA') or '').lower():
                log(f'  · Instagram directo no disponible ({e}); se usan tus RSS')
            else:
                fallo('Instagram publicaciones', e)
        try:
            tt, vids = tiktok_profile(TT_USER)
            P['tiktok'].update({k: v for k, v in tt.items() if v}, fecha=HOY, fuente='TikTok', aprox=False)
            for v in vids:
                if v.get('id'):
                    add('tt:' + v['id'], 'tiktok', (v.get('texto') or 'Nuevo TikTok')[:140], f'{v["vistas"]:,} reproducciones'.replace(',', '.') if v.get('vistas') else None, v['fecha'],
                        f'https://www.tiktok.com/@{TT_USER}/video/{v["id"]}', f'TikTok @{TT_USER}', v.get('img'))
            HECHO.append(f'TikTok ({tt.get("seguidores")} seguidores)')
        except Exception as e:  # noqa: BLE001
            fallo('TikTok perfil', e)
    for x in extra_feeds():
        u = x['url'] or ''
        mi = re.search(r'instagram\.com/(?:[\w.]+/)?(?:p|reel|tv)/([\w-]+)', u)
        mt = re.search(r'tiktok\.com/.*?/video/(\d+)', u)
        etiq = bool(re.search(r'etiquet|tagged|menci', x['fuente'], re.I))
        if mi:  # mismo id que la lectura directa: no se duplica
            add('ig:' + mi.group(1), 'instagram', x['titulo'][:140], 'Lo etiquetan' if etiq else None, x['fecha'], f'https://www.instagram.com/p/{mi.group(1)}/', x['fuente'], x.get('img'))
        elif mt:
            add('tt:' + mt.group(1), 'tiktok', x['titulo'][:140], None, x['fecha'], u, x['fuente'], x.get('img'))
        else:
            add('rss:' + slug(x['fuente'] + ' ' + (u or x['titulo']))[:120], 'redes', x['titulo'], None, x['fecha'], u, x['fuente'], x.get('img'))
    try:
        news = news_rss(BUSCAR)
        lim30 = (NOW - dt.timedelta(days=30)).strftime('%Y-%m-%d')
        for n_ in news:
            if n_['fecha'] >= lim30:
                add('news:' + slug(n_['titulo'])[:80], 'noticia', n_['titulo'], None, n_['fecha'], n_['url'], n_['fuente'])
        HECHO.append(f'noticias ({len(news)})')
    except Exception as e:  # noqa: BLE001
        fallo('Noticias', e)
    # --- Logros: lo que merece post (global, #1, top 10, picos históricos, récords y cifras redondas)
    try:
        nl = logros(data, songs, P, prev_perfil, prev_sp, prev_yt, add)
        HECHO.append(f'logros ({nl} nuevos)')
    except Exception as e:  # noqa: BLE001
        fallo('Logros', e)
    nov.sort(key=lambda n: (n.get('fecha') or '', n.get('detectado') or ''), reverse=True)
    keep = [n for n in nov if n.get('tipo') == 'logro'][:150]
    # tope por tipo: las listas (muchas al día) no pueden tapar estrenos, Instagram, TikTok, vídeos o noticias
    TOPE_T = {'listas': 120, 'mencion': 60, 'noticia': 60}
    cuenta_t, rest_ = {}, []
    for n in nov:
        t_ = n.get('tipo')
        if t_ == 'logro':
            continue
        cuenta_t[t_] = cuenta_t.get(t_, 0) + 1
        if cuenta_t[t_] <= TOPE_T.get(t_, 80):
            rest_.append(n)
    data['novedades'] = sorted(keep + rest_, key=lambda n: (n.get('fecha') or '', n.get('detectado') or ''), reverse=True)
    first_run = not data.get('config', {}).get('alertas_iniciadas')
    cfg['alertas_iniciadas'] = True
    site_url = os.environ.get('SITE_URL') or (f'https://{os.environ["GITHUB_REPOSITORY"].split("/")[0].lower()}.github.io/{os.environ["GITHUB_REPOSITORY"].split("/")[1]}/' if os.environ.get('GITHUB_REPOSITORY') else '')
    log(f'Novedades nuevas: {len(nuevas)}')

    # --- Historial y YouTube diario
    hist = [h for h in data.get('historial', []) if h.get('fecha') != HOY]
    hist.append({'fecha': HOY, 'spotify_oyentes_mensuales': P['spotify'].get('oyentes_mensuales'), 'spotify_seguidores': P['spotify'].get('seguidores'),
                 'spotify_streams_totales': P['spotify'].get('streams_totales'), 'spotify_streams_diarios': P['spotify'].get('streams_diarios'),
                 'spotify_canciones': P['spotify'].get('canciones'), 'youtube_suscriptores': P['youtube'].get('suscriptores'), 'youtube_vistas_totales': P['youtube'].get('vistas'),
                 'youtube_videos': P['youtube'].get('videos'), 'tiktok_seguidores': P['tiktok'].get('seguidores'), 'instagram_seguidores': P['instagram'].get('seguidores'),
                 'shazams': P['shazam'].get('total'), 'deezer_fans': P['deezer'].get('fans'), 'audiomack_seguidores': P['audiomack'].get('seguidores'),
                 'audiomack_reproducciones': P['audiomack'].get('reproducciones'),
                 'x_seguidores': (P.get('x') or {}).get('seguidores'), 'facebook_seguidores': (P.get('facebook') or {}).get('seguidores'),
                 'youtube_vistas_canciones': sum((s.get('youtube') or {}).get('vistas') or 0 for s in songs),
                 'notas': 'Actualización automática. Fallos: ' + ('; '.join(FALLOS) if FALLOS else 'ninguno')})
    data['historial'] = sorted(hist, key=lambda h: h['fecha'])
    yd = [r for r in data.get('yt_diario', []) if r.get('fecha') != HOY]
    prev = sorted([r for r in yd if r.get('vistas_totales')], key=lambda r: r['fecha'])
    vt = P['youtube'].get('vistas')
    if vt:
        last = prev[-1] if prev else None
        delta = vt - last['vistas_totales'] if last and last['vistas_totales'] and vt >= last['vistas_totales'] else None
        yd.append({'fecha': HOY, 'vistas_dia': delta if delta else None, 'vistas_totales': vt, 'suscriptores': P['youtube'].get('suscriptores')})
    data['yt_diario'] = sorted(yd, key=lambda r: r['fecha'])[-120:]

    data['generado'] = NOW.strftime('%Y-%m-%dT%H:%M:%SZ')
    if not RAPIDO:
        data['completa'] = data['generado']
    data['estado'] = {'hecho': HECHO, 'fallos': FALLOS, 'en': data['generado'], 'modo': 'rapido' if RAPIDO else 'completo', 'completa': data.get('completa')}
    data = fix_all(data)
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf8')
    log(f'\nListo: {len(HECHO)} fuentes bien, {len(FALLOS)} fallos.')
    for f in FALLOS:
        log('  - ' + f)


if __name__ == '__main__':
    sys.exit(main())
