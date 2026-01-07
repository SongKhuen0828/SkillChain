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
          eq: (column: string, value: any) => safeSupabase.from(table).select(columns, options).eq(column, value),
          single: async () => {
            return safeSupabaseQuery(
              () => query.single(),
              { operation: `select from ${table}` }
            );
          },
          maybeSingle: async () => {
            return safeSupabaseQuery(
              () => query.maybeSingle(),
              { operation: `select from ${table}` }
            );
          },
        };
      },
      insert: (values: any) => {
        const insertQuery = original.insert(values);
        return {
          ...insertQuery,
          select: (columns?: string) => {
            return safeSupabaseQuery(
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
                return await safeSupabaseQuery(
                  () => eqQuery.select(columns),
                  { operation: `update ${table}`, fallback: null }
                ) as Promise<{ data: null; error: any }>;
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
            return await safeSupabaseQuery(
              () => upsertQuery.select(columns),
              { operation: `upsert into ${table}`, fallback: null }
            ) as Promise<{ data: null; error: any }>;
          },
        };
      },
    };
  },
};

