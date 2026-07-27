import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function useRouteChangeCleanup(onClose: () => void, enabled: boolean = true) {
  const currentPage = useStore((state) => state.currentPage);

  useEffect(() => {
    if (enabled) {
      onClose();
    }
  }, [currentPage]);
}

export default useRouteChangeCleanup;
