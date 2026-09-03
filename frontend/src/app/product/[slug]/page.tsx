import { api } from "@/lib/api";
import ProductDetailClient from "@/components/store/ProductDetailClient";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product: any = await api(`/products/${slug}`);
  return <ProductDetailClient product={product} />;
}
