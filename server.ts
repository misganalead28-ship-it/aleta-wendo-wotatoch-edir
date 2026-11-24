import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json({ limit: '2mb' }));

function verifyEntryPasscode(submitted: string): boolean {
  const configured = (process.env.IDDIR_ENTRY_PASSCODE || '').trim();
  if (!configured) return true;
  const a = crypto.createHash('sha256').update(submitted.trim()).digest();
  const b = crypto.createHash('sha256').update(configured).digest();
  return crypto.timingSafeEqual(a, b);
}

app.get('/api/entry-gate', (_req, res) => {
  const passcodeRequired = Boolean((process.env.IDDIR_ENTRY_PASSCODE || '').trim());
  res.json({ passcodeRequired });
});

app.post('/api/entry-gate', (req, res) => {
  const configured = (process.env.IDDIR_ENTRY_PASSCODE || '').trim();
  if (!configured) {
    res.json({ authorized: true, passcodeRequired: false });
    return;
  }
  const { passcode } = (req.body ?? {}) as { passcode?: unknown };
  if (typeof passcode !== 'string' || !passcode.trim()) {
    res.status(400).json({ authorized: false, error: 'Entry passcode is required.' });
    return;
  }
  if (!verifyEntryPasscode(passcode)) {
    res.status(401).json({ authorized: false, error: 'Invalid association entry passcode.' });
    return;
  }
  res.json({ authorized: true, passcodeRequired: true });
});

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.post('/api/extract-receipt', async (req, res) => {
  try {
    const { imageDataUrl } = req.body as { imageDataUrl?: unknown };
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

    const ai = getGeminiClient();
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

    res.json({
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
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(import.meta.dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
