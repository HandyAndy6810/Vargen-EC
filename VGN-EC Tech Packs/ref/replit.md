# Replit Agent Configuration - Vargenezey

## Overview

Vargenezey is a mobile-first web application designed for tradespeople (plumbers, electricians, etc.) to manage their business operations. It provides AI-powered quoting, job scheduling with a calendar view, customer management, and messaging capabilities. The app uses a "Safety Orange" themed UI with large rounded corners, bottom navigation, and is built to feel like a native mobile app.

The core entities are **Customers**, **Jobs**, **Quotes**, and **Quote Items**, with AI integration for generating professional quotes from simple descriptions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library (new-york style), CSS variables for theming
- **Build Tool**: Vite with HMR support
- **Design**: Mobile-first with bottom pill navigation bar, max-width 2xl content area, rounded card-based UI
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Framework**: Express.js on Node.js with TypeScript
- **Runtime**: tsx for development, esbuild for production bundling
- **API Pattern**: RESTful JSON API with routes defined in `shared/routes.ts` using Zod schemas for validation
- **Server Entry**: `server/index.ts` creates HTTP server, registers routes, serves static files in production or Vite dev server in development

### Data Layer
- **Database**: PostgreSQL (required, uses `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Schema Location**: `shared/schema.ts` (exports all models including auth and chat)
- **Migrations**: Drizzle Kit with `drizzle-kit push` command (no migration files, direct push)
- **Storage Pattern**: `server/storage.ts` defines an `IStorage` interface with a `DatabaseStorage` class implementation

### Database Schema
- **customers**: id, name, email, phone, address, createdAt
- **jobs**: id, customerId (FK→customers), title, description, status (scheduled/completed/cancelled), scheduledDate, createdAt
- **quotes**: id, jobId (FK→jobs), totalAmount (numeric), status (draft/sent/accepted/rejected), content, createdAt
- **quote_items**: id, quoteId (FK→quotes), description, quantity, price (numeric)
- **job_templates**: id, userId (FK→users), label, icon, description, createdAt — user-saved quick templates for job types
- **sessions**: sid, sess (jsonb), expire — required for Replit Auth, do not drop
- **users**: id, email, firstName, lastName, profileImageUrl, createdAt, updatedAt — required for Replit Auth, do not drop
- **conversations**: id, title, createdAt — for AI chat
- **messages**: id, conversationId (FK→conversations), role, content, createdAt — for AI chat

### Authentication
- **Method**: Replit Auth via OpenID Connect (OIDC)
- **Session Store**: PostgreSQL-backed sessions using `connect-pg-simple`
- **Implementation**: `server/replit_integrations/auth/` handles passport setup, session management, and user upsert
- **Client Hook**: `useAuth()` hook checks `/api/auth/user` endpoint
- **Login Flow**: Redirect to `/api/login` for authentication

### API Route Structure
- `/api/customers` — CRUD for customers
- `/api/jobs` — CRUD for jobs
- `/api/quotes` — CRUD for quotes
- `/api/conversations` — AI chat conversations and messages
- `/api/auth/user` — Current authenticated user
- `/api/generate-image` — AI image generation
- Voice/audio endpoints for voice chat features

### Shared Code
The `shared/` directory contains code used by both client and server:
- `shared/schema.ts` — Drizzle table definitions and Zod insert schemas
- `shared/routes.ts` — API route definitions with paths, methods, input/output schemas, and a `buildUrl` helper
- `shared/models/auth.ts` — User and session table definitions
- `shared/models/chat.ts` — Conversation and message table definitions

### Home Page Blade System
The home page uses a reorderable blade system. Blades can be toggled and repositioned in Profile settings.
- **Available blades**: `hero`, `activity`, `pipeline`, `actions`, `revenue`, `stats`, `calendar`
- **Default order**: `["hero","activity","pipeline","actions","revenue","stats","calendar"]`
- **Blade metadata** is defined in `client/src/pages/Profile.tsx` (BLADE_METADATA) and must be kept in sync with `client/src/pages/Home.tsx` (ALL_BLADES)

### Key Components
- **RecentActivityBlade** (`client/src/components/RecentActivityBlade.tsx`) — Shows a live feed of recent actions (quotes created, accepted/rejected, jobs scheduled/completed) and a "Quick Templates" section with frequently quoted job types as tappable cards. Users can save frequent templates as permanent custom templates. Templates navigate to quote creation with pre-filled description. APIs: GET /api/activity, GET/POST/DELETE /api/templates, GET /api/templates/frequent.
- **WeatherWidget** (`client/src/components/WeatherWidget.tsx`) — 4-day weather strip using Open-Meteo API (free, no key). Uses browser Geolocation API with Sydney fallback (-33.8688, 151.2093). Caches results in localStorage (3-hour TTL). Maps WMO weather codes to emojis. Highlights days with rain/wind AND a scheduled job in orange with ⚠️ warning badge. Placed in Home.tsx `calendar` blade below the weekly calendar card.
- **WeeklyRevenueGoalWidget** (`client/src/components/WeeklyRevenueGoalWidget.tsx`) — SVG circular progress ring showing weekly revenue vs target. Sums `totalAmount` of "accepted" quotes created in the current Mon–Sun week. Goal stored in localStorage (`vargenezey_weekly_revenue_goal`). Returns null when goal=0 (hidden). Set via Settings > Goals. Placed in Home.tsx `revenue` blade (default: after Quick Actions, before Quick Stats).

### Build Process
- **Development**: `npm run dev` runs tsx with Vite dev server middleware
- **Production**: `npm run build` runs Vite for client bundle + esbuild for server bundle into `dist/`
- **Database**: `npm run db:push` pushes schema changes directly to PostgreSQL

## External Dependencies

### Database
- **PostgreSQL** — Primary data store, connected via `DATABASE_URL` environment variable

### AI Services (via Replit AI Integrations)
- **OpenAI API** — Used for chat completions, voice chat, text-to-speech, speech-to-text, and image generation
- **Environment Variables**: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
- **Models Used**: GPT for text, `gpt-audio-mini` for voice, `gpt-image-1` for images

### Authentication
- **Custom Email/Password Auth** — Session-based authentication with bcrypt password hashing
- **Session Store**: PostgreSQL-backed sessions using `connect-pg-simple`
- **Implementation**: `server/replit_integrations/auth/replitAuth.ts` handles login (POST /api/login), register (POST /api/register), logout (POST /api/logout), forgot/reset password
- **Client Pages**: `Login.tsx` (sign in / create account tabs), `ResetPassword.tsx`
- **Client Hook**: `useAuth()` hook checks `/api/auth/user` endpoint, returns user/isAuthenticated/logout
- **User ID Pattern**: Routes access user via `(req.session as any)?.localUserId`
- **Environment Variables**: `SESSION_SECRET`

### Key NPM Packages
- `drizzle-orm` + `drizzle-kit` — Database ORM and migration tooling
- `express` + `express-session` — HTTP server and session management
- `passport` + `openid-client` — Authentication middleware
- `@tanstack/react-query` — Client-side data fetching and caching
- `shadcn/ui` (Radix primitives) — UI component library
- `wouter` — Client-side routing
- `date-fns` — Date formatting and manipulation
- `zod` — Schema validation (shared between client and server)
- `framer-motion` — Animations (listed in requirements)