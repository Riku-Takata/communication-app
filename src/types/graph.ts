// src/types/graph.ts

export interface NodeObject {
  id: number;
  name: string;
  group?: string;
  x?: number;
  y?: number;
  z?: number;
}

export interface LinkObject {
  source: number;
  target: number;
  value: number;
}

export interface GraphData {
  nodes: NodeObject[];
  links: LinkObject[];
}
