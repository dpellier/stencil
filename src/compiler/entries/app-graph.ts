import { EntryPoint, ModuleFile } from '../../declarations';


export function processAppGraph(allModules: ModuleFile[], entryTags: string[]) {
  const graph = getGraph(allModules, entryTags);

  const entryPoints: EntryPoint[] = [];

  for (const graphEntry of graph) {
    if (entryPoints.some(en => en.includes(graphEntry.tag))) {
      continue;
    }

    const depsOf = graph.filter(d => d.dependencies.includes(graphEntry.tag));
    if (depsOf.length > 1) {
      const common: string[] = [];

      depsOf.forEach(depOf => {
        depOf.dependencies.forEach(depTag => {
          if (!common.includes(depTag) &&
              depsOf.every(d => d.dependencies.includes(depTag))) {
            common.push(depTag);
          }
        });
      });

      const existingEntryPoint = entryPoints.find(ep => {
        return ep.some(epTag => common.includes(epTag));
      });

      if (existingEntryPoint) {
        common.forEach(tag => {
          if (!existingEntryPoint.includes(tag)) {
            existingEntryPoint.push(tag);
          }
        });

      } else {
        entryPoints.push(common);
      }

    } else if (depsOf.length === 1) {
      const existingEntryPoint = entryPoints.find(en => en.includes(depsOf[0].tag));
      if (existingEntryPoint) {
        existingEntryPoint.push(graphEntry.tag);

      } else {
        entryPoints.push([depsOf[0].tag, graphEntry.tag]);
      }

    } else {
      entryPoints.push([graphEntry.tag]);
    }
  }

  entryPoints.forEach(entryPoint => {
    entryPoint.sort();
  });

  entryPoints.sort((a, b) => {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  });

  return entryPoints;
}


function getGraph(allModules: ModuleFile[], entryTags: string[]) {
  const graph: { tag: string; dependencies: string[]; }[] = [];

  function addDeps(tag: string) {
    if (graph.some(d => d.tag === tag)) {
      return;
    }

    const m = allModules.find(m => m.cmpMeta && m.cmpMeta.tagNameMeta === tag);
    if (!m) {
      throw new Error(`processAppGraph, unable to find tag: ${tag}`);
    }
    m.cmpMeta.dependencies = (m.cmpMeta.dependencies || []);

    const dependencies = m.cmpMeta.dependencies.filter(t => t !== tag);

    graph.push({
      tag: tag,
      dependencies: dependencies
    });

    dependencies.forEach(addDeps);
  }

  entryTags.forEach(addDeps);

  return graph;
}
