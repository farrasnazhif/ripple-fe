import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const code = ts.transpileModule(readFileSync("src/components/workspace/download-output-button.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const helperCode = ts.transpileModule(readFileSync("src/lib/download-file.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const states = [];
const downloads = [];
const revoked = [];
let calls = 0;
let reject = false;
const context = {
  exports: {},
  require(name) {
    if (name === "@/lib/download-file") return helper.exports;
    if (name === "react") return { useRef: value => ({ current: value }), useState: value => [value, next => states.push(next)] };
    if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === "axios") return { default: { async get(url, config) {
      calls++;
      assert.equal(config.responseType, "blob");
      if (reject) throw new Error("Download failed");
      return { data: new Blob(["image"], { type: "image/png" }) };
    } } };
    if (name === "@/components/ui/button") return { Button: "button" };
    throw new Error(name);
  },
  document: { body: { append() {} }, createElement() {
    return { click() { downloads.push({ href: this.href, filename: this.download, target: this.target }); }, remove() {} };
  } },
  URL: { createObjectURL: () => "blob:local-output", revokeObjectURL: value => revoked.push(value) },
  setTimeout: callback => callback(),
};
const helper = { ...context, exports: {} };
vm.runInNewContext(helperCode, helper);
vm.runInNewContext(code, context);
const render = () => context.exports.DownloadOutputButton({ url: "https://example.com/image", filename: "ripple-image", video: false });
const button = render().props.children[0];
assert.equal(button.props.children, "Download image");
await Promise.all([button.props.onClick(), button.props.onClick()]);
assert.equal(calls, 1, "Double click must not download twice");
assert.deepEqual(downloads, [{ href: "blob:local-output", filename: "ripple-image.png", target: undefined }]);
assert.deepEqual(revoked, ["blob:local-output"]);
await helper.exports.downloadFile("https://example.com/attachment", "reference.png");
assert.equal(downloads[1].filename, "reference.png");
reject = true;
await render().props.children[0].props.onClick();
assert(states.includes("Could not download this output. Please try again."));
assert.equal(downloads.length, 2, "Failed download must not navigate");
console.log("File downloads use a local blob, preserve the image extension, prevent duplicate clicks, and report failures without navigation.");
