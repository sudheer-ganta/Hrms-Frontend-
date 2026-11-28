/**
 * The realtime stream (EventSource) cannot send an Authorization header. Instead of putting the login JWT in the URL,
 * we ask the server for a short-lived, single-use stream ticket (sent WITH the header) and put only that in the URL.
 */
export const requestStreamUrl = async (
  apiBase: string,
  jwt: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> => {
  const res = await fetchImpl(`${apiBase}/realtime/ticket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const ticket = json?.data?.ticket;
  if (typeof ticket !== 'string' || !ticket) return null;
  return `${apiBase}/realtime/stream?ticket=${encodeURIComponent(ticket)}`;
};
