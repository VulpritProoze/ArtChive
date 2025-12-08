import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTextUndoRedoOptions {
  maxHistorySize?: number;
  debounceMs?: number;
}

/**
 * Custom hook for text undo/redo functionality in textareas
 * @param initialValue - Initial text value
 * @param options - Configuration options
 * @returns Object with value, setValue, undo, redo, canUndo, canRedo, reset
 */
export function useTextUndoRedo(
  initialValue: string = '',
  options: UseTextUndoRedoOptions = {}
) {
  const { maxHistorySize = 50, debounceMs = 1000 } = options;
  
  const [history, setHistory] = useState<string[]>([initialValue]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUpdatingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<string | null>(null);

  // Get current value
  const currentValue = history[historyIndex];

  // Check if undo/redo is possible
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Undo function
  const undo = useCallback(() => {
    if (canUndo && !isUpdatingRef.current) {
      isUpdatingRef.current = true;
      setHistoryIndex((prev) => prev - 1);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
      return history[historyIndex - 1];
    }
    return currentValue;
  }, [canUndo, historyIndex, history, currentValue]);

  // Redo function
  const redo = useCallback(() => {
    if (canRedo && !isUpdatingRef.current) {
      isUpdatingRef.current = true;
      setHistoryIndex((prev) => prev + 1);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
      return history[historyIndex + 1];
    }
    return currentValue;
  }, [canRedo, historyIndex, history, currentValue]);


  // Set value function with history tracking (debounced)
  const setValue = useCallback((newValue: string, addToHistory: boolean = true) => {
    if (isUpdatingRef.current) {
      // Don't add to history if we're in the middle of an undo/redo
      return;
    }

    if (!addToHistory) {
      // Just update current history entry without creating new one (immediate, no debounce)
      setHistory((prevHistory) => {
        const newHistory = [...prevHistory];
        newHistory[historyIndex] = newValue;
        return newHistory;
      });
      return;
    }

    // Only add to history if value actually changed
    if (newValue === currentValue) {
      return; // No change, don't update
    }

    // Store the pending value
    pendingValueRef.current = newValue;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce history recording - only record after user stops typing
    debounceTimerRef.current = setTimeout(() => {
      const valueToAdd = pendingValueRef.current;
      if (valueToAdd !== null) {
        // Use functional updates to get the latest state
        setHistoryIndex((prevIndex) => {
          setHistory((prevHistory) => {
            // Check if value actually changed from current history entry
            const currentVal = prevHistory[prevIndex];
            if (valueToAdd === currentVal) {
              return prevHistory; // No change, don't update
            }

            // If we're not at the end of history, remove future history
            const newHistory = prevHistory.slice(0, prevIndex + 1);
            
            // Add new value to history
            newHistory.push(valueToAdd);
            
            // Limit history size
            const finalHistory = newHistory.length > maxHistorySize 
              ? newHistory.slice(1) // Remove first item if over limit
              : newHistory;
            
            return finalHistory;
          });
          
          // Return new index
          const newIndex = prevIndex + 1;
          return newIndex >= maxHistorySize ? maxHistorySize - 1 : newIndex;
        });
        pendingValueRef.current = null;
      }
      debounceTimerRef.current = null;
    }, debounceMs);
  }, [historyIndex, currentValue, maxHistorySize, debounceMs]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Reset function
  const reset = useCallback((newInitialValue: string = '') => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingValueRef.current = null;
    setHistory([newInitialValue]);
    setHistoryIndex(0);
    isUpdatingRef.current = false;
  }, []);

  return {
    value: currentValue,
    setValue,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}

