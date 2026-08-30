import Link from 'next/link';
import { api } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
export default async function CollectionPage({params}:{params:{slug:string}}){
  let products:any[]=[]; try{products=await api(`/products?category=${encodeURIComponent(params.slug)}`)}catch{}
  const title=params.slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  return <main className="max-w-6xl mx-auto p-6"><div className="shop-heading"><div><p className="eyebrow">KK CLOSET COLLECTION</p><h1 className="text-4xl font-bold">{title}</h1></div><Link href="/shop">Shop all</Link></div>{products.length===0?<div className="empty-state">No products are currently published in this collection.</div>:<div className="product-grid">{products.map((p:any)=><ProductCard key={p.id} id={p.id} name={p.name} slug={p.slug} price={Number(p.price)} salePrice={p.salePrice?Number(p.salePrice):null} imageUrl={p.imageUrl} stock={p.stock} featured={p.featured}/>)}</div>}</main>;
}
