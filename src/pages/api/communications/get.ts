import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const nodes = await prisma.user.findMany();
  const links = await prisma.communication.findMany({
    include: { sender: true, receiver: true },
  });

  const graphData = {
    nodes: nodes.map((user) => ({
      id: user.id,
      name: user.name,
      totalCommunications: links
        .filter((link) => link.senderId === user.id || link.receiverId === user.id)
        .reduce((sum, link) => sum + link.count, 0),
    })),
    links: links.map((link) => ({
      source: link.senderId,
      target: link.receiverId,
      count: link.count,
    })),
  };

  res.status(200).json(graphData);
}
