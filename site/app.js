import { RecoveryAudioEngine } from "./audio-engine.js";
import { canStartRecovery, RecoveryMode } from "./safety.js";

const engine = new RecoveryAudioEngine();

const app = document.querySelector("#recovery-app");
const modeButtons = [
  ...document.querySelectorAll(".mode-switcher button[data-mode]"),
];
const primaryConfirmation = document.querySelector("#primary-confirmation");
const primaryTitle = document.querySelector("#primary-title");
const primaryHelp = document.querySelector("#primary-help");
const outputConfirmed = document.querySelector("#output-confirmed");
const startButton = document.querySelector("#start-button");
const stopButton = document.querySelector("#stop-button");
const statusMessage = document.querySelector("#status-message");
const statusTitle = document.querySelector("#status-title");
const progressValue = document.querySelector("#progress-value");
const progressRing = document.querySelector("#progress-ring");
const stage = document.querySelector("#device-stage");
const resultPanel = document.querySelector("#result-panel");
const resultButtons = [...document.querySelectorAll("[data-result]")];
const recommendation = document.querySelector("#recommendation");

let mode = RecoveryMode.MOISTURE;

const recommendations = {
  equal:
    "Both channels are similar. Let the AirPods air-dry fully before returning to normal use.",
  uneven:
    "One side remains quieter. Check its charging contact and dry speaker mesh. Persistent imbalance usually needs cleaning or hardware service.",
  distorted:
    "Distortion remains. If it changes when Noise Control is Off, the ANC or transparency microphone and vent are the likely fault. Otherwise, suspect the speaker mesh or driver.",
};

function getSafetyState() {
  return {
    mode,
    outOfEars:
      mode === RecoveryMode.MOISTURE && primaryConfirmation.checked,
    lowVolume:
      mode === RecoveryMode.CHANNELS && primaryConfirmation.checked,
    outputConfirmed: outputConfirmed.checked,
  };
}

function updateSafetyState() {
  const allowed = canStartRecovery(getSafetyState());
  startButton.disabled = !allowed || engine.running;
  statusMessage.textContent = allowed
    ? "Ready. Sound starts only when you press the button."
    : "Complete both safety checks to continue.";
}

function setMode(nextMode) {
  if (engine.running) {
    stopRecovery();
  }

  mode = nextMode;
  primaryConfirmation.checked = false;
  outputConfirmed.checked = false;
  resultPanel.hidden = true;
  recommendation.textContent = "";
  stage.dataset.state = "idle";
  app.dataset.mode = mode;

  for (const button of modeButtons) {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  }

  if (mode === RecoveryMode.MOISTURE) {
    primaryTitle.textContent = "My AirPods are out of my ears";
    primaryHelp.textContent =
      "Place both speaker meshes downward on a clean, dry cloth.";
    startButton.textContent = "Run 20-second moisture pulse";
    statusTitle.textContent = "Ready for moisture mode";
  } else {
    primaryTitle.textContent = "My system volume is below 20%";
    primaryHelp.textContent =
      "Wear the AirPods only after lowering the system volume.";
    startButton.textContent = "Run left/right channel test";
    statusTitle.textContent = "Ready for channel mode";
  }

  setProgress(0);
  updateSafetyState();
}

function setProgress(progress) {
  const percent = Math.round(progress * 100);
  progressValue.textContent =
    app.dataset.running === "true" || percent > 0 ? `${percent}%` : "Ready";
  progressRing.setAttribute("aria-valuenow", String(percent));
  progressRing.style.setProperty("--progress", `${percent * 3.6}deg`);
  stage.style.setProperty("--progress", String(progress));
}

function setRunning(running) {
  app.dataset.running = String(running);
  stage.dataset.state = running ? "running" : "idle";
  startButton.hidden = running;
  stopButton.hidden = !running;
  primaryConfirmation.disabled = running;
  outputConfirmed.disabled = running;
  for (const button of modeButtons) {
    button.disabled = running;
  }
}

async function startRecovery() {
  if (!canStartRecovery(getSafetyState())) {
    statusMessage.textContent = "The safety checks are incomplete.";
    return;
  }

  setRunning(true);
  resultPanel.hidden = true;
  recommendation.textContent = "";
  statusTitle.textContent =
    mode === RecoveryMode.MOISTURE
      ? "Moving the diaphragm gently"
      : "Comparing left and right";
  statusMessage.textContent =
    mode === RecoveryMode.MOISTURE
      ? "Keep both AirPods out of your ears and facing downward."
      : "First tone: left. Second tone: right.";

  try {
    if (mode === RecoveryMode.MOISTURE) {
      const result = await engine.runMoisturePulse({ onProgress: setProgress });
      if (result.stopped) {
        return;
      }
      statusTitle.textContent = "Pulse complete";
      statusMessage.textContent =
        "Leave the AirPods facing downward for a few minutes, then run the channel test.";
    } else {
      const result = await engine.runChannelTest({
        onProgress: setProgress,
        onChannel: (channel) => {
          if (channel === "left") {
            statusMessage.textContent = "LEFT channel playing";
          } else if (channel === "pause") {
            statusMessage.textContent = "Short pause";
          } else {
            statusMessage.textContent = "RIGHT channel playing";
          }
        },
      });
      if (result.stopped) {
        return;
      }
      statusTitle.textContent = "Channel test complete";
      statusMessage.textContent = "Choose the result that best matches what you heard.";
      resultPanel.hidden = false;
    }
  } catch (error) {
    statusTitle.textContent = "Test could not start";
    statusMessage.textContent =
      error instanceof Error ? error.message : "Unknown audio error.";
  } finally {
    setRunning(false);
    updateSafetyState();
  }
}

function stopRecovery() {
  if (!engine.stop()) {
    return;
  }
  setRunning(false);
  setProgress(0);
  statusTitle.textContent = "Stopped";
  statusMessage.textContent = "No sound is playing.";
  updateSafetyState();
}

for (const button of modeButtons) {
  button.addEventListener("click", () => setMode(button.dataset.mode));
}

primaryConfirmation.addEventListener("change", updateSafetyState);
outputConfirmed.addEventListener("change", updateSafetyState);
startButton.addEventListener("click", startRecovery);
stopButton.addEventListener("click", stopRecovery);

for (const button of resultButtons) {
  button.addEventListener("click", () => {
    recommendation.textContent = recommendations[button.dataset.result];
  });
}

window.addEventListener("pagehide", () => engine.stop());

setMode(RecoveryMode.MOISTURE);
