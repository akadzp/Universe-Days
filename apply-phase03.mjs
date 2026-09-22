import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const sourceRoot = path.dirname(fileURLToPath(import.meta.url));

function copyFile(relativePath) {
  const source = path.join(sourceRoot, relativePath);
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

const files = [
  'core/platform/persistence/universe.ts',
  'core/platform/persistence/index.ts',
  'core/platform/universe/instance.ts',
  'core/platform/universe/index.ts',
  'core/platform/final/runtime.ts',
  'core/platform/deploy-runtime.ts',
  'app/api/runtime.ts',
  'app/api/routes/control.ts',
  'docker-compose.yml',
  '.env.example'
];

for (const file of files) copyFile(file);

// The control-center UI may have been customized independently. Only replace the
// stale synthetic Universe toggle when the known pre-Phase-03 implementation is present.
const uiPath = path.join(root, 'app/web/App.tsx');
if (fs.existsSync(uiPath)) {
  let ui = fs.readFileSync(uiPath, 'utf8');
  const oldHandler = `const handleToggleUniverse = async () => {\n    setActionLoading(true);\n    try {\n      if (data?.universe.status === 'READY') {\n        await fetch('/api/control/universe/unmount', { method: 'POST' });\n      } else {\n        await fetch('/api/control/universe/mount', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({\n            universeId: 'UNIVERSE_PRIME',\n            universeDate: '2026-03-22',\n            periodId: 'PERIOD_CYCLE_01'\n          })\n        });\n      }\n      await fetchAll();\n    } catch (err) {\n      setError(err instanceof Error ? err.message : 'Universe state toggle failed.');\n    } finally {\n      setActionLoading(false);\n    }\n  };`;
  const newHandler = `const handleToggleUniverse = async () => {\n    setActionLoading(true);\n    setError('');\n    try {\n      const res = data?.universe.status === 'READY'\n        ? await fetch('/api/control/universe/unmount', { method: 'POST' })\n        : await fetch('/api/control/universe/load-current', { method: 'POST' });\n      const result = await res.json();\n      if (!res.ok) throw new Error(result.error || 'Persisted Universe could not be loaded.');\n      await fetchAll();\n    } catch (err) {\n      setError(err instanceof Error ? err.message : 'Universe state toggle failed.');\n    } finally {\n      setActionLoading(false);\n    }\n  };`;

  if (ui.includes(oldHandler)) {
    ui = ui.replace(oldHandler, newHandler);
    const oldLabel = "{data?.universe.status === 'READY' ? 'Unmount' : 'Mount'}";
    const newLabel = "{data?.universe.status === 'READY' ? 'Unmount' : 'Load persisted'}";
    ui = ui.replace(oldLabel, newLabel);
    fs.writeFileSync(uiPath, ui, 'utf8');
    console.log('[phase03] Updated stale Control Center Universe toggle.');
  } else {
    console.log('[phase03] App.tsx UI toggle was customized; left it unchanged.');
  }
}

console.log('[phase03] Persistent Universe Runtime applied.');
console.log('[phase03] Canonical runtime state now loads from persistent current snapshot when available.');
