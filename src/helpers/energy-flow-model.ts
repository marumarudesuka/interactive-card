import {
  createEnergyFlowCurve,
  getEnergyFlowColor,
  type EnergyFlowLayout,
} from "./energy-flow-layout";
import type {
  EnergyFlowEdge,
  EnergyFlowNode,
  EnergyFlowPath,
} from "../types/energy-flow";

export function resolveEnergyFlowPaths(
  nodes: readonly EnergyFlowNode[],
  edges: readonly EnergyFlowEdge[],
  layout: EnergyFlowLayout
): EnergyFlowPath[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  return edges.flatMap((edge, index) => {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (!sourceNode || !targetNode) return [];
    const reverse = edge.direction === "reverse";
    const flowSourceNode = reverse ? targetNode : sourceNode;
    const start = layout.positions.get(
      reverse ? targetNode.id : sourceNode.id
    );
    const end = layout.positions.get(
      reverse ? sourceNode.id : targetNode.id
    );
    if (!start || !end) return [];
    const power = Math.abs(edge.power);
    return [{
      id: `energy-flow-path-${index}`,
      edge,
      path: createEnergyFlowCurve(start, end, layout.mobile),
      color: getEnergyFlowColor(flowSourceNode.type),
      width: Math.min(8, 1.5 + Math.sqrt(power) / 13),
      duration: Math.max(1.2, 5 - Math.min(3.8, power / 1200)),
    }];
  });
}
