export async function renderTest() {
  const [{ default: init, render }, { default: wasmUrl }] = await Promise.all([
    import("takumi-pdf/no-init"), import("takumi-pdf/wasm-url"),
  ])
  await init({ module_or_path: wasmUrl })
  return render("<p style='font-family:Geist'>Remito Córdoba</p>", { size: "a4", fontFamilies: ["Geist"] })
}
