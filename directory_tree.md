# CRDT-Blockchain — Project Directory Tree

> Excludes: `node_modules/`, `.next/`, `.git/`, `tsconfig.tsbuildinfo`, `test-results/`

```
CRDT-Blockchain/
│
├── 📄 .dockerignore
├── 📄 .env.example                         # Environment variable template
├── 📄 .env.local                           # Local environment variables (git-ignored)
├── 📄 .gitignore
├── 📄 .local-hardhat.pid                   # Hardhat node PID file
├── 📄 context.md                           # Project context documentation
├── 📄 Dockerfile                           # Docker container config
├── 📄 eslint.config.mjs
├── 📄 hardhat.config.ts                    # Hardhat blockchain config
├── 📄 next-env.d.ts
├── 📄 next.config.ts                       # Next.js configuration
├── 📄 package.json
├── 📄 package-lock.json
├── 📄 playwright.config.ts                 # E2E test runner config
├── 📄 postcss.config.mjs
├── 📄 README.md
├── 📄 tsconfig.json
├── 📄 vitest.config.ts                     # Unit test runner config
│
├── 📁 contracts/                           # Solidity smart contracts
│   ├── HoneyTraceRegistry.sol              # Main traceability registry contract
│   └── HoneyTraceRoleControl.sol           # Role-based access control contract
│
├── 📁 deployments/                         # On-chain deployment info
│   └── addresses.json                      # Deployed contract addresses
│
├── 📁 messages/                            # i18n translation files
│   ├── en.json                             # English translations
│   └── hi.json                             # Hindi translations
│
├── 📁 public/                              # Static assets
│   ├── favicon.ico → (in src/app)
│   ├── file.svg
│   ├── globe.svg
│   ├── honey_harvest_premium.png
│   ├── manifest.json                       # PWA manifest
│   ├── next.svg
│   ├── offline.html                        # PWA offline fallback page
│   ├── sw.js                               # Service worker
│   ├── vercel.svg
│   ├── window.svg
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       └── icon.svg
│
├── 📁 scripts/                             # Dev & deployment scripts
│   ├── createIndexes.ts                    # MongoDB index creation
│   ├── localhost.sh                        # Local dev environment bootstrap
│   ├── seed.ts                             # DB seeding script
│   └── contracts/
│       ├── deploy.js                       # Contract deployment script
│       └── sync-abi.js                     # Sync ABI to src/lib/abis
│
├── 📁 Resources/                           # Project reference assets
│
├── 📁 test/                                # Test suites
│   ├── contracts/
│   │   └── HoneyTraceRegistry.test.js      # Hardhat contract tests
│   ├── unit/
│   │   └── blockchain-utils.test.ts        # Unit tests (Vitest)
│   └── e2e/
│       └── app-flow.spec.ts                # End-to-end tests (Playwright)
│
├── 📁 tests/                               # API/integration tests
│   └── api.http                            # REST Client HTTP test file
│
└── 📁 src/                                 # Main application source
    ├── proxy.ts                            # API proxy utility
    │
    ├── 📁 styles/
    │   └── carbon-theme.scss               # IBM Carbon design theme overrides
    │
    ├── 📁 types/
    │   └── index.ts                        # Global TypeScript type definitions
    │
    ├── 📁 i18n/
    │   ├── request.ts                      # next-intl request config
    │   └── routing.ts                      # Locale routing setup
    │
    ├── 📁 hooks/                           # Custom React hooks
    │   ├── useBatches.ts
    │   ├── useLabResults.ts
    │   ├── useOfflineSync.ts               # Offline/PWA sync hook
    │   ├── useOnboarding.ts
    │   ├── useRecalls.ts
    │   └── useWallet.ts                    # Blockchain wallet hook
    │
    ├── 📁 lib/                             # Shared backend/library code
    │   ├── api.ts                          # API client utilities
    │   ├── audit.ts                        # Audit log helpers
    │   ├── auth.ts                         # Auth session helpers (NextAuth)
    │   ├── blockchain-relay.ts             # Off-chain/on-chain relay logic
    │   ├── blockchain.ts                   # ethers.js contract interaction
    │   ├── env.ts                          # Env variable validation
    │   ├── mongodb.ts                      # MongoDB connection singleton
    │   ├── rateLimit.ts                    # API rate limiter
    │   ├── rbac.ts                         # Role-based access control logic
    │   ├── store.ts                        # Zustand global state store
    │   │
    │   ├── abis/
    │   │   └── HoneyTraceRegistry.json     # Contract ABI (synced by sync-abi.js)
    │   │
    │   ├── models/                         # Mongoose data models
    │   │   ├── AuditLog.ts
    │   │   ├── Batch.ts
    │   │   ├── Counter.ts
    │   │   ├── LabResult.ts
    │   │   ├── Recall.ts
    │   │   └── User.ts                     # ← Active file
    │   │
    │   ├── services/                       # Business logic services
    │   │   ├── aadhaar.service.ts          # Aadhaar KYC integration
    │   │   ├── auth.service.ts
    │   │   ├── batch.service.ts
    │   │   ├── kyc.service.ts
    │   │   ├── lab.service.ts
    │   │   └── recall.service.ts
    │   │
    │   └── validation/                     # Zod validation schemas
    │       ├── auth.schema.ts
    │       ├── batch.schema.ts
    │       ├── lab.schema.ts
    │       ├── recall.schema.ts
    │       └── user.schema.ts
    │
    ├── 📁 components/                      # Reusable React components
    │   ├── EmptyState.tsx
    │   ├── ErrorBoundary.tsx
    │   ├── ServiceWorkerRegistrar.tsx
    │   │
    │   ├── Auth/
    │   │   └── LoginPortal.tsx             # Multi-role login portal
    │   │
    │   ├── Blockchain/
    │   │   └── BlockchainStatusBanner.tsx
    │   │
    │   ├── Map/
    │   │   ├── LeafletMap.tsx              # Interactive Leaflet map
    │   │   └── ProductionHeatMap.tsx
    │   │
    │   ├── Navigation/
    │   │   ├── HoneyHeader.tsx             # Main app header/nav
    │   │   ├── ResponsiveLayout.tsx
    │   │   └── UnifiedDashboardLayout.tsx
    │   │
    │   ├── Notifications/
    │   │   └── NotificationCenter.tsx
    │   │
    │   ├── Onboarding/
    │   │   ├── GuidedTour.tsx
    │   │   ├── IdentityVerificationModal.tsx
    │   │   └── SimplifiedFarmerOnboarding.tsx
    │   │
    │   └── Traceability/
    │       ├── BlockchainCertificate.tsx
    │       ├── BlockchainMapStamp.tsx
    │       ├── CTETimeline.tsx             # Critical Tracking Events timeline
    │       ├── PriorStepQR.tsx
    │       └── RecallManagementModal.tsx
    │
    └── 📁 app/                             # Next.js App Router
        ├── favicon.ico
        ├── globals.css                     # Global styles
        │
        └── [locale]/                       # Internationalized routing root
            ├── layout.tsx                  # Root locale layout (auth, providers)
            ├── page.tsx                    # Landing / redirect page
            │
            └── dashboard/
                ├── admin/
                │   └── page.tsx            # Admin dashboard
                ├── consumer/
                │   └── page.tsx            # Consumer / QR scan view
                ├── enterprise/
                │   └── page.tsx            # Enterprise buyer dashboard
                ├── farmer/
                │   └── page.tsx            # Farmer batch management
                ├── lab/
                │   └── page.tsx            # Lab testing dashboard
                ├── officer/
                │   └── page.tsx            # Government officer dashboard
                ├── secretary/
                │   └── page.tsx            # Cooperative secretary dashboard
                └── warehouse/
                    └── page.tsx            # Warehouse dashboard
```

---

## API Routes (under `src/app/api/`)

| Route | Purpose |
|---|---|
| `/api/auth/` | NextAuth.js authentication handlers |
| `/api/batches/` | Honey batch CRUD & blockchain anchoring |
| `/api/health/` | Health check endpoint |
| `/api/kyc/` | KYC / Aadhaar verification |
| `/api/lab/` | Lab result submission & retrieval |
| `/api/recalls/` | Recall management |
| `/api/register/` | New user registration |
| `/api/users/` | User management |
