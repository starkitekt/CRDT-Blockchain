# CRDT-Blockchain — Project Directory Tree

> Excludes: `node_modules/`, `.next/`, `.git/`, `tsconfig.tsbuildinfo`, `test-results/`

```
CRDT-Blockchain/
│
├── 📄 .dockerignore
├── 📄 .env.example                             # Environment variable template
├── 📄 .env.local                               # Local environment variables (git-ignored)
├── 📄 .gitignore
├── 📄 .local-hardhat.pid                       # Hardhat node PID file
├── 📄 BASE_SEPOLIA_ACCOUNTS.md
├── 📄 context.md                               # Project context documentation
├── 📁 contracts                                # Solidity smart contracts
│   ├── 📄 HoneyTraceRegistry.sol               # Main traceability registry contract
│   └── 📄 HoneyTraceRoleControl.sol            # Role-based access control contract
├── 📁 deployments                              # On-chain deployment info
│   └── 📄 addresses.json                       # Deployed contract addresses
├── 📄 directory_tree.md
├── 📄 Dockerfile                               # Docker container config
├── 📄 eslint.config.mjs
├── 📄 hardhat.config.ts                        # Hardhat blockchain config
├── 📄 ledger-batches-only.csv
├── 📄 ledger.csv
├── 📁 messages                                 # i18n translation files
│   ├── 📄 en.json                              # English translations
│   └── 📄 hi.json                              # Hindi translations
├── 📄 next-env.d.ts
├── 📄 next.config.ts                           # Next.js configuration
├── 📄 package-lock.json
├── 📄 package.json
├── 📄 playwright.config.ts                     # E2E test runner config
├── 📄 postcss.config.mjs
├── 📁 public                                   # Static assets
│   ├── 📄 file.svg
│   ├── 📄 globe.svg
│   ├── 📄 honey_harvest_premium.png
│   ├── 📁 icons
│   │   ├── 📄 icon-192.png
│   │   ├── 📄 icon-512.png
│   │   └── 📄 icon.svg
│   ├── 📁 logos
│   │   ├── 📄 iit-delhi.png
│   │   ├── 📄 iit-delhi.svg
│   │   └── 📄 ministry-tribal-affairs.svg
│   ├── 📄 manifest.json                        # PWA manifest
│   ├── 📄 next.svg
│   ├── 📄 offline.html                         # PWA offline fallback page
│   ├── 📄 sw.js                                # Service worker
│   ├── 📄 vercel.svg
│   └── 📄 window.svg
├── 📄 README.md
├── 📁 Resources                                # Project reference assets
│   ├── 📄 Blockchain Blocks for Honey Traceability.docx.pdf
│   ├── 📄 Blockchain-Based Traceability for Agricultural Products.pdf
│   ├── 📄 Blockchain-based traceability framework for agri-food supply chain.pdf
│   ├── 📄 Designing a Smart Honey Supply Chain for Sustainable Development.pdf
│   └── 📄 FSSAI Specification of Honey.pdf
├── 📁 scripts                                  # Dev & deployment scripts
│   ├── 📁 contracts                            # Solidity smart contracts
│   │   ├── 📄 deploy.js                        # Contract deployment script
│   │   └── 📄 sync-abi.js                      # Sync ABI to src/lib/abis
│   ├── 📄 createIndexes.ts                     # MongoDB index creation
│   ├── 📄 localhost.sh                         # Local dev environment bootstrap
│   ├── 📄 network.sh
│   ├── 📄 push-local-to-prod.sh
│   └── 📄 seed.ts                              # DB seeding script
├── 📁 src                                      # Main application source
│   ├── 📁 app                                  # Next.js App Router
│   │   ├── 📁 api
│   │   │   ├── 📁 admin
│   │   │   │   └── 📁 export
│   │   │   │       └── 📄 route.ts
│   │   │   ├── 📁 auth
│   │   │   │   ├── 📁 register
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   └── 📄 route.ts
│   │   │   ├── 📁 batches
│   │   │   │   ├── 📄 route.ts
│   │   │   │   └── 📁 [id]
│   │   │   │       └── 📄 route.ts
│   │   │   ├── 📁 health
│   │   │   │   └── 📄 route.ts
│   │   │   ├── 📁 kyc
│   │   │   │   └── 📁 aadhaar
│   │   │   │       ├── 📁 initiate
│   │   │   │       │   └── 📄 route.ts
│   │   │   │       └── 📁 verify
│   │   │   │           └── 📄 route.ts
│   │   │   ├── 📁 lab
│   │   │   │   ├── 📄 route.ts
│   │   │   │   └── 📁 [batchId]
│   │   │   │       └── 📄 route.ts
│   │   │   ├── 📁 recalls
│   │   │   │   └── 📄 route.ts
│   │   │   ├── 📁 register
│   │   │   │   └── 📄 route.ts
│   │   │   ├── 📁 trace
│   │   │   │   └── 📁 [batchId]
│   │   │   │       └── 📄 route.ts
│   │   │   └── 📁 users
│   │   │       ├── 📄 route.ts
│   │   │       └── 📁 [id]
│   │   │           └── 📄 route.ts
│   │   ├── 📄 favicon.ico
│   │   ├── 📄 globals.css                      # Global styles
│   │   └── 📁 [locale]                         # Internationalized routing root
│   │       ├── 📁 dashboard
│   │       │   ├── 📁 admin
│   │       │   │   └── 📄 page.tsx             # Warehouse dashboard
│   │       │   ├── 📁 consumer
│   │       │   │   └── 📄 page.tsx             # Warehouse dashboard
│   │       │   ├── 📁 enterprise
│   │       │   │   └── 📄 page.tsx             # Warehouse dashboard
│   │       │   ├── 📁 farmer
│   │       │   │   └── 📄 page.tsx             # Warehouse dashboard
│   │       │   ├── 📁 lab
│   │       │   │   └── 📄 page.tsx             # Warehouse dashboard
│   │       │   ├── 📁 officer
│   │       │   │   └── 📄 page.tsx             # Warehouse dashboard
│   │       │   ├── 📁 secretary
│   │       │   │   └── 📄 page.tsx             # Warehouse dashboard
│   │       │   └── 📁 warehouse
│   │       │       └── 📄 page.tsx             # Warehouse dashboard
│   │       ├── 📄 layout.tsx                   # Root locale layout (auth, providers)
│   │       ├── 📄 page.tsx                     # Warehouse dashboard
│   │       └── 📁 trace
│   │           └── 📁 [batchId]
│   │               └── 📄 page.tsx             # Warehouse dashboard
│   ├── 📁 components                           # Reusable React components
│   │   ├── 📁 Auth
│   │   │   └── 📄 LoginPortal.tsx              # Multi-role login portal
│   │   ├── 📁 Blockchain
│   │   │   └── 📄 BlockchainStatusBanner.tsx
│   │   ├── 📄 CopyableValue.tsx
│   │   ├── 📁 Dashboard
│   │   ├── 📄 EmptyState.tsx
│   │   ├── 📄 ErrorBoundary.tsx
│   │   ├── 📁 Landing
│   │   │   └── 📄 LandingPage.tsx
│   │   ├── 📁 Map
│   │   │   ├── 📄 LeafletMap.tsx               # Interactive Leaflet map
│   │   │   └── 📄 ProductionHeatMap.tsx
│   │   ├── 📁 Navigation
│   │   │   ├── 📄 GovFooter.tsx
│   │   │   ├── 📄 GovHeader.tsx
│   │   │   ├── 📄 HoneyHeader.tsx              # Main app header/nav
│   │   │   ├── 📄 ResponsiveLayout.tsx
│   │   │   └── 📄 UnifiedDashboardLayout.tsx
│   │   ├── 📁 Notifications
│   │   │   └── 📄 NotificationCenter.tsx
│   │   ├── 📁 Onboarding
│   │   │   ├── 📄 GuidedTour.tsx
│   │   │   ├── 📄 IdentityVerificationModal.tsx
│   │   │   └── 📄 SimplifiedFarmerOnboarding.tsx
│   │   ├── 📄 ServiceWorkerRegistrar.tsx
│   │   └── 📁 Traceability
│   │       ├── 📄 BlockchainCertificate.tsx
│   │       ├── 📄 BlockchainMapStamp.tsx
│   │       ├── 📄 CTETimeline.tsx              # Critical Tracking Events timeline
│   │       ├── 📄 PriorStepQR.tsx
│   │       ├── 📄 QRCodeGenerator.tsx
│   │       ├── 📄 QRScanner.tsx
│   │       ├── 📄 QRTraceResult.tsx
│   │       └── 📄 RecallManagementModal.tsx
│   ├── 📁 hooks                                # Custom React hooks
│   │   ├── 📄 useBatches.ts
│   │   ├── 📄 useCurrentUser.ts
│   │   ├── 📄 useLabResults.ts
│   │   ├── 📄 useOfflineSync.ts                # Offline/PWA sync hook
│   │   ├── 📄 useOnboarding.ts
│   │   ├── 📄 useRecalls.ts
│   │   └── 📄 useWallet.ts                     # Blockchain wallet hook
│   ├── 📁 i18n
│   │   ├── 📄 request.ts                       # next-intl request config
│   │   └── 📄 routing.ts                       # Locale routing setup
│   ├── 📁 lib                                  # Shared backend/library code
│   │   ├── 📁 abis
│   │   │   └── 📄 HoneyTraceRegistry.json      # Contract ABI (synced by sync-abi.js)
│   │   ├── 📄 api.ts                           # API client utilities
│   │   ├── 📄 audit.ts                         # Audit log helpers
│   │   ├── 📄 auth.ts                          # Auth session helpers (NextAuth)
│   │   ├── 📄 blockchain-relay.ts              # Off-chain/on-chain relay logic
│   │   ├── 📄 blockchain.ts                    # ethers.js contract interaction
│   │   ├── 📄 env.ts                           # Env variable validation
│   │   ├── 📁 models                           # Mongoose data models
│   │   │   ├── 📄 AuditLog.ts
│   │   │   ├── 📄 Batch.ts
│   │   │   ├── 📄 Counter.ts
│   │   │   ├── 📄 LabResult.ts
│   │   │   ├── 📄 Recall.ts
│   │   │   └── 📄 User.ts                      # ← Active file
│   │   ├── 📄 mongodb.ts                       # MongoDB connection singleton
│   │   ├── 📄 rateLimit.ts                     # API rate limiter
│   │   ├── 📄 rbac.ts                          # Role-based access control logic
│   │   ├── 📁 services                         # Business logic services
│   │   │   ├── 📄 aadhaar.service.ts           # Aadhaar KYC integration
│   │   │   ├── 📄 auth.service.ts
│   │   │   ├── 📄 batch.service.ts
│   │   │   ├── 📄 kyc.service.ts
│   │   │   ├── 📄 lab.service.ts
│   │   │   └── 📄 recall.service.ts
│   │   ├── 📄 store.ts                         # Zustand global state store
│   │   └── 📁 validation                       # Zod validation schemas
│   │       ├── 📄 auth.schema.ts
│   │       ├── 📄 batch.schema.ts
│   │       ├── 📄 lab.schema.ts
│   │       ├── 📄 recall.schema.ts
│   │       └── 📄 user.schema.ts
│   ├── 📄 middleware.ts
│   ├── 📁 styles
│   │   └── 📄 carbon-theme.scss                # IBM Carbon design theme overrides
│   └── 📁 types
│       └── 📄 index.ts                         # Global TypeScript type definitions
├── 📁 test                                     # Test suites
│   ├── 📁 contracts                            # Solidity smart contracts
│   │   └── 📄 HoneyTraceRegistry.test.js       # Hardhat contract tests
│   ├── 📁 e2e
│   │   ├── 📄 app-flow.hosted.spec.ts
│   │   └── 📄 app-flow.spec.ts                 # End-to-end tests (Playwright)
│   └── 📁 unit
│       └── 📄 blockchain-utils.test.ts         # Unit tests (Vitest)
├── 📁 tests                                    # API/integration tests
│   └── 📄 api.http                             # REST Client HTTP test file
├── 📄 tsconfig.json
├── 📄 tsconfig.tsbuildinfo
├── 📄 vercel.json
└── 📄 vitest.config.ts                         # Unit test runner config

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
