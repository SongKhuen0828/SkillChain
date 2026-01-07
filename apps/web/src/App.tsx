import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Toaster } from './components/ui/toaster'
import { LoadingScreen } from './components/LoadingScreen'
import { Layout } from './components/Layout'
import { EducatorLayout } from './layouts/EducatorLayout'
import { OrgLayout } from './layouts/OrgLayout'
import { OrgDashboard } from './pages/org/OrgDashboard'
import { OrgInvite } from './pages/org/OrgInvite'
import { OrgMembers } from './pages/org/OrgMembers'
import { OrgSettings } from './pages/org/OrgSettings'
import { OrgCourses } from './pages/org/OrgCourses'
import { AdminLayout } from './layouts/AdminLayout'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminOrganizations } from './pages/admin/AdminOrganizations'
import { AdminVerifications } from './pages/admin/AdminVerifications'
import { AdminBlockchain } from './pages/admin/AdminBlockchain'
import { AdminAI } from './pages/admin/AdminAI'
import { AdminOrgRequests } from './pages/admin/AdminOrgRequests'
import { AdminSettings } from './pages/admin/AdminSettings'
import { Login } from './pages/Login'
import { OrgRequestPage } from './pages/OrgRequestPage'
import SignUp from './pages/auth/SignUp'
import { LearnerDashboard } from './pages/LearnerDashboard'
import { EducatorDashboard } from './pages/educator/EducatorDashboard'
import { CreateCourse } from './pages/educator/CreateCourse'
import { EducatorCourses } from './pages/educator/EducatorCourses'
import { EducatorAnalytics } from './pages/educator/EducatorAnalytics'
import { EducatorSettings } from './pages/educator/EducatorSettings'
import { EducatorProfile } from './pages/educator/EducatorProfile'
import CourseBuilder from './pages/educator/CourseBuilder'
// import { CoursePage } from './pages/CoursePage'
import { CourseDetailPage } from './pages/learner/CourseDetailPage'
import CoursePlayerImmersive from './pages/learner/CoursePlayer'
import QuizPlayerPage from './pages/learner/QuizPlayerPage'
import { VerifyCertificate } from './pages/VerifyCertificate'
import { Verify } from './pages/public/Verify'
import { ProfilePage } from './pages/ProfilePage'
import { LandingPage } from './pages/LandingPage'
// import { OrgSignUp } from './pages/OrgSignUp'
import { SchedulePage } from './pages/learner/SchedulePage'
import { LearnerCourses } from './pages/learner/LearnerCourses'
import { Certificates } from './pages/learner/Certificates'
import { Leaderboard } from './pages/learner/Leaderboard'
import { Settings } from './pages/learner/Settings'
import { ensureDatabaseReady } from '@/lib/database/ensureDatabaseReady'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <Layout>{children}</Layout>
}

function ProtectedEducatorRoute() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (profile?.role !== 'educator') {
    return <Navigate to="/dashboard" replace />
  }

  return <EducatorLayout />
}

function ProtectedOrgRoute() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (profile?.role !== 'org_admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <OrgLayout />
}

function ProtectedAdminRoute() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <AdminLayout />
}

function ProtectedRouteNoLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function DashboardRoute() {
  const { profile } = useAuth()

  // Redirect based on role
  if (profile?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  if (profile?.role === 'org_admin') {
    return <Navigate to="/org/dashboard" replace />
  }

  if (profile?.role === 'educator') {
    return <Navigate to="/educator/dashboard" replace />
  }

  // For learners, show the LearnerDashboard component
  return <LearnerDashboard />
}

function App() {
  // Ensure database is ready on app startup
  useEffect(() => {
    ensureDatabaseReady().then(({ ready, issues }) => {
      if (!ready) {
        console.warn('Database readiness check found issues:', issues);
        console.warn('Please run database migrations to fix these issues.');
      } else {
        console.log('✅ Database is ready');
      }
    }).catch(error => {
      console.error('Error checking database readiness:', error);
    });
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Organization Registration Request (Public) */}
          <Route path="/register-organization" element={<OrgRequestPage />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          {/* Organization registration is disabled - admins must be created by system administrators */}
          {/* <Route path="/org/signup" element={<OrgSignUp />} /> */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/schedule"
            element={
              <ProtectedRoute>
                <SchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/courses"
            element={
              <ProtectedRoute>
                <LearnerCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/certificates"
            element={
              <ProtectedRoute>
                <Certificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/course/:id"
            element={
              <ProtectedRoute>
                <CourseDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/course/:id/learn"
            element={
              <ProtectedRouteNoLayout>
                <CoursePlayerImmersive />
              </ProtectedRouteNoLayout>
            }
          />
          <Route
            path="/learn/quiz/:quizId"
            element={
              <ProtectedRouteNoLayout>
                <QuizPlayerPage />
              </ProtectedRouteNoLayout>
            }
          />
          <Route
            path="/verify/:certId"
            element={<VerifyCertificate />}
          />
          {/* Public verification by transaction hash */}
          <Route
            path="/verify/tx/:tx_hash"
            element={<Verify />}
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          {/* Educator Routes */}
          <Route
            path="/educator"
            element={<ProtectedEducatorRoute />}
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<EducatorDashboard />} />
            <Route path="courses" element={<EducatorCourses />} />
            <Route path="courses/create" element={<CreateCourse />} />
            <Route path="courses/:courseId/edit" element={<CourseBuilder />} />
            <Route path="analytics" element={<EducatorAnalytics />} />
            <Route path="profile" element={<EducatorProfile />} />
            <Route path="settings" element={<EducatorSettings />} />
          </Route>
          <Route
            path="/org"
            element={<ProtectedOrgRoute />}
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OrgDashboard />} />
            <Route path="members" element={<OrgMembers />} />
            <Route path="invite" element={<OrgInvite />} />
            <Route path="courses" element={<OrgCourses />} />
            <Route path="courses/create" element={<CreateCourse />} />
            <Route path="courses/:courseId/edit" element={<CourseBuilder />} />
            <Route path="settings" element={<OrgSettings />} />
          </Route>
          {/* System Admin Routes */}
          <Route
            path="/admin"
            element={<ProtectedAdminRoute />}
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="organizations" element={<AdminOrganizations />} />
            <Route path="org-requests" element={<AdminOrgRequests />} />
            <Route path="verifications" element={<AdminVerifications />} />
            <Route path="blockchain" element={<AdminBlockchain />} />
            <Route path="ai" element={<AdminAI />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="/" element={<LandingPage />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
