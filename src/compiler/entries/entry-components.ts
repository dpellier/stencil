import { EntryPoint, ModuleFile } from '../../declarations';
import { processAppGraph } from './app-graph';


export function generateComponentEntries(
  allModules: ModuleFile[],
  userConfigEntryPoints: EntryPoint[],
  rootHtmlEntryTags: string[],
  appEntryTags: string[]
) {
  // user config entry modules you leave as is
  // whatever the user put in the bundle is how it goes
  const entryPoints: EntryPoint[] = [
    ...userConfigEntryPoints
  ];

  // process all of the tags and deps of tags
  // found in the root html file
  rootHtmlEntryTags = processRootHtmlEntryTags(allModules, entryPoints, rootHtmlEntryTags);
  entryPoints.push(rootHtmlEntryTags);

  // process all of the app's components not already found
  // in the config or the root html
  const appEntries = processAppComponentEntryTags(allModules, entryPoints, appEntryTags);
  entryPoints.push(...appEntries);

  return entryPoints;
}


export function processAppComponentEntryTags(allModules: ModuleFile[], entryModulesTags: EntryPoint[], appEntryTags: string[]) {
  // remove any tags already found in user config and root html
  appEntryTags = appEntryTags.filter(tag => !entryModulesTags.some(m => m.includes(tag)));

  return processAppGraph(allModules, appEntryTags);
}


export function processRootHtmlEntryTags(allModules: ModuleFile[], entryModulesTags: EntryPoint[], rootHtmlEntryTags: string[]) {
  // remove tags from the root html entry tags
  // that were already marked as used
  rootHtmlEntryTags = rootHtmlEntryTags.filter(tag => !entryModulesTags.some(m => m.includes(tag)));

  // build up the array of every dependency used by these tags
  return rootHtmlEntryTags.reduce((tags, tag) => {
    const depTags = getDeepDependencies(allModules, tag);
    depTags.forEach(tag => {
      if (entryModulesTags.some(m => m.includes(tag))) return;
      if (tags.includes(tag)) return;
      tags.push(tag);
    });
    return tags;
  }, [] as string[]).sort();
}


export function getDeepDependencies(allModules: ModuleFile[], tag: string) {
  const tags: string[] = [];
  const inspected: string[] = [];

  function dig(tag: string) {
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

    if (depModule.cmpMeta && depModule.cmpMeta.dependencies) {
      depModule.cmpMeta.dependencies.forEach(dig);
    }
  }

  dig(tag);

  return tags.sort();
}
