export const getChildren = ([z, x, y]) => ({
  y: [z + 1, x * 2, y * 2],
  u: [z + 1, x * 2 + 1, y * 2],
  b: [z + 1, x * 2, y * 2 + 1],
  n: [z + 1, x * 2 + 1, y * 2 + 1],
});

export const getParent = ([z, x, y]) => [z - 1, x >> 1, y >> 1];

export const zoomOut = ([z, x, y]) =>
  Object.entries(getChildren(getParent([z, x, y]))).find(([k, v]) =>
    eq([z, x, y], v),
  )[0];

const eq = ([z1, x1, y1], [z2, x2, y2]) => z1 === z2 && x1 === x2 && y1 === y2;

export const toQuadKey = (/** @type number */ z, /** @type number */ x, /** @type number */ y) => {
  let result = '';
  for (let i = z - 1; i >= 0; i--) {
    let digit = 0;
    const mask = 1 << i;
    if (x & mask) digit += 1;
    if (y & mask) digit += 2;
    result += digit;
  }
  return result;
};

/** @returns {[number, number, number]} */
export const fromQuadKey = (/** @type string */ quadKey) => {
  let x = 0, y = 0;
  const z = quadKey.length;
  for (let i = z - 1; i >= 0; i--) {
    const mask = 1 << i;
    switch (quadKey[z - i - 1]) {
      case '0':
        break;
      case '1':
        x |= mask;
        break;
      case '2':
        y |= mask;
        break;
      case '3':
        x |= mask;
        y |= mask;
        break;
      default:
        throw new RangeError();
    }
  }
  return [z, x, y];
};

const tzValues = [0x0, 0x1, 0x5, 0x15, 0x55, 0x155, 0x555, 0x1555, 0x5555, 0x15555, 0x55555, 0x155555, 0x555555, 0x1555555, 0x5555555, 0x15555555, 0x55555555, 0x155555555, 0x555555555, 0x1555555555, 0x5555555555, 0x15555555555, 0x55555555555, 0x155555555555, 0x555555555555, 0x1555555555555, 0x5555555555555];

export const toTileID = (/** @type number */ z, /** @type number */ x, /** @type number */ y) => {
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

export const fromTileId = (/** @type number */ i) => {
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
