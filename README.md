# BiteMap

A food discovery and mapping app.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind v4
- **Backend:** Node + Express + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Shared:** Zod schemas, types, and constants

## Getting Started

### Prerequisites

- Node.js >= 20
- Docker

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the database:

   ```bash
   docker compose up -d
   ```

3. Copy env files:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

4. Generate and run migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Start development servers:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

## Apps

| App | URL |
|-----|-----|
| `apps/web` | http://localhost:5173 |
| `apps/api` | http://localhost:4000 |

## Packages

- `packages/shared` — Shared Zod schemas, TypeScript types, and constants
