'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Variant = { id:number; size:string; colour:string; sku:string; stock:number; useProductPricing:boolean; price?:string|null; salePrice?:string|null; active:boolean };
export type StoreProduct = { id:number; name:string; slug:string; price:string; salePrice?:string|null; imageUrl?:string|null; stock:number };
export type CartItem = { product:StoreProduct; variant?:Variant|null; quantity:number; unitPrice:number };
type StoreContextValue = {
  cart:CartItem[]; cartCount:number; subtotal:number;
  addToCart:(product:StoreProduct, variant?:Variant|null)=>void;
  updateQuantity:(productId:number, variantId:number|null, quantity:number)=>void;
  removeFromCart:(productId:number, variantId:number|null)=>void;
  clearCart:()=>void;
};
const StoreContext=createContext<StoreContextValue|null>(null);
const KEY='kkcommerce_cart_v2';
const itemKey=(productId:number,variantId?:number|null)=>`${productId}:${variantId||'base'}`;
const effectivePrice=(p:StoreProduct,v?:Variant|null)=>Number(v && !v.useProductPricing ? (v.salePrice || v.price) : (p.salePrice || p.price));

export default function StoreProvider({children}:{children:React.ReactNode}){
  const [cart,setCart]=useState<CartItem[]>([]); const [ready,setReady]=useState(false);
  useEffect(()=>{try{setCart(JSON.parse(localStorage.getItem(KEY)||'[]'))}catch{}setReady(true)},[]);
  useEffect(()=>{if(ready)localStorage.setItem(KEY,JSON.stringify(cart))},[cart,ready]);
  const value=useMemo<StoreContextValue>(()=>({
    cart,
    cartCount:cart.reduce((n,i)=>n+i.quantity,0),
    subtotal:cart.reduce((n,i)=>n+i.unitPrice*i.quantity,0),
    addToCart:(product,variant=null)=>setCart(items=>{
      const key=itemKey(product.id,variant?.id); const max=variant?.stock ?? product.stock;
      const existing=items.find(i=>itemKey(i.product.id,i.variant?.id)===key);
      return existing?items.map(i=>itemKey(i.product.id,i.variant?.id)===key?{...i,quantity:Math.min(i.quantity+1,max)}:i):[...items,{product,variant,quantity:1,unitPrice:effectivePrice(product,variant)}];
    }),
    updateQuantity:(productId,variantId,quantity)=>setCart(items=>items.map(i=>itemKey(i.product.id,i.variant?.id)===itemKey(productId,variantId)?{...i,quantity:Math.max(1,Math.min(quantity,(i.variant?.stock ?? i.product.stock ?? 99)))}:i)),
    removeFromCart:(productId,variantId)=>setCart(items=>items.filter(i=>itemKey(i.product.id,i.variant?.id)!==itemKey(productId,variantId))),
    clearCart:()=>setCart([]),
  }),[cart]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore(){const ctx=useContext(StoreContext);if(!ctx)throw new Error('useStore must be used inside StoreProvider');return ctx}
