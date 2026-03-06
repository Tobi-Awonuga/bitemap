# BiteMap Docs

Developer documentation for the BiteMap project.

## Architecture

| Layer | Tech |
|-------|------|
| Frontend | Vite + React + TypeScript + Tailwind v4 |
| Backend | Node + Express + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Shared | Zod schemas + TypeScript types + constants |

## API Modules

| Module | Base path | Description |
|--------|-----------|-------------|
| health | `GET /health` | Liveness check |
| auth | `/api/auth` | Register, login, logout |
| users | `/api/users` | User profile |
| places | `/api/places` | Food place CRUD |
| reviews | `/api/reviews` | Place reviews |
| saves | `/api/saves` | Saved places |
| visits | `/api/visits` | Visited places |
| tags | `/api/tags` | Place tags |

## Database Schema

- `users` — App accounts
- `places` — Restaurants and food spots
- `reviews` — User ratings and notes per place
- `saves` — User bookmarks
- `visits` — User visit log
- `tags` — Taxonomy labels
- `place_tags` — Many-to-many join

## Frontend Routes

| Route | Page |
|-------|------|
| `/auth` | Sign in / register |
| `/` | Discover / home feed |
| `/map` | Map view |
| `/places/:id` | Place detail |
| `/saved` | Saved places |
| `/visited` | Visited places |
| `/profile` | User profile |
