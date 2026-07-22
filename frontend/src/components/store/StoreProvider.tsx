'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Product = { id:number; name:string; slug:string; price:string; salePrice?:string|null; imageUrl?:string|null; stock:number };
type CartItem = { product:Product; quantity:number };
type StoreContextValue = { cart:CartItem[]; cartCount:number; subtotal:number; addToCart:(p:Product)=>void; updateQuantity:(id:number,q:number)=>void; removeFromCart:(id:number)=>void; clearCart:()=>void };
const StoreContext=createContext<StoreContextValue|null>(null);
const KEY='kkcommerce_cart';

export default function StoreProvider({children}:{children:React.ReactNode}){
  const [cart,setCart]=useState<CartItem[]>([]);
  const [ready,setReady]=useState(false);
  useEffect(()=>{try{setCart(JSON.parse(localStorage.getItem(KEY)||'[]'))}catch{}setReady(true)},[]);
  useEffect(()=>{if(ready)localStorage.setItem(KEY,JSON.stringify(cart))},[cart,ready]);
  const value=useMemo(()=>({
    cart,
    cartCount:cart.reduce((n,i)=>n+i.quantity,0),
    subtotal:cart.reduce((n,i)=>n+Number(i.product.salePrice||i.product.price)*i.quantity,0),
    addToCart:(p:Product)=>setCart(items=>{const existing=items.find(i=>i.product.id===p.id);return existing?items.map(i=>i.product.id===p.id?{...i,quantity:Math.min(i.quantity+1,p.stock||99)}:i):[...items,{product:p,quantity:1}]}),
    updateQuantity:(id:number,q:number)=>setCart(items=>items.map(i=>i.product.id===id?{...i,quantity:Math.max(1,Math.min(q,i.product.stock||99))}:i)),
    removeFromCart:(id:number)=>setCart(items=>items.filter(i=>i.product.id!==id)),
    clearCart:()=>setCart([]),
  }),[cart]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore(){const ctx=useContext(StoreContext);if(!ctx)throw new Error('useStore must be used inside StoreProvider');return ctx}
