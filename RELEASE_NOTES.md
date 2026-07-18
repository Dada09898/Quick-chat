# DualConnect v1.0.0-rc1 Release Notes

Welcome to the first official Release Candidate of DualConnect!

DualConnect is a hyper-secure, end-to-end encrypted messaging, collaboration, and vault platform engineered for extreme privacy. The backend is designed with a strict **Zero-Knowledge Architecture**, acting exclusively as a dumb relay for ciphertext payloads.

## Key Features
- **P2P Audio/Video Calls**: WebRTC integration over secure DTLS-SRTP.
- **Zero-Knowledge Vault**: Store passwords, notes, and documents locally encrypted via AES-256-GCM.
- **Lightning Fast Sync**: O(1) virtualized DOM scrolling with background IndexedDB offline caching.
- **Enterprise Ready**: Full Docker Compose orchestration, PostgreSQL connection pooling via pgBouncer, and 16-stage GitHub Actions CI/CD pipelines.

## Breaking Changes from Alpha
- All legacy unencrypted endpoints have been completely deprecated.
- Public Google STUN servers have been stripped in favor of self-hosted Coturn configurations.
- API endpoints are permanently locked under the `/api/v1/` prefix.

## Known Limitations
1. *Search*: Encrypted search currently operates locally in-memory on the client, which may be slow for vaults exceeding 10,000 items on low-memory mobile devices.
2. *iOS PWA WebRTC*: iOS Safari currently throttles background WebRTC connections after 60 seconds if the screen is locked without active media playback.

Please refer to the `docs/` folder for deployment instructions and architectural guidelines.
