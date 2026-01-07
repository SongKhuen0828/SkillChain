/**
 * CORS Error Detector and Auto-Fix
 * Detects CORS errors and provides actionable fixes
 */

export interface CORSErrorInfo {
  isCORS: boolean;
  message: string;
  actionRequired?: string;
  url?: string;
}

/**
 * Detect if an error is a CORS error
 */
export function detectCORSError(error: any): CORSErrorInfo {
  const errorMessage = error?.message || String(error || '');
  const errorCode = error?.code;
  const errorName = error?.name;

  // Common CORS error patterns
  const corsPatterns = [
    /CORS/i,
    /Access-Control-Allow-Origin/i,
    /cross-origin/i,
    /No 'Access-Control-Allow-Origin' header/i,
    /CORS policy/i,
    /blocked by CORS policy/i,
    /preflight/i,
    /OPTIONS/i,
  ];

  const isCORS = 
    corsPatterns.some(pattern => pattern.test(errorMessage)) ||
    errorName === 'TypeError' && errorMessage.includes('fetch') ||
    errorCode === 'CORS_ERROR';

  if (isCORS) {
    // Extract URL from error if possible
    const urlMatch = errorMessage.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : undefined;

    // Determine the likely source
    const isSupabaseFunction = url?.includes('functions.supabase.co') || url?.includes('/functions/');

    let actionRequired = '';
    if (isSupabaseFunction) {
      actionRequired = `CORS error detected for Supabase Edge Function.\n` +
        `Action Required:\n` +
        `1. Go to Supabase Dashboard → Edge Functions → ${url?.split('/').pop() || 'ai-companion'}\n` +
        `2. Add CORS headers in the function code:\n` +
        `   res.headers.set('Access-Control-Allow-Origin', '*')\n` +
        `   res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')\n` +
        `   res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')\n` +
        `3. Or whitelist your origin: ${window.location.origin}`;
    } else if (url) {
      actionRequired = `CORS error detected for: ${url}\n` +
        `Action Required:\n` +
        `1. Contact the API provider to whitelist: ${window.location.origin}\n` +
        `2. Or configure CORS headers on the server`;
    } else {
      actionRequired = `CORS error detected.\n` +
        `Action Required:\n` +
        `1. Check browser console for blocked request\n` +
        `2. Configure CORS headers on the server\n` +
        `3. Whitelist origin: ${window.location.origin}`;
    }

    return {
      isCORS: true,
      message: errorMessage,
      actionRequired,
      url,
    };
  }

  return {
    isCORS: false,
    message: errorMessage,
  };
}

/**
 * Log CORS error with action required
 */
export function logCORSError(error: any, context?: string): void {
  const corsInfo = detectCORSError(error);

  if (corsInfo.isCORS) {
    console.error('🚫 CORS ERROR DETECTED', context ? `[${context}]` : '');
    console.error('📋 Error:', corsInfo.message);
    if (corsInfo.url) {
      console.error('🌐 URL:', corsInfo.url);
    }
    console.error('\n⚠️  ACTION REQUIRED:\n');
    console.error(corsInfo.actionRequired);
    console.error('\n💡 The system will continue with fallback behavior.\n');

    // Also log to console in a way that's easy to copy
    if (corsInfo.url) {
      console.log('%c🔧 QUICK FIX:', 'font-weight: bold; color: #ff6b6b;');
      console.log(`Whitelist this origin: ${window.location.origin}`);
      console.log(`Or add CORS headers for: ${corsInfo.url}`);
    }
  }
}

/**
 * Wrap a fetch/API call to detect and handle CORS errors
 */
export async function withCORSDetection<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const corsInfo = detectCORSError(error);
    if (corsInfo.isCORS) {
      logCORSError(error, context);
    }
    throw error;
  }
}

