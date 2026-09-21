FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv libgomp1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/ai/requirements.txt /tmp/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    python3 -m venv /opt/venv && /opt/venv/bin/pip install --timeout 120 --retries 5 -r /tmp/requirements.txt
COPY backend/ ./
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3001
CMD ["node", "server.js"]
