import { KNOB_SIZE, KNOB_VARIATION } from '../constants';

type Point = [number, number];
type Curve = [Point, Point, Point][];

export interface PieceEdges {
  top: Curve | null;
  right: Curve | null;
  bottom: Curve | null;
  left: Curve | null;
}

// Форма ушка: кубические кривые в координатах (доля длины стороны, высота наружу от 0 до 1)
const KNOB_CURVE: Curve = [
  [[0.12, 0], [0.24, 0], [0.36, 0]],
  [[0.39, 0], [0.45, 0.2], [0.41, 0.42]],
  [[0.31, 0.7], [0.4, 1], [0.5, 1]],
  [[0.6, 1], [0.69, 0.7], [0.59, 0.42]],
  [[0.55, 0.2], [0.61, 0], [0.64, 0]],
  [[0.76, 0], [0.88, 0], [1, 0]],
];

function randomKnob(random: () => number): Curve {
  const vary = (amount: number) => (random() * 2 - 1) * amount;
  const direction = random() < 0.5 ? 1 : -1;
  const center = 0.5 + vary(KNOB_VARIATION.shift);
  const width = 1 + vary(KNOB_VARIATION.width);
  const height = 1 + vary(KNOB_VARIATION.height);
  const startWave = vary(KNOB_VARIATION.wave);
  const endWave = vary(KNOB_VARIATION.wave);

  // Крайние участки остаются у углов, меняется только ушко и изгиб прямых частей
  return KNOB_CURVE.map((segment, i) =>
    segment.map(([t, n], j): Point => {
      const isFlat = (i === 0 && j < 2) || i === 5;
      if (!isFlat) return [center + (t - 0.5) * width, n * height * direction];
      if (i === 0 && j === 0) return [t, startWave * direction];
      if (i === 5 && j === 1) return [t, endWave * direction];
      return [t, n];
    }),
  ) as Curve;
}

// Та же граница, пройденная соседом в обратную сторону и со своей стороны
function mirror(curve: Curve | null): Curve | null {
  if (!curve) return null;
  const points: Point[] = [[0, 0], ...curve.flat()];
  const reversed = points.reverse().map(([t, n]): Point => [1 - t, -n]);
  const result: Curve = [];
  for (let i = 1; i < reversed.length; i += 3) {
    result.push([reversed[i], reversed[i + 1], reversed[i + 2]]);
  }
  return result;
}

export function seededRandom(seed: number): () => number {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

export function generateEdges(rows: number, cols: number, random = Math.random): PieceEdges[][] {
  const edges: PieceEdges[][] = [];
  for (let row = 0; row < rows; row++) {
    edges.push([]);
    for (let col = 0; col < cols; col++) {
      edges[row].push({
        top: row > 0 ? mirror(edges[row - 1][col].bottom) : null,
        left: col > 0 ? mirror(edges[row][col - 1].right) : null,
        right: col < cols - 1 ? randomKnob(random) : null,
        bottom: row < rows - 1 ? randomKnob(random) : null,
      });
    }
  }
  return edges;
}

export function createPiecePath(x: number, y: number, size: number, edges: PieceEdges): Path2D {
  const corners: Point[] = [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
  ];
  const sides = [edges.top, edges.right, edges.bottom, edges.left];

  const path = new Path2D();
  path.moveTo(x, y);
  for (let i = 0; i < 4; i++) {
    traceEdge(path, corners[i], corners[(i + 1) % 4], sides[i]);
  }
  path.closePath();
  return path;
}

function traceEdge(path: Path2D, [fromX, fromY]: Point, [toX, toY]: Point, curve: Curve | null): void {
  if (!curve) {
    path.lineTo(toX, toY);
    return;
  }

  const dx = toX - fromX;
  const dy = toY - fromY;
  const normalX = dy * KNOB_SIZE;
  const normalY = -dx * KNOB_SIZE;
  const at = ([t, n]: Point): Point => [fromX + dx * t + normalX * n, fromY + dy * t + normalY * n];

  for (const [c1, c2, end] of curve) {
    path.bezierCurveTo(...at(c1), ...at(c2), ...at(end));
  }
}
