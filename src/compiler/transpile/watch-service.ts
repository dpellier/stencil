import { BuildConfig, BuildContext, Diagnostic, ModuleFile, ModuleFiles, TranspileModulesResults, TranspileResults } from '../../util/interfaces';
import { removeImports } from './transformers/remove-imports';
import { removeDecorators } from './transformers/remove-decorators';
import renameLifecycleMethods from './transformers/rename-lifecycle-methods';
import { updateFileMetaFromSlot, updateModuleFileMetaFromSlot } from './transformers/vnode-slots';
import { gatherMetadata } from './datacollection/index';
import { normalizeAssetsDir } from '../component-plugins/assets-plugin';
import { normalizeStyles } from './normalize-styles';

import * as ts from 'typescript';
import * as fs from 'fs';

function createWatchResponder(config: BuildConfig, moduleFiles: ModuleFiles, options: ts.CompilerOptions) {
  let files: ts.MapLike<{ version: number }> = {};

  const rootFileNames = Object.keys(moduleFiles);

  // initialize the list of files
  files = rootFileNames.reduce((allFiles, fileName) => {
    allFiles[fileName] = { version: 0 };
    return allFiles;
  }, files);

  // Create the language service host to allow the LS to communicate with the host
  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => rootFileNames,
    getScriptVersion: (fileName) => files[fileName] && files[fileName].version.toString(),
    getScriptSnapshot: (fileName) => {
      if (!fs.existsSync(fileName)) {
          return undefined;
      }

      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    getCustomTransformers: () => {
      return {
        before: [
          removeDecorators(),
          removeImports(),
          renameLifecycleMethods()
        ],
        after: [
          updateFileMetaFromSlot(moduleFiles)
        ]
      };
    }
  };

  // Create the language service files
  const services = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());

  // Get metadata
  const checkProgram = services.getProgram();
  const metadata = gatherMetadata(checkProgram.getTypeChecker(), checkProgram.getSourceFiles());

  Object.keys(metadata).forEach(tsFilePath => {
    moduleFiles[tsFilePath].cmpMeta = metadata[tsFilePath];
    moduleFiles[tsFilePath].cmpMeta.stylesMeta = normalizeStyles(config, tsFilePath, metadata[tsFilePath].stylesMeta);
    moduleFiles[tsFilePath].cmpMeta.assetsDirsMeta = normalizeAssetsDir(config, tsFilePath, metadata[tsFilePath].assetsDirsMeta);
  });

  function updateMetadata() {

  }

  // First time around, emit all files
  rootFileNames.forEach(fileName => {
    emitFile(fileName);
  });

  function fileChangedCallback(fileName, curr, prev) {
    // Check timestamp
    if (+curr.mtime <= +prev.mtime) {
        return;
    }

    // Update the version to signal a change in the file
    files[fileName].version++;

    // write the changes to disk
    emitFile(fileName);
  }

  function emitFile(fileName: string) {
    let output = services.getEmitOutput(fileName);

    if (!output.emitSkipped) {
      console.log(`Emitting ${fileName}`);
    } else {
      console.log(`Emitting ${fileName} failed`);
      logErrors(fileName);
    }

    output.outputFiles.forEach(o => {
      fs.writeFileSync(o.name, o.text, { encoding: 'utf8' });
    });
  }

  function logErrors(fileName: string) {
    let allDiagnostics = services.getCompilerOptionsDiagnostics()
      .concat(services.getSyntacticDiagnostics(fileName))
      .concat(services.getSemanticDiagnostics(fileName));

    allDiagnostics.forEach(diagnostic => {
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      if (diagnostic.file) {
          let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
          console.log(`  Error ${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
      } else {
          console.log(`  Error: ${message}`);
      }
    });
  }
}
