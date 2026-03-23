
import { useState, useCallback, SetStateAction } from 'react';

const MAX_HISTORY = 50;

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export default function useUndoRedo<T>(initialState: T) {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState,
    future: []
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState(currentState => {
      const { past, present, future } = currentState;
      if (past.length === 0) return currentState;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [present, ...future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(currentState => {
      const { past, present, future } = currentState;
      if (future.length === 0) return currentState;

      const next = future[0];
      const newFuture = future.slice(1);

      return {
        past: [...past, present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  const set = useCallback((newPresent: SetStateAction<T>) => {
    setState(currentState => {
      const { present, past } = currentState;
      const value = newPresent instanceof Function ? (newPresent as (prev: T) => T)(present) : newPresent;

      if (value === present) return currentState;

      const newPast = [...past, present];
      if (newPast.length > MAX_HISTORY) {
          newPast.shift();
      }

      return {
        past: newPast,
        present: value,
        future: []
      };
    });
  }, []);

  const setSilent = useCallback((newPresent: SetStateAction<T>) => {
      setState(currentState => {
          const { present } = currentState;
          const value = newPresent instanceof Function ? (newPresent as (prev: T) => T)(present) : newPresent;
          
          if (value === present) return currentState;
          
          return {
              ...currentState,
              present: value
          };
      });
  }, []);

  return {
    state: state.present,
    setState: set,
    setSilent,
    undo,
    redo,
    canUndo,
    canRedo,
    history: state.past
  };
}
