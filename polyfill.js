if (!Reflect.has(globalThis, "Iterator")) {
  const { default: value } = await import(
    "https://esm.run/core-js-pure/actual/iterator"
  );
  Reflect.defineProperty(globalThis, "Iterator", {
    writable: true,
    configurable: true,
    value,
  });
}
