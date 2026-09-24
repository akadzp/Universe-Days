import test from 'node:test';
import assert from 'node:assert/strict';
import { ApplicationAuthorizer } from '../authorization.ts';

const actor = (role: 'AI_AGENT' | 'OBSERVER') => ({
  actorId: `TEST_${role}`,
  role,
  requestTimestamp: 0,
} as any);

test('AI_AGENT cannot authorize authoritative Character mutation', () => {
  const authorizer = new ApplicationAuthorizer();
  assert.throws(
    () => authorizer.authorize({
      commandId: 'CMD_AI',
      commandType: 'CREATE_CHARACTER',
      actor: actor('AI_AGENT'),
      universeId: 'U1',
      universeTime: '2026-09-24T17:00:00',
      payload: {},
    }),
    /AI_AGENT may propose/,
  );
});

test('OBSERVER cannot authorize Character mutation', () => {
  const authorizer = new ApplicationAuthorizer();
  assert.throws(
    () => authorizer.authorize({
      commandId: 'CMD_OBSERVER',
      commandType: 'APPLY_CHARACTER_INDICATOR_EFFECT',
      actor: actor('OBSERVER'),
      universeId: 'U1',
      universeTime: '2026-09-24T17:00:00',
      payload: {},
    }),
    /lacks 'CHARACTER_MUTATE'/,
  );
});
