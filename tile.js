import { ProtoBuf } from "./pb.js";
import { Layer } from "./layer.js";

export class Tile extends ProtoBuf {
  layers = { __proto__: null };
  static Parser = class {
    [3](layers) {
      const layer = Layer.parseFrom(layers);
      this.layers[layer.name] = layer;
    }
  };
}
