const doFetch = async (...request) => {
  const response = await fetch(...request);
  if (!response.ok) throw new Error(response.status);
  return response;
};

const json = async (...request) => (await doFetch(...request)).json();
const buffer = async (...request) => (await doFetch(...request)).arrayBuffer();

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
  static async fromTileJSON(url) {
    return new TileSource(await json(url));
  }
  async fetchTile(z, x, y) {
    const url = this.tilejson.tiles[0]
      .replace("{z}", z)
      .replace("{x}", x)
      .replace("{y}", y);
    return new Uint8Array(await buffer(url));
  }
}
