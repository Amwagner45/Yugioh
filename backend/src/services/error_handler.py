"""
Enhanced error handling service with retry mechanisms and fallback strategies
"""

import asyncio
import logging
from typing import Any, Callable, Optional, Dict, List
from functools import wraps
import httpx
from datetime import datetime, timedelta


class RetryConfig:
    """Configuration for retry behavior"""

    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        retryable_status_codes: List[int] = None,
        retryable_exceptions: List[type] = None,
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.retryable_status_codes = retryable_status_codes or [
            500,
            502,
            503,
            504,
            429,
        ]
        self.retryable_exceptions = retryable_exceptions or [
            httpx.TimeoutException,
            httpx.ConnectTimeout,
            httpx.ReadTimeout,
            httpx.NetworkError,
            ConnectionError,
        ]


class ErrorHandler:
    """Advanced error handling with retry logic and fallback strategies"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.error_counts: Dict[str, int] = {}
        self.last_errors: Dict[str, datetime] = {}

        # Default retry configurations for different operations
        self.retry_configs = {
            "api_request": RetryConfig(max_attempts=3, base_delay=1.0),
            "cache_operation": RetryConfig(max_attempts=2, base_delay=0.5),
            "database_operation": RetryConfig(max_attempts=3, base_delay=2.0),
        }

    def should_retry(self, error: Exception, config: RetryConfig) -> bool:
        """Determine if an error should trigger a retry"""

        # Check if exception type is retryable
        if any(isinstance(error, exc_type) for exc_type in config.retryable_exceptions):
            return True

        # Check HTTP status codes for httpx.HTTPStatusError
        if isinstance(error, httpx.HTTPStatusError):
            return error.response.status_code in config.retryable_status_codes

        return False

    async def calculate_delay(self, attempt: int, config: RetryConfig) -> float:
        """Calculate delay before next retry attempt"""
        import random

        delay = config.base_delay * (config.exponential_base ** (attempt - 1))
        delay = min(delay, config.max_delay)

        # Add jitter to prevent thundering herd
        if config.jitter:
            delay = delay * (0.5 + random.random() * 0.5)

        return delay

    async def retry_with_backoff(
        self,
        func: Callable,
        *args,
        operation_type: str = "api_request",
        custom_config: Optional[RetryConfig] = None,
        **kwargs,
    ) -> Any:
        """
        Execute function with retry logic and exponential backoff
        """
        config = custom_config or self.retry_configs.get(operation_type, RetryConfig())
        last_error = None

        for attempt in range(1, config.max_attempts + 1):
            try:
                result = await func(*args, **kwargs)

                # Reset error count on success
                if operation_type in self.error_counts:
                    self.error_counts[operation_type] = 0

                return result

            except Exception as error:
                last_error = error

                # Log the error
                self.logger.warning(
                    f"Attempt {attempt} failed for {operation_type}: {str(error)}"
                )

                # Track error count
                self.error_counts[operation_type] = (
                    self.error_counts.get(operation_type, 0) + 1
                )
                self.last_errors[operation_type] = datetime.now()

                # Don't retry if not retryable or last attempt
                if (
                    not self.should_retry(error, config)
                    or attempt == config.max_attempts
                ):
                    break

                # Calculate and apply delay
                delay = await self.calculate_delay(attempt, config)
                self.logger.info(f"Retrying {operation_type} in {delay:.2f} seconds...")
                await asyncio.sleep(delay)

        # If we get here, all attempts failed
        self.logger.error(
            f"All {config.max_attempts} attempts failed for {operation_type}"
        )
        raise last_error

    def create_standardized_error(
        self,
        error: Exception,
        operation: str,
        user_message: str = None,
        error_code: str = None,
    ) -> Dict[str, Any]:
        """Create a standardized error response"""

        # Default user-friendly messages
        default_messages = {
            "network": "Unable to connect to the service. Please check your internet connection.",
            "timeout": "The request took too long to complete. Please try again.",
            "rate_limit": "Too many requests. Please wait a moment before trying again.",
            "not_found": "The requested resource was not found.",
            "server_error": "An internal server error occurred. Please try again later.",
            "validation": "The provided data is invalid.",
            "unknown": "An unexpected error occurred. Please try again.",
        }

        # Determine error type and appropriate message
        if isinstance(error, httpx.TimeoutException):
            error_type = "timeout"
        elif isinstance(error, httpx.NetworkError):
            error_type = "network"
        elif isinstance(error, httpx.HTTPStatusError):
            if error.response.status_code == 404:
                error_type = "not_found"
            elif error.response.status_code == 429:
                error_type = "rate_limit"
            elif 500 <= error.response.status_code < 600:
                error_type = "server_error"
            else:
                error_type = "unknown"
        else:
            error_type = "unknown"

        return {
            "error": error_code or error_type,
            "message": user_message or default_messages[error_type],
            "operation": operation,
            "timestamp": datetime.now().isoformat(),
            "details": str(error) if self.logger.level <= logging.DEBUG else None,
            "retryable": self.should_retry(error, RetryConfig()),
        }

    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics for monitoring"""
        return {
            "error_counts": self.error_counts.copy(),
            "last_errors": {
                op: timestamp.isoformat() for op, timestamp in self.last_errors.items()
            },
            "total_errors": sum(self.error_counts.values()),
        }


class FallbackStrategy:
    """Fallback strategies for when primary operations fail"""

    def __init__(self):
        self.fallback_data: Dict[str, Any] = {}
        self.logger = logging.getLogger(__name__)

    async def get_cached_or_default(
        self,
        cache_key: str,
        cache_service,
        default_data: Any = None,
        max_age_hours: int = 24,
    ) -> Optional[Any]:
        """Try to get data from cache, return default if not available"""
        try:
            cached_data = await cache_service.get(cache_key)
            if cached_data is not None:
                return cached_data
        except Exception as e:
            self.logger.warning(f"Cache fallback failed: {e}")

        return default_data

    async def get_popular_cards_fallback(self) -> List[Dict[str, Any]]:
        """Return a hardcoded list of popular cards as fallback"""
        return [
            {
                "id": 89631139,
                "name": "Blue-Eyes White Dragon",
                "type": "Normal Monster",
                "desc": "This legendary dragon is a powerful engine of destruction.",
                "atk": 3000,
                "def": 2500,
                "level": 8,
                "race": "Dragon",
                "attribute": "LIGHT",
            },
            {
                "id": 46986414,
                "name": "Dark Magician",
                "type": "Normal Monster",
                "desc": "The ultimate wizard in terms of attack and defense.",
                "atk": 2500,
                "def": 2100,
                "level": 7,
                "race": "Spellcaster",
                "attribute": "DARK",
            },
            {
                "id": 20721928,
                "name": "Elemental HERO Sparkman",
                "type": "Normal Monster",
                "desc": "A warrior of the light.",
                "atk": 1600,
                "def": 1400,
                "level": 4,
                "race": "Warrior",
                "attribute": "LIGHT",
            },
        ]

    async def get_error_fallback_response(
        self, operation: str, error: Exception, fallback_data: Any = None
    ) -> Dict[str, Any]:
        """Create a fallback response when operations fail"""

        if operation == "card_search" and fallback_data is None:
            fallback_data = await self.get_popular_cards_fallback()

        return {
            "data": fallback_data or [],
            "count": len(fallback_data) if fallback_data else 0,
            "error": f"Primary operation failed: {str(error)}",
            "fallback": True,
            "cached": False,
        }


# Global instances
error_handler = ErrorHandler()
fallback_strategy = FallbackStrategy()


def with_error_handling(operation_type: str = "api_request"):
    """Decorator to add error handling to async functions"""

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await error_handler.retry_with_backoff(
                    func, *args, operation_type=operation_type, **kwargs
                )
            except Exception as e:
                # Create standardized error response
                error_response = error_handler.create_standardized_error(
                    e, operation_type
                )

                # For API endpoints, raise HTTPException
                from fastapi import HTTPException

                raise HTTPException(status_code=500, detail=error_response)

        return wrapper

    return decorator


async def safe_api_call(
    func: Callable,
    *args,
    operation_type: str = "api_request",
    fallback_data: Any = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Safely execute an API call with comprehensive error handling
    """
    try:
        return await error_handler.retry_with_backoff(
            func, *args, operation_type=operation_type, **kwargs
        )
    except Exception as e:
        error_handler.logger.error(f"API call failed after retries: {e}")

        # Return fallback response
        return await fallback_strategy.get_error_fallback_response(
            operation_type, e, fallback_data
        )
