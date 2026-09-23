import { describe, it } from 'node:test';
import assert from 'node:assert';
import { primaryNavItems, secondaryNavItems } from '../../../app/web/components/Navigation.js';

describe('POCER UX Navigation & Data Purity Verification', () => {
  it('should have the correct primary 4-tier navigation hierarchy', () => {
    const ids = primaryNavItems.map((item) => item.id);
    assert.deepStrictEqual(ids, ['story', 'universe', 'character', 'history']);

    const labels = primaryNavItems.map((item) => item.label);
    assert.deepStrictEqual(labels, ['Cerita', 'Dunia', 'Tokoh', 'Arsip']);
  });

  it('should have secondary navigation items properly categorized under Lainnya', () => {
    const ids = secondaryNavItems.map((item) => item.id);
    assert.deepStrictEqual(ids, ['sandbox', 'studio']);

    const labels = secondaryNavItems.map((item) => item.label);
    assert.deepStrictEqual(labels, ['Sandbox', 'Studio']);
  });

  it('should verify Tokoh is a top-level primary destination with direct access', () => {
    const characterNav = primaryNavItems.find((item) => item.id === 'character');
    assert.ok(characterNav);
    assert.strictEqual(characterNav?.label, 'Tokoh');
  });

  it('should verify Cerita and Dunia are top-level primary destinations', () => {
    const storyNav = primaryNavItems.find((item) => item.id === 'story');
    const universeNav = primaryNavItems.find((item) => item.id === 'universe');

    assert.ok(storyNav);
    assert.ok(universeNav);
  });
});

