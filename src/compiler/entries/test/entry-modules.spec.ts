import { getAppComponentEntries, getEntryGraph, getUserConfigBundles, prioritizedEntries } from '../entry-modules';
import { ManifestBundle, ModuleFile } from '../../../declarations';


describe('graph-dependencies', () => {

  describe('prioritizedEntries', () => {

    it('remove empties', () => {
      const entries = [
        ['a', 'b', 'c'],
        ['a', 'b', 'c'],
        ['b', 'c'],
        ['c', 'c', 'c', 'c']
      ];
      const prioritized = prioritizedEntries(entries);
      expect(prioritized).toHaveLength(1);
      expect(prioritized[0]).toHaveLength(3);
    });

    it('first one wins', () => {
      const entries = [
        ['a', 'b', 'c'],
        ['a', 'b', 'd']
      ];
      const prioritized = prioritizedEntries(entries);
      expect(prioritized).toHaveLength(2);
      expect(prioritized[0]).toHaveLength(3);
      expect(prioritized[1]).toHaveLength(1);
    });

  });

  describe('getAppComponentEntries', () => {

    it('not get collection deps', () => {
      const allModules: ModuleFile[] = [
        { cmpMeta: { tagNameMeta: 'cmp-a' } },
        { cmpMeta: { tagNameMeta: 'cmp-b' } },
        { cmpMeta: { tagNameMeta: 'collection-a' }, isCollectionDependency: true },
        { cmpMeta: { tagNameMeta: 'collection-b' }, isCollectionDependency: true },
      ];

      const entries = getAppComponentEntries(allModules);
      expect(entries).toHaveLength(2);
      expect(entries[0][0]).toBe('cmp-a');
      expect(entries[1][0]).toBe('cmp-b');
    });

  });

  describe('getEntryGraph', () => {

    it('circular', () => {
      const tag = 'cmp-a';
      const tags = getEntryGraph([
        { cmpMeta: { tagNameMeta: 'cmp-a', componentGraph: ['cmp-b'] } },
        { cmpMeta: { tagNameMeta: 'cmp-b', componentGraph: ['cmp-a', 'cmp-c'] } },
        { cmpMeta: { tagNameMeta: 'cmp-c', componentGraph: ['cmp-d'] } },
        { cmpMeta: { tagNameMeta: 'cmp-d', componentGraph: ['cmp-a', 'cmp-b', 'cmp-c'] } }
      ], tag);
      expect(tags).toHaveLength(4);
    });

    it('no dups', () => {
      const tag = 'cmp-a';
      const tags = getEntryGraph([
        { cmpMeta: { tagNameMeta: 'cmp-a', componentGraph: ['cmp-b', 'cmp-c', 'cmp-d'] } },
        { cmpMeta: { tagNameMeta: 'cmp-b', componentGraph: ['cmp-c'] } },
        { cmpMeta: { tagNameMeta: 'cmp-c', componentGraph: ['cmp-d'] } },
        { cmpMeta: { tagNameMeta: 'cmp-d' } }
      ], tag);
      expect(tags).toHaveLength(4);
    });

    it('simple graph', () => {
      const tag = 'cmp-a';
      const tags = getEntryGraph([
        { cmpMeta: { tagNameMeta: 'cmp-a', componentGraph: ['cmp-b'] } },
        { cmpMeta: { tagNameMeta: 'cmp-b', componentGraph: ['cmp-c'] } },
        { cmpMeta: { tagNameMeta: 'cmp-c', componentGraph: ['cmp-d'] } },
        { cmpMeta: { tagNameMeta: 'cmp-d' } }
      ], tag);
      expect(tags).toHaveLength(4);
    });

    it('no sub graph', () => {
      const tag = 'cmp-a';
      const tags = getEntryGraph([
        { cmpMeta: { tagNameMeta: 'cmp-a' } }
      ], tag);
      expect(tags).toHaveLength(1);
    });

  });

  describe('getUserConfigBundles', () => {

    it('sort with most first', () => {
      const bundles: ManifestBundle[] = [
        { components: ['cmp-a', 'cmp-b'] },
        { components: ['cmp-c', 'cmp-d', 'cmp-e'] }
      ];
      const entries = getUserConfigBundles(bundles);
      expect(entries).toHaveLength(2);
      expect(entries[0]).toHaveLength(3);
      expect(entries[1]).toHaveLength(2);
    });

    it('add components', () => {
      const bundles: ManifestBundle[] = [
        { components: ['cmp-a', 'cmp-b'] },
        { components: ['cmp-c', 'cmp-d'] }
      ];
      const entries = getUserConfigBundles(bundles);
      expect(entries).toHaveLength(2);
      expect(entries[0]).toHaveLength(2);
      expect(entries[1]).toHaveLength(2);
    });

    it('no components', () => {
      const bundles: ManifestBundle[] = [];
      const entries = getUserConfigBundles(bundles);
      expect(entries).toHaveLength(0);
    });

    it('no bundles', () => {
      const entries = getUserConfigBundles(null);
      expect(entries).toHaveLength(0);
    });

  });

});
