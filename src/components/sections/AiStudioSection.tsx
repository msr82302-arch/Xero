import {
  Bot,
  Download,
  Film,
  ImagePlus,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import {type ChangeEvent, useEffect, useRef, useState} from 'react';

type StudioTab = 'image' | 'video' | 'chat';
type ChatModel =
  | 'gemini-4-carbon'
  | 'gemini-4-neon'
  | 'gemini-4-hydrogen'
  | 'gemini-3.1-flash-lite';

interface UploadedImage {
  data: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  previewUrl: string;
  fileName: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: ChatModel;
  timestamp: string;
}

const MANAMA_SKYLINE_PROMPT =
  'Ultra-wide high-resolution 3D architectural render of a futuristic corporate tech city skyline inspired by Manama, Bahrain. Deep navy (#0A192F) and electric royal blue (#0066FF) glowing digital network nodes floating subtly in the evening sky. Clean photorealistic architectural glass towers, subtle isometric grid perspective, premium corporate agency aesthetic, 16:9 aspect ratio.';

const CHAT_ROLES: Array<{id: string; label: string; instruction: string}> = [
  {
    id: 'architect',
    label: 'Enterprise Architect',
    instruction:
      'You are the Principal Software Architect at XeroTech Technologies (CR 201130-1, Riffa, Bahrain). Provide rigorous, production-grade architectural guidance on web portals, Django/PostgreSQL, React 19, Three.js, cloud security, and Bahrain payment integrations (BenefitPay, AFS).',
  },
  {
    id: 'ai-strategist',
    label: 'AI & Automation Lead',
    instruction:
      'You are the Head of AI & Automation at XeroTech Technologies in Bahrain. Design practical LLM automation pipelines, WhatsApp lead bots, OCR workflows, and multi-agent orchestrations grounded in measurable business ROI.',
  },
  {
    id: 'commercial',
    label: 'Bahrain BHD Scope Advisor',
    instruction:
      'You are a Senior Solutions Consultant for XeroTech Technologies in Riffa, Kingdom of Bahrain. Help clients scope any of the 12 official IT services using accurate 3-decimal BHD benchmarks (e.g., 250.000 BHD Web Dev, 350.000 BHD Mobile Apps, 200.000 BHD AI & Automation, 400.000 BHD Custom Web Apps).',
  },
  {
    id: 'rapid',
    label: 'Rapid Support Assistant',
    instruction:
      'You are a concise, fast technical support specialist at XeroTech Technologies. Deliver clear, step-by-step troubleshooting and IT advice in brief, direct bullet points.',
  },
];

const CHAT_MODELS: Array<{
  id: ChatModel;
  label: string;
  badge: string;
  description: string;
}> = [
  {
    id: 'gemini-4-hydrogen',
    label: 'gemini-4-hydrogen',
    badge: 'General Tasks',
    description: 'Balanced speed and capability for everyday technical consultation.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'gemini-3.1-flash-lite',
    badge: 'Fast Tasks',
    description: 'Ultra-low-latency responses for quick lookups and triage.',
  },
  {
    id: 'gemini-4-neon',
    label: 'gemini-4-neon',
    badge: 'Complex Interactive',
    description: 'Rich interactive specifications, coding & structured problem solving.',
  },
  {
    id: 'gemini-4-carbon',
    label: 'gemini-4-carbon',
    badge: 'Deep Reasoning',
    description: 'Maximum reasoning depth for architecture, debugging & security review.',
  },
];

function readFileAsUploadedImage(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'] as const;
    if (!allowed.includes(file.type as (typeof allowed)[number])) {
      reject(new Error('Unsupported file type. Please upload a PNG, JPEG, or WebP image.'));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('Image file must be 12 MB or smaller.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1] || '';
      resolve({
        data: base64,
        mimeType: file.type as UploadedImage['mimeType'],
        previewUrl: result,
        fileName: file.name,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.readAsDataURL(file);
  });
}

export function AiStudioSection() {
  const [activeTab, setActiveTab] = useState<StudioTab>('image');

  // === Tab 1: Image Studio (gemini-nano-banana-2.1) ===
  const [imagePrompt, setImagePrompt] = useState<string>(MANAMA_SKYLINE_PROMPT);
  const [imageAspect, setImageAspect] = useState<'16:9' | '1:1' | '9:16' | '4:3' | '3:4'>('16:9');
  const [imageSize, setImageSize] = useState<'1K' | '2K'>('1K');
  const [sourceImageForEdit, setSourceImageForEdit] = useState<UploadedImage | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageNotes, setImageNotes] = useState<string>('');
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string>('');

  // === Tab 2: Video Animator (gemini-omni-1.2-flash via Interactions API) ===
  const [videoSourceImage, setVideoSourceImage] = useState<UploadedImage | null>(null);
  const [videoPrompt, setVideoPrompt] = useState<string>(
    'Slow cinematic aerial drone glide past illuminated Manama glass towers while electric blue digital network nodes drift softly in the night sky.',
  );
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string>('');

  // === Tab 3: Multi-Turn Gemini Chatbot ===
  const [selectedRoleId, setSelectedRoleId] = useState<string>('architect');
  const [systemInstruction, setSystemInstruction] = useState<string>(CHAT_ROLES[0].instruction);
  const [chatModel, setChatModel] = useState<ChatModel>('gemini-4-hydrogen');
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: 'Welcome to XeroTech AI Engineering Desk. Choose a persona and model tier (`gemini-4-carbon`, `gemini-4-neon`, `gemini-4-hydrogen`, or `gemini-3.1-flash-lite`) to begin scoping your architecture or Bahrain digital transformation plan.',
      modelUsed: 'gemini-4-hydrogen',
      timestamp: 'Ready',
    },
  ]);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  const handleUploadEditImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    try {
      const parsed = await readFileAsUploadedImage(file);
      setSourceImageForEdit(parsed);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Unable to read image.');
    }
  };

  const handleGenerateOrEditImage = async () => {
    if (imagePrompt.trim().length < 3) {
      setImageError('Please enter a descriptive prompt.');
      return;
    }
    setImageLoading(true);
    setImageError('');
    setImageNotes('');

    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          aspectRatio: imageAspect,
          imageSize,
          image: sourceImageForEdit
            ? {data: sourceImageForEdit.data, mimeType: sourceImageForEdit.mimeType}
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Image generation failed.');
      }
      setGeneratedImageUrl(data.imageUrl);
      if (data.notes) setImageNotes(data.notes);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to generate image.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleSendGeneratedImageToVideo = () => {
    if (!generatedImageUrl) return;
    const match = generatedImageUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return;
    setVideoSourceImage({
      mimeType: match[1] as UploadedImage['mimeType'],
      data: match[2],
      previewUrl: generatedImageUrl,
      fileName: 'generated-render.png',
    });
    setVideoError('');
    setActiveTab('video');
  };

  const handleUploadVideoImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoError('');
    try {
      const parsed = await readFileAsUploadedImage(file);
      setVideoSourceImage(parsed);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Unable to read uploaded photo.');
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoSourceImage) {
      setVideoError('Please upload a starting photo first.');
      return;
    }
    setVideoLoading(true);
    setVideoError('');

    try {
      const res = await fetch('/api/gemini/video', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: videoPrompt.trim(),
          aspectRatio: videoAspectRatio,
          image: {
            data: videoSourceImage.data,
            mimeType: videoSourceImage.mimeType,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Video animation failed.');
      }
      setGeneratedVideoUrl(data.videoUrl);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Failed to animate image.');
    } finally {
      setVideoLoading(false);
    }
  };

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
    const found = CHAT_ROLES.find((r) => r.id === roleId);
    if (found) setSystemInstruction(found.instruction);
  };

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
    };

    const historyForApi = messages
      .filter((m) => m.id !== 'welcome-msg')
      .map((m) => ({role: m.role, text: m.text}));

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    setChatError('');

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          model: chatModel,
          systemInstruction,
          history: historyForApi,
          message: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Chat request failed.');
      }

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply,
        modelUsed: chatModel,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Failed to receive response.');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <section id="ai-studio" className="py-16 lg:py-24 bg-white border-b border-slate-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#0066FF]">
              Interactive Gemini Engineering Lab · Server-Side AI Proxy
            </p>
            <h2 className="mt-2.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A192F]">
              XeroTech Generative &amp; Advisory Studio
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              Generate or edit architectural renders with{' '}
              <span className="font-mono text-xs font-semibold text-[#0A192F]">
                gemini-nano-banana-2.1
              </span>
              , animate photos into 16:9 or 9:16 videos via{' '}
              <span className="font-mono text-xs font-semibold text-[#0A192F]">
                gemini-omni-1.2-flash
              </span>{' '}
              Interactions API, and consult our multi-turn Gemini 4 engineering advisor.
            </p>
          </div>

          {/* Segmented Studio Switcher */}
          <div
            role="tablist"
            aria-label="XeroTech AI Studio modes"
            className="inline-flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'image'}
              onClick={() => setActiveTab('image')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'image'
                  ? 'bg-[#0A192F] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#0A192F]'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>Image Studio</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'video'}
              onClick={() => setActiveTab('video')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-[#0A192F] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#0A192F]'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Video Animator</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'chat'}
              onClick={() => setActiveTab('chat')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-[#0A192F] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#0A192F]'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Gemini Chatbot</span>
            </button>
          </div>
        </div>

        {/* =================== TAB 1: IMAGE CREATE & EDIT =================== */}
        {activeTab === 'image' && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-3xl border border-slate-200/90 bg-slate-50/70 p-6 sm:p-8">
            <div className="lg:col-span-5 space-y-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#0066FF]">
                  Model: gemini-nano-banana-2.1
                </span>
                <button
                  type="button"
                  onClick={() => setImagePrompt(MANAMA_SKYLINE_PROMPT)}
                  className="text-xs font-semibold text-[#0066FF] hover:underline cursor-pointer"
                >
                  Load Manama Skyline Prompt
                </button>
              </div>

              <div>
                <label
                  htmlFor="img-prompt"
                  className="block text-xs font-semibold text-[#0A192F] mb-1.5"
                >
                  Prompt (Create from scratch or describe edits to uploaded photo)
                </label>
                <textarea
                  id="img-prompt"
                  rows={5}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe the image you want to create or edit..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="img-aspect"
                    className="block text-xs font-semibold text-[#0A192F] mb-1.5"
                  >
                    Aspect Ratio
                  </label>
                  <select
                    id="img-aspect"
                    value={imageAspect}
                    onChange={(e) =>
                      setImageAspect(e.target.value as typeof imageAspect)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                  >
                    <option value="16:9">16:9 (Ultra-Wide)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                    <option value="4:3">4:3 (Standard)</option>
                    <option value="3:4">3:4 (Editorial)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="img-size"
                    className="block text-xs font-semibold text-[#0A192F] mb-1.5"
                  >
                    Resolution
                  </label>
                  <select
                    id="img-size"
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value as '1K' | '2K')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                  >
                    <option value="1K">1K Standard</option>
                    <option value="2K">2K High-Res</option>
                  </select>
                </div>
              </div>

              {/* Optional Source Image for Editing */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[#0A192F]">
                    Optional Reference Image (For Image Editing)
                  </span>
                  {sourceImageForEdit && (
                    <button
                      type="button"
                      onClick={() => setSourceImageForEdit(null)}
                      className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs text-slate-600 hover:border-[#0066FF] cursor-pointer transition-colors">
                  <ImagePlus className="w-4 h-4 text-[#0066FF] shrink-0" />
                  <span className="truncate">
                    {sourceImageForEdit
                      ? `Loaded: ${sourceImageForEdit.fileName}`
                      : 'Upload PNG, JPEG, or WebP to edit'}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleUploadEditImage}
                    className="hidden"
                  />
                </label>
              </div>

              {imageError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 leading-relaxed">
                  {imageError}
                </div>
              )}

              <button
                type="button"
                disabled={imageLoading}
                onClick={handleGenerateOrEditImage}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-5 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0052CC] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {imageLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering with gemini-nano-banana-2.1...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{sourceImageForEdit ? 'Edit Image' : 'Generate Image'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Image Output Viewport */}
            <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/70">
                <span className="font-mono text-xs font-semibold text-slate-600">
                  Render Canvas · {imageAspect} ({imageSize})
                </span>
                {generatedImageUrl && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSendGeneratedImageToVideo}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0066FF] hover:underline cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Animate into Video</span>
                    </button>
                    <a
                      href={generatedImageUrl}
                      download="xerotech-render.png"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A192F] hover:text-[#0066FF]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-[340px] flex items-center justify-center p-4 bg-slate-950/[0.02]">
                {generatedImageUrl ? (
                  <img
                    src={generatedImageUrl}
                    alt="Generated architectural or corporate render"
                    className="max-h-[440px] w-auto rounded-xl object-contain shadow-md"
                  />
                ) : (
                  <div className="text-center max-w-sm p-6">
                    <Sparkles className="w-8 h-8 text-[#0066FF] mx-auto opacity-75" />
                    <p className="mt-3 text-sm font-semibold text-[#0A192F]">
                      Ready for Architectural or Brand Image Synthesis
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                      Click Generate Image using the pre-loaded Manama skyline prompt or upload an
                      existing image to apply natural-language edits.
                    </p>
                  </div>
                )}
              </div>
              {imageNotes && (
                <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-600 bg-slate-50">
                  {imageNotes}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================== TAB 2: ANIMATE IMAGES INTO VIDEO =================== */}
        {activeTab === 'video' && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-3xl border border-slate-200/90 bg-slate-50/70 p-6 sm:p-8">
            <div className="lg:col-span-5 space-y-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#0066FF]">
                  Model: gemini-omni-1.2-flash (Interactions API)
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-[#0A192F] mb-1.5">
                  1. Upload Starting Photo *
                </span>
                <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center hover:border-[#0066FF] cursor-pointer transition-colors">
                  {videoSourceImage ? (
                    <img
                      src={videoSourceImage.previewUrl}
                      alt="Selected starting frame"
                      className="max-h-36 rounded-lg object-contain"
                    />
                  ) : (
                    <Upload className="w-6 h-6 text-[#0066FF]" />
                  )}
                  <span className="text-xs font-semibold text-[#0A192F]">
                    {videoSourceImage
                      ? `Loaded: ${videoSourceImage.fileName} (Click to replace)`
                      : 'Choose PNG, JPEG, or WebP Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleUploadVideoImage}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label
                  htmlFor="vid-prompt"
                  className="block text-xs font-semibold text-[#0A192F] mb-1.5"
                >
                  2. Motion &amp; Camera Direction
                </label>
                <textarea
                  id="vid-prompt"
                  rows={3}
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Describe camera pan, lighting shifts, and animated motion..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-[#0A192F] mb-1.5">
                  3. Video Aspect Ratio
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {(['16:9', '9:16'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setVideoAspectRatio(ratio)}
                      className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                        videoAspectRatio === ratio
                          ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {ratio === '16:9' ? '16:9 Landscape' : '9:16 Portrait'}
                    </button>
                  ))}
                </div>
              </div>

              {videoError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 leading-relaxed">
                  {videoError}
                </div>
              )}

              <button
                type="button"
                disabled={videoLoading}
                onClick={handleGenerateVideo}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-5 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0052CC] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {videoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Animating Video via Interactions API...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>Generate {videoAspectRatio} Video</span>
                  </>
                )}
              </button>
            </div>

            {/* Video Player Output */}
            <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/70">
                <span className="font-mono text-xs font-semibold text-slate-600">
                  Omni Flash Output · {videoAspectRatio}
                </span>
                {generatedVideoUrl && (
                  <a
                    href={generatedVideoUrl}
                    download={`xerotech-animation-${videoAspectRatio.replace(':', 'x')}.mp4`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0066FF] hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download MP4</span>
                  </a>
                )}
              </div>

              <div className="flex-1 min-h-[340px] flex items-center justify-center p-4 bg-slate-950/[0.02]">
                {generatedVideoUrl ? (
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="max-h-[440px] w-full rounded-xl bg-black shadow-md"
                  />
                ) : (
                  <div className="text-center max-w-sm p-6">
                    <Film className="w-8 h-8 text-[#0066FF] mx-auto opacity-75" />
                    <p className="mt-3 text-sm font-semibold text-[#0A192F]">
                      Image-to-Video Motion Studio
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                      Upload any photo or import a generated render, choose 16:9 or 9:16, and
                      animate it with gemini-omni-1.2-flash.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================== TAB 3: MULTI-TURN GEMINI CHATBOT =================== */}
        {activeTab === 'chat' && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-3xl border border-slate-200/90 bg-slate-50/70 p-6 sm:p-8">
            {/* Left Configuration Panel: Role & Model Tier */}
            <div className="lg:col-span-4 space-y-5">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Chatbot Persona Role
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {CHAT_ROLES.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleChange(role.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                        selectedRoleId === role.id
                          ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="chat-sys-instruction"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"
                >
                  Active System Instruction
                </label>
                <textarea
                  id="chat-sys-instruction"
                  rows={4}
                  value={systemInstruction}
                  onChange={(e) => setSystemInstruction(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#0A192F] leading-relaxed focus:border-[#0066FF] focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Gemini Model Tier
                </span>
                <div className="space-y-2">
                  {CHAT_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setChatModel(m.id)}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                        chatModel === m.id
                          ? 'border-[#0066FF] bg-blue-50/70 ring-1 ring-[#0066FF]/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-[#0A192F]">
                          {m.label}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[#0066FF]">
                          {m.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                        {m.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Multi-Turn Scrollable Conversation Thread */}
            <div className="lg:col-span-8 flex flex-col h-[560px] rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#0066FF]" />
                  <span className="font-mono text-xs font-bold text-[#0A192F]">
                    {chatModel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMessages((prev) => prev.slice(0, 1))
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Thread</span>
                </button>
              </div>

              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30"
              >
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                          isUser
                            ? 'bg-[#0066FF] text-white'
                            : 'border border-slate-200 bg-white text-[#0A192F] shadow-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="mt-1 font-mono text-[10px] text-slate-400 px-1">
                        {isUser ? 'You' : msg.modelUsed || 'Gemini'} · {msg.timestamp}
                      </span>
                    </div>
                  );
                })}

                {chatLoading && (
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0066FF]" />
                    <span>{chatModel} is reasoning...</span>
                  </div>
                )}
              </div>

              {chatError && (
                <div className="border-t border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                  {chatError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendChat();
                }}
                className="flex items-center gap-2.5 border-t border-slate-200 bg-white p-3.5"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about architecture, BHD estimates, AI workflows, or code..."
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0052CC] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
