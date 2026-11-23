// Theme art: each theme is a palette per client mode and a drawing function that
// returns an SVG string. Rendered once into a data: URL and cached, as the spec asks.
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const W = 1600, H = 1000;
const f1 = n => Math.round(n);
const svg = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
const vgrad = (id, a, b, c) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/>${c ? `<stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>` : `<stop offset="1" stop-color="${b}"/>`}</linearGradient>`;

/** A ridge across the width: a smooth line from sums of sines, closed at the bottom. */
function ridge(y, amp, seed, { sharp = 0, steps = 48 } = {}) {
    const r = rng(seed), ph = [r() * 6.3, r() * 6.3, r() * 6.3], fr = [1 + r(), 2.3 + r() * 1.5, 5 + r() * 3];
    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const x = i / steps * W, u = i / steps * Math.PI * 2;
        let v = Math.sin(u * fr[0] + ph[0]) * .55 + Math.sin(u * fr[1] + ph[1]) * .3 + Math.sin(u * fr[2] + ph[2]) * .15;
        if (sharp) v = v * (1 - sharp) + (1 - Math.abs(Math.sin(u * (fr[1] + 1) + ph[2]))) * sharp * 1.4 - sharp * .5;
        pts.push([x, y - v * amp]);
    }
    let d = `M0 ${H} L${f1(pts[0][0])} ${f1(pts[0][1])}`;
    if (sharp) for (const [x, yy] of pts.slice(1)) d += ` L${f1(x)} ${f1(yy)}`;
    else for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; d += ` Q${f1(x0)} ${f1(y0)} ${f1((x0 + x1) / 2)} ${f1((y0 + y1) / 2)}`; }
    const [lx, ly] = pts[pts.length - 1];
    return d + ` L${f1(lx)} ${f1(ly)} L${W} ${H} Z`;
}

function pine(x, base, h, w) {
    // A drawn spruce: three soft tiers and a stub of trunk.
    let d = '';
    for (let k = 0; k < 3; k++) {
        const top = base - h + k * h * .26, bot = base - h * .08 - (2 - k) * h * .2, ww = w * (.55 + k * .25);
        d += `M${f1(x)} ${f1(top)} C${f1(x + ww * .25)} ${f1(top + (bot - top) * .45)} ${f1(x + ww * .7)} ${f1(bot - 6)} ${f1(x + ww)} ${f1(bot)} Q${f1(x)} ${f1(bot + h * .05)} ${f1(x - ww)} ${f1(bot)} C${f1(x - ww * .7)} ${f1(bot - 6)} ${f1(x - ww * .25)} ${f1(top + (bot - top) * .45)} ${f1(x)} ${f1(top)}Z`;
    }
    return d + `M${f1(x - w * .06)} ${f1(base - h * .1)}h${f1(w * .12)}v${f1(h * .12)}h${f1(-w * .12)}Z`;
}
function roundTree(x, base, h, w) {
    const r = w * .62, cy = base - h + r;
    return `M${f1(x - w * .05)} ${f1(cy)}h${f1(w * .1)}V${f1(base)}h${f1(-w * .1)}Z M${f1(x)} ${f1(cy - r)} a${f1(r)} ${f1(r * 1.15)} 0 1 0 .1 0Z`;
}

const ART = {
    forest(p, seed = 4) {
        const r = rng(seed);
        let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="1170" cy="270" r="120" fill="${p.sun}"/>`;
        const rows = [[560, 22, .78], [650, 26, .9], [760, 30, 1.05], [890, 34, 1.25]];
        rows.forEach(([y, n, s], i) => {
            body += `<path d="${ridge(y + 10, 18 + i * 6, seed + i)}" fill="${p.layers[i]}"/>`;
            let trees = '';
            for (let k = 0; k < n; k++) {
                const x = (k + r() * .8) / n * (W + 80) - 40, h = (130 + r() * 120) * s, w = h * (.3 + r() * .06);
                trees += r() < .2 && i > 1 ? roundTree(x, y + 30, h * .7, w * 1.3) : pine(x, y + 30, h, w);
            }
            body += `<path d="${trees}" fill="${p.layers[i]}"/>`;
            if (i < rows.length - 1) body += `<rect y="${y - 10}" width="${W}" height="130" fill="url(#mist)"/>`;
        });
        return svg(vgrad('sky', p.sky[0], p.sky[1]) + `<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[1]}" stop-opacity="0"/><stop offset=".6" stop-color="${p.sky[1]}" stop-opacity=".45"/><stop offset="1" stop-color="${p.sky[1]}" stop-opacity="0"/></linearGradient>`, body);
    },
    hills(p) {
        let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="420" cy="300" r="90" fill="${p.sun}"/>`;
        p.layers.forEach((c, i) => body += `<path d="${ridge(470 + i * 105, 60 - i * 6, 20 + i)}" fill="${c}"/>`);
        return svg(vgrad('sky', p.sky[0], p.sky[1]), body);
    },
    mountains(p) {
        let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
        p.layers.forEach((c, i) => {
            body += `<path d="${ridge(440 + i * 140, 150 - i * 25, 31 + i, { sharp: .7, steps: 26 + i * 6 })}" fill="${c}"/>`;
            body += `<rect y="${470 + i * 140}" width="${W}" height="160" fill="url(#mist)"/>`;
        });
        return svg(vgrad('sky', p.sky[0], p.sky[1]) + `<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[1]}" stop-opacity="0"/><stop offset=".5" stop-color="${p.sky[1]}" stop-opacity=".5"/><stop offset="1" stop-color="${p.sky[1]}" stop-opacity="0"/></linearGradient>`, body);
    },
    dunes(p) {
        let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="1240" cy="230" r="100" fill="${p.sun}"/>`;
        p.layers.forEach((c, i) => {
            const y = 520 + i * 120, r = rng(50 + i);
            const a = r() * 300, b = 600 + r() * 400;
            body += `<path d="M0 ${y + 60} C${f1(a)} ${y - 90} ${f1(b)} ${y + 120} ${W} ${y - 20} V${H} H0Z" fill="${c}"/>`;
            let lines = '';
            for (let k = 1; k < 5; k++) lines += `<path d="M0 ${y + 60 + k * 22} C${f1(a)} ${y - 90 + k * 26} ${f1(b)} ${y + 120 + k * 20} ${W} ${y - 20 + k * 24}" fill="none" stroke="${p.line}" stroke-width="2"/>`;
            body += `<g opacity=".5">${lines}</g>`;
        });
        return svg(vgrad('sky', p.sky[0], p.sky[1]), body);
    },
    waves(p) {
        let body = `<rect width="${W}" height="${H}" fill="${p.bg}"/>`;
        p.layers.forEach((c, i) => {
            const y = 260 + i * 140, d = ridge(y, 40, 60 + i, { steps: 16 });
            body += `<path d="${d}" fill="${p.shadow}" transform="translate(0 -10)" opacity=".5"/><path d="${d}" fill="${c}"/>`;
        });
        return svg('', body);
    },
    pebbles(p) {
        const r = rng(9);
        let body = `<rect width="${W}" height="${H}" fill="${p.bg}"/>`;
        for (let k = 0; k < 70; k++) {
            // Denser towards the lower corners, thin in the middle where the content sits.
            const side = r() < .5 ? 0 : 1, x = side ? W - Math.pow(r(), 1.6) * 700 : Math.pow(r(), 1.6) * 700, y = H - Math.pow(r(), 1.3) * 760;
            const rx = 26 + r() * 70, ry = rx * (.55 + r() * .3);
            body += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})" fill="${p.chips[k % p.chips.length]}"/>`;
        }
        return svg('', body);
    },
    aurora(p) {
        const r = rng(3);
        let stars = '';
        for (let k = 0; k < 90; k++) stars += `<circle cx="${f1(r() * W)}" cy="${f1(r() * 560)}" r="${f1(1 + r() * 1.6)}" fill="${p.star}" opacity="${f1(.25 + r() * .5)}"/>`;
        let ribbons = '';
        p.ribbons.forEach((c, i) => {
            const y = 230 + i * 90;
            ribbons += `<path d="M-100 ${y + 120} C300 ${y - 120} 700 ${y + 220} 1000 ${y} S1500 ${y - 80} 1700 ${y + 60} L1700 ${y + 260} C1400 ${y + 120} 1100 ${y + 360} 800 ${y + 230} S200 ${y + 160} -100 ${y + 300}Z" fill="url(#rb${i})" opacity=".7"/>`;
        });
        const defs = vgrad('sky', p.sky[0], p.sky[1]) + p.ribbons.map((c, i) => `<linearGradient id="rb${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`).join('');
        return svg(defs, `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars}${ribbons}<path d="${ridge(860, 40, 77)}" fill="${p.ground}"/>`);
    },
    night(p) {
        const r = rng(21);
        let stars = '';
        for (let k = 0; k < 140; k++) stars += `<circle cx="${f1(r() * W)}" cy="${f1(r() * 700)}" r="${f1(.8 + r() * 1.8)}" fill="${p.star}" opacity="${f1(.2 + r() * .6)}"/>`;
        let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars}<g mask="url(#moon)"><circle cx="1250" cy="230" r="70" fill="${p.moon}"/></g>`;
        p.layers.forEach((c, i) => body += `<path d="${ridge(700 + i * 110, 50, 90 + i)}" fill="${c}"/>`);
        let trees = '';
        for (let k = 0; k < 14; k++) { const x = 60 + r() * 1480; trees += pine(x, 930 + r() * 20, 120 + r() * 90, 40 + r() * 10); }
        body += `<path d="${trees}" fill="${p.layers[p.layers.length - 1]}"/>`;
        return svg(vgrad('sky', p.sky[0], p.sky[1]) + `<mask id="moon"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="1282" cy="212" r="62" fill="#000"/></mask>`, body);
    },
    clouds(p) {
        const r = rng(14);
        let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
        p.clouds.forEach((c, i) => {
            let d = '';
            const n = 3 + i, y0 = 300 + i * 220;
            for (let k = 0; k < n; k++) {
                const cx = (k + .2 + r() * .6) / n * W, s = (.6 + r() * .4) * (1 + i * .3), y = y0 + (r() - .5) * 80;
                // A flat-bottomed cloud: a pill for the base and three puffs on it.
                d += `<rect x="${f1(cx - 150 * s)}" y="${f1(y - 40 * s)}" width="${f1(300 * s)}" height="${f1(80 * s)}" rx="${f1(40 * s)}"/>`;
                d += `<circle cx="${f1(cx - 60 * s)}" cy="${f1(y - 40 * s)}" r="${f1(55 * s)}"/><circle cx="${f1(cx + 25 * s)}" cy="${f1(y - 70 * s)}" r="${f1(75 * s)}"/><circle cx="${f1(cx + 95 * s)}" cy="${f1(y - 30 * s)}" r="${f1(45 * s)}"/>`;
            }
            body += `<g fill="${c}">${d}</g>`;
        });
        return svg(vgrad('sky', p.sky[0], p.sky[1]), body);
    },
    reeds(p) {
        const r = rng(8);
        let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/><path d="${ridge(560, 30, 44)}" fill="${p.shore}"/><rect y="600" width="${W}" height="400" fill="url(#water)"/>`;
        let rip = '';
        for (let k = 0; k < 26; k++) { const y = 630 + r() * 340, x = r() * W, w = 80 + r() * 220; rip += `<path d="M${f1(x)} ${f1(y)}h${f1(w)}" stroke="${p.line}" stroke-width="3" stroke-linecap="round"/>`; }
        body += `<g opacity=".55">${rip}</g>`;
        const clump = (x0, dir) => {
            let s = '', heads = '';
            for (let k = 0; k < 22; k++) {
                const x = x0 + dir * r() * 260, h = 260 + r() * 330, bend = dir * (20 + r() * 60);
                s += `<path d="M${f1(x)} ${H} Q${f1(x + bend * .2)} ${f1(H - h * .6)} ${f1(x + bend)} ${f1(H - h)}" stroke="${p.reeds[k % 2]}" stroke-width="${f1(4 + r() * 3)}" fill="none" stroke-linecap="round"/>`;
                if (r() < .45) heads += `<ellipse cx="${f1(x + bend * .93)}" cy="${f1(H - h * .9)}" rx="9" ry="30" transform="rotate(${f1(dir * 8)} ${f1(x + bend * .93)} ${f1(H - h * .9)})" fill="${p.reeds[1]}"/>`;
            }
            return s + heads;
        };
        body += clump(-20, 1) + clump(W + 20, -1);
        return svg(vgrad('sky', p.sky[0], p.sky[1]) + vgrad('water', p.water[0], p.water[1]), body);
    },
    autumn(p) {
        const r = rng(12);
        let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
        for (let k = 0; k < 46; k++) {
            const edge = r(), x = edge < .5 ? Math.pow(r(), 1.5) * 600 : W - Math.pow(r(), 1.5) * 600, y = r() * H, s = 30 + r() * 50, a = r() * 360;
            const c = p.leaves[k % p.leaves.length];
            body += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)}) scale(${f1(s / 50)})"><path d="M0 -50 C30 -30 34 20 0 50 C-34 20 -30 -30 0 -50Z" fill="${c}"/><path d="M0 -42 V58" stroke="${p.vein}" stroke-width="3" opacity=".6"/></g>`;
        }
        return svg(vgrad('bg', p.bg[0], p.bg[1]), body);
    },
    snow(p) {
        const r = rng(19);
        let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
        let trees = '';
        for (let k = 0; k < 9; k++) { const x = r() < .5 ? r() * 420 : W - r() * 420; trees += pine(x, 760 + r() * 30, 150 + r() * 90, 46); }
        body += `<path d="${trees}" fill="${p.pines}"/>`;
        p.hills.forEach((c, i) => body += `<path d="${ridge(760 + i * 110, 36, 70 + i)}" fill="${c}"/>`);
        let flakes = '';
        for (let k = 0; k < 160; k++) flakes += `<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(1.5 + r() * 3)}" fill="${p.flakes}" opacity="${f1(.3 + r() * .5)}"/>`;
        return svg(vgrad('sky', p.sky[0], p.sky[1]), body + flakes);
    },
    blossom(p) {
        const r = rng(25);
        let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
        body += `<path d="M-40 120 C200 160 330 120 520 210 S820 260 980 230" stroke="${p.branch}" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M330 150 C380 90 430 70 500 60 M640 228 C700 300 740 330 820 350" stroke="${p.branch}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
        const flower = (x, y, s, c) => { let d = ''; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; d += `<circle cx="${f1(x + Math.cos(a) * 11 * s)}" cy="${f1(y + Math.sin(a) * 11 * s)}" r="${f1(10 * s)}" fill="${c}"/>`; } return d + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(4 * s)}" fill="${p.branch}"/>`; };
        const spots = [[120, 150], [210, 170], [300, 140], [380, 100], [460, 70], [520, 200], [600, 220], [700, 260], [780, 330], [880, 235], [960, 232], [250, 120], [560, 240]];
        spots.forEach(([x, y], k) => body += flower(x + (r() - .5) * 30, y + (r() - .5) * 30, 1 + r() * .8, p.petals[k % p.petals.length]));
        for (let k = 0; k < 40; k++) { const x = r() * W, y = 300 + r() * 700; body += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(6 + r() * 6)}" ry="${f1(4 + r() * 3)}" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})" fill="${p.petals[k % p.petals.length]}" opacity=".8"/>`; }
        return svg(vgrad('bg', p.bg[0], p.bg[1]), body);
    },
    terrazzo(p) {
        const r = rng(31);
        let body = `<rect width="${W}" height="${H}" fill="${p.bg}"/>`;
        for (let k = 0; k < 220; k++) {
            const x = r() * W, y = r() * H, s = 6 + r() * 22, n = 3 + Math.floor(r() * 3);
            let d = '';
            for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2 + r(), rr = s * (.6 + r() * .5); d += (j ? 'L' : 'M') + f1(x + Math.cos(a) * rr) + ' ' + f1(y + Math.sin(a) * rr); }
            body += `<path d="${d}Z" fill="${p.chips[k % p.chips.length]}"/>`;
        }
        return svg('', body);
    },
    linen(p) {
        return svg(`<pattern id="l" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 4.5H9M4.5 0V9" stroke="${p.line}" stroke-width="1.4"/></pattern>`,
            `<rect width="${W}" height="${H}" fill="${p.bg}"/><rect width="${W}" height="${H}" fill="url(#l)"/>`);
    },
    wine(p) {
        const r = rng(41);
        let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
        const bunch = (x, y, s) => { let d = ''; const rows = [5, 4, 4, 3, 2, 1]; rows.forEach((n, i) => { for (let k = 0; k < n; k++) d += `<circle cx="${f1(x + (k - (n - 1) / 2) * 36 * s)}" cy="${f1(y + i * 30 * s)}" r="${f1(19 * s)}" fill="${p.grapes[(i + k) % p.grapes.length]}"/>`; }); return d; };
        body += `<path d="M150 0 C170 120 260 160 300 260" stroke="${p.leaf}" stroke-width="10" fill="none"/>` + bunch(300, 270, 1.2) + bunch(1350, 640, 1);
        body += `<path d="M120 150 c60 -60 150 -40 160 30 c-60 40 -140 40 -160 -30Z" fill="${p.leaf}"/>`;
        const glass = (x, y) => `<path d="M${x - 60} ${y} h120 c0 110 -40 150 -60 150 c-20 0 -60 -40 -60 -150Z M${x} ${y + 150} v120 M${x - 55} ${y + 275} h110" stroke="${p.glass}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
        body += glass(1180, 560) + glass(1320, 600);
        return svg(vgrad('bg', p.bg[0], p.bg[1]), body);
    }
};

/** The catalog, as core/themes.ts would hold it. Palettes: light and dark, chosen by the client's own mode. */
const THEMES = [
    { id: 'plain', cat: 'minimal', concepts: ['minimal', 'plain'] },
    {
        id: 'forest', cat: 'abstract', art: 'forest', concepts: ['forest', 'green', 'calm', 'abstract', 'mist'],
        dark: { sky: ['#1d2a28', '#273631'], sun: '#33433b', layers: ['#25342f', '#212f2a', '#1c2925', '#172320'], accent: '#3c8a63', surface: '#151d1a' },
        light: { sky: ['#e6eee4', '#dfe8db'], sun: '#f4f2e3', layers: ['#cddbcc', '#bccfbd', '#a9c2ac', '#97b49b'], accent: '#2f7a55', surface: '#f2f6f0' }
    },
    {
        id: 'dunes', cat: 'abstract', art: 'dunes', concepts: ['desert', 'warm', 'abstract', 'calm'],
        dark: { sky: ['#272220', '#302823'], sun: '#3d332c', layers: ['#352c26', '#2f2722', '#29221d', '#231d19'], line: '#3e342d', accent: '#b4703c', surface: '#1d1815' },
        light: { sky: ['#f6efe5', '#f1e6d7'], sun: '#fbf5ea', layers: ['#ecdcc8', '#e5cfb6', '#dcc2a5', '#d2b594'], line: '#f6ecdf', accent: '#a05e2c', surface: '#faf6f0' }
    },
    {
        id: 'waves', cat: 'abstract', art: 'waves', concepts: ['sea', 'blue', 'abstract', 'paper', 'calm'],
        dark: { bg: '#18222c', shadow: '#111920', layers: ['#1c2834', '#1f2d3b', '#223242', '#253849', '#283d50'], accent: '#3b88b0', surface: '#141c24' },
        light: { bg: '#eef4f7', shadow: '#c9d9e2', layers: ['#e1ecf1', '#d6e5ec', '#cbdee7', '#c0d6e2', '#b5cfdd'], accent: '#2b7399', surface: '#f4f8fa' }
    },
    {
        id: 'pebbles', cat: 'abstract', art: 'pebbles', concepts: ['stone', 'abstract', 'calm', 'grey'],
        dark: { bg: '#22211f', chips: ['#2c2a27', '#302e2a', '#292a29', '#33302b', '#2d2e2a'], accent: '#7b8758', surface: '#1b1a18' },
        light: { bg: '#f2f0ec', chips: ['#e6e2db', '#dfdad1', '#e9e5de', '#d9d5cd', '#e1e2da'], accent: '#66713f', surface: '#f7f6f3' }
    },
    {
        id: 'hills', cat: 'nature', art: 'hills', concepts: ['mountain', 'calm', 'blue', 'purple'],
        dark: { sky: ['#1e2232', '#282d3e'], sun: '#343a50', layers: ['#2a3144', '#262c3f', '#212738', '#1c2131', '#171b29'], accent: '#5f6fc4', surface: '#171a25' },
        light: { sky: ['#eef0f6', '#e5e8f2'], sun: '#f8f4e8', layers: ['#d8deec', '#ccd3e6', '#bfc8de', '#b2bdd6', '#a5b2ce'], accent: '#4a5bb8', surface: '#f4f5fa' }
    },
    {
        id: 'mountains', cat: 'nature', art: 'mountains', concepts: ['mountain', 'mist', 'blue', 'calm', 'cold'],
        dark: { sky: ['#1a2128', '#252e37'], layers: ['#2b3640', '#252f38', '#1f2830', '#192128'], accent: '#4886a8', surface: '#151b20' },
        light: { sky: ['#eaeff3', '#dee6ec'], layers: ['#cbd8e1', '#b8c9d5', '#a6bbc9', '#94acbe'], accent: '#346c8d', surface: '#f3f6f8' }
    },
    {
        id: 'reeds', cat: 'nature', art: 'reeds', concepts: ['sea', 'green', 'calm', 'lake'],
        dark: { sky: ['#1b2325', '#232e31'], water: ['#1d282b', '#182225'], reeds: ['#293832', '#304039'], shore: '#212d2b', line: '#2a383a', accent: '#43897e', surface: '#151c1e' },
        light: { sky: ['#eef3f1', '#e6eeeb'], water: ['#dce8e5', '#d2e1dd'], reeds: ['#b4c4ae', '#a4b89c'], shore: '#cbdad4', line: '#eef5f3', accent: '#2c7a6f', surface: '#f4f7f6' }
    },
    {
        id: 'aurora', cat: 'sky', art: 'aurora', concepts: ['space', 'night', 'green', 'purple', 'sky'],
        dark: { sky: ['#131923', '#1b2331'], star: '#a9b4cc', ribbons: ['#2a5f55', '#34507a', '#4d4372'], ground: '#11161e', accent: '#3f9a81', surface: '#11161d' },
        light: { sky: ['#eef2f7', '#eaeff2'], star: '#ffffff', ribbons: ['#cbe8dd', '#cfdcf0', '#e0d6f1'], ground: '#dbe1e8', accent: '#2f8068', surface: '#f5f7fa' }
    },
    {
        id: 'night', cat: 'sky', art: 'night', concepts: ['night', 'sky', 'calm', 'blue', 'space'],
        dark: { sky: ['#131725', '#1d2234'], star: '#9ea7cc', moon: '#a9acc6', layers: ['#1b2030', '#171b29', '#131623'], accent: '#6270c4', surface: '#111420' },
        light: { sky: ['#e9e7f2', '#f0eaef'], star: '#ffffff', moon: '#fbf7ee', layers: ['#dbd8e8', '#cfcbe0', '#c3bfd7'], accent: '#5059a8', surface: '#f6f5fa' }
    },
    {
        id: 'clouds', cat: 'sky', art: 'clouds', concepts: ['sky', 'calm', 'blue', 'light'],
        dark: { sky: ['#1c2230', '#262e3f'], clouds: ['#262e3f', '#2b3446', '#30394d'], accent: '#5480c0', surface: '#171c27' },
        light: { sky: ['#e6eef8', '#f2f6fb'], clouds: ['#ffffff', '#f7f9fd', '#eef3f9'], accent: '#386cb4', surface: '#f6f8fc' }
    },
    {
        id: 'autumn', cat: 'seasons', art: 'autumn', concepts: ['autumn', 'warm', 'nature'],
        dark: { bg: ['#25201c', '#2c2520'], leaves: ['#3f2f22', '#4a3727', '#3a3123', '#432c24'], vein: '#2a221c', accent: '#b8733a', surface: '#1d1916' },
        light: { bg: ['#f7f0e7', '#f3e7da'], leaves: ['#ecd0b2', '#e7c3a0', '#e0cfb0', '#ebc8b3'], vein: '#f7eee4', accent: '#a75f28', surface: '#faf6f1' }
    },
    {
        id: 'snow', cat: 'seasons', art: 'snow', concepts: ['winter', 'cold', 'calm', 'forest'],
        dark: { sky: ['#1b2129', '#242c36'], hills: ['#28303b', '#2d3542'], flakes: '#7d889a', pines: '#20262f', accent: '#6589b5', surface: '#161b21' },
        light: { sky: ['#edf1f5', '#f6f8fa'], hills: ['#fbfcfd', '#f2f5f8'], flakes: '#c4cfdc', pines: '#cdd6df', accent: '#3d6a98', surface: '#f7f9fb' }
    },
    {
        id: 'blossom', cat: 'seasons', art: 'blossom', concepts: ['spring', 'pink', 'nature', 'calm'],
        dark: { bg: ['#241e23', '#2a2329'], branch: '#382c31', petals: ['#45333c', '#4e3845', '#3f3139'], accent: '#b5668a', surface: '#1c171b' },
        light: { bg: ['#fbf2f4', '#f7ebef'], branch: '#ddc8ca', petals: ['#f4d4dc', '#f1c7d2', '#f7dfe5'], accent: '#a84b74', surface: '#fcf7f8' }
    },
    {
        id: 'terrazzo', cat: 'minimal', art: 'terrazzo', concepts: ['stone', 'minimal', 'abstract', 'grey'],
        dark: { bg: '#202124', chips: ['#292a2e', '#2c2929', '#272b29', '#2d2d2a'], accent: '#717ba2', surface: '#1a1b1e' },
        light: { bg: '#f4f3f1', chips: ['#e6e2dd', '#e1e5e1', '#e8e2e2', '#dfdfd9'], accent: '#55608a', surface: '#f8f8f6' }
    },
    {
        id: 'linen', cat: 'minimal', art: 'linen', concepts: ['paper', 'minimal', 'warm'],
        dark: { bg: '#232220', line: '#2a2926', accent: '#8a8566', surface: '#1c1b19' },
        light: { bg: '#f5f2ec', line: '#ebe6dd', accent: '#706a4b', surface: '#faf8f4' }
    },
    {
        id: 'wine', cat: 'seasons', art: 'wine', hidden: true, concepts: ['wine'],
        dark: { bg: ['#231a1f', '#2a1f26'], grapes: ['#3a2632', '#422d39', '#33242d'], leaf: '#2a2e27', glass: '#43353c', accent: '#a9587a', surface: '#1c1519' },
        light: { bg: ['#f6eef1', '#f1e6ea'], grapes: ['#e5cfd8', '#dcc2ce', '#ead8df'], leaf: '#d8dfcf', glass: '#dccbd2', accent: '#954562', surface: '#fbf7f9' }
    }
];

const artCache = new Map();
/** The theme's picture as a CSS url(), made once per theme and mode. */
function artUrl(theme, mode) {
    if (theme.raster) return `url("${RASTER[theme.raster]}")`;
    if (!theme.art) return 'none';
    const key = theme.id + mode;
    if (!artCache.has(key)) artCache.set(key, `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(ART[theme.art](theme[mode]))}")`);
    return artCache.get(key);
}
const artBytes = (theme, mode) => theme.raster ? Math.round(RASTER[theme.raster].length * .75) : theme.art ? ART[theme.art](theme[mode]).length : 0;
