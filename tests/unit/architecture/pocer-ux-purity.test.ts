import { describe, it, expect } from 'vitest';
import { primaryNavItems, secondaryNavItems } from '../../../app/web/components/Navigation.js';

describe('POCER UX Navigation & Data Purity Verification', () => {
  it('should have the correct primary 4-tier navigation hierarchy', () => {
    const ids = primaryNavItems.map((item) => item.id);
    expect(ids).toEqual(['story', 'universe', 'character', 'history']);

    const labels = primaryNavItems.map((item) => item.label);
    expect(labels).toEqual(['Cerita', 'Dunia', 'Tokoh', 'Arsip']);
  });

  it('should have secondary navigation items properly categorized under Lainnya', () => {
    const ids = secondaryNavItems.map((item) => item.id);
    expect(ids).toEqual(['sandbox', 'studio']);

    const labels = secondaryNavItems.map((item) => item.label);
    expect(labels).toEqual(['Sandbox', 'Studio']);
  });

  it('should verify Tokoh is a top-level primary destination with direct access', () => {
    const characterNav = primaryNavItems.find((item) => item.id === 'character');
    expect(characterNav).toBeDefined();
    expect(characterNav?.label).toBe('Tokoh');
  });

  it('should verify Cerita and Dunia are top-level primary destinations', () => {
    const storyNav = primaryNavItems.find((item) => item.id === 'story');
    const universeNav = primaryNavItems.find((item) => item.id === 'universe');

    expect(storyNav).toBeDefined();
    expect(universeNav).toBeDefined();
  });
});
