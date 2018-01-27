import { ModuleFile } from '../../declarations';


export function createCommonComponentEntries(
  userConfigEntryModulesTags: string[][],
  rootHtmlEntryTags: string[],
  appEntryTags: string[]
) {
  let entryModulesTags: string[][] = [
    ...userConfigEntryModulesTags
  ];

  // remove tags already found in the user config
  rootHtmlEntryTags = rootHtmlEntryTags.filter(tag => {
    return !entryModulesTags.some(ct => ct.some(t => t === tag));
  });
  entryModulesTags.push(rootHtmlEntryTags);

  // remove any tags already found in user config and root html
  appEntryTags = appEntryTags.filter(tag => {
    return !entryModulesTags.some(ct => ct.some(t => t === tag));
  });
  entryModulesTags.push(appEntryTags);

  entryModulesTags = prioritizeEntryTags(entryModulesTags);

  return entryModulesTags;
}


export function prioritizeEntryTags(entryModulesTags: string[][]) {
  const addedTags: string[] = [];
  const prioritized: string[][] = [];

  entryModulesTags.forEach(entryTags => {
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


export function getEntryGraphByTag(allModules: ModuleFile[], tag: string) {
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
