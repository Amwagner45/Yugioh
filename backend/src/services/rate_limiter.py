"""
Rate limiting service to prevent API abuse and respect YGOPRODeck API limits
"""
import asyncio
import time
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
import hashlib


class RateLimiter:
    """
    Token bucket rate limiter with exponential backoff
    """
    
    def __init__(
        self,
        requests_per_minute: int = 60,
        burst_limit: int = 10,
        backoff_factor: float = 2.0,
        max_backoff: float = 300.0  # 5 minutes max
    ):
        self.requests_per_minute = requests_per_minute
        self.burst_limit = burst_limit
        self.backoff_factor = backoff_factor
        self.max_backoff = max_backoff
        
        # Track requests per client/endpoint
        self.request_history: Dict[str, deque] = defaultdict(lambda: deque())
        self.failure_counts: Dict[str, int] = defaultdict(int)
        self.backoff_until: Dict[str, datetime] = {}
        
        # Global API request queue for YGOPRODeck
        self.global_request_times: deque = deque()
        self.global_failure_count = 0
        self.global_backoff_until: Optional[datetime] = None
        
    def _get_client_key(self, client_ip: str, endpoint: str) -> str:
        """Generate a key for rate limiting by client and endpoint"""
        return f"{client_ip}:{endpoint}"
    
    def _clean_old_requests(self, request_times: deque, window_seconds: int = 60):
        """Remove requests older than the time window"""
        cutoff = time.time() - window_seconds
        while request_times and request_times[0] < cutoff:
            request_times.popleft()
    
    async def check_rate_limit(
        self, 
        client_ip: str, 
        endpoint: str,
        is_external_api: bool = True
    ) -> tuple[bool, Optional[float]]:
        """
        Check if request is allowed under rate limits
        Returns: (is_allowed, retry_after_seconds)
        """
        client_key = self._get_client_key(client_ip, endpoint)
        now = time.time()
        current_time = datetime.now()
        
        # Check global backoff (for external API failures)
        if is_external_api and self.global_backoff_until:
            if current_time < self.global_backoff_until:
                retry_after = (self.global_backoff_until - current_time).total_seconds()
                return False, retry_after
            else:
                # Backoff period expired, reset
                self.global_backoff_until = None
                self.global_failure_count = 0
        
        # Check client-specific backoff
        if client_key in self.backoff_until:
            if current_time < self.backoff_until[client_key]:
                retry_after = (self.backoff_until[client_key] - current_time).total_seconds()
                return False, retry_after
            else:
                # Backoff period expired, reset
                del self.backoff_until[client_key]
                self.failure_counts[client_key] = 0
        
        # Clean old requests
        client_requests = self.request_history[client_key]
        self._clean_old_requests(client_requests)
        
        if is_external_api:
            self._clean_old_requests(self.global_request_times)
        
        # Check burst limit
        if len(client_requests) >= self.burst_limit:
            return False, 60.0  # Retry after 1 minute
        
        # Check requests per minute limit
        if len(client_requests) >= self.requests_per_minute:
            # Calculate time until oldest request expires
            oldest_request = client_requests[0]
            retry_after = 60.0 - (now - oldest_request)
            return False, max(retry_after, 1.0)
        
        # Check global rate limit for external API
        if is_external_api:
            # YGOPRODeck API allows about 20 requests per minute
            global_limit = 20
            if len(self.global_request_times) >= global_limit:
                oldest_global = self.global_request_times[0]
                retry_after = 60.0 - (now - oldest_global)
                return False, max(retry_after, 1.0)
        
        return True, None
    
    async def record_request(
        self, 
        client_ip: str, 
        endpoint: str,
        is_external_api: bool = True
    ):
        """Record a successful request"""
        client_key = self._get_client_key(client_ip, endpoint)
        now = time.time()
        
        self.request_history[client_key].append(now)
        
        if is_external_api:
            self.global_request_times.append(now)
    
    async def record_failure(
        self, 
        client_ip: str, 
        endpoint: str,
        is_external_api: bool = True
    ):
        """Record a failed request and apply exponential backoff"""
        client_key = self._get_client_key(client_ip, endpoint)
        
        # Increment failure count
        self.failure_counts[client_key] += 1
        
        if is_external_api:
            self.global_failure_count += 1
        
        # Calculate backoff time
        failure_count = self.failure_counts[client_key]
        backoff_seconds = min(
            self.backoff_factor ** failure_count,
            self.max_backoff
        )
        
        # Set backoff period
        self.backoff_until[client_key] = datetime.now() + timedelta(seconds=backoff_seconds)
        
        # Global backoff for external API failures
        if is_external_api and self.global_failure_count >= 3:
            global_backoff_seconds = min(
                self.backoff_factor ** self.global_failure_count,
                self.max_backoff
            )
            self.global_backoff_until = datetime.now() + timedelta(seconds=global_backoff_seconds)
    
    def get_stats(self) -> Dict:
        """Get rate limiting statistics"""
        current_time = datetime.now()
        
        # Count active rate limits
        active_backoffs = sum(
            1 for backoff_time in self.backoff_until.values()
            if backoff_time > current_time
        )
        
        # Count recent requests (last minute)
        recent_requests = 0
        cutoff = time.time() - 60
        for requests in self.request_history.values():
            recent_requests += sum(1 for req_time in requests if req_time > cutoff)
        
        return {
            "requests_per_minute_limit": self.requests_per_minute,
            "burst_limit": self.burst_limit,
            "active_clients": len(self.request_history),
            "active_backoffs": active_backoffs,
            "recent_requests_last_minute": recent_requests,
            "global_requests_last_minute": sum(
                1 for req_time in self.global_request_times 
                if req_time > cutoff
            ),
            "global_failure_count": self.global_failure_count,
            "global_backoff_active": self.global_backoff_until is not None,
            "global_backoff_until": self.global_backoff_until.isoformat() if self.global_backoff_until else None
        }


class RequestQueue:
    """
    Queue for managing API requests to prevent overwhelming the external API
    """
    
    def __init__(self, max_concurrent: int = 5, request_delay: float = 0.5):
        self.max_concurrent = max_concurrent
        self.request_delay = request_delay
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.last_request_time = 0
    
    async def execute_request(self, request_func, *args, **kwargs):
        """
        Execute a request with concurrency and delay controls
        """
        async with self.semaphore:
            # Ensure minimum delay between requests
            now = time.time()
            time_since_last = now - self.last_request_time
            if time_since_last < self.request_delay:
                await asyncio.sleep(self.request_delay - time_since_last)
            
            try:
                result = await request_func(*args, **kwargs)
                self.last_request_time = time.time()
                return result
            except Exception as e:
                self.last_request_time = time.time()
                raise e


# Global instances
rate_limiter = RateLimiter()
request_queue = RequestQueue()


def get_client_ip(request) -> str:
    """Extract client IP from request"""
    # Check for forwarded IP first (in case of proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    # Check for real IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fall back to client host
    return request.client.host if request.client else "unknown"


async def apply_rate_limit(request, endpoint: str, is_external_api: bool = True):
    """
    Decorator/middleware function to apply rate limiting
    """
    client_ip = get_client_ip(request)
    
    is_allowed, retry_after = await rate_limiter.check_rate_limit(
        client_ip, endpoint, is_external_api
    )
    
    if not is_allowed:
        from fastapi import HTTPException
        
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "retry_after": retry_after,
                "message": f"Please wait {retry_after:.1f} seconds before retrying"
            },
            headers={"Retry-After": str(int(retry_after))}
        )
    
    return client_ip


async def record_request_success(client_ip: str, endpoint: str, is_external_api: bool = True):
    """Record a successful request"""
    await rate_limiter.record_request(client_ip, endpoint, is_external_api)


async def record_request_failure(client_ip: str, endpoint: str, is_external_api: bool = True):
    """Record a failed request"""
    await rate_limiter.record_failure(client_ip, endpoint, is_external_api)
