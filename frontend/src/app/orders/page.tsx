'use client';
import {useSearchParams} from 'next/navigation';import Link from 'next/link';
export default function OrderSuccess(){const p=useSearchParams();return <main className="auth-shell"><div className="auth-card text-center"><p className="eyebrow">ORDER RECEIVED</p><h1>Thank you</h1><p>Your test order #{p.get('created')||''} has been created successfully.</p><div className="mt-6"><Link className="primary-button inline-block" href="/account">View account</Link></div></div></main>}
