# 💀 Ahorcado — Adivina la Palabra

Juego de Ahorcado con diseño estilo arcade moderno. Desarrollado con HTML5, CSS3 y JavaScript Vanilla.

## 📁 Estructura del Proyecto

```
hangman/
├── index.html          ← Página principal del juego
├── css/
│   └── style.css       ← Estilos CSS completos (glassmorphism, animaciones, responsive)
├── js/
│   └── game.js         ← Lógica completa del juego en JavaScript Vanilla
├── assets/
│   └── sounds/         ← (Reservado para futuros archivos de audio)
└── README.md           ← Este archivo
```

## 🎮 Características

- **6 categorías:** Animales, Países, Tecnología, Deportes, Comida, Ciencia
- **3 dificultades:** Fácil (9 vidas, 2 min), Medio (7 vidas, 90 s), Difícil (5 vidas, 60 s)
- **Diseño glassmorphism** con fondo animado tipo rejilla cibernética
- **Teclado virtual** + soporte para teclado físico
- **Dibujo SVG animado** del ahorcado (9 partes que aparecen progresivamente)
- **Anillo de vida** con indicador visual circular
- **Temporizador** con alerta urgente y bono de puntos por rapidez
- **Sistema de puntos** con bono por tiempo y dificultad
- **Estadísticas persistentes** guardadas en localStorage
- **Modo oscuro / claro** con toggle
- **Efectos de sonido** generados por Web Audio API (sin archivos externos)
- **Modal de victoria/derrota** con confetti animado
- **100% responsive** — funciona en móvil, tablet y escritorio
- **Accesibilidad** — aria-labels, roles, navegación por teclado

## 🚀 Cómo abrir

### Opción A — Abrir directamente en el navegador
Haz doble clic en `index.html` para abrirlo en tu navegador.

### Opción B — Servidor local con Python (recomendado)

```bash
# Python 3
cd hangman
python -m http.server 8080

# Luego abre en tu navegador:
# http://localhost:8080
```

### Opción C — VS Code Live Server
1. Instala la extensión **Live Server** en VS Code
2. Clic derecho en `index.html` → "Open with Live Server"

## ⌨️ Controles

| Acción              | Control                  |
|---------------------|--------------------------|
| Adivinar letra      | Clic en botón / tecla    |
| Nueva partida       | Botón "Nueva Partida"    |
| Cambiar dificultad  | Pills de dificultad      |
| Cambiar categoría   | Pills de categoría       |
| Modo oscuro/claro   | Botón ☀️/🌙              |

## 🛠️ Tecnologías

- **HTML5** — estructura semántica con ARIA
- **CSS3** — Grid, Flexbox, Custom Properties, Animaciones, Glassmorphism
- **JavaScript ES6+** — Vanilla JS, Web Audio API, localStorage

## 📱 Compatibilidad

| Navegador | Versión mínima |
|-----------|---------------|
| Chrome    | 80+           |
| Firefox   | 75+           |
| Safari    | 13+           |
| Edge      | 80+           |
| Mobile    | iOS 13+ / Android 8+ |

---

Desarrollado como proyecto web completo con buenas prácticas: separación de responsabilidades (HTML/CSS/JS), código comentado, accesibilidad y diseño responsive.
