import { BuildCtx, CompilerCtx, Config, CopyTask, DependentCollection, Manifest, ModuleFile } from '../../declarations';
import { catchError } from '../util';
import { COLLECTION_DEPENDENCIES_DIR, parseDependentManifest } from './manifest-data';
import { normalizePath } from '../util';
import { upgradeCollection } from './upgrade-collection';


export async function loadCollections(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  if (!buildCtx.requiresFullBuild) {
    return;
  }

  const timeSpan = config.logger.createTimeSpan(`load collections started`, true);

  try {
    const dependentManifests = await loadDependentManifests(config, compilerCtx, buildCtx);

    mergeDependentManifests(compilerCtx, dependentManifests);

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }

  timeSpan.finish(`load collections finished`);
}


export function mergeDependentManifests(compilerCtx: CompilerCtx, dependentManifests: Manifest[]) {
  // the appManifest is the single source of manifest data
  // we need to merge what we've learned about the
  // dependent manifests into the one app manifest object

  dependentManifests.forEach(dependentManifest => {
    // append any dependent manifest data onto the appManifest
    dependentManifest.modulesFiles.forEach(dependentModuleFile => {
      if (!compilerCtx.moduleFiles[dependentModuleFile.jsFilePath]) {
        compilerCtx.moduleFiles[dependentModuleFile.jsFilePath] = dependentModuleFile;
      }
    });
  });
}


export function loadDependentManifests(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx): Promise<Manifest[]> {
  // load up all of the collections which this app is dependent on
  return Promise.all(config.collections.map(configCollection => {
    return loadDependentManifest(config, compilerCtx, buildCtx, configCollection);
  }));
}


async function loadDependentManifest(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, dependentCollection: DependentCollection) {

  let dependentManifest = compilerCtx.dependentManifests.find(m => m.manifestName === dependentCollection.name);
  if (dependentManifest) {
    // we've already cached the manifest, no need for another resolve/readFile/parse
    return dependentManifest;
  }

  // figure out the path to the dependent collection's package.json
  const dependentPackageJsonFilePath = config.sys.resolveModule(config.rootDir, dependentCollection.name);

  // parse the dependent collection's package.json
  const packageJsonStr = await compilerCtx.fs.readFile(dependentPackageJsonFilePath);
  const packageData = JSON.parse(packageJsonStr);

  // verify this package has a "collection" property in its package.json
  if (!packageData.collection) {
    throw new Error(`stencil collection "${dependentCollection.name}" is missing the "collection" key from its package.json: ${dependentPackageJsonFilePath}`);
  }

  // get the root directory of the dependency
  const dependentPackageRootDir = config.sys.path.dirname(dependentPackageJsonFilePath);

  // figure out the full path to the collection manifest file
  const dependentManifestFilePath = normalizePath(
    config.sys.path.join(dependentPackageRootDir, packageData.collection)
  );

  config.logger.debug(`load colleciton: ${dependentManifestFilePath}`);

  // we haven't cached the dependent manifest yet, let's read this file
  const dependentManifestJson = await compilerCtx.fs.readFile(dependentManifestFilePath);

  // get the directory where the collection manifest file is sitting
  const dependentManifestDir = normalizePath(config.sys.path.dirname(dependentManifestFilePath));

  // parse the json string into our Manifest data
  dependentManifest = parseDependentManifest(
    config,
    dependentCollection.name,
    dependentCollection.includeBundledOnly,
    dependentManifestDir,
    dependentManifestJson
  );

  // Look at all dependent components from outside collections and
  // upgrade the components to be compatible with this version if need be
  await upgradeCollection(config, compilerCtx, buildCtx, dependentManifest);

  await copySourceCollectionComponentsToDistribution(config, compilerCtx, dependentManifest.modulesFiles);

  // cache it for later yo
  compilerCtx.dependentManifests.push(dependentManifest);

  // so let's recap: we've read the file, parsed it apart, and cached it, congrats
  return dependentManifest;
}


async function copySourceCollectionComponentsToDistribution(config: Config, compilerCtx: CompilerCtx, modulesFiles: ModuleFile[]) {
  // for any components that are dependencies, such as ionicons is a dependency of ionic
  // then we need to copy the dependency to the dist so it just works downstream

  const copyTasks: CopyTask[] = [];

  const collectionModules = modulesFiles.filter(m => m.isCollectionDependency && m.originalCollectionComponentPath);

  collectionModules.forEach(m => {
    copyTasks.push({
      src: m.jsFilePath,
      dest: config.sys.path.join(
        config.collectionDir,
        COLLECTION_DEPENDENCIES_DIR,
        m.originalCollectionComponentPath
      )
    });

    if (m.cmpMeta && m.cmpMeta.stylesMeta) {
      const modeNames = Object.keys(m.cmpMeta.stylesMeta);
      modeNames.forEach(modeName => {
        const styleMeta = m.cmpMeta.stylesMeta[modeName];

        if (styleMeta.externalStyles) {
          styleMeta.externalStyles.forEach(externalStyle => {
            copyTasks.push({
              src: externalStyle.absolutePath,
              dest: config.sys.path.join(
                config.collectionDir,
                COLLECTION_DEPENDENCIES_DIR,
                externalStyle.originalCollectionPath
              )
            });
          });
        }
      });
    }

  });

  await Promise.all(copyTasks.map(async copyTask => {
    await compilerCtx.fs.copy(copyTask.src, copyTask.dest);
  }));
}
