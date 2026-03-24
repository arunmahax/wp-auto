# Research: Backend Foundation

**Feature**: 001-backend-foundation  
**Date**: 2026-03-24

## Technology Decisions

### Backend Framework

- **Decision**: Node.js with Express.js
- **Rationale**: Lightweight, widely adopted, massive ecosystem, easy to modularize. Aligns with the goal of a clean, extensible backend that can later support content generation and publishing services.
- **Alternatives considered**: Fastify (faster but smaller ecosystem), NestJS (too opinionated for this phase), Python/FastAPI (user context suggests JS/Node stack for WordPress integration)

### Database

- **Decision**: PostgreSQL (production) with Sequelize ORM; SQLite supported for local development
- **Rationale**: PostgreSQL is battle-tested for SaaS platforms, supports JSON columns, robust query planner. Sequelize provides migrations, model definitions, and relationship management.
- **Alternatives considered**: Prisma (newer, less flexible for raw queries), Knex.js (query builder only, no model layer), MongoDB (not ideal for relational data like users→projects→jobs)

### Authentication

- **Decision**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Rationale**: Stateless auth fits API-first architecture. JWT allows future microservice scaling. bcrypt is industry standard for password hashing.
- **Alternatives considered**: Session-based auth (requires server-side state), Passport.js (adds abstraction over simple JWT flow)

### Credential Encryption

- **Decision**: AES-256-GCM encryption for WordPress credentials at rest, using Node.js built-in crypto module
- **Rationale**: WordPress app passwords must not be stored in plaintext. AES-256-GCM provides authenticated encryption. Encryption key stored as environment variable.
- **Alternatives considered**: AWS KMS (overkill for this phase), bcrypt (one-way, can't decrypt when needed for API calls)

### Project Structure

- **Decision**: Single-project, modular MVC-like structure (controllers, services, models, routes, middleware)
- **Rationale**: Clean separation of concerns. Services layer enables easy plugging of future integrations without touching route/controller logic.
- **Alternatives considered**: Monorepo with packages (too complex for current scope), microservices (premature optimization)

### Input Validation

- **Decision**: Joi validation library
- **Rationale**: Declarative schema validation, widely used with Express, supports custom error messages.
- **Alternatives considered**: express-validator (more verbose), Zod (TypeScript-focused), manual validation (error-prone)
