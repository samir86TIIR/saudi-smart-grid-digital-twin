"""
Main Ingestion & IoT Smart Meter Load Generator CLI
===================================================
Role: data-simulator-ksa
Module: data_simulator.main

Simulates high-velocity telemetry streams for Saudi Vision 2030 smart cities
(Riyadh, Oxagon, The Line) into an Apache Kafka cluster.
"""

import argparse
import logging
import sys
import time
from datetime import datetime

from data_simulator.kapsarc_client import KapsarcClient
from data_simulator.kafka_producer import OptimizedKafkaProducer
from data_simulator.smart_meter_simulator import SmartMeterFleet

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("smart_grid_ksa.main")


def run_generator(
    target_rate: int = 2000,
    duration_sec: int = 30,
    fleet_size: int = 50000,
    anomaly_rate: float = 0.02,
    bootstrap_servers: str = "localhost:9092",
    topic: str = "smartmeter.telemetry",
    dry_run: bool = False,
    fetch_kapsarc: bool = True,
):
    print("=" * 80)
    print("  SAUDI ARABIA SMART GRID DIGITAL TWIN - IOT TELEMETRY SIMULATOR")
    print("  Aligned with Saudi Vision 2030 | NEOM Oxagon & Riyadh Metropolitan Grid")
    print("=" * 80)

    # Step 1: Query KAPSARC Open Data baseline
    if fetch_kapsarc:
        logger.info("Initializing KAPSARC open data client...")
        kapsarc = KapsarcClient()
        profiles = kapsarc.fetch_historical_consumption(limit=10)
        logger.info("Loaded baseline energy curves for %d Saudi grid zones", len(profiles))

    # Step 2: Initialize Smart Meter fleet
    logger.info("Instantiating virtual smart meter fleet: %d meters across KSA zones...", fleet_size)
    fleet = SmartMeterFleet(total_meters=fleet_size, anomaly_rate=anomaly_rate)

    # Step 3: Initialize Kafka Producer
    producer = OptimizedKafkaProducer(
        bootstrap_servers=bootstrap_servers,
        topic=topic,
        dry_run=dry_run,
    )

    batch_size = min(500, max(50, target_rate // 10))
    sleep_between_batches = batch_size / target_rate if target_rate > 0 else 0.01

    logger.info(
        "Starting stream: target_rate=%d msg/s | batch_size=%d | duration=%ds | dry_run=%s",
        target_rate,
        batch_size,
        duration_sec,
        producer.dry_run,
    )

    start_time = time.time()
    last_report_time = start_time

    try:
        while True:
            elapsed = time.time() - start_time
            if duration_sec > 0 and elapsed >= duration_sec:
                break

            batch = fleet.stream_batch(batch_size=batch_size)
            for event in batch:
                producer.publish_event(key=event.grid_zone, payload_json=event.to_json())

            if sleep_between_batches > 0:
                time.sleep(sleep_between_batches)

            # Periodic status log every 3 seconds
            if time.time() - last_report_time >= 3.0:
                stats = producer.get_stats()
                logger.info(
                    "Throughput: %s msg/s | %s MB/s | Total sent: %d msgs (%s MB)",
                    f"{stats['messages_per_second']:.1f}",
                    f"{stats['throughput_mb_per_sec']:.3f}",
                    stats["total_messages"],
                    stats["total_mb"],
                )
                last_report_time = time.time()

    except KeyboardInterrupt:
        logger.info("Generator interrupted by user.")
    finally:
        producer.close()
        final_stats = producer.get_stats()
        print("-" * 80)
        print("  GENERATION COMPLETE")
        print(f"  Total Events Published : {final_stats['total_messages']:,}")
        print(f"  Total Data Transferred : {final_stats['total_mb']} MB")
        print(f"  Average Throughput     : {final_stats['messages_per_second']:.1f} events/sec")
        print(f"  Average Bandwidth      : {final_stats['throughput_mb_per_sec']:.3f} MB/sec")
        print("-" * 80)


def main():
    parser = argparse.ArgumentParser(description="Saudi Smart Grid IoT High-Throughput Load Simulator")
    parser.add_argument("--rate", type=int, default=2000, help="Target events per second (default: 2000)")
    parser.add_argument("--duration", type=int, default=10, help="Duration in seconds, 0 for infinite (default: 10)")
    parser.add_argument("--fleet-size", type=int, default=50000, help="Number of simulated smart meters (default: 50000)")
    parser.add_argument("--anomaly-rate", type=float, default=0.02, help="Probability of anomalous event (default: 0.02)")
    parser.add_argument("--bootstrap-servers", type=str, default="localhost:9092", help="Kafka brokers")
    parser.add_argument("--topic", type=str, default="smartmeter.telemetry", help="Kafka topic name")
    parser.add_argument("--dry-run", action="store_true", help="Run without publishing to a real Kafka broker")
    parser.add_argument("--skip-kapsarc", action="store_true", help="Skip KAPSARC baseline fetching")

    args = parser.parse_args()
    run_generator(
        target_rate=args.rate,
        duration_sec=args.duration,
        fleet_size=args.fleet_size,
        anomaly_rate=args.anomaly_rate,
        bootstrap_servers=args.bootstrap_servers,
        topic=args.topic,
        dry_run=args.dry_run,
        fetch_kapsarc=not args.skip_kapsarc,
    )


if __name__ == "__main__":
    main()
