# StreamLine backend image — builds both the indexer (web) and the keeper
# (worker) binaries, and bundles the Sui CLI the keeper shells out to.
#
# Build context must be the `backend/` directory (set Railway root dir = backend).
# One image, two services: override the start command per Railway service:
#   indexer -> streamline-indexer   (default CMD)
#   keeper  -> /app/keeper-entrypoint.sh

# ---- builder ---------------------------------------------------------------
FROM rust:slim-bookworm AS builder
WORKDIR /build

# rustls is used everywhere (no OpenSSL), so we only need certs + a C toolchain
# for any sys crates.
RUN apt-get update \
    && apt-get install -y --no-install-recommends pkg-config ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY . .
RUN cargo build --release --bin streamline-indexer --bin streamline-keeper

# ---- runtime ---------------------------------------------------------------
FROM debian:bookworm-slim AS runtime
WORKDIR /app

# Pin the Sui CLI release used by the keeper. Override at build time with
# --build-arg SUI_VERSION=testnet-vX.Y.Z to match your network.
ARG SUI_VERSION=testnet-v1.73.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && curl -fsSL -o /tmp/sui.tgz \
       "https://github.com/MystenLabs/sui/releases/download/${SUI_VERSION}/sui-${SUI_VERSION}-ubuntu-x86_64.tgz" \
    && tar -xzf /tmp/sui.tgz -C /usr/local/bin ./sui \
    && rm /tmp/sui.tgz \
    && chmod +x /usr/local/bin/sui \
    && sui --version \
    && apt-get purge -y curl && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/streamline-indexer /usr/local/bin/streamline-indexer
COPY --from=builder /build/target/release/streamline-keeper /usr/local/bin/streamline-keeper
COPY keeper-entrypoint.sh /app/keeper-entrypoint.sh
RUN chmod +x /app/keeper-entrypoint.sh

ENV RUST_LOG=info,sqlx=warn
EXPOSE 8080

# Default = indexer (web service). The keeper service overrides this with
# /app/keeper-entrypoint.sh in its Railway start command.
CMD ["streamline-indexer"]
