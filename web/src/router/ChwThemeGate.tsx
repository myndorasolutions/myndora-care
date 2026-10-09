import { Outlet } from 'react-router-dom';

/** Wraps CHW portal routes with role theme accents. */
export function ChwThemeGate() {
  return (
    <div data-theme="chw">
      <Outlet />
    </div>
  );
}
