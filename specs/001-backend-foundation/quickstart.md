# Quickstart: Backend Foundation

**Feature**: 001-backend-foundation  
**Date**: 2026-03-24

## Prerequisites

- Node.js 18+
- PostgreSQL running (or SQLite for local dev)
- npm

## Setup

```bash
# Clone and enter project
cd pinterest-automation-platform

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# Run database migrations
npx sequelize-cli db:migrate

# Start the server
npm start
```

## Verify

### 1. Register a user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

Expected: 201 with user object

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

Expected: 200 with JWT token

### 3. Create a project

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "My Blog", "wp_api_url": "https://myblog.com/wp-json/wp/v2", "wp_username": "admin", "wp_app_password": "xxxx xxxx xxxx xxxx"}'
```

Expected: 201 with project object (wp_app_password not returned)

### 4. Create a job

```bash
curl -X POST http://localhost:3000/api/projects/<project_id>/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"type": "content_generation", "description": "Test job"}'
```

Expected: 201 with job object, status "pending"

## Environment Variables

| Variable           | Description                  | Example                      |
| ------------------ | ---------------------------- | ---------------------------- |
| PORT               | Server port                  | 3000                         |
| DATABASE_URL       | PostgreSQL connection string | postgresql://user:pass@localhost:5432/pinterest_automation |
| JWT_SECRET         | JWT signing secret           | (random 64-char string)      |
| ENCRYPTION_KEY     | AES-256 key for WP creds    | (random 32-byte hex string)  |
| NODE_ENV           | Environment                  | development                  |
