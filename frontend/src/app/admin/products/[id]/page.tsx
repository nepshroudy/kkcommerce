import ProductForm from "@/components/admin/ProductForm";
export default function EditProductPage({ params }: { params: { id: string } }) { return <section><div className="page-heading"><div><p className="eyebrow">CATALOGUE</p><h1>Edit product</h1></div></div><ProductForm productId={Number(params.id)} /></section>; }
