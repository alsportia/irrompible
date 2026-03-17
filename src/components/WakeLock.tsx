"use client"

import { useEffect, useRef } from "react";

export default function WakeLock() {
  const lockRef = useRef<any>(null);

  useEffect(() => {
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) {
          lockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    };

    acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      lockRef.current?.release().catch(() => {});
    };
  }, []);

  return null;
}
