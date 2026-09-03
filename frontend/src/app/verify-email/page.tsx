"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useSearchParams} from "next/navigation";
import {api} from "@/lib/api";
export default function VerifyEmail(){
 const token=useSearchParams().get("token")||"";
 const [message,setMessage]=useState("Verifying your email…"),[error,setError]=useState("");
 useEffect(()=>{if(!token){setError("Verification link is incomplete.");setMessage("");return}api("/auth/verify-email",{method:"POST",body:JSON.stringify({token})}).then((r:any)=>setMessage(r.message)).catch((e:any)=>{setError(e.message);setMessage("")})},[token]);
 return <main className="auth-shell"><section className="auth-card"><p className="eyebrow">KK CLOSET ACCOUNT</p><h1>Email verification</h1>{message&&<div className="success-box">{message}</div>}{error&&<div className="error-box">{error}</div>}<p className="muted" style={{marginTop:18}}><Link href="/login">Go to sign in</Link></p></section></main>
}
