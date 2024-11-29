import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { sender, receiver } = req.body;

  if (!sender || !receiver) {
    return res.status(400).json({ message: "Sender and receiver are required" });
  }

  const senderUser = await prisma.user.findUnique({ where: { name: sender } });
  const receiverUser = await prisma.user.findUnique({ where: { name: receiver } });

  if (!senderUser || !receiverUser) {
    return res.status(404).json({ message: "User not found" });
  }

  await prisma.communication.upsert({
    where: {
      senderId_receiverId: {
        senderId: senderUser.id,
        receiverId: receiverUser.id,
      },
    },
    update: {
      count: { increment: 1 },
    },
    create: {
      senderId: senderUser.id,
      receiverId: receiverUser.id,
      count: 1,
    },
  });

  return res.status(200).json({ success: true });
}
