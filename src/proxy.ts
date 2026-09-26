import { NextRequest, NextResponse } from "next/server"
import {
  createPublicRemitoVerificationGet,
  getPublicRemitoVerificationRuntime,
} from "@/app/api/public/remito-verifications/[token]/route"

const UNAVAILABLE = "Verification temporarily unavailable"

function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64")
}

function createCsp(nonce: string): string {
  return [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ")
}

function secure(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp)
  response.headers.set("Cache-Control", "no-store, max-age=0")
  response.headers.set("Pragma", "no-cache")
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  response.headers.set("Referrer-Policy", "no-referrer")
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin")
  return response
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = createNonce()
  const csp = createCsp(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  const isLocalDevelopment = process.env.NODE_ENV === "development"
    && (request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1")
  if (request.nextUrl.protocol !== "https:" && !isLocalDevelopment) {
    return secure(new NextResponse(UNAVAILABLE, { status: 503 }), csp)
  }

  const runtime = getPublicRemitoVerificationRuntime()
  if (!runtime) return secure(new NextResponse(UNAVAILABLE, { status: 503 }), csp)
  const token = request.nextUrl.pathname.split("/").at(-1) ?? ""
  const verification = await createPublicRemitoVerificationGet(runtime)(request, {
    params: Promise.resolve({ token }),
  })
  if (verification.status !== 200) {
    return secure(new NextResponse(UNAVAILABLE, { status: verification.status }), csp)
  }
  requestHeaders.set("x-remito-verification", Buffer.from(await verification.text()).toString("base64url"))

  return secure(NextResponse.next({ request: { headers: requestHeaders } }), csp)
}

export const config = {
  matcher: [{
    source: "/verificar/remito/:path*",
    missing: [
      { type: "header", key: "next-router-prefetch" },
      { type: "header", key: "purpose", value: "prefetch" },
    ],
  }],
}
