import { createRouter, publicQuery } from "./middleware";
import { authRouter, onboardingRouter, stateRouter, adminRouter, contactRouter } from "./authRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  onboarding: onboardingRouter,
  state: stateRouter,
  admin: adminRouter,
  contact: contactRouter,
});

export type AppRouter = typeof appRouter;
