export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

export const error = (message: string, status = 400) => json({ error: message }, status);

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'Corps JSON invalide');
  }
}

export const uid = (prefix = 'id') => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
