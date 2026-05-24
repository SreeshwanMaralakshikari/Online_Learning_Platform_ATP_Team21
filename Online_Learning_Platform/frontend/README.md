# OLP Frontend

React + Vite frontend for the Online Learning Platform. Deploys to **Vercel**.

## Setup

1. Copy `.env.example` to `.env` and fill in your Render backend URL.
2. `npm install`
3. `npm run dev` (development with proxy to localhost:1935)

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Your Render backend URL, e.g. `https://your-app.onrender.com` |

> In development, `VITE_API_URL` is not needed — Vite proxies API calls to `localhost:1935`.

## Vercel Deployment

1. Push this `frontend/` folder to a GitHub repo.
2. Import the repo on [vercel.com](https://vercel.com).
3. Vercel auto-detects Vite — no extra build settings needed.
4. In **Settings → Environment Variables**, add `VITE_API_URL` = your Render backend URL.
5. Redeploy after setting the env var.

> The `vercel.json` file already handles SPA routing (all paths → `index.html`).
