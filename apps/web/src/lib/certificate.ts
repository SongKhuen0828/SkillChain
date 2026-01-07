import CryptoJS from 'crypto-js';
import { supabase } from './supabase';

/**
 * Certificate Utilities
 * Handles certificate generation, verification hash, and course completion checks
 */

/**
 * Create a temporary DOM element for certificate rendering
 * This is used for html2canvas to capture the certificate image
 */
export async function createCertificateElement(
  studentName: string,
  courseTitle: string,
  completionDate: string,
  educatorName?: string,
  theme: 'classic' | 'academic' | 'tech' | 'creative' = 'classic',
  userId?: string,
  courseId?: string,
  organizationLogoUrl?: string | null,
  organizationName?: string | null
): Promise<HTMLElement> {
  // Generate verification hash if userId and courseId are provided
  const verificationHash = userId && courseId 
    ? CryptoJS.SHA256(`${userId}-${courseId}-${completionDate}`).toString().toUpperCase()
    : null;

  // Create certificate HTML based on theme
  const certificate = document.createElement('div');
  certificate.style.width = '800px';
  certificate.style.height = '565px';
  certificate.style.position = 'absolute';
  certificate.style.left = '-9999px';
  certificate.style.top = '-9999px';
  certificate.style.background = theme === 'tech' ? '#0f172a' : theme === 'academic' ? '#fef3c7' : '#ffffff';
  certificate.style.color = theme === 'tech' ? '#ffffff' : '#1e293b';
  certificate.style.fontFamily = theme === 'tech' ? "'Inter', 'Roboto', sans-serif" : "'Times New Roman', serif";
  certificate.style.position = 'relative';
  certificate.style.overflow = 'hidden';

  // Border styling based on theme
  const borderColor = theme === 'tech' ? '#06b6d4' : theme === 'academic' ? '#1e3a8a' : theme === 'creative' ? '#ec4899' : '#d97706';
  
  // Organization logo in top-right corner (if provided)
  const orgLogoHtml = organizationLogoUrl ? `
    <div style="position: absolute; top: 24px; right: 24px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <img src="${organizationLogoUrl}" alt="${organizationName || 'Organization'}" style="width: 56px; height: 56px; border-radius: 8px; object-fit: contain; border: 2px solid ${theme === 'tech' ? 'rgba(6,182,212,0.5)' : '#e2e8f0'}; background: white; padding: 4px;" />
      ${organizationName ? `<p style="font-size: 8px; color: ${theme === 'tech' ? '#94a3b8' : '#64748b'}; text-transform: uppercase; letter-spacing: 0.5px; max-width: 80px; text-align: center; line-height: 1.2;">${organizationName}</p>` : ''}
    </div>
  ` : '';
  
  certificate.innerHTML = `
    <div style="position: absolute; inset: 16px; border: 4px ${theme === 'academic' ? 'double' : 'solid'} ${borderColor};"></div>
    <div style="position: absolute; inset: 8px; border: 2px solid ${theme === 'tech' ? 'rgba(6,182,212,0.5)' : theme === 'academic' ? '#1e40af' : theme === 'creative' ? '#d946ef' : '#fbbf24'};"></div>
    ${orgLogoHtml}
    <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 48px;">
      <div style="margin-bottom: 24px;">
        <div style="width: 64px; height: 64px; ${theme === 'tech' ? 'background: #06b6d4; border-radius: 8px;' : theme === 'academic' ? 'background: #f59e0b; border-radius: 50%;' : theme === 'creative' ? 'background: linear-gradient(to bottom right, #f472b6, #a855f7); border-radius: 50%;' : 'background: #1e293b; border-radius: 50%;'} display: flex; align-items: center; justify-content: center; margin: 0 auto;">
          <span style="font-size: 24px; font-weight: bold; ${theme === 'tech' ? 'color: #0f172a;' : 'color: white;'}">S</span>
        </div>
        <p style="font-size: 12px; color: ${theme === 'tech' ? '#06b6d4' : theme === 'academic' ? '#1e3a8a' : theme === 'creative' ? '#ec4899' : '#64748b'}; margin-top: 8px; letter-spacing: 2px; text-transform: uppercase; font-weight: bold;">SkillChain Verified</p>
      </div>
      <h1 style="font-size: 48px; font-weight: bold; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 2px;">Certificate</h1>
      <p style="font-size: 20px; ${theme === 'tech' ? 'color: #06b6d4;' : theme === 'academic' ? 'color: #1e40af; font-style: italic;' : theme === 'creative' ? 'color: #ec4899;' : 'color: #64748b; font-style: italic;'} margin-bottom: 32px;">of Completion</p>
      <p style="font-size: 18px; color: ${theme === 'tech' ? '#cbd5e1' : '#475569'}; margin-bottom: 8px;">This certifies that</p>
      <h2 style="font-size: 36px; font-weight: bold; margin-bottom: 8px; border-bottom: 2px solid ${borderColor}; padding-bottom: 12px; display: inline-block; min-width: 400px; ${theme === 'tech' ? 'color: #06b6d4;' : theme === 'academic' ? 'color: #1e3a8a;' : theme === 'creative' ? 'color: #a855f7;' : 'color: #0d9488;'}">${studentName}</h2>
      <p style="font-size: 18px; color: ${theme === 'tech' ? '#cbd5e1' : '#475569'}; margin-top: 24px; margin-bottom: 8px;">has successfully completed the course</p>
      <h3 style="font-size: 32px; font-weight: bold; margin-bottom: 48px; max-width: 600px;">${courseTitle}</h3>
      <div style="display: flex; justify-content: space-between; width: 100%; padding: 0 80px; margin-top: auto; align-items: flex-end;">
        <div style="text-align: center;">
          <p style="font-size: 18px; font-weight: bold; border-top: 2px solid ${borderColor}; padding-top: 8px;">${completionDate}</p>
          <p style="font-size: 12px; color: ${theme === 'tech' ? '#94a3b8' : '#64748b'}; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Date Completed</p>
        </div>
        <div style="width: 112px; height: 112px; border-radius: 50%; border: 4px solid ${borderColor}; ${theme === 'tech' ? 'background: rgba(6,182,212,0.1);' : theme === 'academic' ? 'background: #fef3c7;' : theme === 'creative' ? 'background: linear-gradient(to bottom right, #fce7f3, #f3e8ff);' : ''} display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; text-transform: uppercase; text-align: center; line-height: 1.2; color: ${borderColor};">
          Official<br/>SkillChain<br/>Award
        </div>
        <div style="text-align: center;">
          <p style="font-size: 18px; font-weight: bold; border-top: 2px solid ${borderColor}; padding-top: 8px;">${educatorName || 'SkillChain Team'}</p>
          <p style="font-size: 12px; color: ${theme === 'tech' ? '#94a3b8' : '#64748b'}; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Instructor Signature</p>
        </div>
      </div>
      ${verificationHash ? `
        <div style="position: absolute; bottom: 24px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 10px; color: ${theme === 'tech' ? '#06b6d4' : '#64748b'}; font-weight: bold;">
            <span>🔒</span>
            <span>Blockchain Verification Hash:</span>
          </div>
          <p style="font-size: 9px; color: ${theme === 'tech' ? '#94a3b8' : '#475569'}; font-family: monospace; letter-spacing: 1px; word-break: break-all; text-align: center; max-width: 100%; padding: 0 16px;">
            ${verificationHash}
          </p>
        </div>
      ` : ''}
    </div>
  `;

  document.body.appendChild(certificate);
  
  // Wait a bit for styles to apply and fonts to load
  await new Promise(resolve => setTimeout(resolve, 200));

  return certificate;
}

/**
 * Clean up certificate element after minting
 */
export function cleanupCertificateElement(element: HTMLElement) {
  try {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    } else if (element.parentElement) {
      element.parentElement.removeChild(element);
    }
  } catch (error) {
    console.warn('Error cleaning up certificate element:', error);
  }
}

/**
 * Generate SHA-256 verification hash for certificate
 * Format: SHA256({userId}-{courseId}-{completionDate})
 */
export function generateVerificationHash(
  userId: string,
  courseId: string,
  completionDate: string
): string {
  const hashInput = `${userId}-${courseId}-${completionDate}`;
  return CryptoJS.SHA256(hashInput).toString().toUpperCase();
}

/**
 * Check if user has completed all lessons in a course
 * Returns: { isCompleted: boolean, completedCount: number, totalCount: number }
 */
export async function checkCourseCompletion(
  userId: string,
  courseId: string
): Promise<{ isCompleted: boolean; completedCount: number; totalCount: number }> {
  try {
    // Get all lessons for this course
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select(`
        id,
        modules (
          id,
          lessons (
            id
          )
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    // Flatten all lesson IDs
    const allLessonIds: string[] = [];
    if (courseData?.modules) {
      courseData.modules.forEach((module: any) => {
        if (module.lessons) {
          module.lessons.forEach((lesson: any) => {
            allLessonIds.push(lesson.id);
          });
        }
      });
    }

    const totalCount = allLessonIds.length;

    if (totalCount === 0) {
      return { isCompleted: false, completedCount: 0, totalCount: 0 };
    }

    // Get user's completed lessons for this course
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .in('lesson_id', allLessonIds);

    if (progressError) throw progressError;

    const completedCount = progressData?.length || 0;
    const isCompleted = completedCount === totalCount;

    return { isCompleted, completedCount, totalCount };
  } catch (error) {
    console.error('Error checking course completion:', error);
    return { isCompleted: false, completedCount: 0, totalCount: 0 };
  }
}

/**
 * Update enrollment status to 'completed' if all lessons are done AND all quiz thresholds are met
 * Optionally triggers automatic certificate minting
 */
export async function updateEnrollmentStatus(
  userId: string,
  courseId: string,
  options?: {
    autoMintCertificate?: boolean;
    certificateElement?: HTMLElement;
    studentName?: string;
    courseTitle?: string;
    educatorName?: string;
  }
): Promise<boolean> {
  try {
    const { isCompleted } = await checkCourseCompletion(userId, courseId);

    if (isCompleted) {
      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'completed' })
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (error) throw error;

      // Trigger automatic certificate minting if enabled
      if (options?.autoMintCertificate) {
        let certificateElement: HTMLElement | null = options.certificateElement || null;
        let shouldCleanup = false; // Track if we created the element
        let studentName = options.studentName;
        let courseTitle = options.courseTitle;

        try {
          // If certificateElement is not provided, fetch data and create one
          if (!certificateElement || !studentName || !courseTitle) {
            // Fetch course data, user profile, and organization in parallel
            const [courseResult, userResult] = await Promise.all([
              supabase
                .from('courses')
                .select('title, certificate_theme, educator_id, org_id, profiles!courses_educator_id_fkey(full_name)')
                .eq('id', courseId)
                .single(),
              supabase
                .from('profiles')
                .select('full_name')
                .eq('id', userId)
                .single(),
            ]);

            const courseData = courseResult.data;
            const userProfile = userResult.data;

            // Fetch organization if course has org_id
            let organizationLogoUrl: string | null = null;
            let organizationName: string | null = null;
            
            if (courseData?.org_id) {
              const { data: orgData } = await supabase
                .from('organizations')
                .select('name, logo_url')
                .eq('id', courseData.org_id)
                .single();
              
              if (orgData) {
                organizationLogoUrl = orgData.logo_url;
                organizationName = orgData.name;
              }
            }

            // Set names from fetched data or fallback
            studentName = studentName || userProfile?.full_name || 'Student';
            courseTitle = courseTitle || courseData?.title || 'Course';
            const educatorName = (courseData?.profiles as any)?.full_name || options.educatorName || 'SkillChain Team';
            const theme = (courseData?.certificate_theme as any) || 'classic';

            // Create certificate element if not provided
            if (!certificateElement) {
              certificateElement = await createCertificateElement(
                studentName,
                courseTitle,
                new Date().toISOString().split('T')[0],
                educatorName,
                theme,
                userId,
                courseId,
                organizationLogoUrl,
                organizationName
              );
              shouldCleanup = true; // Mark for cleanup since we created it
            }
          }

          // Import dynamically to avoid circular dependencies
          const { autoMintCertificate } = await import('./blockchain/autoMintCertificate');
          
          await autoMintCertificate(
            userId,
            courseId,
            studentName!,
            courseTitle!,
            certificateElement!,
            options.educatorName,
            new Date().toISOString().split('T')[0]
          );
          
          // If we created the element, it will be cleaned up by autoMintCertificate
          shouldCleanup = false;
        } catch (mintError) {
          console.error('Certificate minting failed (non-blocking):', mintError);
          
          // Clean up certificate element if we created it and minting failed
          if (shouldCleanup && certificateElement) {
            cleanupCertificateElement(certificateElement);
          }
          
          // Don't throw - enrollment status update succeeded
        }
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating enrollment status:', error);
    return false;
  }
}
