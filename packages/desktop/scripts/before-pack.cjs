module.exports = async ({ arch }) => {
  const { prepareRuntime } = await import("./prepare-runtime.mjs");
  await prepareRuntime(arch === 3 ? "arm64" : arch === 1 ? "x64" : String(arch));
};
