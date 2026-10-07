import ts from 'typescript'
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile)
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd())
const roots = ['src/__tests__/integration/contact-correlative-postgres.test.ts', 'src/__tests__/unit/contact-correlative.test.ts', 'src/app/api/companies/[companyId]/contacts/code-preview/route.ts']
const program = ts.createProgram(roots, { ...parsed.options, noEmit: true, incremental: false })
const diagnostics = ts.getPreEmitDiagnostics(program)
console.log(`Correlative check: ${roots.length} entries, ${program.getSourceFiles().length} files, ${diagnostics.length} diagnostics`)
console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: value => value, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n' }))
process.exitCode = diagnostics.some(item => item.category === ts.DiagnosticCategory.Error) ? 1 : 0
