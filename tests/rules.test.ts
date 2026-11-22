import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nyDate,
  nyTime,
  weekStart,
  guardrails,
  requirements,
  validate,
} from "../src/lib/rules";
import {
  blankAccount,
  emptyPack,
  newDay,
  type Item,
  type Pack,
} from "../src/lib/schema";
const now = new Date("2026-07-07T14:00:00Z"),
  account = {
    ...blankAccount,
    instruments: "TEST",
    windowStart: "09:30",
    windowEnd: "11:00",
    openMinutes: 5,
    risk: {
      perTrade: 1,
      dailyLoss: 4,
      dailyProfit: 8,
      weeklyLoss: 12,
      tradeLimit: 3,
    },
  };
const pack: Pack = {
  ...emptyPack,
  policy: {
    days: [2, 3, 4, 5],
    newsMinutes: 5,
    opening: "09:30",
    stopWin: true,
    stopLosses: 3,
    stopFlats: 3,
    prohibitedModels: ["Type 1"],
  },
};
function session() {
  return {
    ...newDay(account.id, nyDate(now)),
    fields: {
      calendar: "yes",
      news: "clear",
      risk: "1",
      instrument: "TEST",
      bias: "Bullish",
      model: "Type 3",
      tradingModel: "Model A",
      workspace: "Office",
      timeframeReviewed: "yes",
      prepared: "yes",
      riskReviewed: "yes",
    },
  };
}
const item: Item = {
  id: "a",
  parent: "",
  section: "entry-trigger",
  text: "Confirm",
  mode: "Required",
  heading: false,
  model: "Type 3",
  account: "",
  order: 1,
  source: "",
};
test("New York boundaries and daylight saving time", () => {
  assert.equal(nyDate(new Date("2026-01-06T04:59Z")), "2026-01-05");
  assert.equal(nyDate(new Date("2026-07-07T04:00Z")), "2026-07-07");
  assert.equal(nyTime(new Date("2026-03-08T07:00Z")), "03:00");
  assert.equal(weekStart("2026-01-04"), "2025-12-29");
});
test("required, prohibited, optional, scoped and linked responses", () => {
  const d = session();
  assert.equal(
    requirements([item], d, ["entry-trigger"])[0].status,
    "Incomplete",
  );
  d.answers.a = "N/A";
  assert.equal(
    requirements([item], d, ["entry-trigger"])[0].status,
    "Incomplete",
  );
  d.answers.a = "Yes";
  assert.equal(
    requirements([item, { ...item, id: "link", ref: "a" }], d, [
      "entry-trigger",
    ]).length,
    0,
  );
  assert.equal(
    requirements([{ ...item, mode: "Prohibited" }], d, ["entry-trigger"])[0]
      .status,
    "Invalid",
  );
  assert.equal(
    requirements(
      [
        { ...item, model: "Type 2(a)" },
        { ...item, account: "other" },
        { ...item, mode: "Optional" },
      ],
      d,
      ["entry-trigger"],
    ).length,
    0,
  );
});
test("unresolved or prohibited setups cannot validate", () => {
  const d = session();
  assert.equal(validate(pack, [], account, d, [], now).status, "Incomplete");
  d.answers.a = "Yes";
  assert.equal(validate(pack, [item], account, d, [], now).status, "Valid");
  d.fields.model = "Type 1";
  assert.equal(validate(pack, [item], account, d, [], now).status, "Invalid");
  d.fields.model = "Type 3";
  assert.equal(
    validate(
      pack,
      [
        item,
        { ...item, id: "offscreen", section: "rules", mode: "Unconfigured" },
      ],
      account,
      d,
      [],
      now,
    ).status,
    "Incomplete",
  );
});
test("loss limits stay triggered after a recovery and weekly aggregation includes today once", () => {
  const d = session();
  d.outcomes.push({ result: "Loss", amount: -4 }, { result: "Win", amount: 2 });
  const prev = {
    ...newDay(d.account, "2026-07-06"),
    outcomes: [{ result: "Loss" as const, amount: -8 }],
  };
  const reasons = guardrails(pack, account, d, [prev, d], now).map(
    (x) => x.reason,
  );
  assert(reasons.includes("Daily loss limit reached."));
  assert(reasons.includes("Weekly loss limit reached."));
  assert(reasons.includes("Stop after a winning trade."));
});
test("manual, trading day, news and opening restrictions", () => {
  const d = session();
  d.lock = "Manual stop";
  Object.assign(d.fields, { news: "event", newsTime: "10:05" });
  let reasons = guardrails(pack, account, d, [], now).map((x) => x.reason);
  assert(reasons.includes("Manual stop"));
  assert(reasons.includes("Within the red-folder news restriction."));
  d.date = "2026-07-06";
  reasons = guardrails(pack, account, d, [], new Date("2026-07-06T13:32Z")).map(
    (x) => x.reason,
  );
  assert(reasons.includes("Trading is closed on this day."));
  assert(reasons.includes("NYSE opening restriction is active."));
});
test("daily applicability cannot change the source requirement", () => {
  const rule: Item = { ...item, mode: "Unconfigured" };
  const day = newDay(account.id, nyDate(now));
  day.fields.model = rule.model;
  day.fields["applicability-" + rule.id] = "Required";
  assert.equal(
    requirements([rule], day, [rule.section])[0].status,
    "Incomplete",
  );
  day.answers[rule.id] = "Yes";
  assert.deepEqual(requirements([rule], day, [rule.section]), []);
  assert.equal(rule.mode, "Unconfigured");
  const tomorrow = newDay(day.account, "2026-07-08");
  tomorrow.fields.model = rule.model;
  assert.match(
    requirements([rule], tomorrow, [rule.section])[0].reason,
    /applicability/,
  );
});
