import { Navigate, RouteObject } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { AdminDashboardPage } from '@/pages/admin/DashboardPage';
import { AdminPatientsPage } from '@/pages/admin/PatientsPage';
import { AdminPaymentsPage } from '@/pages/admin/PaymentsPage';
import { AdminProvidersPage } from '@/pages/admin/ProvidersPage';
import { AdminReportsPage } from '@/pages/admin/ReportsPage';
import { AdminCompliancePage } from '@/pages/admin/CompliancePage';
import { CaregiverDashboardPage } from '@/pages/caregiver/DashboardPage';
import { CaregiverPatientsPage } from '@/pages/caregiver/PatientsPage';
import { CaregiverVitalsPage } from '@/pages/caregiver/VitalsPage';
import { ChwCheckupPortalPage } from '@/pages/chw/CheckupPortalPage';
import { ClinicianQueuePage } from '@/pages/clinician/QueuePage';
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
import { FeatureFlagsPage } from '@/pages/super-admin/FeatureFlagsPage';
import { PricingRulesPage } from '@/pages/super-admin/PricingRulesPage';
import { ClinicalSafetyPage } from '@/pages/super-admin/ClinicalSafetyPage';
import { SystemConfigPage } from '@/pages/super-admin/SystemConfigPage';
import { ProtectedRoute } from './ProtectedRoute';

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/login" replace /> },

          {
            element: <ProtectedRoute roles={['admin']} />,
            children: [
              { path: 'admin/dashboard', element: <AdminDashboardPage /> },
              { path: 'admin/patients', element: <AdminPatientsPage /> },
              { path: 'admin/payments', element: <AdminPaymentsPage /> },
              { path: 'admin/providers', element: <AdminProvidersPage /> },
              { path: 'admin/reports', element: <AdminReportsPage /> },
              { path: 'admin/compliance', element: <AdminCompliancePage /> },
            ],
          },

          {
            element: <ProtectedRoute roles={['caregiver']} />,
            children: [{ path: 'sponsor/dashboard', element: <SponsorDashboardPage /> }],
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
            children: [{ path: 'chw/checkup', element: <ChwCheckupPortalPage /> }],
          },

          {
            element: <ProtectedRoute roles={['clinician']} />,
            children: [
              { path: 'clinician/queue', element: <ClinicianQueuePage /> },
              { path: 'clinician/patient/:patientId/chart', element: <ClinicianPatientChartPage /> },
              { path: 'clinician/earnings', element: <ClinicianEarningsPage /> },
              { path: 'clinician/consultation', element: <ClinicianConsultationNotePage /> },
              { path: 'clinician/prescriptions', element: <ClinicianPrescriptionsPage /> },
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
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
];
