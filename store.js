/* All data lives on the device (localStorage). Nothing is sent to a server. */
(function () {
  var KEY = 'hydrolog.v1';

  var DEFAULTS = {
    version: 1,
    settings: {
      lang: 'en',
      unit: 'ec',            // 'ec' | 'ppm500' | 'ppm700'
      farmName: '',
      waterEC: 0.1,          // EC of the water normally used to fill tanks
      nutrientK: 2.5,        // ml of EACH part per litre per +1.0 EC
      nutrientCalibrated: false,
      phDownK: 10,           // ml per 100 L per 1.0 pH
      phUpK: 10,
      phCalibrated: false
    },
    batches: [],
    logs: []
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULTS);
      var data = JSON.parse(raw);
      return normalise(data);
    } catch (e) {
      return clone(DEFAULTS);
    }
  }

  function normalise(data) {
    var out = clone(DEFAULTS);
    if (data && typeof data === 'object') {
      Object.assign(out.settings, data.settings || {});
      out.batches = Array.isArray(data.batches) ? data.batches : [];
      out.logs = Array.isArray(data.logs) ? data.logs : [];
    }
    return out;
  }

  var state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function todayISO() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  window.Store = {
    get state() { return state; },
    settings: function () { return state.settings; },
    setSetting: function (k, v) { state.settings[k] = v; save(); },

    batches: function (status) {
      return state.batches.filter(function (b) { return !status || b.status === status; });
    },
    batch: function (id) { return state.batches.find(function (b) { return b.id === id; }); },
    addBatch: function (b) {
      b.id = uid(); b.status = 'active'; b.createdAt = new Date().toISOString();
      state.batches.push(b); save(); return b;
    },
    updateBatch: function (id, patch) {
      var b = this.batch(id); if (!b) return;
      Object.assign(b, patch); save();
    },
    deleteBatch: function (id) {
      state.batches = state.batches.filter(function (b) { return b.id !== id; });
      state.logs = state.logs.filter(function (l) { return l.batchId !== id; });
      save();
    },

    logs: function (batchId) {
      return state.logs
        .filter(function (l) { return !batchId || l.batchId === batchId; })
        .sort(function (a, b) { return (b.date + b.createdAt).localeCompare(a.date + a.createdAt); });
    },
    lastLog: function (batchId) { return this.logs(batchId)[0]; },
    addLog: function (l) {
      l.id = uid(); l.createdAt = new Date().toISOString();
      state.logs.push(l); save(); return l;
    },
    deleteLog: function (id) {
      state.logs = state.logs.filter(function (l) { return l.id !== id; }); save();
    },

    exportJSON: function () {
      return JSON.stringify(Object.assign({ exportedAt: new Date().toISOString(), app: 'HydroLog' }, state), null, 2);
    },
    importJSON: function (text) {
      var data = JSON.parse(text);
      if (!data || !Array.isArray(data.batches) || !Array.isArray(data.logs)) throw new Error('bad file');
      state = normalise(data); save();
    },
    reset: function () { state = clone(DEFAULTS); save(); },

    uid: uid,
    todayISO: todayISO
  };
})();
