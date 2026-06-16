/**
 * Lets layout (e.g. SiteHeader) hide while the live interview room is in device-check or instructions phase.
 */

let onboardingActive = false;
const listeners = new Set<() => void>();

export function setInterviewRoomOnboarding(active: boolean): void {
  if (onboardingActive === active) return;
  onboardingActive = active;
  listeners.forEach((l) => l());
}

export function getInterviewRoomOnboarding(): boolean {
  return onboardingActive;
}

export function subscribeInterviewRoomOnboarding(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}
