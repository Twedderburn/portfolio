/* Last Lantern: the turn-based battle, in the browser.
 * A port of scripts/battle.gd and scripts/lantern.gd from the Godot build, with the
 * same costs (scripts/tuning.gd), the same menu, and the game's own sprites and 5x7 font.
 * The light is the battlefield: a shadow inside the circle can be struck and shows what
 * it means to do; outside it there are only eyes. Every spend of Flame draws the circle in. */
(() => {
  const root = document.querySelector('[data-battle]');
  if (!root) return;
  const cv = root.querySelector('canvas');
  const ctx = cv.getContext('2d');
  // Two layouts: the wide one for desktops, and a tall one for phones, with bigger figures and the HUD in HTML.
  const PORTRAIT = root.dataset.layout === 'portrait';
  const L = PORTRAIT
    ? { W: 540, H: 540, OX: 270, OY: 455, K: 1.05, SQ: 0.78, SPR: 1.55, WALL: 150, TS: 3, PIP: 12, HEAD: 99,
        PACK: [[-122, 235], [-90, 160], [-58, 235]] }
    : { W: 960, H: 540, OX: 385, OY: 285, K: 0.9, SQ: 0.78, SPR: 1.35, WALL: 124, TS: 2, PIP: 8, HEAD: 84,
        PACK: [[-25, 235], [5, 160], [33, 245]] };
  const W = L.W, H = L.H;
  cv.width = W; cv.height = H;
  // world (game pixels, 48 to a tile) to canvas: the camera looks down at a slant
  const OX = L.OX, OY = L.OY, K = L.K, SQ = L.SQ, SPR = L.SPR;
  const sx = (x) => OX + x * K;
  const sy = (y) => OY + y * K * SQ;

  // ---- tuning.gd ----
  const T = {
    FLAME: 100, WICK: 100, RELIGHT_FLAME: 15, RELIGHT_WICK: 15,
    STRIKE: 3, FLARE: 12, BURST: 25, BURST_WICK: 5, HIT_FLAME: 10, HIT_WICK: 2, WICK_FLOOR: 5,
    R_MIN: 70, R_MAX: 330, R_SMOLDER: 46, FLARE_ARC: 64, BURST_RADIUS: 420,
    HP: 2, VEIL: 2, BLADE: 2, ROUND_FLAME: 1, REACH: 110, CREEP: 120, MAX_LUNGES: 2,
    DOWN_HIT: 1.5, SHIELD: 0.5, SMOLDER_TURNS: 2, EMBER_WICK: 2, XP: 10, BODY: 12,
  };
  const C = { warm: '#ffb35c', wick: '#d8a07a', pale: '#eadfc8', dim: '#8a7d6b', danger: '#ff6b4f', veil: '#8fb4ff', eye: '#9fb8ff', xp: '#b8d1ff' };
  const HINT = {
    strike: 'Lamp: strips 1 veil. A bared shadow takes 1.',
    blade: 'Blade: cuts a bared shadow for 2. A kill acts again.',
    flare: 'Bares every shadow in the cone, lit or not.',
    burst: 'Bares every shadow around you. Chars the wick.',
    set: 'Free. The blade comes out. Blows cost more flame.',
    lift: 'Free. Take the lantern back in hand.',
    shield: 'Until your next turn, blows cost half and no wick.',
    ember: 'Guard the ember. Each blow chars the wick.',
    wait: 'The lamp is out of your hands. Pass the turn.',
  };
  const MENUS = {
    root: [{ label: 'Attack', cmd: 'strike' }, { label: 'Flame', sub: 'flame' }, { label: 'Defend', cmd: 'shield' }, { label: 'Items', sub: 'items' }],
    flame: [{ label: 'Flare', cmd: 'flare' }, { label: 'Burst', cmd: 'burst' }, { label: 'Lantern', cmd: 'lantern' }],
    items: [],
  };
  const TITLE = { root: 'Act', flame: 'Flame', items: 'Items' };
  const KEYS = { strike: 'J', flare: 'K', burst: 'Q', lantern: 'Space', shield: 'Shift' };
  // where the shadows draw up round the lamp: [angle in degrees, distance]
  const PACK = L.PACK;

  // ---- the 5x7 HUD font (scripts/pixelfont.gd) ----
  const GLYPHS = {"A":".###./#...#/#...#/#####/#...#/#...#/#...#","B":"####./#...#/#...#/####./#...#/#...#/####.","C":".###./#...#/#..../#..../#..../#...#/.###.","D":"####./#...#/#...#/#...#/#...#/#...#/####.","E":"#####/#..../#..../####./#..../#..../#####","F":"#####/#..../#..../####./#..../#..../#....","G":".###./#...#/#..../#.###/#...#/#...#/.###.","H":"#...#/#...#/#...#/#####/#...#/#...#/#...#","I":".###./..#../..#../..#../..#../..#../.###.","J":"..###/...#./...#./...#./...#./#..#./.##..","K":"#...#/#..#./#.#../##.../#.#../#..#./#...#","L":"#..../#..../#..../#..../#..../#..../#####","M":"#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#","N":"#...#/##..#/#.#.#/#..##/#...#/#...#/#...#","O":".###./#...#/#...#/#...#/#...#/#...#/.###.","P":"####./#...#/#...#/####./#..../#..../#....","Q":".###./#...#/#...#/#...#/#.#.#/#..#./.##.#","R":"####./#...#/#...#/####./#.#../#..#./#...#","S":".####/#..../#..../.###./....#/....#/####.","T":"#####/..#../..#../..#../..#../..#../..#..","U":"#...#/#...#/#...#/#...#/#...#/#...#/.###.","V":"#...#/#...#/#...#/#...#/#...#/.#.#./..#..","W":"#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#","X":"#...#/#...#/.#.#./..#../.#.#./#...#/#...#","Y":"#...#/#...#/.#.#./..#../..#../..#../..#..","Z":"#####/....#/...#./..#../.#.../#..../#####","0":".###./#...#/#..##/#.#.#/##..#/#...#/.###.","1":"..#../.##../..#../..#../..#../..#../.###.","2":".###./#...#/....#/...#./..#../.#.../#####","3":"####./....#/....#/.###./....#/....#/####.","4":"...#./..##./.#.#./#..#./#####/...#./...#.","5":"#####/#..../####./....#/....#/#...#/.###.","6":".###./#..../#..../####./#...#/#...#/.###.","7":"#####/....#/...#./..#../.#.../.#.../.#...","8":".###./#...#/#...#/.###./#...#/#...#/.###.","9":".###./#...#/#...#/.####/....#/....#/.###.",".":"...../...../...../...../...../.##../.##..",",":"...../...../...../...../.##../..#../.#...",":":"...../.##../.##../...../.##../.##../.....",";":"...../.##../.##../...../.##../..#../.#...","/":"....#/...#./...#./..#../.#.../.#.../#....","(":"...#./..#../.#.../.#.../.#.../..#../...#.",")":".#.../..#../...#./...#./...#./..#../.#...","%":"##..#/##..#/...#./..#../.#.../#..##/#..##","'":"..#../..#../.#.../...../...../...../.....","-":"...../...../...../.###./...../...../.....","!":"..#../..#../..#../..#../..#../...../..#..","?":".###./#...#/....#/...#./..#../...../..#..","+":"...../..#../..#../#####/..#../..#../.....","=":"...../...../#####/...../#####/...../.....",">":"#..../.#.../..#../...#./..#../.#.../#....","<":"....#/...#./..#../.#.../..#../...#./....#"};
  const textCache = new Map();
  function glyphText(str, color, scale) {
    const key = str + '|' + color + '|' + scale;
    let c = textCache.get(key);
    if (c) return c;
    const s = str.toUpperCase();
    c = document.createElement('canvas');
    c.width = Math.max(1, (s.length * 6 - 1) * scale + scale);
    c.height = 8 * scale;
    const g = c.getContext('2d');
    for (let i = 0; i < s.length; i++) {
      const rows = GLYPHS[s[i]];
      if (!rows) continue;
      rows.split('/').forEach((row, y) => {
        for (let x = 0; x < 5; x++) {
          if (row[x] !== '#') continue;
          g.fillStyle = 'rgba(0,0,0,0.85)';
          g.fillRect((i * 6 + x) * scale + scale, (y + 1) * scale, scale, scale);
          g.fillStyle = color;
          g.fillRect((i * 6 + x) * scale, y * scale, scale, scale);
        }
      });
    }
    if (textCache.size > 400) textCache.clear();
    textCache.set(key, c);
    return c;
  }
  function text(str, x, y, color = C.pale, scale = 2, align = 'left') {
    const c = glyphText(str, color, scale);
    const dx = align === 'center' ? c.width / 2 : align === 'right' ? c.width : 0;
    ctx.drawImage(c, Math.round(x - dx), Math.round(y));
  }

  // ---- the elements of the page around the canvas ----
  const el = (s) => root.querySelector(s);
  const menuEl = el('[data-menu]');
  const listEl = el('[data-menu-list]');
  const titleEl = el('[data-menu-title]');
  const hintEl = el('[data-hint]');
  const statusEl = el('[data-status]');
  const startEl = el('[data-start]');
  const sumEl = el('[data-summary]');
  const assets = root.dataset.assets || 'img/ll/';

  // ---- the floor: cracked, mossy flagstones, drawn once ----
  const floor = document.createElement('canvas');
  floor.width = W; floor.height = H;
  const WALL = L.WALL;   // the back wall of the chapel, at the top of the picture
  const glass = document.createElement('canvas');
  glass.width = W; glass.height = WALL;
  (function buildFloor() {
    const g = floor.getContext('2d');
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.fillStyle = '#0d0b09';
    g.fillRect(0, 0, W, H);
    const tw = 48 * K, th = 48 * K * SQ;
    const x0 = OX - Math.ceil(OX / tw) * tw, y0 = OY - Math.ceil(OY / th) * th;
    const stones = ['#3b352c', '#353029', '#2f2b25', '#3a3a2e', '#2c3027', '#40382d', '#332e2a'];
    for (let y = y0; y < H; y += th) {
      for (let x = x0; x < W; x += tw) {
        g.fillStyle = stones[Math.floor(rnd() * stones.length)];
        g.fillRect(Math.round(x) + 2, Math.round(y) + 2, Math.round(tw) - 3, Math.round(th) - 3);
        g.fillStyle = 'rgba(255,240,210,0.06)';
        g.fillRect(Math.round(x) + 2, Math.round(y) + 2, Math.round(tw) - 3, 2);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(Math.round(x) + 2, Math.round(y + th) - 3, Math.round(tw) - 3, 2);
        if (rnd() < 0.35) { // a crack
          g.strokeStyle = 'rgba(10,8,6,0.7)';
          g.lineWidth = 1.5;
          g.beginPath();
          let cx = x + 6 + rnd() * (tw - 12), cy = y + 4 + rnd() * 6;
          g.moveTo(cx, cy);
          for (let k = 0; k < 3; k++) { cx += (rnd() - 0.5) * 14; cy += th / 4; g.lineTo(cx, cy); }
          g.stroke();
        }
        if (rnd() < 0.3) { // moss in the seams
          g.fillStyle = rnd() < 0.5 ? '#4f6b36' : '#3f5a2d';
          for (let k = 0; k < 5; k++) g.fillRect(Math.round(x + rnd() * tw), Math.round(y + (rnd() < 0.5 ? 1 : th - 3)), 3, 2);
        }
      }
    }
    // the back wall: ashlar courses, pilasters, and a lancet window in every bay
    g.fillStyle = '#121017';
    g.fillRect(0, 0, W, WALL);
    for (let r = 0; r * 14 < WALL; r++) {
      for (let x = (r % 2) * -20; x < W; x += 40) {
        g.fillStyle = rnd() < 0.5 ? '#1c1823' : '#211c29';
        g.fillRect(x + 1, r * 14 + 1, 38, 12);
      }
    }
    const gg = glass.getContext('2d');
    const panes = ['#9b1b2c', '#b02434', '#2346a8', '#2d58c4', '#c99a33', '#227049', '#56307f'];
    for (let cx = 60; cx < W + 60; cx += 120) {
      // a pilaster with a lit edge between the bays
      g.fillStyle = '#2a2433'; g.fillRect(cx + 50, 0, 16, WALL);
      g.fillStyle = '#3a3146'; g.fillRect(cx + 50, 0, 3, WALL);
      // the window's deep reveal, then its glass, cut into panes with lead
      g.fillStyle = '#07060a'; lancet(g, cx, WALL - 90, WALL - 12, 19); g.fill();
      gg.save(); lancet(gg, cx, WALL - 87, WALL - 14, 16); gg.clip();
      for (let y = WALL - 94; y < WALL - 12; y += 9) for (let x = cx - 18; x < cx + 18; x += 9) { gg.fillStyle = panes[Math.floor(rnd() * panes.length)]; gg.fillRect(x, y, 9, 9); }
      gg.strokeStyle = '#08070a'; gg.lineWidth = 1.2;
      for (let y = WALL - 94; y < WALL - 12; y += 9) { gg.beginPath(); gg.moveTo(cx - 18, y); gg.lineTo(cx + 18, y + 2); gg.stroke(); }
      gg.lineWidth = 3; gg.beginPath(); gg.moveTo(cx, WALL - 64); gg.lineTo(cx, WALL - 12); gg.stroke(); // the mullion
      gg.beginPath(); gg.arc(cx, WALL - 72, 6, 0, Math.PI * 2); gg.stroke();                // the oculus
      gg.restore();
      g.fillStyle = '#2a2433'; g.fillRect(cx - 21, WALL - 14, 42, 5); // the sill
    }
    g.fillStyle = '#2a2433'; g.fillRect(0, WALL - 6, W, 6);
    g.fillStyle = '#060508'; g.fillRect(0, WALL, W, 3);
  })();
  function lancet(c, x, y0, y1, w) {
    c.beginPath();
    c.moveTo(x - w, y1); c.lineTo(x - w, y0 + w * 1.3);
    c.quadraticCurveTo(x - w, y0 + w * 0.25, x, y0);
    c.quadraticCurveTo(x + w, y0 + w * 0.25, x + w, y0 + w * 1.3);
    c.lineTo(x + w, y1); c.closePath();
  }
  const dark = document.createElement('canvas');
  dark.width = W; dark.height = H;
  const dctx = dark.getContext('2d');

  // ---- sprites (art/sprites.png, cut down to the cast of this fight) ----
  const sheet = new Image(), glowSheet = new Image();
  let MAP = null;
  function frameOf(name, anim, ms) {
    const s = MAP[name];
    const a = s.anims[anim] || s.anims.idle || Object.values(s.anims)[0];
    const total = a.f.reduce((t, f) => t + f[2], 0);
    let t = a.loop ? ms % total : Math.min(ms, total - 1);
    for (const f of a.f) { if (t < f[2]) return f; t -= f[2]; }
    return a.f[a.f.length - 1];
  }
  function drawSprite(img, name, anim, ms, X, Y, flip, alpha = 1) {
    const s = MAP[name], f = frameOf(name, anim, ms);
    const [fw, fh] = s.size, [ox, oy] = s.origin;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(X), Math.round(Y));
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, f[0], f[1], fw, fh, -ox * SPR, -oy * SPR, fw * SPR, fh * SPR);
    ctx.restore();
  }

  // ---- state ----
  let S = null;
  let gen = 0;          // a restart abandons the old fight's waits
  let tweens = [];
  let menu = 'root';
  let xpBank = 0;
  try { xpBank = parseInt(localStorage.getItem('ll-demo-xp') || '0', 10) || 0; } catch (e) { /* private window */ }
  const now = () => performance.now();

  function newFight() {
    S = {
      active: false, phase: 'idle', flame: T.FLAME, wick: T.WICK, smoldering: false, smolderUsed: false, out: false,
      carried: true, lantern: { x: 0, y: 0 }, facing: { x: 1, y: 0 },
      player: { x: 0, y: 0, pose: null, poseT: 0, poseUntil: 0, moving: false },
      foes: PACK.map(([a, d], i) => {
        const r = a * Math.PI / 180;
        return { id: i + 1, x: Math.cos(r) * d, y: Math.sin(r) * d, hp: T.HP, veil: T.VEIL, bared: false, lostTurn: false, dying: 0, pose: null, poseT: 0, poseUntil: 0, moving: false, phase: Math.random() * 3000 };
      }),
      order: [], turn: 0, round: 1, cmd: 'strike', target: null, shielded: false, toggled: false,
      smolderTurns: 0, emberGrace: false, bonusUsed: false, lunges: 0,
      spentFlame: 0, spentWick: 0, lastFlame: T.FLAME, lastWick: T.WICK,
      msg: '', msgUntil: 0, shake: 0, fx: [], pulse: 0, acted: null,
    };
    S.target = S.foes[1]; // the nearest of the pack
    menu = 'root';
  }

  function wait(ms) {
    const g = gen;
    return new Promise((r) => setTimeout(() => { if (g === gen) r(); }, ms));
  }
  function move(o, x, y, ms) {
    const g = gen;
    // the timer, not the frame, ends a move, so the fight goes on in a background tab
    const tw = { o, fx: o.x, fy: o.y, x, y, t0: now(), ms };
    tweens.push(tw);
    return new Promise((r) => setTimeout(() => { tw.finished = true; if (g === gen) { o.x = x; o.y = y; r(); } }, ms));
  }
  function pose(a, anim, ms) { a.pose = anim; a.poseT = now(); a.poseUntil = now() + ms; }
  function say(t, secs = 2.2) {
    S.msg = t; S.msgUntil = now() + secs * 1000;
    if (statusEl) statusEl.textContent = t;
  }
  function floatText(t, x, y, color) { S.fx.push({ kind: 'text', t, x, y, color, t0: now(), ms: 1100 }); }

  // ---- lantern.gd ----
  const radius = () => (S.out ? 0 : S.smoldering ? T.R_SMOLDER : T.R_MIN + (T.R_MAX - T.R_MIN) * Math.max(0, Math.min(1, S.flame / 100)));
  const radiusAt = (flame) => T.R_MIN + (T.R_MAX - T.R_MIN) * Math.max(0, Math.min(1, flame / 100));
  function track() {
    if (S.flame < S.lastFlame) S.spentFlame += S.lastFlame - S.flame;
    if (S.wick < S.lastWick) S.spentWick += S.lastWick - S.wick;
    S.lastFlame = S.flame; S.lastWick = S.wick;
  }
  function charWick(n) {
    if (n <= 0) return;
    S.wick = Math.max(S.wick - n, T.WICK_FLOOR);
    S.flame = Math.min(S.flame, S.wick);
    track();
  }
  // You cannot spend your last light.
  function spend(f, w) {
    if (S.out || S.smoldering || S.flame <= f) return false;
    S.flame -= f; track(); charWick(w);
    return true;
  }
  function takeHit(f, w) {
    if (S.out) return;
    if (S.smoldering) { goOut(); return; }
    S.flame = Math.max(S.flame - f, 0); track();
    charWick(w);
    if (S.flame <= 0) onEmpty();
  }
  function burn(n) {
    if (S.out || S.smoldering) return;
    S.flame = Math.max(S.flame - n, 0); track();
    if (S.flame <= 0) onEmpty();
  }
  function onEmpty() {
    S.flame = 0;
    if (S.smolderUsed) { goOut(); return; }
    S.smoldering = true; S.smolderUsed = true;
    S.smolderTurns = T.SMOLDER_TURNS; S.emberGrace = true;
    say('The flame gutters. Shield the ember.', 2.6);
  }
  function relight() {
    if (S.out || !S.smoldering) return;
    S.smoldering = false;
    charWick(T.RELIGHT_WICK);
    S.flame = Math.min(T.RELIGHT_FLAME, S.wick);
    S.lastFlame = S.flame;
    S.pulse = 0.8;
    say('The ember catches. The lamp relights.', 2.2);
  }
  function goOut() {
    S.out = true; S.smoldering = false; S.flame = 0; track();
    pose(S.player, 'down', 1e9);
    say('The lamp goes out.', 4);
    finish(false);
  }

  // ---- queries (battle.gd) ----
  const alive = (f) => f && f.hp > 0;
  const living = () => S.foes.filter(alive);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const lit = (f) => !S.out && alive(f) && dist(f, S.lantern) <= radius() + T.BODY;
  const flareReach = () => Math.max(radius() * 1.1, 190);
  function inFlare(f) {
    if (!alive(S.target) || !alive(f)) return false;
    const aim = Math.atan2(S.target.y, S.target.x), d = Math.atan2(f.y, f.x);
    let da = Math.abs(d - aim); if (da > Math.PI) da = 2 * Math.PI - da;
    return Math.hypot(f.x, f.y) <= flareReach() + T.BODY && da <= (T.FLARE_ARC * 0.5) * Math.PI / 180 + 0.02;
  }
  const intent = (f) => (f.bared ? 'bared' : Math.hypot(f.x, f.y) > T.REACH ? 'creep' : 'lunge');
  function cost(c) {
    if (c === 'strike') return S.carried ? T.STRIKE : 0;
    if (c === 'flare') return T.FLARE;
    if (c === 'burst') return T.BURST;
    return 0;
  }
  function can(c) {
    const ok = !S.smoldering && S.flame > cost(c);
    if (c === 'strike') {
      if (!S.target || !lit(S.target)) return false;
      return S.carried ? ok : (S.target.bared && !S.smoldering);
    }
    if (c === 'flare' || c === 'burst') return S.carried && ok;
    if (c === 'lantern') return !S.toggled;
    if (c === 'shield') return true; // with the lantern down it is Wait
    return false;
  }
  function pickTarget() {
    if (alive(S.target) && (lit(S.target) || S.cmd === 'flare')) return;
    let best = null, score = Infinity;
    for (const f of living()) {
      let s = Math.hypot(f.x, f.y);
      if (!lit(f)) s += 10000;
      if (!S.carried && !f.bared) s += 5000;
      if (s < score) { score = s; best = f; }
    }
    S.target = best;
  }
  function cycle(step) {
    const live = living().sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
    if (!live.length) return;
    const i = live.indexOf(S.target);
    S.target = live[((i + step) % live.length + live.length) % live.length];
    update();
  }

  // ---- flow ----
  async function run() {
    const g = gen;
    S.active = true; S.phase = 'busy';
    say('Shadows close in.', 2);
    await wait(800);
    while (S.active && g === gen) {
      S.order = [null, ...living().sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))];
      S.turn = 0; S.lunges = 0;
      while (S.active && S.turn < S.order.length) {
        const who = S.order[S.turn];
        if (who === null) await playerTurn();
        else if (alive(who)) await foeTurn(who);
        if (!S.active || g !== gen) return;
        if (!living().length) { await wait(700); finish(true); return; }
        S.turn++;
      }
      if (!S.active) return;
      S.round++;
      burn(T.ROUND_FLAME);
    }
  }

  async function playerTurn() {
    S.shielded = false; S.toggled = false; S.emberGrace = false; S.bonusUsed = false;
    if (S.smoldering) {
      if (S.smolderTurns <= 0) { relight(); await wait(900); }
      else S.smolderTurns--;
    }
    S.cmd = S.smoldering ? 'shield' : 'strike';
    pickTarget();
    S.phase = 'choose';
    menu = 'root';
    renderMenu(true);
    await new Promise((r) => { S.acted = r; });
    S.phase = 'busy';
    update();
  }

  async function foeTurn(f) {
    if (f.bared && !f.lostTurn) { f.lostTurn = true; await wait(300); return; } // the turn it loses
    if (f.bared) { f.bared = false; f.lostTurn = false; f.veil = T.VEIL; await wait(250); } // the Veil knits back
    const d = Math.hypot(f.x, f.y);
    const ux = -f.x / d, uy = -f.y / d;
    if (d > T.REACH) {
      const step = Math.min(T.CREEP, d - T.REACH * 0.75);
      f.moving = true;
      await move(f, f.x + ux * step, f.y + uy * step, 450);
      f.moving = false;
      await wait(100);
      return;
    }
    if (S.lunges >= T.MAX_LUNGES || S.emberGrace) { await wait(200); return; }
    S.lunges++;
    pose(f, 'windup', 500);
    await wait(500);
    const hx = f.x, hy = f.y;
    pose(f, 'attack', 400);
    await move(f, -ux * 34, -uy * 34, 120);
    blow();
    await wait(350);
    if (!S.active) return;
    await move(f, hx, hy, 250);
  }

  // A shadow's blow lands on the lamp.
  function blow() {
    let cf = T.HIT_FLAME, cw = T.HIT_WICK;
    if (!S.carried) cf *= T.DOWN_HIT;
    S.shake = 8;
    if (S.shielded) {
      if (S.smoldering) {
        charWick(T.EMBER_WICK);
        say('The ember holds.', 1.6);
        floatText('-' + T.EMBER_WICK + ' WICK', 0, -10, C.wick);
        return;
      }
      cf *= T.SHIELD; cw = 0;
    }
    pose(S.player, 'hit', 300);
    S.fx.push({ kind: 'flash', t0: now(), ms: 260 });
    floatText('-' + cf + ' FLAME', 0, -10, C.danger);
    takeHit(cf, cw);
  }

  // Pick a command out; pressing it again does it (keys). A click does it at once.
  function press(c) {
    if (S.phase !== 'choose') return;
    if (c !== S.cmd) { S.cmd = c; menu = MENUS.root.some((e) => e.cmd === c) ? 'root' : 'flame'; renderMenu(true); return; }
    act(c);
  }

  async function act(c) {
    if (S.phase !== 'choose') return;
    S.cmd = c;
    S.phase = 'busy';
    update();
    let used = false;
    if (c === 'strike') used = await strike();
    else if (c === 'flare') used = await flare();
    else if (c === 'burst') used = await burst();
    else if (c === 'lantern') toggleLantern();
    else if (c === 'shield') used = await shield();
    if (!S.active) return;
    if (used) S.acted();
    else { S.phase = 'choose'; renderMenu(root.contains(document.activeElement)); }
  }

  function refused() { say(S.smoldering ? 'The lamp only smolders.' : 'Not enough Flame to spend.'); }

  async function strike() {
    const t = S.target;
    if (!alive(t)) return false;
    if (!lit(t)) { say('It is beyond the light.'); return false; }
    const warm = S.carried;
    if (warm) { if (!spend(T.STRIKE, 0)) { refused(); return false; } }
    else if (S.smoldering) { refused(); return false; }
    else if (!t.bared) { say('The blade finds only dark. Bare it with light first.', 2.6); return false; }
    const p = S.player, d = Math.hypot(t.x, t.y), ux = t.x / d, uy = t.y / d;
    S.facing = { x: ux, y: uy };
    const reach = Math.max(d - 56, 0);
    pose(p, warm ? 'strike' : 'cut', 600);
    await move(p, ux * reach, uy * reach, 160);
    if (warm) S.pulse = 0.35;
    await wait(120);
    if (warm && t.veil > 0) {
      t.veil--;
      if (t.veil === 0) { bare(t); say('Its veil burns away.', 1.6); }
      else pose(t, 'hit', 350);
      floatText('-1 VEIL', t.x, t.y - 70, C.veil);
    } else {
      const dmg = warm ? 1 : T.BLADE;
      hurt(t, dmg);
      floatText('-' + dmg, t.x, t.y - 70, C.danger);
    }
    await wait(220);
    await move(p, 0, 0, 180);
    if (!warm && !alive(t) && living().length && !S.bonusUsed) {
      // A kill with the blade: act again, once a turn.
      S.bonusUsed = true;
      say('The blade is still moving.', 1.4);
      pickTarget();
      return false;
    }
    return true;
  }

  async function flare() {
    if (!S.carried) { say('Lift the lantern first.'); return false; }
    if (!alive(S.target)) return false;
    const reach = flareReach();
    if (!spend(T.FLARE, 0)) { refused(); return false; }
    const ang = Math.atan2(S.target.y, S.target.x);
    S.facing = { x: Math.cos(ang), y: Math.sin(ang) };
    pose(S.player, 'cast', 600);
    S.pulse = 0.7;
    S.fx.push({ kind: 'flare', ang, reach, t0: now(), ms: 700 });
    await wait(200);
    let n = 0;
    for (const f of living()) if (inFlare(f) && !f.bared) { bare(f); n++; }
    say(n ? 'The flare strips the dark away.' : 'The flare finds nothing.', 1.6);
    await wait(550);
    return true;
  }

  async function burst() {
    if (!S.carried) { say('Lift the lantern first.'); return false; }
    if (!spend(T.BURST, T.BURST_WICK)) { refused(); return false; }
    pose(S.player, 'cast', 700);
    S.pulse = 1.6;
    S.fx.push({ kind: 'burst', t0: now(), ms: 800 });
    await wait(300);
    for (const f of living()) if (Math.hypot(f.x, f.y) <= T.BURST_RADIUS && !f.bared) bare(f);
    say('Light breaks over them.', 1.6);
    await wait(700);
    return true;
  }

  // Setting the lantern down, or lifting it, is free, once a turn.
  function toggleLantern() {
    if (S.toggled) { say('The lantern has moved once this turn.'); return; }
    S.toggled = true;
    if (S.carried) {
      S.carried = false;
      S.lantern = { x: S.facing.x * 22, y: S.facing.y * 22 + 6 };
      say('The lantern is set down. The blade is free.', 2);
    } else {
      S.carried = true;
      S.lantern = { x: 0, y: 0 };
      say('The lantern is lifted.', 1.6);
    }
    S.cmd = 'strike';
    S.target = alive(S.target) && (S.carried || S.target.bared) ? S.target : null;
    pickTarget();
  }

  async function shield() {
    if (!S.carried) {
      // The Godot build has no way to end a turn here (set down, nothing bared), so the demo lets you wait.
      say('You wait in the dark.', 1.6);
      await wait(350);
      return true;
    }
    S.shielded = true;
    pose(S.player, 'tend', 500);
    say(S.smoldering ? 'You cup the ember.' : 'You cup the flame.', 1.6);
    await wait(350);
    return true;
  }

  function bare(f) { f.veil = 0; f.bared = true; f.lostTurn = false; }
  function hurt(f, n) {
    f.hp -= n;
    if (f.hp <= 0) { f.hp = 0; f.dying = now(); }
    else pose(f, 'hit', 350);
  }

  function finish(won) {
    if (!S.active) return;
    S.active = false; S.phase = 'idle';
    track();
    const felled = S.foes.length - living().length;
    const xp = felled * T.XP;
    const before = xpBank;
    xpBank += xp;
    try { localStorage.setItem('ll-demo-xp', String(xpBank)); } catch (e) { /* fine */ }
    update();
    setTimeout(() => showSummary(won, { flame: Math.round(S.spentFlame), wick: Math.round(S.spentWick), felled, rounds: S.round, xp, banked: before + xp }), won ? 200 : 1600);
  }

  function showSummary(won, r) {
    sumEl.querySelector('[data-sum-title]').textContent = won ? 'The circle holds.' : 'The lamp is out.';
    const rows = [['Flame spent', r.flame], ['Wick spent', r.wick], ['Shadows felled', r.felled + ' of ' + S.foes.length], ['Rounds', r.rounds], ['XP gained', '+' + r.xp], ['XP banked', r.banked]];
    sumEl.querySelector('[data-sum-rows]').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    sumEl.hidden = false;
    sumEl.querySelector('button').focus({ preventScroll: true });
  }

  // ---- the menu: a column of stone slabs, as in the game ----
  function label(e) {
    if (e.cmd === 'strike') return S.carried ? 'Attack' : 'Blade';
    if (e.cmd === 'lantern') return S.carried ? 'Set down' : 'Lift';
    if (e.cmd === 'shield') return S.carried ? 'Defend' : 'Wait';
    return e.label;
  }
  function hint(c) {
    if (c === 'strike') return S.carried ? HINT.strike : HINT.blade;
    if (c === 'lantern') return S.carried ? HINT.set : HINT.lift;
    if (c === 'shield') return !S.carried ? HINT.wait : S.smoldering ? HINT.ember : HINT.shield;
    return HINT[c] || '';
  }
  function renderMenu(focus) {
    titleEl.textContent = TITLE[menu];
    listEl.innerHTML = '';
    if (menu !== 'root') {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'll-slab ll-slab--back';
      b.innerHTML = '<span class="ll-slab__label">Back</span><span class="ll-slab__key">Esc</span>';
      b.addEventListener('click', () => { menu = 'root'; renderMenu(true); });
      listEl.append(b);
    }
    for (const e of MENUS[menu]) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'll-slab';
      if (e.cmd) b.dataset.cmd = e.cmd;
      if (e.sub) b.dataset.sub = e.sub;
      b.addEventListener('click', () => {
        if (e.sub) { menu = e.sub; renderMenu(true); return; }
        act(e.cmd); // a command that cannot be done says why, as in the game
      });
      const pick = () => { if (e.cmd && S.phase === 'choose') { S.cmd = e.cmd; update(); } };
      b.addEventListener('mouseenter', pick);
      b.addEventListener('focus', pick);
      listEl.append(b);
    }
    if (!MENUS[menu].length) {
      const p = document.createElement('p');
      p.className = 'll-menu__empty';
      p.textContent = 'The pack is empty. Items are still being designed.';
      listEl.append(p);
    }
    update();
    if (focus) {
      const want = listEl.querySelector(`[data-cmd="${S.cmd}"]`) || listEl.querySelector('.ll-slab:not(.ll-slab--back)') || listEl.querySelector('.ll-slab');
      if (want) want.focus({ preventScroll: true });
    }
  }
  function update() {
    if (!S) return;
    const busy = S.phase !== 'choose';
    menuEl.classList.toggle('is-busy', busy);
    for (const b of listEl.querySelectorAll('.ll-slab')) {
      b.disabled = busy;
      if (b.classList.contains('ll-slab--back')) continue;
      const e = MENUS[menu].find((x) => (b.dataset.cmd && x.cmd === b.dataset.cmd) || (b.dataset.sub && x.sub === b.dataset.sub));
      if (!e) continue;
      const c = e.cmd;
      const costTxt = c && cost(c) ? String(cost(c)) : '';
      const key = c ? KEYS[c] : '';
      b.innerHTML = `<span class="ll-slab__label">${label(e)}${e.sub ? ' <span aria-hidden="true">›</span>' : ''}</span>` +
        (costTxt ? `<span class="ll-slab__cost">${costTxt}<span class="visually-hidden"> Flame</span></span>` : '') +
        (key ? `<span class="ll-slab__key" aria-hidden="true">${key}</span>` : '');
      b.setAttribute('aria-disabled', c ? String(!can(c)) : 'false');
      b.classList.toggle('is-picked', !!c && c === S.cmd);
    }
    hintEl.textContent = busy ? (S.active ? 'The shadows move.' : '') : hint(S.cmd);
  }

  // ---- input ----
  root.addEventListener('keydown', (ev) => {
    if (!S || !S.active && ev.key.toLowerCase() !== 'r') return;
    const k = ev.key, kl = k.toLowerCase();
    let handled = true;
    if (k === 'ArrowLeft' || kl === 'a') cycle(-1);
    else if (k === 'ArrowRight' || kl === 'd') cycle(1);
    else if (k === 'ArrowUp' || k === 'ArrowDown' || kl === 'w' || kl === 's') {
      const bs = [...listEl.querySelectorAll('.ll-slab')];
      if (bs.length) {
        let i = bs.indexOf(document.activeElement);
        i = i < 0 ? 0 : (i + (k === 'ArrowUp' || kl === 'w' ? -1 : 1) + bs.length) % bs.length;
        bs[i].focus();
      }
    } else if (kl === 'e') {
      if (listEl.contains(document.activeElement)) document.activeElement.click(); else press(S.cmd);
    } else if (k === 'Escape' || k === 'Backspace') {
      if (menu !== 'root') { menu = 'root'; renderMenu(true); } else handled = false;
    } else if (kl === 'j') press('strike');
    else if (kl === 'k') press('flare');
    else if (kl === 'q') press('burst');
    else if (k === ' ' && document.activeElement.tagName !== 'BUTTON') press('lantern');
    else if (k === 'Shift') press('shield');
    else if (kl === 'r') restart();
    else handled = false;
    if (handled) ev.preventDefault();
  });
  cv.addEventListener('click', (ev) => {
    if (!S || !S.active) return;
    const r = cv.getBoundingClientRect();
    const mx = (ev.clientX - r.left) * W / r.width, my = (ev.clientY - r.top) * H / r.height;
    let best = null, bd = 60 * SPR / 1.35;
    for (const f of living()) {
      const d = Math.hypot(sx(f.x) - mx, sy(f.y) - 30 * SPR / 1.35 - my);
      if (d < bd) { bd = d; best = f; }
    }
    if (best) { S.target = best; update(); }
  });
  function begin() {
    startEl.hidden = true;
    sumEl.hidden = true;
    root.classList.add('is-playing');
    run();
    renderMenu(false);
    if (PORTRAIT) root.scrollIntoView({ block: 'start', behavior: 'smooth' });
    root.focus({ preventScroll: true });
  }
  function restart() {
    gen++; tweens = [];
    newFight();
    begin();
  }
  startEl.addEventListener('click', begin);
  sumEl.querySelector('button').addEventListener('click', restart);
  el('[data-restart]')?.addEventListener('click', restart);

  // ---- drawing ----
  let visible = true, looping = false;
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) startLoop(); }).observe(cv);

  function baseAnim(a, isPlayer) {
    if (isPlayer) {
      if (S.out) return 'down';
      if (S.smoldering) return 'smolder';
      if (!S.carried) return 'blade_idle';
      return S.shielded ? 'hold' : 'idle';
    }
    if (a.moving) return 'walk';
    return a.bared ? 'stagger' : 'idle';
  }
  function animOf(a, isPlayer, t) {
    if (a.pose && t < a.poseUntil) return [a.pose, t - a.poseT];
    a.pose = null;
    return [baseAnim(a, isPlayer), t + (a.phase || 0)];
  }

  function frame() {
    const t = now();
    for (const tw of tweens) {
      const k = Math.min(1, (t - tw.t0) / tw.ms);
      const e = 1 - Math.pow(1 - k, 3);
      tw.o.x = tw.fx + (tw.x - tw.fx) * e;
      tw.o.y = tw.fy + (tw.y - tw.fy) * e;
    }
    tweens = tweens.filter((tw) => !tw.finished && t - tw.t0 < tw.ms);
    if (S && MAP) draw(t);
    if (visible) requestAnimationFrame(frame); else looping = false;
  }
  function startLoop() { if (!looping && MAP) { looping = true; requestAnimationFrame(frame); } }

  function ellipse(c, x, y, r) { c.beginPath(); c.ellipse(x, y, r * K, r * K * SQ, 0, 0, Math.PI * 2); }

  function draw(t) {
    S.shake *= 0.85;
    S.pulse *= 0.94;
    const shx = (Math.random() - 0.5) * S.shake, shy = (Math.random() - 0.5) * S.shake;
    ctx.save();
    ctx.translate(shx, shy);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(floor, 0, 0);

    const flick = 1 + Math.sin(t / 90) * 0.012 + Math.sin(t / 37) * 0.008 + S.pulse * 0.12;
    const r = radius() * flick;
    const lx = sx(S.lantern.x), ly = sy(S.lantern.y);

    // previews under the figures: the flare's cone
    if (S.phase === 'choose' && S.cmd === 'flare' && alive(S.target) && S.carried) {
      const ang = Math.atan2(S.target.y, S.target.x), half = T.FLARE_ARC / 2 * Math.PI / 180, reach = flareReach();
      ctx.save(); ctx.translate(sx(0), sy(0)); ctx.scale(K, K * SQ);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, reach, ang - half, ang + half); ctx.closePath();
      ctx.fillStyle = 'rgba(255,225,160,0.10)'; ctx.fill();
      ctx.restore();
    }

    // the figures, back to front
    const actors = [{ a: S.player, p: true }, ...S.foes.filter((f) => f.hp > 0 || (f.dying && t - f.dying < 500)).map((f) => ({ a: f, p: false }))];
    actors.sort((u, v) => u.a.y - v.a.y);
    const drawn = [];
    if (!S.carried) drawn.push(() => drawSprite(sheet, 'lantern', S.out ? 'out' : S.smoldering ? 'smolder' : S.flame < 25 ? 'low' : 'bright', t, lx, ly, false));
    for (const { a, p } of actors) {
      if (p) {
        const [an, ms] = animOf(a, true, t);
        const flip = S.facing.x < 0;
        drawn.push(() => drawSprite(sheet, 'lamplighter', an, ms, sx(a.x), sy(a.y), flip));
      } else {
        const dying = a.hp <= 0;
        const [an, ms] = dying ? ['dissolve', t - a.dying] : animOf(a, false, t);
        drawn.push(() => drawSprite(sheet, 'creeper', an, ms, sx(a.x), sy(a.y), a.x > S.player.x));
      }
    }
    for (const d of drawn) d();

    // the dark, with the lamp's circle cut out of it
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, W, H);
    dctx.fillStyle = 'rgba(4,3,7,0.94)';
    dctx.fillRect(0, 0, W, H);
    dctx.globalCompositeOperation = 'destination-out';
    // the faint cold sight of the unlit room
    let g = dctx.createRadialGradient(sx(0), sy(0), 0, sx(0), sy(0), 700);
    g.addColorStop(0, 'rgba(0,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = g; dctx.fillRect(0, 0, W, H);
    if (r > 0) {
      dctx.save(); dctx.translate(lx, ly - 14); dctx.scale(1, SQ);
      g = dctx.createRadialGradient(0, 0, 0, 0, 0, r * K * 1.08);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.62, 'rgba(0,0,0,0.9)'); g.addColorStop(0.92, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g; dctx.beginPath(); dctx.arc(0, 0, r * K * 1.08, 0, Math.PI * 2); dctx.fill();
      dctx.restore();
    }
    ctx.drawImage(dark, 0, 0);
    // stained glass glows in the dark, and throws a little colour on the floor below
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(t / 1400) * 0.04;
    ctx.drawImage(glass, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;
    for (let cx = 60; cx < W + 60; cx += 120) {
      const pool = ctx.createRadialGradient(cx, WALL + 26, 0, cx, WALL + 26, 60);
      pool.addColorStop(0, (cx / 120) % 2 < 1 ? 'rgba(70,90,200,0.10)' : 'rgba(190,40,60,0.09)');
      pool.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pool;
      ctx.fillRect(cx - 60, WALL - 10, 120, 100);
    }
    ctx.restore();
    // warm light over the circle
    if (r > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(lx, ly - 14); ctx.scale(1, SQ);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * K);
      const warm = S.smoldering ? 'rgba(255,90,40,' : 'rgba(255,150,60,';
      g.addColorStop(0, warm + (0.22 + S.pulse * 0.2) + ')'); g.addColorStop(1, warm + '0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * K, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // what lights itself: eyes, the flame
    for (const { a, p } of actors) {
      if (p) { const [an, ms] = animOf(a, true, t); drawSprite(glowSheet, 'lamplighter', an, ms, sx(a.x), sy(a.y), S.facing.x < 0); }
      else { const dying = a.hp <= 0; const [an, ms] = dying ? ['dissolve', t - a.dying] : animOf(a, false, t); drawSprite(glowSheet, 'creeper', an, ms, sx(a.x), sy(a.y), a.x > S.player.x, dying ? 0.6 : 1); }
    }
    if (!S.carried) drawSprite(glowSheet, 'lantern', S.out ? 'out' : S.smoldering ? 'smolder' : S.flame < 25 ? 'low' : 'bright', t, lx, ly, false);

    // the circle's edge, and where it will be once the picked command is paid
    if (r > 0) {
      ctx.save();
      ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t / 60;
      ctx.lineWidth = 3; ctx.strokeStyle = S.smoldering ? 'rgba(255,107,79,0.6)' : 'rgba(255,190,110,0.55)';
      ellipse(ctx, lx, ly, r); ctx.stroke();
      const c = S.phase === 'choose' ? cost(S.cmd) : 0;
      if (c > 0 && !S.smoldering && S.flame > c) {
        ctx.setLineDash([4, 8]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,220,170,0.4)';
        ellipse(ctx, lx, ly, radiusAt(S.flame - c)); ctx.stroke();
      }
      ctx.restore();
    }

    // effects
    for (const fx of S.fx) {
      const k = (t - fx.t0) / fx.ms;
      if (k >= 1) continue;
      if (fx.kind === 'flare') {
        const half = T.FLARE_ARC / 2 * Math.PI / 180;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(sx(0), sy(0) - 30); ctx.scale(K, K * SQ);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, fx.reach * Math.min(1, k * 3), fx.ang - half, fx.ang + half); ctx.closePath();
        ctx.fillStyle = `rgba(255,230,170,${0.45 * (1 - k)})`; ctx.fill(); ctx.restore();
      } else if (fx.kind === 'burst') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 10 * (1 - k); ctx.strokeStyle = `rgba(255,220,150,${0.8 * (1 - k)})`;
        ellipse(ctx, sx(0), sy(0) - 20, T.BURST_RADIUS * k); ctx.stroke();
        ctx.fillStyle = `rgba(255,200,120,${0.25 * (1 - k)})`; ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else if (fx.kind === 'flash') {
        ctx.fillStyle = `rgba(160,20,10,${0.28 * (1 - k)})`; ctx.fillRect(0, 0, W, H);
      } else if (fx.kind === 'text') {
        text(fx.t, sx(fx.x), sy(fx.y) - L.HEAD - 26 - k * 26, fx.color, L.TS, 'center');
      }
    }
    S.fx = S.fx.filter((fx) => t - fx.t0 < fx.ms);
    ctx.restore();

    // over each shadow: in the light, its Veil and intent; in the dark, only a question
    for (const f of living()) {
      const X = sx(f.x), Y = sy(f.y) - L.HEAD, P = L.PIP, G = P + 4;
      if (!lit(f)) { text('?', X, Y + 4, C.eye, L.TS, 'center'); continue; }
      const pips = f.bared ? f.hp : T.VEIL;
      const w = pips * G - 4;
      for (let i = 0; i < pips; i++) {
        const px = X - w / 2 - 10 + i * G;
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(px - 1, Y - 1, P + 2, P + 2);
        if (f.bared) { ctx.fillStyle = C.danger; ctx.fillRect(px, Y, P, P); }
        else if (i < f.veil) { ctx.fillStyle = C.veil; ctx.fillRect(px, Y, P, P); }
        else { ctx.strokeStyle = C.veil; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, Y + 0.5, P - 1, P - 1); }
      }
      const it = intent(f);
      text(it === 'creep' ? '>>' : it === 'lunge' ? '!' : 'X', X + w / 2 - 4, Y - 2, it === 'lunge' ? C.danger : it === 'bared' ? C.dim : C.pale, L.TS, 'left');
    }
    // the target
    if (S.active && alive(S.target)) {
      const X = sx(S.target.x), Y = sy(S.target.y) - L.HEAD - 16 + Math.sin(t / 160) * 3, A = L.TS * 3.5;
      ctx.fillStyle = C.warm;
      ctx.beginPath(); ctx.moveTo(X - A, Y - A); ctx.lineTo(X + A, Y - A); ctx.lineTo(X, Y + A * 0.3); ctx.closePath(); ctx.fill();
    }

    drawHud(t);
  }

  function drawHud(t) {
    if (PORTRAIT) { htmlHud(); return; }
    // the lamp: Flame and Wick
    ctx.fillStyle = 'rgba(8,6,5,0.72)';
    ctx.fillRect(12, 10, 270, 74);
    drawSprite(sheet, 'lantern', S.out ? 'out' : S.smoldering ? 'smolder' : S.flame < 25 ? 'low' : 'bright', t, 34, 76, false);
    drawSprite(glowSheet, 'lantern', S.out ? 'out' : S.smoldering ? 'smolder' : S.flame < 25 ? 'low' : 'bright', t, 34, 76, false);
    text('FLAME ' + Math.round(S.flame), 60, 20, S.smoldering ? C.danger : C.warm);
    text('WICK ' + Math.round(S.wick), 186, 20, C.wick);
    ctx.fillStyle = '#2a211a'; ctx.fillRect(60, 42, 206, 8);
    ctx.fillStyle = '#5b3d2a'; ctx.fillRect(60, 42, 206 * S.wick / 100, 8);
    ctx.fillStyle = S.smoldering ? C.danger : C.warm; ctx.fillRect(60, 42, 206 * S.flame / 100, 8);
    const c = S.phase === 'choose' ? cost(S.cmd) : 0;
    if (c > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(60 + 206 * Math.max(0, S.flame - c) / 100, 42, 206 * Math.min(c, S.flame) / 100, 8);
      text('FLAME -' + c + (S.cmd === 'burst' ? '  WICK -' + T.BURST_WICK : ''), 60, 58, C.dim);
    } else if (S.smoldering) {
      text('EMBER. RELIGHTS IN ' + (S.smolderTurns + 1), 60, 58, C.danger);
    } else if (S.shielded) {
      text('SHIELDED', 60, 58, C.pale);
    }

    // the taper: this round's order, lamplighter first
    text('ROUND ' + S.round, 310, 20, C.pale);
    const order = S.order.length ? S.order : [null, ...living()];
    const x0 = 420, x1 = 940, step = Math.min(70, (x1 - x0) / Math.max(1, order.length - 1));
    ctx.fillStyle = 'rgba(234,223,200,0.5)'; ctx.fillRect(x0, 27, step * (order.length - 1), 2);
    ctx.fillStyle = 'rgba(255,179,92,0.8)'; ctx.fillRect(x0, 27, step * Math.min(S.turn, order.length - 1), 2);
    order.forEach((who, i) => {
      const x = x0 + i * step;
      const dead = who && !alive(who);
      ctx.fillStyle = '#16110d'; ctx.beginPath(); ctx.arc(x, 28, 11, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = i === S.turn && S.active ? C.warm : dead ? '#3a332c' : '#7d705e'; ctx.stroke();
      if (who === null) text('L', x, 21, C.warm, 2, 'center');
      else if (dead) text('-', x, 21, '#4a4038', 2, 'center');
      else if (lit(who)) { ctx.fillStyle = who.bared ? C.danger : C.eye; ctx.fillRect(x - 5, 26, 3, 3); ctx.fillRect(x + 2, 26, 3, 3); }
      else text('?', x, 21, C.eye, 2, 'center');
      if (i === S.turn && S.active) { ctx.fillStyle = C.warm; ctx.beginPath(); ctx.moveTo(x - 4, 10); ctx.quadraticCurveTo(x, 0 + Math.sin(t / 80) * 2, x + 4, 10); ctx.closePath(); ctx.fill(); }
    });

    if (S.msg && now() < S.msgUntil) text(S.msg, 640, 498, C.pale, 2, 'center');
  }

  // ---- the phone's HUD, in HTML so it stays big and sharp ----
  const hud = {
    flame: el('[data-hud-flame]'), wick: el('[data-hud-wick]'), flameBar: el('[data-hud-flame-bar]'),
    costBar: el('[data-hud-cost-bar]'), wickBar: el('[data-hud-wick-bar]'), note: el('[data-hud-note]'),
    round: el('[data-hud-round]'), order: el('[data-hud-order]'), msg: el('[data-hud-msg]'),
  };
  let hudKey = '';
  function htmlHud() {
    if (!hud.flame) return;
    const c = S.phase === 'choose' ? cost(S.cmd) : 0;
    const order = S.order.length ? S.order : [null, ...living()];
    const chips = order.map((who, i) => {
      const now_ = i === S.turn && S.active;
      if (who === null) return ['you', now_, 'You'];
      if (!alive(who)) return ['gone', now_, '–'];
      return [lit(who) ? (who.bared ? 'bared' : 'lit') : 'dark', now_, lit(who) ? String(who.id) : '?'];
    });
    const note = c > 0 ? '−' + c + (S.cmd === 'burst' ? ', wick −' + T.BURST_WICK : '')
      : S.smoldering ? 'ember, relights in ' + (S.smolderTurns + 1) : S.shielded ? 'shielded' : '';
    const msg = S.msg && now() < S.msgUntil ? S.msg : '';
    const key = [Math.round(S.flame), Math.round(S.wick), c, S.smoldering, note, S.round, JSON.stringify(chips), msg].join('|');
    if (key === hudKey) return;
    hudKey = key;
    hud.flame.textContent = Math.round(S.flame);
    hud.wick.textContent = Math.round(S.wick);
    hud.flameBar.style.width = S.flame + '%';
    hud.wickBar.style.width = S.wick + '%';
    hud.costBar.style.left = Math.max(0, S.flame - c) + '%';
    hud.costBar.style.width = Math.min(c, S.flame) + '%';
    root.classList.toggle('is-smoldering', S.smoldering);
    hud.note.textContent = note;
    hud.round.textContent = S.round;
    hud.order.innerHTML = chips.map(([k, on, label]) => `<li class="is-${k}${on ? ' is-now' : ''}">${label}</li>`).join('');
    hud.msg.textContent = msg;
  }

  // the phone's aim buttons
  el('[data-aim-prev]')?.addEventListener('click', () => { if (S && S.active) cycle(-1); });
  el('[data-aim-next]')?.addEventListener('click', () => { if (S && S.active) cycle(1); });

  // ---- load ----
  const load = (img, src) => new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = src; });
  newFight();
  Promise.all([
    load(sheet, assets + 'll-sprites.png'),
    load(glowSheet, assets + 'll-sprites-glow.png'),
    fetch(assets + 'll-sprites.json').then((r) => r.json()).then((j) => { MAP = j; }),
  ]).then(() => {
    root.classList.add('is-ready');
    startEl.disabled = false;
    renderMenu(false);
    startLoop();
  }).catch(() => {
    root.classList.add('is-broken');
    startEl.textContent = 'The demo could not load';
  });
})();
