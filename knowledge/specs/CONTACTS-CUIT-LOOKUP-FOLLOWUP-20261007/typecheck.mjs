import ts from 'typescript'
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile)
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd())
const roots = [
  // Owned by this follow-up.
  'src/lib/services/cuit-lookup.service.internal.ts',
  'src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts',
  'src/lib/services/cuit-lookup.service.ts',
  'src/__tests__/unit/cuit-lookup.service.test.ts',
  'src/__tests__/components/ContactoFormDialog-cuit-lookup.test.tsx',
  // Preserved from the prior package (still relevant for cross-file checks).
  'src/lib/utils/cuit-validation.ts',
  'src/lib/validators/cuit-lookup.ts',
  'src/lib/api/contacts.ts',
  'src/components/contactos/ContactoFormDialog.tsx',
  'src/__tests__/unit/cuit-lookup-validator.test.ts',
  'src/__tests__/unit/cuit-lookup-route.test.ts',
  'src/lib/services/contact.service.ts',
  'src/lib/validators/contact.ts',
  'src/app/api/companies/[companyId]/contacts/route.ts',
  'src/app/api/companies/[companyId]/contacts/code-preview/route.ts',
  'src/app/api/companies/[companyId]/contacts/[contactId]/route.ts',
]
const program = ts.createProgram(roots, { ...parsed.options, noEmit: true, incremental: false })
const diagnostics = ts.getPreEmitDiagnostics(program)
console.log(`CUIT lookup follow-up check: ${roots.length} entries, ${program.getSourceFiles().length} files, ${diagnostics.length} diagnostics`)
console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: value => value, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n' }))
process.exitCode = diagnostics.some(item => item.category === ts.DiagnosticCategory.Error) ? 1 : 0
