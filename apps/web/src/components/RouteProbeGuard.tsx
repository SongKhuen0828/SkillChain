/**
 * Route Probe Guard Component
 * Performs pre-flight checks before rendering routes
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { probeRoute } from '@/lib/system/routeProbe';
import { LoadingScreen } from './LoadingScreen';

interface RouteProbeGuardProps {
  children: React.ReactNode;
}

export function RouteProbeGuard({ children }: RouteProbeGuardProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [probing, setProbing] = useState(true);
  const [probeResult, setProbeResult] = useState<{ ready: boolean; issues: string[]; fixed: boolean } | null>(null);

  useEffect(() => {
    async function performProbe() {
      setProbing(true);
      
      try {
        const result = await probeRoute(location.pathname, user?.id);
        setProbeResult(result);
        
        if (result.fixed) {
          console.log('✅ Route probe fixed issues:', result.issues);
        } else if (!result.ready && result.issues.length > 0) {
          console.warn('⚠️ Route probe found issues:', result.issues);
        }
      } catch (error) {
        console.error('Route probe error:', error);
        setProbeResult({ ready: true, issues: [], fixed: false }); // Continue on error
      } finally {
        setProbing(false);
      }
    }

    performProbe();
  }, [location.pathname, user?.id]);

  // Show loading only briefly during probe
  if (probing && location.pathname !== '/') {
    return <LoadingScreen />;
  }

  // If probe failed but we want to continue anyway (non-blocking)
  if (probeResult && !probeResult.ready) {
    console.warn('Route probe indicates issues, but continuing anyway');
  }

  return <>{children}</>;
}

