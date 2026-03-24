# Implementation Plan: Backend Foundation

**Branch**: `001-backend-foundation` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/001-backend-foundation/spec.md`

## Summary

Build the foundational backend for a modular content automation platform using Node.js/Express with PostgreSQL. The system provides user authentication (JWT + bcrypt), project management (CRUD for WordPress site connections with encrypted credentials), and automation job placeholders. Architecture is modular (controllers → services → models) to support future service integrations without refactoring.

## Technical Context

**Language/Version**: Node.js 18+ with JavaScript (ES modules)  
**Primary Dependencies**: Express.js, Sequelize ORM, jsonwebtoken, bcryptjs, joi, helmet, cors  
**Storage**: PostgreSQL (production), SQLite (development via Sequelize dialect switch)  
**Testing**: Jest + Supertest  
**Target Platform**: Linux/Windows server, Docker-ready  
**Project Type**: Web service (REST API)  
**Performance Goals**: < 500ms response time for all CRUD operations under normal load  
**Constraints**: No external service integrations in this phase. No job execution. API-only (no frontend).  
**Scale/Scope**: Single-server deployment, supporting initial user base

## Constitution Check

*GATE: Constitution is at template stage — no specific violations to check. Proceeding with sensible defaults.*

- Modular architecture: ✅ Controllers, services, models separated
- Security: ✅ bcrypt for passwords, AES-256-GCM for WP credentials, JWT for auth
- Extensibility: ✅ Service layer pattern allows plugging new integrations

## Project Structure

### Documentation (this feature)

```text
specs/001-backend-foundation/
├── spec.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth-api.md
│   ├── projects-api.md
│   └── jobs-api.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── config/
│   └── database.js          # Sequelize configuration
├── middleware/
│   ├── auth.js              # JWT verification middleware
│   ├── errorHandler.js      # Centralized error handling
│   └── validate.js          # Joi validation middleware
├── models/
│   ├── index.js             # Sequelize init + model associations
│   ├── User.js              # User model
│   ├── Project.js           # Project model
│   └── Job.js               # Job model
├── routes/
│   ├── index.js             # Route aggregator
│   ├── auth.js              # Auth routes (register, login)
│   ├── projects.js          # Project CRUD routes
│   └── jobs.js              # Job CRUD routes
├── services/
│   ├── authService.js       # Registration, login, token logic
│   ├── projectService.js    # Project CRUD business logic
│   ├── jobService.js        # Job CRUD business logic
│   └── encryption.js        # AES-256-GCM encrypt/decrypt for WP credentials
├── controllers/
│   ├── authController.js    # Auth request handlers
│   ├── projectController.js # Project request handlers
│   └── jobController.js     # Job request handlers
├── validators/
│   ├── authValidator.js     # Joi schemas for auth
│   ├── projectValidator.js  # Joi schemas for projects
│   └── jobValidator.js      # Joi schemas for jobs
└── app.js                   # Express app setup

server.js                    # Entry point (starts server)
.env.example                 # Environment variable template
package.json
```

**Structure Decision**: Single-project layout with clear MVC-like separation. Controllers handle HTTP, services contain business logic, models define data. This enables future modules (e.g., content generation service, image service) to be added as new service files without touching existing code.

## Complexity Tracking

No constitution violations — no complexity justification needed.
