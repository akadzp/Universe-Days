import test from 'node:test';
import assert from 'node:assert/strict';
import { ApplicationAuthorizer } from '../authorization.ts';

const actor = (role: 'AI_AGENT' | 'OBSERVER' | 'AUTHOR') => ({
  actorId: `TEST_${role}`,
  role,
  requestTimestamp: 0,
} as any);

const queryContext = (role: 'AI_AGENT' | 'OBSERVER' | 'AUTHOR') => ({
  actor: actor(role),
  universeId: 'U1',
  requestedAt: 0,
});

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

test('AI_AGENT cannot authorize Daily Cycle query', () => {
  const authorizer = new ApplicationAuthorizer();
  assert.throws(
    () => authorizer.authorizeQuery(queryContext('AI_AGENT'), 'GET_DAILY_CYCLE_STATUS'),
    /lacks 'DAILY_READ'/,
  );
});

test('AI_AGENT may authorize Character read query', () => {
  const authorizer = new ApplicationAuthorizer();
  assert.doesNotThrow(
    () => authorizer.authorizeQuery(queryContext('AI_AGENT'), 'GET_CHARACTER_SUMMARY'),
  );
});

test('query authorization requires an explicit universe scope', () => {
  const authorizer = new ApplicationAuthorizer();
  assert.throws(
    () => authorizer.authorizeQuery(
      { ...queryContext('AUTHOR'), universeId: '' },
      'GET_UNIVERSE_STATUS',
    ),
    /universeId is required/,
  );
});
