# AuraXPro AI Agent - Secure Client-Side Architecture

A ChatGPT-like AI agent built with Next.js 15, TypeScript, and OpenAI SDK. **API key is secured server-side** while maintaining a fast, responsive client experience.

## 🔐 Security Features

✅ **API Key Protection** - Key stored server-side only, never exposed to client  
✅ **API Route Proxy** - Secure Next.js API route handles OpenAI requests  
✅ **Environment Variables** - Uses `OPENAI_API_KEY` (not `NEXT_PUBLIC_*`)  
✅ **Error Handling** - Graceful error messages without exposing internals  

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up your OpenAI API key:**
   Create `.env.local` file:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```
   ⚠️ **Important**: Use `OPENAI_API_KEY` (NOT `NEXT_PUBLIC_OPENAI_API_KEY`)

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## 📦 Tech Stack

- **Next.js 15** (App Router with API Routes)
- **TypeScript**
- **Tailwind CSS** (with dark mode support)
- **Zustand** (state management with localStorage persistence)
- **OpenAI JavaScript SDK** (server-side only)

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # Secure API route (server-side)
│   ├── page.tsx              # Main page (renders Chat component)
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   └── Chat.tsx              # Main chat interface component
├── store/
│   └── chatStore.ts          # Zustand store with localStorage persistence
└── lib/
    └── openaiServer.ts       # Server-side OpenAI client (secure)
```

## 🔒 How Security Works

1. **Client** sends request to `/api/chat` (Next.js API route)
2. **API Route** (server-side) uses `OPENAI_API_KEY` from environment
3. **OpenAI SDK** processes request server-side
4. **Response** sent back to client (no API key exposed)

The API key **never** leaves the server. It's not in:
- ❌ Client-side JavaScript
- ❌ Browser network tab (only your API route URL)
- ❌ Bundled code
- ❌ Environment variables prefixed with `NEXT_PUBLIC_`

## ✨ Features

- ✅ **Secure API Key** - Protected server-side
- ✅ **Persistent History** - Chat history saved to localStorage
- ✅ **Dark Mode** - Toggle between light/dark themes
- ✅ **Responsive Design** - Works on all screen sizes
- ✅ **Loading States** - Smooth animations during API calls
- ✅ **Error Handling** - Graceful error messages
- ✅ **Auto-scroll** - Messages automatically scroll into view
- ✅ **Enter to Send** - Shift+Enter for new lines

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add `OPENAI_API_KEY` to Vercel environment variables
4. Deploy!

**Important**: 
- ✅ Use `OPENAI_API_KEY` (not `NEXT_PUBLIC_OPENAI_API_KEY`)
- ✅ Never commit `.env.local` to git
- ✅ Set environment variable in Vercel dashboard

### Other Platforms

For other hosting platforms (Netlify, Railway, etc.):
- Set `OPENAI_API_KEY` as an environment variable
- Ensure Next.js API routes are supported
- The key will be available server-side only

## 🎨 Customization

### Change System Prompt
Edit `src/lib/openaiServer.ts`:
```typescript
const SYSTEM_PROMPT = 'Your custom prompt here';
```

### Change Model
Edit `src/lib/openaiServer.ts`:
```typescript
model: 'gpt-4o-mini', // Change to 'gpt-4o', 'gpt-3.5-turbo', etc.
```

### Add Rate Limiting
You can add rate limiting to `src/app/api/chat/route.ts`:
```typescript
// Example: Simple rate limiting
const rateLimit = new Map();
// Add rate limiting logic here
```

## 📝 License

MIT License - see LICENSE file
