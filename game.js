/* Color Dash — Everything Edition
   - Play, level select, level editor, skins, particles, music, highscores
   - Single-file engine + UI wiring
*/

// === Basic setup ===
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
let DPR = Math.max(1, window.devicePixelRatio || 1);

function resize(){
  DPR = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * DPR);
  canvas.height = Math.floor((window.innerHeight - 64) * DPR); // account for topbar
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = (window.innerHeight - 64) + 'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize', resize);
resize();

// UI elements
const hudDistance = document.getElementById('hud-distance');
const hudHigh = document.getElementById('hud-high');
const btnPlay = document.getElementById('btn-play');
const btnLevels = document.getElementById('btn-levels');
const btnEditor = document.getElementById('btn-editor');
const btnSkins = document.getElementById('btn-skins');
const btnSettings = document.getElementById('btn-settings');
const overlay = document.getElementById('overlay');
const menuTitle = document.getElementById('menuTitle');
const menuBody = document.getElementById('menuBody');
const menuClose = document.getElementById('menuClose');
const btnMusic = document.getElementById('btn-music');
const btnFull = document.getElementById('btn-full');
const skinPreview = document.getElementById('skin-preview');
const skinNameEl = document.getElementById('skin-name');

const gameOver = document.getElementById('gameOver');
const goDist = document.getElementById('goDist');
const goRestart = document.getElementById('goRestart');
const goMenu = document.getElementById('goMenu');

const editorPanel = document.getElementById('editorPanel');
const editTool = document.getElementById('editTool');
const editWidth = document.getElementById('editWidth');
const editHeight = document.getElementById('editHeight');
const editColor = document.getElementById('editColor');
const editorTimeline = document.getElementById('editorTimeline');
const saveLevelBtn = document.getElementById('saveLevel');
const loadSampleBtn = document.getElementById('loadSample');
const exportLevelBtn = document.getElementById('exportLevel');
const closeEditorBtn = document.getElementById('closeEditor');
const levelNameInput = document.getElementById('levelName');

// === Game constants ===
const GRAVITY = 1800;
const JUMP_V = -620;
const PLAYER_SIZE = 56;
const BASE_SPEED = 360;
const SPAWN_INTERVAL = 1.3;

// === Persistence keys ===
const LS_KEY_HIGHSCORE = 'cd_highscore_v1';
const LS_KEY_LEVELS = 'cd_levels_v1';
const LS_KEY_SKIN = 'cd_skin_v1';

// === Basic state ===
let lastTime = 0;
let gameState = {
  running: false,
  alive: true,
  speed: BASE_SPEED,
  distance: 0,
  cameraX: 0,
  obstacles: [],
  spawnTimer: 0,
  bgOffset: 0,
  level: null,
  particlePool: []
};

// === Utility functions ===
function rand(min=0,max=1){ return Math.random()*(max-min)+min; }
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function lightColor(hex, amt){
  // small lighten for faces
  const c = hex.replace('#','');
  const num = parseInt(c,16);
  let r = (num >> 16) + amt;
  let g = (num >> 8 & 0x00FF) + amt;
  let b = (num & 0x0000FF) + amt;
  r = clamp(r,0,255); g = clamp(g,0,255); b = clamp(b,0,255);
  return '#' + ((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1);
}

// === Skins ===
const SKINS = [
  {id:'sunny', name:'Sunny', color:'#ffd166', faces:['happy','wink','cool']},
  {id:'rose', name:'Rose', color:'#ff6b6b', faces:['happy','determined','surprised']},
  {id:'mint', name:'Mint', color:'#7efc6a', faces:['happy','cool']},
  {id:'violet', name:'Violet', color:'#9b8cff', faces:['determined','wink']},
  {id:'classic', name:'Classic', color:'#4cc0ff', faces:['happy','surprised','wink','cool']}
];
let selectedSkin = loadSkin();

// show skin preview
function renderSkinPreview(){
  skinPreview.innerHTML = '';
  const box = document.createElement('div');
  box.style.width = '64px';
  box.style.height = '64px';
  box.style.borderRadius = '8px';
  box.style.background = `linear-gradient(180deg, ${lightColor(selectedSkin.color, 18)}, ${selectedSkin.color})`;
  box.style.border = '2px solid rgba(0,0,0,0.08)';
  skinPreview.appendChild(box);
  skinNameEl.textContent = selectedSkin.name;
}
renderSkinPreview();

function saveSkin(skin){
  selectedSkin = skin;
  localStorage.setItem(LS_KEY_SKIN, JSON.stringify(skin));
  renderSkinPreview();
}
function loadSkin(){
  try{
    const s = JSON.parse(localStorage.getItem(LS_KEY_SKIN));
    if (s && s.id) return s;
  }catch(e){}
  return SKINS[0];
}

// === Levels ===
const SAMPLE_LEVELS = [
  {
    id: 'level-1',
    name: 'Sunny Start',
    length: 3500,
    obstacles: [
      {type:'block', x:700, w:140, h:90, color:'#ff9f80'},
      {type:'gap', x:980, w:120},
      {type:'block', x:1160, w:80, h:70, color:'#ffcc66'},
      {type:'spike', x:1350, w:140, h:64, color:'#ffd166'},
      {type:'gap', x:1620, w:140},
      {type:'block', x:1820, w:220, h:110, color:'#ff6b6b'},
      {type:'spike', x:2200, w:160, h:72, color:'#9b8cff'},
      {type:'gap', x:2460, w:200}
    ]
  },
  {
    id: 'level-2',
    name: 'Bouncy Blocks',
    length: 4200,
    obstacles: [
      {type:'block', x:600, w:80, h:60, color:'#7efc6a'},
      {type:'block', x:740, w:120, h:120, color:'#4cc0ff'},
      {type:'gap', x:900, w:160},
      {type:'spike', x:1100, w:140, h:64, color:'#ff6b6b'},
      {type:'block', x:1300, w:200, h:80, color:'#ffd166'},
      {type:'gap', x:1600, w:120},
      {type:'block', x:1760, w:150, h:110, color:'#9b8cff'},
      {type:'spike', x:2100, w:160, h:72, color:'#ff9f80'},
      {type:'block', x:2380, w:220, h:140, color:'#7efc6a'}
    ]
  },
  {
    id: 'level-3',
    name: 'Spiky Rush',
    length: 2800,
    obstacles: [
      {type:'spike', x:700, w:180, h:80, color:'#ff6b6b'},
      {type:'gap', x:920, w:120},
      {type:'spike', x:1100, w:160, h:72, color:'#ff9f80'},
      {type:'block', x:1300, w:120, h:90, color:'#ffd166'},
      {type:'gap', x:1540, w:160},
      {type:'spike', x:1760, w:240, h:90, color:'#9b8cff'}
    ]
  }
];

// load extra levels from storage
function loadSavedLevels(){
  try{
    const v = JSON.parse(localStorage.getItem(LS_KEY_LEVELS) || '[]');
    if (Array.isArray(v) && v.length) return v;
  }catch(e){}
  return SAMPLE_LEVELS;
}
let levels = loadSavedLevels();

// save all levels
function saveLevels(){
  localStorage.setItem(LS_KEY_LEVELS, JSON.stringify(levels));
}

// === Player class ===
class Player {
  constructor(){
    this.x = 140;
    this.y = 0;
    this.vy = 0;
    this.size = PLAYER_SIZE;
    this.onGround = false;
    this.color = selectedSkin.color;
    this.face = this.randomFace();
    this._coyote = 0;
  }
  randomFace(){
    const faces = selectedSkin.faces || ['happy'];
    return faces[Math.floor(Math.random()*faces.length)];
  }
  reset(){
    this.y = groundY() - this.size;
    this.vy = 0;
    this.onGround = true;
    this.color = selectedSkin.color;
    this.face = this.randomFace();
    this._coyote = 0;
  }
  jump(){
    if (!gameState.alive) return;
    if (this.onGround || this._coyote > performance.now()) {
      this.vy = JUMP_V;
      this.onGround = false;
      spawnParticles(this.x + this.size/2, this.y + this.size, 'jump');
      playSfx('jump');
    }
  }
  update(dt){
    if (this.onGround) this._coyote = performance.now() + 120;
    this.vy += GRAVITY * dt;
    this.y += this.vy * dt;
    if (this.y + this.size >= groundY()){
      if (!this.onGround) {
        // landed
        spawnParticles(this.x + this.size/2, groundY(), 'land');
      }
      this.y = groundY() - this.size;
      this.vy = 0;
      this.onGround = true;
    }
  }
  draw(ctx){
    const s = this.size;
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(x-2, y+s-6, s+4, 6);
    // body
    const grad = ctx.createLinearGradient(x,y,x,y+s);
    grad.addColorStop(0, lightColor(this.color, 12));
    grad.addColorStop(1, this.color);
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, s, s, 8);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    roundRectStroke(ctx, x, y, s, s, 8);

    // face
    const eyeY = y + s*0.34;
    const eyeLx = x + s*0.24;
    const eyeRx = x + s*0.68;
    ctx.fillStyle = '#111';
    if (this.face === 'happy') {
      drawEyes(ctx, eyeLx, eyeY, eyeRx, eyeY, 'normal');
      drawMouth(ctx, x+s/2, y+s*0.66, 'smile');
    } else if (this.face === 'wink') {
      drawEyes(ctx, eyeLx, eyeY, eyeRx, eyeY, 'wink');
      drawMouth(ctx, x+s/2, y+s*0.66, 'smile');
    } else if (this.face === 'cool') {
      // sunglasses
      ctx.fillStyle = '#111';
      ctx.fillRect(eyeLx-6, eyeY-8, 16, 10);
      ctx.fillRect(eyeRx-6, eyeY-8, 16, 10);
      ctx.fillRect(eyeLx+8, eyeY-6, (eyeRx-eyeLx)-4, 6);
      drawMouth(ctx, x+s/2, y+s*0.68, 'flat');
    } else if (this.face === 'surprised') {
      drawEyes(ctx, eyeLx, eyeY, eyeRx, eyeY, 'round');
      drawMouth(ctx, x+s/2, y+s*0.68, 'o');
    } else {
      drawEyes(ctx, eyeLx, eyeY-2, eyeRx, eyeY-2, 'narrow');
      drawMouth(ctx, x+s/2, y+s*0.72, 'flat');
    }
  }
}

// face utilities
function drawEyes(ctx, lx, ly, rx, ry, style='normal'){
  ctx.fillStyle = '#111';
  if (style === 'normal') {
    ctx.beginPath(); ctx.ellipse(lx, ly, 4, 6, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(rx, ry, 4, 6, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(lx+1, ly-1, 2, 2);
    ctx.fillRect(rx+1, ry-1, 2, 2);
  } else if (style === 'wink') {
    ctx.fillRect(lx-4, ly-1, 8, 2);
    ctx.beginPath(); ctx.ellipse(rx, ry, 4, 6, 0, 0, Math.PI*2); ctx.fill();
  } else if (style === 'round') {
    ctx.beginPath(); ctx.ellipse(lx, ly, 6, 6, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(rx, ry, 6, 6, 0, 0, Math.PI*2); ctx.fill();
  } else if (style === 'narrow') {
    ctx.fillRect(lx-4, ly-2, 8, 3);
    ctx.fillRect(rx-4, ry-2, 8, 3);
  }
}
function drawMouth(ctx, cx, y, mood='smile'){
  ctx.fillStyle = '#111';
  if (mood === 'smile') {
    ctx.beginPath(); ctx.arc(cx, y, 10, 0.1*Math.PI, 0.9*Math.PI); ctx.lineWidth=2; ctx.strokeStyle='#111'; ctx.stroke();
  } else if (mood === 'o') {
    ctx.beginPath(); ctx.ellipse(cx, y, 6, 8, 0,0,Math.PI*2); ctx.fill();
  } else {
    ctx.fillRect(cx-10, y-4, 20, 6);
  }
}

// drawing helpers
function roundRect(ctx, x, y, w, h, r=6){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  ctx.fill();
}
function roundRectStroke(ctx, x, y, w, h, r=6){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  ctx.stroke();
}

// ground y
function groundY(){ return Math.round(canvas.height / DPR * 0.78); }

// === Obstacles ===
class Obstacle {
  constructor(spec){
    // spec: {type,x,w,h,color}
    this.type = spec.type;
    this.x = spec.x;
    this.w = spec.w || 120;
    this.h = spec.h || 80;
    this.color = spec.color || '#ff6b6b';
    this.passed = false;
  }
  rect(){ return {x:this.x, y:groundY()-this.h, w:this.w, h:this.h}; }
  draw(ctx, camX){
    if (this.type === 'gap') return;
    const sx = Math.round(this.x - camX);
    const sy = Math.round(groundY() - this.h);
    if (this.type === 'block'){
      ctx.fillStyle = this.color;
      roundRect(ctx, sx, sy, this.w, this.h, 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 2; roundRectStroke(ctx, sx, sy, this.w, this.h, 6);
    } else if (this.type === 'spike'){
      const spikeW = 26;
      ctx.fillStyle = this.color;
      for (let px = sx; px < sx + this.w; px += spikeW){
        ctx.beginPath();
        ctx.moveTo(px, groundY());
        ctx.lineTo(px + spikeW/2, groundY() - this.h);
        ctx.lineTo(px + spikeW, groundY());
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }
  collidesWith(player){
    if (this.type === 'gap'){
      const left = this.x;
      const right = this.x + this.w;
      if ((player.x + player.size > left) && (player.x < right)) {
        if (player.y + player.size >= groundY() - 1) return true;
      }
      return false;
    } else {
      const r = this.rect();
      const px = player.x, py = player.y, pw = player.size, ph = player.size;
      if (px < r.x + r.w && px + pw > r.x && py < r.y + r.h && py + ph > r.y) return true;
      return false;
    }
  }
}

// === Parallax background ===
const bgLayers = [
  {speed:0.08, items:[]},
  {speed:0.22, items:[]},
  {speed:0.44, items:[]}
];
function populateBG(){
  const w = window.innerWidth;
  for (let i=0;i<bgLayers.length;i++){
    bgLayers[i].items = [];
    const n = 10 + Math.floor(Math.random()*8);
    for (let j=0;j<n;j++){
      bgLayers[i].items.push({
        x: Math.random()*w*3,
        y: Math.random()*(groundY()*0.6),
        size: 6 + Math.random()*40
      });
    }
  }
}
populateBG();

// === Particles ===
function spawnParticles(x,y,type='burst'){
  for (let i=0;i<18;i++){
    gameState.particlePool.push({
      x, y,
      vx: rand(-260,260),
      vy: rand(-280,-40),
      life: rand(0.36,0.9),
      size: rand(2,6),
      color: type === 'jump' ? lightColor(selectedSkin.color, 12) : '#ffffff'
    });
  }
}
function updateParticles(dt){
  for (let p of gameState.particlePool){
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 1200 * dt;
  }
  gameState.particlePool = gameState.particlePool.filter(p=>p.life>0);
}
function drawParticles(ctx, camX){
  for (let p of gameState.particlePool){
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 0.9);
    ctx.fillRect(p.x - camX - p.size/2, p.y - p.size/2, p.size, p.size);
    ctx.globalAlpha = 1;
  }
}

// === Audio (simple) ===
let audioCtx = null;
let isMusicOn = true;
let musicInterval = null;
function ensureAudio(){
  if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
}
function startMusic(){
  if (!isMusicOn) return;
  ensureAudio();
  const ctxA = audioCtx;
  const master = ctxA.createGain(); master.gain.value = 0.08; master.connect(ctxA.destination);
  let t0 = ctxA.currentTime + 0.05; let step = 0; const bpm = 110; const beat = 60/bpm;
  function schedule(){
    const now = ctxA.currentTime;
    while (t0 < now + 0.6){
      const k = step % 16;
      if (k % 4 === 0){
        const o = ctxA.createOscillator();
        const g = ctxA.createGain();
        o.type = 'sawtooth';
        o.frequency.value = 55 * Math.pow(2, (Math.floor((step/4)%4)/12));
        g.gain.value = 0.08;
        o.connect(g); g.connect(master);
        o.start(t0); o.stop(t0 + beat*0.9);
      }
      if (Math.random() > 0.6){
        const o2 = ctxA.createOscillator(); const g2 = ctxA.createGain();
        o2.type = 'triangle';
        o2.frequency.value = 440 * Math.pow(2, (Math.floor(Math.random()*5)-2)/12);
        g2.gain.value = 0.05; o2.connect(g2); g2.connect(master);
        o2.start(t0); o2.stop(t0 + beat*0.5);
      }
      t0 += beat*0.5; step++;
    }
  }
  schedule();
  musicInterval = setInterval(schedule, 400);
}
function stopMusic(){
  if (musicInterval){ clearInterval(musicInterval); musicInterval = null; }
}
function playSfx(name){
  ensureAudio();
  const ctxA = audioCtx;
  const o = ctxA.createOscillator(); const g = ctxA.createGain();
  if (name === 'jump'){
    o.type = 'sine'; o.frequency.value = 520; g.gain.value = 0.08;
  } else if (name === 'hit'){
    o.type = 'square'; o.frequency.value = 120; g.gain.value = 0.12;
  }
  o.connect(g); g.connect(ctxA.destination); o.start(); o.stop(ctxA.currentTime + 0.12);
}

// === Highscore ===
function loadHigh(){ return parseInt(localStorage.getItem(LS_KEY_HIGHSCORE) || '0',10); }
function saveHigh(v){ localStorage.setItem(LS_KEY_HIGHSCORE, String(Math.floor(v))); hudHigh.textContent = `High: ${Math.floor(v)}`; }
hudHigh.textContent = `High: ${loadHigh()}`;

// === Game objects ===
const player = new Player();

// === Level handling ===
function startLevel(level){
  gameState.level = JSON.parse(JSON.stringify(level)); // clone
  gameState.obstacles = gameState.level.obstacles.map(o => new Obstacle(o));
  gameState.cameraX = 0;
  gameState.distance = 0;
  gameState.spawnTimer = 0;
  gameState.bgOffset = 0;
  gameState.speed = BASE_SPEED;
  gameState.alive = true;
  player.reset();
  lastTime = performance.now();
  overlay.classList.add('hidden');
  gameOver.classList.add('hidden');
  gameState.running = true;
}
function endRun(){
  gameState.running = false;
  gameState.alive = false;
  playSfx('hit');
  spawnParticles(player.x + player.size/2, player.y + player.size/2, 'burst');
  goDist.textContent = Math.floor(gameState.distance);
  gameOver.classList.remove('hidden');
  const high = loadHigh();
  if (gameState.distance > high) saveHigh(gameState.distance);
}

// === Spawning generator (for endless style if needed) ===
function spawnObstacleAt(x){
  const r = Math.random();
  if (r < 0.18){
    const w = 140 + Math.random()*80;
    gameState.obstacles.push(new Obstacle({type:'spike', x, w, h:64, color:randColor()}));
  } else if (r < 0.32){
    const w = 80 + Math.random()*120;
    gameState.obstacles.push(new Obstacle({type:'gap', x, w}));
  } else {
    const w = 60 + Math.random()*120;
    const h = 60 + Math.random()*90;
    gameState.obstacles.push(new Obstacle({type:'block', x, w, h, color:randColor()}));
  }
}
function randColor(){ const hue = Math.floor(rand(0,360)); return `hsl(${hue} 80% 65%)`; }

// === Game loop ===
function update(ts){
  if (!lastTime) lastTime = ts;
  let dt = Math.min(0.032, (ts - lastTime)/1000);
  lastTime = ts;
  if (!gameState.running){
    draw();
    requestAnimationFrame(update);
    return;
  }
  if (!gameState.alive){ draw(); requestAnimationFrame(update); return; }

  // update speed & camera
  gameState.speed = BASE_SPEED + Math.floor(gameState.distance/1000) * 12;
  const dx = gameState.speed * dt;
  gameState.cameraX += dx;
  gameState.distance += dx;
  hudDistance.textContent = `Distance: ${Math.floor(gameState.distance)}`;

  // update bg
  gameState.bgOffset += dx;

  // update player
  player.update(dt);

  // collision
  for (let obs of gameState.obstacles){
    if (!obs.passed && obs.x + obs.w < player.x) obs.passed = true;
    if (obs.collidesWith(player)){
      endRun();
      break;
    }
  }

  // clean up obstacles behind camera
  gameState.obstacles = gameState.obstacles.filter(o => o.x + o.w > gameState.cameraX - 400);

  updateParticles(dt);
  draw();
  requestAnimationFrame(update);
}

// === Draw ===
function draw(){
  // clear
  ctx.fillStyle = '#061626';
  ctx.fillRect(0,0,canvas.width/DPR,canvas.height/DPR);

  // sky gradient
  const g = ctx.createLinearGradient(0,0,0,canvas.height/DPR);
  g.addColorStop(0, '#0b2a4a');
  g.addColorStop(1, '#071323');
  ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width/DPR,canvas.height/DPR);

  // parallax
  for (let i=0;i<bgLayers.length;i++){
    const layer = bgLayers[i];
    ctx.fillStyle = `rgba(255,255,255,${0.01 + i*0.02})`;
    for (let obj of layer.items){
      const sx = obj.x - gameState.bgOffset * layer.speed;
      const sy = obj.y + (i*20);
      const w = window.innerWidth;
      const rx = ((sx % (w*2)) + (w*2)) % (w*2) - w;
      ctx.beginPath(); ctx.ellipse(rx, sy, obj.size, obj.size*0.5, 0, 0, Math.PI*2); ctx.fill();
    }
  }

  // horizon
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(0, groundY()+2, canvas.width/DPR, 2);

  // obstacles
  for (let obs of gameState.obstacles) obs.draw(ctx, gameState.cameraX);

  // ground
  const tileW = 64;
  const baseY = groundY();
  ctx.fillStyle = '#07283e'; ctx.fillRect(0, baseY, canvas.width/DPR, canvas.height/DPR - baseY);
  for (let x = - (gameState.cameraX % tileW); x < canvas.width/DPR + tileW; x += tileW){
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x+tileW, baseY); ctx.stroke();
  }

  // particles
  drawParticles(ctx, gameState.cameraX);

  // player
  player.draw(ctx);
}

// === Inputs ===
function doJump(){ if (!gameState.alive) { if (!gameState.level) return; startLevel(gameState.level); } player.jump(); }
window.addEventListener('keydown', (e)=>{
  if (e.code === 'Space' || e.code === 'ArrowUp'){ e.preventDefault(); if (!gameState.alive) { restartRun(); return; } doJump(); }
});
window.addEventListener('mousedown', (e)=>{ if (!gameState.alive) { restartRun(); return; } doJump(); });
window.addEventListener('touchstart', (e)=>{ e.preventDefault(); if (!gameState.alive) { restartRun(); return; } doJump(); }, {passive:false});

function restartRun(){ if (!gameState.level) return; startLevel(gameState.level); }

// === UI wiring ===
btnPlay.addEventListener('click', ()=>{ openMenu('play'); });
btnLevels.addEventListener('click', ()=>{ openMenu('levels'); });
btnEditor.addEventListener('click', ()=>{ openEditor(); });
btnSkins.addEventListener('click', ()=>{ openMenu('skins'); });
btnSettings.addEventListener('click', ()=>{ openMenu('settings'); });
menuClose.addEventListener('click', ()=>{ overlay.classList.add('hidden'); });
goRestart.addEventListener('click', ()=>{ restartRun(); gameOver.classList.add('hidden'); });
goMenu.addEventListener('click', ()=>{ gameOver.classList.add('hidden'); overlay.classList.remove('hidden'); openMenu('play'); });

btnMusic.addEventListener('click', ()=>{
  isMusicOn = !isMusicOn;
  btnMusic.textContent = 'Music: ' + (isMusicOn ? 'On' : 'Off');
  if (isMusicOn) startMusic(); else stopMusic();
});
btnFull.addEventListener('click', ()=>{
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
  else document.exitFullscreen();
});

// === Menu content ===
function openMenu(kind){
  overlay.classList.remove('hidden');
  menuTitle.textContent = kind.charAt(0).toUpperCase() + kind.slice(1);
  menuBody.innerHTML = '';
  if (kind === 'play'){
    const list = document.createElement('div');
    list.style.display = 'grid';
    list.style.gap = '8px';
    for (let lvl of levels){
      const b = document.createElement('button');
      b.className = 'btn'; b.textContent = `${lvl.name} — ${Math.floor(lvl.length/1000)}s`;
      b.onclick = ()=>{ overlay.classList.add('hidden'); startLevel(lvl); };
      list.appendChild(b);
    }
    menuBody.appendChild(list);
  } else if (kind === 'levels'){
    const addNew = document.createElement('button'); addNew.className='btn'; addNew.textContent='Create New Level';
    addNew.onclick = ()=>{ overlay.classList.add('hidden'); openEditor(); };
    menuBody.appendChild(addNew);

    const list = document.createElement('div'); list.style.marginTop='8px'; list.style.display='grid'; list.style.gap='8px';
    levels.forEach((lvl, idx)=>{
      const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center';
      const label = document.createElement('div'); label.textContent = lvl.name;
      const actions = document.createElement('div'); actions.style.display='flex'; actions.style.gap='6px';
      const playBtn = document.createElement('button'); playBtn.className='btn'; playBtn.textContent='Play'; playBtn.onclick=()=>{ overlay.classList.add('hidden'); startLevel(lvl); };
      const editBtn = document.createElement('button'); editBtn.className='btn'; editBtn.textContent='Edit'; editBtn.onclick=()=>{ overlay.classList.add('hidden'); openEditor(lvl); };
      const delBtn = document.createElement('button'); delBtn.className='btn'; delBtn.textContent='Delete'; delBtn.onclick=()=>{
        if (confirm('Delete level?')){ levels.splice(idx,1); saveLevels(); openMenu('levels'); }
      };
      actions.appendChild(playBtn); actions.appendChild(editBtn); actions.appendChild(delBtn);
      row.appendChild(label); row.appendChild(actions); list.appendChild(row);
    });
    menuBody.appendChild(list);
  } else if (kind === 'skins'){
    const wrap = document.createElement('div'); wrap.style.display='grid'; wrap.style.gap='8px';
    SKINS.forEach(s=>{
      const b = document.createElement('button'); b.className='btn'; b.textContent = s.name;
      b.onclick = ()=>{ saveSkin(s); overlay.classList.add('hidden'); };
      wrap.appendChild(b);
    });
    menuBody.appendChild(wrap);
  } else if (kind === 'settings'){
    const cl = document.createElement('div');
    cl.innerHTML = `<div style="margin-bottom:8px">Highscore: ${loadHigh()}</div>`;
    const clear = document.createElement('button'); clear.className='btn'; clear.textContent='Reset Highscore';
    clear.onclick = ()=>{ if (confirm('Reset highscore?')){ localStorage.removeItem(LS_KEY_HIGHSCORE); hudHigh.textContent='High: 0'; } };
    cl.appendChild(clear);
    menuBody.appendChild(cl);
  }
}

// === Editor ===
let editingLevel = null;
function openEditor(level = null){
  editorPanel.classList.remove('hidden');
  editorTimeline.innerHTML = '';
  editingLevel = level ? JSON.parse(JSON.stringify(level)) : {id:'tmp-'+Date.now(), name:'New Level', length:2200, obstacles:[]};
  levelNameInput.value = editingLevel.name;
  renderEditorTimeline();
}
closeEditorBtn.addEventListener('click', ()=>{ editorPanel.classList.add('hidden'); });
loadSampleBtn.addEventListener('click', ()=>{
  editingLevel = JSON.parse(JSON.stringify(SAMPLE_LEVELS[0])); levelNameInput.value = editingLevel.name; renderEditorTimeline();
});
saveLevelBtn.addEventListener('click', ()=>{
  editingLevel.name = levelNameInput.value || editingLevel.name;
  // if exists replace else push
  const idx = levels.findIndex(l => l.id === editingLevel.id);
  if (idx >= 0) levels[idx] = editingLevel;
  else levels.push(editingLevel);
  saveLevels();
  alert('Level saved');
});
exportLevelBtn.addEventListener('click', ()=>{
  const data = JSON.stringify(editingLevel, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = (editingLevel.name || 'level') + '.json';
  a.click();
  URL.revokeObjectURL(url);
});

// editor timeline interaction (simple)
function renderEditorTimeline(){
  editorTimeline.innerHTML = '';
  const w = editorTimeline.clientWidth || 880;
  const h = editorTimeline.clientHeight || 120;
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','100%'); svg.setAttribute('height','100%');
  svg.style.display = 'block';
  svg.style.borderRadius = '6px';
  svg.style.cursor = 'crosshair';
  // draw baseline
  const rect = document.createElementNS(svg.namespaceURI,'rect'); rect.setAttribute('x','0'); rect.setAttribute('y','0'); rect.setAttribute('width','100%'); rect.setAttribute('height','100%'); rect.setAttribute('fill','transparent');
  svg.appendChild(rect);
  // obstacles
  const L = editingLevel.length || 2200;
  editingLevel.obstacles.forEach((o, idx)=>{
    const x = (o.x / L) * 100;
    const width = ((o.w || 120) / L) * 100;
    const g = document.createElementNS(svg.namespaceURI,'g'); g.setAttribute('data-idx', String(idx));
    const color = o.color || '#ff6b6b';
    const r = document.createElementNS(svg.namespaceURI,'rect'); r.setAttribute('x', x+'%'); r.setAttribute('y','12%'); r.setAttribute('width', width+'%'); r.setAttribute('height','76%'); r.setAttribute('fill', color);
    r.setAttribute('stroke','#000'); r.setAttribute('stroke-opacity','0.1');
    g.appendChild(r);
    svg.appendChild(g);
  });
  // click to add
  svg.addEventListener('click', (ev)=>{
    const rect = svg.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const pct = px / rect.width;
    const pos = pct * editingLevel.length;
    const tool = editTool.value;
    const wv = parseInt(editWidth.value,10);
    const hv = parseInt(editHeight.value,10);
    const col = editColor.value;
    const spec = {type:tool, x: Math.max(200, Math.round(pos)), w: tool==='gap' ? Math.max(40, wv) : wv, h: hv, color: col};
    editingLevel.obstacles.push(spec);
    renderEditorTimeline();
  });
  // context menu delete
  svg.addEventListener('contextmenu', (ev)=>{
    ev.preventDefault();
    const rect = svg.getBoundingClientRect();
    const px = ev.clientX - rect.left; const pct = px / rect.width; const pos = pct * editingLevel.length;
    // find obstacle under pos
    const idx = editingLevel.obstacles.findIndex(o=> pos >= o.x && pos <= o.x + (o.w||0));
    if (idx >= 0){
      if (confirm('Delete obstacle?')){ editingLevel.obstacles.splice(idx,1); renderEditorTimeline(); }
    }
  });
  editorTimeline.appendChild(svg);
}

// === Level editor quick helper ===
// No advanced drag/drop to keep code concise; click to add, right-click to remove.

// === Restart / flow ===
function chooseDefaultLevel(){
  gameState.level = levels[0];
}
chooseDefaultLevel();

// === Helpers & Small init ===
function randColorHex(){ return `hsl(${Math.floor(Math.random()*360)} 80% 65%)`; }

// start main loop
startMusic();
requestAnimationFrame(update);

// small polyfill for touch on editor timeline height
window.addEventListener('orientationchange', ()=>{ renderEditorTimeline(); });

// helpers used earlier but defined after
function playSfx(name){ ensureAudio(); const ctxA = audioCtx; const o = ctxA.createOscillator(); const g = ctxA.createGain();
  if (name === 'jump'){ o.type='sine'; o.frequency.value = 520; g.gain.value = 0.08; }
  else if (name === 'hit'){ o.type='square'; o.frequency.value = 120; g.gain.value = 0.12; }
  o.connect(g); g.connect(ctxA.destination); o.start(); o.stop(ctxA.currentTime + 0.12);
}

// small cosmetic: show current skin in the UI initially
renderSkinPreview();

// expose some functions for debugging in console
window.CD = {levels, saveLevels, startLevel, player, gameState, SKINS, saveSkin};
```
