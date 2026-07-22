'use client';
import { useState } from 'react';
import { useStore } from './StoreProvider';
export default function AddToCartButton({product}:{product:any}){
 const {addToCart}=useStore(); const [added,setAdded]=useState(false);
 return <button disabled={product.stock<1} className="primary-button" onClick={()=>{addToCart(product);setAdded(true);setTimeout(()=>setAdded(false),1400)}}>{product.stock<1?'Out of stock':added?'Added to cart':'Add to cart'}</button>
}
