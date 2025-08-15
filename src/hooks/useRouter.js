import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';

export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState(() => {
    const path = window.location.pathname;
    if (path === '/') {
      return { type: 'landing' };
    } else if (path.startsWith('/notes/')) {
      const sessionId = path.split('/notes/')[1];
      return { type: 'app', sessionId };
    }
    return { type: 'landing' };
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/') {
        setCurrentRoute({ type: 'landing' });
      } else if (path.startsWith('/notes/')) {
        const sessionId = path.split('/notes/')[1];
        setCurrentRoute({ type: 'app', sessionId });
      } else {
        setCurrentRoute({ type: 'landing' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToApp = (sessionId = null) => {
    const id = sessionId || nanoid(8);
    const url = `/notes/${id}`;
    window.history.pushState(null, '', url);
    setCurrentRoute({ type: 'app', sessionId: id });
    
    // Store session ID in localStorage for persistence
    try {
      localStorage.setItem('iv_session_id', id);
    } catch {}
    
    return id;
  };

  const navigateToLanding = () => {
    window.history.pushState(null, '', '/');
    setCurrentRoute({ type: 'landing' });
  };

  const getStoredSessionId = () => {
    try {
      return localStorage.getItem('iv_session_id');
    } catch {
      return null;
    }
  };

  return {
    currentRoute,
    navigateToApp,
    navigateToLanding,
    getStoredSessionId
  };
}
