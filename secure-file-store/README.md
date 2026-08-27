# SecureVault — Secure File Storage Service

A production-quality full-stack application for secure file storage with user authentication, private/public file management, and shareable links. Supports uploading files up to **200 MB** via AWS S3 multipart upload.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite (plain JavaScript/JSX) |
| Backend | Node.js + Express.js + TypeScript |
| Database | PostgreSQL (via Prisma ORM) |
| File Storage | AWS S3 / MinIO (S3-compatible, for local dev) |
| Auth | JWT (Access + Refresh token rotation, HttpOnly cookies) |

---

## Architecture

- Files are uploaded **directly from the browser to S3** via presigned multipart URLs — the backend never holds file bytes in memory (scalable for 100 MB+ files).
- The backend generates time-limited presigned download URLs (15 min for private, 1 hour for public shares).
- Private files are only accessible to their owner via token-authenticated API. Public files are accessible via an opaque `shareToken` UUID link — the real file ID and S3 key are never exposed.
- Refresh tokens are stored as **SHA-256 hashes** in the database and rotated on every use (1-time-use tokens).

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/) + Docker Compose
- npm

---

## Local Development Setup

### 1. Clone and navigate

```bash
cd secure-file-store
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your values (defaults work for local MinIO dev)
```

### 3. Start databases (PostgreSQL + MinIO)

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **MinIO** (S3-compatible storage) on `localhost:9000` — Console at `localhost:9001` (user: `minioadmin` / pass: `minioadmin`)
- A MinIO init container that auto-creates the `sfs-bucket` bucket

### 4. Backend setup

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```

Backend runs on: `http://localhost:4000`

### 5. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## Switching to Real AWS S3

Edit `backend/.env`:

```env
# Leave S3_ENDPOINT blank to use real AWS S3
S3_ENDPOINT=
S3_REGION=ap-south-1
S3_BUCKET_NAME=your-bucket-name
S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Create your bucket in the AWS Console with **Block All Public Access** enabled. The app uses presigned URLs — S3 objects are never directly public.

> When `S3_ENDPOINT` is blank, server-side encryption (`AES256`) is automatically enabled for all uploads.

---

## API Reference

### Auth (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Register new user → `201 Created` |
| POST | `/login` | No | Login, returns access token + sets refresh cookie |
| POST | `/refresh` | No | Rotate refresh token, returns new access token |
| GET | `/me` | Yes | Get current user profile |
| POST | `/logout` | Yes | Revoke current session refresh token → `204` |
| DELETE | `/sessions` | Yes | **Revoke ALL sessions** (logout all devices) → `204` |

### Files (`/api/v1/files`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List files (paginated) — supports `?search=&visibility=PUBLIC\|PRIVATE&limit=50&offset=0` |
| GET | `/:id` | Yes (owner) | Get file metadata + presigned download URL (15 min) |
| POST | `/upload/init` | Yes | Initiate multipart upload |
| POST | `/upload/complete` | Yes | Complete multipart upload + persist metadata → `201` |
| POST | `/upload/abort` | Yes | Abort in-progress upload → `204` |
| PATCH | `/:id/visibility` | Yes (owner) | Toggle `PUBLIC` / `PRIVATE` |
| DELETE | `/:id` | Yes (owner) | Delete file from S3 + DB → `204` |
| GET | `/share/:shareToken` | No | Access a public file via share token (no auth required) |

---

## Security Highlights

### File Validation (OWASP-compliant)
- **Extension allowlist** — only safe, known extensions are accepted.
- **MIME type allowlist** — client-provided `Content-Type` is cross-checked against the allowed list (secondary guard).
- **Double-extension prevention** — filenames like `file.jpg.php` are rejected.
- **Filename sanitization** — original name is sanitized (path traversal chars removed) before DB storage. S3 uses a UUID key entirely.
- **Server-side size enforcement** — `sizeBytes` is validated on the backend with a hard 200 MB cap. The Zod schema also rejects values above 200 MB at the API boundary. The client cannot bypass this.

### Magic Bytes — Architectural Trade-off
> **Why we don't do magic byte validation**: Files are uploaded **directly from the browser to S3** via presigned URLs — the backend never sees the file bytes. This is a deliberate architecture choice for scalability (the backend is not a bottleneck for large file transfers). In a production system, the recommended approach is an **S3 Lambda trigger** or **post-upload scan** (e.g., ClamAV, AWS Macie, or VirusTotal API) that processes the file after it lands in S3 and moves it to a clean bucket only after passing validation.

### Auth
- `bcrypt` (cost factor 12) for password hashing.
- Short-lived JWT access tokens (15 min). Refresh tokens are signed JWT, stored in the DB as **SHA-256 hashes** (raw token never persisted).
- Tokens are **rotated on every use** (single-use refresh tokens).
- `HttpOnly`, `SameSite=Strict` cookies for refresh token transport.
- Interceptor handles silent refresh and queues concurrent requests during token rotation.

### API Security
- **Rate limiting**: 10 req/min on auth, 20 req/min on upload init.
- **Helmet.js**: Secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.) on all responses.
- **Scoped file access**: Every file operation verifies `file.ownerId === authenticatedUserId`. Public shares use opaque UUID `shareToken` — never the internal file ID or S3 key.
- **Pagination DoS protection**: `limit` is clamped to max 100 server-side regardless of what the client requests.

---

## Project Structure

```
secure-file-store/
├── .gitignore
├── docker-compose.yml
├── backend/
│   ├── .env.example          ← copy to .env and fill in secrets
│   ├── prisma/schema.prisma
│   └── src/
│       ├── config/           # env, prisma, s3 client config
│       ├── middleware/       # auth, validate, errorHandler
│       ├── routes/           # auth.routes.ts, files.routes.ts
│       ├── controllers/      # auth.controller.ts, files.controller.ts
│       ├── services/         # auth.service.ts, files.service.ts, s3.service.ts
│       └── utils/            # jwt.ts, fileValidation.ts
└── frontend/
    └── src/
        ├── context/          # AuthContext (session management)
        ├── hooks/            # useFileUpload (multipart with progress)
        ├── lib/              # api.js (Axios + auto-refresh interceptor)
        ├── pages/            # LoginPage, RegisterPage, DashboardPage, SharePage
        └── components/       # FileUploader, FileCard, FileGrid, ShareModal, Navbar
```
