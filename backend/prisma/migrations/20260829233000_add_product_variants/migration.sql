CREATE TABLE "ProductVariant" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "size" TEXT NOT NULL,
    "colour" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "useProductPricing" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(10,2),
    "salePrice" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrderItem" ADD COLUMN "variantId" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN "variantSize" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantColour" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantSku" TEXT;

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE UNIQUE INDEX "ProductVariant_productId_size_colour_key" ON "ProductVariant"("productId", "size", "colour");
CREATE INDEX "ProductVariant_productId_active_idx" ON "ProductVariant"("productId", "active");

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
