# 🌊 Blue Ocean Care — Command Center v4

ODDS-compliant group home management system with AI-powered document intake, 
role-based access, MAR, ISP tracking, and Google Calendar sync.

## Deploy to Vercel (2 minutes)

### Option 1: Vercel CLI
```bash
npm install
vercel login
vercel deploy --prod
```

### Option 2: Vercel Dashboard (easiest)
1. Push this folder to a GitHub repo
2. Go to https://vercel.com/new
3. Import your GitHub repo
4. Vercel auto-detects Vite — just click Deploy

### Option 3: Drag & Drop
1. Run `npm install && npm run build`
2. Go to https://vercel.com/new
3. Drag the `dist/` folder onto the page

## Set Up AI Features (optional)
1. In Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `ANTHROPIC_API_KEY` = your API key from console.anthropic.com
3. Redeploy

Without the API key, the app works fully — AI features (Doc Intake, 
AI Assistant, AI-formatted notes) will show an error message but 
everything else functions normally.

## Demo Accounts
- **Owner**: admin / 1234 (full access, all homes)
- **DSP**: dsp / 0000 (limited to Adult Home)

## Tech Stack
- React + Vite
- localStorage for persistence
- Vercel Serverless Functions for AI proxy
- Google Calendar URL scheme for appointment sync
