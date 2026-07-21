from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from users.models import CustomUser

@database_sync_to_async
def get_user_from_token(token_key):
    try:
        # Verify the token
        access_token = AccessToken(token_key)
        user_id = access_token['user_id']
        
        user = CustomUser.objects.get(id=user_id)
        return user
    except Exception:
        return AnonymousUser()

from http.cookies import SimpleCookie  # noqa: E402

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        cookies = scope.get('cookies', {})
        if not cookies:
            # Parse from headers
            for name, value in scope.get('headers', []):
                if name == b'cookie':
                    cookie = SimpleCookie()
                    cookie.load(value.decode('utf-8'))
                    for k, v in cookie.items():
                        cookies[k] = v.value
                        
        auth_cookie_name = settings.SIMPLE_JWT['AUTH_COOKIE']
        
        token_key = cookies.get(auth_cookie_name)
        
        if token_key:
            scope['user'] = await get_user_from_token(token_key)
        else:
            scope['user'] = AnonymousUser()
            
        return await super().__call__(scope, receive, send)

