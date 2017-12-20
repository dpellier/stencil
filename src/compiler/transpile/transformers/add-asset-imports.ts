import { ComponentMeta, ModuleFiles } from '../../../util/interfaces';
import * as ts from 'typescript';


/**
 * 1) Add static "properties" from previously gathered component metadata
 * 2) Add static "encapsulation"
 * 3) Add static "host"
 * 4) Add static "events"
 * 5) Add static "style"
 * 6) Add static "styleId"
 * 7) Add h() fn: const { h } = Namespace;
 * 8) Export component class with tag names as PascalCase
 */


export default function addAssetImports(moduleFiles: ModuleFiles): ts.TransformerFactory<ts.SourceFile> {
  return () => {
    function visitFile(tsSourceFile: ts.SourceFile, cmpMeta: ComponentMeta) {

      if (cmpMeta.stylesMeta) {
        const styleImports = Object.keys(cmpMeta.stylesMeta).map(sm => {
          return cmpMeta.stylesMeta[sm].originalComponentPaths.map(ocp => {
            return ts.createImportDeclaration(
              undefined,
              undefined,
              ts.createImportClause(ts.createIdentifier('styles'), undefined),
              ts.createLiteral(ocp)
            );
          });
        });
      }

      tsSourceFile.statements = ts.createNodeArray([
        importDeclaration,
        ...tsSourceFile.statements
      ]);

      return tsSourceFile;
    }

    return (tsSourceFile) => {
      const moduleFile = moduleFiles[tsSourceFile.fileName];
      if (moduleFile && moduleFile.cmpMeta) {
        return visitFile(tsSourceFile, moduleFile.cmpMeta) as ts.SourceFile;
      }
      return tsSourceFile;
    };
  };
}
