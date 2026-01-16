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
  <button id="cc-opt-close" aria-label="Close">&times;</button>
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
