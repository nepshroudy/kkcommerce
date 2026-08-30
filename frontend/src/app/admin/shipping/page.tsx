"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type ShippingMethod = {
  id:number; name:string; code:string; description?:string|null; price:number; freeOver?:number|null;
  estimatedDaysMin?:number|null; estimatedDaysMax?:number|null; active:boolean; isDefault:boolean; sortOrder:number;
};

const blank = { name:"", code:"", description:"", price:"3.99", freeOver:"", estimatedDaysMin:"2", estimatedDaysMax:"4", active:true, isDefault:false, sortOrder:10 };

export default function AdminShippingPage() {
  const [methods,setMethods]=useState<ShippingMethod[]>([]);
  const [form,setForm]=useState<any>(blank);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  const load=()=>api<ShippingMethod[]>("/shipping/admin",{authenticated:true}).then(setMethods).catch((e)=>setError(e.message));
  useEffect(()=>{load()},[]);

  function edit(method:ShippingMethod){
    setEditingId(method.id);
    setForm({...method,description:method.description||"",price:String(method.price),freeOver:method.freeOver==null?"":String(method.freeOver),estimatedDaysMin:method.estimatedDaysMin??"",estimatedDaysMax:method.estimatedDaysMax??""});
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function submit(event:FormEvent){
    event.preventDefault(); setError(""); setMessage("");
    try{
      await api(editingId?`/shipping/admin/${editingId}`:"/shipping/admin",{method:editingId?"PATCH":"POST",authenticated:true,body:JSON.stringify(form)});
      setMessage(editingId?"Delivery method updated.":"Delivery method created.");
      setEditingId(null); setForm(blank); await load();
    }catch(e){setError(e instanceof Error?e.message:"Unable to save delivery method")}
  }

  async function remove(id:number){
    if(!confirm("Delete this delivery method? Methods used by previous orders will be deactivated instead."))return;
    try{await api(`/shipping/admin/${id}`,{method:"DELETE",authenticated:true});await load()}catch(e){setError(e instanceof Error?e.message:"Unable to remove delivery method")}
  }

  return <section>
    <div className="admin-page-heading"><div><p className="eyebrow">DELIVERY</p><h1>Shipping methods</h1></div></div>
    <div className="shipping-admin-grid">
      <form className="admin-form shipping-method-form" onSubmit={submit}>
        <h2>{editingId?"Edit delivery method":"Add delivery method"}</h2>
        {error&&<p className="form-error">{error}</p>}{message&&<p className="form-success">{message}</p>}
        <div className="form-grid">
          <label>Name<input required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></label>
          <label>Code<input required value={form.code} onChange={(e)=>setForm({...form,code:e.target.value.toUpperCase()})} placeholder="STANDARD"/></label>
          <label>Price (£)<input required min="0" step="0.01" type="number" value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})}/></label>
          <label>Free when order reaches (£)<input min="0" step="0.01" type="number" value={form.freeOver} onChange={(e)=>setForm({...form,freeOver:e.target.value})} placeholder="Leave blank for never"/></label>
          <label>Minimum working days<input min="1" type="number" value={form.estimatedDaysMin} onChange={(e)=>setForm({...form,estimatedDaysMin:e.target.value})}/></label>
          <label>Maximum working days<input min="1" type="number" value={form.estimatedDaysMax} onChange={(e)=>setForm({...form,estimatedDaysMax:e.target.value})}/></label>
        </div>
        <label>Description<input value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label>
        <div className="check-row">
          <label><input type="checkbox" checked={form.active} onChange={(e)=>setForm({...form,active:e.target.checked})}/> Active</label>
          <label><input type="checkbox" checked={form.isDefault} onChange={(e)=>setForm({...form,isDefault:e.target.checked})}/> Default method</label>
        </div>
        <div className="form-actions">
          {editingId&&<button type="button" className="button-secondary" onClick={()=>{setEditingId(null);setForm(blank)}}>Cancel</button>}
          <button type="submit">{editingId?"Save changes":"Add delivery method"}</button>
        </div>
      </form>

      <div className="shipping-method-list">
        {methods.map((method)=><article className="shipping-admin-card" key={method.id}>
          <div><p className="eyebrow">{method.code}</p><h3>{method.name} {method.isDefault&&<span className="default-pill">Default</span>}</h3><p>{method.description||"No description"}</p><strong>£{Number(method.price).toFixed(2)}</strong>{method.freeOver!=null&&<small> · Free over £{Number(method.freeOver).toFixed(2)}</small>}<small className="block">{method.active?"Active":"Inactive"} · {method.estimatedDaysMin||"?"}-{method.estimatedDaysMax||"?"} working days</small></div>
          <div className="shipping-admin-actions"><button className="button-secondary" onClick={()=>edit(method)}>Edit</button><button className="button-secondary" onClick={()=>remove(method.id)}>Delete</button></div>
        </article>)}
      </div>
    </div>
  </section>;
}
