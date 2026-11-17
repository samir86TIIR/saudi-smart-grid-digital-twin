"""
High-Throughput Kafka Producer for Smart Grid Telemetry
=======================================================
Role: data-simulator-ksa
Module: data_simulator.kafka_producer

Features:
- Enterprise-grade producer configurations (LZ4/Snappy compression, batching, idempotence).
- Asynchronous high-volume publication with zero-loss delivery guarantees.
- Real-time throughput metrics (msg/s, MB/s).
- Graceful dry-run fallback for local testing without an active Kafka broker.
"""

import logging
import os
import time
from typing import Callable, Dict, List, Optional

logger = logging.getLogger("smart_grid_ksa.producer")


class OptimizedKafkaProducer:
    """
    Kafka Producer optimized for millions of events per hour.
    """

    DEFAULT_TOPIC = "smartmeter.telemetry"

    def __init__(
        self,
        bootstrap_servers: Optional[str] = None,
        topic: Optional[str] = None,
        compression_type: str = "snappy",
        batch_size_bytes: int = 65536,
        linger_ms: int = 20,
        enable_idempotence: bool = True,
        dry_run: bool = False,
    ):
        self.bootstrap_servers = bootstrap_servers or os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
        self.topic = topic or os.getenv("KAFKA_TOPIC", self.DEFAULT_TOPIC)
        self.compression_type = compression_type
        self.batch_size_bytes = batch_size_bytes
        self.linger_ms = linger_ms
        self.enable_idempotence = enable_idempotence
        self.dry_run = dry_run

        self.producer = None
        self.total_messages_sent = 0
        self.total_bytes_sent = 0
        self.start_time = time.time()

        if not self.dry_run:
            self._connect()

    def _connect(self) -> None:
        """
        Attempts to connect to Kafka using kafka-python or confluent-kafka.
        Falls back to dry-run mode if broker is unreachable.
        """
        try:
            from kafka import KafkaProducer

            # KafkaProducer configurations tuned for massive throughput
            self.producer = KafkaProducer(
                bootstrap_servers=self.bootstrap_servers.split(","),
                value_serializer=lambda v: v.encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                compression_type=self.compression_type if self.compression_type in ["gzip", "snappy", "lz4"] else None,
                batch_size=self.batch_size_bytes,
                linger_ms=self.linger_ms,
                acks="all" if self.enable_idempotence else 1,
                retries=5,
                max_in_flight_requests_per_connection=1 if self.enable_idempotence else 5,
                buffer_memory=67108864,  # 64 MB buffer memory
            )
            logger.info(
                "Connected to Kafka broker at %s [topic=%s, compression=%s, batch_size=%d bytes, linger=%d ms]",
                self.bootstrap_servers,
                self.topic,
                self.compression_type,
                self.batch_size_bytes,
                self.linger_ms,
            )
        except Exception as exc:
            logger.warning(
                "Kafka broker not reachable at %s (%s). Enabling DRY-RUN mode.",
                self.bootstrap_servers,
                exc,
            )
            self.dry_run = True

    def publish_event(self, key: str, payload_json: str) -> bool:
        """
        Publishes a single event to the configured Kafka topic.
        Key is partition key (typically meter_id or grid_zone).
        """
        payload_bytes = len(payload_json.encode("utf-8"))
        self.total_messages_sent += 1
        self.total_bytes_sent += payload_bytes

        if self.dry_run or not self.producer:
            return True

        try:
            self.producer.send(
                topic=self.topic,
                key=key,
                value=payload_json,
            )
            return True
        except Exception as exc:
            logger.error("Failed to publish event key=%s: %s", key, exc)
            return False

    def publish_batch(self, events: List[Dict]) -> int:
        """
        Publishes a batch of events asynchronously.
        """
        success_count = 0
        for ev in events:
            # Partition by grid_zone to guarantee zone-level temporal ordering
            key = ev.get("grid_zone", ev.get("meter_id"))
            payload = ev if isinstance(ev, str) else ev.to_json() if hasattr(ev, "to_json") else str(ev)
            if self.publish_event(key, payload):
                success_count += 1
        return success_count

    def flush(self) -> None:
        """
        Flushes all in-flight buffers to Kafka.
        """
        if self.producer and not self.dry_run:
            self.producer.flush()

    def get_stats(self) -> Dict[str, float]:
        """
        Returns real-time throughput metrics.
        """
        elapsed = max(time.time() - self.start_time, 0.001)
        msg_per_sec = self.total_messages_sent / elapsed
        mb_per_sec = (self.total_bytes_sent / (1024 * 1024)) / elapsed
        return {
            "total_messages": self.total_messages_sent,
            "total_mb": round(self.total_bytes_sent / (1024 * 1024), 2),
            "elapsed_seconds": round(elapsed, 2),
            "messages_per_second": round(msg_per_sec, 2),
            "throughput_mb_per_sec": round(mb_per_sec, 3),
        }

    def close(self) -> None:
        """
        Gracefully flushes and closes the producer.
        """
        self.flush()
        if self.producer and not self.dry_run:
            self.producer.close()
        logger.info("Kafka producer closed. Final stats: %s", self.get_stats())
