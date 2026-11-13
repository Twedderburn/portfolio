// Draws the Gothic ornaments for the Last Lantern page as SVG files.
// node tools/gothic-art.cjs img/ll
const fs = require('fs');
const out = process.argv[2];
const f = (n) => +n.toFixed(2);
const STONE = '#17131f', LEAD = '#0c0a10', GOLD = '#c9a24a';
const CRIMSON = ['#8e1626', '#a81e2f', '#6f1020'], COBALT = ['#1d3d93', '#2a52b8', '#173074'], GOLDG = ['#c7912a', '#e0b048', '#a8741c'], GREEN = ['#1f6b45', '#2c8456'], VIOLET = ['#4b2470', '#5e3189'];
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rnd() * a.length)];

// ---- the rose window ----
function petal(r0, r1, w) {
  const rs = r1 - (r1 - r0) * 0.42;
  return `M${-w} ${-r0} L${-w} ${f(-rs)} Q${-w} ${f(-r1 + (r1 - rs) * 0.25)} 0 ${-r1} Q${w} ${f(-r1 + (r1 - rs) * 0.25)} ${w} ${f(-rs)} L${w} ${-r0} Z`;
}
function rose() {
  const g = [];
  g.push(`<defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="shine" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#fff6d8" stop-opacity="0.35"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient></defs>`);
  g.push(`<circle r="100" fill="${STONE}"/>`);
  const glass = [];
  const tracery = [];
  // twelve lancet petals
  for (let i = 0; i < 12; i++) {
    const a = i * 30;
    const col = i % 2 ? COBALT : CRIMSON;
    const p = petal(42, 90, 9.5);
    glass.push(`<g transform="rotate(${a})"><path d="${p}" fill="${pick(col)}"/>` +
      // lead lines cut it into panes
      [52, 62, 72].map((y) => `<line x1="-9.5" y1="${-y}" x2="9.5" y2="${-y - 2}" stroke="${LEAD}" stroke-width="1"/>`).join('') +
      `<line x1="0" y1="-42" x2="0" y2="-88" stroke="${LEAD}" stroke-width="0.8"/>` +
      `<circle cy="-80" r="3.2" fill="${pick(GOLDG)}"/></g>`);
    tracery.push(`<g transform="rotate(${a})"><path d="${p}" fill="none" stroke="${STONE}" stroke-width="3.2"/></g>`);
    // a little roundel between petals, near the rim
    glass.push(`<g transform="rotate(${a + 15})"><circle cy="-88" r="6" fill="${pick(GOLDG)}"/></g>`);
    tracery.push(`<g transform="rotate(${a + 15})"><circle cy="-88" r="6" fill="none" stroke="${STONE}" stroke-width="2.4"/></g>`);
  }
  // the inner hexafoil
  for (let i = 0; i < 6; i++) {
    glass.push(`<g transform="rotate(${i * 60})"><circle cy="-24" r="13" fill="${pick(i % 2 ? GREEN : VIOLET)}"/></g>`);
    tracery.push(`<g transform="rotate(${i * 60})"><circle cy="-24" r="13" fill="none" stroke="${STONE}" stroke-width="2.6"/></g>`);
  }
  glass.push(`<circle r="13" fill="${GOLDG[1]}"/>`);
  tracery.push(`<circle r="13" fill="none" stroke="${STONE}" stroke-width="2.6"/>`);
  // a cross in the middle roundel
  tracery.push(`<path d="M-1.8 -9 H1.8 V-1.8 H9 V1.8 H1.8 V9 H-1.8 V1.8 H-9 V-1.8 H-1.8 Z" fill="${STONE}"/>`);
  tracery.push(`<circle r="40" fill="none" stroke="${STONE}" stroke-width="3"/><circle r="95.5" fill="none" stroke="${STONE}" stroke-width="5"/><circle r="99" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.5"/>`);
  g.push(`<g filter="url(#glow)">${glass.join('')}</g>`, tracery.join(''), `<circle r="95" fill="url(#shine)"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200">${g.join('')}</svg>`;
}

// ---- an arcade of pointed arches, stone in silhouette ----
function arcade() {
  const bays = 6, bw = 200, H = 320, col = 26;
  let d = `M0 0 H${bays * bw} V${H} H0 Z`;
  let extra = '';
  for (let i = 0; i < bays; i++) {
    const x1 = i * bw + col, x2 = (i + 1) * bw - col / 2 + (i === bays - 1 ? -col / 2 : 0), xm = (x1 + x2) / 2;
    d += ` M${x1} ${H} V150 Q${x1} 58 ${xm} 24 Q${x2} 58 ${x2} 150 V${H} Z`;
    // tracery in each opening: a mullion, two small lancets and an oculus
    const w = x2 - x1, q = w / 4;
    extra += `<path d="M${xm} ${H} V165 M${x1} 168 Q${x1 + 4} 118 ${xm - q} 104 Q${xm - 4} 118 ${xm} 168 M${xm} 168 Q${xm + 4} 118 ${xm + q} 104 Q${x2 - 4} 118 ${x2} 168" fill="none" stroke="${STONE}" stroke-width="7"/>`;
    extra += `<circle cx="${xm}" cy="76" r="22" fill="none" stroke="${STONE}" stroke-width="7"/>`;
    extra += [0, 90, 180, 270].map((a) => `<circle cx="${f(xm + Math.cos(a * Math.PI / 180) * 9)}" cy="${f(76 + Math.sin(a * Math.PI / 180) * 9)}" r="8" fill="none" stroke="${STONE}" stroke-width="4"/>`).join('');
    extra += `<rect x="${i * bw}" y="130" width="${col}" height="12" fill="#221c2b"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bays * bw} ${H}" preserveAspectRatio="xMidYMax slice"><path d="${d}" fill="${STONE}" fill-rule="evenodd"/>${extra}</svg>`;
}

// ---- a band of blind tracery, to repeat between sections ----
function band() {
  const s = `fill="none" stroke="${GOLD}" stroke-width="1.4"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 36"><path d="M0 35 H64" ${s}/><path d="M2 35 V20 Q2 7 32 2 Q62 7 62 20 V35" ${s}/>` +
    `<path d="M10 35 V24 Q10 15 21 12 Q32 15 32 24 V35 M32 35 V24 Q32 15 43 12 Q54 15 54 24 V35" ${s}/>` +
    `<circle cx="32" cy="9.5" r="3.2" ${s}/></svg>`;
}

// ---- the tracery laid over the hero's lancet window ----
function lancet() {
  const s = (w) => `fill="none" stroke="${STONE}" stroke-width="${w}" stroke-linejoin="round"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" preserveAspectRatio="none">` +
    `<path d="M50 140 V64" ${s(3.2)}/>` +
    `<path d="M3 140 V66 Q3 40 26.5 33 Q50 40 50 66 M50 66 Q50 40 73.5 33 Q97 40 97 66 V140" ${s(2.6)}/>` +
    `<circle cx="50" cy="22" r="10" ${s(2.6)}/>` +
    [0, 90, 180, 270].map((a) => `<circle cx="${f(50 + Math.cos(a * Math.PI / 180) * 4.2)}" cy="${f(22 + Math.sin(a * Math.PI / 180) * 4.2)}" r="4.2" ${s(1.4)}/>`).join('') +
    `<path d="M0 140 V55 Q0 8 50 0 Q100 8 100 55 V140" fill="none" stroke="${STONE}" stroke-width="6"/>` +
    `<path d="M2.5 140 V55 Q2.5 10 50 2.6 Q97.5 10 97.5 55 V140" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.8"/>` +
    [46, 86, 118].map((y) => `<path d="M3 ${y} H97" stroke="${LEAD}" stroke-width="0.6" opacity="0.6"/>`).join('') +
    `</svg>`;
}

// ---- a pointed canopy over a framed picture, with a cross finial ----
function canopy() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" preserveAspectRatio="none">` +
    `<path d="M0 60 Q40 56 100 4 Q160 56 200 60" fill="none" stroke="${GOLD}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>` +
    `<path d="M14 60 Q52 54 100 14 Q148 54 186 60" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.55" vector-effect="non-scaling-stroke"/></svg>`;
}
function finial() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52"><g fill="${GOLD}">` +
    `<path d="M18 0 H22 V10 H30 V14 H22 V34 H18 V14 H10 V10 H18 Z"/>` +
    `<circle cx="20" cy="12" r="4.5" fill="none" stroke="${GOLD}" stroke-width="1.5"/>` +
    `<path d="M20 30 Q8 36 10 46 Q14 40 20 40 Q26 40 30 46 Q32 36 20 30 Z"/><rect x="16" y="44" width="8" height="8"/></g></svg>`;
}

const files = { 'rose.svg': rose(), 'arcade.svg': arcade(), 'tracery.svg': band(), 'lancet.svg': lancet(), 'canopy.svg': canopy(), 'finial.svg': finial() };
for (const [n, s] of Object.entries(files)) fs.writeFileSync(out + '/' + n, s);
console.log(Object.entries(files).map(([n, s]) => n + ' ' + s.length).join('\n'));
