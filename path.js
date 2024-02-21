export const path = () => {
  let cx;
  let pr = 4.5;
  const handler = {
    FeatureCollection(geom) {
      geom.features.forEach((feat) => this.Feature(feat));
    },
    Feature(feat) {
      const { geometry } = feat;
      if (geometry !== null) this[geometry.type](geometry);
    },
    GeometryCollection(geom) {
      geom.geometries.forEach((geometry) => this[geometry.type](geometry));
    },
    Point(geom) {
      const { coordinates } = geom;
      if (!coordinates.length) return;
      const [x, y] = coordinates;
      cx.moveTo(x + pr, y);
      cx.ellipse(x, y, pr, pr, 0, 0, 2 * Math.PI, false);
    },
    MultiPoint(geom) {
      geom.coordinates.forEach((coordinates) => this.Point({ coordinates }));
    },
    LineString(geom) {
      const { coordinates } = geom;
      if (!coordinates.length) return;
      coordinates.forEach(([x, y], i) =>
        i ? cx.lineTo(x, y) : cx.moveTo(x, y),
      );
    },
    MultiLineString(geom) {
      geom.coordinates.forEach((coordinates) =>
        this.LineString({ coordinates }),
      );
    },
    Polygon(geom) {
      geom.coordinates.forEach((coordinates) =>
        this.LineString({ coordinates }),
      );
    },
    MultiPolygon(geom) {
      geom.coordinates.forEach((coordinates) => this.Polygon({ coordinates }));
    },
  };
  const handle = (geom) => handler[geom.type](geom);
  return Object.assign(handle, {
    context(value) {
      if (!arguments.length) return cx;
      cx = value;
      return this;
    },
    pointRadius(value) {
      if (!arguments.length) return pr;
      pr = value;
      return this;
    },
  });
};
