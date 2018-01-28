import { ModuleFile } from '../../../declarations';
import { processAppGraph } from '../app-graph';


describe('processAppGraph', () => {

  it('circular', () => {
    const allModules: ModuleFile[] = [
      { cmpMeta: { tagNameMeta: 'x', dependencies: ['y', 'x'] } },
      { cmpMeta: { tagNameMeta: 'y', dependencies: ['z', 'z'] } },
      { cmpMeta: { tagNameMeta: 'z', dependencies: ['x'] } },
    ];
    const entryTags = [
      'z', 'x', 'y'
    ];
    const g = processAppGraph(allModules, entryTags);
    expect(g).toEqual([['x', 'y', 'z']]);
  });

  it('random orders 2', () => {
    const allModules: ModuleFile[] = [
      { cmpMeta: { tagNameMeta: 'y', dependencies: ['x', 'w', 'v'] } },
      { cmpMeta: { tagNameMeta: 'v' } },
      { cmpMeta: { tagNameMeta: 'x', dependencies: ['w', 'v'] } },
      { cmpMeta: { tagNameMeta: 'z', dependencies: ['v', 'x', 'w'] } },
      { cmpMeta: { tagNameMeta: 'w' } },
    ];
    const entryTags = [
      'y', 'z'
    ];
    const g = processAppGraph(allModules, entryTags);
    expect(g).toEqual([['v', 'w', 'x'], ['y'], ['z']]);
  });

  it('random orders 1', () => {
    const allModules: ModuleFile[] = [
      { cmpMeta: { tagNameMeta: 'w' } },
      { cmpMeta: { tagNameMeta: 'y', dependencies: ['w', 'x', 'v'] } },
      { cmpMeta: { tagNameMeta: 'x', dependencies: ['w', 'v'] } },
      { cmpMeta: { tagNameMeta: 'v' } },
      { cmpMeta: { tagNameMeta: 'z', dependencies: ['x', 'v', 'w'] } },
      { cmpMeta: { tagNameMeta: 'a' } },
    ];
    const entryTags = [
      'z', 'y', 'z', 'y',
    ];
    const g = processAppGraph(allModules, entryTags);
    expect(g).toEqual([['v', 'w', 'x'], ['y'], ['z']]);
  });

  it('common c,d,e', () => {
    const allModules: ModuleFile[] = [
      { cmpMeta: { tagNameMeta: 'a', dependencies: ['c', 'd', 'e'] } },
      { cmpMeta: { tagNameMeta: 'b', dependencies: ['c', 'd', 'e'] } },
      { cmpMeta: { tagNameMeta: 'c', dependencies: ['d', 'e'] } },
      { cmpMeta: { tagNameMeta: 'd' } },
      { cmpMeta: { tagNameMeta: 'e' } }
    ];
    const entryTags = [
      'a', 'b'
    ];
    const g = processAppGraph(allModules, entryTags);
    expect(g).toEqual([['a'], ['b'], ['c', 'd', 'e']]);
  });

  it('common c,d and b,e', () => {
    const allModules: ModuleFile[] = [
      { cmpMeta: { tagNameMeta: 'a', dependencies: ['c', 'd'] } },
      { cmpMeta: { tagNameMeta: 'b', dependencies: ['c', 'd', 'e'] } },
      { cmpMeta: { tagNameMeta: 'c' } },
      { cmpMeta: { tagNameMeta: 'd' } },
      { cmpMeta: { tagNameMeta: 'e' } }
    ];
    const entryTags = [
      'a', 'b'
    ];
    const g = processAppGraph(allModules, entryTags);
    expect(g).toEqual([['a'], ['b', 'e'], ['c', 'd']]);
  });

  it('common c,d w/ no entry c,d', () => {
    const allModules: ModuleFile[] = [
      { cmpMeta: { tagNameMeta: 'a', dependencies: ['c', 'd'] } },
      { cmpMeta: { tagNameMeta: 'b', dependencies: ['c', 'd'] } },
      { cmpMeta: { tagNameMeta: 'c' } },
      { cmpMeta: { tagNameMeta: 'd' } }
    ];
    const entryTags = [
      'a', 'b'
    ];
    const g = processAppGraph(allModules, entryTags);
    expect(g).toEqual([['a'], ['b'], ['c', 'd']]);
  });

  it('common c,d', () => {
    const allModules: ModuleFile[] = [
      { cmpMeta: { tagNameMeta: 'a', dependencies: ['c', 'd'] } },
      { cmpMeta: { tagNameMeta: 'b', dependencies: ['c', 'd'] } },
      { cmpMeta: { tagNameMeta: 'c' } },
      { cmpMeta: { tagNameMeta: 'd' } }
    ];
    const entryTags = [
      'a', 'b', 'c', 'd'
    ];
    const g = processAppGraph(allModules, entryTags);
    expect(g).toEqual([['a'], ['b'], ['c', 'd']]);
  });

  it('common c, include module not an entry tags', () => {
    const allModules: ModuleFile[] = [
      { cmpMeta: { tagNameMeta: 'a', dependencies: ['c'] } },
      { cmpMeta: { tagNameMeta: 'b', dependencies: ['c'] } },
      { cmpMeta: { tagNameMeta: 'c' } }
    ];
    const entryTags = [
      'a', 'b'
    ];
    const g = processAppGraph(allModules, entryTags);
    expect(g).toEqual([['a'], ['b'], ['c']]);
  });

  it('group three together', () => {
    const allModules: ModuleFile[] = [
      { cmpMeta: { tagNameMeta: 'a', dependencies: ['b'] } },
      { cmpMeta: { tagNameMeta: 'b', dependencies: ['c'] } },
      { cmpMeta: { tagNameMeta: 'c' } }
    ];
    const entryTags = [
      'a', 'b', 'c'
    ];
    const g = processAppGraph(allModules, entryTags);
    expect(g).toEqual([['a', 'b', 'c']]);
  });

  it('exclude modules not used in entry modules', () => {
    const allModules: ModuleFile[] = [
      { cmpMeta: { tagNameMeta: 'a', dependencies: ['b'] } },
      { cmpMeta: { tagNameMeta: 'b' } },
      { cmpMeta: { tagNameMeta: 'c', dependencies: ['d', 'e'] } },
      { cmpMeta: { tagNameMeta: 'd', dependencies: ['e', 'a'] } },
      { cmpMeta: { tagNameMeta: 'e', dependencies: ['b'] } }
    ];
    const entryTags = [
      'a', 'b'
    ];
    const g = processAppGraph(allModules, entryTags);
    expect(g).toEqual([['a', 'b']]);
  });

  it('group two together', () => {
    const allModules: ModuleFile[] = [
      { cmpMeta: { tagNameMeta: 'a', dependencies: ['b'] } },
      { cmpMeta: { tagNameMeta: 'b' } }
    ];
    const entryTags = [
      'a', 'b'
    ];
    const g = processAppGraph(allModules, entryTags);
    expect(g).toEqual([['a', 'b']]);
  });

  it('simple, no deps', () => {
    const allModules: ModuleFile[] = [
      { cmpMeta: { tagNameMeta: 'a' } },
      { cmpMeta: { tagNameMeta: 'b' } },
      { cmpMeta: { tagNameMeta: 'c' } }
    ];
    const entryTags = [
      'a', 'b', 'c'
    ];
    const g = processAppGraph(allModules, entryTags);
    expect(g).toEqual([['a'], ['b'], ['c']]);
  });

});
