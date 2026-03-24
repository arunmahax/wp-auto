# API Contracts: Projects

**Feature**: 001-backend-foundation  
**Date**: 2026-03-24

**Authentication**: All endpoints require `Authorization: Bearer <token>` header.

## POST /api/projects

**Description**: Create a new project (WordPress site)

**Request Body**:
```json
{
  "name": "My WordPress Blog",
  "wp_api_url": "https://myblog.com/wp-json/wp/v2",
  "wp_username": "admin",
  "wp_app_password": "xxxx xxxx xxxx xxxx"
}
```

**Success Response** (201 Created):
```json
{
  "id": "uuid",
  "name": "My WordPress Blog",
  "wp_api_url": "https://myblog.com/wp-json/wp/v2",
  "wp_username": "admin",
  "created_at": "2026-03-24T00:00:00Z"
}
```

**Error Responses**:
- 400: `{ "error": "Validation failed", "details": [...] }`
- 401: `{ "error": "Unauthorized" }`

---

## GET /api/projects

**Description**: List all projects for the authenticated user

**Success Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "name": "My WordPress Blog",
    "wp_api_url": "https://myblog.com/wp-json/wp/v2",
    "wp_username": "admin",
    "created_at": "2026-03-24T00:00:00Z"
  }
]
```

---

## GET /api/projects/:id

**Description**: Get a single project by ID

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "My WordPress Blog",
  "wp_api_url": "https://myblog.com/wp-json/wp/v2",
  "wp_username": "admin",
  "created_at": "2026-03-24T00:00:00Z"
}
```

**Error Responses**:
- 403: `{ "error": "Forbidden" }` — Not the project owner
- 404: `{ "error": "Project not found" }`

---

## PUT /api/projects/:id

**Description**: Update a project

**Request Body** (partial update supported):
```json
{
  "name": "Updated Blog Name",
  "wp_api_url": "https://newblog.com/wp-json/wp/v2",
  "wp_username": "newadmin",
  "wp_app_password": "yyyy yyyy yyyy yyyy"
}
```

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "Updated Blog Name",
  "wp_api_url": "https://newblog.com/wp-json/wp/v2",
  "wp_username": "newadmin",
  "created_at": "2026-03-24T00:00:00Z",
  "updated_at": "2026-03-24T01:00:00Z"
}
```

**Error Responses**:
- 403: `{ "error": "Forbidden" }`
- 404: `{ "error": "Project not found" }`

---

## DELETE /api/projects/:id

**Description**: Delete a project and its associated jobs

**Success Response** (200 OK):
```json
{
  "message": "Project deleted successfully"
}
```

**Error Responses**:
- 403: `{ "error": "Forbidden" }`
- 404: `{ "error": "Project not found" }`
