import redis

class RateLimiter:
    """Redis-backed token bucket rate limiter for granular abuse prevention."""
    def __init__(self):
        # Reuse existing channel layer redis connection parameters
        redis_url = 'redis://localhost:6379/2' # Dedicated DB for rate limiting
        self.client = redis.from_url(redis_url)
        
    def is_allowed(self, action: str, identifier: str, limit: int, window: int) -> bool:
        """
        Check if an action is allowed based on the token bucket policy.
        action: e.g., 'login', 'websocket', 'upload'
        identifier: e.g., IP address hash or user ID
        limit: max tokens
        window: time window in seconds
        """
        key = f"ratelimit:{action}:{identifier}"
        
        try:
            current = self.client.get(key)
            if current is not None and int(current) >= limit:
                return False
                
            pipe = self.client.pipeline()
            pipe.incr(key)
            if current is None:
                pipe.expire(key, window)
            pipe.execute()
            return True
        except redis.RedisError:
            # Fail open if Redis is down (to preserve availability, or fail closed for strict security)
            return True 
            
# Granular Policies
# Login: 5 attempts per 5 minutes
# WebSocket: 10 connections per minute
# Upload: 50 chunks per minute
# Search: 30 queries per minute
# API: 1000 requests per minute
