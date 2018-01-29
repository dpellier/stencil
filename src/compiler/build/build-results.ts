import { BuildBundle, BuildComponent, BuildCtx, BuildResults, BuildStats, CompilerCtx, Config } from '../../declarations';
import { cleanDiagnostics } from '../../util/logger/logger-util';
import { DEFAULT_STYLE_MODE } from '../../util/constants';
import { hasError, pathJoin } from '../util';


export function generateBuildResults(compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  // create the build results that get returned
  const buildResults: BuildResults = {
    buildId: buildCtx.buildId,
    diagnostics: cleanDiagnostics(buildCtx.diagnostics),
    hasError: hasError(buildCtx.diagnostics),
    aborted: buildCtx.aborted,
    duration: Date.now() - buildCtx.startTime,
    isRebuild: compilerCtx.isRebuild,
    transpileBuildCount: buildCtx.transpileBuildCount,
    bundleBuildCount: buildCtx.bundleBuildCount,
    hasChangedJsText: buildCtx.hasChangedJsText,
    filesWritten: buildCtx.filesWritten.sort(),
    filesChanged: buildCtx.filesChanged.slice().sort(),
    filesUpdated: buildCtx.filesUpdated.slice().sort(),
    filesAdded: buildCtx.filesAdded.slice().sort(),
    filesDeleted: buildCtx.filesDeleted.slice().sort(),
    dirsAdded: buildCtx.dirsAdded.slice().sort(),
    dirsDeleted: buildCtx.dirsDeleted.slice().sort(),
  };

  return buildResults;
}


export async function generateBuildStats(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  if (!config.writeStats || buildCtx.aborted || hasError(buildCtx.diagnostics)) {
    return;
  }

  try {
    const stats: BuildStats = {
      compiler: {
        name: config.sys.compiler.name,
        version: config.sys.compiler.version
      },

      entries: buildCtx.entryPoints.map(ep => {
        return ep.map(ec => {
          const buildCmp: BuildComponent = {
            tag: ec.tag,
            dependencyOf: ec.dependencyOf.slice().sort()
          };
          return buildCmp;
        }).sort((a, b) => {
          if (a.tag < b.tag) return -1;
          if (a.tag > b.tag) return 1;
          return 0;
        });
      }).sort((a, b) => {
        if (a[0].tag < b[0].tag) return -1;
        if (a[0].tag > b[0].tag) return 1;
        return 0;
      }),

      bundles: buildCtx.entryModules.map(en => {
        const buildEntry: BuildBundle = {
          components: (en.moduleFiles || []).map(m => m.cmpMeta.tagNameMeta).sort(),

          outputFiles: (en.outputFileNames || []).map(outputFileName => {
            return {
              filePath: pathJoin(config, config.sys.path.relative(config.rootDir, outputFileName))
            };
          }).sort((a, b) => {
            if (a.filePath < b.filePath) return -1;
            if (a.filePath > b.filePath) return 1;
            return 0;
          }),

          inputFiles: (en.moduleFiles || []).map(m => {
            return {
              filePath: pathJoin(config, config.sys.path.relative(config.rootDir, m.jsFilePath))
            };
          }).sort((a, b) => {
            if (a.filePath < b.filePath) return -1;
            if (a.filePath > b.filePath) return 1;
            return 0;
          })
        };

        const modes = en.modeNames.slice();
        if (modes.length > 1 || (modes.length === 1 && modes[0] !== DEFAULT_STYLE_MODE)) {
          buildEntry.modes = modes.sort();
        }

        return buildEntry;
      })
    };

    await compilerCtx.fs.writeFile(config.buildStatsFilePath, JSON.stringify(stats, null, 2));
    await compilerCtx.fs.commit();

  } catch (e) {}

}
