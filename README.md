# 🚀 Quick-chat (DualConnect) — E2E Encrypted Real-Time Platform

[![Stack: React 18](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20TypeScript-61DAFB?logo=react)](https://react.dev/)
[![Backend: Django](https://img.shields.io/badge/Backend-Django%205%20%7C%20REST%20%7C%20Channels-092E20?logo=django)](https://www.djangoproject.com/)
[![E2EE Security](https://img.shields.io/badge/Security-Signal%20Protocol%20%7C%20X3DH-green?logo=signal)](https://signal.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Quick-chat (DualConnect)** is a modern, enterprise-grade, zero-trust communications platform designed for ultra-secure real-time messaging, status updates, voice/video calling, and media sharing. Built with a Signal-inspired E2EE engine, responsive Glassmorphism design, and an offline-first PWA architecture.

---

## 🌟 Key Features

### 🛡️ End-to-End Encryption (E2EE) & Security
- **Signal-Inspired X3DH & Double Ratchet**: Secure key exchange utilizing Ed25519 identity keys, X25519 pre-keys (Signed & One-Time Pre-Keys), and AES-256-GCM message encryption.
- **Privacy & @Username Discovery**: Find contacts safely via unique `@username` handles or QR codes without exposing raw email addresses.
- **Strict Media Integrity & EXIF Stripping**: Client-side EXIF metadata removal prior to chunked encrypted media uploads.
- **HttpOnly Cookies & 2FA / TOTP**: Secure session management with JWT in HttpOnly cookies and optional Time-based One-Time Passwords (TOTP).

---

### 💬 Real-Time Messaging & Collaboration
- **Instant Messaging**: High-performance WebSocket messaging powered by Django Channels.
- **Status & Story Updates**: 24-hour expiring status updates supporting **Text**, **Photo**, **Video**, and **Audio** with contacts-only privacy, emoji reactions, and direct encrypted chat replies.
- **P2P Voice & Video Calls**: Low-latency WebRTC audio and video calls with real-time signaling.
- **Rich Media & Attachments**: Chunked media upload pipeline with progress tracking for photos, videos, audio notes, documents, location pins, and interactive polls.
- **Groups & Communities**: Multi-user group chats with admin roles, member management, and customizable chat themes.

---

### 📲 Offline-First & PWA
- **Progressive Web App (PWA)**: Installable on Desktop, iOS, and Android with Workbox service worker support.
- **IndexedDB Caching**: Local message storage (`idb`), offline draft auto-save, and queued message outbox with automatic background retry upon reconnection.
- **Reconnection Banner**: Real-time connection state indicators in the UI (`Connecting...` / `Reconnecting...`).

---

### 🤖 AI Integration & Tools
- **AI Chat Assistant**: Integrated AI panel supporting custom system prompts, memory, and model selections.
- **Search & Vault**: Fast message search, starred messages, disappearing messages timers, and encrypted vault storage.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Core** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand 5 |
| **PWA & Offline** | Workbox PWA, IndexedDB (`idb`), HTML5 Web Audio & Media APIs |
| **Cryptography** | Web Crypto API (Ed25519, X25519, HKDF, AES-256-GCM) |
| **Backend Core** | Python 3.12, Django 5, Django REST Framework, Django Channels |
| **Database & Realtime** | PostgreSQL (Production) / SQLite (Local Dev), Redis / Channel Layer, SimpleJWT |
| **Storage & Serving** | Chunked Local/Cloud Storage Provider, WhiteNoise & Django Media Serving |

---

## 🚀 Quick Start & Development Setup

### 1. Prerequisites
- **Node.js**: v18+ and `npm`
- **Python**: v3.11+
- **Git**

---

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create & activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start backend server
python manage.py runserver 0.0.0.0:8000
```

---

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🧪 Testing & Code Verification

### Backend Unit Tests
```bash
cd backend
$env:DATABASE_URL="sqlite:///db.sqlite3"
python -m pytest
```

### Frontend Typecheck & Build
```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
