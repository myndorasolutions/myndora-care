/**
 * Resolves deployment environment from ENVIRONMENT or APP_ENV.
 * Values: simulation | production | development (local default).
 */
export type AppEnvironment = 'simulation' | 'production' | 'development';

export function resolveEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): AppEnvironment {
  const raw = (env.ENVIRONMENT ?? env.APP_ENV ?? 'development').toLowerCase().trim();
  if (raw === 'simulation' || raw === 'sim' || raw === 'staging') {
    return 'simulation';
  }
  if (raw === 'production' || raw === 'prod') {
    return 'production';
  }
  return 'development';
}

export function isSimulation(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveEnvironment(env) === 'simulation';
}

export function isProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveEnvironment(env) === 'production';
}

/** Simulation always uses mock providers; production requires an explicit MOCK_PAYSTACK value. */
export function resolveMockPaystack(env: NodeJS.ProcessEnv = process.env): boolean {
  if (isSimulation(env)) {
    return true;
  }
  if (isProduction(env)) {
    const mock = (env.MOCK_PAYSTACK ?? '').toLowerCase();
    if (mock === '') {
      // Fail closed: production without an explicit flag stays mock until ops opts in.
      return true;
    }
    return mock === 'true' || mock === '1';
  }
  const mock = (env.MOCK_PAYSTACK ?? 'true').toLowerCase();
  return mock === 'true' || mock === '1';
}
