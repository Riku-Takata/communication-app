// src/types/graph.ts

export interface NodeObject {
  id: number;
  name: string;
  group?: string;
  smile_image_url: string;
  tearful_image_url: string;
  x?: number;
  y?: number;
  z?: number;
}

export interface LinkObject {
  source: number | NodeObject;
  target: number | NodeObject;
  value: number;
}

export interface GraphData {
  nodes: NodeObject[];
  links: LinkObject[];
}
