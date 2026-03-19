
'use strict';
// ═══════════════════════════════════════
// SAVE / ECONOMY
// ═══════════════════════════════════════
function lsGet() { try { return JSON.parse(localStorage.getItem('sb')) || {}; } catch (e) { return {}; } }
function lsSet(d) { try { localStorage.setItem('sb', JSON.stringify(d)); } catch (e) { } }
let SV = lsGet();
if (!SV.coins) SV.coins = 50;
if (!SV.owned) SV.owned = { blaze: true };
if (!SV.best) SV.best = 0;
lsSet(SV);

function addCoins(n) { SV.coins = (SV.coins || 0) + n; lsSet(SV); uCoinUI(); }
function spendCoins(n) { if ((SV.coins || 0) < n) return false; SV.coins -= n; lsSet(SV); uCoinUI(); return true; }
function uCoinUI() { document.querySelectorAll('.camt').forEach(e => e.textContent = SV.coins || 0); }
uCoinUI();

// ═══════════════════════════════════════
// CHARACTERS
// ═══════════════════════════════════════
const CH = {
  blaze: { name: 'BLAZE', col: '#f97316', col2: '#fbbf24', type: 'Fire Warrior', sp: 'INFERNO', cost: 0, pw: 8, spd: 7, def: 6 },
  storm: { name: 'STORM', col: '#60a5fa', col2: '#818cf8', type: 'Thunder Strike', sp: 'T-DASH', cost: 2400, pw: 7, spd: 10, def: 5 },
  titan: { name: 'TITAN', col: '#22c55e', col2: '#a3e635', type: 'Earth Crusher', sp: 'QUAKE', cost: 3750, pw: 10, spd: 4, def: 9 },
  void: { name: 'VOID', col: '#e879f9', col2: '#f0abfc', type: 'Shadow Phantom', sp: 'SOUL BEAM', cost: 5500, pw: 9, spd: 8, def: 4 }
};
const CK = ['blaze', 'storm', 'titan', 'void'];
const isOwned = k => !!(SV.owned && SV.owned[k]);

// ═══════════════════════════════════════
// 5 DIFFICULTY LEVELS
// ═══════════════════════════════════════
const DIFFS = {
  easy: { react: 20, aggr: .94, blk: 0.99, sp: .23, combo: true, label: 'EASY', desc: 'For beginners' },
  normal: { react: 55, aggr: .42, blk: .22, sp: .45, combo: false, label: 'NORMAL', desc: 'Balanced' },
  hard: { react: 30, aggr: .65, blk: .40, sp: .08, combo: true, label: 'HARD', desc: 'Tough bot' },
  brutal: { react: 16, aggr: .82, blk: .58, sp: .13, combo: true, label: 'BRUTAL', desc: 'Very aggressive' },
  insane: { react: 1, aggr: .99, blk: .99, sp: .99, combo: true, label: 'INSANE', desc: 'No mercy' }
};
// survival per-wave scales on top of chosen difficulty
const SV_SCALE = (wave, base) => ({
  react: Math.max(6, base.react - wave * 3.5),
  aggr: Math.min(.99, base.aggr + wave * .04),
  blk: Math.min(.88, base.blk + wave * .03),
  sp: Math.min(.30, base.sp + wave * .015),
  combo: base.combo || wave >= 4
});

// ═══════════════════════════════════════
// AD SYSTEM
// ═══════════════════════════════════════
let adCB = null, adTi = 0, adInt = null;
function showAd(title, body, cb) {
  adCB = cb;
  document.getElementById('adTit').textContent = title;
  document.getElementById('adBody').textContent = body;
  document.getElementById('adCnf').style.display = 'none';
  document.getElementById('adM').style.display = 'flex';
  adTi = 5; document.getElementById('adTmr').textContent = 5;
  if (adInt) clearInterval(adInt);
  adInt = setInterval(() => { adTi--; document.getElementById('adTmr').textContent = Math.max(0, adTi); if (adTi <= 0) { clearInterval(adInt); document.getElementById('adCnf').style.display = 'inline-block'; } }, 1000);
}
function adDone() { document.getElementById('adM').style.display = 'none'; if (adCB) adCB(); adCB = null; }
function adClose() { document.getElementById('adM').style.display = 'none'; clearInterval(adInt); }

// ═══════════════════════════════════════
// SHOP
// ═══════════════════════════════════════
function buildShop() {
  const el = document.getElementById('shopItems'); el.innerHTML = '';
  CK.forEach(ck => {
    const c = CH[ck], owned = isOwned(ck);
    const d = document.createElement('div'); d.className = 'sitem';
    const cv = document.createElement('canvas'); cv.width = 50; cv.height = 68; d.appendChild(cv);
    const inf = document.createElement('div'); inf.className = 'sinfo';
    inf.innerHTML = `<div class="sname" style="color:${c.col}">${c.name}</div><div class="sdesc">${c.type} · ${c.sp}</div><div class="sdesc">PWR:${c.pw} SPD:${c.spd} DEF:${c.def}</div>`;
    d.appendChild(inf);
    if (owned) { const b = mkBtn('OWNED ✓', null, true); d.appendChild(b); }
    else {
      const b = mkBtn('🪙 ' + c.cost, () => { if (spendCoins(c.cost)) { SV.owned[ck] = true; lsSet(SV); buildShop(); } else alert('Not enough coins!\nPlay SURVIVAL to earn coins.'); });
      d.appendChild(b);
      const ab = mkBtn('📺 AD', () => showAd('WATCH AD', 'Watch a short ad to unlock ' + c.name + ' FREE!', () => { SV.owned[ck] = true; lsSet(SV); buildShop(); }));
      ab.classList.add('ad'); d.appendChild(ab);
    }
    el.appendChild(d);
    setTimeout(() => { const cx = cv.getContext('2d'); drawChar(cx, ck, 25, 68, 1, 'idle', 100, 0, .75); }, 40);
  });
}
function mkBtn(txt, fn, dis = false) { const b = document.createElement('button'); b.className = 'sbtn'; b.textContent = txt; b.disabled = dis; if (fn) b.onclick = fn; return b; }

// ═══════════════════════════════════════
// CHARACTER DRAWING — zero shadows, flat
// ═══════════════════════════════════════
function drawChar(ctx, key, cx, gy, facing, anim, hp, t, sc = 1) {
  const c = CH[key];
  const hurt = anim === 'hurt', blk = anim === 'block', pnch = anim === 'punch',
    kck = anim === 'kick', dead = anim === 'dead', walk = anim === 'walk';
  const dp = Math.max(0, hp / 100);
  const bob = (anim === 'idle' || walk) && !dead ? Math.sin(t * .1) * 1.8 : 0;
  ctx.save(); ctx.translate(cx, gy); ctx.scale(facing * sc, sc);
  ctx.globalAlpha = dp < .3 ? .72 : 1;
  const lA = walk ? Math.sin(t * .34) * .38 : kck ? .55 : 0;
  const rA = walk ? -Math.sin(t * .34) * .38 : 0;
  if (key === 'blaze') dBlaze(ctx, bob, hurt, blk, pnch, lA, rA, dead, c, t, dp);
  else if (key === 'storm') dStorm(ctx, bob, hurt, blk, pnch, lA, rA, dead, c, t, dp);
  else if (key === 'titan') dTitan(ctx, bob, hurt, blk, pnch, lA, rA, dead, c, t, dp);
  else dVoid(ctx, bob, hurt, blk, pnch, lA, rA, dead, c, t, dp);
  ctx.globalAlpha = 1; ctx.restore();
}

// Shared rounded-rect helper
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

function dBlaze(ctx, bob, hurt, blk, pnch, lA, rA, dead, c, t, dp) {
  const B = -84 + bob;
  // aura
  if (!dead) { ctx.globalAlpha *= .09 + Math.sin(t * .17) * .04; ctx.fillStyle = c.col; ctx.beginPath(); ctx.ellipse(0, B + 44, 28, 44, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = dp < .3 ? .72 : 1; }
  // legs
  ctx.save(); ctx.translate(-10, B + 47); ctx.rotate(lA); ctx.fillStyle = '#1e3a6a'; rr(ctx, -5, 0, 10, 23, 4); ctx.fill(); ctx.fillStyle = '#0f2040'; rr(ctx, -5, 20, 12, 7, 3); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(10, B + 47); ctx.rotate(rA); ctx.fillStyle = '#1e3a6a'; rr(ctx, -5, 0, 10, 23, 4); ctx.fill(); ctx.fillStyle = '#0f2040'; rr(ctx, -5, 20, 12, 7, 3); ctx.fill(); ctx.restore();
  // belt+torso
  ctx.fillStyle = '#7f1d1d'; rr(ctx, -13, B + 39, 26, 6, 3); ctx.fill();
  ctx.fillStyle = hurt ? '#ff9977' : dp < .35 ? '#8a2010' : '#c83020'; rr(ctx, -12, B + 15, 24, 26, 5); ctx.fill();
  // emblem
  ctx.fillStyle = c.col2; ctx.globalAlpha *= .68; ctx.beginPath(); ctx.moveTo(0, B + 17); ctx.bezierCurveTo(7, B + 24, 8, B + 33, 0, B + 35); ctx.bezierCurveTo(-8, B + 33, -7, B + 24, 0, B + 17); ctx.fill(); ctx.globalAlpha = dp < .3 ? .72 : 1;
  // arms
  ctx.save(); ctx.translate(-12, B + 17); if (blk) ctx.rotate(.52); ctx.fillStyle = '#b82818'; rr(ctx, -4, 0, 8, 18, 4); ctx.fill(); ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(-1, 20, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(12, B + 17); if (pnch) { ctx.translate(13, -4); ctx.rotate(-.28); } ctx.fillStyle = '#b82818'; rr(ctx, -4, 0, 8, 18, 4); ctx.fill(); ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(1, 20, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#b82818'; rr(ctx, -3, B + 9, 6, 7, 2); ctx.fill();
  // hair spikes
  ctx.fillStyle = c.col2;
  [[-7, 0, 0, -15], [-2, -1, 5, -18], [3, 0, 9, -13]].forEach(([x1, y1, x2, y2]) => { ctx.beginPath(); ctx.moveTo(x1, B + y1); ctx.lineTo(x2, B + y2); ctx.lineTo(x1 + 6, B + y1 + 2); ctx.fill(); });
  // face
  ctx.fillStyle = dead ? '#885533' : hurt ? '#e87060' : '#d97015'; ctx.beginPath(); ctx.arc(0, B + 4, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b85f10'; ctx.beginPath(); ctx.arc(0, B + 8, 8, 0, Math.PI); ctx.fill();
  if (dead) {
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-5, B + 1); ctx.lineTo(-2, B + 5); ctx.moveTo(-2, B + 1); ctx.lineTo(-5, B + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, B + 1); ctx.lineTo(5, B + 5); ctx.moveTo(5, B + 1); ctx.lineTo(2, B + 5); ctx.stroke();
  } else {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-4, B + 2, 3, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, B + 2, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hurt ? '#f00' : '#111'; ctx.beginPath(); ctx.arc(-4, B + 2, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(4, B + 2, 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  if (hurt) { ctx.beginPath(); ctx.arc(0, B + 9, 3, .3, Math.PI - .3, true); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0, B + 9, 3, .2, Math.PI - .2); ctx.stroke(); }
  // low-hp smoke
  if (dp < .38 && !dead) { ctx.fillStyle = '#666'; for (let i = 0; i < 3; i++) { ctx.globalAlpha = .2; ctx.beginPath(); ctx.arc(-6 + i * 6, B - 6 + Math.sin(t * .18 + i) * 5, 2.5, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = dp < .3 ? .72 : 1; }
}

function dStorm(ctx, bob, hurt, blk, pnch, lA, rA, dead, c, t, dp) {
  const B = -82 + bob;
  if (!dead) { ctx.globalAlpha *= .08; ctx.fillStyle = c.col; ctx.beginPath(); ctx.ellipse(0, B + 41, 24, 42, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = dp < .3 ? .72 : 1; }
  ctx.save(); ctx.translate(-9, B + 46); ctx.rotate(lA); ctx.fillStyle = '#1a2a60'; rr(ctx, -4, 0, 8, 22, 3); ctx.fill(); ctx.fillStyle = '#111840'; rr(ctx, -4, 19, 11, 6, 3); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(9, B + 46); ctx.rotate(rA); ctx.fillStyle = '#1a2a60'; rr(ctx, -4, 0, 8, 22, 3); ctx.fill(); ctx.fillStyle = '#111840'; rr(ctx, -4, 19, 11, 6, 3); ctx.fill(); ctx.restore();
  // scarf wave
  const sw = Math.sin(t * .19) * 4;
  ctx.fillStyle = '#6470c8'; rr(ctx, -11, B + 13, 22, 6, 3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-11, B + 17); ctx.quadraticCurveTo(-15, B + 25, 3 + sw, B + 29); ctx.lineTo(7 + sw, B + 24); ctx.quadraticCurveTo(-9, B + 21, -8, B + 17); ctx.fill();
  ctx.fillStyle = hurt ? '#8888ff' : dp < .35 ? '#1a1aaa' : '#2a2add'; rr(ctx, -11, B + 16, 22, 22, 4); ctx.fill();
  // lightning bolt
  ctx.fillStyle = c.col2; ctx.globalAlpha *= .82; ctx.beginPath(); ctx.moveTo(2, B + 18); ctx.lineTo(-3, B + 27); ctx.lineTo(1, B + 27); ctx.lineTo(-3, B + 35); ctx.lineTo(0, B + 31); ctx.lineTo(-4, B + 31); ctx.lineTo(2, B + 18); ctx.fill(); ctx.globalAlpha = dp < .3 ? .72 : 1;
  ctx.save(); ctx.translate(-11, B + 17); if (blk) ctx.rotate(.48); ctx.fillStyle = '#2a2add'; rr(ctx, -4, 0, 8, 17, 3); ctx.fill(); ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(-1, 19, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(11, B + 17); if (pnch) { ctx.translate(12, -3); ctx.rotate(-.22); } ctx.fillStyle = '#2a2add'; rr(ctx, -4, 0, 8, 17, 3); ctx.fill(); ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(1, 19, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#2a2add'; rr(ctx, -3, B + 10, 6, 6, 2); ctx.fill();
  ctx.fillStyle = '#bbc8f0';[[-7, 0, -1, -13], [-2, -1, 5, -16], [3, 0, 8, -11]].forEach(([x1, y1, x2, y2]) => { ctx.beginPath(); ctx.moveTo(x1, B + y1); ctx.lineTo(x2, B + y2); ctx.lineTo(x1 + 5, B + y1 + 1); ctx.fill(); });
  ctx.fillStyle = dead ? '#6677aa' : hurt ? '#8898cc' : '#99aadd'; ctx.beginPath(); ctx.ellipse(0, B + 4, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a55'; ctx.globalAlpha *= .48; ctx.beginPath(); ctx.ellipse(0, B + 9, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = dp < .3 ? .72 : 1;
  ctx.fillStyle = hurt ? '#f44' : c.col; ctx.beginPath(); ctx.ellipse(-4, B + 2, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, B + 2, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  if (dp < .38 && !dead) { for (let i = 0; i < 3; i++) { ctx.globalAlpha = .18; ctx.fillStyle = '#777'; ctx.beginPath(); ctx.arc(-6 + i * 6, B - 5 + Math.sin(t * .18 + i) * 5, 2.5, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = dp < .3 ? .72 : 1; }
}

function dTitan(ctx, bob, hurt, blk, pnch, lA, rA, dead, c, t, dp) {
  const B = -87 + bob;
  if (!dead) { ctx.globalAlpha *= .07; ctx.fillStyle = c.col; ctx.beginPath(); ctx.ellipse(0, B + 44, 30, 48, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = dp < .3 ? .72 : 1; }
  ctx.save(); ctx.translate(-13, B + 45); ctx.rotate(lA); ctx.fillStyle = '#1a3a0f'; rr(ctx, -6, 0, 12, 26, 4); ctx.fill(); ctx.fillStyle = '#0d2008'; rr(ctx, -7, 23, 15, 7, 3); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(13, B + 45); ctx.rotate(rA); ctx.fillStyle = '#1a3a0f'; rr(ctx, -6, 0, 12, 26, 4); ctx.fill(); ctx.fillStyle = '#0d2008'; rr(ctx, -7, 23, 15, 7, 3); ctx.fill(); ctx.restore();
  ctx.fillStyle = hurt ? '#88cc44' : dp < .35 ? '#1a4008' : '#2d6a10'; rr(ctx, -16, B + 13, 32, 29, 5); ctx.fill();
  ctx.strokeStyle = '#1a4008'; ctx.lineWidth = 1.5; ctx.globalAlpha *= .35;
  ctx.beginPath(); ctx.moveTo(-13, B + 17); ctx.lineTo(13, B + 17); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-13, B + 27); ctx.lineTo(13, B + 27); ctx.stroke(); ctx.globalAlpha = dp < .3 ? .72 : 1;
  ctx.fillStyle = c.col2; ctx.beginPath(); ctx.arc(0, B + 22, 5, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(-16, B + 15); if (blk) ctx.rotate(.38); ctx.fillStyle = '#2d6a10'; rr(ctx, -6, 0, 13, 21, 5); ctx.fill(); ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(-1, 24, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(16, B + 15); if (pnch) { ctx.translate(16, -5); ctx.rotate(-.38); } ctx.fillStyle = '#2d6a10'; rr(ctx, -6, 0, 13, 21, 5); ctx.fill(); ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(1, 24, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#2d6a10'; rr(ctx, -4, B + 8, 8, 6, 3); ctx.fill();
  ctx.fillStyle = dead ? '#224010' : '#3a8020'; rr(ctx, -12, B - 7, 24, 13, 4); ctx.fill();
  ctx.fillStyle = c.col2; ctx.globalAlpha *= .35; rr(ctx, -10, B - 5, 20, 9, 3); ctx.fill(); ctx.globalAlpha = dp < .3 ? .72 : 1;
  ctx.fillStyle = dead ? '#336620' : '#448a28'; rr(ctx, -11, B + 5, 22, 18, 4); ctx.fill();
  ctx.fillStyle = hurt ? '#ffff44' : c.col2; ctx.beginPath(); ctx.rect(-8, B + 8, 6, 4); ctx.fill(); ctx.beginPath(); ctx.rect(2, B + 8, 6, 4); ctx.fill();
  if (dp < .38 && !dead) { for (let i = 0; i < 3; i++) { ctx.globalAlpha = .22; ctx.fillStyle = '#777'; ctx.beginPath(); ctx.arc(-6 + i * 6, B - 12 + Math.sin(t * .18 + i) * 5, 2.5, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = dp < .3 ? .72 : 1; }
}

function dVoid(ctx, bob, hurt, blk, pnch, lA, rA, dead, c, t, dp) {
  const B = -82 + bob;
  const fl = dead ? 1 : .72 + Math.sin(t * .26) * .26;
  ctx.globalAlpha *= fl * .1; ctx.fillStyle = c.col; ctx.beginPath(); ctx.ellipse(0, B + 41, 24, 44, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = dp < .3 ? .72 : 1;
  // cloak
  ctx.fillStyle = '#2a003a'; const cw = Math.sin(t * .16) * 5;
  ctx.beginPath(); ctx.moveTo(-14, B + 39); ctx.lineTo(-14, B + 68); ctx.lineTo(-5 + cw, B + 74); ctx.lineTo(0, B + 68); ctx.lineTo(5 - cw, B + 74); ctx.lineTo(14, B + 68); ctx.lineTo(14, B + 39); ctx.fill();
  ctx.save(); ctx.translate(-7, B + 44); ctx.rotate(lA); ctx.fillStyle = '#180020'; rr(ctx, -3, 0, 6, 20, 3); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(7, B + 44); ctx.rotate(rA); ctx.fillStyle = '#180020'; rr(ctx, -3, 0, 6, 20, 3); ctx.fill(); ctx.restore();
  ctx.fillStyle = hurt ? '#dd66ee' : dp < .35 ? '#3a0050' : '#5a0072'; rr(ctx, -13, B + 13, 26, 27, 5); ctx.fill();
  ctx.strokeStyle = '#9333ea'; ctx.lineWidth = 1.4; rr(ctx, -13, B + 13, 26, 27, 5); ctx.stroke();
  ctx.fillStyle = c.col; ctx.globalAlpha *= (.48 + Math.sin(t * .21) * .32) * fl; ctx.beginPath(); ctx.arc(0, B + 27, 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = dp < .3 ? .72 : 1;
  ctx.save(); ctx.translate(-13, B + 16); if (blk) ctx.rotate(.48); ctx.fillStyle = '#5a0072'; rr(ctx, -4, 0, 7, 16, 3); ctx.fill(); ctx.fillStyle = c.col; ctx.globalAlpha *= .78; ctx.beginPath(); ctx.arc(-1, 19, 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = dp < .3 ? .72 : 1; ctx.restore();
  ctx.save(); ctx.translate(13, B + 16); if (pnch) { ctx.translate(12, -3); ctx.rotate(-.26); } ctx.fillStyle = '#5a0072'; rr(ctx, -3, 0, 7, 16, 3); ctx.fill(); ctx.fillStyle = c.col; ctx.globalAlpha *= .78; ctx.beginPath(); ctx.arc(1, 19, 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = dp < .3 ? .72 : 1; ctx.restore();
  // floating head
  const hf = Math.sin(t * .13) * 2.5;
  const hY = B + 4 + hf;
  ctx.fillStyle = '#280035'; ctx.beginPath(); ctx.arc(0, hY - 1, 12, Math.PI, 0); ctx.lineTo(12, hY + 9); ctx.lineTo(-12, hY + 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dead ? '#3a2244' : '#2e0040'; ctx.beginPath(); ctx.ellipse(0, hY + 2, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hurt ? '#ff88ff' : c.col; ctx.beginPath(); ctx.ellipse(-4, hY - 1, 3, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, hY - 1, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  if (!dead) { ctx.strokeStyle = '#c026d3'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, hY + 7, 3.5, .3, Math.PI - .3); ctx.stroke(); }
  if (dp < .38 && !dead) { for (let i = 0; i < 3; i++) { ctx.globalAlpha = .18; ctx.fillStyle = '#777'; ctx.beginPath(); ctx.arc(-6 + i * 6, B - 7 + Math.sin(t * .18 + i) * 5, 2.5, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = dp < .3 ? .72 : 1; }
}

// ═══════════════════════════════════════
// MENU ANIMATION
// ═══════════════════════════════════════
let mRaf = null, mT = 0;
function startMenu() {
  if (mRaf) return;
  const row = document.getElementById('mcRow'); row.innerHTML = '';
  CK.forEach(ck => {
    const c = CH[ck];
    const w = document.createElement('div'); w.className = 'mcw';
    const cv = document.createElement('canvas'); cv.width = 54; cv.height = 78; cv.id = 'mc_' + ck;
    const nm = document.createElement('div'); nm.className = 'mcn'; nm.style.color = c.col; nm.textContent = c.name;
    if (!isOwned(ck)) { const lk = document.createElement('div'); lk.style.cssText = 'font-size:8px;color:#555;'; lk.textContent = '🔒'; w.appendChild(cv); w.appendChild(nm); w.appendChild(lk); }
    else { w.appendChild(cv); w.appendChild(nm); }
    row.appendChild(w);
  });
  mRaf = requestAnimationFrame(mLoop);
}
function stopMenu() { if (mRaf) { cancelAnimationFrame(mRaf); mRaf = null; } }

// cache menu bg canvas to avoid resize every frame
let mCvsCached = null, mCtx = null;
function mLoop() {
  mT++;
  const el = document.getElementById('s-title');
  const mc = document.getElementById('mCvs');
  if (el && el.offsetWidth > 0 && !mCvsCached) {
    mc.width = el.offsetWidth; mc.height = el.offsetHeight;
    mCtx = mc.getContext('2d'); mCvsCached = true;
  }
  if (mCtx) {
    mCtx.clearRect(0, 0, mc.width, mc.height);
    const cols = ['#f97316', '#60a5fa', '#22c55e', '#e879f9', '#ffd700'];
    for (let i = 0; i < 18; i++) {
      const x = (Math.sin(mT * .007 + i * 2.6) * .5 + .5) * mc.width;
      const y = (mT * .28 + i * (mc.height / 18)) % mc.height;
      mCtx.globalAlpha = .09 + Math.sin(mT * .055 + i) * .06;
      mCtx.fillStyle = cols[i % 5];
      mCtx.beginPath(); mCtx.arc(x, y, 1.4 + Math.sin(i + mT * .04) * .7, 0, Math.PI * 2); mCtx.fill();
    }
    mCtx.globalAlpha = 1;
  }
  CK.forEach((ck, i) => {
    const cv = document.getElementById('mc_' + ck); if (!cv) return;
    const cx = cv.getContext('2d'); cx.clearRect(0, 0, cv.width, cv.height);
    if (!isOwned(ck)) cx.globalAlpha = .3;
    drawChar(cx, ck, 27, cv.height, 1, 'idle', 100, mT + i * 16, .8);
    cx.globalAlpha = 1;
  });
  mRaf = requestAnimationFrame(mLoop);
}

// ═══════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════
let AC = null;
function gAC() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } return AC; }
function sfx(t) {
  try {
    const ac = gAC(); if (!ac) return;
    const now = ac.currentTime, g = ac.createGain(); g.connect(ac.destination);
    if (t === 'punch') { const o = ac.createOscillator(); o.connect(g); o.frequency.setValueAtTime(180, now); o.frequency.exponentialRampToValueAtTime(50, now + .07); g.gain.setValueAtTime(.32, now); g.gain.exponentialRampToValueAtTime(.001, now + .08); o.start(now); o.stop(now + .09); }
    else if (t === 'kick') { const o = ac.createOscillator(); o.connect(g); o.frequency.setValueAtTime(220, now); o.frequency.exponentialRampToValueAtTime(36, now + .11); g.gain.setValueAtTime(.48, now); g.gain.exponentialRampToValueAtTime(.001, now + .13); o.start(now); o.stop(now + .14); }
    else if (t === 'block') { const o = ac.createOscillator(); o.connect(g); o.type = 'square'; o.frequency.setValueAtTime(580, now); o.frequency.exponentialRampToValueAtTime(260, now + .05); g.gain.setValueAtTime(.14, now); g.gain.exponentialRampToValueAtTime(.001, now + .06); o.start(now); o.stop(now + .07); }
    else if (t === 'special') { [90, 150, 240].forEach((f, i) => { const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth'; o.connect(og); og.connect(ac.destination); o.frequency.setValueAtTime(f * 2, now + i * .045); o.frequency.exponentialRampToValueAtTime(f, now + i * .045 + .18); og.gain.setValueAtTime(.18, now + i * .045); og.gain.exponentialRampToValueAtTime(.001, now + i * .045 + .22); o.start(now + i * .045); o.stop(now + i * .045 + .23); }); }
    else if (t === 'ko') { [200, 130, 80, 50].forEach((f, i) => { const o = ac.createOscillator(), og = ac.createGain(); o.connect(og); og.connect(ac.destination); og.gain.setValueAtTime(.38, now + i * .065); og.gain.exponentialRampToValueAtTime(.001, now + i * .065 + .26); o.frequency.value = f; o.start(now + i * .065); o.stop(now + i * .065 + .27); }); }
    else if (t === 'jump') { const o = ac.createOscillator(); o.connect(g); o.type = 'sine'; o.frequency.setValueAtTime(260, now); o.frequency.exponentialRampToValueAtTime(580, now + .09); g.gain.setValueAtTime(.07, now); g.gain.exponentialRampToValueAtTime(.001, now + .11); o.start(now); o.stop(now + .12); }
    else if (t === 'coin') { const o = ac.createOscillator(); o.connect(g); o.frequency.setValueAtTime(880, now); o.frequency.setValueAtTime(1320, now + .05); g.gain.setValueAtTime(.1, now); g.gain.exponentialRampToValueAtTime(.001, now + .14); o.start(now); o.stop(now + .15); }
  } catch (e) { }
}
let bgOn = false, bgDng = false, bgTO = null, bgS = 0;
const MEL = [0, 2, 4, 5, 4, 2, 0, 7, 0, 2, 4, 5, 7, 5, 4, 2], BASS = [0, 0, 4, 4, 5, 5, 2, 2], FRQ = [130.8, 146.8, 164.8, 174.6, 196, 220, 246.9, 261.6];
function bgStart() { if (bgOn) return; bgOn = true; _bg(); }
function bgStop() { bgOn = false; clearTimeout(bgTO); }
function _bg() {
  if (!bgOn) return;
  try {
    const ac = gAC(); if (!ac) return; const now = ac.currentTime, tp = bgDng ? .09 : .15;
    const mn = FRQ[MEL[bgS % MEL.length]] * (bgDng ? 2 : 1);
    const mo = ac.createOscillator(), mg = ac.createGain(); mo.type = 'square'; mo.frequency.value = mn;
    mg.gain.setValueAtTime(0, now); mg.gain.linearRampToValueAtTime(.03, now + .01); mg.gain.exponentialRampToValueAtTime(.001, now + tp * .65);
    mo.connect(mg); mg.connect(ac.destination); mo.start(now); mo.stop(now + tp);
    if (bgS % 2 === 0) { const bn = FRQ[BASS[Math.floor(bgS / 2) % BASS.length]] * .5; const bo = ac.createOscillator(), bg2 = ac.createGain(); bo.type = 'sawtooth'; bo.frequency.value = bn; bg2.gain.setValueAtTime(.022, now); bg2.gain.exponentialRampToValueAtTime(.001, now + tp * 1.25); bo.connect(bg2); bg2.connect(ac.destination); bo.start(now); bo.stop(now + tp * 1.3); }
    bgS++; bgTO = setTimeout(_bg, tp * 1000);
  } catch (e) { }
}

// ═══════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════
let gMode = 'bot', diff = 'normal', gOver = false, hitstop = 0;
let timerVal = 60, timerInt = null, rafId = null, tick = 0;
let parts = [], kParts = [];
let AW = 360, AH = 180;
let cv, ctx, koCtx;
let bgStars = [], bgBuilds = [], bgCrowd = [];
let round = 1, p1W = 0, p2W = 0;
let svWave = 1, svScore = 0, svBest = 0, svEarned = 0;
let botTick = 0, combo = [0, 0], lastHit = [0, 0];
let projs = [];
const FL = 44, FW = 50, FH = 86;

const S = {
  1: { x: 80, y: 0, vy: 0, hp: 100, bl: false, stun: 0, air: false, sp: 0, spR: false, facing: 1, anim: 'idle', aT: 0, char: 'blaze' },
  2: { x: 260, y: 0, vy: 0, hp: 100, bl: false, stun: 0, air: false, sp: 0, spR: false, facing: -1, anim: 'idle', aT: 0, char: 'storm' }
};

function getCfg() {
  const base = DIFFS[diff] || DIFFS.normal;
  return gMode === 'survival' ? SV_SCALE(svWave, base) : base;
}

// ═══════════════════════════════════════
// SCREEN NAV
// ═══════════════════════════════════════
function show(id) {
  document.querySelectorAll('.scr').forEach(s => s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  if (id === 's-title') { mCvsCached = false; startMenu(); uCoinUI(); }
  else stopMenu();
  if (id === 's-shop') { buildShop(); uCoinUI(); }
}

// ═══════════════════════════════════════
// MODE + CHAR SELECT
// ═══════════════════════════════════════
let p1sel = 'blaze', p2sel = 'storm', selP = 1;

function startMode(m) {
  gMode = m;
  const isBot = m !== 'vs';
  document.getElementById('dstrip').style.display = isBot ? 'flex' : 'none';
  selP = 1; p1sel = 'blaze'; p2sel = 'storm';
  buildChars(); show('s-charsel');
}

function buildChars() {
  const el = document.getElementById('charGrid'); el.innerHTML = '';
  CK.forEach(ck => {
    const c = CH[ck], owned = isOwned(ck);
    const d = document.createElement('div'); d.className = 'ccard'; d.id = 'cc_' + ck; d.onclick = () => selChar(ck);
    const cv2 = document.createElement('canvas'); cv2.width = 46; cv2.height = 62;
    const nm = document.createElement('div'); nm.className = 'cn'; nm.style.color = c.col; nm.textContent = c.name;
    const tp = document.createElement('div'); tp.className = 'ct'; tp.textContent = c.type;
    const sb = document.createElement('div'); sb.className = 'sbars';
    ['pw', 'spd', 'def'].forEach(k => { sb.innerHTML += `<div class="srow"><div class="slbl">${k}</div><div class="sbg"><div class="sf" style="width:${(c[k] || 5) * 10}%;background:${c.col}"></div></div></div>`; });
    d.appendChild(cv2); d.appendChild(nm); d.appendChild(tp); d.appendChild(sb);
    if (!owned) {
      const ov = document.createElement('div'); ov.className = 'lkov';
      ov.innerHTML = `<div class="lki">🔒</div><div class="lkc">🪙 ${c.cost}</div><div class="lka">or 📺 AD</div>`;
      ov.onclick = e => { e.stopPropagation(); tryUnlock(ck); }; d.appendChild(ov);
    }
    el.appendChild(d);
    setTimeout(() => { const cx2 = cv2.getContext('2d'); drawChar(cx2, ck, 23, 62, 1, 'idle', 100, 0, .76); }, 40);
  });
  hlSel();
}

function selChar(ck) {
  if (!isOwned(ck)) { tryUnlock(ck); return; }
  if (gMode === 'vs') { if (selP === 1) { p1sel = ck; selP = 2; } else { p2sel = ck; selP = 1; } }
  else p1sel = ck;
  hlSel();
}
function hlSel() {
  CK.forEach(k => {
    const e = document.getElementById('cc_' + k); if (!e) return;
    e.classList.remove('sel');
    if (gMode === 'vs') { if (k === p1sel || k === p2sel) e.classList.add('sel'); }
    else if (k === p1sel) e.classList.add('sel');
  });
}
function tryUnlock(ck) {
  const c = CH[ck];
  if (SV.coins >= c.cost) {
    if (confirm('Unlock ' + c.name + ' for 🪙' + c.cost + '?')) { spendCoins(c.cost); SV.owned[ck] = true; lsSet(SV); buildChars(); }
  } else {
    showAd('WATCH AD', 'Watch a short ad to unlock ' + c.name + ' FREE!', () => { SV.owned[ck] = true; lsSet(SV); buildChars(); });
  }
}
function setDiff(d, btn) { diff = d; document.querySelectorAll('.dbtn').forEach(b => b.classList.remove('on')); btn.classList.add('on'); }

// ═══════════════════════════════════════
// LAUNCH
// ═══════════════════════════════════════
function launchGame() {
  show('s-game'); setupCanvas();
  if (gMode === 'survival') { svWave = 1; svScore = 0; svEarned = 0; }
  S[1].char = p1sel;
  if (gMode !== 'vs') { const opts = CK.filter(k => k !== p1sel); p2sel = opts[0 | Math.random() * opts.length]; }
  S[2].char = p2sel;
  const bot = gMode !== 'vs';
  document.getElementById('p1n').textContent = CH[p1sel].name;
  document.getElementById('p1n').style.color = CH[p1sel].col;
  document.getElementById('p2n').textContent = bot ? 'BOT' : CH[p2sel].name;
  document.getElementById('p2n').style.color = bot ? '#aaa' : CH[p2sel].col;
  document.querySelectorAll('[data-p="2"]').forEach(b => b.style.opacity = bot ? '.3' : '1');
  document.getElementById('svh').style.display = gMode === 'survival' ? 'flex' : 'none';
  mkPips(1); mkPips(2); mkStars(); p1W = 0; p2W = 0; round = 1;
  bgStart(); startRound();
}

function setupCanvas() {
  const wrap = document.getElementById('aw');
  cv = document.getElementById('gc');
  AW = wrap.offsetWidth || 360; AH = Math.round(AW * .34);
  cv.width = AW; cv.height = AH; cv.style.height = AH + 'px';
  ctx = cv.getContext('2d');
  const kc = document.getElementById('kc'); kc.width = AW; kc.height = AH; koCtx = kc.getContext('2d');
  bgStars = []; for (let i = 0; i < 35; i++)bgStars.push({ x: Math.random() * AW, y: Math.random() * AH * .5, r: .3 + Math.random() * 1.1, tw: Math.random() * Math.PI * 2 });
  bgBuilds = []; for (let i = 0; i < 9; i++)bgBuilds.push({ x: i * (AW / 8) - 8, w: AW / 9 + 10, h: 38 + Math.random() * 65, ws: Array.from({ length: 8 }, () => ({ on: Math.random() > .45 })) });
  bgCrowd = []; for (let i = 0; i < 28; i++)bgCrowd.push({ x: i * (AW / 27), ph: Math.random() * Math.PI * 2, col: `hsl(${Math.random() * 360},60%,55%)` });
  S[2].x = AW - 90 - FW;
}

function mkPips(p) { const el = document.getElementById('pips' + p); el.innerHTML = ''; for (let i = 0; i < 5; i++) { const d = document.createElement('div'); d.className = 'pip'; d.id = 'p' + p + 'p' + i; el.appendChild(d); } }
function rfPips(p) { const f = Math.floor(S[p].sp / 20); for (let i = 0; i < 5; i++)document.getElementById('p' + p + 'p' + i)?.classList.toggle('on', i < f); }
function mkStars() { ['p1stars', 'p2stars'].forEach((id, pi) => { const el = document.getElementById(id); el.innerHTML = ''; for (let i = 0; i < 2; i++) { const s = document.createElement('div'); s.className = 'rstar'; s.id = (pi ? 'p2' : 'p1') + 's' + i; el.appendChild(s); } }); }
function rfStars() { for (let i = 0; i < 2; i++) { document.getElementById('p1s' + i)?.classList.toggle('on', i < p1W); document.getElementById('p2s' + i)?.classList.toggle('on', i < p2W); } }

// ═══════════════════════════════════════
// ROUND
// ═══════════════════════════════════════
function startRound() {
  gOver = false; parts = []; projs = []; combo = [0, 0]; lastHit = [0, 0]; botTick = 0; hitstop = 0; tick = 0;
  Object.assign(S[1], { x: 80, y: 0, vy: 0, hp: 100, bl: false, stun: 0, air: false, sp: 0, spR: false, facing: 1, anim: 'idle', aT: 0 });
  Object.assign(S[2], { x: AW - 90 - FW, y: 0, vy: 0, hp: 100, bl: false, stun: 0, air: false, sp: 0, spR: false, facing: -1, anim: 'idle', aT: 0 });
  // timer shrinks each survival wave (min 25s)
  timerVal = gMode === 'survival' ? Math.max(25, 55 - svWave * 2) : 60;
  document.getElementById('timer').textContent = timerVal;
  document.getElementById('timer').style.color = 'var(--gold)';
  document.getElementById('rBtn').style.display = 'none';
  document.getElementById('mBtn').style.display = 'none';
  document.getElementById('kl').style.display = 'none';
  document.getElementById('rlbl').textContent = gMode === 'survival' ? 'WAVE ' + svWave : 'RND ' + round;
  document.getElementById('wbadge').textContent = gMode === 'survival' ? 'LVL ' + Math.min(svWave, 20) : '';
  kParts = []; uHP(); rfPips(1); rfPips(2); rfStars(); bgDng = false; uSVhud();
  // Round announce
  const rl = document.getElementById('rl'), rt = document.getElementById('rt');
  rl.style.display = 'flex'; rt.textContent = gMode === 'survival' ? 'WAVE ' + svWave : 'ROUND ' + round;
  rt.style.animation = 'none'; void rt.offsetWidth; rt.style.animation = 'rPop .48s cubic-bezier(.3,1.8,.5,1) both';
  setTimeout(() => { rl.style.display = 'none'; showMsg('FIGHT!', 950); }, 1350);
  if (timerInt) clearInterval(timerInt); timerInt = setInterval(t1s, 1000);
  if (rafId) cancelAnimationFrame(rafId); gameLoop();
}

function t1s() {
  if (gOver) return; timerVal--;
  document.getElementById('timer').textContent = timerVal;
  if (timerVal <= 10) document.getElementById('timer').style.color = '#f87171';
  const dng = S[1].hp < 35 || S[2].hp < 35;
  if (dng && !bgDng) { bgDng = true; bgStop(); bgStart(); }
  else if (!dng && bgDng) { bgDng = false; bgStop(); bgStart(); }
  if (timerVal <= 0) endRound('time');
}
function uSVhud() {
  if (gMode !== 'survival') return;
  document.getElementById('svW').textContent = svWave;
  document.getElementById('svS').textContent = svScore;
  document.getElementById('svB').textContent = svBest;
  document.getElementById('svC').textContent = '+' + svEarned;
}

// ═══════════════════════════════════════
// GAME LOOP
// ═══════════════════════════════════════
function gameLoop() {
  if (hitstop > 0) { hitstop--; draw(); rafId = requestAnimationFrame(gameLoop); return; }
  tick++;
  physics();
  if (gMode !== 'vs') botAI();
  updProjs(); draw();
  if (!gOver) rafId = requestAnimationFrame(gameLoop);
}

function physics() {
  [1, 2].forEach(p => {
    const s = S[p];
    if (s.air) { s.y += s.vy; s.vy -= 1.1; if (s.y <= 0) { s.y = 0; s.air = false; s.vy = 0; s.anim = 'idle'; } }
    s.x = Math.max(0, Math.min(AW - FW, s.x));
    if (!gOver && s.sp < 100) { s.sp = Math.min(100, s.sp + .06); rfPips(p); }
    s.spR = s.sp >= 100;
    if (s.stun > 0) s.stun--;
    if (s.aT > 0) { s.aT--; if (s.aT === 0 && s.anim !== 'dead') s.anim = 'idle'; }
    const o = p === 1 ? 2 : 1; if (!s.bl && s.anim === 'idle') s.facing = S[o].x > s.x ? 1 : -1;
  });
}

// ═══════════════════════════════════════
// BOT AI
// ═══════════════════════════════════════
function botAI() {
  const cfg = getCfg(); botTick++; if (botTick < cfg.react) return; botTick = 0;
  const b = S[2], pl = S[1]; if (b.stun > 0) return;
  const d = Math.abs(b.x - pl.x), r = Math.random;
  b.bl = false;
  if (d < 95 && r() < cfg.blk) { b.bl = true; return; }
  if (b.spR && d < 180 && r() < cfg.sp * 8) { act(2, 'special'); return; }
  if (d < 78 && r() < cfg.aggr) { act(2, r() < .5 ? 'punch' : 'kick'); return; }
  if (d < 108 && r() < cfg.aggr * .58) { act(2, 'kick'); return; }
  if (!b.air && r() < .04 + svWave * .002) { act(2, 'jump'); return; }
  if (d > 112) act(2, b.x > pl.x ? 'left' : 'right');
  else if (d < 36 && r() < .32) act(2, b.x > pl.x ? 'right' : 'left');
  else if (r() < cfg.aggr * .38) act(2, b.x > pl.x ? 'left' : 'right');
  // combo based on difficulty
  if (cfg.combo && d < 80 && r() < .36) {
    setTimeout(() => { if (!gOver) act(2, 'punch'); }, 48);
    setTimeout(() => { if (!gOver) act(2, 'kick'); }, 150);
  }
  // insane difficulty: triple combo
  if (diff === 'insane' && d < 80 && r() < .25) {
    setTimeout(() => { if (!gOver) act(2, 'punch'); }, 45);
    setTimeout(() => { if (!gOver) act(2, 'kick'); }, 135);
    setTimeout(() => { if (!gOver) act(2, 'punch'); }, 230);
  }
}

// ═══════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════
function act(p, a) {
  if (gOver || hitstop > 0) return;
  const s = S[p], o = p === 1 ? 2 : 1, os = S[o];
  const spd = Math.max(9, CH[s.char].spd * 1.8);
  if (a === 'left' || a === 'right') { if (s.stun > 0) return; s.bl = false; s.x += a === 'left' ? -spd : spd; s.anim = 'walk'; return; }
  if (a === 'jump') { if (s.air || s.stun > 0) return; s.bl = false; s.air = true; s.vy = 14; s.anim = 'jump'; sfx('jump'); return; }
  if (a === 'block') { if (s.stun > 0) return; s.bl = !s.bl; return; }
  if (s.stun > 0) return; s.bl = false;
  const d = Math.abs(s.x - os.x), fr = s.x < os.x;
  if (a === 'punch') {
    s.anim = 'punch'; s.aT = 8;
    if (d < 88) { const dmg = os.bl ? 3 : Math.round(CH[s.char].pw * 1.5 + Math.random() * 4); doHit(p, o, dmg, os.bl, 'punch', fr); sfx(os.bl ? 'block' : 'punch'); }
  } else if (a === 'kick') {
    s.anim = 'kick'; s.aT = 12;
    if (d < 105) { const dmg = os.bl ? 5 : Math.round(CH[s.char].pw * 2.1 + Math.random() * 5); doHit(p, o, dmg, os.bl, 'kick', fr); sfx(os.bl ? 'block' : 'kick'); }
  } else if (a === 'special') {
    if (!s.spR) return; s.sp = 0; rfPips(p); s.anim = 'punch'; s.aT = 14;
    const ck = s.char;
    if (ck === 'blaze') projs.push({ x: s.x + (fr ? FW : 0), y: s.y + FH * .38, vx: fr ? 10 : -10, own: p, type: 'fire', life: 48, col: CH[ck].col, col2: CH[ck].col2 });
    else if (ck === 'storm') { s.x = os.x + (fr ? -FW - 10 : FW + 10); s.x = Math.max(0, Math.min(AW - FW, s.x)); if (d < 200) doHit(p, o, os.bl ? 8 : 28, os.bl, 'special', s.x < os.x); }
    else if (ck === 'titan') { projs.push({ x: s.x + FW / 2, y: AH - FL - 10, vx: fr ? 7 : -7, own: p, type: 'quake', life: 36, col: CH[ck].col, col2: CH[ck].col2 }); if (d < 148) doHit(p, o, os.bl ? 10 : 36, os.bl, 'special', fr); }
    else projs.push({ x: s.x + (fr ? FW : 0), y: s.y + FH * .33, vx: fr ? 14 : -14, own: p, type: 'beam', life: 25, col: CH[ck].col, col2: CH[ck].col2 });
    spawnBurst(s.x + FW / 2, AH - FL - s.y - FH / 2, CH[ck].col, CH[ck].col2);
    showMsg(CH[ck].sp, 750); sfx('special');
  }
}

function doHit(att, def, dmg, blocked, type, fr) {
  const os = S[def], s = S[att];
  os.hp = Math.max(0, os.hp - dmg);
  if (!blocked) { os.stun = type === 'special' ? 20 : type === 'kick' ? 7 : 4; os.anim = 'hurt'; os.aT = type === 'special' ? 16 : 7; }
  if (!blocked) { os.x += (fr ? 19 : -19) * (type === 'special' ? 2 : type === 'kick' ? 1.4 : 1); os.x = Math.max(0, Math.min(AW - FW, os.x)); }
  s.sp = Math.min(100, s.sp + (type === 'kick' ? 8 : type === 'punch' ? 5 : 0)); os.sp = Math.min(100, os.sp + 3);
  hitstop = type === 'special' ? 7 : type === 'kick' ? 3 : 2;
  const now = Date.now();
  if (now - lastHit[att - 1] < 1050) combo[att - 1]++; else combo[att - 1] = 1; lastHit[att - 1] = now;
  if (combo[att - 1] >= 3) fxTxt(s.x + FW / 2, AH - FL - S[att].y - FH - 3, combo[att - 1] + 'x COMBO!', 'var(--gold)', 18);
  hitFX(os.x + FW / 2, AH - FL - os.y - FH * .4, dmg, type, blocked, att);
  shakeWrap(type); uHP();
  if (S[1].hp < 35 || S[2].hp < 35) { if (!bgDng) { bgDng = true; bgStop(); bgStart(); } }
  checkKO(def);
}

function updProjs() {
  for (let i = projs.length - 1; i >= 0; i--) {
    const pr = projs[i]; pr.x += pr.vx; pr.life--;
    const opp = pr.own === 1 ? 2 : 1, os = S[opp];
    if (Math.abs(pr.x - os.x - FW / 2) < 40 && pr.life > 0) { doHit(pr.own, opp, os.bl ? 6 : pr.type === 'beam' ? 24 : pr.type === 'fire' ? 20 : 26, os.bl, 'special', pr.vx > 0); projs.splice(i, 1); continue; }
    if (pr.life <= 0 || pr.x < -20 || pr.x > AW + 20) projs.splice(i, 1);
  }
}

// ═══════════════════════════════════════
// DRAW — heavily optimized
// ═══════════════════════════════════════
function draw() {
  ctx.clearRect(0, 0, AW, AH);
  drawBG(); drawProjs(); drawFighters(); drawParts(); drawKOConf();
}

function drawBG() {
  // Reuse gradient object — don't recreate every frame
  if (!drawBG._sk || drawBG._h !== AH) {
    drawBG._sk = ctx.createLinearGradient(0, 0, 0, AH);
    drawBG._sk.addColorStop(0, '#080518'); drawBG._sk.addColorStop(.55, '#0f1640'); drawBG._sk.addColorStop(1, '#180828');
    drawBG._h = AH;
  }
  ctx.fillStyle = drawBG._sk; ctx.fillRect(0, 0, AW, AH);
  // Stars
  bgStars.forEach(s => { s.tw += .02; ctx.globalAlpha = .16 + .28 * Math.sin(s.tw); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
  // Buildings
  const bB = AH - FL - 13;
  bgBuilds.forEach(b => {
    ctx.fillStyle = '#080514'; ctx.fillRect(b.x, bB - b.h, b.w, b.h);
    b.ws.forEach((w, wi) => {
      if (w.on && Math.random() < .002) w.on = false; if (!w.on && Math.random() < .0005) w.on = true;
      ctx.fillStyle = w.on ? 'rgba(255,210,80,.42)' : 'rgba(8,8,28,.7)';
      ctx.fillRect(b.x + (wi % 4) * 9 + 3, bB - b.h + (wi >> 2) * 13 + 4, 7, 4);
    });
  });
  // Crowd
  bgCrowd.forEach(c => { ctx.globalAlpha = .28; ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(c.x, AH - FL - 4 + Math.sin(c.ph + tick * .065) * 3, 3, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
  // Floor
  ctx.fillStyle = '#14142e'; ctx.fillRect(0, AH - FL, AW, FL);
  ctx.strokeStyle = CH[S[1].char].col + '44'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, AH - FL); ctx.lineTo(AW / 2 - 8, AH - FL); ctx.stroke();
  ctx.strokeStyle = CH[S[2].char].col + '44';
  ctx.beginPath(); ctx.moveTo(AW / 2 + 8, AH - FL); ctx.lineTo(AW, AH - FL); ctx.stroke();
  // tile lines
  ctx.strokeStyle = 'rgba(255,255,255,.025)'; ctx.lineWidth = 1;
  for (let i = 0; i < AW; i += 40) { ctx.beginPath(); ctx.moveTo(i, AH - FL); ctx.lineTo(i, AH); ctx.stroke(); }
}

function drawFighters() {
  [1, 2].forEach(p => {
    const s = S[p], gY = AH - FL - s.y;
    // shadow
    ctx.globalAlpha = .12; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(s.x + FW / 2, AH - FL + 3, FW * .42, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    // block shield
    if (s.bl) { ctx.globalAlpha = .24 + Math.sin(tick * .16) * .1; ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s.x + FW / 2, gY - FH * .44, FW * .52, FH * .44, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    drawChar(ctx, s.char, s.x + FW / 2, gY, s.facing, s.anim, s.hp, tick);
  });
}

function drawProjs() {
  projs.forEach(pr => {
    ctx.save(); ctx.globalAlpha = Math.min(1, pr.life / 15);
    if (pr.type === 'fire') { ctx.fillStyle = pr.col2; ctx.beginPath(); ctx.arc(pr.x, pr.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = pr.col; ctx.beginPath(); ctx.arc(pr.x + (pr.vx < 0 ? 7 : -7), pr.y, 6, 0, Math.PI * 2); ctx.fill(); }
    else if (pr.type === 'beam') { ctx.fillStyle = pr.col; ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 12, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.strokeStyle = pr.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pr.x, pr.y, 10, Math.PI, 0); ctx.stroke(); }
    ctx.restore();
  });
}

function drawParts() {
  parts = parts.filter(p => p.life > 0);
  // batch by color group to reduce state changes
  parts.forEach(p => {
    if (p.t === 'dot') { p.x += p.vx; p.y += p.vy; p.vy += .3; p.life -= p.d; ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.1, p.r * p.life), 0, Math.PI * 2); ctx.fill(); }
    else { p.r += (p.mR - p.r) * .15; p.life -= p.d; ctx.globalAlpha = Math.max(0, p.life * .78); ctx.strokeStyle = p.c; ctx.lineWidth = Math.max(.1, p.life * 3); ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.1, p.r), 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  });
}

function drawKOConf() {
  if (!kParts.length) return;
  koCtx.clearRect(0, 0, AW, AH);
  kParts = kParts.filter(p => p.life > .01);
  kParts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .2; p.life -= .009; koCtx.globalAlpha = Math.max(0, p.life); koCtx.fillStyle = p.c; koCtx.beginPath(); koCtx.arc(p.x, p.y, Math.max(.1, p.r), 0, Math.PI * 2); koCtx.fill(); });
  koCtx.globalAlpha = 1;
}

// ═══════════════════════════════════════
// HP BARS
// ═══════════════════════════════════════
let dmgTO = [null, null];
function uHP() {
  [1, 2].forEach(p => {
    const pct = Math.max(0, S[p].hp);
    const f = document.getElementById('hp' + p + 'f'), d = document.getElementById('hp' + p + 'd');
    if (!f) return;
    f.style.width = pct + '%'; f.style.background = pct > 50 ? '#4ade80' : pct > 25 ? '#facc15' : '#f87171';
    if (dmgTO[p - 1]) clearTimeout(dmgTO[p - 1]);
    dmgTO[p - 1] = setTimeout(() => { if (d) d.style.width = pct + '%'; }, 420);
  });
}

// ═══════════════════════════════════════
// HIT FX — reduced particle counts for mobile
// ═══════════════════════════════════════
const PW = ['POW!', 'BAM!', 'HIT!'], KW = ['WHAM!', 'CRACK!', 'THUD!'], SW = ['CRITICAL!', 'OBLITERATE!'];
function hitFX(cx, cy, dmg, type, blocked, att) {
  const col = CH[S[att].char].col, col2 = CH[S[att].char].col2;
  fxTxt(cx, cy - 9, '-' + dmg, blocked ? '#60a5fa' : col, 21);
  const w = (blocked ? ['BLOCKED!'] : type === 'special' ? SW : type === 'kick' ? KW : PW)[0 | Math.random() * 3];
  fxTxt(cx + 14, cy - 33, w, blocked ? '#93c5fd' : col2, 16);
  if (!blocked) {
    if (type !== 'punch') showImpact(w, col);
    // REDUCED: fewer particles = faster on mobile
    const cnt = type === 'special' ? 28 : type === 'kick' ? 12 : 7;
    for (let i = 0; i < cnt; i++) { const a = (Math.PI * 2 / cnt) * i + Math.random() * .3, spd = (type === 'special' ? 4 : type === 'kick' ? 2.8 : 2) + Math.random() * 2.2; parts.push({ t: 'dot', x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1.2, life: 1, d: .07 + Math.random() * .03, r: 2 + Math.random() * 3, c: [col, col2, '#fff'][0 | Math.random() * 3] }); }
    parts.push({ t: 'ring', x: cx, y: cy, r: 4, mR: type === 'special' ? 72 : type === 'kick' ? 50 : 30, life: 1, d: .09, c: col });
    if (type === 'special') parts.push({ t: 'ring', x: cx, y: cy, r: 4, mR: 95, life: .68, d: .06, c: col2 });
    scFlash(col + '16');
  }
}
function spawnBurst(cx, cy, col, col2) {
  for (let i = 0; i < 24; i++) { const a = (Math.PI * 2 / 24) * i, spd = 2.2 + Math.random() * 5; parts.push({ t: 'dot', x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1.6, life: 1, d: .04 + Math.random() * .02, r: 3 + Math.random() * 4, c: [col, col2, '#fff'][0 | Math.random() * 3] }); }
  parts.push({ t: 'ring', x: cx, y: cy, r: 5, mR: 65, life: 1, d: .06, c: col });
}
function fxTxt(x, y, txt, color, sz) { const d = document.createElement('div'); d.className = 'ffx'; d.style.cssText = `left:${x - 22}px;bottom:${AH - y}px;color:${color};font-size:${sz || 18}px;`; d.textContent = txt; document.getElementById('aw').appendChild(d); setTimeout(() => d.remove(), 720); }
function showImpact(word, col) { const iw = document.getElementById('iword'); iw.textContent = word; iw.style.color = col; iw.style.display = 'block'; iw.style.animation = 'none'; void iw.offsetWidth; iw.style.animation = 'iPop .34s cubic-bezier(.3,1.6,.4,1) both'; setTimeout(() => iw.style.display = 'none', 360); }
function scFlash(col) { const d = document.createElement('div'); d.style.cssText = `position:absolute;inset:0;background:${col};pointer-events:none;z-index:10;animation:fOut .2s forwards;`; document.getElementById('aw').appendChild(d); setTimeout(() => d.remove(), 220); }
function shakeWrap(type) { const a = type === 'special' ? 'bShake .4s' : 'shake .17s'; document.getElementById('aw').style.animation = a; setTimeout(() => document.getElementById('aw').style.animation = '', type === 'special' ? 420 : 185); }
function showMsg(txt, dur) { const el = document.getElementById('mt'); el.textContent = txt; el.style.opacity = '1'; if (dur) setTimeout(() => el.style.opacity = '0', dur); }

// ═══════════════════════════════════════
// END ROUND + COINS
// ═══════════════════════════════════════
function checkKO(p) { if (S[p].hp <= 0) { S[p].hp = 0; S[p].anim = 'dead'; uHP(); endRound('ko', p); } }

function endRound(type, loser) {
  gOver = true; clearInterval(timerInt); bgStop(); sfx('ko');
  let win = type === 'ko' ? (loser === 1 ? 2 : 1) : (S[1].hp > S[2].hp ? 1 : S[2].hp > S[1].hp ? 2 : 0);
  // confetti
  for (let i = 0; i < 150; i++)kParts.push({ x: AW * .15 + Math.random() * AW * .7, y: AH * .1 + Math.random() * AH * .4, vx: (Math.random() - .5) * 11, vy: -Math.random() * 8 - 2, life: 1, r: 2 + Math.random() * 6, c: ['#ffd700', '#f87', '#c084fc', '#60a5fa', '#4ade80', '#fb923c'][0 | Math.random() * 6] });
  const kl = document.getElementById('kl'); kl.style.display = 'flex';
  const kt = document.getElementById('kt'); kt.textContent = type === 'ko' ? 'K.O.!' : 'TIME!'; kt.style.animation = 'none'; void kt.offsetWidth; kt.style.animation = 'kBounce .52s cubic-bezier(.3,1.8,.5,1) both';

  if (gMode === 'survival') {
    if (win === 1) {
      const diffMult = { easy: .8, normal: 1, hard: 1.4, brutal: 1.8, insane: 2.5 }[diff] || 1;
      const earned = Math.round(20 * svWave * diffMult);
      svEarned += earned; svScore += Math.round(100 * svWave * (getCfg().aggr + 1)); svBest = Math.max(svBest, svScore);
      SV.best = svBest; lsSet(SV); svWave++;
      S[2].char = ['storm', 'titan', 'void', 'blaze'][(svWave - 1) % 4];
      addCoins(earned); sfx('coin');
      document.getElementById('wt').textContent = 'WAVE CLEAR!';
      document.getElementById('cr').textContent = '🪙 +' + earned + ' COINS';
      _showBtn('rBtn', 'WAVE ' + svWave + ' →');
      uSVhud();
    } else {
      document.getElementById('wt').textContent = 'GAME OVER! SCORE: ' + svScore;
      document.getElementById('cr').textContent = '🪙 Earned: ' + svEarned + ' | BEST: ' + svBest;
      _showBtn('mBtn', 'MENU'); svScore = 0; svWave = 1; svEarned = 0;
    }
    return;
  }
  if (win === 1) p1W++; else if (win === 2) p2W++; rfStars();
  const wn = win === 1 ? CH[S[1].char].name : win === 2 ? (gMode === 'bot' ? 'BOT' : CH[S[2].char].name) : 'DRAW';
  document.getElementById('wt').textContent = wn + (win ? ' WINS!' : '!');
  document.getElementById('cr').textContent = 'Play SURVIVAL to earn coins!';
  if (p1W >= 2 || p2W >= 2) { _showBtn('rBtn', 'PLAY AGAIN'); _showBtn('mBtn', 'MENU'); }
  else { round++; _showBtn('rBtn', 'RND ' + round + ' →'); }
}

function _showBtn(id, txt) { const b = document.getElementById(id); b.textContent = txt; b.style.display = 'flex'; }

function nextRound() {
  document.getElementById('kl').style.display = 'none';
  if (p1W >= 2 || p2W >= 2) { p1W = 0; p2W = 0; round = 1; mkStars(); }
  bgStart(); startRound();
}

// ═══════════════════════════════════════
// TOUCH CONTROLS — FIXED: no double listeners
// Single touchstart per button, with hold interval for movement
// ═══════════════════════════════════════
(function setupTouch() {
  const btnActs = [
    ['tcJ', 'jump'], ['tcBk', 'block'], ['tcP', 'punch'], ['tcK', 'kick'], ['tcSp', 'special'],
    ['tcL', 'left'], ['tcR', 'right']
  ];
  btnActs.forEach(([id, a]) => {
    const el = document.getElementById(id); if (!el) return;
    const isMove = a === 'left' || a === 'right';
    let holdIv = null;

    el.addEventListener('touchstart', e => {
      e.preventDefault();
      act(1, a);
      if (isMove) holdIv = setInterval(() => act(1, a), 75);
    }, { passive: false });

    el.addEventListener('touchend', e => {
      e.preventDefault();
      if (isMove) { clearInterval(holdIv); holdIv = null; }
    }, { passive: false });

    el.addEventListener('touchcancel', () => {
      if (isMove) { clearInterval(holdIv); holdIv = null; }
    });
  });
})();
// At the bottom of a.js
window.addEventListener('DOMContentLoaded', () => {
  setupTouch();
});
// ═══════════════════════════════════════
// KEYBOARD (desktop fallback)
// ═══════════════════════════════════════


// INIT
uCoinUI(); startMenu();
