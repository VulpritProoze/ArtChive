import { useState, useCallback, useRef } from 'react';
import type { Command } from '@types';

interface UseUndoRedoReturn {
  execute: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
  history: Command[];
}

export function useUndoRedo(maxHistorySize = 50): UseUndoRedoReturn {
  const [history, setHistory] = useState<Command[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isExecuting = useRef(false);

  const execute = useCallback(
    (command: Command) => {
      if (isExecuting.current) return;

      isExecuting.current = true;
      try {
        command.execute();

        setHistory((prev) => {
          // Remove any redo history
          const newHistory = prev.slice(0, currentIndex + 1);
          // Add new command
          newHistory.push(command);
          // Limit history size
          if (newHistory.length > maxHistorySize) {
            newHistory.shift();
            return newHistory;
          }
          return newHistory;
        });

        setCurrentIndex((prev) => {
          const newIndex = prev + 1;
          return newIndex >= maxHistorySize ? maxHistorySize - 1 : newIndex;
        });
      } finally {
        isExecuting.current = false;
      }
    },
    [currentIndex, maxHistorySize]
  );

  const undo = useCallback(() => {
    if (currentIndex < 0 || isExecuting.current) return;

    isExecuting.current = true;
    try {
      const command = history[currentIndex];
      command.undo();
      setCurrentIndex((prev) => prev - 1);
    } finally {
      isExecuting.current = false;
    }
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex >= history.length - 1 || isExecuting.current) return;

    isExecuting.current = true;
    try {
      const command = history[currentIndex + 1];
      command.execute();
      setCurrentIndex((prev) => prev + 1);
    } finally {
      isExecuting.current = false;
    }
  }, [currentIndex, history]);

  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    execute,
    undo,
    redo,
    canUndo: currentIndex >= 0,
    canRedo: currentIndex < history.length - 1,
    clear,
    history,
  };
}

