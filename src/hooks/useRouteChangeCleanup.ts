import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export function useRouteChangeCleanup(onClose: () => void, enabled: boolean = true) {
  const currentPage = useStore((state) => state.currentPage);
  const prevPageRef = useRef(currentPage);

  useEffect(() => {
    if (enabled && prevPageRef.current !== currentPage) {
      onClose();
    }
    prevPageRef.current = currentPage;
  }, [currentPage, enabled, onClose]);
}

export default useRouteChangeCleanup;
