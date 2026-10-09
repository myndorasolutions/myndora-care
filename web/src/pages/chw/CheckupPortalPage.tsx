import { Navigate } from 'react-router-dom';

/** Compat redirect — wizard lives on ActiveVisitPage. */
export function ChwCheckupPortalPage() {
  return <Navigate to="/chw/active-visit" replace />;
}
