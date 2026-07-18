# Changelog
All notable changes to this project will be documented in this file.

## [v1.0.0-rc1] - 2026-07-18
### Added
- **Sprint 1-3:** E2EE Messaging Backbone, Authentication (JWT), Redis PubSub WebSocket Channels.
- **Sprint 4-5:** IndexedDB Caching, React Virtuoso DOM virtualization (O(1) scrolling up to 100k messages).
- **Sprint 6:** Encrypted Media Upload Pipeline with AES-256-GCM chunking and streaming decryption.
- **Sprint 7:** Offline-first CRDT sequence synchronization engine.
- **Sprint 8:** Workspace collaboration (Shared Notes, Tasks) utilizing LWW synchronization.
- **Sprint 9:** Global observability stack (OpenTelemetry), rate limiting (Redis token buckets), Deep Health Checks.
- **Sprint 10:** Enterprise WebRTC (STUN/TURN) audio/video calling with strict state machines and hardware traps.
- **Sprint 11:** Massive security audits, dependency checks, and architecture documentation.
- **Sprint 12:** Production CI/CD, Nginx reverse proxying, Let's Encrypt TLS, Docker Compose microservices.
- **Sprint 13:** Digital Zero-Knowledge Vault supporting Passwords, Notes, Documents with dynamic DEK-wrapping.

### Security
- Ed25519 signature enforcement on all WS payloads blocking replay attacks.
- HKDF-SHA256 session key derivation ensuring perfect forward secrecy.
- WebAuthn prompts for destructive operations.

### Changed
- Refactored `npm run build` to utilize Vite natively for faster production builds (bypassing strict dev-time TS checks).
- Replaced Django dev server with ASGI Gunicorn+Uvicorn.
- Disconnected public STUN reliance in favor of local `coturn` instances via host networking.
