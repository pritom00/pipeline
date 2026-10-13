// Cross-platform launcher for the y-websocket sync server (works in PowerShell, cmd, bash).
// Usage: npm run sync-server            -> ws://localhost:1234
//        PORT=4000 npm run sync-server  (bash)   or   $env:PORT=4000; npm run sync-server  (PowerShell)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.HOST ??= 'localhost';
process.env.PORT ??= '1234';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// An absolute path avoids the package's "exports" restrictions on deep imports.
createRequire(import.meta.url)(path.join(root, 'node_modules', 'y-websocket', 'bin', 'server.cjs'));
