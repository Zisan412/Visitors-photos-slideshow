# Visitor Photo Slideshow

A responsive photo-library and slideshow app. People create an account, organize photos into folders, and show their account's collection on a laptop or a browser-enabled TV. A phone can be used to manage the same library while a display is open.

> **Project status:** This repository contains a local-development application. No deployed URL is documented because deployment has not been completed.

## What it does

- Account signup and login with an httpOnly session cookie.
- Create and edit named folders and choose a slideshow duration per folder.
- Upload, preview, and delete photos; deleting a folder also attempts to remove its stored images.
- Run a folder slideshow or show all photos on the authenticated Display page.
- Receive same-account folder and photo changes over Server-Sent Events (SSE).
- Store image binaries in ImageKit and photo metadata/identifiers in MongoDB.
- Recover an account password using the security question selected at signup.

### Typical workflow

1. Create an account with a name, email, password, and security question/answer.
2. Create a folder, choose a slideshow speed, and add photos.
3. Open **Display** on the screen to use as a photo frame, sign in with the same account, and choose a folder or all photos.
4. Uploads and other library changes are refreshed on the Display page while it is connected.

This is an account-based library, not a guest-upload kiosk: visitors are not separately identified by event, QR code, or one-time visitor token.

## Technology

| Layer | Technology | Role in this project |
|---|---|---|
| Frontend | React, Vite, React Router | Responsive account, library, editor, and slideshow pages; Vite provides the development server and production build. |
| UI icons | lucide-react | Consistent interface icons. |
| Backend | Node.js, Express | JSON API, authentication endpoints, photo proxy, and SSE connections. |
| Database | MongoDB with Mongoose | Account records and folder/photo metadata with owner-scoped queries. |
| Image processing | Sharp | Decode and validate image bytes, apply orientation, and re-encode uploads as JPEG. |
| Image storage | ImageKit | Store and serve image binaries outside the MongoDB documents. |
| Authentication | bcryptjs, JSON Web Tokens in httpOnly cookies | Hash passwords/answers and maintain browser sessions without putting tokens in browser storage. |

These are the technologies present in the implementation. ImageKit is used for image objects so MongoDB can hold compact metadata and references instead of large binary payloads; see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Screenshots

Screenshots are not currently checked into the repository.

- **Sign in:** _Screenshot placeholder_
- **Photo library and folders:** _Screenshot placeholder_
- **Display / slideshow:** _Screenshot placeholder_

## Prerequisites

- A current Node.js LTS release and npm.
- A MongoDB Atlas cluster and database user, or another MongoDB deployment reachable by the server.
- An ImageKit account with a private API key and URL endpoint.
- Git, if cloning the repository.

## Installation and local run

There is no root `package.json`; install dependencies separately in `server` and `client`. The commands below use PowerShell from the repository root.

### 1. Configure the backend

```powershell
Copy-Item server\.env.example server\.env
```

Edit `server\.env` with your own values (do not commit it). Configure MongoDB and ImageKit as described below, then install and start the API:

```powershell
Set-Location server
npm install
npm run dev
```

The API listens on port `5000` by default. Check `http://localhost:5000/api/health`; a healthy response reports `{"status":"ok"}`.

### 2. Start the frontend

Open a second terminal at the repository root:

```powershell
Set-Location client
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). During development, Vite proxies `/api` requests and SSE to `http://127.0.0.1:5000`.

### 3. Production frontend build

```powershell
Set-Location client
npm run build
```

The generated site is written to `client/dist`. Hosting/deployment is not configured by this repository.

## MongoDB Atlas setup

1. Create an Atlas cluster and a database user with access to the application database.
2. In Atlas **Network Access**, allow the IP address/network from which the backend will connect. Avoid leaving broad access enabled longer than needed.
3. Copy the cluster connection string and replace the username, password, and database name. URL-encode special characters in credentials.
4. Put the resulting URI in `MONGO_URI` in `server/.env`.
5. Start the server and verify `/api/health`.

The application stores users in the `users` collection and folders in `folders`. Photos are embedded as metadata under their folder document; their image bytes are stored in ImageKit.

## ImageKit and image storage

Set `IMAGEKIT_PRIVATE_KEY` and `IMAGEKIT_URL_ENDPOINT` in `server/.env`. The private key belongs only on the backend; do not put it in a `VITE_` variable or expose it in the browser.

An upload is sent to the authenticated API as multipart form data. The server checks its limits, decodes the bytes with Sharp, applies orientation, and re-encodes the accepted image as JPEG. It sends that JPEG to ImageKit. **Image binaries are stored in ImageKit; MongoDB stores the protected application image URL, ImageKit file ID and URL, original filename, MIME type, processed size, dimensions, and timestamp.** The app's photo endpoint checks account ownership and proxies the image, so serialized photo responses do not disclose the ImageKit URL or file ID.

Legacy local uploads can be migrated after configuring MongoDB and ImageKit:

```powershell
Set-Location server
npm run migrate:imagekit
```

The migration script skips photos already having an ImageKit file ID and retains local upload files as a backup. Review migration output and verify the images before manually removing any backups.

## Environment variables

Copy the placeholders from `server/.env.example`; substitute your own configuration locally. Never paste real keys or database credentials into documentation or commit them.

| Variable | Required | Purpose / example placeholder |
|---|---:|---|
| `PORT` | No | API port; default is `5000`. |
| `MONGO_URI` | Yes | Mongo connection string, e.g. `mongodb+srv://<username>:<password>@<cluster>/<database>`. |
| `JWT_SECRET` | Yes | Long, random secret, e.g. `<long-random-secret>`. |
| `IMAGEKIT_PRIVATE_KEY` | For uploads | ImageKit server-side private key, e.g. `<imagekit-private-key>`. |
| `IMAGEKIT_URL_ENDPOINT` | For uploads | ImageKit endpoint, e.g. `https://ik.imagekit.io/<imagekit-id>`. |
| `CLIENT_URLS` | Recommended | Comma-separated exact frontend origins, e.g. `http://localhost:5173,http://127.0.0.1:5173`. |
| `CLIENT_URL` | Optional legacy | One allowed frontend origin; used in addition to `CLIENT_URLS`. |
| `NODE_ENV` | No | Set to `production` for a production API; this makes session cookies secure-only. |
| `COOKIE_SAME_SITE` | No | Cookie SameSite value; defaults to `lax`. Cross-site cookies require HTTPS and `none`. |
| `API_PUBLIC_URL` | Optional | Public API origin when the frontend is hosted separately, e.g. `https://<api-host>`. |
| `VITE_API_BASE_URL` | Optional | Frontend API base ending in `/api`, e.g. `https://<api-host>/api`; defaults to `/api`. |
| `VITE_DEV_SERVER_TARGET` | Optional | Vite proxy target for local development, e.g. `http://127.0.0.1:5000`. |

The server loads `server/.env`, with `server/src/.env` as a compatibility fallback. In production, use HTTPS. If frontend and API are cross-site, configure `COOKIE_SAME_SITE=none`, secure cookies, and the exact allowed frontend origin(s).

## API overview

All routes below are under `/api`. Unless marked public, routes require the signed-in account's httpOnly cookie. API errors use JSON messages; successful deletes return `204`.

| Method and path | Access | Purpose |
|---|---|---|
| `GET /health` | Public | Report API/database readiness. |
| `POST /auth/signup` | Public | Create an account; name, email, password, and recovery question/answer required. |
| `POST /auth/login` | Public, rate-limited | Sign in and set the session cookie. |
| `POST /auth/logout` | Public | Clear the current browser's session cookie. |
| `GET /auth/me` | Signed in | Return current account information. |
| `POST /auth/password-reset/question` | Public, rate-limited | Look up a recovery question; unknown/unconfigured accounts receive a generic empty result. |
| `POST /auth/password-reset/verify` | Public, rate-limited | Verify an answer and issue a short-lived reset token. |
| `POST /auth/password-reset/reset` | Public, rate-limited | Set a new password with the reset token. |
| `GET /folders` | Signed in | List only the current account's folders and photos. |
| `POST /folders` | Signed in | Create a folder with a supported duration. |
| `GET /folders/:folderId` | Signed in | Get an owned folder. |
| `PATCH /folders/:folderId` | Signed in | Rename a folder and/or change its duration. |
| `DELETE /folders/:folderId` | Signed in | Delete an owned folder and attempt storage cleanup. |
| `POST /folders/:folderId/photos` | Signed in | Upload photos as multipart field `photos`. |
| `DELETE /folders/:folderId/photos/:photoId` | Signed in | Delete an owned photo. |
| `GET /photos/:photoId` | Signed in | Fetch an owned photo through the authenticated API proxy. |
| `GET /events` | Signed in, SSE | Subscribe to the current account's live library changes. |

## Authentication and account management

Passwords and normalized security answers are bcrypt-hashed. Login/signup set an httpOnly cookie containing a signed seven-day JWT; the frontend sends it with credentialed requests. Folder/photo lookups are scoped to that user. Each device signs in separately with the same email/password; there is no device-pairing flow.

Password recovery uses the question selected during signup. Answers are not stored in plain text, reset attempts are rate-limited, and reset tokens are short-lived and single-use. Older accounts without a configured question cannot self-reset through this flow and must contact an administrator. Security questions are weaker than email-based recovery or MFA and should not be treated as a high-assurance identity check.

## Phone, laptop, and TV usage

- Use the app in a modern mobile browser to create folders and upload from the phone's photo library.
- Use a laptop or browser-enabled smart TV to sign in to the same account and open **Display**.
- Select a folder or **All photos**, then start the slideshow. The display is a web page; it must be able to reach the frontend and API.
- For a phone accessing a development server on another device, bind Vite to the network as appropriate, allow the phone's exact origin in `CLIENT_URLS`, and point the Vite proxy at the reachable API host using `VITE_DEV_SERVER_TARGET`. Local development over HTTP is not suitable for secure public use.
- Browser support and remote TV behavior depend on that device's browser; no physical TV certification or deployed service is included.

## Testing

Backend unit tests:

```powershell
Set-Location server
npm test
```

Frontend production build:

```powershell
Set-Location client
npm run build
```

The backend tests cover folder validation, response serialization, account-scoped live-update fan-out, and recovery-answer normalization. These commands do not run a full browser suite, real multi-user concurrency test, Atlas/ImageKit service test, or smart-TV test.

## Known limitations

- Visitor identity is account/email-based; there is no guest, event, or QR pairing mode.
- A logged-in account's members/devices share its library; there are no separate roles or per-photo sharing controls.
- There is no automatic expiration/retention policy or account-deletion endpoint. Users can delete photos/folders from the UI; folder deletion's external asset cleanup is best-effort.
- Uploads are limited to 10 MB per image, 10 files per request, 100 photos per folder, and 40 million decoded pixels per image. The UI advertises JPG, PNG, and WEBP. The server requires an `image/*` MIME type and then relies on Sharp to decode the actual bytes; valid images are stored as JPEG.
- Upload files are processed sequentially within one request, but there is no upload queue or explicit concurrency lock across simultaneous requests. See [ASSUMPTIONS.md](./ASSUMPTIONS.md).
- SSE subscribers and notifications are held in one Node.js process; multiple backend instances need shared pub/sub to ensure every display receives every update.
- “All photos” uses a five-second slide duration; per-folder duration is used when a single folder is selected.
- A previous dependency install reported five high-severity npm audit findings. Re-run `npm audit` for current status and review remediation before production; no automatic dependency fix was applied.
