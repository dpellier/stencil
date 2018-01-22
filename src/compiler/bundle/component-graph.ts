import { BuildCtx, CompilerCtx, Config, ModuleFile } from '../../declarations';
import { catchError } from '../util';
import { DepGraph } from 'dependency-graph';


export async function generateComponentGraph(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  const timespan = config.logger.createTimeSpan(`component graph started`, true);

  try {
    const appTags = getTags(buildCtx);

    const rootTagsPromise = getRootComponentTags(config, compilerCtx, appTags);

    const cmpTagsPromise = Promise.all(buildCtx.manifest.modulesFiles.map(moduleFile => {
      return findComponentTags(compilerCtx, appTags, moduleFile);
    }));

    const results = await Promise.all([
      rootTagsPromise,
      cmpTagsPromise
    ]);

    calcDepGraph(results[0], results[1]);

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }

  timespan.finish(`component graph finished`);
}


function calcDepGraph(rootTags: string[], moduleFiles: ModuleFile[]) {
  const graph = new (DepGraph as any)({ circular: true });

  graph.addNode('root');

  moduleFiles.forEach(moduleFile => {
    graph.addNode(moduleFile.cmpMeta.tagNameMeta);
  });

  rootTags.forEach(rootDepTag => {
    graph.addDependency('root', rootDepTag);
  });

  moduleFiles.forEach(moduleFile => {
    moduleFile.cmpMeta.componentGraph.forEach(depTag => {
      graph.addDependency(moduleFile.cmpMeta.tagNameMeta, depTag);
    });
  });

  console.log(graph.overallOrder());
}


export async function getRootComponentTags(config: Config, compilerCtx: CompilerCtx, appTags: string[]) {
  if (!config.generateWWW || !config.srcIndexHtml) {
    return [];
  }

  return await findAppComponentTags(compilerCtx, appTags, config.srcIndexHtml);
}


export async function findAppComponentTags(compilerCtx: CompilerCtx, appTags: string[], filePath: string) {
  const content = await normalizeContent(compilerCtx, filePath);
  const foundTags: string[] = [];

  appTags.forEach(appTag => {
    const tagFinder = NORMALIZE_CHAR + appTag + NORMALIZE_CHAR;
    if (content.includes(tagFinder)) {
      foundTags.push(appTag);
    }
  });

  return foundTags.sort();
}


export async function findComponentTags(compilerCtx: CompilerCtx, tags: string[], moduleFile: ModuleFile): Promise<ModuleFile> {
  const foundTags = await findAppComponentTags(compilerCtx, tags, moduleFile.jsFilePath);

  moduleFile.cmpMeta.componentGraph = foundTags.filter(t => t !== moduleFile.cmpMeta.tagNameMeta);

  return moduleFile;
}


function getTags(buildCtx: BuildCtx) {
  return buildCtx.manifest.modulesFiles.filter(m => m.cmpMeta).map(m => {
    return m.cmpMeta.tagNameMeta;
  });
}


async function normalizeContent(compilerCtx: CompilerCtx, filePath: string) {
  const content = await compilerCtx.fs.readFile(filePath);

  return NORMALIZE_CHAR + content.replace(NORMALIZER_REGEX, NORMALIZE_CHAR) + NORMALIZE_CHAR;
}


const NORMALIZER_REGEX = /<|>|\s|\'|\"|\`/g;
const NORMALIZE_CHAR = '#';
