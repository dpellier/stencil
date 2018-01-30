import { BuildCtx, CompilerCtx, Config } from '../../declarations';
import { catchError } from '../util';
import { generateBundleModule } from './bundle-module';


export async function bundleModules(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  if (config.generateWWW) {
    config.logger.debug(`bundle, buildDir: ${config.buildDir}`);
  }

  if (config.generateDistribution) {
    config.logger.debug(`bundle, distDir: ${config.distDir}`);
  }

  const timeSpan = config.logger.createTimeSpan(`bundling started`, true);

  try {
    // kick off bundling
    await Promise.all(buildCtx.entryModules.map(async entryModule => {
      await generateBundleModule(config, compilerCtx, buildCtx, entryModule);
    }));

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }

  timeSpan.finish(`bundling finished`);
}
