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
