"use client";

import { supabase } from "@/lib/SupabaseClient";
import React, { useRef, useState, useEffect, useCallback } from "react";
import ForceGraph3D, { ForceGraphMethods, LinkObject } from "react-force-graph-3d";

type GraphNode = {
  id: string;
  name: string;
  communicationCount?: number;
  x: number;
  y: number;
  z: number;
};

type GraphLink = {
  source: string;
  target: string;
  value: number;
};

const NetworkGraph = () => {
  const fgRef = useRef<ForceGraphMethods<GraphNode, LinkObject<GraphNode, GraphLink>> | undefined>();
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });
  const [focusedNode, setFocusedNode] = useState<string | null>(null);

  const fetchGraphData = async () => {
    try {
      const { data: members } = await supabase.from("members").select("*");
      const { data: communications } = await supabase.from("communications").select("*");

      const nodes = (members || []).map((member: { id: string; name: string }) => ({
        id: member.id,
        name: member.name,
        communicationCount: 0,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        z: Math.random() * 100 - 50,
      }));

      const links = (communications || []).map((comm: { sender_id: string; receiver_id: string; communication_count: number }) => ({
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

      setGraphData({ nodes, links });
    } catch (error) {
      console.error("Error fetching graph data", error);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  const handleClick = useCallback((node: GraphNode) => {
    setFocusedNode(node.id);

    if (fgRef.current) {
      const distance = 40;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        3000
      );
    }
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeRelSize={2} // 基準サイズを指定（固定値）
        nodeVal={(node: GraphNode) => 1 + Math.sqrt(node.communicationCount || 1) * 200} // サイズを動的に変更
        linkWidth={(link: GraphLink) => Math.log2(link.value + 1)} // リンクの幅を通信量に応じて変更
        linkColor={(link: GraphLink) =>
          `rgba(0, 0, 255, ${Math.min(link.value / 10, 1)} * 100)`
        } // リンクの透明度を通信量に応じて調整
        nodeLabel={(node: GraphNode) => `${node.name} (${node.communicationCount || 0})`}
        nodeColor={(node: GraphNode) => (node.id === focusedNode ? "yellow" : "red")}
        onNodeClick={handleClick}
      />
    </div>
  );
};

export default NetworkGraph;
