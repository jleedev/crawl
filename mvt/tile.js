import { ProtoBuf } from "./pb.js";
import { Layer } from "./layer.js";

export class Tile extends ProtoBuf {
  layers = { __proto__: null };
  static Builder = class extends ProtoBuf.Builder {
    static Target = Tile;
    layers = { __proto__: null };
    [3](layers) {
      const layer = Layer.parseFrom(layers);
      this.layers[layer.name] = layer;
    }
  };
}
