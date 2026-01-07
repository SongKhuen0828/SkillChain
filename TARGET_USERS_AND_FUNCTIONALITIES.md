# 1.6 Target Users and Functionalities

## 1.6.1 Target Users

The Personalized Skill Learning Platform (SkillChain) serves the following user groups:

* **Learners** - Individual students who enroll in courses, track their progress, and earn blockchain-backed certificates.
* **Educators** - Independent instructors who create, publish, and manage courses, including modules, lessons, and assessments.
* **Educational Organizations** - Universities, training providers, and institutions that manage multiple instructors and learners within an organizational structure.
* **Organization Administrators** - Administrators who manage organizational members, courses, and monitor learning analytics for their organization.
* **Employers / Certificate Verifiers** - Third parties (recruiters, HR departments, institutions) who need to verify the authenticity of certificates issued on the platform.
* **System Administrators** - Platform administrators who manage the overall system, including users, organizations, AI models, blockchain infrastructure, and platform settings.

## 1.6.2 Functionalities / Deliverables

### For Learners

The Personalized Skill Learning Platform enables learners to:

* **Authentication & Account Management**
  * Register securely with email and password, choosing between learner or educator roles.
  * Sign in securely and manage their personal profiles, including full name, avatar, and wallet address for blockchain integration.
  * Recover passwords using secure authentication methods.
  * Update profile settings and preferences.

* **AI-Powered Learning Optimization**
  * Receive AI-generated adaptive time management suggestions based on their learning patterns, habits, and goals to improve consistency and productivity.
  * Access personalized study schedule recommendations that adapt to their learning behavior and optimal study times.
  * Get AI-driven course recommendations based on completed modules, learning history, and personal interests.
  * Enable or disable the AI Companion feature based on their preferences.

* **Course Management**
  * Browse available published courses with detailed course information, including descriptions, instructors, and learning outcomes.
  * Enroll in courses and track enrollment status.
  * Access structured course content organized into modules and lessons, including videos, documents, and interactive materials.
  * Complete lessons and track individual lesson progress.
  * Take quizzes and assessments to test knowledge, with immediate feedback showing scores (e.g., "10/60 points") and correct/incorrect answers.
  * View detailed course progress reports showing completion percentage, time spent, and lesson-by-lesson status.

* **Gamification & Engagement**
  * Earn XP (experience points) for completing lessons and quizzes, with bonus XP based on quiz performance.
  * Maintain learning streaks to encourage consistent daily practice.
  * Compete on leaderboards ranked by total XP, seeing their position among top learners.
  * Receive motivational notifications for milestones, achievements, and learning reminders.

* **Blockchain Certificates**
  * Automatically receive certificates when completing courses (100% completion).
  * View all earned certificates in a dedicated certificates page.
  * Mint certificates to the blockchain (Polygon/Polygon Amoy testnet) as tamper-proof NFTs.
  * Track certificate minting status (pending minting, minted on blockchain) with transaction hashes and blockchain explorer links.
  * Download or share certificate information with verifiers.

* **Analytics & Insights**
  * View detailed course progress reports with completion rates and time spent.
  * Access personalized learning analytics showing overall performance, XP earned, and learning streaks.
  * Receive weekly learning summaries via notifications highlighting progress and achievements.

* **Notifications**
  * Receive real-time notifications for:
    * Course enrollments and completions
    * Certificate earnings
    * Weekly learning summaries
    * Study milestones and achievements
    * Organization invitations (with accept/decline actions)

### For Educators

The platform enables educators to:

* **Course Creation & Management**
  * Create new courses with titles, descriptions, pricing, thumbnails, and learning objectives.
  * Organize course content into modules and lessons with structured ordering.
  * Add different lesson types (video, document, interactive content).
  * Create quizzes and assessments with multiple-choice questions, correct answers, and point values.
  * Set passing scores for quizzes (default 80%).
  * Publish or unpublish courses to control learner access.
  * Edit and update course content, modules, lessons, and quizzes.

* **Learner Analytics**
  * Monitor learner progress across all their courses through a dedicated analytics dashboard.
  * View course-level statistics including enrollment counts, completion rates, and average scores.
  * Track individual learner progress with detailed breakdowns by course, module, and lesson.
  * Analyze learner engagement metrics to identify areas for content improvement.
  * Receive notifications when new students enroll in their courses or complete courses.

* **Organization Integration (Optional)**
  * Join an educational organization (if invited) to contribute courses under the organization's umbrella.
  * Access organizational resources and collaborate with other instructors within the same organization.

### For Educational Organizations

The platform enables organizations to:

* **Organization Registration & Management**
  * Register for an organization account (subject to system administrator approval).
  * Manage organization profile including name, description, and logo upload.
  * Have organization administrators created by system admins (with default passwords sent via email).

* **Member Management**
  * Invite learners and educators to join the organization using invite codes.
  * View all organization members (learners and educators).
  * Track member joining dates and activity status.
  * Send organization invitations via notifications with direct accept/decline actions.

* **Course Management**
  * Create and manage courses associated with the organization.
  * Assign educators to specific courses.
  * Monitor all courses created by organization members.
  * Track course enrollments and completions across the organization.

* **Analytics & Reporting**
  * Access organization-wide analytics dashboard showing:
    * Total members (learners and educators)
    * Active members (activity this week)
    * Total courses and enrollments
    * Total certificates issued
    * Average course completion rates
    * Total study hours across all members
  * View top-performing courses by enrollment and completion rates.
  * Monitor recent member activity and engagement trends.

### For Organization Administrators

Organization administrators can:

* **Dashboard & Overview**
  * Access a comprehensive organization dashboard with key metrics and statistics.
  * View recent member activity and top-performing courses.
  * Monitor organization health and engagement levels.

* **Member Operations**
  * Generate and manage organization invite codes.
  * Invite new members via email with organization codes.
  * View and manage all organization members.
  * Track member progress and course completions.

* **Course Oversight**
  * Monitor all courses created within the organization.
  * View course analytics including enrollments and completion rates.
  * Support educators in course creation and management.

* **Settings & Configuration**
  * Update organization profile information.
  * Upload and manage organization logo.
  * Configure organization settings and preferences.

### For Employers / Certificate Verifiers

The platform enables certificate verifiers to:

* **Certificate Verification**
  * Verify the authenticity of certificates through blockchain by entering a certificate ID or scanning a QR code.
  * View certificate metadata directly from blockchain records, including:
    * Course name and description
    * Learner name
    * Issue date and completion date
    * Issuing organization name and logo
    * Blockchain transaction hash
    * IPFS metadata hash (for decentralized storage)
  * Access blockchain explorer links to verify transactions on-chain.
  * Distinguish between certificates that are ready to mint versus already minted on blockchain.

* **Verification Portal (Future Enhancement)**
  * Manage multiple candidate verifications through a dedicated verifier portal.
  * Batch verify certificates for recruitment processes.
  * Export verification reports for compliance and record-keeping.

### For System Administrators

The platform enables system administrators to:

* **User Management**
  * View all platform users across all roles (learners, educators, org admins).
  * Manage user roles and permissions.
  * Monitor user registration and activity statistics.
  * Verify educator accounts (approve/reject verification requests).

* **Organization Management**
  * Review and approve organization registration requests.
  * Create new organizations and organization administrators.
  * Set default passwords for new org admins (sent via email).
  * View all registered organizations and their details.
  * Manage organization status and settings.

* **AI Model Management**
  * Configure and monitor AI model training for:
    * **Scheduling Models** - Predict optimal study times and methods for learners.
    * **Recommendation Models** - Suggest relevant courses based on learner history.
    * **Performance Models** - Analyze learner performance and predict completion success.
  * Trigger model training manually or schedule automatic retraining.
  * Monitor training logs, metrics (accuracy, loss), and training samples.
  * Deploy trained models and manage model versions.
  * View AI model performance analytics and training history.

* **Blockchain Infrastructure Management**
  * Configure blockchain network settings (testnet vs. mainnet).
  * Monitor blockchain transaction status and gas fees.
  * Manage smart contract deployments and updates.
  * Configure blockchain explorer URLs for certificate verification.
  * Track certificate minting operations and transaction hashes.

* **Platform Analytics & Monitoring**
  * Access comprehensive platform statistics including:
    * Total users (by role: learners, educators, org admins)
    * Total organizations and courses
    * Total certificates issued
    * Platform-wide engagement metrics
  * Monitor system performance and scalability.
  * View recent platform activity and trends.

* **Security & Audit**
  * Implement Row Level Security (RLS) policies across database tables.
  * Monitor security events and user actions.
  * Manage authentication and authorization settings.
  * Review audit logs for compliance and transparency.

* **Platform Settings**
  * Configure global platform settings and preferences.
  * Manage email service configuration (e.g., Resend API for welcome emails).
  * Set default platform parameters (e.g., default passing scores, XP rewards).
  * Configure notification templates and triggers.

## Key Technical Features

* **Decentralized Storage** - Certificates and metadata stored on IPFS/Pinata for tamper-proof storage.
* **Blockchain Integration** - ERC-721 NFT certificates on Polygon blockchain with non-transferable tokens.
* **AI/ML Engine** - TensorFlow.js for client-side scheduling predictions and Python FastAPI service for model training.
* **Real-time Notifications** - WebSocket-based notification system with real-time updates.
* **Gamification System** - XP points, streaks, leaderboards, and achievement tracking.
* **Multi-tenant Architecture** - Support for independent educators and organization-based learning communities.
* **Comprehensive Analytics** - Detailed progress tracking, completion rates, and engagement metrics at user, course, and organization levels.

