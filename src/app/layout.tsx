import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShellProvider } from "@/components/layout/app-shell"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MainLayout } from "@/components/layout/main-layout"
import { StoreHydration } from "@/components/StoreHydration"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "OrtoTrack ERP v2.3",
  description: "Sistema operativo integral para cirugía traumatológica / ortopédica",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-background text-foreground font-sans`}>
        <AppShellProvider>
          <StoreHydration />
          <TooltipProvider delayDuration={300}>
            <Sidebar />
            <MainLayout>
              <Header />
              <main className="flex-1 p-3 lg:p-4">{children}</main>
            </MainLayout>
          </TooltipProvider>
        </AppShellProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
