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
COPY index.ts ./index.ts

RUN npx prisma generate

# Set the default command to run the scraper
# CMD ["npm", "start"]

# Create a cron job file to schedule the web scraper
COPY set-cron.sh ./
RUN chmod +x /usr/src/app/set-cron.sh

# Run the cron daemon and the web scraper script
ENTRYPOINT bash -c "/usr/src/app/set-cron.sh && cron -f"
