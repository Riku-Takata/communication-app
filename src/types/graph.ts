export interface GraphNode {
  id: string;
  name: string;
  communicationCount?: number;
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}
