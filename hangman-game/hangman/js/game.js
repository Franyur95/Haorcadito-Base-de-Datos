/* ================================================
   HANGMAN GAME — COMPLETE GAME LOGIC
   ================================================ */

'use strict';

// ── Word Bank ──────────────────────────────────────────
const WORD_BANK = {
  Animales: {
    easy:   ['gato','perro','pato','vaca','oso','pez','rana','toro','leon','mono'],
    medium: ['jirafa','delfin','caballo','ballena','serpiente','tortuga','conejo','pajaro','elefante','gorila'],
    hard:   ['rinoceronte','hipopotamo','chimpance','cocodrilo','salamandra','mariposa','avestruz','escorpion','camaleeon','ornitorrinco']
  },
  Paises: {
    easy:   ['peru','cuba','chile','iran','irak','japon','china','india','rusia','mali'],
    medium: ['brasil','mexico','espana','Francia','canada','suecia','turquia','argelia','vietnam','nigeria'],
    hard:   ['mozambique','azerbaiyan','liechtenstein','kazajistan','zimbabue','madagascar','banglades','tayikistan','micronesia','kirguistan']
  },
  Tecnología: {
    easy:   ['web','byte','html','wifi','dato','chip','red','usb','app','cpu'],
    medium: ['python','android','bitcoin','teclado','monitor','nuvola','impresora','ethernet','servidor','software'],
    hard:   ['javascript','inteligencia','ciberseguridad','electronica','programacion','blockchain','nanotecnologia','microprocesador','virtualidad','videojuego']
  },
  Deportes: {
    easy:   ['gol','tiro','remo','polo','surf','judo','golf','pala','ruta','aros'],
    medium: ['futbol','tenis','beisbol','voleibol','natacion','ciclismo','atletismo','gimnasia','esgrima','escalada'],
    hard:   ['baloncesto','balonmano','automovilismo','lanzamiento','saltatura','pentathlon','halterofilia','waterpolo','taekwondo','powerlifting']
  },
  Comida: {
    easy:   ['pan','sal','ajo','uva','sopa','leche','queso','arroz','pollo','fresa'],
    medium: ['naranja','manzana','tomate','zanahoria','espinaca','aguacate','empanada','gazpacho','ensalada','chocolate'],
    hard:   ['saltimbocca','bouillabaisse','guacamole','chimichurri','stroganoff','moussaka','carbonara','ceviche','paella','ratatouille']
  },
  Ciencia: {
    easy:   ['atomo','luz','gas','sol','luna','lava','polo','gen','ley','ion'],
    medium: ['celula','orbita','energia','gravedad','volcanes','proteina','photon','eclipse','erosion','quimico'],
    hard:   ['fotosintesis','termodinamica','cromosoma','ecosistema','relatividad','antimateria','electromagnetismo','nanotecnologia','biodiversidad','cristalografia']
  }
};

const WORD_HINTS = {
  Animales: 'Un ser vivo del reino animal',
  Paises: 'Un país del mundo',
  'Tecnología': 'Relacionado con la tecnología',
  Deportes: 'Un deporte o actividad física',
  Comida: 'Algo que se come o bebe',
  Ciencia: 'Término científico'
};

// Parts: head, body, arm-r, arm-l, leg-r, leg-l, eye-l, eye-r, mouth
const MAX_WRONG = {easy: 9, medium: 7, hard: 5};
const SCORE_BASE = {easy: 50, medium: 100, hard: 200};
const SCORE_PER_LETTER = 10;
const SCORE_TIME_BONUS = 2;
const TIMER_SECONDS = {easy: 120, medium: 90, hard: 60};

// ── State ──────────────────────────────────────────────
const state = {
  word: '',
  category: 'Animales',
  difficulty: 'medium',
  guessedLetters: new Set(),
  wrongLetters: [],
  attemptsLeft: 7,
  maxAttempts: 7,
  score: 0,
  stats: { played: 0, won: 0, lost: 0 },
  timerInterval: null,
  timeLeft: 90,
  gameActive: false,
  theme: 'dark'
};

// ── Audio ──────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTone(frequency, type, duration, volume = 0.15) {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

const SFX = {
  correct() {
    playTone(523, 'sine', 0.12, 0.2);
    setTimeout(() => playTone(659, 'sine', 0.15, 0.2), 80);
    setTimeout(() => playTone(784, 'sine', 0.18, 0.2), 160);
  },
  wrong() {
    playTone(200, 'sawtooth', 0.2, 0.12);
    setTimeout(() => playTone(150, 'sawtooth', 0.3, 0.12), 100);
  },
  win() {
    const notes = [523,659,784,1047,1319];
    notes.forEach((n, i) => setTimeout(() => playTone(n, 'sine', 0.25, 0.25), i * 100));
  },
  lose() {
    const notes = [400,350,300,250];
    notes.forEach((n, i) => setTimeout(() => playTone(n, 'sawtooth', 0.3, 0.18), i * 120));
  },
  tick() { playTone(880, 'square', 0.05, 0.06); }
};

// ── DOM refs ───────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Init ───────────────────────────────────────────────
function init() {
  loadStats();
  loadTheme();
  buildKeyboard();
  setupEventListeners();
  startNewGame();
}

function setupEventListeners() {
  $('btn-new-game').addEventListener('click', startNewGame);
  $('btn-theme').addEventListener('click', toggleTheme);

  document.querySelectorAll('.pill[data-difficulty]').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.pill[data-difficulty]').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      state.difficulty = p.dataset.difficulty;
      startNewGame();
    });
  });

  document.querySelectorAll('.pill[data-category]').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.pill[data-category]').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      state.category = p.dataset.category;
      startNewGame();
    });
  });

  $('modal-btn-play').addEventListener('click', () => {
    closeModal();
    startNewGame();
  });

  document.addEventListener('keydown', e => {
    if (!state.gameActive) return;
    const letter = e.key.toLowerCase();
    if (/^[a-záéíóúüñ]$/.test(letter)) guessLetter(letter);
  });
}

// ── Game Logic ─────────────────────────────────────────
function startNewGame() {
  clearInterval(state.timerInterval);

  const pool = WORD_BANK[state.category][state.difficulty];
  state.word = pool[Math.floor(Math.random() * pool.length)].toLowerCase();
  state.guessedLetters = new Set();
  state.wrongLetters = [];
  state.maxAttempts = MAX_WRONG[state.difficulty];
  state.attemptsLeft = state.maxAttempts;
  state.timeLeft = TIMER_SECONDS[state.difficulty];
  state.gameActive = true;

  renderAll();
  startTimer();
  updateAttempts();
}

function guessLetter(letter) {
  if (!state.gameActive || state.guessedLetters.has(letter)) return;
  state.guessedLetters.add(letter);

  const keyEl = document.querySelector(`.key-btn[data-letter="${letter}"]`);

  if (state.word.includes(letter)) {
    SFX.correct();
    if (keyEl) keyEl.classList.add('correct');
    const pts = SCORE_PER_LETTER + (state.difficulty === 'hard' ? 5 : 0);
    addScore(pts);
    revealLetters(letter);
    checkWin();
  } else {
    SFX.wrong();
    state.wrongLetters.push(letter);
    state.attemptsLeft--;
    if (keyEl) { keyEl.classList.add('wrong'); keyEl.classList.add('shake'); }
    setTimeout(() => keyEl && keyEl.classList.remove('shake'), 450);
    addWrongLetterChip(letter);
    updateHangman();
    updateAttempts();
    flashDanger();
    checkLoss();
  }
}

function checkWin() {
  const revealed = [...state.word].every(l => state.guessedLetters.has(l));
  if (!revealed) return;
  state.gameActive = false;
  clearInterval(state.timerInterval);
  state.stats.played++;
  state.stats.won++;
  saveStats();
  const timeBonus = state.timeLeft * SCORE_TIME_BONUS;
  addScore(SCORE_BASE[state.difficulty] + timeBonus);
  setTimeout(() => {
    SFX.win();
    showModal('win', timeBonus);
    launchConfetti();
  }, 400);
  updateStatsBar();
}

function checkLoss() {
  if (state.attemptsLeft > 0) return;
  state.gameActive = false;
  clearInterval(state.timerInterval);
  state.stats.played++;
  state.stats.lost++;
  saveStats();
  setTimeout(() => { SFX.lose(); showModal('lose'); }, 400);
  updateStatsBar();
  revealAllLetters();
}

function addScore(pts) {
  state.score += pts;
  const el = $('score-value');
  if (el) {
    el.textContent = state.score;
    el.classList.remove('score-pulse');
    void el.offsetWidth;
    el.classList.add('score-pulse');
  }
}

// ── Timer ──────────────────────────────────────────────
function startTimer() {
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    if (!state.gameActive) return;
    state.timeLeft--;
    updateTimerDisplay();
    if (state.timeLeft <= 10) SFX.tick();
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.attemptsLeft = 0;
      checkLoss();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = $('timer-display');
  if (!el) return;
  const m = Math.floor(state.timeLeft / 60).toString().padStart(2, '0');
  const s = (state.timeLeft % 60).toString().padStart(2, '0');
  el.textContent = `${m}:${s}`;
  el.classList.toggle('urgent', state.timeLeft <= 15);
}

// ── Render ─────────────────────────────────────────────
function renderAll() {
  renderWordDisplay();
  renderKeyboard();
  updateHangman();
  updateAttempts();
  renderWrongLetters();
  updateStatsBar();
  $('category-badge-text').textContent = `${getCategoryEmoji(state.category)} ${state.category}`;
  $('word-hint').textContent = WORD_HINTS[state.category] || '';
}

function renderWordDisplay() {
  const container = $('word-display');
  container.innerHTML = '';
  [...state.word].forEach(letter => {
    const slot = document.createElement('div');
    slot.className = 'letter-slot';
    slot.dataset.letter = letter;

    const char = document.createElement('span');
    char.className = 'letter-char';
    char.textContent = letter;
    if (state.guessedLetters.has(letter)) {
      char.classList.add('revealed');
      slot.classList.add('correct');
    }

    const line = document.createElement('div');
    line.className = 'letter-underline';

    slot.appendChild(char);
    slot.appendChild(line);
    container.appendChild(slot);
  });
}

function revealLetters(letter) {
  document.querySelectorAll(`.letter-slot[data-letter="${letter}"]`).forEach(slot => {
    slot.classList.add('correct');
    slot.querySelector('.letter-char').classList.add('revealed');
    slot.classList.add('glow-success');
    setTimeout(() => slot.classList.remove('glow-success'), 700);
  });
}

function revealAllLetters() {
  document.querySelectorAll('.letter-slot').forEach(slot => {
    const char = slot.querySelector('.letter-char');
    char.classList.add('revealed');
    if (!slot.classList.contains('correct')) {
      char.style.color = 'var(--accent-danger)';
    }
  });
}

function renderKeyboard() {
  document.querySelectorAll('.key-btn').forEach(btn => {
    const l = btn.dataset.letter;
    btn.className = 'key-btn';
    if (state.guessedLetters.has(l)) {
      btn.classList.add(state.word.includes(l) ? 'correct' : 'wrong');
      btn.disabled = true;
    } else {
      btn.disabled = false;
    }
  });
}

function renderWrongLetters() {
  const container = $('wrong-letters-grid');
  container.innerHTML = '';
  state.wrongLetters.forEach(l => {
    const chip = document.createElement('span');
    chip.className = 'wrong-letter-chip';
    chip.textContent = l;
    container.appendChild(chip);
  });
}

function addWrongLetterChip(letter) {
  const container = $('wrong-letters-grid');
  const chip = document.createElement('span');
  chip.className = 'wrong-letter-chip';
  chip.textContent = letter;
  container.appendChild(chip);
}

// ── Hangman SVG ────────────────────────────────────────
const HANGMAN_PARTS = [
  'hm-head','hm-body','hm-arm-r','hm-arm-l','hm-leg-r','hm-leg-l','hm-eye-l','hm-eye-r','hm-mouth'
];

function updateHangman() {
  const wrongCount = state.wrongLetters.length;
  const totalParts = HANGMAN_PARTS.length;
  const maxW = state.maxAttempts;
  const partsToShow = Math.floor((wrongCount / maxW) * totalParts);

  HANGMAN_PARTS.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('visible', i < partsToShow);
  });

  if (state.attemptsLeft === 0) {
    HANGMAN_PARTS.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('visible');
        el.style.stroke = 'var(--accent-danger)';
      }
    });
  } else {
    HANGMAN_PARTS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.stroke = '';
    });
  }
}

function updateAttempts() {
  const el = $('attempts-number');
  if (el) {
    el.textContent = state.attemptsLeft;
    el.style.color = state.attemptsLeft <= 2
      ? 'var(--accent-danger)'
      : state.attemptsLeft <= state.maxAttempts / 2
        ? 'var(--accent-warn)'
        : 'var(--text-primary)';
  }

  // ring progress
  const ring = $('attempts-ring-fill');
  if (ring) {
    const r = 36;
    const circ = 2 * Math.PI * r;
    const pct = state.attemptsLeft / state.maxAttempts;
    ring.style.strokeDasharray = circ;
    ring.style.strokeDashoffset = circ * (1 - pct);
    ring.style.stroke = pct <= 0.25
      ? 'var(--accent-danger)'
      : pct <= 0.5
        ? 'var(--accent-warn)'
        : 'var(--accent-blue)';
  }
}

function flashDanger() {
  const panel = document.querySelector('.gallows-panel');
  if (!panel) return;
  panel.classList.remove('flash-danger');
  void panel.offsetWidth;
  panel.classList.add('flash-danger');
  setTimeout(() => panel.classList.remove('flash-danger'), 500);
}

// ── Stats ──────────────────────────────────────────────
function updateStatsBar() {
  const sv = $('score-value');
  if (sv) sv.textContent = state.score;
  const w = $('wins-value');
  if (w) w.textContent = state.stats.won;
  const l = $('losses-value');
  if (l) l.textContent = state.stats.lost;
  const p = $('played-value');
  if (p) p.textContent = state.stats.played;
}

function loadStats() {
  try {
    const saved = localStorage.getItem('hangman_stats');
    if (saved) Object.assign(state.stats, JSON.parse(saved));
    const savedScore = localStorage.getItem('hangman_score');
    if (savedScore) state.score = parseInt(savedScore) || 0;
  } catch(e) {}
}

function saveStats() {
  try {
    localStorage.setItem('hangman_stats', JSON.stringify(state.stats));
    localStorage.setItem('hangman_score', state.score);
  } catch(e) {}
}

// ── Modal ──────────────────────────────────────────────
function showModal(type, timeBonus = 0) {
  const overlay = $('modal-overlay');
  const icon = $('modal-icon');
  const title = $('modal-title');
  const subtitle = $('modal-subtitle');
  const wordReveal = $('modal-word');
  const bonusEl = $('modal-time-bonus');
  const winsEl = $('modal-total-wins');
  const playedEl = $('modal-total-played');

  if (type === 'win') {
    icon.textContent = '🏆';
    title.textContent = '¡GANASTE!';
    title.className = 'modal-title win';
    subtitle.textContent = `¡Excelente trabajo! Adivinaste la palabra${timeBonus > 0 ? ` y ganaste +${timeBonus} puntos de tiempo` : '.'}.`;
  } else {
    icon.textContent = '💀';
    title.textContent = 'PERDISTE';
    title.className = 'modal-title lose';
    subtitle.textContent = 'Sin más intentos. ¡La próxima vez lo lograrás!';
  }

  wordReveal.textContent = state.word.toUpperCase();
  if (bonusEl) bonusEl.textContent = `+${timeBonus}`;
  if (winsEl) winsEl.textContent = state.stats.won;
  if (playedEl) playedEl.textContent = state.stats.played;

  overlay.classList.add('show');
}

function closeModal() {
  $('modal-overlay').classList.remove('show');
}

// ── Confetti ───────────────────────────────────────────
function launchConfetti() {
  const colors = ['#2979ff','#00e5ff','#00e676','#ffc400','#ff6d00','#ea80fc'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left: ${Math.random() * 100}vw;
      top: -20px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      --dx: ${(Math.random() - 0.5) * 200}px;
      --rot: ${Math.random() * 720}deg;
      --dur: ${1.5 + Math.random() * 2}s;
      --delay: ${Math.random() * 0.8}s;
      width: ${6 + Math.random() * 10}px;
      height: ${6 + Math.random() * 10}px;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

// ── Theme ──────────────────────────────────────────────
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme === 'light' ? 'light' : '');
  $('btn-theme').textContent = state.theme === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem('hangman_theme', state.theme); } catch(e) {}
}

function loadTheme() {
  try {
    const t = localStorage.getItem('hangman_theme');
    if (t) {
      state.theme = t;
      if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
      $('btn-theme').textContent = t === 'dark' ? '☀️' : '🌙';
    }
  } catch(e) {}
}

// ── Keyboard builder ───────────────────────────────────
function buildKeyboard() {
  const letters = 'abcdefghijklmnñopqrstuvwxyz'.split('');
  const grid = $('keyboard-grid');
  grid.innerHTML = '';
  letters.forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'key-btn';
    btn.dataset.letter = l;
    btn.textContent = l;
    btn.setAttribute('aria-label', `Letra ${l.toUpperCase()}`);
    btn.addEventListener('click', () => guessLetter(l));
    grid.appendChild(btn);
  });
}

// ── Helpers ────────────────────────────────────────────
function getCategoryEmoji(cat) {
  const map = {
    'Animales': '🐾',
    'Paises': '🌍',
    'Tecnología': '💻',
    'Deportes': '⚽',
    'Comida': '🍕',
    'Ciencia': '🔬'
  };
  return map[cat] || '📚';
}

// ── Boot ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
