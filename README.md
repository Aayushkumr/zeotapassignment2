```markdown
# ClickHouse Flatfile Import Tool

A tool for importing and managing flat files with ClickHouse.

## Setup Instructions

### With Docker (recommended for developers)

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd ch_flatfile_tool
   ```

2. Create environment files
   ```bash
   cp server/.env.example server/.env
   ```

3. Start with Docker Compose
   ```bash
   docker-compose up -d
   ```

4. Access the application
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

### Manual Setup

1. Install and start ClickHouse
   ```bash
   # For macOS with Homebrew
   brew install clickhouse
   brew services start clickhouse
   
   # Copy configuration
   mkdir -p /usr/local/etc/clickhouse-server/config.d
   cp server/clickhouse-config/* /usr/local/etc/clickhouse-server/config.d/
   
   # Restart ClickHouse
   brew services restart clickhouse
   ```

2. Set up environment and start server
   ```bash
   cd server
   npm install
   cp .env.example .env
   npm run build
   npm start
   ```

3. Start client
   ```bash
   cd client
   npm install
   npm run dev
   ```

## Using JWT Authentication

1. Select "JWT Token" as the authentication method
2. Check "Generate JWT token automatically"
3. Click Connect
4. The generated token will be displayed below the form

## Features

- Connect to ClickHouse using password or JWT authentication
- Upload CSV, TSV, and other flat files
- Detect schema automatically from file headers
- Preview data before import
- Create new tables or append to existing ones
- Configure column mappings and data types
- Monitor import progress
```

## 3. Create .env.example Based on Your Current .env

```properties
PORT=3001
NODE_ENV=development
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_DB=default
CLICKHOUSE_PASSWORD=
JWT_SECRET=aayushkumarzeotap
JWT_EXPIRES_IN=1h
UPLOAD_TEMP_DIR=./uploads
MAX_FILE_SIZE=10485760
```

## 4. Make Sure Your Docker Configuration Is Updated

Check if you need to create the Dockerfiles mentioned earlier:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

These changes should resolve all the TypeScript errors while maintaining compatibility with your existing code structure. The approach keeps your code working while providing a path to a more portable configuration.