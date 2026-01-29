/**
 * Panel creation and management
 */

import type { OptimizerState } from '../types';

const STYLE_ID = 'cc-optimizer-styles';

// Store event handlers for cleanup
let dragDownHandler: ((e: MouseEvent) => void) | null = null;
let dragMoveHandler: ((e: MouseEvent) => void) | null = null;
let dragUpHandler: (() => void) | null = null;
const buttonHandlers: Map<string, (e: MouseEvent) => void> = new Map();

const PANEL_HTML = `
<div id="cc-opt-header">
  <div class="cc-opt-title">
    <span class="cc-opt-cookie-icon">&#127850;</span>
    <span>Optimizer</span>
  </div>
  <div class="cc-opt-header-actions">
    <a href="https://github.com/ianneub/cookie_clicker_optimizer" target="_blank" rel="noopener" id="cc-opt-github" aria-label="View on GitHub" title="View on GitHub">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
    </a>
    <button id="cc-opt-close" aria-label="Close">&times;</button>
  </div>
</div>
<div id="cc-opt-toggles">
  <button id="cc-opt-auto" class="cc-opt-toggle" data-label="Auto">OFF</button>
  <button id="cc-opt-golden" class="cc-opt-toggle" data-label="Gold">OFF</button>
  <button id="cc-opt-wrath" class="cc-opt-toggle" data-label="Wrath" style="display: none;">OFF</button>
  <button id="cc-opt-wrinkler" class="cc-opt-toggle" data-label="Wrnk" style="display: none;">OFF</button>
</div>
<div id="cc-opt-lucky-bank" style="display: none;">
  <div class="cc-opt-bank-icon">&#9733;</div>
  <div class="cc-opt-bank-content"></div>
</div>
<div id="cc-opt-wrinklers" style="display: none;">
  <div class="cc-opt-wrinkler-icon">&#128027;</div>
  <div class="cc-opt-wrinkler-content">
    <div class="cc-opt-wrinkler-row">
      <span class="cc-opt-wrinkler-label">Wrinklers</span>
      <span id="cc-opt-wrinkler-count">0/10</span>
    </div>
    <div class="cc-opt-wrinkler-row cc-opt-wrinkler-reward-row">
      <span>Pop Reward</span>
      <span id="cc-opt-wrinkler-reward">0</span>
    </div>
  </div>
  <div id="cc-opt-wrinkler-action" style="display: none;"></div>
</div>
<div id="cc-opt-content">Loading...</div>
`;

/**
 * Create or get the display element
 */
export function getDisplay(
  state: OptimizerState,
  styles: string,
  onClose: () => void,
  onToggle: (key: keyof OptimizerState) => void
): HTMLElement {
  if (state.displayElement && document.body.contains(state.displayElement)) {
    return state.displayElement;
  }

  const displayElement = document.createElement('div');
  displayElement.id = 'cc-optimizer';
  displayElement.innerHTML = PANEL_HTML;

  // Only add styles if not already present
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = styles;
    document.head.appendChild(style);
  }
  document.body.appendChild(displayElement);

  // Close button
  const closeBtn = document.getElementById('cc-opt-close');
  if (closeBtn) {
    const closeHandler = () => onClose();
    buttonHandlers.set('close', closeHandler);
    closeBtn.addEventListener('click', closeHandler);
  }

  // Auto-purchase toggle button
  const autoBtn = document.getElementById('cc-opt-auto');
  if (autoBtn) {
    updateToggleButton(autoBtn, state.autoPurchase);
    const autoHandler = (e: MouseEvent) => {
      e.stopPropagation();
      onToggle('autoPurchase');
    };
    buttonHandlers.set('auto', autoHandler);
    autoBtn.addEventListener('click', autoHandler);
  }

  // Golden cookie toggle button
  const goldenBtn = document.getElementById('cc-opt-golden');
  if (goldenBtn) {
    updateToggleButton(goldenBtn, state.autoGolden);
    const goldenHandler = (e: MouseEvent) => {
      e.stopPropagation();
      onToggle('autoGolden');
    };
    buttonHandlers.set('golden', goldenHandler);
    goldenBtn.addEventListener('click', goldenHandler);
  }

  // Wrath cookie toggle button
  const wrathBtn = document.getElementById('cc-opt-wrath');
  if (wrathBtn) {
    updateToggleButton(wrathBtn, state.autoWrath);
    // Show wrath button only if golden is enabled
    wrathBtn.style.display = state.autoGolden ? 'flex' : 'none';
    const wrathHandler = (e: MouseEvent) => {
      e.stopPropagation();
      onToggle('autoWrath');
    };
    buttonHandlers.set('wrath', wrathHandler);
    wrathBtn.addEventListener('click', wrathHandler);
  }

  // Wrinkler toggle button
  const wrinklerBtn = document.getElementById('cc-opt-wrinkler');
  if (wrinklerBtn) {
    updateToggleButton(wrinklerBtn, state.autoWrinklers);
    const wrinklerHandler = (e: MouseEvent) => {
      e.stopPropagation();
      onToggle('autoWrinklers');
    };
    buttonHandlers.set('wrinkler', wrinklerHandler);
    wrinklerBtn.addEventListener('click', wrinklerHandler);
  }

  // Make draggable
  const header = document.getElementById('cc-opt-header');
  if (header) {
    makeDraggable(displayElement, header);
  }

  state.displayElement = displayElement;
  return displayElement;
}

/**
 * Update a toggle button's display state
 */
export function updateToggleButton(btn: HTMLElement | null, isActive: boolean): void {
  if (!btn) return;
  btn.textContent = isActive ? 'ON' : 'OFF';
  if (isActive) {
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
}

/**
 * Make an element draggable
 */
export function makeDraggable(element: HTMLElement, handle: HTMLElement): void {
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;

  // Clean up any existing handlers
  cleanupDragHandlers();

  dragDownHandler = (e: MouseEvent) => {
    isDragging = true;
    offsetX = e.clientX - element.offsetLeft;
    offsetY = e.clientY - element.offsetTop;
    e.preventDefault();
  };
  handle.addEventListener('mousedown', dragDownHandler);

  dragMoveHandler = (e: MouseEvent) => {
    if (!isDragging) return;
    element.style.left = e.clientX - offsetX + 'px';
    element.style.top = e.clientY - offsetY + 'px';
  };

  dragUpHandler = () => {
    isDragging = false;
  };

  document.addEventListener('mousemove', dragMoveHandler);
  document.addEventListener('mouseup', dragUpHandler);
}

/**
 * Clean up button event handlers
 */
export function cleanupButtonHandlers(): void {
  const buttonIds: Record<string, string> = {
    close: 'cc-opt-close',
    auto: 'cc-opt-auto',
    golden: 'cc-opt-golden',
    wrath: 'cc-opt-wrath',
    wrinkler: 'cc-opt-wrinkler',
  };

  for (const [key, id] of Object.entries(buttonIds)) {
    const handler = buttonHandlers.get(key);
    if (handler) {
      const btn = document.getElementById(id);
      if (btn) {
        btn.removeEventListener('click', handler);
      }
    }
  }
  buttonHandlers.clear();
}

/**
 * Clean up drag event handlers
 */
export function cleanupDragHandlers(): void {
  if (dragDownHandler) {
    const header = document.getElementById('cc-opt-header');
    if (header) {
      header.removeEventListener('mousedown', dragDownHandler);
    }
    dragDownHandler = null;
  }
  if (dragMoveHandler) {
    document.removeEventListener('mousemove', dragMoveHandler);
    dragMoveHandler = null;
  }
  if (dragUpHandler) {
    document.removeEventListener('mouseup', dragUpHandler);
    dragUpHandler = null;
  }
}

/**
 * Clean up panel resources (styles and handlers)
 */
export function cleanupPanel(): void {
  cleanupButtonHandlers();
  cleanupDragHandlers();
  const style = document.getElementById(STYLE_ID);
  if (style) {
    style.remove();
  }
}
