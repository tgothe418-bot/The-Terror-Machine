FROM node:20-slim

WORKDIR /app

# Install dependencies using package-lock
COPY package*.json ./
RUN npm ci

# Copy application files
COPY . .

# Build Vite frontend and bundled Express server
RUN npm run build

# Configure Hugging Face Spaces environment
ENV PORT=7860
ENV NODE_ENV=production
EXPOSE 7860

# Run as non-root user 1000 for Hugging Face Spaces
USER 1000

CMD ["node", "dist/server.cjs"]
