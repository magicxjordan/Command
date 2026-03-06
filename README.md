# Don's Command Center

A personal financial planning app with 4 tabs: Work, Music, Money, and AI Advisor.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create your environment file:
```bash
cp .env.local.example .env.local
```

3. Add your Anthropic API key to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

4. Run locally:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel (Free — 5 minutes)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) and import the repo
3. In Vercel project settings → Environment Variables → add `ANTHROPIC_API_KEY`
4. Deploy — done. Works on your phone, save to home screen.

## Features
- **Work tab**: Day/Week/Month calendar for sales tasks and airline prospects
- **Music tab**: Day/Week/Month calendar for music deadlines and release goals  
- **Money tab**: Monthly calendar with income/expense tracking and balance bar
- **Advisor tab**: AI chat (Claude) that adds/deletes events on any calendar + exports to Apple Calendar (.ics)
