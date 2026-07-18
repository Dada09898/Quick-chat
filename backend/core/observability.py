import json
import logging
import time
from typing import Dict, Any, Optional

# Abstraction for OpenTelemetry style observability

class LoggingProvider:
    """Interface for structured JSON logging, preventing vendor lock-in."""
    def __init__(self):
        self.logger = logging.getLogger("dualconnect.structured")
        
    def _sanitize_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Ensures plaintext, ciphertext, or keys are never logged."""
        sanitized = {}
        forbidden_keys = {'ciphertext', 'plaintext', 'password', 'media_key', 'thumbnail_key', 'nonce', 'signature', 'secret'}
        for k, v in metadata.items():
            if k.lower() not in forbidden_keys:
                sanitized[k] = v
            else:
                sanitized[k] = "[REDACTED]"
        return sanitized

    def log(self, level: str, message: str, metadata: Optional[Dict[str, Any]] = None, trace_id: Optional[str] = None):
        meta = self._sanitize_metadata(metadata or {})
        if trace_id:
            meta['trace_id'] = trace_id
            
        payload = json.dumps({
            "level": level.upper(),
            "message": message,
            "metadata": meta,
            "timestamp": time.time()
        })
        
        if level.upper() == 'ERROR':
            self.logger.error(payload)
        elif level.upper() == 'WARN':
            self.logger.warning(payload)
        else:
            self.logger.info(payload)

class MetricsProvider:
    """Interface for Prometheus-compatible metrics or Datadog/CloudWatch."""
    def __init__(self):
        # In memory mock for standard Prometheus export endpoint later
        self.counters = {}
        self.gauges = {}
        self.histograms = {}
        
    def increment_counter(self, name: str, tags: Optional[Dict[str, str]] = None, amount: int = 1):
        # Implementation to aggregate metrics
        pass
        
    def record_gauge(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
        pass
        
    def record_histogram(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
        pass

class TracingProvider:
    """Interface for OpenTelemetry Distributed Tracing."""
    def __init__(self):
        pass
        
    def start_span(self, name: str, trace_id: Optional[str] = None):
        # Returns a mock span object
        class MockSpan:
            def __init__(self, t_id):
                self.trace_id = t_id
            def set_attribute(self, key, value):
                pass
            def end(self):
                pass
            def __enter__(self):
                return self
            def __exit__(self, exc_type, exc_val, exc_tb):
                pass
        return MockSpan(trace_id or "new_trace_id")

# Global instances for DI
logger = LoggingProvider()
metrics = MetricsProvider()
tracer = TracingProvider()
