# backend/app/core/rate_limiter.py
"""
Redis-backed Rate Limiter for Authentication & Privileged Endpoints.
Uses Redis key expiration with in-memory sliding window fallback if Redis is unavailable.
"""
import time
import logging
from typing import Dict, Tuple, List
from fastapi import Request, HTTPException, status
from app.services.redis_client import redis_client

logger = logging.getLogger(__name__)

# In-memory fallback tracking: {key: [timestamp1, timestamp2, ...]}
_in_memory_cache: Dict[str, List[float]] = {}

class RateLimiter:
    def __init__(self, times: int = 10, seconds: int = 60, key_prefix: str = "ratelimit"):
        self.times = times
        self.seconds = seconds
        self.key_prefix = key_prefix

    async def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "127.0.0.1"
        route_path = request.url.path
        key = f"{self.key_prefix}:{route_path}:{client_ip}"

        # 1. Try Redis-backed rate limiting
        if redis_client is not None:
            try:
                current_count = redis_client.incr(key)
                if current_count == 1:
                    redis_client.expire(key, self.seconds)
                
                if current_count > self.times:
                    ttl = redis_client.ttl(key)
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded. Maximum {self.times} requests per {self.seconds}s. Retry in {ttl}s.",
                        headers={"Retry-After": str(max(1, ttl))}
                    )
                return True
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"[RateLimiter] Redis failed, using in-memory fallback: {e}")

        # 2. In-memory sliding window fallback
        now = time.time()
        window_start = now - self.seconds

        if key not in _in_memory_cache:
            _in_memory_cache[key] = []

        # Filter out timestamps older than sliding window
        _in_memory_cache[key] = [ts for ts in _in_memory_cache[key] if ts > window_start]

        if len(_in_memory_cache[key]) >= self.times:
            retry_after = int(self.seconds - (now - _in_memory_cache[key][0]))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {self.times} requests per {self.seconds}s. Retry in {retry_after}s.",
                headers={"Retry-After": str(max(1, retry_after))}
            )

        _in_memory_cache[key].append(now)
        return True
