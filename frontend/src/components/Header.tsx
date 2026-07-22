'use client';
import Link from 'next/link';
import { useStore } from '@/components/store/StoreProvider';
export default function Header(){const {cartCount}=useStore();return <header className="border-b border-neutral-800 bg-black/90 sticky top-0 z-20"><div className="max-w-6xl mx-auto flex items-center justify-between p-5"><Link href="/" className="text-2xl font-bold tracking-[0.3em] gold">KK CLOSET</Link><nav className="flex gap-5 text-sm items-center"><Link href="/shop">Shop</Link><Link href="/wishlist">Wishlist</Link><Link href="/account">Account</Link><Link href="/cart" className="cart-link">Bag <span>{cartCount}</span></Link><Link href="/admin">Admin</Link></nav></div></header>}
