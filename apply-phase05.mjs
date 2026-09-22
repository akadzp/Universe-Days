import fs from 'fs';
import path from 'path';

const root = process.cwd();

function replaceOnce(rel, oldText, newText) {
  const full = path.join(root, rel);
  const current = fs.readFileSync(full, 'utf8');
  const first = current.indexOf(oldText);
  if (first < 0) throw new Error(`Expected block not found in ${rel}; refusing unsafe replacement.`);
  if (current.indexOf(oldText, first + 1) >= 0) throw new Error(`Expected block is not unique in ${rel}; refusing ambiguous replacement.`);
  fs.writeFileSync(full, current.slice(0, first) + newText + current.slice(first + oldText.length), 'utf8');
}

replaceOnce(
  'app/web/App.tsx',
  `  const handleToggleUniverse = async () => {\n    setActionLoading(true);\n    try {\n      if (data?.universe.status === 'READY') {\n        await fetch('/api/control/universe/unmount', { method: 'POST' });\n      } else {\n        await fetch('/api/control/universe/mount', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({\n            universeId: 'UNIVERSE_PRIME',\n            universeDate: '2026-03-22',\n            periodId: 'PERIOD_CYCLE_01'\n          })\n        });\n      }\n      await fetchAll();\n    } catch (err) {\n      setError(err instanceof Error ? err.message : 'Universe state toggle failed.');\n    } finally {\n      setActionLoading(false);\n    }\n  };`,
  `  const handleToggleUniverse = async () => {\n    setActionLoading(true);\n    setError('');\n    try {\n      if (data?.universe.status === 'READY') {\n        const response = await fetch('/api/control/universe/unmount', { method: 'POST' });\n        if (!response.ok) throw new Error('Universe unmount request was rejected.');\n      } else {\n        const response = await fetch('/api/control/universe/mount', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ mode: 'PERSISTED_CURRENT' })\n        });\n        const payload = await response.json().catch(() => ({}));\n        if (!response.ok) {\n          throw new Error(payload?.message || payload?.error || 'No persisted current Universe is available.');\n        }\n      }\n      await fetchAll();\n    } catch (err) {\n      setError(err instanceof Error ? err.message : 'Universe state toggle failed.');\n    } finally {\n      setActionLoading(false);\n    }\n  };`
);

const gitignorePath = path.join(root, '.gitignore');
const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
const runtimeRule = `\n# Runtime-generated Canon / production data — never commit operational state\ndata/runtime/*\n!data/runtime/.gitkeep\n`;
if (!gitignore.includes('data/runtime/*')) fs.writeFileSync(gitignorePath, gitignore.trimEnd() + runtimeRule, 'utf8');

const legacyRun = path.join(root, 'data/runtime/production-runs/RUN_b720fec3.json');
if (fs.existsSync(legacyRun)) fs.rmSync(legacyRun, { force: true });

console.log('Phase 05 final acceptance closure applied.');
