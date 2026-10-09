// Public information pages: About, How It Works, Services, Packages, Partners,
// Safety & Privacy, Terms — content per the product specification.
import InfoPage from './InfoPage';
import { PACKAGES } from '@/lib/permissions';

export function AboutPage() {
  return (
    <InfoPage
      title="About Myndora Care"
      subtitle="A home-care coordination platform that keeps the patient in control of their health information."
      sections={[
        { type: 'intro', text: 'Myndora Care coordinates monitoring packages, verified community health workers, visits, alerts, and family support for patients at home. Sponsors can pay for and coordinate care — while each patient independently decides what health information any supporter may see.' },
        { type: 'cards', title: 'What the platform does', cards: [
          { title: 'Monitoring packages', text: 'Four packages gate real features — from self-recorded tracking to proactive CHW monitoring and priority coordination.' },
          { title: 'Verified care workers', text: 'Identity, qualifications, references, training, and service eligibility are verified before any community health worker is activated.' },
          { title: 'Visit verification', text: 'Every visit is evidenced with check-in, patient confirmation, and structured records before it counts as delivered.' },
          { title: 'Family coordination', text: 'Sponsors manage payment and coordination for one or more patients, with patient-approved access levels per relationship.' },
          { title: 'Escalation and review', text: 'Abnormal readings are flagged and routed for clinician review where eligible. AI flags anomalies — people make the decisions.' },
          { title: 'Partner ecosystem', text: 'Labs, doctors, pharmacies, hospitals, and insurers complete the care loop. Myndora Care is not itself a laboratory, pharmacy, or hospital.' },
        ]},
        { type: 'notice', title: 'UAT prototype', text: 'This deployment is a UAT prototype. All people, records, and scenarios are fictional demonstration data only.' },
        { type: 'notice', title: 'Emergency services', text: 'Myndora Care does not replace emergency medical services. For a life-threatening emergency, contact the appropriate emergency service or go to the nearest qualified medical facility.' },
      ]}
      cta={[{ label: 'Create an Account', to: '/register' }, { label: 'See How It Works', to: '/how-it-works' }]}
    />
  );
}

export function HowItWorksPage() {
  return (
    <InfoPage
      title="How Myndora Care works"
      subtitle="From account creation to verified visits and follow-up — in five steps."
      sections={[
        { type: 'steps', title: 'Five steps', steps: [
          { title: 'Create an account', text: 'Register with email and password, verify your email, and choose what you would like to do first.' },
          { title: 'Select a care plan', text: 'Pick a monitoring package based on the patient\u2019s city and the services available there.' },
          { title: 'Choose or receive a verified care worker', text: 'Compare verified CHWs by qualifications, experience, languages, service area, and rating — or receive an assignment.' },
          { title: 'Complete and verify visits', text: 'Remote checks and home visits are checked in, recorded against a structured checklist, and confirmed by the patient.' },
          { title: 'Review care updates and follow-up actions', text: 'Patients and authorized sponsors review updates, alerts, and follow-up actions within approved access levels.' },
        ]},
        { type: 'notice', title: 'Patient-controlled access', text: 'Paying for care does not automatically provide access to health information. The patient decides what each sponsor or supporter may see.' },
        { type: 'checklist', title: 'Visit safety and verification', items: [
          'Identity verification for every care worker',
          'Approved service assignment before any visit',
          'OTP or approved patient confirmation at the visit',
          'Location-aware check-in',
          'Structured visit records',
          'Patient confirmation after the visit',
          'Complaint and reassignment options',
        ]},
      ]}
      cta={[{ label: 'Create an Account', to: '/register' }, { label: 'View Packages', to: '/packages' }]}
    />
  );
}

export function ServicesPage() {
  return (
    <InfoPage
      title="Services"
      subtitle="Coordinated home-care services, verified end to end."
      sections={[
        { type: 'cards', title: 'What Myndora Care coordinates', cards: [
          { title: 'Personal health monitoring', text: 'Self-recorded vitals, medication reminders, and personal history on the Basic Monitor package.' },
          { title: 'Family care dashboards', text: 'Approved summaries, service-status updates, and alerts for sponsors — within patient-approved access.' },
          { title: 'Remote CHW checks', text: 'Scheduled remote checks by verified community health workers on Assisted Monitoring and above.' },
          { title: 'Scheduled home visits', text: 'In-person CHW visits where available in the patient\u2019s city, evidenced from check-in to confirmation.' },
          { title: 'Medication and wellbeing follow-up', text: 'Structured follow-up on medications and wellbeing checklists, with missed-check follow-up.' },
          { title: 'Urgent care escalation', text: 'Abnormal readings escalate for review, with urgent follow-up routing to the care team.' },
          { title: 'Clinician review for eligible flagged cases', text: 'Flagged cases are routed to a reviewing clinician on eligible packages.' },
          { title: 'Lab, pharmacy, doctor, and hospital coordination', text: 'Partner-coordinated sample collection, medication delivery, and referrals. Myndora Care is not itself a laboratory, pharmacy, or hospital.' },
        ]},
        { type: 'notice', title: 'City-based availability', text: 'Availability and pricing depend on the patient\u2019s location and selected services. There is no surge pricing — city rate cards price every visit.' },
      ]}
      cta={[{ label: 'View Packages', to: '/packages' }, { label: 'Create an Account', to: '/register' }]}
    />
  );
}

export function PackagesPage() {
  return (
    <InfoPage
      title="Packages"
      subtitle="Four monitoring packages — features gate real capability."
      sections={[
        { type: 'cards', title: 'Choose a package', cards: PACKAGES.map((p) => ({
          title: p.name,
          text: `${p.tagline}. Includes: ${p.features.join('; ')}.`,
        }))},
        { type: 'notice', title: 'Pricing', text: 'Availability and pricing depend on the patient\u2019s location and selected services.' },
        { type: 'checklist', title: 'Add-on services (city-dependent)', items: [
          'Physical visit — optional in-person CHW visits, subject to city availability',
          'Lab sample collection — home collection where partner labs operate',
          'Medication delivery — via verified partner pharmacies',
          'Clinician review — routing of flagged results on Premium Family Care',
        ]},
      ]}
      cta={[{ label: 'Create an Account', to: '/register' }, { label: 'See How It Works', to: '/how-it-works' }]}
    />
  );
}

export function PartnersPage() {
  return (
    <InfoPage
      title="Partner ecosystem"
      subtitle="Verified partners complete the care loop around the patient."
      sections={[
        { type: 'cards', title: 'Ecosystem partners', cards: [
          { title: 'Labs', badge: 'Current', text: 'Home lab sample collection is coordinated with partner laboratories where they operate. Myndora Care is not itself a laboratory.' },
          { title: 'Doctors', badge: 'Current', text: 'Flagged results can be routed to a reviewing clinician on eligible packages, documented with follow-up actions.' },
          { title: 'Pharmacies', badge: 'Current', text: 'Medication delivery is coordinated via verified partner pharmacies. Myndora Care is not itself a pharmacy.' },
          { title: 'Hospitals', badge: 'Planned', text: 'Referral coordination with hospitals for escalated care is a planned integration. Myndora Care is not itself a hospital.' },
          { title: 'HMOs and insurers', badge: 'Planned', text: 'Coverage and claims coordination with HMOs and insurers is a planned integration.' },
        ]},
        { type: 'intro', text: 'Cards are marked Current or Planned based on the existing project implementation. Myndora Care coordinates partners — it does not replace them.' },
      ]}
      cta={[{ label: 'Contact us', to: '/contact' }, { label: 'View Services', to: '/services' }]}
    />
  );
}

export function SafetyPrivacyPage() {
  return (
    <InfoPage
      title="Safety and privacy"
      subtitle="Minimum-necessary access, patient consent, and verified people on every side of care."
      sections={[
        { type: 'checklist', title: 'How information is protected', items: [
          'Role-based access — every account only reaches its authorized portals',
          'Minimum necessary information shared with approved people',
          'Patient consent controls every sponsor\u2019s access level',
          'Access logging — sensitive access and consent changes are audit-logged',
          'Restricted sensitive records — downloads and printing are restricted',
          'Profile verification for CHWs and clinicians before activation',
          'Complaints and safety escalation with human review',
          'Screen-capture deterrence reduces casual sharing, but screenshots cannot be fully disabled on any device',
        ]},
        { type: 'notice', title: 'Patient-controlled access', text: 'Paying for care does not automatically provide access to health information. The patient decides what each sponsor or supporter may see.' },
        { type: 'notice', title: 'Emergency services', text: 'Myndora Care does not replace emergency medical services. For a life-threatening emergency, contact the appropriate emergency service or go to the nearest qualified medical facility.' },
      ]}
      cta={[{ label: 'Create an Account', to: '/register' }, { label: 'Sign In', to: '/login' }]}
    />
  );
}

export function TermsPage() {
  return (
    <InfoPage
      title="Terms of use"
      subtitle="The terms that govern use of this UAT prototype."
      sections={[
        { type: 'checklist', title: 'Key terms', items: [
          'This deployment is a UAT prototype with fictional data only — not a live medical service',
          'Accounts are personal; do not share credentials or session access',
          'Health-information access is granted by the patient and can be reduced or withdrawn',
          'Care workers and clinicians are activated only after verification',
          'AI flags anomalies; humans approve decisions',
          'Abuse of demo access may result in account suspension',
        ]},
        { type: 'notice', title: 'Emergency services', text: 'Myndora Care does not replace emergency medical services. For a life-threatening emergency, contact the appropriate emergency service or go to the nearest qualified medical facility.' },
      ]}
      cta={[{ label: 'Safety and Privacy', to: '/safety-and-privacy' }, { label: 'Contact', to: '/contact' }]}
    />
  );
}
