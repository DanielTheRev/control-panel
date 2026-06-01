import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private audioCtx: AudioContext | null = null;
  private alarmIntervalId: any = null;
  private isAlarmRunning = false;
  private boundStop = this.stopAlarm.bind(this);

  constructor() {
    if (typeof window !== 'undefined') {
      // Attempt to pre-initialize and resume AudioContext on first user interaction
      const initOnGesture = () => {
        try {
          this.initAudio();
          if (this.audioCtx && this.audioCtx.state === 'running') {
            window.removeEventListener('click', initOnGesture);
            window.removeEventListener('keydown', initOnGesture);
            window.removeEventListener('touchstart', initOnGesture);
          }
        } catch (e) {
          console.warn('Failed to pre-initialize audio context on gesture:', e);
        }
      };

      window.addEventListener('click', initOnGesture, { once: true, passive: true });
      window.addEventListener('keydown', initOnGesture, { once: true, passive: true });
      window.addEventListener('touchstart', initOnGesture, { once: true, passive: true });
    }
  }

  private initAudio() {
    if (typeof window === 'undefined') return;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(err => console.warn('Could not resume AudioContext:', err));
    }
  }

  /**
   * Starts the recurring order notification alarm.
   * Plays the chime immediately and loops it every 6 seconds.
   * Automatically sets up listeners to stop the alarm on next user interaction.
   */
  startOrderAlarm() {
    if (typeof window === 'undefined') return;
    if (this.isAlarmRunning) return;

    console.log('🔔 Iniciando alarma de nuevo pedido');
    this.isAlarmRunning = true;

    // Play once immediately
    this.playChime();

    // Loop every 6 seconds
    this.alarmIntervalId = setInterval(() => {
      this.playChime();
    }, 6000);

    // Bind interaction events to stop the alarm
    window.addEventListener('click', this.boundStop, { capture: true, passive: true });
    window.addEventListener('keydown', this.boundStop, { capture: true, passive: true });
    window.addEventListener('focus', this.boundStop, { capture: true, passive: true });
    window.addEventListener('touchstart', this.boundStop, { capture: true, passive: true });
  }

  /**
   * Stops the active alarm loop and cleans up event listeners.
   */
  stopAlarm() {
    if (!this.isAlarmRunning) return;

    console.log('🔕 Deteniendo alarma de nuevo pedido');
    this.isAlarmRunning = false;

    if (this.alarmIntervalId) {
      clearInterval(this.alarmIntervalId);
      this.alarmIntervalId = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('click', this.boundStop, { capture: true });
      window.removeEventListener('keydown', this.boundStop, { capture: true });
      window.removeEventListener('focus', this.boundStop, { capture: true });
      window.removeEventListener('touchstart', this.boundStop, { capture: true });
    }
  }

  private playChime() {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      // Double-bell chime: Ding 1 followed by Ding 2
      // Ding 1: A5 (880 Hz)
      this.playBell(880.00, 1.0);

      // Ding 2: C#6 (1109.73 Hz) after 200ms
      setTimeout(() => {
        if (this.isAlarmRunning) {
          this.playBell(1109.73, 1.2);
        }
      }, 200);
    } catch (e) {
      console.warn('Failed to play chime:', e);
    }
  }

  private playBell(frequency: number, duration: number) {
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const gainNode = this.audioCtx.createGain();

      // Sharp strike envelope
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // Bell harmonics
      const harmonics = [1, 1.5, 2.0, 3.0];
      harmonics.forEach((ratio, index) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const oscGain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency * ratio, now);

        const volumeFactor = 0.15 / (index + 1);
        oscGain.gain.setValueAtTime(volumeFactor, now);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + (duration / (index + 1)));

        osc.connect(oscGain);
        oscGain.connect(gainNode);
        osc.start(now);
        osc.stop(now + duration + 0.1);
      });

      gainNode.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn('Failed to play synthesized bell tone:', e);
    }
  }
}
