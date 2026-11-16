// Mouse and keyboard controls. The canvas is scaled by CSS, so every
// pointer event is mapped back into the game's 1280x720 coordinate space
// before hit-testing against the layout rectangles the renderer returns.
import { TOWER_ORDER } from './config.js';
import { layoutFor } from './render.js';

function pointIn(rect, x, y) {
  return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function attachInput(canvas, game) {
  function toGameCoords(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  }

  function refreshMouse(event) {
    const at = toGameCoords(event);
    game.mouse.x = at.x;
    game.mouse.y = at.y;
    const cell = game.cellFromPixel(at.x, at.y);
    if (cell) {
      game.mouse.col = cell.col;
      game.mouse.row = cell.row;
      game.mouse.inside = true;
    } else {
      game.mouse.col = -1;
      game.mouse.row = -1;
      game.mouse.inside = false;
    }
  }

  canvas.addEventListener('mousemove', refreshMouse);
  canvas.addEventListener('mouseleave', () => {
    game.mouse.inside = false;
    game.mouse.col = -1;
    game.mouse.row = -1;
  });

  canvas.addEventListener('click', (event) => {
    game.sounds.resume();
    const at = toGameCoords(event);
    const layout = layoutFor(game);

    if (game.screen === 'menu') {
      if (pointIn(layout.play, at.x, at.y)) game.startGame();
      return;
    }
    if (game.screen === 'victory' || game.screen === 'defeat') {
      if (pointIn(layout.again, at.x, at.y)) game.startGame();
      return;
    }

    // HUD buttons.
    if (pointIn(layout.startWave, at.x, at.y)) {
      game.startWave();
      return;
    }
    if (pointIn(layout.speed, at.x, at.y)) {
      game.speed = game.speed === 1 ? 2 : 1;
      return;
    }
    if (pointIn(layout.pause, at.x, at.y)) {
      game.paused = !game.paused;
      return;
    }
    if (pointIn(layout.mute, at.x, at.y)) {
      game.sounds.setMuted(!game.sounds.muted);
      return;
    }

    // Selected-tower panel buttons.
    if (game.selected) {
      if (pointIn(layout.upgrade, at.x, at.y)) {
        game.upgradeSelected();
        return;
      }
      if (pointIn(layout.sell, at.x, at.y)) {
        game.sellSelected();
        return;
      }
    }

    // Shop cards.
    for (const card of layout.shopCards) {
      if (pointIn(card.rect, at.x, at.y)) {
        if (game.placing === card.key) game.placing = null;
        else {
          game.placing = card.key;
          game.selected = null;
        }
        return;
      }
    }

    // Playfield: place a tower, or select one.
    const cell = game.cellFromPixel(at.x, at.y);
    if (!cell) {
      game.selected = null;
      return;
    }
    if (game.placing) {
      const result = game.placeTower(game.placing, cell.col, cell.row);
      if (!result.ok) {
        game.sounds.denied();
        game.fx.floater(at.x, at.y - 16, result.reason, '#f87171');
      } else if (!event.shiftKey) {
        game.placing = null;
      }
      return;
    }
    const tower = game.towerAt(cell.col, cell.row);
    game.selected = tower;
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (game.screen === 'menu' && (key === 'enter' || key === ' ')) {
      event.preventDefault();
      game.startGame();
      return;
    }
    if ((game.screen === 'victory' || game.screen === 'defeat') && (key === 'enter' || key === ' ')) {
      event.preventDefault();
      game.startGame();
      return;
    }
    if (game.screen !== 'playing') return;
    if (key >= '1' && key <= '4') {
      const type = TOWER_ORDER[Number(key) - 1];
      if (game.placing === type) game.placing = null;
      else {
        game.placing = type;
        game.selected = null;
      }
    } else if (key === ' ') {
      event.preventDefault();
      game.startWave();
    } else if (key === 'p') {
      game.paused = !game.paused;
    } else if (key === 'f') {
      game.speed = game.speed === 1 ? 2 : 1;
    } else if (key === 'm') {
      game.sounds.setMuted(!game.sounds.muted);
    } else if (key === 'escape') {
      game.placing = null;
      game.selected = null;
    } else if (key === 'u' && game.selected) {
      game.upgradeSelected();
    } else if (key === 's' && game.selected) {
      game.sellSelected();
    }
  });
}
