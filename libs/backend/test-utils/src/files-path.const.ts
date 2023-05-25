import path from 'node:path';

// Ugly, but with Nx it's helpful as a constant to be used anything in
// backend-e2e and its libs.
export const FILES_PATH = path.join(
  __dirname,
  '../../../../apps/backend-e2e/files'
);
