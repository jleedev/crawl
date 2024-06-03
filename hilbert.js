
const tzValues = [0x0, 0x1, 0x5, 0x15, 0x55, 0x155, 0x555, 0x1555, 0x5555, 0x15555, 0x55555, 0x155555, 0x555555, 0x1555555, 0x5555555, 0x15555555, 0x55555555, 0x155555555, 0x555555555, 0x1555555555, 0x5555555555, 0x15555555555, 0x55555555555, 0x155555555555, 0x555555555555, 0x1555555555555, 0x5555555555555];

export const zxyToTileId = (z, x, y) => {
  if (z > 26) throw new RangeError(`${z} > 26`);
  if (x > 2 ** z - 1 || y > 2 ** z - 1) throw new RangeError();
  const acc = tzValues[z];
  const n = 2 ** z;
  let rx = 0;
  let ry = 0;
  let d = 0;
  const xy = [x, y];
  let s = n / 2;
  while (s > 0) {
    rx = +!!(xy[0] & s);
    ry = +!!(xy[1] & s);
    d += s * s * ((3 * rx) ^ ry);
    rotate(s, xy, rx, ry);
    s = s / 2;
  }
  return acc + d;
};

export const tileIdToZxy = (i) => {
  let acc = 0;
  for (let z = 0; z < 27; z++) {
    const numTiles = (1 << z) * (1 << z);
    if (acc + numTiles > i)
      return idOnLevel(z, i - acc);
    acc += numTiles;
  }
  throw new RangeError();
}

const rotate = (n, xy, rx, ry) => {
  if (ry === 0) {
    if (rx === 1) {
      xy[0] = n - 1 - xy[0];
      xy[1] = n - 1 - xy[1];
    }
    [xy[0], xy[1]] = [xy[1], xy[0]];
  }
}

const idOnLevel = (z, pos) => {
  const n = 2 ** z;
  let rx = pos;
  let ry = pos;
  let t = pos;
  const xy = [0, 0];
  let s = 1;
  while (s < n) {
    rx = 1 & (t / 2);
    ry = 1 & (t ^ rx);
    rotate(s, xy, rx, ry);
    xy[0] += s * rx;
    xy[1] += s * ry;
    t /= 4;
    s *= 2;
  }
  return [z, xy[0], xy[1]];
}
