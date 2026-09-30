const test = require('node:test');
const assert = require('node:assert/strict');
const baseConfig = require('../config/billing');
const {
  quoteNextPayment,
  computeCycleEnd,
  resolveSubscriptionStatus,
  addMonthsUTC,
} = require('../services/billing/pricing');

const d = (iso) => new Date(`${iso}T00:00:00.000Z`);
const withRule = (rule) => ({ ...baseConfig, annualRenewal: { ...baseConfig.annualRenewal, lateStartRule: rule } });

test('first payment is an initial payment covering 4 months', () => {
  const quote = quoteNextPayment({ subscription: null, now: d('2026-03-10') });
  assert.equal(quote.kind, 'initial');
  assert.equal(quote.amount, 2000);
  assert.deepEqual(quote.periodEnd, d('2026-07-10'));
  assert.deepEqual(quote.cycleEnd, d('2027-01-01'));
});

test('valid promo code lowers the initial payment to 1500', () => {
  const quote = quoteNextPayment({ subscription: null, now: d('2026-03-10'), promoApplicable: true });
  assert.equal(quote.amount, 1500);
  assert.equal(quote.discount, 500);
});

test('after the initial period, payments are monthly until the anchor', () => {
  const subscription = { cycleStart: d('2026-03-10'), currentPeriodEnd: d('2026-07-10') };
  const quote = quoteNextPayment({ subscription, now: d('2026-07-05'), promoApplicable: true });
  assert.equal(quote.kind, 'monthly');
  assert.equal(quote.amount, 500, 'promo never applies to monthly payments');
  assert.deepEqual(quote.periodStart, d('2026-07-10'), 'early payment extends from current period end');
  assert.deepEqual(quote.periodEnd, d('2026-08-10'));
});

test('the annual anchor triggers a new initial payment', () => {
  const subscription = { cycleStart: d('2026-03-10'), currentPeriodEnd: d('2027-01-10') };
  const quote = quoteNextPayment({ subscription, now: d('2027-01-05') });
  assert.equal(quote.kind, 'initial');
  assert.equal(quote.amount, 2000);
  assert.deepEqual(quote.cycleEnd, d('2028-01-01'));
});

test('expired subscription restarts from now', () => {
  const subscription = { cycleStart: d('2026-03-10'), currentPeriodEnd: d('2026-08-10') };
  const quote = quoteNextPayment({ subscription, now: d('2026-10-01') });
  assert.equal(quote.kind, 'monthly');
  assert.deepEqual(quote.periodStart, d('2026-10-01'));
});

test('late start (August) — rule A renews at the next 1st of January', () => {
  assert.deepEqual(computeCycleEnd(d('2026-08-15'), withRule('A')), d('2027-01-01'));
});

test('late start (August) — rule B skips to the following anchor', () => {
  assert.deepEqual(computeCycleEnd(d('2026-08-15'), withRule('B')), d('2028-01-01'));
  assert.deepEqual(computeCycleEnd(d('2026-07-31'), withRule('B')), d('2027-01-01'));
});

test('an initial period crossing the anchor renews when it ends', () => {
  const subscription = { cycleStart: d('2026-10-01'), currentPeriodEnd: d('2027-02-01') };
  const quote = quoteNextPayment({ subscription, now: d('2027-01-20'), config: withRule('A') });
  assert.equal(quote.kind, 'initial');
  assert.deepEqual(quote.periodStart, d('2027-02-01'));
});

test('month arithmetic clamps to the end of month', () => {
  assert.deepEqual(addMonthsUTC(d('2026-10-31'), 4), d('2027-02-28'));
});

test('subscription status is derived from dates', () => {
  const now = d('2026-05-01');
  assert.equal(resolveSubscriptionStatus({ subscription: null, now }), 'NONE');
  assert.equal(resolveSubscriptionStatus({ subscription: null, now, hasPendingPayment: true }), 'PENDING');
  assert.equal(resolveSubscriptionStatus({ subscription: { currentPeriodEnd: d('2026-06-01') }, now }), 'ACTIVE');
  assert.equal(resolveSubscriptionStatus({ subscription: { currentPeriodEnd: d('2026-04-01') }, now }), 'EXPIRED');
});
