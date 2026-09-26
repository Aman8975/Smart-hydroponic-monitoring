(function () {
  var view = document.getElementById('view');
  var calcTab = 'nutrient';
  var TAGS = ['pests', 'disease', 'yellowing', 'tipburn', 'wilting', 'rootrot', 'algae', 'pump', 'tankChange'];
  var STALE_DAYS = 2;

  /* ---------- helpers ---------- */

  function S() { return Store.settings(); }
  function lang() { return S().lang; }
  function unit() { return S().unit; }

  function t(key, vars) {
    var s = (I18N[lang()] && I18N[lang()][key]) || I18N.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) {
    if (v == null) return NaN;
    var s = String(v).trim().replace(',', '.');
    return s === '' ? NaN : Number(s);
  }
  function r1(n) { return Math.round(n * 10) / 10; }
  function fmtMl(ml) { return ml >= 100 ? String(Math.round(ml)) : String(r1(ml)); }
  function fmtL(l) { return l >= 20 ? String(Math.round(l)) : String(r1(l)); }
  function strength(ec) { return Calc.formatStrength(ec, unit()); }
  function strengthRange(r) { return strength(r[0]) + '–' + strength(r[1]); }
  function uLabel() { return Calc.unitLabel(unit()); }
  function cropName(c) { return c ? (c.name[lang()] || c.name.en) : '?'; }
  function stageName(key) { return t('stage.' + key); }
  function fmtDate(iso) {
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString(lang() === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return iso; }
  }
  function ago(iso) {
    var n = Calc.daysBetween(iso, Store.todayISO());
    if (n <= 0) return t('common.today');
    if (n === 1) return t('common.yesterday');
    return t('common.daysAgo', { n: n });
  }
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var q = {};
    var parts = h.split('?');
    if (parts[1]) parts[1].split('&').forEach(function (kv) {
      var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });
    return { path: parts[0].split('/').filter(Boolean), query: q };
  }
  function go(hash) { location.hash = hash; }

  /* ---------- batch status ---------- */

  function batchInfo(b) {
    var crop = cropById(b.cropId);
    var today = Store.todayISO();
    var day = Calc.cropDay(b.startDate, today);
    var stage = Calc.stageFor(crop, Math.max(day, 1));
    var last = Store.lastLog(b.id);
    var harvestState = day >= crop.harvest[1] ? 'overdue' : day >= crop.harvest[0] ? 'ready' : 'growing';
    return {
      crop: crop, day: day, stage: stage, last: last, harvestState: harvestState,
      daysToHarvest: crop.harvest[0] - day,
      ecGrade: last ? Calc.gradeEC(last.ec, stage.ec) : null,
      phGrade: last ? Calc.gradePH(last.ph, stage.ph) : null,
      wtGrade: last ? Calc.gradeWaterTemp(last.waterTemp) : null
    };
  }

  function alertsFor(b) {
    var i = batchInfo(b);
    var base = { crop: cropName(i.crop), zone: b.zone || '—' };
    var out = [];
    function add(level, key, extra) { out.push({ level: level, batchId: b.id, text: t(key, Object.assign({}, base, extra || {})) }); }

    if (!i.last) {
      add('warn', 'alert.never');
    } else {
      var stale = Calc.daysBetween(i.last.date, Store.todayISO());
      if (stale >= STALE_DAYS) add('warn', 'alert.stale', { n: stale });
      if (i.ecGrade && i.ecGrade !== 'ok') {
        add(i.ecGrade, i.last.ec > i.stage.ec[1] ? 'alert.ecHigh' : 'alert.ecLow',
          { v: strength(i.last.ec), min: strength(i.stage.ec[0]), max: strength(i.stage.ec[1]) });
      }
      if (i.phGrade && i.phGrade !== 'ok') {
        add(i.phGrade, i.last.ph > i.stage.ph[1] ? 'alert.phHigh' : 'alert.phLow',
          { v: i.last.ph, min: i.stage.ph[0], max: i.stage.ph[1] });
      }
      if (i.wtGrade && i.wtGrade !== 'ok' && i.last.waterTemp > 20) add(i.wtGrade, 'alert.waterHot', { v: i.last.waterTemp });
    }
    if (i.harvestState !== 'growing') add('ok', 'alert.harvest');
    return out;
  }

  function statBox(label, value, grade) {
    return '<div class="stat ' + (grade || '') + '"><div class="k">' + esc(label) + '</div><div class="v">' + esc(value) + '</div></div>';
  }

  /* ---------- views ---------- */

  function viewHome() {
    var active = Store.batches('active').sort(function (a, b) { return a.startDate.localeCompare(b.startDate); });
    var done = Store.batches('done');
    var html = '<h1>' + esc(S().farmName || t('home.title')) + '</h1>';

    if (!active.length) {
      html += '<div class="card empty"><p>' + t('home.empty') + '</p><p><a class="btn" href="#/batch/new">' + t('home.startBatch') + '</a></p></div>';
    } else {
      var alerts = [];
      active.forEach(function (b) { alerts = alerts.concat(alertsFor(b)); });
      var order = { bad: 0, warn: 1, ok: 2 };
      alerts.sort(function (a, b) { return order[a.level] - order[b.level]; });

      html += '<h2>' + t('home.alerts') + '</h2>';
      if (!alerts.length) html += '<div class="banner info">' + t('home.noAlerts') + '</div>';
      else {
        html += '<div class="card">';
        alerts.forEach(function (a) {
          html += '<p class="alert-row"><span class="chip ' + a.level + '">' + (a.level === 'bad' ? '!!' : a.level === 'warn' ? '!' : '✓') + '</span> ' +
            '<a href="#/batch/' + esc(a.batchId) + '">' + esc(a.text) + '</a></p>';
        });
        html += '</div>';
      }

      html += '<div class="row spread"><h2>' + t('home.active') + '</h2><a class="btn sm secondary" href="#/batch/new">' + t('home.startBatch') + '</a></div>';
      active.forEach(function (b) { html += batchCard(b); });
      html += '<button class="btn secondary block" data-action="share-wa" type="button">' + t('home.shareWA') + '</button>';
    }

    if (done.length) {
      html += '<details style="margin-top:16px"><summary>' + t('home.finished') + ' (' + done.length + ')</summary>';
      done.sort(function (a, b) { return (b.endDate || '').localeCompare(a.endDate || ''); }).forEach(function (b) {
        html += '<a class="card link" href="#/batch/' + esc(b.id) + '"><div class="card-head"><div><h3>' + esc(cropName(cropById(b.cropId))) + '</h3>' +
          '<div class="muted">' + esc(b.zone || '') + ' · ' + fmtDate(b.startDate) + ' → ' + (b.endDate ? fmtDate(b.endDate) : '') + '</div></div>' +
          (b.harvestKg ? '<span class="chip">' + t('batch.harvested', { kg: esc(b.harvestKg) }) + '</span>' : '') + '</div></a>';
      });
      html += '</details>';
    }
    view.innerHTML = html;
  }

  function batchCard(b) {
    var i = batchInfo(b);
    var harvestText = i.harvestState === 'overdue' ? t('home.overdue') : i.harvestState === 'ready' ? t('home.harvestNow') : t('home.harvestIn', { n: i.daysToHarvest });
    var pct = Math.min(100, Math.max(0, i.day / i.crop.harvest[0] * 100));
    var h = '<div class="card">' +
      '<a class="card-head" href="#/batch/' + esc(b.id) + '" style="color:inherit;text-decoration:none">' +
      '<div><h3>' + esc(cropName(i.crop)) + '</h3><div class="muted">' + esc(b.zone || '') + (b.plants ? ' · ' + t('batch.plantsN', { n: esc(b.plants) }) : '') + '</div></div>' +
      '<div style="text-align:right"><span class="chip">' + t('home.day', { n: i.day }) + '</span><div class="muted small">' + esc(stageName(i.stage.key)) + '</div></div></a>' +
      '<div class="progress" aria-hidden="true"><div style="width:' + pct + '%"></div></div>' +
      '<div class="muted small" style="margin-top:4px">' + harvestText + ' · ' + t('batch.target') + ': ' + uLabel() + ' ' + strengthRange(i.stage.ec) + ', pH ' + i.stage.ph[0] + '–' + i.stage.ph[1] + '</div>';
    if (i.last) {
      h += '<div class="stats">' +
        statBox(uLabel(), strength(i.last.ec), i.ecGrade) +
        statBox('pH', i.last.ph != null ? i.last.ph : '–', i.phGrade) +
        statBox(t('home.lastReading'), ago(i.last.date), Calc.daysBetween(i.last.date, Store.todayISO()) >= STALE_DAYS ? 'warn' : '') +
        '</div>';
    } else {
      h += '<p class="muted small">' + t('home.noReading') + '</p>';
    }
    h += '<div class="row" style="margin-top:10px"><a class="btn sm" href="#/log?batch=' + esc(b.id) + '">' + t('home.logToday') + '</a>' +
      '<a class="btn sm secondary" href="#/calc?batch=' + esc(b.id) + '">' + t('home.dose') + '</a></div></div>';
    return h;
  }

  function viewNewBatch(q) {
    var opts = CROPS.map(function (c) {
      return '<option value="' + c.id + '"' + (q.crop === c.id ? ' selected' : '') + '>' + esc(cropName(c)) + '</option>';
    }).join('');
    view.innerHTML = '<a href="#/" class="linkbtn">' + t('common.back') + '</a><h1>' + t('batch.new') + '</h1>' +
      '<form id="batch-form" class="card">' +
      '<div class="field"><label for="b-crop">' + t('batch.crop') + '</label><select id="b-crop" name="cropId" required>' + opts + '</select></div>' +
      '<div class="field"><label for="b-zone">' + t('batch.zone') + '</label><input id="b-zone" name="zone" placeholder="' + esc(t('batch.zoneHint')) + '" required maxlength="40"></div>' +
      '<div class="grid2"><div class="field"><label for="b-start">' + t('batch.start') + '</label><input id="b-start" name="startDate" type="date" value="' + Store.todayISO() + '" required></div>' +
      '<div class="field"><label for="b-plants">' + t('batch.plants') + '</label><input id="b-plants" name="plants" inputmode="numeric" type="number" min="0"></div></div>' +
      '<div class="field"><label for="b-notes">' + t('batch.notes') + '</label><textarea id="b-notes" name="notes" maxlength="500"></textarea></div>' +
      '<button class="btn block" type="submit">' + t('batch.save') + '</button></form>';

    document.getElementById('batch-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(e.target);
      var b = Store.addBatch({
        cropId: f.get('cropId'), zone: String(f.get('zone')).trim(), startDate: f.get('startDate'),
        plants: f.get('plants') ? Number(f.get('plants')) : null, notes: String(f.get('notes')).trim()
      });
      go('#/batch/' + b.id);
    });
  }

  function viewBatch(id) {
    var b = Store.batch(id);
    if (!b) { go('#/'); return; }
    var i = batchInfo(b);
    var logs = Store.logs(b.id);
    var html = '<a href="#/" class="linkbtn">' + t('common.back') + '</a>' +
      '<h1>' + esc(cropName(i.crop)) + ' · ' + esc(b.zone) + '</h1>';

    if (b.status === 'active') {
      html += batchCard(b);
      html += '<div class="card"><table><tr><th>' + t('batch.stage') + '</th><th>' + t('rec.days') + '</th><th>' + uLabel() + '</th><th>pH</th></tr>' +
        stageRows(i.crop, i.stage.key) + '</table></div>';
    } else {
      html += '<div class="card"><p><span class="chip plain">' + t('batch.ended') + ' ' + (b.endDate ? fmtDate(b.endDate) : '') + '</span> ' +
        (b.harvestKg ? '<span class="chip">' + t('batch.harvested', { kg: esc(b.harvestKg) }) + '</span>' : '') + '</p></div>';
    }
    html += '<p class="muted">' + t('batch.started', { d: fmtDate(b.startDate) }) + (b.notes ? ' · ' + esc(b.notes) : '') + '</p>';

    html += '<h2>' + t('batch.history') + '</h2>' + logList(logs, false);

    if (b.status === 'active') {
      html += '<details class="card"><summary>' + t('batch.finish') + '</summary><form id="finish-form" style="margin-top:10px">' +
        '<div class="grid2"><div class="field"><label for="f-kg">' + t('batch.harvestKg') + '</label><input id="f-kg" name="kg" type="number" step="0.1" min="0" inputmode="decimal"></div>' +
        '<div class="field"><label for="f-date">' + t('log.date') + '</label><input id="f-date" name="date" type="date" value="' + Store.todayISO() + '"></div></div>' +
        '<button class="btn block" type="submit">' + t('batch.finishSave') + '</button></form></details>';
    }
    html += '<button class="btn danger block" type="button" data-action="delete-batch" data-id="' + esc(b.id) + '">' + t('batch.delete') + '</button>';
    view.innerHTML = html;

    var ff = document.getElementById('finish-form');
    if (ff) ff.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(ff);
      Store.updateBatch(b.id, { status: 'done', endDate: f.get('date') || Store.todayISO(), harvestKg: f.get('kg') ? num(f.get('kg')) : null });
      toast(t('set.saved')); go('#/');
    });
  }

  function stageRows(crop, currentKey) {
    var from = 1;
    return crop.stages.map(function (s) {
      var row = '<tr' + (s.key === currentKey ? ' style="font-weight:700"' : '') + '><td>' + esc(stageName(s.key)) + (s.key === currentKey ? ' ◀' : '') + '</td>' +
        '<td>' + from + '–' + s.until + '</td><td>' + strengthRange(s.ec) + '</td><td>' + s.ph[0] + '–' + s.ph[1] + '</td></tr>';
      from = s.until + 1;
      return row;
    }).join('');
  }

  function logList(logs, showBatch) {
    if (!logs.length) return '<div class="card empty">' + t('log.none') + '</div>';
    return logs.slice(0, 60).map(function (l) {
      var b = Store.batch(l.batchId);
      var crop = b && cropById(b.cropId);
      var stage = crop ? Calc.stageFor(crop, Math.max(1, Calc.cropDay(b.startDate, l.date))) : null;
      var ecG = stage ? Calc.gradeEC(l.ec, stage.ec) : null;
      var phG = stage ? Calc.gradePH(l.ph, stage.ph) : null;
      var worst = [ecG, phG, Calc.gradeWaterTemp(l.waterTemp)].indexOf('bad') >= 0 ? 'bad' :
        [ecG, phG].indexOf('warn') >= 0 ? 'warn' : (ecG || phG) ? 'ok' : '';
      var bits = [];
      if (l.ec != null) bits.push('<span class="chip ' + (ecG || 'plain') + '">' + uLabel() + ' ' + strength(l.ec) + '</span>');
      if (l.ph != null) bits.push('<span class="chip ' + (phG || 'plain') + '">pH ' + l.ph + '</span>');
      if (l.waterTemp != null) bits.push('<span class="chip plain">💧 ' + l.waterTemp + '°C</span>');
      if (l.airTemp != null) bits.push('<span class="chip plain">🌡 ' + l.airTemp + '°C</span>');
      if (l.rh != null) bits.push('<span class="chip plain">RH ' + l.rh + '%</span>');
      if (l.topupL) bits.push('<span class="chip plain">+' + l.topupL + ' L</span>');
      if (l.nutrientMl) bits.push('<span class="chip plain">A+B ' + l.nutrientMl + ' ml</span>');
      if (l.phAdjMl) bits.push('<span class="chip plain">pH± ' + l.phAdjMl + ' ml</span>');
      (l.tags || []).forEach(function (tg) { bits.push('<span class="chip warn">' + esc(t('tag.' + tg)) + '</span>'); });
      return '<div class="card log-item ' + worst + '"><div class="card-head"><div><strong>' + fmtDate(l.date) + '</strong>' +
        (showBatch && b ? ' · <a href="#/batch/' + esc(b.id) + '">' + esc(cropName(crop)) + ' (' + esc(b.zone) + ')</a>' : '') + '</div>' +
        '<button class="linkbtn small" type="button" data-action="delete-log" data-id="' + esc(l.id) + '" aria-label="' + esc(t('common.delete')) + '">✕</button></div>' +
        '<div class="tags" style="margin-top:6px">' + bits.join('') + '</div>' +
        (l.notes ? '<p class="small">' + esc(l.notes) + '</p>' : '') + '</div>';
    }).join('');
  }

  function viewLog(q) {
    var active = Store.batches('active');
    var html = '<h1>' + t('log.title') + '</h1>';
    if (!active.length) {
      html += '<div class="card empty"><p>' + t('log.needBatch') + '</p><p><a class="btn" href="#/batch/new">' + t('home.startBatch') + '</a></p></div>';
    } else {
      var sel = q.batch && Store.batch(q.batch) && Store.batch(q.batch).status === 'active' ? q.batch : active[0].id;
      var opts = active.map(function (b) {
        return '<option value="' + esc(b.id) + '"' + (b.id === sel ? ' selected' : '') + '>' + esc(cropName(cropById(b.cropId))) + ' — ' + esc(b.zone) + '</option>';
      }).join('');
      var tags = TAGS.map(function (tg) {
        return '<label class="tag-toggle"><input type="checkbox" name="tags" value="' + tg + '"><span>' + esc(t('tag.' + tg)) + '</span></label>';
      }).join('');
      var step = unit() === 'ec' ? '0.01' : '1';
      html += '<form id="log-form" class="card">' +
        '<div class="grid2"><div class="field"><label for="l-batch">' + t('log.batch') + '</label><select id="l-batch" name="batchId">' + opts + '</select></div>' +
        '<div class="field"><label for="l-date">' + t('log.date') + '</label><input id="l-date" name="date" type="date" value="' + Store.todayISO() + '" max="' + Store.todayISO() + '"></div></div>' +
        '<div class="grid2"><div class="field"><label for="l-ec">' + uLabel() + '</label><input id="l-ec" name="ec" type="number" step="' + step + '" min="0" inputmode="decimal"><div class="hint" id="ec-hint"></div></div>' +
        '<div class="field"><label for="l-ph">pH</label><input id="l-ph" name="ph" type="number" step="0.1" min="0" max="14" inputmode="decimal"><div class="hint" id="ph-hint"></div></div></div>' +
        '<details><summary>' + t('log.more') + '</summary><div style="margin-top:10px">' +
        '<div class="grid3"><div class="field"><label for="l-wt">' + t('log.waterTemp') + '</label><input id="l-wt" name="waterTemp" type="number" step="0.1" inputmode="decimal"></div>' +
        '<div class="field"><label for="l-at">' + t('log.airTemp') + '</label><input id="l-at" name="airTemp" type="number" step="0.1" inputmode="decimal"></div>' +
        '<div class="field"><label for="l-rh">' + t('log.rh') + '</label><input id="l-rh" name="rh" type="number" min="0" max="100" inputmode="numeric"></div></div>' +
        '<div class="grid3"><div class="field"><label for="l-top">' + t('log.topup') + '</label><input id="l-top" name="topupL" type="number" step="0.1" min="0" inputmode="decimal"></div>' +
        '<div class="field"><label for="l-nut">' + t('log.nutrient') + '</label><input id="l-nut" name="nutrientMl" type="number" step="0.1" min="0" inputmode="decimal"></div>' +
        '<div class="field"><label for="l-pha">' + t('log.phAdj') + '</label><input id="l-pha" name="phAdjMl" type="number" step="0.1" min="0" inputmode="decimal"></div></div>' +
        '</div></details>' +
        '<div class="field"><label>' + t('log.issues') + '</label><div class="tags">' + tags + '</div></div>' +
        '<div class="field"><label for="l-notes">' + t('log.notes') + '</label><textarea id="l-notes" name="notes" maxlength="500"></textarea></div>' +
        '<button class="btn block" type="submit">' + t('log.save') + '</button></form>';

      html += '<h2>' + t('log.history') + '</h2>' + logList(Store.logs(), true);
    }
    view.innerHTML = html;
    if (!active.length) return;

    var form = document.getElementById('log-form');
    function updateHints() {
      var b = Store.batch(form.batchId.value);
      var i = batchInfo(b);
      document.getElementById('ec-hint').textContent = t('log.targetHint', { v: strengthRange(i.stage.ec) });
      document.getElementById('ph-hint').textContent = t('log.targetHint', { v: i.stage.ph[0] + '–' + i.stage.ph[1] });
    }
    form.batchId.addEventListener('change', updateHints);
    updateHints();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      function opt(name) { var v = num(f.get(name)); return isNaN(v) ? null : v; }
      var reading = opt('ec');
      var entry = {
        batchId: f.get('batchId'), date: f.get('date') || Store.todayISO(),
        ec: reading == null ? null : Math.round(Calc.toEC(reading, unit()) * 1000) / 1000,
        ph: opt('ph'), waterTemp: opt('waterTemp'), airTemp: opt('airTemp'), rh: opt('rh'),
        topupL: opt('topupL'), nutrientMl: opt('nutrientMl'), phAdjMl: opt('phAdjMl'),
        tags: f.getAll('tags'), notes: String(f.get('notes') || '').trim()
      };
      var empty = entry.ec == null && entry.ph == null && entry.waterTemp == null && entry.airTemp == null &&
        entry.rh == null && !entry.topupL && !entry.nutrientMl && !entry.phAdjMl && !entry.tags.length && !entry.notes;
      if (empty) { toast(t('calc.err.missing')); return; }
      Store.addLog(entry);
      toast(t('log.saved'));
      viewLog({ batch: entry.batchId });
    });
  }

  function viewCalc(q) {
    var s = S();
    var active = Store.batches('active');
    var last = s.lastCalc || {};
    var sel = q.batch && Store.batch(q.batch) ? q.batch : '';
    var opts = '<option value="">' + t('calc.none') + '</option>' + active.map(function (b) {
      return '<option value="' + esc(b.id) + '"' + (b.id === sel ? ' selected' : '') + '>' + esc(cropName(cropById(b.cropId))) + ' — ' + esc(b.zone) + '</option>';
    }).join('');
    var step = unit() === 'ec' ? '0.01' : '1';

    var html = '<h1>' + t('calc.title') + '</h1>' +
      '<div class="seg" role="tablist"><button type="button" data-tab="nutrient" class="' + (calcTab === 'nutrient' ? 'on' : '') + '">' + t('calc.tabNutrient') + '</button>' +
      '<button type="button" data-tab="ph" class="' + (calcTab === 'ph' ? 'on' : '') + '">' + t('calc.tabPh') + '</button></div>' +
      (active.length ? '<div class="field"><label for="c-batch">' + t('calc.fromBatch') + '</label><select id="c-batch">' + opts + '</select></div>' : '');

    if (calcTab === 'nutrient') {
      if (!s.nutrientCalibrated) html += '<div class="banner warn">' + t('calc.uncalibrated') + ' <a href="#/settings">' + t('nav.settings') + ' →</a></div>';
      html += '<form id="calc-form" class="card" novalidate>' +
        '<div class="grid2"><div class="field"><label for="c-cap">' + t('calc.capacity') + '</label><input id="c-cap" name="capacity" type="number" min="0" step="1" inputmode="decimal" value="' + esc(last.capacity || '') + '"></div>' +
        '<div class="field"><label for="c-vol">' + t('calc.volume') + '</label><input id="c-vol" name="volume" type="number" min="0" step="1" inputmode="decimal" value="' + esc(last.volume || '') + '"><div class="hint">' + t('calc.volumeHint') + '</div></div></div>' +
        '<div class="grid3"><div class="field"><label for="c-now">' + t('calc.ecNow') + ' (' + uLabel() + ')</label><input id="c-now" name="ecNow" type="number" min="0" step="' + step + '" inputmode="decimal"></div>' +
        '<div class="field"><label for="c-target">' + t('calc.ecTarget') + ' (' + uLabel() + ')</label><input id="c-target" name="ecTarget" type="number" min="0" step="' + step + '" inputmode="decimal"></div>' +
        '<div class="field"><label for="c-water">' + t('calc.ecWater') + '</label><input id="c-water" name="ecWater" type="number" min="0" step="' + step + '" inputmode="decimal" value="' + esc(strength(s.waterEC)) + '"></div></div>' +
        '<div class="hint" style="margin-top:-6px;margin-bottom:10px">' + t('calc.ecWaterHint') + '</div>' +
        '<div id="calc-out" aria-live="polite"></div></form>';
    } else {
      if (!s.phCalibrated) html += '<div class="banner warn">' + t('calc.phUncalibrated') + ' <a href="#/settings">' + t('nav.settings') + ' →</a></div>';
      html += '<form id="calc-form" class="card" novalidate>' +
        '<div class="grid3"><div class="field"><label for="p-vol">' + t('calc.phVolume') + '</label><input id="p-vol" name="volume" type="number" min="0" step="1" inputmode="decimal" value="' + esc(last.volume || last.capacity || '') + '"></div>' +
        '<div class="field"><label for="p-now">' + t('calc.phNow') + '</label><input id="p-now" name="phNow" type="number" min="0" max="14" step="0.1" inputmode="decimal"></div>' +
        '<div class="field"><label for="p-target">' + t('calc.phTarget') + '</label><input id="p-target" name="phTarget" type="number" min="0" max="14" step="0.1" inputmode="decimal"></div></div>' +
        '<div id="calc-out" aria-live="polite"></div></form>';
    }
    view.innerHTML = html;

    var form = document.getElementById('calc-form');
    var batchSel = document.getElementById('c-batch');

    function fillFromBatch() {
      if (!batchSel || !batchSel.value) return;
      var b = Store.batch(batchSel.value);
      var i = batchInfo(b);
      if (calcTab === 'nutrient') {
        form.ecTarget.value = strength((i.stage.ec[0] + i.stage.ec[1]) / 2);
        if (i.last && i.last.ec != null) form.ecNow.value = strength(i.last.ec);
      } else {
        form.phTarget.value = r1((i.stage.ph[0] + i.stage.ph[1]) / 2);
        if (i.last && i.last.ph != null) form.phNow.value = i.last.ph;
      }
      compute();
    }

    function compute() {
      var out = document.getElementById('calc-out');
      if (calcTab === 'nutrient') {
        var p = {
          capacity: num(form.capacity.value), volume: num(form.volume.value),
          ecNow: Calc.toEC(num(form.ecNow.value), unit()), ecTarget: Calc.toEC(num(form.ecTarget.value), unit()),
          ecWater: Calc.toEC(num(form.ecWater.value) || 0, unit()), mlPerLPerEC: s.nutrientK
        };
        if (isNaN(p.capacity) && p.volume > 0) p.capacity = p.volume;
        if (isNaN(p.volume) && p.capacity > 0) p.volume = p.capacity;
        if (!(p.volume > 0) || isNaN(p.ecNow) || isNaN(p.ecTarget)) { out.innerHTML = ''; return; }
        s.lastCalc = { capacity: form.capacity.value, volume: form.volume.value }; Store.setSetting('lastCalc', s.lastCalc);
        out.innerHTML = renderTankPlan(Calc.tankPlan(p));
      } else {
        var ph = Calc.phPlan({ volume: num(form.volume.value), phNow: num(form.phNow.value), phTarget: num(form.phTarget.value), downMlPer100L: s.phDownK, upMlPer100L: s.phUpK });
        if (ph.action === 'error') { out.innerHTML = ''; return; }
        out.innerHTML = renderPhPlan(ph);
      }
    }

    form.addEventListener('input', compute);
    if (batchSel) batchSel.addEventListener('change', fillFromBatch);
    fillFromBatch();
  }

  function renderTankPlan(r) {
    if (r.action === 'error') return '<div class="result bad">' + t('calc.err.' + r.reason) + '</div>';
    if (r.action === 'ok') {
      return '<div class="result"><strong>' + t('calc.okTitle') + '</strong><p>' +
        (r.addWater > 0.05 ? t('calc.okFill', { w: fmtL(r.addWater), ec: strength(r.finalEC) }) : t('calc.okNoFill')) + '</p></div>';
    }
    if (r.action === 'dose') {
      var steps = [];
      if (r.addWater > 0.05) steps.push(t('calc.stepFill', { w: fmtL(r.addWater) }));
      steps.push(t('calc.stepA', { ml: fmtMl(r.mlEach) }));
      steps.push(t('calc.stepB', { ml: fmtMl(r.mlEach) }));
      steps.push(t('calc.stepWait'));
      return '<div class="result"><strong>' + t('calc.doseTitle') + '</strong>' +
        '<div class="big">A ' + fmtMl(r.mlEach) + ' ml + B ' + fmtMl(r.mlEach) + ' ml</div>' +
        '<ol><li>' + steps.join('</li><li>') + '</li></ol>' +
        '<p class="small muted" style="margin-top:8px">⚠ ' + t('calc.neverMix') + '</p></div>';
    }
    return '<div class="result bad"><strong>' + t('calc.drainTitle') + '</strong>' +
      '<div class="big">−' + fmtL(r.drain) + ' L</div>' +
      '<ol><li>' + t('calc.stepDrain', { d: fmtL(r.drain) }) + '</li><li>' + t('calc.stepRefill', { w: fmtL(r.addWater) }) + '</li><li>' + t('calc.stepWait') + '</li></ol></div>';
  }

  function renderPhPlan(r) {
    if (r.action === 'ok') return '<div class="result">' + t('calc.phOk') + '</div>';
    return '<div class="result"><strong>' + t(r.action === 'down' ? 'calc.phDown' : 'calc.phUp') + '</strong>' +
      '<div class="big">' + fmtMl(r.firstDose) + ' ml</div>' +
      '<p>' + t('calc.phFirst', { ml: fmtMl(r.firstDose) }) + '</p>' +
      '<p class="small muted">' + t('calc.phTotal', { ml: fmtMl(r.ml) }) + '</p></div>';
  }

  function viewRecipes() {
    var html = '<h1>' + t('rec.title') + '</h1>' +
      '<div class="field"><input id="rec-search" type="search" placeholder="' + esc(t('rec.search')) + '" aria-label="' + esc(t('rec.search')) + '"></div><div id="rec-list">';
    CROPS.forEach(function (c) {
      var allEC = c.stages.map(function (s) { return s.ec; });
      var ecMin = Math.min.apply(null, allEC.map(function (r) { return r[0]; }));
      var ecMax = Math.max.apply(null, allEC.map(function (r) { return r[1]; }));
      html += '<a class="card link" href="#/recipes/' + c.id + '" data-search="' + esc((c.name.en + ' ' + c.name.hi).toLowerCase()) + '">' +
        '<div class="card-head"><div><h3>' + esc(cropName(c)) + '</h3><div class="muted small">' + uLabel() + ' ' + strength(ecMin) + '–' + strength(ecMax) +
        ' · pH ' + c.stages[0].ph[0] + '–' + c.stages[0].ph[1] + ' · ' + t('rec.harvest') + ' ' + t('rec.harvestDays', { a: c.harvest[0], b: c.harvest[1] }) + '</div></div>' +
        '<span class="chip plain">' + t('type.' + c.type) + '</span></div></a>';
    });
    html += '</div>';
    view.innerHTML = html;
    document.getElementById('rec-search').addEventListener('input', function (e) {
      var q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('#rec-list [data-search]').forEach(function (el) {
        el.style.display = !q || el.getAttribute('data-search').indexOf(q) >= 0 ? '' : 'none';
      });
    });
  }

  function viewRecipe(id) {
    var c = cropById(id);
    if (!c) { go('#/recipes'); return; }
    view.innerHTML = '<a href="#/recipes" class="linkbtn">' + t('common.back') + '</a>' +
      '<h1>' + esc(cropName(c)) + ' <span class="chip plain">' + t('type.' + c.type) + '</span></h1>' +
      '<div class="card"><h3>' + t('rec.stages') + '</h3><table><tr><th>' + t('batch.stage') + '</th><th>' + t('rec.days') + '</th><th>' + uLabel() + '</th><th>pH</th></tr>' +
      stageRows(c, null) + '</table></div>' +
      '<div class="card"><table>' +
      '<tr><th>' + t('rec.harvest') + '</th><td>' + t('rec.harvestDays', { a: c.harvest[0], b: c.harvest[1] }) + '</td></tr>' +
      '<tr><th>' + t('rec.airTemp') + '</th><td>' + c.airTemp[0] + '–' + c.airTemp[1] + '°C</td></tr>' +
      '<tr><th>' + t('rec.waterTemp') + '</th><td>' + c.waterTemp[0] + '–' + c.waterTemp[1] + '°C</td></tr>' +
      '<tr><th>' + t('rec.system') + '</th><td>' + esc(c.system) + '</td></tr></table>' +
      '<p style="margin-top:10px">' + esc(c.notes[lang()] || c.notes.en) + '</p></div>' +
      '<a class="btn block" href="#/batch/new?crop=' + c.id + '">' + t('rec.startBatch') + '</a>' +
      '<p class="muted small" style="margin-top:12px">' + t('rec.disclaimer') + '</p>';
  }

  function viewSettings() {
    var s = S();
    var step = unit() === 'ec' ? '0.01' : '1';
    view.innerHTML = '<h1>' + t('set.title') + '</h1>' +
      '<div class="card">' +
      '<div class="field"><label for="s-farm">' + t('set.farm') + '</label><input id="s-farm" value="' + esc(s.farmName) + '" maxlength="40"></div>' +
      '<div class="field"><label for="s-lang">' + t('set.lang') + '</label><select id="s-lang"><option value="en"' + (s.lang === 'en' ? ' selected' : '') + '>English</option><option value="hi"' + (s.lang === 'hi' ? ' selected' : '') + '>हिन्दी</option></select></div>' +
      '<div class="field"><label for="s-unit">' + t('set.unit') + '</label><select id="s-unit">' +
      ['ec', 'ppm500', 'ppm700'].map(function (u) {
        return '<option value="' + u + '"' + (s.unit === u ? ' selected' : '') + '>' + t(u === 'ec' ? 'set.unitEC' : u === 'ppm500' ? 'set.unit500' : 'set.unit700') + '</option>';
      }).join('') + '</select><div class="hint">' + t('set.unitHint') + '</div></div>' +
      '<div class="field"><label for="s-water">' + t('set.water') + ' (' + uLabel() + ')</label><input id="s-water" type="number" step="' + step + '" min="0" inputmode="decimal" value="' + esc(strength(s.waterEC)) + '"><div class="hint">' + t('calc.ecWaterHint') + '</div></div>' +
      '</div>' +

      '<h2>' + t('set.nutrientCal') + ' <span class="chip ' + (s.nutrientCalibrated ? 'ok' : 'warn') + '">' + t(s.nutrientCalibrated ? 'set.calibrated' : 'set.default') + '</span></h2>' +
      '<form id="cal-n" class="card"><p class="muted">' + t('set.nutrientCalHelp') + '</p>' +
      '<div class="grid2"><div class="field"><label for="n-l">' + t('set.calLitres') + '</label><input id="n-l" name="litres" type="number" min="0" step="0.1" inputmode="decimal" value="10"></div>' +
      '<div class="field"><label for="n-ml">' + t('set.calMl') + '</label><input id="n-ml" name="ml" type="number" min="0" step="0.1" inputmode="decimal"></div>' +
      '<div class="field"><label for="n-b">' + t('set.calBefore') + ' (' + uLabel() + ')</label><input id="n-b" name="before" type="number" min="0" step="' + step + '" inputmode="decimal"></div>' +
      '<div class="field"><label for="n-a">' + t('set.calAfter') + ' (' + uLabel() + ')</label><input id="n-a" name="after" type="number" min="0" step="' + step + '" inputmode="decimal"></div></div>' +
      '<p class="small muted">' + t('set.calCurrent', { k: r1(s.nutrientK * 100) / 100 }) + '</p>' +
      '<button class="btn block" type="submit">' + t('set.calSave') + '</button></form>' +

      '<h2>' + t('set.phCal') + ' <span class="chip ' + (s.phCalibrated ? 'ok' : 'warn') + '">' + t(s.phCalibrated ? 'set.calibrated' : 'set.default') + '</span></h2>' +
      '<form id="cal-p" class="card"><p class="muted">' + t('set.phCalHelp') + '</p>' +
      '<div class="field"><label for="p-which">' + t('set.phWhich') + '</label><select id="p-which" name="which"><option value="down">' + t('set.phDownName') + '</option><option value="up">' + t('set.phUpName') + '</option></select></div>' +
      '<div class="grid2"><div class="field"><label for="p-l">' + t('set.calLitres') + '</label><input id="p-l" name="litres" type="number" min="0" step="0.1" inputmode="decimal" value="10"></div>' +
      '<div class="field"><label for="p-ml">ml</label><input id="p-ml" name="ml" type="number" min="0" step="0.1" inputmode="decimal"></div>' +
      '<div class="field"><label for="p-b">' + t('set.calBefore') + ' (pH)</label><input id="p-b" name="before" type="number" step="0.1" inputmode="decimal"></div>' +
      '<div class="field"><label for="p-a">' + t('set.calAfter') + ' (pH)</label><input id="p-a" name="after" type="number" step="0.1" inputmode="decimal"></div></div>' +
      '<p class="small muted">' + t('set.phCurrent', { d: r1(s.phDownK), u: r1(s.phUpK) }) + '</p>' +
      '<button class="btn block" type="submit">' + t('set.calSave') + '</button></form>' +

      '<h2>' + t('set.data') + '</h2><div class="card"><p class="muted">' + t('set.dataHelp') + '</p>' +
      '<div class="row" style="flex-direction:column;align-items:stretch">' +
      '<button class="btn" type="button" data-action="export-json">' + t('set.exportJSON') + '</button>' +
      '<button class="btn secondary" type="button" data-action="export-csv">' + t('set.exportCSV') + '</button>' +
      '<label class="btn secondary" style="margin:0">' + t('set.import') + '<input id="import-file" type="file" accept=".json,application/json" hidden></label>' +
      '<button class="btn danger" type="button" data-action="reset">' + t('set.reset') + '</button></div></div>' +
      '<p class="muted small" style="text-align:center">' + t('set.about') + '</p>';

    document.getElementById('s-farm').addEventListener('change', function (e) { Store.setSetting('farmName', e.target.value.trim()); applyChrome(); toast(t('set.saved')); });
    document.getElementById('s-lang').addEventListener('change', function (e) { Store.setSetting('lang', e.target.value); applyChrome(); render(); });
    document.getElementById('s-unit').addEventListener('change', function (e) { Store.setSetting('unit', e.target.value); render(); toast(t('set.saved')); });
    document.getElementById('s-water').addEventListener('change', function (e) {
      var v = num(e.target.value); if (!isNaN(v)) { Store.setSetting('waterEC', Calc.toEC(v, unit())); toast(t('set.saved')); }
    });

    document.getElementById('cal-n').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var k = Calc.calibrateNutrient(num(f.ml.value), num(f.litres.value), Calc.toEC(num(f.before.value), unit()), Calc.toEC(num(f.after.value), unit()));
      if (!k) { toast(t('set.calBad')); return; }
      Store.setSetting('nutrientK', k); Store.setSetting('nutrientCalibrated', true);
      toast(t('set.calResult', { k: Math.round(k * 100) / 100 })); viewSettings();
    });
    document.getElementById('cal-p').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var k = Calc.calibratePh(num(f.ml.value), num(f.litres.value), num(f.before.value), num(f.after.value));
      if (!k) { toast(t('set.calBad')); return; }
      Store.setSetting(f.which.value === 'down' ? 'phDownK' : 'phUpK', k); Store.setSetting('phCalibrated', true);
      toast(t('set.saved')); viewSettings();
    });
    document.getElementById('import-file').addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      if (!confirm(t('set.importConfirm'))) { e.target.value = ''; return; }
      file.text().then(function (text) {
        try { Store.importJSON(text); applyChrome(); toast(t('set.importOk')); render(); }
        catch (err) { toast(t('set.importBad')); }
      });
    });
  }

  /* ---------- actions ---------- */

  function csvCell(v) {
    var s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function exportCSV() {
    var head = ['date', 'crop', 'zone', 'day', 'stage', 'ec_mS_cm', 'reading_' + unit(), 'ph', 'water_temp_c', 'air_temp_c', 'humidity_pct',
      'water_added_l', 'nutrient_ml_each', 'ph_adjust_ml', 'issues', 'notes'];
    var rows = Store.logs().slice().reverse().map(function (l) {
      var b = Store.batch(l.batchId) || {};
      var c = cropById(b.cropId);
      var day = b.startDate ? Calc.cropDay(b.startDate, l.date) : '';
      return [l.date, c ? c.name.en : '', b.zone, day, c ? Calc.stageFor(c, Math.max(1, day)).key : '',
        l.ec, l.ec != null ? strength(l.ec) : '', l.ph, l.waterTemp, l.airTemp, l.rh, l.topupL, l.nutrientMl, l.phAdjMl,
        (l.tags || []).join('; '), l.notes].map(csvCell).join(',');
    });
    download('hydrolog-' + Store.todayISO() + '.csv', '﻿' + [head.join(',')].concat(rows).join('\r\n'), 'text/csv;charset=utf-8');
  }

  function shareWhatsApp() {
    var lines = ['*' + (S().farmName || 'HydroLog') + '* — ' + fmtDate(Store.todayISO())];
    Store.batches('active').forEach(function (b) {
      var i = batchInfo(b);
      var line = '• ' + cropName(i.crop) + ' (' + b.zone + '), ' + t('home.day', { n: i.day }) + ', ' + stageName(i.stage.key);
      if (i.last) line += ' — ' + uLabel() + ' ' + strength(i.last.ec) + ', pH ' + (i.last.ph != null ? i.last.ph : '–') + ' (' + ago(i.last.date) + ')';
      lines.push(line);
    });
    var alerts = [];
    Store.batches('active').forEach(function (b) { alerts = alerts.concat(alertsFor(b).filter(function (a) { return a.level !== 'ok'; })); });
    if (alerts.length) { lines.push(''); lines.push('⚠ ' + t('home.alerts') + ':'); alerts.forEach(function (a) { lines.push('- ' + a.text); }); }
    window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
  }

  view.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action],[data-tab]');
    if (!el || !view.contains(el)) return;
    if (el.hasAttribute('data-tab') && el.closest('.seg')) {
      calcTab = el.getAttribute('data-tab');
      var sel = document.getElementById('c-batch');
      viewCalc({ batch: sel ? sel.value : '' });
      return;
    }
    var action = el.getAttribute('data-action');
    var id = el.getAttribute('data-id');
    if (action === 'delete-log' && confirm(t('log.confirmDelete'))) { Store.deleteLog(id); render(); }
    if (action === 'delete-batch' && confirm(t('batch.confirmDelete'))) { Store.deleteBatch(id); go('#/'); }
    if (action === 'export-json') download('hydrolog-backup-' + Store.todayISO() + '.json', Store.exportJSON(), 'application/json');
    if (action === 'export-csv') exportCSV();
    if (action === 'reset' && confirm(t('set.resetConfirm'))) { Store.reset(); applyChrome(); render(); }
    if (action === 'share-wa') shareWhatsApp();
  });

  /* ---------- router ---------- */

  function applyChrome() {
    document.documentElement.lang = lang();
    document.getElementById('farm-name').textContent = S().farmName || 'HydroLog';
    document.getElementById('lang-toggle').textContent = lang() === 'hi' ? 'EN' : 'हिं';
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
  }

  function render() {
    var r = parseHash();
    var p = r.path;
    var tab = p[0] === 'log' ? 'log' : p[0] === 'calc' ? 'calc' : p[0] === 'recipes' ? 'recipes' : p[0] === 'settings' ? 'settings' : 'home';
    document.querySelectorAll('.tabbar a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-tab') === tab); });

    if (p[0] === 'batch' && p[1] === 'new') viewNewBatch(r.query);
    else if (p[0] === 'batch' && p[1]) viewBatch(p[1]);
    else if (p[0] === 'log') viewLog(r.query);
    else if (p[0] === 'calc') viewCalc(r.query);
    else if (p[0] === 'recipes' && p[1]) viewRecipe(p[1]);
    else if (p[0] === 'recipes') viewRecipes();
    else if (p[0] === 'settings') viewSettings();
    else viewHome();
    window.scrollTo(0, 0);
  }

  document.getElementById('lang-toggle').addEventListener('click', function () {
    Store.setSetting('lang', lang() === 'hi' ? 'en' : 'hi');
    applyChrome(); render();
  });
  window.addEventListener('hashchange', render);

  applyChrome();
  render();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
