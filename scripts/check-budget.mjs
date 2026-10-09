import assert from "node:assert/strict";
import { parseBudget, usd } from "../src/lib/budget.ts";

assert.equal(parseBudget("0"), 0);
assert.equal(parseBudget("0.01"), 1);
assert.equal(parseBudget("10.10"), 1010);
assert.equal(parseBudget("1000000.00"), 100000000);
for (const value of ["", "-1", "1e3", "0.001", "1000000.01", "NaN", "Infinity", "1,000"]) {
  assert.equal(parseBudget(value), null, value);
}
assert.equal(usd(1010), "$10.10");
console.log("Budget amount checks passed.");
