// utils/getCssVariable.js
export function getCssVariableValue(variableName: string) {
    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue(variableName).trim();
    if (!value) {
      console.warn(`CSS variable ${variableName} not found.`);
    }
    return value;
  }