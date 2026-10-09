## Architecture rules

- Preserve TanStack Start file-based routes; imported source is adapted without replacing bootstrap or error reporting.
- Keep the supplied cloud datasets and actions as explicitly labeled simulations until a real cloud connection is requested.
- Load the 3D infrastructure viewer lazily behind ClientOnly so browser textures never run during SSR.
- Store the raw dashboard reference data in a shared module so rendering and production-protection tests use the same values.
- Keep resource summary rows, composition counts and filtering in the shared raw-cloud module so dashboard and Resource Intelligence stay consistent.
