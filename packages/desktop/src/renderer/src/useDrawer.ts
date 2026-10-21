import { useEffect, useRef, useState } from "react";

/** Keep the modal mounted through its exit so focus returns after the slide finishes. */
export function useDrawer() {
  const ref = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const open = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setClosing(false);
    ref.current?.showModal();
  };
  const close = () => {
    if (!ref.current?.open || timer.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ref.current.close();
      return;
    }
    setClosing(true);
    timer.current = setTimeout(() => {
      ref.current?.close();
      setClosing(false);
      timer.current = null;
    }, 180);
  };
  return { ref, open, close, closing };
}
