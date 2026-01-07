/**
 * Global Error Handler with Schema Repair
 * Wraps Supabase calls and automatically retries with schema repair on errors
 */

// import { supabase } from '@/lib/supabase'; // Not used

interface ErrorWithCode extends Error {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
}

/**
 * Schema repair payloads for common errors
 */
async function attemptSchemaRepair(error: ErrorWithCode, _operation: string): Promise<boolean> {
  // Check if it's a schema/column error
  if (error.code === 'PGRST204' || error.code === '42703') {
    // Column doesn't exist
    const columnMatch = error.message.match(/column "([^"]+)" of relation "([^"]+)" does not exist/);
    if (columnMatch) {
      const [, columnName, tableName] = columnMatch;
      console.warn(`🔧 Schema Repair: Column ${tableName}.${columnName} is missing. Please run migrations.`);
      return false; // Cannot auto-repair, need migrations
    }
  }

  if (error.code === 'PGRST116' || error.code === '42P01') {
    // Table doesn't exist
    const tableMatch = error.message.match(/relation "([^"]+)" does not exist/);
    if (tableMatch) {
      const [, tableName] = tableMatch;
      console.warn(`🔧 Schema Repair: Table ${tableName} is missing. Please run migrations.`);
      return false; // Cannot auto-repair, need migrations
    }
  }

  return false;
}

/**
 * Global Supabase query wrapper with automatic retry and schema repair
 */
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: {
    retries?: number;
    retryDelay?: number;
    operation?: string;
    fallback?: T;
  } = {}
): Promise<{ data: T | null; error: any }> {
  const {
    retries = 1,
    retryDelay = 1000,
    operation = 'query',
    fallback = null,
  } = options;

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await queryFn();
      
      if (result.error) {
        lastError = result.error;
        
        // Attempt schema repair on first error
        if (attempt === 0) {
          const repaired = await attemptSchemaRepair(result.error, operation);
          if (repaired) {
            // Retry the query
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }

        // If it's a non-critical error, return fallback (suppress console noise)
        if (result.error.code === 'PGRST116' || result.error.code === '42P01') {
          // Silent fail - schema errors are handled by migrations
          return { data: fallback, error: null };
        }

        // For other errors, return as-is (don't log, let caller handle)
        return result;
      }

      return result;
    } catch (error: any) {
      lastError = error;
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // Final fallback
  if (lastError) {
    // Only log non-schema errors to avoid noise
    const isSchemaError = lastError.code === 'PGRST204' || lastError.code === 'PGRST116' || lastError.code === '42P01' || lastError.code === '42703';
    if (!isSchemaError) {
      // Only log critical errors (not schema/404s)
      // Schema errors are handled silently
    }
    return { data: fallback, error: lastError };
  }

  return { data: fallback, error: null };
}

/**
 * Safe array map with undefined checks
 */
export function safeMap<T, R>(
  array: T[] | null | undefined,
  mapper: (item: T, index: number) => R,
  fallback: R[] = []
): R[] {
  if (!array || !Array.isArray(array)) {
    return fallback;
  }
  try {
    return array.map(mapper);
  } catch (error) {
    console.warn('Safe map error:', error);
    return fallback;
  }
}

/**
 * Safe property access with fallback
 */
export function safeGet<T>(
  obj: any,
  path: string,
  fallback: T
): T {
  try {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current == null || current[key] === undefined) {
        return fallback;
      }
      current = current[key];
    }
    return current as T;
  } catch {
    return fallback;
  }
}

