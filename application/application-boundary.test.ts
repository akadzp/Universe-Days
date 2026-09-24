/**
 * Application Boundary Verification Test Suite
 * Validates Actor Context, Authorization Policy, Commands, Queries, Projections, and Determinism.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
const assertEquals = (actual: unknown, expected: unknown): void => { assert.deepStrictEqual(actual, expected); };

import { ApplicationRuntime } from './runtime/application-runtime.ts';
import { createActorContext } from './contracts/actor-context.ts';
import { ApplicationCommand } from './contracts/command.ts';
import { ApplicationQuery } from './contracts/query.ts';
import { UniverseModelFactory } from '../core/UNIVERSE/CANON/universe.ts';
import { stableSerialize } from '../core/SHARED/determinism.ts';
import { CharacterSummaryDTO } from './contracts/projections.ts';

function createTestUniverse() {
  return UniverseModelFactory.create({
    universeId: 'univ_app_test_001',
    universeDate: '2026-01-01',
    universeTime: '2026-01-01T00:00:00Z',
    periods: {
      'period_001': {
        periodId: 'period_001',
        universeScope: 'MAIN',
        startTime: '2026-01-01T00:00:00Z',
        sequenceNumber: 1,
        status: 'INITIALIZED',
        isFirstPeriod: true
      }
    },
    periodRef: 'period_001',
    periodLifecycleState: 'INITIALIZED'
  });
}

test('ActorContext: generates correct role-based permissions', () => {
  const author = createActorContext({ actorId: 'user_author_1', role: 'AUTHOR' });
  assert(author.permissions.includes('character:create'));
  assert(author.permissions.includes('daily:advance'));

  const observer = createActorContext({ actorId: 'user_obs_1', role: 'OBSERVER' });
  assert(!observer.permissions.includes('character:create'));
  assert(observer.permissions.includes('character:read'));
});

test('Authorization Policy: rejects unauthorized and AI direct mutation commands', async () => {
  const runtime = ApplicationRuntime.createDefault('/tmp/pocer_test_auth');
  runtime.mountUniverse(createTestUniverse());

  const observerActor = createActorContext({ actorId: 'user_obs_1', role: 'OBSERVER' });
  const unauthCommand: ApplicationCommand = {
    header: {
      commandId: 'cmd_unauth_01',
      commandType: 'CREATE_CHARACTER',
      timestamp: Date.now(),
      actor: observerActor
    },
    payload: {
      characterId: 'char_forbidden',
      displayName: 'Forbidden Character'
    }
  };

  const unauthResult = await runtime.executeCommand(unauthCommand);
  assert(!unauthResult.success);
  assertEquals(unauthResult.error?.code, 'UNAUTHORIZED');

  // AI Agent cannot commit direct authoritative mutations
  const aiActor = createActorContext({ actorId: 'ai_agent_1', role: 'AI_AGENT' });
  const aiMutationCommand: ApplicationCommand = {
    header: {
      commandId: 'cmd_ai_mut_01',
      commandType: 'APPLY_CHARACTER_INDICATOR_EFFECT',
      timestamp: Date.now(),
      actor: aiActor
    },
    payload: {
      effectId: 'eff_ai_illegal',
      characterId: 'char_test',
      indicatorKey: 'mood',
      operation: 'SET',
      value: 100,
      ruleReference: 'AI_ILLEGAL',
      effectiveAt: '2026-01-01',
      recordedAt: '2026-01-01'
    }
  };

  const aiResult = await runtime.executeCommand(aiMutationCommand);
  assert(!aiResult.success);
  assertEquals(aiResult.error?.code, 'UNAUTHORIZED');
});

test('Command & Query Lifecycle: Character creation and query projection', async () => {
  const runtime = ApplicationRuntime.createDefault('/tmp/pocer_test_crud');
  runtime.mountUniverse(createTestUniverse());

  const authorActor = createActorContext({ actorId: 'author_1', role: 'AUTHOR' });

  // 1. Create Character Command
  const createCmd: ApplicationCommand = {
    header: {
      commandId: 'cmd_char_01',
      commandType: 'CREATE_CHARACTER',
      timestamp: Date.now(),
      actor: authorActor
    },
    payload: {
      characterId: 'char_aria_01',
      displayName: 'Aria Stark',
      initialMood: 75
    }
  };

  const createRes = await runtime.executeCommand<any, { characterId: string; displayName: string }>(createCmd);
  assert(createRes.success);
  assertEquals(createRes.data?.characterId, 'char_aria_01');

  // 2. Query Character Summary Projection
  const queryChar: ApplicationQuery = {
    header: {
      queryId: 'qry_char_01',
      queryType: 'GET_CHARACTER_SUMMARY',
      timestamp: Date.now(),
      actor: authorActor
    },
    params: {
      characterId: 'char_aria_01'
    }
  };

  const qryRes = await runtime.executeQuery<any, CharacterSummaryDTO>(queryChar);
  assert(qryRes.success);
  assert(qryRes.data);
  assertEquals(qryRes.data.displayName, 'Aria Stark');
  assertEquals(qryRes.data.conditionIndicators.mood.value, 75);

  // 3. Apply Indicator Effect Command
  const effectCmd: ApplicationCommand = {
    header: {
      commandId: 'cmd_eff_01',
      commandType: 'APPLY_CHARACTER_INDICATOR_EFFECT',
      timestamp: Date.now(),
      actor: authorActor
    },
    payload: {
      effectId: 'eff_aria_loss',
      characterId: 'char_aria_01',
      indicatorKey: 'mood',
      operation: 'DECREASE',
      value: 15,
      ruleReference: 'STORY_LOSS_EVENT',
      effectiveAt: '2026-01-02',
      recordedAt: '2026-01-02T00:00:00Z'
    }
  };

  const effectRes = await runtime.executeCommand<any, { characterId: string; indicatorKey: string; current: number }>(effectCmd);
  assert(effectRes.success);
  assertEquals(effectRes.data?.current, 60);

  // 4. Query again to verify projection reflects persisted state
  const qryAfterRes = await runtime.executeQuery<any, CharacterSummaryDTO>(queryChar);
  assert(qryAfterRes.success);
  assert(qryAfterRes.data);
  assertEquals(qryAfterRes.data.conditionIndicators.mood.value, 60);
});

test('Application Determinism: identical commands yield replay-identical states', async () => {
  const u1 = createTestUniverse();
  const u2 = createTestUniverse();

  const r1 = ApplicationRuntime.createDefault('/tmp/pocer_replay_1');
  const r2 = ApplicationRuntime.createDefault('/tmp/pocer_replay_2');

  r1.mountUniverse(u1);
  r2.mountUniverse(u2);

  const author = createActorContext({ actorId: 'author_replay', role: 'AUTHOR' });

  const command: ApplicationCommand = {
    header: {
      commandId: 'cmd_deterministic_01',
      commandType: 'CREATE_CHARACTER',
      timestamp: 1000,
      actor: author
    },
    payload: {
      characterId: 'char_replay_01',
      displayName: 'Replay Character',
      initialMood: 80
    }
  };

  await r1.executeCommand(command);
  await r2.executeCommand(command);

  const finalU1 = r1.getMountedUniverse();
  const finalU2 = r2.getMountedUniverse();

  assert(finalU1 && finalU2);
  assertEquals(stableSerialize(finalU1), stableSerialize(finalU2));
});
