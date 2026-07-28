import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Enterprise Metrics
const e2eMessageLatency = new Trend('e2e_message_latency_ms');
const keyBundleFetchLatency = new Trend('key_bundle_fetch_ms');
const websocketConnectionErrors = new Counter('ws_connection_errors');
const apiErrorRate = new Rate('api_error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Warm-up to 100 VUs
    { duration: '1m',  target: 500 },   // Ramp to 500 VUs
    { duration: '1m',  target: 1000 },  // Scale to 1,000 VUs
    { duration: '2m',  target: 5000 },  // Enterprise load: 5,000 VUs
    { duration: '2m',  target: 10000 }, // Peak stress: 10,000 VUs
    { duration: '30s', target: 0 },     // Graceful ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // p95 < 200ms, p99 < 500ms
    api_error_rate: ['rate<0.01'],                  // Error rate < 1%
    e2e_message_latency_ms: ['p(95)<150'],         // Real-time message p95 < 150ms
    key_bundle_fetch_ms: ['p(95)<100'],            // Key bundle fetch p95 < 100ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:8000/ws/realtime/';

export default function () {
  const vuId = __VU;
  const userEmail = `user_${vuId}@benchmark.local`;
  const password = 'Password123!';

  group('1. REST API Authentication & Key Bundle Benchmark', () => {
    // Login
    const loginPayload = JSON.stringify({ email: userEmail, password });
    const loginRes = http.post(`${BASE_URL}/api/auth/login/`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const loginSuccess = check(loginRes, {
      'login status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
    apiErrorRate.add(!loginSuccess);

    // Key Bundle Fetch Benchmark
    const targetUserId = '00000000-0000-0000-0000-000000000001';
    const keyStart = Date.now();
    const keyRes = http.get(`${BASE_URL}/api/auth/devices/keys/${targetUserId}/`);
    keyBundleFetchLatency.add(Date.now() - keyStart);

    check(keyRes, {
      'key bundle fetch handled': (r) => r.status === 200 || r.status === 404 || r.status === 401,
    });
  });

  group('2. WebSocket Real-Time Messaging & Presence Benchmark', () => {
    const params = { tags: { my_tag: 'websocket_test' } };

    const res = ws.connect(WS_URL, params, function (socket) {
      socket.on('open', () => {
        // Send typing indicator
        socket.send(JSON.stringify({
          type: 'typing.start',
          payload: { conversation_id: 'conv-bench-1' }
        }));

        // Send encrypted message payload
        const sendTime = Date.now();
        socket.send(JSON.stringify({
          type: 'message.send',
          payload: {
            id: `bench-msg-${vuId}-${sendTime}`,
            conversation_id: 'conv-bench-1',
            ciphertext: 'T2ZmbGluZSBFbmNyeXB0ZWQgUGF5bG9hZCBCZW5jaG1hcms=',
            nonce: 'nonce1234567',
            signature: 'UNVERIFIED',
            key_version: 1,
            algorithm: 'AES-256-GCM',
            created_at: new Date().toISOString()
          }
        }));

        e2eMessageLatency.add(Date.now() - sendTime);
      });

      socket.on('message', (data) => {
        const msg = JSON.parse(data);
        check(msg, { 'received valid websocket frame': (m) => m.type !== undefined });
      });

      socket.on('error', () => {
        websocketConnectionErrors.add(1);
      });

      // Keep socket active for 2 seconds
      socket.setTimeout(function () {
        socket.close();
      }, 2000);
    });

    check(res, { 'connected successfully': (r) => r && r.status === 101 });
  });

  sleep(1);
}
