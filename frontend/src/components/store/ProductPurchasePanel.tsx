'use client';
import { useMemo, useState } from 'react';
import { useStore, Variant, StoreProduct } from './StoreProvider';

type Product = StoreProduct & { description:string; variants?:Variant[]; images?:{id:number;url:string}[] };
export default function ProductPurchasePanel({product}:{product:Product}){
  const {addToCart}=useStore();
  const variants=(product.variants||[]).filter(v=>v.active);
  const colours=Array.from(new Set(variants.map(v=>v.colour)));
  const [colour,setColour]=useState(colours[0]||'');
  const sizes=useMemo(()=>Array.from(new Set(variants.filter(v=>!colour||v.colour===colour).map(v=>v.size))),[variants,colour]);
  const [size,setSize]=useState('');
  const [added,setAdded]=useState(false);
  const selected=variants.find(v=>v.colour===colour&&v.size===size)||null;
  const price=Number(selected&&!selected.useProductPricing?(selected.salePrice||selected.price):(product.salePrice||product.price));
  const regular=Number(selected&&!selected.useProductPricing?selected.price:product.price);
  const hasSale=price<regular;
  const needsVariant=variants.length>0;
  const canAdd=needsVariant?Boolean(selected&&selected.stock>0):product.stock>0;

  function chooseColour(value:string){setColour(value);setSize('');}
  function add(){if(!canAdd)return;addToCart(product,selected);setAdded(true);setTimeout(()=>setAdded(false),1200)}

  return <div className="variant-panel">
    <div className="price-row large"><strong>£{price.toFixed(2)}</strong>{hasSale&&<del>£{regular.toFixed(2)}</del>}</div>
    {colours.length>0&&<div className="variant-group"><p><strong>Colour:</strong> {colour}</p><div className="variant-options">{colours.map(c=><button type="button" key={c} className={colour===c?'variant-choice active':'variant-choice'} onClick={()=>chooseColour(c)}>{c}</button>)}</div></div>}
    {needsVariant&&<div className="variant-group"><p><strong>Size:</strong> {size||'Select a size'}</p><div className="variant-options">{sizes.map(s=>{const v=variants.find(x=>x.colour===colour&&x.size===s);const sold=!v||v.stock<1;return <button type="button" key={s} disabled={sold} className={size===s?'variant-choice active':'variant-choice'} onClick={()=>setSize(s)}>{s}{sold?' · Sold out':''}</button>})}</div></div>}
    <button className="primary-button variant-add" type="button" disabled={!canAdd} onClick={add}>{added?'Added to bag':needsVariant&&!selected?'Choose size':'Add to bag'}</button>
    {selected&&<p className="stock-note">{selected.stock>5?'In stock':selected.stock>0?`Only ${selected.stock} left`:'Sold out'} · SKU {selected.sku}</p>}
  </div>;
}
