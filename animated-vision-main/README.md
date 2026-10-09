# CloudCurb AI

Carbon-aware cloud intelligence: find idle, oversized and unused cloud resources, estimate
their cost (₹) and CO₂e impact, and run safe, audited optimizations with CurbPilot.

## Development

Requires Node.js 22.12 or newer and npm.

```sh
npm install
npm run dev      # http://localhost:8080
npm test         # unit tests
npm run build    # production build
```

## Workspace

| Tab                   | Route            |
| --------------------- | ---------------- |
| Command Center        | `/dashboard`     |
| Resource Intelligence | `/resource`      |
| Scheduler + Relocator | `/scheduler`     |
| AI Action Plan        | `/opportunities` |
| CurbPilot             | `/pilot`         |
| Impact & Audit        | `/impact`        |

Fleet data lives in `src/lib/raw-cloud.ts` and `src/lib/data.ts`; all money is in rupees.
