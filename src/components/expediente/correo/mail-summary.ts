import type { MailLinkedConversationView } from "@/lib/mail-stage1/types"

export function getMailRefreshBadgeModel(
  conversation: Pick<MailLinkedConversationView, "refreshStatus" | "refreshedAt">
) {
  if (conversation.refreshStatus === "failed") {
    return {
      label: "Refresh fallido",
      className: "border-red-200 bg-red-50 text-red-700",
    }
  }

  if (conversation.refreshStatus === "success" || conversation.refreshedAt) {
    return {
      label: "Refresh OK",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    }
  }

  return {
    label: "Importada",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  }
}
