import { convertValueToLiteral, getImportNameMapFromStyleMeta, styleImport } from './util';
import { ComponentMeta, ModuleFiles } from '../../../util/interfaces';
import { formatComponentConstructorProperties } from '../../../util/data-serialize';
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


export default function addComponentMetadata(moduleFiles: ModuleFiles): ts.TransformerFactory<ts.SourceFile> {

  return (transformContext) => {
    function visitClass(classNode: ts.ClassDeclaration, cmpMeta: ComponentMeta) {
      if (!cmpMeta) {
        return classNode;
      }

      const constructorMeta = formatComponentConstructorProperties(cmpMeta.membersMeta);
      const styleMeta = Object.keys(cmpMeta.stylesMeta)
        .reduce((all, smn) => {
          return all.concat(getImportNameMapFromStyleMeta(cmpMeta.stylesMeta[smn]));
        }, [] as styleImport[])
        .map(obj => obj.importName);

      const newMembers = [
        createGetter('is', convertValueToLiteral(cmpMeta.tagNameMeta)),
        createGetter('encapsulation', convertValueToLiteral(cmpMeta.encapsulation)),
        createGetter('host', convertValueToLiteral(cmpMeta.hostMeta)),
        createGetter('events', convertValueToLiteral(cmpMeta.eventsMeta)),
        createGetter('properties', convertValueToLiteral(constructorMeta)),
        createGetter('style', ts.createArrayLiteral(
          styleMeta.map(sm => ts.createIdentifier(sm))
        ))
      ];

      return ts.updateClassDeclaration(
        classNode,
        classNode.decorators,
        classNode.modifiers,
        classNode.name,
        classNode.typeParameters,
        classNode.heritageClauses,
        [ ...classNode.members, ...newMembers]
      );
    }

    function visit(node: ts.Node, cmpMeta: ComponentMeta): ts.VisitResult<ts.Node> {
      switch (node.kind) {
        case ts.SyntaxKind.ClassDeclaration:
          return visitClass(node as ts.ClassDeclaration, cmpMeta);
        default:
          return ts.visitEachChild(node, (node) => {
            return visit(node, cmpMeta);
          }, transformContext);
      }
    }

    return (tsSourceFile) => {
      const moduleFile = moduleFiles[tsSourceFile.fileName];
      const metadata = moduleFile ? moduleFile.cmpMeta : null;
      return visit(tsSourceFile, metadata) as ts.SourceFile;
    };
  };
}

function createGetter(name: string, returnExpression: ts.Expression) {
  return ts.createGetAccessor(
    undefined,
    [ts.createToken(ts.SyntaxKind.StaticKeyword)],
    name,
    undefined,
    undefined,
    ts.createBlock([
      ts.createReturn(returnExpression)
    ])
  );
}
