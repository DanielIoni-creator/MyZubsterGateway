/*
 * Pure logic behind the unified MYZ/XMR wallet dashboard.
 *
 * Kept free of the DOM so it can be unit tested under node:test, and shipped
 * as a UMD wrapper so the same file serves the browser and the test runner.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WalletDashboard = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DECIMALS = { XMR: 12, MYZ: 4 };

  /** Trailing-zero-trimmed fixed formatting; never scientific notation. */
  function formatAmount(value, currency) {
    var decimals = DECIMALS[currency] !== undefined ? DECIMALS[currency] : 6;
    var text = Number(value).toFixed(decimals);
    return text.indexOf('.') === -1 ? text : text.replace(/0+$/, '').replace(/\.$/, '');
  }

  function signedAmount(tx) {
    return tx.direction === 'CREDIT' ? Number(tx.amount) : -Number(tx.amount);
  }

  /** Balances per currency, derived from the transaction list rather than trusted. */
  function summariseBalances(transactions, currencies) {
    var list = currencies || ['MYZ', 'XMR'];
    var result = {};

    list.forEach(function (currency) {
      var rows = (transactions || []).filter(function (tx) { return tx.currency === currency; });
      var settled = 0;
      var pending = 0;
      var inflow = 0;
      var outflow = 0;

      rows.forEach(function (tx) {
        if (tx.state === 'PENDING') { pending += signedAmount(tx); return; }
        settled += signedAmount(tx);
        if (tx.direction === 'CREDIT') inflow += Number(tx.amount);
        else outflow += Number(tx.amount);
      });

      result[currency] = {
        currency: currency,
        available: round(settled),
        pending: round(pending),
        inflow: round(inflow),
        outflow: round(outflow),
        transactions: rows.length,
      };
    });

    return result;
  }

  function round(value) {
    return Number(Number(value).toFixed(12));
  }

  function dayKey(iso) {
    return String(iso).slice(0, 10);
  }

  /**
   * A closing-balance series with one point per day, including days that had no
   * activity — a chart that silently skips empty days misreads a flat week as a
   * busy one.
   */
  function buildSeries(transactions, options) {
    var opts = options || {};
    var currency = opts.currency || 'XMR';
    var days = opts.days || 14;
    var endKey = opts.today ? dayKey(opts.today) : dayKey(new Date().toISOString());

    var rows = (transactions || [])
      .filter(function (tx) { return tx.currency === currency && tx.state !== 'PENDING'; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });

    var end = new Date(endKey + 'T00:00:00.000Z');
    var keys = [];
    for (var i = days - 1; i >= 0; i -= 1) {
      keys.push(new Date(end.getTime() - i * 86400000).toISOString().slice(0, 10));
    }

    var perDay = {};
    var opening = 0;
    rows.forEach(function (tx) {
      var key = dayKey(tx.createdAt);
      if (key < keys[0]) { opening += signedAmount(tx); return; }
      if (key > keys[keys.length - 1]) return;
      perDay[key] = (perDay[key] || 0) + signedAmount(tx);
    });

    var running = opening;
    return keys.map(function (key) {
      var net = perDay[key] || 0;
      running += net;
      return { date: key, net: round(net), balance: round(running) };
    });
  }

  /** Inline SVG path: no charting library, nothing loaded from a CDN. */
  function sparklinePath(points, width, height, padding) {
    var pad = padding === undefined ? 4 : padding;
    if (!points || points.length === 0) return '';
    if (points.length === 1) return 'M ' + pad + ' ' + (height / 2) + ' L ' + (width - pad) + ' ' + (height / 2);

    var values = points.map(function (p) { return p.balance; });
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var span = max - min;
    var stepX = (width - pad * 2) / (points.length - 1);

    return points
      .map(function (point, index) {
        var x = pad + index * stepX;
        // An unchanged balance is drawn mid-box. Pinning a flat line to the
        // floor would read as "empty wallet" rather than "nothing moved".
        var y = span === 0
          ? height / 2
          : height - pad - ((point.balance - min) / span) * (height - pad * 2);
        return (index === 0 ? 'M ' : 'L ') + x.toFixed(2) + ' ' + y.toFixed(2);
      })
      .join(' ');
  }

  /**
   * Balance notifications. `low` fires on settled funds only: warning a user
   * their balance is low while a deposit is still confirming would be noise.
   */
  function balanceAlerts(balances, thresholds) {
    var rules = thresholds || {};
    var alerts = [];

    Object.keys(balances || {}).forEach(function (currency) {
      var balance = balances[currency];
      var low = rules[currency] && rules[currency].low;

      if (low !== undefined && balance.available < low) {
        alerts.push({
          level: 'warning',
          currency: currency,
          code: 'LOW_BALANCE',
          message: 'Saldo ' + currency + ' sotto la soglia (' + formatAmount(balance.available, currency) + ' < ' + formatAmount(low, currency) + ')',
        });
      }
      if (balance.available < 0) {
        alerts.push({ level: 'error', currency: currency, code: 'NEGATIVE_BALANCE', message: 'Saldo ' + currency + ' negativo' });
      }
      if (balance.pending !== 0) {
        alerts.push({
          level: 'info',
          currency: currency,
          code: 'PENDING_FUNDS',
          message: formatAmount(balance.pending, currency) + ' ' + currency + ' in attesa di conferma',
        });
      }
    });

    return alerts;
  }

  var CSV_COLUMNS = ['createdAt', 'currency', 'direction', 'amount', 'state', 'counterparty', 'reference'];

  function csvCell(value) {
    var text = value === null || value === undefined ? '' : String(value);
    // A leading =, +, - or @ makes a spreadsheet treat the cell as a formula,
    // so it is prefixed before quoting.
    if (/^[=+\-@]/.test(text)) text = "'" + text;
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function toCsv(transactions) {
    var rows = (transactions || []).map(function (tx) {
      return CSV_COLUMNS.map(function (column) { return csvCell(tx[column]); }).join(',');
    });
    return [CSV_COLUMNS.join(',')].concat(rows).join('\n');
  }

  return {
    formatAmount: formatAmount,
    summariseBalances: summariseBalances,
    buildSeries: buildSeries,
    sparklinePath: sparklinePath,
    balanceAlerts: balanceAlerts,
    toCsv: toCsv,
    CSV_COLUMNS: CSV_COLUMNS,
  };
});
