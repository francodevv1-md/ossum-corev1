import type { MailProviderAdapter } from "./types"
import { mockMailProvider } from "./mock-mail-provider"

let gmailProvider: MailProviderAdapter | null = null

export function getMailProvider(): MailProviderAdapter {
  const envProvider = process.env.MAIL_PROVIDER ?? "mock"

  switch (envProvider) {
    case "mock":
      return mockMailProvider

    case "gmail": {
      if (!gmailProvider) {
        // Dynamic require to avoid loading googleapis when MAIL_PROVIDER=mock.
        // These files are created in S2/S3 and import googleapis internally.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { GmailMailProvider } = require("./gmail-mail-provider") as {
          GmailMailProvider: new (...args: any[]) => MailProviderAdapter
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { EncryptedTokenStore } = require("../gmail/token-store") as {
          EncryptedTokenStore: new () => any
        }
        const tokenStore = new EncryptedTokenStore()
        gmailProvider = new GmailMailProvider(tokenStore) as MailProviderAdapter
      }
      return gmailProvider
    }

    default:
      console.warn(
        `[mail-stage1] Unknown MAIL_PROVIDER "${envProvider}" — falling back to mock`
      )
      return mockMailProvider
  }
}
