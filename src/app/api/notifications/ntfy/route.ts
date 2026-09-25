import { NextRequest, NextResponse } from "next/server"
import { sendNtfyNotification, type SendNtfyOptions } from "@/lib/services/ntfy.service"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SendNtfyOptions

    if (!body.title || !body.message) {
      return NextResponse.json({ error: "title y message son requeridos" }, { status: 400 })
    }

    const result = await sendNtfyNotification(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    return NextResponse.json({ success: true, id: result.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al procesar la notificación"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
