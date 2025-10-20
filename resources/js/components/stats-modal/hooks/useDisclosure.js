import { useCallback, useState } from 'react';

export default function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(Boolean(initial));
  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  const onToggle = useCallback(() => setIsOpen((v) => !v), []);
  return { isOpen, onOpen, onClose, onToggle };
}
