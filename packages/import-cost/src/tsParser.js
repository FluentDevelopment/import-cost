import ts from 'typescript';

export function getPackages(fileName, source) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2016, true);
  const packages = gatherPackages(sourceFile).map(pkg => ({...pkg, fileName}));
  return packages;
}

function gatherPackages(sourceFile) {
  const packages = [];
  gatherPackagesFromNode(sourceFile);

  function gatherPackagesFromNode(node) {
    if (ts.isImportDeclaration(node)) {
      const importNode = node;
      let importedProperties = 'entireModule';
      let importClauseText = `* as ${importedProperties}`;
      if (importNode.importClause) {
        if (!importNode.importClause.namedBindings) {
          importedProperties = importNode.importClause.name.escapedText || 'defaultExport';
        } else if (ts.isNamespaceImport(importNode.importClause.namedBindings)) {
          importedProperties = importNode.importClause.namedBindings.name.escapedText;
        } else if (ts.isNamedImports(importNode.importClause.namedBindings)) {
          const namedImportElements = (importNode.importClause.namedBindings.elements || []);
          if (!namedImportElements.length) {
            throw new Error('NamedImports must have at least one element');
          }
          importedProperties = `{ ${namedImportElements.map(elem => (elem.propertyName || elem.name).text).sort().join(', ')} }`;
        } else {
          throw new Error(`Unknown named binding kind ${importNode.importClause.namedBindings.kind}`);
        }
        importClauseText = importedProperties;
      }
      const importStatement = `import ${importClauseText} from '${importNode.moduleSpecifier.text}';\nconsole.log(${importedProperties});`;

      const packageInfo = {
        fileName: sourceFile.fileName,
        name: importNode.moduleSpecifier.text,
        line: sourceFile.getLineAndCharacterOfPosition(importNode.getStart()).line + 1,
        string: importStatement
      };
      packages.push(packageInfo);
    } else if (ts.isCallExpression(node)) {
      const callExpressionNode = node;
      if (callExpressionNode.expression.text === 'require') {
        const packageName = callExpressionNode.arguments[0].text;
        const packageInfo = {
          fileName: sourceFile.fileName,
          name: packageName,
          line: sourceFile.getLineAndCharacterOfPosition(callExpressionNode.getStart()).line + 1,
          string: callExpressionNode.getText()
        };
        packages.push(packageInfo);
      }
    }
    ts.forEachChild(node, gatherPackagesFromNode);
  }
  return packages;
}
