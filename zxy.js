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
