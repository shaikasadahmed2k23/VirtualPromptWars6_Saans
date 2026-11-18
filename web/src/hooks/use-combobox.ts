import { useCallback, useState, type KeyboardEvent } from 'react';

/** State and handlers for an ARIA combobox with a listbox popup. */
export interface Combobox {
  readonly expanded: boolean;
  /** Index of the highlighted option, or -1. */
  readonly activeIndex: number;
  readonly open: () => void;
  readonly close: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly choose: (index: number) => void;
}

/**
 * Keyboard model from the WAI-ARIA combobox pattern: arrows move, Enter picks, Escape closes.
 * @param optionCount - How many options are currently listed.
 * @param onChoose - Called with the index of the picked option.
 * @returns Combobox state and handlers.
 */
export function useCombobox(optionCount: number, onChoose: (index: number) => void): Combobox {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const expanded = isOpen && optionCount > 0;
  const active = Math.min(activeIndex, optionCount - 1);
  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);
  const choose = (index: number): void => {
    onChoose(index);
    close();
  };
  const keys: Readonly<Record<string, () => void>> = {
    ArrowDown: () => {
      setIsOpen(true);
      setActiveIndex(Math.min(active + 1, optionCount - 1));
    },
    ArrowUp: () => {
      setActiveIndex(Math.max(active - 1, 0));
    },
    Enter: () => {
      if (expanded && active >= 0) choose(active);
    },
    Escape: close,
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    const handler = keys[event.key];
    if (handler !== undefined) {
      event.preventDefault();
      handler();
    }
  };
  const open = (): void => {
    setIsOpen(true);
  };
  return { expanded, activeIndex: expanded ? active : -1, open, close, onKeyDown, choose };
}
