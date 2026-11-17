FROM flink:1.18.1-scala_2.12-java11

LABEL maintainer="Smart Grid KSA Streaming Team"
LABEL project="Saudi Smart Grid Digital Twin"
LABEL compliance="NCA ECC-1:2018 / Sovereign Cloud"

# Install Python3 and dependencies for PyFlink
USER root
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      python3-dev \
      build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /opt/flink/usrlib

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

COPY . /opt/flink/usrlib/streaming

# Switch back to flink unprivileged user
USER flink

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["help"]
