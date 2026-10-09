import { Navigate, RouteObject } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { WelcomePage } from '@/pages/WelcomePage';
import { AdminDashboardPage } from '@/pages/admin/DashboardPage';
import { AdminPatientsPage } from '@/pages/admin/PatientsPage';
import { AdminPaymentsPage } from '@/pages/admin/PaymentsPage';
import { AdminProvidersPage } from '@/pages/admin/ProvidersPage';
import { AdminReportsPage } from '@/pages/admin/ReportsPage';
import { AdminCompliancePage } from '@/pages/admin/CompliancePage';
import { AdminAlertQueuePage } from '@/pages/admin/AlertQueue';
import { AdminVisitVerificationPage } from '@/pages/admin/VisitVerification';
import { AdminCHWsPage } from '@/pages/admin/CHWs';
import { AdminChwApplicationsPage } from '@/pages/admin/ChwApplications';
import { AdminCredentialReviewsPage } from '@/pages/admin/CredentialReviews';
import { AdminRateCardsPage } from '@/pages/admin/RateCards';
import { AdminAuditLogsPage } from '@/pages/admin/AuditLogs';
import { CaregiverDashboardPage } from '@/pages/caregiver/DashboardPage';
import { CaregiverPatientsPage } from '@/pages/caregiver/PatientsPage';
import { CaregiverVitalsPage } from '@/pages/caregiver/VitalsPage';
import { ChwTodayPage } from '@/pages/chw/TodayPage';
import { ChwActiveVisitPage } from '@/pages/chw/ActiveVisitPage';
import { ChwVisitRecordsPage } from '@/pages/chw/VisitRecordsPage';
import { ChwAvailabilityPage } from '@/pages/chw/AvailabilityPage';
import { ClinicianReviewQueuePage } from '@/pages/clinician/ReviewQueue';
import { ClinicianFlaggedCasesPage } from '@/pages/clinician/FlaggedCases';
import { ClinicianCaseDetailPage } from '@/pages/clinician/CaseDetail';
import { ClinicianVitalsTrendsPage } from '@/pages/clinician/VitalsTrends';
import { ClinicianPatientChartPage } from '@/pages/clinician/PatientChartPage';
import { ClinicianEarningsPage } from '@/pages/clinician/EarningsPage';
import { ClinicianConsultationNotePage } from '@/pages/clinician/ConsultationNotePage';
import { ClinicianPrescriptionsPage } from '@/pages/clinician/PrescriptionsPage';
import { LabOrderQueuePage } from '@/pages/lab/OrderQueuePage';
import { LabOrderDetailPage } from '@/pages/lab/OrderDetailPage';
import { LabSchedulerPage } from '@/pages/lab/SchedulerPage';
import { LabResultUploadPage } from '@/pages/lab/ResultUploadPage';
import { PatientDashboardPage } from '@/pages/patient/DashboardPage';
import { PatientMedicationsPage } from '@/pages/patient/MedicationsPage';
import { PatientVitalsPage } from '@/pages/patient/VitalsPage';
import { PharmacyDashboardPage } from '@/pages/pharmacy/DashboardPage';
import { PharmacyRefillQueuePage } from '@/pages/pharmacy/RefillQueuePage';
import { PharmacyRefillFulfillmentPage } from '@/pages/pharmacy/RefillFulfillmentPage';
import { PharmacyEarningsPage } from '@/pages/pharmacy/EarningsPage';
import { PharmacyWalkInCheckPage } from '@/pages/pharmacy/WalkInCheckPage';
import { SponsorDashboardPage } from '@/pages/sponsor/DashboardPage';
import { SponsorVisitsPage } from '@/pages/sponsor/VisitsPage';
import { SponsorAlertsPage } from '@/pages/sponsor/AlertsPage';
import { SponsorReportsPage } from '@/pages/sponsor/ReportsPage';
import { SponsorCareTeamPage } from '@/pages/sponsor/CareTeamPage';
import { AddPatientPage } from '@/pages/sponsor/onboarding/AddPatientPage';
import { CheckoutPage } from '@/pages/sponsor/onboarding/CheckoutPage';
import { FeatureFlagsPage } from '@/pages/super-admin/FeatureFlagsPage';
import { PricingRulesPage } from '@/pages/super-admin/PricingRulesPage';
import { ClinicalSafetyPage } from '@/pages/super-admin/ClinicalSafetyPage';
import { SystemConfigPage } from '@/pages/super-admin/SystemConfigPage';
import { AdminThemeGate } from './AdminThemeGate';
import { ChwThemeGate } from './ChwThemeGate';
import { ClinicianThemeGate } from './ClinicianThemeGate';
import { ApplicantLayout } from '@/pages/applicant/ApplicantLayout';
import { ApplicantIdentityPage } from '@/pages/applicant/Identity';
import { ApplicantQualificationsPage } from '@/pages/applicant/Qualifications';
import { ApplicantReferencesPage } from '@/pages/applicant/References';
import { ApplicantTrainingPage } from '@/pages/applicant/Training';
import { ApplicantStatusPage } from '@/pages/applicant/Status';
import { AccountSettingsPage } from '@/pages/shared/AccountSettings';
import { ComplaintsPage } from '@/pages/shared/Complaints';
import { MessagesPage } from '@/pages/shared/Messages';
import { ProtectedRoute } from './ProtectedRoute';
import { SponsorAccessGate } from './SponsorAccessGate';

export const routes: RouteObject[] = [
  { path: '/', element: <WelcomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            element: <ProtectedRoute roles={['admin']} />,
            children: [
              {
                element: <AdminThemeGate />,
                children: [
                  { path: 'admin/dashboard', element: <AdminDashboardPage /> },
                  { path: 'admin/patients', element: <AdminPatientsPage /> },
                  { path: 'admin/payments', element: <AdminPaymentsPage /> },
                  { path: 'admin/providers', element: <AdminProvidersPage /> },
                  { path: 'admin/reports', element: <AdminReportsPage /> },
                  { path: 'admin/compliance', element: <AdminCompliancePage /> },
                  { path: 'admin/alerts', element: <AdminAlertQueuePage /> },
                  {
                    path: 'admin/visit-verification',
                    element: <AdminVisitVerificationPage />,
                  },
                  { path: 'admin/chws', element: <AdminCHWsPage /> },
                  {
                    path: 'admin/chw-applications',
                    element: <AdminChwApplicationsPage />,
                  },
                  {
                    path: 'admin/credentials',
                    element: <AdminCredentialReviewsPage />,
                  },
                  { path: 'admin/rate-cards', element: <AdminRateCardsPage /> },
                  { path: 'admin/audit-logs', element: <AdminAuditLogsPage /> },
                ],
              },
            ],
          },

          {
            element: <ProtectedRoute roles={['sponsor', 'caregiver']} />,
            children: [
              {
                element: <SponsorAccessGate />,
                children: [
                  { path: 'sponsor/dashboard', element: <SponsorDashboardPage /> },
                  { path: 'sponsor/visits', element: <SponsorVisitsPage /> },
                  { path: 'sponsor/alerts', element: <SponsorAlertsPage /> },
                  { path: 'sponsor/reports', element: <SponsorReportsPage /> },
                  { path: 'sponsor/team', element: <SponsorCareTeamPage /> },
                  {
                    path: 'sponsor/onboarding/add-patient',
                    element: <AddPatientPage />,
                  },
                  {
                    path: 'sponsor/onboarding/checkout',
                    element: <CheckoutPage />,
                  },
                ],
              },
            ],
          },

          {
            element: <ProtectedRoute roles={['home_helper']} />,
            children: [
              { path: 'caregiver/dashboard', element: <CaregiverDashboardPage /> },
              { path: 'caregiver/patients', element: <CaregiverPatientsPage /> },
              { path: 'caregiver/vitals', element: <CaregiverVitalsPage /> },
            ],
          },

          {
            element: <ProtectedRoute roles={['chw']} />,
            children: [
              {
                element: <ChwThemeGate />,
                children: [
                  { path: 'chw', element: <Navigate to="/chw/today" replace /> },
                  { path: 'chw/today', element: <ChwTodayPage /> },
                  { path: 'chw/active-visit', element: <ChwActiveVisitPage /> },
                  { path: 'chw/records', element: <ChwVisitRecordsPage /> },
                  { path: 'chw/availability', element: <ChwAvailabilityPage /> },
                  {
                    path: 'chw/checkup',
                    element: <Navigate to="/chw/active-visit" replace />,
                  },
                ],
              },
            ],
          },

          {
            element: <ProtectedRoute roles={['clinician']} />,
            children: [
              {
                element: <ClinicianThemeGate />,
                children: [
                  {
                    path: 'clinician',
                    element: <Navigate to="/clinician/review" replace />,
                  },
                  {
                    path: 'clinician/review',
                    element: <ClinicianReviewQueuePage />,
                  },
                  {
                    path: 'clinician/flagged',
                    element: <ClinicianFlaggedCasesPage />,
                  },
                  {
                    path: 'clinician/cases/:id',
                    element: <ClinicianCaseDetailPage />,
                  },
                  {
                    path: 'clinician/vitals-trends',
                    element: <ClinicianVitalsTrendsPage />,
                  },
                  {
                    path: 'clinician/queue',
                    element: <Navigate to="/clinician/review" replace />,
                  },
                  {
                    path: 'clinician/patient/:patientId/chart',
                    element: <ClinicianPatientChartPage />,
                  },
                  {
                    path: 'clinician/earnings',
                    element: <ClinicianEarningsPage />,
                  },
                  {
                    path: 'clinician/consultation',
                    element: <ClinicianConsultationNotePage />,
                  },
                  {
                    path: 'clinician/prescriptions',
                    element: <ClinicianPrescriptionsPage />,
                  },
                ],
              },
            ],
          },

          {
            element: <ProtectedRoute roles={['pharmacy']} />,
            children: [
              { path: 'pharmacy/dashboard', element: <PharmacyDashboardPage /> },
              { path: 'pharmacy/refills', element: <PharmacyRefillQueuePage /> },
              { path: 'pharmacy/fulfillment', element: <PharmacyRefillFulfillmentPage /> },
              { path: 'pharmacy/earnings', element: <PharmacyEarningsPage /> },
              { path: 'pharmacy/walk-in', element: <PharmacyWalkInCheckPage /> },
            ],
          },

          {
            element: <ProtectedRoute roles={['lab']} />,
            children: [
              { path: 'lab/orders', element: <LabOrderQueuePage /> },
              { path: 'lab/orders/:id', element: <LabOrderDetailPage /> },
              { path: 'lab/scheduler', element: <LabSchedulerPage /> },
              { path: 'lab/upload', element: <LabResultUploadPage /> },
            ],
          },

          {
            element: <ProtectedRoute roles={['super_admin']} />,
            children: [
              { path: 'super-admin/feature-flags', element: <FeatureFlagsPage /> },
              { path: 'super-admin/pricing-rules', element: <PricingRulesPage /> },
              { path: 'super-admin/clinical-safety', element: <ClinicalSafetyPage /> },
              { path: 'super-admin/system-config', element: <SystemConfigPage /> },
            ],
          },

          {
            element: <ProtectedRoute roles={['patient']} />,
            children: [
              { path: 'patient/dashboard', element: <PatientDashboardPage /> },
              { path: 'patient/vitals', element: <PatientVitalsPage /> },
              { path: 'patient/medications', element: <PatientMedicationsPage /> },
            ],
          },

          { path: 'settings', element: <AccountSettingsPage /> },
          { path: 'messages', element: <MessagesPage /> },
          { path: 'complaints', element: <ComplaintsPage /> },
        ],
      },
      {
        element: <ApplicantLayout />,
        children: [
          { path: 'applicant', element: <Navigate to="/applicant/identity" replace /> },
          { path: 'applicant/identity', element: <ApplicantIdentityPage /> },
          { path: 'applicant/qualifications', element: <ApplicantQualificationsPage /> },
          { path: 'applicant/references', element: <ApplicantReferencesPage /> },
          { path: 'applicant/training', element: <ApplicantTrainingPage /> },
          { path: 'applicant/status', element: <ApplicantStatusPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];
