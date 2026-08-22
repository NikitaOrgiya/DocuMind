// Test-only shim: vitest runs in plain Node, outside Next.js's "react-server"
// bundling condition, so the real `server-only` package would throw
// unconditionally on import (see src/lib/config.ts for the full explanation).
// vitest.config.ts aliases "server-only" to this no-op so tests can exercise
// server-only-guarded modules directly.
export {};
