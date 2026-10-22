import { type MouseEvent, type PointerEvent, useRef } from "react";

/** Only gestures that begin and end on the backdrop dismiss the dialog. */
export function useDialogDismiss(onDismiss: () => void) {
  const beganOutside = useRef(false);
  const outside = (event: MouseEvent<HTMLDialogElement> | PointerEvent<HTMLDialogElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return (
      event.target === event.currentTarget &&
      (event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom)
    );
  };
  return {
    onPointerDown: (event: PointerEvent<HTMLDialogElement>) => {
      beganOutside.current = outside(event);
    },
    onClick: (event: MouseEvent<HTMLDialogElement>) => {
      if (beganOutside.current && outside(event)) onDismiss();
      beganOutside.current = false;
    },
  };
}
