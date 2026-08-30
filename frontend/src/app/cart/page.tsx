'use client';
import Link from 'next/link';
import { useStore } from '@/components/store/StoreProvider';
export default function Cart(){
 const {cart,subtotal,updateQuantity,removeFromCart}=useStore();
 const shipping=subtotal>=35?0:3.99; const until=Math.max(0,35-subtotal);
 return <main className="max-w-5xl mx-auto p-6"><p className="eyebrow">YOUR BAG</p><h1 className="text-4xl font-bold mb-8">Shopping cart</h1>
 {cart.length===0?<div className="empty-state"><p>Your bag is empty.</p><Link className="primary-button inline-block mt-4" href="/shop">Start shopping</Link></div>:<div className="cart-layout"><section className="cart-items">{cart.map(i=><article className="cart-item" key={`${i.product.id}:${i.variant?.id||'base'}`}><div className="cart-thumb" style={{backgroundImage:`url(${i.product.imageUrl||''})`}}/><div><h2>{i.product.name}</h2>{i.variant&&<p>{i.variant.colour} · {i.variant.size}</p>}<p>£{i.unitPrice.toFixed(2)}</p><label>Quantity <input type="number" min="1" max={i.variant?.stock??i.product.stock} value={i.quantity} onChange={e=>updateQuantity(i.product.id,i.variant?.id||null,Number(e.target.value))}/></label><button onClick={()=>removeFromCart(i.product.id,i.variant?.id||null)}>Remove</button></div></article>)}</section><aside className="order-summary"><h2>Summary</h2><div><span>Subtotal</span><strong>£{subtotal.toFixed(2)}</strong></div><div><span>Delivery</span><strong>{shipping===0?'FREE':`£${shipping.toFixed(2)}`}</strong></div>{until>0?<p>Add £{until.toFixed(2)} more for free UK delivery.</p>:<p>Free UK delivery unlocked.</p>}<Link className="primary-button block text-center" href="/checkout">Checkout</Link></aside></div>}
 </main>;
}
