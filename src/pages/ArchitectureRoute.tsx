import { useEffect } from 'react';

const ARCHITECTURE_INDEX = '/Architecture/overview.html';

const ARCHITECTURE_ROOT_PATHS = new Set([
  '/Architecture',
  '/Architecture/',
  '/architecture',
  '/architecture/',
]);

/** Redirects /Architecture (and /architecture) to the static Circle integration presentation. */
export function ArchitectureRoute() {
  useEffect(() => {
    if (ARCHITECTURE_ROOT_PATHS.has(window.location.pathname)) {
      window.location.replace(ARCHITECTURE_INDEX);
    }
  }, []);

  return null;
}
