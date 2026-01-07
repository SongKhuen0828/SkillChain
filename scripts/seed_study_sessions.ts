/**
 * Seed Study Sessions Script
 * Generates 5000 study session records with "Night Owl" pattern
 * 
 * Usage: npx tsx scripts/seed_study_sessions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

// Try multiple env file locations
dotenv.config({ path: '.env.local' });
dotenv.config({ path: 'apps/web/.env' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const METHODS = ['pomodoro', 'flowtime', 'blitz', '52_17'] as const;
type Method = typeof METHODS[number];

/**
 * Calculate success probability based on hour (Night Owl pattern)
 * High success: 18:00-24:00 (evening/night)
 * Low success: 06:00-11:00 (morning)
 */
function getSuccessProbability(hour: number): number {
  // Night Owl pattern: Peak performance in evening/night
  if (hour >= 18 && hour < 24) {
    // Evening peak: 85-95% success
    return 0.85 + (hour - 18) * 0.01;
  } else if (hour >= 0 && hour < 6) {
    // Late night: 75-85% success
    return 0.75 + (hour / 6) * 0.1;
  } else if (hour >= 6 && hour < 11) {
    // Morning low: 30-50% success
    return 0.3 + ((hour - 6) / 5) * 0.2;
  } else {
    // Afternoon: 50-70% success
    return 0.5 + ((hour - 11) / 7) * 0.2;
  }
}

/**
 * Calculate duration based on completion status and method
 */
function calculateDuration(completed: boolean, method: Method): number {
  const baseDurations: Record<Method, number> = {
    pomodoro: 25 * 60, // 25 minutes
    flowtime: 90 * 60, // 90 minutes
    blitz: 15 * 60, // 15 minutes
    '52_17': 52 * 60, // 52 minutes
  };

  const baseDuration = baseDurations[method];
  
  if (completed) {
    // Completed sessions are longer (full duration + some variation)
    return baseDuration + Math.floor(Math.random() * baseDuration * 0.3);
  } else {
    // Incomplete sessions are shorter (partial completion)
    return Math.floor(baseDuration * (0.3 + Math.random() * 0.4));
  }
}

async function seedStudySessions() {
  try {
    console.log('🌱 Starting study sessions seeding...');

    // 1. Get a real user ID (or use the first user)
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found. Please create a user first.');
      process.exit(1);
    }

    const userId = users[0].id;
    console.log(`✅ Using user ID: ${userId}`);

    // 2. Get course IDs
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .limit(10);

    if (coursesError || !courses || courses.length === 0) {
      console.error('❌ No courses found. Please create courses first.');
      process.exit(1);
    }

    const courseIds = courses.map(c => c.id);
    console.log(`✅ Found ${courseIds.length} courses`);

    // 3. Generate 5000 study sessions
    const sessions = [];
    const TOTAL_SESSIONS = 5000;
    const BATCH_SIZE = 100;

    // Generate sessions over the last 90 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    console.log(`📊 Generating ${TOTAL_SESSIONS} sessions...`);

    for (let i = 0; i < TOTAL_SESSIONS; i++) {
      // Random date within the last 90 days
      const sessionDate = faker.date.between({ from: startDate, to: endDate });
      const hour = sessionDate.getHours();

      // Determine completion based on hour (Night Owl pattern)
      const successProb = getSuccessProbability(hour);
      const completed = Math.random() < successProb;

      // Random method
      const method = faker.helpers.arrayElement(METHODS);

      // Calculate duration
      const durationSeconds = calculateDuration(completed, method);

      sessions.push({
        user_id: userId,
        course_id: faker.helpers.arrayElement(courseIds),
        method_used: method,
        duration_seconds: durationSeconds,
        completed: completed,
        started_at: sessionDate.toISOString(),
      });

      // Progress indicator
      if ((i + 1) % 500 === 0) {
        console.log(`   Generated ${i + 1}/${TOTAL_SESSIONS} sessions...`);
      }
    }

    console.log(`✅ Generated ${sessions.length} sessions`);
    console.log(`📈 Statistics:`);
    const completedCount = sessions.filter(s => s.completed).length;
    const morningCount = sessions.filter(s => {
      const hour = new Date(s.started_at).getHours();
      return hour >= 6 && hour < 11;
    }).length;
    const eveningCount = sessions.filter(s => {
      const hour = new Date(s.started_at).getHours();
      return hour >= 18 && hour < 24;
    }).length;
    console.log(`   Completed: ${completedCount} (${(completedCount / sessions.length * 100).toFixed(1)}%)`);
    console.log(`   Morning sessions: ${morningCount}`);
    console.log(`   Evening sessions: ${eveningCount}`);

    // 4. Insert in batches
    console.log(`💾 Inserting sessions into database (batch size: ${BATCH_SIZE})...`);

    for (let i = 0; i < sessions.length; i += BATCH_SIZE) {
      const batch = sessions.slice(i, i + BATCH_SIZE);
      
      const { error: insertError } = await supabase
        .from('study_sessions')
        .insert(batch);

      if (insertError) {
        console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError);
        throw insertError;
      }

      if ((i + 1) % 1000 === 0 || i + BATCH_SIZE >= sessions.length) {
        console.log(`   Inserted ${Math.min(i + BATCH_SIZE, sessions.length)}/${sessions.length} sessions...`);
      }
    }

    console.log('✅ Successfully seeded 5000 study sessions!');
    console.log('🎉 Night Owl pattern data is ready for analytics!');

  } catch (error: any) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedStudySessions()
  .then(() => {
    console.log('✨ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

