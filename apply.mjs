import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const payload = path.join(import.meta.dirname, 'payload');
const EXPECTED_HEAD = '50c5d44c11fb1f9e3d043418e6d434c5d904ad74';

function exists(p) { return fs.existsSync(path.join(root, p)); }
function runGit(args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }
function assertPreconditions() {
  const head = runGit(['rev-parse', 'HEAD']);
  if (head !== EXPECTED_HEAD) throw new Error(`Wrong base commit. Expected ${EXPECTED_HEAD}, found ${head}. Refusing partial application.`);
  if (exists('app/web/App.tsx')) throw new Error('app/web/App.tsx already exists. This consolidated reconstruction expects the UI to be absent; refusing to overwrite an existing UI.');
  const required = [
    'core/architecture/protocol.ts',
    'tests/unit/architecture/protocol.test.ts',
    'tests/integration/architecture/mutation-authority.test.ts'
  ];
  for (const f of required) if (!exists(f)) throw new Error(`Required base file missing: ${f}`);
}
function collectPayloadFiles(dir, prefix='') {
  const out=[];
  for (const name of fs.readdirSync(dir)) {
    const rel=path.join(prefix,name); const full=path.join(dir,name);
    const st=fs.statSync(full);
    if (st.isDirectory()) out.push(...collectPayloadFiles(full,rel)); else out.push(rel);
  }
  return out;
}
function copyPayload(rel) {
  const src=path.join(payload,rel); const dst=path.join(root,rel);
  fs.mkdirSync(path.dirname(dst),{recursive:true}); fs.copyFileSync(src,dst);
}

assertPreconditions();
const files = collectPayloadFiles(payload);
const backupDir = path.join(root, '.pocer-final-patch-backup');
fs.rmSync(backupDir,{recursive:true,force:true});
const existingTargets = ['app','src','index.html','core/architecture/protocol.ts','tests/unit/architecture/protocol.test.ts','tests/integration/architecture/mutation-authority.test.ts'];
try {
  fs.mkdirSync(backupDir,{recursive:true});
  for (const rel of existingTargets) {
    if (!exists(rel)) continue;
    const dst=path.join(backupDir,rel); fs.mkdirSync(path.dirname(dst),{recursive:true}); fs.cpSync(path.join(root,rel),dst,{recursive:true});
  }
  for (const rel of files) copyPayload(rel);
  fs.rmSync(backupDir,{recursive:true,force:true});
  console.log(`Consolidated 16-stage reconstruction applied: ${files.length} payload files.`);
} catch (err) {
  console.error('Patch failed; restoring previous files.');
  for (const rel of existingTargets) {
    const backup=path.join(backupDir,rel); const target=path.join(root,rel);
    if (fs.existsSync(backup)) { fs.rmSync(target,{recursive:true,force:true}); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.cpSync(backup,target,{recursive:true}); }
    else if (fs.existsSync(target) && ['app','src','index.html'].includes(rel)) fs.rmSync(target,{recursive:true,force:true});
  }
  throw err;
}
