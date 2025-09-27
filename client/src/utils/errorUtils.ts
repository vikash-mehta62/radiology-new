// src/utils/errorUtils.ts
export function normalizeError(e: unknown): { message: string; stack?: string } {
  try {
    if (!e) return { message: 'Unknown error' };

    if (e instanceof Error) {
      return { message: e.message || 'Error', stack: e.stack };
    }

    if (typeof e === 'object') {
      // @ts-ignore
      if ((e as any).message && typeof (e as any).message === 'string') {
        // @ts-ignore
        return { message: (e as any).message, stack: (e as any).stack };
      }
      try {
        return { message: JSON.stringify(e) };
      } catch {
        return { message: String(e) };
      }
    }

    return { message: String(e) };
  } catch (ex) {
    return { message: 'Unknown error (normalize failed)' };
  }
}

/**
 * Generic service-level handler to be used in service files:
 */
export function handleServiceError(e: unknown, ctx?: { location?: string; extra?: any }) {
  const norm = normalizeError(e);
  // send to console; replace with remote logger if present
  console.error(`[ServiceError] ${ctx?.location ?? 'unknown'} ::`, norm.message, ctx?.extra ?? '', norm.stack || '');
  // return safe object so callers can set UI state
  return { message: norm.message, stack: norm.stack };
}
