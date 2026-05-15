import { useEffect } from 'react';

const ARCHITECTURE_INDEX = '/Architecture/overview.html';

/** Redirects /Architecture to the static Circle integration presentation. */
export function ArchitectureRoute() {
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/Architecture' || path === '/Architecture/') {
      window.location.replace(ARCHITECTURE_INDEX);
    }
  }, []);

  return null;
}
