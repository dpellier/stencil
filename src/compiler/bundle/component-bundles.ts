import { BuildCtx, Bundle, CompilerCtx, Config, Diagnostic, ManifestBundle, ModuleFile } from '../../declarations';
import { buildError, catchError } from '../util';


export async function generateComponentBundles(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  const timespan = config.logger.createTimeSpan(`component graph started`, true);

  // this is the collection of bundles we figure out and return
  let bundles: Bundle[] = [];

  try {
    // kick off figuring out which components
    // should be bundled together
    // this doesn't actually bundle content together yet
    const allModuleFiles = buildCtx.manifest.modulesFiles;

    // go through each component and figure out which other
    // components it uses so we can figure out the depedency graph
    await setComponentGraphs(compilerCtx, allModuleFiles);

    // let's initialize all of the bundle objects we'll be using
    // to figure out which components go in which bundles
    bundles = await initBundles(config, compilerCtx, buildCtx.diagnostics, allModuleFiles);

    // we've now got a dependency graph of how all the components are related
    // let's go further and figure out exactly what should be bundled together


  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }

  timespan.finish(`component graph finished`);

  return bundles;
}


export async function initBundles(config: Config, compilerCtx: CompilerCtx, diagnostics: Diagnostic[], allModuleFiles: ModuleFile[]) {
  // no matter what, user configured bundles always win
  // if any components are found in a user config bundle
  // then that's just how it is, no figuring out how to bundle those
  let bundles = addUserBundlesFromConfig(config.bundles, diagnostics, allModuleFiles);

  // if this app has an index.html file then another hard constant
  // is to bundle all of the root index.html page components together
  const rootBundle = await addRootBundleFromIndexHtml(config, compilerCtx, allModuleFiles, bundles);
  if (rootBundle) {
    bundles.push(rootBundle);
  }

  // all of this app's components will go in a bundle
  // but this does not include components from collection
  const appComponentBundles = appAppComponentBundles(allModuleFiles, bundles);
  bundles.push(...appComponentBundles);

  bundles = bundles
    .filter(b => b.moduleFiles.length > 0)
    .sort((a, b) => {
      if (a.moduleFiles[0].cmpMeta.tagNameMeta < b.moduleFiles[0].cmpMeta.tagNameMeta) return -1;
      if (a.moduleFiles[0].cmpMeta.tagNameMeta > b.moduleFiles[0].cmpMeta.tagNameMeta) return 1;
      return 0;
    });

  return bundles;
}


export function addUserBundlesFromConfig(userBundles: ManifestBundle[], diagnostics: Diagnostic[], allModuleFiles: ModuleFile[]) {
  const bundles: Bundle[] = [];

  userBundles.sort((a, b) => {
    if (a.components.length > b.components.length) return -1;
    if (a.components.length < b.components.length) return 1;
    return 0;
  });

  // create bundles from the user's provided config.bundles
  userBundles.forEach(configBundle => {
    const bundle: Bundle = { moduleFiles: [] };

    configBundle.components.forEach(tag => {
      const moduleFile = allModuleFiles.find(modulesFile => modulesFile.cmpMeta.tagNameMeta === tag);
      if (moduleFile) {
        if (!bundlesContainsModule(bundles, moduleFile)) {
          bundle.moduleFiles.push(moduleFile);
        }

      } else {
        buildError(diagnostics).messageText = `Component tag "${tag}" is defined in a bundle but no matching component was found within this app or its collections.`;
      }
    });

    bundles.push(bundle);
  });

  return bundles;
}


export async function addRootBundleFromIndexHtml(config: Config, compilerCtx: CompilerCtx, allModuleFiles: ModuleFile[], existingBundles: Bundle[]) {
  if (!config.generateWWW || !config.srcIndexHtml) return null;

  const appTags = getAppTags(allModuleFiles);

  const rootHtmlTags = await findComponentDeps(compilerCtx, appTags, config.srcIndexHtml);
  const rootBundleModules = getBundleGraph(allModuleFiles, rootHtmlTags);

  const bundle: Bundle = {
    moduleFiles: rootBundleModules.reduce((cleanedModules, moduleFile) => {
      if (!bundlesContainsModule(existingBundles, moduleFile)) {
        cleanedModules.push(moduleFile);
      }
      return cleanedModules;
    }, [])
  };

  if (bundle.moduleFiles.length > 0) {
    return bundle;
  }

  return null;
}


export function appAppComponentBundles(allModuleFiles: ModuleFile[], existingBundles: Bundle[]) {
  const appModuleFiles = allModuleFiles.filter(m => m.cmpMeta && !m.isCollectionDependency);

  const allAppBundles = appModuleFiles.map(moduleFile => {
    const bundle: Bundle = {
      moduleFiles: getBundleGraph(allModuleFiles, [moduleFile.cmpMeta.tagNameMeta])
    };
    return bundle;
  });

  allAppBundles.sort((a, b) => {
    if (a.moduleFiles.length > b.moduleFiles.length) return -1;
    if (a.moduleFiles.length < b.moduleFiles.length) return 1;
    return 0;
  });

  const cleanedBundles: Bundle[] = [];

  allAppBundles.forEach(appBundle => {
    const bundle: Bundle = {
      moduleFiles: appBundle.moduleFiles.reduce((cleanedModules, moduleFile) => {
        if (!bundlesContainsModule(existingBundles, moduleFile)) {
          cleanedModules.push(moduleFile);
        }
        return cleanedModules;
      }, [])
    };

    if (bundle.moduleFiles.length > 0) {
      cleanedBundles.push(bundle);
    }
  });

  return cleanedBundles;
}


export function getBundleGraph(allModuleFiles: ModuleFile[], tags: string[]) {
  const depGraph: ModuleFile[] = [];
  const inspected: string[] = [];

  function graph(tag: string) {
    if (inspected.includes(tag)) return;
    inspected.push(tag);

    const depModule = allModuleFiles.find(m => getTag(m) === tag);
    if (!depModule) return;

    const alreadyHasModule = depGraph.some(m => getTag(m) === tag);
    if (!alreadyHasModule) {
      depGraph.push(depModule);
    }

    if (depModule.cmpMeta && depModule.cmpMeta.componentGraph) {
      depModule.cmpMeta.componentGraph.forEach(graph);
    }
  }

  tags.forEach(graph);

  return depGraph.sort((a, b) => {
    if (a.cmpMeta.tagNameMeta < b.cmpMeta.tagNameMeta) return -1;
    if (a.cmpMeta.tagNameMeta > b.cmpMeta.tagNameMeta) return 1;
    return 0;
  });
}

function getTag(moduleFile: ModuleFile) {
  return moduleFile.cmpMeta && moduleFile.cmpMeta.tagNameMeta;
}

function bundlesContainsModule(bundles: Bundle[], moduleFile: ModuleFile) {
  return bundles.some(b => bundleContainsTag(b, getTag(moduleFile)));
}

function bundleContainsTag(bundle: Bundle, tag: string) {
  return bundle.moduleFiles.some(m => getTag(m) === tag);
}


async function setComponentGraphs(compilerCtx: CompilerCtx, allModuleFiles: ModuleFile[]) {
  const appTags = getAppTags(allModuleFiles);

  await Promise.all(allModuleFiles.map(async moduleFile => {
    await setComponentGraph(compilerCtx, appTags, moduleFile);
  }));
}


async function setComponentGraph(compilerCtx: CompilerCtx, appTags: string[], moduleFile: ModuleFile): Promise<ModuleFile> {
  const foundTags = await findComponentDeps(compilerCtx, appTags, moduleFile.jsFilePath);

  moduleFile.cmpMeta.componentGraph = foundTags.filter(t => t !== moduleFile.cmpMeta.tagNameMeta);

  return moduleFile;
}


export async function findComponentDeps(compilerCtx: CompilerCtx, appTags: string[], filePath: string) {
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


function getAppTags(allModuleFiles: ModuleFile[]) {
  return allModuleFiles.filter(m => m.cmpMeta).map(m => getTag(m));
}


async function normalizeContent(compilerCtx: CompilerCtx, filePath: string) {
  const content = await compilerCtx.fs.readFile(filePath);

  return NORMALIZE_CHAR + content.replace(NORMALIZER_REGEX, NORMALIZE_CHAR) + NORMALIZE_CHAR;
}


const NORMALIZER_REGEX = /<|>|\s|\'|\"|\`/g;
const NORMALIZE_CHAR = '#';
