const workerPool = new Set();

export let workerUrl = import.meta.resolve("./render_worker.js");

function getWorker() {
  if (workerPool.size) {
    let [result] = workerPool.keys();
    return result;
  }
  const worker = new Worker(new URL(workerUrl), { type: "module" });
  workerPool.add(worker);
  worker.addEventListener("error", () => workerPool.delete(worker));
  return worker;
};

export async function renderInWorker(tiledata, tileSize) {
  if (!(ArrayBuffer.isView(tiledata) && tiledata instanceof Uint8Array))
    throw new TypeError();
  const { port1, port2 } = new MessageChannel();
  const worker = getWorker();
  worker.postMessage(
    { tiledata, tileSize, port: port2 },
    { transfer: [tiledata.buffer, port2] },
  );
  const { promise, resolve, reject } = Promise.withResolvers();
  port1.addEventListener("message", resolve);
  port1.addEventListener("messageerror", reject);
  port1.addEventListener("close", reject);
  worker.addEventListener("error", reject);
  port1.start();
  const { data } = await promise;
  return data;
};
