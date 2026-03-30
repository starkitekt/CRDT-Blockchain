# Honeytrace (CRDT-Blockchain) - Project Context

This file serves as a high-level overview of the `honeytrace` project, capturing the application's technology stack, architecture, and current directory structure.

## Overview

**Project Name**: honeytrace
**Type**: Full-stack Next.js application with App Router
**Core Technologies**:
- **Framework**: Next.js 16 (App Router), React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, Sass, Carbon Design System (`@carbon/react`)
- **Database**: MongoDB (via `mongoose`)
- **Blockchain/Web3**: `ethers` for Ethereum interactions
- **Mapping**: Leaflet, `react-leaflet`
- **Authentication**: JWT, `bcryptjs`, `jose`
- **Validation**: Zod
- **Internationalization**: `next-intl`

---

## Directory Structure

Here is a breakdown of the directories and what has been created in the project so far:

### `/src` (Main Application Source)

- **`/app`**: Contains the Next.js App Router definitions.
  - **`/api`**: Backend API routes.
    - `/auth`: Authentication endpoints.
    - `/batches`: Supply chain batch management.
    - `/lab`: Lab results handling.
    - `/recalls`: Product recall management.
    - `/register`: User registration.
  - **`/[locale]`**: Frontend routes with built-in internationalization.
    - `/dashboard`: The main application dashboard.
    - `layout.tsx`, `page.tsx`: Global layout and landing page.

- **`/components`**: Reusable React UI components grouped by feature.
  - `/Auth`: Components related to user authentication and login.
  - `/Map`: Components for geographical mapping (using Leaflet).
  - `/Navigation`: App navigation elements.
  - `/Notifications`: UI for user alerts and notifications.
  - `/Onboarding`: Components guiding new users.
  - `/Traceability`: Components dealing with supply chain visualization and blockchain tracking.
  - `EmptyState.tsx`: Fallback UI for empty data states.
  - `ErrorBoundary.tsx`: Global error handling UI.
  - `ServiceWorkerRegistrar.tsx`: PWA/offline service worker registration.

- **`/hooks`**: Custom React hooks for encapsulating common logic and state.
  - `useBatches.ts`: Fetches and interacts with batch data.
  - `useLabResults.ts`: Fetches and handles lab results.
  - `useOfflineSync.ts`: Logic for syncing data when offline.
  - `useOnboarding.ts`: Logic for the user onboarding flow.
  - `useRecalls.ts`: Handles data related to product recalls.
  - `useWallet.ts`: Manages Web3 wallet connections via ethers.js.

- **`/lib`**: Core backend logic, utilities, and database schemas.
  - **`/models`**: MongoDB schemas (`AuditLog.ts`, `Batch.ts`, `Counter.ts`, `LabResult.ts`, `Recall.ts`, `User.ts`).
  - **`/services`**: Abstractions for complex backend business logic.
  - **`/validation`**: Zod validation schemas.
  - `api.ts`: API request helpers.
  - `audit.ts`: Utilities for logging auditable actions.
  - `auth.ts`, `rbac.ts`: Auth helpers and Role-Based Access Control logic.
  - `blockchain.ts`: Ethers.js integration for interacting with smart contracts.
  - `mongodb.ts`: Database connection setup.
  - `rateLimit.ts`: API rate limiting constraints.
  - `store.ts`: Global state management.

- **`/i18n`**: Configuration for `next-intl` internationalization.
- **`/styles`**: Global CSS/Sass styling definitions.
- **`/types`**: Global TypeScript interfaces answering to (`index.ts`).
- `proxy.ts`: Proxy utilities.

### Root-Level Directories

- **`/messages`**: Contains translation JSON files for `next-intl`.
- **`/public`**: Static assets (images, icons, etc.).
- **`/scripts`**: Automation/helper scripts (e.g., database seeding, contract deployment).
- **`/tests`**: Automation and unit testing files.

---

## Key Features Implemented

Based on the structure, the project currently supports:
1. **User Authentication & RBAC**: Solid user model with passwords, JWT tokens, and Role-Based Access Control.
2. **Blockchain Traceability**: Real-world product tracing connected to EVM-compatible blockchains.
3. **Supply Chain Operations**: Complete flows for managing product **Batches**, tracking **Lab Results**, and handling **Recalls**.
4. **Offline Support**: PWA support utilizing an offline sync hook and a service worker registrar.
5. **Interactive Mapping**: Geographic display of traceability data.
6. **Multi-language Support**: A setup to support a global user base (`next-intl`).
