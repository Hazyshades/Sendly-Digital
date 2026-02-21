# Multi-stage Dockerfile for zktls-service
# Stage 1: Rust builder для сборки zktls (опционально, если не предоставлен готовый бинарник)
# Используем latest для поддержки новых форматов Cargo.lock (версия 4+)
FROM rust:latest AS rust-builder

# Install зависимостей для сборки
RUN apt-get update && apt-get install -y \
    git \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Clone and build zktls
# Use build arg to specify version/branch (default is main)
ARG ZKTLS_REPO=https://github.com/the3cloud/zktls.git
ARG ZKTLS_BRANCH=main
ARG BUILD_ZKTLS=true

# Build zktls only if BUILD_ZKTLS=true
# Create directory in any case to avoid COPY errors
RUN mkdir -p /tmp/zktls-bin && \
    if [ "$BUILD_ZKTLS" = "true" ]; then \
    git clone --depth 1 --branch ${ZKTLS_BRANCH} ${ZKTLS_REPO} /tmp/zktls && \
    cd /tmp/zktls && \
    cargo build --release && \
    cp target/release/zktls /tmp/zktls-bin/zktls && \
    chmod +x /tmp/zktls-bin/zktls; \
    else \
    touch /tmp/zktls-bin/zktls; \
    fi

# Stage 2: Node.js runtime (Debian - для re2 и др. есть prebuilt-бинарники, без долгой компиляции)
FROM node:18-bookworm-slim

WORKDIR /app

# Install build dependencies for native modules (re2 requires Python and build tools)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and install dependencies
# Note: If you get "Cannot find module" errors, rebuild without cache: docker build --no-cache
COPY package*.json ./
RUN npm install --production --legacy-peer-deps && npm cache clean --force && \
    node -e "require('dotenv')" || (echo "ERROR: dotenv module not found" && exit 1)

# Copy server code
COPY server.js ./

# Copy zktls binary from rust-builder
ARG BUILD_ZKTLS=true
COPY --from=rust-builder /tmp/zktls-bin/zktls /usr/local/bin/zktls

# Check if zktls binary is built (if BUILD_ZKTLS=true)
RUN if [ "$BUILD_ZKTLS" = "true" ]; then \
    if [ ! -s /usr/local/bin/zktls ]; then \
    echo "ERROR: zktls binary was not built. Check rust-builder stage logs."; \
    exit 1; \
    fi && \
    chmod +x /usr/local/bin/zktls && \
    echo "zktls binary ready (built in container)"; \
    else \
    echo "WARNING: BUILD_ZKTLS=false. Ensure zktls binary is provided via volume mount at runtime."; \
    echo "Example: docker run -v /path/to/zktls:/usr/local/bin/zktls ..."; \
    fi

# Make sure zktls is available in PATH
ENV PATH="/usr/local/bin:${PATH}"

# Set default environment variables
ENV PORT=3001
ENV ZKTLS_BINARY=/usr/local/bin/zktls
ENV ZKTLS_BACKEND=r0
ENV NODE_ENV=production

# Create directory for temporary files
RUN mkdir -p /tmp/zktls-inputs && chmod 777 /tmp/zktls-inputs

# Open port
EXPOSE 3001

# Healthcheck to check service health
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start service
CMD ["node", "server.js"]
