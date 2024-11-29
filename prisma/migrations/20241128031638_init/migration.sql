/*
  Warnings:

  - You are about to drop the column `timestamp` on the `Communication` table. All the data in the column will be lost.
  - You are about to drop the column `group` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Member` table. All the data in the column will be lost.
  - Added the required column `dateTime` to the `Communication` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Communication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "dateTime" DATETIME NOT NULL,
    CONSTRAINT "Communication_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Communication_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Communication" ("id", "receiverId", "senderId") SELECT "id", "receiverId", "senderId" FROM "Communication";
DROP TABLE "Communication";
ALTER TABLE "new_Communication" RENAME TO "Communication";
CREATE TABLE "new_Member" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "image1" TEXT,
    "image2" TEXT
);
INSERT INTO "new_Member" ("id", "name") SELECT "id", "name" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
