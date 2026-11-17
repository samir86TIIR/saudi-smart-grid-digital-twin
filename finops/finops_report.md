# FinOps Architecture & Cost Optimization Report
**Project:** Saudi Smart Grid Digital Twin (SEC / NEOM Oxagon / SDAIA)  
**Target Cloud Region:** Google Cloud Platform `me-central2` (Dammam, Kingdom of Saudi Arabia)  
**Scale Target:** 10,000,000 Smart Meters (AMI Fleet)  
**Document Classification:** RESTRICTED / SOVEREIGN CLOUD COMPLIANT  

---

## 1. Executive Summary & Volumetric Baseline

This report evaluates the operational expenditures (OpEx) for operating the **Saudi Smart Grid Digital Twin** ingestion and stream-processing infrastructure on Google Cloud Platform, strictly deployed within the sovereign borders of the Kingdom (`me-central2` - Dammam).

### Fleet Scale & Ingestion Parameters:
- **Total Deployed Smart Meters:** 10,000,000 units.
- **Reporting Frequency:** 1 telemetry packet per meter every 5 minutes (300 seconds).
- **Average Ingestion Velocity:** **33,333 events / second** (steady state), with peak surges of **100,000 events / second** during dust storms and summer heat waves.
- **Payload Footprint:** ~350 bytes raw JSON $\rightarrow$ ~140 bytes with Kafka Snappy/LZ4 compression.
- **Monthly Ingested Raw Volume:** ~30.2 TB raw JSON ($\approx$ 12.1 TB compressed in Kafka log retention).

---

## 2. Monthly Cost Breakdown (Unoptimized Baseline vs. FinOps Optimized)

All pricing is based on Google Cloud Dammam (`me-central2`) sovereign regional rates.

| Architecture Component | Unoptimized Monthly Cost (USD) | FinOps Optimized Monthly Cost (USD) | Savings (%) | Optimization Levers Applied |
| :--- | :--- | :--- | :--- | :--- |
| **GKE Kafka Broker Pool** (Compute) | \$1,240.00 | \$780.00 | **37%** | Right-sized `e2-standard-4`, 1-yr CUD (Committed Use Discount) |
| **GKE Flink Stream Processing** (Compute) | \$2,150.00 | \$1,180.00 | **45%** | Mixed Node Pools: 40% On-Demand + 60% Spot VMs for TaskManagers |
| **Persistent Storage (Kafka & GKE)** | \$1,450.00 | \$580.00 | **60%** | Snappy compression + 72h strict log retention + Balanced PD (`pd-balanced`) |
| **Google Cloud BigQuery** (Ingestion & Storage) | \$2,880.00 | \$1,250.00 | **56%** | **BigQuery Storage Write API** (batch commits) vs. Legacy Streaming Ingest |
| **Cloud KMS (CMEK Sovereignty Keys)** | \$45.00 | \$25.00 | **44%** | Consolidating cryptographic key operations with local cached tokens |
| **Cloud NAT & Inter-Zone Networking** | \$620.00 | \$310.00 | **50%** | Single-zone affinity for high-volume Kafka-to-Flink streaming traffic |
| **TOTAL ESTIMATED MONTHLY OPEX** | **\$8,385.00** | **\$4,125.00** | **~51% Net Savings** | **Annual Savings: \$51,120 USD** |

---

## 3. Core FinOps Architectural Levers

### Lever A: BigQuery Storage Write API vs. Legacy Streaming Ingestion
- **The Pitfall:** Legacy BigQuery Streaming Ingest charges \$0.05 per GB injected. At 30 TB/month, raw streaming inserts would incur **\$1,500/month** solely in injection fees.
- **The Optimization:** Migrated to **BigQuery Storage Write API** with pending/committed stream semantics. Storage Write API offers 2 TB/month free tier and \$0.025 per GB thereafter. Coupled with micro-batch tumbling buffer windows (every 60 seconds), injection fees drop to **\$680/month**.

### Lever B: Smart Meter Window Aggregation Pruning
- Instead of landing 10,000,000 raw device rows per 5 minutes into persistent analytics storage, Apache Flink calculates **1-minute localized zone rollups** (`telemetry_1min_aggregates`) and extracts only true electrical anomalies into `telemetry_anomalies`.
- **Impact:** Analytics queries analyze **0.2%** of the data volume compared to raw sensor scanning, slashing BigQuery on-demand analysis slots by **99%**.

### Lever C: Kafka Broker Log Compaction & Retention Tuning
- Uncompressed raw storage would require over 30 TB of high-performance SSD per week.
- By enforcing `snappy` wire compression and capping Kafka log retention to **72 hours** (sufficient for Flink checkpoint replay recovery), disk requirements shrink to **1.2 TB total**, permitting cost-effective `pd-balanced` disks instead of expensive extreme SSDs.

### Lever D: GKE Spot Instances with Fault-Tolerant Flink Checkpointing
- Flink state is backed up every 10 seconds to persistent GCS storage via incremental checkpointing.
- This decoupling allows the TaskManager pool to run on **GKE Spot Instances** (saving up to 60-70% on compute) with automatic pod rescheduling without data loss.

---

## 4. Sovereignty & Compliance Cost Assessment (NCA ECC & SDAIA)

Hosting sovereign data within `me-central2` (Dammam) eliminates cross-border data transfer fees while fulfilling:
1. **NCA ECC-1:2018 (Essential Cybersecurity Controls)**: Complete data residency, dedicated private networking, CMEK encryption.
2. **SDAIA National Data Management Office (NDMO)**: Full audit logging enabled without incurring foreign egress penalties.
