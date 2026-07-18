// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
// Note: This needs to be configured dynamically or injected during build
firebase.initializeApp({
  messagingSenderId: 'YOUR-SENDER-ID',
  projectId: 'dualconnect-fcm'
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // E2EE dictates that push payloads should ideally just be "New Message" Wake-ups
  // and not contain plaintext body.
  const notificationTitle = payload.notification?.title || 'DualConnect';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new encrypted message.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
