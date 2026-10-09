import { Outlet } from 'react-router-dom';

export function ClinicianThemeGate() {
  return (
    <div data-theme="clinician">
      <Outlet />
    </div>
  );
}
