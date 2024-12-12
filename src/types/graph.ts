// src/types/graph.ts

export interface NodeObject {
  id: number;
  name: string;
  group?: string;
  smile_image_url: string;
  tearful_image_url: string;
  tearful_emotion1?: string;
  tearful_emotion2?: string;
  smile_emotion1?: string;
  smile_emotion2?: string;
  x?: number;
  y?: number;
  z?: number;

  dailyValue?: number;
}

export interface LinkObject {
  source: number | NodeObject;
  target: number | NodeObject;
  value: number;

  dailyValue?: number;
}

export interface GraphData {
  nodes: NodeObject[];
  links: LinkObject[];
}
