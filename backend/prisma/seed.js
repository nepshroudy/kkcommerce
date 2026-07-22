const bcrypt=require('bcryptjs'); const prisma=require('../src/utils/prisma');
async function main(){
  const hash=await bcrypt.hash('Admin123!',10);
  await prisma.user.upsert({where:{email:'admin@kkcloset.uk'},update:{},create:{name:'KK Admin',email:'admin@kkcloset.uk',password:hash,role:'SUPERADMIN'}});
  const cats=['New In','Dresses','Tops','Bottoms','Accessories'];
  for(const name of cats){const slug=name.toLowerCase().replaceAll(' ','-'); await prisma.category.upsert({where:{slug},update:{},create:{name,slug}})}
  const dress=await prisma.category.findUnique({where:{slug:'dresses'}});
  await prisma.product.create({data:{name:'Black Satin Luxe Dress',slug:'black-satin-luxe-dress',description:'Premium satin-look dress designed for elegant evenings and statement occasions.',price:'49.99',stock:20,featured:true,imageUrl:'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f',categoryId:dress?.id}}).catch(()=>{});
}
main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e);prisma.$disconnect();process.exit(1)});
