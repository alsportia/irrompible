"use client"

import { useEffect, useRef } from "react";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
};
type NavigatorWakeLockLike = {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>;
};

export default function WakeLock() {
  const lockRef = useRef<WakeLockSentinelLike | null>(null);
  const triedRef = useRef(false);

  useEffect(() => {
    const acquire = async () => {
      try {
        const wakeLock = (navigator as unknown as { wakeLock?: NavigatorWakeLockLike }).wakeLock;
        if (wakeLock) {
          lockRef.current = await wakeLock.request('screen');
        }
      } catch {}
    };

    // Some browsers (notably iOS Safari) require a user gesture to acquire a wake lock.
    // We try on mount for browsers that allow it, and also retry on first interaction.
    acquire();

    const onFirstInteraction = () => {
      if (triedRef.current) return;
      triedRef.current = true;
      acquire();
      document.removeEventListener('pointerdown', onFirstInteraction);
      document.removeEventListener('touchstart', onFirstInteraction);
      document.removeEventListener('keydown', onFirstInteraction);
    };
    document.addEventListener('pointerdown', onFirstInteraction, { passive: true });
    document.addEventListener('touchstart', onFirstInteraction, { passive: true });
    document.addEventListener('keydown', onFirstInteraction);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('pointerdown', onFirstInteraction);
      document.removeEventListener('touchstart', onFirstInteraction);
      document.removeEventListener('keydown', onFirstInteraction);
      document.removeEventListener('visibilitychange', onVisibility);
      lockRef.current?.release().catch(() => {});
    };
  }, []);

  return null;
}
