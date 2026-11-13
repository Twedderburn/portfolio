// Builds the portfolio: src/*.html bodies + shared header, footer, CSS and scripts.
// node build.mjs            -> the site root (full documents, served by GitHub Pages)
// node build.mjs --artifact -> artifact/ (home page without the document skeleton; the host adds it)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const artifact = process.argv.includes('--artifact');
const out = artifact ? join(root, 'artifact') : root; // site root, beside img/
mkdirSync(out, { recursive: true });

const read = (f) => readFileSync(join(root, f), 'utf8');
const css = ':root { color-scheme: dark; }\n' + read('tokens.css') + '\n' + read('base.css') + '\n' + read('src/site.css');
const siteUrl = 'https://twedderburn.github.io/portfolio/';

const pages = [
  { file: 'index.html', label: 'Home' },
  { file: 'pips-and-peril.html', label: 'Pips & Peril' },
  { file: 'focus-home.html', label: 'Focus Home' },
  { file: 'last-lantern.html', label: 'Last Lantern' },
];
const homeHref = artifact ? './' : 'index.html';
const href = (f) => (f === 'index.html' ? homeHref : f);

const nav = (active) => `<div class="nav">
  <a class="wordmark" href="${homeHref}" aria-label="Tyler Wedderburn, home"${active === 'index.html' ? ' aria-current="page"' : ''}>Tyler Wedderburn</a>
  <nav aria-label="Pages"><ul class="nav__links">
${pages.slice(1).map((p) => `    <li><a href="${p.file}"${p.file === active ? ' aria-current="page"' : ''}>${p.label.replace('&', '&amp;')}</a></li>`).join('\n')}
    <li><a href="${active === 'index.html' ? '' : homeHref}#about">About</a></li>
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
    <p class="footer__note">Pips &amp; Peril screenshots and art come from the game itself. Focus Home screenshots were captured from the 1.7 dev build; every screen shown is also in the public 1.6 release. Last Lantern is in development; its screenshots and demo come from the current prototype.</p>
  </div>
</footer>`;

const fontSets = {
  home: 'family=League+Spartan:wght@800&family=Hanken+Grotesk:wght@400;600&family=Pixelify+Sans:wght@600',
  pips: 'family=League+Spartan:wght@800&family=Hanken+Grotesk:wght@400;600&family=Pixelify+Sans:wght@600',
  focus: 'family=League+Spartan:wght@800&family=Hanken+Grotesk:wght@400;600',
  lantern: 'family=League+Spartan:wght@800&family=Hanken+Grotesk:wght@400;600&family=EB+Garamond:ital,wght@0,500;0,600;1,500&family=Cinzel:wght@600&family=UnifrakturMaguntia',
};

const scripts = `<script>
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // downloads: mark the file that fits this device, so the visitor doesn't have to work it out
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? 'android' : /Windows/i.test(ua) ? 'windows' : /Linux|X11/i.test(ua) ? 'linux' : 'other';
  document.documentElement.dataset.os = os;
  document.querySelectorAll('[data-os-group]').forEach((g) => {
    const mine = g.querySelector('[data-os="' + os + '"]');
    if (mine) { g.classList.add('has-yours'); mine.classList.add('is-yours'); }
  });

  // project pages: the sticky bar marks the section in view
  const bar = [...document.querySelectorAll('.subnav__links a')];
  if (bar.length) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const link = bar.find((l) => { const t = document.querySelector(l.hash); return t && (t.closest('section') || t) === e.target; });
      if (!link) return;
      if (e.isIntersecting) bar.forEach((l) => (l === link ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current')));
      else link.removeAttribute('aria-current');
    }), { rootMargin: '-30% 0px -65% 0px' });
    bar.forEach((l) => { const t = document.querySelector(l.hash); if (t) io.observe(t.closest('section') || t); });
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

for (const p of [...pages, { file: 'last-lantern-mobile.html', active: 'last-lantern.html' }, { file: '404.html' }]) {
  if (artifact && p.file === '404.html') continue;
  const src = read('src/' + p.file);
  const meta = (k) => (src.match(new RegExp(`<!--${k}: (.*?)-->`)) || [])[1] || '';
  const bodyClass = meta('body');
  const tick = '<svg class="tick" viewBox="0 0 24 24" role="img" aria-label="Included"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let body = src.replace(/<!--[a-z-]+(: .*?)?-->\n?/g, '').replace('@@NAV@@', nav(p.active || p.file)).replaceAll('@@TICK@@', tick);
  if (artifact) body = body.replaceAll('href="index.html"', 'href="./"');
  const mobileTo = meta('mobile');
  const phoneGate = mobileTo ? `<script>(function(){try{if(/[?&]full=1/.test(location.search)){sessionStorage.setItem('full-site','1');return}if(sessionStorage.getItem('full-site'))return}catch(e){}var u=navigator.userAgent,d=navigator.userAgentData;var phone=(d&&d.mobile)||/Android.+Mobile|iPhone|iPod|Windows Phone|Mobi/i.test(u)||(matchMedia('(pointer: coarse)').matches&&Math.min(screen.width,screen.height)<600);if(phone)location.replace('${mobileTo}'+location.hash)})();</script>\n<link rel="alternate" media="only screen and (max-width: 640px)" href="${siteUrl}${mobileTo}">\n` : '';
  const canonical = meta('canonical') ? `<link rel="canonical" href="${siteUrl}${meta('canonical')}">\n` : '';
  const head = `${phoneGate}${canonical}${meta('base') ? `<base href="${meta('base')}">\n` : ''}<title>${meta('title').replace('&', '&amp;')}</title>
<meta name="description" content="${meta('desc').replace(/&/g, '&amp;')}">
<meta property="og:type" content="website">
<meta property="og:title" content="${meta('title').replace('&', '&amp;')}">
<meta property="og:description" content="${meta('desc').replace(/&/g, '&amp;')}">
<meta property="og:url" content="${siteUrl}${p.file === 'index.html' ? '' : p.file}">
<meta property="og:image" content="${siteUrl}${meta('og')}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%234f9a4b'/%3E%3Cpath d='M8 9h16v4h-6v11h-4V13H8z' fill='%230d1a10'/%3E%3C/svg%3E">
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
// (GitHub Pages serves 404.html for any address that doesn't exist)
// the projects index moved onto the home page; keep its old address working
if (!artifact) writeFileSync(join(out, 'projects.html'), `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Projects, Tyler Wedderburn</title>\n<meta http-equiv="refresh" content="0; url=index.html#projects">\n<link rel="canonical" href="${siteUrl}">\n</head>\n<body>\n<p><a href="index.html#projects">The projects are on the home page.</a></p>\n</body>\n</html>\n`);
console.log('built', pages.length, 'pages into', out);
