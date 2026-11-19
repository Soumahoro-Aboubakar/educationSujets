const TrafficDaily = require('../models/TrafficDaily');
const { CATEGORIES, classify, describe, isBot, sectionOf } = require('./traffic/sources');

/* Provenance des visites : enregistrement (compteurs du jour) et rapport pour l'administration. */

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);
const SECTIONS = ['accueil', 'sujets', 'preparation', 'abonnement', 'autre'];

/**
 * Une arrivée sur le site (une fois par session de navigation, envoyée par le site).
 * @returns {{ source: string, label: string, category: string } | null} null : robot, ignoré.
 */
const recordVisit = async ({ referrerHost, utmSource, path, standalone, userAgent }) => {
  if (isBot(userAgent)) return null;
  const source = classify({ referrerHost, utmSource, userAgent, standalone: Boolean(standalone) });
  await TrafficDaily.updateOne(
    { day: dayKey(), source: source.key, section: sectionOf(path) },
    { $inc: { visits: 1 }, $setOnInsert: { category: source.category } },
    { upsert: true }
  );
  return { source: source.key, label: source.label, category: source.category };
};

/** Inscription attribuée à la source de première arrivée (gardée 30 jours par le navigateur). */
const recordSignup = async ({ source, userAgent }) => {
  if (isBot(userAgent)) return false;
  const key = String(source || 'direct').slice(0, 60);
  if (!/^[a-z0-9._:-]+$/i.test(key)) return false;
  const known = describe(key);
  await TrafficDaily.updateOne(
    { day: dayKey(), source: known.key, section: 'autre' },
    { $inc: { signups: 1 }, $setOnInsert: { category: known.category } },
    { upsert: true }
  );
  return true;
};

const RANGES = { '7j': 7, '30j': 30, '90j': 90, '12m': 365 };

// Début de période (lundi pour les semaines, 1er du mois) : clé AAAA-MM-JJ.
const periodOf = (day, granularity) => {
  if (granularity === 'mois') return `${day.slice(0, 7)}-01`;
  if (granularity === 'semaine') {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    return dayKey(date);
  }
  return day;
};

const listPeriods = (from, to, granularity) => {
  const periods = new Set();
  for (const date = new Date(`${from}T00:00:00Z`); dayKey(date) <= to; date.setUTCDate(date.getUTCDate() + 1)) {
    periods.add(periodOf(dayKey(date), granularity));
  }
  return [...periods];
};

/**
 * Rapport : séries par période et par catégorie, totaux par source (période et période précédente),
 * répartition par rubrique d'arrivée.
 */
const report = async ({ range = '30j', granularity } = {}) => {
  const days = RANGES[range] || RANGES['30j'];
  const unit = ['jour', 'semaine', 'mois'].includes(granularity) ? granularity : days <= 30 ? 'jour' : days <= 90 ? 'semaine' : 'mois';
  const today = new Date();
  const start = new Date(today); start.setUTCDate(start.getUTCDate() - (days - 1));
  const previousStart = new Date(start); previousStart.setUTCDate(previousStart.getUTCDate() - days);
  const [from, to, previousFrom] = [dayKey(start), dayKey(today), dayKey(previousStart)];

  const rows = await TrafficDaily.find({ day: { $gte: previousFrom, $lte: to } }).lean();
  const current = rows.filter((row) => row.day >= from);
  const previous = rows.filter((row) => row.day < from);

  const periods = listPeriods(from, to, unit);
  const series = periods.map((period) => ({ period, categories: Object.fromEntries(Object.keys(CATEGORIES).map((key) => [key, 0])), total: 0 }));
  const indexOf = new Map(periods.map((period, index) => [period, index]));
  current.forEach((row) => {
    const point = series[indexOf.get(periodOf(row.day, unit))];
    if (!point) return;
    point.categories[row.category] = (point.categories[row.category] || 0) + row.visits;
    point.total += row.visits;
  });

  const totalsOf = (list) => {
    const map = new Map();
    list.forEach((row) => {
      const entry = map.get(row.source) || { ...describe(row.source), visits: 0, signups: 0, sections: Object.fromEntries(SECTIONS.map((key) => [key, 0])) };
      entry.visits += row.visits;
      entry.signups += row.signups;
      entry.sections[row.section] += row.visits;
      map.set(row.source, entry);
    });
    return map;
  };
  const now = totalsOf(current);
  const before = totalsOf(previous);
  const sources = [...now.values()]
    .map((entry) => ({ ...entry, previousVisits: before.get(entry.key)?.visits || 0 }))
    .sort((a, b) => b.visits - a.visits || b.signups - a.signups);

  const sum = (list, field) => list.reduce((total, row) => total + (row[field] || 0), 0);
  return {
    range, granularity: unit, from, to,
    categories: CATEGORIES,
    totals: {
      visits: sum(current, 'visits'), signups: sum(current, 'signups'),
      previousVisits: sum(previous, 'visits'), previousSignups: sum(previous, 'signups'),
    },
    series,
    sources,
  };
};

module.exports = { recordVisit, recordSignup, report, periodOf, dayKey };
