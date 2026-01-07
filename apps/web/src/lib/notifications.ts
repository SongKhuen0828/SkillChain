import { supabase } from './supabase';

export type NotificationType = 
  | 'verification_approved'
  | 'verification_rejected'
  | 'course_enrolled'
  | 'certificate_earned'
  | 'new_student'
  | 'course_completed'
  | 'general';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  data = {},
}: CreateNotificationParams): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
      });

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}

// Pre-built notification creators
export const NotificationService = {
  // Educator verification approved
  async educatorApproved(educatorId: string, educatorName: string) {
    return createNotification({
      userId: educatorId,
      type: 'verification_approved',
      title: '🎉 Verification Approved!',
      message: `Congratulations ${educatorName}! Your educator account has been verified. You can now create and publish courses on SkillChain.`,
    });
  },

  // Educator verification rejected
  async educatorRejected(educatorId: string, educatorName: string, reason?: string) {
    return createNotification({
      userId: educatorId,
      type: 'verification_rejected',
      title: 'Verification Not Approved',
      message: reason 
        ? `Hi ${educatorName}, your verification was not approved. Reason: ${reason}. Please update your profile and try again.`
        : `Hi ${educatorName}, your verification was not approved. Please update your profile with more details and try again.`,
    });
  },

  // Learner enrolled in a course
  async courseEnrolled(learnerId: string, courseName: string, courseId: string) {
    return createNotification({
      userId: learnerId,
      type: 'course_enrolled',
      title: 'Successfully Enrolled!',
      message: `You have enrolled in "${courseName}". Start learning now!`,
      data: { courseId },
    });
  },

  // Educator receives new student notification
  async newStudent(educatorId: string, learnerName: string, courseName: string, courseId: string) {
    return createNotification({
      userId: educatorId,
      type: 'new_student',
      title: 'New Student Enrolled!',
      message: `${learnerName || 'A new learner'} has enrolled in your course "${courseName}".`,
      data: { courseId },
    });
  },

  // Certificate earned
  async certificateEarned(learnerId: string, courseName: string, certificateId: string) {
    return createNotification({
      userId: learnerId,
      type: 'certificate_earned',
      title: '🏆 Certificate Earned!',
      message: `Congratulations! You have earned a blockchain-verified certificate for completing "${courseName}".`,
      data: { certificateId },
    });
  },

  // Course completed
  async courseCompleted(learnerId: string, courseName: string, courseId: string) {
    return createNotification({
      userId: learnerId,
      type: 'course_completed',
      title: 'Course Completed!',
      message: `You have completed "${courseName}". Great job!`,
      data: { courseId },
    });
  },
};

