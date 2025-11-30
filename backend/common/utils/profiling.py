"""
Conditional profiling utilities.

Provides a no-op silk_profile context manager when:
- DEBUG=False (production)
- Silk is not installed

This allows profiling code to remain in the codebase without
performance overhead or import errors in production.
"""

from contextlib import contextmanager

from django.conf import settings

try:
    if settings.DEBUG:
        # Development: Use real Silk profiling
        from silk.profiling.profiler import silk_profile
    else:
        # Production: Use no-op (zero overhead)
        @contextmanager
        def silk_profile(name=""):
            """No-op context manager for production."""
            yield
except ImportError:
    # Silk not installed: Use no-op
    @contextmanager
    def silk_profile(name=""):
        """No-op context manager when Silk is not installed."""
        yield


__all__ = ["silk_profile"]
