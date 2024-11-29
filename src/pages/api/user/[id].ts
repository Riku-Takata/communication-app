import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const user = await prisma.user.findUnique({ where: { id: parseInt(id as string) } });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const sent = await prisma.communication.findMany({
    where: { senderId: user.id },
    include: { receiver: true },
  });

  const received = await prisma.communication.findMany({
    where: { receiverId: user.id },
    include: { sender: true },
  });

  res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      totalSent: sent.reduce((sum, c) => sum + c.count, 0),
      totalReceived: received.reduce((sum, c) => sum + c.count, 0),
    },
    communications: sent.map((c) => ({
      receiver: c.receiver.name,
      count: c.count,
    })),
  });
}
