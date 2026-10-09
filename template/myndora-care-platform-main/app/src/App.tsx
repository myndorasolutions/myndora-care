import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import RoleLayout from '@/components/RoleLayout';
import { RequireAuth, RequireProfile } from '@/components/guards';
import { UiProvider } from '@/store/ui';
import { Btn, Card } from '@/components/kit';
import { Link } from 'react-router-dom';

// Public
import Landing from '@/pages/public/Landing';
import SignIn from '@/pages/public/SignIn';
import CreateAccount from '@/pages/public/CreateAccount';
import ForgotPassword from '@/pages/public/ForgotPassword';
import ResetPassword from '@/pages/public/ResetPassword';
import StaffSignIn from '@/pages/public/StaffSignIn';
import Unauthorized from '@/pages/public/Unauthorized';
import Contact from '@/pages/public/Contact';
import { AboutPage, HowItWorksPage, ServicesPage, PackagesPage, PartnersPage, SafetyPrivacyPage, TermsPage } from '@/pages/public/infoPages';
import { ApplyChwPage, ApplyClinicianPage } from '@/pages/public/ApplyChw';
// Onboarding
import OnboardingChoose from '@/pages/onboarding/Choose';
import PatientOnboarding from '@/pages/onboarding/PatientOnboarding';
import SponsorOnboarding from '@/pages/onboarding/SponsorOnboarding';
import ChwOnboarding from '@/pages/onboarding/ChwOnboarding';
// Applicant portal
import ApplicantLayout from '@/pages/applicant/ApplicantLayout';
import ApplicantStatus from '@/pages/applicant/Status';
import ApplicantIdentity from '@/pages/applicant/Identity';
import ApplicantQualifications from '@/pages/applicant/Qualifications';
import ApplicantReferences from '@/pages/applicant/References';
import ApplicantTraining from '@/pages/applicant/Training';
import ApplicantServiceArea from '@/pages/applicant/ServiceArea';

// Sponsor
import SponsorDashboard from '@/pages/sponsor/Dashboard';
import SponsorPeople from '@/pages/sponsor/People';
import SponsorCareTeam from '@/pages/sponsor/CareTeam';
import SponsorVisits from '@/pages/sponsor/Visits';
import SponsorAlerts from '@/pages/sponsor/Alerts';
import SponsorPayments from '@/pages/sponsor/Payments';
import SponsorAccessRequests from '@/pages/sponsor/AccessRequests';
import SponsorReports from '@/pages/sponsor/Reports';
// Patient
import PatientMyCare from '@/pages/patient/MyCare';
import PatientFindCHW from '@/pages/patient/FindCHW';
import PatientCareTeam from '@/pages/patient/CareTeam';
import PatientVisits from '@/pages/patient/Visits';
import PatientHealthUpdates from '@/pages/patient/HealthUpdates';
import PatientPermissions from '@/pages/patient/Permissions';
import PatientDocuments from '@/pages/patient/Documents';
// CHW
import ChwToday from '@/pages/chw/Today';
import ChwAssignments from '@/pages/chw/Assignments';
import ChwCalendar from '@/pages/chw/Calendar';
import ChwActiveVisit from '@/pages/chw/ActiveVisit';
import ChwVisitRecords from '@/pages/chw/VisitRecords';
import ChwEscalations from '@/pages/chw/Escalations';
import ChwOfflineQueue from '@/pages/chw/OfflineQueue';
import ChwServicesRates from '@/pages/chw/ServicesRates';
import ChwCredentials from '@/pages/chw/Credentials';
import ChwRatings from '@/pages/chw/Ratings';
import ChwPayouts from '@/pages/chw/Payouts';
import ChwAvailability from '@/pages/chw/Availability';
import ChwServiceArea from '@/pages/chw/ServiceArea';
import ChwVerification from '@/pages/chw/Verification';
import ChwComplaints from '@/pages/chw/Complaints';
// Admin
import AdminOperations from '@/pages/admin/Operations';
import AdminPatients from '@/pages/admin/Patients';
import AdminSponsors from '@/pages/admin/Sponsors';
import AdminCHWs from '@/pages/admin/CHWs';
import AdminAssignments from '@/pages/admin/Assignments';
import AdminAlertQueue from '@/pages/admin/AlertQueue';
import AdminComplaints from '@/pages/admin/Complaints';
import AdminServiceApprovals from '@/pages/admin/ServiceApprovals';
import AdminRateCards from '@/pages/admin/RateCards';
import AdminConsentAccess from '@/pages/admin/ConsentAccess';
import AdminDataQuality from '@/pages/admin/DataQuality';
import AdminAuditLogs from '@/pages/admin/AuditLogs';
import AdminIntegrations from '@/pages/admin/Integrations';
import AdminChwApplications from '@/pages/admin/ChwApplications';
import AdminClinicianApplications from '@/pages/admin/ClinicianApplications';
import AdminCredentialReviews from '@/pages/admin/CredentialReviews';
import AdminVisitVerification from '@/pages/admin/VisitVerification';
import AdminPackageAvailability from '@/pages/admin/PackageAvailability';
import AdminUsers from '@/pages/admin/Users';
// Clinician
import ClinicianReviewQueue from '@/pages/clinician/ReviewQueue';
import ClinicianFlaggedCases from '@/pages/clinician/FlaggedCases';
import ClinicianCaseDetail from '@/pages/clinician/CaseDetail';
import ClinicianReviewHistory from '@/pages/clinician/ReviewHistory';
import ClinicianAvailability from '@/pages/clinician/Availability';
import ClinicianProfile from '@/pages/clinician/Profile';
import ClinicianPatientSummary from '@/pages/clinician/PatientSummary';
import ClinicianVitalsTrends from '@/pages/clinician/VitalsTrends';
import ClinicianLabResults from '@/pages/clinician/LabResults';
import ClinicianClinicalNotes from '@/pages/clinician/ClinicalNotes';
import ClinicianRecommendations from '@/pages/clinician/Recommendations';
import ClinicianFollowUps from '@/pages/clinician/FollowUps';
import ClinicianReferrals from '@/pages/clinician/Referrals';
// Shared
import PlanServicesPage from '@/pages/shared/PlanServices';
import ComplaintsPage from '@/pages/shared/Complaints';
import MessagesPage from '@/pages/shared/Messages';
import AccountSettingsPage from '@/pages/shared/AccountSettings';

/** Redirect that preserves query strings (?next=, ?email=, ?verify=, …). */
function AliasTo({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <Card className="max-w-md text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Page not found</h1>
        <p className="text-sm text-slate-500 mb-4">This route doesn't exist in the Myndora demo.</p>
        <Link to="/"><Btn>Go to home</Btn></Link>
      </Card>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <UiProvider>
        <Routes>
          {/* ------------------------------------------------------ public */}
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/packages" element={<PackagesPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/safety-and-privacy" element={<SafetyPrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/apply/chw" element={<ApplyChwPage />} />
          <Route path="/apply/clinician" element={<ApplyClinicianPage />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/register" element={<CreateAccount />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/staff-login" element={<StaffSignIn />} />
          {/* Legacy route aliases — preserved so no existing link breaks */}
          <Route path="/sign-in" element={<AliasTo to="/login" />} />
          <Route path="/create-account" element={<AliasTo to="/register" />} />
          <Route path="/staff-sign-in" element={<AliasTo to="/staff-login" />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* --------------------------------------------------- onboarding */}
          <Route path="/onboarding/choose" element={<RequireAuth><OnboardingChoose /></RequireAuth>} />
          <Route path="/onboarding/patient" element={<RequireAuth><PatientOnboarding /></RequireAuth>} />
          <Route path="/onboarding/sponsor" element={<RequireAuth><SponsorOnboarding /></RequireAuth>} />
          <Route path="/onboarding/chw" element={<RequireAuth><ChwOnboarding /></RequireAuth>} />

          {/* ---------------------------------------------- applicant portal */}
          <Route path="/applicant" element={<RequireProfile kinds={['chw_applicant', 'chw']}><ApplicantLayout /></RequireProfile>}>
            <Route index element={<ApplicantStatus />} />
            <Route path="identity" element={<ApplicantIdentity />} />
            <Route path="qualifications" element={<ApplicantQualifications />} />
            <Route path="references" element={<ApplicantReferences />} />
            <Route path="training" element={<ApplicantTraining />} />
            <Route path="service-area" element={<ApplicantServiceArea />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>

          {/* ------------------------------------------------ sponsor portal */}
          <Route path="/sponsor" element={<RequireProfile kinds={['sponsor']}><RoleLayout role="sponsor" /></RequireProfile>}>
            <Route index element={<SponsorDashboard />} />
            <Route path="people" element={<SponsorPeople />} />
            <Route path="plan" element={<PlanServicesPage role="sponsor" />} />
            <Route path="team" element={<SponsorCareTeam />} />
            <Route path="visits" element={<SponsorVisits />} />
            <Route path="alerts" element={<SponsorAlerts />} />
            <Route path="payments" element={<SponsorPayments />} />
            <Route path="access" element={<SponsorAccessRequests />} />
            <Route path="complaints" element={<ComplaintsPage role="sponsor" />} />
            <Route path="reports" element={<SponsorReports />} />
            <Route path="messages" element={<MessagesPage audience="sponsor" />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>

          {/* ------------------------------------------------ patient portal */}
          <Route path="/patient" element={<RequireProfile kinds={['patient']}><RoleLayout role="patient" /></RequireProfile>}>
            <Route index element={<PatientMyCare />} />
            <Route path="plan" element={<PlanServicesPage role="patient" />} />
            <Route path="find-chw" element={<PatientFindCHW />} />
            <Route path="team" element={<PatientCareTeam />} />
            <Route path="visits" element={<PatientVisits />} />
            <Route path="updates" element={<PatientHealthUpdates />} />
            <Route path="permissions" element={<PatientPermissions />} />
            <Route path="complaints" element={<ComplaintsPage role="patient" />} />
            <Route path="documents" element={<PatientDocuments />} />
            <Route path="messages" element={<MessagesPage audience="patient" />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>

          {/* --------------------------------------------------- chw portal */}
          <Route path="/chw" element={<RequireProfile kinds={['chw']}><RoleLayout role="chw" /></RequireProfile>}>
            <Route index element={<ChwToday />} />
            <Route path="assignments" element={<ChwAssignments />} />
            <Route path="calendar" element={<ChwCalendar />} />
            <Route path="active-visit" element={<ChwActiveVisit />} />
            <Route path="records" element={<ChwVisitRecords />} />
            <Route path="escalations" element={<ChwEscalations />} />
            <Route path="offline" element={<ChwOfflineQueue />} />
            <Route path="services" element={<ChwServicesRates />} />
            <Route path="credentials" element={<ChwCredentials />} />
            <Route path="ratings" element={<ChwRatings />} />
            <Route path="payouts" element={<ChwPayouts />} />
            <Route path="availability" element={<ChwAvailability />} />
            <Route path="service-area" element={<ChwServiceArea />} />
            <Route path="verification" element={<ChwVerification />} />
            <Route path="complaints" element={<ChwComplaints />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>

          {/* ------------------------------------------------- admin portal */}
          <Route path="/admin" element={<RequireProfile kinds={['admin']}><RoleLayout role="admin" /></RequireProfile>}>
            <Route index element={<AdminOperations />} />
            <Route path="patients" element={<AdminPatients />} />
            <Route path="sponsors" element={<AdminSponsors />} />
            <Route path="chws" element={<AdminCHWs />} />
            <Route path="assignments" element={<AdminAssignments />} />
            <Route path="alerts" element={<AdminAlertQueue />} />
            <Route path="complaints" element={<AdminComplaints />} />
            <Route path="approvals" element={<AdminServiceApprovals />} />
            <Route path="rate-cards" element={<AdminRateCards />} />
            <Route path="consent" element={<AdminConsentAccess />} />
            <Route path="quality" element={<AdminDataQuality />} />
            <Route path="audit" element={<AdminAuditLogs />} />
            <Route path="integrations" element={<AdminIntegrations />} />
            <Route path="chw-applications" element={<AdminChwApplications />} />
            <Route path="clinician-applications" element={<AdminClinicianApplications />} />
            <Route path="credential-reviews" element={<AdminCredentialReviews />} />
            <Route path="visit-verification" element={<AdminVisitVerification />} />
            <Route path="package-availability" element={<AdminPackageAvailability />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          {/* --------------------------------------------- clinician portal */}
          <Route path="/clinician" element={<RequireProfile kinds={['clinician']}><RoleLayout role="clinician" /></RequireProfile>}>
            <Route index element={<ClinicianReviewQueue />} />
            <Route path="cases" element={<ClinicianFlaggedCases />} />
            <Route path="cases/:id" element={<ClinicianCaseDetail />} />
            <Route path="history" element={<ClinicianReviewHistory />} />
            <Route path="availability" element={<ClinicianAvailability />} />
            <Route path="patients" element={<ClinicianPatientSummary />} />
            <Route path="vitals" element={<ClinicianVitalsTrends />} />
            <Route path="labs" element={<ClinicianLabResults />} />
            <Route path="notes" element={<ClinicianClinicalNotes />} />
            <Route path="recommendations" element={<ClinicianRecommendations />} />
            <Route path="follow-ups" element={<ClinicianFollowUps />} />
            <Route path="referrals" element={<ClinicianReferrals />} />
            <Route path="messages" element={<MessagesPage audience="clinician" />} />
            <Route path="profile" element={<ClinicianProfile />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </UiProvider>
    </ErrorBoundary>
  );
}
