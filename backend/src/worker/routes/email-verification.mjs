import { json, readJson } from "../utils/http.mjs";
import { sendVerificationEmail, sendWelcomeEmail } from "../services/email.mjs";
const enc=new TextEncoder();
const hex=b=>[...b].map(x=>x.toString(16).padStart(2,"0")).join("");
async function sha(v){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(v))))}
function token(){const b=new Uint8Array(32);crypto.getRandomValues(b);return hex(b)}
export async function issueCustomerVerification(context,user){
 if(user.role!=="CUSTOMER") return;
 const raw=token();
 await context.prisma.user.update({where:{id:user.id},data:{emailVerificationTokenHash:await sha(raw),emailVerificationExpiresAt:new Date(Date.now()+24*60*60*1000)}});
 const url=`${context.env.SHOP_URL||"https://shop.kkcloset.uk"}/verify-email?token=${encodeURIComponent(raw)}`;
 context.ctx.waitUntil(sendVerificationEmail(context.env,user,url).catch(console.error));
}
export async function verifyCustomerEmailRoute(request,context){
 try{
  const {token:raw}=await readJson(request);
  if(!raw)return json({message:"Verification token is required"},400);
  const user=await context.prisma.user.findFirst({where:{role:"CUSTOMER",emailVerifiedAt:null,emailVerificationTokenHash:await sha(String(raw)),emailVerificationExpiresAt:{gt:new Date()}}});
  if(!user)return json({message:"Verification link is invalid or expired"},400);
  const verified=await context.prisma.user.update({where:{id:user.id},data:{emailVerifiedAt:new Date(),emailVerificationTokenHash:null,emailVerificationExpiresAt:null}});
  context.ctx.waitUntil(sendWelcomeEmail(context.env,verified).catch(console.error));
  return json({message:"Email verified successfully. You can now sign in."});
 }catch(e){return json({message:e?.message||"Unable to verify email"},e?.status||500)}
}
export async function resendCustomerVerificationRoute(request,context){
 try{
  const {email}=await readJson(request);const value=String(email||"").trim().toLowerCase();
  const generic={message:"If an unverified account exists, a new verification email has been sent."};
  const user=await context.prisma.user.findUnique({where:{email:value}});
  if(!user||user.role!=="CUSTOMER"||user.emailVerifiedAt)return json(generic);
  await issueCustomerVerification(context,user);return json(generic);
 }catch{return json({message:"Unable to resend verification email"},500)}
}
