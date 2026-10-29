import { useEffect, useState } from 'react';

function getInitialOnlineStatus() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(getInitialOnlineStatus);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
