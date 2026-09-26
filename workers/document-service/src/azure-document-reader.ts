import type {
  AzureDocumentModel,
  DocumentReadRequest,
  DocumentReadResult,
  DocumentReaderProvider,
} from "./contracts"

type AzureDocumentReaderConfig = {
  endpoint: string
  apiKey: string
  apiVersion: string
  pollIntervalMs?: number
  maxPollAttempts?: number
}

type AzureOperation = {
  status?: "notStarted" | "running" | "succeeded" | "failed" | "skipped"
  error?: { code?: string }
  analyzeResult?: unknown
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function retryDelay(response: Response, fallback: number): number {
  const value = response.headers.get("retry-after")
  if (!value) return fallback

  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000)

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : fallback
}

function assertTrustedOperationLocation(endpoint: string, operationLocation: string): string {
  const endpointUrl = new URL(endpoint)
  const operationUrl = new URL(operationLocation)

  if (operationUrl.protocol !== "https:" || operationUrl.origin !== endpointUrl.origin) {
    throw new Error("Azure returned an untrusted operation-location")
  }

  return operationUrl.toString()
}

export class AzureDocumentReaderProvider implements DocumentReaderProvider {
  constructor(private readonly config: AzureDocumentReaderConfig) {}

  async read(request: DocumentReadRequest): Promise<DocumentReadResult> {
    const operationLocation = await this.startAnalysis(request)
    const raw = await this.waitForResult(operationLocation)

    return {
      provider: "azure-document-intelligence",
      model: request.model,
      raw,
    }
  }

  private async startAnalysis(request: DocumentReadRequest): Promise<string> {
    const endpoint = this.config.endpoint.replace(/\/$/, "")
    const response = await fetch(
      `${endpoint}/documentintelligence/documentModels/${request.model}:analyze?api-version=${this.config.apiVersion}`,
      {
        method: "POST",
        headers: {
          "Content-Type": request.mimeType || "application/octet-stream",
          "Ocp-Apim-Subscription-Key": this.config.apiKey,
        },
        body: request.bytes,
      }
    )

    if (response.status !== 202) {
      throw new Error(`Azure analysis request failed with status ${response.status}`)
    }

    const operationLocation = response.headers.get("operation-location")
    if (!operationLocation) throw new Error("Azure response omitted operation-location")
    return assertTrustedOperationLocation(endpoint, operationLocation)
  }

  private async waitForResult(operationLocation: string): Promise<AzureOperation> {
    const maxAttempts = this.config.maxPollAttempts ?? 40
    const pollInterval = this.config.pollIntervalMs ?? 1_500

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await delay(pollInterval)
      const response = await fetch(operationLocation, {
        headers: { "Ocp-Apim-Subscription-Key": this.config.apiKey },
      })

      if (response.status === 429 || response.status >= 500) {
        await delay(retryDelay(response, pollInterval))
        continue
      }

      if (!response.ok) {
        throw new Error(`Azure analysis polling failed with status ${response.status}`)
      }

      const operation = await response.json<AzureOperation>()
      if (operation.status === "succeeded") return operation
      if (operation.status === "failed") {
        throw new Error(`Azure analysis failed (${operation.error?.code ?? "unknown"})`)
      }
    }

    throw new Error("Azure analysis timed out")
  }
}

export function createAzureDocumentReader(env: Env, model?: AzureDocumentModel) {
  void model
  return new AzureDocumentReaderProvider({
    endpoint: env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    apiKey: env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY,
    apiVersion: env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION,
  })
}
