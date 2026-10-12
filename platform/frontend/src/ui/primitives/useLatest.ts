import { useLayoutEffect, useRef, type RefObject } from "react";

/** Ref sempre apontando para o valor mais recente, para ouvintes registrados uma única vez. */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
