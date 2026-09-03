ALTER TABLE "ProductImage" ADD COLUMN "colour" TEXT;
CREATE INDEX "ProductImage_productId_colour_idx" ON "ProductImage"("productId", "colour");
