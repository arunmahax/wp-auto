# API Contracts: Jobs

**Feature**: 001-backend-foundation  
**Date**: 2026-03-24

**Authentication**: All endpoints require `Authorization: Bearer <token>` header.  
**Authorization**: User must own the project associated with the job.

## POST /api/projects/:projectId/jobs

**Description**: Create a new automation job within a project

**Request Body**:
```json
{
  "type": "content_generation",
  "description": "Generate blog post about Node.js best practices"
}
```

**Success Response** (201 Created):
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "type": "content_generation",
  "description": "Generate blog post about Node.js best practices",
  "status": "pending",
  "created_at": "2026-03-24T00:00:00Z"
}
```

**Error Responses**:
- 400: `{ "error": "Validation failed", "details": [...] }`
- 403: `{ "error": "Forbidden" }` — Not the project owner
- 404: `{ "error": "Project not found" }`

---

## GET /api/projects/:projectId/jobs

**Description**: List all jobs for a project

**Success Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "project_id": "uuid",
    "type": "content_generation",
    "description": "Generate blog post about Node.js best practices",
    "status": "pending",
    "created_at": "2026-03-24T00:00:00Z"
  }
]
```

---

## GET /api/projects/:projectId/jobs/:jobId

**Description**: Get a single job by ID

**Success Response** (200 OK):
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "type": "content_generation",
  "description": "Generate blog post about Node.js best practices",
  "status": "pending",
  "created_at": "2026-03-24T00:00:00Z"
}
```

**Error Responses**:
- 403: `{ "error": "Forbidden" }`
- 404: `{ "error": "Job not found" }`

---

## DELETE /api/projects/:projectId/jobs/:jobId

**Description**: Delete a job record

**Success Response** (200 OK):
```json
{
  "message": "Job deleted successfully"
}
```

**Error Responses**:
- 403: `{ "error": "Forbidden" }`
- 404: `{ "error": "Job not found" }`
