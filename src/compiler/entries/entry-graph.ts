import { ModuleFile } from '../../declarations';


export function createCommonComponentEntries(
  userConfigEntryModulesTags: string[][],
  rootHtmlEntryTags: string[],
  appEntryTags: string[]
) {
  const entryModulesTags: string[][] = [];

  // remove tags already found in the user config
  rootHtmlEntryTags = rootHtmlEntryTags.filter(tag => {
    return !userConfigEntryModulesTags.some(ct => ct.some(t => t === tag));
  });

  appEntryTags = appEntryTags.filter(tag => {
    return !userConfigEntryModulesTags.some(ct => ct.some(t => t === tag));
  });


  return entryModulesTags;
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
