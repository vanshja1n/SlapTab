const test = require("node:test");
const assert = require("node:assert/strict");
const {
  matchesPattern,
  getDecision,
  todayKey
} = require("../src/rules.js");

function date(time) {
  return new Date(`2026-05-04T${time}:00`);
}

function state(site, usage = {}, unlocks = {}) {
  return {
    settings: { sites: [site] },
    usage,
    unlocks
  };
}

const baseSite = {
  id: "site-1",
  pattern: "example.com",
  enabled: true,
  dailyLimitMinutes: 30
};

test("matches exact domains and subdomains", () => {
  assert.equal(matchesPattern("example.com", "example.com"), true);
  assert.equal(matchesPattern("www.example.com", "example.com"), true);
  assert.equal(matchesPattern("app.example.com", "example.com"), true);
  assert.equal(matchesPattern("notexample.com", "example.com"), false);
});

test("does not track unmatched or disabled sites", () => {
  assert.deepEqual(getDecision(state(baseSite), "other.com", date("10:00")), {
    blocked: false,
    tracked: false
  });
  assert.deepEqual(getDecision(state({ ...baseSite, enabled: false }), "example.com", date("10:00")), {
    blocked: false,
    tracked: false
  });
});

test("treats missing enabled field as enabled", () => {
  const decision = getDecision(state({ ...baseSite, enabled: undefined }), "example.com", date("10:00"));
  assert.equal(decision.tracked, true);
  assert.equal(decision.blocked, false);
});

test("allows access before daily active-time limit", () => {
  const now = date("10:00");
  const usage = { [todayKey(now)]: { "site-1": 29 * 60 } };
  const decision = getDecision(state(baseSite, usage), "example.com", now);
  assert.equal(decision.blocked, false);
  assert.equal(decision.reason, "time_limit");
});

test("blocks after daily active-time limit", () => {
  const now = date("10:00");
  const usage = { [todayKey(now)]: { "site-1": 30 * 60 } };
  const decision = getDecision(state(baseSite, usage), "example.com", now);
  assert.equal(decision.blocked, true);
  assert.equal(decision.reason, "time_limit");
});

test("daily limit zero disables blocking", () => {
  const now = date("10:00");
  const usage = { [todayKey(now)]: { "site-1": 999999 } };
  const decision = getDecision(state({ ...baseSite, dailyLimitMinutes: 0 }, usage), "example.com", now);
  assert.equal(decision.blocked, false);
});

test("temporary unlock bypasses the daily limit", () => {
  const now = date("20:00");
  const usage = { [todayKey(now)]: { "site-1": 999999 } };
  const unlocks = { "site-1": now.getTime() + 60_000 };
  const decision = getDecision(state(baseSite, usage, unlocks), "example.com", now);
  assert.equal(decision.blocked, false);
  assert.equal(decision.unlockedUntil, unlocks["site-1"]);
});
