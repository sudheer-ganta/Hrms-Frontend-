import axios from 'axios';
import type { ApiErrorBody, ApiErrorCode, ApiErrorDetail } from '../types';

/**
 * Single place that understands the backend error contract:
 *   { success:false, error:{ code, message, details? } }
 * plus the failure modes that never reach the backend (offline, timeout).
 */
export interface NormalizedError {
  code: ApiErrorCode | 'NETWORK' | 'TIMEOUT' | 'UNKNOWN';
  message: string;
  details: ApiErrorDetail[];
  status?: number;
}

const isBody = (d: unknown): d is ApiErrorBody =>
  !!d && typeof d === 'object' && (d as ApiErrorBody).success === false && typeof (d as ApiErrorBody).error?.message === 'string';

export const normalizeError = (err: unknown): NormalizedError => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (isBody(data)) {
      return { code: data.error.code, message: data.error.message, details: data.error.details ?? [], status: err.response?.status };
    }
    if (err.code === 'ECONNABORTED') return { code: 'TIMEOUT', message: 'The server took too long to respond. Please try again.', details: [] };
    if (!err.response) return { code: 'NETWORK', message: 'Cannot reach the server. Check your connection and try again.', details: [] };
    return { code: 'UNKNOWN', message: `Request failed (${err.response.status}).`, details: [], status: err.response.status };
  }
  if (err instanceof Error) return { code: 'UNKNOWN', message: err.message, details: [] };
  return { code: 'UNKNOWN', message: 'Something went wrong.', details: [] };
};

/** Human message, with field-level details appended when present. */
export const errorMessage = (err: unknown, fallback?: string): string => {
  const n = normalizeError(err);
  if (n.code === 'UNKNOWN' && fallback && !n.status) return fallback;
  const fields = n.details.filter((d) => d.field).map((d) => `${d.field}: ${d.issue}`);
  return fields.length && n.code === 'VALIDATION_ERROR' ? `${n.message} (${fields.slice(0, 3).join('; ')})` : n.message;
};

export const errorCode = (err: unknown) => normalizeError(err).code;
