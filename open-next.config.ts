import { defineCloudflareConfig } from "@opennextjs/cloudflare"

// No remote cache resources are provisioned during local preparation.
// Configure a reviewed R2 cache binding before relying on ISR/revalidation.
export default defineCloudflareConfig({
  incrementalCache: "dummy",
  tagCache: "dummy",
  queue: "dummy",
})
