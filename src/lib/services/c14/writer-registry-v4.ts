export const WRITER_REGISTRY_V4_SHA256 = "52f8755d9bc2385f03dc0699c33e41f66e637e64adf6d8f5495d68ec6a4c2c47"
export const PRIVATE_WRITER_MODULE = "src/lib/services/c14/bundles/private-writer-runtime.ts"

const contractRows = [
  ["ISW-CX03-01", "d02d0c8ee69ab3b399d29055ec2b688556ec33b9e1a43cd9b41b65735137bde0", ["WCB-01"]],
  ["ISW-CX07-01", "c807ba6e38ad02062d6389dfc30a04ed32ed3481066725de24caca840a34d780", ["WCB-02", "WCB-06", "WCB-07", "WCB-08"]],
  ["ISW-CX11-01", "6733673f240174a795b56e06c19384d1b9bedae7352fa01d8f655bcd455188f8", ["WCB-03"]],
  ["ISW-CX11-02", "60c05c3ba8c07e004f1ec9fe8758c9130bb8dcc6c0d6c6e3c339f18344087373", ["WCB-04"]],
  ["ISW-CX11-03", "430b69d199e886f8ea80d28ece7d9be19e7a9ba617f740a33552e3986abdf6e7", ["WCB-04"]],
  ["ISW-CX12-01", "33a5e7f9edade94f287d4b3987565f208e5ea44cdf0f7a9a6fa4e39dd552bd8d", ["WCB-05"]],
  ["ISW-CX12-02", "6929df7c55751f03c03c60b12763a95b0a5eb85b5f51767f282d1d70623bc284", ["WCB-05"]],
  ["ISW-CX12-03", "86b4abb0e499d6ed40dc0a4d5c491ebf6dd42cc0250ee33132ccf214456a071b", ["WCB-09"]],
  ["ISW-CX12-04", "2e9f903e8423908e289c498c9fbeefc894c7aead19fac0f069d6475b01639fc0", ["WCB-10"]],
  ["ISW-CX12-05", "4b9e29d58b4a69cc3a609c997617ba85f9e144cc71c13508c7f253aed27c7f22", ["WCB-06"]],
  ["ISW-CX12-06", "318cd8e24544c978419d65e7160bfd58b21116dee61c930bb062c63cf91a076a", ["WCB-07"]],
  ["ISW-CX12-07", "1088c9f4013029bb48e981f65cfb8c4ced175fd6aab61207ae339d4a33bd21cf", ["WCB-07"]],
  ["ISW-CX12-08", "92bb91dddcfc91c0a76b87711c31d4b6c2006e991503cf7d1dd4f20619e92d5e", ["WCB-07", "WCB-11"]],
  ["ISW-CX12-09", "64308eef76bd35640e078188616787731405164a0a2b7a5103d3754bd2712e7b", ["WCB-08"]],
  ["ISW-CX12-10", "e3302b822f2092b91d3b1b7f4754bec1e0a79b6ed155522ea9565fc187afa872", ["WCB-08"]],
  ["ISW-CX08-01", "e0b8fc58c95380dc0a5ed590abfd8188fa18b361766237bd514d0242ef47e91a", ["WCB-03"]],
  ["ISW-CX08-02", "114afe95f3a553c7bea3adb7b4da583264f0e82d6e12e04410f9dd9fab2357f4", ["WCB-03", "WCB-06"]],
  ["ISW-CX06-01", "cda359d20628cf23111034e90628cf3536626b5e627b26a7e5b1bab09996b2a4", ["WCB-06"]],
] as const

const bundleRows = [
  ["WCB-01", "2dd1fc171f2cfaf022c32e67a1610a7778299e40af9cb09f1d1a6c2a51917559", ["ISW-CX03-01"], ["configurationVersion"]],
  ["WCB-02", "3cf60eaa4292e2d22e8b3ba5a8997a15670b8fb6b9f954c6a22b91ced698e501", ["ISW-CX07-01"], ["evidenceHeader", "evidenceLines"]],
  ["WCB-03", "b66de8b562797625f08721a68e6ea4d4e8e03713d06fdaf068f9860c9ad7f22a", ["ISW-CX08-01", "ISW-CX08-02", "ISW-CX11-01"], ["reservationRoot", "reservationEvidence", "reservationCorrelation"]],
  ["WCB-04", "ce281a1d2b403709888317fda57113a0fe054418b18873f581aab64d68fc63bf", ["ISW-CX11-02", "ISW-CX11-03"], ["controlHeader", "controlLines"]],
  ["WCB-05", "23211492e3e9fe4074593d969da70bfdd4ca72fbbe33181b5f051b5dfc0c5e55", ["ISW-CX12-01", "ISW-CX12-02"], ["compositionHeader", "compositionLines"]],
  ["WCB-06", "28f17b8991ca4391b5ee1c49aefc93635f28c142df19ac3fadae90904488abd6", ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"], ["stockEvidenceHeader", "stockEvidenceLines", "reservationEvidence", "dispatchHeader", "dispatchLines", "reservationEffect", "stockEffect"]],
  ["WCB-07", "489c8286cd213f810a3562604af92d9d9f4ce717925282b877bc8e24f5af3e9f", ["ISW-CX07-01", "ISW-CX12-06", "ISW-CX12-07", "ISW-CX12-08"], ["stockEvidenceHeader", "stockEvidenceLines", "returnHeader", "returnLines", "replacementPairs", "dispositions"]],
  ["WCB-08", "d5a016a434e0a6e3e1dce3fdaff2c970c6d62b1d66b2aa7a9c5700b091152754", ["ISW-CX07-01", "ISW-CX12-09", "ISW-CX12-10"], ["stockEvidenceHeader", "stockEvidenceLines", "consumptionHeader", "consumptionLines", "dispositions"]],
  ["WCB-09", "2afe30d8a659c0f4ab7256fc580581e4abf698feb8a5acd3c8f31932f2f61f7c", ["ISW-CX12-03"], ["difference"]],
  ["WCB-10", "2cb5f05f3decc9915ff4dbe37749e2e09076c56b7ec78224b7ef2ccf5ad657fc", ["ISW-CX12-04"], ["differenceResolution"]],
  ["WCB-11", "eabae53faa84a7f67645a9424f3c8f4d7eb92e0a602135b26f4a889277ba1dd9", ["ISW-CX12-08"], ["replacementPair"]],
] as const

const privateLocator = (contractId: string) => ({
  declarationKind: "MODULE_PRIVATE_FUNCTION",
  localSymbol: `rowWriterIsw${contractId.slice(4).replaceAll("-", "").replace(/^CX/, "Cx")}`,
  modulePath: PRIVATE_WRITER_MODULE,
  spanMarkerId: `C14PRW-${contractId}`,
})

export const GUARDED_WRITER_LOCATORS = [
  ["GW-STOCK-EVIDENCE-LINE-INSERT", "rowWriterStockEvidenceLine"],
  ["GW-CAJAS-DISPATCH-LINE-INSERT", "rowWriterCajasDispatchLine"],
  ["GW-CAJAS-DISPOSITION-INSERT", "rowWriterCajasDisposition"],
].map(([guardedWriterId, localSymbol]) => ({ declarationKind: "MODULE_PRIVATE_FUNCTION", guardedWriterId, localSymbol, modulePath: PRIVATE_WRITER_MODULE, spanMarkerId: guardedWriterId }))

export const WRITER_REGISTRY_V4 = {
  schemaVersion: "C14-INSERT-WRITER-REGISTRY-V4-CX08-CCT1",
  bundleBindingSetSha256: "47614096f77b28ede3dbd142b66c29d601d471e3ee91c5a41cbd1d2706739d35",
  bundleBindings: bundleRows.map(([bundleId, bundleRowSha256, contractIds, payloadSectionIds]) => ({ bundleId, bundleRowSha256, contractIds, payloadSectionIds, publicCommandEntryPoint: `src/lib/services/c14/bundles/${bundleId.toLowerCase()}.ts#execute` })),
  bundleCount: 11,
  bundleSetSha256: "206b1fb502083ddf1fdfa6329ccaa4e0af82751b7d6295f411ce24bfc50898b4",
  contractBindingSetSha256: "53eeba1fd9b888b0b5e290b35d3220b702acd4b1e9bfe9073b1ad020376e29e6",
  contractBindings: contractRows.map(([contractId, contractRowSha256, allowedBundleIds]) => ({ allowedBundleIds, contractId, contractRowSha256, privateRowWriterLocator: privateLocator(contractId), publicCommandOwnerEntryPoint: `src/lib/services/c14/insert-serialization/${contractId.toLowerCase()}.ts#execute` })),
  contractCount: 18,
  contractSetSha256: "4b838af8fc5c64add65d09b381114811d57f92c1f1600da2c412dd86f488baf9",
  guardedWriterCount: 3,
  guardedWriterLocators: GUARDED_WRITER_LOCATORS,
  payloadManifestSetSha256: "d9685f05cc5da234219b4d5c82cd0e48e2c1527c6a91a01d9ed9c467395cb13b",
  privateContractWriterCount: 18,
} as const

const registryBytes = JSON.stringify(WRITER_REGISTRY_V4)
export const conformsToWriterRegistryV4 = (candidate: unknown): boolean => JSON.stringify(candidate) === registryBytes
