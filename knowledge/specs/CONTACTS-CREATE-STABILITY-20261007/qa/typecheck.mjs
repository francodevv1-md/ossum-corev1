import ts from "typescript"
import path from "node:path"
import fs from "node:fs"

const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile)
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"))
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd())
const roots = [
  "src/lib/validators/contact.ts", "src/lib/api/contacts.ts", "src/lib/api/contact-adapter.ts",
  "src/lib/services/contact.service.ts", "src/app/contactos/page.tsx",
  "src/components/contactos/ContactoFormDialog.tsx", "src/components/contactos/ContactSearchModal.tsx",
  "src/components/contactos/ContactLookupField.tsx", "src/__tests__/setup.ts",
  "src/app/api/companies/[companyId]/contacts/route.ts",
  "src/app/api/companies/[companyId]/contacts/[contactId]/route.ts",
]
if (process.argv.includes("--adjacent")) roots.push("src/components/cirugias/dialogs/NewSurgeryDialog.tsx")
for (const folder of ["src/__tests__/unit", "src/__tests__/components"]) {
  roots.push(...fs.readdirSync(folder).filter(file => /contact/i.test(file)).map(file => `${folder}/${file}`))
}
const program = ts.createProgram(roots, { ...parsed.options, noEmit: true, incremental: false })
const diagnostics = ts.getPreEmitDiagnostics(program)
console.log(`Contact check: ${roots.length} entries, ${program.getSourceFiles().length} resolved files, ${diagnostics.length} diagnostics`)
console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file,
  getCurrentDirectory: () => path.resolve("."),
  getNewLine: () => "\n",
}))
process.exitCode = diagnostics.some(item => item.category === ts.DiagnosticCategory.Error) ? 1 : 0
