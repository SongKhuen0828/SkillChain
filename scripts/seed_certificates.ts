/**
 * Seed Certificates Data for Testing
 * 
 * This script creates test certificate data in the database
 * to allow testing of certificate features without deploying a blockchain contract.
 * 
 * Usage: tsx scripts/seed_certificates.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { config } from 'dotenv'

// Load environment variables from multiple locations
config({ path: '.env.local' })
config({ path: '.env' })
config({ path: 'apps/web/.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!')
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test user ID (from your seeded study sessions)
const TEST_USER_ID = '4d70bd24-a23f-494f-8946-e96b712ccfc6'

/**
 * Generate a mock transaction hash (for testing purposes)
 */
function generateMockTxHash(): string {
  const chars = '0123456789abcdef'
  let hash = '0x'
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

/**
 * Generate a mock IPFS hash (for testing purposes)
 */
function generateMockIPFSHash(): string {
  const chars = '0123456789abcdef'
  let hash = 'Qm'
  for (let i = 0; i < 42; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

async function seedCertificates() {
  console.log('🎓 Starting certificate seeding...\n')

  try {
    // Step 1: Get the test user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', TEST_USER_ID)
      .single()

    if (profileError || !profile) {
      console.error('❌ Test user not found. Please ensure the user exists.')
      console.error('User ID:', TEST_USER_ID)
      process.exit(1)
    }

    console.log(`✅ Found user: ${profile.full_name || TEST_USER_ID}`)

    // Step 2: Get published courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('is_published', true)
      .limit(5)

    if (coursesError) {
      throw coursesError
    }

    if (!courses || courses.length === 0) {
      console.error('❌ No published courses found. Please create a course first.')
      process.exit(1)
    }

    console.log(`✅ Found ${courses.length} published course(s)\n`)

    // Step 3: Check existing certificates
    const { data: existingCerts, error: checkError } = await supabase
      .from('certificates')
      .select('id, course_id')
      .eq('user_id', TEST_USER_ID)

    if (checkError) {
      throw checkError
    }

    const existingCourseIds = new Set((existingCerts || []).map(c => c.course_id))

    // Step 4: Create certificates for courses that don't have one yet
    const certificatesToInsert = []
    const now = new Date()

    for (const course of courses) {
      if (existingCourseIds.has(course.id)) {
        console.log(`⏭️  Certificate already exists for course: ${course.title}`)
        continue
      }

      const txHash = generateMockTxHash()
      const ipfsHash = generateMockIPFSHash()

      certificatesToInsert.push({
        user_id: TEST_USER_ID,
        course_id: course.id,
        tx_hash: txHash,
        ipfs_hash: ipfsHash,
        minted_at: now.toISOString(),
        created_at: now.toISOString(),
      })

      console.log(`📜 Creating certificate for: ${course.title}`)
      console.log(`   TX Hash: ${txHash}`)
      console.log(`   IPFS Hash: ${ipfsHash}`)
    }

    if (certificatesToInsert.length === 0) {
      console.log('\n✅ All courses already have certificates!')
      return
    }

    // Step 5: Insert certificates
    const { data: insertedCerts, error: insertError } = await supabase
      .from('certificates')
      .insert(certificatesToInsert)
      .select('id, course_id, tx_hash')

    if (insertError) {
      throw insertError
    }

    console.log(`\n✅ Successfully created ${insertedCerts?.length || 0} certificate(s)!`)
    console.log('\n📋 Summary:')
    insertedCerts?.forEach((cert, index) => {
      const course = courses.find(c => c.id === cert.course_id)
      console.log(`   ${index + 1}. ${course?.title || 'Unknown Course'}`)
      console.log(`      TX: ${cert.tx_hash}`)
      console.log(`      Verify: /verify/${cert.tx_hash}`)
    })

    console.log('\n🎉 Certificate seeding complete!')
    console.log('\n💡 Next steps:')
    console.log('   1. Log in as the test user')
    console.log('   2. Visit /dashboard/certificates to view certificates')
    console.log('   3. Visit /verify/[tx_hash] to verify a certificate')

  } catch (error: any) {
    console.error('\n❌ Error seeding certificates:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the seed function
seedCertificates()

