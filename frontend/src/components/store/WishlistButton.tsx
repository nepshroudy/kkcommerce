'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
export default function WishlistButton({productId}:{productId:number}){
 const [message,setMessage]=useState('Save to wishlist'); const [busy,setBusy]=useState(false);
 async function save(){if(!getToken()){location.href='/login?next=/wishlist';return}setBusy(true);try{await api('/wishlist',{method:'POST',authenticated:true,body:JSON.stringify({productId})});setMessage('Saved')}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
 return <button className="secondary-button" disabled={busy} onClick={save}>{message}</button>
}
