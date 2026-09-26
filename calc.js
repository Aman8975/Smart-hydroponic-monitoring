/* Pure calculation helpers. No DOM access here, so these are easy to test. */
(function () {
  var UNIT_FACTOR = { ec: 1, ppm500: 500, ppm700: 700 };

  // Meter reading (in the user's unit) -> EC in mS/cm
  function toEC(value, unit) { return value / UNIT_FACTOR[unit || 'ec']; }
  // EC in mS/cm -> the user's unit
  function fromEC(ec, unit) { return ec * UNIT_FACTOR[unit || 'ec']; }

  function formatStrength(ec, unit) {
    if (ec == null || isNaN(ec)) return '–';
    if (!unit || unit === 'ec') return (Math.round(ec * 100) / 100).toFixed(ec < 1 ? 2 : 1).replace(/0$/, '').replace(/\.$/, '');
    return String(Math.round(fromEC(ec, unit) / 10) * 10);
  }
  function unitLabel(unit) {
    return unit === 'ppm500' ? 'ppm (500)' : unit === 'ppm700' ? 'ppm (700)' : 'EC';
  }

  function daysBetween(fromISO, toISO) {
    var a = Date.parse(fromISO + 'T00:00:00');
    var b = Date.parse(toISO + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  // Day 1 = the sowing/planting date
  function cropDay(startISO, todayISO) { return daysBetween(startISO, todayISO) + 1; }

  function stageFor(crop, day) {
    for (var i = 0; i < crop.stages.length; i++) {
      if (day <= crop.stages[i].until) return crop.stages[i];
    }
    return crop.stages[crop.stages.length - 1];
  }

  /*
   * Tank top-up / correction, mixing both nutrient parts equally (A+B).
   *   capacity   litres when full (defaults to current volume)
   *   volume     litres now in tank
   *   ecNow      EC now (mS/cm)
   *   ecTarget   EC wanted once the tank is full
   *   ecWater    EC of the water used to fill (RO ~0.0–0.1, borewell often 0.5–1.5)
   *   mlPerLPerEC  ml of EACH part per litre that raises EC by 1.0
   * Returns { action: 'dose' | 'drain' | 'ok' | 'error', ... }
   */
  function tankPlan(p) {
    var cap = p.capacity > 0 ? p.capacity : p.volume;
    var V = p.volume, c = p.ecNow, t = p.ecTarget, s = p.ecWater || 0, k = p.mlPerLPerEC;
    if (!(V > 0) || !(cap > 0) || isNaN(c) || isNaN(t) || !(k > 0)) return { action: 'error', reason: 'missing' };
    if (V > cap) return { action: 'error', reason: 'overfull' };
    if (t <= s) return { action: 'error', reason: 'waterTooStrong' };

    var water = cap - V;
    // "EC·litres" still needed once the tank is filled with plain water
    var deficit = t * cap - c * V - s * water;
    var ecIfWaterOnly = (c * V + s * water) / cap;

    if (Math.abs(deficit) < 0.02 * cap) {
      return { action: 'ok', addWater: water, finalEC: ecIfWaterOnly };
    }
    if (deficit > 0) {
      var ml = deficit * k;
      return { action: 'dose', addWater: water, mlEach: ml, finalEC: t, ecIfWaterOnly: ecIfWaterOnly };
    }
    // Too strong: drain some, then refill to capacity with water
    var keep = cap * (t - s) / (c - s);
    var drain = V - keep;
    return { action: 'drain', drain: drain, addWater: cap - keep, finalEC: t, ecIfWaterOnly: ecIfWaterOnly };
  }

  /*
   * pH correction estimate. mlPer100LPerUnit = ml of pH-down (or pH-up) that moved
   * 100 L of the grower's water by 1.0 pH during calibration.
   */
  function phPlan(p) {
    var V = p.volume, now = p.phNow, target = p.phTarget;
    if (!(V > 0) || isNaN(now) || isNaN(target)) return { action: 'error', reason: 'missing' };
    var diff = now - target;
    if (Math.abs(diff) < 0.1) return { action: 'ok' };
    var dir = diff > 0 ? 'down' : 'up';
    var k = dir === 'down' ? p.downMlPer100L : p.upMlPer100L;
    if (!(k > 0)) return { action: 'error', reason: 'missing' };
    var ml = Math.abs(diff) * k * V / 100;
    return { action: dir, ml: ml, firstDose: ml / 2 };
  }

  // Calibration: "I added X ml of each part to V litres and EC went from a to b"
  function calibrateNutrient(ml, litres, ecBefore, ecAfter) {
    var rise = ecAfter - ecBefore;
    if (!(ml > 0) || !(litres > 0) || !(rise > 0)) return null;
    return ml / litres / rise;
  }
  // "I added X ml to V litres and pH went from a to b"
  function calibratePh(ml, litres, phBefore, phAfter) {
    var change = Math.abs(phBefore - phAfter);
    if (!(ml > 0) || !(litres > 0) || !(change > 0)) return null;
    return ml / (litres / 100) / change;
  }

  // Grade a value against a [min,max] range. `slack` = how far outside still counts as "warn".
  function grade(value, range, slack) {
    if (value == null || isNaN(value) || !range) return null;
    if (value >= range[0] && value <= range[1]) return 'ok';
    if (value >= range[0] - slack && value <= range[1] + slack) return 'warn';
    return 'bad';
  }
  function gradeEC(ec, range) { return grade(ec, range, Math.max(0.15, range ? range[1] * 0.1 : 0)); }
  function gradePH(ph, range) { return grade(ph, range, 0.3); }
  function gradeWaterTemp(t) {
    if (t == null || isNaN(t)) return null;
    if (t > 28 || t < 12) return 'bad';
    if (t > 25 || t < 16) return 'warn';
    return 'ok';
  }

  window.Calc = {
    toEC: toEC, fromEC: fromEC, formatStrength: formatStrength, unitLabel: unitLabel,
    daysBetween: daysBetween, cropDay: cropDay, stageFor: stageFor,
    tankPlan: tankPlan, phPlan: phPlan,
    calibrateNutrient: calibrateNutrient, calibratePh: calibratePh,
    gradeEC: gradeEC, gradePH: gradePH, gradeWaterTemp: gradeWaterTemp
  };
})();
