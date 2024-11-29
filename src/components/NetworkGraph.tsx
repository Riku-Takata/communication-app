// components/NetworkGraph.tsx
"use client";

import React from "react";
import ForceGraph3d from "react-force-graph-3d";

// Generate random graph data
const N = 30;
const gData = {
  nodes: Array.from({ length: N }, (_, i) => ({ id: i })),
  links: Array.from({ length: N }, (_, id) => id)
    .filter((id) => id !== 0)
    .map((id) => ({
      source: id,
      target: Math.floor(Math.random() * id),
    })),
};

const NetworkGraph: React.FC = () => {
  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <ForceGraph3d
        backgroundColor="rgba(0,0,0,0)"
        nodeColor={() => "red"}
        linkColor={() => "blue"}
        graphData={gData}
      />
    </div>
  );
};

export default NetworkGraph;
