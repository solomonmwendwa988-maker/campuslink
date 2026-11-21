export type UniversityConfig = {
  id: string;
  name: string;
  campuses: string[];
};

// Keep institution-specific choices in data so a future multi-university rollout
// only needs configuration and policy changes, not another registration flow.
export const universities: UniversityConfig[] = [
  { id: 'kabianga', name: 'University of Kabianga', campuses: ['Main Campus'] },
];

export const launchUniversity = universities[0];
