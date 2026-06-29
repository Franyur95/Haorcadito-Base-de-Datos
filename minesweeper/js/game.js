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
  lose()    { [300,220,180].forEach((n,i)=>setTimeout(()=>tone(n,'sawtooth',.3,.15),i*120)); },
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
    if(explR!=null) burstParticles(explR,explC);
    setTimeout(()=>{ SFX.lose(); showEndModal(false); }, 800);
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

