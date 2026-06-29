# 💣 Buscaminas — Premium Edition

Juego de Buscaminas completo con diseño moderno, 3 pantallas y todas las funcionalidades clásicas.

## 📁 Estructura

```
minesweeper/
├── index.html        ← HTML con las 3 pantallas y modales
├── css/
│   └── style.css     ← CSS completo (~600 líneas)
├── js/
│   └── game.js       ← Lógica completa (~380 líneas)
└── README.md
```

## 🎮 Pantallas

| Pantalla | Contenido |
|---------|-----------|
| **1 — Home** | Logo animado, mejores tiempos, botón info, toggle tema/sonido |
| **2 — Dificultad** | 4 opciones (Fácil/Medio/Difícil/Personalizado), campos custom |
| **3 — Juego** | Tablero, HUD, temporizador, botón reinicio, estado de partida |

## ✨ Características

- **Mecánicas completas:** primer clic nunca mina, flood-reveal recursivo, detección automática de victoria
- **Animación wave:** las celdas vacías se revelan en ola expansiva desde el clic
- **Explosión animada:** partículas al pisar una mina
- **Confetti** al ganar
- **Efectos de sonido** via Web Audio API (sin archivos externos)
- **Modo claro/oscuro** persistente
- **Estadísticas** por dificultad: ganadas, perdidas, mejor tiempo, % victorias
- **Historial** de últimas 20 partidas
- **Responsive:** se adapta automáticamente al tamaño de pantalla
- **Touch:** mantener presionado en móvil para poner bandera

## 🚀 Cómo abrir

```bash
# Opción A: Directo en el navegador
# Doble clic en index.html

# Opción B: Servidor Python (recomendado)
cd minesweeper
python -m http.server 8080
# Abrir: http://localhost:8080

# Opción C: VS Code Live Server
# Clic derecho en index.html → Open with Live Server
```

## ⌨️ Controles

| Acción | Control |
|--------|---------|
| Revelar celda | Clic izquierdo |
| Poner/quitar bandera | Clic derecho |
| Bandera en móvil | Mantener presionado |
| Reiniciar | Botón ↺ |
| Volver al menú | 🏠 |

## 🛠️ Tecnologías

- **HTML5** — semántico, ARIA, sin dependencias
- **CSS3** — Grid, Custom Properties, Animaciones, Glassmorphism
- **JavaScript ES6+** — Vanilla, Web Audio API, localStorage
