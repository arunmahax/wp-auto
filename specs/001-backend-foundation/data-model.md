# Data Model: Backend Foundation

**Feature**: 001-backend-foundation  
**Date**: 2026-03-24

## Entities

### User

| Field        | Type         | Constraints                        |
| ------------ | ------------ | ---------------------------------- |
| id           | UUID         | Primary key, auto-generated        |
| email        | VARCHAR(255) | Unique, not null, valid email      |
| password     | VARCHAR(255) | Not null, bcrypt hash              |
| created_at   | TIMESTAMP    | Not null, default now              |
| updated_at   | TIMESTAMP    | Not null, auto-updated             |

**Relationships**: Has many Projects

### Project

| Field          | Type         | Constraints                          |
| -------------- | ------------ | ------------------------------------ |
| id             | UUID         | Primary key, auto-generated          |
| user_id        | UUID         | Foreign key → User.id, not null      |
| name           | VARCHAR(255) | Not null                             |
| wp_api_url     | VARCHAR(500) | Not null, valid URL                  |
| wp_username    | VARCHAR(255) | Not null                             |
| wp_app_password| TEXT         | Not null, AES-256-GCM encrypted      |
| created_at     | TIMESTAMP    | Not null, default now                |
| updated_at     | TIMESTAMP    | Not null, auto-updated               |

**Relationships**: Belongs to User, Has many Jobs

### Job

| Field        | Type         | Constraints                                              |
| ------------ | ------------ | -------------------------------------------------------- |
| id           | UUID         | Primary key, auto-generated                              |
| project_id   | UUID         | Foreign key → Project.id, not null                       |
| type         | VARCHAR(50)  | Not null (e.g., 'content_generation', 'image_creation')  |
| description  | TEXT         | Nullable                                                 |
| status       | VARCHAR(20)  | Not null, default 'pending'. Enum: pending, running, completed, failed |
| created_at   | TIMESTAMP    | Not null, default now                                    |
| updated_at   | TIMESTAMP    | Not null, auto-updated                                   |

**Relationships**: Belongs to Project

## Entity Relationship Diagram

```
User (1) ──── (N) Project (1) ──── (N) Job
```

## Validation Rules

- **User.email**: Must be valid email format, unique across all users
- **User.password**: Minimum 8 characters before hashing
- **Project.name**: 1-255 characters
- **Project.wp_api_url**: Must be a valid URL
- **Job.type**: Must be a non-empty string
- **Job.status**: Must be one of: pending, running, completed, failed

## State Transitions

### Job Status

```
pending → running → completed
pending → running → failed
pending → (deleted)
```

Note: State transitions are structural only — no automated execution in this phase.
