import type {
  EnergyFlowNode,
  EnergyFlowNodeType,
  EnergyFlowPosition,
} from "../types/energy-flow";

export interface EnergyFlowLayout {
  width: number;
  height: number;
  mobile: boolean;
  positions: Map<string, EnergyFlowPosition>;
}

function distribute(
  nodes: readonly EnergyFlowNode[],
  start: number,
  end: number,
  coordinate: (offset: number) => EnergyFlowPosition
): Map<string, EnergyFlowPosition> {
  const positions = new Map<string, EnergyFlowPosition>();
  nodes.forEach((node, index) => {
    const ratio = nodes.length <= 1 ? 0.5 : index / (nodes.length - 1);
    positions.set(node.id, coordinate(start + (end - start) * ratio));
  });
  return positions;
}

export function getEnergyFlowColor(type: EnergyFlowNodeType): string {
  if (type === "grid") return "var(--en-color-primary)";
  if (type === "solar") return "var(--en-color-accent)";
  if (type === "battery") return "var(--en-color-success)";
  if (type === "home") return "var(--en-color-primary-hover)";
  return "var(--en-text-secondary)";
}

export function createEnergyFlowLayout(
  nodes: readonly EnergyFlowNode[],
  width: number
): EnergyFlowLayout {
  const mobile = width < 620;
  let height = mobile ? 760 : 520;
  const positions = new Map<string, EnergyFlowPosition>();
  const home = nodes.find((node) => node.type === "home");
  const circuits = nodes.filter((node) => node.type === "circuit");
  const sources = nodes.filter(
    (node) => node.type !== "home" && node.type !== "circuit"
  );

  if (mobile) {
    sources.forEach((node, index) => {
      positions.set(node.id, {
        x: width / 2,
        y: 82 + index * 105,
      });
    });
    const homeY = 110 + sources.length * 105;
    if (home) positions.set(home.id, { x: width / 2, y: homeY });
    circuits.forEach((node, index) => {
      positions.set(node.id, {
        x: width / 2,
        y: homeY + 130 + index * 88,
      });
    });
    height = Math.max(
      760,
      homeY + 130 + Math.max(0, circuits.length - 1) * 88 + 70
    );
  } else {
    if (home) positions.set(home.id, { x: width / 2, y: 235 });
    const typePositions: Partial<Record<EnergyFlowNodeType, EnergyFlowPosition>> = {
      solar: { x: width / 2, y: 72 },
      grid: { x: width * 0.13, y: 235 },
      battery: { x: width * 0.87, y: 235 },
    };
    sources.forEach((node, index) => {
      positions.set(
        node.id,
        typePositions[node.type] ?? {
          x: width * (0.2 + index * 0.2),
          y: 72,
        }
      );
    });
    const circuitPositions = distribute(
      circuits,
      width * 0.12,
      width * 0.88,
      (x) => ({ x, y: 430 })
    );
    circuitPositions.forEach((position, id) => positions.set(id, position));
  }

  return { width, height, mobile, positions };
}

export function createEnergyFlowCurve(
  start: EnergyFlowPosition,
  end: EnergyFlowPosition,
  mobile: boolean
): string {
  if (mobile) {
    const middleY = (start.y + end.y) / 2;
    return `M ${start.x} ${start.y} C ${start.x} ${middleY}, ${end.x} ${middleY}, ${end.x} ${end.y}`;
  }
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  if (dy >= dx) {
    const middleY = (start.y + end.y) / 2;
    return `M ${start.x} ${start.y} C ${start.x} ${middleY}, ${end.x} ${middleY}, ${end.x} ${end.y}`;
  }
  const middleX = (start.x + end.x) / 2;
  return `M ${start.x} ${start.y} C ${middleX} ${start.y}, ${middleX} ${end.y}, ${end.x} ${end.y}`;
}
