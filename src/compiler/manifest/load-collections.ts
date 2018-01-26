import { BuildCtx, CompilerCtx, Config, Manifest } from '../../declarations';
import { catchError } from '../util';
import { loadDependentManifests } from './load-dependent-manifests';


export async function loadCollectionModules(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  try {
    const dependentManifests = await loadDependentManifests(config, compilerCtx);

    mergeDependentManifests(compilerCtx, dependentManifests);

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }
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
