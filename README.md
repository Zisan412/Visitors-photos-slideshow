# Visitor Photo Slideshow

Visitor Photo Slideshow is a responsive React + Vite frontend backed by Express, MongoDB, and Mongoose. Accounts use an httpOnly JWT cookie; each browser signs in independently and reads the same account-owned folders.

## Run locally

1. Configure `MONGO_URI` and `JWT_SECRET` in `server/.env` (the server also reads the existing `server/src/.env` as a compatibility fallback). Set `CLIENT_URLS` to a comma-separated list of exact frontend origins, such as `http://localhost:5173,http://192.168.43.242:5173`. The legacy single-origin `CLIENT_URL` remains supported. Set `NODE_ENV=production` for an HTTPS production deployment so session cookies are marked Secure.
2. Install and start the backend:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

3. In a second terminal, install and start the frontend:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

The Vite development server proxies `/api` requests and SSE to `http://127.0.0.1:5000`. Override the proxy target with `VITE_DEV_SERVER_TARGET` if the backend runs elsewhere. For a separately hosted API, set `VITE_API_BASE_URL` to the API's `/api` URL (for example `https://api.example.com/api`), backend `API_PUBLIC_URL` to the API origin (for example `https://api.example.com`), and `CLIENT_URLS` to the allowed frontend origins; use HTTPS and `COOKIE_SAME_SITE=none` only when the frontend and API are on different sites.

Sign up from `/signup`, then use the same email and password on each device. No demo credentials or mock accounts are included. `/display` is an authenticated screen where a user can show a folder or all of their photos; changes to that account's library arrive through SSE.

## Current image storage

Uploads are validated and decoded on the backend, re-encoded as JPEG to remove EXIF metadata, and stored under `server/uploads` (10 MB per image, up to 10 per request). MongoDB stores metadata and a protected photo URL, not image binaries. This disk store is temporary and is not durable across ephemeral deployments or multiple backend instances. ImageKit is intentionally not integrated in this step.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for request flows, ownership boundaries, SSE behavior, and the planned ImageKit migration.
