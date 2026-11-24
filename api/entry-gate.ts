import crypto from 'crypto';

interface VercelLikeRequest {
  method?: string;
  body?: unknown;
}

interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  json: (payload: unknown) => void;
}

function verifyEntryPasscode(submitted: string, configured: string): boolean {
  const a = crypto.createHash('sha256').update(submitted.trim()).digest();
  const b = crypto.createHash('sha256').update(configured).digest();
  return crypto.timingSafeEqual(a, b);
}

export default function handler(req: VercelLikeRequest, res: VercelLikeResponse): void {
  const configured = (process.env.IDDIR_ENTRY_PASSCODE || '').trim();

  if (req.method === 'GET') {
    res.status(200).json({ passcodeRequired: Boolean(configured) });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  if (!configured) {
    res.status(200).json({ authorized: true, passcodeRequired: false });
    return;
  }

  try {
    const body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as { passcode?: unknown })
        : ((req.body ?? {}) as { passcode?: unknown });
    const { passcode } = body;

    if (typeof passcode !== 'string' || !passcode.trim()) {
      res.status(400).json({ authorized: false, error: 'Entry passcode is required.' });
      return;
    }

    if (!verifyEntryPasscode(passcode, configured)) {
      res.status(401).json({ authorized: false, error: 'Invalid association entry passcode.' });
      return;
    }

    res.status(200).json({ authorized: true, passcodeRequired: true });
  } catch {
    res.status(400).json({ authorized: false, error: 'Invalid request body.' });
  }
}
