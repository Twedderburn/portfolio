// Builds the portfolio: src/*.html bodies + shared header, footer, CSS and scripts.
// node build.mjs            -> dist/ (full documents, for local preview and lint)
// node build.mjs --artifact -> artifact/ (home page without the document skeleton; the host adds it)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const artifact = process.argv.includes('--artifact');
const out = artifact ? join(root, 'artifact') : root; // site root, beside img/
mkdirSync(out, { recursive: true });

const read = (f) => readFileSync(join(root, f), 'utf8');
const site = read('src/site.css');
const stampEnd = site.indexOf('*/', site.lastIndexOf('/* Hallmark')) + 2;
const css = site.slice(0, stampEnd) + '\n:root { color-scheme: dark; }\n' + read('tokens.css') + '\n' + read('base.css') + site.slice(stampEnd);

const pages = [
  { file: 'index.html', label: 'Home' },
  { file: 'projects.html', label: 'Projects' },
  { file: 'pips-and-peril.html', label: 'Pips & Peril' },
  { file: 'focus-home.html', label: 'Focus Home' },
];
const homeHref = artifact ? './' : 'index.html';
const href = (f) => (f === 'index.html' ? homeHref : f);

const nav = (active) => `<div class="nav">
  <a class="wordmark" href="${homeHref}" aria-label="Tyler Wedderburn, home"${active === 'index.html' ? ' aria-current="page"' : ''}>Tyler Wedderburn</a>
  <nav aria-label="Pages"><ul class="nav__links">
${pages.slice(1).map((p) => `    <li><a href="${p.file}"${p.file === active ? ' aria-current="page"' : ''}>${p.label.replace('&', '&amp;')}</a></li>`).join('\n')}
  </ul></nav>
  <a class="nav__mail" href="mailto:T1D0@pm.me">T1D0@pm.me</a>
</div>`;

const footer = `<footer class="footer">
  <div class="wrap">
    <div class="footer__row">
      <div><p class="footer__name">Tyler Wedderburn</p><p>Manitoba, Canada</p></div>
      <ul>${pages.map((p) => `<li><a href="${href(p.file)}">${p.label.replace('&', '&amp;')}</a></li>`).join('')}</ul>
      <ul><li><a href="mailto:T1D0@pm.me">T1D0@pm.me</a></li><li><a href="https://github.com/Twedderburn">GitHub</a></li></ul>
    </div>
    <p class="footer__note">Pips &amp; Peril screenshots and art come from the game itself. Focus Home screenshots were captured from the 1.7 dev build; every screen shown is also in the public 1.6 release.</p>
  </div>
</footer>`;

// a stepped pixel edge: 48 columns, 1 to 3 squares tall, fixed so every build matches
const pixelHeights = [1,2,1,3,2,2,1,3,3,2,1,1,2,3,2,1,2,2,3,1,1,2,3,3,2,1,2,1,3,2,1,1,2,3,2,2,1,3,1,2,2,1,3,2,1,2,3,1];
const pixels = pixelHeights.map((h) => `<span style="--h: ${h}"></span>`).join('');

const fontSets = {
  home: 'family=League+Spartan:wght@800&family=Hanken+Grotesk:wght@400;600&family=EB+Garamond:ital@1',
  projects: 'family=League+Spartan:wght@800&family=Hanken+Grotesk:wght@400;600&family=Pixelify+Sans:wght@600',
  pips: 'family=League+Spartan:wght@800&family=Hanken+Grotesk:wght@400;600&family=Pixelify+Sans:wght@600',
  focus: 'family=League+Spartan:wght@800&family=Hanken+Grotesk:wght@400;600',
};

const scripts = `<script>
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // home: the off shift / on shift switch
  const hero = document.querySelector('[data-side]');
  if (hero) {
    const btns = hero.querySelectorAll('[data-side-btn]');
    btns.forEach((b) => b.addEventListener('click', () => {
      const side = b.dataset.sideBtn;
      hero.dataset.side = side;
      btns.forEach((x) => x.setAttribute('aria-pressed', x === b));
      hero.querySelectorAll('[data-side-text]').forEach((t) => { t.hidden = t.dataset.sideText !== side; });
    }));
  }

  // Pips & Peril: the pixel rail marks the section in view
  const rail = document.querySelector('[data-rail]');
  if (rail) {
    const links = [...rail.querySelectorAll('a')];
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; links.forEach((l) => l.setAttribute('aria-current', l.hash === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((l) => { const t = document.querySelector(l.hash); if (t) io.observe(t); });
  }

  // Pips & Peril: two d6 and a D4 modifier; hold, then one reroll
  const roller = document.querySelector('[data-roller]');
  if (roller) {
    const SPOTS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    const MODS = [0.5, 1, 1.5, 2];
    const dice = [...roller.querySelectorAll('[data-die]')], mod = roller.querySelector('[data-mod]');
    const sum = roller.querySelector('[data-sum]'), roll = roller.querySelector('[data-roll]'), reroll = roller.querySelector('[data-reroll]');
    const vals = [6, 6]; let m = 1;
    const face = (el, v) => { el.querySelector('.die__face').innerHTML = Array.from({ length: 9 }, (_, i) => (SPOTS[v].includes(i) ? '<i></i>' : '<b></b>')).join(''); };
    dice.forEach((d, i) => face(d, vals[i]));
    const d6 = () => 1 + Math.floor(Math.random() * 6);
    const show = () => {
      const base = vals[0] + vals[1], pair = vals[0] === vals[1] ? 3 : 0, total = Math.round((base + pair) * m);
      sum.textContent = (pair ? vals[0] + ' + ' + vals[1] + ', pair +3, ' : vals[0] + ' + ' + vals[1] + ', ') + 'times ' + m + ' = ' + total + ' damage.';
    };
    const throwDice = (keep) => {
      dice.forEach((d, i) => { if (!(keep && d.getAttribute('aria-pressed') === 'true')) vals[i] = d6(); face(d, vals[i]); });
      if (!keep) { m = MODS[Math.floor(Math.random() * 4)]; mod.textContent = 'x' + m; }
      if (!reduce) { roller.classList.remove('is-rolling'); void roller.offsetWidth; roller.classList.add('is-rolling'); }
      show();
    };
    dice.forEach((d, i) => d.addEventListener('click', () => { const on = d.getAttribute('aria-pressed') !== 'true'; d.setAttribute('aria-pressed', on); d.setAttribute('aria-label', (i ? 'Second' : 'First') + ' d6, ' + (on ? 'held' : 'not held')); }));
    roll.addEventListener('click', () => { dice.forEach((d) => d.setAttribute('aria-pressed', 'false')); throwDice(false); reroll.disabled = false; });
    reroll.addEventListener('click', () => { throwDice(true); reroll.disabled = true; });
  }

  // Focus Home: one decision drives both the words and the picture. All four screenshots are already
  // loaded and stacked in the pinned phone; the step whose middle is nearest the phone's middle wins,
  // and its words and its screenshot switch on in the same frame.
  const story = document.querySelector('[data-story]');
  if (story) {
    const frame = story.querySelector('.story__phone');
    const steps = [...story.querySelectorAll('[data-shot]')];
    const imgs = [...story.querySelectorAll('[data-step-img]')];
    let active = -1, raf = 0;
    const pick = () => {
      raf = 0;
      const f = frame.getBoundingClientRect();
      if (!f.height) return;                    // phone hidden (narrow screens show each step's own picture)
      const mid = f.top + f.height / 2;
      let best = 0, bestDist = Infinity;
      steps.forEach((s, i) => { const r = s.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - mid); if (d < bestDist) { bestDist = d; best = i; } });
      if (best === active) return;
      active = best;
      steps.forEach((s, i) => s.classList.toggle('is-on', i === best));
      imgs.forEach((im, i) => im.classList.toggle('is-on', i === best));
      story.dataset.active = best;
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(pick); }, { passive: true });
    addEventListener('resize', pick, { passive: true });
    pick();
  }

  // Focus Home: a simulated key scan opens the full list and starts the relock countdown
  const demo = document.querySelector('[data-demo]');
  if (demo) {
    const views = demo.querySelectorAll('[data-view]'), scan = demo.querySelector('[data-scan]'), lock = demo.querySelector('[data-lock]'), left = demo.querySelector('[data-relock]');
    let t = 0, timer = 0;
    const set = (v) => { views.forEach((x) => { x.hidden = x.dataset.view !== v; }); scan.hidden = v !== 'focus'; lock.hidden = v === 'focus'; };
    const draw = () => { left.textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
    scan.addEventListener('click', () => { set('all'); t = 1800; draw(); clearInterval(timer); timer = setInterval(() => { t -= 1; draw(); if (t <= 0) { clearInterval(timer); set('focus'); } }, 1000); lock.focus(); });
    lock.addEventListener('click', () => { clearInterval(timer); set('focus'); scan.focus(); });
  }

  // live clocks and dates in the rebuilt Focus Home screens
  const tick = () => {
    const n = new Date();
    document.querySelectorAll('[data-clock]').forEach((c) => { c.textContent = n.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\\s?[AP]M$/i, ''); });
    document.querySelectorAll('[data-date]').forEach((d) => { d.textContent = n.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }); });
  };
  tick(); setInterval(tick, 15000);

  // the home reel slides with the scroll, never on its own
  const reel = document.querySelector('[data-reel]');
  if (reel && !reel.closest('html').classList.contains('no-motion') && !reduce) {
    const track = reel.firstElementChild;
    let raf = 0;
    const move = () => { raf = 0; const r = reel.getBoundingClientRect(); const p = Math.min(1, Math.max(0, 1 - r.bottom / (innerHeight + r.height))); const room = Math.max(0, track.scrollWidth - reel.clientWidth); track.style.setProperty('--reel', -(room * (0.15 + p * 0.85)) + 'px'); };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(move); }, { passive: true });
    addEventListener('resize', move, { passive: true }); move();
  }

  // the about paragraph lights up word by word as it scrolls past
  const say = document.querySelector('[data-say]');
  if (say && !reduce) {
    const words = say.textContent.split(' ');
    say.innerHTML = words.map((w) => '<span class="w">' + w + '</span>').join(' ');
    const spans = say.querySelectorAll('.w');
    const light = () => { const r = say.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35))); spans.forEach((s, i) => s.style.setProperty('--o', i / spans.length < p ? 1 : 0.25)); };
    addEventListener('scroll', light, { passive: true }); light();
  }

  // the Pips & Peril hero pan: paused off-screen, on hover, on focus, and on request
  document.querySelectorAll('[data-loop]').forEach((el) => {
    const pan = el.querySelector('.pan'), btn = el.querySelector('[data-loop-toggle]');
    const measure = () => pan.style.setProperty('--pan', Math.max(0, (pan.offsetWidth - el.offsetWidth) / 2) + 'px');
    measure(); addEventListener('resize', measure, { passive: true });
    pan.classList.add('is-panning');
    const s = { seen: false, hover: false, focus: false, held: reduce };
    const sync = () => { el.classList.toggle('is-running', s.seen && !s.hover && !s.focus && !s.held); btn.textContent = s.held ? 'Play' : 'Pause'; };
    btn.addEventListener('click', () => { s.held = !s.held; sync(); });
    [['pointerenter', 'hover', true], ['pointerleave', 'hover', false], ['focusin', 'focus', true], ['focusout', 'focus', false]].forEach(([t, k, v]) => el.addEventListener(t, () => { s[k] = v; sync(); }));
    new IntersectionObserver(([e]) => { s.seen = e.isIntersecting; sync(); }).observe(el);
  });

  // tabs: click or arrow keys
  document.querySelectorAll('[data-switch]').forEach((sw) => {
    const tabs = [...sw.querySelectorAll('[role="tab"]')];
    const pick = (t) => tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(t));
      t.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; const n = tabs[(i + d + tabs.length) % tabs.length]; pick(n); n.focus(); });
    });
  });
})();
</script>
<script>window.hallmarkSlots = (m) => { for (const [k, v] of Object.entries(m)) { const s = document.querySelector(\`[data-slot="\${k}"]\`); if (!s) continue; const im = new Image(); im.src = typeof v === 'string' ? v : v.src; im.alt = (typeof v === 'object' && v.alt) || s.dataset.alt || ''; s.querySelectorAll(':scope > img').forEach((o) => o.remove()); s.prepend(im); } };
document.querySelectorAll('[data-slot] img').forEach((i) => { if (i.complete && !i.naturalWidth) i.remove(); else i.addEventListener('error', () => i.remove(), { once: true }); });</script>`;

for (const p of pages) {
  const src = read('src/' + p.file);
  const meta = (k) => (src.match(new RegExp(`<!--${k}: (.*?)-->`)) || [])[1] || '';
  const bodyClass = meta('body');
  const tick = '<svg class="tick" viewBox="0 0 24 24" role="img" aria-label="Included"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let body = src.replace(/<!--[a-z-]+(: .*?)?-->\n?/g, '').replace('@@NAV@@', nav(p.file)).replace('@@PIXELS@@', pixels).replaceAll('@@TICK@@', tick);
  if (artifact) body = body.replaceAll('href="index.html"', 'href="./"');
  const head = `<title>${meta('title').replace('&', '&amp;')}</title>
<meta name="description" content="${meta('desc').replace(/&/g, '&amp;')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${fontSets[meta('fonts')]}&display=swap" rel="stylesheet">
<script>document.documentElement.classList.add('js');</script>
<style>
${css}
</style>`;
  const content = `<a class="skip" href="#main">Skip to content</a>
${body.trim()}
${footer}
${scripts}`;
  const skeletonless = artifact && p.file === 'index.html';
  const html = skeletonless
    ? `${head}\n<script>document.body.classList.add('${bodyClass}');</script>\n${content}\n`
    : `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${head}\n</head>\n<body class="${bodyClass}">\n${content}\n</body>\n</html>\n`;
  writeFileSync(join(out, p.file), html);
}
console.log('built', pages.length, 'pages into', out);
