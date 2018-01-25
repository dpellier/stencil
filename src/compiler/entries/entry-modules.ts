import { BuildCtx, CompilerCtx, Config, EntryModule, ManifestBundle, ModuleFile } from '../../declarations';
import { getRootHtmlTags, setComponentGraphs } from './component-dependencies';


export async function generateEntryModules(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  const allModules = buildCtx.manifest.modulesFiles;

  await setComponentGraphs(compilerCtx, allModules);

  const userConfigEntries = getUserConfigBundles(config.bundles);

  const rootHtmlEntries = await getRootHtmlEntries(config, compilerCtx, allModules);

  const appComponentEntries = getAppComponentEntries(allModules);

  let entries = [
    ...userConfigEntries,
    ...rootHtmlEntries,
    ...appComponentEntries
  ];

  entries = prioritizedEntries(entries);

  return entries.map(tags => {
    const entryModule: EntryModule = tags.map(tag => {
      return allModules.find(m => m.cmpMeta && m.cmpMeta.tagNameMeta === tag);
    });
    return entryModule;
  });
}


export function prioritizedEntries(entries: string[][]) {
  const addedTags: string[] = [];
  const prioritized: string[][] = [];

  entries.forEach(entryTags => {
    const cleanedTags: string[] = [];

    entryTags.forEach(entryTag => {
      if (!addedTags.includes(entryTag)) {
        cleanedTags.push(entryTag);
        addedTags.push(entryTag);
      }
    });

    if (cleanedTags.length > 0) {
      prioritized.push(cleanedTags.sort());
    }
  });

  return prioritized;
}


export function getEntryGraph(allModules: ModuleFile[], tag: string) {
  const tags: string[] = [];
  const inspected: string[] = [];

  function graph(tag: string) {
    if (!tag) return;

    if (inspected.includes(tag)) return;
    inspected.push(tag);

    const depModule = allModules.find(m => {
      return m.cmpMeta && m.cmpMeta.tagNameMeta === tag;
    });
    if (!depModule) return;

    const alreadyHasTag = tags.some(t => t === depModule.cmpMeta.tagNameMeta);
    if (!alreadyHasTag) {
      tags.push(tag);
    }

    if (depModule.cmpMeta && depModule.cmpMeta.componentGraph) {
      depModule.cmpMeta.componentGraph.forEach(graph);
    }
  }

  graph(tag);

  return tags.sort();
}


export function getAppComponentEntries(allModules: ModuleFile[]) {
  const appModules = allModules.filter(m => {
    return m.cmpMeta && !m.isCollectionDependency;
  });

  const entries = appModules.map(m => {
    return getEntryGraph(allModules, m.cmpMeta.tagNameMeta);
  });

  entries.sort((a, b) => {
    if (a.length < b.length) return 1;
    if (a.length > b.length) return -1;
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  });

  return entries;
}


export async function getRootHtmlEntries(config: Config, compilerCtx: CompilerCtx, allModules: ModuleFile[]) {
  const rootTags = await getRootHtmlTags(config, compilerCtx, allModules);
  return [rootTags];
}


export function getUserConfigBundles(bundles: ManifestBundle[]) {
  bundles = (bundles || [])
    .filter(b => b.components && b.components.length > 0)
    .sort((a, b) => {
      if (a.components.length < b.components.length) return 1;
      if (a.components.length > b.components.length) return -1;
      if (a.components[0] < b.components[0]) return -1;
      if (a.components[0] > b.components[0]) return 1;
      return 0;
    });

  return bundles.map(b => {
    return b.components.slice().sort();
  });
}
