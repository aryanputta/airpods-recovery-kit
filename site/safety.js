export const RecoveryMode = Object.freeze({
  MOISTURE: "moisture",
  CHANNELS: "channels",
});

export function canStartRecovery({
  mode = RecoveryMode.MOISTURE,
  outOfEars = false,
  lowVolume = false,
  outputConfirmed = false,
}) {
  if (!outputConfirmed) {
    return false;
  }

  if (mode === RecoveryMode.CHANNELS) {
    return Boolean(lowVolume);
  }

  return Boolean(outOfEars);
}
