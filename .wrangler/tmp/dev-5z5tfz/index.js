var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except2, desc3) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except2)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc3 = __getOwnPropDesc(from, key)) || desc3.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
var init_utils = __esm({
  "node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/_internal/utils.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(createNotImplementedError, "createNotImplementedError");
    __name(notImplemented, "notImplemented");
    __name(notImplementedClass, "notImplementedClass");
  }
});

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin, _performanceNow, nodeTiming, PerformanceEntry, PerformanceMark, PerformanceMeasure, PerformanceResourceTiming, PerformanceObserverEntryList, Performance, PerformanceObserver, performance;
var init_performance = __esm({
  "node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
    _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
    nodeTiming = {
      name: "node",
      entryType: "node",
      startTime: 0,
      duration: 0,
      nodeStart: 0,
      v8Start: 0,
      bootstrapComplete: 0,
      environment: 0,
      loopStart: 0,
      loopExit: 0,
      idleTime: 0,
      uvMetricsInfo: {
        loopCount: 0,
        events: 0,
        eventsWaiting: 0
      },
      detail: void 0,
      toJSON() {
        return this;
      }
    };
    PerformanceEntry = class {
      static {
        __name(this, "PerformanceEntry");
      }
      __unenv__ = true;
      detail;
      entryType = "event";
      name;
      startTime;
      constructor(name, options) {
        this.name = name;
        this.startTime = options?.startTime || _performanceNow();
        this.detail = options?.detail;
      }
      get duration() {
        return _performanceNow() - this.startTime;
      }
      toJSON() {
        return {
          name: this.name,
          entryType: this.entryType,
          startTime: this.startTime,
          duration: this.duration,
          detail: this.detail
        };
      }
    };
    PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
      static {
        __name(this, "PerformanceMark");
      }
      entryType = "mark";
      constructor() {
        super(...arguments);
      }
      get duration() {
        return 0;
      }
    };
    PerformanceMeasure = class extends PerformanceEntry {
      static {
        __name(this, "PerformanceMeasure");
      }
      entryType = "measure";
    };
    PerformanceResourceTiming = class extends PerformanceEntry {
      static {
        __name(this, "PerformanceResourceTiming");
      }
      entryType = "resource";
      serverTiming = [];
      connectEnd = 0;
      connectStart = 0;
      decodedBodySize = 0;
      domainLookupEnd = 0;
      domainLookupStart = 0;
      encodedBodySize = 0;
      fetchStart = 0;
      initiatorType = "";
      name = "";
      nextHopProtocol = "";
      redirectEnd = 0;
      redirectStart = 0;
      requestStart = 0;
      responseEnd = 0;
      responseStart = 0;
      secureConnectionStart = 0;
      startTime = 0;
      transferSize = 0;
      workerStart = 0;
      responseStatus = 0;
    };
    PerformanceObserverEntryList = class {
      static {
        __name(this, "PerformanceObserverEntryList");
      }
      __unenv__ = true;
      getEntries() {
        return [];
      }
      getEntriesByName(_name, _type) {
        return [];
      }
      getEntriesByType(type) {
        return [];
      }
    };
    Performance = class {
      static {
        __name(this, "Performance");
      }
      __unenv__ = true;
      timeOrigin = _timeOrigin;
      eventCounts = /* @__PURE__ */ new Map();
      _entries = [];
      _resourceTimingBufferSize = 0;
      navigation = void 0;
      timing = void 0;
      timerify(_fn, _options) {
        throw createNotImplementedError("Performance.timerify");
      }
      get nodeTiming() {
        return nodeTiming;
      }
      eventLoopUtilization() {
        return {};
      }
      markResourceTiming() {
        return new PerformanceResourceTiming("");
      }
      onresourcetimingbufferfull = null;
      now() {
        if (this.timeOrigin === _timeOrigin) {
          return _performanceNow();
        }
        return Date.now() - this.timeOrigin;
      }
      clearMarks(markName) {
        this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
      }
      clearMeasures(measureName) {
        this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
      }
      clearResourceTimings() {
        this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
      }
      getEntries() {
        return this._entries;
      }
      getEntriesByName(name, type) {
        return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
      }
      getEntriesByType(type) {
        return this._entries.filter((e) => e.entryType === type);
      }
      mark(name, options) {
        const entry = new PerformanceMark(name, options);
        this._entries.push(entry);
        return entry;
      }
      measure(measureName, startOrMeasureOptions, endMark) {
        let start;
        let end;
        if (typeof startOrMeasureOptions === "string") {
          start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
          end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
        } else {
          start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
          end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
        }
        const entry = new PerformanceMeasure(measureName, {
          startTime: start,
          detail: {
            start,
            end
          }
        });
        this._entries.push(entry);
        return entry;
      }
      setResourceTimingBufferSize(maxSize) {
        this._resourceTimingBufferSize = maxSize;
      }
      addEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.addEventListener");
      }
      removeEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.removeEventListener");
      }
      dispatchEvent(event) {
        throw createNotImplementedError("Performance.dispatchEvent");
      }
      toJSON() {
        return this;
      }
    };
    PerformanceObserver = class {
      static {
        __name(this, "PerformanceObserver");
      }
      __unenv__ = true;
      static supportedEntryTypes = [];
      _callback = null;
      constructor(callback) {
        this._callback = callback;
      }
      takeRecords() {
        return [];
      }
      disconnect() {
        throw createNotImplementedError("PerformanceObserver.disconnect");
      }
      observe(options) {
        throw createNotImplementedError("PerformanceObserver.observe");
      }
      bind(fn) {
        return fn;
      }
      runInAsyncScope(fn, thisArg, ...args) {
        return fn.call(thisArg, ...args);
      }
      asyncId() {
        return 0;
      }
      triggerAsyncId() {
        return 0;
      }
      emitDestroy() {
        return this;
      }
    };
    performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();
  }
});

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/perf_hooks.mjs
var init_perf_hooks = __esm({
  "node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/perf_hooks.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_performance();
  }
});

// node_modules/.pnpm/@cloudflare+unenv-preset@2.7.11_unenv@2.0.0-rc.24_workerd@1.20251118.0/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
var init_performance2 = __esm({
  "node_modules/.pnpm/@cloudflare+unenv-preset@2.7.11_unenv@2.0.0-rc.24_workerd@1.20251118.0/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs"() {
    init_perf_hooks();
    globalThis.performance = performance;
    globalThis.Performance = Performance;
    globalThis.PerformanceEntry = PerformanceEntry;
    globalThis.PerformanceMark = PerformanceMark;
    globalThis.PerformanceMeasure = PerformanceMeasure;
    globalThis.PerformanceObserver = PerformanceObserver;
    globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
    globalThis.PerformanceResourceTiming = PerformanceResourceTiming;
  }
});

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default;
var init_noop = __esm({
  "node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/mock/noop.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    noop_default = Object.assign(() => {
    }, { __unenv__: true });
  }
});

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";
var _console, _ignoreErrors, _stderr, _stdout, log, info, trace, debug, table, error, warn, createTask, clear, count, countReset, dir, dirxml, group, groupEnd, groupCollapsed, profile, profileEnd, time, timeEnd, timeLog, timeStamp, Console, _times, _stdoutErrorHandler, _stderrErrorHandler;
var init_console = __esm({
  "node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/console.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_noop();
    init_utils();
    _console = globalThis.console;
    _ignoreErrors = true;
    _stderr = new Writable();
    _stdout = new Writable();
    log = _console?.log ?? noop_default;
    info = _console?.info ?? log;
    trace = _console?.trace ?? info;
    debug = _console?.debug ?? log;
    table = _console?.table ?? log;
    error = _console?.error ?? log;
    warn = _console?.warn ?? error;
    createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
    clear = _console?.clear ?? noop_default;
    count = _console?.count ?? noop_default;
    countReset = _console?.countReset ?? noop_default;
    dir = _console?.dir ?? noop_default;
    dirxml = _console?.dirxml ?? noop_default;
    group = _console?.group ?? noop_default;
    groupEnd = _console?.groupEnd ?? noop_default;
    groupCollapsed = _console?.groupCollapsed ?? noop_default;
    profile = _console?.profile ?? noop_default;
    profileEnd = _console?.profileEnd ?? noop_default;
    time = _console?.time ?? noop_default;
    timeEnd = _console?.timeEnd ?? noop_default;
    timeLog = _console?.timeLog ?? noop_default;
    timeStamp = _console?.timeStamp ?? noop_default;
    Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
    _times = /* @__PURE__ */ new Map();
    _stdoutErrorHandler = noop_default;
    _stderrErrorHandler = noop_default;
  }
});

// node_modules/.pnpm/@cloudflare+unenv-preset@2.7.11_unenv@2.0.0-rc.24_workerd@1.20251118.0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole, assert, clear2, context, count2, countReset2, createTask2, debug2, dir2, dirxml2, error2, group2, groupCollapsed2, groupEnd2, info2, log2, profile2, profileEnd2, table2, time2, timeEnd2, timeLog2, timeStamp2, trace2, warn2, console_default;
var init_console2 = __esm({
  "node_modules/.pnpm/@cloudflare+unenv-preset@2.7.11_unenv@2.0.0-rc.24_workerd@1.20251118.0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_console();
    workerdConsole = globalThis["console"];
    ({
      assert,
      clear: clear2,
      context: (
        // @ts-expect-error undocumented public API
        context
      ),
      count: count2,
      countReset: countReset2,
      createTask: (
        // @ts-expect-error undocumented public API
        createTask2
      ),
      debug: debug2,
      dir: dir2,
      dirxml: dirxml2,
      error: error2,
      group: group2,
      groupCollapsed: groupCollapsed2,
      groupEnd: groupEnd2,
      info: info2,
      log: log2,
      profile: profile2,
      profileEnd: profileEnd2,
      table: table2,
      time: time2,
      timeEnd: timeEnd2,
      timeLog: timeLog2,
      timeStamp: timeStamp2,
      trace: trace2,
      warn: warn2
    } = workerdConsole);
    Object.assign(workerdConsole, {
      Console,
      _ignoreErrors,
      _stderr,
      _stderrErrorHandler,
      _stdout,
      _stdoutErrorHandler,
      _times
    });
    console_default = workerdConsole;
  }
});

// node_modules/.pnpm/wrangler@4.50.0_@cloudflare+workers-types@4.20251121.0/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console = __esm({
  "node_modules/.pnpm/wrangler@4.50.0_@cloudflare+workers-types@4.20251121.0/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console"() {
    init_console2();
    globalThis.console = console_default;
  }
});

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime;
var init_hrtime = __esm({
  "node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
      const now = Date.now();
      const seconds = Math.trunc(now / 1e3);
      const nanos = now % 1e3 * 1e6;
      if (startTime) {
        let diffSeconds = seconds - startTime[0];
        let diffNanos = nanos - startTime[0];
        if (diffNanos < 0) {
          diffSeconds = diffSeconds - 1;
          diffNanos = 1e9 + diffNanos;
        }
        return [diffSeconds, diffNanos];
      }
      return [seconds, nanos];
    }, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
      return BigInt(Date.now() * 1e6);
    }, "bigint") });
  }
});

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream;
var init_read_stream = __esm({
  "node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    ReadStream = class {
      static {
        __name(this, "ReadStream");
      }
      fd;
      isRaw = false;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      setRawMode(mode) {
        this.isRaw = mode;
        return this;
      }
    };
  }
});

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream;
var init_write_stream = __esm({
  "node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    WriteStream = class {
      static {
        __name(this, "WriteStream");
      }
      fd;
      columns = 80;
      rows = 24;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      clearLine(dir3, callback) {
        callback && callback();
        return false;
      }
      clearScreenDown(callback) {
        callback && callback();
        return false;
      }
      cursorTo(x, y, callback) {
        callback && typeof callback === "function" && callback();
        return false;
      }
      moveCursor(dx, dy, callback) {
        callback && callback();
        return false;
      }
      getColorDepth(env2) {
        return 1;
      }
      hasColors(count3, env2) {
        return false;
      }
      getWindowSize() {
        return [this.columns, this.rows];
      }
      write(str, encoding, cb) {
        if (str instanceof Uint8Array) {
          str = new TextDecoder().decode(str);
        }
        try {
          console.log(str);
        } catch {
        }
        cb && typeof cb === "function" && cb();
        return false;
      }
    };
  }
});

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/tty.mjs
var init_tty = __esm({
  "node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/tty.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_read_stream();
    init_write_stream();
  }
});

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION;
var init_node_version = __esm({
  "node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    NODE_VERSION = "22.14.0";
  }
});

// node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";
var Process;
var init_process = __esm({
  "node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/process/process.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_tty();
    init_utils();
    init_node_version();
    Process = class _Process extends EventEmitter {
      static {
        __name(this, "Process");
      }
      env;
      hrtime;
      nextTick;
      constructor(impl) {
        super();
        this.env = impl.env;
        this.hrtime = impl.hrtime;
        this.nextTick = impl.nextTick;
        for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
          const value = this[prop];
          if (typeof value === "function") {
            this[prop] = value.bind(this);
          }
        }
      }
      // --- event emitter ---
      emitWarning(warning, type, code) {
        console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
      }
      emit(...args) {
        return super.emit(...args);
      }
      listeners(eventName) {
        return super.listeners(eventName);
      }
      // --- stdio (lazy initializers) ---
      #stdin;
      #stdout;
      #stderr;
      get stdin() {
        return this.#stdin ??= new ReadStream(0);
      }
      get stdout() {
        return this.#stdout ??= new WriteStream(1);
      }
      get stderr() {
        return this.#stderr ??= new WriteStream(2);
      }
      // --- cwd ---
      #cwd = "/";
      chdir(cwd2) {
        this.#cwd = cwd2;
      }
      cwd() {
        return this.#cwd;
      }
      // --- dummy props and getters ---
      arch = "";
      platform = "";
      argv = [];
      argv0 = "";
      execArgv = [];
      execPath = "";
      title = "";
      pid = 200;
      ppid = 100;
      get version() {
        return `v${NODE_VERSION}`;
      }
      get versions() {
        return { node: NODE_VERSION };
      }
      get allowedNodeEnvironmentFlags() {
        return /* @__PURE__ */ new Set();
      }
      get sourceMapsEnabled() {
        return false;
      }
      get debugPort() {
        return 0;
      }
      get throwDeprecation() {
        return false;
      }
      get traceDeprecation() {
        return false;
      }
      get features() {
        return {};
      }
      get release() {
        return {};
      }
      get connected() {
        return false;
      }
      get config() {
        return {};
      }
      get moduleLoadList() {
        return [];
      }
      constrainedMemory() {
        return 0;
      }
      availableMemory() {
        return 0;
      }
      uptime() {
        return 0;
      }
      resourceUsage() {
        return {};
      }
      // --- noop methods ---
      ref() {
      }
      unref() {
      }
      // --- unimplemented methods ---
      umask() {
        throw createNotImplementedError("process.umask");
      }
      getBuiltinModule() {
        return void 0;
      }
      getActiveResourcesInfo() {
        throw createNotImplementedError("process.getActiveResourcesInfo");
      }
      exit() {
        throw createNotImplementedError("process.exit");
      }
      reallyExit() {
        throw createNotImplementedError("process.reallyExit");
      }
      kill() {
        throw createNotImplementedError("process.kill");
      }
      abort() {
        throw createNotImplementedError("process.abort");
      }
      dlopen() {
        throw createNotImplementedError("process.dlopen");
      }
      setSourceMapsEnabled() {
        throw createNotImplementedError("process.setSourceMapsEnabled");
      }
      loadEnvFile() {
        throw createNotImplementedError("process.loadEnvFile");
      }
      disconnect() {
        throw createNotImplementedError("process.disconnect");
      }
      cpuUsage() {
        throw createNotImplementedError("process.cpuUsage");
      }
      setUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
      }
      hasUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
      }
      initgroups() {
        throw createNotImplementedError("process.initgroups");
      }
      openStdin() {
        throw createNotImplementedError("process.openStdin");
      }
      assert() {
        throw createNotImplementedError("process.assert");
      }
      binding() {
        throw createNotImplementedError("process.binding");
      }
      // --- attached interfaces ---
      permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
      report = {
        directory: "",
        filename: "",
        signal: "SIGUSR2",
        compact: false,
        reportOnFatalError: false,
        reportOnSignal: false,
        reportOnUncaughtException: false,
        getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
        writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
      };
      finalization = {
        register: /* @__PURE__ */ notImplemented("process.finalization.register"),
        unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
        registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
      };
      memoryUsage = Object.assign(() => ({
        arrayBuffers: 0,
        rss: 0,
        external: 0,
        heapTotal: 0,
        heapUsed: 0
      }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
      // --- undefined props ---
      mainModule = void 0;
      domain = void 0;
      // optional
      send = void 0;
      exitCode = void 0;
      channel = void 0;
      getegid = void 0;
      geteuid = void 0;
      getgid = void 0;
      getgroups = void 0;
      getuid = void 0;
      setegid = void 0;
      seteuid = void 0;
      setgid = void 0;
      setgroups = void 0;
      setuid = void 0;
      // internals
      _events = void 0;
      _eventsCount = void 0;
      _exiting = void 0;
      _maxListeners = void 0;
      _debugEnd = void 0;
      _debugProcess = void 0;
      _fatalException = void 0;
      _getActiveHandles = void 0;
      _getActiveRequests = void 0;
      _kill = void 0;
      _preload_modules = void 0;
      _rawDebug = void 0;
      _startProfilerIdleNotifier = void 0;
      _stopProfilerIdleNotifier = void 0;
      _tickCallback = void 0;
      _disconnect = void 0;
      _handleQueue = void 0;
      _pendingMessage = void 0;
      _channel = void 0;
      _send = void 0;
      _linkedBinding = void 0;
    };
  }
});

// node_modules/.pnpm/@cloudflare+unenv-preset@2.7.11_unenv@2.0.0-rc.24_workerd@1.20251118.0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess, getBuiltinModule, workerdProcess, isWorkerdProcessV2, unenvProcess, exit, features, platform, env, hrtime3, nextTick, _channel, _disconnect, _events, _eventsCount, _handleQueue, _maxListeners, _pendingMessage, _send, assert2, disconnect, mainModule, _debugEnd, _debugProcess, _exiting, _fatalException, _getActiveHandles, _getActiveRequests, _kill, _linkedBinding, _preload_modules, _rawDebug, _startProfilerIdleNotifier, _stopProfilerIdleNotifier, _tickCallback, abort, addListener, allowedNodeEnvironmentFlags, arch, argv, argv0, availableMemory, binding, channel, chdir, config, connected, constrainedMemory, cpuUsage, cwd, debugPort, dlopen, domain, emit, emitWarning, eventNames, execArgv, execPath, exitCode, finalization, getActiveResourcesInfo, getegid, geteuid, getgid, getgroups, getMaxListeners, getuid, hasUncaughtExceptionCaptureCallback, initgroups, kill, listenerCount, listeners, loadEnvFile, memoryUsage, moduleLoadList, off, on, once, openStdin, permission, pid, ppid, prependListener, prependOnceListener, rawListeners, reallyExit, ref, release, removeAllListeners, removeListener, report, resourceUsage, send, setegid, seteuid, setgid, setgroups, setMaxListeners, setSourceMapsEnabled, setuid, setUncaughtExceptionCaptureCallback, sourceMapsEnabled, stderr, stdin, stdout, throwDeprecation, title, traceDeprecation, umask, unref, uptime, version, versions, _process, process_default;
var init_process2 = __esm({
  "node_modules/.pnpm/@cloudflare+unenv-preset@2.7.11_unenv@2.0.0-rc.24_workerd@1.20251118.0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_hrtime();
    init_process();
    globalProcess = globalThis["process"];
    getBuiltinModule = globalProcess.getBuiltinModule;
    workerdProcess = getBuiltinModule("node:process");
    isWorkerdProcessV2 = globalThis.Cloudflare.compatibilityFlags.enable_nodejs_process_v2;
    unenvProcess = new Process({
      env: globalProcess.env,
      // `hrtime` is only available from workerd process v2
      hrtime: isWorkerdProcessV2 ? workerdProcess.hrtime : hrtime,
      // `nextTick` is available from workerd process v1
      nextTick: workerdProcess.nextTick
    });
    ({ exit, features, platform } = workerdProcess);
    ({
      env: (
        // Always implemented by workerd
        env
      ),
      hrtime: (
        // Only implemented in workerd v2
        hrtime3
      ),
      nextTick: (
        // Always implemented by workerd
        nextTick
      )
    } = unenvProcess);
    ({
      _channel,
      _disconnect,
      _events,
      _eventsCount,
      _handleQueue,
      _maxListeners,
      _pendingMessage,
      _send,
      assert: assert2,
      disconnect,
      mainModule
    } = unenvProcess);
    ({
      _debugEnd: (
        // @ts-expect-error `_debugEnd` is missing typings
        _debugEnd
      ),
      _debugProcess: (
        // @ts-expect-error `_debugProcess` is missing typings
        _debugProcess
      ),
      _exiting: (
        // @ts-expect-error `_exiting` is missing typings
        _exiting
      ),
      _fatalException: (
        // @ts-expect-error `_fatalException` is missing typings
        _fatalException
      ),
      _getActiveHandles: (
        // @ts-expect-error `_getActiveHandles` is missing typings
        _getActiveHandles
      ),
      _getActiveRequests: (
        // @ts-expect-error `_getActiveRequests` is missing typings
        _getActiveRequests
      ),
      _kill: (
        // @ts-expect-error `_kill` is missing typings
        _kill
      ),
      _linkedBinding: (
        // @ts-expect-error `_linkedBinding` is missing typings
        _linkedBinding
      ),
      _preload_modules: (
        // @ts-expect-error `_preload_modules` is missing typings
        _preload_modules
      ),
      _rawDebug: (
        // @ts-expect-error `_rawDebug` is missing typings
        _rawDebug
      ),
      _startProfilerIdleNotifier: (
        // @ts-expect-error `_startProfilerIdleNotifier` is missing typings
        _startProfilerIdleNotifier
      ),
      _stopProfilerIdleNotifier: (
        // @ts-expect-error `_stopProfilerIdleNotifier` is missing typings
        _stopProfilerIdleNotifier
      ),
      _tickCallback: (
        // @ts-expect-error `_tickCallback` is missing typings
        _tickCallback
      ),
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      arch,
      argv,
      argv0,
      availableMemory,
      binding: (
        // @ts-expect-error `binding` is missing typings
        binding
      ),
      channel,
      chdir,
      config,
      connected,
      constrainedMemory,
      cpuUsage,
      cwd,
      debugPort,
      dlopen,
      domain: (
        // @ts-expect-error `domain` is missing typings
        domain
      ),
      emit,
      emitWarning,
      eventNames,
      execArgv,
      execPath,
      exitCode,
      finalization,
      getActiveResourcesInfo,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getMaxListeners,
      getuid,
      hasUncaughtExceptionCaptureCallback,
      initgroups: (
        // @ts-expect-error `initgroups` is missing typings
        initgroups
      ),
      kill,
      listenerCount,
      listeners,
      loadEnvFile,
      memoryUsage,
      moduleLoadList: (
        // @ts-expect-error `moduleLoadList` is missing typings
        moduleLoadList
      ),
      off,
      on,
      once,
      openStdin: (
        // @ts-expect-error `openStdin` is missing typings
        openStdin
      ),
      permission,
      pid,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      reallyExit: (
        // @ts-expect-error `reallyExit` is missing typings
        reallyExit
      ),
      ref,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      send,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setMaxListeners,
      setSourceMapsEnabled,
      setuid,
      setUncaughtExceptionCaptureCallback,
      sourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      throwDeprecation,
      title,
      traceDeprecation,
      umask,
      unref,
      uptime,
      version,
      versions
    } = isWorkerdProcessV2 ? workerdProcess : unenvProcess);
    _process = {
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      hasUncaughtExceptionCaptureCallback,
      setUncaughtExceptionCaptureCallback,
      loadEnvFile,
      sourceMapsEnabled,
      arch,
      argv,
      argv0,
      chdir,
      config,
      connected,
      constrainedMemory,
      availableMemory,
      cpuUsage,
      cwd,
      debugPort,
      dlopen,
      disconnect,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      exit,
      finalization,
      features,
      getBuiltinModule,
      getActiveResourcesInfo,
      getMaxListeners,
      hrtime: hrtime3,
      kill,
      listeners,
      listenerCount,
      memoryUsage,
      nextTick,
      on,
      off,
      once,
      pid,
      platform,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      setMaxListeners,
      setSourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      title,
      throwDeprecation,
      traceDeprecation,
      umask,
      uptime,
      version,
      versions,
      // @ts-expect-error old API
      domain,
      initgroups,
      moduleLoadList,
      reallyExit,
      openStdin,
      assert: assert2,
      binding,
      send,
      exitCode,
      channel,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getuid,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setuid,
      permission,
      mainModule,
      _events,
      _eventsCount,
      _exiting,
      _maxListeners,
      _debugEnd,
      _debugProcess,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _kill,
      _preload_modules,
      _rawDebug,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      _disconnect,
      _handleQueue,
      _pendingMessage,
      _channel,
      _send,
      _linkedBinding
    };
    process_default = _process;
  }
});

// node_modules/.pnpm/wrangler@4.50.0_@cloudflare+workers-types@4.20251121.0/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process = __esm({
  "node_modules/.pnpm/wrangler@4.50.0_@cloudflare+workers-types@4.20251121.0/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process"() {
    init_process2();
    globalThis.process = process_default;
  }
});

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
  }
});

// node_modules/.pnpm/wrangler@4.50.0_@cloudflare+workers-types@4.20251121.0/node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "node_modules/.pnpm/wrangler@4.50.0_@cloudflare+workers-types@4.20251121.0/node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// src/routes/ai.ts
var require_ai = __commonJS({
  "src/routes/ai.ts"() {
    "use strict";
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
  }
});

// src/routes/prompts.ts
var require_prompts = __commonJS({
  "src/routes/prompts.ts"() {
    "use strict";
    init_modules_watch_stub();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
  }
});

// .wrangler/tmp/bundle-SPgV10/middleware-loader.entry.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// .wrangler/tmp/bundle-SPgV10/middleware-insertion-facade.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/index.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/index.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/hono.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/hono-base.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/compose.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context2, next) => {
    let index2 = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index2) {
        throw new Error("next() called multiple times");
      }
      index2 = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context2.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context2, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context2.error = err;
            res = await onError(err, context2);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context2.finalized === false && onNotFound) {
          res = await onNotFound(context2);
        }
      }
      if (res && (context2.finalized === false || isError)) {
        context2.res = res;
      }
      return context2;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/context.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/request.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/http-exception.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var HTTPException = class extends Error {
  static {
    __name(this, "HTTPException");
  }
  res;
  status;
  constructor(status = 500, options) {
    super(options?.message, { cause: options?.cause });
    this.res = options?.res;
    this.status = status;
  }
  getResponse() {
    if (this.res) {
      const newResponse = new Response(this.res.body, {
        status: this.status,
        headers: this.res.headers
      });
      return newResponse;
    }
    return new Response(this.message, {
      status: this.status
    });
  }
};

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/request/constants.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var GET_MATCH_RESULT = Symbol();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/utils/body.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index2) => {
    if (index2 === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/utils/url.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index2) => {
    const mark = `@${index2}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder2) => {
  try {
    return decoder2(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder2(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  json() {
    return this.#cachedBody("text").then((text2) => JSON.parse(text2));
  }
  text() {
    return this.#cachedBody("text");
  }
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  blob() {
    return this.#cachedBody("blob");
  }
  formData() {
    return this.#cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/utils/html.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context2, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context: context2 }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context2, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  env = {};
  #var;
  finalized = false;
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  text = /* @__PURE__ */ __name((text2, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text2) : this.#newResponse(
      text2,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/utils/constants.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class {
  static {
    __name(this, "Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app11) {
    const subApp = this.basePath(path);
    app11.routes.map((r) => {
      let handler;
      if (app11.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app11.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    }
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context2 = await composed(c);
        if (!context2.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context2.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/reg-exp-router/index.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/reg-exp-router/router.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/reg-exp-router/matcher.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index2 = match3.indexOf("", 1);
    return [matcher[1][index2], match3];
  }, "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/reg-exp-router/node.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class {
  static {
    __name(this, "Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index2, paramMap, context2, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index2;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new Node();
        if (name !== "") {
          node.#varIndex = context2.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new Node();
      }
    }
    node.insert(restTokens, index2, paramMap, context2, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/reg-exp-router/trie.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index2, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index2, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/reg-exp-router/prepared-router.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/smart-router/index.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/smart-router/router.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/trie-router/index.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/trie-router/router.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/trie-router/node.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class {
  static {
    __name(this, "Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/middleware/cors/index.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// src/routes/lessons.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/d1/driver.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/entity.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var entityKind = Symbol.for("drizzle:entityKind");
var hasOwnEntityKind = Symbol.for("drizzle:hasOwnEntityKind");
function is(value, type) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (value instanceof type) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(type, entityKind)) {
    throw new Error(
      `Class "${type.name ?? "<unknown>"}" doesn't look like a Drizzle entity. If this is incorrect and the class is provided by Drizzle, please report this as a bug.`
    );
  }
  let cls = Object.getPrototypeOf(value).constructor;
  if (cls) {
    while (cls) {
      if (entityKind in cls && cls[entityKind] === type[entityKind]) {
        return true;
      }
      cls = Object.getPrototypeOf(cls);
    }
  }
  return false;
}
__name(is, "is");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/logger.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ConsoleLogWriter = class {
  static {
    __name(this, "ConsoleLogWriter");
  }
  static [entityKind] = "ConsoleLogWriter";
  write(message2) {
    console.log(message2);
  }
};
var DefaultLogger = class {
  static {
    __name(this, "DefaultLogger");
  }
  static [entityKind] = "DefaultLogger";
  writer;
  constructor(config2) {
    this.writer = config2?.writer ?? new ConsoleLogWriter();
  }
  logQuery(query, params) {
    const stringifiedParams = params.map((p) => {
      try {
        return JSON.stringify(p);
      } catch {
        return String(p);
      }
    });
    const paramsStr = stringifiedParams.length ? ` -- params: [${stringifiedParams.join(", ")}]` : "";
    this.writer.write(`Query: ${query}${paramsStr}`);
  }
};
var NoopLogger = class {
  static {
    __name(this, "NoopLogger");
  }
  static [entityKind] = "NoopLogger";
  logQuery() {
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/relations.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/table.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/table.utils.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var TableName = Symbol.for("drizzle:Name");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/table.js
var Schema = Symbol.for("drizzle:Schema");
var Columns = Symbol.for("drizzle:Columns");
var ExtraConfigColumns = Symbol.for("drizzle:ExtraConfigColumns");
var OriginalName = Symbol.for("drizzle:OriginalName");
var BaseName = Symbol.for("drizzle:BaseName");
var IsAlias = Symbol.for("drizzle:IsAlias");
var ExtraConfigBuilder = Symbol.for("drizzle:ExtraConfigBuilder");
var IsDrizzleTable = Symbol.for("drizzle:IsDrizzleTable");
var Table = class {
  static {
    __name(this, "Table");
  }
  static [entityKind] = "Table";
  /** @internal */
  static Symbol = {
    Name: TableName,
    Schema,
    OriginalName,
    Columns,
    ExtraConfigColumns,
    BaseName,
    IsAlias,
    ExtraConfigBuilder
  };
  /**
   * @internal
   * Can be changed if the table is aliased.
   */
  [TableName];
  /**
   * @internal
   * Used to store the original name of the table, before any aliasing.
   */
  [OriginalName];
  /** @internal */
  [Schema];
  /** @internal */
  [Columns];
  /** @internal */
  [ExtraConfigColumns];
  /**
   *  @internal
   * Used to store the table name before the transformation via the `tableCreator` functions.
   */
  [BaseName];
  /** @internal */
  [IsAlias] = false;
  /** @internal */
  [IsDrizzleTable] = true;
  /** @internal */
  [ExtraConfigBuilder] = void 0;
  constructor(name, schema, baseName) {
    this[TableName] = this[OriginalName] = name;
    this[Schema] = schema;
    this[BaseName] = baseName;
  }
};
function getTableName(table3) {
  return table3[TableName];
}
__name(getTableName, "getTableName");
function getTableUniqueName(table3) {
  return `${table3[Schema] ?? "public"}.${table3[TableName]}`;
}
__name(getTableUniqueName, "getTableUniqueName");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/column.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var Column = class {
  static {
    __name(this, "Column");
  }
  constructor(table3, config2) {
    this.table = table3;
    this.config = config2;
    this.name = config2.name;
    this.keyAsName = config2.keyAsName;
    this.notNull = config2.notNull;
    this.default = config2.default;
    this.defaultFn = config2.defaultFn;
    this.onUpdateFn = config2.onUpdateFn;
    this.hasDefault = config2.hasDefault;
    this.primary = config2.primaryKey;
    this.isUnique = config2.isUnique;
    this.uniqueName = config2.uniqueName;
    this.uniqueType = config2.uniqueType;
    this.dataType = config2.dataType;
    this.columnType = config2.columnType;
    this.generated = config2.generated;
    this.generatedIdentity = config2.generatedIdentity;
  }
  static [entityKind] = "Column";
  name;
  keyAsName;
  primary;
  notNull;
  default;
  defaultFn;
  onUpdateFn;
  hasDefault;
  isUnique;
  uniqueName;
  uniqueType;
  dataType;
  columnType;
  enumValues = void 0;
  generated = void 0;
  generatedIdentity = void 0;
  config;
  mapFromDriverValue(value) {
    return value;
  }
  mapToDriverValue(value) {
    return value;
  }
  // ** @internal */
  shouldDisableInsert() {
    return this.config.generated !== void 0 && this.config.generated.type !== "byDefault";
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/pg-core/primary-keys.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/pg-core/table.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/utils.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sql/sql.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/pg-core/columns/enum.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/pg-core/columns/common.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/column-builder.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ColumnBuilder = class {
  static {
    __name(this, "ColumnBuilder");
  }
  static [entityKind] = "ColumnBuilder";
  config;
  constructor(name, dataType, columnType) {
    this.config = {
      name,
      keyAsName: name === "",
      notNull: false,
      default: void 0,
      hasDefault: false,
      primaryKey: false,
      isUnique: false,
      uniqueName: void 0,
      uniqueType: void 0,
      dataType,
      columnType,
      generated: void 0
    };
  }
  /**
   * Changes the data type of the column. Commonly used with `json` columns. Also, useful for branded types.
   *
   * @example
   * ```ts
   * const users = pgTable('users', {
   * 	id: integer('id').$type<UserId>().primaryKey(),
   * 	details: json('details').$type<UserDetails>().notNull(),
   * });
   * ```
   */
  $type() {
    return this;
  }
  /**
   * Adds a `not null` clause to the column definition.
   *
   * Affects the `select` model of the table - columns *without* `not null` will be nullable on select.
   */
  notNull() {
    this.config.notNull = true;
    return this;
  }
  /**
   * Adds a `default <value>` clause to the column definition.
   *
   * Affects the `insert` model of the table - columns *with* `default` are optional on insert.
   *
   * If you need to set a dynamic default value, use {@link $defaultFn} instead.
   */
  default(value) {
    this.config.default = value;
    this.config.hasDefault = true;
    return this;
  }
  /**
   * Adds a dynamic default value to the column.
   * The function will be called when the row is inserted, and the returned value will be used as the column value.
   *
   * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
   */
  $defaultFn(fn) {
    this.config.defaultFn = fn;
    this.config.hasDefault = true;
    return this;
  }
  /**
   * Alias for {@link $defaultFn}.
   */
  $default = this.$defaultFn;
  /**
   * Adds a dynamic update value to the column.
   * The function will be called when the row is updated, and the returned value will be used as the column value if none is provided.
   * If no `default` (or `$defaultFn`) value is provided, the function will be called when the row is inserted as well, and the returned value will be used as the column value.
   *
   * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
   */
  $onUpdateFn(fn) {
    this.config.onUpdateFn = fn;
    this.config.hasDefault = true;
    return this;
  }
  /**
   * Alias for {@link $onUpdateFn}.
   */
  $onUpdate = this.$onUpdateFn;
  /**
   * Adds a `primary key` clause to the column definition. This implicitly makes the column `not null`.
   *
   * In SQLite, `integer primary key` implicitly makes the column auto-incrementing.
   */
  primaryKey() {
    this.config.primaryKey = true;
    this.config.notNull = true;
    return this;
  }
  /** @internal Sets the name of the column to the key within the table definition if a name was not given. */
  setName(name) {
    if (this.config.name !== "")
      return;
    this.config.name = name;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/pg-core/foreign-keys.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ForeignKeyBuilder = class {
  static {
    __name(this, "ForeignKeyBuilder");
  }
  static [entityKind] = "PgForeignKeyBuilder";
  /** @internal */
  reference;
  /** @internal */
  _onUpdate = "no action";
  /** @internal */
  _onDelete = "no action";
  constructor(config2, actions) {
    this.reference = () => {
      const { name, columns, foreignColumns } = config2();
      return { name, columns, foreignTable: foreignColumns[0].table, foreignColumns };
    };
    if (actions) {
      this._onUpdate = actions.onUpdate;
      this._onDelete = actions.onDelete;
    }
  }
  onUpdate(action) {
    this._onUpdate = action === void 0 ? "no action" : action;
    return this;
  }
  onDelete(action) {
    this._onDelete = action === void 0 ? "no action" : action;
    return this;
  }
  /** @internal */
  build(table3) {
    return new ForeignKey(table3, this);
  }
};
var ForeignKey = class {
  static {
    __name(this, "ForeignKey");
  }
  constructor(table3, builder) {
    this.table = table3;
    this.reference = builder.reference;
    this.onUpdate = builder._onUpdate;
    this.onDelete = builder._onDelete;
  }
  static [entityKind] = "PgForeignKey";
  reference;
  onUpdate;
  onDelete;
  getName() {
    const { name, columns, foreignColumns } = this.reference();
    const columnNames = columns.map((column) => column.name);
    const foreignColumnNames = foreignColumns.map((column) => column.name);
    const chunks = [
      this.table[TableName],
      ...columnNames,
      foreignColumns[0].table[TableName],
      ...foreignColumnNames
    ];
    return name ?? `${chunks.join("_")}_fk`;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/tracing-utils.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function iife(fn, ...args) {
  return fn(...args);
}
__name(iife, "iife");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/pg-core/unique-constraint.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function uniqueKeyName(table3, columns) {
  return `${table3[TableName]}_${columns.join("_")}_unique`;
}
__name(uniqueKeyName, "uniqueKeyName");
var UniqueConstraintBuilder = class {
  static {
    __name(this, "UniqueConstraintBuilder");
  }
  constructor(columns, name) {
    this.name = name;
    this.columns = columns;
  }
  static [entityKind] = "PgUniqueConstraintBuilder";
  /** @internal */
  columns;
  /** @internal */
  nullsNotDistinctConfig = false;
  nullsNotDistinct() {
    this.nullsNotDistinctConfig = true;
    return this;
  }
  /** @internal */
  build(table3) {
    return new UniqueConstraint(table3, this.columns, this.nullsNotDistinctConfig, this.name);
  }
};
var UniqueOnConstraintBuilder = class {
  static {
    __name(this, "UniqueOnConstraintBuilder");
  }
  static [entityKind] = "PgUniqueOnConstraintBuilder";
  /** @internal */
  name;
  constructor(name) {
    this.name = name;
  }
  on(...columns) {
    return new UniqueConstraintBuilder(columns, this.name);
  }
};
var UniqueConstraint = class {
  static {
    __name(this, "UniqueConstraint");
  }
  constructor(table3, columns, nullsNotDistinct, name) {
    this.table = table3;
    this.columns = columns;
    this.name = name ?? uniqueKeyName(this.table, this.columns.map((column) => column.name));
    this.nullsNotDistinct = nullsNotDistinct;
  }
  static [entityKind] = "PgUniqueConstraint";
  columns;
  name;
  nullsNotDistinct = false;
  getName() {
    return this.name;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/pg-core/utils/array.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function parsePgArrayValue(arrayString, startFrom, inQuotes) {
  for (let i = startFrom; i < arrayString.length; i++) {
    const char = arrayString[i];
    if (char === "\\") {
      i++;
      continue;
    }
    if (char === '"') {
      return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i + 1];
    }
    if (inQuotes) {
      continue;
    }
    if (char === "," || char === "}") {
      return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i];
    }
  }
  return [arrayString.slice(startFrom).replace(/\\/g, ""), arrayString.length];
}
__name(parsePgArrayValue, "parsePgArrayValue");
function parsePgNestedArray(arrayString, startFrom = 0) {
  const result = [];
  let i = startFrom;
  let lastCharIsComma = false;
  while (i < arrayString.length) {
    const char = arrayString[i];
    if (char === ",") {
      if (lastCharIsComma || i === startFrom) {
        result.push("");
      }
      lastCharIsComma = true;
      i++;
      continue;
    }
    lastCharIsComma = false;
    if (char === "\\") {
      i += 2;
      continue;
    }
    if (char === '"') {
      const [value2, startFrom2] = parsePgArrayValue(arrayString, i + 1, true);
      result.push(value2);
      i = startFrom2;
      continue;
    }
    if (char === "}") {
      return [result, i + 1];
    }
    if (char === "{") {
      const [value2, startFrom2] = parsePgNestedArray(arrayString, i + 1);
      result.push(value2);
      i = startFrom2;
      continue;
    }
    const [value, newStartFrom] = parsePgArrayValue(arrayString, i, false);
    result.push(value);
    i = newStartFrom;
  }
  return [result, i];
}
__name(parsePgNestedArray, "parsePgNestedArray");
function parsePgArray(arrayString) {
  const [result] = parsePgNestedArray(arrayString, 1);
  return result;
}
__name(parsePgArray, "parsePgArray");
function makePgArray(array) {
  return `{${array.map((item) => {
    if (Array.isArray(item)) {
      return makePgArray(item);
    }
    if (typeof item === "string") {
      return `"${item.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return `${item}`;
  }).join(",")}}`;
}
__name(makePgArray, "makePgArray");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/pg-core/columns/common.js
var PgColumnBuilder = class extends ColumnBuilder {
  static {
    __name(this, "PgColumnBuilder");
  }
  foreignKeyConfigs = [];
  static [entityKind] = "PgColumnBuilder";
  array(size) {
    return new PgArrayBuilder(this.config.name, this, size);
  }
  references(ref2, actions = {}) {
    this.foreignKeyConfigs.push({ ref: ref2, actions });
    return this;
  }
  unique(name, config2) {
    this.config.isUnique = true;
    this.config.uniqueName = name;
    this.config.uniqueType = config2?.nulls;
    return this;
  }
  generatedAlwaysAs(as) {
    this.config.generated = {
      as,
      type: "always",
      mode: "stored"
    };
    return this;
  }
  /** @internal */
  buildForeignKeys(column, table3) {
    return this.foreignKeyConfigs.map(({ ref: ref2, actions }) => {
      return iife(
        (ref22, actions2) => {
          const builder = new ForeignKeyBuilder(() => {
            const foreignColumn = ref22();
            return { columns: [column], foreignColumns: [foreignColumn] };
          });
          if (actions2.onUpdate) {
            builder.onUpdate(actions2.onUpdate);
          }
          if (actions2.onDelete) {
            builder.onDelete(actions2.onDelete);
          }
          return builder.build(table3);
        },
        ref2,
        actions
      );
    });
  }
  /** @internal */
  buildExtraConfigColumn(table3) {
    return new ExtraConfigColumn(table3, this.config);
  }
};
var PgColumn = class extends Column {
  static {
    __name(this, "PgColumn");
  }
  constructor(table3, config2) {
    if (!config2.uniqueName) {
      config2.uniqueName = uniqueKeyName(table3, [config2.name]);
    }
    super(table3, config2);
    this.table = table3;
  }
  static [entityKind] = "PgColumn";
};
var ExtraConfigColumn = class extends PgColumn {
  static {
    __name(this, "ExtraConfigColumn");
  }
  static [entityKind] = "ExtraConfigColumn";
  getSQLType() {
    return this.getSQLType();
  }
  indexConfig = {
    order: this.config.order ?? "asc",
    nulls: this.config.nulls ?? "last",
    opClass: this.config.opClass
  };
  defaultConfig = {
    order: "asc",
    nulls: "last",
    opClass: void 0
  };
  asc() {
    this.indexConfig.order = "asc";
    return this;
  }
  desc() {
    this.indexConfig.order = "desc";
    return this;
  }
  nullsFirst() {
    this.indexConfig.nulls = "first";
    return this;
  }
  nullsLast() {
    this.indexConfig.nulls = "last";
    return this;
  }
  /**
   * ### PostgreSQL documentation quote
   *
   * > An operator class with optional parameters can be specified for each column of an index.
   * The operator class identifies the operators to be used by the index for that column.
   * For example, a B-tree index on four-byte integers would use the int4_ops class;
   * this operator class includes comparison functions for four-byte integers.
   * In practice the default operator class for the column's data type is usually sufficient.
   * The main point of having operator classes is that for some data types, there could be more than one meaningful ordering.
   * For example, we might want to sort a complex-number data type either by absolute value or by real part.
   * We could do this by defining two operator classes for the data type and then selecting the proper class when creating an index.
   * More information about operator classes check:
   *
   * ### Useful links
   * https://www.postgresql.org/docs/current/sql-createindex.html
   *
   * https://www.postgresql.org/docs/current/indexes-opclass.html
   *
   * https://www.postgresql.org/docs/current/xindex.html
   *
   * ### Additional types
   * If you have the `pg_vector` extension installed in your database, you can use the
   * `vector_l2_ops`, `vector_ip_ops`, `vector_cosine_ops`, `vector_l1_ops`, `bit_hamming_ops`, `bit_jaccard_ops`, `halfvec_l2_ops`, `sparsevec_l2_ops` options, which are predefined types.
   *
   * **You can always specify any string you want in the operator class, in case Drizzle doesn't have it natively in its types**
   *
   * @param opClass
   * @returns
   */
  op(opClass) {
    this.indexConfig.opClass = opClass;
    return this;
  }
};
var IndexedColumn = class {
  static {
    __name(this, "IndexedColumn");
  }
  static [entityKind] = "IndexedColumn";
  constructor(name, keyAsName, type, indexConfig) {
    this.name = name;
    this.keyAsName = keyAsName;
    this.type = type;
    this.indexConfig = indexConfig;
  }
  name;
  keyAsName;
  type;
  indexConfig;
};
var PgArrayBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgArrayBuilder");
  }
  static [entityKind] = "PgArrayBuilder";
  constructor(name, baseBuilder, size) {
    super(name, "array", "PgArray");
    this.config.baseBuilder = baseBuilder;
    this.config.size = size;
  }
  /** @internal */
  build(table3) {
    const baseColumn = this.config.baseBuilder.build(table3);
    return new PgArray(
      table3,
      this.config,
      baseColumn
    );
  }
};
var PgArray = class _PgArray extends PgColumn {
  static {
    __name(this, "PgArray");
  }
  constructor(table3, config2, baseColumn, range) {
    super(table3, config2);
    this.baseColumn = baseColumn;
    this.range = range;
    this.size = config2.size;
  }
  size;
  static [entityKind] = "PgArray";
  getSQLType() {
    return `${this.baseColumn.getSQLType()}[${typeof this.size === "number" ? this.size : ""}]`;
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      value = parsePgArray(value);
    }
    return value.map((v) => this.baseColumn.mapFromDriverValue(v));
  }
  mapToDriverValue(value, isNestedArray = false) {
    const a = value.map(
      (v) => v === null ? null : is(this.baseColumn, _PgArray) ? this.baseColumn.mapToDriverValue(v, true) : this.baseColumn.mapToDriverValue(v)
    );
    if (isNestedArray)
      return a;
    return makePgArray(a);
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/pg-core/columns/enum.js
var isPgEnumSym = Symbol.for("drizzle:isPgEnum");
function isPgEnum(obj) {
  return !!obj && typeof obj === "function" && isPgEnumSym in obj && obj[isPgEnumSym] === true;
}
__name(isPgEnum, "isPgEnum");
var PgEnumColumnBuilder = class extends PgColumnBuilder {
  static {
    __name(this, "PgEnumColumnBuilder");
  }
  static [entityKind] = "PgEnumColumnBuilder";
  constructor(name, enumInstance) {
    super(name, "string", "PgEnumColumn");
    this.config.enum = enumInstance;
  }
  /** @internal */
  build(table3) {
    return new PgEnumColumn(
      table3,
      this.config
    );
  }
};
var PgEnumColumn = class extends PgColumn {
  static {
    __name(this, "PgEnumColumn");
  }
  static [entityKind] = "PgEnumColumn";
  enum = this.config.enum;
  enumValues = this.config.enum.enumValues;
  constructor(table3, config2) {
    super(table3, config2);
    this.enum = config2.enum;
  }
  getSQLType() {
    return this.enum.enumName;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/subquery.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var Subquery = class {
  static {
    __name(this, "Subquery");
  }
  static [entityKind] = "Subquery";
  constructor(sql4, selection, alias, isWith = false) {
    this._ = {
      brand: "Subquery",
      sql: sql4,
      selectedFields: selection,
      alias,
      isWith
    };
  }
  // getSQL(): SQL<unknown> {
  // 	return new SQL([this]);
  // }
};
var WithSubquery = class extends Subquery {
  static {
    __name(this, "WithSubquery");
  }
  static [entityKind] = "WithSubquery";
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/tracing.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/version.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var version2 = "0.36.4";

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/tracing.js
var otel;
var rawTracer;
var tracer = {
  startActiveSpan(name, fn) {
    if (!otel) {
      return fn();
    }
    if (!rawTracer) {
      rawTracer = otel.trace.getTracer("drizzle-orm", version2);
    }
    return iife(
      (otel2, rawTracer2) => rawTracer2.startActiveSpan(
        name,
        (span) => {
          try {
            return fn(span);
          } catch (e) {
            span.setStatus({
              code: otel2.SpanStatusCode.ERROR,
              message: e instanceof Error ? e.message : "Unknown error"
              // eslint-disable-line no-instanceof/no-instanceof
            });
            throw e;
          } finally {
            span.end();
          }
        }
      ),
      otel,
      rawTracer
    );
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/view-common.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ViewBaseConfig = Symbol.for("drizzle:ViewBaseConfig");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sql/sql.js
var FakePrimitiveParam = class {
  static {
    __name(this, "FakePrimitiveParam");
  }
  static [entityKind] = "FakePrimitiveParam";
};
function isSQLWrapper(value) {
  return value !== null && value !== void 0 && typeof value.getSQL === "function";
}
__name(isSQLWrapper, "isSQLWrapper");
function mergeQueries(queries) {
  const result = { sql: "", params: [] };
  for (const query of queries) {
    result.sql += query.sql;
    result.params.push(...query.params);
    if (query.typings?.length) {
      if (!result.typings) {
        result.typings = [];
      }
      result.typings.push(...query.typings);
    }
  }
  return result;
}
__name(mergeQueries, "mergeQueries");
var StringChunk = class {
  static {
    __name(this, "StringChunk");
  }
  static [entityKind] = "StringChunk";
  value;
  constructor(value) {
    this.value = Array.isArray(value) ? value : [value];
  }
  getSQL() {
    return new SQL([this]);
  }
};
var SQL = class _SQL {
  static {
    __name(this, "SQL");
  }
  constructor(queryChunks) {
    this.queryChunks = queryChunks;
  }
  static [entityKind] = "SQL";
  /** @internal */
  decoder = noopDecoder;
  shouldInlineParams = false;
  append(query) {
    this.queryChunks.push(...query.queryChunks);
    return this;
  }
  toQuery(config2) {
    return tracer.startActiveSpan("drizzle.buildSQL", (span) => {
      const query = this.buildQueryFromSourceParams(this.queryChunks, config2);
      span?.setAttributes({
        "drizzle.query.text": query.sql,
        "drizzle.query.params": JSON.stringify(query.params)
      });
      return query;
    });
  }
  buildQueryFromSourceParams(chunks, _config) {
    const config2 = Object.assign({}, _config, {
      inlineParams: _config.inlineParams || this.shouldInlineParams,
      paramStartIndex: _config.paramStartIndex || { value: 0 }
    });
    const {
      casing,
      escapeName,
      escapeParam,
      prepareTyping,
      inlineParams,
      paramStartIndex
    } = config2;
    return mergeQueries(chunks.map((chunk) => {
      if (is(chunk, StringChunk)) {
        return { sql: chunk.value.join(""), params: [] };
      }
      if (is(chunk, Name)) {
        return { sql: escapeName(chunk.value), params: [] };
      }
      if (chunk === void 0) {
        return { sql: "", params: [] };
      }
      if (Array.isArray(chunk)) {
        const result = [new StringChunk("(")];
        for (const [i, p] of chunk.entries()) {
          result.push(p);
          if (i < chunk.length - 1) {
            result.push(new StringChunk(", "));
          }
        }
        result.push(new StringChunk(")"));
        return this.buildQueryFromSourceParams(result, config2);
      }
      if (is(chunk, _SQL)) {
        return this.buildQueryFromSourceParams(chunk.queryChunks, {
          ...config2,
          inlineParams: inlineParams || chunk.shouldInlineParams
        });
      }
      if (is(chunk, Table)) {
        const schemaName = chunk[Table.Symbol.Schema];
        const tableName = chunk[Table.Symbol.Name];
        return {
          sql: schemaName === void 0 ? escapeName(tableName) : escapeName(schemaName) + "." + escapeName(tableName),
          params: []
        };
      }
      if (is(chunk, Column)) {
        const columnName = casing.getColumnCasing(chunk);
        if (_config.invokeSource === "indexes") {
          return { sql: escapeName(columnName), params: [] };
        }
        const schemaName = chunk.table[Table.Symbol.Schema];
        return {
          sql: chunk.table[IsAlias] || schemaName === void 0 ? escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName) : escapeName(schemaName) + "." + escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName),
          params: []
        };
      }
      if (is(chunk, View)) {
        const schemaName = chunk[ViewBaseConfig].schema;
        const viewName = chunk[ViewBaseConfig].name;
        return {
          sql: schemaName === void 0 ? escapeName(viewName) : escapeName(schemaName) + "." + escapeName(viewName),
          params: []
        };
      }
      if (is(chunk, Param)) {
        if (is(chunk.value, Placeholder)) {
          return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
        }
        const mappedValue = chunk.value === null ? null : chunk.encoder.mapToDriverValue(chunk.value);
        if (is(mappedValue, _SQL)) {
          return this.buildQueryFromSourceParams([mappedValue], config2);
        }
        if (inlineParams) {
          return { sql: this.mapInlineParam(mappedValue, config2), params: [] };
        }
        let typings = ["none"];
        if (prepareTyping) {
          typings = [prepareTyping(chunk.encoder)];
        }
        return { sql: escapeParam(paramStartIndex.value++, mappedValue), params: [mappedValue], typings };
      }
      if (is(chunk, Placeholder)) {
        return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
      }
      if (is(chunk, _SQL.Aliased) && chunk.fieldAlias !== void 0) {
        return { sql: escapeName(chunk.fieldAlias), params: [] };
      }
      if (is(chunk, Subquery)) {
        if (chunk._.isWith) {
          return { sql: escapeName(chunk._.alias), params: [] };
        }
        return this.buildQueryFromSourceParams([
          new StringChunk("("),
          chunk._.sql,
          new StringChunk(") "),
          new Name(chunk._.alias)
        ], config2);
      }
      if (isPgEnum(chunk)) {
        if (chunk.schema) {
          return { sql: escapeName(chunk.schema) + "." + escapeName(chunk.enumName), params: [] };
        }
        return { sql: escapeName(chunk.enumName), params: [] };
      }
      if (isSQLWrapper(chunk)) {
        if (chunk.shouldOmitSQLParens?.()) {
          return this.buildQueryFromSourceParams([chunk.getSQL()], config2);
        }
        return this.buildQueryFromSourceParams([
          new StringChunk("("),
          chunk.getSQL(),
          new StringChunk(")")
        ], config2);
      }
      if (inlineParams) {
        return { sql: this.mapInlineParam(chunk, config2), params: [] };
      }
      return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
    }));
  }
  mapInlineParam(chunk, { escapeString }) {
    if (chunk === null) {
      return "null";
    }
    if (typeof chunk === "number" || typeof chunk === "boolean") {
      return chunk.toString();
    }
    if (typeof chunk === "string") {
      return escapeString(chunk);
    }
    if (typeof chunk === "object") {
      const mappedValueAsString = chunk.toString();
      if (mappedValueAsString === "[object Object]") {
        return escapeString(JSON.stringify(chunk));
      }
      return escapeString(mappedValueAsString);
    }
    throw new Error("Unexpected param value: " + chunk);
  }
  getSQL() {
    return this;
  }
  as(alias) {
    if (alias === void 0) {
      return this;
    }
    return new _SQL.Aliased(this, alias);
  }
  mapWith(decoder2) {
    this.decoder = typeof decoder2 === "function" ? { mapFromDriverValue: decoder2 } : decoder2;
    return this;
  }
  inlineParams() {
    this.shouldInlineParams = true;
    return this;
  }
  /**
   * This method is used to conditionally include a part of the query.
   *
   * @param condition - Condition to check
   * @returns itself if the condition is `true`, otherwise `undefined`
   */
  if(condition) {
    return condition ? this : void 0;
  }
};
var Name = class {
  static {
    __name(this, "Name");
  }
  constructor(value) {
    this.value = value;
  }
  static [entityKind] = "Name";
  brand;
  getSQL() {
    return new SQL([this]);
  }
};
function isDriverValueEncoder(value) {
  return typeof value === "object" && value !== null && "mapToDriverValue" in value && typeof value.mapToDriverValue === "function";
}
__name(isDriverValueEncoder, "isDriverValueEncoder");
var noopDecoder = {
  mapFromDriverValue: /* @__PURE__ */ __name((value) => value, "mapFromDriverValue")
};
var noopEncoder = {
  mapToDriverValue: /* @__PURE__ */ __name((value) => value, "mapToDriverValue")
};
var noopMapper = {
  ...noopDecoder,
  ...noopEncoder
};
var Param = class {
  static {
    __name(this, "Param");
  }
  /**
   * @param value - Parameter value
   * @param encoder - Encoder to convert the value to a driver parameter
   */
  constructor(value, encoder2 = noopEncoder) {
    this.value = value;
    this.encoder = encoder2;
  }
  static [entityKind] = "Param";
  brand;
  getSQL() {
    return new SQL([this]);
  }
};
function sql(strings, ...params) {
  const queryChunks = [];
  if (params.length > 0 || strings.length > 0 && strings[0] !== "") {
    queryChunks.push(new StringChunk(strings[0]));
  }
  for (const [paramIndex, param2] of params.entries()) {
    queryChunks.push(param2, new StringChunk(strings[paramIndex + 1]));
  }
  return new SQL(queryChunks);
}
__name(sql, "sql");
((sql22) => {
  function empty() {
    return new SQL([]);
  }
  __name(empty, "empty");
  sql22.empty = empty;
  function fromList(list) {
    return new SQL(list);
  }
  __name(fromList, "fromList");
  sql22.fromList = fromList;
  function raw2(str) {
    return new SQL([new StringChunk(str)]);
  }
  __name(raw2, "raw");
  sql22.raw = raw2;
  function join(chunks, separator) {
    const result = [];
    for (const [i, chunk] of chunks.entries()) {
      if (i > 0 && separator !== void 0) {
        result.push(separator);
      }
      result.push(chunk);
    }
    return new SQL(result);
  }
  __name(join, "join");
  sql22.join = join;
  function identifier(value) {
    return new Name(value);
  }
  __name(identifier, "identifier");
  sql22.identifier = identifier;
  function placeholder2(name2) {
    return new Placeholder(name2);
  }
  __name(placeholder2, "placeholder2");
  sql22.placeholder = placeholder2;
  function param2(value, encoder2) {
    return new Param(value, encoder2);
  }
  __name(param2, "param2");
  sql22.param = param2;
})(sql || (sql = {}));
((SQL2) => {
  class Aliased {
    static {
      __name(this, "Aliased");
    }
    constructor(sql22, fieldAlias) {
      this.sql = sql22;
      this.fieldAlias = fieldAlias;
    }
    static [entityKind] = "SQL.Aliased";
    /** @internal */
    isSelectionField = false;
    getSQL() {
      return this.sql;
    }
    /** @internal */
    clone() {
      return new Aliased(this.sql, this.fieldAlias);
    }
  }
  SQL2.Aliased = Aliased;
})(SQL || (SQL = {}));
var Placeholder = class {
  static {
    __name(this, "Placeholder");
  }
  constructor(name2) {
    this.name = name2;
  }
  static [entityKind] = "Placeholder";
  getSQL() {
    return new SQL([this]);
  }
};
function fillPlaceholders(params, values) {
  return params.map((p) => {
    if (is(p, Placeholder)) {
      if (!(p.name in values)) {
        throw new Error(`No value for placeholder "${p.name}" was provided`);
      }
      return values[p.name];
    }
    if (is(p, Param) && is(p.value, Placeholder)) {
      if (!(p.value.name in values)) {
        throw new Error(`No value for placeholder "${p.value.name}" was provided`);
      }
      return p.encoder.mapToDriverValue(values[p.value.name]);
    }
    return p;
  });
}
__name(fillPlaceholders, "fillPlaceholders");
var View = class {
  static {
    __name(this, "View");
  }
  static [entityKind] = "View";
  /** @internal */
  [ViewBaseConfig];
  constructor({ name: name2, schema, selectedFields, query }) {
    this[ViewBaseConfig] = {
      name: name2,
      originalName: name2,
      schema,
      selectedFields,
      query,
      isExisting: !query,
      isAlias: false
    };
  }
  getSQL() {
    return new SQL([this]);
  }
};
Column.prototype.getSQL = function() {
  return new SQL([this]);
};
Table.prototype.getSQL = function() {
  return new SQL([this]);
};
Subquery.prototype.getSQL = function() {
  return new SQL([this]);
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/utils.js
function mapResultRow(columns, row, joinsNotNullableMap) {
  const nullifyMap = {};
  const result = columns.reduce(
    (result2, { path, field }, columnIndex) => {
      let decoder2;
      if (is(field, Column)) {
        decoder2 = field;
      } else if (is(field, SQL)) {
        decoder2 = field.decoder;
      } else {
        decoder2 = field.sql.decoder;
      }
      let node = result2;
      for (const [pathChunkIndex, pathChunk] of path.entries()) {
        if (pathChunkIndex < path.length - 1) {
          if (!(pathChunk in node)) {
            node[pathChunk] = {};
          }
          node = node[pathChunk];
        } else {
          const rawValue = row[columnIndex];
          const value = node[pathChunk] = rawValue === null ? null : decoder2.mapFromDriverValue(rawValue);
          if (joinsNotNullableMap && is(field, Column) && path.length === 2) {
            const objectName = path[0];
            if (!(objectName in nullifyMap)) {
              nullifyMap[objectName] = value === null ? getTableName(field.table) : false;
            } else if (typeof nullifyMap[objectName] === "string" && nullifyMap[objectName] !== getTableName(field.table)) {
              nullifyMap[objectName] = false;
            }
          }
        }
      }
      return result2;
    },
    {}
  );
  if (joinsNotNullableMap && Object.keys(nullifyMap).length > 0) {
    for (const [objectName, tableName] of Object.entries(nullifyMap)) {
      if (typeof tableName === "string" && !joinsNotNullableMap[tableName]) {
        result[objectName] = null;
      }
    }
  }
  return result;
}
__name(mapResultRow, "mapResultRow");
function orderSelectedFields(fields, pathPrefix) {
  return Object.entries(fields).reduce((result, [name, field]) => {
    if (typeof name !== "string") {
      return result;
    }
    const newPath = pathPrefix ? [...pathPrefix, name] : [name];
    if (is(field, Column) || is(field, SQL) || is(field, SQL.Aliased)) {
      result.push({ path: newPath, field });
    } else if (is(field, Table)) {
      result.push(...orderSelectedFields(field[Table.Symbol.Columns], newPath));
    } else {
      result.push(...orderSelectedFields(field, newPath));
    }
    return result;
  }, []);
}
__name(orderSelectedFields, "orderSelectedFields");
function haveSameKeys(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (const [index2, key] of leftKeys.entries()) {
    if (key !== rightKeys[index2]) {
      return false;
    }
  }
  return true;
}
__name(haveSameKeys, "haveSameKeys");
function mapUpdateSet(table3, values) {
  const entries = Object.entries(values).filter(([, value]) => value !== void 0).map(([key, value]) => {
    if (is(value, SQL) || is(value, Column)) {
      return [key, value];
    } else {
      return [key, new Param(value, table3[Table.Symbol.Columns][key])];
    }
  });
  if (entries.length === 0) {
    throw new Error("No values to set");
  }
  return Object.fromEntries(entries);
}
__name(mapUpdateSet, "mapUpdateSet");
function applyMixins(baseClass, extendedClasses) {
  for (const extendedClass of extendedClasses) {
    for (const name of Object.getOwnPropertyNames(extendedClass.prototype)) {
      if (name === "constructor")
        continue;
      Object.defineProperty(
        baseClass.prototype,
        name,
        Object.getOwnPropertyDescriptor(extendedClass.prototype, name) || /* @__PURE__ */ Object.create(null)
      );
    }
  }
}
__name(applyMixins, "applyMixins");
function getTableColumns(table3) {
  return table3[Table.Symbol.Columns];
}
__name(getTableColumns, "getTableColumns");
function getTableLikeName(table3) {
  return is(table3, Subquery) ? table3._.alias : is(table3, View) ? table3[ViewBaseConfig].name : is(table3, SQL) ? void 0 : table3[Table.Symbol.IsAlias] ? table3[Table.Symbol.Name] : table3[Table.Symbol.BaseName];
}
__name(getTableLikeName, "getTableLikeName");
function getColumnNameAndConfig(a, b) {
  return {
    name: typeof a === "string" && a.length > 0 ? a : "",
    config: typeof a === "object" ? a : b
  };
}
__name(getColumnNameAndConfig, "getColumnNameAndConfig");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/pg-core/table.js
var InlineForeignKeys = Symbol.for("drizzle:PgInlineForeignKeys");
var EnableRLS = Symbol.for("drizzle:EnableRLS");
var PgTable = class extends Table {
  static {
    __name(this, "PgTable");
  }
  static [entityKind] = "PgTable";
  /** @internal */
  static Symbol = Object.assign({}, Table.Symbol, {
    InlineForeignKeys,
    EnableRLS
  });
  /**@internal */
  [InlineForeignKeys] = [];
  /** @internal */
  [EnableRLS] = false;
  /** @internal */
  [Table.Symbol.ExtraConfigBuilder] = void 0;
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/pg-core/primary-keys.js
var PrimaryKeyBuilder = class {
  static {
    __name(this, "PrimaryKeyBuilder");
  }
  static [entityKind] = "PgPrimaryKeyBuilder";
  /** @internal */
  columns;
  /** @internal */
  name;
  constructor(columns, name) {
    this.columns = columns;
    this.name = name;
  }
  /** @internal */
  build(table3) {
    return new PrimaryKey(table3, this.columns, this.name);
  }
};
var PrimaryKey = class {
  static {
    __name(this, "PrimaryKey");
  }
  constructor(table3, columns, name) {
    this.table = table3;
    this.columns = columns;
    this.name = name;
  }
  static [entityKind] = "PgPrimaryKey";
  columns;
  name;
  getName() {
    return this.name ?? `${this.table[PgTable.Symbol.Name]}_${this.columns.map((column) => column.name).join("_")}_pk`;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sql/expressions/conditions.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function bindIfParam(value, column) {
  if (isDriverValueEncoder(column) && !isSQLWrapper(value) && !is(value, Param) && !is(value, Placeholder) && !is(value, Column) && !is(value, Table) && !is(value, View)) {
    return new Param(value, column);
  }
  return value;
}
__name(bindIfParam, "bindIfParam");
var eq = /* @__PURE__ */ __name((left, right) => {
  return sql`${left} = ${bindIfParam(right, left)}`;
}, "eq");
var ne = /* @__PURE__ */ __name((left, right) => {
  return sql`${left} <> ${bindIfParam(right, left)}`;
}, "ne");
function and(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter(
    (c) => c !== void 0
  );
  if (conditions.length === 0) {
    return void 0;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" and ")),
    new StringChunk(")")
  ]);
}
__name(and, "and");
function or(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter(
    (c) => c !== void 0
  );
  if (conditions.length === 0) {
    return void 0;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" or ")),
    new StringChunk(")")
  ]);
}
__name(or, "or");
function not(condition) {
  return sql`not ${condition}`;
}
__name(not, "not");
var gt = /* @__PURE__ */ __name((left, right) => {
  return sql`${left} > ${bindIfParam(right, left)}`;
}, "gt");
var gte = /* @__PURE__ */ __name((left, right) => {
  return sql`${left} >= ${bindIfParam(right, left)}`;
}, "gte");
var lt = /* @__PURE__ */ __name((left, right) => {
  return sql`${left} < ${bindIfParam(right, left)}`;
}, "lt");
var lte = /* @__PURE__ */ __name((left, right) => {
  return sql`${left} <= ${bindIfParam(right, left)}`;
}, "lte");
function inArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`false`;
    }
    return sql`${column} in ${values.map((v) => bindIfParam(v, column))}`;
  }
  return sql`${column} in ${bindIfParam(values, column)}`;
}
__name(inArray, "inArray");
function notInArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`true`;
    }
    return sql`${column} not in ${values.map((v) => bindIfParam(v, column))}`;
  }
  return sql`${column} not in ${bindIfParam(values, column)}`;
}
__name(notInArray, "notInArray");
function isNull(value) {
  return sql`${value} is null`;
}
__name(isNull, "isNull");
function isNotNull(value) {
  return sql`${value} is not null`;
}
__name(isNotNull, "isNotNull");
function exists(subquery) {
  return sql`exists ${subquery}`;
}
__name(exists, "exists");
function notExists(subquery) {
  return sql`not exists ${subquery}`;
}
__name(notExists, "notExists");
function between(column, min, max) {
  return sql`${column} between ${bindIfParam(min, column)} and ${bindIfParam(
    max,
    column
  )}`;
}
__name(between, "between");
function notBetween(column, min, max) {
  return sql`${column} not between ${bindIfParam(
    min,
    column
  )} and ${bindIfParam(max, column)}`;
}
__name(notBetween, "notBetween");
function like(column, value) {
  return sql`${column} like ${value}`;
}
__name(like, "like");
function notLike(column, value) {
  return sql`${column} not like ${value}`;
}
__name(notLike, "notLike");
function ilike(column, value) {
  return sql`${column} ilike ${value}`;
}
__name(ilike, "ilike");
function notIlike(column, value) {
  return sql`${column} not ilike ${value}`;
}
__name(notIlike, "notIlike");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sql/expressions/select.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function asc(column) {
  return sql`${column} asc`;
}
__name(asc, "asc");
function desc(column) {
  return sql`${column} desc`;
}
__name(desc, "desc");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/relations.js
var Relation = class {
  static {
    __name(this, "Relation");
  }
  constructor(sourceTable, referencedTable, relationName) {
    this.sourceTable = sourceTable;
    this.referencedTable = referencedTable;
    this.relationName = relationName;
    this.referencedTableName = referencedTable[Table.Symbol.Name];
  }
  static [entityKind] = "Relation";
  referencedTableName;
  fieldName;
};
var Relations = class {
  static {
    __name(this, "Relations");
  }
  constructor(table3, config2) {
    this.table = table3;
    this.config = config2;
  }
  static [entityKind] = "Relations";
};
var One = class _One extends Relation {
  static {
    __name(this, "One");
  }
  constructor(sourceTable, referencedTable, config2, isNullable) {
    super(sourceTable, referencedTable, config2?.relationName);
    this.config = config2;
    this.isNullable = isNullable;
  }
  static [entityKind] = "One";
  withFieldName(fieldName) {
    const relation = new _One(
      this.sourceTable,
      this.referencedTable,
      this.config,
      this.isNullable
    );
    relation.fieldName = fieldName;
    return relation;
  }
};
var Many = class _Many extends Relation {
  static {
    __name(this, "Many");
  }
  constructor(sourceTable, referencedTable, config2) {
    super(sourceTable, referencedTable, config2?.relationName);
    this.config = config2;
  }
  static [entityKind] = "Many";
  withFieldName(fieldName) {
    const relation = new _Many(
      this.sourceTable,
      this.referencedTable,
      this.config
    );
    relation.fieldName = fieldName;
    return relation;
  }
};
function getOperators() {
  return {
    and,
    between,
    eq,
    exists,
    gt,
    gte,
    ilike,
    inArray,
    isNull,
    isNotNull,
    like,
    lt,
    lte,
    ne,
    not,
    notBetween,
    notExists,
    notLike,
    notIlike,
    notInArray,
    or,
    sql
  };
}
__name(getOperators, "getOperators");
function getOrderByOperators() {
  return {
    sql,
    asc,
    desc
  };
}
__name(getOrderByOperators, "getOrderByOperators");
function extractTablesRelationalConfig(schema, configHelpers) {
  if (Object.keys(schema).length === 1 && "default" in schema && !is(schema["default"], Table)) {
    schema = schema["default"];
  }
  const tableNamesMap = {};
  const relationsBuffer = {};
  const tablesConfig = {};
  for (const [key, value] of Object.entries(schema)) {
    if (is(value, Table)) {
      const dbName = getTableUniqueName(value);
      const bufferedRelations = relationsBuffer[dbName];
      tableNamesMap[dbName] = key;
      tablesConfig[key] = {
        tsName: key,
        dbName: value[Table.Symbol.Name],
        schema: value[Table.Symbol.Schema],
        columns: value[Table.Symbol.Columns],
        relations: bufferedRelations?.relations ?? {},
        primaryKey: bufferedRelations?.primaryKey ?? []
      };
      for (const column of Object.values(
        value[Table.Symbol.Columns]
      )) {
        if (column.primary) {
          tablesConfig[key].primaryKey.push(column);
        }
      }
      const extraConfig = value[Table.Symbol.ExtraConfigBuilder]?.(value[Table.Symbol.ExtraConfigColumns]);
      if (extraConfig) {
        for (const configEntry of Object.values(extraConfig)) {
          if (is(configEntry, PrimaryKeyBuilder)) {
            tablesConfig[key].primaryKey.push(...configEntry.columns);
          }
        }
      }
    } else if (is(value, Relations)) {
      const dbName = getTableUniqueName(value.table);
      const tableName = tableNamesMap[dbName];
      const relations2 = value.config(
        configHelpers(value.table)
      );
      let primaryKey2;
      for (const [relationName, relation] of Object.entries(relations2)) {
        if (tableName) {
          const tableConfig = tablesConfig[tableName];
          tableConfig.relations[relationName] = relation;
          if (primaryKey2) {
            tableConfig.primaryKey.push(...primaryKey2);
          }
        } else {
          if (!(dbName in relationsBuffer)) {
            relationsBuffer[dbName] = {
              relations: {},
              primaryKey: primaryKey2
            };
          }
          relationsBuffer[dbName].relations[relationName] = relation;
        }
      }
    }
  }
  return { tables: tablesConfig, tableNamesMap };
}
__name(extractTablesRelationalConfig, "extractTablesRelationalConfig");
function createOne(sourceTable) {
  return /* @__PURE__ */ __name(function one(table3, config2) {
    return new One(
      sourceTable,
      table3,
      config2,
      config2?.fields.reduce((res, f) => res && f.notNull, true) ?? false
    );
  }, "one");
}
__name(createOne, "createOne");
function createMany(sourceTable) {
  return /* @__PURE__ */ __name(function many(referencedTable, config2) {
    return new Many(sourceTable, referencedTable, config2);
  }, "many");
}
__name(createMany, "createMany");
function normalizeRelation(schema, tableNamesMap, relation) {
  if (is(relation, One) && relation.config) {
    return {
      fields: relation.config.fields,
      references: relation.config.references
    };
  }
  const referencedTableTsName = tableNamesMap[getTableUniqueName(relation.referencedTable)];
  if (!referencedTableTsName) {
    throw new Error(
      `Table "${relation.referencedTable[Table.Symbol.Name]}" not found in schema`
    );
  }
  const referencedTableConfig = schema[referencedTableTsName];
  if (!referencedTableConfig) {
    throw new Error(`Table "${referencedTableTsName}" not found in schema`);
  }
  const sourceTable = relation.sourceTable;
  const sourceTableTsName = tableNamesMap[getTableUniqueName(sourceTable)];
  if (!sourceTableTsName) {
    throw new Error(
      `Table "${sourceTable[Table.Symbol.Name]}" not found in schema`
    );
  }
  const reverseRelations = [];
  for (const referencedTableRelation of Object.values(
    referencedTableConfig.relations
  )) {
    if (relation.relationName && relation !== referencedTableRelation && referencedTableRelation.relationName === relation.relationName || !relation.relationName && referencedTableRelation.referencedTable === relation.sourceTable) {
      reverseRelations.push(referencedTableRelation);
    }
  }
  if (reverseRelations.length > 1) {
    throw relation.relationName ? new Error(
      `There are multiple relations with name "${relation.relationName}" in table "${referencedTableTsName}"`
    ) : new Error(
      `There are multiple relations between "${referencedTableTsName}" and "${relation.sourceTable[Table.Symbol.Name]}". Please specify relation name`
    );
  }
  if (reverseRelations[0] && is(reverseRelations[0], One) && reverseRelations[0].config) {
    return {
      fields: reverseRelations[0].config.references,
      references: reverseRelations[0].config.fields
    };
  }
  throw new Error(
    `There is not enough information to infer relation "${sourceTableTsName}.${relation.fieldName}"`
  );
}
__name(normalizeRelation, "normalizeRelation");
function createTableRelationsHelpers(sourceTable) {
  return {
    one: createOne(sourceTable),
    many: createMany(sourceTable)
  };
}
__name(createTableRelationsHelpers, "createTableRelationsHelpers");
function mapRelationalRow(tablesConfig, tableConfig, row, buildQueryResultSelection, mapColumnValue = (value) => value) {
  const result = {};
  for (const [
    selectionItemIndex,
    selectionItem
  ] of buildQueryResultSelection.entries()) {
    if (selectionItem.isJson) {
      const relation = tableConfig.relations[selectionItem.tsKey];
      const rawSubRows = row[selectionItemIndex];
      const subRows = typeof rawSubRows === "string" ? JSON.parse(rawSubRows) : rawSubRows;
      result[selectionItem.tsKey] = is(relation, One) ? subRows && mapRelationalRow(
        tablesConfig,
        tablesConfig[selectionItem.relationTableTsKey],
        subRows,
        selectionItem.selection,
        mapColumnValue
      ) : subRows.map(
        (subRow) => mapRelationalRow(
          tablesConfig,
          tablesConfig[selectionItem.relationTableTsKey],
          subRow,
          selectionItem.selection,
          mapColumnValue
        )
      );
    } else {
      const value = mapColumnValue(row[selectionItemIndex]);
      const field = selectionItem.field;
      let decoder2;
      if (is(field, Column)) {
        decoder2 = field;
      } else if (is(field, SQL)) {
        decoder2 = field.decoder;
      } else {
        decoder2 = field.sql.decoder;
      }
      result[selectionItem.tsKey] = value === null ? null : decoder2.mapFromDriverValue(value);
    }
  }
  return result;
}
__name(mapRelationalRow, "mapRelationalRow");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/db.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/selection-proxy.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/alias.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ColumnAliasProxyHandler = class {
  static {
    __name(this, "ColumnAliasProxyHandler");
  }
  constructor(table3) {
    this.table = table3;
  }
  static [entityKind] = "ColumnAliasProxyHandler";
  get(columnObj, prop) {
    if (prop === "table") {
      return this.table;
    }
    return columnObj[prop];
  }
};
var TableAliasProxyHandler = class {
  static {
    __name(this, "TableAliasProxyHandler");
  }
  constructor(alias, replaceOriginalName) {
    this.alias = alias;
    this.replaceOriginalName = replaceOriginalName;
  }
  static [entityKind] = "TableAliasProxyHandler";
  get(target, prop) {
    if (prop === Table.Symbol.IsAlias) {
      return true;
    }
    if (prop === Table.Symbol.Name) {
      return this.alias;
    }
    if (this.replaceOriginalName && prop === Table.Symbol.OriginalName) {
      return this.alias;
    }
    if (prop === ViewBaseConfig) {
      return {
        ...target[ViewBaseConfig],
        name: this.alias,
        isAlias: true
      };
    }
    if (prop === Table.Symbol.Columns) {
      const columns = target[Table.Symbol.Columns];
      if (!columns) {
        return columns;
      }
      const proxiedColumns = {};
      Object.keys(columns).map((key) => {
        proxiedColumns[key] = new Proxy(
          columns[key],
          new ColumnAliasProxyHandler(new Proxy(target, this))
        );
      });
      return proxiedColumns;
    }
    const value = target[prop];
    if (is(value, Column)) {
      return new Proxy(value, new ColumnAliasProxyHandler(new Proxy(target, this)));
    }
    return value;
  }
};
var RelationTableAliasProxyHandler = class {
  static {
    __name(this, "RelationTableAliasProxyHandler");
  }
  constructor(alias) {
    this.alias = alias;
  }
  static [entityKind] = "RelationTableAliasProxyHandler";
  get(target, prop) {
    if (prop === "sourceTable") {
      return aliasedTable(target.sourceTable, this.alias);
    }
    return target[prop];
  }
};
function aliasedTable(table3, tableAlias) {
  return new Proxy(table3, new TableAliasProxyHandler(tableAlias, false));
}
__name(aliasedTable, "aliasedTable");
function aliasedTableColumn(column, tableAlias) {
  return new Proxy(
    column,
    new ColumnAliasProxyHandler(new Proxy(column.table, new TableAliasProxyHandler(tableAlias, false)))
  );
}
__name(aliasedTableColumn, "aliasedTableColumn");
function mapColumnsInAliasedSQLToAlias(query, alias) {
  return new SQL.Aliased(mapColumnsInSQLToAlias(query.sql, alias), query.fieldAlias);
}
__name(mapColumnsInAliasedSQLToAlias, "mapColumnsInAliasedSQLToAlias");
function mapColumnsInSQLToAlias(query, alias) {
  return sql.join(query.queryChunks.map((c) => {
    if (is(c, Column)) {
      return aliasedTableColumn(c, alias);
    }
    if (is(c, SQL)) {
      return mapColumnsInSQLToAlias(c, alias);
    }
    if (is(c, SQL.Aliased)) {
      return mapColumnsInAliasedSQLToAlias(c, alias);
    }
    return c;
  }));
}
__name(mapColumnsInSQLToAlias, "mapColumnsInSQLToAlias");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/selection-proxy.js
var SelectionProxyHandler = class _SelectionProxyHandler {
  static {
    __name(this, "SelectionProxyHandler");
  }
  static [entityKind] = "SelectionProxyHandler";
  config;
  constructor(config2) {
    this.config = { ...config2 };
  }
  get(subquery, prop) {
    if (prop === "_") {
      return {
        ...subquery["_"],
        selectedFields: new Proxy(
          subquery._.selectedFields,
          this
        )
      };
    }
    if (prop === ViewBaseConfig) {
      return {
        ...subquery[ViewBaseConfig],
        selectedFields: new Proxy(
          subquery[ViewBaseConfig].selectedFields,
          this
        )
      };
    }
    if (typeof prop === "symbol") {
      return subquery[prop];
    }
    const columns = is(subquery, Subquery) ? subquery._.selectedFields : is(subquery, View) ? subquery[ViewBaseConfig].selectedFields : subquery;
    const value = columns[prop];
    if (is(value, SQL.Aliased)) {
      if (this.config.sqlAliasedBehavior === "sql" && !value.isSelectionField) {
        return value.sql;
      }
      const newValue = value.clone();
      newValue.isSelectionField = true;
      return newValue;
    }
    if (is(value, SQL)) {
      if (this.config.sqlBehavior === "sql") {
        return value;
      }
      throw new Error(
        `You tried to reference "${prop}" field from a subquery, which is a raw SQL field, but it doesn't have an alias declared. Please add an alias to the field using ".as('alias')" method.`
      );
    }
    if (is(value, Column)) {
      if (this.config.alias) {
        return new Proxy(
          value,
          new ColumnAliasProxyHandler(
            new Proxy(
              value.table,
              new TableAliasProxyHandler(this.config.alias, this.config.replaceOriginalName ?? false)
            )
          )
        );
      }
      return value;
    }
    if (typeof value !== "object" || value === null) {
      return value;
    }
    return new Proxy(value, new _SelectionProxyHandler(this.config));
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/query-builders/delete.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/query-promise.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var QueryPromise = class {
  static {
    __name(this, "QueryPromise");
  }
  static [entityKind] = "QueryPromise";
  [Symbol.toStringTag] = "QueryPromise";
  catch(onRejected) {
    return this.then(void 0, onRejected);
  }
  finally(onFinally) {
    return this.then(
      (value) => {
        onFinally?.();
        return value;
      },
      (reason) => {
        onFinally?.();
        throw reason;
      }
    );
  }
  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/table.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/columns/all.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/columns/blob.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/columns/common.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/foreign-keys.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ForeignKeyBuilder2 = class {
  static {
    __name(this, "ForeignKeyBuilder");
  }
  static [entityKind] = "SQLiteForeignKeyBuilder";
  /** @internal */
  reference;
  /** @internal */
  _onUpdate;
  /** @internal */
  _onDelete;
  constructor(config2, actions) {
    this.reference = () => {
      const { name, columns, foreignColumns } = config2();
      return { name, columns, foreignTable: foreignColumns[0].table, foreignColumns };
    };
    if (actions) {
      this._onUpdate = actions.onUpdate;
      this._onDelete = actions.onDelete;
    }
  }
  onUpdate(action) {
    this._onUpdate = action;
    return this;
  }
  onDelete(action) {
    this._onDelete = action;
    return this;
  }
  /** @internal */
  build(table3) {
    return new ForeignKey2(table3, this);
  }
};
var ForeignKey2 = class {
  static {
    __name(this, "ForeignKey");
  }
  constructor(table3, builder) {
    this.table = table3;
    this.reference = builder.reference;
    this.onUpdate = builder._onUpdate;
    this.onDelete = builder._onDelete;
  }
  static [entityKind] = "SQLiteForeignKey";
  reference;
  onUpdate;
  onDelete;
  getName() {
    const { name, columns, foreignColumns } = this.reference();
    const columnNames = columns.map((column) => column.name);
    const foreignColumnNames = foreignColumns.map((column) => column.name);
    const chunks = [
      this.table[TableName],
      ...columnNames,
      foreignColumns[0].table[TableName],
      ...foreignColumnNames
    ];
    return name ?? `${chunks.join("_")}_fk`;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/unique-constraint.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function uniqueKeyName2(table3, columns) {
  return `${table3[TableName]}_${columns.join("_")}_unique`;
}
__name(uniqueKeyName2, "uniqueKeyName");
var UniqueConstraintBuilder2 = class {
  static {
    __name(this, "UniqueConstraintBuilder");
  }
  constructor(columns, name) {
    this.name = name;
    this.columns = columns;
  }
  static [entityKind] = "SQLiteUniqueConstraintBuilder";
  /** @internal */
  columns;
  /** @internal */
  build(table3) {
    return new UniqueConstraint2(table3, this.columns, this.name);
  }
};
var UniqueOnConstraintBuilder2 = class {
  static {
    __name(this, "UniqueOnConstraintBuilder");
  }
  static [entityKind] = "SQLiteUniqueOnConstraintBuilder";
  /** @internal */
  name;
  constructor(name) {
    this.name = name;
  }
  on(...columns) {
    return new UniqueConstraintBuilder2(columns, this.name);
  }
};
var UniqueConstraint2 = class {
  static {
    __name(this, "UniqueConstraint");
  }
  constructor(table3, columns, name) {
    this.table = table3;
    this.columns = columns;
    this.name = name ?? uniqueKeyName2(this.table, this.columns.map((column) => column.name));
  }
  static [entityKind] = "SQLiteUniqueConstraint";
  columns;
  name;
  getName() {
    return this.name;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/columns/common.js
var SQLiteColumnBuilder = class extends ColumnBuilder {
  static {
    __name(this, "SQLiteColumnBuilder");
  }
  static [entityKind] = "SQLiteColumnBuilder";
  foreignKeyConfigs = [];
  references(ref2, actions = {}) {
    this.foreignKeyConfigs.push({ ref: ref2, actions });
    return this;
  }
  unique(name) {
    this.config.isUnique = true;
    this.config.uniqueName = name;
    return this;
  }
  generatedAlwaysAs(as, config2) {
    this.config.generated = {
      as,
      type: "always",
      mode: config2?.mode ?? "virtual"
    };
    return this;
  }
  /** @internal */
  buildForeignKeys(column, table3) {
    return this.foreignKeyConfigs.map(({ ref: ref2, actions }) => {
      return ((ref22, actions2) => {
        const builder = new ForeignKeyBuilder2(() => {
          const foreignColumn = ref22();
          return { columns: [column], foreignColumns: [foreignColumn] };
        });
        if (actions2.onUpdate) {
          builder.onUpdate(actions2.onUpdate);
        }
        if (actions2.onDelete) {
          builder.onDelete(actions2.onDelete);
        }
        return builder.build(table3);
      })(ref2, actions);
    });
  }
};
var SQLiteColumn = class extends Column {
  static {
    __name(this, "SQLiteColumn");
  }
  constructor(table3, config2) {
    if (!config2.uniqueName) {
      config2.uniqueName = uniqueKeyName2(table3, [config2.name]);
    }
    super(table3, config2);
    this.table = table3;
  }
  static [entityKind] = "SQLiteColumn";
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/columns/blob.js
var SQLiteBigIntBuilder = class extends SQLiteColumnBuilder {
  static {
    __name(this, "SQLiteBigIntBuilder");
  }
  static [entityKind] = "SQLiteBigIntBuilder";
  constructor(name) {
    super(name, "bigint", "SQLiteBigInt");
  }
  /** @internal */
  build(table3) {
    return new SQLiteBigInt(table3, this.config);
  }
};
var SQLiteBigInt = class extends SQLiteColumn {
  static {
    __name(this, "SQLiteBigInt");
  }
  static [entityKind] = "SQLiteBigInt";
  getSQLType() {
    return "blob";
  }
  mapFromDriverValue(value) {
    return BigInt(Buffer.isBuffer(value) ? value.toString() : String.fromCodePoint(...value));
  }
  mapToDriverValue(value) {
    return Buffer.from(value.toString());
  }
};
var SQLiteBlobJsonBuilder = class extends SQLiteColumnBuilder {
  static {
    __name(this, "SQLiteBlobJsonBuilder");
  }
  static [entityKind] = "SQLiteBlobJsonBuilder";
  constructor(name) {
    super(name, "json", "SQLiteBlobJson");
  }
  /** @internal */
  build(table3) {
    return new SQLiteBlobJson(
      table3,
      this.config
    );
  }
};
var SQLiteBlobJson = class extends SQLiteColumn {
  static {
    __name(this, "SQLiteBlobJson");
  }
  static [entityKind] = "SQLiteBlobJson";
  getSQLType() {
    return "blob";
  }
  mapFromDriverValue(value) {
    return JSON.parse(Buffer.isBuffer(value) ? value.toString() : String.fromCodePoint(...value));
  }
  mapToDriverValue(value) {
    return Buffer.from(JSON.stringify(value));
  }
};
var SQLiteBlobBufferBuilder = class extends SQLiteColumnBuilder {
  static {
    __name(this, "SQLiteBlobBufferBuilder");
  }
  static [entityKind] = "SQLiteBlobBufferBuilder";
  constructor(name) {
    super(name, "buffer", "SQLiteBlobBuffer");
  }
  /** @internal */
  build(table3) {
    return new SQLiteBlobBuffer(table3, this.config);
  }
};
var SQLiteBlobBuffer = class extends SQLiteColumn {
  static {
    __name(this, "SQLiteBlobBuffer");
  }
  static [entityKind] = "SQLiteBlobBuffer";
  getSQLType() {
    return "blob";
  }
};
function blob(a, b) {
  const { name, config: config2 } = getColumnNameAndConfig(a, b);
  if (config2?.mode === "json") {
    return new SQLiteBlobJsonBuilder(name);
  }
  if (config2?.mode === "bigint") {
    return new SQLiteBigIntBuilder(name);
  }
  return new SQLiteBlobBufferBuilder(name);
}
__name(blob, "blob");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/columns/custom.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SQLiteCustomColumnBuilder = class extends SQLiteColumnBuilder {
  static {
    __name(this, "SQLiteCustomColumnBuilder");
  }
  static [entityKind] = "SQLiteCustomColumnBuilder";
  constructor(name, fieldConfig, customTypeParams) {
    super(name, "custom", "SQLiteCustomColumn");
    this.config.fieldConfig = fieldConfig;
    this.config.customTypeParams = customTypeParams;
  }
  /** @internal */
  build(table3) {
    return new SQLiteCustomColumn(
      table3,
      this.config
    );
  }
};
var SQLiteCustomColumn = class extends SQLiteColumn {
  static {
    __name(this, "SQLiteCustomColumn");
  }
  static [entityKind] = "SQLiteCustomColumn";
  sqlName;
  mapTo;
  mapFrom;
  constructor(table3, config2) {
    super(table3, config2);
    this.sqlName = config2.customTypeParams.dataType(config2.fieldConfig);
    this.mapTo = config2.customTypeParams.toDriver;
    this.mapFrom = config2.customTypeParams.fromDriver;
  }
  getSQLType() {
    return this.sqlName;
  }
  mapFromDriverValue(value) {
    return typeof this.mapFrom === "function" ? this.mapFrom(value) : value;
  }
  mapToDriverValue(value) {
    return typeof this.mapTo === "function" ? this.mapTo(value) : value;
  }
};
function customType(customTypeParams) {
  return (a, b) => {
    const { name, config: config2 } = getColumnNameAndConfig(a, b);
    return new SQLiteCustomColumnBuilder(
      name,
      config2,
      customTypeParams
    );
  };
}
__name(customType, "customType");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/columns/integer.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SQLiteBaseIntegerBuilder = class extends SQLiteColumnBuilder {
  static {
    __name(this, "SQLiteBaseIntegerBuilder");
  }
  static [entityKind] = "SQLiteBaseIntegerBuilder";
  constructor(name, dataType, columnType) {
    super(name, dataType, columnType);
    this.config.autoIncrement = false;
  }
  primaryKey(config2) {
    if (config2?.autoIncrement) {
      this.config.autoIncrement = true;
    }
    this.config.hasDefault = true;
    return super.primaryKey();
  }
};
var SQLiteBaseInteger = class extends SQLiteColumn {
  static {
    __name(this, "SQLiteBaseInteger");
  }
  static [entityKind] = "SQLiteBaseInteger";
  autoIncrement = this.config.autoIncrement;
  getSQLType() {
    return "integer";
  }
};
var SQLiteIntegerBuilder = class extends SQLiteBaseIntegerBuilder {
  static {
    __name(this, "SQLiteIntegerBuilder");
  }
  static [entityKind] = "SQLiteIntegerBuilder";
  constructor(name) {
    super(name, "number", "SQLiteInteger");
  }
  build(table3) {
    return new SQLiteInteger(
      table3,
      this.config
    );
  }
};
var SQLiteInteger = class extends SQLiteBaseInteger {
  static {
    __name(this, "SQLiteInteger");
  }
  static [entityKind] = "SQLiteInteger";
};
var SQLiteTimestampBuilder = class extends SQLiteBaseIntegerBuilder {
  static {
    __name(this, "SQLiteTimestampBuilder");
  }
  static [entityKind] = "SQLiteTimestampBuilder";
  constructor(name, mode) {
    super(name, "date", "SQLiteTimestamp");
    this.config.mode = mode;
  }
  /**
   * @deprecated Use `default()` with your own expression instead.
   *
   * Adds `DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))` to the column, which is the current epoch timestamp in milliseconds.
   */
  defaultNow() {
    return this.default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`);
  }
  build(table3) {
    return new SQLiteTimestamp(
      table3,
      this.config
    );
  }
};
var SQLiteTimestamp = class extends SQLiteBaseInteger {
  static {
    __name(this, "SQLiteTimestamp");
  }
  static [entityKind] = "SQLiteTimestamp";
  mode = this.config.mode;
  mapFromDriverValue(value) {
    if (this.config.mode === "timestamp") {
      return new Date(value * 1e3);
    }
    return new Date(value);
  }
  mapToDriverValue(value) {
    const unix = value.getTime();
    if (this.config.mode === "timestamp") {
      return Math.floor(unix / 1e3);
    }
    return unix;
  }
};
var SQLiteBooleanBuilder = class extends SQLiteBaseIntegerBuilder {
  static {
    __name(this, "SQLiteBooleanBuilder");
  }
  static [entityKind] = "SQLiteBooleanBuilder";
  constructor(name, mode) {
    super(name, "boolean", "SQLiteBoolean");
    this.config.mode = mode;
  }
  build(table3) {
    return new SQLiteBoolean(
      table3,
      this.config
    );
  }
};
var SQLiteBoolean = class extends SQLiteBaseInteger {
  static {
    __name(this, "SQLiteBoolean");
  }
  static [entityKind] = "SQLiteBoolean";
  mode = this.config.mode;
  mapFromDriverValue(value) {
    return Number(value) === 1;
  }
  mapToDriverValue(value) {
    return value ? 1 : 0;
  }
};
function integer(a, b) {
  const { name, config: config2 } = getColumnNameAndConfig(a, b);
  if (config2?.mode === "timestamp" || config2?.mode === "timestamp_ms") {
    return new SQLiteTimestampBuilder(name, config2.mode);
  }
  if (config2?.mode === "boolean") {
    return new SQLiteBooleanBuilder(name, config2.mode);
  }
  return new SQLiteIntegerBuilder(name);
}
__name(integer, "integer");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/columns/numeric.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SQLiteNumericBuilder = class extends SQLiteColumnBuilder {
  static {
    __name(this, "SQLiteNumericBuilder");
  }
  static [entityKind] = "SQLiteNumericBuilder";
  constructor(name) {
    super(name, "string", "SQLiteNumeric");
  }
  /** @internal */
  build(table3) {
    return new SQLiteNumeric(
      table3,
      this.config
    );
  }
};
var SQLiteNumeric = class extends SQLiteColumn {
  static {
    __name(this, "SQLiteNumeric");
  }
  static [entityKind] = "SQLiteNumeric";
  getSQLType() {
    return "numeric";
  }
};
function numeric(name) {
  return new SQLiteNumericBuilder(name ?? "");
}
__name(numeric, "numeric");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/columns/real.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SQLiteRealBuilder = class extends SQLiteColumnBuilder {
  static {
    __name(this, "SQLiteRealBuilder");
  }
  static [entityKind] = "SQLiteRealBuilder";
  constructor(name) {
    super(name, "number", "SQLiteReal");
  }
  /** @internal */
  build(table3) {
    return new SQLiteReal(table3, this.config);
  }
};
var SQLiteReal = class extends SQLiteColumn {
  static {
    __name(this, "SQLiteReal");
  }
  static [entityKind] = "SQLiteReal";
  getSQLType() {
    return "real";
  }
};
function real(name) {
  return new SQLiteRealBuilder(name ?? "");
}
__name(real, "real");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/columns/text.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SQLiteTextBuilder = class extends SQLiteColumnBuilder {
  static {
    __name(this, "SQLiteTextBuilder");
  }
  static [entityKind] = "SQLiteTextBuilder";
  constructor(name, config2) {
    super(name, "string", "SQLiteText");
    this.config.enumValues = config2.enum;
    this.config.length = config2.length;
  }
  /** @internal */
  build(table3) {
    return new SQLiteText(table3, this.config);
  }
};
var SQLiteText = class extends SQLiteColumn {
  static {
    __name(this, "SQLiteText");
  }
  static [entityKind] = "SQLiteText";
  enumValues = this.config.enumValues;
  length = this.config.length;
  constructor(table3, config2) {
    super(table3, config2);
  }
  getSQLType() {
    return `text${this.config.length ? `(${this.config.length})` : ""}`;
  }
};
var SQLiteTextJsonBuilder = class extends SQLiteColumnBuilder {
  static {
    __name(this, "SQLiteTextJsonBuilder");
  }
  static [entityKind] = "SQLiteTextJsonBuilder";
  constructor(name) {
    super(name, "json", "SQLiteTextJson");
  }
  /** @internal */
  build(table3) {
    return new SQLiteTextJson(
      table3,
      this.config
    );
  }
};
var SQLiteTextJson = class extends SQLiteColumn {
  static {
    __name(this, "SQLiteTextJson");
  }
  static [entityKind] = "SQLiteTextJson";
  getSQLType() {
    return "text";
  }
  mapFromDriverValue(value) {
    return JSON.parse(value);
  }
  mapToDriverValue(value) {
    return JSON.stringify(value);
  }
};
function text(a, b = {}) {
  const { name, config: config2 } = getColumnNameAndConfig(a, b);
  if (config2.mode === "json") {
    return new SQLiteTextJsonBuilder(name);
  }
  return new SQLiteTextBuilder(name, config2);
}
__name(text, "text");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/columns/all.js
function getSQLiteColumnBuilders() {
  return {
    blob,
    customType,
    integer,
    numeric,
    real,
    text
  };
}
__name(getSQLiteColumnBuilders, "getSQLiteColumnBuilders");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/table.js
var InlineForeignKeys2 = Symbol.for("drizzle:SQLiteInlineForeignKeys");
var SQLiteTable = class extends Table {
  static {
    __name(this, "SQLiteTable");
  }
  static [entityKind] = "SQLiteTable";
  /** @internal */
  static Symbol = Object.assign({}, Table.Symbol, {
    InlineForeignKeys: InlineForeignKeys2
  });
  /** @internal */
  [Table.Symbol.Columns];
  /** @internal */
  [InlineForeignKeys2] = [];
  /** @internal */
  [Table.Symbol.ExtraConfigBuilder] = void 0;
};
function sqliteTableBase(name, columns, extraConfig, schema, baseName = name) {
  const rawTable = new SQLiteTable(name, schema, baseName);
  const parsedColumns = typeof columns === "function" ? columns(getSQLiteColumnBuilders()) : columns;
  const builtColumns = Object.fromEntries(
    Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
      const colBuilder = colBuilderBase;
      colBuilder.setName(name2);
      const column = colBuilder.build(rawTable);
      rawTable[InlineForeignKeys2].push(...colBuilder.buildForeignKeys(column, rawTable));
      return [name2, column];
    })
  );
  const table3 = Object.assign(rawTable, builtColumns);
  table3[Table.Symbol.Columns] = builtColumns;
  table3[Table.Symbol.ExtraConfigColumns] = builtColumns;
  if (extraConfig) {
    table3[SQLiteTable.Symbol.ExtraConfigBuilder] = extraConfig;
  }
  return table3;
}
__name(sqliteTableBase, "sqliteTableBase");
var sqliteTable = /* @__PURE__ */ __name((name, columns, extraConfig) => {
  return sqliteTableBase(name, columns, extraConfig);
}, "sqliteTable");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/query-builders/delete.js
var SQLiteDeleteBase = class extends QueryPromise {
  static {
    __name(this, "SQLiteDeleteBase");
  }
  constructor(table3, session, dialect, withList) {
    super();
    this.table = table3;
    this.session = session;
    this.dialect = dialect;
    this.config = { table: table3, withList };
  }
  static [entityKind] = "SQLiteDelete";
  /** @internal */
  config;
  /**
   * Adds a `where` clause to the query.
   *
   * Calling this method will delete only those rows that fulfill a specified condition.
   *
   * See docs: {@link https://orm.drizzle.team/docs/delete}
   *
   * @param where the `where` clause.
   *
   * @example
   * You can use conditional operators and `sql function` to filter the rows to be deleted.
   *
   * ```ts
   * // Delete all cars with green color
   * db.delete(cars).where(eq(cars.color, 'green'));
   * // or
   * db.delete(cars).where(sql`${cars.color} = 'green'`)
   * ```
   *
   * You can logically combine conditional operators with `and()` and `or()` operators:
   *
   * ```ts
   * // Delete all BMW cars with a green color
   * db.delete(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
   *
   * // Delete all cars with the green or blue color
   * db.delete(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
   * ```
   */
  where(where) {
    this.config.where = where;
    return this;
  }
  orderBy(...columns) {
    if (typeof columns[0] === "function") {
      const orderBy = columns[0](
        new Proxy(
          this.config.table[Table.Symbol.Columns],
          new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
        )
      );
      const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
      this.config.orderBy = orderByArray;
    } else {
      const orderByArray = columns;
      this.config.orderBy = orderByArray;
    }
    return this;
  }
  limit(limit) {
    this.config.limit = limit;
    return this;
  }
  returning(fields = this.table[SQLiteTable.Symbol.Columns]) {
    this.config.returning = orderSelectedFields(fields);
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildDeleteQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  /** @internal */
  _prepare(isOneTimeQuery = true) {
    return this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](
      this.dialect.sqlToQuery(this.getSQL()),
      this.config.returning,
      this.config.returning ? "all" : "run",
      true
    );
  }
  prepare() {
    return this._prepare(false);
  }
  run = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().run(placeholderValues);
  }, "run");
  all = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().all(placeholderValues);
  }, "all");
  get = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().get(placeholderValues);
  }, "get");
  values = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().values(placeholderValues);
  }, "values");
  async execute(placeholderValues) {
    return this._prepare().execute(placeholderValues);
  }
  $dynamic() {
    return this;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/query-builders/insert.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/query-builders/query-builder.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/dialect.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/casing.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function toSnakeCase(input) {
  const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words.map((word) => word.toLowerCase()).join("_");
}
__name(toSnakeCase, "toSnakeCase");
function toCamelCase(input) {
  const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words.reduce((acc, word, i) => {
    const formattedWord = i === 0 ? word.toLowerCase() : `${word[0].toUpperCase()}${word.slice(1)}`;
    return acc + formattedWord;
  }, "");
}
__name(toCamelCase, "toCamelCase");
function noopCase(input) {
  return input;
}
__name(noopCase, "noopCase");
var CasingCache = class {
  static {
    __name(this, "CasingCache");
  }
  static [entityKind] = "CasingCache";
  /** @internal */
  cache = {};
  cachedTables = {};
  convert;
  constructor(casing) {
    this.convert = casing === "snake_case" ? toSnakeCase : casing === "camelCase" ? toCamelCase : noopCase;
  }
  getColumnCasing(column) {
    if (!column.keyAsName)
      return column.name;
    const schema = column.table[Table.Symbol.Schema] ?? "public";
    const tableName = column.table[Table.Symbol.OriginalName];
    const key = `${schema}.${tableName}.${column.name}`;
    if (!this.cache[key]) {
      this.cacheTable(column.table);
    }
    return this.cache[key];
  }
  cacheTable(table3) {
    const schema = table3[Table.Symbol.Schema] ?? "public";
    const tableName = table3[Table.Symbol.OriginalName];
    const tableKey = `${schema}.${tableName}`;
    if (!this.cachedTables[tableKey]) {
      for (const column of Object.values(table3[Table.Symbol.Columns])) {
        const columnKey = `${tableKey}.${column.name}`;
        this.cache[columnKey] = this.convert(column.name);
      }
      this.cachedTables[tableKey] = true;
    }
  }
  clearCache() {
    this.cache = {};
    this.cachedTables = {};
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/errors.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var DrizzleError = class extends Error {
  static {
    __name(this, "DrizzleError");
  }
  static [entityKind] = "DrizzleError";
  constructor({ message: message2, cause }) {
    super(message2);
    this.name = "DrizzleError";
    this.cause = cause;
  }
};
var TransactionRollbackError = class extends DrizzleError {
  static {
    __name(this, "TransactionRollbackError");
  }
  static [entityKind] = "TransactionRollbackError";
  constructor() {
    super({ message: "Rollback" });
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/view-base.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SQLiteViewBase = class extends View {
  static {
    __name(this, "SQLiteViewBase");
  }
  static [entityKind] = "SQLiteViewBase";
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/dialect.js
var SQLiteDialect = class {
  static {
    __name(this, "SQLiteDialect");
  }
  static [entityKind] = "SQLiteDialect";
  /** @internal */
  casing;
  constructor(config2) {
    this.casing = new CasingCache(config2?.casing);
  }
  escapeName(name) {
    return `"${name}"`;
  }
  escapeParam(_num) {
    return "?";
  }
  escapeString(str) {
    return `'${str.replace(/'/g, "''")}'`;
  }
  buildWithCTE(queries) {
    if (!queries?.length)
      return void 0;
    const withSqlChunks = [sql`with `];
    for (const [i, w] of queries.entries()) {
      withSqlChunks.push(sql`${sql.identifier(w._.alias)} as (${w._.sql})`);
      if (i < queries.length - 1) {
        withSqlChunks.push(sql`, `);
      }
    }
    withSqlChunks.push(sql` `);
    return sql.join(withSqlChunks);
  }
  buildDeleteQuery({ table: table3, where, returning, withList, limit, orderBy }) {
    const withSql = this.buildWithCTE(withList);
    const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
    const whereSql = where ? sql` where ${where}` : void 0;
    const orderBySql = this.buildOrderBy(orderBy);
    const limitSql = this.buildLimit(limit);
    return sql`${withSql}delete from ${table3}${whereSql}${returningSql}${orderBySql}${limitSql}`;
  }
  buildUpdateSet(table3, set) {
    const tableColumns = table3[Table.Symbol.Columns];
    const columnNames = Object.keys(tableColumns).filter(
      (colName) => set[colName] !== void 0 || tableColumns[colName]?.onUpdateFn !== void 0
    );
    const setSize = columnNames.length;
    return sql.join(columnNames.flatMap((colName, i) => {
      const col = tableColumns[colName];
      const value = set[colName] ?? sql.param(col.onUpdateFn(), col);
      const res = sql`${sql.identifier(this.casing.getColumnCasing(col))} = ${value}`;
      if (i < setSize - 1) {
        return [res, sql.raw(", ")];
      }
      return [res];
    }));
  }
  buildUpdateQuery({ table: table3, set, where, returning, withList, joins, from, limit, orderBy }) {
    const withSql = this.buildWithCTE(withList);
    const setSql = this.buildUpdateSet(table3, set);
    const fromSql = from && sql.join([sql.raw(" from "), this.buildFromTable(from)]);
    const joinsSql = this.buildJoins(joins);
    const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
    const whereSql = where ? sql` where ${where}` : void 0;
    const orderBySql = this.buildOrderBy(orderBy);
    const limitSql = this.buildLimit(limit);
    return sql`${withSql}update ${table3} set ${setSql}${fromSql}${joinsSql}${whereSql}${returningSql}${orderBySql}${limitSql}`;
  }
  /**
   * Builds selection SQL with provided fields/expressions
   *
   * Examples:
   *
   * `select <selection> from`
   *
   * `insert ... returning <selection>`
   *
   * If `isSingleTable` is true, then columns won't be prefixed with table name
   */
  buildSelection(fields, { isSingleTable = false } = {}) {
    const columnsLen = fields.length;
    const chunks = fields.flatMap(({ field }, i) => {
      const chunk = [];
      if (is(field, SQL.Aliased) && field.isSelectionField) {
        chunk.push(sql.identifier(field.fieldAlias));
      } else if (is(field, SQL.Aliased) || is(field, SQL)) {
        const query = is(field, SQL.Aliased) ? field.sql : field;
        if (isSingleTable) {
          chunk.push(
            new SQL(
              query.queryChunks.map((c) => {
                if (is(c, Column)) {
                  return sql.identifier(this.casing.getColumnCasing(c));
                }
                return c;
              })
            )
          );
        } else {
          chunk.push(query);
        }
        if (is(field, SQL.Aliased)) {
          chunk.push(sql` as ${sql.identifier(field.fieldAlias)}`);
        }
      } else if (is(field, Column)) {
        const tableName = field.table[Table.Symbol.Name];
        if (isSingleTable) {
          chunk.push(sql.identifier(this.casing.getColumnCasing(field)));
        } else {
          chunk.push(sql`${sql.identifier(tableName)}.${sql.identifier(this.casing.getColumnCasing(field))}`);
        }
      }
      if (i < columnsLen - 1) {
        chunk.push(sql`, `);
      }
      return chunk;
    });
    return sql.join(chunks);
  }
  buildJoins(joins) {
    if (!joins || joins.length === 0) {
      return void 0;
    }
    const joinsArray = [];
    if (joins) {
      for (const [index2, joinMeta] of joins.entries()) {
        if (index2 === 0) {
          joinsArray.push(sql` `);
        }
        const table3 = joinMeta.table;
        if (is(table3, SQLiteTable)) {
          const tableName = table3[SQLiteTable.Symbol.Name];
          const tableSchema = table3[SQLiteTable.Symbol.Schema];
          const origTableName = table3[SQLiteTable.Symbol.OriginalName];
          const alias = tableName === origTableName ? void 0 : joinMeta.alias;
          joinsArray.push(
            sql`${sql.raw(joinMeta.joinType)} join ${tableSchema ? sql`${sql.identifier(tableSchema)}.` : void 0}${sql.identifier(origTableName)}${alias && sql` ${sql.identifier(alias)}`} on ${joinMeta.on}`
          );
        } else {
          joinsArray.push(
            sql`${sql.raw(joinMeta.joinType)} join ${table3} on ${joinMeta.on}`
          );
        }
        if (index2 < joins.length - 1) {
          joinsArray.push(sql` `);
        }
      }
    }
    return sql.join(joinsArray);
  }
  buildLimit(limit) {
    return typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : void 0;
  }
  buildOrderBy(orderBy) {
    const orderByList = [];
    if (orderBy) {
      for (const [index2, orderByValue] of orderBy.entries()) {
        orderByList.push(orderByValue);
        if (index2 < orderBy.length - 1) {
          orderByList.push(sql`, `);
        }
      }
    }
    return orderByList.length > 0 ? sql` order by ${sql.join(orderByList)}` : void 0;
  }
  buildFromTable(table3) {
    if (is(table3, Table) && table3[Table.Symbol.OriginalName] !== table3[Table.Symbol.Name]) {
      return sql`${sql.identifier(table3[Table.Symbol.OriginalName])} ${sql.identifier(table3[Table.Symbol.Name])}`;
    }
    return table3;
  }
  buildSelectQuery({
    withList,
    fields,
    fieldsFlat,
    where,
    having,
    table: table3,
    joins,
    orderBy,
    groupBy,
    limit,
    offset,
    distinct,
    setOperators
  }) {
    const fieldsList = fieldsFlat ?? orderSelectedFields(fields);
    for (const f of fieldsList) {
      if (is(f.field, Column) && getTableName(f.field.table) !== (is(table3, Subquery) ? table3._.alias : is(table3, SQLiteViewBase) ? table3[ViewBaseConfig].name : is(table3, SQL) ? void 0 : getTableName(table3)) && !((table22) => joins?.some(
        ({ alias }) => alias === (table22[Table.Symbol.IsAlias] ? getTableName(table22) : table22[Table.Symbol.BaseName])
      ))(f.field.table)) {
        const tableName = getTableName(f.field.table);
        throw new Error(
          `Your "${f.path.join("->")}" field references a column "${tableName}"."${f.field.name}", but the table "${tableName}" is not part of the query! Did you forget to join it?`
        );
      }
    }
    const isSingleTable = !joins || joins.length === 0;
    const withSql = this.buildWithCTE(withList);
    const distinctSql = distinct ? sql` distinct` : void 0;
    const selection = this.buildSelection(fieldsList, { isSingleTable });
    const tableSql = this.buildFromTable(table3);
    const joinsSql = this.buildJoins(joins);
    const whereSql = where ? sql` where ${where}` : void 0;
    const havingSql = having ? sql` having ${having}` : void 0;
    const groupByList = [];
    if (groupBy) {
      for (const [index2, groupByValue] of groupBy.entries()) {
        groupByList.push(groupByValue);
        if (index2 < groupBy.length - 1) {
          groupByList.push(sql`, `);
        }
      }
    }
    const groupBySql = groupByList.length > 0 ? sql` group by ${sql.join(groupByList)}` : void 0;
    const orderBySql = this.buildOrderBy(orderBy);
    const limitSql = this.buildLimit(limit);
    const offsetSql = offset ? sql` offset ${offset}` : void 0;
    const finalQuery = sql`${withSql}select${distinctSql} ${selection} from ${tableSql}${joinsSql}${whereSql}${groupBySql}${havingSql}${orderBySql}${limitSql}${offsetSql}`;
    if (setOperators.length > 0) {
      return this.buildSetOperations(finalQuery, setOperators);
    }
    return finalQuery;
  }
  buildSetOperations(leftSelect, setOperators) {
    const [setOperator, ...rest] = setOperators;
    if (!setOperator) {
      throw new Error("Cannot pass undefined values to any set operator");
    }
    if (rest.length === 0) {
      return this.buildSetOperationQuery({ leftSelect, setOperator });
    }
    return this.buildSetOperations(
      this.buildSetOperationQuery({ leftSelect, setOperator }),
      rest
    );
  }
  buildSetOperationQuery({
    leftSelect,
    setOperator: { type, isAll, rightSelect, limit, orderBy, offset }
  }) {
    const leftChunk = sql`${leftSelect.getSQL()} `;
    const rightChunk = sql`${rightSelect.getSQL()}`;
    let orderBySql;
    if (orderBy && orderBy.length > 0) {
      const orderByValues = [];
      for (const singleOrderBy of orderBy) {
        if (is(singleOrderBy, SQLiteColumn)) {
          orderByValues.push(sql.identifier(singleOrderBy.name));
        } else if (is(singleOrderBy, SQL)) {
          for (let i = 0; i < singleOrderBy.queryChunks.length; i++) {
            const chunk = singleOrderBy.queryChunks[i];
            if (is(chunk, SQLiteColumn)) {
              singleOrderBy.queryChunks[i] = sql.identifier(this.casing.getColumnCasing(chunk));
            }
          }
          orderByValues.push(sql`${singleOrderBy}`);
        } else {
          orderByValues.push(sql`${singleOrderBy}`);
        }
      }
      orderBySql = sql` order by ${sql.join(orderByValues, sql`, `)}`;
    }
    const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : void 0;
    const operatorChunk = sql.raw(`${type} ${isAll ? "all " : ""}`);
    const offsetSql = offset ? sql` offset ${offset}` : void 0;
    return sql`${leftChunk}${operatorChunk}${rightChunk}${orderBySql}${limitSql}${offsetSql}`;
  }
  buildInsertQuery({ table: table3, values: valuesOrSelect, onConflict, returning, withList, select }) {
    const valuesSqlList = [];
    const columns = table3[Table.Symbol.Columns];
    const colEntries = Object.entries(columns).filter(
      ([_, col]) => !col.shouldDisableInsert()
    );
    const insertOrder = colEntries.map(([, column]) => sql.identifier(this.casing.getColumnCasing(column)));
    if (select) {
      const select2 = valuesOrSelect;
      if (is(select2, SQL)) {
        valuesSqlList.push(select2);
      } else {
        valuesSqlList.push(select2.getSQL());
      }
    } else {
      const values = valuesOrSelect;
      valuesSqlList.push(sql.raw("values "));
      for (const [valueIndex, value] of values.entries()) {
        const valueList = [];
        for (const [fieldName, col] of colEntries) {
          const colValue = value[fieldName];
          if (colValue === void 0 || is(colValue, Param) && colValue.value === void 0) {
            let defaultValue;
            if (col.default !== null && col.default !== void 0) {
              defaultValue = is(col.default, SQL) ? col.default : sql.param(col.default, col);
            } else if (col.defaultFn !== void 0) {
              const defaultFnResult = col.defaultFn();
              defaultValue = is(defaultFnResult, SQL) ? defaultFnResult : sql.param(defaultFnResult, col);
            } else if (!col.default && col.onUpdateFn !== void 0) {
              const onUpdateFnResult = col.onUpdateFn();
              defaultValue = is(onUpdateFnResult, SQL) ? onUpdateFnResult : sql.param(onUpdateFnResult, col);
            } else {
              defaultValue = sql`null`;
            }
            valueList.push(defaultValue);
          } else {
            valueList.push(colValue);
          }
        }
        valuesSqlList.push(valueList);
        if (valueIndex < values.length - 1) {
          valuesSqlList.push(sql`, `);
        }
      }
    }
    const withSql = this.buildWithCTE(withList);
    const valuesSql = sql.join(valuesSqlList);
    const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
    const onConflictSql = onConflict ? sql` on conflict ${onConflict}` : void 0;
    return sql`${withSql}insert into ${table3} ${insertOrder} ${valuesSql}${onConflictSql}${returningSql}`;
  }
  sqlToQuery(sql22, invokeSource) {
    return sql22.toQuery({
      casing: this.casing,
      escapeName: this.escapeName,
      escapeParam: this.escapeParam,
      escapeString: this.escapeString,
      invokeSource
    });
  }
  buildRelationalQuery({
    fullSchema,
    schema,
    tableNamesMap,
    table: table3,
    tableConfig,
    queryConfig: config2,
    tableAlias,
    nestedQueryRelation,
    joinOn
  }) {
    let selection = [];
    let limit, offset, orderBy = [], where;
    const joins = [];
    if (config2 === true) {
      const selectionEntries = Object.entries(tableConfig.columns);
      selection = selectionEntries.map(([key, value]) => ({
        dbKey: value.name,
        tsKey: key,
        field: aliasedTableColumn(value, tableAlias),
        relationTableTsKey: void 0,
        isJson: false,
        selection: []
      }));
    } else {
      const aliasedColumns = Object.fromEntries(
        Object.entries(tableConfig.columns).map(([key, value]) => [key, aliasedTableColumn(value, tableAlias)])
      );
      if (config2.where) {
        const whereSql = typeof config2.where === "function" ? config2.where(aliasedColumns, getOperators()) : config2.where;
        where = whereSql && mapColumnsInSQLToAlias(whereSql, tableAlias);
      }
      const fieldsSelection = [];
      let selectedColumns = [];
      if (config2.columns) {
        let isIncludeMode = false;
        for (const [field, value] of Object.entries(config2.columns)) {
          if (value === void 0) {
            continue;
          }
          if (field in tableConfig.columns) {
            if (!isIncludeMode && value === true) {
              isIncludeMode = true;
            }
            selectedColumns.push(field);
          }
        }
        if (selectedColumns.length > 0) {
          selectedColumns = isIncludeMode ? selectedColumns.filter((c) => config2.columns?.[c] === true) : Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
        }
      } else {
        selectedColumns = Object.keys(tableConfig.columns);
      }
      for (const field of selectedColumns) {
        const column = tableConfig.columns[field];
        fieldsSelection.push({ tsKey: field, value: column });
      }
      let selectedRelations = [];
      if (config2.with) {
        selectedRelations = Object.entries(config2.with).filter((entry) => !!entry[1]).map(([tsKey, queryConfig]) => ({ tsKey, queryConfig, relation: tableConfig.relations[tsKey] }));
      }
      let extras;
      if (config2.extras) {
        extras = typeof config2.extras === "function" ? config2.extras(aliasedColumns, { sql }) : config2.extras;
        for (const [tsKey, value] of Object.entries(extras)) {
          fieldsSelection.push({
            tsKey,
            value: mapColumnsInAliasedSQLToAlias(value, tableAlias)
          });
        }
      }
      for (const { tsKey, value } of fieldsSelection) {
        selection.push({
          dbKey: is(value, SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey].name,
          tsKey,
          field: is(value, Column) ? aliasedTableColumn(value, tableAlias) : value,
          relationTableTsKey: void 0,
          isJson: false,
          selection: []
        });
      }
      let orderByOrig = typeof config2.orderBy === "function" ? config2.orderBy(aliasedColumns, getOrderByOperators()) : config2.orderBy ?? [];
      if (!Array.isArray(orderByOrig)) {
        orderByOrig = [orderByOrig];
      }
      orderBy = orderByOrig.map((orderByValue) => {
        if (is(orderByValue, Column)) {
          return aliasedTableColumn(orderByValue, tableAlias);
        }
        return mapColumnsInSQLToAlias(orderByValue, tableAlias);
      });
      limit = config2.limit;
      offset = config2.offset;
      for (const {
        tsKey: selectedRelationTsKey,
        queryConfig: selectedRelationConfigValue,
        relation
      } of selectedRelations) {
        const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
        const relationTableName = getTableUniqueName(relation.referencedTable);
        const relationTableTsName = tableNamesMap[relationTableName];
        const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
        const joinOn2 = and(
          ...normalizedRelation.fields.map(
            (field2, i) => eq(
              aliasedTableColumn(normalizedRelation.references[i], relationTableAlias),
              aliasedTableColumn(field2, tableAlias)
            )
          )
        );
        const builtRelation = this.buildRelationalQuery({
          fullSchema,
          schema,
          tableNamesMap,
          table: fullSchema[relationTableTsName],
          tableConfig: schema[relationTableTsName],
          queryConfig: is(relation, One) ? selectedRelationConfigValue === true ? { limit: 1 } : { ...selectedRelationConfigValue, limit: 1 } : selectedRelationConfigValue,
          tableAlias: relationTableAlias,
          joinOn: joinOn2,
          nestedQueryRelation: relation
        });
        const field = sql`(${builtRelation.sql})`.as(selectedRelationTsKey);
        selection.push({
          dbKey: selectedRelationTsKey,
          tsKey: selectedRelationTsKey,
          field,
          relationTableTsKey: relationTableTsName,
          isJson: true,
          selection: builtRelation.selection
        });
      }
    }
    if (selection.length === 0) {
      throw new DrizzleError({
        message: `No fields selected for table "${tableConfig.tsName}" ("${tableAlias}"). You need to have at least one item in "columns", "with" or "extras". If you need to select all columns, omit the "columns" key or set it to undefined.`
      });
    }
    let result;
    where = and(joinOn, where);
    if (nestedQueryRelation) {
      let field = sql`json_array(${sql.join(
        selection.map(
          ({ field: field2 }) => is(field2, SQLiteColumn) ? sql.identifier(this.casing.getColumnCasing(field2)) : is(field2, SQL.Aliased) ? field2.sql : field2
        ),
        sql`, `
      )})`;
      if (is(nestedQueryRelation, Many)) {
        field = sql`coalesce(json_group_array(${field}), json_array())`;
      }
      const nestedSelection = [{
        dbKey: "data",
        tsKey: "data",
        field: field.as("data"),
        isJson: true,
        relationTableTsKey: tableConfig.tsName,
        selection
      }];
      const needsSubquery = limit !== void 0 || offset !== void 0 || orderBy.length > 0;
      if (needsSubquery) {
        result = this.buildSelectQuery({
          table: aliasedTable(table3, tableAlias),
          fields: {},
          fieldsFlat: [
            {
              path: [],
              field: sql.raw("*")
            }
          ],
          where,
          limit,
          offset,
          orderBy,
          setOperators: []
        });
        where = void 0;
        limit = void 0;
        offset = void 0;
        orderBy = void 0;
      } else {
        result = aliasedTable(table3, tableAlias);
      }
      result = this.buildSelectQuery({
        table: is(result, SQLiteTable) ? result : new Subquery(result, {}, tableAlias),
        fields: {},
        fieldsFlat: nestedSelection.map(({ field: field2 }) => ({
          path: [],
          field: is(field2, Column) ? aliasedTableColumn(field2, tableAlias) : field2
        })),
        joins,
        where,
        limit,
        offset,
        orderBy,
        setOperators: []
      });
    } else {
      result = this.buildSelectQuery({
        table: aliasedTable(table3, tableAlias),
        fields: {},
        fieldsFlat: selection.map(({ field }) => ({
          path: [],
          field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field
        })),
        joins,
        where,
        limit,
        offset,
        orderBy,
        setOperators: []
      });
    }
    return {
      tableTsKey: tableConfig.tsName,
      sql: result,
      selection
    };
  }
};
var SQLiteSyncDialect = class extends SQLiteDialect {
  static {
    __name(this, "SQLiteSyncDialect");
  }
  static [entityKind] = "SQLiteSyncDialect";
  migrate(migrations, session, config2) {
    const migrationsTable = config2 === void 0 ? "__drizzle_migrations" : typeof config2 === "string" ? "__drizzle_migrations" : config2.migrationsTable ?? "__drizzle_migrations";
    const migrationTableCreate = sql`
			CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsTable)} (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at numeric
			)
		`;
    session.run(migrationTableCreate);
    const dbMigrations = session.values(
      sql`SELECT id, hash, created_at FROM ${sql.identifier(migrationsTable)} ORDER BY created_at DESC LIMIT 1`
    );
    const lastDbMigration = dbMigrations[0] ?? void 0;
    session.run(sql`BEGIN`);
    try {
      for (const migration of migrations) {
        if (!lastDbMigration || Number(lastDbMigration[2]) < migration.folderMillis) {
          for (const stmt of migration.sql) {
            session.run(sql.raw(stmt));
          }
          session.run(
            sql`INSERT INTO ${sql.identifier(migrationsTable)} ("hash", "created_at") VALUES(${migration.hash}, ${migration.folderMillis})`
          );
        }
      }
      session.run(sql`COMMIT`);
    } catch (e) {
      session.run(sql`ROLLBACK`);
      throw e;
    }
  }
};
var SQLiteAsyncDialect = class extends SQLiteDialect {
  static {
    __name(this, "SQLiteAsyncDialect");
  }
  static [entityKind] = "SQLiteAsyncDialect";
  async migrate(migrations, session, config2) {
    const migrationsTable = config2 === void 0 ? "__drizzle_migrations" : typeof config2 === "string" ? "__drizzle_migrations" : config2.migrationsTable ?? "__drizzle_migrations";
    const migrationTableCreate = sql`
			CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsTable)} (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at numeric
			)
		`;
    await session.run(migrationTableCreate);
    const dbMigrations = await session.values(
      sql`SELECT id, hash, created_at FROM ${sql.identifier(migrationsTable)} ORDER BY created_at DESC LIMIT 1`
    );
    const lastDbMigration = dbMigrations[0] ?? void 0;
    await session.transaction(async (tx) => {
      for (const migration of migrations) {
        if (!lastDbMigration || Number(lastDbMigration[2]) < migration.folderMillis) {
          for (const stmt of migration.sql) {
            await tx.run(sql.raw(stmt));
          }
          await tx.run(
            sql`INSERT INTO ${sql.identifier(migrationsTable)} ("hash", "created_at") VALUES(${migration.hash}, ${migration.folderMillis})`
          );
        }
      }
    });
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/query-builders/select.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/query-builders/query-builder.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var TypedQueryBuilder = class {
  static {
    __name(this, "TypedQueryBuilder");
  }
  static [entityKind] = "TypedQueryBuilder";
  /** @internal */
  getSelectedFields() {
    return this._.selectedFields;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/query-builders/select.js
var SQLiteSelectBuilder = class {
  static {
    __name(this, "SQLiteSelectBuilder");
  }
  static [entityKind] = "SQLiteSelectBuilder";
  fields;
  session;
  dialect;
  withList;
  distinct;
  constructor(config2) {
    this.fields = config2.fields;
    this.session = config2.session;
    this.dialect = config2.dialect;
    this.withList = config2.withList;
    this.distinct = config2.distinct;
  }
  from(source) {
    const isPartialSelect = !!this.fields;
    let fields;
    if (this.fields) {
      fields = this.fields;
    } else if (is(source, Subquery)) {
      fields = Object.fromEntries(
        Object.keys(source._.selectedFields).map((key) => [key, source[key]])
      );
    } else if (is(source, SQLiteViewBase)) {
      fields = source[ViewBaseConfig].selectedFields;
    } else if (is(source, SQL)) {
      fields = {};
    } else {
      fields = getTableColumns(source);
    }
    return new SQLiteSelectBase({
      table: source,
      fields,
      isPartialSelect,
      session: this.session,
      dialect: this.dialect,
      withList: this.withList,
      distinct: this.distinct
    });
  }
};
var SQLiteSelectQueryBuilderBase = class extends TypedQueryBuilder {
  static {
    __name(this, "SQLiteSelectQueryBuilderBase");
  }
  static [entityKind] = "SQLiteSelectQueryBuilder";
  _;
  /** @internal */
  config;
  joinsNotNullableMap;
  tableName;
  isPartialSelect;
  session;
  dialect;
  constructor({ table: table3, fields, isPartialSelect, session, dialect, withList, distinct }) {
    super();
    this.config = {
      withList,
      table: table3,
      fields: { ...fields },
      distinct,
      setOperators: []
    };
    this.isPartialSelect = isPartialSelect;
    this.session = session;
    this.dialect = dialect;
    this._ = {
      selectedFields: fields
    };
    this.tableName = getTableLikeName(table3);
    this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
  }
  createJoin(joinType) {
    return (table3, on2) => {
      const baseTableName = this.tableName;
      const tableName = getTableLikeName(table3);
      if (typeof tableName === "string" && this.config.joins?.some((join) => join.alias === tableName)) {
        throw new Error(`Alias "${tableName}" is already used in this query`);
      }
      if (!this.isPartialSelect) {
        if (Object.keys(this.joinsNotNullableMap).length === 1 && typeof baseTableName === "string") {
          this.config.fields = {
            [baseTableName]: this.config.fields
          };
        }
        if (typeof tableName === "string" && !is(table3, SQL)) {
          const selection = is(table3, Subquery) ? table3._.selectedFields : is(table3, View) ? table3[ViewBaseConfig].selectedFields : table3[Table.Symbol.Columns];
          this.config.fields[tableName] = selection;
        }
      }
      if (typeof on2 === "function") {
        on2 = on2(
          new Proxy(
            this.config.fields,
            new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
          )
        );
      }
      if (!this.config.joins) {
        this.config.joins = [];
      }
      this.config.joins.push({ on: on2, table: table3, joinType, alias: tableName });
      if (typeof tableName === "string") {
        switch (joinType) {
          case "left": {
            this.joinsNotNullableMap[tableName] = false;
            break;
          }
          case "right": {
            this.joinsNotNullableMap = Object.fromEntries(
              Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
            );
            this.joinsNotNullableMap[tableName] = true;
            break;
          }
          case "inner": {
            this.joinsNotNullableMap[tableName] = true;
            break;
          }
          case "full": {
            this.joinsNotNullableMap = Object.fromEntries(
              Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
            );
            this.joinsNotNullableMap[tableName] = false;
            break;
          }
        }
      }
      return this;
    };
  }
  /**
   * Executes a `left join` operation by adding another table to the current query.
   *
   * Calling this method associates each row of the table with the corresponding row from the joined table, if a match is found. If no matching row exists, it sets all columns of the joined table to null.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#left-join}
   *
   * @param table the table to join.
   * @param on the `on` clause.
   *
   * @example
   *
   * ```ts
   * // Select all users and their pets
   * const usersWithPets: { user: User; pets: Pet | null }[] = await db.select()
   *   .from(users)
   *   .leftJoin(pets, eq(users.id, pets.ownerId))
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number; petId: number | null }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .leftJoin(pets, eq(users.id, pets.ownerId))
   * ```
   */
  leftJoin = this.createJoin("left");
  /**
   * Executes a `right join` operation by adding another table to the current query.
   *
   * Calling this method associates each row of the joined table with the corresponding row from the main table, if a match is found. If no matching row exists, it sets all columns of the main table to null.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#right-join}
   *
   * @param table the table to join.
   * @param on the `on` clause.
   *
   * @example
   *
   * ```ts
   * // Select all users and their pets
   * const usersWithPets: { user: User | null; pets: Pet }[] = await db.select()
   *   .from(users)
   *   .rightJoin(pets, eq(users.id, pets.ownerId))
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number | null; petId: number }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .rightJoin(pets, eq(users.id, pets.ownerId))
   * ```
   */
  rightJoin = this.createJoin("right");
  /**
   * Executes an `inner join` operation, creating a new table by combining rows from two tables that have matching values.
   *
   * Calling this method retrieves rows that have corresponding entries in both joined tables. Rows without matching entries in either table are excluded, resulting in a table that includes only matching pairs.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#inner-join}
   *
   * @param table the table to join.
   * @param on the `on` clause.
   *
   * @example
   *
   * ```ts
   * // Select all users and their pets
   * const usersWithPets: { user: User; pets: Pet }[] = await db.select()
   *   .from(users)
   *   .innerJoin(pets, eq(users.id, pets.ownerId))
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number; petId: number }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .innerJoin(pets, eq(users.id, pets.ownerId))
   * ```
   */
  innerJoin = this.createJoin("inner");
  /**
   * Executes a `full join` operation by combining rows from two tables into a new table.
   *
   * Calling this method retrieves all rows from both main and joined tables, merging rows with matching values and filling in `null` for non-matching columns.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#full-join}
   *
   * @param table the table to join.
   * @param on the `on` clause.
   *
   * @example
   *
   * ```ts
   * // Select all users and their pets
   * const usersWithPets: { user: User | null; pets: Pet | null }[] = await db.select()
   *   .from(users)
   *   .fullJoin(pets, eq(users.id, pets.ownerId))
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number | null; petId: number | null }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .fullJoin(pets, eq(users.id, pets.ownerId))
   * ```
   */
  fullJoin = this.createJoin("full");
  createSetOperator(type, isAll) {
    return (rightSelection) => {
      const rightSelect = typeof rightSelection === "function" ? rightSelection(getSQLiteSetOperators()) : rightSelection;
      if (!haveSameKeys(this.getSelectedFields(), rightSelect.getSelectedFields())) {
        throw new Error(
          "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
        );
      }
      this.config.setOperators.push({ type, isAll, rightSelect });
      return this;
    };
  }
  /**
   * Adds `union` set operator to the query.
   *
   * Calling this method will combine the result sets of the `select` statements and remove any duplicate rows that appear across them.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#union}
   *
   * @example
   *
   * ```ts
   * // Select all unique names from customers and users tables
   * await db.select({ name: users.name })
   *   .from(users)
   *   .union(
   *     db.select({ name: customers.name }).from(customers)
   *   );
   * // or
   * import { union } from 'drizzle-orm/sqlite-core'
   *
   * await union(
   *   db.select({ name: users.name }).from(users),
   *   db.select({ name: customers.name }).from(customers)
   * );
   * ```
   */
  union = this.createSetOperator("union", false);
  /**
   * Adds `union all` set operator to the query.
   *
   * Calling this method will combine the result-set of the `select` statements and keep all duplicate rows that appear across them.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#union-all}
   *
   * @example
   *
   * ```ts
   * // Select all transaction ids from both online and in-store sales
   * await db.select({ transaction: onlineSales.transactionId })
   *   .from(onlineSales)
   *   .unionAll(
   *     db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
   *   );
   * // or
   * import { unionAll } from 'drizzle-orm/sqlite-core'
   *
   * await unionAll(
   *   db.select({ transaction: onlineSales.transactionId }).from(onlineSales),
   *   db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
   * );
   * ```
   */
  unionAll = this.createSetOperator("union", true);
  /**
   * Adds `intersect` set operator to the query.
   *
   * Calling this method will retain only the rows that are present in both result sets and eliminate duplicates.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#intersect}
   *
   * @example
   *
   * ```ts
   * // Select course names that are offered in both departments A and B
   * await db.select({ courseName: depA.courseName })
   *   .from(depA)
   *   .intersect(
   *     db.select({ courseName: depB.courseName }).from(depB)
   *   );
   * // or
   * import { intersect } from 'drizzle-orm/sqlite-core'
   *
   * await intersect(
   *   db.select({ courseName: depA.courseName }).from(depA),
   *   db.select({ courseName: depB.courseName }).from(depB)
   * );
   * ```
   */
  intersect = this.createSetOperator("intersect", false);
  /**
   * Adds `except` set operator to the query.
   *
   * Calling this method will retrieve all unique rows from the left query, except for the rows that are present in the result set of the right query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#except}
   *
   * @example
   *
   * ```ts
   * // Select all courses offered in department A but not in department B
   * await db.select({ courseName: depA.courseName })
   *   .from(depA)
   *   .except(
   *     db.select({ courseName: depB.courseName }).from(depB)
   *   );
   * // or
   * import { except } from 'drizzle-orm/sqlite-core'
   *
   * await except(
   *   db.select({ courseName: depA.courseName }).from(depA),
   *   db.select({ courseName: depB.courseName }).from(depB)
   * );
   * ```
   */
  except = this.createSetOperator("except", false);
  /** @internal */
  addSetOperators(setOperators) {
    this.config.setOperators.push(...setOperators);
    return this;
  }
  /**
   * Adds a `where` clause to the query.
   *
   * Calling this method will select only those rows that fulfill a specified condition.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#filtering}
   *
   * @param where the `where` clause.
   *
   * @example
   * You can use conditional operators and `sql function` to filter the rows to be selected.
   *
   * ```ts
   * // Select all cars with green color
   * await db.select().from(cars).where(eq(cars.color, 'green'));
   * // or
   * await db.select().from(cars).where(sql`${cars.color} = 'green'`)
   * ```
   *
   * You can logically combine conditional operators with `and()` and `or()` operators:
   *
   * ```ts
   * // Select all BMW cars with a green color
   * await db.select().from(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
   *
   * // Select all cars with the green or blue color
   * await db.select().from(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
   * ```
   */
  where(where) {
    if (typeof where === "function") {
      where = where(
        new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
        )
      );
    }
    this.config.where = where;
    return this;
  }
  /**
   * Adds a `having` clause to the query.
   *
   * Calling this method will select only those rows that fulfill a specified condition. It is typically used with aggregate functions to filter the aggregated data based on a specified condition.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#aggregations}
   *
   * @param having the `having` clause.
   *
   * @example
   *
   * ```ts
   * // Select all brands with more than one car
   * await db.select({
   * 	brand: cars.brand,
   * 	count: sql<number>`cast(count(${cars.id}) as int)`,
   * })
   *   .from(cars)
   *   .groupBy(cars.brand)
   *   .having(({ count }) => gt(count, 1));
   * ```
   */
  having(having) {
    if (typeof having === "function") {
      having = having(
        new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
        )
      );
    }
    this.config.having = having;
    return this;
  }
  groupBy(...columns) {
    if (typeof columns[0] === "function") {
      const groupBy = columns[0](
        new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
        )
      );
      this.config.groupBy = Array.isArray(groupBy) ? groupBy : [groupBy];
    } else {
      this.config.groupBy = columns;
    }
    return this;
  }
  orderBy(...columns) {
    if (typeof columns[0] === "function") {
      const orderBy = columns[0](
        new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
        )
      );
      const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
      if (this.config.setOperators.length > 0) {
        this.config.setOperators.at(-1).orderBy = orderByArray;
      } else {
        this.config.orderBy = orderByArray;
      }
    } else {
      const orderByArray = columns;
      if (this.config.setOperators.length > 0) {
        this.config.setOperators.at(-1).orderBy = orderByArray;
      } else {
        this.config.orderBy = orderByArray;
      }
    }
    return this;
  }
  /**
   * Adds a `limit` clause to the query.
   *
   * Calling this method will set the maximum number of rows that will be returned by this query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
   *
   * @param limit the `limit` clause.
   *
   * @example
   *
   * ```ts
   * // Get the first 10 people from this query.
   * await db.select().from(people).limit(10);
   * ```
   */
  limit(limit) {
    if (this.config.setOperators.length > 0) {
      this.config.setOperators.at(-1).limit = limit;
    } else {
      this.config.limit = limit;
    }
    return this;
  }
  /**
   * Adds an `offset` clause to the query.
   *
   * Calling this method will skip a number of rows when returning results from this query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
   *
   * @param offset the `offset` clause.
   *
   * @example
   *
   * ```ts
   * // Get the 10th-20th people from this query.
   * await db.select().from(people).offset(10).limit(10);
   * ```
   */
  offset(offset) {
    if (this.config.setOperators.length > 0) {
      this.config.setOperators.at(-1).offset = offset;
    } else {
      this.config.offset = offset;
    }
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildSelectQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  as(alias) {
    return new Proxy(
      new Subquery(this.getSQL(), this.config.fields, alias),
      new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
    );
  }
  /** @internal */
  getSelectedFields() {
    return new Proxy(
      this.config.fields,
      new SelectionProxyHandler({ alias: this.tableName, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
    );
  }
  $dynamic() {
    return this;
  }
};
var SQLiteSelectBase = class extends SQLiteSelectQueryBuilderBase {
  static {
    __name(this, "SQLiteSelectBase");
  }
  static [entityKind] = "SQLiteSelect";
  /** @internal */
  _prepare(isOneTimeQuery = true) {
    if (!this.session) {
      throw new Error("Cannot execute a query on a query builder. Please use a database instance instead.");
    }
    const fieldsList = orderSelectedFields(this.config.fields);
    const query = this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](
      this.dialect.sqlToQuery(this.getSQL()),
      fieldsList,
      "all",
      true
    );
    query.joinsNotNullableMap = this.joinsNotNullableMap;
    return query;
  }
  prepare() {
    return this._prepare(false);
  }
  run = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().run(placeholderValues);
  }, "run");
  all = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().all(placeholderValues);
  }, "all");
  get = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().get(placeholderValues);
  }, "get");
  values = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().values(placeholderValues);
  }, "values");
  async execute() {
    return this.all();
  }
};
applyMixins(SQLiteSelectBase, [QueryPromise]);
function createSetOperator(type, isAll) {
  return (leftSelect, rightSelect, ...restSelects) => {
    const setOperators = [rightSelect, ...restSelects].map((select) => ({
      type,
      isAll,
      rightSelect: select
    }));
    for (const setOperator of setOperators) {
      if (!haveSameKeys(leftSelect.getSelectedFields(), setOperator.rightSelect.getSelectedFields())) {
        throw new Error(
          "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
        );
      }
    }
    return leftSelect.addSetOperators(setOperators);
  };
}
__name(createSetOperator, "createSetOperator");
var getSQLiteSetOperators = /* @__PURE__ */ __name(() => ({
  union,
  unionAll,
  intersect,
  except
}), "getSQLiteSetOperators");
var union = createSetOperator("union", false);
var unionAll = createSetOperator("union", true);
var intersect = createSetOperator("intersect", false);
var except = createSetOperator("except", false);

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/query-builders/query-builder.js
var QueryBuilder = class {
  static {
    __name(this, "QueryBuilder");
  }
  static [entityKind] = "SQLiteQueryBuilder";
  dialect;
  dialectConfig;
  constructor(dialect) {
    this.dialect = is(dialect, SQLiteDialect) ? dialect : void 0;
    this.dialectConfig = is(dialect, SQLiteDialect) ? void 0 : dialect;
  }
  $with(alias) {
    const queryBuilder = this;
    return {
      as(qb) {
        if (typeof qb === "function") {
          qb = qb(queryBuilder);
        }
        return new Proxy(
          new WithSubquery(qb.getSQL(), qb.getSelectedFields(), alias, true),
          new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
        );
      }
    };
  }
  with(...queries) {
    const self = this;
    function select(fields) {
      return new SQLiteSelectBuilder({
        fields: fields ?? void 0,
        session: void 0,
        dialect: self.getDialect(),
        withList: queries
      });
    }
    __name(select, "select");
    function selectDistinct(fields) {
      return new SQLiteSelectBuilder({
        fields: fields ?? void 0,
        session: void 0,
        dialect: self.getDialect(),
        withList: queries,
        distinct: true
      });
    }
    __name(selectDistinct, "selectDistinct");
    return { select, selectDistinct };
  }
  select(fields) {
    return new SQLiteSelectBuilder({ fields: fields ?? void 0, session: void 0, dialect: this.getDialect() });
  }
  selectDistinct(fields) {
    return new SQLiteSelectBuilder({
      fields: fields ?? void 0,
      session: void 0,
      dialect: this.getDialect(),
      distinct: true
    });
  }
  // Lazy load dialect to avoid circular dependency
  getDialect() {
    if (!this.dialect) {
      this.dialect = new SQLiteSyncDialect(this.dialectConfig);
    }
    return this.dialect;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/query-builders/insert.js
var SQLiteInsertBuilder = class {
  static {
    __name(this, "SQLiteInsertBuilder");
  }
  constructor(table3, session, dialect, withList) {
    this.table = table3;
    this.session = session;
    this.dialect = dialect;
    this.withList = withList;
  }
  static [entityKind] = "SQLiteInsertBuilder";
  values(values) {
    values = Array.isArray(values) ? values : [values];
    if (values.length === 0) {
      throw new Error("values() must be called with at least one value");
    }
    const mappedValues = values.map((entry) => {
      const result = {};
      const cols = this.table[Table.Symbol.Columns];
      for (const colKey of Object.keys(entry)) {
        const colValue = entry[colKey];
        result[colKey] = is(colValue, SQL) ? colValue : new Param(colValue, cols[colKey]);
      }
      return result;
    });
    return new SQLiteInsertBase(this.table, mappedValues, this.session, this.dialect, this.withList);
  }
  select(selectQuery) {
    const select = typeof selectQuery === "function" ? selectQuery(new QueryBuilder()) : selectQuery;
    if (!is(select, SQL) && !haveSameKeys(this.table[Columns], select._.selectedFields)) {
      throw new Error(
        "Insert select error: selected fields are not the same or are in a different order compared to the table definition"
      );
    }
    return new SQLiteInsertBase(this.table, select, this.session, this.dialect, this.withList, true);
  }
};
var SQLiteInsertBase = class extends QueryPromise {
  static {
    __name(this, "SQLiteInsertBase");
  }
  constructor(table3, values, session, dialect, withList, select) {
    super();
    this.session = session;
    this.dialect = dialect;
    this.config = { table: table3, values, withList, select };
  }
  static [entityKind] = "SQLiteInsert";
  /** @internal */
  config;
  returning(fields = this.config.table[SQLiteTable.Symbol.Columns]) {
    this.config.returning = orderSelectedFields(fields);
    return this;
  }
  /**
   * Adds an `on conflict do nothing` clause to the query.
   *
   * Calling this method simply avoids inserting a row as its alternative action.
   *
   * See docs: {@link https://orm.drizzle.team/docs/insert#on-conflict-do-nothing}
   *
   * @param config The `target` and `where` clauses.
   *
   * @example
   * ```ts
   * // Insert one row and cancel the insert if there's a conflict
   * await db.insert(cars)
   *   .values({ id: 1, brand: 'BMW' })
   *   .onConflictDoNothing();
   *
   * // Explicitly specify conflict target
   * await db.insert(cars)
   *   .values({ id: 1, brand: 'BMW' })
   *   .onConflictDoNothing({ target: cars.id });
   * ```
   */
  onConflictDoNothing(config2 = {}) {
    if (config2.target === void 0) {
      this.config.onConflict = sql`do nothing`;
    } else {
      const targetSql = Array.isArray(config2.target) ? sql`${config2.target}` : sql`${[config2.target]}`;
      const whereSql = config2.where ? sql` where ${config2.where}` : sql``;
      this.config.onConflict = sql`${targetSql} do nothing${whereSql}`;
    }
    return this;
  }
  /**
   * Adds an `on conflict do update` clause to the query.
   *
   * Calling this method will update the existing row that conflicts with the row proposed for insertion as its alternative action.
   *
   * See docs: {@link https://orm.drizzle.team/docs/insert#upserts-and-conflicts}
   *
   * @param config The `target`, `set` and `where` clauses.
   *
   * @example
   * ```ts
   * // Update the row if there's a conflict
   * await db.insert(cars)
   *   .values({ id: 1, brand: 'BMW' })
   *   .onConflictDoUpdate({
   *     target: cars.id,
   *     set: { brand: 'Porsche' }
   *   });
   *
   * // Upsert with 'where' clause
   * await db.insert(cars)
   *   .values({ id: 1, brand: 'BMW' })
   *   .onConflictDoUpdate({
   *     target: cars.id,
   *     set: { brand: 'newBMW' },
   *     where: sql`${cars.createdAt} > '2023-01-01'::date`,
   *   });
   * ```
   */
  onConflictDoUpdate(config2) {
    if (config2.where && (config2.targetWhere || config2.setWhere)) {
      throw new Error(
        'You cannot use both "where" and "targetWhere"/"setWhere" at the same time - "where" is deprecated, use "targetWhere" or "setWhere" instead.'
      );
    }
    const whereSql = config2.where ? sql` where ${config2.where}` : void 0;
    const targetWhereSql = config2.targetWhere ? sql` where ${config2.targetWhere}` : void 0;
    const setWhereSql = config2.setWhere ? sql` where ${config2.setWhere}` : void 0;
    const targetSql = Array.isArray(config2.target) ? sql`${config2.target}` : sql`${[config2.target]}`;
    const setSql = this.dialect.buildUpdateSet(this.config.table, mapUpdateSet(this.config.table, config2.set));
    this.config.onConflict = sql`${targetSql}${targetWhereSql} do update set ${setSql}${whereSql}${setWhereSql}`;
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildInsertQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  /** @internal */
  _prepare(isOneTimeQuery = true) {
    return this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](
      this.dialect.sqlToQuery(this.getSQL()),
      this.config.returning,
      this.config.returning ? "all" : "run",
      true
    );
  }
  prepare() {
    return this._prepare(false);
  }
  run = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().run(placeholderValues);
  }, "run");
  all = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().all(placeholderValues);
  }, "all");
  get = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().get(placeholderValues);
  }, "get");
  values = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().values(placeholderValues);
  }, "values");
  async execute() {
    return this.config.returning ? this.all() : this.run();
  }
  $dynamic() {
    return this;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/query-builders/update.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SQLiteUpdateBuilder = class {
  static {
    __name(this, "SQLiteUpdateBuilder");
  }
  constructor(table3, session, dialect, withList) {
    this.table = table3;
    this.session = session;
    this.dialect = dialect;
    this.withList = withList;
  }
  static [entityKind] = "SQLiteUpdateBuilder";
  set(values) {
    return new SQLiteUpdateBase(
      this.table,
      mapUpdateSet(this.table, values),
      this.session,
      this.dialect,
      this.withList
    );
  }
};
var SQLiteUpdateBase = class extends QueryPromise {
  static {
    __name(this, "SQLiteUpdateBase");
  }
  constructor(table3, set, session, dialect, withList) {
    super();
    this.session = session;
    this.dialect = dialect;
    this.config = { set, table: table3, withList, joins: [] };
  }
  static [entityKind] = "SQLiteUpdate";
  /** @internal */
  config;
  from(source) {
    this.config.from = source;
    return this;
  }
  createJoin(joinType) {
    return (table3, on2) => {
      const tableName = getTableLikeName(table3);
      if (typeof tableName === "string" && this.config.joins.some((join) => join.alias === tableName)) {
        throw new Error(`Alias "${tableName}" is already used in this query`);
      }
      if (typeof on2 === "function") {
        const from = this.config.from ? is(table3, SQLiteTable) ? table3[Table.Symbol.Columns] : is(table3, Subquery) ? table3._.selectedFields : is(table3, SQLiteViewBase) ? table3[ViewBaseConfig].selectedFields : void 0 : void 0;
        on2 = on2(
          new Proxy(
            this.config.table[Table.Symbol.Columns],
            new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
          ),
          from && new Proxy(
            from,
            new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
          )
        );
      }
      this.config.joins.push({ on: on2, table: table3, joinType, alias: tableName });
      return this;
    };
  }
  leftJoin = this.createJoin("left");
  rightJoin = this.createJoin("right");
  innerJoin = this.createJoin("inner");
  fullJoin = this.createJoin("full");
  /**
   * Adds a 'where' clause to the query.
   *
   * Calling this method will update only those rows that fulfill a specified condition.
   *
   * See docs: {@link https://orm.drizzle.team/docs/update}
   *
   * @param where the 'where' clause.
   *
   * @example
   * You can use conditional operators and `sql function` to filter the rows to be updated.
   *
   * ```ts
   * // Update all cars with green color
   * db.update(cars).set({ color: 'red' })
   *   .where(eq(cars.color, 'green'));
   * // or
   * db.update(cars).set({ color: 'red' })
   *   .where(sql`${cars.color} = 'green'`)
   * ```
   *
   * You can logically combine conditional operators with `and()` and `or()` operators:
   *
   * ```ts
   * // Update all BMW cars with a green color
   * db.update(cars).set({ color: 'red' })
   *   .where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
   *
   * // Update all cars with the green or blue color
   * db.update(cars).set({ color: 'red' })
   *   .where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
   * ```
   */
  where(where) {
    this.config.where = where;
    return this;
  }
  orderBy(...columns) {
    if (typeof columns[0] === "function") {
      const orderBy = columns[0](
        new Proxy(
          this.config.table[Table.Symbol.Columns],
          new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
        )
      );
      const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
      this.config.orderBy = orderByArray;
    } else {
      const orderByArray = columns;
      this.config.orderBy = orderByArray;
    }
    return this;
  }
  limit(limit) {
    this.config.limit = limit;
    return this;
  }
  returning(fields = this.config.table[SQLiteTable.Symbol.Columns]) {
    this.config.returning = orderSelectedFields(fields);
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildUpdateQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  /** @internal */
  _prepare(isOneTimeQuery = true) {
    return this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](
      this.dialect.sqlToQuery(this.getSQL()),
      this.config.returning,
      this.config.returning ? "all" : "run",
      true
    );
  }
  prepare() {
    return this._prepare(false);
  }
  run = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().run(placeholderValues);
  }, "run");
  all = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().all(placeholderValues);
  }, "all");
  get = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().get(placeholderValues);
  }, "get");
  values = /* @__PURE__ */ __name((placeholderValues) => {
    return this._prepare().values(placeholderValues);
  }, "values");
  async execute() {
    return this.config.returning ? this.all() : this.run();
  }
  $dynamic() {
    return this;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/query-builders/count.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SQLiteCountBuilder = class _SQLiteCountBuilder extends SQL {
  static {
    __name(this, "SQLiteCountBuilder");
  }
  constructor(params) {
    super(_SQLiteCountBuilder.buildEmbeddedCount(params.source, params.filters).queryChunks);
    this.params = params;
    this.session = params.session;
    this.sql = _SQLiteCountBuilder.buildCount(
      params.source,
      params.filters
    );
  }
  sql;
  static [entityKind] = "SQLiteCountBuilderAsync";
  [Symbol.toStringTag] = "SQLiteCountBuilderAsync";
  session;
  static buildEmbeddedCount(source, filters) {
    return sql`(select count(*) from ${source}${sql.raw(" where ").if(filters)}${filters})`;
  }
  static buildCount(source, filters) {
    return sql`select count(*) from ${source}${sql.raw(" where ").if(filters)}${filters}`;
  }
  then(onfulfilled, onrejected) {
    return Promise.resolve(this.session.count(this.sql)).then(
      onfulfilled,
      onrejected
    );
  }
  catch(onRejected) {
    return this.then(void 0, onRejected);
  }
  finally(onFinally) {
    return this.then(
      (value) => {
        onFinally?.();
        return value;
      },
      (reason) => {
        onFinally?.();
        throw reason;
      }
    );
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/query-builders/query.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var RelationalQueryBuilder = class {
  static {
    __name(this, "RelationalQueryBuilder");
  }
  constructor(mode, fullSchema, schema, tableNamesMap, table3, tableConfig, dialect, session) {
    this.mode = mode;
    this.fullSchema = fullSchema;
    this.schema = schema;
    this.tableNamesMap = tableNamesMap;
    this.table = table3;
    this.tableConfig = tableConfig;
    this.dialect = dialect;
    this.session = session;
  }
  static [entityKind] = "SQLiteAsyncRelationalQueryBuilder";
  findMany(config2) {
    return this.mode === "sync" ? new SQLiteSyncRelationalQuery(
      this.fullSchema,
      this.schema,
      this.tableNamesMap,
      this.table,
      this.tableConfig,
      this.dialect,
      this.session,
      config2 ? config2 : {},
      "many"
    ) : new SQLiteRelationalQuery(
      this.fullSchema,
      this.schema,
      this.tableNamesMap,
      this.table,
      this.tableConfig,
      this.dialect,
      this.session,
      config2 ? config2 : {},
      "many"
    );
  }
  findFirst(config2) {
    return this.mode === "sync" ? new SQLiteSyncRelationalQuery(
      this.fullSchema,
      this.schema,
      this.tableNamesMap,
      this.table,
      this.tableConfig,
      this.dialect,
      this.session,
      config2 ? { ...config2, limit: 1 } : { limit: 1 },
      "first"
    ) : new SQLiteRelationalQuery(
      this.fullSchema,
      this.schema,
      this.tableNamesMap,
      this.table,
      this.tableConfig,
      this.dialect,
      this.session,
      config2 ? { ...config2, limit: 1 } : { limit: 1 },
      "first"
    );
  }
};
var SQLiteRelationalQuery = class extends QueryPromise {
  static {
    __name(this, "SQLiteRelationalQuery");
  }
  constructor(fullSchema, schema, tableNamesMap, table3, tableConfig, dialect, session, config2, mode) {
    super();
    this.fullSchema = fullSchema;
    this.schema = schema;
    this.tableNamesMap = tableNamesMap;
    this.table = table3;
    this.tableConfig = tableConfig;
    this.dialect = dialect;
    this.session = session;
    this.config = config2;
    this.mode = mode;
  }
  static [entityKind] = "SQLiteAsyncRelationalQuery";
  /** @internal */
  mode;
  /** @internal */
  getSQL() {
    return this.dialect.buildRelationalQuery({
      fullSchema: this.fullSchema,
      schema: this.schema,
      tableNamesMap: this.tableNamesMap,
      table: this.table,
      tableConfig: this.tableConfig,
      queryConfig: this.config,
      tableAlias: this.tableConfig.tsName
    }).sql;
  }
  /** @internal */
  _prepare(isOneTimeQuery = false) {
    const { query, builtQuery } = this._toSQL();
    return this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](
      builtQuery,
      void 0,
      this.mode === "first" ? "get" : "all",
      true,
      (rawRows, mapColumnValue) => {
        const rows = rawRows.map(
          (row) => mapRelationalRow(this.schema, this.tableConfig, row, query.selection, mapColumnValue)
        );
        if (this.mode === "first") {
          return rows[0];
        }
        return rows;
      }
    );
  }
  prepare() {
    return this._prepare(false);
  }
  _toSQL() {
    const query = this.dialect.buildRelationalQuery({
      fullSchema: this.fullSchema,
      schema: this.schema,
      tableNamesMap: this.tableNamesMap,
      table: this.table,
      tableConfig: this.tableConfig,
      queryConfig: this.config,
      tableAlias: this.tableConfig.tsName
    });
    const builtQuery = this.dialect.sqlToQuery(query.sql);
    return { query, builtQuery };
  }
  toSQL() {
    return this._toSQL().builtQuery;
  }
  /** @internal */
  executeRaw() {
    if (this.mode === "first") {
      return this._prepare(false).get();
    }
    return this._prepare(false).all();
  }
  async execute() {
    return this.executeRaw();
  }
};
var SQLiteSyncRelationalQuery = class extends SQLiteRelationalQuery {
  static {
    __name(this, "SQLiteSyncRelationalQuery");
  }
  static [entityKind] = "SQLiteSyncRelationalQuery";
  sync() {
    return this.executeRaw();
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/query-builders/raw.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SQLiteRaw = class extends QueryPromise {
  static {
    __name(this, "SQLiteRaw");
  }
  constructor(execute, getSQL, action, dialect, mapBatchResult) {
    super();
    this.execute = execute;
    this.getSQL = getSQL;
    this.dialect = dialect;
    this.mapBatchResult = mapBatchResult;
    this.config = { action };
  }
  static [entityKind] = "SQLiteRaw";
  /** @internal */
  config;
  getQuery() {
    return { ...this.dialect.sqlToQuery(this.getSQL()), method: this.config.action };
  }
  mapResult(result, isFromBatch) {
    return isFromBatch ? this.mapBatchResult(result) : result;
  }
  _prepare() {
    return this;
  }
  /** @internal */
  isResponseInArrayMode() {
    return false;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/db.js
var BaseSQLiteDatabase = class {
  static {
    __name(this, "BaseSQLiteDatabase");
  }
  constructor(resultKind, dialect, session, schema) {
    this.resultKind = resultKind;
    this.dialect = dialect;
    this.session = session;
    this._ = schema ? {
      schema: schema.schema,
      fullSchema: schema.fullSchema,
      tableNamesMap: schema.tableNamesMap
    } : {
      schema: void 0,
      fullSchema: {},
      tableNamesMap: {}
    };
    this.query = {};
    const query = this.query;
    if (this._.schema) {
      for (const [tableName, columns] of Object.entries(this._.schema)) {
        query[tableName] = new RelationalQueryBuilder(
          resultKind,
          schema.fullSchema,
          this._.schema,
          this._.tableNamesMap,
          schema.fullSchema[tableName],
          columns,
          dialect,
          session
        );
      }
    }
  }
  static [entityKind] = "BaseSQLiteDatabase";
  query;
  /**
   * Creates a subquery that defines a temporary named result set as a CTE.
   *
   * It is useful for breaking down complex queries into simpler parts and for reusing the result set in subsequent parts of the query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
   *
   * @param alias The alias for the subquery.
   *
   * Failure to provide an alias will result in a DrizzleTypeError, preventing the subquery from being referenced in other queries.
   *
   * @example
   *
   * ```ts
   * // Create a subquery with alias 'sq' and use it in the select query
   * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
   *
   * const result = await db.with(sq).select().from(sq);
   * ```
   *
   * To select arbitrary SQL values as fields in a CTE and reference them in other CTEs or in the main query, you need to add aliases to them:
   *
   * ```ts
   * // Select an arbitrary SQL value as a field in a CTE and reference it in the main query
   * const sq = db.$with('sq').as(db.select({
   *   name: sql<string>`upper(${users.name})`.as('name'),
   * })
   * .from(users));
   *
   * const result = await db.with(sq).select({ name: sq.name }).from(sq);
   * ```
   */
  $with(alias) {
    const self = this;
    return {
      as(qb) {
        if (typeof qb === "function") {
          qb = qb(new QueryBuilder(self.dialect));
        }
        return new Proxy(
          new WithSubquery(qb.getSQL(), qb.getSelectedFields(), alias, true),
          new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
        );
      }
    };
  }
  $count(source, filters) {
    return new SQLiteCountBuilder({ source, filters, session: this.session });
  }
  /**
   * Incorporates a previously defined CTE (using `$with`) into the main query.
   *
   * This method allows the main query to reference a temporary named result set.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
   *
   * @param queries The CTEs to incorporate into the main query.
   *
   * @example
   *
   * ```ts
   * // Define a subquery 'sq' as a CTE using $with
   * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
   *
   * // Incorporate the CTE 'sq' into the main query and select from it
   * const result = await db.with(sq).select().from(sq);
   * ```
   */
  with(...queries) {
    const self = this;
    function select(fields) {
      return new SQLiteSelectBuilder({
        fields: fields ?? void 0,
        session: self.session,
        dialect: self.dialect,
        withList: queries
      });
    }
    __name(select, "select");
    function selectDistinct(fields) {
      return new SQLiteSelectBuilder({
        fields: fields ?? void 0,
        session: self.session,
        dialect: self.dialect,
        withList: queries,
        distinct: true
      });
    }
    __name(selectDistinct, "selectDistinct");
    function update(table3) {
      return new SQLiteUpdateBuilder(table3, self.session, self.dialect, queries);
    }
    __name(update, "update");
    function insert(into) {
      return new SQLiteInsertBuilder(into, self.session, self.dialect, queries);
    }
    __name(insert, "insert");
    function delete_(from) {
      return new SQLiteDeleteBase(from, self.session, self.dialect, queries);
    }
    __name(delete_, "delete_");
    return { select, selectDistinct, update, insert, delete: delete_ };
  }
  select(fields) {
    return new SQLiteSelectBuilder({ fields: fields ?? void 0, session: this.session, dialect: this.dialect });
  }
  selectDistinct(fields) {
    return new SQLiteSelectBuilder({
      fields: fields ?? void 0,
      session: this.session,
      dialect: this.dialect,
      distinct: true
    });
  }
  /**
   * Creates an update query.
   *
   * Calling this method without `.where()` clause will update all rows in a table. The `.where()` clause specifies which rows should be updated.
   *
   * Use `.set()` method to specify which values to update.
   *
   * See docs: {@link https://orm.drizzle.team/docs/update}
   *
   * @param table The table to update.
   *
   * @example
   *
   * ```ts
   * // Update all rows in the 'cars' table
   * await db.update(cars).set({ color: 'red' });
   *
   * // Update rows with filters and conditions
   * await db.update(cars).set({ color: 'red' }).where(eq(cars.brand, 'BMW'));
   *
   * // Update with returning clause
   * const updatedCar: Car[] = await db.update(cars)
   *   .set({ color: 'red' })
   *   .where(eq(cars.id, 1))
   *   .returning();
   * ```
   */
  update(table3) {
    return new SQLiteUpdateBuilder(table3, this.session, this.dialect);
  }
  /**
   * Creates an insert query.
   *
   * Calling this method will create new rows in a table. Use `.values()` method to specify which values to insert.
   *
   * See docs: {@link https://orm.drizzle.team/docs/insert}
   *
   * @param table The table to insert into.
   *
   * @example
   *
   * ```ts
   * // Insert one row
   * await db.insert(cars).values({ brand: 'BMW' });
   *
   * // Insert multiple rows
   * await db.insert(cars).values([{ brand: 'BMW' }, { brand: 'Porsche' }]);
   *
   * // Insert with returning clause
   * const insertedCar: Car[] = await db.insert(cars)
   *   .values({ brand: 'BMW' })
   *   .returning();
   * ```
   */
  insert(into) {
    return new SQLiteInsertBuilder(into, this.session, this.dialect);
  }
  /**
   * Creates a delete query.
   *
   * Calling this method without `.where()` clause will delete all rows in a table. The `.where()` clause specifies which rows should be deleted.
   *
   * See docs: {@link https://orm.drizzle.team/docs/delete}
   *
   * @param table The table to delete from.
   *
   * @example
   *
   * ```ts
   * // Delete all rows in the 'cars' table
   * await db.delete(cars);
   *
   * // Delete rows with filters and conditions
   * await db.delete(cars).where(eq(cars.color, 'green'));
   *
   * // Delete with returning clause
   * const deletedCar: Car[] = await db.delete(cars)
   *   .where(eq(cars.id, 1))
   *   .returning();
   * ```
   */
  delete(from) {
    return new SQLiteDeleteBase(from, this.session, this.dialect);
  }
  run(query) {
    const sequel = typeof query === "string" ? sql.raw(query) : query.getSQL();
    if (this.resultKind === "async") {
      return new SQLiteRaw(
        async () => this.session.run(sequel),
        () => sequel,
        "run",
        this.dialect,
        this.session.extractRawRunValueFromBatchResult.bind(this.session)
      );
    }
    return this.session.run(sequel);
  }
  all(query) {
    const sequel = typeof query === "string" ? sql.raw(query) : query.getSQL();
    if (this.resultKind === "async") {
      return new SQLiteRaw(
        async () => this.session.all(sequel),
        () => sequel,
        "all",
        this.dialect,
        this.session.extractRawAllValueFromBatchResult.bind(this.session)
      );
    }
    return this.session.all(sequel);
  }
  get(query) {
    const sequel = typeof query === "string" ? sql.raw(query) : query.getSQL();
    if (this.resultKind === "async") {
      return new SQLiteRaw(
        async () => this.session.get(sequel),
        () => sequel,
        "get",
        this.dialect,
        this.session.extractRawGetValueFromBatchResult.bind(this.session)
      );
    }
    return this.session.get(sequel);
  }
  values(query) {
    const sequel = typeof query === "string" ? sql.raw(query) : query.getSQL();
    if (this.resultKind === "async") {
      return new SQLiteRaw(
        async () => this.session.values(sequel),
        () => sequel,
        "values",
        this.dialect,
        this.session.extractRawValuesValueFromBatchResult.bind(this.session)
      );
    }
    return this.session.values(sequel);
  }
  transaction(transaction, config2) {
    return this.session.transaction(transaction, config2);
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/d1/session.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/indexes.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var IndexBuilderOn = class {
  static {
    __name(this, "IndexBuilderOn");
  }
  constructor(name, unique) {
    this.name = name;
    this.unique = unique;
  }
  static [entityKind] = "SQLiteIndexBuilderOn";
  on(...columns) {
    return new IndexBuilder(this.name, columns, this.unique);
  }
};
var IndexBuilder = class {
  static {
    __name(this, "IndexBuilder");
  }
  static [entityKind] = "SQLiteIndexBuilder";
  /** @internal */
  config;
  constructor(name, columns, unique) {
    this.config = {
      name,
      columns,
      unique,
      where: void 0
    };
  }
  /**
   * Condition for partial index.
   */
  where(condition) {
    this.config.where = condition;
    return this;
  }
  /** @internal */
  build(table3) {
    return new Index(this.config, table3);
  }
};
var Index = class {
  static {
    __name(this, "Index");
  }
  static [entityKind] = "SQLiteIndex";
  config;
  constructor(config2, table3) {
    this.config = { ...config2, table: table3 };
  }
};
function index(name) {
  return new IndexBuilderOn(name, false);
}
__name(index, "index");

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/primary-keys.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function primaryKey(...config2) {
  if (config2[0].columns) {
    return new PrimaryKeyBuilder2(config2[0].columns, config2[0].name);
  }
  return new PrimaryKeyBuilder2(config2);
}
__name(primaryKey, "primaryKey");
var PrimaryKeyBuilder2 = class {
  static {
    __name(this, "PrimaryKeyBuilder");
  }
  static [entityKind] = "SQLitePrimaryKeyBuilder";
  /** @internal */
  columns;
  /** @internal */
  name;
  constructor(columns, name) {
    this.columns = columns;
    this.name = name;
  }
  /** @internal */
  build(table3) {
    return new PrimaryKey2(table3, this.columns, this.name);
  }
};
var PrimaryKey2 = class {
  static {
    __name(this, "PrimaryKey");
  }
  constructor(table3, columns, name) {
    this.table = table3;
    this.columns = columns;
    this.name = name;
  }
  static [entityKind] = "SQLitePrimaryKey";
  columns;
  name;
  getName() {
    return this.name ?? `${this.table[SQLiteTable.Symbol.Name]}_${this.columns.map((column) => column.name).join("_")}_pk`;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/sqlite-core/session.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ExecuteResultSync = class extends QueryPromise {
  static {
    __name(this, "ExecuteResultSync");
  }
  constructor(resultCb) {
    super();
    this.resultCb = resultCb;
  }
  static [entityKind] = "ExecuteResultSync";
  async execute() {
    return this.resultCb();
  }
  sync() {
    return this.resultCb();
  }
};
var SQLitePreparedQuery = class {
  static {
    __name(this, "SQLitePreparedQuery");
  }
  constructor(mode, executeMethod, query) {
    this.mode = mode;
    this.executeMethod = executeMethod;
    this.query = query;
  }
  static [entityKind] = "PreparedQuery";
  /** @internal */
  joinsNotNullableMap;
  getQuery() {
    return this.query;
  }
  mapRunResult(result, _isFromBatch) {
    return result;
  }
  mapAllResult(_result, _isFromBatch) {
    throw new Error("Not implemented");
  }
  mapGetResult(_result, _isFromBatch) {
    throw new Error("Not implemented");
  }
  execute(placeholderValues) {
    if (this.mode === "async") {
      return this[this.executeMethod](placeholderValues);
    }
    return new ExecuteResultSync(() => this[this.executeMethod](placeholderValues));
  }
  mapResult(response, isFromBatch) {
    switch (this.executeMethod) {
      case "run": {
        return this.mapRunResult(response, isFromBatch);
      }
      case "all": {
        return this.mapAllResult(response, isFromBatch);
      }
      case "get": {
        return this.mapGetResult(response, isFromBatch);
      }
    }
  }
};
var SQLiteSession = class {
  static {
    __name(this, "SQLiteSession");
  }
  constructor(dialect) {
    this.dialect = dialect;
  }
  static [entityKind] = "SQLiteSession";
  prepareOneTimeQuery(query, fields, executeMethod, isResponseInArrayMode) {
    return this.prepareQuery(query, fields, executeMethod, isResponseInArrayMode);
  }
  run(query) {
    const staticQuery = this.dialect.sqlToQuery(query);
    try {
      return this.prepareOneTimeQuery(staticQuery, void 0, "run", false).run();
    } catch (err) {
      throw new DrizzleError({ cause: err, message: `Failed to run the query '${staticQuery.sql}'` });
    }
  }
  /** @internal */
  extractRawRunValueFromBatchResult(result) {
    return result;
  }
  all(query) {
    return this.prepareOneTimeQuery(this.dialect.sqlToQuery(query), void 0, "run", false).all();
  }
  /** @internal */
  extractRawAllValueFromBatchResult(_result) {
    throw new Error("Not implemented");
  }
  get(query) {
    return this.prepareOneTimeQuery(this.dialect.sqlToQuery(query), void 0, "run", false).get();
  }
  /** @internal */
  extractRawGetValueFromBatchResult(_result) {
    throw new Error("Not implemented");
  }
  values(query) {
    return this.prepareOneTimeQuery(this.dialect.sqlToQuery(query), void 0, "run", false).values();
  }
  async count(sql4) {
    const result = await this.values(sql4);
    return result[0][0];
  }
  /** @internal */
  extractRawValuesValueFromBatchResult(_result) {
    throw new Error("Not implemented");
  }
};
var SQLiteTransaction = class extends BaseSQLiteDatabase {
  static {
    __name(this, "SQLiteTransaction");
  }
  constructor(resultType, dialect, session, schema, nestedIndex = 0) {
    super(resultType, dialect, session, schema);
    this.schema = schema;
    this.nestedIndex = nestedIndex;
  }
  static [entityKind] = "SQLiteTransaction";
  rollback() {
    throw new TransactionRollbackError();
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/d1/session.js
var SQLiteD1Session = class extends SQLiteSession {
  static {
    __name(this, "SQLiteD1Session");
  }
  constructor(client, dialect, schema, options = {}) {
    super(dialect);
    this.client = client;
    this.schema = schema;
    this.options = options;
    this.logger = options.logger ?? new NoopLogger();
  }
  static [entityKind] = "SQLiteD1Session";
  logger;
  prepareQuery(query, fields, executeMethod, isResponseInArrayMode, customResultMapper) {
    const stmt = this.client.prepare(query.sql);
    return new D1PreparedQuery(
      stmt,
      query,
      this.logger,
      fields,
      executeMethod,
      isResponseInArrayMode,
      customResultMapper
    );
  }
  async batch(queries) {
    const preparedQueries = [];
    const builtQueries = [];
    for (const query of queries) {
      const preparedQuery = query._prepare();
      const builtQuery = preparedQuery.getQuery();
      preparedQueries.push(preparedQuery);
      if (builtQuery.params.length > 0) {
        builtQueries.push(preparedQuery.stmt.bind(...builtQuery.params));
      } else {
        const builtQuery2 = preparedQuery.getQuery();
        builtQueries.push(
          this.client.prepare(builtQuery2.sql).bind(...builtQuery2.params)
        );
      }
    }
    const batchResults = await this.client.batch(builtQueries);
    return batchResults.map((result, i) => preparedQueries[i].mapResult(result, true));
  }
  extractRawAllValueFromBatchResult(result) {
    return result.results;
  }
  extractRawGetValueFromBatchResult(result) {
    return result.results[0];
  }
  extractRawValuesValueFromBatchResult(result) {
    return d1ToRawMapping(result.results);
  }
  async transaction(transaction, config2) {
    const tx = new D1Transaction("async", this.dialect, this, this.schema);
    await this.run(sql.raw(`begin${config2?.behavior ? " " + config2.behavior : ""}`));
    try {
      const result = await transaction(tx);
      await this.run(sql`commit`);
      return result;
    } catch (err) {
      await this.run(sql`rollback`);
      throw err;
    }
  }
};
var D1Transaction = class _D1Transaction extends SQLiteTransaction {
  static {
    __name(this, "D1Transaction");
  }
  static [entityKind] = "D1Transaction";
  async transaction(transaction) {
    const savepointName = `sp${this.nestedIndex}`;
    const tx = new _D1Transaction("async", this.dialect, this.session, this.schema, this.nestedIndex + 1);
    await this.session.run(sql.raw(`savepoint ${savepointName}`));
    try {
      const result = await transaction(tx);
      await this.session.run(sql.raw(`release savepoint ${savepointName}`));
      return result;
    } catch (err) {
      await this.session.run(sql.raw(`rollback to savepoint ${savepointName}`));
      throw err;
    }
  }
};
function d1ToRawMapping(results) {
  const rows = [];
  for (const row of results) {
    const entry = Object.keys(row).map((k) => row[k]);
    rows.push(entry);
  }
  return rows;
}
__name(d1ToRawMapping, "d1ToRawMapping");
var D1PreparedQuery = class extends SQLitePreparedQuery {
  static {
    __name(this, "D1PreparedQuery");
  }
  constructor(stmt, query, logger, fields, executeMethod, _isResponseInArrayMode, customResultMapper) {
    super("async", executeMethod, query);
    this.logger = logger;
    this._isResponseInArrayMode = _isResponseInArrayMode;
    this.customResultMapper = customResultMapper;
    this.fields = fields;
    this.stmt = stmt;
  }
  static [entityKind] = "D1PreparedQuery";
  /** @internal */
  customResultMapper;
  /** @internal */
  fields;
  /** @internal */
  stmt;
  run(placeholderValues) {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
    this.logger.logQuery(this.query.sql, params);
    return this.stmt.bind(...params).run();
  }
  async all(placeholderValues) {
    const { fields, query, logger, stmt, customResultMapper } = this;
    if (!fields && !customResultMapper) {
      const params = fillPlaceholders(query.params, placeholderValues ?? {});
      logger.logQuery(query.sql, params);
      return stmt.bind(...params).all().then(({ results }) => this.mapAllResult(results));
    }
    const rows = await this.values(placeholderValues);
    return this.mapAllResult(rows);
  }
  mapAllResult(rows, isFromBatch) {
    if (isFromBatch) {
      rows = d1ToRawMapping(rows.results);
    }
    if (!this.fields && !this.customResultMapper) {
      return rows;
    }
    if (this.customResultMapper) {
      return this.customResultMapper(rows);
    }
    return rows.map((row) => mapResultRow(this.fields, row, this.joinsNotNullableMap));
  }
  async get(placeholderValues) {
    const { fields, joinsNotNullableMap, query, logger, stmt, customResultMapper } = this;
    if (!fields && !customResultMapper) {
      const params = fillPlaceholders(query.params, placeholderValues ?? {});
      logger.logQuery(query.sql, params);
      return stmt.bind(...params).all().then(({ results }) => results[0]);
    }
    const rows = await this.values(placeholderValues);
    if (!rows[0]) {
      return void 0;
    }
    if (customResultMapper) {
      return customResultMapper(rows);
    }
    return mapResultRow(fields, rows[0], joinsNotNullableMap);
  }
  mapGetResult(result, isFromBatch) {
    if (isFromBatch) {
      result = d1ToRawMapping(result.results)[0];
    }
    if (!this.fields && !this.customResultMapper) {
      return result;
    }
    if (this.customResultMapper) {
      return this.customResultMapper([result]);
    }
    return mapResultRow(this.fields, result, this.joinsNotNullableMap);
  }
  values(placeholderValues) {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
    this.logger.logQuery(this.query.sql, params);
    return this.stmt.bind(...params).raw();
  }
  /** @internal */
  isResponseInArrayMode() {
    return this._isResponseInArrayMode;
  }
};

// node_modules/.pnpm/drizzle-orm@0.36.4_@cloudflare+workers-types@4.20251121.0/node_modules/drizzle-orm/d1/driver.js
var DrizzleD1Database = class extends BaseSQLiteDatabase {
  static {
    __name(this, "DrizzleD1Database");
  }
  static [entityKind] = "D1Database";
  async batch(batch) {
    return this.session.batch(batch);
  }
};
function drizzle(client, config2 = {}) {
  const dialect = new SQLiteAsyncDialect({ casing: config2.casing });
  let logger;
  if (config2.logger === true) {
    logger = new DefaultLogger();
  } else if (config2.logger !== false) {
    logger = config2.logger;
  }
  let schema;
  if (config2.schema) {
    const tablesConfig = extractTablesRelationalConfig(
      config2.schema,
      createTableRelationsHelpers
    );
    schema = {
      fullSchema: config2.schema,
      schema: tablesConfig.tables,
      tableNamesMap: tablesConfig.tableNamesMap
    };
  }
  const session = new SQLiteD1Session(client, dialect, schema, { logger });
  const db = new DrizzleD1Database("async", dialect, session, schema);
  db.$client = client;
  return db;
}
__name(drizzle, "drizzle");

// src/schema.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var waitlist = sqliteTable("waitlist", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source").default("website"),
  // Track where they came from
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  emailIdx: index("waitlist_email_idx").on(table3.email)
}));
var users = sqliteTable("users", {
  id: text("id").primaryKey(),
  clerkId: text("clerk_id").unique(),
  email: text("email").unique().notNull(),
  name: text("name"),
  role: text("role", { enum: ["user", "admin"] }).default("user"),
  tier: text("tier", { enum: ["free", "premium", "pro"] }).default("free"),
  // Subscription tracking
  subscriptionStatus: text("subscription_status", {
    enum: ["none", "active", "past_due", "canceled", "expired"]
  }).default("none"),
  subscriptionPlatform: text("subscription_platform", { enum: ["ios", "android", "web"] }),
  subscriptionExpiresAt: integer("subscription_expires_at", { mode: "timestamp" }),
  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" })
}, (table3) => ({
  clerkIdIdx: index("users_clerk_id_idx").on(table3.clerkId)
}));
var vocabulary = sqliteTable("vocabulary", {
  id: text("id").primaryKey(),
  hanzi: text("hanzi").notNull(),
  pinyin: text("pinyin").notNull(),
  english: text("english").notNull(),
  category: text("category").notNull(),
  hskLevel: integer("hsk_level").notNull(),
  tags: text("tags", { mode: "json" }),
  // Audio and examples
  wordAudioR2Key: text("word_audio_r2_key"),
  exampleChinese: text("example_chinese"),
  examplePinyin: text("example_pinyin"),
  exampleEnglish: text("example_english"),
  exampleAudioR2Key: text("example_audio_r2_key")
}, (table3) => ({
  categoryIdx: index("vocab_category_idx").on(table3.category),
  levelIdx: index("vocab_level_idx").on(table3.hskLevel)
}));
var units = sqliteTable("units", {
  id: text("id").primaryKey(),
  // Identification
  hskLevel: integer("hsk_level").notNull(),
  unitNumber: integer("unit_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  // Visual styling (for mobile app)
  gradientStart: text("gradient_start").default("#EEF2FF"),
  gradientEnd: text("gradient_end").default("#C7D2FE"),
  accentColor: text("accent_color").default("#4F46E5"),
  // Organization
  orderIndex: integer("order_index"),
  // Publishing
  isPublished: integer("is_published", { mode: "boolean" }).default(false),
  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  hskLevelIdx: index("units_hsk_level_idx").on(table3.hskLevel, table3.unitNumber),
  publishedIdx: index("units_published_idx").on(table3.isPublished)
}));
var lessons = sqliteTable("lessons", {
  id: text("id").primaryKey(),
  // Unit relationship
  unitId: text("unit_id").references(() => units.id, { onDelete: "set null" }),
  orderInUnit: integer("order_in_unit"),
  // Identification
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  lessonNumber: integer("lesson_number").notNull().default(1),
  lessonType: text("lesson_type", {
    enum: ["lesson", "speaking", "mini_test", "hsk_test"]
  }).notNull().default("lesson"),
  // Classification
  hskLevel: integer("hsk_level").notNull(),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).default("medium"),
  displayOrder: integer("display_order"),
  // For portal UI organization (not used by mobile)
  // Content metadata
  description: text("description"),
  estimatedMinutes: integer("estimated_minutes").default(15),
  grammarPoints: text("grammar_points", { mode: "json" }),
  // string[]
  tags: text("tags", { mode: "json" }),
  // string[]
  targetVocabulary: text("target_vocabulary", { mode: "json" }),
  // string[] (vocab IDs)
  // Publishing
  isPublished: integer("is_published", { mode: "boolean" }).default(false),
  version: integer("version").default(1),
  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  unitIdx: index("lessons_unit_idx").on(table3.unitId, table3.orderInUnit),
  orderingIdx: index("lessons_ordering_idx").on(table3.hskLevel, table3.lessonType, table3.lessonNumber),
  typeIdx: index("lessons_type_idx").on(table3.lessonType),
  displayOrderIdx: index("lessons_display_order_idx").on(table3.hskLevel, table3.displayOrder)
}));
var lessonBlocks = sqliteTable("lesson_blocks", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  orderIndex: integer("order_index").notNull(),
  content: text("content", { mode: "json" }).notNull()
}, (table3) => ({
  lessonIdx: index("lesson_blocks_lesson_idx").on(table3.lessonId)
}));
var userProgress = sqliteTable("user_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["started", "completed"] }).notNull(),
  score: integer("score").default(0),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  userLessonIdx: index("user_progress_user_lesson_idx").on(table3.userId, table3.lessonId)
}));
var userKnowledgeSnapshot = sqliteTable("user_knowledge_snapshot", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  atomId: text("atom_id").notNull(),
  bucket: text("bucket", { enum: ["new", "weak", "learning", "mastered"] }).notNull(),
  proficiency: real("proficiency").notNull(),
  stability: real("stability").notNull(),
  lastReview: integer("last_review", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  pk: primaryKey({ columns: [table3.userId, table3.atomId] }),
  bucketIdx: index("uks_bucket_idx").on(table3.userId, table3.bucket)
}));
var tierLimits = sqliteTable("tier_limits", {
  tier: text("tier", { enum: ["free", "premium", "pro"] }).primaryKey(),
  requestsPerDay: integer("requests_per_day").notNull().default(10),
  tokensPerDay: integer("tokens_per_day").notNull().default(5e3),
  maxParallelGenerations: integer("max_parallel_generations").notNull().default(1),
  contentDownloadsPerDay: integer("content_downloads_per_day").notNull().default(5),
  offlinePackagesAllowed: integer("offline_packages_allowed").notNull().default(0),
  canAccessPremiumContent: integer("can_access_premium_content", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
});
var dailyUsage = sqliteTable("daily_usage", {
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  // YYYY-MM-DD
  requestCount: integer("request_count").default(0),
  tokenCount: integer("token_count").default(0)
}, (table3) => ({
  pk: primaryKey({ columns: [table3.userId, table3.date] })
}));
var aiModels = sqliteTable("ai_models", {
  id: text("id").primaryKey(),
  // e.g., 'gpt-5-nano', 'gpt-5-mini'
  name: text("name").notNull(),
  // Display name: 'GPT-5 Nano'
  provider: text("provider").notNull(),
  // 'openai', 'anthropic'
  costPer1kInput: real("cost_per_1k_input").notNull(),
  // Cost per 1k input tokens
  costPer1kOutput: real("cost_per_1k_output").notNull(),
  // Cost per 1k output tokens
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  // Currently active model
  tier: text("tier", { enum: ["nano", "mini", "standard", "premium"] }).notNull(),
  maxTokens: integer("max_tokens").default(4096),
  supportsJson: integer("supports_json", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
});
var apiUsage = sqliteTable("api_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestId: text("request_id").notNull(),
  modelUsed: text("model_used").notNull(),
  // Which AI model was used
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  estimatedCost: real("estimated_cost").default(0),
  // Calculated cost in USD
  latencyMs: integer("latency_ms"),
  // Response time in milliseconds
  success: integer("success", { mode: "boolean" }).default(true),
  errorMessage: text("error_message"),
  promptSlug: text("prompt_slug"),
  promptVersion: integer("prompt_version"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  userIdx: index("api_usage_user_idx").on(table3.userId),
  modelIdx: index("api_usage_model_idx").on(table3.modelUsed),
  dateIdx: index("api_usage_date_idx").on(table3.createdAt),
  promptIdx: index("api_usage_prompt_idx").on(table3.promptSlug, table3.promptVersion)
}));
var contentLibrary = sqliteTable("content_library", {
  id: text("id").primaryKey(),
  // Basic Information
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  author: text("author"),
  narrator: text("narrator"),
  // For audiobooks
  description: text("description"),
  // Type & Format
  contentType: text("content_type", { enum: ["audiobook", "text", "video"] }).notNull(),
  format: text("format"),
  // 'mp3', 'm4a', 'pdf', 'epub', 'mp4'
  // HSK Classification
  hskLevel: integer("hsk_level"),
  // 1-6
  difficulty: text("difficulty", { enum: ["beginner", "intermediate", "advanced"] }),
  targetAudience: text("target_audience", { enum: ["kids", "teens", "adults"] }),
  // File Information
  r2Key: text("r2_key").notNull(),
  // Path in R2: audiobooks/uuid.mp3
  fileSize: integer("file_size"),
  // Bytes
  duration: integer("duration"),
  // Seconds (for audio/video)
  pageCount: integer("page_count"),
  // For texts
  // Media Assets
  coverImageR2Key: text("cover_image_r2_key"),
  // Cover art in R2
  sampleR2Key: text("sample_r2_key"),
  // Preview clip/excerpt
  // Organization
  category: text("category"),
  // 'fiction', 'non-fiction', 'news', 'podcast'
  genre: text("genre"),
  // 'fantasy', 'history', 'comedy'
  seriesName: text("series_name"),
  // If part of a series
  seriesOrder: integer("series_order"),
  // Episode/chapter number
  // Publishing
  isPublished: integer("is_published", { mode: "boolean" }).default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
  isFree: integer("is_free", { mode: "boolean" }).default(true),
  requiresPremium: integer("requires_premium", { mode: "boolean" }).default(false),
  // Upload Status (for R2 transaction safety)
  uploadStatus: text("upload_status", {
    enum: ["pending_upload", "uploading", "ready", "failed"]
  }).default("ready"),
  // Engagement Metrics
  viewCount: integer("view_count").default(0),
  favoriteCount: integer("favorite_count").default(0),
  averageRating: real("average_rating"),
  // Metadata
  language: text("language").default("zh"),
  // 'zh', 'en', 'zh-en'
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  publishedAt: integer("published_at", { mode: "timestamp" })
}, (table3) => ({
  typeIdx: index("content_type_idx").on(table3.contentType),
  hskIdx: index("content_hsk_idx").on(table3.hskLevel),
  categoryIdx: index("content_category_idx").on(table3.category),
  publishedIdx: index("content_published_idx").on(table3.isPublished),
  featuredIdx: index("content_featured_idx").on(table3.isFeatured)
}));
var tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").unique().notNull(),
  // 'greetings', 'travel', 'business'
  slug: text("slug").unique().notNull(),
  // 'greetings', 'travel', 'business' (url-safe)
  category: text("category", { enum: ["topic", "grammar", "skill", "genre"] }),
  color: text("color"),
  // Hex color for UI: '#3B82F6'
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
});
var contentTags = sqliteTable("content_tags", {
  contentId: text("content_id").notNull().references(() => contentLibrary.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" })
}, (table3) => ({
  pk: primaryKey({ columns: [table3.contentId, table3.tagId] }),
  contentIdx: index("content_tags_content_idx").on(table3.contentId),
  tagIdx: index("content_tags_tag_idx").on(table3.tagId)
}));
var userLibrary = sqliteTable("user_library", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: text("content_id").notNull().references(() => contentLibrary.id, { onDelete: "cascade" }),
  // Status
  isFavorite: integer("is_favorite", { mode: "boolean" }).default(false),
  status: text("status", { enum: ["not_started", "in_progress", "completed"] }).default("not_started"),
  // Progress Tracking
  progressSeconds: integer("progress_seconds").default(0),
  // For audio/video
  progressPage: integer("progress_page").default(0),
  // For texts
  progressPercentage: real("progress_percentage").default(0),
  // 0-100
  // Rating
  userRating: integer("user_rating"),
  // 1-5 stars
  // Timestamps
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  pk: primaryKey({ columns: [table3.userId, table3.contentId] }),
  userIdx: index("user_library_user_idx").on(table3.userId),
  favoritesIdx: index("user_library_favorites_idx").on(table3.userId, table3.isFavorite),
  statusIdx: index("user_library_status_idx").on(table3.userId, table3.status)
}));
var systemEvents = sqliteTable("system_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  requestId: text("request_id"),
  modelUsed: text("model_used"),
  promptSlug: text("prompt_slug"),
  promptVersion: integer("prompt_version"),
  latencyMs: integer("latency_ms"),
  costUsd: real("cost_usd"),
  userId: text("user_id"),
  metadata: text("metadata", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  typeIdx: index("system_events_type_idx").on(table3.eventType),
  createdIdx: index("system_events_created_idx").on(table3.createdAt)
}));
var promptTemplates = sqliteTable("prompt_templates", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  version: integer("version").notNull(),
  status: text("status", { enum: ["draft", "active", "archived"] }).notNull(),
  body: text("body"),
  // Legacy: single prompt body (nullable for pipelines)
  notes: text("notes"),
  metadata: text("metadata", { mode: "json" }),
  // Pipeline support
  steps: text("steps", { mode: "json" }).$type(),
  // Array of pipeline steps
  costLimits: text("cost_limits", { mode: "json" }).$type(),
  // Cost/token limits
  qualityGate: text("quality_gate", { mode: "json" }).$type(),
  // Validation settings
  createdBy: text("created_by"),
  promotedBy: text("promoted_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  slugVersionIdx: index("prompt_templates_slug_version_idx").on(table3.slug, table3.version),
  slugStatusIdx: index("prompt_templates_slug_status_idx").on(table3.slug, table3.status)
}));
var promptTemplateHistory = sqliteTable("prompt_template_history", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  fromVersion: integer("from_version"),
  toVersion: integer("to_version").notNull(),
  reason: text("reason"),
  changedBy: text("changed_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  slugIdx: index("prompt_template_history_slug_idx").on(table3.slug, table3.createdAt)
}));
var stories = sqliteTable("stories", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  author: text("author"),
  // Link to full audiobook/text file in content_library
  contentLibraryId: text("content_library_id").references(() => contentLibrary.id, { onDelete: "set null" }),
  description: text("description"),
  topic: text("topic"),
  // Classification
  hskLevel: integer("hsk_level").notNull(),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).default("medium"),
  estimatedMinutes: integer("estimated_minutes"),
  // Access control
  accessTier: text("access_tier", { enum: ["free", "premium"] }).default("premium"),
  // Cover image
  coverImageR2Key: text("cover_image_r2_key"),
  // Practice blocks (same as lesson blocks - for post-story exercises)
  practiceBlocks: text("practice_blocks", { mode: "json" }),
  // Publishing
  isPublished: integer("is_published", { mode: "boolean" }).default(false),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  hskIdx: index("story_hsk_idx").on(table3.hskLevel),
  publishedIdx: index("story_published_idx").on(table3.isPublished),
  difficultyIdx: index("story_difficulty_idx").on(table3.difficulty)
}));
var storySentences = sqliteTable("story_sentences", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  chinese: text("chinese").notNull(),
  pinyin: text("pinyin").notNull(),
  english: text("english").notNull(),
  audioR2Key: text("audio_r2_key"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  storyIdx: index("story_sentences_story_idx").on(table3.storyId),
  orderIdx: index("story_sentences_order_idx").on(table3.storyId, table3.orderIndex)
}));
var storyVocabulary = sqliteTable("story_vocabulary", {
  storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  vocabId: text("vocab_id").notNull().references(() => vocabulary.id, { onDelete: "cascade" }),
  contextSentence: text("context_sentence")
}, (table3) => ({
  pk: primaryKey({ columns: [table3.storyId, table3.vocabId] }),
  storyIdx: index("story_vocab_story_idx").on(table3.storyId)
}));
var storyQuestions = sqliteTable("story_questions", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  question: text("question").notNull(),
  questionEnglish: text("question_english"),
  questionType: text("question_type", { enum: ["multiple_choice", "true_false", "short_answer"] }).default("multiple_choice"),
  options: text("options", { mode: "json" }),
  // JSON array for multiple choice
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  storyIdx: index("story_questions_story_idx").on(table3.storyId)
}));
var contentExports = sqliteTable("content_exports", {
  id: text("id").primaryKey(),
  contentType: text("content_type", { enum: ["vocabulary", "lessons", "stories"] }).notNull(),
  hskLevel: integer("hsk_level").notNull(),
  version: text("version").notNull(),
  // Semantic versioning: '1.0.5'
  contentHash: text("content_hash").notNull(),
  // SHA256 hash
  fileUrl: text("file_url").notNull(),
  // R2 URL
  exportedBy: text("exported_by"),
  // User ID
  exportedAt: integer("exported_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  fileSizeBytes: integer("file_size_bytes"),
  recordCount: integer("record_count")
}, (table3) => ({
  typeIdx: index("content_exports_type_idx").on(table3.contentType, table3.hskLevel)
}));
var analyticsEventsRaw = sqliteTable("analytics_events_raw", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  userId: text("user_id"),
  sessionId: text("session_id"),
  payload: text("payload", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  createdIdx: index("idx_events_raw_created").on(table3.createdAt),
  typeIdx: index("idx_events_raw_type").on(table3.eventType),
  userIdx: index("idx_events_raw_user").on(table3.userId),
  sessionIdx: index("idx_events_raw_session").on(table3.sessionId)
}));
var analyticsUsersDaily = sqliteTable("analytics_users_daily", {
  date: text("date").primaryKey(),
  // YYYY-MM-DD
  totalUsers: integer("total_users").notNull().default(0),
  newSignups: integer("new_signups").notNull().default(0),
  activeUsers: integer("active_users").notNull().default(0),
  returningUsers: integer("returning_users").notNull().default(0),
  avgSessionDurationSeconds: integer("avg_session_duration_seconds").default(0),
  totalSessions: integer("total_sessions").default(0)
});
var analyticsRetentionCohorts = sqliteTable("analytics_retention_cohorts", {
  cohortWeek: text("cohort_week").notNull(),
  // '2024-W03'
  weekNumber: integer("week_number").notNull(),
  // 0, 1, 2, 3...
  usersInCohort: integer("users_in_cohort").notNull(),
  usersRetained: integer("users_retained").notNull(),
  retentionRate: real("retention_rate")
}, (table3) => ({
  pk: primaryKey({ columns: [table3.cohortWeek, table3.weekNumber] }),
  cohortIdx: index("idx_retention_cohort_week").on(table3.cohortWeek)
}));
var analyticsTierDaily = sqliteTable("analytics_tier_daily", {
  date: text("date").notNull(),
  tier: text("tier", { enum: ["free", "premium", "pro"] }).notNull(),
  userCount: integer("user_count").notNull().default(0)
}, (table3) => ({
  pk: primaryKey({ columns: [table3.date, table3.tier] })
}));
var analyticsContentDaily = sqliteTable("analytics_content_daily", {
  date: text("date").notNull(),
  contentType: text("content_type").notNull(),
  // 'lesson' | 'story' | 'vocabulary'
  totalViews: integer("total_views").default(0),
  totalStarts: integer("total_starts").default(0),
  totalCompletions: integer("total_completions").default(0),
  uniqueUsers: integer("unique_users").default(0),
  avgTimeSeconds: integer("avg_time_seconds").default(0),
  totalTimeSeconds: integer("total_time_seconds").default(0)
}, (table3) => ({
  pk: primaryKey({ columns: [table3.date, table3.contentType] })
}));
var analyticsLessonDaily = sqliteTable("analytics_lesson_daily", {
  date: text("date").notNull(),
  lessonId: text("lesson_id").notNull(),
  views: integer("views").default(0),
  starts: integer("starts").default(0),
  completions: integer("completions").default(0),
  uniqueUsers: integer("unique_users").default(0),
  avgScore: real("avg_score").default(0),
  avgTimeSeconds: integer("avg_time_seconds").default(0)
}, (table3) => ({
  pk: primaryKey({ columns: [table3.date, table3.lessonId] }),
  lessonIdx: index("idx_lesson_daily_lesson").on(table3.lessonId)
}));
var analyticsStoryDaily = sqliteTable("analytics_story_daily", {
  date: text("date").notNull(),
  storyId: text("story_id").notNull(),
  views: integer("views").default(0),
  starts: integer("starts").default(0),
  completions: integer("completions").default(0),
  uniqueUsers: integer("unique_users").default(0),
  avgTimeSeconds: integer("avg_time_seconds").default(0)
}, (table3) => ({
  pk: primaryKey({ columns: [table3.date, table3.storyId] }),
  storyIdx: index("idx_story_daily_story").on(table3.storyId)
}));
var analyticsHskDaily = sqliteTable("analytics_hsk_daily", {
  date: text("date").notNull(),
  hskLevel: integer("hsk_level").notNull(),
  lessonViews: integer("lesson_views").default(0),
  lessonCompletions: integer("lesson_completions").default(0),
  storyViews: integer("story_views").default(0),
  storyCompletions: integer("story_completions").default(0),
  vocabReviews: integer("vocab_reviews").default(0),
  uniqueUsers: integer("unique_users").default(0)
}, (table3) => ({
  pk: primaryKey({ columns: [table3.date, table3.hskLevel] })
}));
var analyticsVocabProgress = sqliteTable("analytics_vocab_progress", {
  date: text("date").primaryKey(),
  wordsNew: integer("words_new").default(0),
  wordsWeak: integer("words_weak").default(0),
  wordsLearning: integer("words_learning").default(0),
  wordsMastered: integer("words_mastered").default(0),
  totalReviews: integer("total_reviews").default(0),
  uniqueUsers: integer("unique_users").default(0)
});
var engagementEventsRaw = sqliteTable("engagement_events_raw", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  // lesson.started, lesson.completed, etc.
  contentId: text("content_id").notNull(),
  contentType: text("content_type").notNull(),
  // lesson | story | vocab
  hskLevel: integer("hsk_level"),
  timestamp: text("timestamp").notNull(),
  // ISO 8601
  timeSeconds: integer("time_seconds"),
  payload: text("payload", { mode: "json" }),
  processed: integer("processed", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
}, (table3) => ({
  typeIdx: index("idx_engagement_events_type").on(table3.eventType),
  contentIdx: index("idx_engagement_events_content").on(table3.contentId, table3.contentType),
  processedIdx: index("idx_engagement_events_processed").on(table3.processed),
  createdIdx: index("idx_engagement_events_created").on(table3.createdAt)
}));
var analyticsLessonStats = sqliteTable("analytics_lesson_stats", {
  lessonId: text("lesson_id").primaryKey(),
  totalStarts: integer("total_starts").default(0),
  totalCompletions: integer("total_completions").default(0),
  totalAbandons: integer("total_abandons").default(0),
  avgTimeSeconds: integer("avg_time_seconds").default(0),
  minTimeSeconds: integer("min_time_seconds").default(0),
  maxTimeSeconds: integer("max_time_seconds").default(0),
  medianTimeSeconds: integer("median_time_seconds").default(0),
  p90TimeSeconds: integer("p90_time_seconds").default(0),
  totalTimeSeconds: integer("total_time_seconds").default(0),
  avgScore: real("avg_score").default(0),
  completionRate: real("completion_rate").default(0),
  blockStats: text("block_stats", { mode: "json" }),
  // JSON: [{ index, type, avgTime, completions, dropOffs }]
  firstEventAt: text("first_event_at"),
  lastEventAt: text("last_event_at"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
});
var analyticsStoryStats = sqliteTable("analytics_story_stats", {
  storyId: text("story_id").primaryKey(),
  totalStarts: integer("total_starts").default(0),
  totalCompletions: integer("total_completions").default(0),
  totalAbandons: integer("total_abandons").default(0),
  avgTimeSeconds: integer("avg_time_seconds").default(0),
  minTimeSeconds: integer("min_time_seconds").default(0),
  maxTimeSeconds: integer("max_time_seconds").default(0),
  totalTimeSeconds: integer("total_time_seconds").default(0),
  avgSentencesRead: real("avg_sentences_read").default(0),
  completionRate: real("completion_rate").default(0),
  sentenceStats: text("sentence_stats", { mode: "json" }),
  // JSON: [{ index, avgTime, reads, dropOffs }]
  firstEventAt: text("first_event_at"),
  lastEventAt: text("last_event_at"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
});
var analyticsVocabStats = sqliteTable("analytics_vocab_stats", {
  vocabId: text("vocab_id").primaryKey(),
  totalReviews: integer("total_reviews").default(0),
  correctCount: integer("correct_count").default(0),
  incorrectCount: integer("incorrect_count").default(0),
  avgResponseTimeMs: integer("avg_response_time_ms").default(0),
  accuracyRate: real("accuracy_rate").default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`)
});
var analyticsEngagementDaily = sqliteTable("analytics_engagement_daily", {
  date: text("date").notNull(),
  contentType: text("content_type").notNull(),
  // lesson | story | vocab
  totalEvents: integer("total_events").default(0),
  totalStarts: integer("total_starts").default(0),
  totalCompletions: integer("total_completions").default(0),
  totalTimeSeconds: integer("total_time_seconds").default(0),
  avgCompletionRate: real("avg_completion_rate").default(0)
}, (table3) => ({
  pk: primaryKey({ columns: [table3.date, table3.contentType] }),
  dateIdx: index("idx_engagement_daily_date").on(table3.date)
}));

// src/routes/lessons.ts
var app = new Hono2();
app.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const allLessons = await db.select().from(lessons).where(eq(lessons.isPublished, true));
  return c.json(allLessons);
});
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB);
  const lessonResult = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  const lesson = lessonResult[0];
  if (!lesson) {
    return c.json({ error: "Lesson not found" }, 404);
  }
  const blocks = await db.select().from(lessonBlocks).where(eq(lessonBlocks.lessonId, id)).orderBy(asc(lessonBlocks.orderIndex));
  return c.json({
    ...lesson,
    blocks: blocks.map((b) => ({
      id: b.id,
      type: b.type,
      ...b.content
      // Spread the JSON content
    }))
  });
});
var lessons_default = app;

// src/routes/admin.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/index.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  __name(assertIs, "assertIs");
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  __name(assertNever, "assertNever");
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  __name(joinValues, "joinValues");
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = /* @__PURE__ */ __name((data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
}, "getParsedType");

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = /* @__PURE__ */ __name((obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
}, "quotelessJson");
var ZodError = class _ZodError extends Error {
  static {
    __name(this, "ZodError");
  }
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = /* @__PURE__ */ __name((error3) => {
      for (const issue of error3.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }, "processError");
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error3 = new ZodError(issues);
  return error3;
};

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = /* @__PURE__ */ __name((issue, _ctx) => {
  let message2;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message2 = "Required";
      } else {
        message2 = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message2 = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message2 = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message2 = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message2 = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message2 = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message2 = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message2 = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message2 = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message2 = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message2 = `${message2} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message2 = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message2 = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message2 = `Invalid ${issue.validation}`;
      } else {
        message2 = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message2 = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message2 = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message2 = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message2 = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message2 = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message2 = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message2 = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message2 = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message2 = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message2 = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message2 = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message2 = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message2 = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message2 = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message2 = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message2 = "Number must be finite";
      break;
    default:
      message2 = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message: message2 };
}, "errorMap");
var en_default = errorMap;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
__name(setErrorMap, "setErrorMap");
function getErrorMap() {
  return overrideErrorMap;
}
__name(getErrorMap, "getErrorMap");

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var makeIssue = /* @__PURE__ */ __name((params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
}, "makeIssue");
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
__name(addIssueToContext, "addIssueToContext");
var ParseStatus = class _ParseStatus {
  static {
    __name(this, "ParseStatus");
  }
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = /* @__PURE__ */ __name((value) => ({ status: "dirty", value }), "DIRTY");
var OK = /* @__PURE__ */ __name((value) => ({ status: "valid", value }), "OK");
var isAborted = /* @__PURE__ */ __name((x) => x.status === "aborted", "isAborted");
var isDirty = /* @__PURE__ */ __name((x) => x.status === "dirty", "isDirty");
var isValid = /* @__PURE__ */ __name((x) => x.status === "valid", "isValid");
var isAsync = /* @__PURE__ */ __name((x) => typeof Promise !== "undefined" && x instanceof Promise, "isAsync");

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message2) => typeof message2 === "string" ? { message: message2 } : message2 || {};
  errorUtil2.toString = (message2) => typeof message2 === "string" ? message2 : message2?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  static {
    __name(this, "ParseInputLazyPath");
  }
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = /* @__PURE__ */ __name((ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error3 = new ZodError(ctx.common.issues);
        this._error = error3;
        return this._error;
      }
    };
  }
}, "handleResult");
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = /* @__PURE__ */ __name((iss, ctx) => {
    const { message: message2 } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message2 ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message2 ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message2 ?? invalid_type_error ?? ctx.defaultError };
  }, "customMap");
  return { errorMap: customMap, description };
}
__name(processCreateParams, "processCreateParams");
var ZodType = class {
  static {
    __name(this, "ZodType");
  }
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message2) {
    const getIssueProperties = /* @__PURE__ */ __name((val) => {
      if (typeof message2 === "string" || typeof message2 === "undefined") {
        return { message: message2 };
      } else if (typeof message2 === "function") {
        return message2(val);
      } else {
        return message2;
      }
    }, "getIssueProperties");
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = /* @__PURE__ */ __name(() => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      }), "setError");
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: /* @__PURE__ */ __name((data) => this["~validate"](data), "validate")
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
__name(timeRegexSource, "timeRegexSource");
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
__name(timeRegex, "timeRegex");
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
__name(datetimeRegex, "datetimeRegex");
function isValidIP(ip, version3) {
  if ((version3 === "v4" || !version3) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version3 === "v6" || !version3) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidIP, "isValidIP");
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
__name(isValidJWT, "isValidJWT");
function isValidCidr(ip, version3) {
  if ((version3 === "v4" || !version3) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version3 === "v6" || !version3) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidCidr, "isValidCidr");
var ZodString = class _ZodString extends ZodType {
  static {
    __name(this, "ZodString");
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message2) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message2)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message2) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message2) });
  }
  url(message2) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message2) });
  }
  emoji(message2) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message2) });
  }
  uuid(message2) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message2) });
  }
  nanoid(message2) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message2) });
  }
  cuid(message2) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message2) });
  }
  cuid2(message2) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message2) });
  }
  ulid(message2) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message2) });
  }
  base64(message2) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message2) });
  }
  base64url(message2) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message2)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message2) {
    return this._addCheck({ kind: "date", message: message2 });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message2) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message2) });
  }
  regex(regex, message2) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message2)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message2) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message2)
    });
  }
  endsWith(value, message2) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message2)
    });
  }
  min(minLength, message2) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message2)
    });
  }
  max(maxLength, message2) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message2)
    });
  }
  length(len, message2) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message2)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message2) {
    return this.min(1, errorUtil.errToObj(message2));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
__name(floatSafeRemainder, "floatSafeRemainder");
var ZodNumber = class _ZodNumber extends ZodType {
  static {
    __name(this, "ZodNumber");
  }
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message2) {
    return this.setLimit("min", value, true, errorUtil.toString(message2));
  }
  gt(value, message2) {
    return this.setLimit("min", value, false, errorUtil.toString(message2));
  }
  lte(value, message2) {
    return this.setLimit("max", value, true, errorUtil.toString(message2));
  }
  lt(value, message2) {
    return this.setLimit("max", value, false, errorUtil.toString(message2));
  }
  setLimit(kind, value, inclusive, message2) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message2)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message2) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message2)
    });
  }
  positive(message2) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message2)
    });
  }
  negative(message2) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message2)
    });
  }
  nonpositive(message2) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message2)
    });
  }
  nonnegative(message2) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message2)
    });
  }
  multipleOf(value, message2) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message2)
    });
  }
  finite(message2) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message2)
    });
  }
  safe(message2) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message2)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message2)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  static {
    __name(this, "ZodBigInt");
  }
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message2) {
    return this.setLimit("min", value, true, errorUtil.toString(message2));
  }
  gt(value, message2) {
    return this.setLimit("min", value, false, errorUtil.toString(message2));
  }
  lte(value, message2) {
    return this.setLimit("max", value, true, errorUtil.toString(message2));
  }
  lt(value, message2) {
    return this.setLimit("max", value, false, errorUtil.toString(message2));
  }
  setLimit(kind, value, inclusive, message2) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message2)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message2) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message2)
    });
  }
  negative(message2) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message2)
    });
  }
  nonpositive(message2) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message2)
    });
  }
  nonnegative(message2) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message2)
    });
  }
  multipleOf(value, message2) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message2)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  static {
    __name(this, "ZodBoolean");
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  static {
    __name(this, "ZodDate");
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message2) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message2)
    });
  }
  max(maxDate, message2) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message2)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  static {
    __name(this, "ZodSymbol");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  static {
    __name(this, "ZodUndefined");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  static {
    __name(this, "ZodNull");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  static {
    __name(this, "ZodAny");
  }
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  static {
    __name(this, "ZodUnknown");
  }
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  static {
    __name(this, "ZodNever");
  }
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  static {
    __name(this, "ZodVoid");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  static {
    __name(this, "ZodArray");
  }
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message2) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message2) }
    });
  }
  max(maxLength, message2) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message2) }
    });
  }
  length(len, message2) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message2) }
    });
  }
  nonempty(message2) {
    return this.min(1, message2);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
__name(deepPartialify, "deepPartialify");
var ZodObject = class _ZodObject extends ZodType {
  static {
    __name(this, "ZodObject");
  }
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message2) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message2 !== void 0 ? {
        errorMap: /* @__PURE__ */ __name((issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message2).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }, "errorMap")
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => ({
        ...this._def.shape(),
        ...augmentation
      }), "shape")
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: /* @__PURE__ */ __name(() => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }), "shape"),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index2) {
    return new _ZodObject({
      ...this._def,
      catchall: index2
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => shape, "shape")
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => shape, "shape")
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: /* @__PURE__ */ __name(() => shape, "shape"),
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: /* @__PURE__ */ __name(() => shape, "shape"),
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  static {
    __name(this, "ZodUnion");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    __name(handleResults, "handleResults");
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = /* @__PURE__ */ __name((type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
}, "getDiscriminator");
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  static {
    __name(this, "ZodDiscriminatedUnion");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index2 = 0; index2 < a.length; index2++) {
      const itemA = a[index2];
      const itemB = b[index2];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
__name(mergeValues, "mergeValues");
var ZodIntersection = class extends ZodType {
  static {
    __name(this, "ZodIntersection");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = /* @__PURE__ */ __name((parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    }, "handleParsed");
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  static {
    __name(this, "ZodTuple");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  static {
    __name(this, "ZodRecord");
  }
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  static {
    __name(this, "ZodMap");
  }
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index2) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index2, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index2, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  static {
    __name(this, "ZodSet");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    __name(finalizeSet, "finalizeSet");
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message2) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message2) }
    });
  }
  max(maxSize, message2) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message2) }
    });
  }
  size(size, message2) {
    return this.min(size, message2).max(size, message2);
  }
  nonempty(message2) {
    return this.min(1, message2);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  static {
    __name(this, "ZodFunction");
  }
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error3) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error3
        }
      });
    }
    __name(makeArgsIssue, "makeArgsIssue");
    function makeReturnsIssue(returns, error3) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error3
        }
      });
    }
    __name(makeReturnsIssue, "makeReturnsIssue");
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error3 = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error3.addIssue(makeArgsIssue(args, e));
          throw error3;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error3.addIssue(makeReturnsIssue(result, e));
          throw error3;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  static {
    __name(this, "ZodLazy");
  }
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  static {
    __name(this, "ZodLiteral");
  }
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
__name(createZodEnum, "createZodEnum");
var ZodEnum = class _ZodEnum extends ZodType {
  static {
    __name(this, "ZodEnum");
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  static {
    __name(this, "ZodNativeEnum");
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  static {
    __name(this, "ZodPromise");
  }
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  static {
    __name(this, "ZodEffects");
  }
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: /* @__PURE__ */ __name((arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      }, "addIssue"),
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = /* @__PURE__ */ __name((acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      }, "executeRefinement");
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  static {
    __name(this, "ZodOptional");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  static {
    __name(this, "ZodNullable");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  static {
    __name(this, "ZodDefault");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  static {
    __name(this, "ZodCatch");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  static {
    __name(this, "ZodNaN");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  static {
    __name(this, "ZodBranded");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  static {
    __name(this, "ZodPipeline");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = /* @__PURE__ */ __name(async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }, "handleAsync");
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  static {
    __name(this, "ZodReadonly");
  }
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = /* @__PURE__ */ __name((data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    }, "freeze");
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
__name(cleanParams, "cleanParams");
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
__name(custom, "custom");
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = /* @__PURE__ */ __name((cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params), "instanceOfType");
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = /* @__PURE__ */ __name(() => stringType().optional(), "ostring");
var onumber = /* @__PURE__ */ __name(() => numberType().optional(), "onumber");
var oboolean = /* @__PURE__ */ __name(() => booleanType().optional(), "oboolean");
var coerce = {
  string: /* @__PURE__ */ __name((arg) => ZodString.create({ ...arg, coerce: true }), "string"),
  number: /* @__PURE__ */ __name((arg) => ZodNumber.create({ ...arg, coerce: true }), "number"),
  boolean: /* @__PURE__ */ __name((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }), "boolean"),
  bigint: /* @__PURE__ */ __name((arg) => ZodBigInt.create({ ...arg, coerce: true }), "bigint"),
  date: /* @__PURE__ */ __name((arg) => ZodDate.create({ ...arg, coerce: true }), "date")
};
var NEVER = INVALID;

// node_modules/.pnpm/@hono+zod-validator@0.7.5_hono@4.10.6_zod@3.25.76/node_modules/@hono/zod-validator/dist/index.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/validator/index.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/validator/validator.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/helper/cookie/index.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/utils/cookie.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var parse = /* @__PURE__ */ __name((cookie, name) => {
  if (name && cookie.indexOf(name) === -1) {
    return {};
  }
  const pairs = cookie.trim().split(";");
  const parsedCookie = {};
  for (let pairStr of pairs) {
    pairStr = pairStr.trim();
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      continue;
    }
    const cookieName = pairStr.substring(0, valueStartPos).trim();
    if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName)) {
      continue;
    }
    let cookieValue = pairStr.substring(valueStartPos + 1).trim();
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = cookieValue.indexOf("%") !== -1 ? tryDecode(cookieValue, decodeURIComponent_) : cookieValue;
      if (name) {
        break;
      }
    }
  }
  return parsedCookie;
}, "parse");

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/helper/cookie/index.js
var getCookie = /* @__PURE__ */ __name((c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = parse(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
}, "getCookie");

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/utils/buffer.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/utils/crypto.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      "Content-Type": contentType
    }
  });
  return response.formData();
}, "bufferToFormData");

// node_modules/.pnpm/hono@4.10.6/node_modules/hono/dist/validator/validator.js
var jsonRegex = /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/;
var multipartRegex = /^multipart\/form-data(;\s?boundary=[a-zA-Z0-9'"()+_,\-./:=?]+)?$/;
var urlencodedRegex = /^application\/x-www-form-urlencoded(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/;
var validator = /* @__PURE__ */ __name((target, validationFunc) => {
  return async (c, next) => {
    let value = {};
    const contentType = c.req.header("Content-Type");
    switch (target) {
      case "json":
        if (!contentType || !jsonRegex.test(contentType)) {
          break;
        }
        try {
          value = await c.req.json();
        } catch {
          const message2 = "Malformed JSON in request body";
          throw new HTTPException(400, { message: message2 });
        }
        break;
      case "form": {
        if (!contentType || !(multipartRegex.test(contentType) || urlencodedRegex.test(contentType))) {
          break;
        }
        let formData;
        if (c.req.bodyCache.formData) {
          formData = await c.req.bodyCache.formData;
        } else {
          try {
            const arrayBuffer = await c.req.arrayBuffer();
            formData = await bufferToFormData(arrayBuffer, contentType);
            c.req.bodyCache.formData = formData;
          } catch (e) {
            let message2 = "Malformed FormData request.";
            message2 += e instanceof Error ? ` ${e.message}` : ` ${String(e)}`;
            throw new HTTPException(400, { message: message2 });
          }
        }
        const form = {};
        formData.forEach((value2, key) => {
          if (key.endsWith("[]")) {
            ;
            (form[key] ??= []).push(value2);
          } else if (Array.isArray(form[key])) {
            ;
            form[key].push(value2);
          } else if (key in form) {
            form[key] = [form[key], value2];
          } else {
            form[key] = value2;
          }
        });
        value = form;
        break;
      }
      case "query":
        value = Object.fromEntries(
          Object.entries(c.req.queries()).map(([k, v]) => {
            return v.length === 1 ? [k, v[0]] : [k, v];
          })
        );
        break;
      case "param":
        value = c.req.param();
        break;
      case "header":
        value = c.req.header();
        break;
      case "cookie":
        value = getCookie(c);
        break;
    }
    const res = await validationFunc(value, c);
    if (res instanceof Response) {
      return res;
    }
    c.req.addValidatedData(target, res);
    return await next();
  };
}, "validator");

// node_modules/.pnpm/@hono+zod-validator@0.7.5_hono@4.10.6_zod@3.25.76/node_modules/@hono/zod-validator/dist/index.js
function zValidatorFunction(target, schema, hook, options) {
  return validator(target, async (value, c) => {
    let validatorValue = value;
    if (target === "header" && "_def" in schema || target === "header" && "_zod" in schema) {
      const schemaKeys = Object.keys("in" in schema ? schema.in.shape : schema.shape);
      const caseInsensitiveKeymap = Object.fromEntries(schemaKeys.map((key) => [key.toLowerCase(), key]));
      validatorValue = Object.fromEntries(Object.entries(value).map(([key, value$1]) => [caseInsensitiveKeymap[key] || key, value$1]));
    }
    const result = options && options.validationFunction ? await options.validationFunction(schema, validatorValue) : await schema.safeParseAsync(validatorValue);
    if (hook) {
      const hookResult = await hook({
        data: validatorValue,
        ...result,
        target
      }, c);
      if (hookResult) {
        if (hookResult instanceof Response) return hookResult;
        if ("response" in hookResult) return hookResult.response;
      }
    }
    if (!result.success) return c.json(result, 400);
    return result.data;
  });
}
__name(zValidatorFunction, "zValidatorFunction");
var zValidator = zValidatorFunction;

// src/middleware/auth.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/index.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/util/base64url.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/buffer_utils.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}
__name(concat, "concat");
function encode(string) {
  const bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code > 127) {
      throw new TypeError("non-ASCII string encountered in encode()");
    }
    bytes[i] = code;
  }
  return bytes;
}
__name(encode, "encode");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/base64.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function decodeBase64(encoded) {
  if (Uint8Array.fromBase64) {
    return Uint8Array.fromBase64(encoded);
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
__name(decodeBase64, "decodeBase64");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/util/base64url.js
function decode(input) {
  if (Uint8Array.fromBase64) {
    return Uint8Array.fromBase64(typeof input === "string" ? input : decoder.decode(input), {
      alphabet: "base64url"
    });
  }
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeBase64(encoded);
  } catch {
    throw new TypeError("The input to be decoded is not correctly encoded.");
  }
}
__name(decode, "decode");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/util/errors.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var JOSEError = class extends Error {
  static {
    __name(this, "JOSEError");
  }
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(message2, options) {
    super(message2, options);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
};
var JWTClaimValidationFailed = class extends JOSEError {
  static {
    __name(this, "JWTClaimValidationFailed");
  }
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
var JWTExpired = class extends JOSEError {
  static {
    __name(this, "JWTExpired");
  }
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
var JOSEAlgNotAllowed = class extends JOSEError {
  static {
    __name(this, "JOSEAlgNotAllowed");
  }
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
};
var JOSENotSupported = class extends JOSEError {
  static {
    __name(this, "JOSENotSupported");
  }
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
};
var JWSInvalid = class extends JOSEError {
  static {
    __name(this, "JWSInvalid");
  }
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
};
var JWTInvalid = class extends JOSEError {
  static {
    __name(this, "JWTInvalid");
  }
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
};
var JWKSInvalid = class extends JOSEError {
  static {
    __name(this, "JWKSInvalid");
  }
  static code = "ERR_JWKS_INVALID";
  code = "ERR_JWKS_INVALID";
};
var JWKSNoMatchingKey = class extends JOSEError {
  static {
    __name(this, "JWKSNoMatchingKey");
  }
  static code = "ERR_JWKS_NO_MATCHING_KEY";
  code = "ERR_JWKS_NO_MATCHING_KEY";
  constructor(message2 = "no applicable key found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSMultipleMatchingKeys = class extends JOSEError {
  static {
    __name(this, "JWKSMultipleMatchingKeys");
  }
  [Symbol.asyncIterator];
  static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  constructor(message2 = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSTimeout = class extends JOSEError {
  static {
    __name(this, "JWKSTimeout");
  }
  static code = "ERR_JWKS_TIMEOUT";
  code = "ERR_JWKS_TIMEOUT";
  constructor(message2 = "request timed out", options) {
    super(message2, options);
  }
};
var JWSSignatureVerificationFailed = class extends JOSEError {
  static {
    __name(this, "JWSSignatureVerificationFailed");
  }
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
  }
};

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/crypto_key.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var unusable = /* @__PURE__ */ __name((name, prop = "algorithm.name") => new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`), "unusable");
var isAlgorithm = /* @__PURE__ */ __name((algorithm, name) => algorithm.name === name, "isAlgorithm");
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
__name(getHashLength, "getHashLength");
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error("unreachable");
  }
}
__name(getNamedCurve, "getNamedCurve");
function checkUsage(key, usage) {
  if (usage && !key.usages.includes(usage)) {
    throw new TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
  }
}
__name(checkUsage, "checkUsage");
function checkSigCryptoKey(key, alg, usage) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC"))
        throw unusable("HMAC");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5"))
        throw unusable("RSASSA-PKCS1-v1_5");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS"))
        throw unusable("RSA-PSS");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "Ed25519":
    case "EdDSA": {
      if (!isAlgorithm(key.algorithm, "Ed25519"))
        throw unusable("Ed25519");
      break;
    }
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87": {
      if (!isAlgorithm(key.algorithm, alg))
        throw unusable(alg);
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA"))
        throw unusable("ECDSA");
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected)
        throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usage);
}
__name(checkSigCryptoKey, "checkSigCryptoKey");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/invalid_key_input.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function message(msg, actual, ...types) {
  types = types.filter(Boolean);
  if (types.length > 2) {
    const last = types.pop();
    msg += `one of type ${types.join(", ")}, or ${last}.`;
  } else if (types.length === 2) {
    msg += `one of type ${types[0]} or ${types[1]}.`;
  } else {
    msg += `of type ${types[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === "function" && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
__name(message, "message");
var invalidKeyInput = /* @__PURE__ */ __name((actual, ...types) => message("Key must be ", actual, ...types), "invalidKeyInput");
var withAlg = /* @__PURE__ */ __name((alg, actual, ...types) => message(`Key for the ${alg} algorithm must be `, actual, ...types), "withAlg");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/is_key_like.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var isCryptoKey = /* @__PURE__ */ __name((key) => {
  if (key?.[Symbol.toStringTag] === "CryptoKey")
    return true;
  try {
    return key instanceof CryptoKey;
  } catch {
    return false;
  }
}, "isCryptoKey");
var isKeyObject = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag] === "KeyObject", "isKeyObject");
var isKeyLike = /* @__PURE__ */ __name((key) => isCryptoKey(key) || isKeyObject(key), "isKeyLike");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/is_disjoint.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function isDisjoint(...headers) {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
}
__name(isDisjoint, "isDisjoint");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/is_object.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var isObjectLike = /* @__PURE__ */ __name((value) => typeof value === "object" && value !== null, "isObjectLike");
function isObject(input) {
  if (!isObjectLike(input) || Object.prototype.toString.call(input) !== "[object Object]") {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}
__name(isObject, "isObject");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/check_key_length.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function checkKeyLength(alg, key) {
  if (alg.startsWith("RS") || alg.startsWith("PS")) {
    const { modulusLength } = key.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048) {
      throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
    }
  }
}
__name(checkKeyLength, "checkKeyLength");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/key/import.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/jwk_to_key.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function subtleMapping(jwk) {
  let algorithm;
  let keyUsages;
  switch (jwk.kty) {
    case "AKP": {
      switch (jwk.alg) {
        case "ML-DSA-44":
        case "ML-DSA-65":
        case "ML-DSA-87":
          algorithm = { name: jwk.alg };
          keyUsages = jwk.priv ? ["sign"] : ["verify"];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "RSA": {
      switch (jwk.alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          algorithm = { name: "RSA-PSS", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          algorithm = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          algorithm = {
            name: "RSA-OAEP",
            hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`
          };
          keyUsages = jwk.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "EC": {
      switch (jwk.alg) {
        case "ES256":
          algorithm = { name: "ECDSA", namedCurve: "P-256" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES384":
          algorithm = { name: "ECDSA", namedCurve: "P-384" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES512":
          algorithm = { name: "ECDSA", namedCurve: "P-521" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: "ECDH", namedCurve: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "OKP": {
      switch (jwk.alg) {
        case "Ed25519":
        case "EdDSA":
          algorithm = { name: "Ed25519" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    default:
      throw new JOSENotSupported('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return { algorithm, keyUsages };
}
__name(subtleMapping, "subtleMapping");
async function jwkToKey(jwk) {
  if (!jwk.alg) {
    throw new TypeError('"alg" argument is required when "jwk.alg" is not present');
  }
  const { algorithm, keyUsages } = subtleMapping(jwk);
  const keyData = { ...jwk };
  if (keyData.kty !== "AKP") {
    delete keyData.alg;
  }
  delete keyData.use;
  return crypto.subtle.importKey("jwk", keyData, algorithm, jwk.ext ?? (jwk.d || jwk.priv ? false : true), jwk.key_ops ?? keyUsages);
}
__name(jwkToKey, "jwkToKey");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/key/import.js
async function importJWK(jwk, alg, options) {
  if (!isObject(jwk)) {
    throw new TypeError("JWK must be an object");
  }
  let ext;
  alg ??= jwk.alg;
  ext ??= options?.extractable ?? jwk.ext;
  switch (jwk.kty) {
    case "oct":
      if (typeof jwk.k !== "string" || !jwk.k) {
        throw new TypeError('missing "k" (Key Value) Parameter value');
      }
      return decode(jwk.k);
    case "RSA":
      if ("oth" in jwk && jwk.oth !== void 0) {
        throw new JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
      }
      return jwkToKey({ ...jwk, alg, ext });
    case "AKP": {
      if (typeof jwk.alg !== "string" || !jwk.alg) {
        throw new TypeError('missing "alg" (Algorithm) Parameter value');
      }
      if (alg !== void 0 && alg !== jwk.alg) {
        throw new TypeError("JWK alg and alg option value mismatch");
      }
      return jwkToKey({ ...jwk, ext });
    }
    case "EC":
    case "OKP":
      return jwkToKey({ ...jwk, alg, ext });
    default:
      throw new JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
  }
}
__name(importJWK, "importJWK");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/validate_crit.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) {
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  }
  if (!protectedHeader || protectedHeader.crit === void 0) {
    return /* @__PURE__ */ new Set();
  }
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)) {
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  }
  let recognized;
  if (recognizedOption !== void 0) {
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    }
    if (joseHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
    }
  }
  return new Set(protectedHeader.crit);
}
__name(validateCrit, "validateCrit");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/validate_algorithms.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function validateAlgorithms(option, algorithms) {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return void 0;
  }
  return new Set(algorithms);
}
__name(validateAlgorithms, "validateAlgorithms");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/normalize_key.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/is_jwk.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var isJWK = /* @__PURE__ */ __name((key) => isObject(key) && typeof key.kty === "string", "isJWK");
var isPrivateJWK = /* @__PURE__ */ __name((key) => key.kty !== "oct" && (key.kty === "AKP" && typeof key.priv === "string" || typeof key.d === "string"), "isPrivateJWK");
var isPublicJWK = /* @__PURE__ */ __name((key) => key.kty !== "oct" && key.d === void 0 && key.priv === void 0, "isPublicJWK");
var isSecretJWK = /* @__PURE__ */ __name((key) => key.kty === "oct" && typeof key.k === "string", "isSecretJWK");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/normalize_key.js
var cache;
var handleJWK = /* @__PURE__ */ __name(async (key, jwk, alg, freeze = false) => {
  cache ||= /* @__PURE__ */ new WeakMap();
  let cached = cache.get(key);
  if (cached?.[alg]) {
    return cached[alg];
  }
  const cryptoKey = await jwkToKey({ ...jwk, alg });
  if (freeze)
    Object.freeze(key);
  if (!cached) {
    cache.set(key, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
}, "handleJWK");
var handleKeyObject = /* @__PURE__ */ __name((keyObject, alg) => {
  cache ||= /* @__PURE__ */ new WeakMap();
  let cached = cache.get(keyObject);
  if (cached?.[alg]) {
    return cached[alg];
  }
  const isPublic = keyObject.type === "public";
  const extractable = isPublic ? true : false;
  let cryptoKey;
  if (keyObject.asymmetricKeyType === "x25519") {
    switch (alg) {
      case "ECDH-ES":
      case "ECDH-ES+A128KW":
      case "ECDH-ES+A192KW":
      case "ECDH-ES+A256KW":
        break;
      default:
        throw new TypeError("given KeyObject instance cannot be used for this algorithm");
    }
    cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, isPublic ? [] : ["deriveBits"]);
  }
  if (keyObject.asymmetricKeyType === "ed25519") {
    if (alg !== "EdDSA" && alg !== "Ed25519") {
      throw new TypeError("given KeyObject instance cannot be used for this algorithm");
    }
    cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, [
      isPublic ? "verify" : "sign"
    ]);
  }
  switch (keyObject.asymmetricKeyType) {
    case "ml-dsa-44":
    case "ml-dsa-65":
    case "ml-dsa-87": {
      if (alg !== keyObject.asymmetricKeyType.toUpperCase()) {
        throw new TypeError("given KeyObject instance cannot be used for this algorithm");
      }
      cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, [
        isPublic ? "verify" : "sign"
      ]);
    }
  }
  if (keyObject.asymmetricKeyType === "rsa") {
    let hash;
    switch (alg) {
      case "RSA-OAEP":
        hash = "SHA-1";
        break;
      case "RS256":
      case "PS256":
      case "RSA-OAEP-256":
        hash = "SHA-256";
        break;
      case "RS384":
      case "PS384":
      case "RSA-OAEP-384":
        hash = "SHA-384";
        break;
      case "RS512":
      case "PS512":
      case "RSA-OAEP-512":
        hash = "SHA-512";
        break;
      default:
        throw new TypeError("given KeyObject instance cannot be used for this algorithm");
    }
    if (alg.startsWith("RSA-OAEP")) {
      return keyObject.toCryptoKey({
        name: "RSA-OAEP",
        hash
      }, extractable, isPublic ? ["encrypt"] : ["decrypt"]);
    }
    cryptoKey = keyObject.toCryptoKey({
      name: alg.startsWith("PS") ? "RSA-PSS" : "RSASSA-PKCS1-v1_5",
      hash
    }, extractable, [isPublic ? "verify" : "sign"]);
  }
  if (keyObject.asymmetricKeyType === "ec") {
    const nist = /* @__PURE__ */ new Map([
      ["prime256v1", "P-256"],
      ["secp384r1", "P-384"],
      ["secp521r1", "P-521"]
    ]);
    const namedCurve = nist.get(keyObject.asymmetricKeyDetails?.namedCurve);
    if (!namedCurve) {
      throw new TypeError("given KeyObject instance cannot be used for this algorithm");
    }
    if (alg === "ES256" && namedCurve === "P-256") {
      cryptoKey = keyObject.toCryptoKey({
        name: "ECDSA",
        namedCurve
      }, extractable, [isPublic ? "verify" : "sign"]);
    }
    if (alg === "ES384" && namedCurve === "P-384") {
      cryptoKey = keyObject.toCryptoKey({
        name: "ECDSA",
        namedCurve
      }, extractable, [isPublic ? "verify" : "sign"]);
    }
    if (alg === "ES512" && namedCurve === "P-521") {
      cryptoKey = keyObject.toCryptoKey({
        name: "ECDSA",
        namedCurve
      }, extractable, [isPublic ? "verify" : "sign"]);
    }
    if (alg.startsWith("ECDH-ES")) {
      cryptoKey = keyObject.toCryptoKey({
        name: "ECDH",
        namedCurve
      }, extractable, isPublic ? [] : ["deriveBits"]);
    }
  }
  if (!cryptoKey) {
    throw new TypeError("given KeyObject instance cannot be used for this algorithm");
  }
  if (!cached) {
    cache.set(keyObject, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
}, "handleKeyObject");
async function normalizeKey(key, alg) {
  if (key instanceof Uint8Array) {
    return key;
  }
  if (isCryptoKey(key)) {
    return key;
  }
  if (isKeyObject(key)) {
    if (key.type === "secret") {
      return key.export();
    }
    if ("toCryptoKey" in key && typeof key.toCryptoKey === "function") {
      try {
        return handleKeyObject(key, alg);
      } catch (err) {
        if (err instanceof TypeError) {
          throw err;
        }
      }
    }
    let jwk = key.export({ format: "jwk" });
    return handleJWK(key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k) {
      return decode(key.k);
    }
    return handleJWK(key, key, alg, true);
  }
  throw new Error("unreachable");
}
__name(normalizeKey, "normalizeKey");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/check_key_type.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var tag = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag], "tag");
var jwkMatchesOp = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key.use !== void 0) {
    let expected;
    switch (usage) {
      case "sign":
      case "verify":
        expected = "sig";
        break;
      case "encrypt":
      case "decrypt":
        expected = "enc";
        break;
    }
    if (key.use !== expected) {
      throw new TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
    }
  }
  if (key.alg !== void 0 && key.alg !== alg) {
    throw new TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
  }
  if (Array.isArray(key.key_ops)) {
    let expectedKeyOp;
    switch (true) {
      case (usage === "sign" || usage === "verify"):
      case alg === "dir":
      case alg.includes("CBC-HS"):
        expectedKeyOp = usage;
        break;
      case alg.startsWith("PBES2"):
        expectedKeyOp = "deriveBits";
        break;
      case /^A\d{3}(?:GCM)?(?:KW)?$/.test(alg):
        if (!alg.includes("GCM") && alg.endsWith("KW")) {
          expectedKeyOp = usage === "encrypt" ? "wrapKey" : "unwrapKey";
        } else {
          expectedKeyOp = usage;
        }
        break;
      case (usage === "encrypt" && alg.startsWith("RSA")):
        expectedKeyOp = "wrapKey";
        break;
      case usage === "decrypt":
        expectedKeyOp = alg.startsWith("RSA") ? "unwrapKey" : "deriveBits";
        break;
    }
    if (expectedKeyOp && key.key_ops?.includes?.(expectedKeyOp) === false) {
      throw new TypeError(`Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`);
    }
  }
  return true;
}, "jwkMatchesOp");
var symmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key instanceof Uint8Array)
    return;
  if (isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
      return;
    throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
  }
  if (!isKeyLike(key)) {
    throw new TypeError(withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key", "Uint8Array"));
  }
  if (key.type !== "secret") {
    throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
  }
}, "symmetricTypeCheck");
var asymmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage) => {
  if (isJWK(key)) {
    switch (usage) {
      case "decrypt":
      case "sign":
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a private JWK`);
      case "encrypt":
      case "verify":
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a public JWK`);
    }
  }
  if (!isKeyLike(key)) {
    throw new TypeError(withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key"));
  }
  if (key.type === "secret") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
  }
  if (key.type === "public") {
    switch (usage) {
      case "sign":
        throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
      case "decrypt":
        throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
    }
  }
  if (key.type === "private") {
    switch (usage) {
      case "verify":
        throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
      case "encrypt":
        throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
    }
  }
}, "asymmetricTypeCheck");
function checkKeyType(alg, key, usage) {
  switch (alg.substring(0, 2)) {
    case "A1":
    case "A2":
    case "di":
    case "HS":
    case "PB":
      symmetricTypeCheck(alg, key, usage);
      break;
    default:
      asymmetricTypeCheck(alg, key, usage);
  }
}
__name(checkKeyType, "checkKeyType");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/jws/compact/verify.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/jws/flattened/verify.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/verify.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/subtle_dsa.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function subtleAlgorithm(alg, algorithm) {
  const hash = `SHA-${alg.slice(-3)}`;
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      return { hash, name: "HMAC" };
    case "PS256":
    case "PS384":
    case "PS512":
      return { hash, name: "RSA-PSS", saltLength: parseInt(alg.slice(-3), 10) >> 3 };
    case "RS256":
    case "RS384":
    case "RS512":
      return { hash, name: "RSASSA-PKCS1-v1_5" };
    case "ES256":
    case "ES384":
    case "ES512":
      return { hash, name: "ECDSA", namedCurve: algorithm.namedCurve };
    case "Ed25519":
    case "EdDSA":
      return { name: "Ed25519" };
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87":
      return { name: alg };
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}
__name(subtleAlgorithm, "subtleAlgorithm");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/get_sign_verify_key.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
async function getSigKey(alg, key, usage) {
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) {
      throw new TypeError(invalidKeyInput(key, "CryptoKey", "KeyObject", "JSON Web Key"));
    }
    return crypto.subtle.importKey("raw", key, { hash: `SHA-${alg.slice(-3)}`, name: "HMAC" }, false, [usage]);
  }
  checkSigCryptoKey(key, alg, usage);
  return key;
}
__name(getSigKey, "getSigKey");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/verify.js
async function verify(alg, key, signature, data) {
  const cryptoKey = await getSigKey(alg, key, "verify");
  checkKeyLength(alg, cryptoKey);
  const algorithm = subtleAlgorithm(alg, cryptoKey.algorithm);
  try {
    return await crypto.subtle.verify(algorithm, cryptoKey, signature, data);
  } catch {
    return false;
  }
}
__name(verify, "verify");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("Flattened JWS must be an object");
  }
  if (jws.protected === void 0 && jws.header === void 0) {
    throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
  }
  if (jws.protected !== void 0 && typeof jws.protected !== "string") {
    throw new JWSInvalid("JWS Protected Header incorrect type");
  }
  if (jws.payload === void 0) {
    throw new JWSInvalid("JWS Payload missing");
  }
  if (typeof jws.signature !== "string") {
    throw new JWSInvalid("JWS Signature missing or incorrect type");
  }
  if (jws.header !== void 0 && !isObject(jws.header)) {
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  }
  if (!isDisjoint(parsedProt, jws.header)) {
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header
  };
  const extensions = validateCrit(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, parsedProt, joseHeader);
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean") {
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  }
  const algorithms = options && validateAlgorithms("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  }
  if (b64) {
    if (typeof jws.payload !== "string") {
      throw new JWSInvalid("JWS Payload must be a string");
    }
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array)) {
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
  }
  checkKeyType(alg, key, "verify");
  const data = concat(jws.protected !== void 0 ? encode(jws.protected) : new Uint8Array(), encode("."), typeof jws.payload === "string" ? b64 ? encode(jws.payload) : encoder.encode(jws.payload) : jws.payload);
  let signature;
  try {
    signature = decode(jws.signature);
  } catch {
    throw new JWSInvalid("Failed to base64url decode the signature");
  }
  const k = await normalizeKey(key, alg);
  const verified = await verify(alg, k, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed();
  }
  let payload;
  if (b64) {
    try {
      payload = decode(jws.payload);
    } catch {
      throw new JWSInvalid("Failed to base64url decode the payload");
    }
  } else if (typeof jws.payload === "string") {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== void 0) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key: k };
  }
  return result;
}
__name(flattenedVerify, "flattenedVerify");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== "string") {
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  }
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) {
    throw new JWSInvalid("Invalid Compact JWS");
  }
  const verified = await flattenedVerify({ payload, protected: protectedHeader, signature }, key, options);
  const result = { payload: verified.payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(compactVerify, "compactVerify");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/jwt/verify.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/lib/jwt_claims_set.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var epoch = /* @__PURE__ */ __name((date) => Math.floor(date.getTime() / 1e3), "epoch");
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
function secs(str) {
  const matched = REGEX.exec(str);
  if (!matched || matched[4] && matched[1]) {
    throw new TypeError("Invalid time period format");
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") {
    return -numericDate;
  }
  return numericDate;
}
__name(secs, "secs");
var normalizeTyp = /* @__PURE__ */ __name((value) => {
  if (value.includes("/")) {
    return value.toLowerCase();
  }
  return `application/${value.toLowerCase()}`;
}, "normalizeTyp");
var checkAudiencePresence = /* @__PURE__ */ __name((audPayload, audOption) => {
  if (typeof audPayload === "string") {
    return audOption.includes(audPayload);
  }
  if (Array.isArray(audPayload)) {
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }
  return false;
}, "checkAudiencePresence");
function validateClaimsSet(protectedHeader, encodedPayload, options = {}) {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }
  const { typ } = options;
  if (typ && (typeof protectedHeader.typ !== "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", "check_failed");
  }
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== void 0)
    presenceCheck.push("iat");
  if (audience !== void 0)
    presenceCheck.push("aud");
  if (subject !== void 0)
    presenceCheck.push("sub");
  if (issuer !== void 0)
    presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
    }
  }
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
    throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, "iss", "check_failed");
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, "sub", "check_failed");
  }
  if (audience && !checkAudiencePresence(payload.aud, typeof audience === "string" ? [audience] : audience)) {
    throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, "aud", "check_failed");
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }
  const { currentDate } = options;
  const now = epoch(currentDate || /* @__PURE__ */ new Date());
  if ((payload.iat !== void 0 || maxTokenAge) && typeof payload.iat !== "number") {
    throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, "iat", "invalid");
  }
  if (payload.nbf !== void 0) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, "nbf", "invalid");
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", "check_failed");
    }
  }
  if (payload.exp !== void 0) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, "exp", "invalid");
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", "check_failed");
    }
  }
  if (maxTokenAge) {
    const age = now - payload.iat;
    const max = typeof maxTokenAge === "number" ? maxTokenAge : secs(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", "check_failed");
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", "check_failed");
    }
  }
  return payload;
}
__name(validateClaimsSet, "validateClaimsSet");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (verified.protectedHeader.crit?.includes("b64") && verified.protectedHeader.b64 === false) {
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  }
  const payload = validateClaimsSet(verified.protectedHeader, verified.payload, options);
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(jwtVerify, "jwtVerify");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/jwks/local.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function getKtyFromAlg(alg) {
  switch (typeof alg === "string" && alg.slice(0, 2)) {
    case "RS":
    case "PS":
      return "RSA";
    case "ES":
      return "EC";
    case "Ed":
      return "OKP";
    case "ML":
      return "AKP";
    default:
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
  }
}
__name(getKtyFromAlg, "getKtyFromAlg");
function isJWKSLike(jwks) {
  return jwks && typeof jwks === "object" && Array.isArray(jwks.keys) && jwks.keys.every(isJWKLike);
}
__name(isJWKSLike, "isJWKSLike");
function isJWKLike(key) {
  return isObject(key);
}
__name(isJWKLike, "isJWKLike");
var LocalJWKSet = class {
  static {
    __name(this, "LocalJWKSet");
  }
  #jwks;
  #cached = /* @__PURE__ */ new WeakMap();
  constructor(jwks) {
    if (!isJWKSLike(jwks)) {
      throw new JWKSInvalid("JSON Web Key Set malformed");
    }
    this.#jwks = structuredClone(jwks);
  }
  jwks() {
    return this.#jwks;
  }
  async getKey(protectedHeader, token) {
    const { alg, kid } = { ...protectedHeader, ...token?.header };
    const kty = getKtyFromAlg(alg);
    const candidates = this.#jwks.keys.filter((jwk2) => {
      let candidate = kty === jwk2.kty;
      if (candidate && typeof kid === "string") {
        candidate = kid === jwk2.kid;
      }
      if (candidate && (typeof jwk2.alg === "string" || kty === "AKP")) {
        candidate = alg === jwk2.alg;
      }
      if (candidate && typeof jwk2.use === "string") {
        candidate = jwk2.use === "sig";
      }
      if (candidate && Array.isArray(jwk2.key_ops)) {
        candidate = jwk2.key_ops.includes("verify");
      }
      if (candidate) {
        switch (alg) {
          case "ES256":
            candidate = jwk2.crv === "P-256";
            break;
          case "ES384":
            candidate = jwk2.crv === "P-384";
            break;
          case "ES512":
            candidate = jwk2.crv === "P-521";
            break;
          case "Ed25519":
          case "EdDSA":
            candidate = jwk2.crv === "Ed25519";
            break;
        }
      }
      return candidate;
    });
    const { 0: jwk, length } = candidates;
    if (length === 0) {
      throw new JWKSNoMatchingKey();
    }
    if (length !== 1) {
      const error3 = new JWKSMultipleMatchingKeys();
      const _cached = this.#cached;
      error3[Symbol.asyncIterator] = async function* () {
        for (const jwk2 of candidates) {
          try {
            yield await importWithAlgCache(_cached, jwk2, alg);
          } catch {
          }
        }
      };
      throw error3;
    }
    return importWithAlgCache(this.#cached, jwk, alg);
  }
};
async function importWithAlgCache(cache2, jwk, alg) {
  const cached = cache2.get(jwk) || cache2.set(jwk, {}).get(jwk);
  if (cached[alg] === void 0) {
    const key = await importJWK({ ...jwk, ext: true }, alg);
    if (key instanceof Uint8Array || key.type !== "public") {
      throw new JWKSInvalid("JSON Web Key Set members must be public keys");
    }
    cached[alg] = key;
  }
  return cached[alg];
}
__name(importWithAlgCache, "importWithAlgCache");
function createLocalJWKSet(jwks) {
  const set = new LocalJWKSet(jwks);
  const localJWKSet = /* @__PURE__ */ __name(async (protectedHeader, token) => set.getKey(protectedHeader, token), "localJWKSet");
  Object.defineProperties(localJWKSet, {
    jwks: {
      value: /* @__PURE__ */ __name(() => structuredClone(set.jwks()), "value"),
      enumerable: false,
      configurable: false,
      writable: false
    }
  });
  return localJWKSet;
}
__name(createLocalJWKSet, "createLocalJWKSet");

// node_modules/.pnpm/jose@6.1.2/node_modules/jose/dist/webapi/jwks/remote.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function isCloudflareWorkers() {
  return typeof WebSocketPair !== "undefined" || typeof navigator !== "undefined" && true || typeof EdgeRuntime !== "undefined" && EdgeRuntime === "vercel";
}
__name(isCloudflareWorkers, "isCloudflareWorkers");
var USER_AGENT;
if (typeof navigator === "undefined" || !"Cloudflare-Workers"?.startsWith?.("Mozilla/5.0 ")) {
  const NAME = "jose";
  const VERSION = "v6.1.2";
  USER_AGENT = `${NAME}/${VERSION}`;
}
var customFetch = Symbol();
async function fetchJwks(url, headers, signal, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "GET",
    signal,
    redirect: "manual",
    headers
  }).catch((err) => {
    if (err.name === "TimeoutError") {
      throw new JWKSTimeout();
    }
    throw err;
  });
  if (response.status !== 200) {
    throw new JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response");
  }
  try {
    return await response.json();
  } catch {
    throw new JOSEError("Failed to parse the JSON Web Key Set HTTP response as JSON");
  }
}
__name(fetchJwks, "fetchJwks");
var jwksCache = Symbol();
function isFreshJwksCache(input, cacheMaxAge) {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  if (!("uat" in input) || typeof input.uat !== "number" || Date.now() - input.uat >= cacheMaxAge) {
    return false;
  }
  if (!("jwks" in input) || !isObject(input.jwks) || !Array.isArray(input.jwks.keys) || !Array.prototype.every.call(input.jwks.keys, isObject)) {
    return false;
  }
  return true;
}
__name(isFreshJwksCache, "isFreshJwksCache");
var RemoteJWKSet = class {
  static {
    __name(this, "RemoteJWKSet");
  }
  #url;
  #timeoutDuration;
  #cooldownDuration;
  #cacheMaxAge;
  #jwksTimestamp;
  #pendingFetch;
  #headers;
  #customFetch;
  #local;
  #cache;
  constructor(url, options) {
    if (!(url instanceof URL)) {
      throw new TypeError("url must be an instance of URL");
    }
    this.#url = new URL(url.href);
    this.#timeoutDuration = typeof options?.timeoutDuration === "number" ? options?.timeoutDuration : 5e3;
    this.#cooldownDuration = typeof options?.cooldownDuration === "number" ? options?.cooldownDuration : 3e4;
    this.#cacheMaxAge = typeof options?.cacheMaxAge === "number" ? options?.cacheMaxAge : 6e5;
    this.#headers = new Headers(options?.headers);
    if (USER_AGENT && !this.#headers.has("User-Agent")) {
      this.#headers.set("User-Agent", USER_AGENT);
    }
    if (!this.#headers.has("accept")) {
      this.#headers.set("accept", "application/json");
      this.#headers.append("accept", "application/jwk-set+json");
    }
    this.#customFetch = options?.[customFetch];
    if (options?.[jwksCache] !== void 0) {
      this.#cache = options?.[jwksCache];
      if (isFreshJwksCache(options?.[jwksCache], this.#cacheMaxAge)) {
        this.#jwksTimestamp = this.#cache.uat;
        this.#local = createLocalJWKSet(this.#cache.jwks);
      }
    }
  }
  pendingFetch() {
    return !!this.#pendingFetch;
  }
  coolingDown() {
    return typeof this.#jwksTimestamp === "number" ? Date.now() < this.#jwksTimestamp + this.#cooldownDuration : false;
  }
  fresh() {
    return typeof this.#jwksTimestamp === "number" ? Date.now() < this.#jwksTimestamp + this.#cacheMaxAge : false;
  }
  jwks() {
    return this.#local?.jwks();
  }
  async getKey(protectedHeader, token) {
    if (!this.#local || !this.fresh()) {
      await this.reload();
    }
    try {
      return await this.#local(protectedHeader, token);
    } catch (err) {
      if (err instanceof JWKSNoMatchingKey) {
        if (this.coolingDown() === false) {
          await this.reload();
          return this.#local(protectedHeader, token);
        }
      }
      throw err;
    }
  }
  async reload() {
    if (this.#pendingFetch && isCloudflareWorkers()) {
      this.#pendingFetch = void 0;
    }
    this.#pendingFetch ||= fetchJwks(this.#url.href, this.#headers, AbortSignal.timeout(this.#timeoutDuration), this.#customFetch).then((json) => {
      this.#local = createLocalJWKSet(json);
      if (this.#cache) {
        this.#cache.uat = Date.now();
        this.#cache.jwks = json;
      }
      this.#jwksTimestamp = Date.now();
      this.#pendingFetch = void 0;
    }).catch((err) => {
      this.#pendingFetch = void 0;
      throw err;
    });
    await this.#pendingFetch;
  }
};
function createRemoteJWKSet(url, options) {
  const set = new RemoteJWKSet(url, options);
  const remoteJWKSet = /* @__PURE__ */ __name(async (protectedHeader, token) => set.getKey(protectedHeader, token), "remoteJWKSet");
  Object.defineProperties(remoteJWKSet, {
    coolingDown: {
      get: /* @__PURE__ */ __name(() => set.coolingDown(), "get"),
      enumerable: true,
      configurable: false
    },
    fresh: {
      get: /* @__PURE__ */ __name(() => set.fresh(), "get"),
      enumerable: true,
      configurable: false
    },
    reload: {
      value: /* @__PURE__ */ __name(() => set.reload(), "value"),
      enumerable: true,
      configurable: false,
      writable: false
    },
    reloading: {
      get: /* @__PURE__ */ __name(() => set.pendingFetch(), "get"),
      enumerable: true,
      configurable: false
    },
    jwks: {
      value: /* @__PURE__ */ __name(() => set.jwks(), "value"),
      enumerable: true,
      configurable: false,
      writable: false
    }
  });
  return remoteJWKSet;
}
__name(createRemoteJWKSet, "createRemoteJWKSet");

// src/utils/logger.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var logAtLevel = /* @__PURE__ */ __name((level, payload) => {
  const message2 = JSON.stringify(payload);
  switch (level) {
    case "info":
      console.info(message2);
      break;
    case "warn":
      console.warn(message2);
      break;
    case "error":
      console.error(message2);
      break;
  }
}, "logAtLevel");
var logWithContext = /* @__PURE__ */ __name((level, message2, options) => {
  const payload = {
    level,
    message: message2,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (options?.requestId) {
    payload.requestId = options.requestId;
  }
  if (options?.meta) {
    payload.meta = options.meta;
  }
  logAtLevel(level, payload);
}, "logWithContext");

// src/middleware/auth.ts
var authMiddleware = /* @__PURE__ */ __name((options) => {
  const allowedRoles = options?.allowRoles;
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "Missing or invalid Authorization header" });
    }
    const token = authHeader.split(" ")[1];
    const config2 = c.get("config");
    const requestId = c.get("requestId");
    const clerkJwksUrl = config2.secrets.clerkJwksUrl;
    const clerkIssuer = config2.secrets.clerkJwtIssuer;
    if (!clerkJwksUrl || !clerkIssuer) {
      if (!config2.auth.allowLegacy) {
        throw new HTTPException(503, {
          message: "Authentication service not configured. Clerk JWKS required or set ALLOW_LEGACY_AUTH=true"
        });
      }
      return legacyJwtValidation(c, next, token, config2, allowedRoles, requestId);
    }
    try {
      const jwksClient = createRemoteJWKSet(new URL(clerkJwksUrl), {
        cacheMaxAge: 6e4,
        // Cache for 1 minute only
        cooldownDuration: 0
        // No cooldown - refresh immediately when needed
      });
      const { payload } = await jwtVerify(token, jwksClient, {
        issuer: clerkIssuer,
        algorithms: ["RS256"]
        // Clerk uses RS256
      });
      const clerkId = typeof payload.sub === "string" ? payload.sub : null;
      const email = typeof payload.email === "string" ? payload.email : void 0;
      if (!clerkId) {
        throw new HTTPException(401, { message: "Invalid token payload" });
      }
      const user = await syncUserFromClerk(c.env.DB, {
        clerkId,
        email: email || "",
        name: typeof payload.name === "string" ? payload.name : void 0
      });
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        throw new HTTPException(403, { message: "Insufficient permissions" });
      }
      c.set("user", {
        id: user.id,
        role: user.role,
        email: user.email,
        tier: user.tier,
        clerkId: user.clerkId
      });
      await next();
    } catch (err) {
      if (err instanceof HTTPException) {
        throw err;
      }
      logWithContext("warn", "clerk.jwt.validation_failed", {
        requestId,
        meta: { error: err.message }
      });
      throw new HTTPException(401, { message: "Invalid or expired token" });
    }
  };
}, "authMiddleware");
async function legacyJwtValidation(c, next, token, config2, allowedRoles, requestId) {
  const textEncoder = new TextEncoder();
  const secretKey = textEncoder.encode(config2.secrets.jwtSecret);
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
      maxTokenAge: config2.jwt.maxAge
    });
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    const roleValue = typeof payload.role === "string" ? payload.role : "user";
    const role = roleValue === "admin" ? "admin" : "user";
    const email = typeof payload.email === "string" ? payload.email : void 0;
    if (!userId) {
      throw new HTTPException(401, { message: "Invalid token payload" });
    }
    if (allowedRoles && !allowedRoles.includes(role)) {
      throw new HTTPException(403, { message: "Insufficient permissions" });
    }
    c.set("user", { id: userId, role, email, tier: "free" });
    await next();
  } catch (err) {
    if (err instanceof HTTPException) {
      throw err;
    }
    logWithContext("warn", "legacy.jwt.validation_failed", {
      requestId,
      meta: { error: err.message }
    });
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }
}
__name(legacyJwtValidation, "legacyJwtValidation");
async function syncUserFromClerk(db, clerkUser) {
  let user = await db.prepare("SELECT id, clerk_id, email, role, tier FROM users WHERE clerk_id = ?").bind(clerkUser.clerkId).first();
  if (!user) {
    const id = crypto.randomUUID();
    await db.prepare(`
        INSERT INTO users (id, clerk_id, email, name, role, tier, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
      `).bind(id, clerkUser.clerkId, clerkUser.email, clerkUser.name || null, "user", "free").run();
    user = {
      id,
      clerk_id: clerkUser.clerkId,
      email: clerkUser.email,
      role: "user",
      tier: "free"
    };
    await db.prepare(`
        INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
        VALUES (?, ?, ?, ?, strftime('%s', 'now'))
      `).bind(
      crypto.randomUUID(),
      "user.registered",
      id,
      JSON.stringify({ source: "clerk", clerk_id: clerkUser.clerkId })
    ).run();
  } else {
    await db.prepare('UPDATE users SET last_login_at = strftime("%s", "now") WHERE id = ?').bind(user.id).run();
  }
  return {
    id: user.id,
    clerkId: user.clerk_id,
    email: user.email,
    role: user.role,
    tier: user.tier || "free"
  };
}
__name(syncUserFromClerk, "syncUserFromClerk");

// src/services/revenuecat-client.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var RevenueCatClient = class {
  static {
    __name(this, "RevenueCatClient");
  }
  baseUrl = "https://api.revenuecat.com/v1";
  secretKey;
  constructor(secretKey) {
    this.secretKey = secretKey;
  }
  /**
   * Get subscriber information by app_user_id
   * This returns the full subscriber object including entitlements and subscriptions
   */
  async getSubscriber(appUserId) {
    try {
      const response = await fetch(`${this.baseUrl}/subscribers/${appUserId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.secretKey}`,
          "Content-Type": "application/json"
        }
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        const error3 = await response.json();
        throw new Error(`RevenueCat API error: ${error3.message || response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      throw new Error(`Failed to fetch subscriber: ${err.message}`);
    }
  }
  /**
   * Check if a user has an active subscription
   * Returns tier based on their current entitlements
   */
  async getUserTier(appUserId) {
    const subscriber = await this.getSubscriber(appUserId);
    if (!subscriber) {
      return "free";
    }
    const entitlements = subscriber.subscriber.entitlements;
    if (entitlements["pro"] && this.isEntitlementActive(entitlements["pro"])) {
      return "pro";
    }
    if (entitlements["premium"] && this.isEntitlementActive(entitlements["premium"])) {
      return "premium";
    }
    return "free";
  }
  /**
   * Check if user has access to a specific entitlement
   */
  async hasEntitlement(appUserId, entitlementId) {
    const subscriber = await this.getSubscriber(appUserId);
    if (!subscriber) {
      return false;
    }
    const entitlement = subscriber.subscriber.entitlements[entitlementId];
    return entitlement ? this.isEntitlementActive(entitlement) : false;
  }
  /**
   * Get all active subscriptions for a user
   */
  async getActiveSubscriptions(appUserId) {
    const subscriber = await this.getSubscriber(appUserId);
    if (!subscriber) {
      return [];
    }
    const activeProducts = [];
    const subscriptions = subscriber.subscriber.subscriptions;
    for (const [productId, subscription] of Object.entries(subscriptions)) {
      if (this.isSubscriptionActive(subscription)) {
        activeProducts.push(productId);
      }
    }
    return activeProducts;
  }
  /**
   * Delete/anonymize a subscriber (GDPR compliance)
   */
  async deleteSubscriber(appUserId) {
    try {
      const response = await fetch(`${this.baseUrl}/subscribers/${appUserId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${this.secretKey}`
        }
      });
      return response.ok;
    } catch (err) {
      throw new Error(`Failed to delete subscriber: ${err.message}`);
    }
  }
  /**
   * Grant a promotional entitlement to a user
   * Useful for giving free trials or comps
   */
  async grantPromotionalEntitlement(appUserId, entitlementId, durationDays) {
    try {
      const response = await fetch(
        `${this.baseUrl}/subscribers/${appUserId}/entitlements/${entitlementId}/promotional`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.secretKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            duration: `P${durationDays}D`
            // ISO 8601 duration format
          })
        }
      );
      return response.ok;
    } catch (err) {
      throw new Error(`Failed to grant promotional entitlement: ${err.message}`);
    }
  }
  /**
   * Revoke a promotional entitlement
   */
  async revokePromotionalEntitlement(appUserId, entitlementId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/subscribers/${appUserId}/entitlements/${entitlementId}/promotional`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${this.secretKey}`
          }
        }
      );
      return response.ok;
    } catch (err) {
      throw new Error(`Failed to revoke promotional entitlement: ${err.message}`);
    }
  }
  // Helper methods
  isEntitlementActive(entitlement) {
    if (!entitlement.expires_date) {
      return true;
    }
    const expiresAt = new Date(entitlement.expires_date);
    return expiresAt > /* @__PURE__ */ new Date();
  }
  isSubscriptionActive(subscription) {
    const expiresAt = new Date(subscription.expires_date);
    const now = /* @__PURE__ */ new Date();
    if (expiresAt <= now) {
      return false;
    }
    if (subscription.billing_issues_detected_at) {
      return false;
    }
    return true;
  }
};
function createRevenueCatClient(bindings) {
  const secretKey = bindings.REVENUECAT_SECRET_API_KEY;
  if (!secretKey) {
    return null;
  }
  return new RevenueCatClient(secretKey);
}
__name(createRevenueCatClient, "createRevenueCatClient");

// src/routes/admin.ts
var DEFAULT_TIER_LIMITS = {
  free: {
    tier: "free",
    requestsPerDay: 10,
    tokensPerDay: 5e3,
    maxParallelGenerations: 1,
    contentDownloadsPerDay: 5,
    offlinePackagesAllowed: 0,
    canAccessPremiumContent: false,
    updatedAt: null
  },
  premium: {
    tier: "premium",
    requestsPerDay: 100,
    tokensPerDay: 5e4,
    maxParallelGenerations: 3,
    contentDownloadsPerDay: 50,
    offlinePackagesAllowed: 3,
    canAccessPremiumContent: true,
    updatedAt: null
  },
  pro: {
    tier: "pro",
    requestsPerDay: 1e3,
    tokensPerDay: 5e5,
    maxParallelGenerations: 10,
    contentDownloadsPerDay: 999999,
    offlinePackagesAllowed: 999999,
    canAccessPremiumContent: true,
    updatedAt: null
  }
};
var app2 = new Hono2();
app2.use("/*", authMiddleware({ allowRoles: ["admin"] }));
app2.get("/waitlist", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const results = await db.select().from(waitlist).orderBy(desc(waitlist.createdAt));
    return c.json({ waitlist: results });
  } catch (error3) {
    logWithContext("error", "admin.waitlist_fetch_failed", {
      requestId: c.get("requestId"),
      meta: { error: error3.message }
    });
    return c.json({ error: "Failed to fetch waitlist" }, 500);
  }
});
var createLessonSchema = external_exports.object({
  title: external_exports.string().min(3),
  subtitle: external_exports.string().optional(),
  hskLevel: external_exports.number().min(1).max(9),
  lessonNumber: external_exports.number().int().min(1).optional(),
  // Auto-increment if not provided
  lessonType: external_exports.enum(["lesson", "speaking", "mini_test", "hsk_test"]).default("lesson"),
  difficulty: external_exports.enum(["easy", "medium", "hard"]).optional(),
  description: external_exports.string().optional(),
  estimatedMinutes: external_exports.number().int().min(1).max(120).optional(),
  grammarPoints: external_exports.array(external_exports.string()).optional(),
  tags: external_exports.array(external_exports.string()).optional(),
  targetVocabulary: external_exports.array(external_exports.string()).optional(),
  // Array of vocab IDs
  blocks: external_exports.array(external_exports.object({
    type: external_exports.string(),
    // e.g. 'hero_hanzi', 'explain'
    content: external_exports.record(external_exports.any())
    // The specific block data
  })).min(1)
});
app2.post("/lessons", zValidator("json", createLessonSchema), async (c) => {
  const data = c.req.valid("json");
  const db = drizzle(c.env.DB);
  const lessonId = crypto.randomUUID();
  try {
    let lessonNumber = data.lessonNumber;
    if (!lessonNumber) {
      const maxNumberResult = await db.select({ maxNumber: lessons.lessonNumber }).from(lessons).where(
        and(
          eq(lessons.hskLevel, data.hskLevel),
          eq(lessons.lessonType, data.lessonType || "lesson")
        )
      ).orderBy(desc(lessons.lessonNumber)).limit(1);
      lessonNumber = maxNumberResult[0]?.maxNumber ? maxNumberResult[0].maxNumber + 1 : 1;
    }
    const lessonInsert = db.insert(lessons).values({
      id: lessonId,
      title: data.title,
      subtitle: data.subtitle || null,
      hskLevel: data.hskLevel,
      lessonNumber,
      lessonType: data.lessonType || "lesson",
      difficulty: data.difficulty || "medium",
      description: data.description || null,
      estimatedMinutes: data.estimatedMinutes || 15,
      grammarPoints: data.grammarPoints || null,
      tags: data.tags || null,
      targetVocabulary: data.targetVocabulary || null,
      isPublished: false
      // Draft by default
    });
    const blockInserts = data.blocks.length > 0 ? db.insert(lessonBlocks).values(
      data.blocks.map((block, index2) => ({
        id: crypto.randomUUID(),
        lessonId,
        type: block.type,
        orderIndex: index2,
        content: block.content
      }))
    ) : null;
    if (blockInserts) {
      await db.batch([lessonInsert, blockInserts]);
    } else {
      await lessonInsert;
    }
    return c.json({ success: true, id: lessonId, lessonNumber });
  } catch (error3) {
    logWithContext("error", "admin.lesson_creation_failed", {
      requestId: c.get("requestId"),
      meta: {
        message: error3.message
      }
    });
    return c.json({ error: "Failed to create lesson" }, 500);
  }
});
app2.get("/subscriptions/:clerkId", async (c) => {
  const { clerkId } = c.req.param();
  const requestId = c.get("requestId");
  const rcClient = createRevenueCatClient(c.env);
  if (!rcClient) {
    return c.json({ error: "RevenueCat not configured" }, 503);
  }
  try {
    const subscriber = await rcClient.getSubscriber(clerkId);
    if (!subscriber) {
      return c.json({
        clerk_id: clerkId,
        tier: "free",
        has_subscription: false
      });
    }
    const tier = await rcClient.getUserTier(clerkId);
    const activeSubscriptions = await rcClient.getActiveSubscriptions(clerkId);
    return c.json({
      clerk_id: clerkId,
      tier,
      has_subscription: activeSubscriptions.length > 0,
      active_products: activeSubscriptions,
      entitlements: subscriber.subscriber.entitlements,
      first_seen: subscriber.subscriber.first_seen,
      last_seen: subscriber.subscriber.last_seen
    });
  } catch (err) {
    logWithContext("error", "admin.revenuecat.query_failed", {
      requestId,
      meta: { clerkId, error: err.message }
    });
    return c.json({ error: "Failed to query subscription" }, 500);
  }
});
var grantPromoSchema = external_exports.object({
  clerk_id: external_exports.string(),
  entitlement: external_exports.enum(["premium", "pro"]),
  duration_days: external_exports.number().int().min(1).max(365),
  reason: external_exports.string().optional()
});
app2.post("/subscriptions/grant-promo", zValidator("json", grantPromoSchema), async (c) => {
  const data = c.req.valid("json");
  const requestId = c.get("requestId");
  const adminUser = c.get("user");
  if (!adminUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const rcClient = createRevenueCatClient(c.env);
  if (!rcClient) {
    return c.json({ error: "RevenueCat not configured" }, 503);
  }
  try {
    const success = await rcClient.grantPromotionalEntitlement(
      data.clerk_id,
      data.entitlement,
      data.duration_days
    );
    if (!success) {
      return c.json({ error: "Failed to grant promotional access" }, 500);
    }
    await c.env.DB.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `).bind(
      crypto.randomUUID(),
      "admin.promo_granted",
      data.clerk_id,
      JSON.stringify({
        granted_by: adminUser.id,
        entitlement: data.entitlement,
        duration_days: data.duration_days,
        reason: data.reason
      })
    ).run();
    logWithContext("info", "admin.promo_granted", {
      requestId,
      meta: {
        clerk_id: data.clerk_id,
        entitlement: data.entitlement,
        duration_days: data.duration_days,
        granted_by: adminUser.id
      }
    });
    return c.json({
      success: true,
      clerk_id: data.clerk_id,
      entitlement: data.entitlement,
      expires_in_days: data.duration_days
    });
  } catch (err) {
    logWithContext("error", "admin.promo_grant_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to grant promotional access" }, 500);
  }
});
var revokePromoSchema = external_exports.object({
  clerk_id: external_exports.string(),
  entitlement: external_exports.enum(["premium", "pro"]),
  reason: external_exports.string().optional()
});
app2.post("/subscriptions/revoke-promo", zValidator("json", revokePromoSchema), async (c) => {
  const data = c.req.valid("json");
  const requestId = c.get("requestId");
  const adminUser = c.get("user");
  if (!adminUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const rcClient = createRevenueCatClient(c.env);
  if (!rcClient) {
    return c.json({ error: "RevenueCat not configured" }, 503);
  }
  try {
    const success = await rcClient.revokePromotionalEntitlement(
      data.clerk_id,
      data.entitlement
    );
    if (!success) {
      return c.json({ error: "Failed to revoke promotional access" }, 500);
    }
    await c.env.DB.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `).bind(
      crypto.randomUUID(),
      "admin.promo_revoked",
      data.clerk_id,
      JSON.stringify({
        revoked_by: adminUser.id,
        entitlement: data.entitlement,
        reason: data.reason
      })
    ).run();
    logWithContext("info", "admin.promo_revoked", {
      requestId,
      meta: {
        clerk_id: data.clerk_id,
        entitlement: data.entitlement,
        revoked_by: adminUser.id
      }
    });
    return c.json({
      success: true,
      clerk_id: data.clerk_id,
      entitlement: data.entitlement
    });
  } catch (err) {
    logWithContext("error", "admin.promo_revoke_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to revoke promotional access" }, 500);
  }
});
app2.post("/subscriptions/:clerkId/sync", async (c) => {
  const { clerkId } = c.req.param();
  const requestId = c.get("requestId");
  const rcClient = createRevenueCatClient(c.env);
  if (!rcClient) {
    return c.json({ error: "RevenueCat not configured" }, 503);
  }
  try {
    const tier = await rcClient.getUserTier(clerkId);
    const subscriber = await rcClient.getSubscriber(clerkId);
    const result = await c.env.DB.prepare(`
      UPDATE users 
      SET tier = ?, updated_at = strftime('%s', 'now')
      WHERE clerk_id = ?
    `).bind(tier, clerkId).run();
    if (!result.success || (result.meta?.changes ?? 0) === 0) {
      return c.json({ error: "User not found in local database" }, 404);
    }
    logWithContext("info", "admin.subscription_synced", {
      requestId,
      meta: { clerk_id: clerkId, tier }
    });
    return c.json({
      success: true,
      clerk_id: clerkId,
      tier,
      synced_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    logWithContext("error", "admin.subscription_sync_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to sync subscription" }, 500);
  }
});
app2.get("/tier-limits", async (c) => {
  const db = drizzle(c.env.DB);
  const requestId = c.get("requestId");
  try {
    const results = await db.select().from(tierLimits);
    const tiers = ["free", "premium", "pro"];
    const limitsMap = {};
    for (const tier of tiers) {
      const dbRecord = results.find((r) => r.tier === tier);
      limitsMap[tier] = dbRecord || DEFAULT_TIER_LIMITS[tier];
    }
    return c.json({
      limits: limitsMap,
      source: results.length > 0 ? "database" : "defaults"
    });
  } catch (err) {
    logWithContext("error", "admin.tier_limits.fetch_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch tier limits" }, 500);
  }
});
var updateTierLimitsSchema = external_exports.object({
  requestsPerDay: external_exports.number().int().min(0).max(1e6),
  tokensPerDay: external_exports.number().int().min(0).max(1e7),
  maxParallelGenerations: external_exports.number().int().min(1).max(100),
  contentDownloadsPerDay: external_exports.number().int().min(0).max(1e6),
  offlinePackagesAllowed: external_exports.number().int().min(0).max(1e6),
  canAccessPremiumContent: external_exports.boolean()
});
app2.put("/tier-limits/:tier", zValidator("json", updateTierLimitsSchema), async (c) => {
  const tier = c.req.param("tier");
  const data = c.req.valid("json");
  const db = drizzle(c.env.DB);
  const requestId = c.get("requestId");
  const adminUser = c.get("user");
  if (!["free", "premium", "pro"].includes(tier)) {
    return c.json({ error: "Invalid tier. Must be free, premium, or pro." }, 400);
  }
  try {
    await db.insert(tierLimits).values({
      tier,
      requestsPerDay: data.requestsPerDay,
      tokensPerDay: data.tokensPerDay,
      maxParallelGenerations: data.maxParallelGenerations,
      contentDownloadsPerDay: data.contentDownloadsPerDay,
      offlinePackagesAllowed: data.offlinePackagesAllowed,
      canAccessPremiumContent: data.canAccessPremiumContent,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: tierLimits.tier,
      set: {
        requestsPerDay: data.requestsPerDay,
        tokensPerDay: data.tokensPerDay,
        maxParallelGenerations: data.maxParallelGenerations,
        contentDownloadsPerDay: data.contentDownloadsPerDay,
        offlinePackagesAllowed: data.offlinePackagesAllowed,
        canAccessPremiumContent: data.canAccessPremiumContent,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    await c.env.DB.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `).bind(
      crypto.randomUUID(),
      "admin.tier_limits_updated",
      adminUser?.id || "unknown",
      JSON.stringify({
        tier,
        updated_by: adminUser?.id,
        new_values: data
      })
    ).run();
    logWithContext("info", "admin.tier_limits.updated", {
      requestId,
      meta: { tier, updated_by: adminUser?.id }
    });
    return c.json({
      success: true,
      tier,
      limits: data
    });
  } catch (err) {
    logWithContext("error", "admin.tier_limits.update_failed", {
      requestId,
      meta: { tier, error: err.message }
    });
    return c.json({ error: "Failed to update tier limits" }, 500);
  }
});
app2.post("/tier-limits/reset", async (c) => {
  const db = drizzle(c.env.DB);
  const requestId = c.get("requestId");
  const adminUser = c.get("user");
  try {
    await db.delete(tierLimits);
    await c.env.DB.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `).bind(
      crypto.randomUUID(),
      "admin.tier_limits_reset",
      adminUser?.id || "unknown",
      JSON.stringify({ reset_by: adminUser?.id })
    ).run();
    logWithContext("info", "admin.tier_limits.reset", {
      requestId,
      meta: { reset_by: adminUser?.id }
    });
    return c.json({
      success: true,
      message: "Tier limits reset to defaults",
      limits: DEFAULT_TIER_LIMITS
    });
  } catch (err) {
    logWithContext("error", "admin.tier_limits.reset_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to reset tier limits" }, 500);
  }
});
var admin_default = app2;

// src/index.ts
var import_ai = __toESM(require_ai());

// src/routes/models.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/model-manager.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var normalizeTimestamp = /* @__PURE__ */ __name((value) => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "number") {
    return new Date(value > 1e12 ? value : value * 1e3);
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }
  }
  return /* @__PURE__ */ new Date(0);
}, "normalizeTimestamp");
var ModelManagerService = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "ModelManagerService");
  }
  /**
   * Get all available AI models
   */
  async getAllModels() {
    const d1 = drizzle(this.db);
    const models = await d1.select().from(aiModels).all();
    return models;
  }
  /**
   * Get the currently active model
   */
  async getActiveModel() {
    const d1 = drizzle(this.db);
    const model = await d1.select().from(aiModels).where(eq(aiModels.isActive, true)).limit(1).get();
    return model || null;
  }
  /**
   * Set a model as active (deactivates all others)
   */
  async setActiveModel(modelId) {
    const d1 = drizzle(this.db);
    const currentActive = await this.getActiveModel();
    await d1.update(aiModels).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(aiModels.isActive, true));
    const result = await d1.update(aiModels).set({ isActive: true, updatedAt: /* @__PURE__ */ new Date() }).where(eq(aiModels.id, modelId));
    return {
      previous: currentActive?.id || null,
      current: modelId
    };
  }
  /**
   * Add a new model to the database
   */
  async addModel(model) {
    const d1 = drizzle(this.db);
    await d1.insert(aiModels).values({
      ...model,
      isActive: false
      // New models are not active by default
    });
    const inserted = await d1.select().from(aiModels).where(eq(aiModels.id, model.id)).get();
    return inserted;
  }
  /**
   * Track API usage
   */
  async trackUsage(params) {
    const d1 = drizzle(this.db);
    const model = await d1.select().from(aiModels).where(eq(aiModels.id, params.modelUsed)).get();
    let estimatedCost = 0;
    if (model) {
      const inputCost = params.inputTokens / 1e3 * (model.costPer1kInput || 0);
      const outputCost = params.outputTokens / 1e3 * (model.costPer1kOutput || 0);
      estimatedCost = inputCost + outputCost;
    }
    await d1.insert(apiUsage).values({
      id: crypto.randomUUID(),
      userId: params.userId,
      requestId: params.requestId,
      modelUsed: params.modelUsed,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: params.inputTokens + params.outputTokens,
      estimatedCost,
      latencyMs: params.latencyMs,
      success: params.success,
      errorMessage: params.errorMessage,
      promptSlug: params.promptSlug ?? null,
      promptVersion: params.promptVersion ?? null
    });
  }
  /**
   * Get usage statistics for a date range
   */
  async getUsageStats(params) {
    const d1 = drizzle(this.db);
    const conditions = [];
    if (params.userId) {
      conditions.push(eq(apiUsage.userId, params.userId));
    }
    if (params.from) {
      conditions.push(gte(apiUsage.createdAt, params.from));
    }
    if (params.to) {
      conditions.push(lte(apiUsage.createdAt, params.to));
    }
    const records = await d1.select().from(apiUsage).where(conditions.length > 0 ? and(...conditions) : void 0).all();
    const totalCost = records.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
    const totalRequests = records.length;
    const totalTokens = records.reduce((sum, r) => sum + (r.totalTokens || 0), 0);
    const byModel = {};
    records.forEach((r) => {
      if (!byModel[r.modelUsed]) {
        byModel[r.modelUsed] = { requests: 0, cost: 0, tokens: 0 };
      }
      byModel[r.modelUsed].requests++;
      byModel[r.modelUsed].cost += r.estimatedCost || 0;
      byModel[r.modelUsed].tokens += r.totalTokens || 0;
    });
    const byDate = {};
    records.forEach((r) => {
      const createdAt = normalizeTimestamp(r.createdAt);
      const date = createdAt.toISOString().split("T")[0];
      if (!byDate[date]) {
        byDate[date] = {};
      }
      if (!byDate[date][r.modelUsed]) {
        byDate[date][r.modelUsed] = { requests: 0, tokens: 0, cost: 0 };
      }
      byDate[date][r.modelUsed].requests++;
      byDate[date][r.modelUsed].tokens += r.totalTokens || 0;
      byDate[date][r.modelUsed].cost += r.estimatedCost || 0;
    });
    const breakdown = Object.entries(byDate).flatMap(
      ([date, models]) => Object.entries(models).map(([model, stats]) => ({
        date,
        model,
        requests: stats.requests,
        tokens: stats.tokens,
        cost: stats.cost
      }))
    );
    return {
      totalCost: Math.round(totalCost * 1e4) / 1e4,
      // Round to 4 decimals
      totalRequests,
      totalTokens,
      breakdown,
      byModel
    };
  }
  /**
   * Get real-time usage (today + this month)
   */
  async getRealtimeUsage(userId) {
    const now = /* @__PURE__ */ new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStats = await this.getUsageStats({
      userId,
      from: todayStart,
      to: now
    });
    const monthStats = await this.getUsageStats({
      userId,
      from: monthStart,
      to: now
    });
    const activeModel = await this.getActiveModel();
    return {
      today: {
        cost: todayStats.totalCost,
        requests: todayStats.totalRequests,
        tokens: todayStats.totalTokens
      },
      thisMonth: {
        cost: monthStats.totalCost,
        requests: monthStats.totalRequests,
        tokens: monthStats.totalTokens
      },
      currentModel: activeModel?.id || null
    };
  }
};

// src/routes/models.ts
var app3 = new Hono2();
app3.use("/*", authMiddleware({ allowRoles: ["admin"] }));
app3.get("/models", async (c) => {
  const service = new ModelManagerService(c.env.DB);
  const models = await service.getAllModels();
  return c.json({ models });
});
app3.get("/models/active", async (c) => {
  const service = new ModelManagerService(c.env.DB);
  const model = await service.getActiveModel();
  if (!model) {
    return c.json({ error: "No active model configured" }, 404);
  }
  return c.json(model);
});
var setActiveModelSchema = external_exports.object({
  model_id: external_exports.string()
});
app3.put("/models/active", zValidator("json", setActiveModelSchema), async (c) => {
  const { model_id } = c.req.valid("json");
  const service = new ModelManagerService(c.env.DB);
  try {
    const result = await service.setActiveModel(model_id);
    return c.json({
      success: true,
      previous_model: result.previous,
      active_model: result.current,
      message: `Switched from ${result.previous || "none"} to ${result.current}`
    });
  } catch (err) {
    return c.json({ error: "Failed to switch model", message: err.message }, 500);
  }
});
var addModelSchema = external_exports.object({
  id: external_exports.string(),
  name: external_exports.string(),
  provider: external_exports.string(),
  cost_per_1k_input: external_exports.number().min(0),
  cost_per_1k_output: external_exports.number().min(0),
  tier: external_exports.enum(["nano", "mini", "standard", "premium"]),
  max_tokens: external_exports.number().optional().default(4096),
  supports_json: external_exports.boolean().optional().default(true)
});
app3.post("/models", zValidator("json", addModelSchema), async (c) => {
  const data = c.req.valid("json");
  const service = new ModelManagerService(c.env.DB);
  try {
    const model = await service.addModel({
      id: data.id,
      name: data.name,
      provider: data.provider,
      costPer1kInput: data.cost_per_1k_input,
      costPer1kOutput: data.cost_per_1k_output,
      tier: data.tier,
      maxTokens: data.max_tokens,
      supportsJson: data.supports_json,
      isActive: false
    });
    return c.json({ success: true, model }, 201);
  } catch (err) {
    return c.json({ error: "Failed to add model", message: err.message }, 500);
  }
});
var usageQuerySchema = external_exports.object({
  from: external_exports.string().optional(),
  // ISO date string
  to: external_exports.string().optional(),
  // ISO date string
  user_id: external_exports.string().optional()
});
app3.get("/usage", zValidator("query", usageQuerySchema), async (c) => {
  const query = c.req.valid("query");
  const service = new ModelManagerService(c.env.DB);
  try {
    const stats = await service.getUsageStats({
      userId: query.user_id,
      from: query.from ? new Date(query.from) : void 0,
      to: query.to ? new Date(query.to) : void 0
    });
    return c.json(stats);
  } catch (err) {
    return c.json({ error: "Failed to fetch usage stats", message: err.message }, 500);
  }
});
app3.get("/usage/realtime", async (c) => {
  const userId = c.req.query("user_id");
  const service = new ModelManagerService(c.env.DB);
  try {
    const stats = await service.getRealtimeUsage(userId);
    return c.json(stats);
  } catch (err) {
    return c.json({ error: "Failed to fetch realtime usage", message: err.message }, 500);
  }
});
var models_default = app3;

// src/routes/content.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/domains/content/routes/public.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/domains/content/index.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/domains/content/services/catalog.service.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/domains/content/utils/tag-helpers.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
async function addTagsToContent(db, contentId, tagIds) {
  if (!tagIds || tagIds.length === 0) {
    return;
  }
  const d1 = drizzle(db);
  const tagValues = tagIds.map((tagId) => ({
    contentId,
    tagId
  }));
  await d1.insert(contentTags).values(tagValues);
}
__name(addTagsToContent, "addTagsToContent");
async function replaceContentTags(db, contentId, tagIds) {
  const d1 = drizzle(db);
  await d1.delete(contentTags).where(eq(contentTags.contentId, contentId));
  await addTagsToContent(db, contentId, tagIds);
}
__name(replaceContentTags, "replaceContentTags");

// src/domains/content/services/catalog.service.ts
var CatalogService = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "CatalogService");
  }
  async getContent(contentId, options) {
    const d1 = drizzle(this.db);
    const includeUnpublished = options?.includeUnpublished ?? false;
    const content = await d1.select().from(contentLibrary).where(eq(contentLibrary.id, contentId)).get();
    if (!content) {
      throw new Error("Content not found");
    }
    if (!includeUnpublished && !content.isPublished) {
      throw new Error("Content not published");
    }
    const tagResults = await d1.select({
      id: tags.id,
      name: tags.name,
      category: tags.category,
      color: tags.color
    }).from(contentTags).innerJoin(tags, eq(contentTags.tagId, tags.id)).where(eq(contentTags.contentId, contentId)).all();
    return {
      ...content,
      tags: tagResults
    };
  }
  async searchContent(params) {
    const d1 = drizzle(this.db);
    const conditions = [];
    if (!params.includeUnpublished) {
      conditions.push(eq(contentLibrary.isPublished, true));
    }
    if (params.contentType) {
      conditions.push(eq(contentLibrary.contentType, params.contentType));
    }
    if (params.hskLevel) {
      conditions.push(eq(contentLibrary.hskLevel, params.hskLevel));
    }
    if (params.category) {
      conditions.push(eq(contentLibrary.category, params.category));
    }
    if (params.genre) {
      conditions.push(eq(contentLibrary.genre, params.genre));
    }
    if (params.difficulty) {
      conditions.push(eq(contentLibrary.difficulty, params.difficulty));
    }
    if (params.isFeatured !== void 0) {
      conditions.push(eq(contentLibrary.isFeatured, params.isFeatured));
    }
    if (params.isFree !== void 0) {
      conditions.push(eq(contentLibrary.isFree, params.isFree));
    }
    if (params.query) {
      conditions.push(
        or(
          like(contentLibrary.title, `%${params.query}%`),
          like(contentLibrary.author, `%${params.query}%`),
          like(contentLibrary.description, `%${params.query}%`)
        )
      );
    }
    const baseQuery = conditions.length > 0 ? d1.select().from(contentLibrary).where(and(...conditions)) : d1.select().from(contentLibrary);
    let finalQuery = baseQuery;
    switch (params.sortBy) {
      case "newest":
        finalQuery = baseQuery.orderBy(desc(contentLibrary.createdAt));
        break;
      case "popular":
        finalQuery = baseQuery.orderBy(desc(contentLibrary.viewCount));
        break;
      case "rating":
        finalQuery = baseQuery.orderBy(desc(contentLibrary.averageRating));
        break;
      case "title":
        finalQuery = baseQuery.orderBy(asc(contentLibrary.title));
        break;
      default:
        finalQuery = baseQuery.orderBy(desc(contentLibrary.createdAt));
    }
    const results = await finalQuery.limit(params.limit || 20).offset(params.offset || 0).all();
    if (params.tags && params.tags.length > 0) {
      const contentIds = results.map((content) => content.id);
      if (contentIds.length === 0) {
        return [];
      }
      const taggedContent = await d1.select({ contentId: contentTags.contentId, tagId: contentTags.tagId }).from(contentTags).where(
        and(
          inArray(contentTags.contentId, contentIds),
          inArray(contentTags.tagId, params.tags)
        )
      ).all();
      const matchMap = /* @__PURE__ */ new Map();
      taggedContent.forEach(({ contentId }) => {
        matchMap.set(contentId, (matchMap.get(contentId) || 0) + 1);
      });
      return results.filter((content) => matchMap.get(content.id) === params.tags?.length);
    }
    return results;
  }
  async updateContent(contentId, updates) {
    const d1 = drizzle(this.db);
    const { tags: newTags, ...contentUpdates } = updates;
    if (Object.keys(contentUpdates).length > 0) {
      await d1.update(contentLibrary).set({
        ...contentUpdates,
        updatedAt: /* @__PURE__ */ new Date(),
        ...updates.isPublished === true && { publishedAt: /* @__PURE__ */ new Date() }
      }).where(eq(contentLibrary.id, contentId));
    }
    if (newTags) {
      await replaceContentTags(this.db, contentId, newTags);
    }
  }
  async createTag(params) {
    const d1 = drizzle(this.db);
    const tagId = crypto.randomUUID();
    const slug = params.name.toLowerCase().replace(/\s+/g, "-");
    await d1.insert(tags).values({
      id: tagId,
      name: params.name,
      slug,
      category: params.category,
      color: params.color,
      description: params.description
    });
    return { id: tagId };
  }
  async getAllTags() {
    const d1 = drizzle(this.db);
    return await d1.select().from(tags).all();
  }
  async getFavoriteCounts(contentId) {
    const d1 = drizzle(this.db);
    const result = await d1.select({
      total: sql`count(*)`
    }).from(userLibrary).where(and(eq(userLibrary.contentId, contentId), eq(userLibrary.isFavorite, true))).get();
    return result?.total ?? 0;
  }
};

// src/domains/content/services/media.service.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var MediaService = class {
  constructor(db, bucket) {
    this.db = db;
    this.bucket = bucket;
  }
  static {
    __name(this, "MediaService");
  }
  async uploadContent(params) {
    const contentId = crypto.randomUUID();
    const ext = params.fileName.split(".").pop() || "bin";
    const r2Key = `${params.metadata.contentType}s/${contentId}.${ext}`;
    const now = /* @__PURE__ */ new Date();
    const d1 = drizzle(this.db);
    try {
      await d1.insert(contentLibrary).values({
        id: contentId,
        title: params.metadata.title,
        subtitle: params.metadata.subtitle,
        author: params.metadata.author,
        narrator: params.metadata.narrator,
        description: params.metadata.description,
        contentType: params.metadata.contentType,
        format: ext,
        r2Key,
        fileSize: params.fileSize,
        duration: params.metadata.duration,
        pageCount: params.metadata.pageCount,
        hskLevel: params.metadata.hskLevel,
        difficulty: params.metadata.difficulty,
        targetAudience: params.metadata.targetAudience,
        category: params.metadata.category,
        genre: params.metadata.genre,
        seriesName: params.metadata.seriesName,
        seriesOrder: params.metadata.seriesOrder,
        language: params.metadata.language || "zh",
        isPublished: false,
        isFeatured: false,
        isFree: true,
        requiresPremium: false,
        uploadStatus: "pending_upload",
        // Start as pending
        createdAt: now,
        updatedAt: now
      });
      await addTagsToContent(this.db, contentId, params.metadata.tags);
      await d1.update(contentLibrary).set({ uploadStatus: "uploading" }).where(eq(contentLibrary.id, contentId));
      await this.bucket.put(r2Key, params.file, {
        httpMetadata: { contentType: params.fileType },
        customMetadata: {
          originalName: params.fileName,
          uploadedAt: now.toISOString(),
          contentId
        }
      });
      await d1.update(contentLibrary).set({ uploadStatus: "ready", updatedAt: /* @__PURE__ */ new Date() }).where(eq(contentLibrary.id, contentId));
      return { id: contentId, r2Key };
    } catch (error3) {
      try {
        await d1.update(contentLibrary).set({ uploadStatus: "failed", updatedAt: /* @__PURE__ */ new Date() }).where(eq(contentLibrary.id, contentId));
      } catch {
      }
      try {
        await this.bucket.delete(r2Key);
      } catch {
      }
      throw new Error(`Upload failed: ${error3.message}`);
    }
  }
  async uploadCoverImage(contentId, imageBuffer, fileName, fileType) {
    const ext = fileName.split(".").pop() || "jpg";
    const r2Key = `covers/${contentId}.${ext}`;
    const d1 = drizzle(this.db);
    await this.bucket.put(r2Key, imageBuffer, {
      httpMetadata: { contentType: fileType }
    });
    try {
      await d1.update(contentLibrary).set({ coverImageR2Key: r2Key, updatedAt: /* @__PURE__ */ new Date() }).where(eq(contentLibrary.id, contentId));
    } catch (error3) {
      try {
        await this.bucket.delete(r2Key);
      } catch {
      }
      throw new Error(`Failed to update cover image: ${error3.message}`);
    }
    return r2Key;
  }
  async uploadSample(contentId, sampleBuffer, fileName, fileType) {
    const ext = fileName.split(".").pop() || "mp3";
    const r2Key = `samples/${contentId}-preview.${ext}`;
    const d1 = drizzle(this.db);
    await this.bucket.put(r2Key, sampleBuffer, {
      httpMetadata: { contentType: fileType }
    });
    try {
      await d1.update(contentLibrary).set({ sampleR2Key: r2Key, updatedAt: /* @__PURE__ */ new Date() }).where(eq(contentLibrary.id, contentId));
    } catch (error3) {
      try {
        await this.bucket.delete(r2Key);
      } catch {
      }
      throw new Error(`Failed to update sample: ${error3.message}`);
    }
    return r2Key;
  }
  async getSignedUrl(contentId, options) {
    const d1 = drizzle(this.db);
    const includeUnpublished = options?.includeUnpublished ?? false;
    const content = await d1.select({
      id: contentLibrary.id,
      r2Key: contentLibrary.r2Key,
      isPublished: contentLibrary.isPublished
    }).from(contentLibrary).where(eq(contentLibrary.id, contentId)).get();
    if (!content) {
      throw new Error("Content not found");
    }
    if (!includeUnpublished && !content.isPublished) {
      throw new Error("Content not published");
    }
    if (!content.r2Key) {
      throw new Error("Content has no R2 file");
    }
    const object = await this.bucket.head(content.r2Key);
    if (!object) {
      throw new Error("File not found in R2 storage");
    }
    return `/stream/${contentId}`;
  }
  async streamContent(contentId, options) {
    const includeUnpublished = options?.includeUnpublished ?? false;
    const d1 = drizzle(this.db);
    const content = await d1.select().from(contentLibrary).where(eq(contentLibrary.id, contentId)).get();
    if (!content || !content.r2Key) {
      return null;
    }
    if (!includeUnpublished && !content.isPublished) {
      return null;
    }
    await d1.update(contentLibrary).set({ viewCount: sql`${contentLibrary.viewCount} + 1` }).where(eq(contentLibrary.id, contentId));
    return await this.bucket.get(content.r2Key);
  }
  async deleteContent(contentId) {
    const d1 = drizzle(this.db);
    const content = await d1.select().from(contentLibrary).where(eq(contentLibrary.id, contentId)).get();
    if (!content) {
      throw new Error("Content not found");
    }
    const deletePromises = [];
    if (content.r2Key) deletePromises.push(this.bucket.delete(content.r2Key));
    if (content.coverImageR2Key) deletePromises.push(this.bucket.delete(content.coverImageR2Key));
    if (content.sampleR2Key) deletePromises.push(this.bucket.delete(content.sampleR2Key));
    await Promise.all(deletePromises);
    await d1.delete(contentLibrary).where(eq(contentLibrary.id, contentId));
  }
};

// src/domains/content/services/user-library.service.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var UserLibraryService = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "UserLibraryService");
  }
  async updateUserProgress(params) {
    const d1 = drizzle(this.db);
    await d1.insert(userLibrary).values({
      userId: params.userId,
      contentId: params.contentId,
      progressSeconds: params.progressSeconds || 0,
      progressPage: params.progressPage || 0,
      progressPercentage: params.progressPercentage || 0,
      status: params.status || "in_progress",
      userRating: params.userRating,
      startedAt: /* @__PURE__ */ new Date(),
      lastAccessedAt: /* @__PURE__ */ new Date(),
      ...params.status === "completed" && { completedAt: /* @__PURE__ */ new Date() }
    }).onConflictDoUpdate({
      target: [userLibrary.userId, userLibrary.contentId],
      set: {
        ...params.progressSeconds !== void 0 && { progressSeconds: params.progressSeconds },
        ...params.progressPage !== void 0 && { progressPage: params.progressPage },
        ...params.progressPercentage !== void 0 && { progressPercentage: params.progressPercentage },
        ...params.status && { status: params.status },
        ...params.userRating !== void 0 && { userRating: params.userRating },
        lastAccessedAt: /* @__PURE__ */ new Date(),
        ...params.status === "completed" && { completedAt: /* @__PURE__ */ new Date() }
      }
    });
  }
  async toggleFavorite(userId, contentId) {
    const d1 = drizzle(this.db);
    const current = await d1.select().from(userLibrary).where(and(eq(userLibrary.userId, userId), eq(userLibrary.contentId, contentId))).get();
    const newFavoriteState = current ? !current.isFavorite : true;
    await d1.insert(userLibrary).values({
      userId,
      contentId,
      isFavorite: newFavoriteState,
      lastAccessedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: [userLibrary.userId, userLibrary.contentId],
      set: {
        isFavorite: newFavoriteState,
        lastAccessedAt: /* @__PURE__ */ new Date()
      }
    });
    const favoriteTotal = await this.getFavoriteCount(contentId);
    await d1.update(contentLibrary).set({ favoriteCount: favoriteTotal }).where(eq(contentLibrary.id, contentId));
    return newFavoriteState;
  }
  async getFavoriteCount(contentId) {
    const d1 = drizzle(this.db);
    const favoriteCountRow = await d1.select({
      total: sql`count(*)`
    }).from(userLibrary).where(and(eq(userLibrary.contentId, contentId), eq(userLibrary.isFavorite, true))).get();
    return favoriteCountRow?.total ?? 0;
  }
};

// src/domains/content/index.ts
function createContentServices(env2) {
  return {
    catalog: new CatalogService(env2.DB),
    media: new MediaService(env2.DB, env2.CONTENT_BUCKET),
    userLibrary: new UserLibraryService(env2.DB)
  };
}
__name(createContentServices, "createContentServices");

// src/domains/content/routes/public.ts
var searchSchema = external_exports.object({
  type: external_exports.enum(["audiobook", "text", "video"]).optional(),
  hsk_level: external_exports.coerce.number().min(1).max(6).optional(),
  category: external_exports.string().optional(),
  genre: external_exports.string().optional(),
  difficulty: external_exports.string().optional(),
  tags: external_exports.string().optional(),
  query: external_exports.string().optional(),
  featured: external_exports.coerce.boolean().optional(),
  free: external_exports.coerce.boolean().optional(),
  limit: external_exports.coerce.number().max(100).optional(),
  offset: external_exports.coerce.number().optional(),
  sort: external_exports.enum(["newest", "popular", "rating", "title"]).optional()
});
var createPublicContentRouter = /* @__PURE__ */ __name(() => {
  const router = new Hono2();
  router.get("/library", zValidator("query", searchSchema), async (c) => {
    const filters = c.req.valid("query");
    const { catalog } = createContentServices(c.env);
    try {
      const results = await catalog.searchContent({
        contentType: filters.type,
        hskLevel: filters.hsk_level,
        category: filters.category,
        genre: filters.genre,
        difficulty: filters.difficulty,
        tags: filters.tags?.split(",").filter(Boolean),
        query: filters.query,
        isFeatured: filters.featured,
        isFree: filters.free,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        sortBy: filters.sort || "newest"
      });
      return c.json({
        results,
        count: results.length,
        limit: filters.limit || 20,
        offset: filters.offset || 0
      });
    } catch (err) {
      return c.json({ error: "Search failed", message: err.message }, 500);
    }
  });
  router.get("/library/:id", async (c) => {
    const contentId = c.req.param("id");
    const { catalog, media } = createContentServices(c.env);
    try {
      const content = await catalog.getContent(contentId);
      const streamUrl = await media.getSignedUrl(contentId);
      return c.json({ ...content, streamUrl });
    } catch (err) {
      return c.json({ error: err.message }, 404);
    }
  });
  router.get("/stream/:id", async (c) => {
    const contentId = c.req.param("id");
    const { media } = createContentServices(c.env);
    try {
      const object = await media.streamContent(contentId);
      if (!object) {
        return c.json({ error: "Content not found" }, 404);
      }
      return new Response(object.body, {
        headers: {
          "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
          "Content-Length": object.size.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600"
        }
      });
    } catch (err) {
      return c.json({ error: "Stream failed", message: err.message }, 500);
    }
  });
  router.get("/tags", async (c) => {
    const { catalog } = createContentServices(c.env);
    try {
      const tags2 = await catalog.getAllTags();
      return c.json({ tags: tags2 });
    } catch (err) {
      return c.json({ error: "Failed to fetch tags", message: err.message }, 500);
    }
  });
  return router;
}, "createPublicContentRouter");

// src/domains/content/routes/user.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/analytics.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var AnalyticsService = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "AnalyticsService");
  }
  getClient() {
    return drizzle(this.db);
  }
  async record(event) {
    const d1 = this.getClient();
    await d1.insert(systemEvents).values({
      id: crypto.randomUUID(),
      eventType: event.type,
      requestId: event.requestId,
      userId: event.userId,
      modelUsed: event.modelUsed ?? null,
      promptSlug: event.promptSlug ?? null,
      promptVersion: event.promptVersion ?? null,
      latencyMs: event.latencyMs ?? null,
      costUsd: event.costUsd ?? null,
      metadata: event.metadata ?? null
    });
  }
  async getAiUsageStats(filters) {
    const d1 = this.getClient();
    const records = await d1.select().from(apiUsage).orderBy(desc(apiUsage.createdAt)).limit(500).all();
    const fromTs = filters.from ? new Date(filters.from).getTime() : void 0;
    const toTs = filters.to ? new Date(filters.to).getTime() : void 0;
    const filtered = records.filter((record) => {
      const createdAt = typeof record.createdAt === "number" ? record.createdAt * 1e3 : new Date(record.createdAt).getTime();
      if (fromTs && createdAt < fromTs) return false;
      if (toTs && createdAt > toTs) return false;
      if (filters.model && record.modelUsed !== filters.model) return false;
      if (filters.prompt_slug && record.promptSlug !== filters.prompt_slug) return false;
      if (typeof filters.success === "boolean" && !!record.success !== filters.success) return false;
      return true;
    });
    const totalCost = filtered.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
    const totalTokens = filtered.reduce((sum, r) => sum + (r.totalTokens || 0), 0);
    return {
      summary: {
        totalCost,
        totalTokens,
        totalRequests: filtered.length
      },
      records: filtered
    };
  }
  async getSystemEvents(filters) {
    const d1 = this.getClient();
    const records = await d1.select().from(systemEvents).orderBy(desc(systemEvents.createdAt)).limit(500).all();
    const fromTs = filters.from ? new Date(filters.from).getTime() : void 0;
    const toTs = filters.to ? new Date(filters.to).getTime() : void 0;
    const filtered = records.filter((event) => {
      const createdAt = typeof event.createdAt === "number" ? event.createdAt * 1e3 : new Date(event.createdAt).getTime();
      if (fromTs && createdAt < fromTs) return false;
      if (toTs && createdAt > toTs) return false;
      return true;
    });
    return { records: filtered };
  }
  async getContentEvents(filters) {
    const { records } = await this.getSystemEvents(filters);
    return {
      records: records.filter((event) => event.eventType?.startsWith("content."))
    };
  }
};

// src/domains/content/routes/user.ts
var progressSchema = external_exports.object({
  progress_seconds: external_exports.number().optional(),
  progress_page: external_exports.number().optional(),
  progress_percentage: external_exports.number().min(0).max(100).optional(),
  status: external_exports.enum(["not_started", "in_progress", "completed"]).optional(),
  rating: external_exports.number().min(1).max(5).optional()
});
var createUserContentRouter = /* @__PURE__ */ __name(() => {
  const router = new Hono2();
  router.use("/progress/*", authMiddleware({ allowRoles: ["user", "admin"] }));
  router.use("/favorite/*", authMiddleware({ allowRoles: ["user", "admin"] }));
  router.post("/progress/:id", zValidator("json", progressSchema), async (c) => {
    const contentId = c.req.param("id");
    const data = c.req.valid("json");
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { userLibrary: userLibrary2 } = createContentServices(c.env);
    try {
      await userLibrary2.updateUserProgress({
        userId: user.id,
        contentId,
        progressSeconds: data.progress_seconds,
        progressPage: data.progress_page,
        progressPercentage: data.progress_percentage,
        status: data.status,
        userRating: data.rating
      });
      return c.json({ success: true });
    } catch (err) {
      return c.json({ error: "Failed to update progress", message: err.message }, 500);
    }
  });
  router.post("/favorite/:id", async (c) => {
    const contentId = c.req.param("id");
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { userLibrary: userLibrary2 } = createContentServices(c.env);
    const analytics = new AnalyticsService(c.env.DB);
    try {
      const isFavorite = await userLibrary2.toggleFavorite(user.id, contentId);
      await analytics.record({
        type: "content.favorite.toggle",
        requestId: c.get("requestId"),
        userId: user.id,
        metadata: { contentId, isFavorite }
      });
      return c.json({ success: true, is_favorite: isFavorite });
    } catch (err) {
      return c.json({ error: "Failed to toggle favorite", message: err.message }, 500);
    }
  });
  return router;
}, "createUserContentRouter");

// src/domains/content/routes/admin.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
var MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
var MAX_SAMPLE_UPLOAD_BYTES = 50 * 1024 * 1024;
var ALLOWED_UPLOAD_MIME = /* @__PURE__ */ new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/x-m4a",
  "application/pdf",
  "application/epub+zip",
  "video/mp4"
]);
var ALLOWED_IMAGE_MIME = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/webp"]);
var ALLOWED_SAMPLE_MIME = /* @__PURE__ */ new Set(["audio/mpeg", "audio/mp3", "audio/x-m4a", "audio/wav"]);
var metadataSchema = external_exports.object({
  title: external_exports.string().min(1),
  subtitle: external_exports.string().optional(),
  author: external_exports.string().optional(),
  narrator: external_exports.string().optional(),
  description: external_exports.string().optional(),
  contentType: external_exports.enum(["audiobook", "text", "video"]),
  hskLevel: external_exports.number().min(1).max(6).optional(),
  difficulty: external_exports.enum(["beginner", "intermediate", "advanced"]).optional(),
  targetAudience: external_exports.enum(["kids", "teens", "adults"]).optional(),
  category: external_exports.string().optional(),
  genre: external_exports.string().optional(),
  seriesName: external_exports.string().optional(),
  seriesOrder: external_exports.number().optional(),
  duration: external_exports.number().min(0).optional(),
  pageCount: external_exports.number().min(0).optional(),
  language: external_exports.string().optional(),
  tags: external_exports.array(external_exports.string()).optional()
});
var updateSchema = external_exports.object({
  title: external_exports.string().optional(),
  subtitle: external_exports.string().optional(),
  author: external_exports.string().optional(),
  narrator: external_exports.string().optional(),
  description: external_exports.string().optional(),
  hsk_level: external_exports.number().min(1).max(6).optional(),
  difficulty: external_exports.enum(["beginner", "intermediate", "advanced"]).optional(),
  category: external_exports.string().optional(),
  genre: external_exports.string().optional(),
  is_published: external_exports.boolean().optional(),
  is_featured: external_exports.boolean().optional(),
  is_free: external_exports.boolean().optional(),
  requires_premium: external_exports.boolean().optional(),
  tags: external_exports.array(external_exports.string()).optional()
});
var createTagSchema = external_exports.object({
  name: external_exports.string().min(1),
  category: external_exports.enum(["topic", "grammar", "skill", "genre"]).optional(),
  color: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: external_exports.string().optional()
});
var searchSchema2 = external_exports.object({
  type: external_exports.enum(["audiobook", "text", "video"]).optional(),
  hsk_level: external_exports.coerce.number().min(1).max(6).optional(),
  category: external_exports.string().optional(),
  genre: external_exports.string().optional(),
  difficulty: external_exports.string().optional(),
  tags: external_exports.string().optional(),
  query: external_exports.string().optional(),
  featured: external_exports.coerce.boolean().optional(),
  free: external_exports.coerce.boolean().optional(),
  limit: external_exports.coerce.number().max(100).optional(),
  offset: external_exports.coerce.number().optional(),
  sort: external_exports.enum(["newest", "popular", "rating", "title"]).optional()
});
var recordContentEvent = /* @__PURE__ */ __name(async (c, type, metadata) => {
  const analytics = new AnalyticsService(c.env.DB);
  await analytics.record({
    type,
    requestId: c.get("requestId"),
    userId: c.get("user")?.id,
    metadata
  });
}, "recordContentEvent");
var createAdminContentRouter = /* @__PURE__ */ __name(() => {
  const router = new Hono2();
  router.use("/admin/*", authMiddleware({ allowRoles: ["admin"] }));
  router.post("/admin/upload", async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get("file");
      const metadataStr = formData.get("metadata");
      if (!file) return c.json({ error: "No file provided" }, 400);
      if (!metadataStr) return c.json({ error: "No metadata provided" }, 400);
      const metadata = metadataSchema.parse(JSON.parse(metadataStr));
      const fileSize = file.size ?? 0;
      if (fileSize <= 0) return c.json({ error: "Empty files are not allowed" }, 400);
      if (fileSize > MAX_UPLOAD_BYTES) {
        return c.json({ error: `File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB)` }, 400);
      }
      const fileType = file.type || "application/octet-stream";
      if (!ALLOWED_UPLOAD_MIME.has(fileType)) {
        return c.json({ error: `Unsupported file type: ${fileType}` }, 400);
      }
      const fileBuffer = await file.arrayBuffer();
      const { media } = createContentServices(c.env);
      const result = await media.uploadContent({
        file: fileBuffer,
        fileName: file.name,
        fileType,
        fileSize,
        metadata
      });
      await recordContentEvent(c, "content.upload", {
        contentId: result.id,
        fileSize,
        contentType: metadata.contentType
      });
      return c.json({ success: true, content: result }, 201);
    } catch (err) {
      return c.json({ error: "Upload failed", message: err.message }, 500);
    }
  });
  router.post("/admin/upload-cover/:id", async (c) => {
    const contentId = c.req.param("id");
    try {
      const formData = await c.req.formData();
      const cover = formData.get("cover");
      if (!cover) return c.json({ error: "No cover image provided" }, 400);
      if (cover.size <= 0) return c.json({ error: "Empty cover file provided" }, 400);
      if (cover.size > MAX_IMAGE_UPLOAD_BYTES) {
        return c.json({ error: `Cover image too large (max ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB)` }, 400);
      }
      const coverType = cover.type || "application/octet-stream";
      if (!ALLOWED_IMAGE_MIME.has(coverType)) {
        return c.json({ error: `Unsupported cover image type: ${coverType}` }, 400);
      }
      const coverBuffer = await cover.arrayBuffer();
      const { media } = createContentServices(c.env);
      const r2Key = await media.uploadCoverImage(contentId, coverBuffer, cover.name, coverType);
      await recordContentEvent(c, "content.cover.upload", { contentId, key: r2Key });
      return c.json({ success: true, cover_r2_key: r2Key });
    } catch (err) {
      return c.json({ error: "Cover upload failed", message: err.message }, 500);
    }
  });
  router.post("/admin/upload-sample/:id", async (c) => {
    const contentId = c.req.param("id");
    try {
      const formData = await c.req.formData();
      const sample = formData.get("sample");
      if (!sample) return c.json({ error: "No sample provided" }, 400);
      if (sample.size <= 0) return c.json({ error: "Empty sample file provided" }, 400);
      if (sample.size > MAX_SAMPLE_UPLOAD_BYTES) {
        return c.json({ error: `Sample file too large (max ${MAX_SAMPLE_UPLOAD_BYTES / (1024 * 1024)} MB)` }, 400);
      }
      const sampleType = sample.type || "application/octet-stream";
      if (!ALLOWED_SAMPLE_MIME.has(sampleType)) {
        return c.json({ error: `Unsupported sample file type: ${sampleType}` }, 400);
      }
      const sampleBuffer = await sample.arrayBuffer();
      const { media } = createContentServices(c.env);
      const r2Key = await media.uploadSample(contentId, sampleBuffer, sample.name, sampleType);
      await recordContentEvent(c, "content.sample.upload", { contentId, key: r2Key });
      return c.json({ success: true, sample_r2_key: r2Key });
    } catch (err) {
      return c.json({ error: "Sample upload failed", message: err.message }, 500);
    }
  });
  router.put("/admin/library/:id", zValidator("json", updateSchema), async (c) => {
    const contentId = c.req.param("id");
    const updates = c.req.valid("json");
    const { catalog } = createContentServices(c.env);
    try {
      await catalog.updateContent(contentId, {
        title: updates.title,
        subtitle: updates.subtitle,
        author: updates.author,
        narrator: updates.narrator,
        description: updates.description,
        hskLevel: updates.hsk_level,
        difficulty: updates.difficulty,
        category: updates.category,
        genre: updates.genre,
        isPublished: updates.is_published,
        isFeatured: updates.is_featured,
        isFree: updates.is_free,
        requiresPremium: updates.requires_premium,
        tags: updates.tags
      });
      await recordContentEvent(c, "content.update", {
        contentId,
        fields: Object.keys(updates)
      });
      return c.json({ success: true });
    } catch (err) {
      return c.json({ error: "Update failed", message: err.message }, 500);
    }
  });
  router.delete("/admin/library/:id", async (c) => {
    const contentId = c.req.param("id");
    const { media } = createContentServices(c.env);
    try {
      await media.deleteContent(contentId);
      await recordContentEvent(c, "content.delete", { contentId });
      return c.json({ success: true });
    } catch (err) {
      return c.json({ error: "Delete failed", message: err.message }, 500);
    }
  });
  router.post("/admin/tags", zValidator("json", createTagSchema), async (c) => {
    const data = c.req.valid("json");
    const { catalog } = createContentServices(c.env);
    try {
      const result = await catalog.createTag(data);
      await recordContentEvent(c, "content.tag.create", { tagId: result.id, name: data.name });
      return c.json({ success: true, tag: result }, 201);
    } catch (err) {
      return c.json({ error: "Failed to create tag", message: err.message }, 500);
    }
  });
  router.get("/admin/library", zValidator("query", searchSchema2), async (c) => {
    const filters = c.req.valid("query");
    const { catalog } = createContentServices(c.env);
    try {
      const results = await catalog.searchContent({
        contentType: filters.type,
        hskLevel: filters.hsk_level,
        category: filters.category,
        genre: filters.genre,
        difficulty: filters.difficulty,
        tags: filters.tags?.split(",").filter(Boolean),
        query: filters.query,
        isFeatured: filters.featured,
        isFree: filters.free,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        sortBy: filters.sort || "newest",
        includeUnpublished: true
      });
      return c.json({
        results,
        count: results.length
      });
    } catch (err) {
      return c.json({ error: "Search failed", message: err.message }, 500);
    }
  });
  return router;
}, "createAdminContentRouter");

// src/routes/content.ts
var app4 = new Hono2();
app4.route("/", createPublicContentRouter());
app4.route("/", createUserContentRouter());
app4.route("/", createAdminContentRouter());
var content_default = app4;

// src/index.ts
var import_prompts = __toESM(require_prompts());

// src/routes/analytics.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/services/user-analytics.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var UserAnalyticsService = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "UserAnalyticsService");
  }
  getClient() {
    return drizzle(this.db);
  }
  /**
   * Get user analytics overview
   */
  async getOverview() {
    const d1 = this.getClient();
    const now = Math.floor(Date.now() / 1e3);
    const oneDayAgo = now - 86400;
    const sevenDaysAgo = now - 7 * 86400;
    const thirtyDaysAgo = now - 30 * 86400;
    try {
      const totalResult = await this.db.prepare(
        "SELECT COUNT(*) as total FROM users"
      ).first();
      const tierResult = await this.db.prepare(`
        SELECT tier, COUNT(*) as count FROM users GROUP BY tier
      `).all();
      const signupsToday = await this.db.prepare(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= ?"
      ).bind(oneDayAgo).first();
      const signups7Days = await this.db.prepare(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= ?"
      ).bind(sevenDaysAgo).first();
      const signups30Days = await this.db.prepare(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= ?"
      ).bind(thirtyDaysAgo).first();
      const dau = await this.db.prepare(
        "SELECT COUNT(*) as count FROM users WHERE last_login_at >= ?"
      ).bind(oneDayAgo).first();
      const wau = await this.db.prepare(
        "SELECT COUNT(*) as count FROM users WHERE last_login_at >= ?"
      ).bind(sevenDaysAgo).first();
      const mau = await this.db.prepare(
        "SELECT COUNT(*) as count FROM users WHERE last_login_at >= ?"
      ).bind(thirtyDaysAgo).first();
      const avgSession = await this.db.prepare(`
        SELECT AVG(avg_session_duration_seconds) as avg
        FROM analytics_users_daily
        WHERE date >= date('now', '-30 days')
      `).first();
      const tierBreakdown = { free: 0, premium: 0, pro: 0 };
      for (const row of tierResult.results || []) {
        const tier = row.tier || "free";
        if (tier in tierBreakdown) {
          tierBreakdown[tier] = row.count;
        }
      }
      return {
        totalUsers: totalResult?.total || 0,
        activeUsers: {
          daily: dau?.count || 0,
          weekly: wau?.count || 0,
          monthly: mau?.count || 0
        },
        newSignups: {
          today: signupsToday?.count || 0,
          last7Days: signups7Days?.count || 0,
          last30Days: signups30Days?.count || 0
        },
        tierBreakdown,
        avgSessionDuration: avgSession?.avg || 0
      };
    } catch (err) {
      logWithContext("error", "user_analytics.overview_failed", {
        meta: { error: err.message }
      });
      throw err;
    }
  }
  /**
   * Get user growth data for charts
   */
  async getGrowthData(days = 30) {
    try {
      const aggregated = await this.db.prepare(`
        SELECT date, total_users, new_signups, active_users
        FROM analytics_users_daily
        WHERE date >= date('now', '-${days} days')
        ORDER BY date ASC
      `).all();
      if (aggregated.results && aggregated.results.length > 0) {
        return aggregated.results.map((row) => ({
          date: row.date,
          totalUsers: row.total_users,
          newSignups: row.new_signups,
          activeUsers: row.active_users
        }));
      }
      const result = await this.db.prepare(`
        WITH RECURSIVE dates AS (
          SELECT date('now', '-${days} days') as date
          UNION ALL
          SELECT date(date, '+1 day')
          FROM dates
          WHERE date < date('now')
        )
        SELECT 
          d.date,
          (SELECT COUNT(*) FROM users WHERE date(created_at, 'unixepoch') <= d.date) as total_users,
          (SELECT COUNT(*) FROM users WHERE date(created_at, 'unixepoch') = d.date) as new_signups,
          (SELECT COUNT(*) FROM users WHERE date(last_login_at, 'unixepoch') = d.date) as active_users
        FROM dates d
        ORDER BY d.date ASC
      `).all();
      return (result.results || []).map((row) => ({
        date: row.date,
        totalUsers: row.total_users || 0,
        newSignups: row.new_signups || 0,
        activeUsers: row.active_users || 0
      }));
    } catch (err) {
      logWithContext("error", "user_analytics.growth_data_failed", {
        meta: { error: err.message, days }
      });
      throw err;
    }
  }
  /**
   * Get retention cohort data
   */
  async getRetentionCohorts(weeks = 8) {
    try {
      const result = await this.db.prepare(`
        SELECT cohort_week, week_number, users_in_cohort, users_retained, retention_rate
        FROM analytics_retention_cohorts
        ORDER BY cohort_week DESC, week_number ASC
        LIMIT ?
      `).bind(weeks * 5).all();
      if (result.results && result.results.length > 0) {
        return result.results.map((row) => ({
          cohortWeek: row.cohort_week,
          weekNumber: row.week_number,
          usersInCohort: row.users_in_cohort,
          usersRetained: row.users_retained,
          retentionRate: row.retention_rate || 0
        }));
      }
      return [];
    } catch (err) {
      logWithContext("error", "user_analytics.retention_failed", {
        meta: { error: err.message }
      });
      return [];
    }
  }
  /**
   * Get tier breakdown over time
   */
  async getTierHistory(days = 30) {
    try {
      const result = await this.db.prepare(`
        SELECT date, tier, user_count
        FROM analytics_tier_daily
        WHERE date >= date('now', '-${days} days')
        ORDER BY date ASC
      `).all();
      const byDate = {};
      for (const row of result.results || []) {
        if (!byDate[row.date]) {
          byDate[row.date] = { free: 0, premium: 0, pro: 0 };
        }
        if (row.tier in byDate[row.date]) {
          byDate[row.date][row.tier] = row.user_count;
        }
      }
      return Object.entries(byDate).map(([date, tiers]) => ({
        date,
        ...tiers
      }));
    } catch (err) {
      logWithContext("error", "user_analytics.tier_history_failed", {
        meta: { error: err.message }
      });
      return [];
    }
  }
  /**
   * Record a raw analytics event
   */
  async recordEvent(event) {
    const d1 = this.getClient();
    await d1.insert(analyticsEventsRaw).values({
      id: crypto.randomUUID(),
      eventType: event.eventType,
      userId: event.userId ?? null,
      sessionId: event.sessionId ?? null,
      payload: event.payload ?? null
    });
  }
};

// src/services/ai-analytics.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var AIAnalyticsService = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "AIAnalyticsService");
  }
  /**
   * Get AI usage overview for a date range
   */
  async getOverview(from, to) {
    const whereClause = this.buildDateWhere(from, to);
    const result = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(estimated_cost), 0) as total_cost,
        COALESCE(AVG(latency_ms), 0) as avg_latency,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM api_usage
      ${whereClause}
    `).first();
    const totalRequests = Number(result?.total_requests || 0);
    const successCount = Number(result?.success_count || 0);
    return {
      totalRequests,
      totalTokens: Number(result?.total_tokens || 0),
      inputTokens: Number(result?.input_tokens || 0),
      outputTokens: Number(result?.output_tokens || 0),
      totalCost: Number(result?.total_cost || 0),
      successRate: totalRequests > 0 ? successCount / totalRequests * 100 : 0,
      avgLatencyMs: Number(result?.avg_latency || 0),
      uniqueUsers: Number(result?.unique_users || 0)
    };
  }
  /**
   * Get daily usage for charts
   */
  async getDailyUsage(days = 30) {
    const results = await this.db.prepare(`
      SELECT 
        date(created_at, 'unixepoch') as date,
        COUNT(*) as requests,
        COALESCE(SUM(total_tokens), 0) as tokens,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(estimated_cost), 0) as cost,
        COALESCE(AVG(latency_ms), 0) as avg_latency,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as error_count
      FROM api_usage
      WHERE created_at >= strftime('%s', 'now', '-${days} days')
      GROUP BY date(created_at, 'unixepoch')
      ORDER BY date ASC
    `).all();
    const dailyMap = /* @__PURE__ */ new Map();
    for (const row of results.results || []) {
      dailyMap.set(row.date, {
        date: row.date,
        requests: Number(row.requests),
        tokens: Number(row.tokens),
        inputTokens: Number(row.input_tokens),
        outputTokens: Number(row.output_tokens),
        cost: Number(row.cost),
        avgLatencyMs: Number(row.avg_latency),
        successCount: Number(row.success_count),
        errorCount: Number(row.error_count)
      });
    }
    const allDates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      allDates.push(dailyMap.get(dateStr) || {
        date: dateStr,
        requests: 0,
        tokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        avgLatencyMs: 0,
        successCount: 0,
        errorCount: 0
      });
    }
    return allDates;
  }
  /**
   * Get breakdown by model
   */
  async getModelBreakdown(from, to) {
    const whereClause = this.buildDateWhere(from, to);
    const results = await this.db.prepare(`
      SELECT 
        model_used as model,
        COUNT(*) as requests,
        COALESCE(SUM(total_tokens), 0) as tokens,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(estimated_cost), 0) as cost,
        COALESCE(AVG(latency_ms), 0) as avg_latency,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count
      FROM api_usage
      ${whereClause}
      GROUP BY model_used
      ORDER BY requests DESC
    `).all();
    return (results.results || []).map((row) => {
      const requests = Number(row.requests);
      const tokens = Number(row.tokens);
      const cost = Number(row.cost);
      const successCount = Number(row.success_count);
      return {
        model: row.model || "unknown",
        requests,
        tokens,
        inputTokens: Number(row.input_tokens),
        outputTokens: Number(row.output_tokens),
        cost,
        avgLatencyMs: Number(row.avg_latency),
        successRate: requests > 0 ? successCount / requests * 100 : 0,
        costPer1kTokens: tokens > 0 ? cost / tokens * 1e3 : 0
      };
    });
  }
  /**
   * Get prompt performance comparison
   */
  async getPromptPerformance(from, to) {
    const whereClause = this.buildDateWhere(from, to);
    const results = await this.db.prepare(`
      SELECT 
        prompt_slug,
        COUNT(*) as requests,
        COALESCE(SUM(total_tokens), 0) as tokens,
        COALESCE(AVG(latency_ms), 0) as avg_latency,
        COALESCE(AVG(estimated_cost), 0) as avg_cost,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
        MAX(created_at) as last_used
      FROM api_usage
      ${whereClause}
      GROUP BY prompt_slug
      ORDER BY requests DESC
    `).all();
    const promptVersions = await this.db.prepare(`
      SELECT slug, version
      FROM prompt_templates
      WHERE status = 'active'
    `).all();
    const versionMap = /* @__PURE__ */ new Map();
    for (const row of promptVersions.results || []) {
      versionMap.set(row.slug, Number(row.version));
    }
    return (results.results || []).map((row) => {
      const requests = Number(row.requests);
      const successCount = Number(row.success_count);
      const slug = row.prompt_slug || "unknown";
      return {
        promptSlug: slug,
        activeVersion: versionMap.get(slug) || null,
        requests,
        tokens: Number(row.tokens),
        avgLatencyMs: Number(row.avg_latency),
        successRate: requests > 0 ? successCount / requests * 100 : 0,
        avgCost: Number(row.avg_cost),
        lastUsed: row.last_used ? new Date(Number(row.last_used) * 1e3).toISOString() : null
      };
    });
  }
  /**
   * Get latency distribution
   */
  async getLatencyDistribution(from, to) {
    const whereClause = this.buildDateWhere(from, to);
    const result = await this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN latency_ms < 500 THEN 1 ELSE 0 END) as under_500,
        SUM(CASE WHEN latency_ms >= 500 AND latency_ms < 1000 THEN 1 ELSE 0 END) as ms_500_1000,
        SUM(CASE WHEN latency_ms >= 1000 AND latency_ms < 2000 THEN 1 ELSE 0 END) as ms_1000_2000,
        SUM(CASE WHEN latency_ms >= 2000 AND latency_ms < 5000 THEN 1 ELSE 0 END) as ms_2000_5000,
        SUM(CASE WHEN latency_ms >= 5000 THEN 1 ELSE 0 END) as over_5000
      FROM api_usage
      ${whereClause}
      AND latency_ms IS NOT NULL
    `).first();
    const total = Number(result?.total || 1);
    const buckets = [
      { bucket: "<500ms", count: Number(result?.under_500 || 0), percentage: 0 },
      { bucket: "500-1s", count: Number(result?.ms_500_1000 || 0), percentage: 0 },
      { bucket: "1-2s", count: Number(result?.ms_1000_2000 || 0), percentage: 0 },
      { bucket: "2-5s", count: Number(result?.ms_2000_5000 || 0), percentage: 0 },
      { bucket: ">5s", count: Number(result?.over_5000 || 0), percentage: 0 }
    ];
    for (const bucket of buckets) {
      bucket.percentage = total > 0 ? bucket.count / total * 100 : 0;
    }
    return buckets;
  }
  /**
   * Get percentile latencies
   */
  async getLatencyPercentiles(from, to) {
    const whereClause = this.buildDateWhere(from, to);
    const results = await this.db.prepare(`
      SELECT latency_ms
      FROM api_usage
      ${whereClause}
      AND latency_ms IS NOT NULL
      ORDER BY latency_ms ASC
    `).all();
    const latencies = (results.results || []).map((r) => Number(r.latency_ms));
    if (latencies.length === 0) {
      return { p50: 0, p90: 0, p99: 0 };
    }
    const getPercentile = /* @__PURE__ */ __name((arr, p) => {
      const index2 = Math.ceil(p / 100 * arr.length) - 1;
      return arr[Math.max(0, index2)];
    }, "getPercentile");
    return {
      p50: getPercentile(latencies, 50),
      p90: getPercentile(latencies, 90),
      p99: getPercentile(latencies, 99)
    };
  }
  /**
   * Get recent errors
   */
  async getRecentErrors(limit = 20) {
    const results = await this.db.prepare(`
      SELECT 
        id,
        created_at,
        model_used,
        prompt_slug,
        error_message,
        latency_ms
      FROM api_usage
      WHERE success = 0 AND error_message IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
    `).all();
    return (results.results || []).map((row) => ({
      id: row.id,
      timestamp: new Date(Number(row.created_at) * 1e3).toISOString(),
      model: row.model_used || "unknown",
      promptSlug: row.prompt_slug,
      errorMessage: row.error_message || "Unknown error",
      latencyMs: row.latency_ms
    }));
  }
  /**
   * Get hourly usage for today
   */
  async getHourlyUsageToday() {
    const results = await this.db.prepare(`
      SELECT 
        CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) as hour,
        COUNT(*) as requests,
        COALESCE(SUM(total_tokens), 0) as tokens
      FROM api_usage
      WHERE date(created_at, 'unixepoch') = date('now')
      GROUP BY hour
      ORDER BY hour ASC
    `).all();
    const hourlyMap = /* @__PURE__ */ new Map();
    for (const row of results.results || []) {
      hourlyMap.set(Number(row.hour), {
        requests: Number(row.requests),
        tokens: Number(row.tokens)
      });
    }
    return Array.from({ length: 24 }, (_, hour2) => ({
      hour: hour2,
      requests: hourlyMap.get(hour2)?.requests || 0,
      tokens: hourlyMap.get(hour2)?.tokens || 0
    }));
  }
  buildDateWhere(from, to) {
    const conditions = [];
    if (from) {
      const fromTs = Math.floor(new Date(from).getTime() / 1e3);
      conditions.push(`created_at >= ${fromTs}`);
    }
    if (to) {
      const toTs = Math.floor(new Date(to).getTime() / 1e3) + 86400;
      conditions.push(`created_at < ${toTs}`);
    }
    return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  }
};

// src/services/content-analytics.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var ContentAnalyticsService = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "ContentAnalyticsService");
  }
  /**
   * Get content analytics overview
   */
  async getOverview() {
    try {
      const lessonTotal = await this.db.prepare(
        "SELECT COUNT(*) as count FROM lessons"
      ).first();
      const lessonPublished = await this.db.prepare(
        "SELECT COUNT(*) as count FROM lessons WHERE is_published = 1"
      ).first();
      const lessonCompletions = await this.db.prepare(
        "SELECT COUNT(*) as count FROM user_progress WHERE status = ?"
      ).bind("completed").first();
      const lessonStarts = await this.db.prepare(
        "SELECT COUNT(DISTINCT lesson_id) as count FROM user_progress"
      ).first();
      const storyTotal = await this.db.prepare(
        "SELECT COUNT(*) as count FROM stories"
      ).first();
      const storyPublished = await this.db.prepare(
        "SELECT COUNT(*) as count FROM stories WHERE is_published = 1"
      ).first();
      const vocabTotal = await this.db.prepare(
        "SELECT COUNT(*) as count FROM vocabulary"
      ).first();
      const vocabLearned = await this.db.prepare(
        "SELECT COUNT(DISTINCT atom_id) as count FROM user_knowledge_snapshot WHERE bucket != ?"
      ).bind("new").first();
      const vocabMastered = await this.db.prepare(
        "SELECT COUNT(DISTINCT atom_id) as count FROM user_knowledge_snapshot WHERE bucket = ?"
      ).bind("mastered").first();
      const completionRate = (lessonStarts?.count || 0) > 0 ? (lessonCompletions?.count || 0) / (lessonStarts?.count || 1) * 100 : 0;
      return {
        lessons: {
          total: lessonTotal?.count || 0,
          published: lessonPublished?.count || 0,
          totalCompletions: lessonCompletions?.count || 0,
          avgCompletionRate: Math.round(completionRate * 10) / 10
        },
        stories: {
          total: storyTotal?.count || 0,
          published: storyPublished?.count || 0,
          totalReads: 0
          // Will come from analytics table when tracking is active
        },
        vocabulary: {
          total: vocabTotal?.count || 0,
          wordsLearned: vocabLearned?.count || 0,
          wordsMastered: vocabMastered?.count || 0
        }
      };
    } catch (err) {
      logWithContext("error", "content_analytics.overview_failed", {
        meta: { error: err.message }
      });
      throw err;
    }
  }
  /**
   * Get daily engagement data for charts
   */
  async getEngagementData(days = 30) {
    try {
      const result = await this.db.prepare(`
        SELECT 
          date,
          SUM(CASE WHEN content_type = 'lesson' THEN total_views ELSE 0 END) as lessons,
          SUM(CASE WHEN content_type = 'story' THEN total_views ELSE 0 END) as stories,
          SUM(CASE WHEN content_type = 'vocabulary' THEN total_views ELSE 0 END) as vocabulary
        FROM analytics_content_daily
        WHERE date >= date('now', '-${days} days')
        GROUP BY date
        ORDER BY date ASC
      `).all();
      if (result.results && result.results.length > 0) {
        return result.results;
      }
      const fallback = await this.db.prepare(`
        WITH RECURSIVE dates AS (
          SELECT date('now', '-${days} days') as date
          UNION ALL
          SELECT date(date, '+1 day')
          FROM dates
          WHERE date < date('now')
        )
        SELECT 
          d.date,
          (SELECT COUNT(*) FROM user_progress WHERE date(updated_at, 'unixepoch') = d.date) as lessons,
          0 as stories,
          (SELECT COUNT(*) FROM user_knowledge_snapshot WHERE date(updated_at, 'unixepoch') = d.date) as vocabulary
        FROM dates d
        ORDER BY d.date ASC
      `).all();
      return (fallback.results || []).map((row) => ({
        date: row.date,
        lessons: row.lessons || 0,
        stories: row.stories || 0,
        vocabulary: row.vocabulary || 0
      }));
    } catch (err) {
      logWithContext("error", "content_analytics.engagement_failed", {
        meta: { error: err.message }
      });
      return [];
    }
  }
  /**
   * Get most popular lessons
   */
  async getPopularLessons(limit = 10) {
    try {
      const result = await this.db.prepare(`
        SELECT 
          l.id,
          l.title,
          l.hsk_level as hskLevel,
          COUNT(DISTINCT up.user_id) as views,
          SUM(CASE WHEN up.status = 'completed' THEN 1 ELSE 0 END) as completions
        FROM lessons l
        LEFT JOIN user_progress up ON up.lesson_id = l.id
        WHERE l.is_published = 1
        GROUP BY l.id
        ORDER BY views DESC
        LIMIT ?
      `).bind(limit).all();
      return (result.results || []).map((row) => ({
        id: row.id,
        title: row.title || "Untitled",
        hskLevel: row.hskLevel || 1,
        views: row.views || 0,
        completions: row.completions || 0,
        completionRate: row.views > 0 ? Math.round(row.completions / row.views * 100 * 10) / 10 : 0
      }));
    } catch (err) {
      logWithContext("error", "content_analytics.popular_lessons_failed", {
        meta: { error: err.message }
      });
      return [];
    }
  }
  /**
   * Get most popular stories
   */
  async getPopularStories(limit = 10) {
    try {
      const result = await this.db.prepare(`
        SELECT 
          s.id,
          s.title,
          s.hsk_level as hskLevel,
          0 as views,
          0 as completions
        FROM stories s
        WHERE s.is_published = 1
        ORDER BY s.hsk_level ASC
        LIMIT ?
      `).bind(limit).all();
      return (result.results || []).map((row) => ({
        id: row.id,
        title: row.title || "Untitled",
        hskLevel: row.hskLevel || 1,
        views: row.views || 0,
        completions: row.completions || 0,
        completionRate: 0
      }));
    } catch (err) {
      logWithContext("error", "content_analytics.popular_stories_failed", {
        meta: { error: err.message }
      });
      return [];
    }
  }
  /**
   * Get HSK level breakdown
   */
  async getHskBreakdown() {
    try {
      const result = await this.db.prepare(`
        SELECT 
          hsk_level as level,
          (SELECT COUNT(*) FROM lessons WHERE hsk_level = l.hsk_level AND is_published = 1) as lessons,
          (SELECT COUNT(*) FROM stories WHERE hsk_level = l.hsk_level AND is_published = 1) as stories,
          (SELECT COUNT(*) FROM vocabulary WHERE hsk_level = l.hsk_level) as vocabulary,
          (SELECT COUNT(*) FROM user_progress up 
           JOIN lessons le ON le.id = up.lesson_id 
           WHERE le.hsk_level = l.hsk_level AND up.status = 'completed') as completions,
          (SELECT COUNT(DISTINCT up.user_id) FROM user_progress up 
           JOIN lessons le ON le.id = up.lesson_id 
           WHERE le.hsk_level = l.hsk_level) as uniqueUsers
        FROM (SELECT DISTINCT hsk_level FROM lessons WHERE hsk_level BETWEEN 1 AND 6) l
        ORDER BY level ASC
      `).all();
      const levels = [1, 2, 3, 4, 5, 6];
      const resultMap = new Map(
        (result.results || []).map((r) => [r.level, r])
      );
      return levels.map((level) => {
        const data = resultMap.get(level);
        return {
          level,
          lessons: data?.lessons || 0,
          stories: data?.stories || 0,
          vocabulary: data?.vocabulary || 0,
          completions: data?.completions || 0,
          uniqueUsers: data?.uniqueUsers || 0
        };
      });
    } catch (err) {
      logWithContext("error", "content_analytics.hsk_breakdown_failed", {
        meta: { error: err.message }
      });
      return [];
    }
  }
  /**
   * Get vocabulary learning progress
   */
  async getVocabProgress() {
    try {
      const result = await this.db.prepare(`
        SELECT 
          bucket,
          COUNT(DISTINCT atom_id) as count
        FROM user_knowledge_snapshot
        GROUP BY bucket
      `).all();
      const buckets = {
        new: 0,
        weak: 0,
        learning: 0,
        mastered: 0
      };
      for (const row of result.results || []) {
        if (row.bucket in buckets) {
          buckets[row.bucket] = row.count;
        }
      }
      const total = Object.values(buckets).reduce((a, b) => a + b, 0);
      return {
        new: buckets.new,
        weak: buckets.weak,
        learning: buckets.learning,
        mastered: buckets.mastered,
        total
      };
    } catch (err) {
      logWithContext("error", "content_analytics.vocab_progress_failed", {
        meta: { error: err.message }
      });
      return { new: 0, weak: 0, learning: 0, mastered: 0, total: 0 };
    }
  }
};

// src/services/engagement-tracking.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
async function ingestEventsBatch(db, request) {
  const { events } = request;
  const errors = [];
  let accepted = 0;
  let rejected = 0;
  const validEvents = [];
  for (const event of events) {
    try {
      const parsed = parseEvent(event);
      if (parsed) {
        validEvents.push(parsed);
        accepted++;
      } else {
        rejected++;
        errors.push(`Invalid event: ${event.id}`);
      }
    } catch (err) {
      rejected++;
      errors.push(`Error parsing event ${event.id}: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }
  if (validEvents.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < validEvents.length; i += batchSize) {
      const batch = validEvents.slice(i, i + batchSize);
      await db.insert(engagementEventsRaw).values(batch.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        contentId: e.contentId,
        contentType: e.contentType,
        hskLevel: e.hskLevel,
        timestamp: e.timestamp,
        timeSeconds: e.timeSeconds,
        payload: e.payload,
        processed: e.processed
      }))).onConflictDoNothing();
    }
  }
  return {
    accepted,
    rejected,
    errors: errors.length > 0 ? errors : void 0
  };
}
__name(ingestEventsBatch, "ingestEventsBatch");
function parseEvent(event) {
  let contentId;
  let contentType;
  let timeSeconds = null;
  if (event.type.startsWith("lesson.")) {
    if (!event.payload.lessonId) return null;
    contentId = event.payload.lessonId;
    contentType = "lesson";
    if (event.payload.blockTimings) {
      timeSeconds = event.payload.blockTimings.reduce((sum, b) => sum + b.seconds, 0);
    }
  } else if (event.type.startsWith("story.")) {
    if (!event.payload.storyId) return null;
    contentId = event.payload.storyId;
    contentType = "story";
  } else if (event.type.startsWith("vocab.")) {
    if (!event.payload.vocabId) return null;
    contentId = event.payload.vocabId;
    contentType = "vocab";
  } else if (event.type === "practice.completed") {
    contentType = event.payload.practiceType || "lesson";
    contentId = event.payload.lessonId || event.payload.storyId || "practice";
  } else {
    return null;
  }
  return {
    id: event.id,
    eventType: event.type,
    contentId,
    contentType,
    hskLevel: event.payload.hskLevel || null,
    timestamp: event.timestamp,
    timeSeconds,
    payload: event.payload,
    processed: false
  };
}
__name(parseEvent, "parseEvent");
async function getLessonStats(db, lessonId) {
  const [stats] = await db.select().from(analyticsLessonStats).where(eq(analyticsLessonStats.lessonId, lessonId)).limit(1);
  if (!stats) {
    return null;
  }
  const [lesson] = await db.select({ title: lessons.title, hskLevel: lessons.hskLevel }).from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  return {
    lessonId,
    title: lesson?.title,
    hskLevel: lesson?.hskLevel,
    totalStarts: stats.totalStarts || 0,
    totalCompletions: stats.totalCompletions || 0,
    completionRate: stats.completionRate || 0,
    avgTimeSeconds: stats.avgTimeSeconds || 0,
    minTimeSeconds: stats.minTimeSeconds || 0,
    maxTimeSeconds: stats.maxTimeSeconds || 0,
    medianTimeSeconds: stats.medianTimeSeconds || 0,
    p90TimeSeconds: stats.p90TimeSeconds || 0,
    avgScore: stats.avgScore || 0,
    blockStats: stats.blockStats,
    lastEventAt: stats.lastEventAt || void 0
  };
}
__name(getLessonStats, "getLessonStats");
async function getStoryStats(db, storyId) {
  const [stats] = await db.select().from(analyticsStoryStats).where(eq(analyticsStoryStats.storyId, storyId)).limit(1);
  if (!stats) {
    return null;
  }
  const [story] = await db.select({ title: stories.title, hskLevel: stories.hskLevel }).from(stories).where(eq(stories.id, storyId)).limit(1);
  return {
    storyId,
    title: story?.title,
    hskLevel: story?.hskLevel,
    totalStarts: stats.totalStarts || 0,
    totalCompletions: stats.totalCompletions || 0,
    completionRate: stats.completionRate || 0,
    avgTimeSeconds: stats.avgTimeSeconds || 0,
    avgSentencesRead: stats.avgSentencesRead || 0,
    sentenceStats: stats.sentenceStats,
    lastEventAt: stats.lastEventAt || void 0
  };
}
__name(getStoryStats, "getStoryStats");
async function getVocabStats(db, vocabId) {
  const [stats] = await db.select().from(analyticsVocabStats).where(eq(analyticsVocabStats.vocabId, vocabId)).limit(1);
  if (!stats) {
    return null;
  }
  return {
    vocabId,
    totalReviews: stats.totalReviews || 0,
    correctCount: stats.correctCount || 0,
    incorrectCount: stats.incorrectCount || 0,
    accuracyRate: stats.accuracyRate || 0,
    avgResponseTimeMs: stats.avgResponseTimeMs || 0
  };
}
__name(getVocabStats, "getVocabStats");
async function getAllLessonStats(db, options) {
  const { hskLevel, limit = 50, orderBy = "completions" } = options || {};
  let orderByClause;
  switch (orderBy) {
    case "time":
      orderByClause = desc(analyticsLessonStats.avgTimeSeconds);
      break;
    case "rate":
      orderByClause = desc(analyticsLessonStats.completionRate);
      break;
    default:
      orderByClause = desc(analyticsLessonStats.totalCompletions);
  }
  const query = db.select({
    lessonId: analyticsLessonStats.lessonId,
    totalStarts: analyticsLessonStats.totalStarts,
    totalCompletions: analyticsLessonStats.totalCompletions,
    completionRate: analyticsLessonStats.completionRate,
    avgTimeSeconds: analyticsLessonStats.avgTimeSeconds,
    minTimeSeconds: analyticsLessonStats.minTimeSeconds,
    maxTimeSeconds: analyticsLessonStats.maxTimeSeconds,
    medianTimeSeconds: analyticsLessonStats.medianTimeSeconds,
    p90TimeSeconds: analyticsLessonStats.p90TimeSeconds,
    avgScore: analyticsLessonStats.avgScore,
    blockStats: analyticsLessonStats.blockStats,
    lastEventAt: analyticsLessonStats.lastEventAt,
    title: lessons.title,
    hskLevel: lessons.hskLevel
  }).from(analyticsLessonStats).leftJoin(lessons, eq(analyticsLessonStats.lessonId, lessons.id)).orderBy(orderByClause).limit(limit);
  const results = await (hskLevel ? query.where(eq(lessons.hskLevel, hskLevel)) : query);
  return results.map((r) => ({
    lessonId: r.lessonId,
    title: r.title || void 0,
    hskLevel: r.hskLevel || void 0,
    totalStarts: r.totalStarts || 0,
    totalCompletions: r.totalCompletions || 0,
    completionRate: r.completionRate || 0,
    avgTimeSeconds: r.avgTimeSeconds || 0,
    minTimeSeconds: r.minTimeSeconds || 0,
    maxTimeSeconds: r.maxTimeSeconds || 0,
    medianTimeSeconds: r.medianTimeSeconds || 0,
    p90TimeSeconds: r.p90TimeSeconds || 0,
    avgScore: r.avgScore || 0,
    blockStats: r.blockStats,
    lastEventAt: r.lastEventAt || void 0
  }));
}
__name(getAllLessonStats, "getAllLessonStats");
async function getAllStoryStats(db, options) {
  const { hskLevel, limit = 50, orderBy = "completions" } = options || {};
  let orderByClause;
  switch (orderBy) {
    case "time":
      orderByClause = desc(analyticsStoryStats.avgTimeSeconds);
      break;
    case "rate":
      orderByClause = desc(analyticsStoryStats.completionRate);
      break;
    default:
      orderByClause = desc(analyticsStoryStats.totalCompletions);
  }
  const query = db.select({
    storyId: analyticsStoryStats.storyId,
    totalStarts: analyticsStoryStats.totalStarts,
    totalCompletions: analyticsStoryStats.totalCompletions,
    completionRate: analyticsStoryStats.completionRate,
    avgTimeSeconds: analyticsStoryStats.avgTimeSeconds,
    avgSentencesRead: analyticsStoryStats.avgSentencesRead,
    sentenceStats: analyticsStoryStats.sentenceStats,
    lastEventAt: analyticsStoryStats.lastEventAt,
    title: stories.title,
    hskLevel: stories.hskLevel
  }).from(analyticsStoryStats).leftJoin(stories, eq(analyticsStoryStats.storyId, stories.id)).orderBy(orderByClause).limit(limit);
  const results = await (hskLevel ? query.where(eq(stories.hskLevel, hskLevel)) : query);
  return results.map((r) => ({
    storyId: r.storyId,
    title: r.title || void 0,
    hskLevel: r.hskLevel || void 0,
    totalStarts: r.totalStarts || 0,
    totalCompletions: r.totalCompletions || 0,
    completionRate: r.completionRate || 0,
    avgTimeSeconds: r.avgTimeSeconds || 0,
    avgSentencesRead: r.avgSentencesRead || 0,
    sentenceStats: r.sentenceStats,
    lastEventAt: r.lastEventAt || void 0
  }));
}
__name(getAllStoryStats, "getAllStoryStats");
async function getEngagementOverview(db, startDate, endDate) {
  const lessonResults = await db.select({
    totalStarts: sql`coalesce(sum(${analyticsLessonStats.totalStarts}), 0)`,
    totalCompletions: sql`coalesce(sum(${analyticsLessonStats.totalCompletions}), 0)`,
    avgCompletionRate: sql`coalesce(avg(${analyticsLessonStats.completionRate}), 0)`,
    avgTimeSeconds: sql`coalesce(avg(${analyticsLessonStats.avgTimeSeconds}), 0)`
  }).from(analyticsLessonStats);
  const storyResults = await db.select({
    totalStarts: sql`coalesce(sum(${analyticsStoryStats.totalStarts}), 0)`,
    totalCompletions: sql`coalesce(sum(${analyticsStoryStats.totalCompletions}), 0)`,
    avgCompletionRate: sql`coalesce(avg(${analyticsStoryStats.completionRate}), 0)`
  }).from(analyticsStoryStats);
  const vocabResults = await db.select({
    totalReviews: sql`coalesce(sum(${analyticsVocabStats.totalReviews}), 0)`,
    avgAccuracyRate: sql`coalesce(avg(${analyticsVocabStats.accuracyRate}), 0)`
  }).from(analyticsVocabStats);
  const trendsResults = await db.select({
    date: analyticsEngagementDaily.date,
    contentType: analyticsEngagementDaily.contentType,
    totalCompletions: analyticsEngagementDaily.totalCompletions
  }).from(analyticsEngagementDaily).where(and(
    gte(analyticsEngagementDaily.date, startDate),
    lte(analyticsEngagementDaily.date, endDate)
  )).orderBy(analyticsEngagementDaily.date);
  const trendsByDate = /* @__PURE__ */ new Map();
  for (const row of trendsResults) {
    if (!trendsByDate.has(row.date)) {
      trendsByDate.set(row.date, { lessonCompletions: 0, storyCompletions: 0, vocabReviews: 0 });
    }
    const entry = trendsByDate.get(row.date);
    if (row.contentType === "lesson") {
      entry.lessonCompletions = row.totalCompletions || 0;
    } else if (row.contentType === "story") {
      entry.storyCompletions = row.totalCompletions || 0;
    } else if (row.contentType === "vocab") {
      entry.vocabReviews = row.totalCompletions || 0;
    }
  }
  const trends = Array.from(trendsByDate.entries()).map(([date, data]) => ({
    date,
    ...data
  }));
  return {
    lessons: lessonResults[0] || { totalStarts: 0, totalCompletions: 0, avgCompletionRate: 0, avgTimeSeconds: 0 },
    stories: storyResults[0] || { totalStarts: 0, totalCompletions: 0, avgCompletionRate: 0 },
    vocab: vocabResults[0] || { totalReviews: 0, avgAccuracyRate: 0 },
    trends
  };
}
__name(getEngagementOverview, "getEngagementOverview");
async function aggregateEngagementEvents(db) {
  let processed = 0;
  let errors = 0;
  const unprocessedEvents = await db.select().from(engagementEventsRaw).where(eq(engagementEventsRaw.processed, false)).limit(1e3);
  const lessonEvents = /* @__PURE__ */ new Map();
  const storyEvents = /* @__PURE__ */ new Map();
  const vocabEvents = /* @__PURE__ */ new Map();
  for (const event of unprocessedEvents) {
    if (event.contentType === "lesson") {
      if (!lessonEvents.has(event.contentId)) {
        lessonEvents.set(event.contentId, []);
      }
      lessonEvents.get(event.contentId).push(event);
    } else if (event.contentType === "story") {
      if (!storyEvents.has(event.contentId)) {
        storyEvents.set(event.contentId, []);
      }
      storyEvents.get(event.contentId).push(event);
    } else if (event.contentType === "vocab") {
      if (!vocabEvents.has(event.contentId)) {
        vocabEvents.set(event.contentId, []);
      }
      vocabEvents.get(event.contentId).push(event);
    }
  }
  for (const [lessonId, events] of lessonEvents) {
    try {
      await aggregateLessonStats(db, lessonId, events);
      processed += events.length;
    } catch {
      errors += events.length;
    }
  }
  for (const [storyId, events] of storyEvents) {
    try {
      await aggregateStoryStats(db, storyId, events);
      processed += events.length;
    } catch {
      errors += events.length;
    }
  }
  for (const [vocabId, events] of vocabEvents) {
    try {
      await aggregateVocabStats(db, vocabId, events);
      processed += events.length;
    } catch {
      errors += events.length;
    }
  }
  if (unprocessedEvents.length > 0) {
    const eventIds = unprocessedEvents.map((e) => e.id);
    const batchSize = 50;
    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize);
      await db.update(engagementEventsRaw).set({ processed: true }).where(sql`${engagementEventsRaw.id} IN (${sql.join(batch.map((id) => sql`${id}`), sql`, `)})`);
    }
  }
  await updateDailyEngagement(db);
  return { processed, errors };
}
__name(aggregateEngagementEvents, "aggregateEngagementEvents");
async function aggregateLessonStats(db, lessonId, events) {
  const [existing] = await db.select().from(analyticsLessonStats).where(eq(analyticsLessonStats.lessonId, lessonId)).limit(1);
  const starts = events.filter((e) => e.eventType === "lesson.started").length;
  const completions = events.filter((e) => e.eventType === "lesson.completed").length;
  const abandons = events.filter((e) => e.eventType === "lesson.abandoned").length;
  const times = events.filter((e) => e.eventType === "lesson.completed" && e.timeSeconds).map((e) => e.timeSeconds);
  const scores = events.filter((e) => e.eventType === "lesson.completed").map((e) => e.payload?.score).filter((s) => typeof s === "number");
  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const medianTime = times.length > 0 ? calculateMedian(times) : 0;
  const p90Time = times.length > 0 ? calculatePercentile(times, 90) : 0;
  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const newStarts = (existing?.totalStarts || 0) + starts;
  const newCompletions = (existing?.totalCompletions || 0) + completions;
  const newTotalTime = (existing?.totalTimeSeconds || 0) + totalTime;
  const newAbandons = (existing?.totalAbandons || 0) + abandons;
  const completionRate = newStarts > 0 ? newCompletions / newStarts * 100 : 0;
  const latestEvent = events.reduce(
    (latest, e) => e.timestamp > latest ? e.timestamp : latest,
    existing?.lastEventAt || events[0].timestamp
  );
  if (existing) {
    await db.update(analyticsLessonStats).set({
      totalStarts: newStarts,
      totalCompletions: newCompletions,
      totalAbandons: newAbandons,
      avgTimeSeconds: avgTime || existing.avgTimeSeconds,
      minTimeSeconds: minTime > 0 ? Math.min(minTime, existing.minTimeSeconds || minTime) : existing.minTimeSeconds,
      maxTimeSeconds: maxTime > 0 ? Math.max(maxTime, existing.maxTimeSeconds || 0) : existing.maxTimeSeconds,
      medianTimeSeconds: medianTime || existing.medianTimeSeconds,
      p90TimeSeconds: p90Time || existing.p90TimeSeconds,
      totalTimeSeconds: newTotalTime,
      avgScore: avgScore || existing.avgScore,
      completionRate,
      lastEventAt: latestEvent
    }).where(eq(analyticsLessonStats.lessonId, lessonId));
  } else {
    await db.insert(analyticsLessonStats).values({
      lessonId,
      totalStarts: starts,
      totalCompletions: completions,
      totalAbandons: abandons,
      avgTimeSeconds: avgTime,
      minTimeSeconds: minTime,
      maxTimeSeconds: maxTime,
      medianTimeSeconds: medianTime,
      p90TimeSeconds: p90Time,
      totalTimeSeconds: totalTime,
      avgScore,
      completionRate,
      firstEventAt: events[0].timestamp,
      lastEventAt: latestEvent
    });
  }
}
__name(aggregateLessonStats, "aggregateLessonStats");
async function aggregateStoryStats(db, storyId, events) {
  const [existing] = await db.select().from(analyticsStoryStats).where(eq(analyticsStoryStats.storyId, storyId)).limit(1);
  const starts = events.filter((e) => e.eventType === "story.started").length;
  const completions = events.filter((e) => e.eventType === "story.completed").length;
  const abandons = events.filter((e) => e.eventType === "story.abandoned").length;
  const times = events.filter((e) => e.eventType === "story.completed" && e.timeSeconds).map((e) => e.timeSeconds);
  const sentencesRead = events.filter((e) => e.eventType === "story.completed").map((e) => e.payload?.sentencesRead).filter((s) => typeof s === "number");
  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgSentences = sentencesRead.length > 0 ? sentencesRead.reduce((a, b) => a + b, 0) / sentencesRead.length : 0;
  const newStarts = (existing?.totalStarts || 0) + starts;
  const newCompletions = (existing?.totalCompletions || 0) + completions;
  const newTotalTime = (existing?.totalTimeSeconds || 0) + totalTime;
  const completionRate = newStarts > 0 ? newCompletions / newStarts * 100 : 0;
  const latestEvent = events.reduce(
    (latest, e) => e.timestamp > latest ? e.timestamp : latest,
    existing?.lastEventAt || events[0].timestamp
  );
  if (existing) {
    await db.update(analyticsStoryStats).set({
      totalStarts: newStarts,
      totalCompletions: newCompletions,
      totalAbandons: (existing.totalAbandons || 0) + abandons,
      avgTimeSeconds: avgTime || existing.avgTimeSeconds,
      minTimeSeconds: minTime > 0 ? Math.min(minTime, existing.minTimeSeconds || minTime) : existing.minTimeSeconds,
      maxTimeSeconds: maxTime > 0 ? Math.max(maxTime, existing.maxTimeSeconds || 0) : existing.maxTimeSeconds,
      totalTimeSeconds: newTotalTime,
      avgSentencesRead: avgSentences || existing.avgSentencesRead,
      completionRate,
      lastEventAt: latestEvent
    }).where(eq(analyticsStoryStats.storyId, storyId));
  } else {
    await db.insert(analyticsStoryStats).values({
      storyId,
      totalStarts: starts,
      totalCompletions: completions,
      totalAbandons: abandons,
      avgTimeSeconds: avgTime,
      minTimeSeconds: minTime,
      maxTimeSeconds: maxTime,
      totalTimeSeconds: totalTime,
      avgSentencesRead: avgSentences,
      completionRate,
      firstEventAt: events[0].timestamp,
      lastEventAt: latestEvent
    });
  }
}
__name(aggregateStoryStats, "aggregateStoryStats");
async function aggregateVocabStats(db, vocabId, events) {
  const [existing] = await db.select().from(analyticsVocabStats).where(eq(analyticsVocabStats.vocabId, vocabId)).limit(1);
  const reviews = events.filter((e) => e.eventType === "vocab.reviewed").length;
  const correct = events.filter((e) => {
    const p = e.payload;
    return e.eventType === "vocab.reviewed" && p?.correct === true;
  }).length;
  const incorrect = reviews - correct;
  const responseTimes = events.filter((e) => e.eventType === "vocab.reviewed").map((e) => e.payload?.responseTimeMs).filter((t) => typeof t === "number");
  const avgResponseTime = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
  const newReviews = (existing?.totalReviews || 0) + reviews;
  const newCorrect = (existing?.correctCount || 0) + correct;
  const newIncorrect = (existing?.incorrectCount || 0) + incorrect;
  const accuracyRate = newReviews > 0 ? newCorrect / newReviews * 100 : 0;
  if (existing) {
    await db.update(analyticsVocabStats).set({
      totalReviews: newReviews,
      correctCount: newCorrect,
      incorrectCount: newIncorrect,
      avgResponseTimeMs: avgResponseTime || existing.avgResponseTimeMs,
      accuracyRate
    }).where(eq(analyticsVocabStats.vocabId, vocabId));
  } else {
    await db.insert(analyticsVocabStats).values({
      vocabId,
      totalReviews: reviews,
      correctCount: correct,
      incorrectCount: incorrect,
      avgResponseTimeMs: avgResponseTime,
      accuracyRate
    });
  }
}
__name(aggregateVocabStats, "aggregateVocabStats");
async function updateDailyEngagement(db) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const dailyStats = await db.select({
    contentType: engagementEventsRaw.contentType,
    totalEvents: sql`count(*)`,
    totalStarts: sql`sum(case when ${engagementEventsRaw.eventType} like '%.started' then 1 else 0 end)`,
    totalCompletions: sql`sum(case when ${engagementEventsRaw.eventType} like '%.completed' then 1 else 0 end)`,
    totalTimeSeconds: sql`coalesce(sum(${engagementEventsRaw.timeSeconds}), 0)`
  }).from(engagementEventsRaw).where(sql`date(${engagementEventsRaw.timestamp}) = ${today}`).groupBy(engagementEventsRaw.contentType);
  for (const row of dailyStats) {
    const completionRate = (row.totalStarts || 0) > 0 ? (row.totalCompletions || 0) / (row.totalStarts || 1) * 100 : 0;
    await db.insert(analyticsEngagementDaily).values({
      date: today,
      contentType: row.contentType,
      totalEvents: row.totalEvents,
      totalStarts: row.totalStarts || 0,
      totalCompletions: row.totalCompletions || 0,
      totalTimeSeconds: row.totalTimeSeconds || 0,
      avgCompletionRate: completionRate
    }).onConflictDoUpdate({
      target: [analyticsEngagementDaily.date, analyticsEngagementDaily.contentType],
      set: {
        totalEvents: row.totalEvents,
        totalStarts: row.totalStarts || 0,
        totalCompletions: row.totalCompletions || 0,
        totalTimeSeconds: row.totalTimeSeconds || 0,
        avgCompletionRate: completionRate
      }
    });
  }
}
__name(updateDailyEngagement, "updateDailyEngagement");
async function cleanupOldEngagementEvents(db, retentionDays = 90) {
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1e3);
  const result = await db.delete(engagementEventsRaw).where(and(
    eq(engagementEventsRaw.processed, true),
    lte(engagementEventsRaw.createdAt, new Date(cutoffTimestamp * 1e3))
  ));
  return { deleted: result.rowsAffected || 0 };
}
__name(cleanupOldEngagementEvents, "cleanupOldEngagementEvents");
function calculateMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
__name(calculateMedian, "calculateMedian");
function calculatePercentile(arr, percentile) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index2 = Math.ceil(percentile / 100 * sorted.length) - 1;
  return sorted[Math.max(0, index2)];
}
__name(calculatePercentile, "calculatePercentile");

// src/routes/analytics.ts
var dateRangeSchema = external_exports.object({
  from: external_exports.string().optional(),
  to: external_exports.string().optional()
});
var aiUsageSchema = dateRangeSchema.extend({
  model: external_exports.string().optional(),
  prompt_slug: external_exports.string().optional(),
  success: external_exports.coerce.boolean().optional()
});
var contentUsageSchema = dateRangeSchema.extend({
  slug: external_exports.string().optional(),
  user_id: external_exports.string().optional()
});
var daysSchema = external_exports.object({
  days: external_exports.coerce.number().min(1).max(365).default(30)
});
var app5 = new Hono2();
app5.use("/*", authMiddleware({ allowRoles: ["admin"] }));
app5.get("/users", async (c) => {
  const requestId = c.get("requestId");
  try {
    const tierStats = await c.env.DB.prepare(`
      SELECT 
        tier,
        COUNT(*) as count
      FROM users
      GROUP BY tier
    `).all();
    const totalResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM users
    `).first();
    const thirtyDaysAgo = Math.floor(Date.now() / 1e3) - 30 * 24 * 60 * 60;
    const recentSignups = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= ?
    `).bind(thirtyDaysAgo).first();
    const sevenDaysAgo = Math.floor(Date.now() / 1e3) - 7 * 24 * 60 * 60;
    const dailySignups = await c.env.DB.prepare(`
      SELECT 
        date(created_at, 'unixepoch') as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= ?
      GROUP BY date(created_at, 'unixepoch')
      ORDER BY date DESC
    `).bind(sevenDaysAgo).all();
    const tierBreakdown = {
      free: 0,
      premium: 0,
      pro: 0
    };
    for (const row of tierStats.results || []) {
      const tier = row.tier || "free";
      tierBreakdown[tier] = row.count;
    }
    return c.json({
      total: totalResult?.total || 0,
      tierBreakdown,
      recentSignups: {
        last30Days: recentSignups?.count || 0
      },
      dailySignups: dailySignups.results || []
    });
  } catch (err) {
    logWithContext("error", "analytics.users_fetch_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch user statistics" }, 500);
  }
});
app5.get("/users/overview", async (c) => {
  const requestId = c.get("requestId");
  try {
    const userAnalytics = new UserAnalyticsService(c.env.DB);
    const overview = await userAnalytics.getOverview();
    return c.json(overview);
  } catch (err) {
    logWithContext("error", "analytics.users_overview_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch user overview" }, 500);
  }
});
app5.get("/users/growth", zValidator("query", daysSchema), async (c) => {
  const requestId = c.get("requestId");
  const { days } = c.req.valid("query");
  try {
    const userAnalytics = new UserAnalyticsService(c.env.DB);
    const growthData = await userAnalytics.getGrowthData(days);
    return c.json({ data: growthData });
  } catch (err) {
    logWithContext("error", "analytics.users_growth_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch growth data" }, 500);
  }
});
app5.get("/users/retention", zValidator("query", external_exports.object({
  weeks: external_exports.coerce.number().min(1).max(52).default(8)
})), async (c) => {
  const requestId = c.get("requestId");
  const { weeks } = c.req.valid("query");
  try {
    const userAnalytics = new UserAnalyticsService(c.env.DB);
    const cohorts = await userAnalytics.getRetentionCohorts(weeks);
    return c.json({ cohorts });
  } catch (err) {
    logWithContext("error", "analytics.users_retention_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch retention data" }, 500);
  }
});
app5.get("/users/tiers", zValidator("query", daysSchema), async (c) => {
  const requestId = c.get("requestId");
  const { days } = c.req.valid("query");
  try {
    const userAnalytics = new UserAnalyticsService(c.env.DB);
    const tierHistory = await userAnalytics.getTierHistory(days);
    return c.json({ data: tierHistory });
  } catch (err) {
    logWithContext("error", "analytics.users_tiers_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch tier history" }, 500);
  }
});
app5.get("/ai", zValidator("query", aiUsageSchema), async (c) => {
  const query = c.req.valid("query");
  const analytics = new AnalyticsService(c.env.DB);
  const stats = await analytics.getAiUsageStats(query);
  return c.json(stats);
});
app5.get("/ai/overview", zValidator("query", dateRangeSchema), async (c) => {
  const requestId = c.get("requestId");
  const { from, to } = c.req.valid("query");
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const overview = await aiAnalytics.getOverview(from, to);
    return c.json(overview);
  } catch (err) {
    logWithContext("error", "analytics.ai_overview_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch AI overview" }, 500);
  }
});
app5.get("/ai/daily", zValidator("query", daysSchema), async (c) => {
  const requestId = c.get("requestId");
  const { days } = c.req.valid("query");
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const data = await aiAnalytics.getDailyUsage(days);
    return c.json({ data });
  } catch (err) {
    logWithContext("error", "analytics.ai_daily_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch daily AI usage" }, 500);
  }
});
app5.get("/ai/models", zValidator("query", dateRangeSchema), async (c) => {
  const requestId = c.get("requestId");
  const { from, to } = c.req.valid("query");
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const models = await aiAnalytics.getModelBreakdown(from, to);
    return c.json({ models });
  } catch (err) {
    logWithContext("error", "analytics.ai_models_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch model breakdown" }, 500);
  }
});
app5.get("/ai/prompts", zValidator("query", dateRangeSchema), async (c) => {
  const requestId = c.get("requestId");
  const { from, to } = c.req.valid("query");
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const prompts = await aiAnalytics.getPromptPerformance(from, to);
    return c.json({ prompts });
  } catch (err) {
    logWithContext("error", "analytics.ai_prompts_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch prompt performance" }, 500);
  }
});
app5.get("/ai/latency", zValidator("query", dateRangeSchema), async (c) => {
  const requestId = c.get("requestId");
  const { from, to } = c.req.valid("query");
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const [distribution, percentiles] = await Promise.all([
      aiAnalytics.getLatencyDistribution(from, to),
      aiAnalytics.getLatencyPercentiles(from, to)
    ]);
    return c.json({ distribution, percentiles });
  } catch (err) {
    logWithContext("error", "analytics.ai_latency_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch latency data" }, 500);
  }
});
app5.get("/ai/errors", zValidator("query", external_exports.object({
  limit: external_exports.coerce.number().min(1).max(100).default(20)
})), async (c) => {
  const requestId = c.get("requestId");
  const { limit } = c.req.valid("query");
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const errors = await aiAnalytics.getRecentErrors(limit);
    return c.json({ errors });
  } catch (err) {
    logWithContext("error", "analytics.ai_errors_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch errors" }, 500);
  }
});
app5.get("/ai/hourly", async (c) => {
  const requestId = c.get("requestId");
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const hourly = await aiAnalytics.getHourlyUsageToday();
    return c.json({ hourly });
  } catch (err) {
    logWithContext("error", "analytics.ai_hourly_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch hourly data" }, 500);
  }
});
app5.get("/content", zValidator("query", contentUsageSchema), async (c) => {
  const query = c.req.valid("query");
  const analytics = new AnalyticsService(c.env.DB);
  const stats = await analytics.getContentEvents(query);
  return c.json(stats);
});
app5.get("/system", zValidator("query", dateRangeSchema), async (c) => {
  const query = c.req.valid("query");
  const analytics = new AnalyticsService(c.env.DB);
  const stats = await analytics.getSystemEvents(query);
  return c.json(stats);
});
app5.get("/content/overview", async (c) => {
  const requestId = c.get("requestId");
  try {
    const contentAnalytics = new ContentAnalyticsService(c.env.DB);
    const overview = await contentAnalytics.getOverview();
    return c.json(overview);
  } catch (err) {
    logWithContext("error", "analytics.content_overview_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch content overview" }, 500);
  }
});
app5.get("/content/engagement", zValidator("query", daysSchema), async (c) => {
  const requestId = c.get("requestId");
  const { days } = c.req.valid("query");
  try {
    const contentAnalytics = new ContentAnalyticsService(c.env.DB);
    const data = await contentAnalytics.getEngagementData(days);
    return c.json({ data });
  } catch (err) {
    logWithContext("error", "analytics.content_engagement_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch engagement data" }, 500);
  }
});
app5.get("/content/popular/lessons", zValidator("query", external_exports.object({
  limit: external_exports.coerce.number().min(1).max(50).default(10)
})), async (c) => {
  const requestId = c.get("requestId");
  const { limit } = c.req.valid("query");
  try {
    const contentAnalytics = new ContentAnalyticsService(c.env.DB);
    const lessons2 = await contentAnalytics.getPopularLessons(limit);
    return c.json({ lessons: lessons2 });
  } catch (err) {
    logWithContext("error", "analytics.popular_lessons_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch popular lessons" }, 500);
  }
});
app5.get("/content/popular/stories", zValidator("query", external_exports.object({
  limit: external_exports.coerce.number().min(1).max(50).default(10)
})), async (c) => {
  const requestId = c.get("requestId");
  const { limit } = c.req.valid("query");
  try {
    const contentAnalytics = new ContentAnalyticsService(c.env.DB);
    const stories2 = await contentAnalytics.getPopularStories(limit);
    return c.json({ stories: stories2 });
  } catch (err) {
    logWithContext("error", "analytics.popular_stories_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch popular stories" }, 500);
  }
});
app5.get("/content/hsk-breakdown", async (c) => {
  const requestId = c.get("requestId");
  try {
    const contentAnalytics = new ContentAnalyticsService(c.env.DB);
    const breakdown = await contentAnalytics.getHskBreakdown();
    return c.json({ breakdown });
  } catch (err) {
    logWithContext("error", "analytics.hsk_breakdown_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch HSK breakdown" }, 500);
  }
});
app5.get("/content/vocab-progress", async (c) => {
  const requestId = c.get("requestId");
  try {
    const contentAnalytics = new ContentAnalyticsService(c.env.DB);
    const progress = await contentAnalytics.getVocabProgress();
    return c.json(progress);
  } catch (err) {
    logWithContext("error", "analytics.vocab_progress_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch vocabulary progress" }, 500);
  }
});
var engagementEventSchema = external_exports.object({
  id: external_exports.string().uuid(),
  type: external_exports.enum([
    "lesson.started",
    "lesson.progress",
    "lesson.completed",
    "lesson.abandoned",
    "story.started",
    "story.progress",
    "story.completed",
    "story.abandoned",
    "vocab.reviewed",
    "practice.completed"
  ]),
  timestamp: external_exports.string().datetime(),
  payload: external_exports.object({
    lessonId: external_exports.string().optional(),
    storyId: external_exports.string().optional(),
    vocabId: external_exports.string().optional(),
    hskLevel: external_exports.number().int().min(1).max(6).optional(),
    score: external_exports.number().min(0).max(100).optional(),
    blocksCompleted: external_exports.number().int().optional(),
    totalBlocks: external_exports.number().int().optional(),
    blockTimings: external_exports.array(external_exports.object({
      index: external_exports.number().int(),
      type: external_exports.string(),
      seconds: external_exports.number().int()
    })).optional(),
    sentencesRead: external_exports.number().int().optional(),
    totalSentences: external_exports.number().int().optional(),
    sentenceIndex: external_exports.number().int().optional(),
    correct: external_exports.boolean().optional(),
    responseTimeMs: external_exports.number().int().optional(),
    practiceType: external_exports.enum(["lesson", "story", "vocab"]).optional(),
    itemsCompleted: external_exports.number().int().optional(),
    totalItems: external_exports.number().int().optional()
  })
});
var batchIngestSchema = external_exports.object({
  events: external_exports.array(engagementEventSchema).min(1).max(100),
  appVersion: external_exports.string().optional(),
  platform: external_exports.enum(["ios", "android"]).optional()
});
var publicApp = new Hono2();
publicApp.post("/events/batch", zValidator("json", batchIngestSchema), async (c) => {
  const requestId = c.get("requestId");
  const body = c.req.valid("json");
  try {
    const db = drizzle(c.env.DB);
    const result = await ingestEventsBatch(db, body);
    logWithContext("info", "engagement.batch_ingested", {
      requestId,
      meta: {
        accepted: result.accepted,
        rejected: result.rejected,
        platform: body.platform
      }
    });
    return c.json(result);
  } catch (err) {
    logWithContext("error", "engagement.batch_ingest_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to ingest events" }, 500);
  }
});
var publicAnalyticsRoutes = publicApp;
app5.get("/engagement/overview", zValidator("query", dateRangeSchema), async (c) => {
  const requestId = c.get("requestId");
  const { from, to } = c.req.valid("query");
  const startDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
  const endDate = to || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  try {
    const db = drizzle(c.env.DB);
    const overview = await getEngagementOverview(db, startDate, endDate);
    return c.json(overview);
  } catch (err) {
    logWithContext("error", "engagement.overview_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch engagement overview" }, 500);
  }
});
app5.get("/engagement/lessons/:lessonId", async (c) => {
  const requestId = c.get("requestId");
  const lessonId = c.req.param("lessonId");
  try {
    const db = drizzle(c.env.DB);
    const stats = await getLessonStats(db, lessonId);
    if (!stats) {
      return c.json({ error: "No stats found for this lesson" }, 404);
    }
    return c.json(stats);
  } catch (err) {
    logWithContext("error", "engagement.lesson_stats_failed", {
      requestId,
      meta: { error: err.message, lessonId }
    });
    return c.json({ error: "Failed to fetch lesson stats" }, 500);
  }
});
app5.get("/engagement/lessons", zValidator("query", external_exports.object({
  hskLevel: external_exports.coerce.number().int().min(1).max(6).optional(),
  limit: external_exports.coerce.number().int().min(1).max(100).default(50),
  orderBy: external_exports.enum(["completions", "time", "rate"]).default("completions")
})), async (c) => {
  const requestId = c.get("requestId");
  const { hskLevel, limit, orderBy } = c.req.valid("query");
  try {
    const db = drizzle(c.env.DB);
    const stats = await getAllLessonStats(db, { hskLevel, limit, orderBy });
    return c.json({ lessons: stats });
  } catch (err) {
    logWithContext("error", "engagement.all_lessons_stats_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch lesson stats" }, 500);
  }
});
app5.get("/engagement/stories/:storyId", async (c) => {
  const requestId = c.get("requestId");
  const storyId = c.req.param("storyId");
  try {
    const db = drizzle(c.env.DB);
    const stats = await getStoryStats(db, storyId);
    if (!stats) {
      return c.json({ error: "No stats found for this story" }, 404);
    }
    return c.json(stats);
  } catch (err) {
    logWithContext("error", "engagement.story_stats_failed", {
      requestId,
      meta: { error: err.message, storyId }
    });
    return c.json({ error: "Failed to fetch story stats" }, 500);
  }
});
app5.get("/engagement/stories", zValidator("query", external_exports.object({
  hskLevel: external_exports.coerce.number().int().min(1).max(6).optional(),
  limit: external_exports.coerce.number().int().min(1).max(100).default(50),
  orderBy: external_exports.enum(["completions", "time", "rate"]).default("completions")
})), async (c) => {
  const requestId = c.get("requestId");
  const { hskLevel, limit, orderBy } = c.req.valid("query");
  try {
    const db = drizzle(c.env.DB);
    const stats = await getAllStoryStats(db, { hskLevel, limit, orderBy });
    return c.json({ stories: stats });
  } catch (err) {
    logWithContext("error", "engagement.all_stories_stats_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch story stats" }, 500);
  }
});
app5.get("/engagement/vocab/:vocabId", async (c) => {
  const requestId = c.get("requestId");
  const vocabId = c.req.param("vocabId");
  try {
    const db = drizzle(c.env.DB);
    const stats = await getVocabStats(db, vocabId);
    if (!stats) {
      return c.json({ error: "No stats found for this vocabulary" }, 404);
    }
    return c.json(stats);
  } catch (err) {
    logWithContext("error", "engagement.vocab_stats_failed", {
      requestId,
      meta: { error: err.message, vocabId }
    });
    return c.json({ error: "Failed to fetch vocabulary stats" }, 500);
  }
});
var analytics_default = app5;

// src/routes/billing.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var billingRouter = new Hono2();
var PRODUCT_TIER_MAP = {
  "hanzi_premium_monthly": "premium",
  "hanzi_premium_yearly": "premium",
  "hanzi_pro_monthly": "pro",
  "hanzi_pro_yearly": "pro"
};
var STORE_PLATFORM_MAP = {
  "app_store": "ios",
  "mac_app_store": "ios",
  "play_store": "android",
  "stripe": "web",
  "promotional": "web"
};
billingRouter.get("/webhooks/revenuecat", async (c) => {
  return c.json({
    status: "ok",
    message: "RevenueCat webhook endpoint is ready",
    timestamp: Date.now()
  });
});
billingRouter.post("/webhooks/revenuecat", async (c) => {
  const requestId = c.get("requestId");
  const config2 = c.get("config");
  const authHeader = c.req.header("Authorization");
  const expectedSecret = config2.secrets.revenuecatWebhookSecret;
  if (!expectedSecret) {
    logWithContext("error", "revenuecat.webhook.secret_not_configured", {
      requestId,
      meta: { message: "REVENUECAT_WEBHOOK_SECRET must be set" }
    });
    return c.json({ error: "Webhook authentication not configured" }, 503);
  }
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
  if (!token || token !== expectedSecret) {
    logWithContext("warn", "revenuecat.webhook.unauthorized", {
      requestId,
      meta: {
        hasAuth: !!authHeader,
        format: authHeader?.split(" ")[0]
      }
    });
    return c.json({ error: "Unauthorized" }, 401);
  }
  let event;
  try {
    event = await c.req.json();
  } catch (err) {
    logWithContext("error", "revenuecat.webhook.invalid_json", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const responsePromise = c.json({
    received: true,
    request_id: requestId
  });
  c.executionCtx.waitUntil(
    processWebhookAsync(c.env.DB, event, requestId).catch((err) => {
      logWithContext("error", "revenuecat.webhook.async_error", {
        requestId,
        meta: { error: err.message }
      });
    })
  );
  return responsePromise;
});
async function processWebhookAsync(db, event, requestId) {
  const event_type = event.event?.type || event.type;
  const app_user_id = event.event?.app_user_id || event.app_user_id;
  const product_id = event.event?.product_id || event.product_id;
  const expiration_at_ms = event.event?.expiration_at_ms || event.expiration_at_ms;
  const store = event.event?.store || event.store;
  const presented_offering_id = event.event?.presented_offering_id || event.presented_offering_id;
  logWithContext("info", "revenuecat.webhook.processing", {
    requestId,
    meta: {
      event_type,
      app_user_id,
      product_id,
      store
    }
  });
  const newTier = product_id ? PRODUCT_TIER_MAP[product_id] || "free" : "free";
  let subscriptionStatus = "none";
  switch (event_type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
      subscriptionStatus = "active";
      break;
    case "CANCELLATION":
      subscriptionStatus = "canceled";
      break;
    case "EXPIRATION":
      subscriptionStatus = "expired";
      break;
    case "BILLING_ISSUE":
      subscriptionStatus = "past_due";
      break;
    default:
      logWithContext("warn", "revenuecat.webhook.unknown_event", {
        requestId,
        meta: { event_type }
      });
      return;
  }
  if (subscriptionStatus === "expired" || subscriptionStatus === "canceled") {
    const activeSubsCheck = await db.prepare(`
      SELECT subscription_status, subscription_expires_at
      FROM users
      WHERE clerk_id = ?
    `).bind(app_user_id).first();
    if (activeSubsCheck?.subscription_status === "active" && activeSubsCheck.subscription_expires_at && activeSubsCheck.subscription_expires_at > Math.floor(Date.now() / 1e3)) {
      await db.prepare(`
        UPDATE users 
        SET 
          subscription_status = ?,
          updated_at = strftime('%s', 'now')
        WHERE clerk_id = ?
      `).bind(subscriptionStatus, app_user_id).run();
      logWithContext("info", "revenuecat.webhook.marked_canceled", {
        requestId,
        meta: {
          app_user_id,
          reason: "Subscription canceled but still valid until expiration"
        }
      });
      return;
    }
    await db.prepare(`
      UPDATE users 
      SET 
        tier = 'free',
        subscription_status = ?,
        subscription_platform = NULL,
        subscription_expires_at = NULL,
        updated_at = strftime('%s', 'now')
      WHERE clerk_id = ?
    `).bind(subscriptionStatus, app_user_id).run();
    logWithContext("info", "revenuecat.webhook.downgraded_to_free", {
      requestId,
      meta: { app_user_id, reason: event_type }
    });
    await db.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `).bind(
      crypto.randomUUID(),
      "user.subscription.ended",
      app_user_id,
      JSON.stringify({
        previous_tier: newTier,
        event_type,
        product_id
      })
    ).run();
    return;
  }
  try {
    const expiresAt = expiration_at_ms ? Math.floor(expiration_at_ms / 1e3) : null;
    const platform2 = store ? STORE_PLATFORM_MAP[store.toLowerCase()] || "web" : null;
    const result = await db.prepare(`
      UPDATE users 
      SET 
        tier = ?,
        subscription_status = ?,
        subscription_platform = ?,
        subscription_expires_at = ?,
        updated_at = strftime('%s', 'now')
      WHERE clerk_id = ?
    `).bind(
      newTier,
      subscriptionStatus,
      platform2,
      expiresAt,
      app_user_id
    ).run();
    if (!result.success || (result.meta?.changes ?? 0) === 0) {
      logWithContext("warn", "revenuecat.webhook.user_not_found", {
        requestId,
        meta: { app_user_id, clerk_id: app_user_id }
      });
      return;
    }
    await db.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `).bind(
      crypto.randomUUID(),
      "user.subscription.changed",
      app_user_id,
      JSON.stringify({
        tier: newTier,
        status: subscriptionStatus,
        platform: store,
        product_id,
        event_type,
        offering_id: presented_offering_id
      })
    ).run();
    logWithContext("info", "revenuecat.webhook.processed", {
      requestId,
      meta: {
        app_user_id,
        new_tier: newTier,
        new_status: subscriptionStatus
      }
    });
  } catch (err) {
    logWithContext("error", "revenuecat.webhook.db_error", {
      requestId,
      meta: { error: err.message }
    });
    throw err;
  }
}
__name(processWebhookAsync, "processWebhookAsync");
billingRouter.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "billing",
    webhook_url: "/v1/billing/webhooks/revenuecat"
  });
});
var billing_default = billingRouter;

// src/routes/users.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var usersRouter = new Hono2();
var updateProfileSchema = external_exports.object({
  name: external_exports.string().min(1, "Name is required").max(100, "Name too long").trim()
});
var DEFAULT_TIER_LIMITS2 = {
  free: {
    requests_per_day: 10,
    tokens_per_day: 5e3,
    max_parallel_generations: 1,
    content_downloads_per_day: 5,
    offline_packages_allowed: 0,
    can_access_premium_content: false
  },
  premium: {
    requests_per_day: 100,
    tokens_per_day: 5e4,
    max_parallel_generations: 3,
    content_downloads_per_day: 50,
    offline_packages_allowed: 3,
    can_access_premium_content: true
  },
  pro: {
    requests_per_day: 1e3,
    tokens_per_day: 5e5,
    max_parallel_generations: 10,
    content_downloads_per_day: 999999,
    offline_packages_allowed: 999999,
    can_access_premium_content: true
  }
};
usersRouter.get("/me", authMiddleware(), async (c) => {
  const user = c.get("user");
  const requestId = c.get("requestId");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const userDetails = await c.env.DB.prepare(`
        SELECT 
          id, clerk_id, email, name, role, tier,
          subscription_status, subscription_platform, subscription_expires_at,
          created_at, last_login_at
        FROM users
        WHERE id = ?
      `).bind(user.id).first();
    if (!userDetails) {
      return c.json({ error: "User not found" }, 404);
    }
    const db = drizzle(c.env.DB);
    const userTier = userDetails.tier || "free";
    const dbLimits = await db.select().from(tierLimits).where(eq(tierLimits.tier, userTier)).get();
    const limits = dbLimits ? {
      requests_per_day: dbLimits.requestsPerDay,
      tokens_per_day: dbLimits.tokensPerDay,
      max_parallel_generations: dbLimits.maxParallelGenerations,
      content_downloads_per_day: dbLimits.contentDownloadsPerDay,
      offline_packages_allowed: dbLimits.offlinePackagesAllowed,
      can_access_premium_content: dbLimits.canAccessPremiumContent
    } : DEFAULT_TIER_LIMITS2[userTier];
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const usage = await c.env.DB.prepare("SELECT request_count, token_count FROM daily_usage WHERE user_id = ? AND date = ?").bind(user.id, today).first();
    return c.json({
      id: userDetails.id,
      clerk_id: userDetails.clerk_id,
      email: userDetails.email,
      name: userDetails.name,
      role: userDetails.role,
      tier: userDetails.tier || "free",
      subscription: {
        status: userDetails.subscription_status || "none",
        platform: userDetails.subscription_platform,
        expires_at: userDetails.subscription_expires_at && typeof userDetails.subscription_expires_at === "number" ? new Date(userDetails.subscription_expires_at * 1e3).toISOString() : null
      },
      limits: {
        requests_per_day: limits.requests_per_day,
        tokens_per_day: limits.tokens_per_day,
        max_parallel_generations: limits.max_parallel_generations,
        content_downloads_per_day: limits.content_downloads_per_day,
        offline_packages_allowed: limits.offline_packages_allowed,
        can_access_premium_content: limits.can_access_premium_content
      },
      usage: {
        requests_today: usage?.request_count || 0,
        tokens_today: usage?.token_count || 0
      },
      timestamps: {
        created_at: userDetails.created_at && typeof userDetails.created_at === "number" ? new Date(userDetails.created_at * 1e3).toISOString() : null,
        last_login_at: userDetails.last_login_at && typeof userDetails.last_login_at === "number" ? new Date(userDetails.last_login_at * 1e3).toISOString() : null
      }
    });
  } catch (err) {
    logWithContext("error", "users.get_me_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch user profile" }, 500);
  }
});
usersRouter.patch("/me", authMiddleware(), zValidator("json", updateProfileSchema), async (c) => {
  const user = c.get("user");
  const requestId = c.get("requestId");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const { name } = c.req.valid("json");
    await c.env.DB.prepare('UPDATE users SET name = ?, updated_at = strftime("%s", "now") WHERE id = ?').bind(name, user.id).run();
    logWithContext("info", "users.profile_updated", {
      requestId,
      meta: { user_id: user.id }
    });
    return c.json({ success: true, name });
  } catch (err) {
    logWithContext("error", "users.update_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to update profile" }, 500);
  }
});
usersRouter.get("/me/usage", authMiddleware(), async (c) => {
  const user = c.get("user");
  const requestId = c.get("requestId");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const sevenDaysAgo = /* @__PURE__ */ new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split("T")[0];
    const usageHistory = await c.env.DB.prepare(`
        SELECT date, request_count, token_count
        FROM daily_usage
        WHERE user_id = ? AND date >= ?
        ORDER BY date DESC
      `).bind(user.id, startDate).all();
    return c.json({
      user_id: user.id,
      tier: user.tier || "free",
      history: usageHistory.results || []
    });
  } catch (err) {
    logWithContext("error", "users.usage_fetch_failed", {
      requestId,
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to fetch usage" }, 500);
  }
});
var users_default = usersRouter;

// src/routes/stories.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/domains/stories/index.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/domains/stories/services/stories.service.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/nanoid@5.1.6/node_modules/nanoid/index.browser.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/.pnpm/nanoid@5.1.6/node_modules/nanoid/url-alphabet/index.js
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

// node_modules/.pnpm/nanoid@5.1.6/node_modules/nanoid/index.browser.js
var nanoid = /* @__PURE__ */ __name((size = 21) => {
  let id = "";
  let bytes = crypto.getRandomValues(new Uint8Array(size |= 0));
  while (size--) {
    id += urlAlphabet[bytes[size] & 63];
  }
  return id;
}, "nanoid");

// src/domains/stories/services/stories.service.ts
function escapeLikePattern(value) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
__name(escapeLikePattern, "escapeLikePattern");
var StoriesService = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "StoriesService");
  }
  // --- STORY CRUD ---
  async createStory(params) {
    const id = nanoid();
    const now = /* @__PURE__ */ new Date();
    await this.db.insert(stories).values({
      id,
      title: params.title,
      subtitle: params.subtitle,
      author: params.author,
      contentLibraryId: params.contentLibraryId,
      description: params.description,
      topic: params.topic,
      hskLevel: params.hskLevel,
      difficulty: params.difficulty || "medium",
      estimatedMinutes: params.estimatedMinutes,
      practiceBlocks: params.practiceBlocks ? JSON.stringify(params.practiceBlocks) : null,
      isPublished: false,
      createdAt: now,
      updatedAt: now
    });
    const story = await this.getStory(id);
    if (!story) throw new Error("Failed to create story");
    return story;
  }
  async getStory(id) {
    const results = await this.db.select().from(stories).where(eq(stories.id, id)).limit(1);
    return results[0] || null;
  }
  async getStoryWithDetails(id) {
    const story = await this.getStory(id);
    if (!story) return null;
    const [sentences, vocab, questions] = await Promise.all([
      this.getSentences(id),
      this.getVocabulary(id),
      this.getQuestions(id)
    ]);
    return {
      ...story,
      sentences,
      vocabulary: vocab,
      questions
    };
  }
  async updateStory(id, params) {
    const updates = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (params.title !== void 0) updates.title = params.title;
    if (params.subtitle !== void 0) updates.subtitle = params.subtitle;
    if (params.author !== void 0) updates.author = params.author;
    if (params.contentLibraryId !== void 0) updates.contentLibraryId = params.contentLibraryId;
    if (params.description !== void 0) updates.description = params.description;
    if (params.topic !== void 0) updates.topic = params.topic;
    if (params.hskLevel !== void 0) updates.hskLevel = params.hskLevel;
    if (params.difficulty !== void 0) updates.difficulty = params.difficulty;
    if (params.estimatedMinutes !== void 0) updates.estimatedMinutes = params.estimatedMinutes;
    if (params.practiceBlocks !== void 0) {
      updates.practiceBlocks = params.practiceBlocks ? JSON.stringify(params.practiceBlocks) : null;
    }
    if (params.isPublished === false) {
      updates.isPublished = false;
      updates.publishedAt = null;
    } else if (params.isPublished === true) {
      updates.isPublished = true;
      const current = await this.getStory(id);
      if (current && !current.isPublished) {
        updates.publishedAt = /* @__PURE__ */ new Date();
      }
    }
    await this.db.update(stories).set(updates).where(eq(stories.id, id));
  }
  async deleteStory(id) {
    await this.db.delete(stories).where(eq(stories.id, id));
  }
  async searchStories(params) {
    const conditions = [];
    if (params.hskLevel) {
      conditions.push(eq(stories.hskLevel, params.hskLevel));
    }
    if (params.difficulty) {
      conditions.push(eq(stories.difficulty, params.difficulty));
    }
    if (params.topic) {
      const escapedTopic = escapeLikePattern(params.topic);
      conditions.push(like(stories.topic, `%${escapedTopic}%`));
    }
    if (params.query) {
      const escapedQuery = escapeLikePattern(params.query);
      const searchTerm = `%${escapedQuery}%`;
      conditions.push(
        sql`(${stories.title} LIKE ${searchTerm} OR ${stories.description} LIKE ${searchTerm})`
      );
    }
    if (params.published !== void 0) {
      conditions.push(eq(stories.isPublished, params.published));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
    const results = await this.db.select().from(stories).where(whereClause).orderBy(desc(stories.createdAt)).limit(params.limit ?? 50).offset(params.offset ?? 0);
    return results;
  }
  // --- SENTENCES ---
  async getSentences(storyId) {
    return await this.db.select().from(storySentences).where(eq(storySentences.storyId, storyId)).orderBy(asc(storySentences.orderIndex));
  }
  async addSentence(storyId, params) {
    const id = nanoid();
    const maxOrder = await this.db.select({ max: sql`MAX(${storySentences.orderIndex})` }).from(storySentences).where(eq(storySentences.storyId, storyId));
    const orderIndex = (maxOrder[0]?.max ?? -1) + 1;
    await this.db.insert(storySentences).values({
      id,
      storyId,
      orderIndex,
      chinese: params.chinese,
      pinyin: params.pinyin,
      english: params.english,
      audioR2Key: params.audioR2Key,
      createdAt: /* @__PURE__ */ new Date()
    });
    const result = await this.db.select().from(storySentences).where(eq(storySentences.id, id)).limit(1);
    return result[0];
  }
  async updateSentence(sentenceId, params) {
    await this.db.update(storySentences).set(params).where(eq(storySentences.id, sentenceId));
  }
  async deleteSentence(sentenceId) {
    await this.db.delete(storySentences).where(eq(storySentences.id, sentenceId));
  }
  async reorderSentences(storyId, sentenceIds) {
    for (let i = 0; i < sentenceIds.length; i++) {
      await this.db.update(storySentences).set({ orderIndex: i }).where(
        and(
          eq(storySentences.id, sentenceIds[i]),
          eq(storySentences.storyId, storyId)
        )
      );
    }
  }
  // --- VOCABULARY ---
  async getVocabulary(storyId) {
    const results = await this.db.select({
      storyId: storyVocabulary.storyId,
      vocabId: storyVocabulary.vocabId,
      contextSentence: storyVocabulary.contextSentence,
      hanzi: vocabulary.hanzi,
      pinyin: vocabulary.pinyin,
      english: vocabulary.english,
      hskLevel: vocabulary.hskLevel
    }).from(storyVocabulary).leftJoin(vocabulary, eq(storyVocabulary.vocabId, vocabulary.id)).where(eq(storyVocabulary.storyId, storyId));
    return results;
  }
  async addVocabulary(storyId, vocabId, contextSentence) {
    await this.db.insert(storyVocabulary).values({
      storyId,
      vocabId,
      contextSentence
    });
  }
  async removeVocabulary(storyId, vocabId) {
    await this.db.delete(storyVocabulary).where(
      and(
        eq(storyVocabulary.storyId, storyId),
        eq(storyVocabulary.vocabId, vocabId)
      )
    );
  }
  // --- QUESTIONS ---
  async getQuestions(storyId) {
    return await this.db.select().from(storyQuestions).where(eq(storyQuestions.storyId, storyId)).orderBy(asc(storyQuestions.orderIndex));
  }
  async addQuestion(storyId, params) {
    const id = nanoid();
    const maxOrder = await this.db.select({ max: sql`MAX(${storyQuestions.orderIndex})` }).from(storyQuestions).where(eq(storyQuestions.storyId, storyId));
    const orderIndex = (maxOrder[0]?.max ?? -1) + 1;
    await this.db.insert(storyQuestions).values({
      id,
      storyId,
      orderIndex,
      question: params.question,
      questionEnglish: params.questionEnglish,
      questionType: params.questionType,
      options: params.options ? JSON.stringify(params.options) : null,
      correctAnswer: params.correctAnswer,
      explanation: params.explanation,
      createdAt: /* @__PURE__ */ new Date()
    });
    const result = await this.db.select().from(storyQuestions).where(eq(storyQuestions.id, id)).limit(1);
    return result[0];
  }
  async updateQuestion(questionId, params) {
    const updates = {};
    if (params.question !== void 0) updates.question = params.question;
    if (params.questionEnglish !== void 0) updates.questionEnglish = params.questionEnglish;
    if (params.questionType !== void 0) updates.questionType = params.questionType;
    if (params.correctAnswer !== void 0) updates.correctAnswer = params.correctAnswer;
    if (params.explanation !== void 0) updates.explanation = params.explanation;
    if (params.options !== void 0) {
      updates.options = JSON.stringify(params.options);
    }
    await this.db.update(storyQuestions).set(updates).where(eq(storyQuestions.id, questionId));
  }
  async deleteQuestion(questionId) {
    await this.db.delete(storyQuestions).where(eq(storyQuestions.id, questionId));
  }
  async uploadCoverImage(storyId, r2Key) {
    await this.db.update(stories).set({ coverImageR2Key: r2Key, updatedAt: /* @__PURE__ */ new Date() }).where(eq(stories.id, storyId));
  }
  async uploadSentenceAudio(sentenceId, r2Key) {
    await this.db.update(storySentences).set({ audioR2Key: r2Key }).where(eq(storySentences.id, sentenceId));
  }
};

// src/domains/stories/types.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/domains/stories/index.ts
var createStoriesDomain = /* @__PURE__ */ __name((env2) => {
  const db = drizzle(env2.DB);
  return {
    stories: new StoriesService(db)
  };
}, "createStoriesDomain");

// src/routes/stories.ts
var app6 = new Hono2();
app6.use("/*", authMiddleware({ allowRoles: ["admin"] }));
var getServices = /* @__PURE__ */ __name((env2) => createStoriesDomain(env2), "getServices");
var createStorySchema = external_exports.object({
  title: external_exports.string().min(1),
  subtitle: external_exports.string().optional(),
  author: external_exports.string().optional(),
  contentLibraryId: external_exports.string().optional(),
  description: external_exports.string().optional(),
  topic: external_exports.string().optional(),
  hskLevel: external_exports.number().int().min(1).max(9),
  difficulty: external_exports.enum(["easy", "medium", "hard"]).optional(),
  estimatedMinutes: external_exports.number().int().min(1).optional(),
  accessTier: external_exports.enum(["free", "premium"]).optional()
});
var updateStorySchema = external_exports.object({
  title: external_exports.string().min(1).optional(),
  subtitle: external_exports.string().optional(),
  author: external_exports.string().optional(),
  contentLibraryId: external_exports.string().optional(),
  description: external_exports.string().optional(),
  topic: external_exports.string().optional(),
  hskLevel: external_exports.number().int().min(1).max(9).optional(),
  difficulty: external_exports.enum(["easy", "medium", "hard"]).optional(),
  estimatedMinutes: external_exports.number().int().min(1).optional(),
  isPublished: external_exports.boolean().optional(),
  accessTier: external_exports.enum(["free", "premium"]).optional()
});
var createSentenceSchema = external_exports.object({
  chinese: external_exports.string().min(1),
  pinyin: external_exports.string().min(1),
  english: external_exports.string().min(1),
  audioR2Key: external_exports.string().optional()
});
var updateSentenceSchema = external_exports.object({
  chinese: external_exports.string().min(1).optional(),
  pinyin: external_exports.string().min(1).optional(),
  english: external_exports.string().min(1).optional(),
  audioR2Key: external_exports.string().optional()
});
var reorderSentencesSchema = external_exports.object({
  sentenceIds: external_exports.array(external_exports.string())
});
var addVocabularySchema = external_exports.object({
  vocabId: external_exports.string().min(1),
  contextSentence: external_exports.string().optional()
});
var createQuestionSchema = external_exports.object({
  question: external_exports.string().min(1),
  questionEnglish: external_exports.string().optional(),
  questionType: external_exports.enum(["multiple_choice", "true_false", "short_answer"]),
  options: external_exports.array(external_exports.string()).optional(),
  correctAnswer: external_exports.string().min(1),
  explanation: external_exports.string().optional()
});
var searchSchema3 = external_exports.object({
  hsk_level: external_exports.coerce.number().int().min(1).max(9).optional(),
  difficulty: external_exports.string().optional(),
  topic: external_exports.string().optional(),
  query: external_exports.string().optional(),
  published: external_exports.coerce.boolean().optional(),
  access_tier: external_exports.enum(["free", "premium"]).optional(),
  limit: external_exports.coerce.number().int().max(100).optional(),
  offset: external_exports.coerce.number().int().optional()
});
app6.get("/", zValidator("query", searchSchema3), async (c) => {
  const filters = c.req.valid("query");
  const { stories: stories2 } = getServices(c.env);
  try {
    const results = await stories2.searchStories({
      hskLevel: filters.hsk_level,
      difficulty: filters.difficulty,
      topic: filters.topic,
      query: filters.query,
      published: filters.published,
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
    return c.json({ stories: results, count: results.length });
  } catch (err) {
    logWithContext("error", "stories.search_failed", {
      requestId: c.get("requestId"),
      meta: { error: err.message }
    });
    return c.json({ error: "Search failed" }, 500);
  }
});
app6.post("/", zValidator("json", createStorySchema), async (c) => {
  const data = c.req.valid("json");
  const user = c.get("user");
  const { stories: stories2 } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);
  try {
    const story = await stories2.createStory(data);
    await analytics.record({
      type: "story.create",
      requestId: c.get("requestId"),
      userId: user?.id,
      metadata: { storyId: story.id, title: story.title }
    });
    return c.json({ story }, 201);
  } catch (err) {
    logWithContext("error", "stories.create_failed", {
      requestId: c.get("requestId"),
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to create story" }, 500);
  }
});
app6.get("/:id", async (c) => {
  const id = c.req.param("id");
  const { stories: stories2 } = getServices(c.env);
  try {
    const story = await stories2.getStoryWithDetails(id);
    if (!story) {
      return c.json({ error: "Story not found" }, 404);
    }
    return c.json({ story });
  } catch (err) {
    logWithContext("error", "stories.get_failed", {
      requestId: c.get("requestId"),
      meta: { storyId: id, error: err.message }
    });
    return c.json({ error: "Failed to get story" }, 500);
  }
});
app6.put("/:id", zValidator("json", updateStorySchema), async (c) => {
  const id = c.req.param("id");
  const data = c.req.valid("json");
  const user = c.get("user");
  const { stories: stories2 } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);
  try {
    await stories2.updateStory(id, data);
    await analytics.record({
      type: "story.update",
      requestId: c.get("requestId"),
      userId: user?.id,
      metadata: { storyId: id, fields: Object.keys(data) }
    });
    return c.json({ success: true });
  } catch (err) {
    logWithContext("error", "stories.update_failed", {
      requestId: c.get("requestId"),
      meta: { storyId: id, error: err.message }
    });
    return c.json({ error: "Failed to update story" }, 500);
  }
});
app6.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const { stories: stories2 } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);
  try {
    await stories2.deleteStory(id);
    await analytics.record({
      type: "story.delete",
      requestId: c.get("requestId"),
      userId: user?.id,
      metadata: { storyId: id }
    });
    return c.json({ success: true });
  } catch (err) {
    logWithContext("error", "stories.delete_failed", {
      requestId: c.get("requestId"),
      meta: { storyId: id, error: err.message }
    });
    return c.json({ error: "Failed to delete story" }, 500);
  }
});
app6.post("/:id/sentences", zValidator("json", createSentenceSchema), async (c) => {
  const storyId = c.req.param("id");
  const data = c.req.valid("json");
  const { stories: stories2 } = getServices(c.env);
  try {
    const sentence = await stories2.addSentence(storyId, data);
    return c.json({ sentence }, 201);
  } catch (err) {
    logWithContext("error", "stories.sentence.add_failed", {
      requestId: c.get("requestId"),
      meta: { storyId, error: err.message }
    });
    return c.json({ error: "Failed to add sentence" }, 500);
  }
});
app6.put("/:id/sentences/:sentenceId", zValidator("json", updateSentenceSchema), async (c) => {
  const sentenceId = c.req.param("sentenceId");
  const data = c.req.valid("json");
  const { stories: stories2 } = getServices(c.env);
  try {
    await stories2.updateSentence(sentenceId, data);
    return c.json({ success: true });
  } catch (err) {
    logWithContext("error", "stories.sentence.update_failed", {
      requestId: c.get("requestId"),
      meta: { sentenceId, error: err.message }
    });
    return c.json({ error: "Failed to update sentence" }, 500);
  }
});
app6.delete("/:id/sentences/:sentenceId", async (c) => {
  const sentenceId = c.req.param("sentenceId");
  const { stories: stories2 } = getServices(c.env);
  try {
    await stories2.deleteSentence(sentenceId);
    return c.json({ success: true });
  } catch (err) {
    logWithContext("error", "stories.sentence.delete_failed", {
      requestId: c.get("requestId"),
      meta: { sentenceId, error: err.message }
    });
    return c.json({ error: "Failed to delete sentence" }, 500);
  }
});
app6.post("/:id/sentences/reorder", zValidator("json", reorderSentencesSchema), async (c) => {
  const storyId = c.req.param("id");
  const { sentenceIds } = c.req.valid("json");
  const { stories: stories2 } = getServices(c.env);
  try {
    await stories2.reorderSentences(storyId, sentenceIds);
    return c.json({ success: true });
  } catch (err) {
    logWithContext("error", "stories.sentence.reorder_failed", {
      requestId: c.get("requestId"),
      meta: { storyId, error: err.message }
    });
    return c.json({ error: "Failed to reorder sentences" }, 500);
  }
});
app6.post("/:id/vocabulary", zValidator("json", addVocabularySchema), async (c) => {
  const storyId = c.req.param("id");
  const { vocabId, contextSentence } = c.req.valid("json");
  const { stories: stories2 } = getServices(c.env);
  try {
    await stories2.addVocabulary(storyId, vocabId, contextSentence);
    return c.json({ success: true }, 201);
  } catch (err) {
    logWithContext("error", "stories.vocabulary.add_failed", {
      requestId: c.get("requestId"),
      meta: { storyId, vocabId, error: err.message }
    });
    return c.json({ error: "Failed to add vocabulary" }, 500);
  }
});
app6.delete("/:id/vocabulary/:vocabId", async (c) => {
  const storyId = c.req.param("id");
  const vocabId = c.req.param("vocabId");
  const { stories: stories2 } = getServices(c.env);
  try {
    await stories2.removeVocabulary(storyId, vocabId);
    return c.json({ success: true });
  } catch (err) {
    logWithContext("error", "stories.vocabulary.remove_failed", {
      requestId: c.get("requestId"),
      meta: { storyId, vocabId, error: err.message }
    });
    return c.json({ error: "Failed to remove vocabulary" }, 500);
  }
});
app6.post("/:id/questions", zValidator("json", createQuestionSchema), async (c) => {
  const storyId = c.req.param("id");
  const data = c.req.valid("json");
  const { stories: stories2 } = getServices(c.env);
  try {
    const question = await stories2.addQuestion(storyId, data);
    return c.json({ question }, 201);
  } catch (err) {
    logWithContext("error", "stories.question.add_failed", {
      requestId: c.get("requestId"),
      meta: { storyId, error: err.message }
    });
    return c.json({ error: "Failed to add question" }, 500);
  }
});
app6.put("/:id/questions/:questionId", zValidator("json", createQuestionSchema.partial()), async (c) => {
  const questionId = c.req.param("questionId");
  const data = c.req.valid("json");
  const { stories: stories2 } = getServices(c.env);
  try {
    await stories2.updateQuestion(questionId, data);
    return c.json({ success: true });
  } catch (err) {
    logWithContext("error", "stories.question.update_failed", {
      requestId: c.get("requestId"),
      meta: { questionId, error: err.message }
    });
    return c.json({ error: "Failed to update question" }, 500);
  }
});
app6.delete("/:id/questions/:questionId", async (c) => {
  const questionId = c.req.param("questionId");
  const { stories: stories2 } = getServices(c.env);
  try {
    await stories2.deleteQuestion(questionId);
    return c.json({ success: true });
  } catch (err) {
    logWithContext("error", "stories.question.delete_failed", {
      requestId: c.get("requestId"),
      meta: { questionId, error: err.message }
    });
    return c.json({ error: "Failed to delete question" }, 500);
  }
});
app6.post("/:id/cover", async (c) => {
  const storyId = c.req.param("id");
  try {
    const formData = await c.req.formData();
    const cover = formData.get("cover");
    if (!cover) {
      return c.json({ error: "No cover image provided" }, 400);
    }
    if (cover.size > 5 * 1024 * 1024) {
      return c.json({ error: "Cover image too large (max 5MB)" }, 400);
    }
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(cover.type)) {
      return c.json({ error: "Invalid image type" }, 400);
    }
    const ext = cover.name.split(".").pop() || "jpg";
    const r2Key = `images/stories/${storyId}.${ext}`;
    await c.env.CONTENT_BUCKET.put(r2Key, await cover.arrayBuffer(), {
      httpMetadata: { contentType: cover.type }
    });
    const { stories: stories2 } = getServices(c.env);
    await stories2.uploadCoverImage(storyId, r2Key);
    return c.json({ success: true, r2Key });
  } catch (err) {
    logWithContext("error", "stories.cover.upload_failed", {
      requestId: c.get("requestId"),
      meta: { storyId, error: err.message }
    });
    return c.json({ error: "Failed to upload cover" }, 500);
  }
});
app6.post("/:id/sentences/:sentenceId/audio", async (c) => {
  const storyId = c.req.param("id");
  const sentenceId = c.req.param("sentenceId");
  try {
    const formData = await c.req.formData();
    const audio = formData.get("audio");
    if (!audio) {
      return c.json({ error: "No audio file provided" }, 400);
    }
    if (audio.size > 10 * 1024 * 1024) {
      return c.json({ error: "Audio file too large (max 10MB)" }, 400);
    }
    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/x-m4a", "audio/wav"];
    if (!allowedTypes.includes(audio.type)) {
      return c.json({ error: "Invalid audio type" }, 400);
    }
    const ext = audio.name.split(".").pop() || "mp3";
    const r2Key = `stories/sentences/${storyId}/${sentenceId}.${ext}`;
    await c.env.CONTENT_BUCKET.put(r2Key, await audio.arrayBuffer(), {
      httpMetadata: { contentType: audio.type }
    });
    const { stories: stories2 } = getServices(c.env);
    await stories2.uploadSentenceAudio(sentenceId, r2Key);
    return c.json({ success: true, r2Key });
  } catch (err) {
    logWithContext("error", "stories.audio.upload_failed", {
      requestId: c.get("requestId"),
      meta: { storyId, sentenceId, error: err.message }
    });
    return c.json({ error: "Failed to upload audio" }, 500);
  }
});
var stories_default = app6;

// src/routes/vocabulary.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function escapeLikePattern2(value) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
__name(escapeLikePattern2, "escapeLikePattern");
var app7 = new Hono2();
app7.use("/admin/*", authMiddleware({ allowRoles: ["admin"] }));
var searchSchema4 = external_exports.object({
  query: external_exports.string().optional(),
  hsk_level: external_exports.coerce.number().int().min(1).max(9).optional(),
  category: external_exports.string().optional(),
  limit: external_exports.coerce.number().int().min(1).max(100).optional().default(50),
  offset: external_exports.coerce.number().int().min(0).optional().default(0),
  sort: external_exports.enum(["hanzi", "pinyin", "hsk_level", "category"]).optional().default("hanzi"),
  order: external_exports.enum(["asc", "desc"]).optional().default("asc")
});
var createVocabSchema = external_exports.object({
  hanzi: external_exports.string().min(1),
  pinyin: external_exports.string().min(1),
  english: external_exports.string().min(1),
  category: external_exports.string().min(1),
  hskLevel: external_exports.number().int().min(1).max(9),
  tags: external_exports.array(external_exports.string()).optional(),
  // Audio and examples
  wordAudioR2Key: external_exports.string().optional(),
  exampleChinese: external_exports.string().optional(),
  examplePinyin: external_exports.string().optional(),
  exampleEnglish: external_exports.string().optional(),
  exampleAudioR2Key: external_exports.string().optional()
});
var updateVocabSchema = createVocabSchema.partial();
var bulkImportSchema = external_exports.object({
  entries: external_exports.array(createVocabSchema).min(1).max(1e3)
});
app7.get("/", zValidator("query", searchSchema4), async (c) => {
  const filters = c.req.valid("query");
  const db = drizzle(c.env.DB);
  try {
    const conditions = [];
    if (filters.query) {
      const escapedQuery = escapeLikePattern2(filters.query);
      const searchTerm = `%${escapedQuery}%`;
      conditions.push(
        or(
          like(vocabulary.hanzi, searchTerm),
          like(vocabulary.pinyin, searchTerm),
          like(vocabulary.english, searchTerm)
        )
      );
    }
    if (filters.hsk_level) {
      conditions.push(eq(vocabulary.hskLevel, filters.hsk_level));
    }
    if (filters.category) {
      conditions.push(eq(vocabulary.category, filters.category));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
    const sortField = {
      hanzi: vocabulary.hanzi,
      pinyin: vocabulary.pinyin,
      hsk_level: vocabulary.hskLevel,
      category: vocabulary.category
    }[filters.sort || "hanzi"];
    const orderFn = filters.order === "desc" ? desc : asc;
    const countResult = await db.select({ count: sql`count(*)` }).from(vocabulary).where(whereClause).get();
    const results = await db.select().from(vocabulary).where(whereClause).orderBy(orderFn(sortField)).limit(filters.limit).offset(filters.offset).all();
    return c.json({
      results,
      total: countResult?.count ?? 0,
      limit: filters.limit,
      offset: filters.offset
    });
  } catch (err) {
    logWithContext("error", "vocabulary.search_failed", {
      requestId: c.get("requestId"),
      meta: { error: err.message }
    });
    return c.json({ error: "Search failed" }, 500);
  }
});
app7.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(vocabulary).where(eq(vocabulary.id, id)).get();
    if (!result) {
      return c.json({ error: "Vocabulary not found" }, 404);
    }
    return c.json(result);
  } catch (err) {
    return c.json({ error: "Failed to fetch vocabulary" }, 500);
  }
});
app7.get("/admin/categories", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const results = await db.selectDistinct({ category: vocabulary.category }).from(vocabulary).all();
    return c.json({
      categories: results.map((r) => r.category).filter(Boolean)
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch categories" }, 500);
  }
});
app7.post("/admin", zValidator("json", createVocabSchema), async (c) => {
  const data = c.req.valid("json");
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  try {
    const id = crypto.randomUUID();
    await db.insert(vocabulary).values({
      id,
      hanzi: data.hanzi,
      pinyin: data.pinyin,
      english: data.english,
      category: data.category,
      hskLevel: data.hskLevel,
      tags: data.tags || null,
      wordAudioR2Key: data.wordAudioR2Key || null,
      exampleChinese: data.exampleChinese || null,
      examplePinyin: data.examplePinyin || null,
      exampleEnglish: data.exampleEnglish || null,
      exampleAudioR2Key: data.exampleAudioR2Key || null
    });
    logWithContext("info", "vocabulary.created", {
      requestId: c.get("requestId"),
      meta: { id, hanzi: data.hanzi, createdBy: user?.id }
    });
    return c.json({ id, success: true }, 201);
  } catch (err) {
    logWithContext("error", "vocabulary.create_failed", {
      requestId: c.get("requestId"),
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to create vocabulary" }, 500);
  }
});
app7.put("/admin/:id", zValidator("json", updateVocabSchema), async (c) => {
  const id = c.req.param("id");
  const data = c.req.valid("json");
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  try {
    const updateData = {};
    if (data.hanzi) updateData.hanzi = data.hanzi;
    if (data.pinyin) updateData.pinyin = data.pinyin;
    if (data.english) updateData.english = data.english;
    if (data.category) updateData.category = data.category;
    if (data.hskLevel) updateData.hskLevel = data.hskLevel;
    if (data.tags !== void 0) updateData.tags = data.tags;
    if (data.wordAudioR2Key !== void 0) updateData.wordAudioR2Key = data.wordAudioR2Key;
    if (data.exampleChinese !== void 0) updateData.exampleChinese = data.exampleChinese;
    if (data.examplePinyin !== void 0) updateData.examplePinyin = data.examplePinyin;
    if (data.exampleEnglish !== void 0) updateData.exampleEnglish = data.exampleEnglish;
    if (data.exampleAudioR2Key !== void 0) updateData.exampleAudioR2Key = data.exampleAudioR2Key;
    if (Object.keys(updateData).length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    await db.update(vocabulary).set(updateData).where(eq(vocabulary.id, id));
    logWithContext("info", "vocabulary.updated", {
      requestId: c.get("requestId"),
      meta: { id, updatedBy: user?.id }
    });
    return c.json({ success: true });
  } catch (err) {
    logWithContext("error", "vocabulary.update_failed", {
      requestId: c.get("requestId"),
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to update vocabulary" }, 500);
  }
});
app7.delete("/admin/:id", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  try {
    await db.delete(vocabulary).where(eq(vocabulary.id, id));
    logWithContext("info", "vocabulary.deleted", {
      requestId: c.get("requestId"),
      meta: { id, deletedBy: user?.id }
    });
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: "Failed to delete vocabulary" }, 500);
  }
});
app7.post("/admin/bulk-import", zValidator("json", bulkImportSchema), async (c) => {
  const { entries } = c.req.valid("json");
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  try {
    const values = entries.map((entry) => ({
      id: crypto.randomUUID(),
      hanzi: entry.hanzi,
      pinyin: entry.pinyin,
      english: entry.english,
      category: entry.category,
      hskLevel: entry.hskLevel,
      tags: entry.tags || null
    }));
    const batchSize = 100;
    let imported = 0;
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      await db.insert(vocabulary).values(batch);
      imported += batch.length;
    }
    logWithContext("info", "vocabulary.bulk_imported", {
      requestId: c.get("requestId"),
      meta: { count: imported, importedBy: user?.id }
    });
    return c.json({ success: true, imported }, 201);
  } catch (err) {
    logWithContext("error", "vocabulary.bulk_import_failed", {
      requestId: c.get("requestId"),
      meta: { error: err.message }
    });
    return c.json({ error: "Bulk import failed" }, 500);
  }
});
app7.get("/admin/export", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const results = await db.select().from(vocabulary).orderBy(asc(vocabulary.hskLevel), asc(vocabulary.hanzi)).all();
    return c.json({
      exported_at: (/* @__PURE__ */ new Date()).toISOString(),
      count: results.length,
      entries: results
    });
  } catch (err) {
    return c.json({ error: "Export failed" }, 500);
  }
});
app7.post("/admin/:id/word-audio", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB);
  try {
    const formData = await c.req.formData();
    const audio = formData.get("audio");
    if (!audio) {
      return c.json({ error: "No audio file provided" }, 400);
    }
    if (audio.size > 10 * 1024 * 1024) {
      return c.json({ error: "Audio file too large (max 10MB)" }, 400);
    }
    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/x-m4a", "audio/wav"];
    if (!allowedTypes.includes(audio.type)) {
      return c.json({ error: "Invalid audio type" }, 400);
    }
    const ext = audio.name.split(".").pop() || "mp3";
    const r2Key = `audio/vocabulary/words/${id}.${ext}`;
    await c.env.CONTENT_BUCKET.put(r2Key, await audio.arrayBuffer(), {
      httpMetadata: { contentType: audio.type }
    });
    await db.update(vocabulary).set({ wordAudioR2Key: r2Key }).where(eq(vocabulary.id, id));
    return c.json({ success: true, r2Key });
  } catch (err) {
    logWithContext("error", "vocabulary.word_audio_upload_failed", {
      requestId: c.get("requestId"),
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to upload audio" }, 500);
  }
});
app7.post("/admin/:id/example-audio", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB);
  try {
    const formData = await c.req.formData();
    const audio = formData.get("audio");
    if (!audio) {
      return c.json({ error: "No audio file provided" }, 400);
    }
    if (audio.size > 10 * 1024 * 1024) {
      return c.json({ error: "Audio file too large (max 10MB)" }, 400);
    }
    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/x-m4a", "audio/wav"];
    if (!allowedTypes.includes(audio.type)) {
      return c.json({ error: "Invalid audio type" }, 400);
    }
    const ext = audio.name.split(".").pop() || "mp3";
    const r2Key = `audio/vocabulary/examples/${id}.${ext}`;
    await c.env.CONTENT_BUCKET.put(r2Key, await audio.arrayBuffer(), {
      httpMetadata: { contentType: audio.type }
    });
    await db.update(vocabulary).set({ exampleAudioR2Key: r2Key }).where(eq(vocabulary.id, id));
    return c.json({ success: true, r2Key });
  } catch (err) {
    logWithContext("error", "vocabulary.example_audio_upload_failed", {
      requestId: c.get("requestId"),
      meta: { error: err.message }
    });
    return c.json({ error: "Failed to upload audio" }, 500);
  }
});
var vocabulary_default = app7;

// src/routes/units.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var app8 = new Hono2();
app8.use("/*", authMiddleware({ allowRoles: ["admin"] }));
var createUnitSchema = external_exports.object({
  hskLevel: external_exports.number().int().min(1).max(9),
  unitNumber: external_exports.number().int().min(1).optional(),
  // Auto-increment if not provided
  title: external_exports.string().min(3).max(100),
  description: external_exports.string().optional(),
  gradientStart: external_exports.string().optional(),
  gradientEnd: external_exports.string().optional(),
  accentColor: external_exports.string().optional(),
  orderIndex: external_exports.number().int().min(0).optional()
});
var updateUnitSchema = external_exports.object({
  title: external_exports.string().min(3).max(100).optional(),
  description: external_exports.string().optional(),
  gradientStart: external_exports.string().optional(),
  gradientEnd: external_exports.string().optional(),
  accentColor: external_exports.string().optional(),
  orderIndex: external_exports.number().int().min(0).optional(),
  isPublished: external_exports.boolean().optional()
});
var reorderLessonsSchema = external_exports.object({
  lessonIds: external_exports.array(external_exports.string())
  // Ordered array of lesson IDs
});
app8.get("/", async (c) => {
  const hskLevel = c.req.query("hsk_level");
  const db = drizzle(c.env.DB);
  try {
    const whereClause = hskLevel ? eq(units.hskLevel, Number(hskLevel)) : void 0;
    const allUnits = await db.select().from(units).where(whereClause).orderBy(asc(units.hskLevel), asc(units.unitNumber));
    return c.json({ success: true, units: allUnits });
  } catch (error3) {
    logWithContext("error", "units.list_failed", {
      requestId: c.get("requestId"),
      meta: { message: error3.message }
    });
    return c.json({ error: "Failed to fetch units" }, 500);
  }
});
app8.get("/:id", async (c) => {
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);
  try {
    const unitResult = await db.select().from(units).where(eq(units.id, id)).limit(1);
    const unit = unitResult[0];
    if (!unit) {
      return c.json({ error: "Unit not found" }, 404);
    }
    return c.json({ success: true, unit });
  } catch (error3) {
    logWithContext("error", "units.get_failed", {
      requestId: c.get("requestId"),
      meta: { unitId: id, message: error3.message }
    });
    return c.json({ error: "Failed to fetch unit" }, 500);
  }
});
app8.get("/:id/lessons", async (c) => {
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);
  try {
    const unitLessons = await db.select().from(lessons).where(eq(lessons.unitId, id)).orderBy(asc(lessons.orderInUnit));
    return c.json({ success: true, lessons: unitLessons });
  } catch (error3) {
    logWithContext("error", "units.get_lessons_failed", {
      requestId: c.get("requestId"),
      meta: { unitId: id, message: error3.message }
    });
    return c.json({ error: "Failed to fetch unit lessons" }, 500);
  }
});
app8.post("/", zValidator("json", createUnitSchema), async (c) => {
  const data = c.req.valid("json");
  const db = drizzle(c.env.DB);
  const unitId = crypto.randomUUID();
  try {
    let unitNumber = data.unitNumber;
    if (!unitNumber) {
      const maxNumberResult = await db.select({ maxNumber: units.unitNumber }).from(units).where(eq(units.hskLevel, data.hskLevel)).orderBy(desc(units.unitNumber)).limit(1);
      unitNumber = maxNumberResult[0]?.maxNumber ? maxNumberResult[0].maxNumber + 1 : 1;
    }
    await db.insert(units).values({
      id: unitId,
      hskLevel: data.hskLevel,
      unitNumber,
      title: data.title,
      description: data.description || null,
      gradientStart: data.gradientStart || "#EEF2FF",
      gradientEnd: data.gradientEnd || "#C7D2FE",
      accentColor: data.accentColor || "#4F46E5",
      orderIndex: data.orderIndex || unitNumber,
      isPublished: false
    });
    return c.json({ success: true, id: unitId, unitNumber }, 201);
  } catch (error3) {
    logWithContext("error", "units.create_failed", {
      requestId: c.get("requestId"),
      meta: { message: error3.message }
    });
    return c.json({ error: "Failed to create unit", message: error3.message }, 500);
  }
});
app8.put("/:id", zValidator("json", updateUnitSchema), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid("json");
  const db = drizzle(c.env.DB);
  try {
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (data.title !== void 0) updateData.title = data.title;
    if (data.description !== void 0) updateData.description = data.description;
    if (data.gradientStart !== void 0) updateData.gradientStart = data.gradientStart;
    if (data.gradientEnd !== void 0) updateData.gradientEnd = data.gradientEnd;
    if (data.accentColor !== void 0) updateData.accentColor = data.accentColor;
    if (data.orderIndex !== void 0) updateData.orderIndex = data.orderIndex;
    if (data.isPublished !== void 0) updateData.isPublished = data.isPublished;
    await db.update(units).set(updateData).where(eq(units.id, id));
    return c.json({ success: true });
  } catch (error3) {
    logWithContext("error", "units.update_failed", {
      requestId: c.get("requestId"),
      meta: { unitId: id, message: error3.message }
    });
    return c.json({ error: "Failed to update unit" }, 500);
  }
});
app8.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);
  try {
    await db.delete(units).where(eq(units.id, id));
    return c.json({ success: true });
  } catch (error3) {
    logWithContext("error", "units.delete_failed", {
      requestId: c.get("requestId"),
      meta: { unitId: id, message: error3.message }
    });
    return c.json({ error: "Failed to delete unit" }, 500);
  }
});
app8.post("/:id/lessons/:lessonId", async (c) => {
  const { id, lessonId } = c.req.param();
  const db = drizzle(c.env.DB);
  try {
    const lessonCount = await db.select({ count: lessons.id }).from(lessons).where(eq(lessons.unitId, id));
    const nextOrder = lessonCount.length + 1;
    await db.update(lessons).set({
      unitId: id,
      orderInUnit: nextOrder,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(lessons.id, lessonId));
    return c.json({ success: true, orderInUnit: nextOrder });
  } catch (error3) {
    logWithContext("error", "units.add_lesson_failed", {
      requestId: c.get("requestId"),
      meta: { unitId: id, lessonId, message: error3.message }
    });
    return c.json({ error: "Failed to add lesson to unit" }, 500);
  }
});
app8.delete("/:id/lessons/:lessonId", async (c) => {
  const { lessonId } = c.req.param();
  const db = drizzle(c.env.DB);
  try {
    await db.update(lessons).set({
      unitId: null,
      orderInUnit: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(lessons.id, lessonId));
    return c.json({ success: true });
  } catch (error3) {
    logWithContext("error", "units.remove_lesson_failed", {
      requestId: c.get("requestId"),
      meta: { lessonId, message: error3.message }
    });
    return c.json({ error: "Failed to remove lesson from unit" }, 500);
  }
});
app8.put("/:id/lessons/reorder", zValidator("json", reorderLessonsSchema), async (c) => {
  const { id } = c.req.param();
  const { lessonIds } = c.req.valid("json");
  const db = drizzle(c.env.DB);
  try {
    const updates = lessonIds.map(
      (lessonId, index2) => db.update(lessons).set({
        orderInUnit: index2 + 1,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(and(eq(lessons.id, lessonId), eq(lessons.unitId, id)))
    );
    await Promise.all(updates);
    return c.json({ success: true });
  } catch (error3) {
    logWithContext("error", "units.reorder_lessons_failed", {
      requestId: c.get("requestId"),
      meta: { unitId: id, message: error3.message }
    });
    return c.json({ error: "Failed to reorder lessons" }, 500);
  }
});
var units_default = app8;

// src/routes/waitlist.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var waitlistSchema = external_exports.object({
  email: external_exports.string().email("Invalid email address"),
  source: external_exports.string().optional().default("website")
});
var app9 = new Hono2();
async function checkRateLimit(db, ip) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const result = await db.prepare(
    `SELECT COUNT(*) as count 
       FROM waitlist 
       WHERE source = ? 
       AND date(created_at, 'unixepoch') = ?`
  ).bind(`ip:${ip}`, today).first();
  return (result?.count ?? 0) < 3;
}
__name(checkRateLimit, "checkRateLimit");
app9.post("/", zValidator("json", waitlistSchema), async (c) => {
  const { email, source } = c.req.valid("json");
  const ip = c.req.header("cf-connecting-ip") || c.req.header("x-real-ip") || "unknown";
  const allowed = await checkRateLimit(c.env.DB, ip);
  if (!allowed) {
    throw new HTTPException(429, {
      message: "Too many signups from this IP. Please try again tomorrow."
    });
  }
  const db = drizzle(c.env.DB);
  try {
    const existing = await db.select().from(waitlist).where(eq(waitlist.email, email)).get();
    if (existing) {
      return c.json({
        success: true,
        message: "You're on the list! We'll notify you when we launch."
      });
    }
    await db.insert(waitlist).values({
      id: nanoid(),
      email,
      source: `${source}:${ip}`
    });
    return c.json({
      success: true,
      message: "You're on the list! We'll notify you when we launch."
    }, 201);
  } catch (error3) {
    if (error3 instanceof Error && error3.message.includes("UNIQUE constraint failed")) {
      return c.json({
        success: true,
        message: "You're on the list! We'll notify you when we launch."
      });
    }
    throw error3;
  }
});
var waitlist_default = app9;

// src/middleware/request-context.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// src/config/runtime.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var envSchema = external_exports.object({
  ADMIN_SECRET: external_exports.string().min(1, "ADMIN_SECRET is required"),
  OPENAI_API_KEY: external_exports.string().min(1, "OPENAI_API_KEY is required"),
  JWT_SECRET: external_exports.string().min(1, "JWT_SECRET is required"),
  JWT_MAX_AGE: external_exports.string().optional(),
  OPENAI_BASE_URL: external_exports.string().url().optional(),
  ALLOWED_ORIGINS: external_exports.string().optional(),
  MAX_REQUESTS_PER_DAY: external_exports.coerce.number().int().positive().optional(),
  MAX_TOKENS_PER_DAY: external_exports.coerce.number().int().positive().optional(),
  DEFAULT_AI_MODEL: external_exports.string().optional(),
  ALLOW_LEGACY_AUTH: external_exports.enum(["true", "false"]).optional().default("false"),
  // Clerk (optional for now, will be required later)
  CLERK_PUBLISHABLE_KEY: external_exports.string().optional(),
  CLERK_SECRET_KEY: external_exports.string().optional(),
  CLERK_JWT_ISSUER: external_exports.string().url().optional(),
  CLERK_JWKS_URL: external_exports.string().url().optional(),
  // RevenueCat (optional for now)
  REVENUECAT_PUBLIC_API_KEY: external_exports.string().optional(),
  REVENUECAT_SECRET_API_KEY: external_exports.string().optional(),
  REVENUECAT_WEBHOOK_SECRET: external_exports.string().optional()
});
var DEFAULT_ORIGINS = ["http://localhost:5173", "http://localhost:3000"];
var DEFAULT_REQUEST_LIMIT = 10;
var DEFAULT_TOKEN_LIMIT = 5e3;
var DEFAULT_JWT_MAX_AGE = "7d";
var resolveRuntimeConfig = /* @__PURE__ */ __name((bindings) => {
  const parsed = envSchema.parse(bindings);
  const allowedOriginsRaw = parsed.ALLOWED_ORIGINS;
  const allowedOrigins = allowedOriginsRaw ? allowedOriginsRaw.split(",").map((origin) => origin.trim()).filter(Boolean) : DEFAULT_ORIGINS;
  return {
    secrets: {
      adminSecret: parsed.ADMIN_SECRET,
      openAIApiKey: parsed.OPENAI_API_KEY,
      jwtSecret: parsed.JWT_SECRET,
      clerkPublishableKey: parsed.CLERK_PUBLISHABLE_KEY,
      clerkSecretKey: parsed.CLERK_SECRET_KEY,
      clerkJwtIssuer: parsed.CLERK_JWT_ISSUER,
      clerkJwksUrl: parsed.CLERK_JWKS_URL,
      revenuecatPublicApiKey: parsed.REVENUECAT_PUBLIC_API_KEY,
      revenuecatSecretApiKey: parsed.REVENUECAT_SECRET_API_KEY,
      revenuecatWebhookSecret: parsed.REVENUECAT_WEBHOOK_SECRET
    },
    jwt: {
      maxAge: parsed.JWT_MAX_AGE || DEFAULT_JWT_MAX_AGE
    },
    auth: {
      allowLegacy: parsed.ALLOW_LEGACY_AUTH === "true"
    },
    openaiBaseUrl: parsed.OPENAI_BASE_URL,
    defaultModel: parsed.DEFAULT_AI_MODEL,
    allowedOrigins,
    rateLimits: {
      requestsPerDay: parsed.MAX_REQUESTS_PER_DAY ?? DEFAULT_REQUEST_LIMIT,
      tokensPerDay: parsed.MAX_TOKENS_PER_DAY ?? DEFAULT_TOKEN_LIMIT
    }
  };
}, "resolveRuntimeConfig");

// src/middleware/request-context.ts
var requestContextMiddleware = /* @__PURE__ */ __name(async (c, next) => {
  const incomingId = c.req.header("X-Request-ID");
  const requestId = incomingId && incomingId.trim().length > 0 ? incomingId : crypto.randomUUID();
  c.set("requestId", requestId);
  const config2 = resolveRuntimeConfig(c.env);
  c.set("config", config2);
  const startedAt = Date.now();
  try {
    await next();
  } finally {
    c.header("X-Request-ID", requestId);
    const durationMs = Date.now() - startedAt;
    logWithContext("info", "request.completed", {
      requestId,
      meta: {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs
      }
    });
  }
}, "requestContextMiddleware");

// src/crons/cleanup-uploads.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
async function cleanupOrphanedUploads(db, bucket, logFn = console.log) {
  const d1 = drizzle(db);
  const result = {
    recordsCleaned: 0,
    filesDeleted: 0,
    errors: []
  };
  const cutoffTime = /* @__PURE__ */ new Date();
  cutoffTime.setHours(cutoffTime.getHours() - 1);
  const cutoffTimestamp = Math.floor(cutoffTime.getTime() / 1e3);
  try {
    const stuckUploads = await d1.select().from(contentLibrary).where(
      and(
        or(
          eq(contentLibrary.uploadStatus, "pending_upload"),
          eq(contentLibrary.uploadStatus, "uploading"),
          eq(contentLibrary.uploadStatus, "failed")
        ),
        lt(contentLibrary.createdAt, cutoffTime)
      )
    ).all();
    logFn("cleanup.orphaned_uploads.scan_complete", {
      found: stuckUploads.length,
      cutoffTime: cutoffTime.toISOString()
    });
    for (const upload of stuckUploads) {
      try {
        const deletePromises = [];
        if (upload.r2Key) deletePromises.push(bucket.delete(upload.r2Key));
        if (upload.coverImageR2Key) deletePromises.push(bucket.delete(upload.coverImageR2Key));
        if (upload.sampleR2Key) deletePromises.push(bucket.delete(upload.sampleR2Key));
        const r2Results = await Promise.allSettled(deletePromises);
        const filesDeleted = r2Results.filter((r) => r.status === "fulfilled").length;
        result.filesDeleted += filesDeleted;
        await d1.delete(contentLibrary).where(eq(contentLibrary.id, upload.id));
        result.recordsCleaned++;
        logFn("cleanup.orphaned_uploads.record_cleaned", {
          contentId: upload.id,
          status: upload.uploadStatus,
          ageHours: Math.floor((Date.now() - (upload.createdAt?.getTime() || 0)) / (1e3 * 60 * 60)),
          filesDeleted
        });
      } catch (error3) {
        const errorMsg = `Failed to clean upload ${upload.id}: ${error3.message}`;
        result.errors.push(errorMsg);
        logFn("cleanup.orphaned_uploads.error", {
          contentId: upload.id,
          error: error3.message
        });
      }
    }
    logFn("cleanup.orphaned_uploads.complete", {
      recordsCleaned: result.recordsCleaned,
      filesDeleted: result.filesDeleted,
      errors: result.errors.length
    });
    return result;
  } catch (error3) {
    logFn("cleanup.orphaned_uploads.fatal_error", {
      error: error3.message
    });
    throw error3;
  }
}
__name(cleanupOrphanedUploads, "cleanupOrphanedUploads");
async function handleCleanupCron(db, bucket, logFn) {
  try {
    const result = await cleanupOrphanedUploads(db, bucket, logFn);
    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error3) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error3.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(handleCleanupCron, "handleCleanupCron");

// src/crons/engagement-aggregation.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
async function handleEngagementAggregation(d1Database, log3) {
  const startTime = Date.now();
  const db = drizzle(d1Database);
  log3("engagement_aggregation.started");
  try {
    const aggregationResult = await aggregateEngagementEvents(db);
    log3("engagement_aggregation.events_processed", {
      processed: aggregationResult.processed,
      errors: aggregationResult.errors
    });
    const currentMinute = (/* @__PURE__ */ new Date()).getMinutes();
    let cleaned = 0;
    if (currentMinute < 10) {
      const cleanupResult = await cleanupOldEngagementEvents(db, 90);
      cleaned = cleanupResult.deleted;
      if (cleaned > 0) {
        log3("engagement_aggregation.cleanup_complete", { deleted: cleaned });
      }
    }
    const durationMs = Date.now() - startTime;
    log3("engagement_aggregation.complete", {
      processed: aggregationResult.processed,
      errors: aggregationResult.errors,
      cleaned,
      durationMs
    });
    return {
      processed: aggregationResult.processed,
      errors: aggregationResult.errors,
      cleaned,
      durationMs
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    log3("engagement_aggregation.failed", {
      error: errorMessage,
      durationMs
    });
    throw err;
  }
}
__name(handleEngagementAggregation, "handleEngagementAggregation");

// src/index.ts
var app10 = new Hono2();
app10.use("*", requestContextMiddleware);
app10.use("/*", async (c, next) => {
  const path = c.req.path;
  if (path.includes("/webhooks/")) {
    return next();
  }
  const config2 = c.get("config");
  const origin = c.req.header("Origin");
  const allowedOrigins = config2.allowedOrigins;
  if (!origin) {
    return next();
  }
  if (!allowedOrigins.includes(origin)) {
    throw new HTTPException(403, { message: "Origin not allowed" });
  }
  return cors({
    origin,
    credentials: true
  })(c, next);
});
app10.onError((err, c) => {
  const requestId = c.get("requestId");
  if (err instanceof HTTPException) {
    return c.json({ message: err.message, requestId }, err.status);
  }
  logWithContext("error", "Unhandled error", {
    requestId,
    meta: {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : void 0
    }
  });
  return c.json({ message: "Internal Server Error", requestId }, 500);
});
app10.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "hanzimaster-backend-v2",
    version: "1.0.0"
  });
});
app10.route("/v1/lessons", lessons_default);
app10.route("/v1/admin", admin_default);
app10.route("/v1/ai", import_ai.default);
app10.route("/v1/models", models_default);
app10.route("/v1/content", content_default);
app10.route("/v1/ai/prompts", import_prompts.default);
app10.route("/v1/analytics", analytics_default);
app10.route("/v1/analytics", publicAnalyticsRoutes);
app10.route("/v1/billing", billing_default);
app10.route("/v1/users", users_default);
app10.route("/v1/stories", stories_default);
app10.route("/v1/vocabulary", vocabulary_default);
app10.route("/v1/units", units_default);
app10.route("/v1/waitlist", waitlist_default);
var src_default = {
  fetch: app10.fetch,
  async scheduled(event, env2, ctx) {
    const cron = event.cron;
    if (cron === "*/10 * * * *") {
      ctx.waitUntil(
        handleEngagementAggregation(
          env2.DB,
          (message2, meta) => logWithContext("info", message2, { meta })
        ).then((result) => {
          logWithContext("info", "cron.engagement_aggregation_complete", { meta: result });
        }).catch((err) => {
          logWithContext("error", "cron.engagement_aggregation_failed", {
            meta: { error: err instanceof Error ? err.message : String(err) }
          });
        })
      );
      return;
    }
    ctx.waitUntil(
      handleCleanupCron(
        env2.DB,
        env2.CONTENT_BUCKET,
        (message2, meta) => logWithContext("info", message2, { meta })
      ).then((response) => {
        return response.json().then((data) => {
          logWithContext("info", "cron.cleanup_complete", { meta: data });
        });
      })
    );
  }
};

// node_modules/.pnpm/wrangler@4.50.0_@cloudflare+workers-types@4.20251121.0/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/.pnpm/wrangler@4.50.0_@cloudflare+workers-types@4.20251121.0/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-SPgV10/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/.pnpm/wrangler@4.50.0_@cloudflare+workers-types@4.20251121.0/node_modules/wrangler/templates/middleware/common.ts
init_modules_watch_stub();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-SPgV10/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
