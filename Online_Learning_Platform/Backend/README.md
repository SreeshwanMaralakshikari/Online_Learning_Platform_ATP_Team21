# OLP Backend

Express + MongoDB backend for the Online Learning Platform. Deploys to **Render**.

## Setup

1. Copy `.env.example` to `.env` and fill in all values.
2. `npm install`
3. `npm run dev` (development) or `npm start` (production)

## Environment Variables

| Variable | Description |
|---|---|
| `DB_URL` | MongoDB Atlas connection string |
| `SECRET_KEY` | JWT signing secret (48+ random bytes) |
| `PORT` | Port (Render sets this automatically) |
| `FRONTEND_URL` | Vercel frontend URL for CORS |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

## Render Deployment

1. Push this `Backend/` folder to a GitHub repo.
2. Create a new **Web Service** on Render, connect your repo.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node server.js`
5. Add all environment variables in the Render dashboard.
6. The health check hits `GET /` — server returns `200 OK` there.

> **Note:** If you push the parent folder (containing both `Backend/` and `frontend/`), uncomment `rootDir: Backend` in `render.yaml`.

## API Routes

| Prefix | Description |
|---|---|
| `GET /` | Health check |
| `/auth` | Register, login, logout, profile |
| `/student-api` | Student-specific routes |
| `/instructor-api` | Instructor-specific routes |
| `/admin-api` | Admin-specific routes |
