# Quick Portal – Enterprise Technical Documentation & Repository Wiki

Welcome to the official technical documentation for **Quick Portal**, a high-performance, enterprise-grade secure messaging platform built with React 19, TypeScript 6, TailwindCSS 4, Zustand 5, Django REST Framework, Django Channels, Web Crypto API (Signal Protocol X3DH + Double Ratchet), and IndexedDB offline persistence.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Repository & Directory Structure](#2-repository--directory-structure)
3. [End-to-End Encryption Flow (X3DH + Double Ratchet)](#3-end-to-end-encryption-flow-x3dh--double-ratchet)
4. [API Documentation (REST Endpoints)](#4-api-documentation-rest-endpoints)
5. [WebSocket Real-Time Event Protocols](#5-websocket-real-time-event-protocols)
6. [Database Schema & Migration System](#6-database-schema--migration-system)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Docker & Production Deployment Guide](#8-docker--production-deployment-guide)
9. [Disaster Recovery & Backup Strategy](#9-disaster-recovery--backup-strategy)
10. [Monitoring, Alerting & Observability](#10-monitoring-alerting--observability)
11. [Troubleshooting Guide](#11-troubleshooting-guide)
12. [Developer Onboarding Guide](#12-developer-onboarding-guide)

---

## 1. System Architecture

Quick Portal follows a decoupled, privacy-first enterprise architecture:

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    React 19 SPA                        │
                               │  - Web Crypto API (X25519, Ed25519, AES-256-GCM, HKDF) │
                               │  - IndexedDB Cache & Outbox (idb)                      │
                               │  - Virtuoso Virtualized Message List                   │
                               └───────────────┬────────────────────────┬───────────────┘
                                               │                        │
                                    HTTP / REST (JSON)            WebSocket (WSS)
                                               │                        │
                                               ▼                        ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                                   Nginx Reverse Proxy                                 │
│                   - SSL Termination, CSP Headers, Rate Limiting                       │
└───────────────┬───────────────────────────────────────────────────────┬───────────────┘
                │                                                       │
                ▼                                                       ▼
┌───────────────────────────────────────────┐       ┌───────────────────────────────────┐
│     Django REST Framework (WSGI)          │       │    Daphne / Django Channels (ASGI)│
│  - JWT Cookie Auth & Axes Brute Force     │       │  - Real-Time Message Routing      │
│  - Pre-Key Bundle & Device Management     │       │  - Presence & Activity Broadcasts │
└─────────────────────┬─────────────────────┘       └─────────────────┬─────────────────┘
                      │                                               │
                      ▼                                               ▼
┌───────────────────────────────────────────┐       ┌───────────────────────────────────┐
│           PostgreSQL 16 DB                │       │             Redis 7               │
│  - UUIDv7 Time-Ordered Indexes            │       │  - WebSocket Pub/Sub Layer        │
│  - Transactional Key Allocations          │       │  - Celery Task Queue              │
└───────────────────────────────────────────┘       └───────────────────────────────────┘
```

---

## 2. Repository & Directory Structure

```
chat1/
├── backend/                         # Django REST Framework Backend
│   ├── config/                      # Settings, URLs, WSGI/ASGI Config
│   ├── users/                       # Custom User, Device, PreKey Models & Views
│   │   ├── models.py                # CustomUser, Contact, Device, Session
│   │   ├── models_prekey.py         # SignedPreKey, OneTimePreKey, AuditLog
│   │   ├── views_keybundle.py       # KeyBundleUpload, KeyBundleFetch, PreKeyCount
│   │   └── urls.py                  # Auth & Key Bundle Routes
│   ├── chat/                        # Messaging, Conversations & Attachments
│   │   ├── models.py                # Conversation, Message, MediaAttachment, ReadReceipt
│   │   ├── views.py                 # UploadStart, UploadChunk, UploadComplete, Chat API
│   │   └── websockets/              # Django Channels WebSocket Consumers
│   └── docker/                      # Production Backend Dockerfiles
├── frontend/                        # React 19 + Vite Frontend SPA
│   ├── src/
│   │   ├── crypto/                  # Web Crypto API Cryptographic Subsystem
│   │   │   ├── keys.ts              # X25519 & Ed25519 Generation & Derive
│   │   │   ├── aes.ts               # AES-256-GCM Encrypt & Decrypt
│   │   │   ├── hkdf.ts              # HKDF-SHA256 Key Derivation
│   │   │   ├── SessionManager.ts    # X3DH Handshake & Double Ratchet Session
│   │   │   └── storage.ts           # IDB Private Key Storage
│   │   ├── store/                   # Zustand Stores & IDB Persistence
│   │   │   ├── offlineStore.ts      # IndexedDB Offline Outbox & Cache (idb)
│   │   │   ├── chatPreferencesStore.ts # UI & Theme Preferences
│   │   │   └── themeStore.ts        # Dark/Light Mode Switcher
│   │   ├── features/
│   │   │   ├── chat/                # Chat Components
│   │   │   │   ├── MessageList.tsx  # Virtuoso Virtualized Message List
│   │   │   │   ├── MessageInput.tsx # Input, Voice Note & Camera Attachment
│   │   │   │   ├── VoiceRecorder.tsx# MediaRecorder API & Audio Waveform
│   │   │   │   ├── AudioBubble.tsx  # Voice Playback & Seek Controls
│   │   │   │   ├── CameraModal.tsx  # Photo & Video Capture
│   │   │   │   ├── ChatSearch.tsx   # Keyword Search & Highlight
│   │   │   │   ├── MediaGallery.tsx # Fullscreen Media Gallery
│   │   │   │   ├── GroupCreateModal.tsx # Group Creation Modal
│   │   │   │   └── GroupInfoPanel.tsx   # Group Drawer & Member Management
│   │   ├── realtime/                # WebSocket Realtime Engine
│   │   │   ├── socket.ts            # WebSocket Client & Automatic Outbox Flush
│   │   │   └── store.ts             # Presence & Activity State
│   │   └── lib/api.ts               # Centralized API Fetch Client
│   ├── tests/e2e/                   # Playwright E2E Test Suite
│   ├── vitest.config.ts             # Vitest Configuration
│   └── vitest.setup.ts              # IDB & JSDOM Test Setup
├── load_testing/                    # k6 Enterprise Load Testing Suite
│   └── k6_full_suite.js             # 100 to 10,000 VUs Benchmark Script
└── .github/workflows/               # GitHub Actions Production CI/CD Pipeline
    └── deploy.yml                   # CI/CD, Container Scan, SBOM, Blue-Green Rollout
```

---

## 3. End-to-End Encryption Flow (X3DH + Double Ratchet)

### Key Agreement (X3DH)
1. **Device Initialization**: Client generates Identity Key Pair ($IK_A$, Ed25519) and Signed Pre-Key ($SPK_A$, X25519). Public keys are uploaded to the backend via `POST /api/auth/devices/keys/upload/`.
2. **Session Setup**: When User A messages User B for the first time:
   - Alice fetches Bob's Key Bundle (`GET /api/auth/devices/keys/<bob_id>/`).
   - Alice generates Ephemeral Key Pair ($EK_A$, X25519).
   - Alice computes:
     - $DH_1 = \text{ECDH}(IK_A, SPK_B)$
     - $DH_3 = \text{ECDH}(EK_A, SPK_B)$
     - $DH_4 = \text{ECDH}(EK_A, OPK_B)$ (if one-time pre-key available)
   - Alice derives Root Key ($RK$) and Sending Chain Key ($CK_{send}$) via $\text{HKDF}(DH_1 || DH_3 || DH_4)$.

### Double Ratchet Message Steps
- For each outgoing message, `SessionManager.encrypt()` advances $CK_{send}$ using HMAC-SHA256 to generate a unique, one-time Message Key ($MK$).
- Payload is encrypted with AES-256-GCM using a random 12-byte IV.
- $MK$ is zeroized (`wipeMemory()`) immediately after payload encryption.

---

## 4. API Documentation (REST Endpoints)

### Authentication & Devices

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/auth/register/` | Register new user account | No |
| `POST` | `/api/auth/login/` | Authenticate user & issue HttpOnly JWT cookies | No |
| `POST` | `/api/auth/logout/` | Revoke JWT cookie and terminate session | Yes |
| `GET` | `/api/auth/me/` | Fetch current user profile | Yes |
| `POST` | `/api/auth/devices/register/` | Register new device public keys | Yes |

### E2EE Pre-Key Bundles

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/auth/devices/keys/upload/` | Upload signed pre-key & one-time pre-keys | Yes |
| `GET` | `/api/auth/devices/keys/<user_id>/` | Fetch target user's device key bundle | Yes |
| `GET` | `/api/auth/devices/keys/count/` | Query remaining one-time pre-key count | Yes |

### Conversations & Attachments

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/chat/conversations/` | List user's active conversations | Yes |
| `POST` | `/api/chat/conversations/` | Create 1:1 or Group conversation | Yes |
| `GET` | `/api/chat/messages/` | Paginated message history (cursor-based) | Yes |
| `POST` | `/api/chat/upload/start/` | Initiate multi-chunk attachment upload session | Yes |
| `POST` | `/api/chat/upload/<session_id>/chunk/` | Upload 5MB binary attachment chunk | Yes |
| `POST` | `/api/chat/upload/<session_id>/complete/` | Complete assembly & checksum verification | Yes |

---

## 5. WebSocket Real-Time Event Protocols

Connection Endpoint: `wss://<domain>/ws/realtime/`

### Message Envelope Structure
```json
{
  "type": "message.send",
  "id": "uuid-v7",
  "payload": {
    "conversation_id": "uuid-v7",
    "ciphertext": "Base64EncryptedPayload",
    "nonce": "Base64IVNonce",
    "signature": "Ed25519Signature",
    "key_version": 1,
    "algorithm": "AES-256-GCM"
  }
}
```

### Supported Event Types
- `message.new`: Incoming encrypted message payload.
- `message.delivered`: Delivery receipt update.
- `message.read`: Read receipt notification.
- `typing.start` / `typing.stop`: Typing state broadcasts.
- `presence.online` / `presence.away` / `presence.dnd` / `presence.offline`: User status updates.
- `activity.change`: Activity status update (`recording_audio`, `uploading`).

---

## 6. Database Schema & Migration System

### Key Models Overview
- **`CustomUser`**: Email, username, avatar, presence status, timezone.
- **`Device`**: User reference, `public_key_x25519`, `public_key_ed25519`, FCM push token.
- **`SignedPreKey`**: Active signed pre-key for X3DH per device.
- **`OneTimePreKey`**: Ephemeral single-use pre-keys per device.
- **`AuditLog`**: Security operations log (upload, fetch, consume).
- **`Conversation`**: `is_direct` flag, `direct_hash`, optimistic locking `version`.
- **`Message`**: Time-ordered UUIDv7 ID, conversation, sender, `ciphertext`, `nonce`, `sequence_number`.
- **`MediaAttachment`**: S3 object reference key, SHA-256 `file_hash`, chunk count, status.

---

## 7. Environment Variables Reference

| Variable Name | Default Value | Description |
|---|---|---|
| `DEBUG` | `False` | Enable Django debug mode |
| `SECRET_KEY` | *(Required)* | Django secret encryption key |
| `DATABASE_URL` | `postgres://...` | PostgreSQL connection URI |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis cache & channels URI |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `VITE_API_URL` | `http://localhost:8000` | Frontend API base URL |

---

## 8. Docker & Production Deployment Guide

### Launch Production Container Stack
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Healthcheck Probe
```bash
curl -f http://localhost:8000/health/
```

---

## 9. Disaster Recovery & Backup Strategy

### Database Automated Backup (Daily PostgreSQL Dump)
```bash
pg_dump -U postgres -d dualconnect | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Point-In-Time Recovery (PITR)
- PostgreSQL Write-Ahead Logs (WAL) archived to encrypted Object Storage bucket every 5 minutes.
- Recovery target time configured via `recovery.conf`.

---

## 10. Monitoring, Alerting & Observability

- **Application Logs**: Django & Daphne logs formatted as JSON streams to stdout.
- **Prometheus Metrics**: Exposed at `/metrics` for scraper consumption (CPU, memory, HTTP request latencies, active WS connections).
- **Error Tracking**: Integrated with Sentry for frontend & backend exception capture.

---

## 11. Troubleshooting Guide

### Issue: WebSocket Fails to Connect (`1006 Abnormal Closure`)
- **Cause**: Misconfigured CORS origin or missing SSL header behind proxy.
- **Solution**: Verify `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` and check Nginx `Upgrade` headers.

### Issue: Key Bundle Fetch Returns 404
- **Cause**: Target user's device has not uploaded pre-keys yet.
- **Solution**: Device automatically uploads pre-key bundle upon initial registration via `KeyManager.initializeDeviceKeys()`.

---

## 12. Developer Onboarding Guide

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/Dada09898/Quick-chat.git
cd Quick-chat

# Backend Setup
cd backend
python -m venv venv
./venv/Scripts/activate # Windows
pip install -r requirements.txt
python manage.py migrate

# Frontend Setup
cd ../frontend
npm install
```

### Step 2: Launch Development Servers
```bash
# Terminal 1 - Backend
python manage.py runserver 8000

# Terminal 2 - Frontend
npm run dev
```

### Step 3: Run Automated Test Suites
```bash
# Run Frontend Vitest Unit Tests
cd frontend
npx vitest run

# Run Frontend Typecheck
npx tsc --noEmit

# Run Backend Django Unit Tests
cd ../backend
python manage.py test users.tests_keybundle
```
