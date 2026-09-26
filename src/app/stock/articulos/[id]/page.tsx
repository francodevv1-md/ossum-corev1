import { StockArticleView } from "@/components/stock/StockArticleView"

export default async function StockArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StockArticleView id={id} />
}
