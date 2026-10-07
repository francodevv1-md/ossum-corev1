import ts from 'typescript'
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile)
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd())
const roots = [
  'src/__tests__/unit/contact-coordinator-legacy.test.ts',
  'src/__tests__/unit/contact-update-audit-in-tx.test.ts',
  'src/__tests__/unit/useCirugiaActions-institution-helper.test.ts',
  'src/__tests__/components/ContactLookupField-stale-search.test.tsx',
  'src/__tests__/components/ContactosCorrelativeBadge.test.tsx',
  'src/lib/services/contact.service.ts',
  'src/hooks/useCirugiaActions.ts',
  'src/components/contactos/ContactLookupField.tsx',
  'src/components/contactos/ContactSearchModal.tsx',
  'src/components/contactos/ContactoFormDialog.tsx',
  'src/app/contactos/page.tsx',
  'src/app/api/companies/[companyId]/contacts/[contactId]/route.ts',
  'src/app/api/companies/[companyId]/contacts/route.ts',
  'src/app/api/companies/[companyId]/contacts/code-preview/route.ts',
]
const program = ts.createProgram(roots, { ...parsed.options, noEmit: true, incremental: false })
const diagnostics = ts.getPreEmitDiagnostics(program)
console.log(`Fragility check: ${roots.length} entries, ${program.getSourceFiles().length} files, ${diagnostics.length} diagnostics`)
console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: value => value, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n' }))
process.exitCode = diagnostics.some(item => item.category === ts.DiagnosticCategory.Error) ? 1 : 0
