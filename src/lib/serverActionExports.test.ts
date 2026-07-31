import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind) {
  return ts.canHaveModifiers(node)
    ? ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false
    : false;
}

describe('"use server" module exports', () => {
  it("only exposes async functions as runtime values", () => {
    const invalidExports: string[] = [];

    for (const path of sourceFiles(join(process.cwd(), "src"))) {
      const sourceText = readFileSync(path, "utf8");
      const source = ts.createSourceFile(
        path,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const firstStatement = source.statements[0];
      const isServerActionModule =
        ts.isExpressionStatement(firstStatement) &&
        ts.isStringLiteral(firstStatement.expression) &&
        firstStatement.expression.text === "use server";
      if (!isServerActionModule) continue;

      for (const statement of source.statements) {
        if (
          ts.isTypeAliasDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement)
        ) {
          continue;
        }

        const isExported = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
        if (!isExported && !ts.isExportAssignment(statement)) continue;

        const isAsyncFunction =
          ts.isFunctionDeclaration(statement) &&
          hasModifier(statement, ts.SyntaxKind.AsyncKeyword);
        if (!isAsyncFunction) {
          const line = source.getLineAndCharacterOfPosition(statement.getStart()).line + 1;
          invalidExports.push(`${path}:${line}`);
        }
      }
    }

    expect(invalidExports).toEqual([]);
  });
});
