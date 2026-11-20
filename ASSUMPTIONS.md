# Assumptions and implementation decisions

This document records behavior verified in the current repository. **Implemented behavior** describes what the code does; **assumption/limitation** explains a project choice or behavior not promised as a feature. It does not imply a policy or capability that is absent from the app.

## Visitor identity and returning visitors

| Topic | Implemented behavior | Why / assumption / limitation |
|---|---|---|
| Visitor identity | Each person is represented by an account with a required name and unique email. Signup creates the account; login identifies it by normalized email and password. | A durable account identifier is needed to retrieve the same library across devices. The app does not have anonymous guest identities, event codes, QR pairing, or identity based only on device/browser. |
| Returning visitors | Signing in to the same account retrieves its folders and embedded photo metadata from MongoDB. The frontend calls `GET /api/folders` for the authenticated account and refreshes again on SSE events. | Account ownership is the implemented “returning visitor” mechanism. A different account does not see those folders. |
| Name and photo prompt | Signup asks for the account holder's name. Photos are added later from the folder editor; signup does not ask every visitor for photos, and there is no guest/event check-in form. | This is an account photo library rather than a walk-up event kiosk. Consequently, the original assignment's per-visitor name-and-photo intake requirement is only partially met. |

## Privacy, consent, viewing, and deletion

| Topic | Implemented behavior | Why / assumption / limitation |
|---|---|---|
| Consent | A required signup checkbox says the user understands uploaded photos are stored and managed in their account. | This acknowledges account storage. It is not a separate consent to display publicly; the slideshow is protected by account login and ownership checks. |
| Who can view photos | API folder/photo routes and the image proxy require a valid session and filter by the signed-in account. Devices logged in to the same account can view its library. | The design treats each account as its own private library. It does not have public links, invitations, roles, or per-photo access controls. Anyone with access to the account credentials can act as that account. |
| User deletion | The UI/API allow deleting a photo or folder. Folder deletion attempts to delete all corresponding ImageKit objects. | Deletion gives the owner a way to remove content. Provider cleanup can fail; cleanup is logged but not queued for retry, and folder metadata may already have been deleted. |
| Retention | There is no automatic expiration or retention period. Content remains until a user deletes it or an administrator removes it from storage. There is no account deletion endpoint in the current API. | Indefinite retention is the current implementation, not a legal or organizational retention policy. Add an explicit retention/account-deletion policy before production use if required. |

## Upload validation and storage

| Topic | Implemented behavior | Why / assumption / limitation |
|---|---|---|
| Supported image input | The browser's picker advertises JPG, PNG, and WEBP. The server requires an `image/*` MIME type and then asks Sharp to decode the actual bytes; invalid or unsupported data is rejected. There is no explicit three-format allowlist. Successful input is re-encoded as JPEG. | Decoding bytes catches invalid files that merely claim to be images. The UI lists common formats, but the backend may accept other formats Sharp can decode; do not treat the UI list as a strict server allowlist. |
| File limits | Maximum 10 MiB per file, 10 files per request, 100 photos per folder, and 40,000,000 decoded pixels per image. The browser checks file size/count; Multer and Sharp enforce server-side bounds. | These caps bound request memory, individual processing work, and folder size. A request is held in memory while it is processed, so deployment capacity must account for concurrent uploads. |
| Metadata/privacy | Sharp applies orientation and produces JPEG output. MongoDB stores original filename, processed MIME/size/dimensions, timestamps, protected app URL, ImageKit URL, and ImageKit file ID. Image binaries are in ImageKit, not MongoDB. | Separate object storage avoids placing large image payloads in database documents; metadata remains queryable with its folder and owner. Re-encoding also strips EXIF from the resulting image. |
| Image URL access | Normal folder serialization returns the protected app photo URL; the API does not expose the ImageKit URL/file ID to the browser. The photo endpoint checks that the current account owns the photo before proxying. | The browser needs an image URL while access remains account-protected. This proxy adds backend bandwidth and depends on ImageKit being reachable. |
| External-storage failure | If the save process fails after uploads to ImageKit, the API attempts to remove those uploaded objects. Deletion cleanup errors are logged. There is no transactional commit across ImageKit and MongoDB or durable cleanup retry queue. | MongoDB and ImageKit are separate services, so failure recovery is best-effort rather than atomic. |

## Simultaneous uploads and users

| Topic | Implemented behavior | Why / assumption / limitation |
|---|---|---|
| Multiple users | Folder access and SSE fan-out are partitioned by account ID. Each user has a separate account library. | Owner checks are the core isolation boundary. There is no shared event-wide public album. |
| Multiple devices | A phone, laptop, and TV/browser can sign in to the same account separately. Folder changes are sent to active same-account SSE subscribers. | This avoids requiring a pairing workflow, but each browser must be able to reach the frontend/API and have a valid cookie. |
| Simultaneous requests | Within one upload request, files are sent to ImageKit sequentially. Separate HTTP requests can run concurrently; there is no explicit queue or lock around checking the 100-photo folder limit. ImageKit uploads are cleaned up if the subsequent database save throws. | Per-account ownership and per-request/file limits reduce accidental cross-user effects. The lack of an atomic capacity reservation means concurrent requests near a folder's 100-photo limit are not guaranteed to enforce the cap without a race. There is no dedicated concurrency/integration test. |
| Multiple backend instances | Live subscribers and rate-limit counters are in memory in each process. | The current design assumes a single backend process. Horizontal scaling needs shared pub/sub for SSE and a shared rate-limit store if globally consistent limits are required. |

## Slideshow and device communication

| Topic | Implemented behavior | Why / assumption / limitation |
|---|---|---|
| Slideshow timing | A folder duration is chosen as 3, 5, 7, 10, or 15 seconds per photo. The folder's duration is used when displaying that folder. “All photos” uses 5 seconds. | A folder has one clear speed setting; all photos spans several folders, so the app uses the default rather than choosing an arbitrary folder's setting. |
| Upload during playback | Display subscribes to SSE while open. On each event it refetches the folder list; React updates the slideshow photo list. A newly uploaded photo becomes part of the list and is shown as playback advances. | This updates an active display without manual reload. The slideshow is not a durable queue and events are not replayed; the initial load/reconnect refresh recovers current library state. |
| Phone-to-display communication | There is no direct peer-to-peer or phone-specific connection. Phone and display browsers use the API and same account. The display receives SSE changes from the server. | Server-mediated updates avoid requiring both devices on the same local network after the web app/API are reachable. A local development phone still needs network/firewall/origin configuration. |
| Smart TV support | The Display page is ordinary web UI and can be opened in a TV browser that supports the app. | No native TV client, remote-control integration, or physical-device/browser certification is included. |

## Account recovery and other limitations

- Password recovery uses a signup-selected security question; the answer is normalized and bcrypt-hashed, attempts are rate-limited, and reset tokens are short-lived and single-use. Security questions are not equivalent to email verification/MFA. Older accounts without a configured question cannot use this self-service recovery flow.
- Login cookies are browser-specific. Sharing a library between devices requires signing in to each with the same account.
- Cross-site frontend/API hosting requires HTTPS, appropriate `COOKIE_SAME_SITE` configuration, and an exact CORS origin allowlist.
- No production deployment URL is present. Dependencies, Atlas, ImageKit, network access, and browser support must be configured and verified for a deployment.
- Automated backend tests cover folder input validation, serialization privacy, account-scoped in-process SSE delivery, and security-answer normalization. They do not prove real Atlas/ImageKit behavior, concurrent upload capacity handling, long-running SSE behavior, or compatibility with every phone/TV browser.
