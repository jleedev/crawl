import "./polyfill.js";

export class TileSource {
  constructor(tilejson) {
    this.tilejson = tilejson;
  }
  get minzoom() {
    return this.tilejson.minzoom;
  }
  get maxzoom() {
    return this.tilejson.maxzoom;
  }
  async fetchTile(z, x, y, signal) {
    const url = this.tilejson.tiles[0]
      .replace("{z}", z)
      .replace("{x}", x)
      .replace("{y}", y);
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(response.status);
    return response.bytes();
  }
}

export default TileSource;
