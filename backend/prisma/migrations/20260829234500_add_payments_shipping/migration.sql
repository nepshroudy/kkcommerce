CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'FAILED', 'REFUNDED');

CREATE TABLE "ShippingMethod" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "freeOver" DECIMAL(10,2),
    "estimatedDaysMin" INTEGER,
    "estimatedDaysMax" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShippingMethod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShippingMethod_code_key" ON "ShippingMethod"("code");

ALTER TABLE "Order"
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "stripePaymentIntentId" TEXT,
ADD COLUMN "paymentCompletedAt" TIMESTAMP(3),
ADD COLUMN "stockReservedAt" TIMESTAMP(3),
ADD COLUMN "stockReleasedAt" TIMESTAMP(3),
ADD COLUMN "shippingMethodId" INTEGER,
ADD COLUMN "shippingMethodName" TEXT,
ADD COLUMN "shippingEstimate" TEXT;

CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");

ALTER TABLE "Order"
ADD CONSTRAINT "Order_shippingMethodId_fkey"
FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ShippingMethod"
("name","code","description","price","freeOver","estimatedDaysMin","estimatedDaysMax","active","isDefault","sortOrder","updatedAt")
VALUES
('Standard Delivery','STANDARD','Tracked UK delivery','3.99','35.00',2,4,true,true,10,CURRENT_TIMESTAMP),
('Express Delivery','EXPRESS','Faster tracked UK delivery','6.99',NULL,1,2,true,false,20,CURRENT_TIMESTAMP);
