import { GraphLink, GraphNode } from "@/types/graph";

export const transformGraphData = (
  members: { id: string; name: string }[],
  communications: { sender_id: string; receiver_id: string; communication_count: number }[]
) => {
  const nodes: GraphNode[] = members.map((member) => ({
    id: member.id,
    name: member.name,
    communicationCount: 0,
  }));

  const links: GraphLink[] = communications.map((comm) => ({
    source: comm.sender_id,
    target: comm.receiver_id,
    value: comm.communication_count,
  }));

  links.forEach((link) => {
    const node = nodes.find((n) => n.id === link.source || n.id === link.target);
    if (node) {
      node.communicationCount = (node.communicationCount || 0) + link.value;
    }
  });

  return { nodes, links };
};
