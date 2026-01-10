// Allow spy package to register its checker
let spyChecker: ((value: unknown) => boolean) | null = null;
let getSpyCallCount: ((value: unknown) => number) | null = null;
let getSpyCalls: ((value: unknown) => Array<{ args: unknown[]; returnValue?: unknown }>) | null = null;

export function registerSpyIntegration(integration: {
  isSpy: (value: unknown) => boolean;
  getCallCount: (value: unknown) => number;
  getCalls: (value: unknown) => Array<{ args: unknown[]; returnValue?: unknown }>;
}): void {
  spyChecker = integration.isSpy;
  getSpyCallCount = integration.getCallCount;
  getSpyCalls = integration.getCalls;
}

export function unregisterSpyIntegration(): void {
  spyChecker = null;
  getSpyCallCount = null;
  getSpyCalls = null;
}

export function isSpy(value: unknown): boolean {
  if (!spyChecker) {
    return false;
  }
  return spyChecker(value);
}

export function getCallCount(value: unknown): number {
  if (!getSpyCallCount) {
    throw new Error('Spy package not loaded. Import @embedunit/spy to use spy assertions.');
  }
  return getSpyCallCount(value);
}

export function getCalls(value: unknown): Array<{ args: unknown[]; returnValue?: unknown }> {
  if (!getSpyCalls) {
    throw new Error('Spy package not loaded. Import @embedunit/spy to use spy assertions.');
  }
  return getSpyCalls(value);
}
