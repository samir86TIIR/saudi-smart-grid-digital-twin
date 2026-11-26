# Build stage
FROM python:3.12-slim-bookworm AS builder

WORKDIR /app
COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends gcc libsnappy-dev && \
    pip install --no-cache-dir --user -r requirements.txt

# Final minimal production image
FROM python:3.12-slim-bookworm

LABEL maintainer="Smart Grid KSA Team"
LABEL project="Saudi Smart Grid Digital Twin"
LABEL compliance="NCA ECC-1:2018 / SDAIA Sovereign Cloud Standards"

WORKDIR /app

# DevSecOps: Create a dedicated non-root user and install runtime libs
RUN apt-get update && apt-get install -y --no-install-recommends libsnappy1v5 && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/false -m appuser

COPY --from=builder --chown=10001:10001 /root/.local /home/appuser/.local
COPY --chown=10001:10001 . /app/data_simulator

ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER 10001:10001

ENTRYPOINT ["python", "-m", "data_simulator.main"]
CMD ["--rate", "5000", "--duration", "0", "--dry-run"]
