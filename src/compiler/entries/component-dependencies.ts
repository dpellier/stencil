import { CompilerCtx, Config, ModuleFile } from '../../declarations';


export async function setComponentGraphs(compilerCtx: CompilerCtx, allModuleFiles: ModuleFile[]) {
  const appTags = getAppTags(allModuleFiles);

  await Promise.all(allModuleFiles.map(async moduleFile => {
    await setComponentGraph(compilerCtx, appTags, moduleFile);
  }));
}


async function setComponentGraph(compilerCtx: CompilerCtx, appTags: string[], moduleFile: ModuleFile) {
  const foundTags = await findComponentDepsInFile(compilerCtx, appTags, moduleFile.jsFilePath);

  moduleFile.cmpMeta.componentGraph = foundTags.filter(t => t !== moduleFile.cmpMeta.tagNameMeta);
}


export async function getRootHtmlTags(config: Config, compilerCtx: CompilerCtx, allModuleFiles: ModuleFile[]) {
  if (!config.generateWWW || !config.srcIndexHtml) return [];

  const appTags = getAppTags(allModuleFiles);

  return await findComponentDepsInFile(compilerCtx, appTags, config.srcIndexHtml);
}


export async function findComponentDepsInFile(compilerCtx: CompilerCtx, appTags: string[], filePath: string) {
  const content = await compilerCtx.fs.readFile(filePath);
  return findComponentDeps(appTags, content);
}


export function findComponentDeps(appTags: string[], content: string) {
  content = normalizeContent(content);

  const foundTags: string[] = [];
  appTags.forEach(tag => {
    if (content.includes('|' + tag + '~')) {
      foundTags.push(tag);

    } else if (content.includes('|' + tag + '|')) {
      foundTags.push(tag);
    }
  });

  return foundTags.sort();
}


export function normalizeContent(c: string) {
  c = c.toLowerCase().replace(/\s/g, '~');
  c = c.replace(/\/\//g, '_');
  return c.toLowerCase().replace(HTML_CHARS_REGEX, '|')
}

const HTML_CHARS_REGEX = /<|>|\/|\'|\"|\`/g;


function getAppTags(allModuleFiles: ModuleFile[]) {
  return allModuleFiles.filter(m => m.cmpMeta).map(m => m.cmpMeta.tagNameMeta).sort();
}
