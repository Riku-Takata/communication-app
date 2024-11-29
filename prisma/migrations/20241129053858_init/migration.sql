/*
  Warnings:

  - A unique constraint covering the columns `[senderId,receiverId]` on the table `Communication` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Communication_senderId_receiverId_key" ON "Communication"("senderId", "receiverId");
