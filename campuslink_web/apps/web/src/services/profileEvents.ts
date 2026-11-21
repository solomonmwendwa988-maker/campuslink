import { StudentProfile } from '../pages/CorePages';

const PROFILE_UPDATED = 'campuslink:profile-updated';

export function publishProfileUpdate(profile: StudentProfile): void {
  window.dispatchEvent(new CustomEvent<StudentProfile>(PROFILE_UPDATED, { detail: profile }));
}

export function subscribeProfileUpdates(callback: (profile: StudentProfile) => void): () => void {
  const listener = (event: Event) => callback((event as CustomEvent<StudentProfile>).detail);
  window.addEventListener(PROFILE_UPDATED, listener);
  return () => window.removeEventListener(PROFILE_UPDATED, listener);
}
