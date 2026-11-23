// ---------- state ----------
const store = {
    get(k, d) { try { const v = localStorage.getItem('aitp.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('aitp.' + k, JSON.stringify(v)); } catch { } }
};
const S = {
    lang: store.get('lang', 'ru'),
    mode: store.get('mode', 'dark'),
    motion: store.get('motion', 'full'),
    stack: ['settings', 'themes'],
    theme: store.get('theme', 'forest'),
    recent: store.get('recent2', ['forest', 'night', 'dunes', 'waves', 'clouds']),
    cat: 'all',
    query: '',
    aiLearn: true, explain: false, chatOn: true, useContext: true, showOriginal: false,
    backupOpen: false,
    confirm: null
};
const save = () => { store.set('theme', S.theme); store.set('recent2', S.recent); };

// ---------- strings ----------
function t(key, vals) {
    const L = S.lang;
    let s = NEW_STRINGS[L]?.[key] ?? BASE_STRINGS[L]?.[key] ?? NEW_STRINGS.en[key] ?? BASE_STRINGS.en[key] ?? key;
    if (vals) for (const [k, v] of Object.entries(vals)) s = s.replaceAll(`{${k}}`, v);
    return s;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rtl = () => S.lang === 'ar';
const byId = id => THEMES.find(x => x.id === id);
const tname = th => t('theme.' + th.id);

// ---------- search (what core/themes.ts would do) ----------
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ًͯ-ْٰ]/g, '')
    .replace(/ё/g, 'е').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
const words = s => norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(w => w.length > 4 && w.startsWith('ال') ? w.slice(2) : w);
const SYN = Object.fromEntries(Object.entries(CONCEPTS).map(([c, s]) => [c, [...new Set(words(s.replace(/\|/g, ' ')))]]));
function dist(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
}
/** How well a typed word names a synonym: 3 exact, 2 the same stem or a prefix, 1 a typo away. */
function wordScore(w, syn) {
    if (w === syn) return 3;
    const stem = syn.length >= 6 ? syn.slice(0, -2) : syn.length >= 4 ? syn.slice(0, -1) : syn;
    if (w.length >= 3 && (syn.startsWith(w) || (w.startsWith(stem) && w.length <= syn.length + 4))) return 2;
    const n = Math.min(w.length, syn.length);
    if (n >= 4 && dist(w, syn) <= (n >= 8 ? 2 : 1)) return 1;
    return 0;
}
function search(query) {
    const ws = words(query);
    if (!ws.length) return null;
    const scored = THEMES.map(th => {
        const names = new Set(['en', 'ru', 'ar', S.lang].flatMap(l => words(NEW_STRINGS[l]['theme.' + th.id] || '')));
        let total = 0, matched = 0, strong = false, any = 0;
        for (const w of ws) {
            let best = 0;
            for (const n of names) best = Math.max(best, wordScore(w, n) + (wordScore(w, n) ? 1 : 0));
            for (const c of th.concepts) for (const syn of SYN[c] || []) {
                const sc = wordScore(w, syn);
                if (sc > best) best = sc;
                if (sc >= 2 && c === 'wine') strong = true;
            }
            if (best) { matched++; total += best; }
            // A word that names nothing in the whole catalog ("something", "please") is left out of the count.
            if (best || THEMES.some(o => o.concepts.some(c => SYN[c].some(s => wordScore(w, s))))) any++;
        }
        return { th, total, matched, need: any, strong };
    });
    const visible = scored.filter(s => !s.th.hidden || s.strong);
    let hits = visible.filter(s => s.matched && s.matched >= s.need);
    if (!hits.length) hits = visible.filter(s => s.matched);
    return hits.sort((a, b) => b.matched - a.matched || b.total - a.total).map(s => s.th);
}

// ---------- icons ----------
const I = {
    x: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M18.4 4 20 5.6 13.6 12l6.4 6.4-1.6 1.6-6.4-6.4L5.6 20 4 18.4 10.4 12 4 5.6 5.6 4l6.4 6.4Z" fill="currentColor"/></svg>',
    palette: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 0 0 0 18c1.1 0 1.7-.8 1.7-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.9.7-1.6 1.6-1.6h1.9A4.6 4.6 0 0 0 21 11.1C21 6.6 17 3 12 3Zm-5.4 9a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm2.7-3.6a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm5.4 0a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm2.7 3.6a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9Zm4 2v8h1.6v-8H10Zm2.4 0v8H14v-8h-1.6Z"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.3 4.3-1.4 1.4-4.3-4.3A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="m9.5 16.2-4.2-4.2-1.4 1.4 5.6 5.6L21 7.5l-1.4-1.4z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 4a8 8 0 0 1 7.4 5H17v2h6V5h-2v2.3A10 10 0 1 0 22 12h-2a8 8 0 1 1-8-8Z"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="m7 9.5 5 5 5-5 1.4 1.4L12 17.3l-6.4-6.4z"/></svg>',
    gh: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .6 1.4.2 2.4.1 2.7.7.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2.4V17h16V7.4l-8 5.3-8-5.3ZM5.6 7 12 11.2 18.4 7H5.6Z"/></svg>',
    tr: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12.9 15.1 10.4 12.6l.03-.03A17.6 17.6 0 0 0 14.1 6H17V4h-7V2H8v2H1v2h11.2A15.8 15.8 0 0 1 9 11.4 15.6 15.6 0 0 1 6.7 8H4.7a17.6 17.6 0 0 0 3 4.6l-5.1 5L4 19l5-5 3.1 3.1.8-2Zm5.6-5.1h-2L12 22h2l1.1-3h4.8l1.1 3h2l-4.5-12Zm-2.6 7 1.6-4.3 1.6 4.3h-3.2Z"/></svg>'
};

// ---------- reveal ----------
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = h => { const [r, g, b] = hexRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const onAccent = h => (1.05) / (lum(h) + .05) >= (lum(h) + .05) / .05 ? '#ffffff' : '#0b0c0e';
function paletteOf(th) { return th[S.mode] || null; }
function layerStyle(th) {
    const p = paletteOf(th);
    if (!p) return 'background: var(--modal)';
    const [r, g, b] = hexRgb(p.surface);
    // Pictures cannot change colour with the client's mode, so in dark mode they need a much heavier veil.
    const veil = th.raster ? (S.mode === 'dark' ? .74 : .3) : S.mode === 'dark' ? .1 : .3;
    return `background: linear-gradient(rgba(${r},${g},${b},${veil}), rgba(${r},${g},${b},${veil})), ${artUrl(th, S.mode)} center / cover no-repeat, ${p.surface}`;
}
function setAccent(win, th) {
    const p = paletteOf(th);
    const acc = p ? p.accent : '#5865f2';
    win.style.setProperty('--acc', acc);
    win.style.setProperty('--on-acc', onAccent(acc));
    // The sticky bar needs a solid ground: the theme's own surface, a little see-through.
    if (p) win.style.setProperty('--solid', p.surface); else win.style.removeProperty('--solid');
}
function baseLayer(win) {
    const stack = win.querySelector('.art-stack');
    stack.textContent = '';
    const l = document.createElement('div');
    l.className = 'layer';
    l.style.cssText = layerStyle(byId(S.theme));
    stack.append(l);
    setAccent(win, byId(S.theme));
}
/** Settles a layer: it is the whole background now, and whatever lay under it goes. */
function settle(layer) {
    while (layer.previousElementSibling) layer.previousElementSibling.remove();
    for (const a of layer.getAnimations()) a.cancel();
    layer.style.clipPath = 'none';
    layer.style.opacity = '';
}
const MAX_LAYERS = 5;
function reveal(id, x, y) {
    const th = byId(id);
    const wins = [...document.querySelectorAll('.win')];
    const rects = wins.map(w => w.getBoundingClientRect());
    // One circle for every window: the same centre on screen and the same radius, reaching the farthest corner of any.
    let R = 0;
    for (const r of rects) for (const [cx, cy] of [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]]) R = Math.max(R, Math.hypot(cx - x, cy - y));
    const still = S.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    wins.forEach((win, i) => {
        const stack = win.querySelector('.art-stack');
        const l = document.createElement('div');
        l.className = 'layer';
        l.style.cssText = layerStyle(th);
        stack.append(l);
        // Too many in flight after fast clicking: the oldest one under the rest finishes at once.
        if (stack.children.length > MAX_LAYERS) settle(stack.children[1]);
        const lx = x - rects[i].left, ly = y - rects[i].top;
        const anim = still
            ? l.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out', fill: 'forwards' })
            : l.animate([{ clipPath: `circle(0px at ${lx}px ${ly}px)` }, { clipPath: `circle(${R + 2}px at ${lx}px ${ly}px)` }],
                { duration: 820, easing: 'cubic-bezier(.32,0,.18,1)', fill: 'forwards' });
        anim.finished.then(() => { if (l.isConnected) settle(l); }).catch(() => { });
        setAccent(win, th);
    });
}

function choose(id, x, y) {
    if (id === S.theme) return;
    S.theme = id;
    if (id !== 'plain') S.recent = [id, ...S.recent.filter(r => r !== id)].slice(0, 12);
    save();
    reveal(id, x, y);
    refreshThemeMarks();
}

// ---------- windows ----------
const SIZES = { panel: 480, settings: 680, themes: 1156, feedback: 560, confirm: 440 };
function sync() {
    const stage = document.getElementById('stage');
    // Drop windows no longer open.
    for (const layer of [...stage.querySelectorAll('.modal-layer')]) if (!S.stack.includes(layer.dataset.name)) layer.remove();
    S.stack.forEach((name, z) => {
        let layer = stage.querySelector(`.modal-layer[data-name="${name}"]`);
        if (!layer) {
            layer = document.createElement('div');
            layer.className = 'modal-layer';
            layer.dataset.name = name;
            layer.innerHTML = `<div class="dim"></div><section class="win" role="dialog" aria-modal="true" data-win="${name}" style="--w:${SIZES[name]}px"><div class="art-stack" aria-hidden="true"></div><div class="win-inner"></div></section>`;
            layer.querySelector('.dim').onclick = () => close(name);
            stage.append(layer);
            baseLayer(layer.querySelector('.win'));
            draw(name);
        }
        layer.style.zIndex = 10 + z;
        layer.classList.toggle('under', z < S.stack.length - 1);
    });
}
function open(name) { if (!S.stack.includes(name)) S.stack.push(name); sync(); focusTop(); }
function close(name) {
    if (name === 'confirm') S.confirm = null;
    S.stack = S.stack.filter(n => n !== name);
    sync(); focusTop();
}
function focusTop() {
    const top = S.stack.at(-1);
    const win = top && document.querySelector(`.win[data-win="${top}"]`);
    win?.querySelector(top === 'confirm' ? '.btn-cancel' : '.x')?.focus();
}
function drawAll() { for (const name of S.stack) draw(name); }
function draw(name) {
    const win = document.querySelector(`.win[data-win="${name}"]`);
    if (!win) return;
    win.dir = rtl() ? 'rtl' : 'ltr';
    const inner = win.querySelector('.win-inner');
    const scroller = inner.querySelector('.win-scroll');
    const keep = scroller?.scrollTop ?? 0;
    inner.innerHTML = ({ settings: drawSettings, themes: drawThemes, panel: drawPanel, feedback: drawFeedback, confirm: drawConfirm })[name]();
    const sc = inner.querySelector('.win-scroll');
    if (sc) sc.scrollTop = keep;
    wire(name, win);
}
const head = (title, icon = '', extra = '') => `<header class="win-head">${icon ? `<span class="win-icon">${icon}</span>` : ''}<h2>${esc(title)}</h2>${extra}<button class="x" data-close aria-label="${esc(t('message.hide') || 'Close')}">${I.x}</button></header>`;

// ---------- settings ----------
const sel = (id, opts, val, wide) => `<select id="${id}" class="sel${wide ? ' wide' : ''}">${opts.map(([v, l]) => `<option value="${v}"${v === val ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const sw = (key) => `<button class="switch" role="switch" aria-checked="${S[key]}" data-switch="${key}"><span class="knob"></span></button>`;
const row = (name, desc, ctl, extra = '') => `<div class="row"><div class="row-text"><div class="row-name">${esc(name)}</div>${desc ? `<div class="row-desc">${esc(desc)}</div>` : ''}${extra}</div><div class="row-ctl">${ctl}</div></div>`;
const stackRow = (name, desc, ctl) => `<div class="row stacked"><div class="row-text"><div class="row-name">${esc(name)}</div>${desc ? `<div class="row-desc">${esc(desc)}</div>` : ''}</div>${ctl}</div>`;
const SECTIONS = ['providers', 'behaviour', 'translation', 'look', 'help'];
const secName = s => t(s === 'look' ? 'section.look' : 'section.' + s);
function themeChip() {
    const th = byId(S.theme);
    return `<span class="chip"><span class="chip-art" style="${esc(layerStyle(th))}"></span><span class="chip-name">${esc(tname(th))}</span></span>`;
}
function drawSettings() {
    const ex = s => `<code class="example" dir="auto">${esc(s)}</code>`;
    const withEx = (k, e) => esc(t(k)).replace('{example}', ex(e));
    return `${head('AI Translate')}
<div class="win-scroll">
 <p class="vc-sub">Translate your outgoing (and incoming) Discord messages with an LLM, per chat, without wrecking your writing style.</p>
 <div class="vc-authors"><div><h3 class="vc-h3">${esc(t('modal.authors'))}</h3><span class="avatar"></span></div>
  <div class="links"><button class="link-btn" data-open="themes" title="${esc(t('themes.title'))}" aria-label="${esc(t('themes.title'))}">${I.palette}</button><button class="link-btn" data-open="feedback" title="${esc(t('feedback.support'))}" aria-label="${esc(t('feedback.support'))}">${I.mail}</button><button class="link-btn" title="${esc(t('feedback.project'))}" aria-label="${esc(t('feedback.project'))}">${I.gh}</button></div></div>
 <h3 class="vc-h3">${esc(t('modal.settings'))}</h3>
 <nav class="seg" aria-label="${esc(t('modal.settings'))}">${SECTIONS.map((s, i) => `<button class="seg-btn${i ? '' : ' on'}" data-jump="${s}">${esc(secName(s))}</button>`).join('')}</nav>

 <section class="sec" id="sec-providers"><h4 class="sec-title">${esc(secName('providers'))}</h4><div class="card">
  ${row(t('provider.name'), t('provider.desc'), sel('prov', [['groq', t('provider.groq')], ['gemini', t('provider.gemini')], ['anthropic', t('provider.anthropic')], ['glm', t('provider.glm')], ['openai', t('provider.openai')]], 'groq'))}
  ${row(t('apiKey.name') + ' — Groq', '', `<div class="keyrow"><input class="field" type="password" value="gsk_example_key_value" aria-label="API key"><button class="icon-btn" aria-label="${esc(t('apiKey.show'))}">${I.eye}</button></div>`)}
  ${row(t('model.name'), t('model.desc'), `<div class="keyrow">${sel('model', [['openai/gpt-oss-120b', 'openai/gpt-oss-120b'], ['llama-3.3-70b', 'llama-3.3-70b-versatile']], 'openai/gpt-oss-120b')}<button class="icon-btn" aria-label="${esc(t('model.refresh'))}">${I.refresh}</button></div>`)}
  <div class="backup${S.backupOpen ? ' open' : ''}">
   <button class="backup-head" data-backup aria-expanded="${S.backupOpen}"><span class="row-name">${esc(t('fallback.name'))}</span><span class="backup-sum">${esc(t('provider.gemini'))} · gemini-3.8-flash</span><span class="chev">${I.chev}</span></button>
   ${S.backupOpen ? `<div class="backup-body">${row(t('provider.name'), '', sel('prov2', [['gemini', t('provider.gemini')], ['groq', t('provider.groq')]], 'gemini'))}${row(t('apiKey.name') + ' — Google Gemini', '', `<div class="keyrow"><input class="field" type="password" value="AIza_example" aria-label="API key"><button class="icon-btn" aria-label="${esc(t('apiKey.show'))}">${I.eye}</button></div>`)}${row(t('model.name'), '', sel('model2', [['gemini-3.8-flash', 'gemini-3.8-flash']], 'gemini-3.8-flash'))}<div class="row-actions"><button class="btn ghost small">${esc(t('fallback.remove'))}</button></div></div>` : ''}
  </div>
  <div class="row-actions"><button class="btn ghost small">+ ${esc(t('fallback.add'))}</button></div>
  <p class="card-note">${esc(t('fallback.desc'))}</p>
 </div></section>

 <section class="sec" id="sec-behaviour"><h4 class="sec-title">${esc(secName('behaviour'))}</h4><div class="card">
  ${row(t('mode.name'), t('mode.desc'), sel('mode', [['perChannel', t('mode.perChannel')], ['always', t('mode.always')]], 'perChannel'))}
  ${row(t('onError.name'), t('onError.desc'), sel('onError', [['hold', t('onError.hold')], ['send', t('onError.send')]], 'hold'))}
  ${row(t('explain.name'), t('explain.desc'), sw('explain'))}
  ${row(t('learn.name'), t('learn.desc'), sw('aiLearn'), S.aiLearn ? `<button class="text-btn">${esc(t('learn.open'))} (3)</button>` : '')}
 </div></section>

 <section class="sec" id="sec-translation"><h4 class="sec-title">${esc(secName('translation'))}</h4><div class="card">
  ${row(t('gender.name'), t('gender.desc'), sel('gender', [['unset', t('gender.unset')], ['male', t('gender.male')], ['female', t('gender.female')]], 'unset'))}
  ${row(t('formality.name'), t('formality.desc'), sel('formality', [['match', t('formality.match')], ['informal', t('formality.informal')], ['formal', t('formality.formal')]], 'match'))}
  ${row(t('context.name'), t('context.desc'), sw('useContext'))}
  ${stackRow(t('glossary.name'), t('glossary.desc'), `<input class="field" value="Valorant, GG, rights = permissions">`)}
  ${stackRow(t('extra.name'), t('extra.desc'), `<textarea class="field" rows="2"></textarea>`)}
 </div></section>

 <section class="sec" id="sec-look"><h4 class="sec-title">${esc(secName('look'))}</h4><div class="card">
  ${row(t('theme.name'), t('theme.desc'), `<div class="theme-ctl">${themeChip()}<button class="btn" data-open="themes">${esc(t('theme.choose'))}</button></div>`)}
  ${row(t('locale.name'), t('locale.desc'), sel('locale', [['auto', t('locale.auto')], ['en', 'English'], ['ru', 'Русский'], ['ar', 'العربية']], S.lang === 'en' ? 'en' : S.lang))}
  ${row(t('showOriginal.name'), t('showOriginal.desc'), sw('showOriginal'))}
 </div></section>

 <section class="sec" id="sec-help"><h4 class="sec-title">${esc(secName('help'))}</h4><div class="card help">
  <ul class="help-list"><li>${esc(t('help.button'))}</li><li>${esc(t('help.menu'))}</li></ul>
  <div class="row-name help-sub">${esc(t('help.keepTitle'))}</div>
  <ul class="help-list"><li>${withEx('keep.pair', '\\carpe diem\\')}</li><li>${withEx('keep.line', '\\' + t('keep.lineExample'))}</li><li>${esc(t('keep.code'))}</li></ul>
 </div></section>

 <div class="foot"><button class="btn">${esc(t('update.check'))}</button><button class="btn">${esc(t('logs.open'))} (12)</button></div>
 <p class="version">AI Translate · 0.2.4a</p>
</div>`;
}

// ---------- themes ----------
const CATS = ['abstract', 'nature', 'sky', 'seasons', 'minimal'];
function listFor() {
    if (S.query.trim()) return search(S.query) || [];
    if (S.cat === 'recent') return S.recent.map(byId).filter(Boolean);
    const all = THEMES.filter(th => !th.hidden);
    return S.cat === 'all' ? all : all.filter(th => th.cat === S.cat);
}
function tile(th, recent) {
    const cur = th.id === S.theme;
    return `<div class="tile${cur ? ' cur' : ''}" data-tile="${th.id}">
  <button class="tile-pick" data-pick="${th.id}" aria-pressed="${cur}"><span class="tile-art" style="${esc(layerStyle(th))}">${cur ? `<span class="badge">${I.check}${esc(t('themes.current'))}</span>` : ''}</span><span class="tile-name">${esc(tname(th))}</span></button>
  ${recent ? `<button class="tile-del" data-del="${th.id}" aria-label="${esc(t('themes.deleteFrom'))}: ${esc(tname(th))}" title="${esc(t('themes.deleteFrom'))}">${I.trash}</button>` : ''}
 </div>`;
}
function drawGrid() {
    const list = listFor();
    const searching = !!S.query.trim();
    const title = searching ? t('themes.found', { count: list.length }) : S.cat === 'recent' ? t('themes.recent') : S.cat === 'all' ? t('themes.all') : t('themes.cat.' + S.cat);
    const empty = searching ? t('themes.nothing') : t('themes.recentEmpty');
    return `<h3 class="grid-title">${esc(title)}</h3>${list.length ? `<div class="grid">${list.map(th => tile(th, S.cat === 'recent' && !searching)).join('')}</div>` : `<p class="empty">${esc(empty)}</p>`}`;
}
function drawThemes() {
    const cat = (id, label, count) => `<button class="cat${S.cat === id && !S.query.trim() ? ' on' : ''}" data-cat="${id}"><span>${esc(label)}</span>${count != null ? `<span class="count">${count}</span>` : ''}</button>`;
    return `${head(t('themes.title'), I.palette)}
<div class="themes-body">
 <aside class="cats">
  ${cat('recent', t('themes.recent'), S.recent.length)}
  <hr class="cats-line">
  ${cat('all', t('themes.all'))}
  ${CATS.map(c => cat(c, t('themes.cat.' + c))).join('')}
 </aside>
 <div class="themes-main">
  <label class="search">${I.search}<input id="q" type="search" placeholder="${esc(t('themes.search'))}" value="${esc(S.query)}" autocomplete="off"><button class="search-x" data-clearq aria-label="${esc(t('themes.searchClear'))}"${S.query ? '' : ' hidden'}>${I.x}</button></label>
  <div class="win-scroll grid-scroll" id="grid">${drawGrid()}</div>
 </div>
</div>`;
}
function refreshGrid() {
    const g = document.getElementById('grid');
    if (!g) return;
    g.innerHTML = drawGrid();
    const win = g.closest('.win');
    for (const b of win.querySelectorAll('.cat')) b.classList.toggle('on', b.dataset.cat === S.cat && !S.query.trim());
    const rc = win.querySelector('.cat[data-cat="recent"] .count');
    if (rc) rc.textContent = S.recent.length;
    win.querySelector('.search-x').hidden = !S.query;
}
function refreshThemeMarks() {
    refreshGrid();
    const ctl = document.querySelector('.theme-ctl .chip');
    if (ctl) ctl.outerHTML = themeChip();
}

// ---------- small windows ----------
function drawConfirm() {
    const th = byId(S.confirm);
    return `${head(t('themes.deleteTitle'))}<div class="win-scroll"><p class="confirm-body">${esc(t('themes.deleteBody', { name: th ? tname(th) : '' }))}</p></div>
<footer class="win-foot"><button class="btn ghost btn-cancel" data-close>${esc(t('themes.cancel'))}</button><button class="btn danger" data-confirm-del>${esc(t('themes.delete'))}</button></footer>`;
}
function drawPanel() {
    const langs = [['English', 'English'], ['Русский', 'Русский'], ['Deutsch', 'Deutsch'], ['العربية', 'العربية']];
    return `${head(t('panel.title'))}<div class="win-scroll">
 <div class="stack-field"><div class="row-name">${esc(t('panel.sentLanguage'))}</div>${sel('sent', langs, 'English', true)}</div>
 <div class="stack-field"><div class="row-name">${esc(t('panel.receivedLanguage'))}</div>${sel('recv', langs, 'Русский', true)}</div>
 <hr class="line">
 ${row(t('panel.toggle', { chat: '#general' }), t('panel.toggleHint'), sw('chatOn'))}
 <button class="btn" data-open="settings" data-swap>${esc(t('panel.allSettings'))}</button>
</div>`;
}
function drawFeedback() {
    return `${head(t('feedback.title'))}<div class="win-scroll">
 <p class="alpha">${esc(t('feedback.alpha', { version: '0.2.4a' }))}</p>
 <p class="row-desc intro">${esc(t('feedback.intro'))}</p>
 <div class="stack-field"><div class="row-name">${esc(t('feedback.subject'))}</div><input class="field" placeholder="${esc(t('feedback.subjectHint'))}"></div>
 <div class="stack-field"><div class="row-name">${esc(t('feedback.message'))}</div><textarea class="field" rows="5" placeholder="${esc(t('feedback.messageHint'))}"></textarea></div>
 <button class="btn primary wide">${esc(t('feedback.send'))}</button>
 <p class="or">${esc(t('feedback.or'))}</p>
 <div class="centre"><button class="btn">${esc(t('feedback.discord'))}</button></div>
</div>`;
}

// ---------- events ----------
function pickOrigin(ev, el) {
    // A keyboard press has no pointer: start from the middle of what was pressed.
    if (ev.detail === 0 || (ev.clientX === 0 && ev.clientY === 0)) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
    return [ev.clientX, ev.clientY];
}
function wire(name, win) {
    win.querySelectorAll('[data-close]').forEach(b => b.onclick = () => close(name));
    win.querySelectorAll('[data-open]').forEach(b => b.onclick = () => {
        if (b.hasAttribute('data-swap')) close(name);
        open(b.dataset.open);
    });
    win.querySelectorAll('[data-switch]').forEach(b => b.onclick = () => { S[b.dataset.switch] = !S[b.dataset.switch]; draw(name); });
    win.querySelector('[data-backup]')?.addEventListener('click', () => { S.backupOpen = !S.backupOpen; draw(name); });
    win.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => {
        const target = win.querySelector('#sec-' + b.dataset.jump);
        const sc = win.querySelector('.win-scroll');
        sc.scrollTo({ top: target.offsetTop - win.querySelector('.seg').offsetHeight - 8, behavior: S.motion === 'reduced' ? 'auto' : 'smooth' });
    });
    const sc = win.querySelector('.win-scroll');
    if (name === 'settings' && sc) sc.onscroll = () => {
        let cur = SECTIONS[0];
        for (const s of SECTIONS) { const el = win.querySelector('#sec-' + s); if (el.offsetTop - win.querySelector('.seg').offsetHeight - 24 <= sc.scrollTop) cur = s; }
        if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4) cur = SECTIONS.at(-1);
        win.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('on', b.dataset.jump === cur));
    };
    if (name === 'settings') win.querySelector('#locale').onchange = e => setLang(e.target.value === 'auto' ? 'en' : e.target.value);
    if (name === 'themes') {
        const q = win.querySelector('#q');
        q.oninput = () => { S.query = q.value; refreshGrid(); };
        win.onclick = ev => {
            const c = ev.target.closest('[data-cat]'); if (c) { S.cat = c.dataset.cat; S.query = ''; q.value = ''; refreshGrid(); return; }
            const p = ev.target.closest('[data-pick]'); if (p) { const [x, y] = pickOrigin(ev, p); choose(p.dataset.pick, x, y); return; }
            const d = ev.target.closest('[data-del]'); if (d) { S.confirm = d.dataset.del; open('confirm'); draw('confirm'); return; }
            if (ev.target.closest('[data-clearq]')) { S.query = ''; q.value = ''; q.focus(); refreshGrid(); }
        };
    }
    if (name === 'confirm') win.querySelector('[data-confirm-del]').onclick = () => {
        const id = S.confirm;
        close('confirm');
        const tl = document.querySelector(`.tile[data-tile="${id}"]`);
        const done = () => { S.recent = S.recent.filter(r => r !== id); save(); refreshGrid(); };
        if (tl && S.motion !== 'reduced') { tl.classList.add('leaving'); setTimeout(done, 180); } else done();
    };
}
addEventListener('keydown', e => {
    if (e.key === 'Escape' && S.stack.length) {
        const top = S.stack.at(-1);
        if (top === 'themes' && S.query) { S.query = ''; const q = document.getElementById('q'); q.value = ''; refreshGrid(); return; }
        close(top);
    }
});

// ---------- prototype controls ----------
function setLang(l) { S.lang = l; store.set('lang', l); drawAll(); bar(); }
function setMode(m) {
    S.mode = m; store.set('mode', m);
    document.documentElement.dataset.client = m;
    for (const w of document.querySelectorAll('.win')) baseLayer(w);
    drawAll(); bar();
}
const SCENES = { both: ['settings', 'themes'], settings: ['settings'], themes: ['themes'], panel: ['panel'], feedback: ['settings', 'feedback'] };
function bar() {
    const b = document.getElementById('bar');
    const grp = (label, items, cur, fn) => `<div class="pgrp" role="group" aria-label="${label}"><span class="plabel">${label}</span>${items.map(([v, l]) => `<button class="pbtn${v === cur ? ' on' : ''}" data-${fn}="${v}">${l}</button>`).join('')}</div>`;
    const scene = Object.entries(SCENES).find(([, v]) => v.join() === S.stack.filter(n => n !== 'confirm').join())?.[0];
    b.innerHTML = grp('Окна', [['both', 'Настройки + Темы'], ['settings', 'Настройки'], ['themes', 'Темы'], ['panel', 'Панель чата'], ['feedback', 'Поддержка']], scene, 'scene')
        + grp('Язык плагина', [['ru', 'Русский'], ['en', 'English'], ['ar', 'العربية']], S.lang, 'lang')
        + grp('Discord', [['dark', 'Тёмный'], ['light', 'Светлый']], S.mode, 'mode')
        + grp('Анимация', [['full', 'Круг'], ['reduced', 'Без движения']], S.motion, 'motion');
    b.querySelectorAll('[data-scene]').forEach(x => x.onclick = () => { S.stack = [...SCENES[x.dataset.scene]]; S.confirm = null; sync(); drawAll(); bar(); });
    b.querySelectorAll('[data-lang]').forEach(x => x.onclick = () => setLang(x.dataset.lang));
    b.querySelectorAll('[data-mode]').forEach(x => x.onclick = () => setMode(x.dataset.mode));
    b.querySelectorAll('[data-motion]').forEach(x => x.onclick = () => { S.motion = x.dataset.motion; store.set('motion', S.motion); bar(); });
}
document.documentElement.dataset.client = S.mode;
bar();
sync();
