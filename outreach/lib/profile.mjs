import path from 'node:path';

const PROFILES = ['events', 'real-estate'];

export function profileFromArgs(args) {
  const profile = args.find((arg) => arg.startsWith('--profile='))?.slice('--profile='.length) ?? 'events';
  if (!PROFILES.includes(profile)) throw new Error(`Unknown profile "${profile}". Use: ${PROFILES.join(', ')}`);
  return profile;
}

export function profileDataDir(root, profile) {
  return profile === 'events' ? path.join(root, 'data') : path.join(root, 'data', profile);
}

export function profileQueriesFile(root, profile) {
  return path.join(root, profile === 'events' ? 'queries.txt' : `queries-${profile}.txt`);
}
