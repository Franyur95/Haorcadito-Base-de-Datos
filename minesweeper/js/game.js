/* ============================================================
   BUSCAMINAS — Complete Game Logic
   ============================================================ */
'use strict';

// ── Config ────────────────────────────────────────────────
const DIFFICULTIES = {
  easy:   { label:'Fácil',   rows:9,  cols:9,  mines:10, emoji: '🙂 ',color:'#22c55e', bg:'rgba(34,197,94,.1)',  border:'rgba(34,197,94,.25)' },
  medium: { label:'Medio',   rows:16, cols:16, mines:40, emoji : '😐' ,color:'#f59e0b', bg:'rgba(245,158,11,.1)', border:'rgba(245,158,11,.25)' },
  hard:   { label:'Difícil', rows:16, cols:30, mines:99, emoji :'😵‍💫 ', color:'#ef4444', bg:'rgba(239,68,68,.1)',  border:'rgba(239,68,68,.25)' },
  custom: { label:'Personalizado', rows:9, cols:9, mines:10, emoji:'⚙️', color:'#8b5cf6', bg:'rgba(139,92,246,.1)', border:'rgba(139,92,246,.25)' }
};

const NUM_COLORS = ['','#2563eb','#16a34a','#dc2626','#7c3aed','#c2410c','#0891b2','#9d174d','#374151'];

// ── State ─────────────────────────────────────────────────
const S = {
  screen: 'home',
  diff: 'easy',
  rows: 9, cols: 9, mines: 10,
  board: [],        // 2D array of cell objects
  revealed: 0,
  flags: 0,
  firstClick: true,
  gameOver: false,
  won: false,
  timer: 0,
  timerID: null,
  soundOn: true,
  stats: {
    easy:   { won:0, lost:0, bestTime:null, total:0 },
    medium: { won:0, lost:0, bestTime:null, total:0 },
    hard:   { won:0, lost:0, bestTime:null, total:0 },
    custom: { won:0, lost:0, bestTime:null, total:0 }
  },
  history: []
};

// ── Audio ─────────────────────────────────────────────────
let _ac = null;
function ac() { if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)(); return _ac; }
function tone(freq, type, dur, vol = 0.1) {
  if (!S.soundOn) return;
  try {
    const c=ac(), o=c.createOscillator(), g=c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, c.currentTime+dur);
    o.start(); o.stop(c.currentTime+dur);
  } catch(e) {}
}
const SFX = {
  click()   { tone(440,'sine',.08,.08); },
  flag()    { tone(600,'sine',.1,.1); setTimeout(()=>tone(800,'sine',.08,.08),80); },
  unflag()  { tone(300,'sine',.1,.08); },
  reveal()  { tone(520,'sine',.06,.06); },
  revealN() { tone(660,'triangle',.1,.1); },
  win()     { [523,659,784,1047].forEach((n,i)=>setTimeout(()=>tone(n,'sine',.25,.18),i*80)); },
  lose()    {
    // Boom grave + ruido descendente
    [180,140,100].forEach((n,i)=>setTimeout(()=>tone(n,'sawtooth',.45,.2),i*80));
    setTimeout(()=>tone(60,'sawtooth',.8,.3),0);
    setTimeout(()=>tone(80,'square',.6,.15),50);
  },
  tick()    { tone(880,'square',.04,.05); }
};

// ── DOM ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const on = (el,ev,fn) => el && el.addEventListener(ev,fn);

// ── Router ────────────────────────────────────────────────
function showScreen(name) {
  const order = ['home','diff','game'];
  const pi = order.indexOf(S.screen), ni = order.indexOf(name);
  S.screen = name;
  document.querySelectorAll('.screen').forEach(s => {
    const id = s.dataset.screen;
    const i = order.indexOf(id);
    if (id === name) s.className = 'screen s-active';
    else if (i < ni)  s.className = 'screen s-left';
    else              s.className = 'screen s-right';
  });
}

// ── Init ──────────────────────────────────────────────────
function init() {
  loadData();
  buildDiffScreen();
  bindHome();
  bindGame();
  bindModals();
  updateHomeBests();
  showScreen('home');
}

// ── HOME ──────────────────────────────────────────────────
function bindHome() {
  on($('btn-new-game'), 'click', () => { SFX.click(); showScreen('diff'); });
  on($('btn-theme'),    'click', toggleTheme);
  on($('btn-stats'),    'click', () => showStatsModal());
  on($('btn-info'),     'click', (e) => {
    e.stopPropagation();
    $('how-tooltip').classList.toggle('show');
  });
  document.addEventListener('click', () => $('how-tooltip')?.classList.remove('show'));
  on($('btn-sound-home'), 'click', toggleSound);
}

function updateHomeBests() {
  ['easy','medium','hard'].forEach(d => {
    const el = $(`best-${d}`);
    if (!el) return;
    const t = S.stats[d].bestTime;
    el.textContent = t != null ? formatTime(t) : '--:--';
  });
}

// ── DIFFICULTY SCREEN ─────────────────────────────────────
function buildDiffScreen() {
  const list = $('diff-list');
  if (!list) return;
  list.innerHTML = '';
  Object.entries(DIFFICULTIES).forEach(([key, d]) => {
    const card = document.createElement('div');
    card.className = 'diff-card' + (key === S.diff ? ' selected' : '');
    card.dataset.diff = key;
    card.style.setProperty('--d-color', d.color);
    card.style.setProperty('--d-bg', d.bg);
    card.style.setProperty('--d-border', d.border);

    const tagHTML = key !== 'custom'
      ? `<span class="diff-tag">${d.rows}×${d.cols}</span><span class="diff-tag">${d.mines} minas</span>`
      : `<span class="diff-tag">Configurable</span>`;

    card.innerHTML = `
      <div class="diff-icon">${d.emoji}</div>
      <div class="diff-info">
        <div class="diff-name">${d.label}</div>
        <div class="diff-desc">${key==='custom'?'Define tus propias dimensiones':descForDiff(key)}</div>
        <div class="diff-tags">${tagHTML}</div>
      </div>
      <div class="diff-radio"></div>
    `;
    card.addEventListener('click', () => {
      SFX.click();
      document.querySelectorAll('.diff-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      S.diff = key;
      $('custom-fields').classList.toggle('show', key === 'custom');
    });
    list.appendChild(card);
  });

  on($('btn-diff-back'),  'click', () => { SFX.click(); showScreen('home'); });
  on($('btn-diff-start'), 'click', () => { SFX.click(); startGame(); });
}

function descForDiff(k) {
  return { easy:'Perfecto para comenzar', medium:'Un buen desafío', hard:'Solo para expertos' }[k] || '';
}

// ── GAME START ────────────────────────────────────────────
function startGame() {
  // Read config
  if (S.diff === 'custom') {
    const r = Math.min(Math.max(parseInt($('c-rows')?.value)||9, 5), 30);
    const c = Math.min(Math.max(parseInt($('c-cols')?.value)||9, 5), 50);
    const m = Math.min(Math.max(parseInt($('c-mines')?.value)||10, 1), r*c-9);
    S.rows=r; S.cols=c; S.mines=m;
    DIFFICULTIES.custom.rows=r; DIFFICULTIES.custom.cols=c; DIFFICULTIES.custom.mines=m;
  } else {
    const d = DIFFICULTIES[S.diff];
    S.rows=d.rows; S.cols=d.cols; S.mines=d.mines;
  }

  // Reset state
  S.board=[]; S.revealed=0; S.flags=0;
  S.firstClick=true; S.gameOver=false; S.won=false;
  S.timer=0; clearInterval(S.timerID);

  buildBoard();
  renderBoard();
  updateHUD();
  setStatusMsg('🎯 ¡Encuentra todas las minas!');
  setCellSize();
  showScreen('game');
  updateGameDiffBadge();
}

function buildBoard() {
  S.board = Array.from({length:S.rows}, (_,r) =>
    Array.from({length:S.cols}, (_,c) => ({
      r, c, mine:false, revealed:false, flagged:false, adj:0
    }))
  );
}

function placeMines(safeR, safeC) {
  const safe = new Set();
  for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
    const nr=safeR+dr, nc=safeC+dc;
    if (nr>=0&&nr<S.rows&&nc>=0&&nc<S.cols) safe.add(`${nr},${nc}`);
  }
  let placed=0;
  while (placed < S.mines) {
    const r=Math.floor(Math.random()*S.rows);
    const c=Math.floor(Math.random()*S.cols);
    if (!S.board[r][c].mine && !safe.has(`${r},${c}`)) {
      S.board[r][c].mine=true; placed++;
    }
  }
  // Compute adjacencies
  for (let r=0;r<S.rows;r++) for (let c=0;c<S.cols;c++) {
    if (S.board[r][c].mine) continue;
    let n=0;
    eachNeighbor(r,c,(_,nr,nc)=>{ if(S.board[nr][nc].mine) n++; });
    S.board[r][c].adj=n;
  }
}

function eachNeighbor(r,c,fn) {
  for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
    if(!dr&&!dc) continue;
    const nr=r+dr,nc=c+dc;
    if(nr>=0&&nr<S.rows&&nc>=0&&nc<S.cols) fn(S.board[nr][nc],nr,nc);
  }
}

// ── Board Render ──────────────────────────────────────────
function renderBoard() {
  const board = $('board');
  board.innerHTML='';
  board.style.gridTemplateColumns=`repeat(${S.cols}, var(--cell-size, 36px))`;
  for(let r=0;r<S.rows;r++) for(let c=0;c<S.cols;c++) {
    const el=document.createElement('div');
    el.className='cell';
    el.dataset.r=r; el.dataset.c=c;
    el.addEventListener('click', onCellClick);
    el.addEventListener('contextmenu', onCellRightClick);
    el.addEventListener('touchstart', onTouchStart, {passive:true});
    el.addEventListener('touchend',   onTouchEnd);
    board.appendChild(el);
  }
}

function setCellSize() {
  const root = document.documentElement;
  const maxW = Math.min(window.innerWidth-40, 860);
  const maxCellW = Math.floor((maxW-32-S.cols*3)/S.cols);
  const maxH = window.innerHeight*0.55;
  const maxCellH = Math.floor((maxH-32-S.rows*3)/S.rows);
  let size = Math.min(maxCellW, maxCellH, 40);
  size = Math.max(size, 16);
  const fs = Math.max(Math.floor(size*0.38), 8);
  const r  = Math.max(Math.floor(size*0.22), 4);
  root.style.setProperty('--cell-size', size+'px');
  root.style.setProperty('--cell-fs',   fs+'px');
  root.style.setProperty('--cell-r',    r+'px');
}

function cellEl(r,c) { return $('board').querySelector(`[data-r="${r}"][data-c="${c}"]`); }

function refreshCell(r,c,wave=false,delay=0) {
  const cell=S.board[r][c], el=cellEl(r,c);
  if(!el) return;
  el.className='cell';
  el.innerHTML='';

  if(cell.flagged && !cell.revealed){
    el.classList.add('flagged');
    el.innerHTML=`<span class="flag-icon">🚩</span>`;
    return;
  }
  if(!cell.revealed){ return; }

  if(cell.mine){
    el.classList.add(cell.exploded?'exploded':'mine-revealed');
    el.innerHTML=`<span class="mine-icon">💣</span>`;
    return;
  }

  el.classList.add('revealed');
  if(wave){
    el.classList.add('reveal-wave');
    el.style.animationDelay=delay+'ms';
  }
  if(cell.adj>0){
    el.dataset.n=cell.adj;
    el.textContent=cell.adj;
  }
}

// ── Touch handling (long press = flag) ───────────────────
let _touchTimer=null, _touchMoved=false;
function onTouchStart(e) {
  _touchMoved=false;
  _touchTimer=setTimeout(()=>{
    if(!_touchMoved){
      const el=e.currentTarget;
      onCellRightClick({currentTarget:el, preventDefault:()=>{}});
    }
  },500);
}
function onTouchEnd()  { clearTimeout(_touchTimer); }
document.addEventListener('touchmove',()=>{ _touchMoved=true; clearTimeout(_touchTimer); },{passive:true});

// ── Cell interactions ─────────────────────────────────────
function onCellClick(e) {
  const r=+e.currentTarget.dataset.r, c=+e.currentTarget.dataset.c;
  const cell=S.board[r][c];
  if(S.gameOver||cell.revealed||cell.flagged) return;

  if(S.firstClick){
    S.firstClick=false;
    placeMines(r,c);
    startTimer();
  }

  if(cell.mine){
    cell.revealed=true; cell.exploded=true;
    revealAllMines();
    endGame(false,r,c);
  } else {
    floodReveal(r,c);
    SFX.reveal();
    checkWin();
  }
  updateHUD();
}

function onCellRightClick(e) {
  e.preventDefault();
  const r=+e.currentTarget.dataset.r, c=+e.currentTarget.dataset.c;
  const cell=S.board[r][c];
  if(S.gameOver||cell.revealed) return;
  if(S.firstClick){ S.firstClick=false; placeMines(r,c); startTimer(); }

  if(cell.flagged){
    cell.flagged=false; S.flags--;
    const el=cellEl(r,c);
    el.classList.add('flag-remove');
    setTimeout(()=>refreshCell(r,c),200);
    SFX.unflag();
  } else {
    cell.flagged=true; S.flags++;
    refreshCell(r,c);
    const el=cellEl(r,c);
    el.classList.add('flag-pop');
    SFX.flag();
  }
  updateHUD();
}

// BFS flood-reveal with wave animation
function floodReveal(startR, startC) {
  const queue=[[startR,startC]], visited=new Set();
  const toReveal=[];
  visited.add(`${startR},${startC}`);

  while(queue.length){
    const [r,c]=queue.shift();
    const cell=S.board[r][c];
    if(cell.revealed||cell.flagged||cell.mine) continue;
    cell.revealed=true; S.revealed++;
    toReveal.push({r,c,dist:Math.abs(r-startR)+Math.abs(c-startC)});
    if(cell.adj===0){
      eachNeighbor(r,c,(_,nr,nc)=>{
        const k=`${nr},${nc}`;
        if(!visited.has(k)){ visited.add(k); queue.push([nr,nc]); }
      });
    }
  }

  // Animate with wave delay
  toReveal.forEach(({r,c,dist})=>{
    const delay=Math.min(dist*30,300);
    setTimeout(()=>refreshCell(r,c,true,0),delay);
  });
  if(toReveal.length>1) SFX.reveal();
}

function revealAllMines() {
  for(let r=0;r<S.rows;r++) for(let c=0;c<S.cols;c++){
    const cell=S.board[r][c];
    if(cell.mine&&!cell.revealed){ cell.revealed=true; setTimeout(()=>refreshCell(r,c),Math.random()*600); }
  }
}

function checkWin() {
  const totalSafe=S.rows*S.cols-S.mines;
  if(S.revealed>=totalSafe) endGame(true);
}

function endGame(won, explR, explC) {
  S.gameOver=true; S.won=won;
  clearInterval(S.timerID);

  // Update stats
  S.stats[S.diff].total++;
  if(won){
    S.stats[S.diff].won++;
    const prev=S.stats[S.diff].bestTime;
    if(prev==null||S.timer<prev) S.stats[S.diff].bestTime=S.timer;
  } else {
    S.stats[S.diff].lost++;
  }
  const d=DIFFICULTIES[S.diff];
  S.history.unshift({ diff:S.diff, label:d.label, won, time:S.timer, date:new Date().toLocaleDateString() });
  if(S.history.length>20) S.history.pop();
  saveData();
  updateHomeBests();

  if(won){
    setStatusMsg('🏆 ¡Ganaste! ¡Todas las minas encontradas!','win');
    setTimeout(()=>{ SFX.win(); showEndModal(true); launchConfetti(); }, 400);
  } else {
    setStatusMsg('💥 ¡Boom! Pisaste una mina.','lose');
    if(explR!=null) explodeEffect(explR,explC);
    setTimeout(()=>{ showEndModal(false); }, 2200);
  }
}

// ── Timer ─────────────────────────────────────────────────
function startTimer() {
  clearInterval(S.timerID);
  S.timerID=setInterval(()=>{
    S.timer++;
    updateTimerDisplay();
    if(S.timer>999) clearInterval(S.timerID);
    if(S.timer>=60&&S.timer%10===0&&!S.gameOver) SFX.tick();
  },1000);
}

function updateTimerDisplay() {
  const el=$('hud-timer');
  if(!el) return;
  el.textContent=formatTime(S.timer);
  el.classList.toggle('warn', S.timer>120&&!S.won);
}

function formatTime(s) {
  const m=Math.floor(s/60), sec=s%60;
  return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
}

// ── HUD ───────────────────────────────────────────────────
function updateHUD() {
  const minesLeft=S.mines-S.flags;
  const el=$('hud-mines');
  if(el){ el.textContent=minesLeft; el.classList.toggle('danger',minesLeft<0); }
  updateTimerDisplay();
}

function updateGameDiffBadge() {
  const b=$('game-diff-badge');
  if(!b) return;
  const d=DIFFICULTIES[S.diff];
  b.textContent=d.label;
  b.style.background=d.bg;
  b.style.color=d.color;
  b.style.border=`1.5px solid ${d.border}`;
}

function setStatusMsg(msg, type='') {
  const el=$('status-msg');
  if(!el) return;
  el.textContent=msg;
  el.className='status-msg'+(type?' '+type:'');
}

// ── Modals ────────────────────────────────────────────────
function bindModals() {
  on($('btn-restart'), 'click', () => { SFX.click(); closeModals(); startGame(); });
  on($('btn-home'),    'click', () => { SFX.click(); clearInterval(S.timerID); closeModals(); showScreen('home'); });

  on($('end-btn-replay'), 'click', () => { SFX.click(); closeModals(); startGame(); });
  on($('end-btn-menu'),   'click', () => { SFX.click(); clearInterval(S.timerID); closeModals(); showScreen('home'); updateHomeBests(); });

  on($('stats-close'), 'click', closeModals);

  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if(e.target===o) closeModals(); });
  });

  on($('btn-sound-game'), 'click', toggleSound);
}

function showEndModal(won) {
  const mo=$('end-modal');
  $('end-icon').textContent   = won ? '🏆' : '💣';
  $('end-title').textContent  = won ? '¡Ganaste!' : '¡Boom!';
  $('end-title').className    = 'modal-title '+(won?'win':'lose');
  $('end-sub').textContent    = won
    ? `Completaste el tablero en ${formatTime(S.timer)}.`
    : 'Una mina te atrapó. ¡Inténtalo de nuevo!';
  $('end-time').textContent   = formatTime(S.timer);
  $('end-flags').textContent  = S.flags;
  $('end-revealed').textContent=S.revealed;
  const best=S.stats[S.diff].bestTime;
  $('end-best').textContent   = best!=null?formatTime(best):'--:--';
  mo.classList.add('show');
}

function showStatsModal() {
  const mo=$('stats-modal');
  // Fill stats
  ['easy','medium','hard'].forEach(d=>{
    const st=S.stats[d];
    const pct=st.total>0?Math.round(st.won/st.total*100):0;
    const el=$(`sstat-${d}`);
    if(el) el.innerHTML=`
      <div class="stat-item"><div class="stat-item-v">${st.won}</div><div class="stat-item-l">Ganadas</div></div>
      <div class="stat-item"><div class="stat-item-v">${st.lost}</div><div class="stat-item-l">Perdidas</div></div>
      <div class="stat-item"><div class="stat-item-v">${pct}%</div><div class="stat-item-l">Victorias</div></div>
      <div class="stat-item"><div class="stat-item-v">${st.bestTime!=null?formatTime(st.bestTime):'--'}</div><div class="stat-item-l">Mejor tiempo</div></div>
    `;
  });
  // History
  const hist=$('history-list');
  if(hist){
    hist.innerHTML=S.history.length===0
      ? '<div style="text-align:center;color:var(--txt3);font-size:12px;padding:12px;">Sin partidas aún</div>'
      : S.history.map(h=>`
        <div class="history-item">
          <span class="history-result">${h.won?'🏆':'💣'}</span>
          <div class="history-info">
            <div class="history-name">${DIFFICULTIES[h.diff].label}</div>
            <div class="history-meta">${h.date}</div>
          </div>
          <span class="history-time">${formatTime(h.time)}</span>
        </div>
      `).join('');
  }
  mo.classList.add('show');
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(o=>o.classList.remove('show'));
}

function bindGame() {
  on($('btn-game-home'), 'click', () => { SFX.click(); clearInterval(S.timerID); closeModals(); showScreen('home'); updateHomeBests(); });
}

// ── Effects ───────────────────────────────────────────────
function launchConfetti() {
  const cols=['#3b82f6','#60a5fa','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];
  for(let i=0;i<80;i++){
    const el=document.createElement('div');
    el.className='confetti-piece';
    const size=6+Math.random()*10;
    el.style.cssText=`
      left:${Math.random()*100}vw;top:-20px;
      width:${size}px;height:${size}px;
      background:${cols[Math.floor(Math.random()*cols.length)]};
      border-radius:${Math.random()>0.5?'50%':'2px'};
      --dx:${(Math.random()-.5)*260}px;
      --r:${Math.random()*720}deg;
      --d:${1.5+Math.random()*2}s;
      --dl:${Math.random()*.8}s;
    `;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),3600);
  }
}

function explodeEffect(r,c) {
  // ── Sonido bomba atómica ───────────────────────────────
  atomicSound();

  // ── Shake brutal al tablero ────────────────────────────
  const board = $('board');
  board.classList.add('board-shake');
  setTimeout(() => board.classList.remove('board-shake'), 900);

  // ── Canvas de explosión a pantalla completa ───────────
  const canvas = document.createElement('canvas');
  canvas.className = 'atomic-canvas';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const el = cellEl(r,c);
  const rect = el ? el.getBoundingClientRect() : {left: window.innerWidth/2, top: window.innerHeight/2, width:0, height:0};
  const ox = rect.left + rect.width  / 2;
  const oy = rect.top  + rect.height / 2;

  // Partículas de fuego
  const particles = [];
  for (let i = 0; i < 180; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 2 + Math.random() * 9;
    particles.push({
      x: ox, y: oy,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - (2 + Math.random()*4),
      life: 1,
      decay: 0.012 + Math.random() * 0.018,
      size: 6 + Math.random() * 18,
      hue: 15 + Math.random() * 40   // naranja-rojo
    });
  }

  // Estado del hongo
  const mush = { progress: 0, capR: 0, stemH: 0, ringR: 0, ringY: oy };
  let frame = 0;
  const totalFrames = 120;

  function drawFrame() {
    frame++;
    const t = frame / totalFrames;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1) Flash blanco cegador al inicio
    if (t < 0.12) {
      const alpha = (0.12 - t) / 0.12;
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2) Onda de choque circular
    if (t > 0.02 && t < 0.45) {
      const wt     = (t - 0.02) / 0.43;
      const wR     = wt * Math.max(canvas.width, canvas.height) * 0.85;
      const wAlpha = Math.max(0, 0.6 - wt * 0.6);
      ctx.beginPath();
      ctx.arc(ox, oy, wR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,180,60,${wAlpha})`;
      ctx.lineWidth   = 6 * (1 - wt) + 1;
      ctx.stroke();
    }

    // 3) Partículas de fuego
    particles.forEach(p => {
      p.x  += p.vx * (1 - t * 0.4);
      p.y  += p.vy;
      p.vy += 0.12;          // gravedad leve
      p.life -= p.decay;
      if (p.life <= 0) return;
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * p.life);
      grd.addColorStop(0, `hsla(${p.hue},100%,90%,${p.life})`);
      grd.addColorStop(0.4, `hsla(${p.hue},100%,55%,${p.life * 0.8})`);
      grd.addColorStop(1,   `hsla(${p.hue + 20},80%,20%,0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    });

    // 4) Hongo atómico (empieza en t=0.15)
    if (t > 0.15) {
      const mt  = Math.min((t - 0.15) / 0.6, 1);
      const easeOut = 1 - Math.pow(1 - mt, 3);

      // Tallo
      const stemW  = 28 + easeOut * 60;
      const stemTop = oy - easeOut * canvas.height * 0.72;
      const stemGrd = ctx.createLinearGradient(ox - stemW, 0, ox + stemW, 0);
      stemGrd.addColorStop(0,   'rgba(255,100,20,0)');
      stemGrd.addColorStop(0.3, `rgba(255,160,40,${0.7 * easeOut})`);
      stemGrd.addColorStop(0.5, `rgba(255,220,100,${0.9 * easeOut})`);
      stemGrd.addColorStop(0.7, `rgba(255,160,40,${0.7 * easeOut})`);
      stemGrd.addColorStop(1,   'rgba(255,100,20,0)');
      ctx.fillStyle = stemGrd;
      ctx.fillRect(ox - stemW, stemTop, stemW * 2, oy - stemTop);

      // Toro / anillo en la base del tallo
      const ringY = oy - easeOut * canvas.height * 0.22;
      const ringR  = 30 + easeOut * 110;
      const ringGrd = ctx.createRadialGradient(ox, ringY, ringR * 0.3, ox, ringY, ringR);
      ringGrd.addColorStop(0,   `rgba(255,200,80,${0.5 * easeOut})`);
      ringGrd.addColorStop(0.5, `rgba(255,120,20,${0.4 * easeOut})`);
      ringGrd.addColorStop(1,   'rgba(200,60,0,0)');
      ctx.beginPath();
      ctx.ellipse(ox, ringY, ringR, ringR * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = ringGrd;
      ctx.fill();

      // Copa del hongo
      const capR  = 60 + easeOut * Math.min(canvas.width, canvas.height) * 0.38;
      const capY  = stemTop + capR * 0.45;
      const capGrd = ctx.createRadialGradient(ox, capY, 0, ox, capY, capR);
      capGrd.addColorStop(0,   `rgba(255,240,160,${0.95 * easeOut})`);
      capGrd.addColorStop(0.25,`rgba(255,160,40,${0.85 * easeOut})`);
      capGrd.addColorStop(0.55,`rgba(200,60,10,${0.7 * easeOut})`);
      capGrd.addColorStop(0.8, `rgba(80,20,0,${0.5 * easeOut})`);
      capGrd.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.ellipse(ox, capY, capR, capR * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = capGrd;
      ctx.fill();

      // Borde inferior de la copa (cara más oscura)
      const rimGrd = ctx.createRadialGradient(ox, capY + capR * 0.3, capR * 0.2, ox, capY + capR * 0.3, capR);
      rimGrd.addColorStop(0,   `rgba(120,40,0,${0.5 * easeOut})`);
      rimGrd.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.ellipse(ox, capY + capR * 0.35, capR * 0.85, capR * 0.22, 0, 0, Math.PI * 2);
      ctx.fillStyle = rimGrd;
      ctx.fill();
    }

    // 5) Fade-out general al final
    if (t > 0.72) {
      const alpha = (t - 0.72) / 0.28;
      ctx.fillStyle = `rgba(0,0,0,${alpha * 0.85})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (frame < totalFrames) {
      requestAnimationFrame(drawFrame);
    } else {
      // Fade out suave del canvas
      canvas.style.transition = 'opacity .6s';
      canvas.style.opacity    = '0';
      setTimeout(() => canvas.remove(), 700);
    }
  }

  requestAnimationFrame(drawFrame);

  // Partículas clásicas también
  burstParticles(r, c);
}

// ── Sonido bomba atómica ───────────────────────────────────
function atomicSound() {
  try {
    const c = ac();
    const now = c.currentTime;

    // Sub-bajo: impacto profundo
    const sub = c.createOscillator();
    const subG = c.createGain();
    sub.connect(subG); subG.connect(c.destination);
    sub.type = 'sine';
    sub.frequency.setValueAtTime(55, now);
    sub.frequency.exponentialRampToValueAtTime(18, now + 1.5);
    subG.gain.setValueAtTime(0, now);
    subG.gain.linearRampToValueAtTime(1.2, now + 0.03);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
    sub.start(now); sub.stop(now + 2.2);

    // Ruido blanco (la onda de choque)
    const bufSize = c.sampleRate * 2.5;
    const buf     = c.createBuffer(1, bufSize, c.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise   = c.createBufferSource();
    noise.buffer  = buf;

    // Filtro paso-bajo para el ruido (más grave, como explosión real)
    const lpf = c.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(2400, now);
    lpf.frequency.exponentialRampToValueAtTime(180, now + 1.2);

    const noiseG = c.createGain();
    noise.connect(lpf); lpf.connect(noiseG); noiseG.connect(c.destination);
    noiseG.gain.setValueAtTime(0, now);
    noiseG.gain.linearRampToValueAtTime(0.9, now + 0.05);
    noiseG.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    noise.start(now); noise.stop(now + 2.5);

    // Mid-boom (cuerpo de la explosión)
    const mid = c.createOscillator();
    const midG = c.createGain();
    mid.connect(midG); midG.connect(c.destination);
    mid.type = 'sawtooth';
    mid.frequency.setValueAtTime(120, now);
    mid.frequency.exponentialRampToValueAtTime(30, now + 0.8);
    midG.gain.setValueAtTime(0, now);
    midG.gain.linearRampToValueAtTime(0.7, now + 0.04);
    midG.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    mid.start(now); mid.stop(now + 1.2);

    // Reverb simple: delay+feedback para cola de explosión
    const delay = c.createDelay(0.5);
    delay.delayTime.value = 0.18;
    const fbG = c.createGain();
    fbG.gain.value = 0.35;
    noiseG.connect(delay);
    delay.connect(fbG);
    fbG.connect(delay);
    fbG.connect(c.destination);

  } catch(e) {}
}

function burstParticles(r,c) {
  const el=cellEl(r,c);
  if(!el) return;
  const rect=el.getBoundingClientRect();
  const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
  const cols=['#ef4444','#f97316','#fbbf24','#ff6b6b'];
  for(let i=0;i<20;i++){
    const p=document.createElement('div');
    p.className='particle';
    const angle=Math.random()*Math.PI*2;
    const dist=40+Math.random()*80;
    const size=4+Math.random()*8;
    p.style.cssText=`
      left:${cx}px;top:${cy}px;
      width:${size}px;height:${size}px;
      background:${cols[Math.floor(Math.random()*cols.length)]};
      --dx:${Math.cos(angle)*dist}px;
      --dy:${Math.sin(angle)*dist-40}px;
      --d:${.5+Math.random()*.5}s;
      --dl:${Math.random()*.2}s;
    `;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),900);
  }
}

// ── Theme & Sound ─────────────────────────────────────────
function toggleTheme() {
  const cur=document.documentElement.getAttribute('data-theme');
  const next=cur==='dark'?'':'dark';
  document.documentElement.setAttribute('data-theme',next);
  const icons=['btn-theme','btn-theme-game'];
  icons.forEach(id=>{ const el=$(id); if(el) el.textContent=next==='dark'?'☀️':'🌙'; });
  try{localStorage.setItem('ms_theme',next);}catch(e){}
}

function toggleSound() {
  S.soundOn=!S.soundOn;
  ['btn-sound-home','btn-sound-game'].forEach(id=>{
    const el=$(id);
    if(el) el.textContent=S.soundOn?'🔊':'🔇';
  });
  try{localStorage.setItem('ms_sound',S.soundOn?'1':'0');}catch(e){}
}

// ── Persistence ───────────────────────────────────────────
function saveData() {
  try {
    localStorage.setItem('ms_stats',   JSON.stringify(S.stats));
    localStorage.setItem('ms_history', JSON.stringify(S.history));
    console.log("Datos guardados correctamente:", S.stats); // Consola para verificar
  } catch(e) {
    console.error("Error al guardar en localStorage", e);
  }
}

function loadData() {
  try {
    const st = localStorage.getItem('ms_stats');
    if (st) S.stats = JSON.parse(st);
    
    const h = localStorage.getItem('ms_history');
    if (h) S.history = JSON.parse(h);
    
    const t = localStorage.getItem('ms_theme');
    if (t) {
      document.documentElement.setAttribute('data-theme', t);
      ['btn-theme', 'btn-theme-game'].forEach(id => { const el = $(id); if (el) el.textContent = t === 'dark' ? '☀️' : '🌙'; });
    }
    
    const snd = localStorage.getItem('ms_sound');
    if (snd) {
      S.soundOn = snd === '1';
      ['btn-sound-home', 'btn-sound-game'].forEach(id => { const el = $(id); if (el) el.textContent = S.soundOn ? '🔊' : '🔇'; });
    }
  } catch(e) {
    console.error("Error al cargar de localStorage", e);
  }
}

// ── Boot ──────────────────────────────────────────────────
// Ejecutamos init de inmediato si el DOM ya está listo, o esperamos al evento
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('resize', () => { if (S.screen === 'game') setCellSize(); });

