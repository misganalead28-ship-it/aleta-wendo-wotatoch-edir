import { GoogleGenAI, Type } from '@google/genai';

interface VercelLikeRequest {
  method?: string;
  body?: unknown;
}

interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  json: (payload: unknown) => void;
}

export default async function handler(
  req: VercelLikeRequest,
  res: VercelLikeResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as { imageDataUrl?: unknown })
        : ((req.body ?? {}) as { imageDataUrl?: unknown });

    const { imageDataUrl } = body;
    if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      res.status(400).json({ error: 'Invalid receipt image payload.' });
      return;
    }

    const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.\-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({ error: 'Unsupported base64 image format.' });
      return;
    }

    const mimeType = match[1];
    const base64Data = match[2];
    if (base64Data.length > 1_600_000) {
      res.status(413).json({ error: 'Receipt image is too large.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text:
              'Inspect this Ethiopian payment receipt (Telebirr, CBE Birr, Commercial Bank of Ethiopia, Bank of Abyssinia, Dashen, Awash, or paper receipt). ' +
              'Extract the exact Transaction Reference / Receipt Number / FT Reference (transactionRef), total numeric amount paid in ETB (amount), ' +
              'and payment channel ("telebirr", "bank_transfer", or "cash"). If no reference is clearly visible, return an empty string for transactionRef.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transactionRef: {
              type: Type.STRING,
              description: 'Transaction ID, FT reference, or receipt number from the receipt.',
            },
            amount: {
              type: Type.NUMBER,
              description: 'Numeric total amount paid in ETB, or 0 if unreadable.',
            },
            paymentMethod: {
              type: Type.STRING,
              description: 'One of: telebirr, bank_transfer, cash.',
            },
            summary: {
              type: Type.STRING,
              description: 'Short 1-line summary of payer/bank/date detected on the receipt.',
            },
          },
          required: ['transactionRef', 'amount', 'paymentMethod', 'summary'],
        },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText) as {
      transactionRef?: string;
      amount?: number;
      paymentMethod?: string;
      summary?: string;
    };

    const method =
      parsed.paymentMethod === 'telebirr' ||
      parsed.paymentMethod === 'bank_transfer' ||
      parsed.paymentMethod === 'cash'
        ? parsed.paymentMethod
        : 'telebirr';

    res.status(200).json({
      transactionRef: String(parsed.transactionRef || '').trim().slice(0, 80),
      amount: typeof parsed.amount === 'number' && parsed.amount > 0 ? parsed.amount : 0,
      paymentMethod: method,
      summary: String(parsed.summary || '').trim().slice(0, 200),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Receipt extraction failed.';
    console.error('Receipt extraction error:', message);
    res.status(500).json({ error: message });
  }
}
