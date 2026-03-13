import { useCallback } from 'react';

export function useBeep() {
  const playBeep = useCallback((frequency: number = 800, duration: number = 100) => {
    if (typeof window === 'undefined') return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.error('Error playing beep:', error);
    }
  }, []);

  const playCountdownBeep = useCallback(() => {
    playBeep(600, 150); // Tono más bajo para cuenta atrás inicial
  }, [playBeep]);

  const playWarningBeep = useCallback(() => {
    playBeep(1000, 150); // Tono más alto para advertencia de fin
  }, [playBeep]);

  const playFinalBeep = useCallback(() => {
    playBeep(1200, 300); // Tono alto y largo para el final
  }, [playBeep]);

  return { playCountdownBeep, playWarningBeep, playFinalBeep };
}
