#!/usr/bin/env python3
import os,re,subprocess
ROOT=os.getcwd()
MAP_TEXT='''
core/architecture	core/RUNTIME/GOVERNANCE
core/engine	core/RUNTIME/ENGINE
core/temporal	core/RUNTIME/TEMPORAL
core/domains/contracts	core/RUNTIME/DOMAIN-GATEWAY/contracts
core/domains/mocks	core/RUNTIME/DOMAIN-GATEWAY/mocks
core/domains/gateway.ts	core/RUNTIME/DOMAIN-GATEWAY/gateway.ts
core/domains/registry.ts	core/RUNTIME/DOMAIN-GATEWAY/registry.ts
core/universe/daily	core/UNIVERSE/DAILY-CYCLE
core/universe/continuity	core/UNIVERSE/CONTINUITY
core/story/daily	core/DAILY-STORY
core/page/daily	core/DAILY-PAGE
core/rules	core/RULES
core/validation	core/VALIDATION
core/platform/ai	core/INFRA/AI
core/platform/cache	core/INFRA/CACHE
core/platform/context	core/INFRA/CONTEXT
core/platform/continuity	core/INFRA/CONTINUITY-LEDGER
core/platform/cost	core/INFRA/COST
core/platform/final	core/INFRA/FINAL
core/platform/hardening	core/INFRA/HARDENING
core/platform/model	core/INFRA/MODEL
core/platform/parallel	core/INFRA/PARALLEL
core/platform/persistence	core/INFRA/PERSISTENCE
core/platform/production	core/INFRA/PRODUCTION/runtime
core/platform/providers	core/INFRA/PROVIDERS
core/platform/recovery	core/INFRA/RECOVERY
core/platform/scaling	core/INFRA/SCALING
core/platform/scheduler	core/INFRA/SCHEDULER
core/platform/token	core/INFRA/TOKEN
core/platform/validation	core/INFRA/VALIDATION
core/platform/versioning	core/INFRA/VERSIONING
core/platform/universe	core/INFRA/INSTANCE
core/production	core/INFRA/PRODUCTION/legacy
core/universe/model/character.ts	core/CHARACTER/character.ts
core/universe/model/character-profile.ts	core/CHARACTER/character-profile.ts
core/universe/model/actor.ts	core/CHARACTER/actor.ts
core/universe/model/behavior.ts	core/CHARACTER/behavior.ts
core/universe/model/character-style.ts	core/CHARACTER/character-style.ts
core/universe/model/object.ts	core/OBJECT/object.ts
core/universe/model/object-reference.ts	core/OBJECT/object-reference.ts
core/universe/model/relationship.ts	core/DOMAIN/RELATIONSHIP/relationship.ts
core/universe/model/knowledge.ts	core/DOMAIN/KNOWLEDGE/knowledge.ts
core/universe/model/state.ts	core/DOMAIN/STATE/state.ts
core/universe/model/character-state.ts	core/DOMAIN/STATE/character-state.ts
core/universe/model/location.ts	core/DOMAIN/LOCATION/location.ts
core/universe/model/location-reference.ts	core/DOMAIN/LOCATION/location-reference.ts
core/universe/model/universe.ts	core/UNIVERSE/CANON/universe.ts
core/universe/model/event.ts	core/UNIVERSE/CANON/event.ts
core/universe/model/repository.ts	core/UNIVERSE/CANON/repository.ts
core/universe/model/serialization.ts	core/UNIVERSE/CANON/serialization.ts
core/universe/model/process.ts	core/UNIVERSE/CANON/process.ts
core/universe/model/unresolved.ts	core/UNIVERSE/CANON/unresolved.ts
core/universe/model/registry.ts	core/RUNTIME/GOVERNANCE/entity-registry.ts
core/universe/model/types.ts	core/SHARED/model-types.ts
core/universe/model/validation.ts	core/VALIDATION/universe-model.ts
core/universe/model/seed.ts	core/VALIDATION/fixtures/universe-seed.ts
core/universe/model/continuity.ts	core/UNIVERSE/CONTINUITY/legacy/continuity.ts
core/universe/model/character-continuity.ts	core/UNIVERSE/CONTINUITY/legacy/character-continuity.ts
core/universe/model/identity.ts	core/SHARED/identity.ts
core/universe/model/history.ts	core/SHARED/history.ts
core/universe/model/provenance.ts	core/SHARED/provenance.ts
core/universe/model/references.ts	core/SHARED/references.ts
core/types/common.ts	core/SHARED/common.ts
core/types/determinism.ts	core/SHARED/determinism.ts
core/types/errors.ts	core/SHARED/errors.ts
core/types/identifiers.ts	core/SHARED/identifiers.ts
core/types/result.ts	core/SHARED/result.ts
core/types/execution-context.ts	core/RUNTIME/ENGINE/execution-context.ts
core/types/temporal.ts	core/RUNTIME/TEMPORAL/types.ts
core/types/rules.ts	core/RULES/types.ts
core/platform/shared.ts	core/SHARED/platform.ts
core/platform/deploy-runtime.ts	core/INFRA/FINAL/deploy-runtime.ts
'''
maps=sorted((a,b) for a,b in (line.split('\t') for line in MAP_TEXT.strip().splitlines()) if a)
# longest-first for prefix mapping
maps.sort(key=lambda x:len(x[0]), reverse=True)

def map_path(old):
    for a,b in maps:
        if old==a: return b
        if old.startswith(a+'/'): return b+old[len(a):]
    return old

# Build reverse mapping for all tracked files.
files=subprocess.check_output(['git','ls-files','core'],text=True).splitlines()
rev={}
for old in files:
    new=map_path(old)
    rev[new]=old
# Removed files/indexes don't need reverse entries; moved source can still resolve.

def resolve_old(importer_new, spec):
    importer_old=rev.get(importer_new, importer_new)
    base=os.path.normpath(os.path.join(os.path.dirname(importer_old),spec))
    candidates=[base]
    if not os.path.splitext(base)[1]:
        candidates += [base+'.ts',base+'.tsx',base+'.js',base+'.jsx',os.path.join(base,'index.ts'),os.path.join(base,'index.tsx')]
    for c in candidates:
        if c in files:
            return c
    # Core relative imports are internal module references. Return the resolved
    # source path even when the old file is an index/compatibility boundary
    # that is intentionally deleted by the migration.
    return base

pat=re.compile(r"(?P<prefix>\b(?:from|import|export)\s*\(?\s*['\"])(?P<spec>\.{1,2}/[^'\"]+)(?P<suffix>['\"]\s*\)?)")
changed=0
for root,_,names in os.walk('core'):
    for name in names:
        if not name.endswith(('.ts','.tsx','.mts','.cts')): continue
        path=os.path.join(root,name).replace(os.sep,'/')
        with open(path,encoding='utf-8') as f: text=f.read()
        def repl(m):
            spec=m.group('spec')
            old_target=resolve_old(path,spec)
            if not old_target: return m.group(0)
            new_target=map_path(old_target)
            if new_target.endswith('/index.ts'):
                new_target=new_target[:-9]
            rel=os.path.relpath(new_target,os.path.dirname(path)).replace(os.sep,'/')
            if not rel.startswith('.'): rel='./'+rel
            return m.group('prefix')+rel+m.group('suffix')
        new=pat.sub(repl,text)
        if new!=text:
            with open(path,'w',encoding='utf-8') as f:f.write(new)
            changed+=1
print(f'rewrote {changed} TypeScript files')
