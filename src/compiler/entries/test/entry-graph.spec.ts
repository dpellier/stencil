import { ConfigBundle, EntryModule, ModuleFile } from '../../../declarations';
import { getAppEntryGraph, getEntryGraphByTag } from '../entry-graph';
import { ENCAPSULATION } from '../../../util/constants';


describe('entry graph', () => {

  describe('getEntryGraph', () => {

    it('circular', () => {
      const tag = 'cmp-a';
      const tags = getEntryGraphByTag([
        { cmpMeta: { tagNameMeta: 'cmp-a', componentGraph: ['cmp-b'] } },
        { cmpMeta: { tagNameMeta: 'cmp-b', componentGraph: ['cmp-a', 'cmp-c'] } },
        { cmpMeta: { tagNameMeta: 'cmp-c', componentGraph: ['cmp-d'] } },
        { cmpMeta: { tagNameMeta: 'cmp-d', componentGraph: ['cmp-a', 'cmp-b', 'cmp-c'] } }
      ], tag);
      expect(tags).toHaveLength(4);
    });

    it('no dups', () => {
      const tag = 'cmp-a';
      const tags = getEntryGraphByTag([
        { cmpMeta: { tagNameMeta: 'cmp-a', componentGraph: ['cmp-b', 'cmp-c', 'cmp-d'] } },
        { cmpMeta: { tagNameMeta: 'cmp-b', componentGraph: ['cmp-c'] } },
        { cmpMeta: { tagNameMeta: 'cmp-c', componentGraph: ['cmp-d'] } },
        { cmpMeta: { tagNameMeta: 'cmp-d' } }
      ], tag);
      expect(tags).toHaveLength(4);
    });

    it('simple graph', () => {
      const tag = 'cmp-a';
      const tags = getEntryGraphByTag([
        { cmpMeta: { tagNameMeta: 'cmp-a', componentGraph: ['cmp-b'] } },
        { cmpMeta: { tagNameMeta: 'cmp-b', componentGraph: ['cmp-c'] } },
        { cmpMeta: { tagNameMeta: 'cmp-c', componentGraph: ['cmp-d'] } },
        { cmpMeta: { tagNameMeta: 'cmp-d' } }
      ], tag);
      expect(tags).toHaveLength(4);
    });

    it('no sub graph', () => {
      const tag = 'cmp-a';
      const tags = getEntryGraphByTag([
        { cmpMeta: { tagNameMeta: 'cmp-a' } }
      ], tag);
      expect(tags).toHaveLength(1);
    });

  });

});
