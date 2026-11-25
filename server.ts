import 'dotenv/config';
import express, {type NextFunction, type Request, type Response} from 'express';
import fs from 'fs';
import path from 'path';
import {GoogleGenAI, ThinkingLevel} from '@google/genai';
import {createXbmsRouter} from './server/xbmsRoutes.ts';

const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const HAS_DIST_BUILD = fs.existsSync(path.join(DIST_DIR, 'index.html'));
const IS_DEV_RUNNER =
  process.env.npm_lifecycle_event === 'dev' ||
  process.execArgv.some((arg) => arg.includes('tsx'));
const IS_PROD =
  process.env.NODE_ENV === 'production' ||
  (HAS_DIST_BUILD && !IS_DEV_RUNNER && process.env.NODE_ENV !== 'development');

const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_IMAGE_RATIOS = new Set(['16:9', '1:1', '9:16', '4:3', '3:4']);
const ALLOWED_IMAGE_SIZES = new Set(['1K', '2K']);
const ALLOWED_VIDEO_RATIOS = new Set(['16:9', '9:16']);
const ALLOWED_CHAT_MODELS = new Set([
  'gemini-4-carbon',
  'gemini-4-neon',
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
]);

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new ApiError(
      400,
      'Gemini API key is not configured. Please add GEMINI_API_KEY in AI Studio Settings > Secrets.',
    );
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

function parseUpstreamError(err: unknown): {status: number; message: string} {
  if (err instanceof ApiError) {
    return {status: err.status, message: err.message};
  }
  const rawMessage = err instanceof Error ? err.message : String(err);
  const statusMatch = rawMessage.match(/\b(400|401|403|404|429|500|503)\b/);
  const status = statusMatch ? Number(statusMatch[1]) : 500;

  if (/PERMISSION_DENIED|API_KEY_INVALID/i.test(rawMessage) || status === 403) {
    return {
      status: 403,
      message:
        'Access denied by Gemini API. Please check your GEMINI_API_KEY or select a billing-enabled key in Settings > Secrets.',
    };
  }
  if (/RESOURCE_EXHAUSTED|quota/i.test(rawMessage) || status === 429) {
    return {
      status: 429,
      message:
        'Quota exhausted or paid-tier key required for this model. Select a billing-enabled API key in Settings > Secrets.',
    };
  }
  if (/NOT_FOUND/i.test(rawMessage) || status === 404) {
    return {
      status: 404,
      message: `Requested Gemini model endpoint returned Not Found: ${rawMessage}`,
    };
  }
  return {status, message: rawMessage || 'Unexpected Gemini service error.'};
}

function validateInlineImage(input: unknown): {data: string; mimeType: string} {
  if (!input || typeof input !== 'object') {
    throw new ApiError(400, 'Invalid image payload.');
  }
  const obj = input as {data?: unknown; mimeType?: unknown};
  if (typeof obj.data !== 'string' || obj.data.length === 0) {
    throw new ApiError(400, 'Image data must be a non-empty base64 string.');
  }
  if (obj.data.length > 22_000_000) {
    throw new ApiError(400, 'Uploaded image exceeds maximum supported size (~15 MB).');
  }
  const mimeType = typeof obj.mimeType === 'string' ? obj.mimeType.trim() : '';
  if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
    throw new ApiError(400, 'Unsupported image format. Please upload PNG, JPEG, or WebP.');
  }
  // Strip any accidental data URL prefix
  const cleanBase64 = obj.data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
  return {data: cleanBase64, mimeType};
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '25mb'}));

  app.use('/api/v1', createXbmsRouter());

  // 1. Image Generation & Editing via gemini-nano-banana-2.1
  app.post('/api/gemini/image', async (req: Request, res: Response) => {
    try {
      const {prompt, aspectRatio = '16:9', imageSize = '1K', image} = req.body ?? {};

      if (typeof prompt !== 'string' || prompt.trim().length < 3 || prompt.length > 4000) {
        throw new ApiError(400, 'Please provide a descriptive prompt (3–4,000 characters).');
      }
      if (typeof aspectRatio !== 'string' || !ALLOWED_IMAGE_RATIOS.has(aspectRatio)) {
        throw new ApiError(400, 'Invalid aspect ratio.');
      }
      if (typeof imageSize !== 'string' || !ALLOWED_IMAGE_SIZES.has(imageSize)) {
        throw new ApiError(400, 'Invalid image resolution. Supported values: 1K or 2K.');
      }

      const parts: Array<{text: string} | {inlineData: {data: string; mimeType: string}}> = [];
      if (image) {
        const validated = validateInlineImage(image);
        parts.push({
          inlineData: {
            data: validated.data,
            mimeType: validated.mimeType,
          },
        });
      }
      parts.push({text: prompt.trim()});

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: {parts},
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      let imageUrl: string | null = null;
      let notes = '';

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          notes += (notes ? '\n' : '') + part.text;
        }
      }

      if (!imageUrl) {
        throw new ApiError(
          502,
          notes || 'The model completed without returning an image. Try adjusting your prompt.',
        );
      }

      res.json({imageUrl, notes, model: 'gemini-nano-banana-2.1'});
    } catch (err) {
      const parsed = parseUpstreamError(err);
      res.status(parsed.status).json({error: parsed.message});
    }
  });

  // 2. Image-to-Video Animation via gemini-omni-1.2-flash (Interactions API)
  app.post('/api/gemini/video', async (req: Request, res: Response) => {
    try {
      const {prompt, aspectRatio = '16:9', image} = req.body ?? {};

      if (typeof aspectRatio !== 'string' || !ALLOWED_VIDEO_RATIOS.has(aspectRatio)) {
        throw new ApiError(400, 'Video aspect ratio must be 16:9 or 9:16.');
      }
      if (!image) {
        throw new ApiError(400, 'Please upload or select a starting image to animate.');
      }

      const validated = validateInlineImage(image);
      const motionPrompt =
        typeof prompt === 'string' && prompt.trim().length > 0
          ? prompt.trim().slice(0, 2000)
          : 'Smooth cinematic architectural camera glide with subtle ambient lighting and floating digital motion.';

      const ai = getAiClient();
      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: [
            {
              type: 'image',
              mime_type: validated.mimeType,
              data: validated.data,
            },
            {
              type: 'text',
              text: motionPrompt,
            },
          ],
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: aspectRatio as '16:9' | '9:16',
          },
        },
        {timeout: 300000},
      );

      let videoData = interaction.output_video?.data;
      let videoMime = interaction.output_video?.mime_type || 'video/mp4';
      const videoUri = interaction.output_video?.uri;

      if (!videoData && !videoUri && Array.isArray(interaction.steps)) {
        for (const step of interaction.steps) {
          if (step.type === 'model_output' && Array.isArray(step.content)) {
            const vidContent = step.content.find((c) => c.type === 'video');
            if (vidContent && 'data' in vidContent && typeof vidContent.data === 'string') {
              videoData = vidContent.data;
              if ('mime_type' in vidContent && typeof vidContent.mime_type === 'string') {
                videoMime = vidContent.mime_type;
              }
              break;
            }
          }
        }
      }

      if (videoData) {
        res.json({
          videoUrl: `data:${videoMime};base64,${videoData}`,
          mimeType: videoMime,
          model: 'gemini-omni-1.2-flash',
          aspectRatio,
        });
        return;
      }

      if (videoUri && typeof videoUri === 'string' && videoUri.startsWith('https://')) {
        res.json({
          videoUrl: videoUri,
          mimeType: videoMime,
          model: 'gemini-omni-1.2-flash',
          aspectRatio,
        });
        return;
      }

      throw new ApiError(502, 'Video generation finished without playable video output.');
    } catch (err) {
      const parsed = parseUpstreamError(err);
      res.status(parsed.status).json({error: parsed.message});
    }
  });

  // 3. Multi-Turn Chatbot across Gemini 4 Carbon / Neon / Hydrogen / 3.1 Flash Lite
  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const {
        model = 'gemini-4-hydrogen',
        systemInstruction = 'You are the XeroTech Technologies Senior Solutions Architect in Bahrain.',
        history = [],
        message,
      } = req.body ?? {};

      if (typeof model !== 'string' || !ALLOWED_CHAT_MODELS.has(model)) {
        throw new ApiError(400, 'Unsupported chat model requested.');
      }
      if (typeof message !== 'string' || message.trim().length === 0 || message.length > 12000) {
        throw new ApiError(400, 'Message must be between 1 and 12,000 characters.');
      }
      const cleanSystem =
        typeof systemInstruction === 'string' && systemInstruction.trim().length > 0
          ? systemInstruction.trim().slice(0, 3000)
          : 'You are a helpful XeroTech Technologies engineering assistant.';

      const formattedHistory: Array<{role: 'user' | 'model'; parts: Array<{text: string}>}> = [];
      if (Array.isArray(history)) {
        for (const turn of history.slice(-30)) {
          if (
            turn &&
            typeof turn === 'object' &&
            (turn.role === 'user' || turn.role === 'model') &&
            typeof turn.text === 'string' &&
            turn.text.trim().length > 0
          ) {
            formattedHistory.push({
              role: turn.role,
              parts: [{text: turn.text.slice(0, 12000)}],
            });
          }
        }
      }

      const thinkingConfig =
        model === 'gemini-4-carbon' || model === 'gemini-4-neon'
          ? {thinkingLevel: ThinkingLevel.HIGH}
          : model === 'gemini-3.1-flash-lite'
            ? {thinkingLevel: ThinkingLevel.MINIMAL}
            : undefined;

      const ai = getAiClient();
      const chat = ai.chats.create({
        model,
        history: formattedHistory,
        config: {
          systemInstruction: cleanSystem,
          ...(thinkingConfig ? {thinkingConfig} : {}),
        },
      });

      const response = await chat.sendMessage({message: message.trim()});
      const replyText = response.text;

      if (!replyText) {
        throw new ApiError(502, 'Model returned an empty response.');
      }

      res.json({reply: replyText, model});
    } catch (err) {
      const parsed = parseUpstreamError(err);
      res.status(parsed.status).json({error: parsed.message});
    }
  });

  if (!IS_PROD) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      const indexHtml = path.join(DIST_DIR, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`XeroTech Technologies full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start XeroTech server:', err);
  process.exit(1);
});
