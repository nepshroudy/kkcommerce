import { api } from '@/lib/api';
import ProductPurchasePanel from '@/components/store/ProductPurchasePanel';
import WishlistButton from '@/components/store/WishlistButton';

export default async function ProductPage({params}:{params:{slug:string}}){
  const p:any=await api(`/products/${params.slug}`);
  const gallery=[p.imageUrl,...(p.images||[]).map((i:any)=>i.url)].filter(Boolean);
  return <main className="max-w-6xl mx-auto p-6 product-detail">
    <div><div className="product-main-image" style={{backgroundImage:`url(${gallery[0]||''})`}}>{!gallery[0]&&<span>KK CLOSET</span>}</div>{gallery.length>1&&<div className="thumbnail-grid">{gallery.slice(1).map((url:string)=><div key={url} style={{backgroundImage:`url(${url})`}} />)}</div>}</div>
    <div className="product-info"><p className="eyebrow">{p.category?.name||'KK CLOSET'}</p><h1>{p.name}</h1><p className="description">{p.description}</p><ProductPurchasePanel product={p}/><div className="product-actions"><WishlistButton productId={p.id}/></div></div>
  </main>;
}
