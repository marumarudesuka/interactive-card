import type { CircuitConfigInput } from "./circuit";

export type EnergyFlowNodeType =
  | "grid"
  | "solar"
  | "battery"
  | "home"
  | "circuit";

export interface EnergyFlowNode {
  id: string;
  type: EnergyFlowNodeType;
  name: string;
  icon: string;
  power: number;
}

export interface EnergyFlowEdge {
  source: string;
  target: string;
  power: number;
  direction: "forward" | "reverse";
}

export interface EnergyFlowConfig {
  type?: string;
  title?: string;
  nodes: EnergyFlowNode[];
  edges: EnergyFlowEdge[];
  circuits?: CircuitConfigInput[];
  maxCircuits?: number;
}

export interface EnergyFlowPosition {
  x: number;
  y: number;
}

export interface EnergyFlowPath {
  id: string;
  edge: EnergyFlowEdge;
  path: string;
  color: string;
  width: number;
  duration: number;
}
