FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source and config files
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

# Clean build (remove any cached build info)
RUN rm -rf dist node_modules/.cache tsconfig.tsbuildinfo

# Build the application
RUN npm run build

# Verify build output
RUN ls -la dist/dto/ && ls -la dist/controllers/

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main.js"]
