import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' }); // Try .env.local first
dotenv.config(); // Fallback to .env

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env');
  console.error('Required env vars:');
  console.error('  - VITE_SUPABASE_URL (or SUPABASE_URL)');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seed() {
  console.log('🌱 Starting Seed Process...\n');

  try {
    // 1. Create Users
    console.log('👤 Creating Users...');
    const users = [];
    for (let i = 0; i < 10; i++) {
      const email = faker.internet.email();
      const password = 'Password123!';
      const fullName = faker.person.fullName();

      // Create Auth User
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          avatar_url: faker.image.avatar(),
        },
      });

      if (authError) {
        console.error(`  ❌ Error creating user ${email}:`, authError.message);
        continue;
      }

      if (authUser.user) {
        users.push(authUser.user);
        console.log(`  ✅ Created user: ${fullName} (${email})`);
      }
    }
    console.log(`\n✅ Created ${users.length} users.\n`);

    if (users.length === 0) {
      console.error('❌ No users created. Cannot proceed.');
      return;
    }

    // 2. Create Courses (using first user as educator)
    console.log('📚 Creating Courses...');
    const courses = [];
    const courseTopics = [
      'React Advanced Bootcamp',
      'Next.js 14 Mastery',
      'AI for Beginners',
      'Python Data Science',
      'UI/UX Design Fundamentals',
    ];

    const educatorId = users[0].id;

    for (const topic of courseTopics) {
      const courseData: any = {
        title: topic,
        description: faker.lorem.paragraphs(2),
        thumbnail_url: `https://picsum.photos/seed/${topic}/800/450`,
        price: parseFloat(faker.commerce.price({ min: 0, max: 199, dec: 2 })),
        educator_id: educatorId,
        is_published: true,
      };

      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert(courseData)
        .select()
        .single();

      if (courseError) {
        console.error(`  ❌ Error creating course ${topic}:`, courseError.message);
        continue;
      }

      if (course) {
        courses.push(course);
        console.log(`  ✅ Created course: ${topic}`);

        // 3. Create Modules & Lessons
        for (let m = 1; m <= 3; m++) {
          const { data: module, error: moduleError } = await supabase
            .from('modules')
            .insert({
              course_id: course.id,
              title: `Module ${m}: ${faker.hacker.verb()} ${faker.hacker.noun()}`,
              order_index: m,
            })
            .select()
            .single();

          if (moduleError) {
            console.error(`    ❌ Error creating module ${m}:`, moduleError.message);
            continue;
          }

          if (module) {
            for (let l = 1; l <= 3; l++) {
              const lessonType = Math.random() > 0.2 ? 'video' : 'quiz';
              const { error: lessonError } = await supabase.from('lessons').insert({
                module_id: module.id,
                title: faker.company.catchPhrase(),
                description: faker.lorem.sentence(),
                type: lessonType,
                duration: Math.floor(Math.random() * 20) + 5,
                order_index: l,
              });

              if (lessonError) {
                console.error(`      ❌ Error creating lesson ${l}:`, lessonError.message);
              }
            }
          }
        }
      }
    }
    console.log(`\n✅ Created ${courses.length} courses with modules/lessons.\n`);

    if (courses.length === 0) {
      console.error('❌ No courses created. Cannot proceed.');
      return;
    }

    // 4. Enrollments & Progress
    console.log('🎓 Enrolling Users...');
    let enrollmentCount = 0;

    for (const user of users) {
      // Enroll each user in 1-3 random courses
      const randomCourses = faker.helpers.arrayElements(courses, {
        min: 1,
        max: Math.min(3, courses.length),
      });

      for (const course of randomCourses) {
        // Check if already enrolled (skip if exists)
        const { data: existing } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', course.id)
          .maybeSingle();

        if (existing) {
          continue; // Skip if already enrolled
        }

        const { error: enrollError } = await supabase.from('enrollments').insert({
          user_id: user.id,
          course_id: course.id,
          enrolled_at: faker.date.past().toISOString(),
        });

        if (enrollError) {
          console.error(`  ❌ Error enrolling user in course:`, enrollError.message);
          continue;
        }

        enrollmentCount++;

        // Create user progress for some enrollments
        // Get all modules for this course
        const { data: modules } = await supabase
          .from('modules')
          .select('id')
          .eq('course_id', course.id);

        if (modules && modules.length > 0) {
          // Get all lessons for these modules
          const moduleIds = modules.map((m) => m.id);
          const { data: allLessons } = await supabase
            .from('lessons')
            .select('id')
            .in('module_id', moduleIds);

          if (allLessons && allLessons.length > 0) {
            // Decide progress: 20% are Completed (100%), others random
            const isCompleted = Math.random() < 0.2;
            const progressPercentage = isCompleted ? 100 : Math.floor(Math.random() * 90) + 10;

            // Mark some lessons as completed based on progress
            const lessonsToComplete = Math.floor(
              (allLessons.length * progressPercentage) / 100
            );
            const completedLessons = allLessons.slice(0, lessonsToComplete);

            for (const lesson of completedLessons) {
              const { error: progressError } = await supabase.from('user_progress').upsert(
                {
                  user_id: user.id,
                  lesson_id: lesson.id,
                  completed_at: faker.date.past().toISOString(),
                },
                { onConflict: 'user_id,lesson_id' }
              );
              if (progressError) {
                console.error(`      ❌ Error creating progress:`, progressError.message);
              }
            }
          }
        }
      }
    }

    console.log(`✅ Created ${enrollmentCount} enrollments with progress.\n`);

    // 5. Reviews
    console.log('⭐ Writing Reviews...');
    let reviewCount = 0;

    for (const course of courses) {
      // Get users enrolled in this course
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('course_id', course.id);

      if (!enrollments || enrollments.length === 0) continue;

      // Randomly select 2-5 enrolled users to leave reviews
      const reviewers = faker.helpers.arrayElements(enrollments, {
        min: Math.min(2, enrollments.length),
        max: Math.min(5, enrollments.length),
      });

      for (const enrollment of reviewers) {
        // Check if review already exists
        const { data: existing } = await supabase
          .from('reviews')
          .select('id')
          .eq('user_id', enrollment.user_id)
          .eq('course_id', course.id)
          .maybeSingle();

        if (existing) continue; // Skip if review exists

        const { error: reviewError } = await supabase.from('reviews').insert({
          user_id: enrollment.user_id,
          course_id: course.id,
          rating: faker.number.int({ min: 3, max: 5 }),
          comment: faker.lorem.sentences(2),
          created_at: faker.date.past().toISOString(),
        });

        if (reviewError) {
          console.error(`  ❌ Error creating review:`, reviewError.message);
          continue;
        }

        reviewCount++;
      }
    }

    console.log(`✅ Created ${reviewCount} reviews.\n`);

    console.log('✨ Seed Complete! Database is populated.');
    console.log('\n📊 Summary:');
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Courses: ${courses.length}`);
    console.log(`  - Enrollments: ${enrollmentCount}`);
    console.log(`  - Reviews: ${reviewCount}`);
  } catch (error: any) {
    console.error('❌ Seed process failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seed()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((e) => {
    console.error('💥 Fatal error:', e);
    process.exit(1);
  });

