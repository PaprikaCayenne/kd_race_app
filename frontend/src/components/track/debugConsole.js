// File: frontend/src/components/track/debugConsole.js
// Version: v0.1.1 — Adds logInfo alias for compatibility

let ENABLED = true;

export function setDebugLogging(enabled) {
  ENABLED = enabled;
  console.log(`[KD] 🛠 Debug logging ${enabled ? 'enabled' : 'disabled'}`);
}

export function log(...args) {
  if (ENABLED) {
    console.log('[KD]', ...args);
  }
}

export function warn(...args) {
  if (ENABLED) {
    console.warn('[KD]', ...args);
  }
}

export function error(...args) {
  if (ENABLED) {
    console.error('[KD]', ...args);
  }
}

export function info(...args) {
  if (ENABLED) {
    console.info('[KD]', ...args);
  }
}

// Alias for compatibility
export { info as logInfo };
