# API Contracts: Authentication

**Feature**: 001-backend-foundation  
**Date**: 2026-03-24

## POST /api/auth/register

**Description**: Register a new user account

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response** (201 Created):
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2026-03-24T00:00:00Z"
  }
}
```

**Error Responses**:
- 400: `{ "error": "Validation failed", "details": [...] }` — Invalid email or password too short
- 409: `{ "error": "Email already registered" }` — Duplicate email

---

## POST /api/auth/login

**Description**: Authenticate user and receive JWT token

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Error Responses**:
- 401: `{ "error": "Invalid email or password" }` — Wrong credentials (generic message)
