import { BuildCtx, CompilerCtx, Config, EntryModule, Manifest } from '../../declarations';
import { CompilerUpgrade, validateManifestCompatibility } from './manifest-compatibility';
import { transformSourceString } from '../transpile/transformers/util';
import { removeStencilImports } from '../transpile/transformers/remove-stencil-imports';
import upgradeFrom0_0_5 from '../transpile/transformers/JSX_Upgrade_From_0_0_5/upgrade-jsx-props';
import upgradeFromMetadata from '../transpile/transformers/Metadata_Upgrade_From_0_1_0/metadata-upgrade';
import ts from 'typescript';


export async function upgradeDependentComponents(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  if (!buildCtx.requiresFullBuild) {
    // if this doesn't require a full build then no need to do it again
    return;
  }

  const timeSpan = config.logger.createTimeSpan(`upgradeDependentComponents started`, true);

  const doUpgrade = createDoUpgrade(config, compilerCtx, buildCtx.entryModules);

  await Promise.all(compilerCtx.dependentManifests.map(async dependentManifest => {
    const upgrades = validateManifestCompatibility(config, dependentManifest);

    try {
      await doUpgrade(dependentManifest, upgrades);
    } catch (e) {
      config.logger.error(`error performing compiler upgrade: ${e}`);
    }
  }));

  timeSpan.finish(`upgradeDependentComponents finished`);
}


function createDoUpgrade(config: Config, compilerCtx: CompilerCtx, entryModules: EntryModule[]) {

  return async (manifest: Manifest, upgrades: CompilerUpgrade[]): Promise<void> => {
    const upgradeTransforms: ts.TransformerFactory<ts.SourceFile>[] = (upgrades.map((upgrade) => {
      switch (upgrade) {
        case CompilerUpgrade.JSX_Upgrade_From_0_0_5:
          config.logger.debug(`JSX_Upgrade_From_0_0_5, manifestCompilerVersion: ${manifest.compiler.version}`);
          return upgradeFrom0_0_5 as ts.TransformerFactory<ts.SourceFile>;

        case CompilerUpgrade.Metadata_Upgrade_From_0_1_0:
          config.logger.debug(`Metadata_Upgrade_From_0_1_0, manifestCompilerVersion: ${manifest.compiler.version}`);
          return () => {
            return upgradeFromMetadata(entryModules);
          };

        case CompilerUpgrade.REMOVE_STENCIL_IMPORTS:
          config.logger.debug(`REMOVE_STENCIL_IMPORTS, manifestCompilerVersion: ${manifest.compiler.version}`);
          return (transformContext: ts.TransformationContext) => {
            return removeStencilImports()(transformContext);
          };
      }
      return () => (tsSourceFile: ts.SourceFile) => (tsSourceFile);
    }));

    if (upgradeTransforms.length === 0) {
      return;
    }

    await Promise.all(manifest.modulesFiles.map(async moduleFile => {

      try {
        const source = await compilerCtx.fs.readFile(moduleFile.jsFilePath);
        const output = await transformSourceString(moduleFile.jsFilePath, source, upgradeTransforms);
        await compilerCtx.fs.writeFile(moduleFile.jsFilePath, output, { inMemoryOnly: true });

      } catch (e) {
        config.logger.error(`error performing compiler upgrade on ${moduleFile.jsFilePath}: ${e}`);
      }

    }));
  };
}
