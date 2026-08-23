import { useState } from 'react';
import { SaveState } from '../components/settings/SaveBar';

/**
 * Drives the SaveBar state machine: idle -> dirty -> saving -> saved -> idle.
 * Pairs with SaveBar so every settings form gets the same
 * unsaved/saving/saved behavior instead of each screen inventing its own.
 */
export function useSaveState() {
  const [state, setState] = useState<SaveState>('idle');

  const markDirty = () => setState(prev => (prev === 'saving' ? prev : 'dirty'));

  const save = async (fn: () => void | Promise<void>) => {
    if (state === 'saving') return; // guards against double-click firing the save twice
    setState('saving');
    await fn();
    setState('saved');
    setTimeout(() => setState(prev => (prev === 'saved' ? 'idle' : prev)), 2000);
  };

  const reset = () => setState('idle');

  return { state, markDirty, save, reset };
}
