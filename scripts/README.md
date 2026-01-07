# Database Seeding Script

This script populates your Supabase database with realistic mock data for testing the LMS features.

## Prerequisites

1. **Service Role Key**: You need the Supabase Service Role Key to bypass RLS (Row Level Security).
   - Go to Supabase Dashboard → Project Settings → API
   - Copy the `service_role` secret key
   - **⚠️ WARNING**: Never expose this key to the frontend! It has full database access.

2. **Environment Variables**: Create a `.env` or `.env.local` file in the project root with:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## What the Script Creates

- **10 Users**: Generated with fake names, emails, and avatars
- **5 Courses**: Including React, Next.js, AI, Python, and UI/UX courses
- **Modules & Lessons**: Each course has 3 modules, each module has 3 lessons (mix of video and quiz)
- **Enrollments**: Users are randomly enrolled in 1-3 courses
- **Progress**: Some users have 100% completion (for testing certificates), others have random progress
- **Reviews**: Enrolled users leave reviews (3-5 stars) for courses

## Running the Script

From the project root directory, run:

```bash
npx tsx scripts/seed.ts
```

You should see output like:
```
🌱 Starting Seed Process...

👤 Creating Users...
  ✅ Created user: John Doe (john.doe@example.com)
  ...
✅ Created 10 users.

📚 Creating Courses...
  ✅ Created course: React Advanced Bootcamp
  ...
✅ Created 5 courses with modules/lessons.

🎓 Enrolling Users...
✅ Created 25 enrollments with progress.

⭐ Writing Reviews...
✅ Created 15 reviews.

✨ Seed Complete! Database is populated.

📊 Summary:
  - Users: 10
  - Courses: 5
  - Enrollments: 25
  - Reviews: 15

🎉 All done!
```

## Notes

- The script uses the **Service Role Key** to bypass RLS, so it can create data for any user
- User passwords are set to `Password123!` for all seeded users (you can change this in the script)
- The script checks for existing enrollments/reviews to avoid duplicates
- Progress is calculated by marking lessons as completed in the `user_progress` table

## Troubleshooting

If you get errors:
1. **Missing env vars**: Make sure `.env.local` or `.env` has the required variables
2. **Permission errors**: Ensure you're using the Service Role Key, not the anon key
3. **Table not found**: Run the database migrations/schema first
4. **Duplicate key errors**: The script handles these, but if they persist, you may need to clean the database first

