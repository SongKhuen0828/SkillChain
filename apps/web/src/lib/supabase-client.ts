/**
 * Wrapped Supabase Client with Global Error Handler
 * All Supabase calls should use this wrapper to suppress console noise
 */

import { supabase } from './supabase';
import { safeSupabaseQuery } from './system/globalErrorHandler';

/**
 * Wrapped Supabase client with automatic error handling
 */
export const safeSupabase = {
  ...supabase,
  
  from: (table: string) => {
    const original = supabase.from(table);
    
    return {
      ...original,
      select: (columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) => {
        const query = original.select(columns, options);
        return {
          ...query,
          eq: (column: string, value: any): any => safeSupabase.from(table).select(columns, options).eq(column, value),
          single: async () => {
            return await safeSupabaseQuery(
              () => query.single(),
              { operation: `select from ${table}` }
            ) as unknown as Promise<{ data: unknown; error: any }>;
          },
          maybeSingle: async () => {
            return await safeSupabaseQuery(
              () => query.maybeSingle(),
              { operation: `select from ${table}` }
            ) as unknown as Promise<{ data: unknown; error: any }>;
          },
        };
      },
      insert: (values: any) => {
        const insertQuery = original.insert(values);
        return {
          ...insertQuery,
          select: async (columns?: string) => {
            // @ts-ignore - Supabase type definition issue, works at runtime
            return await safeSupabaseQuery(
              () => insertQuery.select(columns),
              { operation: `insert into ${table}`, fallback: null }
            );
          },
        };
      },
      update: (values: any) => {
        const updateQuery = original.update(values);
        return {
          ...updateQuery,
          eq: (column: string, value: any) => {
            const eqQuery = updateQuery.eq(column, value);
            return {
              ...eqQuery,
              select: async (columns?: string) => {
                // @ts-ignore - Supabase type definition issue, works at runtime
                return await safeSupabaseQuery(
                  () => eqQuery.select(columns),
                  { operation: `update ${table}`, fallback: null }
                );
              },
            };
          },
        };
      },
      upsert: (values: any) => {
        const upsertQuery = original.upsert(values);
        return {
          ...upsertQuery,
          select: async (columns?: string) => {
            // @ts-ignore - Supabase type definition issue, works at runtime
            return await safeSupabaseQuery(
              () => upsertQuery.select(columns),
              { operation: `upsert into ${table}`, fallback: null }
            );
          },
        };
      },
    };
  },
};

