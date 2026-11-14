// --only filter shared by the scene modules (node build.mjs [id,id,...]).
export const ONLY = process.argv[2] || "";
export const want = id => !ONLY || ONLY.split(",").includes(id);
