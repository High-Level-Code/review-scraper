# Base lightweight Node.js image
FROM node:22.11-slim

# Install dependencies for Chromium
RUN apt-get update && apt-get install -y \
    cron \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm-dev \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set working directory in the container
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
RUN npm install -g tsx

COPY prisma/ ./prisma/
COPY src/ ./src/ 

RUN npx prisma generate

CMD tsx src/index.ts >> logs.txt 2>&1
