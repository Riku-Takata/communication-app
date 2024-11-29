"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import ForceGraph3D, { ForceGraphMethods } from "react-force-graph-3d";
import SpriteText from "three-spritetext";

type NodeObject = {
  id: number;
  name: string;
  totalCommunications: number; // コミュニケーション量
  x: number;
  y: number;
  z: number;
};

type LinkObject = {
  source: number;
  target: number;
  count: number;
};

const NetworkGraph: React.FC = () => {
  const fgRef = useRef<ForceGraphMethods<NodeObject, LinkObject> | undefined>();
  const [graphData, setGraphData] = useState<{ nodes: NodeObject[]; links: LinkObject[] }>({
    nodes: [],
    links: [],
  });

  // APIからグラフデータを取得
  useEffect(() => {
    const fetchGraphData = async () => {
      const response = await fetch("/api/communications/get");
      const data = await response.json();

      // ノードの位置を調整
      const maxCommunication = Math.max(...data.nodes.map((node: NodeObject) => node.totalCommunications));
      const adjustedNodes = data.nodes.map((node: NodeObject) => ({
        ...node,
        z: maxCommunication - node.totalCommunications, // コミュニケーション量が多いほど遠くに配置
      }));

      setGraphData({
        nodes: adjustedNodes,
        links: data.links,
      });
    };

    fetchGraphData();
  }, []);

  // ノードクリック時のフォーカス
  const handleClick = useCallback((node: NodeObject) => {
    if (fgRef.current) {
      const focusDistance = 40;
      const distRatio = 1 + focusDistance / Math.hypot(node.x, node.y, node.z);

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
        nodeThreeObject={(node: NodeObject) => {
          const sprite = new SpriteText(node.name);
          sprite.color = "white";
          sprite.textHeight = 8;
          return sprite;
        }}
        nodeVal={(node: NodeObject) => node.totalCommunications} // ノードの大きさを通信量で調整
        linkColor={(link: LinkObject) => (link.count > 5 ? "red" : "blue")} // エッジ色
        linkWidth={(link: LinkObject) => link.count / 2} // エッジの太さ
        onNodeClick={handleClick}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={true}
        backgroundColor="rgba(0,0,0,0.8)"
      />
    </div>
  );
};

export default NetworkGraph;
