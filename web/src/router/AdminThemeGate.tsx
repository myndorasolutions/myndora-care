import { Outlet } from 'react-router-dom';

export function AdminThemeGate() {
  return (
    <div data-theme="admin">
      <Outlet />
    </div>
  );
}
