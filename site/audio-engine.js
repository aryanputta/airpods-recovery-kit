export const MOISTURE_DURATION_SECONDS = 20;
export const MOISTURE_FREQUENCY_HZ = 165;
export const MOISTURE_GAIN = 0.025;
export const CHANNEL_FREQUENCY_HZ = 660;
export const CHANNEL_GAIN = 0.02;
export const CHANNEL_TONE_SECONDS = 1.5;
export const CHANNEL_GAP_SECONDS = 0.75;

const RAMP_SECONDS = 0.018;

export function buildPulseSchedule({
  durationSeconds = MOISTURE_DURATION_SECONDS,
  onSeconds = 0.34,
  offSeconds = 0.16,
} = {}) {
  if (
    durationSeconds <= 0 ||
    durationSeconds > MOISTURE_DURATION_SECONDS ||
    onSeconds <= RAMP_SECONDS * 2 ||
    offSeconds < 0
  ) {
    throw new RangeError("Unsafe pulse schedule");
  }

  const pulses = [];
  const cycleSeconds = onSeconds + offSeconds;

  for (let start = 0; start < durationSeconds; start += cycleSeconds) {
    pulses.push({
      startSeconds: start,
      endSeconds: Math.min(start + onSeconds, durationSeconds),
    });
  }

  return pulses;
}

function scheduleGainEnvelope(gainParam, startTime, endTime, level) {
  const ramp = Math.min(RAMP_SECONDS, (endTime - startTime) / 3);
  gainParam.setValueAtTime(0, startTime);
  gainParam.linearRampToValueAtTime(level, startTime + ramp);
  gainParam.setValueAtTime(level, endTime - ramp);
  gainParam.linearRampToValueAtTime(0, endTime);
}

export class RecoveryAudioEngine {
  constructor({
    contextFactory = () => {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio is not supported in this browser.");
      }
      return new AudioContextClass();
    },
  } = {}) {
    this.contextFactory = contextFactory;
    this.context = null;
    this.activeOscillators = new Set();
    this.timers = new Set();
    this.animationFrame = null;
    this.running = false;
    this.activeResolve = null;
  }

  async getContext() {
    if (!this.context) {
      this.context = this.contextFactory();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    return this.context;
  }

  async runMoisturePulse({ onProgress = () => {} } = {}) {
    this.stop();
    const context = await this.getContext();
    const now = context.currentTime + 0.04;
    const endTime = now + MOISTURE_DURATION_SECONDS;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(MOISTURE_FREQUENCY_HZ, now);
    gain.gain.setValueAtTime(0, now);

    for (const pulse of buildPulseSchedule()) {
      scheduleGainEnvelope(
        gain.gain,
        now + pulse.startSeconds,
        now + pulse.endSeconds,
        MOISTURE_GAIN,
      );
    }

    oscillator.connect(gain).connect(context.destination);
    this.trackOscillator(oscillator);
    this.running = true;
    this.trackProgress(MOISTURE_DURATION_SECONDS, onProgress);

    return new Promise((resolve) => {
      this.activeResolve = resolve;
      oscillator.onended = () => {
        this.activeOscillators.delete(oscillator);
        this.finishRun(onProgress);
        this.activeResolve = null;
        resolve({ stopped: false });
      };
      oscillator.start(now);
      oscillator.stop(endTime);
    });
  }

  async runChannelTest({
    onChannel = () => {},
    onProgress = () => {},
  } = {}) {
    this.stop();
    const context = await this.getContext();

    if (!context.createStereoPanner) {
      throw new Error("Stereo channel testing is not supported in this browser.");
    }

    const now = context.currentTime + 0.04;
    const rightStart =
      now + CHANNEL_TONE_SECONDS + CHANNEL_GAP_SECONDS;
    const totalSeconds =
      CHANNEL_TONE_SECONDS * 2 + CHANNEL_GAP_SECONDS;

    const left = this.createChannelTone({
      context,
      startTime: now,
      pan: -1,
    });
    const right = this.createChannelTone({
      context,
      startTime: rightStart,
      pan: 1,
    });

    this.running = true;
    onChannel("left");
    this.addTimer(() => onChannel("pause"), CHANNEL_TONE_SECONDS * 1000);
    this.addTimer(
      () => onChannel("right"),
      (CHANNEL_TONE_SECONDS + CHANNEL_GAP_SECONDS) * 1000,
    );
    this.trackProgress(totalSeconds, onProgress);

    return new Promise((resolve) => {
      this.activeResolve = resolve;
      right.onended = () => {
        this.activeOscillators.delete(left);
        this.activeOscillators.delete(right);
        this.finishRun(onProgress);
        this.activeResolve = null;
        resolve({ stopped: false });
      };
    });
  }

  createChannelTone({ context, startTime, pan }) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    const endTime = startTime + CHANNEL_TONE_SECONDS;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(CHANNEL_FREQUENCY_HZ, startTime);
    panner.pan.setValueAtTime(pan, startTime);
    scheduleGainEnvelope(
      gain.gain,
      startTime,
      endTime,
      CHANNEL_GAIN,
    );

    oscillator.connect(gain).connect(panner).connect(context.destination);
    this.trackOscillator(oscillator);
    oscillator.start(startTime);
    oscillator.stop(endTime);
    return oscillator;
  }

  trackOscillator(oscillator) {
    this.activeOscillators.add(oscillator);
  }

  addTimer(callback, delayMs) {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delayMs);
    this.timers.add(timer);
  }

  trackProgress(durationSeconds, onProgress) {
    const start = performance.now();
    const durationMs = durationSeconds * 1000;

    const tick = (now) => {
      if (!this.running) {
        return;
      }

      const progress = Math.min((now - start) / durationMs, 1);
      onProgress(progress);

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(tick);
      }
    };

    onProgress(0);
    this.animationFrame = requestAnimationFrame(tick);
  }

  finishRun(onProgress) {
    this.running = false;
    this.clearTimers();
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    onProgress(1);
  }

  clearTimers() {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  stop() {
    const wasRunning = this.running;
    this.running = false;

    for (const oscillator of this.activeOscillators) {
      oscillator.onended = null;
      try {
        oscillator.stop();
      } catch {
        // The oscillator may already have ended.
      }
    }
    this.activeOscillators.clear();
    this.clearTimers();

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.activeResolve) {
      this.activeResolve({ stopped: true });
      this.activeResolve = null;
    }

    return wasRunning;
  }
}
