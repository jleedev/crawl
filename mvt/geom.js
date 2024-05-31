import { windows, zigzagDecode } from "../util.js";

export const decodeGeometry = function* (values) {
  const it = Iterator.from(values);
  const next = () => {
    const { value, done } = it.next();
    if (done) throw new Error();
    return value;
  };
  const nextPoint = () => [zigzagDecode(next()), zigzagDecode(next())];
  let line;
  let x = 0,
    y = 0;
  while (true) {
    const { value, done } = it.next();
    if (done) break;
    const command_id = value & 0x7,
      count = value >> 3;
    switch (command_id) {
      case 1: // MoveTo
        for (let i = 0; i < count; i++) {
          const [dx, dy] = nextPoint();
          x += dx;
          y += dy;
          if (line) yield line;
          line = [];
          line.push({ x, y });
        }
        break;
      case 2: // LineTo
        for (let i = 0; i < count; i++) {
          const [dx, dy] = nextPoint();
            x += dx;
            y += dy;
            line.push({ x, y });
          };
        break;
      case 7: // ClosePath
        if (line) {
          const [{ x, y }] = line;
          line.push({ x, y });
        }
        break;
      default:
        throw new ValueError(command_id);
    }
  }
  if (line) yield line;
};

const signedArea = (ring) =>
  windows(ring, 2)
    .map(([p1, p2]) => (p2.x - p1.x) * (p1.y + p2.y))
    .reduce((a, x) => a + x, 0);

export const classifyRings = (rings) => {
  if (rings.length <= 1) return [rings];
  const polygons = [];
  let polygon, ccw;
  for (const ring of rings) {
    const area = signedArea(ring);
    if (area === 0) continue;
    if (ccw === undefined) ccw = area < 0;
    if (ccw === area < 0) {
      if (polygon) polygons.push(polygon);
      polygon = [ring];
    } else {
      polygon.push(ring);
    }
  }
  if (polygon) polygons.push(polygon);
  return polygons;
};
