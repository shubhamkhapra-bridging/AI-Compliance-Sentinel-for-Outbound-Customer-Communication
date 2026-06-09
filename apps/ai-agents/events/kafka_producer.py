"""Kafka event publisher — opt-in via KAFKA_ENABLED=true.

When disabled (default), events are logged locally and the call is a no-op.
This keeps local development simple without requiring a Kafka cluster.
"""
import dataclasses
import json
from core.config import settings
from core.logger import logger


async def publish_event(event: object) -> None:
    payload = dataclasses.asdict(event) if dataclasses.is_dataclass(event) else vars(event)

    if not settings.KAFKA_ENABLED:
        # NB: "event" is structlog's reserved positional field — use a different key.
        logger.debug("kafka_event_skipped_not_enabled", event_payload=payload)
        return

    try:
        from aiokafka import AIOKafkaProducer  # optional dep

        topic = f"{settings.KAFKA_TOPIC_PREFIX}.{payload.get('event_type', 'unknown')}"
        producer = AIOKafkaProducer(bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS)
        await producer.start()
        try:
            await producer.send_and_wait(topic, json.dumps(payload).encode())
        finally:
            await producer.stop()

        logger.info("kafka_event_published", topic=topic)

    except Exception as exc:
        logger.error("kafka_publish_failed", error=str(exc), event_payload=payload)
