# Architecture

## Application shape

- `client/` is the React + Vite application. `src/api.js` is its only HTTP client; `src/hooks/useAppData.jsx` loads the cookie-authenticated account and folders into memory.
- `server/src/server.js` loads environment configuration, connects Mongoose, and only then starts Express.
- `server/src/models/` contains account and folder/photo metadata schemas.
- `server/src/controllers/` implements auth, folder, photo, and SSE operations; `server/src/routes/` exposes those operations under `/api`.
- `server/src/middleware/auth.js` verifies the signed httpOnly session cookie and loads the account for every protected request.

There is no QR code, device pairing model, pairing token, or pairing endpoint. The Display page is authenticated and uses the same account-owned folders as the rest of the app.

## Authentication and ownership

Signup hashes passwords with bcrypt. Login signs a seven-day JWT into an httpOnly, SameSite cookie; the JWT is never returned to the frontend or written to browser storage. Each browser has an independent cookie session. Logout clears that browser's cookie.

All folder queries include the authenticated account's owner ID. Photo retrieval, upload, deletion, and folder deletion first require an account-owned folder/photo match. The browser does not choose an owner ID.

Configure `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URLS` in the backend environment. `CLIENT_URLS` is a comma-separated allowlist of exact frontend origins; the legacy single-origin `CLIENT_URL` remains supported. The loader prefers `server/.env` and falls back to the existing `server/src/.env`; neither file is modified by the application. In production, serve the frontend and API over HTTPS. If they are cross-site, set `COOKIE_SAME_SITE=none`, which also requires secure cookies, and allow the exact frontend origin with `CLIENT_URLS`. When the API is on a different host, set `API_PUBLIC_URL` so protected photo URLs resolve to the API host.

## Photo upload and storage (temporary disk adapter)

1. The frontend submits image `File` objects to `POST /api/folders/:folderId/photos` as multipart form data (10 MB per image and 10 files per request).
2. Multer enforces per-file and per-request limits. Sharp decodes the actual image bytes, rejects unsupported/corrupt files and excessive pixel counts, applies orientation, and re-encodes JPEGs without carrying EXIF/GPS metadata forward.
3. The backend writes the sanitized assets to `server/uploads`, then stores `storageKey`, `imageUrl`, MIME type, dimensions, size, and a nullable `imageKitFileId` in the account-owned MongoDB folder.
4. `GET /api/photos/:photoId` checks ownership before streaming the asset. Photo/folder deletion removes the MongoDB record and disk asset. Folder APIs return image URLs used by folder cards, previews, and slideshow pages.

This local adapter supports a single persistent backend host. A deployment with ephemeral storage or multiple backend instances must not treat it as durable shared storage.

## Planned ImageKit migration (not implemented)

ImageKit's official Node SDK is intentionally not installed yet. When credentials are supplied, configure `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, and `IMAGEKIT_URL_ENDPOINT` on the server only.

- Replace the disk-write step in `server/src/controllers/photoController.js` with server-side ImageKit uploads of the validated, metadata-stripped image. Keep the upload count/type/size/content checks.
- Save ImageKit's `fileId` in `Folder.photos.imageKitFileId` and its delivery URL in `Folder.photos.imageUrl`. Those schema fields and API response fields already exist; the private key must never be sent to the client.
- Change `server/src/controllers/photoController.js` photo delivery/deletion and `server/src/controllers/folderController.js` folder cleanup to use the ImageKit asset identifier. Preserve the owner-scoped MongoDB lookup before delete or delivery.
- The frontend already renders the returned `imageUrl` in `FolderCard`, `PhotoPicker`, `FolderDetailsPage`, `DisplayPage`, and `SlideshowPlayer`; it should not need ImageKit SDK code or credentials. Configure private/signed delivery or keep serving assets through an authenticated owner-checked endpoint—do not expose private account photos through unrestricted public URLs.
- Migrate existing `storageKey` files before removing local disk support. Keep cleanup/retry handling for failed asset uploads and deletes so MongoDB records do not point at missing files.

The current upload, display, and delete paths therefore share `photo.imageUrl` and `photo.fileId`; the storage provider can change behind the Express controllers without exposing storage credentials or changing UI ownership rules.

## Live Display updates

`GET /api/events` is an authenticated Server-Sent Events stream. The server keeps an in-process subscriber set per account and emits folder/photo changes only to that account. The Display screen loads the current folder list before using the stream; on every event it refetches the list, so it starts with existing photos and reconciles uploads/deletions.

The in-process event registry is suitable for a single Node process. If the backend is later horizontally scaled, replace it with a shared pub/sub transport (for example Redis) so every connected display receives updates regardless of which instance handled a write.

## Current limitations

- MongoDB availability is required to start the API. Startup failures are reported without printing connection strings.
- Temporary image files are stored on local disk until the ImageKit integration/migration step.
- SSE fan-out is process-local and assumes a single backend instance.
- Signup/login use same-origin cookie protections and an exact configured CORS origin; cross-site production deployments require HTTPS and the cookie/CORS settings described above.
