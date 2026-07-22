const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

function sign(user){return jwt.sign({id:user.id,email:user.email,role:user.role,name:user.name},process.env.JWT_SECRET,{expiresIn:'7d'});}
exports.register = async (req,res)=>{try{const {name,email,password}=req.body;if(!name||!email||!password)return res.status(400).json({message:'Name, email and password are required'});const exists=await prisma.user.findUnique({where:{email}});if(exists)return res.status(409).json({message:'Email already registered'});const hash=await bcrypt.hash(password,10);const user=await prisma.user.create({data:{name,email,password:hash,role:'CUSTOMER'}});res.status(201).json({token:sign(user),user:{id:user.id,name:user.name,email:user.email,role:user.role}});}catch(e){res.status(500).json({message:'Register failed',error:e.message});}};
exports.login = async (req,res)=>{try{const {email,password}=req.body;const user=await prisma.user.findUnique({where:{email}});if(!user)return res.status(401).json({message:'Invalid credentials'});const ok=await bcrypt.compare(password,user.password);if(!ok)return res.status(401).json({message:'Invalid credentials'});res.json({token:sign(user),user:{id:user.id,name:user.name,email:user.email,role:user.role}});}catch(e){res.status(500).json({message:'Login failed',error:e.message});}};
exports.me = async (req,res)=>res.json({user:req.user});
