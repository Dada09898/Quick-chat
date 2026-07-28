from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from users.models import CustomUser, Device
from users.models_prekey import SignedPreKey, OneTimePreKey, AuditLog


class KeyBundleAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_a = CustomUser.objects.create_user(
            email='alice@example.com',
            password='Password123!',
            username='alice'
        )
        self.user_b = CustomUser.objects.create_user(
            email='bob@example.com',
            password='Password123!',
            username='bob'
        )
        
        self.device_a = Device.objects.create(
            user=self.user_a,
            device_name="Alice's iPhone",
            public_key_x25519="YWxpY2UteDI1NTE5",
            public_key_ed25519="YWxpY2UtZWQyNTUxOQ=="
        )
        
        self.device_b = Device.objects.create(
            user=self.user_b,
            device_name="Bob's Mac",
            public_key_x25519="Ym9iLXgyNTUxOQ==",
            public_key_ed25519="Ym9iLWVkMjU1MTk="
        )
        
        # Bob uploads a signed pre-key and one-time pre-keys
        self.spk_b = SignedPreKey.objects.create(
            device=self.device_b,
            public_key="Ym9iLXNwa2J1bmRsZQ==",
            signature="Ym9iLXNpZ25hdHVyZQ==",
            key_id=1,
            is_active=True
        )
        self.opk_b = OneTimePreKey.objects.create(
            device=self.device_b,
            public_key="Ym9iLW9wa2J1bmRsZQ==",
            key_id=1,
            is_consumed=False
        )

    def test_unauthenticated_request_rejected(self):
        url = f'/api/auth/devices/keys/{self.user_b.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_key_bundle_fetch_consumes_one_time_prekey(self):
        self.client.force_authenticate(user=self.user_a)
        url = f'/api/auth/devices/keys/{self.user_b.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        bundles = response.data.get('bundles', [])
        self.assertEqual(len(bundles), 1)
        self.assertEqual(bundles[0]['signed_pre_key_id'], 1)
        self.assertEqual(bundles[0]['one_time_pre_key'], "Ym9iLW9wa2J1bmRsZQ==")
        
        # Verify OPK is marked consumed
        self.opk_b.refresh_from_db()
        self.assertTrue(self.opk_b.is_consumed)
        self.assertEqual(self.opk_b.consumed_by, self.user_a)

    def test_key_bundle_upload(self):
        self.client.force_authenticate(user=self.user_a)
        url = '/api/auth/devices/keys/upload/'
        payload = {
            'device_id': str(self.device_a.id),
            'signed_pre_key': {
                'public_key': 'bmV3LXNwa2J1bmRsZQ==',
                'signature': 'bmV3LXNpZ25hdHVyZQ==',
                'key_id': 2
            },
            'one_time_pre_keys': [
                {'public_key': 'bmV3LW9wazE=', 'key_id': 100},
                {'public_key': 'bmV3LW9wazI=', 'key_id': 101}
            ]
        }
        response = self.client.post(url, data=payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get('remaining_one_time_pre_keys'), 2)
        
        # Check audit log
        self.assertTrue(AuditLog.objects.filter(user=self.user_a, action='key_bundle_upload').exists())
