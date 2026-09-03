ALTER TABLE "User"
 ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3),
 ADD COLUMN IF NOT EXISTS "emailVerificationTokenHash" TEXT,
 ADD COLUMN IF NOT EXISTS "emailVerificationExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "User_emailVerificationTokenHash_key"
ON "User"("emailVerificationTokenHash");
