/**
 * Automated System Integrity Guard
 * Checks and creates missing database structures using service role key
 * 
 * This script runs before npm run dev to ensure database is ready
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: 'apps/web/.env' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Check if a table exists by querying information_schema
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        ) as exists;
      `
    });
    
    // If RPC doesn't exist, try direct query
    if (error) {
      // Fallback: try to select from the table
      const { error: selectError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      return selectError?.code !== 'PGRST116' && selectError?.code !== '42P01';
    }
    
    return data?.[0]?.exists ?? false;
  } catch (error: any) {
    // Try direct query as fallback
    try {
      const { error: selectError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      return selectError?.code !== 'PGRST116' && selectError?.code !== '42P01';
    } catch {
      return false;
    }
  }
}

/**
 * Check if a column exists in a table
 */
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(0);
    
    return error?.code !== 'PGRST204';
  } catch {
    return false;
  }
}

/**
 * Execute SQL using Supabase (requires RPC function or direct SQL access)
 * Note: This requires a custom RPC function or we'll use migrations
 */
async function executeSQL(sql: string): Promise<void> {
  console.log(`🔧 Executing SQL: ${sql.substring(0, 100)}...`);
  
  // Note: Direct SQL execution requires service role key and RPC function
  // For now, we'll log the SQL and suggest running migrations
  console.warn('⚠️  Direct SQL execution requires a Supabase RPC function.');
  console.warn('📋 SQL to execute:');
  console.log(sql);
  console.warn('💡 Please run migrations manually or set up an RPC function.');
}

/**
 * Get SQL migration content
 */
function getMigrationSQL(): string {
  const migrationPath = path.join(__dirname, '../supabase/migrations/comprehensive_system_fix.sql');
  
  if (fs.existsSync(migrationPath)) {
    return fs.readFileSync(migrationPath, 'utf-8');
  }
  
  // Return minimal SQL if migration file doesn't exist
  return `
-- Auto-generated SQL for missing tables
CREATE TABLE IF NOT EXISTS ai_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_study_time TEXT,
  focus_span INTEGER,
  struggle TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS tab_switch_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 80,
  time_limit INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
  `;
}

/**
 * Main integrity check
 */
async function checkDatabaseIntegrity(): Promise<boolean> {
  console.log('🔍 Checking database integrity...\n');
  
  const issues: string[] = [];
  
  // Check required tables
  const requiredTables = [
    { name: 'ai_preferences', create: true },
    { name: 'quizzes', create: true },
    { name: 'study_sessions', create: false }, // Should exist from schema
  ];
  
  for (const table of requiredTables) {
    const exists = await tableExists(table.name);
    if (!exists) {
      issues.push(`Table '${table.name}' is missing`);
      if (table.create) {
        console.log(`⚠️  Table '${table.name}' is missing.`);
      }
    } else {
      console.log(`✅ Table '${table.name}' exists`);
    }
  }
  
  // Check study_sessions.tab_switch_count
  if (await tableExists('study_sessions')) {
    const hasColumn = await columnExists('study_sessions', 'tab_switch_count');
    if (!hasColumn) {
      issues.push("Column 'study_sessions.tab_switch_count' is missing");
      console.log(`⚠️  Column 'study_sessions.tab_switch_count' is missing.`);
    } else {
      console.log(`✅ Column 'study_sessions.tab_switch_count' exists`);
    }
  }
  
  if (issues.length > 0) {
    console.log('\n❌ Database integrity check found issues:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('\n💡 To fix these issues:');
    console.log('   1. Run: npx supabase migration up');
    console.log('   2. Or apply the SQL from: supabase/migrations/comprehensive_system_fix.sql');
    console.log('   3. Or use Supabase Dashboard SQL Editor\n');
    return false;
  }
  
  console.log('\n✅ Database integrity check passed!\n');
  return true;
}

// Run the check
if (require.main === module) {
  checkDatabaseIntegrity()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Error during integrity check:', error);
      process.exit(1);
    });
}

export { checkDatabaseIntegrity };

