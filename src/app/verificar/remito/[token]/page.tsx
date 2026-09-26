import type { Metadata } from "next"
import { headers } from "next/headers"
import { connection } from "next/server"
import type { PublicRemitoVerificationDto } from "@/lib/remito-verification/service"

type PageProps = { params: Promise<{ token: string }> }

export const metadata: Metadata = {
  title: "Remito verification",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

function readVerification(value: string | null): PublicRemitoVerificationDto {
  if (!value) throw new Error("Public verification boundary unavailable")
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as PublicRemitoVerificationDto
}

export default async function PublicRemitoVerificationPage({ params }: PageProps) {
  await connection()
  const requestHeaders = await headers()
  if (!requestHeaders.get("x-nonce")) throw new Error("Public verification boundary unavailable")
  const result = readVerification(requestHeaders.get("x-remito-verification"))
  await params

  const verified = result.verificationStatus === "valid"
  return (
    <main>
      <meta name="referrer" content="no-referrer" />
      <h1>Remito verification</h1>
      <p role="status">{verified ? "Verified" : "Not verified"}</p>
      <dl>
        <dt>Status</dt><dd>{result.verificationStatus}</dd>
        <dt>Issuer</dt><dd>{result.issuerDisplayName ?? "Unavailable"}</dd>
        <dt>Issuer CUIT</dt><dd>{result.issuerTaxId ?? "Unavailable"}</dd>
        <dt>Document</dt><dd>{result.documentType ?? "Unavailable"}</dd>
        <dt>Issue date</dt><dd>{result.issuedDate ?? "Unavailable"}</dd>
        <dt>Remito</dt><dd>{result.remitoShortCode ?? "Unavailable"}</dd>
        <dt>Version</dt><dd>{result.verificationVersion ?? "Unavailable"}</dd>
        <dt>Fingerprint</dt><dd>{result.fingerprint ?? "Unavailable"}</dd>
        <dt>Checked at</dt><dd>{result.checkedAt}</dd>
      </dl>
    </main>
  )
}
