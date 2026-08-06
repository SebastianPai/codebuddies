"use client";

import { useCallback, useState } from "react";

export function useDisclosure(initiallyOpen = false) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close, setIsOpen };
}
