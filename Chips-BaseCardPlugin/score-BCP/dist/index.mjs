function gy(r) {
  return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r;
}
var Zs = { exports: {} }, He = {};
var op;
function vy() {
  if (op) return He;
  op = 1;
  var r = /* @__PURE__ */ Symbol.for("react.element"), o = /* @__PURE__ */ Symbol.for("react.portal"), l = /* @__PURE__ */ Symbol.for("react.fragment"), u = /* @__PURE__ */ Symbol.for("react.strict_mode"), d = /* @__PURE__ */ Symbol.for("react.profiler"), f = /* @__PURE__ */ Symbol.for("react.provider"), p = /* @__PURE__ */ Symbol.for("react.context"), m = /* @__PURE__ */ Symbol.for("react.forward_ref"), g = /* @__PURE__ */ Symbol.for("react.suspense"), v = /* @__PURE__ */ Symbol.for("react.memo"), E = /* @__PURE__ */ Symbol.for("react.lazy"), C = Symbol.iterator;
  function w(L) {
    return L === null || typeof L != "object" ? null : (L = C && L[C] || L["@@iterator"], typeof L == "function" ? L : null);
  }
  var N = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, k = Object.assign, S = {};
  function b(L, M, ne) {
    this.props = L, this.context = M, this.refs = S, this.updater = ne || N;
  }
  b.prototype.isReactComponent = {}, b.prototype.setState = function(L, M) {
    if (typeof L != "object" && typeof L != "function" && L != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, L, M, "setState");
  }, b.prototype.forceUpdate = function(L) {
    this.updater.enqueueForceUpdate(this, L, "forceUpdate");
  };
  function _() {
  }
  _.prototype = b.prototype;
  function I(L, M, ne) {
    this.props = L, this.context = M, this.refs = S, this.updater = ne || N;
  }
  var D = I.prototype = new _();
  D.constructor = I, k(D, b.prototype), D.isPureReactComponent = !0;
  var x = Array.isArray, R = Object.prototype.hasOwnProperty, P = { current: null }, O = { key: !0, ref: !0, __self: !0, __source: !0 };
  function A(L, M, ne) {
    var te, ce = {}, Y = null, ae = null;
    if (M != null) for (te in M.ref !== void 0 && (ae = M.ref), M.key !== void 0 && (Y = "" + M.key), M) R.call(M, te) && !O.hasOwnProperty(te) && (ce[te] = M[te]);
    var de = arguments.length - 2;
    if (de === 1) ce.children = ne;
    else if (1 < de) {
      for (var ie = Array(de), ge = 0; ge < de; ge++) ie[ge] = arguments[ge + 2];
      ce.children = ie;
    }
    if (L && L.defaultProps) for (te in de = L.defaultProps, de) ce[te] === void 0 && (ce[te] = de[te]);
    return { $$typeof: r, type: L, key: Y, ref: ae, props: ce, _owner: P.current };
  }
  function Q(L, M) {
    return { $$typeof: r, type: L.type, key: M, ref: L.ref, props: L.props, _owner: L._owner };
  }
  function F(L) {
    return typeof L == "object" && L !== null && L.$$typeof === r;
  }
  function W(L) {
    var M = { "=": "=0", ":": "=2" };
    return "$" + L.replace(/[=:]/g, function(ne) {
      return M[ne];
    });
  }
  var q = /\/+/g;
  function H(L, M) {
    return typeof L == "object" && L !== null && L.key != null ? W("" + L.key) : M.toString(36);
  }
  function ee(L, M, ne, te, ce) {
    var Y = typeof L;
    (Y === "undefined" || Y === "boolean") && (L = null);
    var ae = !1;
    if (L === null) ae = !0;
    else switch (Y) {
      case "string":
      case "number":
        ae = !0;
        break;
      case "object":
        switch (L.$$typeof) {
          case r:
          case o:
            ae = !0;
        }
    }
    if (ae) return ae = L, ce = ce(ae), L = te === "" ? "." + H(ae, 0) : te, x(ce) ? (ne = "", L != null && (ne = L.replace(q, "$&/") + "/"), ee(ce, M, ne, "", function(ge) {
      return ge;
    })) : ce != null && (F(ce) && (ce = Q(ce, ne + (!ce.key || ae && ae.key === ce.key ? "" : ("" + ce.key).replace(q, "$&/") + "/") + L)), M.push(ce)), 1;
    if (ae = 0, te = te === "" ? "." : te + ":", x(L)) for (var de = 0; de < L.length; de++) {
      Y = L[de];
      var ie = te + H(Y, de);
      ae += ee(Y, M, ne, ie, ce);
    }
    else if (ie = w(L), typeof ie == "function") for (L = ie.call(L), de = 0; !(Y = L.next()).done; ) Y = Y.value, ie = te + H(Y, de++), ae += ee(Y, M, ne, ie, ce);
    else if (Y === "object") throw M = String(L), Error("Objects are not valid as a React child (found: " + (M === "[object Object]" ? "object with keys {" + Object.keys(L).join(", ") + "}" : M) + "). If you meant to render a collection of children, use an array instead.");
    return ae;
  }
  function j(L, M, ne) {
    if (L == null) return L;
    var te = [], ce = 0;
    return ee(L, te, "", "", function(Y) {
      return M.call(ne, Y, ce++);
    }), te;
  }
  function $(L) {
    if (L._status === -1) {
      var M = L._result;
      M = M(), M.then(function(ne) {
        (L._status === 0 || L._status === -1) && (L._status = 1, L._result = ne);
      }, function(ne) {
        (L._status === 0 || L._status === -1) && (L._status = 2, L._result = ne);
      }), L._status === -1 && (L._status = 0, L._result = M);
    }
    if (L._status === 1) return L._result.default;
    throw L._result;
  }
  var U = { current: null }, V = { transition: null }, Z = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: P };
  function K() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return He.Children = { map: j, forEach: function(L, M, ne) {
    j(L, function() {
      M.apply(this, arguments);
    }, ne);
  }, count: function(L) {
    var M = 0;
    return j(L, function() {
      M++;
    }), M;
  }, toArray: function(L) {
    return j(L, function(M) {
      return M;
    }) || [];
  }, only: function(L) {
    if (!F(L)) throw Error("React.Children.only expected to receive a single React element child.");
    return L;
  } }, He.Component = b, He.Fragment = l, He.Profiler = d, He.PureComponent = I, He.StrictMode = u, He.Suspense = g, He.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Z, He.act = K, He.cloneElement = function(L, M, ne) {
    if (L == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + L + ".");
    var te = k({}, L.props), ce = L.key, Y = L.ref, ae = L._owner;
    if (M != null) {
      if (M.ref !== void 0 && (Y = M.ref, ae = P.current), M.key !== void 0 && (ce = "" + M.key), L.type && L.type.defaultProps) var de = L.type.defaultProps;
      for (ie in M) R.call(M, ie) && !O.hasOwnProperty(ie) && (te[ie] = M[ie] === void 0 && de !== void 0 ? de[ie] : M[ie]);
    }
    var ie = arguments.length - 2;
    if (ie === 1) te.children = ne;
    else if (1 < ie) {
      de = Array(ie);
      for (var ge = 0; ge < ie; ge++) de[ge] = arguments[ge + 2];
      te.children = de;
    }
    return { $$typeof: r, type: L.type, key: ce, ref: Y, props: te, _owner: ae };
  }, He.createContext = function(L) {
    return L = { $$typeof: p, _currentValue: L, _currentValue2: L, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, L.Provider = { $$typeof: f, _context: L }, L.Consumer = L;
  }, He.createElement = A, He.createFactory = function(L) {
    var M = A.bind(null, L);
    return M.type = L, M;
  }, He.createRef = function() {
    return { current: null };
  }, He.forwardRef = function(L) {
    return { $$typeof: m, render: L };
  }, He.isValidElement = F, He.lazy = function(L) {
    return { $$typeof: E, _payload: { _status: -1, _result: L }, _init: $ };
  }, He.memo = function(L, M) {
    return { $$typeof: v, type: L, compare: M === void 0 ? null : M };
  }, He.startTransition = function(L) {
    var M = V.transition;
    V.transition = {};
    try {
      L();
    } finally {
      V.transition = M;
    }
  }, He.unstable_act = K, He.useCallback = function(L, M) {
    return U.current.useCallback(L, M);
  }, He.useContext = function(L) {
    return U.current.useContext(L);
  }, He.useDebugValue = function() {
  }, He.useDeferredValue = function(L) {
    return U.current.useDeferredValue(L);
  }, He.useEffect = function(L, M) {
    return U.current.useEffect(L, M);
  }, He.useId = function() {
    return U.current.useId();
  }, He.useImperativeHandle = function(L, M, ne) {
    return U.current.useImperativeHandle(L, M, ne);
  }, He.useInsertionEffect = function(L, M) {
    return U.current.useInsertionEffect(L, M);
  }, He.useLayoutEffect = function(L, M) {
    return U.current.useLayoutEffect(L, M);
  }, He.useMemo = function(L, M) {
    return U.current.useMemo(L, M);
  }, He.useReducer = function(L, M, ne) {
    return U.current.useReducer(L, M, ne);
  }, He.useRef = function(L) {
    return U.current.useRef(L);
  }, He.useState = function(L) {
    return U.current.useState(L);
  }, He.useSyncExternalStore = function(L, M, ne) {
    return U.current.useSyncExternalStore(L, M, ne);
  }, He.useTransition = function() {
    return U.current.useTransition();
  }, He.version = "18.3.1", He;
}
var lp;
function Lu() {
  return lp || (lp = 1, Zs.exports = vy()), Zs.exports;
}
var _a = Lu();
const i = /* @__PURE__ */ gy(_a);
var Js = { exports: {} }, ln = {}, eu = { exports: {} }, tu = {};
var ip;
function by() {
  return ip || (ip = 1, (function(r) {
    function o(V, Z) {
      var K = V.length;
      V.push(Z);
      e: for (; 0 < K; ) {
        var L = K - 1 >>> 1, M = V[L];
        if (0 < d(M, Z)) V[L] = Z, V[K] = M, K = L;
        else break e;
      }
    }
    function l(V) {
      return V.length === 0 ? null : V[0];
    }
    function u(V) {
      if (V.length === 0) return null;
      var Z = V[0], K = V.pop();
      if (K !== Z) {
        V[0] = K;
        e: for (var L = 0, M = V.length, ne = M >>> 1; L < ne; ) {
          var te = 2 * (L + 1) - 1, ce = V[te], Y = te + 1, ae = V[Y];
          if (0 > d(ce, K)) Y < M && 0 > d(ae, ce) ? (V[L] = ae, V[Y] = K, L = Y) : (V[L] = ce, V[te] = K, L = te);
          else if (Y < M && 0 > d(ae, K)) V[L] = ae, V[Y] = K, L = Y;
          else break e;
        }
      }
      return Z;
    }
    function d(V, Z) {
      var K = V.sortIndex - Z.sortIndex;
      return K !== 0 ? K : V.id - Z.id;
    }
    if (typeof performance == "object" && typeof performance.now == "function") {
      var f = performance;
      r.unstable_now = function() {
        return f.now();
      };
    } else {
      var p = Date, m = p.now();
      r.unstable_now = function() {
        return p.now() - m;
      };
    }
    var g = [], v = [], E = 1, C = null, w = 3, N = !1, k = !1, S = !1, b = typeof setTimeout == "function" ? setTimeout : null, _ = typeof clearTimeout == "function" ? clearTimeout : null, I = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function D(V) {
      for (var Z = l(v); Z !== null; ) {
        if (Z.callback === null) u(v);
        else if (Z.startTime <= V) u(v), Z.sortIndex = Z.expirationTime, o(g, Z);
        else break;
        Z = l(v);
      }
    }
    function x(V) {
      if (S = !1, D(V), !k) if (l(g) !== null) k = !0, $(R);
      else {
        var Z = l(v);
        Z !== null && U(x, Z.startTime - V);
      }
    }
    function R(V, Z) {
      k = !1, S && (S = !1, _(A), A = -1), N = !0;
      var K = w;
      try {
        for (D(Z), C = l(g); C !== null && (!(C.expirationTime > Z) || V && !W()); ) {
          var L = C.callback;
          if (typeof L == "function") {
            C.callback = null, w = C.priorityLevel;
            var M = L(C.expirationTime <= Z);
            Z = r.unstable_now(), typeof M == "function" ? C.callback = M : C === l(g) && u(g), D(Z);
          } else u(g);
          C = l(g);
        }
        if (C !== null) var ne = !0;
        else {
          var te = l(v);
          te !== null && U(x, te.startTime - Z), ne = !1;
        }
        return ne;
      } finally {
        C = null, w = K, N = !1;
      }
    }
    var P = !1, O = null, A = -1, Q = 5, F = -1;
    function W() {
      return !(r.unstable_now() - F < Q);
    }
    function q() {
      if (O !== null) {
        var V = r.unstable_now();
        F = V;
        var Z = !0;
        try {
          Z = O(!0, V);
        } finally {
          Z ? H() : (P = !1, O = null);
        }
      } else P = !1;
    }
    var H;
    if (typeof I == "function") H = function() {
      I(q);
    };
    else if (typeof MessageChannel < "u") {
      var ee = new MessageChannel(), j = ee.port2;
      ee.port1.onmessage = q, H = function() {
        j.postMessage(null);
      };
    } else H = function() {
      b(q, 0);
    };
    function $(V) {
      O = V, P || (P = !0, H());
    }
    function U(V, Z) {
      A = b(function() {
        V(r.unstable_now());
      }, Z);
    }
    r.unstable_IdlePriority = 5, r.unstable_ImmediatePriority = 1, r.unstable_LowPriority = 4, r.unstable_NormalPriority = 3, r.unstable_Profiling = null, r.unstable_UserBlockingPriority = 2, r.unstable_cancelCallback = function(V) {
      V.callback = null;
    }, r.unstable_continueExecution = function() {
      k || N || (k = !0, $(R));
    }, r.unstable_forceFrameRate = function(V) {
      0 > V || 125 < V ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : Q = 0 < V ? Math.floor(1e3 / V) : 5;
    }, r.unstable_getCurrentPriorityLevel = function() {
      return w;
    }, r.unstable_getFirstCallbackNode = function() {
      return l(g);
    }, r.unstable_next = function(V) {
      switch (w) {
        case 1:
        case 2:
        case 3:
          var Z = 3;
          break;
        default:
          Z = w;
      }
      var K = w;
      w = Z;
      try {
        return V();
      } finally {
        w = K;
      }
    }, r.unstable_pauseExecution = function() {
    }, r.unstable_requestPaint = function() {
    }, r.unstable_runWithPriority = function(V, Z) {
      switch (V) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          V = 3;
      }
      var K = w;
      w = V;
      try {
        return Z();
      } finally {
        w = K;
      }
    }, r.unstable_scheduleCallback = function(V, Z, K) {
      var L = r.unstable_now();
      switch (typeof K == "object" && K !== null ? (K = K.delay, K = typeof K == "number" && 0 < K ? L + K : L) : K = L, V) {
        case 1:
          var M = -1;
          break;
        case 2:
          M = 250;
          break;
        case 5:
          M = 1073741823;
          break;
        case 4:
          M = 1e4;
          break;
        default:
          M = 5e3;
      }
      return M = K + M, V = { id: E++, callback: Z, priorityLevel: V, startTime: K, expirationTime: M, sortIndex: -1 }, K > L ? (V.sortIndex = K, o(v, V), l(g) === null && V === l(v) && (S ? (_(A), A = -1) : S = !0, U(x, K - L))) : (V.sortIndex = M, o(g, V), k || N || (k = !0, $(R))), V;
    }, r.unstable_shouldYield = W, r.unstable_wrapCallback = function(V) {
      var Z = w;
      return function() {
        var K = w;
        w = Z;
        try {
          return V.apply(this, arguments);
        } finally {
          w = K;
        }
      };
    };
  })(tu)), tu;
}
var sp;
function Ey() {
  return sp || (sp = 1, eu.exports = by()), eu.exports;
}
var up;
function Sy() {
  if (up) return ln;
  up = 1;
  var r = Lu(), o = Ey();
  function l(e) {
    for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
    return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  var u = /* @__PURE__ */ new Set(), d = {};
  function f(e, t) {
    p(e, t), p(e + "Capture", t);
  }
  function p(e, t) {
    for (d[e] = t, e = 0; e < t.length; e++) u.add(t[e]);
  }
  var m = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), g = Object.prototype.hasOwnProperty, v = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, E = {}, C = {};
  function w(e) {
    return g.call(C, e) ? !0 : g.call(E, e) ? !1 : v.test(e) ? C[e] = !0 : (E[e] = !0, !1);
  }
  function N(e, t, n, a) {
    if (n !== null && n.type === 0) return !1;
    switch (typeof t) {
      case "function":
      case "symbol":
        return !0;
      case "boolean":
        return a ? !1 : n !== null ? !n.acceptsBooleans : (e = e.toLowerCase().slice(0, 5), e !== "data-" && e !== "aria-");
      default:
        return !1;
    }
  }
  function k(e, t, n, a) {
    if (t === null || typeof t > "u" || N(e, t, n, a)) return !0;
    if (a) return !1;
    if (n !== null) switch (n.type) {
      case 3:
        return !t;
      case 4:
        return t === !1;
      case 5:
        return isNaN(t);
      case 6:
        return isNaN(t) || 1 > t;
    }
    return !1;
  }
  function S(e, t, n, a, s, c, h) {
    this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = a, this.attributeNamespace = s, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = c, this.removeEmptyString = h;
  }
  var b = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
    b[e] = new S(e, 0, !1, e, null, !1, !1);
  }), [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
    var t = e[0];
    b[t] = new S(t, 1, !1, e[1], null, !1, !1);
  }), ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
    b[e] = new S(e, 2, !1, e.toLowerCase(), null, !1, !1);
  }), ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
    b[e] = new S(e, 2, !1, e, null, !1, !1);
  }), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
    b[e] = new S(e, 3, !1, e.toLowerCase(), null, !1, !1);
  }), ["checked", "multiple", "muted", "selected"].forEach(function(e) {
    b[e] = new S(e, 3, !0, e, null, !1, !1);
  }), ["capture", "download"].forEach(function(e) {
    b[e] = new S(e, 4, !1, e, null, !1, !1);
  }), ["cols", "rows", "size", "span"].forEach(function(e) {
    b[e] = new S(e, 6, !1, e, null, !1, !1);
  }), ["rowSpan", "start"].forEach(function(e) {
    b[e] = new S(e, 5, !1, e.toLowerCase(), null, !1, !1);
  });
  var _ = /[\-:]([a-z])/g;
  function I(e) {
    return e[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
    var t = e.replace(
      _,
      I
    );
    b[t] = new S(t, 1, !1, e, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
    var t = e.replace(_, I);
    b[t] = new S(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
    var t = e.replace(_, I);
    b[t] = new S(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(e) {
    b[e] = new S(e, 1, !1, e.toLowerCase(), null, !1, !1);
  }), b.xlinkHref = new S("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(e) {
    b[e] = new S(e, 1, !1, e.toLowerCase(), null, !0, !0);
  });
  function D(e, t, n, a) {
    var s = b.hasOwnProperty(t) ? b[t] : null;
    (s !== null ? s.type !== 0 : a || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (k(t, n, s, a) && (n = null), a || s === null ? w(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : s.mustUseProperty ? e[s.propertyName] = n === null ? s.type === 3 ? !1 : "" : n : (t = s.attributeName, a = s.attributeNamespace, n === null ? e.removeAttribute(t) : (s = s.type, n = s === 3 || s === 4 && n === !0 ? "" : "" + n, a ? e.setAttributeNS(a, t, n) : e.setAttribute(t, n))));
  }
  var x = r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, R = /* @__PURE__ */ Symbol.for("react.element"), P = /* @__PURE__ */ Symbol.for("react.portal"), O = /* @__PURE__ */ Symbol.for("react.fragment"), A = /* @__PURE__ */ Symbol.for("react.strict_mode"), Q = /* @__PURE__ */ Symbol.for("react.profiler"), F = /* @__PURE__ */ Symbol.for("react.provider"), W = /* @__PURE__ */ Symbol.for("react.context"), q = /* @__PURE__ */ Symbol.for("react.forward_ref"), H = /* @__PURE__ */ Symbol.for("react.suspense"), ee = /* @__PURE__ */ Symbol.for("react.suspense_list"), j = /* @__PURE__ */ Symbol.for("react.memo"), $ = /* @__PURE__ */ Symbol.for("react.lazy"), U = /* @__PURE__ */ Symbol.for("react.offscreen"), V = Symbol.iterator;
  function Z(e) {
    return e === null || typeof e != "object" ? null : (e = V && e[V] || e["@@iterator"], typeof e == "function" ? e : null);
  }
  var K = Object.assign, L;
  function M(e) {
    if (L === void 0) try {
      throw Error();
    } catch (n) {
      var t = n.stack.trim().match(/\n( *(at )?)/);
      L = t && t[1] || "";
    }
    return `
` + L + e;
  }
  var ne = !1;
  function te(e, t) {
    if (!e || ne) return "";
    ne = !0;
    var n = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      if (t) if (t = function() {
        throw Error();
      }, Object.defineProperty(t.prototype, "props", { set: function() {
        throw Error();
      } }), typeof Reflect == "object" && Reflect.construct) {
        try {
          Reflect.construct(t, []);
        } catch (J) {
          var a = J;
        }
        Reflect.construct(e, [], t);
      } else {
        try {
          t.call();
        } catch (J) {
          a = J;
        }
        e.call(t.prototype);
      }
      else {
        try {
          throw Error();
        } catch (J) {
          a = J;
        }
        e();
      }
    } catch (J) {
      if (J && a && typeof J.stack == "string") {
        for (var s = J.stack.split(`
`), c = a.stack.split(`
`), h = s.length - 1, T = c.length - 1; 1 <= h && 0 <= T && s[h] !== c[T]; ) T--;
        for (; 1 <= h && 0 <= T; h--, T--) if (s[h] !== c[T]) {
          if (h !== 1 || T !== 1)
            do
              if (h--, T--, 0 > T || s[h] !== c[T]) {
                var z = `
` + s[h].replace(" at new ", " at ");
                return e.displayName && z.includes("<anonymous>") && (z = z.replace("<anonymous>", e.displayName)), z;
              }
            while (1 <= h && 0 <= T);
          break;
        }
      }
    } finally {
      ne = !1, Error.prepareStackTrace = n;
    }
    return (e = e ? e.displayName || e.name : "") ? M(e) : "";
  }
  function ce(e) {
    switch (e.tag) {
      case 5:
        return M(e.type);
      case 16:
        return M("Lazy");
      case 13:
        return M("Suspense");
      case 19:
        return M("SuspenseList");
      case 0:
      case 2:
      case 15:
        return e = te(e.type, !1), e;
      case 11:
        return e = te(e.type.render, !1), e;
      case 1:
        return e = te(e.type, !0), e;
      default:
        return "";
    }
  }
  function Y(e) {
    if (e == null) return null;
    if (typeof e == "function") return e.displayName || e.name || null;
    if (typeof e == "string") return e;
    switch (e) {
      case O:
        return "Fragment";
      case P:
        return "Portal";
      case Q:
        return "Profiler";
      case A:
        return "StrictMode";
      case H:
        return "Suspense";
      case ee:
        return "SuspenseList";
    }
    if (typeof e == "object") switch (e.$$typeof) {
      case W:
        return (e.displayName || "Context") + ".Consumer";
      case F:
        return (e._context.displayName || "Context") + ".Provider";
      case q:
        var t = e.render;
        return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
      case j:
        return t = e.displayName || null, t !== null ? t : Y(e.type) || "Memo";
      case $:
        t = e._payload, e = e._init;
        try {
          return Y(e(t));
        } catch {
        }
    }
    return null;
  }
  function ae(e) {
    var t = e.type;
    switch (e.tag) {
      case 24:
        return "Cache";
      case 9:
        return (t.displayName || "Context") + ".Consumer";
      case 10:
        return (t._context.displayName || "Context") + ".Provider";
      case 18:
        return "DehydratedFragment";
      case 11:
        return e = t.render, e = e.displayName || e.name || "", t.displayName || (e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef");
      case 7:
        return "Fragment";
      case 5:
        return t;
      case 4:
        return "Portal";
      case 3:
        return "Root";
      case 6:
        return "Text";
      case 16:
        return Y(t);
      case 8:
        return t === A ? "StrictMode" : "Mode";
      case 22:
        return "Offscreen";
      case 12:
        return "Profiler";
      case 21:
        return "Scope";
      case 13:
        return "Suspense";
      case 19:
        return "SuspenseList";
      case 25:
        return "TracingMarker";
      case 1:
      case 0:
      case 17:
      case 2:
      case 14:
      case 15:
        if (typeof t == "function") return t.displayName || t.name || null;
        if (typeof t == "string") return t;
    }
    return null;
  }
  function de(e) {
    switch (typeof e) {
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return e;
      case "object":
        return e;
      default:
        return "";
    }
  }
  function ie(e) {
    var t = e.type;
    return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function ge(e) {
    var t = ie(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), a = "" + e[t];
    if (!e.hasOwnProperty(t) && typeof n < "u" && typeof n.get == "function" && typeof n.set == "function") {
      var s = n.get, c = n.set;
      return Object.defineProperty(e, t, { configurable: !0, get: function() {
        return s.call(this);
      }, set: function(h) {
        a = "" + h, c.call(this, h);
      } }), Object.defineProperty(e, t, { enumerable: n.enumerable }), { getValue: function() {
        return a;
      }, setValue: function(h) {
        a = "" + h;
      }, stopTracking: function() {
        e._valueTracker = null, delete e[t];
      } };
    }
  }
  function se(e) {
    e._valueTracker || (e._valueTracker = ge(e));
  }
  function re(e) {
    if (!e) return !1;
    var t = e._valueTracker;
    if (!t) return !0;
    var n = t.getValue(), a = "";
    return e && (a = ie(e) ? e.checked ? "true" : "false" : e.value), e = a, e !== n ? (t.setValue(e), !0) : !1;
  }
  function ye(e) {
    if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
    try {
      return e.activeElement || e.body;
    } catch {
      return e.body;
    }
  }
  function De(e, t) {
    var n = t.checked;
    return K({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
  }
  function Ue(e, t) {
    var n = t.defaultValue == null ? "" : t.defaultValue, a = t.checked != null ? t.checked : t.defaultChecked;
    n = de(t.value != null ? t.value : n), e._wrapperState = { initialChecked: a, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
  }
  function Ce(e, t) {
    t = t.checked, t != null && D(e, "checked", t, !1);
  }
  function Ae(e, t) {
    Ce(e, t);
    var n = de(t.value), a = t.type;
    if (n != null) a === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
    else if (a === "submit" || a === "reset") {
      e.removeAttribute("value");
      return;
    }
    t.hasOwnProperty("value") ? ue(e, t.type, n) : t.hasOwnProperty("defaultValue") && ue(e, t.type, de(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
  }
  function me(e, t, n) {
    if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
      var a = t.type;
      if (!(a !== "submit" && a !== "reset" || t.value !== void 0 && t.value !== null)) return;
      t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
    }
    n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
  }
  function ue(e, t, n) {
    (t !== "number" || ye(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
  }
  var Me = Array.isArray;
  function Ke(e, t, n, a) {
    if (e = e.options, t) {
      t = {};
      for (var s = 0; s < n.length; s++) t["$" + n[s]] = !0;
      for (n = 0; n < e.length; n++) s = t.hasOwnProperty("$" + e[n].value), e[n].selected !== s && (e[n].selected = s), s && a && (e[n].defaultSelected = !0);
    } else {
      for (n = "" + de(n), t = null, s = 0; s < e.length; s++) {
        if (e[s].value === n) {
          e[s].selected = !0, a && (e[s].defaultSelected = !0);
          return;
        }
        t !== null || e[s].disabled || (t = e[s]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function $e(e, t) {
    if (t.dangerouslySetInnerHTML != null) throw Error(l(91));
    return K({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
  }
  function Ye(e, t) {
    var n = t.value;
    if (n == null) {
      if (n = t.children, t = t.defaultValue, n != null) {
        if (t != null) throw Error(l(92));
        if (Me(n)) {
          if (1 < n.length) throw Error(l(93));
          n = n[0];
        }
        t = n;
      }
      t == null && (t = ""), n = t;
    }
    e._wrapperState = { initialValue: de(n) };
  }
  function st(e, t) {
    var n = de(t.value), a = de(t.defaultValue);
    n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), a != null && (e.defaultValue = "" + a);
  }
  function mt(e) {
    var t = e.textContent;
    t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
  }
  function bt(e) {
    switch (e) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function ht(e, t) {
    return e == null || e === "http://www.w3.org/1999/xhtml" ? bt(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
  }
  var ke, Xe = (function(e) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, a, s) {
      MSApp.execUnsafeLocalFunction(function() {
        return e(t, n, a, s);
      });
    } : e;
  })(function(e, t) {
    if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e) e.innerHTML = t;
    else {
      for (ke = ke || document.createElement("div"), ke.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = ke.firstChild; e.firstChild; ) e.removeChild(e.firstChild);
      for (; t.firstChild; ) e.appendChild(t.firstChild);
    }
  });
  function St(e, t) {
    if (t) {
      var n = e.firstChild;
      if (n && n === e.lastChild && n.nodeType === 3) {
        n.nodeValue = t;
        return;
      }
    }
    e.textContent = t;
  }
  var Mt = {
    animationIterationCount: !0,
    aspectRatio: !0,
    borderImageOutset: !0,
    borderImageSlice: !0,
    borderImageWidth: !0,
    boxFlex: !0,
    boxFlexGroup: !0,
    boxOrdinalGroup: !0,
    columnCount: !0,
    columns: !0,
    flex: !0,
    flexGrow: !0,
    flexPositive: !0,
    flexShrink: !0,
    flexNegative: !0,
    flexOrder: !0,
    gridArea: !0,
    gridRow: !0,
    gridRowEnd: !0,
    gridRowSpan: !0,
    gridRowStart: !0,
    gridColumn: !0,
    gridColumnEnd: !0,
    gridColumnSpan: !0,
    gridColumnStart: !0,
    fontWeight: !0,
    lineClamp: !0,
    lineHeight: !0,
    opacity: !0,
    order: !0,
    orphans: !0,
    tabSize: !0,
    widows: !0,
    zIndex: !0,
    zoom: !0,
    fillOpacity: !0,
    floodOpacity: !0,
    stopOpacity: !0,
    strokeDasharray: !0,
    strokeDashoffset: !0,
    strokeMiterlimit: !0,
    strokeOpacity: !0,
    strokeWidth: !0
  }, Kt = ["Webkit", "ms", "Moz", "O"];
  Object.keys(Mt).forEach(function(e) {
    Kt.forEach(function(t) {
      t = t + e.charAt(0).toUpperCase() + e.substring(1), Mt[t] = Mt[e];
    });
  });
  function he(e, t, n) {
    return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || Mt.hasOwnProperty(e) && Mt[e] ? ("" + t).trim() : t + "px";
  }
  function ot(e, t) {
    e = e.style;
    for (var n in t) if (t.hasOwnProperty(n)) {
      var a = n.indexOf("--") === 0, s = he(n, t[n], a);
      n === "float" && (n = "cssFloat"), a ? e.setProperty(n, s) : e[n] = s;
    }
  }
  var Fe = K({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function nt(e, t) {
    if (t) {
      if (Fe[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(l(137, e));
      if (t.dangerouslySetInnerHTML != null) {
        if (t.children != null) throw Error(l(60));
        if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(l(61));
      }
      if (t.style != null && typeof t.style != "object") throw Error(l(62));
    }
  }
  function wn(e, t) {
    if (e.indexOf("-") === -1) return typeof t.is == "string";
    switch (e) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var Wt = null;
  function zt(e) {
    return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
  }
  var Hn = null, Ot = null, en = null;
  function je(e) {
    if (e = lo(e)) {
      if (typeof Hn != "function") throw Error(l(280));
      var t = e.stateNode;
      t && (t = al(t), Hn(e.stateNode, e.type, t));
    }
  }
  function rt(e) {
    Ot ? en ? en.push(e) : en = [e] : Ot = e;
  }
  function kn() {
    if (Ot) {
      var e = Ot, t = en;
      if (en = Ot = null, je(e), t) for (e = 0; e < t.length; e++) je(t[e]);
    }
  }
  function Be(e, t) {
    return e(t);
  }
  function dt() {
  }
  var Yt = !1;
  function Le(e, t, n) {
    if (Yt) return e(t, n);
    Yt = !0;
    try {
      return Be(e, t, n);
    } finally {
      Yt = !1, (Ot !== null || en !== null) && (dt(), kn());
    }
  }
  function at(e, t) {
    var n = e.stateNode;
    if (n === null) return null;
    var a = al(n);
    if (a === null) return null;
    n = a[t];
    e: switch (t) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (a = !a.disabled) || (e = e.type, a = !(e === "button" || e === "input" || e === "select" || e === "textarea")), e = !a;
        break e;
      default:
        e = !1;
    }
    if (e) return null;
    if (n && typeof n != "function") throw Error(l(231, t, typeof n));
    return n;
  }
  var xt = !1;
  if (m) try {
    var It = {};
    Object.defineProperty(It, "passive", { get: function() {
      xt = !0;
    } }), window.addEventListener("test", It, It), window.removeEventListener("test", It, It);
  } catch {
    xt = !1;
  }
  function ir(e, t, n, a, s, c, h, T, z) {
    var J = Array.prototype.slice.call(arguments, 3);
    try {
      t.apply(n, J);
    } catch (le) {
      this.onError(le);
    }
  }
  var Fr = !1, xn = null, qn = !1, sr = null, mi = { onError: function(e) {
    Fr = !0, xn = e;
  } };
  function hi(e, t, n, a, s, c, h, T, z) {
    Fr = !1, xn = null, ir.apply(mi, arguments);
  }
  function yi(e, t, n, a, s, c, h, T, z) {
    if (hi.apply(this, arguments), Fr) {
      if (Fr) {
        var J = xn;
        Fr = !1, xn = null;
      } else throw Error(l(198));
      qn || (qn = !0, sr = J);
    }
  }
  function ve(e) {
    var t = e, n = e;
    if (e.alternate) for (; t.return; ) t = t.return;
    else {
      e = t;
      do
        t = e, (t.flags & 4098) !== 0 && (n = t.return), e = t.return;
      while (e);
    }
    return t.tag === 3 ? n : null;
  }
  function Ct(e) {
    if (e.tag === 13) {
      var t = e.memoizedState;
      if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function Vt(e) {
    if (ve(e) !== e) throw Error(l(188));
  }
  function An(e) {
    var t = e.alternate;
    if (!t) {
      if (t = ve(e), t === null) throw Error(l(188));
      return t !== e ? null : e;
    }
    for (var n = e, a = t; ; ) {
      var s = n.return;
      if (s === null) break;
      var c = s.alternate;
      if (c === null) {
        if (a = s.return, a !== null) {
          n = a;
          continue;
        }
        break;
      }
      if (s.child === c.child) {
        for (c = s.child; c; ) {
          if (c === n) return Vt(s), e;
          if (c === a) return Vt(s), t;
          c = c.sibling;
        }
        throw Error(l(188));
      }
      if (n.return !== a.return) n = s, a = c;
      else {
        for (var h = !1, T = s.child; T; ) {
          if (T === n) {
            h = !0, n = s, a = c;
            break;
          }
          if (T === a) {
            h = !0, a = s, n = c;
            break;
          }
          T = T.sibling;
        }
        if (!h) {
          for (T = c.child; T; ) {
            if (T === n) {
              h = !0, n = c, a = s;
              break;
            }
            if (T === a) {
              h = !0, a = c, n = s;
              break;
            }
            T = T.sibling;
          }
          if (!h) throw Error(l(189));
        }
      }
      if (n.alternate !== a) throw Error(l(190));
    }
    if (n.tag !== 3) throw Error(l(188));
    return n.stateNode.current === n ? e : t;
  }
  function gi(e) {
    return e = An(e), e !== null ? aa(e) : null;
  }
  function aa(e) {
    if (e.tag === 5 || e.tag === 6) return e;
    for (e = e.child; e !== null; ) {
      var t = aa(e);
      if (t !== null) return t;
      e = e.sibling;
    }
    return null;
  }
  var Nc = o.unstable_scheduleCallback, Tc = o.unstable_cancelCallback, _m = o.unstable_shouldYield, Lm = o.unstable_requestPaint, wt = o.unstable_now, Rm = o.unstable_getCurrentPriorityLevel, vi = o.unstable_ImmediatePriority, Pc = o.unstable_UserBlockingPriority, Vo = o.unstable_NormalPriority, Nm = o.unstable_LowPriority, Ac = o.unstable_IdlePriority, Bo = null, Mn = null;
  function Tm(e) {
    if (Mn && typeof Mn.onCommitFiberRoot == "function") try {
      Mn.onCommitFiberRoot(Bo, e, void 0, (e.current.flags & 128) === 128);
    } catch {
    }
  }
  var In = Math.clz32 ? Math.clz32 : Mm, Pm = Math.log, Am = Math.LN2;
  function Mm(e) {
    return e >>>= 0, e === 0 ? 32 : 31 - (Pm(e) / Am | 0) | 0;
  }
  var Fo = 64, Uo = 4194304;
  function Ka(e) {
    switch (e & -e) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return e & 4194240;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return e & 130023424;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 1073741824;
      default:
        return e;
    }
  }
  function Ko(e, t) {
    var n = e.pendingLanes;
    if (n === 0) return 0;
    var a = 0, s = e.suspendedLanes, c = e.pingedLanes, h = n & 268435455;
    if (h !== 0) {
      var T = h & ~s;
      T !== 0 ? a = Ka(T) : (c &= h, c !== 0 && (a = Ka(c)));
    } else h = n & ~s, h !== 0 ? a = Ka(h) : c !== 0 && (a = Ka(c));
    if (a === 0) return 0;
    if (t !== 0 && t !== a && (t & s) === 0 && (s = a & -a, c = t & -t, s >= c || s === 16 && (c & 4194240) !== 0)) return t;
    if ((a & 4) !== 0 && (a |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= a; 0 < t; ) n = 31 - In(t), s = 1 << n, a |= e[n], t &= ~s;
    return a;
  }
  function zm(e, t) {
    switch (e) {
      case 1:
      case 2:
      case 4:
        return t + 250;
      case 8:
      case 16:
      case 32:
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return -1;
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function Om(e, t) {
    for (var n = e.suspendedLanes, a = e.pingedLanes, s = e.expirationTimes, c = e.pendingLanes; 0 < c; ) {
      var h = 31 - In(c), T = 1 << h, z = s[h];
      z === -1 ? ((T & n) === 0 || (T & a) !== 0) && (s[h] = zm(T, t)) : z <= t && (e.expiredLanes |= T), c &= ~T;
    }
  }
  function bi(e) {
    return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
  }
  function Mc() {
    var e = Fo;
    return Fo <<= 1, (Fo & 4194240) === 0 && (Fo = 64), e;
  }
  function Ei(e) {
    for (var t = [], n = 0; 31 > n; n++) t.push(e);
    return t;
  }
  function ja(e, t, n) {
    e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - In(t), e[t] = n;
  }
  function Vm(e, t) {
    var n = e.pendingLanes & ~t;
    e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
    var a = e.eventTimes;
    for (e = e.expirationTimes; 0 < n; ) {
      var s = 31 - In(n), c = 1 << s;
      t[s] = 0, a[s] = -1, e[s] = -1, n &= ~c;
    }
  }
  function Si(e, t) {
    var n = e.entangledLanes |= t;
    for (e = e.entanglements; n; ) {
      var a = 31 - In(n), s = 1 << a;
      s & t | e[a] & t && (e[a] |= t), n &= ~s;
    }
  }
  var et = 0;
  function zc(e) {
    return e &= -e, 1 < e ? 4 < e ? (e & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var Oc, Ci, Vc, Bc, Fc, wi = !1, jo = [], ur = null, cr = null, dr = null, $a = /* @__PURE__ */ new Map(), Ha = /* @__PURE__ */ new Map(), fr = [], Bm = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function Uc(e, t) {
    switch (e) {
      case "focusin":
      case "focusout":
        ur = null;
        break;
      case "dragenter":
      case "dragleave":
        cr = null;
        break;
      case "mouseover":
      case "mouseout":
        dr = null;
        break;
      case "pointerover":
      case "pointerout":
        $a.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Ha.delete(t.pointerId);
    }
  }
  function qa(e, t, n, a, s, c) {
    return e === null || e.nativeEvent !== c ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: a, nativeEvent: c, targetContainers: [s] }, t !== null && (t = lo(t), t !== null && Ci(t)), e) : (e.eventSystemFlags |= a, t = e.targetContainers, s !== null && t.indexOf(s) === -1 && t.push(s), e);
  }
  function Fm(e, t, n, a, s) {
    switch (t) {
      case "focusin":
        return ur = qa(ur, e, t, n, a, s), !0;
      case "dragenter":
        return cr = qa(cr, e, t, n, a, s), !0;
      case "mouseover":
        return dr = qa(dr, e, t, n, a, s), !0;
      case "pointerover":
        var c = s.pointerId;
        return $a.set(c, qa($a.get(c) || null, e, t, n, a, s)), !0;
      case "gotpointercapture":
        return c = s.pointerId, Ha.set(c, qa(Ha.get(c) || null, e, t, n, a, s)), !0;
    }
    return !1;
  }
  function Kc(e) {
    var t = Ur(e.target);
    if (t !== null) {
      var n = ve(t);
      if (n !== null) {
        if (t = n.tag, t === 13) {
          if (t = Ct(n), t !== null) {
            e.blockedOn = t, Fc(e.priority, function() {
              Vc(n);
            });
            return;
          }
        } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
          e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
          return;
        }
      }
    }
    e.blockedOn = null;
  }
  function $o(e) {
    if (e.blockedOn !== null) return !1;
    for (var t = e.targetContainers; 0 < t.length; ) {
      var n = xi(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
      if (n === null) {
        n = e.nativeEvent;
        var a = new n.constructor(n.type, n);
        Wt = a, n.target.dispatchEvent(a), Wt = null;
      } else return t = lo(n), t !== null && Ci(t), e.blockedOn = n, !1;
      t.shift();
    }
    return !0;
  }
  function jc(e, t, n) {
    $o(e) && n.delete(t);
  }
  function Um() {
    wi = !1, ur !== null && $o(ur) && (ur = null), cr !== null && $o(cr) && (cr = null), dr !== null && $o(dr) && (dr = null), $a.forEach(jc), Ha.forEach(jc);
  }
  function Qa(e, t) {
    e.blockedOn === t && (e.blockedOn = null, wi || (wi = !0, o.unstable_scheduleCallback(o.unstable_NormalPriority, Um)));
  }
  function Wa(e) {
    function t(s) {
      return Qa(s, e);
    }
    if (0 < jo.length) {
      Qa(jo[0], e);
      for (var n = 1; n < jo.length; n++) {
        var a = jo[n];
        a.blockedOn === e && (a.blockedOn = null);
      }
    }
    for (ur !== null && Qa(ur, e), cr !== null && Qa(cr, e), dr !== null && Qa(dr, e), $a.forEach(t), Ha.forEach(t), n = 0; n < fr.length; n++) a = fr[n], a.blockedOn === e && (a.blockedOn = null);
    for (; 0 < fr.length && (n = fr[0], n.blockedOn === null); ) Kc(n), n.blockedOn === null && fr.shift();
  }
  var oa = x.ReactCurrentBatchConfig, Ho = !0;
  function Km(e, t, n, a) {
    var s = et, c = oa.transition;
    oa.transition = null;
    try {
      et = 1, ki(e, t, n, a);
    } finally {
      et = s, oa.transition = c;
    }
  }
  function jm(e, t, n, a) {
    var s = et, c = oa.transition;
    oa.transition = null;
    try {
      et = 4, ki(e, t, n, a);
    } finally {
      et = s, oa.transition = c;
    }
  }
  function ki(e, t, n, a) {
    if (Ho) {
      var s = xi(e, t, n, a);
      if (s === null) Ki(e, t, a, qo, n), Uc(e, a);
      else if (Fm(s, e, t, n, a)) a.stopPropagation();
      else if (Uc(e, a), t & 4 && -1 < Bm.indexOf(e)) {
        for (; s !== null; ) {
          var c = lo(s);
          if (c !== null && Oc(c), c = xi(e, t, n, a), c === null && Ki(e, t, a, qo, n), c === s) break;
          s = c;
        }
        s !== null && a.stopPropagation();
      } else Ki(e, t, a, null, n);
    }
  }
  var qo = null;
  function xi(e, t, n, a) {
    if (qo = null, e = zt(a), e = Ur(e), e !== null) if (t = ve(e), t === null) e = null;
    else if (n = t.tag, n === 13) {
      if (e = Ct(t), e !== null) return e;
      e = null;
    } else if (n === 3) {
      if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
      e = null;
    } else t !== e && (e = null);
    return qo = e, null;
  }
  function $c(e) {
    switch (e) {
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 1;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "toggle":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 4;
      case "message":
        switch (Rm()) {
          case vi:
            return 1;
          case Pc:
            return 4;
          case Vo:
          case Nm:
            return 16;
          case Ac:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var pr = null, Ii = null, Qo = null;
  function Hc() {
    if (Qo) return Qo;
    var e, t = Ii, n = t.length, a, s = "value" in pr ? pr.value : pr.textContent, c = s.length;
    for (e = 0; e < n && t[e] === s[e]; e++) ;
    var h = n - e;
    for (a = 1; a <= h && t[n - a] === s[c - a]; a++) ;
    return Qo = s.slice(e, 1 < a ? 1 - a : void 0);
  }
  function Wo(e) {
    var t = e.keyCode;
    return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
  }
  function Yo() {
    return !0;
  }
  function qc() {
    return !1;
  }
  function cn(e) {
    function t(n, a, s, c, h) {
      this._reactName = n, this._targetInst = s, this.type = a, this.nativeEvent = c, this.target = h, this.currentTarget = null;
      for (var T in e) e.hasOwnProperty(T) && (n = e[T], this[T] = n ? n(c) : c[T]);
      return this.isDefaultPrevented = (c.defaultPrevented != null ? c.defaultPrevented : c.returnValue === !1) ? Yo : qc, this.isPropagationStopped = qc, this;
    }
    return K(t.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var n = this.nativeEvent;
      n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1), this.isDefaultPrevented = Yo);
    }, stopPropagation: function() {
      var n = this.nativeEvent;
      n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0), this.isPropagationStopped = Yo);
    }, persist: function() {
    }, isPersistent: Yo }), t;
  }
  var la = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(e) {
    return e.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, Di = cn(la), Ya = K({}, la, { view: 0, detail: 0 }), $m = cn(Ya), _i, Li, Ga, Go = K({}, Ya, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: Ni, button: 0, buttons: 0, relatedTarget: function(e) {
    return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
  }, movementX: function(e) {
    return "movementX" in e ? e.movementX : (e !== Ga && (Ga && e.type === "mousemove" ? (_i = e.screenX - Ga.screenX, Li = e.screenY - Ga.screenY) : Li = _i = 0, Ga = e), _i);
  }, movementY: function(e) {
    return "movementY" in e ? e.movementY : Li;
  } }), Qc = cn(Go), Hm = K({}, Go, { dataTransfer: 0 }), qm = cn(Hm), Qm = K({}, Ya, { relatedTarget: 0 }), Ri = cn(Qm), Wm = K({}, la, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Ym = cn(Wm), Gm = K({}, la, { clipboardData: function(e) {
    return "clipboardData" in e ? e.clipboardData : window.clipboardData;
  } }), Xm = cn(Gm), Zm = K({}, la, { data: 0 }), Wc = cn(Zm), Jm = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, eh = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, th = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function nh(e) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(e) : (e = th[e]) ? !!t[e] : !1;
  }
  function Ni() {
    return nh;
  }
  var rh = K({}, Ya, { key: function(e) {
    if (e.key) {
      var t = Jm[e.key] || e.key;
      if (t !== "Unidentified") return t;
    }
    return e.type === "keypress" ? (e = Wo(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? eh[e.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: Ni, charCode: function(e) {
    return e.type === "keypress" ? Wo(e) : 0;
  }, keyCode: function(e) {
    return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
  }, which: function(e) {
    return e.type === "keypress" ? Wo(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
  } }), ah = cn(rh), oh = K({}, Go, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Yc = cn(oh), lh = K({}, Ya, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: Ni }), ih = cn(lh), sh = K({}, la, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), uh = cn(sh), ch = K({}, Go, {
    deltaX: function(e) {
      return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
    },
    deltaY: function(e) {
      return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), dh = cn(ch), fh = [9, 13, 27, 32], Ti = m && "CompositionEvent" in window, Xa = null;
  m && "documentMode" in document && (Xa = document.documentMode);
  var ph = m && "TextEvent" in window && !Xa, Gc = m && (!Ti || Xa && 8 < Xa && 11 >= Xa), Xc = " ", Zc = !1;
  function Jc(e, t) {
    switch (e) {
      case "keyup":
        return fh.indexOf(t.keyCode) !== -1;
      case "keydown":
        return t.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function ed(e) {
    return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
  }
  var ia = !1;
  function mh(e, t) {
    switch (e) {
      case "compositionend":
        return ed(t);
      case "keypress":
        return t.which !== 32 ? null : (Zc = !0, Xc);
      case "textInput":
        return e = t.data, e === Xc && Zc ? null : e;
      default:
        return null;
    }
  }
  function hh(e, t) {
    if (ia) return e === "compositionend" || !Ti && Jc(e, t) ? (e = Hc(), Qo = Ii = pr = null, ia = !1, e) : null;
    switch (e) {
      case "paste":
        return null;
      case "keypress":
        if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
          if (t.char && 1 < t.char.length) return t.char;
          if (t.which) return String.fromCharCode(t.which);
        }
        return null;
      case "compositionend":
        return Gc && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var yh = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function td(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t === "input" ? !!yh[e.type] : t === "textarea";
  }
  function nd(e, t, n, a) {
    rt(a), t = tl(t, "onChange"), 0 < t.length && (n = new Di("onChange", "change", null, n, a), e.push({ event: n, listeners: t }));
  }
  var Za = null, Ja = null;
  function gh(e) {
    Ed(e, 0);
  }
  function Xo(e) {
    var t = fa(e);
    if (re(t)) return e;
  }
  function vh(e, t) {
    if (e === "change") return t;
  }
  var rd = !1;
  if (m) {
    var Pi;
    if (m) {
      var Ai = "oninput" in document;
      if (!Ai) {
        var ad = document.createElement("div");
        ad.setAttribute("oninput", "return;"), Ai = typeof ad.oninput == "function";
      }
      Pi = Ai;
    } else Pi = !1;
    rd = Pi && (!document.documentMode || 9 < document.documentMode);
  }
  function od() {
    Za && (Za.detachEvent("onpropertychange", ld), Ja = Za = null);
  }
  function ld(e) {
    if (e.propertyName === "value" && Xo(Ja)) {
      var t = [];
      nd(t, Ja, e, zt(e)), Le(gh, t);
    }
  }
  function bh(e, t, n) {
    e === "focusin" ? (od(), Za = t, Ja = n, Za.attachEvent("onpropertychange", ld)) : e === "focusout" && od();
  }
  function Eh(e) {
    if (e === "selectionchange" || e === "keyup" || e === "keydown") return Xo(Ja);
  }
  function Sh(e, t) {
    if (e === "click") return Xo(t);
  }
  function Ch(e, t) {
    if (e === "input" || e === "change") return Xo(t);
  }
  function wh(e, t) {
    return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
  }
  var Dn = typeof Object.is == "function" ? Object.is : wh;
  function eo(e, t) {
    if (Dn(e, t)) return !0;
    if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
    var n = Object.keys(e), a = Object.keys(t);
    if (n.length !== a.length) return !1;
    for (a = 0; a < n.length; a++) {
      var s = n[a];
      if (!g.call(t, s) || !Dn(e[s], t[s])) return !1;
    }
    return !0;
  }
  function id(e) {
    for (; e && e.firstChild; ) e = e.firstChild;
    return e;
  }
  function sd(e, t) {
    var n = id(e);
    e = 0;
    for (var a; n; ) {
      if (n.nodeType === 3) {
        if (a = e + n.textContent.length, e <= t && a >= t) return { node: n, offset: t - e };
        e = a;
      }
      e: {
        for (; n; ) {
          if (n.nextSibling) {
            n = n.nextSibling;
            break e;
          }
          n = n.parentNode;
        }
        n = void 0;
      }
      n = id(n);
    }
  }
  function ud(e, t) {
    return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? ud(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function cd() {
    for (var e = window, t = ye(); t instanceof e.HTMLIFrameElement; ) {
      try {
        var n = typeof t.contentWindow.location.href == "string";
      } catch {
        n = !1;
      }
      if (n) e = t.contentWindow;
      else break;
      t = ye(e.document);
    }
    return t;
  }
  function Mi(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
  }
  function kh(e) {
    var t = cd(), n = e.focusedElem, a = e.selectionRange;
    if (t !== n && n && n.ownerDocument && ud(n.ownerDocument.documentElement, n)) {
      if (a !== null && Mi(n)) {
        if (t = a.start, e = a.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
        else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
          e = e.getSelection();
          var s = n.textContent.length, c = Math.min(a.start, s);
          a = a.end === void 0 ? c : Math.min(a.end, s), !e.extend && c > a && (s = a, a = c, c = s), s = sd(n, c);
          var h = sd(
            n,
            a
          );
          s && h && (e.rangeCount !== 1 || e.anchorNode !== s.node || e.anchorOffset !== s.offset || e.focusNode !== h.node || e.focusOffset !== h.offset) && (t = t.createRange(), t.setStart(s.node, s.offset), e.removeAllRanges(), c > a ? (e.addRange(t), e.extend(h.node, h.offset)) : (t.setEnd(h.node, h.offset), e.addRange(t)));
        }
      }
      for (t = [], e = n; e = e.parentNode; ) e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
      for (typeof n.focus == "function" && n.focus(), n = 0; n < t.length; n++) e = t[n], e.element.scrollLeft = e.left, e.element.scrollTop = e.top;
    }
  }
  var xh = m && "documentMode" in document && 11 >= document.documentMode, sa = null, zi = null, to = null, Oi = !1;
  function dd(e, t, n) {
    var a = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
    Oi || sa == null || sa !== ye(a) || (a = sa, "selectionStart" in a && Mi(a) ? a = { start: a.selectionStart, end: a.selectionEnd } : (a = (a.ownerDocument && a.ownerDocument.defaultView || window).getSelection(), a = { anchorNode: a.anchorNode, anchorOffset: a.anchorOffset, focusNode: a.focusNode, focusOffset: a.focusOffset }), to && eo(to, a) || (to = a, a = tl(zi, "onSelect"), 0 < a.length && (t = new Di("onSelect", "select", null, t, n), e.push({ event: t, listeners: a }), t.target = sa)));
  }
  function Zo(e, t) {
    var n = {};
    return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
  }
  var ua = { animationend: Zo("Animation", "AnimationEnd"), animationiteration: Zo("Animation", "AnimationIteration"), animationstart: Zo("Animation", "AnimationStart"), transitionend: Zo("Transition", "TransitionEnd") }, Vi = {}, fd = {};
  m && (fd = document.createElement("div").style, "AnimationEvent" in window || (delete ua.animationend.animation, delete ua.animationiteration.animation, delete ua.animationstart.animation), "TransitionEvent" in window || delete ua.transitionend.transition);
  function Jo(e) {
    if (Vi[e]) return Vi[e];
    if (!ua[e]) return e;
    var t = ua[e], n;
    for (n in t) if (t.hasOwnProperty(n) && n in fd) return Vi[e] = t[n];
    return e;
  }
  var pd = Jo("animationend"), md = Jo("animationiteration"), hd = Jo("animationstart"), yd = Jo("transitionend"), gd = /* @__PURE__ */ new Map(), vd = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function mr(e, t) {
    gd.set(e, t), f(t, [e]);
  }
  for (var Bi = 0; Bi < vd.length; Bi++) {
    var Fi = vd[Bi], Ih = Fi.toLowerCase(), Dh = Fi[0].toUpperCase() + Fi.slice(1);
    mr(Ih, "on" + Dh);
  }
  mr(pd, "onAnimationEnd"), mr(md, "onAnimationIteration"), mr(hd, "onAnimationStart"), mr("dblclick", "onDoubleClick"), mr("focusin", "onFocus"), mr("focusout", "onBlur"), mr(yd, "onTransitionEnd"), p("onMouseEnter", ["mouseout", "mouseover"]), p("onMouseLeave", ["mouseout", "mouseover"]), p("onPointerEnter", ["pointerout", "pointerover"]), p("onPointerLeave", ["pointerout", "pointerover"]), f("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), f("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), f("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), f("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), f("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), f("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var no = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), _h = new Set("cancel close invalid load scroll toggle".split(" ").concat(no));
  function bd(e, t, n) {
    var a = e.type || "unknown-event";
    e.currentTarget = n, yi(a, t, void 0, e), e.currentTarget = null;
  }
  function Ed(e, t) {
    t = (t & 4) !== 0;
    for (var n = 0; n < e.length; n++) {
      var a = e[n], s = a.event;
      a = a.listeners;
      e: {
        var c = void 0;
        if (t) for (var h = a.length - 1; 0 <= h; h--) {
          var T = a[h], z = T.instance, J = T.currentTarget;
          if (T = T.listener, z !== c && s.isPropagationStopped()) break e;
          bd(s, T, J), c = z;
        }
        else for (h = 0; h < a.length; h++) {
          if (T = a[h], z = T.instance, J = T.currentTarget, T = T.listener, z !== c && s.isPropagationStopped()) break e;
          bd(s, T, J), c = z;
        }
      }
    }
    if (qn) throw e = sr, qn = !1, sr = null, e;
  }
  function ut(e, t) {
    var n = t[Wi];
    n === void 0 && (n = t[Wi] = /* @__PURE__ */ new Set());
    var a = e + "__bubble";
    n.has(a) || (Sd(t, e, 2, !1), n.add(a));
  }
  function Ui(e, t, n) {
    var a = 0;
    t && (a |= 4), Sd(n, e, a, t);
  }
  var el = "_reactListening" + Math.random().toString(36).slice(2);
  function ro(e) {
    if (!e[el]) {
      e[el] = !0, u.forEach(function(n) {
        n !== "selectionchange" && (_h.has(n) || Ui(n, !1, e), Ui(n, !0, e));
      });
      var t = e.nodeType === 9 ? e : e.ownerDocument;
      t === null || t[el] || (t[el] = !0, Ui("selectionchange", !1, t));
    }
  }
  function Sd(e, t, n, a) {
    switch ($c(t)) {
      case 1:
        var s = Km;
        break;
      case 4:
        s = jm;
        break;
      default:
        s = ki;
    }
    n = s.bind(null, t, n, e), s = void 0, !xt || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (s = !0), a ? s !== void 0 ? e.addEventListener(t, n, { capture: !0, passive: s }) : e.addEventListener(t, n, !0) : s !== void 0 ? e.addEventListener(t, n, { passive: s }) : e.addEventListener(t, n, !1);
  }
  function Ki(e, t, n, a, s) {
    var c = a;
    if ((t & 1) === 0 && (t & 2) === 0 && a !== null) e: for (; ; ) {
      if (a === null) return;
      var h = a.tag;
      if (h === 3 || h === 4) {
        var T = a.stateNode.containerInfo;
        if (T === s || T.nodeType === 8 && T.parentNode === s) break;
        if (h === 4) for (h = a.return; h !== null; ) {
          var z = h.tag;
          if ((z === 3 || z === 4) && (z = h.stateNode.containerInfo, z === s || z.nodeType === 8 && z.parentNode === s)) return;
          h = h.return;
        }
        for (; T !== null; ) {
          if (h = Ur(T), h === null) return;
          if (z = h.tag, z === 5 || z === 6) {
            a = c = h;
            continue e;
          }
          T = T.parentNode;
        }
      }
      a = a.return;
    }
    Le(function() {
      var J = c, le = zt(n), fe = [];
      e: {
        var oe = gd.get(e);
        if (oe !== void 0) {
          var be = Di, Se = e;
          switch (e) {
            case "keypress":
              if (Wo(n) === 0) break e;
            case "keydown":
            case "keyup":
              be = ah;
              break;
            case "focusin":
              Se = "focus", be = Ri;
              break;
            case "focusout":
              Se = "blur", be = Ri;
              break;
            case "beforeblur":
            case "afterblur":
              be = Ri;
              break;
            case "click":
              if (n.button === 2) break e;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              be = Qc;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              be = qm;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              be = ih;
              break;
            case pd:
            case md:
            case hd:
              be = Ym;
              break;
            case yd:
              be = uh;
              break;
            case "scroll":
              be = $m;
              break;
            case "wheel":
              be = dh;
              break;
            case "copy":
            case "cut":
            case "paste":
              be = Xm;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              be = Yc;
          }
          var we = (t & 4) !== 0, kt = !we && e === "scroll", G = we ? oe !== null ? oe + "Capture" : null : oe;
          we = [];
          for (var B = J, X; B !== null; ) {
            X = B;
            var pe = X.stateNode;
            if (X.tag === 5 && pe !== null && (X = pe, G !== null && (pe = at(B, G), pe != null && we.push(ao(B, pe, X)))), kt) break;
            B = B.return;
          }
          0 < we.length && (oe = new be(oe, Se, null, n, le), fe.push({ event: oe, listeners: we }));
        }
      }
      if ((t & 7) === 0) {
        e: {
          if (oe = e === "mouseover" || e === "pointerover", be = e === "mouseout" || e === "pointerout", oe && n !== Wt && (Se = n.relatedTarget || n.fromElement) && (Ur(Se) || Se[Qn])) break e;
          if ((be || oe) && (oe = le.window === le ? le : (oe = le.ownerDocument) ? oe.defaultView || oe.parentWindow : window, be ? (Se = n.relatedTarget || n.toElement, be = J, Se = Se ? Ur(Se) : null, Se !== null && (kt = ve(Se), Se !== kt || Se.tag !== 5 && Se.tag !== 6) && (Se = null)) : (be = null, Se = J), be !== Se)) {
            if (we = Qc, pe = "onMouseLeave", G = "onMouseEnter", B = "mouse", (e === "pointerout" || e === "pointerover") && (we = Yc, pe = "onPointerLeave", G = "onPointerEnter", B = "pointer"), kt = be == null ? oe : fa(be), X = Se == null ? oe : fa(Se), oe = new we(pe, B + "leave", be, n, le), oe.target = kt, oe.relatedTarget = X, pe = null, Ur(le) === J && (we = new we(G, B + "enter", Se, n, le), we.target = X, we.relatedTarget = kt, pe = we), kt = pe, be && Se) t: {
              for (we = be, G = Se, B = 0, X = we; X; X = ca(X)) B++;
              for (X = 0, pe = G; pe; pe = ca(pe)) X++;
              for (; 0 < B - X; ) we = ca(we), B--;
              for (; 0 < X - B; ) G = ca(G), X--;
              for (; B--; ) {
                if (we === G || G !== null && we === G.alternate) break t;
                we = ca(we), G = ca(G);
              }
              we = null;
            }
            else we = null;
            be !== null && Cd(fe, oe, be, we, !1), Se !== null && kt !== null && Cd(fe, kt, Se, we, !0);
          }
        }
        e: {
          if (oe = J ? fa(J) : window, be = oe.nodeName && oe.nodeName.toLowerCase(), be === "select" || be === "input" && oe.type === "file") var xe = vh;
          else if (td(oe)) if (rd) xe = Ch;
          else {
            xe = Eh;
            var Te = bh;
          }
          else (be = oe.nodeName) && be.toLowerCase() === "input" && (oe.type === "checkbox" || oe.type === "radio") && (xe = Sh);
          if (xe && (xe = xe(e, J))) {
            nd(fe, xe, n, le);
            break e;
          }
          Te && Te(e, oe, J), e === "focusout" && (Te = oe._wrapperState) && Te.controlled && oe.type === "number" && ue(oe, "number", oe.value);
        }
        switch (Te = J ? fa(J) : window, e) {
          case "focusin":
            (td(Te) || Te.contentEditable === "true") && (sa = Te, zi = J, to = null);
            break;
          case "focusout":
            to = zi = sa = null;
            break;
          case "mousedown":
            Oi = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Oi = !1, dd(fe, n, le);
            break;
          case "selectionchange":
            if (xh) break;
          case "keydown":
          case "keyup":
            dd(fe, n, le);
        }
        var Pe;
        if (Ti) e: {
          switch (e) {
            case "compositionstart":
              var Ve = "onCompositionStart";
              break e;
            case "compositionend":
              Ve = "onCompositionEnd";
              break e;
            case "compositionupdate":
              Ve = "onCompositionUpdate";
              break e;
          }
          Ve = void 0;
        }
        else ia ? Jc(e, n) && (Ve = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (Ve = "onCompositionStart");
        Ve && (Gc && n.locale !== "ko" && (ia || Ve !== "onCompositionStart" ? Ve === "onCompositionEnd" && ia && (Pe = Hc()) : (pr = le, Ii = "value" in pr ? pr.value : pr.textContent, ia = !0)), Te = tl(J, Ve), 0 < Te.length && (Ve = new Wc(Ve, e, null, n, le), fe.push({ event: Ve, listeners: Te }), Pe ? Ve.data = Pe : (Pe = ed(n), Pe !== null && (Ve.data = Pe)))), (Pe = ph ? mh(e, n) : hh(e, n)) && (J = tl(J, "onBeforeInput"), 0 < J.length && (le = new Wc("onBeforeInput", "beforeinput", null, n, le), fe.push({ event: le, listeners: J }), le.data = Pe));
      }
      Ed(fe, t);
    });
  }
  function ao(e, t, n) {
    return { instance: e, listener: t, currentTarget: n };
  }
  function tl(e, t) {
    for (var n = t + "Capture", a = []; e !== null; ) {
      var s = e, c = s.stateNode;
      s.tag === 5 && c !== null && (s = c, c = at(e, n), c != null && a.unshift(ao(e, c, s)), c = at(e, t), c != null && a.push(ao(e, c, s))), e = e.return;
    }
    return a;
  }
  function ca(e) {
    if (e === null) return null;
    do
      e = e.return;
    while (e && e.tag !== 5);
    return e || null;
  }
  function Cd(e, t, n, a, s) {
    for (var c = t._reactName, h = []; n !== null && n !== a; ) {
      var T = n, z = T.alternate, J = T.stateNode;
      if (z !== null && z === a) break;
      T.tag === 5 && J !== null && (T = J, s ? (z = at(n, c), z != null && h.unshift(ao(n, z, T))) : s || (z = at(n, c), z != null && h.push(ao(n, z, T)))), n = n.return;
    }
    h.length !== 0 && e.push({ event: t, listeners: h });
  }
  var Lh = /\r\n?/g, Rh = /\u0000|\uFFFD/g;
  function wd(e) {
    return (typeof e == "string" ? e : "" + e).replace(Lh, `
`).replace(Rh, "");
  }
  function nl(e, t, n) {
    if (t = wd(t), wd(e) !== t && n) throw Error(l(425));
  }
  function rl() {
  }
  var ji = null, $i = null;
  function Hi(e, t) {
    return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var qi = typeof setTimeout == "function" ? setTimeout : void 0, Nh = typeof clearTimeout == "function" ? clearTimeout : void 0, kd = typeof Promise == "function" ? Promise : void 0, Th = typeof queueMicrotask == "function" ? queueMicrotask : typeof kd < "u" ? function(e) {
    return kd.resolve(null).then(e).catch(Ph);
  } : qi;
  function Ph(e) {
    setTimeout(function() {
      throw e;
    });
  }
  function Qi(e, t) {
    var n = t, a = 0;
    do {
      var s = n.nextSibling;
      if (e.removeChild(n), s && s.nodeType === 8) if (n = s.data, n === "/$") {
        if (a === 0) {
          e.removeChild(s), Wa(t);
          return;
        }
        a--;
      } else n !== "$" && n !== "$?" && n !== "$!" || a++;
      n = s;
    } while (n);
    Wa(t);
  }
  function hr(e) {
    for (; e != null; e = e.nextSibling) {
      var t = e.nodeType;
      if (t === 1 || t === 3) break;
      if (t === 8) {
        if (t = e.data, t === "$" || t === "$!" || t === "$?") break;
        if (t === "/$") return null;
      }
    }
    return e;
  }
  function xd(e) {
    e = e.previousSibling;
    for (var t = 0; e; ) {
      if (e.nodeType === 8) {
        var n = e.data;
        if (n === "$" || n === "$!" || n === "$?") {
          if (t === 0) return e;
          t--;
        } else n === "/$" && t++;
      }
      e = e.previousSibling;
    }
    return null;
  }
  var da = Math.random().toString(36).slice(2), zn = "__reactFiber$" + da, oo = "__reactProps$" + da, Qn = "__reactContainer$" + da, Wi = "__reactEvents$" + da, Ah = "__reactListeners$" + da, Mh = "__reactHandles$" + da;
  function Ur(e) {
    var t = e[zn];
    if (t) return t;
    for (var n = e.parentNode; n; ) {
      if (t = n[Qn] || n[zn]) {
        if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = xd(e); e !== null; ) {
          if (n = e[zn]) return n;
          e = xd(e);
        }
        return t;
      }
      e = n, n = e.parentNode;
    }
    return null;
  }
  function lo(e) {
    return e = e[zn] || e[Qn], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
  }
  function fa(e) {
    if (e.tag === 5 || e.tag === 6) return e.stateNode;
    throw Error(l(33));
  }
  function al(e) {
    return e[oo] || null;
  }
  var Yi = [], pa = -1;
  function yr(e) {
    return { current: e };
  }
  function ct(e) {
    0 > pa || (e.current = Yi[pa], Yi[pa] = null, pa--);
  }
  function lt(e, t) {
    pa++, Yi[pa] = e.current, e.current = t;
  }
  var gr = {}, jt = yr(gr), tn = yr(!1), Kr = gr;
  function ma(e, t) {
    var n = e.type.contextTypes;
    if (!n) return gr;
    var a = e.stateNode;
    if (a && a.__reactInternalMemoizedUnmaskedChildContext === t) return a.__reactInternalMemoizedMaskedChildContext;
    var s = {}, c;
    for (c in n) s[c] = t[c];
    return a && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = s), s;
  }
  function nn(e) {
    return e = e.childContextTypes, e != null;
  }
  function ol() {
    ct(tn), ct(jt);
  }
  function Id(e, t, n) {
    if (jt.current !== gr) throw Error(l(168));
    lt(jt, t), lt(tn, n);
  }
  function Dd(e, t, n) {
    var a = e.stateNode;
    if (t = t.childContextTypes, typeof a.getChildContext != "function") return n;
    a = a.getChildContext();
    for (var s in a) if (!(s in t)) throw Error(l(108, ae(e) || "Unknown", s));
    return K({}, n, a);
  }
  function ll(e) {
    return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || gr, Kr = jt.current, lt(jt, e), lt(tn, tn.current), !0;
  }
  function _d(e, t, n) {
    var a = e.stateNode;
    if (!a) throw Error(l(169));
    n ? (e = Dd(e, t, Kr), a.__reactInternalMemoizedMergedChildContext = e, ct(tn), ct(jt), lt(jt, e)) : ct(tn), lt(tn, n);
  }
  var Wn = null, il = !1, Gi = !1;
  function Ld(e) {
    Wn === null ? Wn = [e] : Wn.push(e);
  }
  function zh(e) {
    il = !0, Ld(e);
  }
  function vr() {
    if (!Gi && Wn !== null) {
      Gi = !0;
      var e = 0, t = et;
      try {
        var n = Wn;
        for (et = 1; e < n.length; e++) {
          var a = n[e];
          do
            a = a(!0);
          while (a !== null);
        }
        Wn = null, il = !1;
      } catch (s) {
        throw Wn !== null && (Wn = Wn.slice(e + 1)), Nc(vi, vr), s;
      } finally {
        et = t, Gi = !1;
      }
    }
    return null;
  }
  var ha = [], ya = 0, sl = null, ul = 0, yn = [], gn = 0, jr = null, Yn = 1, Gn = "";
  function $r(e, t) {
    ha[ya++] = ul, ha[ya++] = sl, sl = e, ul = t;
  }
  function Rd(e, t, n) {
    yn[gn++] = Yn, yn[gn++] = Gn, yn[gn++] = jr, jr = e;
    var a = Yn;
    e = Gn;
    var s = 32 - In(a) - 1;
    a &= ~(1 << s), n += 1;
    var c = 32 - In(t) + s;
    if (30 < c) {
      var h = s - s % 5;
      c = (a & (1 << h) - 1).toString(32), a >>= h, s -= h, Yn = 1 << 32 - In(t) + s | n << s | a, Gn = c + e;
    } else Yn = 1 << c | n << s | a, Gn = e;
  }
  function Xi(e) {
    e.return !== null && ($r(e, 1), Rd(e, 1, 0));
  }
  function Zi(e) {
    for (; e === sl; ) sl = ha[--ya], ha[ya] = null, ul = ha[--ya], ha[ya] = null;
    for (; e === jr; ) jr = yn[--gn], yn[gn] = null, Gn = yn[--gn], yn[gn] = null, Yn = yn[--gn], yn[gn] = null;
  }
  var dn = null, fn = null, ft = !1, _n = null;
  function Nd(e, t) {
    var n = Sn(5, null, null, 0);
    n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
  }
  function Td(e, t) {
    switch (e.tag) {
      case 5:
        var n = e.type;
        return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, dn = e, fn = hr(t.firstChild), !0) : !1;
      case 6:
        return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, dn = e, fn = null, !0) : !1;
      case 13:
        return t = t.nodeType !== 8 ? null : t, t !== null ? (n = jr !== null ? { id: Yn, overflow: Gn } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = Sn(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, dn = e, fn = null, !0) : !1;
      default:
        return !1;
    }
  }
  function Ji(e) {
    return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
  }
  function es(e) {
    if (ft) {
      var t = fn;
      if (t) {
        var n = t;
        if (!Td(e, t)) {
          if (Ji(e)) throw Error(l(418));
          t = hr(n.nextSibling);
          var a = dn;
          t && Td(e, t) ? Nd(a, n) : (e.flags = e.flags & -4097 | 2, ft = !1, dn = e);
        }
      } else {
        if (Ji(e)) throw Error(l(418));
        e.flags = e.flags & -4097 | 2, ft = !1, dn = e;
      }
    }
  }
  function Pd(e) {
    for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
    dn = e;
  }
  function cl(e) {
    if (e !== dn) return !1;
    if (!ft) return Pd(e), ft = !0, !1;
    var t;
    if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !Hi(e.type, e.memoizedProps)), t && (t = fn)) {
      if (Ji(e)) throw Ad(), Error(l(418));
      for (; t; ) Nd(e, t), t = hr(t.nextSibling);
    }
    if (Pd(e), e.tag === 13) {
      if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(l(317));
      e: {
        for (e = e.nextSibling, t = 0; e; ) {
          if (e.nodeType === 8) {
            var n = e.data;
            if (n === "/$") {
              if (t === 0) {
                fn = hr(e.nextSibling);
                break e;
              }
              t--;
            } else n !== "$" && n !== "$!" && n !== "$?" || t++;
          }
          e = e.nextSibling;
        }
        fn = null;
      }
    } else fn = dn ? hr(e.stateNode.nextSibling) : null;
    return !0;
  }
  function Ad() {
    for (var e = fn; e; ) e = hr(e.nextSibling);
  }
  function ga() {
    fn = dn = null, ft = !1;
  }
  function ts(e) {
    _n === null ? _n = [e] : _n.push(e);
  }
  var Oh = x.ReactCurrentBatchConfig;
  function io(e, t, n) {
    if (e = n.ref, e !== null && typeof e != "function" && typeof e != "object") {
      if (n._owner) {
        if (n = n._owner, n) {
          if (n.tag !== 1) throw Error(l(309));
          var a = n.stateNode;
        }
        if (!a) throw Error(l(147, e));
        var s = a, c = "" + e;
        return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === c ? t.ref : (t = function(h) {
          var T = s.refs;
          h === null ? delete T[c] : T[c] = h;
        }, t._stringRef = c, t);
      }
      if (typeof e != "string") throw Error(l(284));
      if (!n._owner) throw Error(l(290, e));
    }
    return e;
  }
  function dl(e, t) {
    throw e = Object.prototype.toString.call(t), Error(l(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
  }
  function Md(e) {
    var t = e._init;
    return t(e._payload);
  }
  function zd(e) {
    function t(G, B) {
      if (e) {
        var X = G.deletions;
        X === null ? (G.deletions = [B], G.flags |= 16) : X.push(B);
      }
    }
    function n(G, B) {
      if (!e) return null;
      for (; B !== null; ) t(G, B), B = B.sibling;
      return null;
    }
    function a(G, B) {
      for (G = /* @__PURE__ */ new Map(); B !== null; ) B.key !== null ? G.set(B.key, B) : G.set(B.index, B), B = B.sibling;
      return G;
    }
    function s(G, B) {
      return G = Ir(G, B), G.index = 0, G.sibling = null, G;
    }
    function c(G, B, X) {
      return G.index = X, e ? (X = G.alternate, X !== null ? (X = X.index, X < B ? (G.flags |= 2, B) : X) : (G.flags |= 2, B)) : (G.flags |= 1048576, B);
    }
    function h(G) {
      return e && G.alternate === null && (G.flags |= 2), G;
    }
    function T(G, B, X, pe) {
      return B === null || B.tag !== 6 ? (B = qs(X, G.mode, pe), B.return = G, B) : (B = s(B, X), B.return = G, B);
    }
    function z(G, B, X, pe) {
      var xe = X.type;
      return xe === O ? le(G, B, X.props.children, pe, X.key) : B !== null && (B.elementType === xe || typeof xe == "object" && xe !== null && xe.$$typeof === $ && Md(xe) === B.type) ? (pe = s(B, X.props), pe.ref = io(G, B, X), pe.return = G, pe) : (pe = Ml(X.type, X.key, X.props, null, G.mode, pe), pe.ref = io(G, B, X), pe.return = G, pe);
    }
    function J(G, B, X, pe) {
      return B === null || B.tag !== 4 || B.stateNode.containerInfo !== X.containerInfo || B.stateNode.implementation !== X.implementation ? (B = Qs(X, G.mode, pe), B.return = G, B) : (B = s(B, X.children || []), B.return = G, B);
    }
    function le(G, B, X, pe, xe) {
      return B === null || B.tag !== 7 ? (B = Zr(X, G.mode, pe, xe), B.return = G, B) : (B = s(B, X), B.return = G, B);
    }
    function fe(G, B, X) {
      if (typeof B == "string" && B !== "" || typeof B == "number") return B = qs("" + B, G.mode, X), B.return = G, B;
      if (typeof B == "object" && B !== null) {
        switch (B.$$typeof) {
          case R:
            return X = Ml(B.type, B.key, B.props, null, G.mode, X), X.ref = io(G, null, B), X.return = G, X;
          case P:
            return B = Qs(B, G.mode, X), B.return = G, B;
          case $:
            var pe = B._init;
            return fe(G, pe(B._payload), X);
        }
        if (Me(B) || Z(B)) return B = Zr(B, G.mode, X, null), B.return = G, B;
        dl(G, B);
      }
      return null;
    }
    function oe(G, B, X, pe) {
      var xe = B !== null ? B.key : null;
      if (typeof X == "string" && X !== "" || typeof X == "number") return xe !== null ? null : T(G, B, "" + X, pe);
      if (typeof X == "object" && X !== null) {
        switch (X.$$typeof) {
          case R:
            return X.key === xe ? z(G, B, X, pe) : null;
          case P:
            return X.key === xe ? J(G, B, X, pe) : null;
          case $:
            return xe = X._init, oe(
              G,
              B,
              xe(X._payload),
              pe
            );
        }
        if (Me(X) || Z(X)) return xe !== null ? null : le(G, B, X, pe, null);
        dl(G, X);
      }
      return null;
    }
    function be(G, B, X, pe, xe) {
      if (typeof pe == "string" && pe !== "" || typeof pe == "number") return G = G.get(X) || null, T(B, G, "" + pe, xe);
      if (typeof pe == "object" && pe !== null) {
        switch (pe.$$typeof) {
          case R:
            return G = G.get(pe.key === null ? X : pe.key) || null, z(B, G, pe, xe);
          case P:
            return G = G.get(pe.key === null ? X : pe.key) || null, J(B, G, pe, xe);
          case $:
            var Te = pe._init;
            return be(G, B, X, Te(pe._payload), xe);
        }
        if (Me(pe) || Z(pe)) return G = G.get(X) || null, le(B, G, pe, xe, null);
        dl(B, pe);
      }
      return null;
    }
    function Se(G, B, X, pe) {
      for (var xe = null, Te = null, Pe = B, Ve = B = 0, At = null; Pe !== null && Ve < X.length; Ve++) {
        Pe.index > Ve ? (At = Pe, Pe = null) : At = Pe.sibling;
        var Ge = oe(G, Pe, X[Ve], pe);
        if (Ge === null) {
          Pe === null && (Pe = At);
          break;
        }
        e && Pe && Ge.alternate === null && t(G, Pe), B = c(Ge, B, Ve), Te === null ? xe = Ge : Te.sibling = Ge, Te = Ge, Pe = At;
      }
      if (Ve === X.length) return n(G, Pe), ft && $r(G, Ve), xe;
      if (Pe === null) {
        for (; Ve < X.length; Ve++) Pe = fe(G, X[Ve], pe), Pe !== null && (B = c(Pe, B, Ve), Te === null ? xe = Pe : Te.sibling = Pe, Te = Pe);
        return ft && $r(G, Ve), xe;
      }
      for (Pe = a(G, Pe); Ve < X.length; Ve++) At = be(Pe, G, Ve, X[Ve], pe), At !== null && (e && At.alternate !== null && Pe.delete(At.key === null ? Ve : At.key), B = c(At, B, Ve), Te === null ? xe = At : Te.sibling = At, Te = At);
      return e && Pe.forEach(function(Dr) {
        return t(G, Dr);
      }), ft && $r(G, Ve), xe;
    }
    function we(G, B, X, pe) {
      var xe = Z(X);
      if (typeof xe != "function") throw Error(l(150));
      if (X = xe.call(X), X == null) throw Error(l(151));
      for (var Te = xe = null, Pe = B, Ve = B = 0, At = null, Ge = X.next(); Pe !== null && !Ge.done; Ve++, Ge = X.next()) {
        Pe.index > Ve ? (At = Pe, Pe = null) : At = Pe.sibling;
        var Dr = oe(G, Pe, Ge.value, pe);
        if (Dr === null) {
          Pe === null && (Pe = At);
          break;
        }
        e && Pe && Dr.alternate === null && t(G, Pe), B = c(Dr, B, Ve), Te === null ? xe = Dr : Te.sibling = Dr, Te = Dr, Pe = At;
      }
      if (Ge.done) return n(
        G,
        Pe
      ), ft && $r(G, Ve), xe;
      if (Pe === null) {
        for (; !Ge.done; Ve++, Ge = X.next()) Ge = fe(G, Ge.value, pe), Ge !== null && (B = c(Ge, B, Ve), Te === null ? xe = Ge : Te.sibling = Ge, Te = Ge);
        return ft && $r(G, Ve), xe;
      }
      for (Pe = a(G, Pe); !Ge.done; Ve++, Ge = X.next()) Ge = be(Pe, G, Ve, Ge.value, pe), Ge !== null && (e && Ge.alternate !== null && Pe.delete(Ge.key === null ? Ve : Ge.key), B = c(Ge, B, Ve), Te === null ? xe = Ge : Te.sibling = Ge, Te = Ge);
      return e && Pe.forEach(function(yy) {
        return t(G, yy);
      }), ft && $r(G, Ve), xe;
    }
    function kt(G, B, X, pe) {
      if (typeof X == "object" && X !== null && X.type === O && X.key === null && (X = X.props.children), typeof X == "object" && X !== null) {
        switch (X.$$typeof) {
          case R:
            e: {
              for (var xe = X.key, Te = B; Te !== null; ) {
                if (Te.key === xe) {
                  if (xe = X.type, xe === O) {
                    if (Te.tag === 7) {
                      n(G, Te.sibling), B = s(Te, X.props.children), B.return = G, G = B;
                      break e;
                    }
                  } else if (Te.elementType === xe || typeof xe == "object" && xe !== null && xe.$$typeof === $ && Md(xe) === Te.type) {
                    n(G, Te.sibling), B = s(Te, X.props), B.ref = io(G, Te, X), B.return = G, G = B;
                    break e;
                  }
                  n(G, Te);
                  break;
                } else t(G, Te);
                Te = Te.sibling;
              }
              X.type === O ? (B = Zr(X.props.children, G.mode, pe, X.key), B.return = G, G = B) : (pe = Ml(X.type, X.key, X.props, null, G.mode, pe), pe.ref = io(G, B, X), pe.return = G, G = pe);
            }
            return h(G);
          case P:
            e: {
              for (Te = X.key; B !== null; ) {
                if (B.key === Te) if (B.tag === 4 && B.stateNode.containerInfo === X.containerInfo && B.stateNode.implementation === X.implementation) {
                  n(G, B.sibling), B = s(B, X.children || []), B.return = G, G = B;
                  break e;
                } else {
                  n(G, B);
                  break;
                }
                else t(G, B);
                B = B.sibling;
              }
              B = Qs(X, G.mode, pe), B.return = G, G = B;
            }
            return h(G);
          case $:
            return Te = X._init, kt(G, B, Te(X._payload), pe);
        }
        if (Me(X)) return Se(G, B, X, pe);
        if (Z(X)) return we(G, B, X, pe);
        dl(G, X);
      }
      return typeof X == "string" && X !== "" || typeof X == "number" ? (X = "" + X, B !== null && B.tag === 6 ? (n(G, B.sibling), B = s(B, X), B.return = G, G = B) : (n(G, B), B = qs(X, G.mode, pe), B.return = G, G = B), h(G)) : n(G, B);
    }
    return kt;
  }
  var va = zd(!0), Od = zd(!1), fl = yr(null), pl = null, ba = null, ns = null;
  function rs() {
    ns = ba = pl = null;
  }
  function as(e) {
    var t = fl.current;
    ct(fl), e._currentValue = t;
  }
  function os(e, t, n) {
    for (; e !== null; ) {
      var a = e.alternate;
      if ((e.childLanes & t) !== t ? (e.childLanes |= t, a !== null && (a.childLanes |= t)) : a !== null && (a.childLanes & t) !== t && (a.childLanes |= t), e === n) break;
      e = e.return;
    }
  }
  function Ea(e, t) {
    pl = e, ns = ba = null, e = e.dependencies, e !== null && e.firstContext !== null && ((e.lanes & t) !== 0 && (rn = !0), e.firstContext = null);
  }
  function vn(e) {
    var t = e._currentValue;
    if (ns !== e) if (e = { context: e, memoizedValue: t, next: null }, ba === null) {
      if (pl === null) throw Error(l(308));
      ba = e, pl.dependencies = { lanes: 0, firstContext: e };
    } else ba = ba.next = e;
    return t;
  }
  var Hr = null;
  function ls(e) {
    Hr === null ? Hr = [e] : Hr.push(e);
  }
  function Vd(e, t, n, a) {
    var s = t.interleaved;
    return s === null ? (n.next = n, ls(t)) : (n.next = s.next, s.next = n), t.interleaved = n, Xn(e, a);
  }
  function Xn(e, t) {
    e.lanes |= t;
    var n = e.alternate;
    for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; ) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
    return n.tag === 3 ? n.stateNode : null;
  }
  var br = !1;
  function is(e) {
    e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function Bd(e, t) {
    e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
  }
  function Zn(e, t) {
    return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
  }
  function Er(e, t, n) {
    var a = e.updateQueue;
    if (a === null) return null;
    if (a = a.shared, (We & 2) !== 0) {
      var s = a.pending;
      return s === null ? t.next = t : (t.next = s.next, s.next = t), a.pending = t, Xn(e, n);
    }
    return s = a.interleaved, s === null ? (t.next = t, ls(a)) : (t.next = s.next, s.next = t), a.interleaved = t, Xn(e, n);
  }
  function ml(e, t, n) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
      var a = t.lanes;
      a &= e.pendingLanes, n |= a, t.lanes = n, Si(e, n);
    }
  }
  function Fd(e, t) {
    var n = e.updateQueue, a = e.alternate;
    if (a !== null && (a = a.updateQueue, n === a)) {
      var s = null, c = null;
      if (n = n.firstBaseUpdate, n !== null) {
        do {
          var h = { eventTime: n.eventTime, lane: n.lane, tag: n.tag, payload: n.payload, callback: n.callback, next: null };
          c === null ? s = c = h : c = c.next = h, n = n.next;
        } while (n !== null);
        c === null ? s = c = t : c = c.next = t;
      } else s = c = t;
      n = { baseState: a.baseState, firstBaseUpdate: s, lastBaseUpdate: c, shared: a.shared, effects: a.effects }, e.updateQueue = n;
      return;
    }
    e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
  }
  function hl(e, t, n, a) {
    var s = e.updateQueue;
    br = !1;
    var c = s.firstBaseUpdate, h = s.lastBaseUpdate, T = s.shared.pending;
    if (T !== null) {
      s.shared.pending = null;
      var z = T, J = z.next;
      z.next = null, h === null ? c = J : h.next = J, h = z;
      var le = e.alternate;
      le !== null && (le = le.updateQueue, T = le.lastBaseUpdate, T !== h && (T === null ? le.firstBaseUpdate = J : T.next = J, le.lastBaseUpdate = z));
    }
    if (c !== null) {
      var fe = s.baseState;
      h = 0, le = J = z = null, T = c;
      do {
        var oe = T.lane, be = T.eventTime;
        if ((a & oe) === oe) {
          le !== null && (le = le.next = {
            eventTime: be,
            lane: 0,
            tag: T.tag,
            payload: T.payload,
            callback: T.callback,
            next: null
          });
          e: {
            var Se = e, we = T;
            switch (oe = t, be = n, we.tag) {
              case 1:
                if (Se = we.payload, typeof Se == "function") {
                  fe = Se.call(be, fe, oe);
                  break e;
                }
                fe = Se;
                break e;
              case 3:
                Se.flags = Se.flags & -65537 | 128;
              case 0:
                if (Se = we.payload, oe = typeof Se == "function" ? Se.call(be, fe, oe) : Se, oe == null) break e;
                fe = K({}, fe, oe);
                break e;
              case 2:
                br = !0;
            }
          }
          T.callback !== null && T.lane !== 0 && (e.flags |= 64, oe = s.effects, oe === null ? s.effects = [T] : oe.push(T));
        } else be = { eventTime: be, lane: oe, tag: T.tag, payload: T.payload, callback: T.callback, next: null }, le === null ? (J = le = be, z = fe) : le = le.next = be, h |= oe;
        if (T = T.next, T === null) {
          if (T = s.shared.pending, T === null) break;
          oe = T, T = oe.next, oe.next = null, s.lastBaseUpdate = oe, s.shared.pending = null;
        }
      } while (!0);
      if (le === null && (z = fe), s.baseState = z, s.firstBaseUpdate = J, s.lastBaseUpdate = le, t = s.shared.interleaved, t !== null) {
        s = t;
        do
          h |= s.lane, s = s.next;
        while (s !== t);
      } else c === null && (s.shared.lanes = 0);
      Wr |= h, e.lanes = h, e.memoizedState = fe;
    }
  }
  function Ud(e, t, n) {
    if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
      var a = e[t], s = a.callback;
      if (s !== null) {
        if (a.callback = null, a = n, typeof s != "function") throw Error(l(191, s));
        s.call(a);
      }
    }
  }
  var so = {}, On = yr(so), uo = yr(so), co = yr(so);
  function qr(e) {
    if (e === so) throw Error(l(174));
    return e;
  }
  function ss(e, t) {
    switch (lt(co, t), lt(uo, e), lt(On, so), e = t.nodeType, e) {
      case 9:
      case 11:
        t = (t = t.documentElement) ? t.namespaceURI : ht(null, "");
        break;
      default:
        e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = ht(t, e);
    }
    ct(On), lt(On, t);
  }
  function Sa() {
    ct(On), ct(uo), ct(co);
  }
  function Kd(e) {
    qr(co.current);
    var t = qr(On.current), n = ht(t, e.type);
    t !== n && (lt(uo, e), lt(On, n));
  }
  function us(e) {
    uo.current === e && (ct(On), ct(uo));
  }
  var yt = yr(0);
  function yl(e) {
    for (var t = e; t !== null; ) {
      if (t.tag === 13) {
        var n = t.memoizedState;
        if (n !== null && (n = n.dehydrated, n === null || n.data === "$?" || n.data === "$!")) return t;
      } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
        if ((t.flags & 128) !== 0) return t;
      } else if (t.child !== null) {
        t.child.return = t, t = t.child;
        continue;
      }
      if (t === e) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e) return null;
        t = t.return;
      }
      t.sibling.return = t.return, t = t.sibling;
    }
    return null;
  }
  var cs = [];
  function ds() {
    for (var e = 0; e < cs.length; e++) cs[e]._workInProgressVersionPrimary = null;
    cs.length = 0;
  }
  var gl = x.ReactCurrentDispatcher, fs = x.ReactCurrentBatchConfig, Qr = 0, gt = null, Rt = null, Tt = null, vl = !1, fo = !1, po = 0, Vh = 0;
  function $t() {
    throw Error(l(321));
  }
  function ps(e, t) {
    if (t === null) return !1;
    for (var n = 0; n < t.length && n < e.length; n++) if (!Dn(e[n], t[n])) return !1;
    return !0;
  }
  function ms(e, t, n, a, s, c) {
    if (Qr = c, gt = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, gl.current = e === null || e.memoizedState === null ? Kh : jh, e = n(a, s), fo) {
      c = 0;
      do {
        if (fo = !1, po = 0, 25 <= c) throw Error(l(301));
        c += 1, Tt = Rt = null, t.updateQueue = null, gl.current = $h, e = n(a, s);
      } while (fo);
    }
    if (gl.current = Sl, t = Rt !== null && Rt.next !== null, Qr = 0, Tt = Rt = gt = null, vl = !1, t) throw Error(l(300));
    return e;
  }
  function hs() {
    var e = po !== 0;
    return po = 0, e;
  }
  function Vn() {
    var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return Tt === null ? gt.memoizedState = Tt = e : Tt = Tt.next = e, Tt;
  }
  function bn() {
    if (Rt === null) {
      var e = gt.alternate;
      e = e !== null ? e.memoizedState : null;
    } else e = Rt.next;
    var t = Tt === null ? gt.memoizedState : Tt.next;
    if (t !== null) Tt = t, Rt = e;
    else {
      if (e === null) throw Error(l(310));
      Rt = e, e = { memoizedState: Rt.memoizedState, baseState: Rt.baseState, baseQueue: Rt.baseQueue, queue: Rt.queue, next: null }, Tt === null ? gt.memoizedState = Tt = e : Tt = Tt.next = e;
    }
    return Tt;
  }
  function mo(e, t) {
    return typeof t == "function" ? t(e) : t;
  }
  function ys(e) {
    var t = bn(), n = t.queue;
    if (n === null) throw Error(l(311));
    n.lastRenderedReducer = e;
    var a = Rt, s = a.baseQueue, c = n.pending;
    if (c !== null) {
      if (s !== null) {
        var h = s.next;
        s.next = c.next, c.next = h;
      }
      a.baseQueue = s = c, n.pending = null;
    }
    if (s !== null) {
      c = s.next, a = a.baseState;
      var T = h = null, z = null, J = c;
      do {
        var le = J.lane;
        if ((Qr & le) === le) z !== null && (z = z.next = { lane: 0, action: J.action, hasEagerState: J.hasEagerState, eagerState: J.eagerState, next: null }), a = J.hasEagerState ? J.eagerState : e(a, J.action);
        else {
          var fe = {
            lane: le,
            action: J.action,
            hasEagerState: J.hasEagerState,
            eagerState: J.eagerState,
            next: null
          };
          z === null ? (T = z = fe, h = a) : z = z.next = fe, gt.lanes |= le, Wr |= le;
        }
        J = J.next;
      } while (J !== null && J !== c);
      z === null ? h = a : z.next = T, Dn(a, t.memoizedState) || (rn = !0), t.memoizedState = a, t.baseState = h, t.baseQueue = z, n.lastRenderedState = a;
    }
    if (e = n.interleaved, e !== null) {
      s = e;
      do
        c = s.lane, gt.lanes |= c, Wr |= c, s = s.next;
      while (s !== e);
    } else s === null && (n.lanes = 0);
    return [t.memoizedState, n.dispatch];
  }
  function gs(e) {
    var t = bn(), n = t.queue;
    if (n === null) throw Error(l(311));
    n.lastRenderedReducer = e;
    var a = n.dispatch, s = n.pending, c = t.memoizedState;
    if (s !== null) {
      n.pending = null;
      var h = s = s.next;
      do
        c = e(c, h.action), h = h.next;
      while (h !== s);
      Dn(c, t.memoizedState) || (rn = !0), t.memoizedState = c, t.baseQueue === null && (t.baseState = c), n.lastRenderedState = c;
    }
    return [c, a];
  }
  function jd() {
  }
  function $d(e, t) {
    var n = gt, a = bn(), s = t(), c = !Dn(a.memoizedState, s);
    if (c && (a.memoizedState = s, rn = !0), a = a.queue, vs(Qd.bind(null, n, a, e), [e]), a.getSnapshot !== t || c || Tt !== null && Tt.memoizedState.tag & 1) {
      if (n.flags |= 2048, ho(9, qd.bind(null, n, a, s, t), void 0, null), Pt === null) throw Error(l(349));
      (Qr & 30) !== 0 || Hd(n, t, s);
    }
    return s;
  }
  function Hd(e, t, n) {
    e.flags |= 16384, e = { getSnapshot: t, value: n }, t = gt.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, gt.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
  }
  function qd(e, t, n, a) {
    t.value = n, t.getSnapshot = a, Wd(t) && Yd(e);
  }
  function Qd(e, t, n) {
    return n(function() {
      Wd(t) && Yd(e);
    });
  }
  function Wd(e) {
    var t = e.getSnapshot;
    e = e.value;
    try {
      var n = t();
      return !Dn(e, n);
    } catch {
      return !0;
    }
  }
  function Yd(e) {
    var t = Xn(e, 1);
    t !== null && Tn(t, e, 1, -1);
  }
  function Gd(e) {
    var t = Vn();
    return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: mo, lastRenderedState: e }, t.queue = e, e = e.dispatch = Uh.bind(null, gt, e), [t.memoizedState, e];
  }
  function ho(e, t, n, a) {
    return e = { tag: e, create: t, destroy: n, deps: a, next: null }, t = gt.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, gt.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (a = n.next, n.next = e, e.next = a, t.lastEffect = e)), e;
  }
  function Xd() {
    return bn().memoizedState;
  }
  function bl(e, t, n, a) {
    var s = Vn();
    gt.flags |= e, s.memoizedState = ho(1 | t, n, void 0, a === void 0 ? null : a);
  }
  function El(e, t, n, a) {
    var s = bn();
    a = a === void 0 ? null : a;
    var c = void 0;
    if (Rt !== null) {
      var h = Rt.memoizedState;
      if (c = h.destroy, a !== null && ps(a, h.deps)) {
        s.memoizedState = ho(t, n, c, a);
        return;
      }
    }
    gt.flags |= e, s.memoizedState = ho(1 | t, n, c, a);
  }
  function Zd(e, t) {
    return bl(8390656, 8, e, t);
  }
  function vs(e, t) {
    return El(2048, 8, e, t);
  }
  function Jd(e, t) {
    return El(4, 2, e, t);
  }
  function ef(e, t) {
    return El(4, 4, e, t);
  }
  function tf(e, t) {
    if (typeof t == "function") return e = e(), t(e), function() {
      t(null);
    };
    if (t != null) return e = e(), t.current = e, function() {
      t.current = null;
    };
  }
  function nf(e, t, n) {
    return n = n != null ? n.concat([e]) : null, El(4, 4, tf.bind(null, t, e), n);
  }
  function bs() {
  }
  function rf(e, t) {
    var n = bn();
    t = t === void 0 ? null : t;
    var a = n.memoizedState;
    return a !== null && t !== null && ps(t, a[1]) ? a[0] : (n.memoizedState = [e, t], e);
  }
  function af(e, t) {
    var n = bn();
    t = t === void 0 ? null : t;
    var a = n.memoizedState;
    return a !== null && t !== null && ps(t, a[1]) ? a[0] : (e = e(), n.memoizedState = [e, t], e);
  }
  function of(e, t, n) {
    return (Qr & 21) === 0 ? (e.baseState && (e.baseState = !1, rn = !0), e.memoizedState = n) : (Dn(n, t) || (n = Mc(), gt.lanes |= n, Wr |= n, e.baseState = !0), t);
  }
  function Bh(e, t) {
    var n = et;
    et = n !== 0 && 4 > n ? n : 4, e(!0);
    var a = fs.transition;
    fs.transition = {};
    try {
      e(!1), t();
    } finally {
      et = n, fs.transition = a;
    }
  }
  function lf() {
    return bn().memoizedState;
  }
  function Fh(e, t, n) {
    var a = kr(e);
    if (n = { lane: a, action: n, hasEagerState: !1, eagerState: null, next: null }, sf(e)) uf(t, n);
    else if (n = Vd(e, t, n, a), n !== null) {
      var s = Xt();
      Tn(n, e, a, s), cf(n, t, a);
    }
  }
  function Uh(e, t, n) {
    var a = kr(e), s = { lane: a, action: n, hasEagerState: !1, eagerState: null, next: null };
    if (sf(e)) uf(t, s);
    else {
      var c = e.alternate;
      if (e.lanes === 0 && (c === null || c.lanes === 0) && (c = t.lastRenderedReducer, c !== null)) try {
        var h = t.lastRenderedState, T = c(h, n);
        if (s.hasEagerState = !0, s.eagerState = T, Dn(T, h)) {
          var z = t.interleaved;
          z === null ? (s.next = s, ls(t)) : (s.next = z.next, z.next = s), t.interleaved = s;
          return;
        }
      } catch {
      }
      n = Vd(e, t, s, a), n !== null && (s = Xt(), Tn(n, e, a, s), cf(n, t, a));
    }
  }
  function sf(e) {
    var t = e.alternate;
    return e === gt || t !== null && t === gt;
  }
  function uf(e, t) {
    fo = vl = !0;
    var n = e.pending;
    n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
  }
  function cf(e, t, n) {
    if ((n & 4194240) !== 0) {
      var a = t.lanes;
      a &= e.pendingLanes, n |= a, t.lanes = n, Si(e, n);
    }
  }
  var Sl = { readContext: vn, useCallback: $t, useContext: $t, useEffect: $t, useImperativeHandle: $t, useInsertionEffect: $t, useLayoutEffect: $t, useMemo: $t, useReducer: $t, useRef: $t, useState: $t, useDebugValue: $t, useDeferredValue: $t, useTransition: $t, useMutableSource: $t, useSyncExternalStore: $t, useId: $t, unstable_isNewReconciler: !1 }, Kh = { readContext: vn, useCallback: function(e, t) {
    return Vn().memoizedState = [e, t === void 0 ? null : t], e;
  }, useContext: vn, useEffect: Zd, useImperativeHandle: function(e, t, n) {
    return n = n != null ? n.concat([e]) : null, bl(
      4194308,
      4,
      tf.bind(null, t, e),
      n
    );
  }, useLayoutEffect: function(e, t) {
    return bl(4194308, 4, e, t);
  }, useInsertionEffect: function(e, t) {
    return bl(4, 2, e, t);
  }, useMemo: function(e, t) {
    var n = Vn();
    return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
  }, useReducer: function(e, t, n) {
    var a = Vn();
    return t = n !== void 0 ? n(t) : t, a.memoizedState = a.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, a.queue = e, e = e.dispatch = Fh.bind(null, gt, e), [a.memoizedState, e];
  }, useRef: function(e) {
    var t = Vn();
    return e = { current: e }, t.memoizedState = e;
  }, useState: Gd, useDebugValue: bs, useDeferredValue: function(e) {
    return Vn().memoizedState = e;
  }, useTransition: function() {
    var e = Gd(!1), t = e[0];
    return e = Bh.bind(null, e[1]), Vn().memoizedState = e, [t, e];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(e, t, n) {
    var a = gt, s = Vn();
    if (ft) {
      if (n === void 0) throw Error(l(407));
      n = n();
    } else {
      if (n = t(), Pt === null) throw Error(l(349));
      (Qr & 30) !== 0 || Hd(a, t, n);
    }
    s.memoizedState = n;
    var c = { value: n, getSnapshot: t };
    return s.queue = c, Zd(Qd.bind(
      null,
      a,
      c,
      e
    ), [e]), a.flags |= 2048, ho(9, qd.bind(null, a, c, n, t), void 0, null), n;
  }, useId: function() {
    var e = Vn(), t = Pt.identifierPrefix;
    if (ft) {
      var n = Gn, a = Yn;
      n = (a & ~(1 << 32 - In(a) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = po++, 0 < n && (t += "H" + n.toString(32)), t += ":";
    } else n = Vh++, t = ":" + t + "r" + n.toString(32) + ":";
    return e.memoizedState = t;
  }, unstable_isNewReconciler: !1 }, jh = {
    readContext: vn,
    useCallback: rf,
    useContext: vn,
    useEffect: vs,
    useImperativeHandle: nf,
    useInsertionEffect: Jd,
    useLayoutEffect: ef,
    useMemo: af,
    useReducer: ys,
    useRef: Xd,
    useState: function() {
      return ys(mo);
    },
    useDebugValue: bs,
    useDeferredValue: function(e) {
      var t = bn();
      return of(t, Rt.memoizedState, e);
    },
    useTransition: function() {
      var e = ys(mo)[0], t = bn().memoizedState;
      return [e, t];
    },
    useMutableSource: jd,
    useSyncExternalStore: $d,
    useId: lf,
    unstable_isNewReconciler: !1
  }, $h = { readContext: vn, useCallback: rf, useContext: vn, useEffect: vs, useImperativeHandle: nf, useInsertionEffect: Jd, useLayoutEffect: ef, useMemo: af, useReducer: gs, useRef: Xd, useState: function() {
    return gs(mo);
  }, useDebugValue: bs, useDeferredValue: function(e) {
    var t = bn();
    return Rt === null ? t.memoizedState = e : of(t, Rt.memoizedState, e);
  }, useTransition: function() {
    var e = gs(mo)[0], t = bn().memoizedState;
    return [e, t];
  }, useMutableSource: jd, useSyncExternalStore: $d, useId: lf, unstable_isNewReconciler: !1 };
  function Ln(e, t) {
    if (e && e.defaultProps) {
      t = K({}, t), e = e.defaultProps;
      for (var n in e) t[n] === void 0 && (t[n] = e[n]);
      return t;
    }
    return t;
  }
  function Es(e, t, n, a) {
    t = e.memoizedState, n = n(a, t), n = n == null ? t : K({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
  }
  var Cl = { isMounted: function(e) {
    return (e = e._reactInternals) ? ve(e) === e : !1;
  }, enqueueSetState: function(e, t, n) {
    e = e._reactInternals;
    var a = Xt(), s = kr(e), c = Zn(a, s);
    c.payload = t, n != null && (c.callback = n), t = Er(e, c, s), t !== null && (Tn(t, e, s, a), ml(t, e, s));
  }, enqueueReplaceState: function(e, t, n) {
    e = e._reactInternals;
    var a = Xt(), s = kr(e), c = Zn(a, s);
    c.tag = 1, c.payload = t, n != null && (c.callback = n), t = Er(e, c, s), t !== null && (Tn(t, e, s, a), ml(t, e, s));
  }, enqueueForceUpdate: function(e, t) {
    e = e._reactInternals;
    var n = Xt(), a = kr(e), s = Zn(n, a);
    s.tag = 2, t != null && (s.callback = t), t = Er(e, s, a), t !== null && (Tn(t, e, a, n), ml(t, e, a));
  } };
  function df(e, t, n, a, s, c, h) {
    return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(a, c, h) : t.prototype && t.prototype.isPureReactComponent ? !eo(n, a) || !eo(s, c) : !0;
  }
  function ff(e, t, n) {
    var a = !1, s = gr, c = t.contextType;
    return typeof c == "object" && c !== null ? c = vn(c) : (s = nn(t) ? Kr : jt.current, a = t.contextTypes, c = (a = a != null) ? ma(e, s) : gr), t = new t(n, c), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = Cl, e.stateNode = t, t._reactInternals = e, a && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = s, e.__reactInternalMemoizedMaskedChildContext = c), t;
  }
  function pf(e, t, n, a) {
    e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, a), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, a), t.state !== e && Cl.enqueueReplaceState(t, t.state, null);
  }
  function Ss(e, t, n, a) {
    var s = e.stateNode;
    s.props = n, s.state = e.memoizedState, s.refs = {}, is(e);
    var c = t.contextType;
    typeof c == "object" && c !== null ? s.context = vn(c) : (c = nn(t) ? Kr : jt.current, s.context = ma(e, c)), s.state = e.memoizedState, c = t.getDerivedStateFromProps, typeof c == "function" && (Es(e, t, c, n), s.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof s.getSnapshotBeforeUpdate == "function" || typeof s.UNSAFE_componentWillMount != "function" && typeof s.componentWillMount != "function" || (t = s.state, typeof s.componentWillMount == "function" && s.componentWillMount(), typeof s.UNSAFE_componentWillMount == "function" && s.UNSAFE_componentWillMount(), t !== s.state && Cl.enqueueReplaceState(s, s.state, null), hl(e, n, s, a), s.state = e.memoizedState), typeof s.componentDidMount == "function" && (e.flags |= 4194308);
  }
  function Ca(e, t) {
    try {
      var n = "", a = t;
      do
        n += ce(a), a = a.return;
      while (a);
      var s = n;
    } catch (c) {
      s = `
Error generating stack: ` + c.message + `
` + c.stack;
    }
    return { value: e, source: t, stack: s, digest: null };
  }
  function Cs(e, t, n) {
    return { value: e, source: null, stack: n ?? null, digest: t ?? null };
  }
  function ws(e, t) {
    try {
      console.error(t.value);
    } catch (n) {
      setTimeout(function() {
        throw n;
      });
    }
  }
  var Hh = typeof WeakMap == "function" ? WeakMap : Map;
  function mf(e, t, n) {
    n = Zn(-1, n), n.tag = 3, n.payload = { element: null };
    var a = t.value;
    return n.callback = function() {
      Ll || (Ll = !0, Vs = a), ws(e, t);
    }, n;
  }
  function hf(e, t, n) {
    n = Zn(-1, n), n.tag = 3;
    var a = e.type.getDerivedStateFromError;
    if (typeof a == "function") {
      var s = t.value;
      n.payload = function() {
        return a(s);
      }, n.callback = function() {
        ws(e, t);
      };
    }
    var c = e.stateNode;
    return c !== null && typeof c.componentDidCatch == "function" && (n.callback = function() {
      ws(e, t), typeof a != "function" && (Cr === null ? Cr = /* @__PURE__ */ new Set([this]) : Cr.add(this));
      var h = t.stack;
      this.componentDidCatch(t.value, { componentStack: h !== null ? h : "" });
    }), n;
  }
  function yf(e, t, n) {
    var a = e.pingCache;
    if (a === null) {
      a = e.pingCache = new Hh();
      var s = /* @__PURE__ */ new Set();
      a.set(t, s);
    } else s = a.get(t), s === void 0 && (s = /* @__PURE__ */ new Set(), a.set(t, s));
    s.has(n) || (s.add(n), e = oy.bind(null, e, t, n), t.then(e, e));
  }
  function gf(e) {
    do {
      var t;
      if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : !0), t) return e;
      e = e.return;
    } while (e !== null);
    return null;
  }
  function vf(e, t, n, a, s) {
    return (e.mode & 1) === 0 ? (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = Zn(-1, 1), t.tag = 2, Er(n, t, 1))), n.lanes |= 1), e) : (e.flags |= 65536, e.lanes = s, e);
  }
  var qh = x.ReactCurrentOwner, rn = !1;
  function Gt(e, t, n, a) {
    t.child = e === null ? Od(t, null, n, a) : va(t, e.child, n, a);
  }
  function bf(e, t, n, a, s) {
    n = n.render;
    var c = t.ref;
    return Ea(t, s), a = ms(e, t, n, a, c, s), n = hs(), e !== null && !rn ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~s, Jn(e, t, s)) : (ft && n && Xi(t), t.flags |= 1, Gt(e, t, a, s), t.child);
  }
  function Ef(e, t, n, a, s) {
    if (e === null) {
      var c = n.type;
      return typeof c == "function" && !Hs(c) && c.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = c, Sf(e, t, c, a, s)) : (e = Ml(n.type, null, a, t, t.mode, s), e.ref = t.ref, e.return = t, t.child = e);
    }
    if (c = e.child, (e.lanes & s) === 0) {
      var h = c.memoizedProps;
      if (n = n.compare, n = n !== null ? n : eo, n(h, a) && e.ref === t.ref) return Jn(e, t, s);
    }
    return t.flags |= 1, e = Ir(c, a), e.ref = t.ref, e.return = t, t.child = e;
  }
  function Sf(e, t, n, a, s) {
    if (e !== null) {
      var c = e.memoizedProps;
      if (eo(c, a) && e.ref === t.ref) if (rn = !1, t.pendingProps = a = c, (e.lanes & s) !== 0) (e.flags & 131072) !== 0 && (rn = !0);
      else return t.lanes = e.lanes, Jn(e, t, s);
    }
    return ks(e, t, n, a, s);
  }
  function Cf(e, t, n) {
    var a = t.pendingProps, s = a.children, c = e !== null ? e.memoizedState : null;
    if (a.mode === "hidden") if ((t.mode & 1) === 0) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, lt(ka, pn), pn |= n;
    else {
      if ((n & 1073741824) === 0) return e = c !== null ? c.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, lt(ka, pn), pn |= e, null;
      t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, a = c !== null ? c.baseLanes : n, lt(ka, pn), pn |= a;
    }
    else c !== null ? (a = c.baseLanes | n, t.memoizedState = null) : a = n, lt(ka, pn), pn |= a;
    return Gt(e, t, s, n), t.child;
  }
  function wf(e, t) {
    var n = t.ref;
    (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
  }
  function ks(e, t, n, a, s) {
    var c = nn(n) ? Kr : jt.current;
    return c = ma(t, c), Ea(t, s), n = ms(e, t, n, a, c, s), a = hs(), e !== null && !rn ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~s, Jn(e, t, s)) : (ft && a && Xi(t), t.flags |= 1, Gt(e, t, n, s), t.child);
  }
  function kf(e, t, n, a, s) {
    if (nn(n)) {
      var c = !0;
      ll(t);
    } else c = !1;
    if (Ea(t, s), t.stateNode === null) kl(e, t), ff(t, n, a), Ss(t, n, a, s), a = !0;
    else if (e === null) {
      var h = t.stateNode, T = t.memoizedProps;
      h.props = T;
      var z = h.context, J = n.contextType;
      typeof J == "object" && J !== null ? J = vn(J) : (J = nn(n) ? Kr : jt.current, J = ma(t, J));
      var le = n.getDerivedStateFromProps, fe = typeof le == "function" || typeof h.getSnapshotBeforeUpdate == "function";
      fe || typeof h.UNSAFE_componentWillReceiveProps != "function" && typeof h.componentWillReceiveProps != "function" || (T !== a || z !== J) && pf(t, h, a, J), br = !1;
      var oe = t.memoizedState;
      h.state = oe, hl(t, a, h, s), z = t.memoizedState, T !== a || oe !== z || tn.current || br ? (typeof le == "function" && (Es(t, n, le, a), z = t.memoizedState), (T = br || df(t, n, T, a, oe, z, J)) ? (fe || typeof h.UNSAFE_componentWillMount != "function" && typeof h.componentWillMount != "function" || (typeof h.componentWillMount == "function" && h.componentWillMount(), typeof h.UNSAFE_componentWillMount == "function" && h.UNSAFE_componentWillMount()), typeof h.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof h.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = a, t.memoizedState = z), h.props = a, h.state = z, h.context = J, a = T) : (typeof h.componentDidMount == "function" && (t.flags |= 4194308), a = !1);
    } else {
      h = t.stateNode, Bd(e, t), T = t.memoizedProps, J = t.type === t.elementType ? T : Ln(t.type, T), h.props = J, fe = t.pendingProps, oe = h.context, z = n.contextType, typeof z == "object" && z !== null ? z = vn(z) : (z = nn(n) ? Kr : jt.current, z = ma(t, z));
      var be = n.getDerivedStateFromProps;
      (le = typeof be == "function" || typeof h.getSnapshotBeforeUpdate == "function") || typeof h.UNSAFE_componentWillReceiveProps != "function" && typeof h.componentWillReceiveProps != "function" || (T !== fe || oe !== z) && pf(t, h, a, z), br = !1, oe = t.memoizedState, h.state = oe, hl(t, a, h, s);
      var Se = t.memoizedState;
      T !== fe || oe !== Se || tn.current || br ? (typeof be == "function" && (Es(t, n, be, a), Se = t.memoizedState), (J = br || df(t, n, J, a, oe, Se, z) || !1) ? (le || typeof h.UNSAFE_componentWillUpdate != "function" && typeof h.componentWillUpdate != "function" || (typeof h.componentWillUpdate == "function" && h.componentWillUpdate(a, Se, z), typeof h.UNSAFE_componentWillUpdate == "function" && h.UNSAFE_componentWillUpdate(a, Se, z)), typeof h.componentDidUpdate == "function" && (t.flags |= 4), typeof h.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof h.componentDidUpdate != "function" || T === e.memoizedProps && oe === e.memoizedState || (t.flags |= 4), typeof h.getSnapshotBeforeUpdate != "function" || T === e.memoizedProps && oe === e.memoizedState || (t.flags |= 1024), t.memoizedProps = a, t.memoizedState = Se), h.props = a, h.state = Se, h.context = z, a = J) : (typeof h.componentDidUpdate != "function" || T === e.memoizedProps && oe === e.memoizedState || (t.flags |= 4), typeof h.getSnapshotBeforeUpdate != "function" || T === e.memoizedProps && oe === e.memoizedState || (t.flags |= 1024), a = !1);
    }
    return xs(e, t, n, a, c, s);
  }
  function xs(e, t, n, a, s, c) {
    wf(e, t);
    var h = (t.flags & 128) !== 0;
    if (!a && !h) return s && _d(t, n, !1), Jn(e, t, c);
    a = t.stateNode, qh.current = t;
    var T = h && typeof n.getDerivedStateFromError != "function" ? null : a.render();
    return t.flags |= 1, e !== null && h ? (t.child = va(t, e.child, null, c), t.child = va(t, null, T, c)) : Gt(e, t, T, c), t.memoizedState = a.state, s && _d(t, n, !0), t.child;
  }
  function xf(e) {
    var t = e.stateNode;
    t.pendingContext ? Id(e, t.pendingContext, t.pendingContext !== t.context) : t.context && Id(e, t.context, !1), ss(e, t.containerInfo);
  }
  function If(e, t, n, a, s) {
    return ga(), ts(s), t.flags |= 256, Gt(e, t, n, a), t.child;
  }
  var Is = { dehydrated: null, treeContext: null, retryLane: 0 };
  function Ds(e) {
    return { baseLanes: e, cachePool: null, transitions: null };
  }
  function Df(e, t, n) {
    var a = t.pendingProps, s = yt.current, c = !1, h = (t.flags & 128) !== 0, T;
    if ((T = h) || (T = e !== null && e.memoizedState === null ? !1 : (s & 2) !== 0), T ? (c = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (s |= 1), lt(yt, s & 1), e === null)
      return es(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? ((t.mode & 1) === 0 ? t.lanes = 1 : e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824, null) : (h = a.children, e = a.fallback, c ? (a = t.mode, c = t.child, h = { mode: "hidden", children: h }, (a & 1) === 0 && c !== null ? (c.childLanes = 0, c.pendingProps = h) : c = zl(h, a, 0, null), e = Zr(e, a, n, null), c.return = t, e.return = t, c.sibling = e, t.child = c, t.child.memoizedState = Ds(n), t.memoizedState = Is, e) : _s(t, h));
    if (s = e.memoizedState, s !== null && (T = s.dehydrated, T !== null)) return Qh(e, t, h, a, T, s, n);
    if (c) {
      c = a.fallback, h = t.mode, s = e.child, T = s.sibling;
      var z = { mode: "hidden", children: a.children };
      return (h & 1) === 0 && t.child !== s ? (a = t.child, a.childLanes = 0, a.pendingProps = z, t.deletions = null) : (a = Ir(s, z), a.subtreeFlags = s.subtreeFlags & 14680064), T !== null ? c = Ir(T, c) : (c = Zr(c, h, n, null), c.flags |= 2), c.return = t, a.return = t, a.sibling = c, t.child = a, a = c, c = t.child, h = e.child.memoizedState, h = h === null ? Ds(n) : { baseLanes: h.baseLanes | n, cachePool: null, transitions: h.transitions }, c.memoizedState = h, c.childLanes = e.childLanes & ~n, t.memoizedState = Is, a;
    }
    return c = e.child, e = c.sibling, a = Ir(c, { mode: "visible", children: a.children }), (t.mode & 1) === 0 && (a.lanes = n), a.return = t, a.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = a, t.memoizedState = null, a;
  }
  function _s(e, t) {
    return t = zl({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
  }
  function wl(e, t, n, a) {
    return a !== null && ts(a), va(t, e.child, null, n), e = _s(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
  }
  function Qh(e, t, n, a, s, c, h) {
    if (n)
      return t.flags & 256 ? (t.flags &= -257, a = Cs(Error(l(422))), wl(e, t, h, a)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (c = a.fallback, s = t.mode, a = zl({ mode: "visible", children: a.children }, s, 0, null), c = Zr(c, s, h, null), c.flags |= 2, a.return = t, c.return = t, a.sibling = c, t.child = a, (t.mode & 1) !== 0 && va(t, e.child, null, h), t.child.memoizedState = Ds(h), t.memoizedState = Is, c);
    if ((t.mode & 1) === 0) return wl(e, t, h, null);
    if (s.data === "$!") {
      if (a = s.nextSibling && s.nextSibling.dataset, a) var T = a.dgst;
      return a = T, c = Error(l(419)), a = Cs(c, a, void 0), wl(e, t, h, a);
    }
    if (T = (h & e.childLanes) !== 0, rn || T) {
      if (a = Pt, a !== null) {
        switch (h & -h) {
          case 4:
            s = 2;
            break;
          case 16:
            s = 8;
            break;
          case 64:
          case 128:
          case 256:
          case 512:
          case 1024:
          case 2048:
          case 4096:
          case 8192:
          case 16384:
          case 32768:
          case 65536:
          case 131072:
          case 262144:
          case 524288:
          case 1048576:
          case 2097152:
          case 4194304:
          case 8388608:
          case 16777216:
          case 33554432:
          case 67108864:
            s = 32;
            break;
          case 536870912:
            s = 268435456;
            break;
          default:
            s = 0;
        }
        s = (s & (a.suspendedLanes | h)) !== 0 ? 0 : s, s !== 0 && s !== c.retryLane && (c.retryLane = s, Xn(e, s), Tn(a, e, s, -1));
      }
      return $s(), a = Cs(Error(l(421))), wl(e, t, h, a);
    }
    return s.data === "$?" ? (t.flags |= 128, t.child = e.child, t = ly.bind(null, e), s._reactRetry = t, null) : (e = c.treeContext, fn = hr(s.nextSibling), dn = t, ft = !0, _n = null, e !== null && (yn[gn++] = Yn, yn[gn++] = Gn, yn[gn++] = jr, Yn = e.id, Gn = e.overflow, jr = t), t = _s(t, a.children), t.flags |= 4096, t);
  }
  function _f(e, t, n) {
    e.lanes |= t;
    var a = e.alternate;
    a !== null && (a.lanes |= t), os(e.return, t, n);
  }
  function Ls(e, t, n, a, s) {
    var c = e.memoizedState;
    c === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: a, tail: n, tailMode: s } : (c.isBackwards = t, c.rendering = null, c.renderingStartTime = 0, c.last = a, c.tail = n, c.tailMode = s);
  }
  function Lf(e, t, n) {
    var a = t.pendingProps, s = a.revealOrder, c = a.tail;
    if (Gt(e, t, a.children, n), a = yt.current, (a & 2) !== 0) a = a & 1 | 2, t.flags |= 128;
    else {
      if (e !== null && (e.flags & 128) !== 0) e: for (e = t.child; e !== null; ) {
        if (e.tag === 13) e.memoizedState !== null && _f(e, n, t);
        else if (e.tag === 19) _f(e, n, t);
        else if (e.child !== null) {
          e.child.return = e, e = e.child;
          continue;
        }
        if (e === t) break e;
        for (; e.sibling === null; ) {
          if (e.return === null || e.return === t) break e;
          e = e.return;
        }
        e.sibling.return = e.return, e = e.sibling;
      }
      a &= 1;
    }
    if (lt(yt, a), (t.mode & 1) === 0) t.memoizedState = null;
    else switch (s) {
      case "forwards":
        for (n = t.child, s = null; n !== null; ) e = n.alternate, e !== null && yl(e) === null && (s = n), n = n.sibling;
        n = s, n === null ? (s = t.child, t.child = null) : (s = n.sibling, n.sibling = null), Ls(t, !1, s, n, c);
        break;
      case "backwards":
        for (n = null, s = t.child, t.child = null; s !== null; ) {
          if (e = s.alternate, e !== null && yl(e) === null) {
            t.child = s;
            break;
          }
          e = s.sibling, s.sibling = n, n = s, s = e;
        }
        Ls(t, !0, n, null, c);
        break;
      case "together":
        Ls(t, !1, null, null, void 0);
        break;
      default:
        t.memoizedState = null;
    }
    return t.child;
  }
  function kl(e, t) {
    (t.mode & 1) === 0 && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
  }
  function Jn(e, t, n) {
    if (e !== null && (t.dependencies = e.dependencies), Wr |= t.lanes, (n & t.childLanes) === 0) return null;
    if (e !== null && t.child !== e.child) throw Error(l(153));
    if (t.child !== null) {
      for (e = t.child, n = Ir(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; ) e = e.sibling, n = n.sibling = Ir(e, e.pendingProps), n.return = t;
      n.sibling = null;
    }
    return t.child;
  }
  function Wh(e, t, n) {
    switch (t.tag) {
      case 3:
        xf(t), ga();
        break;
      case 5:
        Kd(t);
        break;
      case 1:
        nn(t.type) && ll(t);
        break;
      case 4:
        ss(t, t.stateNode.containerInfo);
        break;
      case 10:
        var a = t.type._context, s = t.memoizedProps.value;
        lt(fl, a._currentValue), a._currentValue = s;
        break;
      case 13:
        if (a = t.memoizedState, a !== null)
          return a.dehydrated !== null ? (lt(yt, yt.current & 1), t.flags |= 128, null) : (n & t.child.childLanes) !== 0 ? Df(e, t, n) : (lt(yt, yt.current & 1), e = Jn(e, t, n), e !== null ? e.sibling : null);
        lt(yt, yt.current & 1);
        break;
      case 19:
        if (a = (n & t.childLanes) !== 0, (e.flags & 128) !== 0) {
          if (a) return Lf(e, t, n);
          t.flags |= 128;
        }
        if (s = t.memoizedState, s !== null && (s.rendering = null, s.tail = null, s.lastEffect = null), lt(yt, yt.current), a) break;
        return null;
      case 22:
      case 23:
        return t.lanes = 0, Cf(e, t, n);
    }
    return Jn(e, t, n);
  }
  var Rf, Rs, Nf, Tf;
  Rf = function(e, t) {
    for (var n = t.child; n !== null; ) {
      if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
      else if (n.tag !== 4 && n.child !== null) {
        n.child.return = n, n = n.child;
        continue;
      }
      if (n === t) break;
      for (; n.sibling === null; ) {
        if (n.return === null || n.return === t) return;
        n = n.return;
      }
      n.sibling.return = n.return, n = n.sibling;
    }
  }, Rs = function() {
  }, Nf = function(e, t, n, a) {
    var s = e.memoizedProps;
    if (s !== a) {
      e = t.stateNode, qr(On.current);
      var c = null;
      switch (n) {
        case "input":
          s = De(e, s), a = De(e, a), c = [];
          break;
        case "select":
          s = K({}, s, { value: void 0 }), a = K({}, a, { value: void 0 }), c = [];
          break;
        case "textarea":
          s = $e(e, s), a = $e(e, a), c = [];
          break;
        default:
          typeof s.onClick != "function" && typeof a.onClick == "function" && (e.onclick = rl);
      }
      nt(n, a);
      var h;
      n = null;
      for (J in s) if (!a.hasOwnProperty(J) && s.hasOwnProperty(J) && s[J] != null) if (J === "style") {
        var T = s[J];
        for (h in T) T.hasOwnProperty(h) && (n || (n = {}), n[h] = "");
      } else J !== "dangerouslySetInnerHTML" && J !== "children" && J !== "suppressContentEditableWarning" && J !== "suppressHydrationWarning" && J !== "autoFocus" && (d.hasOwnProperty(J) ? c || (c = []) : (c = c || []).push(J, null));
      for (J in a) {
        var z = a[J];
        if (T = s?.[J], a.hasOwnProperty(J) && z !== T && (z != null || T != null)) if (J === "style") if (T) {
          for (h in T) !T.hasOwnProperty(h) || z && z.hasOwnProperty(h) || (n || (n = {}), n[h] = "");
          for (h in z) z.hasOwnProperty(h) && T[h] !== z[h] && (n || (n = {}), n[h] = z[h]);
        } else n || (c || (c = []), c.push(
          J,
          n
        )), n = z;
        else J === "dangerouslySetInnerHTML" ? (z = z ? z.__html : void 0, T = T ? T.__html : void 0, z != null && T !== z && (c = c || []).push(J, z)) : J === "children" ? typeof z != "string" && typeof z != "number" || (c = c || []).push(J, "" + z) : J !== "suppressContentEditableWarning" && J !== "suppressHydrationWarning" && (d.hasOwnProperty(J) ? (z != null && J === "onScroll" && ut("scroll", e), c || T === z || (c = [])) : (c = c || []).push(J, z));
      }
      n && (c = c || []).push("style", n);
      var J = c;
      (t.updateQueue = J) && (t.flags |= 4);
    }
  }, Tf = function(e, t, n, a) {
    n !== a && (t.flags |= 4);
  };
  function yo(e, t) {
    if (!ft) switch (e.tailMode) {
      case "hidden":
        t = e.tail;
        for (var n = null; t !== null; ) t.alternate !== null && (n = t), t = t.sibling;
        n === null ? e.tail = null : n.sibling = null;
        break;
      case "collapsed":
        n = e.tail;
        for (var a = null; n !== null; ) n.alternate !== null && (a = n), n = n.sibling;
        a === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : a.sibling = null;
    }
  }
  function Ht(e) {
    var t = e.alternate !== null && e.alternate.child === e.child, n = 0, a = 0;
    if (t) for (var s = e.child; s !== null; ) n |= s.lanes | s.childLanes, a |= s.subtreeFlags & 14680064, a |= s.flags & 14680064, s.return = e, s = s.sibling;
    else for (s = e.child; s !== null; ) n |= s.lanes | s.childLanes, a |= s.subtreeFlags, a |= s.flags, s.return = e, s = s.sibling;
    return e.subtreeFlags |= a, e.childLanes = n, t;
  }
  function Yh(e, t, n) {
    var a = t.pendingProps;
    switch (Zi(t), t.tag) {
      case 2:
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return Ht(t), null;
      case 1:
        return nn(t.type) && ol(), Ht(t), null;
      case 3:
        return a = t.stateNode, Sa(), ct(tn), ct(jt), ds(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (e === null || e.child === null) && (cl(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, _n !== null && (Us(_n), _n = null))), Rs(e, t), Ht(t), null;
      case 5:
        us(t);
        var s = qr(co.current);
        if (n = t.type, e !== null && t.stateNode != null) Nf(e, t, n, a, s), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
        else {
          if (!a) {
            if (t.stateNode === null) throw Error(l(166));
            return Ht(t), null;
          }
          if (e = qr(On.current), cl(t)) {
            a = t.stateNode, n = t.type;
            var c = t.memoizedProps;
            switch (a[zn] = t, a[oo] = c, e = (t.mode & 1) !== 0, n) {
              case "dialog":
                ut("cancel", a), ut("close", a);
                break;
              case "iframe":
              case "object":
              case "embed":
                ut("load", a);
                break;
              case "video":
              case "audio":
                for (s = 0; s < no.length; s++) ut(no[s], a);
                break;
              case "source":
                ut("error", a);
                break;
              case "img":
              case "image":
              case "link":
                ut(
                  "error",
                  a
                ), ut("load", a);
                break;
              case "details":
                ut("toggle", a);
                break;
              case "input":
                Ue(a, c), ut("invalid", a);
                break;
              case "select":
                a._wrapperState = { wasMultiple: !!c.multiple }, ut("invalid", a);
                break;
              case "textarea":
                Ye(a, c), ut("invalid", a);
            }
            nt(n, c), s = null;
            for (var h in c) if (c.hasOwnProperty(h)) {
              var T = c[h];
              h === "children" ? typeof T == "string" ? a.textContent !== T && (c.suppressHydrationWarning !== !0 && nl(a.textContent, T, e), s = ["children", T]) : typeof T == "number" && a.textContent !== "" + T && (c.suppressHydrationWarning !== !0 && nl(
                a.textContent,
                T,
                e
              ), s = ["children", "" + T]) : d.hasOwnProperty(h) && T != null && h === "onScroll" && ut("scroll", a);
            }
            switch (n) {
              case "input":
                se(a), me(a, c, !0);
                break;
              case "textarea":
                se(a), mt(a);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof c.onClick == "function" && (a.onclick = rl);
            }
            a = s, t.updateQueue = a, a !== null && (t.flags |= 4);
          } else {
            h = s.nodeType === 9 ? s : s.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = bt(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = h.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof a.is == "string" ? e = h.createElement(n, { is: a.is }) : (e = h.createElement(n), n === "select" && (h = e, a.multiple ? h.multiple = !0 : a.size && (h.size = a.size))) : e = h.createElementNS(e, n), e[zn] = t, e[oo] = a, Rf(e, t, !1, !1), t.stateNode = e;
            e: {
              switch (h = wn(n, a), n) {
                case "dialog":
                  ut("cancel", e), ut("close", e), s = a;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  ut("load", e), s = a;
                  break;
                case "video":
                case "audio":
                  for (s = 0; s < no.length; s++) ut(no[s], e);
                  s = a;
                  break;
                case "source":
                  ut("error", e), s = a;
                  break;
                case "img":
                case "image":
                case "link":
                  ut(
                    "error",
                    e
                  ), ut("load", e), s = a;
                  break;
                case "details":
                  ut("toggle", e), s = a;
                  break;
                case "input":
                  Ue(e, a), s = De(e, a), ut("invalid", e);
                  break;
                case "option":
                  s = a;
                  break;
                case "select":
                  e._wrapperState = { wasMultiple: !!a.multiple }, s = K({}, a, { value: void 0 }), ut("invalid", e);
                  break;
                case "textarea":
                  Ye(e, a), s = $e(e, a), ut("invalid", e);
                  break;
                default:
                  s = a;
              }
              nt(n, s), T = s;
              for (c in T) if (T.hasOwnProperty(c)) {
                var z = T[c];
                c === "style" ? ot(e, z) : c === "dangerouslySetInnerHTML" ? (z = z ? z.__html : void 0, z != null && Xe(e, z)) : c === "children" ? typeof z == "string" ? (n !== "textarea" || z !== "") && St(e, z) : typeof z == "number" && St(e, "" + z) : c !== "suppressContentEditableWarning" && c !== "suppressHydrationWarning" && c !== "autoFocus" && (d.hasOwnProperty(c) ? z != null && c === "onScroll" && ut("scroll", e) : z != null && D(e, c, z, h));
              }
              switch (n) {
                case "input":
                  se(e), me(e, a, !1);
                  break;
                case "textarea":
                  se(e), mt(e);
                  break;
                case "option":
                  a.value != null && e.setAttribute("value", "" + de(a.value));
                  break;
                case "select":
                  e.multiple = !!a.multiple, c = a.value, c != null ? Ke(e, !!a.multiple, c, !1) : a.defaultValue != null && Ke(
                    e,
                    !!a.multiple,
                    a.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof s.onClick == "function" && (e.onclick = rl);
              }
              switch (n) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  a = !!a.autoFocus;
                  break e;
                case "img":
                  a = !0;
                  break e;
                default:
                  a = !1;
              }
            }
            a && (t.flags |= 4);
          }
          t.ref !== null && (t.flags |= 512, t.flags |= 2097152);
        }
        return Ht(t), null;
      case 6:
        if (e && t.stateNode != null) Tf(e, t, e.memoizedProps, a);
        else {
          if (typeof a != "string" && t.stateNode === null) throw Error(l(166));
          if (n = qr(co.current), qr(On.current), cl(t)) {
            if (a = t.stateNode, n = t.memoizedProps, a[zn] = t, (c = a.nodeValue !== n) && (e = dn, e !== null)) switch (e.tag) {
              case 3:
                nl(a.nodeValue, n, (e.mode & 1) !== 0);
                break;
              case 5:
                e.memoizedProps.suppressHydrationWarning !== !0 && nl(a.nodeValue, n, (e.mode & 1) !== 0);
            }
            c && (t.flags |= 4);
          } else a = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(a), a[zn] = t, t.stateNode = a;
        }
        return Ht(t), null;
      case 13:
        if (ct(yt), a = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
          if (ft && fn !== null && (t.mode & 1) !== 0 && (t.flags & 128) === 0) Ad(), ga(), t.flags |= 98560, c = !1;
          else if (c = cl(t), a !== null && a.dehydrated !== null) {
            if (e === null) {
              if (!c) throw Error(l(318));
              if (c = t.memoizedState, c = c !== null ? c.dehydrated : null, !c) throw Error(l(317));
              c[zn] = t;
            } else ga(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Ht(t), c = !1;
          } else _n !== null && (Us(_n), _n = null), c = !0;
          if (!c) return t.flags & 65536 ? t : null;
        }
        return (t.flags & 128) !== 0 ? (t.lanes = n, t) : (a = a !== null, a !== (e !== null && e.memoizedState !== null) && a && (t.child.flags |= 8192, (t.mode & 1) !== 0 && (e === null || (yt.current & 1) !== 0 ? Nt === 0 && (Nt = 3) : $s())), t.updateQueue !== null && (t.flags |= 4), Ht(t), null);
      case 4:
        return Sa(), Rs(e, t), e === null && ro(t.stateNode.containerInfo), Ht(t), null;
      case 10:
        return as(t.type._context), Ht(t), null;
      case 17:
        return nn(t.type) && ol(), Ht(t), null;
      case 19:
        if (ct(yt), c = t.memoizedState, c === null) return Ht(t), null;
        if (a = (t.flags & 128) !== 0, h = c.rendering, h === null) if (a) yo(c, !1);
        else {
          if (Nt !== 0 || e !== null && (e.flags & 128) !== 0) for (e = t.child; e !== null; ) {
            if (h = yl(e), h !== null) {
              for (t.flags |= 128, yo(c, !1), a = h.updateQueue, a !== null && (t.updateQueue = a, t.flags |= 4), t.subtreeFlags = 0, a = n, n = t.child; n !== null; ) c = n, e = a, c.flags &= 14680066, h = c.alternate, h === null ? (c.childLanes = 0, c.lanes = e, c.child = null, c.subtreeFlags = 0, c.memoizedProps = null, c.memoizedState = null, c.updateQueue = null, c.dependencies = null, c.stateNode = null) : (c.childLanes = h.childLanes, c.lanes = h.lanes, c.child = h.child, c.subtreeFlags = 0, c.deletions = null, c.memoizedProps = h.memoizedProps, c.memoizedState = h.memoizedState, c.updateQueue = h.updateQueue, c.type = h.type, e = h.dependencies, c.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
              return lt(yt, yt.current & 1 | 2), t.child;
            }
            e = e.sibling;
          }
          c.tail !== null && wt() > xa && (t.flags |= 128, a = !0, yo(c, !1), t.lanes = 4194304);
        }
        else {
          if (!a) if (e = yl(h), e !== null) {
            if (t.flags |= 128, a = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), yo(c, !0), c.tail === null && c.tailMode === "hidden" && !h.alternate && !ft) return Ht(t), null;
          } else 2 * wt() - c.renderingStartTime > xa && n !== 1073741824 && (t.flags |= 128, a = !0, yo(c, !1), t.lanes = 4194304);
          c.isBackwards ? (h.sibling = t.child, t.child = h) : (n = c.last, n !== null ? n.sibling = h : t.child = h, c.last = h);
        }
        return c.tail !== null ? (t = c.tail, c.rendering = t, c.tail = t.sibling, c.renderingStartTime = wt(), t.sibling = null, n = yt.current, lt(yt, a ? n & 1 | 2 : n & 1), t) : (Ht(t), null);
      case 22:
      case 23:
        return js(), a = t.memoizedState !== null, e !== null && e.memoizedState !== null !== a && (t.flags |= 8192), a && (t.mode & 1) !== 0 ? (pn & 1073741824) !== 0 && (Ht(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Ht(t), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(l(156, t.tag));
  }
  function Gh(e, t) {
    switch (Zi(t), t.tag) {
      case 1:
        return nn(t.type) && ol(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 3:
        return Sa(), ct(tn), ct(jt), ds(), e = t.flags, (e & 65536) !== 0 && (e & 128) === 0 ? (t.flags = e & -65537 | 128, t) : null;
      case 5:
        return us(t), null;
      case 13:
        if (ct(yt), e = t.memoizedState, e !== null && e.dehydrated !== null) {
          if (t.alternate === null) throw Error(l(340));
          ga();
        }
        return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 19:
        return ct(yt), null;
      case 4:
        return Sa(), null;
      case 10:
        return as(t.type._context), null;
      case 22:
      case 23:
        return js(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var xl = !1, qt = !1, Xh = typeof WeakSet == "function" ? WeakSet : Set, Ee = null;
  function wa(e, t) {
    var n = e.ref;
    if (n !== null) if (typeof n == "function") try {
      n(null);
    } catch (a) {
      Et(e, t, a);
    }
    else n.current = null;
  }
  function Ns(e, t, n) {
    try {
      n();
    } catch (a) {
      Et(e, t, a);
    }
  }
  var Pf = !1;
  function Zh(e, t) {
    if (ji = Ho, e = cd(), Mi(e)) {
      if ("selectionStart" in e) var n = { start: e.selectionStart, end: e.selectionEnd };
      else e: {
        n = (n = e.ownerDocument) && n.defaultView || window;
        var a = n.getSelection && n.getSelection();
        if (a && a.rangeCount !== 0) {
          n = a.anchorNode;
          var s = a.anchorOffset, c = a.focusNode;
          a = a.focusOffset;
          try {
            n.nodeType, c.nodeType;
          } catch {
            n = null;
            break e;
          }
          var h = 0, T = -1, z = -1, J = 0, le = 0, fe = e, oe = null;
          t: for (; ; ) {
            for (var be; fe !== n || s !== 0 && fe.nodeType !== 3 || (T = h + s), fe !== c || a !== 0 && fe.nodeType !== 3 || (z = h + a), fe.nodeType === 3 && (h += fe.nodeValue.length), (be = fe.firstChild) !== null; )
              oe = fe, fe = be;
            for (; ; ) {
              if (fe === e) break t;
              if (oe === n && ++J === s && (T = h), oe === c && ++le === a && (z = h), (be = fe.nextSibling) !== null) break;
              fe = oe, oe = fe.parentNode;
            }
            fe = be;
          }
          n = T === -1 || z === -1 ? null : { start: T, end: z };
        } else n = null;
      }
      n = n || { start: 0, end: 0 };
    } else n = null;
    for ($i = { focusedElem: e, selectionRange: n }, Ho = !1, Ee = t; Ee !== null; ) if (t = Ee, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, Ee = e;
    else for (; Ee !== null; ) {
      t = Ee;
      try {
        var Se = t.alternate;
        if ((t.flags & 1024) !== 0) switch (t.tag) {
          case 0:
          case 11:
          case 15:
            break;
          case 1:
            if (Se !== null) {
              var we = Se.memoizedProps, kt = Se.memoizedState, G = t.stateNode, B = G.getSnapshotBeforeUpdate(t.elementType === t.type ? we : Ln(t.type, we), kt);
              G.__reactInternalSnapshotBeforeUpdate = B;
            }
            break;
          case 3:
            var X = t.stateNode.containerInfo;
            X.nodeType === 1 ? X.textContent = "" : X.nodeType === 9 && X.documentElement && X.removeChild(X.documentElement);
            break;
          case 5:
          case 6:
          case 4:
          case 17:
            break;
          default:
            throw Error(l(163));
        }
      } catch (pe) {
        Et(t, t.return, pe);
      }
      if (e = t.sibling, e !== null) {
        e.return = t.return, Ee = e;
        break;
      }
      Ee = t.return;
    }
    return Se = Pf, Pf = !1, Se;
  }
  function go(e, t, n) {
    var a = t.updateQueue;
    if (a = a !== null ? a.lastEffect : null, a !== null) {
      var s = a = a.next;
      do {
        if ((s.tag & e) === e) {
          var c = s.destroy;
          s.destroy = void 0, c !== void 0 && Ns(t, n, c);
        }
        s = s.next;
      } while (s !== a);
    }
  }
  function Il(e, t) {
    if (t = t.updateQueue, t = t !== null ? t.lastEffect : null, t !== null) {
      var n = t = t.next;
      do {
        if ((n.tag & e) === e) {
          var a = n.create;
          n.destroy = a();
        }
        n = n.next;
      } while (n !== t);
    }
  }
  function Ts(e) {
    var t = e.ref;
    if (t !== null) {
      var n = e.stateNode;
      e.tag, e = n, typeof t == "function" ? t(e) : t.current = e;
    }
  }
  function Af(e) {
    var t = e.alternate;
    t !== null && (e.alternate = null, Af(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[zn], delete t[oo], delete t[Wi], delete t[Ah], delete t[Mh])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
  }
  function Mf(e) {
    return e.tag === 5 || e.tag === 3 || e.tag === 4;
  }
  function zf(e) {
    e: for (; ; ) {
      for (; e.sibling === null; ) {
        if (e.return === null || Mf(e.return)) return null;
        e = e.return;
      }
      for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
        if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
        e.child.return = e, e = e.child;
      }
      if (!(e.flags & 2)) return e.stateNode;
    }
  }
  function Ps(e, t, n) {
    var a = e.tag;
    if (a === 5 || a === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = rl));
    else if (a !== 4 && (e = e.child, e !== null)) for (Ps(e, t, n), e = e.sibling; e !== null; ) Ps(e, t, n), e = e.sibling;
  }
  function As(e, t, n) {
    var a = e.tag;
    if (a === 5 || a === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
    else if (a !== 4 && (e = e.child, e !== null)) for (As(e, t, n), e = e.sibling; e !== null; ) As(e, t, n), e = e.sibling;
  }
  var Bt = null, Rn = !1;
  function Sr(e, t, n) {
    for (n = n.child; n !== null; ) Of(e, t, n), n = n.sibling;
  }
  function Of(e, t, n) {
    if (Mn && typeof Mn.onCommitFiberUnmount == "function") try {
      Mn.onCommitFiberUnmount(Bo, n);
    } catch {
    }
    switch (n.tag) {
      case 5:
        qt || wa(n, t);
      case 6:
        var a = Bt, s = Rn;
        Bt = null, Sr(e, t, n), Bt = a, Rn = s, Bt !== null && (Rn ? (e = Bt, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : Bt.removeChild(n.stateNode));
        break;
      case 18:
        Bt !== null && (Rn ? (e = Bt, n = n.stateNode, e.nodeType === 8 ? Qi(e.parentNode, n) : e.nodeType === 1 && Qi(e, n), Wa(e)) : Qi(Bt, n.stateNode));
        break;
      case 4:
        a = Bt, s = Rn, Bt = n.stateNode.containerInfo, Rn = !0, Sr(e, t, n), Bt = a, Rn = s;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!qt && (a = n.updateQueue, a !== null && (a = a.lastEffect, a !== null))) {
          s = a = a.next;
          do {
            var c = s, h = c.destroy;
            c = c.tag, h !== void 0 && ((c & 2) !== 0 || (c & 4) !== 0) && Ns(n, t, h), s = s.next;
          } while (s !== a);
        }
        Sr(e, t, n);
        break;
      case 1:
        if (!qt && (wa(n, t), a = n.stateNode, typeof a.componentWillUnmount == "function")) try {
          a.props = n.memoizedProps, a.state = n.memoizedState, a.componentWillUnmount();
        } catch (T) {
          Et(n, t, T);
        }
        Sr(e, t, n);
        break;
      case 21:
        Sr(e, t, n);
        break;
      case 22:
        n.mode & 1 ? (qt = (a = qt) || n.memoizedState !== null, Sr(e, t, n), qt = a) : Sr(e, t, n);
        break;
      default:
        Sr(e, t, n);
    }
  }
  function Vf(e) {
    var t = e.updateQueue;
    if (t !== null) {
      e.updateQueue = null;
      var n = e.stateNode;
      n === null && (n = e.stateNode = new Xh()), t.forEach(function(a) {
        var s = iy.bind(null, e, a);
        n.has(a) || (n.add(a), a.then(s, s));
      });
    }
  }
  function Nn(e, t) {
    var n = t.deletions;
    if (n !== null) for (var a = 0; a < n.length; a++) {
      var s = n[a];
      try {
        var c = e, h = t, T = h;
        e: for (; T !== null; ) {
          switch (T.tag) {
            case 5:
              Bt = T.stateNode, Rn = !1;
              break e;
            case 3:
              Bt = T.stateNode.containerInfo, Rn = !0;
              break e;
            case 4:
              Bt = T.stateNode.containerInfo, Rn = !0;
              break e;
          }
          T = T.return;
        }
        if (Bt === null) throw Error(l(160));
        Of(c, h, s), Bt = null, Rn = !1;
        var z = s.alternate;
        z !== null && (z.return = null), s.return = null;
      } catch (J) {
        Et(s, t, J);
      }
    }
    if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) Bf(t, e), t = t.sibling;
  }
  function Bf(e, t) {
    var n = e.alternate, a = e.flags;
    switch (e.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (Nn(t, e), Bn(e), a & 4) {
          try {
            go(3, e, e.return), Il(3, e);
          } catch (we) {
            Et(e, e.return, we);
          }
          try {
            go(5, e, e.return);
          } catch (we) {
            Et(e, e.return, we);
          }
        }
        break;
      case 1:
        Nn(t, e), Bn(e), a & 512 && n !== null && wa(n, n.return);
        break;
      case 5:
        if (Nn(t, e), Bn(e), a & 512 && n !== null && wa(n, n.return), e.flags & 32) {
          var s = e.stateNode;
          try {
            St(s, "");
          } catch (we) {
            Et(e, e.return, we);
          }
        }
        if (a & 4 && (s = e.stateNode, s != null)) {
          var c = e.memoizedProps, h = n !== null ? n.memoizedProps : c, T = e.type, z = e.updateQueue;
          if (e.updateQueue = null, z !== null) try {
            T === "input" && c.type === "radio" && c.name != null && Ce(s, c), wn(T, h);
            var J = wn(T, c);
            for (h = 0; h < z.length; h += 2) {
              var le = z[h], fe = z[h + 1];
              le === "style" ? ot(s, fe) : le === "dangerouslySetInnerHTML" ? Xe(s, fe) : le === "children" ? St(s, fe) : D(s, le, fe, J);
            }
            switch (T) {
              case "input":
                Ae(s, c);
                break;
              case "textarea":
                st(s, c);
                break;
              case "select":
                var oe = s._wrapperState.wasMultiple;
                s._wrapperState.wasMultiple = !!c.multiple;
                var be = c.value;
                be != null ? Ke(s, !!c.multiple, be, !1) : oe !== !!c.multiple && (c.defaultValue != null ? Ke(
                  s,
                  !!c.multiple,
                  c.defaultValue,
                  !0
                ) : Ke(s, !!c.multiple, c.multiple ? [] : "", !1));
            }
            s[oo] = c;
          } catch (we) {
            Et(e, e.return, we);
          }
        }
        break;
      case 6:
        if (Nn(t, e), Bn(e), a & 4) {
          if (e.stateNode === null) throw Error(l(162));
          s = e.stateNode, c = e.memoizedProps;
          try {
            s.nodeValue = c;
          } catch (we) {
            Et(e, e.return, we);
          }
        }
        break;
      case 3:
        if (Nn(t, e), Bn(e), a & 4 && n !== null && n.memoizedState.isDehydrated) try {
          Wa(t.containerInfo);
        } catch (we) {
          Et(e, e.return, we);
        }
        break;
      case 4:
        Nn(t, e), Bn(e);
        break;
      case 13:
        Nn(t, e), Bn(e), s = e.child, s.flags & 8192 && (c = s.memoizedState !== null, s.stateNode.isHidden = c, !c || s.alternate !== null && s.alternate.memoizedState !== null || (Os = wt())), a & 4 && Vf(e);
        break;
      case 22:
        if (le = n !== null && n.memoizedState !== null, e.mode & 1 ? (qt = (J = qt) || le, Nn(t, e), qt = J) : Nn(t, e), Bn(e), a & 8192) {
          if (J = e.memoizedState !== null, (e.stateNode.isHidden = J) && !le && (e.mode & 1) !== 0) for (Ee = e, le = e.child; le !== null; ) {
            for (fe = Ee = le; Ee !== null; ) {
              switch (oe = Ee, be = oe.child, oe.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  go(4, oe, oe.return);
                  break;
                case 1:
                  wa(oe, oe.return);
                  var Se = oe.stateNode;
                  if (typeof Se.componentWillUnmount == "function") {
                    a = oe, n = oe.return;
                    try {
                      t = a, Se.props = t.memoizedProps, Se.state = t.memoizedState, Se.componentWillUnmount();
                    } catch (we) {
                      Et(a, n, we);
                    }
                  }
                  break;
                case 5:
                  wa(oe, oe.return);
                  break;
                case 22:
                  if (oe.memoizedState !== null) {
                    Kf(fe);
                    continue;
                  }
              }
              be !== null ? (be.return = oe, Ee = be) : Kf(fe);
            }
            le = le.sibling;
          }
          e: for (le = null, fe = e; ; ) {
            if (fe.tag === 5) {
              if (le === null) {
                le = fe;
                try {
                  s = fe.stateNode, J ? (c = s.style, typeof c.setProperty == "function" ? c.setProperty("display", "none", "important") : c.display = "none") : (T = fe.stateNode, z = fe.memoizedProps.style, h = z != null && z.hasOwnProperty("display") ? z.display : null, T.style.display = he("display", h));
                } catch (we) {
                  Et(e, e.return, we);
                }
              }
            } else if (fe.tag === 6) {
              if (le === null) try {
                fe.stateNode.nodeValue = J ? "" : fe.memoizedProps;
              } catch (we) {
                Et(e, e.return, we);
              }
            } else if ((fe.tag !== 22 && fe.tag !== 23 || fe.memoizedState === null || fe === e) && fe.child !== null) {
              fe.child.return = fe, fe = fe.child;
              continue;
            }
            if (fe === e) break e;
            for (; fe.sibling === null; ) {
              if (fe.return === null || fe.return === e) break e;
              le === fe && (le = null), fe = fe.return;
            }
            le === fe && (le = null), fe.sibling.return = fe.return, fe = fe.sibling;
          }
        }
        break;
      case 19:
        Nn(t, e), Bn(e), a & 4 && Vf(e);
        break;
      case 21:
        break;
      default:
        Nn(
          t,
          e
        ), Bn(e);
    }
  }
  function Bn(e) {
    var t = e.flags;
    if (t & 2) {
      try {
        e: {
          for (var n = e.return; n !== null; ) {
            if (Mf(n)) {
              var a = n;
              break e;
            }
            n = n.return;
          }
          throw Error(l(160));
        }
        switch (a.tag) {
          case 5:
            var s = a.stateNode;
            a.flags & 32 && (St(s, ""), a.flags &= -33);
            var c = zf(e);
            As(e, c, s);
            break;
          case 3:
          case 4:
            var h = a.stateNode.containerInfo, T = zf(e);
            Ps(e, T, h);
            break;
          default:
            throw Error(l(161));
        }
      } catch (z) {
        Et(e, e.return, z);
      }
      e.flags &= -3;
    }
    t & 4096 && (e.flags &= -4097);
  }
  function Jh(e, t, n) {
    Ee = e, Ff(e);
  }
  function Ff(e, t, n) {
    for (var a = (e.mode & 1) !== 0; Ee !== null; ) {
      var s = Ee, c = s.child;
      if (s.tag === 22 && a) {
        var h = s.memoizedState !== null || xl;
        if (!h) {
          var T = s.alternate, z = T !== null && T.memoizedState !== null || qt;
          T = xl;
          var J = qt;
          if (xl = h, (qt = z) && !J) for (Ee = s; Ee !== null; ) h = Ee, z = h.child, h.tag === 22 && h.memoizedState !== null ? jf(s) : z !== null ? (z.return = h, Ee = z) : jf(s);
          for (; c !== null; ) Ee = c, Ff(c), c = c.sibling;
          Ee = s, xl = T, qt = J;
        }
        Uf(e);
      } else (s.subtreeFlags & 8772) !== 0 && c !== null ? (c.return = s, Ee = c) : Uf(e);
    }
  }
  function Uf(e) {
    for (; Ee !== null; ) {
      var t = Ee;
      if ((t.flags & 8772) !== 0) {
        var n = t.alternate;
        try {
          if ((t.flags & 8772) !== 0) switch (t.tag) {
            case 0:
            case 11:
            case 15:
              qt || Il(5, t);
              break;
            case 1:
              var a = t.stateNode;
              if (t.flags & 4 && !qt) if (n === null) a.componentDidMount();
              else {
                var s = t.elementType === t.type ? n.memoizedProps : Ln(t.type, n.memoizedProps);
                a.componentDidUpdate(s, n.memoizedState, a.__reactInternalSnapshotBeforeUpdate);
              }
              var c = t.updateQueue;
              c !== null && Ud(t, c, a);
              break;
            case 3:
              var h = t.updateQueue;
              if (h !== null) {
                if (n = null, t.child !== null) switch (t.child.tag) {
                  case 5:
                    n = t.child.stateNode;
                    break;
                  case 1:
                    n = t.child.stateNode;
                }
                Ud(t, h, n);
              }
              break;
            case 5:
              var T = t.stateNode;
              if (n === null && t.flags & 4) {
                n = T;
                var z = t.memoizedProps;
                switch (t.type) {
                  case "button":
                  case "input":
                  case "select":
                  case "textarea":
                    z.autoFocus && n.focus();
                    break;
                  case "img":
                    z.src && (n.src = z.src);
                }
              }
              break;
            case 6:
              break;
            case 4:
              break;
            case 12:
              break;
            case 13:
              if (t.memoizedState === null) {
                var J = t.alternate;
                if (J !== null) {
                  var le = J.memoizedState;
                  if (le !== null) {
                    var fe = le.dehydrated;
                    fe !== null && Wa(fe);
                  }
                }
              }
              break;
            case 19:
            case 17:
            case 21:
            case 22:
            case 23:
            case 25:
              break;
            default:
              throw Error(l(163));
          }
          qt || t.flags & 512 && Ts(t);
        } catch (oe) {
          Et(t, t.return, oe);
        }
      }
      if (t === e) {
        Ee = null;
        break;
      }
      if (n = t.sibling, n !== null) {
        n.return = t.return, Ee = n;
        break;
      }
      Ee = t.return;
    }
  }
  function Kf(e) {
    for (; Ee !== null; ) {
      var t = Ee;
      if (t === e) {
        Ee = null;
        break;
      }
      var n = t.sibling;
      if (n !== null) {
        n.return = t.return, Ee = n;
        break;
      }
      Ee = t.return;
    }
  }
  function jf(e) {
    for (; Ee !== null; ) {
      var t = Ee;
      try {
        switch (t.tag) {
          case 0:
          case 11:
          case 15:
            var n = t.return;
            try {
              Il(4, t);
            } catch (z) {
              Et(t, n, z);
            }
            break;
          case 1:
            var a = t.stateNode;
            if (typeof a.componentDidMount == "function") {
              var s = t.return;
              try {
                a.componentDidMount();
              } catch (z) {
                Et(t, s, z);
              }
            }
            var c = t.return;
            try {
              Ts(t);
            } catch (z) {
              Et(t, c, z);
            }
            break;
          case 5:
            var h = t.return;
            try {
              Ts(t);
            } catch (z) {
              Et(t, h, z);
            }
        }
      } catch (z) {
        Et(t, t.return, z);
      }
      if (t === e) {
        Ee = null;
        break;
      }
      var T = t.sibling;
      if (T !== null) {
        T.return = t.return, Ee = T;
        break;
      }
      Ee = t.return;
    }
  }
  var ey = Math.ceil, Dl = x.ReactCurrentDispatcher, Ms = x.ReactCurrentOwner, En = x.ReactCurrentBatchConfig, We = 0, Pt = null, Dt = null, Ft = 0, pn = 0, ka = yr(0), Nt = 0, vo = null, Wr = 0, _l = 0, zs = 0, bo = null, an = null, Os = 0, xa = 1 / 0, er = null, Ll = !1, Vs = null, Cr = null, Rl = !1, wr = null, Nl = 0, Eo = 0, Bs = null, Tl = -1, Pl = 0;
  function Xt() {
    return (We & 6) !== 0 ? wt() : Tl !== -1 ? Tl : Tl = wt();
  }
  function kr(e) {
    return (e.mode & 1) === 0 ? 1 : (We & 2) !== 0 && Ft !== 0 ? Ft & -Ft : Oh.transition !== null ? (Pl === 0 && (Pl = Mc()), Pl) : (e = et, e !== 0 || (e = window.event, e = e === void 0 ? 16 : $c(e.type)), e);
  }
  function Tn(e, t, n, a) {
    if (50 < Eo) throw Eo = 0, Bs = null, Error(l(185));
    ja(e, n, a), ((We & 2) === 0 || e !== Pt) && (e === Pt && ((We & 2) === 0 && (_l |= n), Nt === 4 && xr(e, Ft)), on(e, a), n === 1 && We === 0 && (t.mode & 1) === 0 && (xa = wt() + 500, il && vr()));
  }
  function on(e, t) {
    var n = e.callbackNode;
    Om(e, t);
    var a = Ko(e, e === Pt ? Ft : 0);
    if (a === 0) n !== null && Tc(n), e.callbackNode = null, e.callbackPriority = 0;
    else if (t = a & -a, e.callbackPriority !== t) {
      if (n != null && Tc(n), t === 1) e.tag === 0 ? zh(Hf.bind(null, e)) : Ld(Hf.bind(null, e)), Th(function() {
        (We & 6) === 0 && vr();
      }), n = null;
      else {
        switch (zc(a)) {
          case 1:
            n = vi;
            break;
          case 4:
            n = Pc;
            break;
          case 16:
            n = Vo;
            break;
          case 536870912:
            n = Ac;
            break;
          default:
            n = Vo;
        }
        n = Jf(n, $f.bind(null, e));
      }
      e.callbackPriority = t, e.callbackNode = n;
    }
  }
  function $f(e, t) {
    if (Tl = -1, Pl = 0, (We & 6) !== 0) throw Error(l(327));
    var n = e.callbackNode;
    if (Ia() && e.callbackNode !== n) return null;
    var a = Ko(e, e === Pt ? Ft : 0);
    if (a === 0) return null;
    if ((a & 30) !== 0 || (a & e.expiredLanes) !== 0 || t) t = Al(e, a);
    else {
      t = a;
      var s = We;
      We |= 2;
      var c = Qf();
      (Pt !== e || Ft !== t) && (er = null, xa = wt() + 500, Gr(e, t));
      do
        try {
          ry();
          break;
        } catch (T) {
          qf(e, T);
        }
      while (!0);
      rs(), Dl.current = c, We = s, Dt !== null ? t = 0 : (Pt = null, Ft = 0, t = Nt);
    }
    if (t !== 0) {
      if (t === 2 && (s = bi(e), s !== 0 && (a = s, t = Fs(e, s))), t === 1) throw n = vo, Gr(e, 0), xr(e, a), on(e, wt()), n;
      if (t === 6) xr(e, a);
      else {
        if (s = e.current.alternate, (a & 30) === 0 && !ty(s) && (t = Al(e, a), t === 2 && (c = bi(e), c !== 0 && (a = c, t = Fs(e, c))), t === 1)) throw n = vo, Gr(e, 0), xr(e, a), on(e, wt()), n;
        switch (e.finishedWork = s, e.finishedLanes = a, t) {
          case 0:
          case 1:
            throw Error(l(345));
          case 2:
            Xr(e, an, er);
            break;
          case 3:
            if (xr(e, a), (a & 130023424) === a && (t = Os + 500 - wt(), 10 < t)) {
              if (Ko(e, 0) !== 0) break;
              if (s = e.suspendedLanes, (s & a) !== a) {
                Xt(), e.pingedLanes |= e.suspendedLanes & s;
                break;
              }
              e.timeoutHandle = qi(Xr.bind(null, e, an, er), t);
              break;
            }
            Xr(e, an, er);
            break;
          case 4:
            if (xr(e, a), (a & 4194240) === a) break;
            for (t = e.eventTimes, s = -1; 0 < a; ) {
              var h = 31 - In(a);
              c = 1 << h, h = t[h], h > s && (s = h), a &= ~c;
            }
            if (a = s, a = wt() - a, a = (120 > a ? 120 : 480 > a ? 480 : 1080 > a ? 1080 : 1920 > a ? 1920 : 3e3 > a ? 3e3 : 4320 > a ? 4320 : 1960 * ey(a / 1960)) - a, 10 < a) {
              e.timeoutHandle = qi(Xr.bind(null, e, an, er), a);
              break;
            }
            Xr(e, an, er);
            break;
          case 5:
            Xr(e, an, er);
            break;
          default:
            throw Error(l(329));
        }
      }
    }
    return on(e, wt()), e.callbackNode === n ? $f.bind(null, e) : null;
  }
  function Fs(e, t) {
    var n = bo;
    return e.current.memoizedState.isDehydrated && (Gr(e, t).flags |= 256), e = Al(e, t), e !== 2 && (t = an, an = n, t !== null && Us(t)), e;
  }
  function Us(e) {
    an === null ? an = e : an.push.apply(an, e);
  }
  function ty(e) {
    for (var t = e; ; ) {
      if (t.flags & 16384) {
        var n = t.updateQueue;
        if (n !== null && (n = n.stores, n !== null)) for (var a = 0; a < n.length; a++) {
          var s = n[a], c = s.getSnapshot;
          s = s.value;
          try {
            if (!Dn(c(), s)) return !1;
          } catch {
            return !1;
          }
        }
      }
      if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
      else {
        if (t === e) break;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === e) return !0;
          t = t.return;
        }
        t.sibling.return = t.return, t = t.sibling;
      }
    }
    return !0;
  }
  function xr(e, t) {
    for (t &= ~zs, t &= ~_l, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
      var n = 31 - In(t), a = 1 << n;
      e[n] = -1, t &= ~a;
    }
  }
  function Hf(e) {
    if ((We & 6) !== 0) throw Error(l(327));
    Ia();
    var t = Ko(e, 0);
    if ((t & 1) === 0) return on(e, wt()), null;
    var n = Al(e, t);
    if (e.tag !== 0 && n === 2) {
      var a = bi(e);
      a !== 0 && (t = a, n = Fs(e, a));
    }
    if (n === 1) throw n = vo, Gr(e, 0), xr(e, t), on(e, wt()), n;
    if (n === 6) throw Error(l(345));
    return e.finishedWork = e.current.alternate, e.finishedLanes = t, Xr(e, an, er), on(e, wt()), null;
  }
  function Ks(e, t) {
    var n = We;
    We |= 1;
    try {
      return e(t);
    } finally {
      We = n, We === 0 && (xa = wt() + 500, il && vr());
    }
  }
  function Yr(e) {
    wr !== null && wr.tag === 0 && (We & 6) === 0 && Ia();
    var t = We;
    We |= 1;
    var n = En.transition, a = et;
    try {
      if (En.transition = null, et = 1, e) return e();
    } finally {
      et = a, En.transition = n, We = t, (We & 6) === 0 && vr();
    }
  }
  function js() {
    pn = ka.current, ct(ka);
  }
  function Gr(e, t) {
    e.finishedWork = null, e.finishedLanes = 0;
    var n = e.timeoutHandle;
    if (n !== -1 && (e.timeoutHandle = -1, Nh(n)), Dt !== null) for (n = Dt.return; n !== null; ) {
      var a = n;
      switch (Zi(a), a.tag) {
        case 1:
          a = a.type.childContextTypes, a != null && ol();
          break;
        case 3:
          Sa(), ct(tn), ct(jt), ds();
          break;
        case 5:
          us(a);
          break;
        case 4:
          Sa();
          break;
        case 13:
          ct(yt);
          break;
        case 19:
          ct(yt);
          break;
        case 10:
          as(a.type._context);
          break;
        case 22:
        case 23:
          js();
      }
      n = n.return;
    }
    if (Pt = e, Dt = e = Ir(e.current, null), Ft = pn = t, Nt = 0, vo = null, zs = _l = Wr = 0, an = bo = null, Hr !== null) {
      for (t = 0; t < Hr.length; t++) if (n = Hr[t], a = n.interleaved, a !== null) {
        n.interleaved = null;
        var s = a.next, c = n.pending;
        if (c !== null) {
          var h = c.next;
          c.next = s, a.next = h;
        }
        n.pending = a;
      }
      Hr = null;
    }
    return e;
  }
  function qf(e, t) {
    do {
      var n = Dt;
      try {
        if (rs(), gl.current = Sl, vl) {
          for (var a = gt.memoizedState; a !== null; ) {
            var s = a.queue;
            s !== null && (s.pending = null), a = a.next;
          }
          vl = !1;
        }
        if (Qr = 0, Tt = Rt = gt = null, fo = !1, po = 0, Ms.current = null, n === null || n.return === null) {
          Nt = 1, vo = t, Dt = null;
          break;
        }
        e: {
          var c = e, h = n.return, T = n, z = t;
          if (t = Ft, T.flags |= 32768, z !== null && typeof z == "object" && typeof z.then == "function") {
            var J = z, le = T, fe = le.tag;
            if ((le.mode & 1) === 0 && (fe === 0 || fe === 11 || fe === 15)) {
              var oe = le.alternate;
              oe ? (le.updateQueue = oe.updateQueue, le.memoizedState = oe.memoizedState, le.lanes = oe.lanes) : (le.updateQueue = null, le.memoizedState = null);
            }
            var be = gf(h);
            if (be !== null) {
              be.flags &= -257, vf(be, h, T, c, t), be.mode & 1 && yf(c, J, t), t = be, z = J;
              var Se = t.updateQueue;
              if (Se === null) {
                var we = /* @__PURE__ */ new Set();
                we.add(z), t.updateQueue = we;
              } else Se.add(z);
              break e;
            } else {
              if ((t & 1) === 0) {
                yf(c, J, t), $s();
                break e;
              }
              z = Error(l(426));
            }
          } else if (ft && T.mode & 1) {
            var kt = gf(h);
            if (kt !== null) {
              (kt.flags & 65536) === 0 && (kt.flags |= 256), vf(kt, h, T, c, t), ts(Ca(z, T));
              break e;
            }
          }
          c = z = Ca(z, T), Nt !== 4 && (Nt = 2), bo === null ? bo = [c] : bo.push(c), c = h;
          do {
            switch (c.tag) {
              case 3:
                c.flags |= 65536, t &= -t, c.lanes |= t;
                var G = mf(c, z, t);
                Fd(c, G);
                break e;
              case 1:
                T = z;
                var B = c.type, X = c.stateNode;
                if ((c.flags & 128) === 0 && (typeof B.getDerivedStateFromError == "function" || X !== null && typeof X.componentDidCatch == "function" && (Cr === null || !Cr.has(X)))) {
                  c.flags |= 65536, t &= -t, c.lanes |= t;
                  var pe = hf(c, T, t);
                  Fd(c, pe);
                  break e;
                }
            }
            c = c.return;
          } while (c !== null);
        }
        Yf(n);
      } catch (xe) {
        t = xe, Dt === n && n !== null && (Dt = n = n.return);
        continue;
      }
      break;
    } while (!0);
  }
  function Qf() {
    var e = Dl.current;
    return Dl.current = Sl, e === null ? Sl : e;
  }
  function $s() {
    (Nt === 0 || Nt === 3 || Nt === 2) && (Nt = 4), Pt === null || (Wr & 268435455) === 0 && (_l & 268435455) === 0 || xr(Pt, Ft);
  }
  function Al(e, t) {
    var n = We;
    We |= 2;
    var a = Qf();
    (Pt !== e || Ft !== t) && (er = null, Gr(e, t));
    do
      try {
        ny();
        break;
      } catch (s) {
        qf(e, s);
      }
    while (!0);
    if (rs(), We = n, Dl.current = a, Dt !== null) throw Error(l(261));
    return Pt = null, Ft = 0, Nt;
  }
  function ny() {
    for (; Dt !== null; ) Wf(Dt);
  }
  function ry() {
    for (; Dt !== null && !_m(); ) Wf(Dt);
  }
  function Wf(e) {
    var t = Zf(e.alternate, e, pn);
    e.memoizedProps = e.pendingProps, t === null ? Yf(e) : Dt = t, Ms.current = null;
  }
  function Yf(e) {
    var t = e;
    do {
      var n = t.alternate;
      if (e = t.return, (t.flags & 32768) === 0) {
        if (n = Yh(n, t, pn), n !== null) {
          Dt = n;
          return;
        }
      } else {
        if (n = Gh(n, t), n !== null) {
          n.flags &= 32767, Dt = n;
          return;
        }
        if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
        else {
          Nt = 6, Dt = null;
          return;
        }
      }
      if (t = t.sibling, t !== null) {
        Dt = t;
        return;
      }
      Dt = t = e;
    } while (t !== null);
    Nt === 0 && (Nt = 5);
  }
  function Xr(e, t, n) {
    var a = et, s = En.transition;
    try {
      En.transition = null, et = 1, ay(e, t, n, a);
    } finally {
      En.transition = s, et = a;
    }
    return null;
  }
  function ay(e, t, n, a) {
    do
      Ia();
    while (wr !== null);
    if ((We & 6) !== 0) throw Error(l(327));
    n = e.finishedWork;
    var s = e.finishedLanes;
    if (n === null) return null;
    if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(l(177));
    e.callbackNode = null, e.callbackPriority = 0;
    var c = n.lanes | n.childLanes;
    if (Vm(e, c), e === Pt && (Dt = Pt = null, Ft = 0), (n.subtreeFlags & 2064) === 0 && (n.flags & 2064) === 0 || Rl || (Rl = !0, Jf(Vo, function() {
      return Ia(), null;
    })), c = (n.flags & 15990) !== 0, (n.subtreeFlags & 15990) !== 0 || c) {
      c = En.transition, En.transition = null;
      var h = et;
      et = 1;
      var T = We;
      We |= 4, Ms.current = null, Zh(e, n), Bf(n, e), kh($i), Ho = !!ji, $i = ji = null, e.current = n, Jh(n), Lm(), We = T, et = h, En.transition = c;
    } else e.current = n;
    if (Rl && (Rl = !1, wr = e, Nl = s), c = e.pendingLanes, c === 0 && (Cr = null), Tm(n.stateNode), on(e, wt()), t !== null) for (a = e.onRecoverableError, n = 0; n < t.length; n++) s = t[n], a(s.value, { componentStack: s.stack, digest: s.digest });
    if (Ll) throw Ll = !1, e = Vs, Vs = null, e;
    return (Nl & 1) !== 0 && e.tag !== 0 && Ia(), c = e.pendingLanes, (c & 1) !== 0 ? e === Bs ? Eo++ : (Eo = 0, Bs = e) : Eo = 0, vr(), null;
  }
  function Ia() {
    if (wr !== null) {
      var e = zc(Nl), t = En.transition, n = et;
      try {
        if (En.transition = null, et = 16 > e ? 16 : e, wr === null) var a = !1;
        else {
          if (e = wr, wr = null, Nl = 0, (We & 6) !== 0) throw Error(l(331));
          var s = We;
          for (We |= 4, Ee = e.current; Ee !== null; ) {
            var c = Ee, h = c.child;
            if ((Ee.flags & 16) !== 0) {
              var T = c.deletions;
              if (T !== null) {
                for (var z = 0; z < T.length; z++) {
                  var J = T[z];
                  for (Ee = J; Ee !== null; ) {
                    var le = Ee;
                    switch (le.tag) {
                      case 0:
                      case 11:
                      case 15:
                        go(8, le, c);
                    }
                    var fe = le.child;
                    if (fe !== null) fe.return = le, Ee = fe;
                    else for (; Ee !== null; ) {
                      le = Ee;
                      var oe = le.sibling, be = le.return;
                      if (Af(le), le === J) {
                        Ee = null;
                        break;
                      }
                      if (oe !== null) {
                        oe.return = be, Ee = oe;
                        break;
                      }
                      Ee = be;
                    }
                  }
                }
                var Se = c.alternate;
                if (Se !== null) {
                  var we = Se.child;
                  if (we !== null) {
                    Se.child = null;
                    do {
                      var kt = we.sibling;
                      we.sibling = null, we = kt;
                    } while (we !== null);
                  }
                }
                Ee = c;
              }
            }
            if ((c.subtreeFlags & 2064) !== 0 && h !== null) h.return = c, Ee = h;
            else e: for (; Ee !== null; ) {
              if (c = Ee, (c.flags & 2048) !== 0) switch (c.tag) {
                case 0:
                case 11:
                case 15:
                  go(9, c, c.return);
              }
              var G = c.sibling;
              if (G !== null) {
                G.return = c.return, Ee = G;
                break e;
              }
              Ee = c.return;
            }
          }
          var B = e.current;
          for (Ee = B; Ee !== null; ) {
            h = Ee;
            var X = h.child;
            if ((h.subtreeFlags & 2064) !== 0 && X !== null) X.return = h, Ee = X;
            else e: for (h = B; Ee !== null; ) {
              if (T = Ee, (T.flags & 2048) !== 0) try {
                switch (T.tag) {
                  case 0:
                  case 11:
                  case 15:
                    Il(9, T);
                }
              } catch (xe) {
                Et(T, T.return, xe);
              }
              if (T === h) {
                Ee = null;
                break e;
              }
              var pe = T.sibling;
              if (pe !== null) {
                pe.return = T.return, Ee = pe;
                break e;
              }
              Ee = T.return;
            }
          }
          if (We = s, vr(), Mn && typeof Mn.onPostCommitFiberRoot == "function") try {
            Mn.onPostCommitFiberRoot(Bo, e);
          } catch {
          }
          a = !0;
        }
        return a;
      } finally {
        et = n, En.transition = t;
      }
    }
    return !1;
  }
  function Gf(e, t, n) {
    t = Ca(n, t), t = mf(e, t, 1), e = Er(e, t, 1), t = Xt(), e !== null && (ja(e, 1, t), on(e, t));
  }
  function Et(e, t, n) {
    if (e.tag === 3) Gf(e, e, n);
    else for (; t !== null; ) {
      if (t.tag === 3) {
        Gf(t, e, n);
        break;
      } else if (t.tag === 1) {
        var a = t.stateNode;
        if (typeof t.type.getDerivedStateFromError == "function" || typeof a.componentDidCatch == "function" && (Cr === null || !Cr.has(a))) {
          e = Ca(n, e), e = hf(t, e, 1), t = Er(t, e, 1), e = Xt(), t !== null && (ja(t, 1, e), on(t, e));
          break;
        }
      }
      t = t.return;
    }
  }
  function oy(e, t, n) {
    var a = e.pingCache;
    a !== null && a.delete(t), t = Xt(), e.pingedLanes |= e.suspendedLanes & n, Pt === e && (Ft & n) === n && (Nt === 4 || Nt === 3 && (Ft & 130023424) === Ft && 500 > wt() - Os ? Gr(e, 0) : zs |= n), on(e, t);
  }
  function Xf(e, t) {
    t === 0 && ((e.mode & 1) === 0 ? t = 1 : (t = Uo, Uo <<= 1, (Uo & 130023424) === 0 && (Uo = 4194304)));
    var n = Xt();
    e = Xn(e, t), e !== null && (ja(e, t, n), on(e, n));
  }
  function ly(e) {
    var t = e.memoizedState, n = 0;
    t !== null && (n = t.retryLane), Xf(e, n);
  }
  function iy(e, t) {
    var n = 0;
    switch (e.tag) {
      case 13:
        var a = e.stateNode, s = e.memoizedState;
        s !== null && (n = s.retryLane);
        break;
      case 19:
        a = e.stateNode;
        break;
      default:
        throw Error(l(314));
    }
    a !== null && a.delete(t), Xf(e, n);
  }
  var Zf;
  Zf = function(e, t, n) {
    if (e !== null) if (e.memoizedProps !== t.pendingProps || tn.current) rn = !0;
    else {
      if ((e.lanes & n) === 0 && (t.flags & 128) === 0) return rn = !1, Wh(e, t, n);
      rn = (e.flags & 131072) !== 0;
    }
    else rn = !1, ft && (t.flags & 1048576) !== 0 && Rd(t, ul, t.index);
    switch (t.lanes = 0, t.tag) {
      case 2:
        var a = t.type;
        kl(e, t), e = t.pendingProps;
        var s = ma(t, jt.current);
        Ea(t, n), s = ms(null, t, a, e, s, n);
        var c = hs();
        return t.flags |= 1, typeof s == "object" && s !== null && typeof s.render == "function" && s.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, nn(a) ? (c = !0, ll(t)) : c = !1, t.memoizedState = s.state !== null && s.state !== void 0 ? s.state : null, is(t), s.updater = Cl, t.stateNode = s, s._reactInternals = t, Ss(t, a, e, n), t = xs(null, t, a, !0, c, n)) : (t.tag = 0, ft && c && Xi(t), Gt(null, t, s, n), t = t.child), t;
      case 16:
        a = t.elementType;
        e: {
          switch (kl(e, t), e = t.pendingProps, s = a._init, a = s(a._payload), t.type = a, s = t.tag = uy(a), e = Ln(a, e), s) {
            case 0:
              t = ks(null, t, a, e, n);
              break e;
            case 1:
              t = kf(null, t, a, e, n);
              break e;
            case 11:
              t = bf(null, t, a, e, n);
              break e;
            case 14:
              t = Ef(null, t, a, Ln(a.type, e), n);
              break e;
          }
          throw Error(l(
            306,
            a,
            ""
          ));
        }
        return t;
      case 0:
        return a = t.type, s = t.pendingProps, s = t.elementType === a ? s : Ln(a, s), ks(e, t, a, s, n);
      case 1:
        return a = t.type, s = t.pendingProps, s = t.elementType === a ? s : Ln(a, s), kf(e, t, a, s, n);
      case 3:
        e: {
          if (xf(t), e === null) throw Error(l(387));
          a = t.pendingProps, c = t.memoizedState, s = c.element, Bd(e, t), hl(t, a, null, n);
          var h = t.memoizedState;
          if (a = h.element, c.isDehydrated) if (c = { element: a, isDehydrated: !1, cache: h.cache, pendingSuspenseBoundaries: h.pendingSuspenseBoundaries, transitions: h.transitions }, t.updateQueue.baseState = c, t.memoizedState = c, t.flags & 256) {
            s = Ca(Error(l(423)), t), t = If(e, t, a, n, s);
            break e;
          } else if (a !== s) {
            s = Ca(Error(l(424)), t), t = If(e, t, a, n, s);
            break e;
          } else for (fn = hr(t.stateNode.containerInfo.firstChild), dn = t, ft = !0, _n = null, n = Od(t, null, a, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
          else {
            if (ga(), a === s) {
              t = Jn(e, t, n);
              break e;
            }
            Gt(e, t, a, n);
          }
          t = t.child;
        }
        return t;
      case 5:
        return Kd(t), e === null && es(t), a = t.type, s = t.pendingProps, c = e !== null ? e.memoizedProps : null, h = s.children, Hi(a, s) ? h = null : c !== null && Hi(a, c) && (t.flags |= 32), wf(e, t), Gt(e, t, h, n), t.child;
      case 6:
        return e === null && es(t), null;
      case 13:
        return Df(e, t, n);
      case 4:
        return ss(t, t.stateNode.containerInfo), a = t.pendingProps, e === null ? t.child = va(t, null, a, n) : Gt(e, t, a, n), t.child;
      case 11:
        return a = t.type, s = t.pendingProps, s = t.elementType === a ? s : Ln(a, s), bf(e, t, a, s, n);
      case 7:
        return Gt(e, t, t.pendingProps, n), t.child;
      case 8:
        return Gt(e, t, t.pendingProps.children, n), t.child;
      case 12:
        return Gt(e, t, t.pendingProps.children, n), t.child;
      case 10:
        e: {
          if (a = t.type._context, s = t.pendingProps, c = t.memoizedProps, h = s.value, lt(fl, a._currentValue), a._currentValue = h, c !== null) if (Dn(c.value, h)) {
            if (c.children === s.children && !tn.current) {
              t = Jn(e, t, n);
              break e;
            }
          } else for (c = t.child, c !== null && (c.return = t); c !== null; ) {
            var T = c.dependencies;
            if (T !== null) {
              h = c.child;
              for (var z = T.firstContext; z !== null; ) {
                if (z.context === a) {
                  if (c.tag === 1) {
                    z = Zn(-1, n & -n), z.tag = 2;
                    var J = c.updateQueue;
                    if (J !== null) {
                      J = J.shared;
                      var le = J.pending;
                      le === null ? z.next = z : (z.next = le.next, le.next = z), J.pending = z;
                    }
                  }
                  c.lanes |= n, z = c.alternate, z !== null && (z.lanes |= n), os(
                    c.return,
                    n,
                    t
                  ), T.lanes |= n;
                  break;
                }
                z = z.next;
              }
            } else if (c.tag === 10) h = c.type === t.type ? null : c.child;
            else if (c.tag === 18) {
              if (h = c.return, h === null) throw Error(l(341));
              h.lanes |= n, T = h.alternate, T !== null && (T.lanes |= n), os(h, n, t), h = c.sibling;
            } else h = c.child;
            if (h !== null) h.return = c;
            else for (h = c; h !== null; ) {
              if (h === t) {
                h = null;
                break;
              }
              if (c = h.sibling, c !== null) {
                c.return = h.return, h = c;
                break;
              }
              h = h.return;
            }
            c = h;
          }
          Gt(e, t, s.children, n), t = t.child;
        }
        return t;
      case 9:
        return s = t.type, a = t.pendingProps.children, Ea(t, n), s = vn(s), a = a(s), t.flags |= 1, Gt(e, t, a, n), t.child;
      case 14:
        return a = t.type, s = Ln(a, t.pendingProps), s = Ln(a.type, s), Ef(e, t, a, s, n);
      case 15:
        return Sf(e, t, t.type, t.pendingProps, n);
      case 17:
        return a = t.type, s = t.pendingProps, s = t.elementType === a ? s : Ln(a, s), kl(e, t), t.tag = 1, nn(a) ? (e = !0, ll(t)) : e = !1, Ea(t, n), ff(t, a, s), Ss(t, a, s, n), xs(null, t, a, !0, e, n);
      case 19:
        return Lf(e, t, n);
      case 22:
        return Cf(e, t, n);
    }
    throw Error(l(156, t.tag));
  };
  function Jf(e, t) {
    return Nc(e, t);
  }
  function sy(e, t, n, a) {
    this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = a, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Sn(e, t, n, a) {
    return new sy(e, t, n, a);
  }
  function Hs(e) {
    return e = e.prototype, !(!e || !e.isReactComponent);
  }
  function uy(e) {
    if (typeof e == "function") return Hs(e) ? 1 : 0;
    if (e != null) {
      if (e = e.$$typeof, e === q) return 11;
      if (e === j) return 14;
    }
    return 2;
  }
  function Ir(e, t) {
    var n = e.alternate;
    return n === null ? (n = Sn(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
  }
  function Ml(e, t, n, a, s, c) {
    var h = 2;
    if (a = e, typeof e == "function") Hs(e) && (h = 1);
    else if (typeof e == "string") h = 5;
    else e: switch (e) {
      case O:
        return Zr(n.children, s, c, t);
      case A:
        h = 8, s |= 8;
        break;
      case Q:
        return e = Sn(12, n, t, s | 2), e.elementType = Q, e.lanes = c, e;
      case H:
        return e = Sn(13, n, t, s), e.elementType = H, e.lanes = c, e;
      case ee:
        return e = Sn(19, n, t, s), e.elementType = ee, e.lanes = c, e;
      case U:
        return zl(n, s, c, t);
      default:
        if (typeof e == "object" && e !== null) switch (e.$$typeof) {
          case F:
            h = 10;
            break e;
          case W:
            h = 9;
            break e;
          case q:
            h = 11;
            break e;
          case j:
            h = 14;
            break e;
          case $:
            h = 16, a = null;
            break e;
        }
        throw Error(l(130, e == null ? e : typeof e, ""));
    }
    return t = Sn(h, n, t, s), t.elementType = e, t.type = a, t.lanes = c, t;
  }
  function Zr(e, t, n, a) {
    return e = Sn(7, e, a, t), e.lanes = n, e;
  }
  function zl(e, t, n, a) {
    return e = Sn(22, e, a, t), e.elementType = U, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
  }
  function qs(e, t, n) {
    return e = Sn(6, e, null, t), e.lanes = n, e;
  }
  function Qs(e, t, n) {
    return t = Sn(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
  }
  function cy(e, t, n, a, s) {
    this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = Ei(0), this.expirationTimes = Ei(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = Ei(0), this.identifierPrefix = a, this.onRecoverableError = s, this.mutableSourceEagerHydrationData = null;
  }
  function Ws(e, t, n, a, s, c, h, T, z) {
    return e = new cy(e, t, n, T, z), t === 1 ? (t = 1, c === !0 && (t |= 8)) : t = 0, c = Sn(3, null, null, t), e.current = c, c.stateNode = e, c.memoizedState = { element: a, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, is(c), e;
  }
  function dy(e, t, n) {
    var a = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: P, key: a == null ? null : "" + a, children: e, containerInfo: t, implementation: n };
  }
  function ep(e) {
    if (!e) return gr;
    e = e._reactInternals;
    e: {
      if (ve(e) !== e || e.tag !== 1) throw Error(l(170));
      var t = e;
      do {
        switch (t.tag) {
          case 3:
            t = t.stateNode.context;
            break e;
          case 1:
            if (nn(t.type)) {
              t = t.stateNode.__reactInternalMemoizedMergedChildContext;
              break e;
            }
        }
        t = t.return;
      } while (t !== null);
      throw Error(l(171));
    }
    if (e.tag === 1) {
      var n = e.type;
      if (nn(n)) return Dd(e, n, t);
    }
    return t;
  }
  function tp(e, t, n, a, s, c, h, T, z) {
    return e = Ws(n, a, !0, e, s, c, h, T, z), e.context = ep(null), n = e.current, a = Xt(), s = kr(n), c = Zn(a, s), c.callback = t ?? null, Er(n, c, s), e.current.lanes = s, ja(e, s, a), on(e, a), e;
  }
  function Ol(e, t, n, a) {
    var s = t.current, c = Xt(), h = kr(s);
    return n = ep(n), t.context === null ? t.context = n : t.pendingContext = n, t = Zn(c, h), t.payload = { element: e }, a = a === void 0 ? null : a, a !== null && (t.callback = a), e = Er(s, t, h), e !== null && (Tn(e, s, h, c), ml(e, s, h)), h;
  }
  function Vl(e) {
    return e = e.current, e.child ? (e.child.tag === 5, e.child.stateNode) : null;
  }
  function np(e, t) {
    if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
      var n = e.retryLane;
      e.retryLane = n !== 0 && n < t ? n : t;
    }
  }
  function Ys(e, t) {
    np(e, t), (e = e.alternate) && np(e, t);
  }
  function fy() {
    return null;
  }
  var rp = typeof reportError == "function" ? reportError : function(e) {
    console.error(e);
  };
  function Gs(e) {
    this._internalRoot = e;
  }
  Bl.prototype.render = Gs.prototype.render = function(e) {
    var t = this._internalRoot;
    if (t === null) throw Error(l(409));
    Ol(e, t, null, null);
  }, Bl.prototype.unmount = Gs.prototype.unmount = function() {
    var e = this._internalRoot;
    if (e !== null) {
      this._internalRoot = null;
      var t = e.containerInfo;
      Yr(function() {
        Ol(null, e, null, null);
      }), t[Qn] = null;
    }
  };
  function Bl(e) {
    this._internalRoot = e;
  }
  Bl.prototype.unstable_scheduleHydration = function(e) {
    if (e) {
      var t = Bc();
      e = { blockedOn: null, target: e, priority: t };
      for (var n = 0; n < fr.length && t !== 0 && t < fr[n].priority; n++) ;
      fr.splice(n, 0, e), n === 0 && Kc(e);
    }
  };
  function Xs(e) {
    return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
  }
  function Fl(e) {
    return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
  }
  function ap() {
  }
  function py(e, t, n, a, s) {
    if (s) {
      if (typeof a == "function") {
        var c = a;
        a = function() {
          var J = Vl(h);
          c.call(J);
        };
      }
      var h = tp(t, a, e, 0, null, !1, !1, "", ap);
      return e._reactRootContainer = h, e[Qn] = h.current, ro(e.nodeType === 8 ? e.parentNode : e), Yr(), h;
    }
    for (; s = e.lastChild; ) e.removeChild(s);
    if (typeof a == "function") {
      var T = a;
      a = function() {
        var J = Vl(z);
        T.call(J);
      };
    }
    var z = Ws(e, 0, !1, null, null, !1, !1, "", ap);
    return e._reactRootContainer = z, e[Qn] = z.current, ro(e.nodeType === 8 ? e.parentNode : e), Yr(function() {
      Ol(t, z, n, a);
    }), z;
  }
  function Ul(e, t, n, a, s) {
    var c = n._reactRootContainer;
    if (c) {
      var h = c;
      if (typeof s == "function") {
        var T = s;
        s = function() {
          var z = Vl(h);
          T.call(z);
        };
      }
      Ol(t, h, e, s);
    } else h = py(n, t, e, s, a);
    return Vl(h);
  }
  Oc = function(e) {
    switch (e.tag) {
      case 3:
        var t = e.stateNode;
        if (t.current.memoizedState.isDehydrated) {
          var n = Ka(t.pendingLanes);
          n !== 0 && (Si(t, n | 1), on(t, wt()), (We & 6) === 0 && (xa = wt() + 500, vr()));
        }
        break;
      case 13:
        Yr(function() {
          var a = Xn(e, 1);
          if (a !== null) {
            var s = Xt();
            Tn(a, e, 1, s);
          }
        }), Ys(e, 1);
    }
  }, Ci = function(e) {
    if (e.tag === 13) {
      var t = Xn(e, 134217728);
      if (t !== null) {
        var n = Xt();
        Tn(t, e, 134217728, n);
      }
      Ys(e, 134217728);
    }
  }, Vc = function(e) {
    if (e.tag === 13) {
      var t = kr(e), n = Xn(e, t);
      if (n !== null) {
        var a = Xt();
        Tn(n, e, t, a);
      }
      Ys(e, t);
    }
  }, Bc = function() {
    return et;
  }, Fc = function(e, t) {
    var n = et;
    try {
      return et = e, t();
    } finally {
      et = n;
    }
  }, Hn = function(e, t, n) {
    switch (t) {
      case "input":
        if (Ae(e, n), t = n.name, n.type === "radio" && t != null) {
          for (n = e; n.parentNode; ) n = n.parentNode;
          for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
            var a = n[t];
            if (a !== e && a.form === e.form) {
              var s = al(a);
              if (!s) throw Error(l(90));
              re(a), Ae(a, s);
            }
          }
        }
        break;
      case "textarea":
        st(e, n);
        break;
      case "select":
        t = n.value, t != null && Ke(e, !!n.multiple, t, !1);
    }
  }, Be = Ks, dt = Yr;
  var my = { usingClientEntryPoint: !1, Events: [lo, fa, al, rt, kn, Ks] }, So = { findFiberByHostInstance: Ur, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, hy = { bundleType: So.bundleType, version: So.version, rendererPackageName: So.rendererPackageName, rendererConfig: So.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: x.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
    return e = gi(e), e === null ? null : e.stateNode;
  }, findFiberByHostInstance: So.findFiberByHostInstance || fy, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Kl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Kl.isDisabled && Kl.supportsFiber) try {
      Bo = Kl.inject(hy), Mn = Kl;
    } catch {
    }
  }
  return ln.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = my, ln.createPortal = function(e, t) {
    var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!Xs(t)) throw Error(l(200));
    return dy(e, t, null, n);
  }, ln.createRoot = function(e, t) {
    if (!Xs(e)) throw Error(l(299));
    var n = !1, a = "", s = rp;
    return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (a = t.identifierPrefix), t.onRecoverableError !== void 0 && (s = t.onRecoverableError)), t = Ws(e, 1, !1, null, null, n, !1, a, s), e[Qn] = t.current, ro(e.nodeType === 8 ? e.parentNode : e), new Gs(t);
  }, ln.findDOMNode = function(e) {
    if (e == null) return null;
    if (e.nodeType === 1) return e;
    var t = e._reactInternals;
    if (t === void 0)
      throw typeof e.render == "function" ? Error(l(188)) : (e = Object.keys(e).join(","), Error(l(268, e)));
    return e = gi(t), e = e === null ? null : e.stateNode, e;
  }, ln.flushSync = function(e) {
    return Yr(e);
  }, ln.hydrate = function(e, t, n) {
    if (!Fl(t)) throw Error(l(200));
    return Ul(null, e, t, !0, n);
  }, ln.hydrateRoot = function(e, t, n) {
    if (!Xs(e)) throw Error(l(405));
    var a = n != null && n.hydratedSources || null, s = !1, c = "", h = rp;
    if (n != null && (n.unstable_strictMode === !0 && (s = !0), n.identifierPrefix !== void 0 && (c = n.identifierPrefix), n.onRecoverableError !== void 0 && (h = n.onRecoverableError)), t = tp(t, null, e, 1, n ?? null, s, !1, c, h), e[Qn] = t.current, ro(e), a) for (e = 0; e < a.length; e++) n = a[e], s = n._getVersion, s = s(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, s] : t.mutableSourceEagerHydrationData.push(
      n,
      s
    );
    return new Bl(t);
  }, ln.render = function(e, t, n) {
    if (!Fl(t)) throw Error(l(200));
    return Ul(null, e, t, !1, n);
  }, ln.unmountComponentAtNode = function(e) {
    if (!Fl(e)) throw Error(l(40));
    return e._reactRootContainer ? (Yr(function() {
      Ul(null, null, e, !1, function() {
        e._reactRootContainer = null, e[Qn] = null;
      });
    }), !0) : !1;
  }, ln.unstable_batchedUpdates = Ks, ln.unstable_renderSubtreeIntoContainer = function(e, t, n, a) {
    if (!Fl(n)) throw Error(l(200));
    if (e == null || e._reactInternals === void 0) throw Error(l(38));
    return Ul(e, t, n, !1, a);
  }, ln.version = "18.3.1-next-f1338f8080-20240426", ln;
}
var cp;
function _p() {
  if (cp) return Js.exports;
  cp = 1;
  function r() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(r);
      } catch (o) {
        console.error(o);
      }
  }
  return r(), Js.exports = Sy(), Js.exports;
}
var Lp = _p(), jl = {}, dp;
function Cy() {
  if (dp) return jl;
  dp = 1;
  var r = _p();
  return jl.createRoot = r.createRoot, jl.hydrateRoot = r.hydrateRoot, jl;
}
var Rp = Cy(), nu = { exports: {} }, Co = {};
var fp;
function wy() {
  if (fp) return Co;
  fp = 1;
  var r = Lu(), o = /* @__PURE__ */ Symbol.for("react.element"), l = /* @__PURE__ */ Symbol.for("react.fragment"), u = Object.prototype.hasOwnProperty, d = r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, f = { key: !0, ref: !0, __self: !0, __source: !0 };
  function p(m, g, v) {
    var E, C = {}, w = null, N = null;
    v !== void 0 && (w = "" + v), g.key !== void 0 && (w = "" + g.key), g.ref !== void 0 && (N = g.ref);
    for (E in g) u.call(g, E) && !f.hasOwnProperty(E) && (C[E] = g[E]);
    if (m && m.defaultProps) for (E in g = m.defaultProps, g) C[E] === void 0 && (C[E] = g[E]);
    return { $$typeof: o, type: m, key: w, ref: N, props: C, _owner: d.current };
  }
  return Co.Fragment = l, Co.jsx = p, Co.jsxs = p, Co;
}
var pp;
function ky() {
  return pp || (pp = 1, nu.exports = wy()), nu.exports;
}
var qe = ky();
i.createContext(null);
i.createContext({
  themeId: "default",
  version: "0",
  cacheKey: "default:0",
  lastChangedAt: 0
});
i.createContext(null);
const Pa = "idle";
function Nr(r) {
  return typeof r == "string" && r.length > 0;
}
function y(r, o, l = Pa) {
  if (!Nr(r) || !Nr(o))
    throw new Error("PRIMITIVE_SCOPE_ATTR_INVALID");
  return {
    "data-scope": r,
    "data-part": o,
    "data-state": Nr(l) ? l : Pa
  };
}
function mp(r) {
  return {
    type: r.type,
    scope: r.scope,
    part: r.part,
    state: r.state,
    disabled: r.disabled === !0,
    nativeEvent: r.nativeEvent || null
  };
}
function _r(r, o, l) {
  typeof r == "function" && r(o, l);
}
function hp(r) {
  return r === "Enter" || r === " ";
}
function xy({
  scope: r,
  part: o,
  state: l,
  disabled: u,
  onPress: d,
  onClick: f,
  onKeyDown: p,
  onPrimitiveEvent: m
}) {
  return {
    onClick: (E) => {
      const C = mp({
        type: "click",
        scope: r,
        part: o,
        state: l,
        disabled: u,
        nativeEvent: E
      });
      if (u) {
        E && typeof E.preventDefault == "function" && E.preventDefault(), _r(m, E, C);
        return;
      }
      _r(d, E, C), _r(m, E, C), _r(f, E, C);
    },
    onKeyDown: (E) => {
      const C = mp({
        type: "keydown",
        scope: r,
        part: o,
        state: l,
        disabled: u,
        nativeEvent: E
      });
      if (u) {
        E && typeof E.preventDefault == "function" && hp(E.key) && E.preventDefault(), _r(m, E, C), _r(p, E, C);
        return;
      }
      E && hp(E.key) && typeof d == "function" && d(E, C), _r(m, E, C), _r(p, E, C);
    }
  };
}
function Np(r = {}, o = {}) {
  const {
    scope: l = "primitive",
    defaultPart: u = "root",
    defaultState: d = Pa,
    defaultAs: f = "div"
  } = o, {
    as: p,
    part: m = u,
    state: g = d,
    disabled: v = !1,
    onPress: E,
    onClick: C,
    onKeyDown: w,
    onPrimitiveEvent: N,
    ...k
  } = r, S = Nr(p) ? p : f, b = Nr(g) ? g : Pa, _ = y(l, m, b), I = xy({
    scope: l,
    part: m,
    state: b,
    disabled: v,
    onPress: E,
    onClick: C,
    onKeyDown: w,
    onPrimitiveEvent: N
  });
  return {
    elementTag: S,
    scope: l,
    part: m,
    state: b,
    disabled: v,
    attributes: _,
    handlers: I,
    props: {
      ...k,
      ..._,
      "aria-disabled": v ? "true" : void 0,
      onClick: I.onClick,
      onKeyDown: I.onKeyDown
    }
  };
}
function Fa(r = {}) {
  const {
    scope: o,
    displayName: l,
    defaultAs: u = "div",
    defaultPart: d = "root",
    defaultState: f = Pa
  } = r;
  if (!Nr(o))
    throw new Error("PRIMITIVE_COMPONENT_SCOPE_INVALID");
  const p = i.forwardRef((m, g) => {
    const v = Np(m, {
      scope: o,
      defaultAs: u,
      defaultPart: d,
      defaultState: f
    });
    return i.createElement(v.elementTag, {
      ...v.props,
      ref: g
    });
  });
  return p.displayName = Nr(l) ? l : `Primitive(${o})`, p;
}
Fa({
  scope: "box",
  displayName: "Box",
  defaultAs: "div"
});
Fa({
  scope: "inline",
  displayName: "Inline",
  defaultAs: "div"
});
Fa({
  scope: "stack",
  displayName: "Stack",
  defaultAs: "div"
});
Fa({
  scope: "grid",
  displayName: "Grid",
  defaultAs: "div"
});
Fa({
  scope: "text",
  displayName: "Text",
  defaultAs: "span"
});
Fa({
  scope: "label",
  displayName: "Label",
  defaultAs: "label"
});
const Iy = i.forwardRef((r, o) => {
  const {
    tone: l = "neutral",
    live: u,
    ...d
  } = r || {}, f = Np(d, {
    scope: "helper-text",
    defaultAs: "p",
    defaultPart: "root",
    defaultState: Pa
  }), p = Nr(u) ? u : l === "error" ? "assertive" : "polite";
  return i.createElement(f.elementTag, {
    ...f.props,
    "data-tone": l,
    role: "status",
    "aria-live": p,
    ref: o
  });
});
Iy.displayName = "HelperText";
function Ut(r) {
  const o = Na(r);
  return o === "Enter" || o === " ";
}
const Dy = Object.freeze({
  Esc: "Escape",
  Spacebar: " ",
  Space: " ",
  Up: "ArrowUp",
  Down: "ArrowDown",
  Left: "ArrowLeft",
  Right: "ArrowRight"
});
function Na(r) {
  const o = r && typeof r == "object" && "key" in r ? r.key : r, l = typeof o == "string" ? o : "";
  return Dy[l] || l;
}
function Ru(r = {}) {
  const o = {}, l = /* @__PURE__ */ new Map();
  for (const [u, d] of Object.entries(r)) {
    const f = [], p = Array.isArray(d) ? d : [d];
    for (const m of p) {
      const g = Na(m);
      g.length === 0 || f.includes(g) || (f.push(g), l.set(g, u));
    }
    o[u] = Object.freeze(f);
  }
  return Object.freeze({
    actions: Object.freeze(o),
    getAction(u) {
      return l.get(Na(u)) || null;
    },
    hasAction(u) {
      return Object.hasOwn(o, u);
    },
    hasKey(u) {
      return l.has(Na(u));
    },
    entries() {
      return Object.entries(o).flatMap(
        ([u, d]) => d.map((f) => ({ action: u, key: f }))
      );
    }
  });
}
const yp = Ru({
  activate: ["Enter", " "],
  dismiss: "Escape",
  navigate: "Tab",
  next: ["ArrowDown", "ArrowRight"],
  previous: ["ArrowUp", "ArrowLeft"],
  first: "Home",
  last: "End"
}), _y = Ru({
  next: "ArrowDown",
  previous: "ArrowUp",
  first: "Home",
  last: "End"
}), Ly = Ru({
  next: "ArrowRight",
  previous: "ArrowLeft",
  first: "Home",
  last: "End"
});
function Ry(r, o = yp) {
  return o && typeof o.getAction == "function" ? o.getAction(r) : o instanceof Map ? o.get(Na(r)) || null : yp.getAction(r);
}
function Re(r = {}) {
  const {
    live: o = "polite",
    atomic: l = !0
  } = r;
  return {
    "aria-live": o,
    "aria-atomic": l ? "true" : "false",
    role: "status"
  };
}
function Tp(r) {
  if (!Array.isArray(r))
    return "";
  const o = [], l = /* @__PURE__ */ new Set();
  for (const u of r)
    typeof u != "string" || u.length === 0 || l.has(u) || (l.add(u), o.push(u));
  return o.join(" ");
}
function Po(r) {
  const o = arguments.length > 1 && arguments[1] && typeof arguments[1] == "object" ? arguments[1] : {};
  return !(!r || typeof r != "object" || Ny(r) || Pp(r) < 0 && o.includeNegativeTabIndex !== !0 || typeof r.focus != "function");
}
function du(r, o) {
  if (!(!r || typeof r != "object")) {
    if (typeof r.getAttribute == "function") {
      const l = r.getAttribute(o);
      return l === null ? void 0 : l;
    }
    return r[o];
  }
}
function Pp(r) {
  if (typeof r?.tabIndex == "number")
    return r.tabIndex;
  const o = du(r, "tabindex");
  if (typeof o == "string" && o.length > 0) {
    const l = Number(o);
    return Number.isFinite(l) ? l : -1;
  }
  return 0;
}
function Ny(r) {
  return !!(r.disabled === !0 || r.hidden === !0 || r.inert === !0 || du(r, "aria-disabled") === "true" || du(r, "aria-hidden") === "true" || r.style && (r.style.display === "none" || r.style.visibility === "hidden"));
}
const Ty = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "details",
  "[tabindex]",
  "[contenteditable='true']"
].join(",");
function Wl(r, o = {}) {
  if (!r)
    return [];
  const l = (u) => Po(u, {
    includeNegativeTabIndex: o.includeNegativeTabIndex === !0 || o.tabbable === !1
  }) && (o.tabbable === !1 || Pp(u) >= 0);
  if (Array.isArray(r))
    return r.filter((u) => l(u));
  if (typeof r.querySelectorAll == "function") {
    const u = [...r.querySelectorAll(Ty)];
    return (o.includeRoot === !0 ? [r, ...u] : u).filter((f) => l(f));
  }
  return Array.isArray(r.children) ? r.children.filter((u) => l(u)) : [];
}
function Py(r, o = {}) {
  const {
    fromIndex: l = -1,
    direction: u = "next",
    loop: d = !0
  } = o;
  if (!Array.isArray(r) || r.length === 0)
    return -1;
  const f = r.length, p = u === "prev" ? -1 : 1;
  let m = l;
  for (let g = 0; g < f; g += 1) {
    if (m += p, d)
      m >= f && (m = 0), m < 0 && (m = f - 1);
    else if (m < 0 || m >= f)
      return -1;
    const v = r[m];
    if (Po(v))
      return v.focus(), m;
  }
  return -1;
}
function Nu(r) {
  return r?.ownerDocument ? r.ownerDocument : typeof document < "u" ? document : null;
}
function Ap(r) {
  const o = r?.activeElement ? r : Nu(r), l = r && !r.activeElement && Po(r, { includeNegativeTabIndex: !0 }) ? r : o?.activeElement || null;
  return Object.freeze({
    element: l,
    restore(u = {}) {
      return Mp(l, u);
    }
  });
}
function Mp(r, o = {}) {
  const l = [r, o.fallback].flat().filter(Boolean);
  for (const u of l)
    if (u.isConnected !== !1 && Po(u, { includeNegativeTabIndex: !0 }))
      return u.focus(o.focusOptions), u;
  return null;
}
function Ay(r, o = {}) {
  const l = Wl(r), u = Nu(r), d = o.current || o.event?.target || u?.activeElement || null, f = o.direction || (o.event?.shiftKey === !0 ? "prev" : "next");
  if (l.length === 0)
    return Po(r, { includeNegativeTabIndex: !0 }) ? r : null;
  const p = l.indexOf(d);
  return p < 0 ? f === "prev" ? l[l.length - 1] : l[0] : l.length === 1 ? l[0] : f === "prev" && p === 0 ? l[l.length - 1] : f !== "prev" && p === l.length - 1 ? l[0] : null;
}
function gp(r, o, l = {}) {
  if (Na(r) !== "Tab")
    return !1;
  const u = Ay(o, {
    event: r,
    direction: r?.shiftKey === !0 ? "prev" : "next",
    ...l
  });
  return u ? (r?.preventDefault?.(), u.focus(l.focusOptions), !0) : !1;
}
function vp(r, o = {}) {
  const l = o.restorePoint || Ap(r), u = (d) => {
    const f = Wl(r), p = d === "last" ? f[f.length - 1] : f[0];
    return Mp(p, {
      fallback: o.fallback,
      focusOptions: o.focusOptions
    });
  };
  return Object.freeze({
    root: r,
    restorePoint: l,
    getElements(d = {}) {
      return Wl(r, d);
    },
    focusFirst() {
      return u("first");
    },
    focusLast() {
      return u("last");
    },
    move(d = {}) {
      const f = Wl(r), p = Nu(r), m = d.current || p?.activeElement || null, g = f.indexOf(m);
      return Py(f, {
        fromIndex: g,
        direction: d.direction || "next",
        loop: d.loop !== !1
      });
    },
    trap(d, f = {}) {
      return gp(d, r, f);
    },
    restore(d = {}) {
      return l.restore(d);
    },
    handleKeyDown(d, f = {}) {
      return o.trap === !1 ? !1 : gp(d, r, f);
    }
  });
}
function My(r, o) {
  if (r && typeof r == "object") {
    if (r.id !== void 0 && r.id !== null)
      return String(r.id);
    if (r.value !== void 0 && r.value !== null)
      return String(r.value);
  }
  return String(o);
}
function fu(r, o = "disabled") {
  return !!(r && typeof r == "object" && r[o] === !0);
}
function ko(r, o, l = "next", u = !0, d = "disabled") {
  if (!Array.isArray(r) || r.length === 0)
    return -1;
  const f = l === "previous" || l === "prev" ? -1 : 1;
  let p = o;
  for (let m = 0; m < r.length; m += 1) {
    if (p += f, u)
      p >= r.length && (p = 0), p < 0 && (p = r.length - 1);
    else if (p < 0 || p >= r.length)
      return -1;
    if (!fu(r[p], d))
      return p;
  }
  return -1;
}
function zy(r, o, l, u = {}) {
  const d = u.orientation === "vertical" ? "vertical" : "horizontal", f = u.keyboardMap || (d === "vertical" ? _y : Ly), p = Ry(l, f), m = u.disabledKey || "disabled";
  return p === "first" ? ko(r, -1, "next", !0, m) : p === "last" ? ko(r, 0, "prev", !0, m) : p === "next" || p === "previous" ? ko(r, o, p, u.loop !== !1, m) : -1;
}
function Tu(r = [], o = {}) {
  const l = Array.isArray(r) ? r : [], u = o.disabledKey || "disabled", d = l.map((g, v) => My(g, v)), f = o.activeId ?? o.selectedId;
  let p = typeof o.activeIndex == "number" ? o.activeIndex : f != null ? d.indexOf(String(f)) : -1;
  (p < 0 || p >= l.length || fu(l[p], u)) && (p = ko(l, -1, "next", !0, u));
  const m = l.map((g, v) => {
    const E = fu(g, u), C = v === p && !E;
    return {
      item: g,
      id: d[v],
      index: v,
      disabled: E,
      active: C,
      tabIndex: E ? -1 : C ? 0 : -1
    };
  });
  return Object.freeze({
    activeIndex: p,
    activeId: p >= 0 ? d[p] : null,
    items: Object.freeze(m),
    getNextIndex(g = "next", v = {}) {
      return ko(
        l,
        v.fromIndex ?? p,
        g,
        v.loop ?? o.loop ?? !0,
        u
      );
    },
    getIndexByKey(g, v = {}) {
      return zy(l, p, g, {
        ...o,
        ...v
      });
    }
  });
}
function Pu(r, o = {}) {
  const l = r?.disabled === !0, u = r?.active === !0;
  return {
    tabIndex: l ? -1 : u ? 0 : -1,
    "data-active": String(u),
    "aria-disabled": l && o.includeAriaDisabled !== !1 ? "true" : void 0
  };
}
const Lr = Object.freeze([
  "idle",
  "hover",
  "focus",
  "active",
  "disabled",
  "loading",
  "error"
]), pu = Object.freeze({
  view: [
    "chips.comp.view.root.surface",
    "chips.comp.view.root.text.color",
    "chips.comp.view.header.surface",
    "chips.comp.view.title.color",
    "chips.comp.view.content.surface",
    "chips.comp.view.footer.surface",
    "chips.comp.view.focus.outline"
  ],
  box: [
    "chips.comp.box.root.surface",
    "chips.comp.box.root.border.color",
    "chips.comp.box.root.radius",
    "chips.comp.box.focus.outline"
  ],
  stack: [
    "chips.comp.stack.root.gap",
    "chips.comp.stack.root.surface",
    "chips.comp.stack.focus.outline"
  ],
  inline: [
    "chips.comp.inline.root.gap",
    "chips.comp.inline.root.surface",
    "chips.comp.inline.focus.outline"
  ],
  grid: [
    "chips.comp.grid.root.gap",
    "chips.comp.grid.root.surface",
    "chips.comp.grid.item.surface",
    "chips.comp.grid.focus.outline"
  ],
  section: [
    "chips.comp.section.root.surface",
    "chips.comp.section.header.surface",
    "chips.comp.section.title.color",
    "chips.comp.section.description.color",
    "chips.comp.section.content.surface",
    "chips.comp.section.footer.surface",
    "chips.comp.section.divider.color",
    "chips.comp.section.focus.outline"
  ],
  "scroll-view": [
    "chips.comp.scroll-view.root.surface",
    "chips.comp.scroll-view.viewport.surface",
    "chips.comp.scroll-view.scrollbar.thumb",
    "chips.comp.scroll-view.focus.outline"
  ],
  spacer: [
    "chips.comp.spacer.root.size",
    "chips.comp.spacer.root.surface"
  ],
  divider: [
    "chips.comp.divider.root.color",
    "chips.comp.divider.root.thickness",
    "chips.comp.divider.label.color"
  ],
  "split-view": [
    "chips.comp.split-view.root.surface",
    "chips.comp.split-view.primary.surface",
    "chips.comp.split-view.secondary.surface",
    "chips.comp.split-view.detail.surface",
    "chips.comp.split-view.divider.color",
    "chips.comp.split-view.focus.outline"
  ]
}), Oy = /* @__PURE__ */ new Set([
  "article",
  "aside",
  "div",
  "footer",
  "header",
  "main",
  "nav",
  "section",
  "span"
]), zp = /* @__PURE__ */ new Set(["start", "center", "end", "stretch", "baseline"]), Op = /* @__PURE__ */ new Set(["start", "center", "end", "between", "around", "evenly"]), Vy = /* @__PURE__ */ new Set(["vertical", "horizontal"]), By = /* @__PURE__ */ new Set(["vertical", "horizontal", "both", "auto", "scroll", "hidden"]), Fy = /* @__PURE__ */ new Set(["auto", "scroll", "hidden"]), Uy = /* @__PURE__ */ new Set(["horizontal", "vertical"]), Ky = /* @__PURE__ */ new Set(["two-column", "three-column", "sidebar-detail"]);
function _o(r) {
  return typeof r == "string" && r.trim().length > 0;
}
function lr(r, o = "div") {
  if (!_o(r))
    return o;
  const l = r.trim().toLowerCase();
  return Oy.has(l) ? l : o;
}
function rr(r, o, l) {
  return _o(r) && o.has(r) ? r : l;
}
function jy({ disabled: r, loading: o, error: l, active: u }) {
  return r ? "disabled" : o ? "loading" : l ? "error" : u ? "active" : "idle";
}
function $y(r) {
  return typeof r == "number" && Number.isFinite(r) ? `${r}px` : _o(r) ? r.trim() : void 0;
}
function Tr(r, o, l) {
  const u = $y(l);
  return u ? {
    ...r,
    [o]: u
  } : r;
}
function Hy(r, o) {
  const l = { ...r };
  for (const [u, d] of Object.entries(o))
    d != null && d !== "" && (l[u] = d);
  return l;
}
function Ar({ disabled: r = !1, loading: o = !1, error: l = null, active: u = !1 } = {}) {
  return jy({
    disabled: r,
    loading: o,
    error: l,
    active: u
  });
}
function Mr({ onStateChange: r, state: o, onFocus: l, onBlur: u }) {
  return {
    onFocus(d) {
      typeof r == "function" && r("focus"), typeof l == "function" && l(d);
    },
    onBlur(d) {
      typeof r == "function" && r(o), typeof u == "function" && u(d);
    }
  };
}
function zr(r, o, l) {
  if (!l)
    return null;
  const u = typeof l == "object" && typeof l.message == "string" ? l.message : String(l);
  return i.createElement(
    "span",
    {
      ...y(r, "status", o),
      role: "status",
      "aria-live": "assertive"
    },
    u
  );
}
function Vp({ ariaLabel: r, ariaLabelledBy: o, rest: l, title: u, titleId: d }) {
  const f = r || l["aria-label"], p = o || l["aria-labelledby"], m = l.id, g = _o(d) ? d.trim() : _o(m) && u ? `${m.trim()}-title` : void 0, v = typeof u == "string" && u.trim().length > 0 ? u.trim() : typeof u == "number" ? String(u) : void 0;
  return {
    titleId: g,
    ariaLabel: f || (!p && !g ? v : void 0),
    ariaLabelledBy: p || (u ? g : void 0)
  };
}
function Fn(r) {
  if (!Object.hasOwn(pu, r))
    throw new Error(`LAYOUT_COMPONENT_CONTRACT_TOKEN_MAP_MISSING:${r}`);
  return {
    ...{
      view: {
        component: "view",
        scope: "view",
        parts: ["root", "header", "title", "content", "footer", "status"],
        states: [...Lr]
      },
      box: {
        component: "box",
        scope: "box",
        parts: ["root", "status"],
        states: [...Lr]
      },
      stack: {
        component: "stack",
        scope: "stack",
        parts: ["root", "item", "status"],
        states: [...Lr]
      },
      inline: {
        component: "inline",
        scope: "inline",
        parts: ["root", "item", "status"],
        states: [...Lr]
      },
      grid: {
        component: "grid",
        scope: "grid",
        parts: ["root", "item", "status"],
        states: [...Lr]
      },
      section: {
        component: "section",
        scope: "section",
        parts: ["root", "header", "title", "description", "content", "footer", "status"],
        states: [...Lr]
      },
      "scroll-view": {
        component: "scroll-view",
        scope: "scroll-view",
        parts: ["root", "viewport", "content", "status"],
        states: [...Lr]
      },
      spacer: {
        component: "spacer",
        scope: "spacer",
        parts: ["root"],
        states: ["idle"]
      },
      divider: {
        component: "divider",
        scope: "divider",
        parts: ["root", "label"],
        states: ["idle"]
      },
      "split-view": {
        component: "split-view",
        scope: "split-view",
        parts: ["root", "primary", "secondary", "detail", "divider", "status"],
        states: [...Lr]
      }
    }[r],
    tokens: pu[r]
  };
}
const qy = i.forwardRef((r, o) => {
  const {
    as: l,
    title: u,
    titleKey: d,
    header: f,
    footer: p,
    children: m,
    titleId: g,
    disabled: v = !1,
    loading: E = !1,
    error: C = null,
    active: w = !1,
    ariaLabel: N,
    ariaLabelledBy: k,
    onStateChange: S,
    style: b,
    ..._
  } = r, I = Ar({
    disabled: v,
    loading: E,
    error: C,
    active: w
  }), D = Mr({
    onStateChange: S,
    state: I,
    onFocus: _.onFocus,
    onBlur: _.onBlur
  }), x = lr(l, "section"), R = Vp({
    ariaLabel: N,
    ariaLabelledBy: k,
    rest: _,
    title: u,
    titleId: g
  });
  return i.createElement(
    x,
    {
      ...y("view", "root", I),
      ..._,
      ...D,
      ref: o,
      role: _.role || "region",
      "aria-label": R.ariaLabel,
      "aria-labelledby": R.ariaLabelledBy,
      "aria-disabled": v || E ? "true" : void 0,
      "data-title-key": d,
      style: b
    },
    f || u ? i.createElement(
      "header",
      y("view", "header", I),
      f,
      u ? i.createElement(
        "h1",
        {
          ...y("view", "title", I),
          id: R.titleId
        },
        u
      ) : null
    ) : null,
    i.createElement(
      "div",
      y("view", "content", I),
      m
    ),
    p ? i.createElement(
      "footer",
      y("view", "footer", I),
      p
    ) : null,
    zr("view", I, C)
  );
});
qy.displayName = "ChipsView";
const Qy = i.forwardRef((r, o) => {
  const {
    as: l,
    children: u,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    active: m = !1,
    padding: g,
    radius: v,
    onStateChange: E,
    style: C,
    ...w
  } = r, N = Ar({
    disabled: d,
    loading: f,
    error: p,
    active: m
  }), k = Mr({
    onStateChange: E,
    state: N,
    onFocus: w.onFocus,
    onBlur: w.onBlur
  }), S = lr(l, "div"), b = Tr(
    Tr(C || {}, "--chips-box-padding", g),
    "--chips-box-radius",
    v
  );
  return i.createElement(
    S,
    {
      ...y("box", "root", N),
      ...w,
      ...k,
      ref: o,
      "aria-disabled": d || f ? "true" : void 0,
      style: b
    },
    u,
    zr("box", N, p)
  );
});
Qy.displayName = "ChipsBox";
function Au(r, o, l) {
  return i.Children.map(l, (u, d) => u == null || typeof u == "boolean" ? null : i.createElement(
    "div",
    {
      ...y(r, "item", o),
      key: u && typeof u == "object" && u.key != null ? u.key : d
    },
    u
  ));
}
const Wy = i.forwardRef((r, o) => {
  const {
    as: l,
    children: u,
    direction: d = "vertical",
    gap: f,
    align: p,
    justify: m,
    wrap: g = !1,
    disabled: v = !1,
    loading: E = !1,
    error: C = null,
    active: w = !1,
    onStateChange: N,
    style: k,
    ...S
  } = r, b = Ar({
    disabled: v,
    loading: E,
    error: C,
    active: w
  }), _ = Mr({
    onStateChange: N,
    state: b,
    onFocus: S.onFocus,
    onBlur: S.onBlur
  }), I = lr(l, "div"), D = Tr(k || {}, "--chips-stack-gap", f), x = rr(d, Vy, "vertical");
  return i.createElement(
    I,
    {
      ...y("stack", "root", b),
      ...S,
      ..._,
      ref: o,
      "data-direction": x,
      "data-align": rr(p, zp, void 0),
      "data-justify": rr(m, Op, void 0),
      "data-wrap": String(g === !0),
      "aria-disabled": v || E ? "true" : void 0,
      style: D
    },
    Au("stack", b, u),
    zr("stack", b, C)
  );
});
Wy.displayName = "ChipsStack";
const Yy = i.forwardRef((r, o) => {
  const {
    as: l,
    children: u,
    gap: d,
    align: f,
    justify: p,
    wrap: m = !0,
    disabled: g = !1,
    loading: v = !1,
    error: E = null,
    active: C = !1,
    onStateChange: w,
    style: N,
    ...k
  } = r, S = Ar({
    disabled: g,
    loading: v,
    error: E,
    active: C
  }), b = Mr({
    onStateChange: w,
    state: S,
    onFocus: k.onFocus,
    onBlur: k.onBlur
  }), _ = lr(l, "div"), I = Tr(N || {}, "--chips-inline-gap", d);
  return i.createElement(
    _,
    {
      ...y("inline", "root", S),
      ...k,
      ...b,
      ref: o,
      "data-align": rr(f, zp, void 0),
      "data-justify": rr(p, Op, void 0),
      "data-wrap": String(m !== !1),
      "aria-disabled": g || v ? "true" : void 0,
      style: I
    },
    Au("inline", S, u),
    zr("inline", S, E)
  );
});
Yy.displayName = "ChipsInline";
const Gy = i.forwardRef((r, o) => {
  const {
    as: l,
    children: u,
    columns: d,
    minItemSize: f,
    gap: p,
    disabled: m = !1,
    loading: g = !1,
    error: v = null,
    active: E = !1,
    onStateChange: C,
    style: w,
    ...N
  } = r, k = Ar({
    disabled: m,
    loading: g,
    error: v,
    active: E
  }), S = Mr({
    onStateChange: C,
    state: k,
    onFocus: N.onFocus,
    onBlur: N.onBlur
  }), b = lr(l, "div"), _ = Hy(
    Tr(
      Tr(w || {}, "--chips-grid-gap", p),
      "--chips-grid-min-item-size",
      f
    ),
    {
      "--chips-grid-columns": Number.isInteger(d) && d > 0 ? String(d) : void 0
    }
  );
  return i.createElement(
    b,
    {
      ...y("grid", "root", k),
      ...N,
      ...S,
      ref: o,
      "data-columns": Number.isInteger(d) && d > 0 ? String(d) : "auto",
      "aria-disabled": m || g ? "true" : void 0,
      style: _
    },
    Au("grid", k, u),
    zr("grid", k, v)
  );
});
Gy.displayName = "ChipsGrid";
const Xy = i.forwardRef((r, o) => {
  const {
    as: l,
    title: u,
    titleKey: d,
    description: f,
    footer: p,
    children: m,
    titleId: g,
    disabled: v = !1,
    loading: E = !1,
    error: C = null,
    active: w = !1,
    ariaLabel: N,
    ariaLabelledBy: k,
    onStateChange: S,
    style: b,
    ..._
  } = r, I = Ar({
    disabled: v,
    loading: E,
    error: C,
    active: w
  }), D = Mr({
    onStateChange: S,
    state: I,
    onFocus: _.onFocus,
    onBlur: _.onBlur
  }), x = lr(l, "section"), R = Vp({
    ariaLabel: N,
    ariaLabelledBy: k,
    rest: _,
    title: u,
    titleId: g
  });
  return i.createElement(
    x,
    {
      ...y("section", "root", I),
      ..._,
      ...D,
      ref: o,
      role: _.role || "region",
      "aria-label": R.ariaLabel,
      "aria-labelledby": R.ariaLabelledBy,
      "aria-disabled": v || E ? "true" : void 0,
      "data-title-key": d,
      style: b
    },
    u || f ? i.createElement(
      "header",
      y("section", "header", I),
      u ? i.createElement(
        "h2",
        {
          ...y("section", "title", I),
          id: R.titleId
        },
        u
      ) : null,
      f ? i.createElement(
        "p",
        y("section", "description", I),
        f
      ) : null
    ) : null,
    i.createElement(
      "div",
      y("section", "content", I),
      m
    ),
    p ? i.createElement(
      "footer",
      y("section", "footer", I),
      p
    ) : null,
    zr("section", I, C)
  );
});
Xy.displayName = "ChipsSection";
const Zy = i.forwardRef((r, o) => {
  const {
    as: l,
    children: u,
    axis: d = "vertical",
    maxBlockSize: f,
    disabled: p = !1,
    loading: m = !1,
    error: g = null,
    active: v = !1,
    ariaLabel: E,
    ariaLabelledBy: C,
    onStateChange: w,
    style: N,
    ...k
  } = r, S = Ar({
    disabled: p,
    loading: m,
    error: g,
    active: v
  }), b = Mr({
    onStateChange: w,
    state: S,
    onFocus: k.onFocus,
    onBlur: k.onBlur
  }), _ = lr(l, "div"), I = rr(d, By, "vertical"), D = rr(I, Fy, null) || "auto", x = Tr(N || {}, "--chips-scroll-view-max-block-size", f), R = E || k["aria-label"], P = C || k["aria-labelledby"];
  return i.createElement(
    _,
    {
      ...y("scroll-view", "root", S),
      ...k,
      ...b,
      ref: o,
      role: k.role || "region",
      "aria-label": R,
      "aria-labelledby": P,
      "aria-disabled": p || m ? "true" : void 0,
      "data-axis": I,
      style: x
    },
    i.createElement(
      "div",
      {
        ...y("scroll-view", "viewport", S),
        "data-overflow": D
      },
      i.createElement(
        "div",
        y("scroll-view", "content", S),
        u
      )
    ),
    zr("scroll-view", S, g)
  );
});
Zy.displayName = "ChipsScrollView";
const Jy = i.forwardRef((r, o) => {
  const {
    as: l,
    size: u,
    inline: d = !1,
    style: f,
    ...p
  } = r, m = lr(l, "div"), g = Tr(f || {}, "--chips-spacer-size", u);
  return i.createElement(m, {
    ...y("spacer", "root", "idle"),
    ...p,
    ref: o,
    "aria-hidden": "true",
    "data-inline": String(d === !0),
    style: g
  });
});
Jy.displayName = "ChipsSpacer";
const eg = i.forwardRef((r, o) => {
  const {
    as: l,
    orientation: u = "horizontal",
    label: d,
    decorative: f = !1,
    style: p,
    ...m
  } = r, g = lr(l, "div"), v = rr(u, Uy, "horizontal");
  return i.createElement(
    g,
    {
      ...y("divider", "root", "idle"),
      ...m,
      ref: o,
      role: f ? void 0 : "separator",
      "aria-hidden": f ? "true" : void 0,
      "aria-orientation": f ? void 0 : v,
      "data-orientation": v,
      style: p
    },
    d ? i.createElement(
      "span",
      y("divider", "label", "idle"),
      d
    ) : null
  );
});
eg.displayName = "ChipsDivider";
const tg = i.forwardRef((r, o) => {
  const {
    primary: l,
    secondary: u,
    detail: d,
    children: f,
    variant: p = "two-column",
    disabled: m = !1,
    loading: g = !1,
    error: v = null,
    active: E = !1,
    ariaLabel: C,
    ariaLabelledBy: w,
    onStateChange: N,
    style: k,
    ...S
  } = r, b = Ar({
    disabled: m,
    loading: g,
    error: v,
    active: E
  }), _ = Mr({
    onStateChange: N,
    state: b,
    onFocus: S.onFocus,
    onBlur: S.onBlur
  }), I = rr(p, Ky, "two-column"), D = C || S["aria-label"], x = w || S["aria-labelledby"];
  return i.createElement(
    "div",
    {
      ...y("split-view", "root", b),
      ...S,
      ..._,
      ref: o,
      role: S.role || "group",
      "aria-label": D,
      "aria-labelledby": x,
      "aria-disabled": m || g ? "true" : void 0,
      "data-variant": I,
      style: k
    },
    i.createElement(
      "div",
      y("split-view", "primary", b),
      l
    ),
    u !== void 0 ? i.createElement(
      i.Fragment,
      null,
      i.createElement("div", {
        ...y("split-view", "divider", b),
        "aria-hidden": "true"
      }),
      i.createElement(
        "div",
        y("split-view", "secondary", b),
        u
      )
    ) : null,
    i.createElement("div", {
      ...y("split-view", "divider", b),
      "aria-hidden": "true"
    }),
    i.createElement(
      "div",
      y("split-view", "detail", b),
      d || f
    ),
    zr("split-view", b, v)
  );
});
tg.displayName = "ChipsSplitView";
Fn("view"), Fn("box"), Fn("stack"), Fn("inline"), Fn("grid"), Fn("section"), Fn("scroll-view"), Fn("spacer"), Fn("divider"), Fn("split-view");
const ze = [
  "disabled",
  "loading",
  "error",
  "active",
  "focus",
  "hover",
  "idle"
], ng = {
  hovered: !1,
  focused: !1,
  active: !1
};
function Qe(r) {
  return typeof r == "string" && r.trim().length > 0;
}
function rg(r) {
  if (!Qe(r))
    throw new Error("ICON_DESCRIPTOR_INVALID:name");
  return r.trim().replace(/[\s-]+/g, "_");
}
function ag(r) {
  return r === "rounded" || r === "sharp" ? r : "outlined";
}
function og(r) {
  return r === 1 ? 1 : 0;
}
function ru(r, o) {
  return typeof r == "number" && Number.isFinite(r) ? r : o;
}
const lg = /* @__PURE__ */ new Set(["default", "muted", "accent", "danger", "disabled"]);
function Bp(r) {
  return lg.has(r) ? r : "default";
}
function ig(r = {}) {
  return {
    name: rg(r.name),
    style: ag(r.style),
    fill: og(r.fill),
    wght: ru(r.wght, 400),
    grad: ru(r.grad, 0),
    opsz: ru(r.opsz, 24),
    tone: Bp(r.tone),
    explicitAxes: {
      fill: r.fill === 0 || r.fill === 1,
      wght: typeof r.wght == "number" && Number.isFinite(r.wght),
      grad: typeof r.grad == "number" && Number.isFinite(r.grad),
      opsz: typeof r.opsz == "number" && Number.isFinite(r.opsz)
    },
    decorative: r.label ? !1 : r.decorative !== !1,
    label: Qe(r.label) ? r.label.trim() : void 0
  };
}
const sg = Object.freeze({
  "chevron-down": Object.freeze({ name: "keyboard_arrow_down" }),
  close: Object.freeze({ name: "close" }),
  expand: Object.freeze({ name: "add" }),
  collapse: Object.freeze({ name: "remove" }),
  calendar: Object.freeze({ name: "calendar_month" }),
  time: Object.freeze({ name: "schedule" }),
  search: Object.freeze({ name: "search" }),
  visibility: Object.freeze({ name: "visibility" }),
  "visibility-off": Object.freeze({ name: "visibility_off" })
});
function ug(r) {
  return Qe(r) ? sg[r] ?? null : null;
}
const cg = /* @__PURE__ */ new Set(["span", "p", "strong", "em", "small", "code", "div"]), dg = /* @__PURE__ */ new Set(["default", "muted", "accent", "error"]), fg = /* @__PURE__ */ new Set(["regular", "strong", "code"]), pg = /* @__PURE__ */ new Set(["neutral", "accent", "success", "warning", "error"]), mg = /* @__PURE__ */ new Set(["star", "heart"]), hg = /* @__PURE__ */ new Set(["circle", "rounded", "square"]), yg = /* @__PURE__ */ new Set(["cover", "contain", "fill", "none", "scale-down"]), gg = /* @__PURE__ */ new Set(["audio", "video", "generic"]), vg = /* @__PURE__ */ new Set(["cover", "contain", "fill", "none", "scale-down"]), Da = ["idle", "disabled", "loading", "error"];
function bg(r, o = "span") {
  return cg.has(r) ? r : o;
}
function Eg(r) {
  return dg.has(r) ? r : "default";
}
function Sg(r) {
  return fg.has(r) ? r : "regular";
}
function Fp(r) {
  return pg.has(r) ? r : "neutral";
}
function Cg(r) {
  return mg.has(r) ? r : "star";
}
function wg(r) {
  return hg.has(r) ? r : "circle";
}
function kg(r) {
  return yg.has(r) ? r : "cover";
}
function Up(r) {
  return Qe(r) ? r.trim() : "center";
}
function Gl(r) {
  if (typeof r == "number" && Number.isFinite(r) && r >= 0)
    return r;
  if (Qe(r))
    return r.trim();
}
function xg(r) {
  return gg.has(r) ? r : "generic";
}
function Ig(r) {
  return vg.has(r) ? r : "contain";
}
function Ze(r = {}) {
  const {
    value: o,
    key: l,
    params: u,
    fallback: d = "",
    i18n: f,
    onDiagnostic: p
  } = r;
  return Qe(l) ? vt({
    i18n: f,
    key: l,
    params: u,
    fallback: Qe(d) ? d : o,
    onDiagnostic: p
  }) : Qe(o) ? o.trim() : Qe(d) ? d.trim() : "";
}
function ta(r = {}) {
  const {
    children: o,
    value: l,
    key: u,
    i18n: d,
    params: f,
    fallback: p = "",
    onDiagnostic: m
  } = r;
  if (o !== void 0)
    return o;
  const g = typeof p == "string" ? p : typeof l == "string" ? l : "";
  return Qe(u) ? vt({
    i18n: d,
    key: u,
    params: f,
    fallback: g,
    onDiagnostic: m
  }) : l !== void 0 ? l : g;
}
function Dg(r, o) {
  if (typeof r != "number" || !Number.isFinite(r))
    return;
  const l = typeof o == "number" && Number.isFinite(o) && o > 0 ? o : 99;
  return r > l ? `${l}+` : String(r);
}
function _g(r = {}) {
  const { initials: o, name: l, fallback: u = "?" } = r;
  if (Qe(o))
    return o.trim().slice(0, 3).toUpperCase();
  if (Qe(l)) {
    const d = l.trim().split(/\s+/).filter(Boolean);
    return (d.length > 1 ? `${d[0][0] ?? ""}${d[d.length - 1][0] ?? ""}` : l.trim().slice(0, 2)).toUpperCase();
  }
  return u;
}
function La(r, o) {
  const l = typeof r == "number" ? r : Number(r);
  return Number.isFinite(l) ? l : o;
}
function ri(r, o, l) {
  return Math.min(Math.max(r, o), l);
}
function $l(r) {
  if (typeof r != "number" || !Number.isFinite(r))
    return 0;
  const o = String(r);
  if (o.includes("e-")) {
    const [, u] = o.split("e-");
    return Number.parseInt(u, 10) || 0;
  }
  const [, l = ""] = o.split(".");
  return l.length;
}
function Kp(r, o) {
  const l = 10 ** Math.min(Math.max(o, 0), 12);
  return Math.round((r + Number.EPSILON) * l) / l;
}
function ai(r = {}) {
  const o = La(r.min, 0), l = La(r.max, 100), u = l > o ? l : 100, d = La(r.step, 1), f = d > 0 ? d : 1, p = La(r.largeStep, f * 10), m = p > 0 ? p : f * 10, g = Math.max(
    $l(o),
    $l(u),
    $l(f),
    $l(m)
  );
  return {
    min: o,
    max: u,
    step: f,
    largeStep: m,
    precision: g
  };
}
function Lg(r, o) {
  const l = (r - o.min) / o.step;
  return Kp(o.min + Math.round(l) * o.step, o.precision);
}
function mu(r, o) {
  return Kp(ri(r, o.min, o.max), o.precision);
}
function Cn(r, o, l = {}) {
  if (r == null || r === "")
    return null;
  const u = typeof r == "number" ? r : Number(r);
  if (!Number.isFinite(u))
    return null;
  const d = mu(u, o);
  return l.align === !1 ? d : mu(Lg(d, o), o);
}
function hu(r, o, l = {}) {
  const u = String(r ?? "").trim();
  if (u.length === 0)
    return {
      kind: l.required ? "invalid" : "empty",
      value: null,
      text: u
    };
  const d = Number(u);
  return Number.isFinite(d) ? {
    kind: "valid",
    value: Cn(d, o, l),
    text: u
  } : {
    kind: "invalid",
    value: null,
    text: u
  };
}
function Rr(r, o) {
  return r == null || !Number.isFinite(Number(r)) ? "" : String(typeof o == "function" ? o(r) : r);
}
function Rg(r, o, l, u) {
  if (Qe(l))
    return l.trim();
  if (!(r == null || !Number.isFinite(Number(r))))
    return Rr(mu(Number(r), o), u);
}
function Mu(r, o) {
  return r === "ArrowUp" || r === "ArrowRight" ? o.step : r === "ArrowDown" || r === "ArrowLeft" ? -o.step : r === "PageUp" ? o.largeStep : r === "PageDown" ? -o.largeStep : 0;
}
function zu(r, o, l, u = o.min) {
  const d = Number.isFinite(Number(r)) ? Number(r) : u;
  return Cn(d + l, o);
}
function Ng(r, o) {
  const l = Cn(r, o) ?? o.min;
  return ri((l - o.min) / (o.max - o.min), 0, 1);
}
function Tg(r, o, l) {
  return jp(r.currentTarget, r, o, l);
}
function jp(r, o, l, u) {
  if (!r || typeof r.getBoundingClientRect != "function")
    return null;
  const d = r.getBoundingClientRect(), p = u !== "vertical" ? (o.clientX - d.left) / Math.max(d.width, 1) : 1 - (o.clientY - d.top) / Math.max(d.height, 1);
  return Cn(l.min + ri(p, 0, 1) * (l.max - l.min), l);
}
function Aa(r = {}) {
  const o = ai(r), l = r.required === !0, u = r.text !== void 0 ? hu(r.text, o, {
    required: l,
    align: r.align !== !1
  }) : null, d = u ? u.kind === "valid" ? u.value : null : r.value, f = Cn(d, o, {
    align: r.align !== !1
  });
  return {
    ...o,
    value: f,
    text: r.text !== void 0 ? String(r.text) : Rr(f, r.formatValue),
    empty: u?.kind === "empty" || f === null,
    invalid: u?.kind === "invalid",
    atMin: f !== null && f <= o.min,
    atMax: f !== null && f >= o.max,
    valueText: Rg(f, o, r.valueText, r.formatValue)
  };
}
function Pg(r = {}) {
  const o = Aa(r), l = r.orientation === "vertical" ? "vertical" : "horizontal";
  return {
    ...o,
    orientation: l,
    ratio: Ng(o.value, o)
  };
}
const Ag = /^(\d{4})-(\d{2})-(\d{2})$/, Mg = /^(\d{2}):(\d{2})(?::(\d{2}))?$/, zg = Object.freeze(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]), Og = Object.freeze([
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
]);
function ar(r, o = 2) {
  return String(r).padStart(o, "0");
}
function pt(r) {
  if (!Qe(r))
    return null;
  const o = r.trim().match(Ag);
  if (!o)
    return null;
  const l = Number(o[1]), u = Number(o[2]), d = Number(o[3]);
  if (u < 1 || u > 12)
    return null;
  const f = new Date(Date.UTC(l, u, 0)).getUTCDate();
  return d < 1 || d > f ? null : { year: l, month: u, day: d };
}
function Jt(r) {
  return r ? `${ar(r.year, 4)}-${ar(r.month)}-${ar(r.day)}` : "";
}
function Xl(r, o) {
  const l = pt(r), u = pt(o);
  return !l || !u ? 0 : Jt(l).localeCompare(Jt(u));
}
function yu(r, o) {
  const l = pt(`${ar(r.year, 4)}-${ar(r.month)}-01`) ?? {
    year: 1970,
    month: 1
  }, u = new Date(Date.UTC(l.year, l.month - 1 + o, 1));
  return {
    year: u.getUTCFullYear(),
    month: u.getUTCMonth() + 1
  };
}
function Hl(r, o) {
  const l = pt(r);
  if (!l)
    return "";
  const u = new Date(Date.UTC(l.year, l.month - 1, l.day + o));
  return Jt({
    year: u.getUTCFullYear(),
    month: u.getUTCMonth() + 1,
    day: u.getUTCDate()
  });
}
function Pn(r, o, l) {
  const u = pt(r);
  if (!u)
    return "";
  const d = Jt(u);
  return pt(o) && Xl(d, o) < 0 ? Jt(pt(o)) : pt(l) && Xl(d, l) > 0 ? Jt(pt(l)) : d;
}
function xo(r, o, l, u) {
  const d = Pn(r);
  return !d || pt(o) && Xl(d, o) < 0 || pt(l) && Xl(d, l) > 0 ? !0 : typeof u == "function" ? u(d) === !0 : !1;
}
function $p() {
  const r = /* @__PURE__ */ new Date();
  return Jt({
    year: r.getFullYear(),
    month: r.getMonth() + 1,
    day: r.getDate()
  });
}
function Hp(r, o, l, u) {
  const d = pt(r) ?? pt(o) ?? pt(Pn($p(), l, u)) ?? pt(l) ?? pt(u) ?? { year: 1970, month: 1 };
  return {
    year: d.year,
    month: d.month
  };
}
function Vg(r) {
  const o = Number(r);
  return Number.isInteger(o) && o >= 0 && o <= 6 ? o : 0;
}
function Bg(r, o) {
  const l = Array.isArray(r) && r.length === 7 ? r.map((u) => String(u)) : zg;
  return l.map((u, d) => l[(d + o) % 7]);
}
function Fg(r, o) {
  return `${(Array.isArray(o) && o.length === 12 ? o : Og)[r.month - 1] ?? ar(r.month)} ${r.year}`;
}
function bp(r = {}) {
  const o = Vg(r.weekStartsOn), l = Pn(r.min), u = Pn(r.max), d = Pn(r.value, l, u), f = r.text !== void 0 ? String(r.text) : d, p = pt(f), m = p ? Jt(p) : "", g = Qe(f) && !p, v = pt(r.month), E = v ? { year: v.year, month: v.month } : Hp(d || m, r.defaultMonth, l, u), N = (new Date(Date.UTC(E.year, E.month - 1, 1)).getUTCDay() - o + 7) % 7, k = new Date(Date.UTC(E.year, E.month - 1, 1 - N)), S = $p(), b = d || m, _ = [];
  for (let D = 0; D < 42; D += 1) {
    const x = new Date(k.getTime());
    x.setUTCDate(k.getUTCDate() + D);
    const R = Jt({
      year: x.getUTCFullYear(),
      month: x.getUTCMonth() + 1,
      day: x.getUTCDate()
    }), P = x.getUTCMonth() + 1 !== E.month;
    _.push({
      value: R,
      label: String(x.getUTCDate()),
      selected: b === R,
      today: S === R,
      outsideMonth: P,
      disabled: xo(R, l, u, r.isDateDisabled)
    });
  }
  const I = m ? xo(m, l, u, r.isDateDisabled) : !1;
  return {
    value: d,
    text: f,
    textValue: m,
    invalid: g || I || !!d && xo(d, l, u, r.isDateDisabled),
    min: l || void 0,
    max: u || void 0,
    month: E,
    title: Fg(E, r.monthLabels),
    weekDayLabels: Bg(r.weekDayLabels, o),
    cells: _,
    weekStartsOn: o
  };
}
function qp(r) {
  if (!Qe(r))
    return null;
  const o = r.trim().match(Mg);
  if (!o)
    return null;
  const l = Number(o[1]), u = Number(o[2]), d = o[3] === void 0 ? 0 : Number(o[3]);
  return l < 0 || l > 23 || u < 0 || u > 59 || d < 0 || d > 59 ? null : { hour: l, minute: u, second: d, hasSeconds: o[3] !== void 0 };
}
function Qp(r, o = !1) {
  if (!r)
    return "";
  const l = `${ar(r.hour)}:${ar(r.minute)}`;
  return o || r.hasSeconds ? `${l}:${ar(r.second)}` : l;
}
function Lo(r) {
  const o = qp(r);
  return o ? o.hour * 3600 + o.minute * 60 + o.second : null;
}
function Ou(r, o = !1) {
  const l = (r % 86400 + 86400) % 86400, u = Math.floor(l / 3600), d = Math.floor(l % 3600 / 60), f = l % 60;
  return Qp({ hour: u, minute: d, second: f }, o);
}
function Zl(r) {
  const o = Number(r);
  return Number.isFinite(o) && o > 0 ? Math.max(1, Math.floor(o)) : 60;
}
function jn(r, o = {}) {
  const l = qp(r);
  if (!l)
    return "";
  const u = Zl(o.step), d = o.showSeconds === !0 || l.hasSeconds || u < 60, f = Lo(Qp(l, !0)), p = o.align === !1 ? f : Math.round(f / u) * u;
  return Ou(p, d);
}
function Jl(r, o) {
  const l = Lo(r), u = Lo(o);
  return l === null || u === null ? 0 : l - u;
}
function Jr(r, o = {}) {
  const l = jn(r, o);
  if (!l)
    return "";
  const u = jn(o.min, { ...o, align: !1 }), d = jn(o.max, { ...o, align: !1 });
  return u && Jl(l, u) < 0 ? u : d && Jl(l, d) > 0 ? d : l;
}
function ql(r, o, l = {}) {
  const u = Zl(l.step), d = l.showSeconds === !0 || u < 60, f = Lo(r) ?? Lo(l.min) ?? 0;
  return Jr(Ou(f + o, d), l);
}
function wo(r, o = {}) {
  const l = jn(r, o);
  if (!l)
    return !0;
  const u = jn(o.min, { ...o, align: !1 }), d = jn(o.max, { ...o, align: !1 });
  return u && Jl(l, u) < 0 || d && Jl(l, d) > 0 ? !0 : typeof o.isTimeDisabled == "function" ? o.isTimeDisabled(l) === !0 : !1;
}
function Ep(r = {}) {
  const o = Zl(r.step), l = Zl(r.optionStep ?? Math.max(o, 1800)), u = Jr(r.value, r), d = r.text !== void 0 ? String(r.text) : u, f = jn(d, { ...r, align: !1 }), p = Qe(d) && !f, m = jn(r.min, { ...r, align: !1 }), g = jn(r.max, { ...r, align: !1 }), v = r.showSeconds === !0, E = l, C = Array.isArray(r.options) ? r.options.map((N) => {
    const k = typeof N == "string" ? N : N?.value, S = jn(k, { ...r, align: !1 });
    return S ? {
      value: S,
      label: typeof N == "string" ? S : N.label ?? S,
      disabled: N?.disabled === !0 || wo(S, r)
    } : null;
  }).filter(Boolean) : Array.from({ length: Math.ceil(86400 / E) }, (N, k) => {
    const S = Ou(k * E, v);
    return {
      value: S,
      label: S,
      disabled: wo(S, r)
    };
  }).filter((N) => r.limitOptionsToRange === !1 || !N.disabled), w = f ? wo(f, r) : !1;
  return {
    value: u,
    text: d,
    textValue: f,
    invalid: p || w || !!u && wo(u, r),
    min: m || void 0,
    max: g || void 0,
    step: o,
    optionStep: l,
    showSeconds: v,
    options: C
  };
}
function Ug(r = {}) {
  const o = Qe(r.src) ? r.src.trim() : "", l = Qe(r.alt) ? r.alt.trim() : "", u = r.decorative === !0, d = kg(r.fit), f = Up(r.objectPosition), p = Gl(r.width), m = Gl(r.height), g = r.loading === !0, v = _e(r.error), E = r.loaded === !0, C = o.length > 0;
  return {
    src: o,
    alt: u ? "" : l,
    decorative: u,
    fit: d,
    objectPosition: f,
    width: p,
    height: m,
    loading: g,
    loaded: E,
    error: v,
    hasSource: C,
    fallbackVisible: g || !!v || !C,
    state: Ne({
      disabled: r.disabled === !0,
      loading: g,
      error: v
    })
  };
}
function Kg(r = {}) {
  const o = xg(r.kind), l = Qe(r.src) ? r.src.trim() : "", u = Qe(r.title) ? r.title.trim() : "", d = r.caption !== void 0 && r.caption !== null ? r.caption : "", f = Ig(r.fit), p = Up(r.objectPosition), m = Qe(r.poster) ? r.poster.trim() : "", g = Gl(r.width), v = Gl(r.height), E = r.muted === !0, C = r.loop === !0, w = r.autoPlay === !0, N = r.controls === !0, k = r.loading === !0, S = _e(r.error), b = l.length > 0;
  return {
    kind: o,
    src: l,
    title: u,
    caption: d,
    fit: f,
    objectPosition: p,
    poster: m,
    width: g,
    height: v,
    muted: E,
    loop: C,
    autoPlay: w,
    controls: N,
    loading: k,
    error: S,
    hasSource: b,
    fallbackVisible: k || !!S || !b,
    state: Ne({
      disabled: r.disabled === !0,
      loading: k,
      error: S
    })
  };
}
function jg(r = {}) {
  const o = Pr(r.error, r.fallbackCode || "ERROR_STATE"), l = r.retryable === !0 || o.retryable === !0, u = r.showDetails === !0;
  return {
    error: o,
    retryable: l,
    showDetails: u,
    tone: Fp(r.tone || "error"),
    state: Ne({
      disabled: r.disabled === !0,
      loading: r.loading === !0,
      error: o
    })
  };
}
function $g(r = {}) {
  const o = La(r.min, 0), l = La(r.max, 100), u = l > o ? o : 0, d = l > o ? l : 100, f = r.value !== void 0 && r.value !== null && Number.isFinite(Number(r.value));
  if (r.indeterminate === !0 || !f)
    return {
      indeterminate: !0,
      min: u,
      max: d,
      value: void 0,
      ratio: 0
    };
  const m = ri(Number(r.value), u, d), g = (m - u) / (d - u);
  return {
    indeterminate: !1,
    min: u,
    max: d,
    value: m,
    ratio: g
  };
}
const tr = i.forwardRef((r, o) => {
  const {
    as: l = "span",
    children: u,
    text: d,
    textKey: f,
    textParams: p,
    fallbackText: m,
    tone: g,
    emphasis: v,
    truncate: E = !1,
    disabled: C = !1,
    error: w = null,
    i18n: N,
    onStateChange: k,
    onDiagnostic: S,
    ...b
  } = r, _ = _e(w), I = _ ? "error" : Eg(g), D = Sg(v), x = Ne({
    disabled: C,
    error: _
  }), R = bg(l), P = ta({
    children: u,
    value: d,
    key: f,
    params: p,
    fallback: m,
    i18n: N,
    onDiagnostic: S
  });
  return i.createElement(
    R,
    {
      ...b,
      ...y("text", "root", x),
      ref: o,
      "aria-disabled": C ? "true" : void 0,
      "aria-invalid": _ ? "true" : void 0,
      "data-tone": I,
      "data-emphasis": D,
      "data-truncate": E ? "true" : "false"
    },
    P
  );
});
tr.displayName = "ChipsText";
const Hg = i.forwardRef((r, o) => {
  const {
    children: l,
    label: u,
    labelKey: d,
    labelParams: f,
    fallbackLabel: p,
    required: m = !1,
    requiredIndicator: g = "*",
    disabled: v = !1,
    error: E = null,
    i18n: C,
    onStateChange: w,
    onDiagnostic: N,
    ...k
  } = r, S = _e(E), b = Ne({
    disabled: v,
    error: S
  }), _ = ta({
    children: l,
    value: u,
    key: d,
    params: f,
    fallback: p,
    i18n: C,
    onDiagnostic: N
  });
  return i.createElement(
    "label",
    {
      ...k,
      ...y("label", "root", b),
      ref: o,
      "aria-disabled": v ? "true" : void 0,
      "aria-invalid": S ? "true" : void 0,
      "aria-required": m ? "true" : void 0,
      "data-required": m ? "true" : "false"
    },
    _,
    m ? i.createElement(
      "span",
      {
        ...y("label", "required-indicator", b),
        "aria-hidden": "true"
      },
      g
    ) : null,
    S ? i.createElement(
      "span",
      {
        ...y("label", "status", b),
        ...Re({ live: "assertive" })
      },
      S.message
    ) : null
  );
});
Hg.displayName = "ChipsLabel";
const Ao = i.forwardRef((r, o) => {
  const {
    descriptor: l,
    size: u,
    color: d,
    tone: f,
    style: p,
    title: m,
    ...g
  } = r, v = ig(l), E = Bp(f ?? v.tone), C = v.label || (Qe(g["aria-label"]) ? g["aria-label"].trim() : void 0), w = Qe(g["aria-labelledby"]) ? g["aria-labelledby"].trim() : void 0;
  if (!v.decorative && !C && !w)
    throw new Error("ICON_A11Y_LABEL_REQUIRED");
  const N = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    lineHeight: 1,
    fontSize: "var(--chips-icon-size, var(--chips-comp-icon-root-size, var(--chips-sys-icon-size, 1em)))",
    width: "var(--chips-icon-size, var(--chips-comp-icon-root-size, var(--chips-sys-icon-size, 1em)))",
    height: "var(--chips-icon-size, var(--chips-comp-icon-root-size, var(--chips-sys-icon-size, 1em)))",
    color: "var(--chips-icon-color, var(--chips-comp-icon-root-color, var(--chips-sys-icon-color, currentColor)))",
    fontVariationSettings: '"FILL" var(--chips-icon-fill, var(--chips-comp-icon-root-fill, var(--chips-sys-icon-fill, 0))), "wght" var(--chips-icon-wght, var(--chips-comp-icon-root-wght, var(--chips-sys-icon-wght, 400))), "GRAD" var(--chips-icon-grad, var(--chips-comp-icon-root-grad, var(--chips-sys-icon-grad, 0))), "opsz" var(--chips-icon-opsz, var(--chips-comp-icon-root-opsz, var(--chips-sys-icon-opsz, 24)))',
    fontFeatureSettings: '"liga"',
    ...p
  };
  return u !== void 0 && (N["--chips-icon-size"] = typeof u == "number" ? `${u}px` : u), d !== void 0 && (N["--chips-icon-color"] = d), v.explicitAxes.fill && (N["--chips-icon-fill"] = String(v.fill)), v.explicitAxes.wght && (N["--chips-icon-wght"] = String(v.wght)), v.explicitAxes.grad && (N["--chips-icon-grad"] = String(v.grad)), v.explicitAxes.opsz && (N["--chips-icon-opsz"] = String(v.opsz)), i.createElement(
    "span",
    {
      ...g,
      ...y("icon", "root", "idle"),
      ref: o,
      style: N,
      title: Qe(m) ? m.trim() : m,
      "data-icon-name": v.name,
      "data-icon-style": v.style,
      "data-tone": E,
      role: v.decorative ? void 0 : "img",
      "aria-hidden": v.decorative ? "true" : void 0,
      "aria-label": v.decorative ? void 0 : C,
      "aria-labelledby": v.decorative ? void 0 : w
    },
    v.name
  );
});
Ao.displayName = "ChipsIcon";
function it(r, o) {
  if (r !== void 0)
    return r;
  const l = ug(o);
  return l ? i.createElement(Ao, {
    descriptor: l
  }) : null;
}
function $n(r) {
  const o = i.createContext(null);
  return o.displayName = `${r}-compound-context`, [o, (u) => {
    const d = i.useContext(o);
    if (!d)
      throw new Error(`${r.toUpperCase()}_COMPOUND_CONTEXT_MISSING:${u}`);
    return d;
  }];
}
function tt(r, o) {
  return (l) => {
    typeof r == "function" && r(l), !l.defaultPrevented && typeof o == "function" && o(l);
  };
}
function Or(r, o = "item") {
  return String(r ?? "").trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || o;
}
function Ro(r, o) {
  let l = !1;
  return i.Children.forEach(r, (u) => {
    if (!(l || !i.isValidElement(u))) {
      if (o.includes(u.type)) {
        l = !0;
        return;
      }
      u.type === i.Fragment && (l = Ro(u.props.children, o));
    }
  }), l;
}
const Zt = {
  POINTER_ENTER: "pointer-enter",
  POINTER_LEAVE: "pointer-leave",
  FOCUS: "focus",
  BLUR: "blur",
  PRESS_START: "press-start",
  PRESS_END: "press-end"
};
({
  ...pu
});
function Ie({ name: r, scope: o, parts: l, states: u }) {
  if (typeof r != "string" || r.length === 0)
    throw new Error("COMPONENT_META_INVALID:name");
  if (!Array.isArray(l) || l.length === 0)
    throw new Error("COMPONENT_META_INVALID:parts");
  if (!Array.isArray(u) || u.length === 0)
    throw new Error("COMPONENT_META_INVALID:states");
  return {
    name: r,
    scope: o,
    parts: l,
    states: u
  };
}
function Ne(r) {
  return r.disabled ? "disabled" : r.loading ? "loading" : r.error ? "error" : r.interaction && r.interaction.active ? "active" : r.interaction && r.interaction.focused ? "focus" : r.interaction && r.interaction.hovered ? "hover" : "idle";
}
function qg(r, o) {
  return !o || typeof o.type != "string" ? r : o.type === Zt.POINTER_ENTER ? { ...r, hovered: !0 } : o.type === Zt.POINTER_LEAVE ? { ...r, hovered: !1, active: !1 } : o.type === Zt.FOCUS ? { ...r, focused: !0 } : o.type === Zt.BLUR ? { ...r, focused: !1, active: !1 } : o.type === Zt.PRESS_START ? { ...r, active: !0 } : o.type === Zt.PRESS_END ? { ...r, active: !1 } : r;
}
function Qg(r, o) {
  const l = (u) => {
    o || r({ type: u });
  };
  return {
    onPointerEnter: () => l(Zt.POINTER_ENTER),
    onPointerLeave: () => l(Zt.POINTER_LEAVE),
    onFocus: () => l(Zt.FOCUS),
    onBlur: () => l(Zt.BLUR),
    onMouseDown: () => l(Zt.PRESS_START),
    onMouseUp: () => l(Zt.PRESS_END)
  };
}
function Oe(r) {
  const [o, l] = i.useReducer(
    qg,
    ng
  );
  i.useEffect(() => {
    r && (l({ type: Zt.POINTER_LEAVE }), l({ type: Zt.BLUR }), l({ type: Zt.PRESS_END }));
  }, [r]);
  const u = i.useMemo(
    () => Qg(l, r),
    [r]
  );
  return {
    interaction: o,
    handlers: u
  };
}
function Je({ value: r, defaultValue: o, onChange: l }) {
  const [u, d] = i.useState(o), f = r !== void 0, p = f ? r : u, m = i.useCallback(
    (g) => {
      f || d(g), typeof l == "function" && l(g);
    },
    [f, l]
  );
  return [p, m, f];
}
function Ma(...r) {
  return (o) => {
    for (const l of r)
      typeof l == "function" && l(o);
  };
}
function _e(r) {
  return r ? typeof r == "string" ? {
    code: "COMPONENT_ERROR",
    message: r
  } : typeof r == "object" && typeof r.message == "string" ? {
    code: typeof r.code == "string" ? r.code : "COMPONENT_ERROR",
    message: r.message
  } : {
    code: "COMPONENT_ERROR",
    message: "Unknown component error"
  } : null;
}
function Pr(r, o = "COMPONENT_ERROR") {
  if (r && typeof r == "object") {
    const l = r;
    if (typeof l.code == "string" && typeof l.message == "string")
      return {
        code: l.code,
        message: l.message,
        details: l.details,
        retryable: l.retryable === !0
      };
  }
  return r instanceof Error ? {
    code: o,
    message: r.message,
    details: { name: r.name },
    retryable: !1
  } : typeof r == "string" && r.length > 0 ? {
    code: o,
    message: r,
    details: null,
    retryable: !1
  } : {
    code: o,
    message: "Unknown error",
    details: r,
    retryable: !1
  };
}
function Wg(r, o) {
  if (!r || typeof r != "object" || typeof o != "string" || o.length === 0)
    return;
  const l = o.split(".");
  let u = r;
  for (const d of l) {
    if (!u || typeof u != "object" || !(d in u))
      return;
    u = u[d];
  }
  return u;
}
function Yg(r, o, l, u) {
  if (!r)
    return null;
  try {
    if (typeof r == "function") {
      const d = r(o, l, u);
      return typeof d == "string" ? d : null;
    }
    if (typeof r.translate == "function") {
      const d = r.translate({ key: o, params: l });
      if (typeof d == "string")
        return d;
      const f = r.translate(o, l);
      if (typeof f == "string")
        return f;
    }
  } catch (d) {
    return {
      __error: Pr(d, "SYSTEM_UX_I18N_ADAPTER_ERROR")
    };
  }
  return null;
}
function vt(r = {}) {
  const {
    i18n: o,
    key: l,
    params: u,
    fallback: d = "",
    onDiagnostic: f
  } = r;
  if (typeof l == "string" && l.length > 0) {
    const p = Yg(o, l, u, d);
    if (p && typeof p == "object" && p.__error)
      typeof f == "function" && f({
        code: "SYSTEM_UX_I18N_ADAPTER_ERROR",
        key: l,
        error: p.__error
      });
    else if (typeof p == "string" && p.length > 0)
      return p;
    typeof f == "function" && f({
      code: "SYSTEM_UX_I18N_KEY_FALLBACK",
      key: l,
      fallback: d
    });
  }
  return typeof d == "string" ? d : "";
}
function za(r = {}) {
  const {
    configSource: o,
    key: l,
    defaultValue: u,
    parser: d,
    onDiagnostic: f
  } = r;
  let p;
  try {
    o && typeof o == "function" ? p = o(l) : o && typeof o.get == "function" ? p = o.get(l) : p = Wg(o, l);
  } catch (g) {
    return typeof f == "function" && f({
      code: "SYSTEM_UX_CONFIG_SOURCE_ERROR",
      key: l,
      error: Pr(g, "SYSTEM_UX_CONFIG_SOURCE_ERROR")
    }), u;
  }
  let m;
  try {
    m = typeof d == "function" ? d(p) : p;
  } catch (g) {
    return typeof f == "function" && f({
      code: "SYSTEM_UX_CONFIG_PARSER_ERROR",
      key: l,
      error: Pr(g, "SYSTEM_UX_CONFIG_PARSER_ERROR")
    }), u;
  }
  return m ?? (typeof f == "function" && f({
    code: "SYSTEM_UX_CONFIG_FALLBACK",
    key: l,
    defaultValue: u
  }), u);
}
function No(r = {}) {
  const {
    traceId: o,
    component: l,
    action: u,
    error: d,
    durationMs: f
  } = r, p = d ? Pr(d, "SYSTEM_UX_OBSERVE_ERROR") : null;
  return {
    traceId: typeof o == "string" && o.length > 0 ? o : `trace-${Date.now()}`,
    component: typeof l == "string" && l.length > 0 ? l : "unknown-component",
    action: typeof u == "string" && u.length > 0 ? u : "unknown-action",
    errorCode: p ? p.code : null,
    durationMs: typeof f == "number" && f >= 0 ? f : 0
  };
}
function Mo(r) {
  return Array.isArray(r) ? r.filter((o) => o && (typeof o.value == "string" || typeof o.value == "number")).map((o) => ({
    ...o,
    value: String(o.value),
    disabled: o.disabled === !0
  })) : [];
}
function Sp(r) {
  return r ? typeof r.textValue == "string" ? r.textValue : typeof r.label == "string" || typeof r.label == "number" ? String(r.label) : r.value : "";
}
function Lt(r, o, l = "next", u = !0) {
  if (!Array.isArray(r) || r.length === 0)
    return -1;
  const d = l === "prev" ? -1 : 1;
  let f = o;
  for (let p = 0; p < r.length; p += 1) {
    if (f += d, u)
      f >= r.length && (f = 0), f < 0 && (f = r.length - 1);
    else if (f < 0 || f >= r.length)
      return -1;
    const m = r[f];
    if (m && m.disabled !== !0)
      return f;
  }
  return -1;
}
function un(r) {
  return Lt(r, -1, "next", !0);
}
function hn(r) {
  return r !== null && typeof r == "object" && !Array.isArray(r);
}
function _t(r) {
  return typeof r == "string" && r.trim().length > 0 ? r.trim() : "";
}
function Io(r) {
  return Array.isArray(r) ? r : [];
}
function gu(r) {
  const o = Array.isArray(r) ? r[0] : r;
  return o ? typeof o == "string" ? _t(o) : hn(o) ? _t(o.accelerator) : "" : "";
}
function au(r, o, l = "", u) {
  const d = _t(r?.[`${o}Key`]);
  return vt({
    i18n: u,
    key: d,
    fallback: _t(l) || d
  });
}
function Gg(r) {
  return !(!hn(r) || r.state && hn(r.state) && r.state.visible === !1 || r.diagnostic && hn(r.diagnostic) && r.diagnostic.visible === !1);
}
function Xg(r) {
  return !(!hn(r) || r.state && hn(r.state) && r.state.enabled === !1 || r.diagnostic && hn(r.diagnostic) && r.diagnostic.enabled === !1);
}
function Zg(r) {
  return hn(r) ? !!(r.state && hn(r.state) && r.state.checked === !0 || r.diagnostic && hn(r.diagnostic) && r.diagnostic.checked === !0) : !1;
}
function Wp(r, o) {
  const l = typeof r.order == "number" && Number.isFinite(r.order) ? r.order : 0, u = typeof o.order == "number" && Number.isFinite(o.order) ? o.order : 0;
  return l !== u ? l - u : String(r.commandId).localeCompare(String(o.commandId));
}
function Yp(r, o = {}) {
  if (!hn(r))
    return null;
  const l = _t(r.commandId), u = _t(r.titleKey);
  if (!l || !u)
    return null;
  const d = au(r, "title", l, o.i18n), f = _t(r.descriptionKey) ? au(r, "description", "", o.i18n) : "", p = _t(r.ariaLabelKey) ? au(r, "ariaLabel", d, o.i18n) : d;
  return {
    ...r,
    commandId: l,
    titleKey: u,
    label: d,
    description: f,
    ariaLabel: p,
    disabled: !Xg(r),
    hidden: !Gg(r),
    checked: Zg(r),
    shortcutLabel: gu(r.shortcut),
    disabledReasonKey: _t(r.disabledReasonKey || r.state?.disabledReasonKey || r.state?.reasonKey),
    hiddenReasonKey: _t(r.hiddenReasonKey || r.state?.hiddenReasonKey),
    paletteKeywords: Io(r.paletteKeywords).filter((m) => typeof m == "string"),
    menuPlacement: Io(r.menuPlacement).filter(hn),
    toolbarPlacement: Io(r.toolbarPlacement).filter(hn)
  };
}
function oi(r, o = {}) {
  return Io(r).map((l) => Yp(l, o)).filter((l) => l && (o.includeHidden === !0 || !l.hidden));
}
function Gp(r, o, l) {
  const u = _t(l);
  return u ? _t(r?.[o]) === u : !0;
}
function Jg(r, o = {}) {
  const l = _t(o.toolbarId), u = _t(o.groupId), d = oi(r, o), f = [];
  for (const p of d) {
    const m = p.toolbarPlacement.length > 0 ? p.toolbarPlacement : [{}];
    for (const g of m)
      Gp(g, "toolbarId", l) && (u && _t(g.groupId) !== u || f.push({
        ...p,
        placement: g,
        groupId: _t(g.groupId) || "default",
        order: typeof g.order == "number" ? g.order : 0
      }));
  }
  return f.sort(Wp);
}
function Xp(r, o = {}) {
  const l = _t(o.menuId), u = oi(r, o), d = /* @__PURE__ */ new Map();
  for (const f of u) {
    const p = f.menuPlacement.length > 0 ? f.menuPlacement : [{}];
    for (const m of p) {
      if (!Gp(m, "menuId", l))
        continue;
      const g = _t(m.groupId) || "default", v = {
        ...f,
        placement: m,
        groupId: g,
        order: typeof m.order == "number" ? m.order : 0
      };
      d.has(g) || d.set(g, []), d.get(g).push(v);
    }
  }
  return [...d.entries()].map(([f, p]) => ({
    groupId: f,
    items: p.sort(Wp)
  }));
}
function ev(r, o = {}) {
  return oi(r, o).map((l) => ({
    id: l.commandId,
    commandId: l.commandId,
    label: l.label,
    titleKey: l.titleKey,
    subtitle: l.description,
    descriptionKey: l.descriptionKey,
    ariaLabel: l.ariaLabel,
    ariaLabelKey: l.ariaLabelKey,
    icon: l.icon,
    shortcut: l.shortcutLabel,
    keywords: l.paletteKeywords,
    disabled: l.disabled,
    checked: l.checked,
    command: l
  })).sort((l, u) => String(l.label).localeCompare(String(u.label)));
}
const tv = i.createContext(null);
function Ua() {
  return i.useContext(tv);
}
function li(r = {}) {
  const o = Ua(), l = r.adapter || o?.adapter, u = Array.isArray(r.commands), [d, f] = i.useState([]), [p, m] = i.useState(!1), [g, v] = i.useState(null), E = {
    ...o?.query,
    ...r.query
  }, C = JSON.stringify(E);
  return i.useEffect(() => {
    if (u) {
      m(!1), v(null);
      return;
    }
    if (!l || typeof l.listCommands != "function")
      return;
    let w = !1;
    const N = async () => {
      m(!0), v(null);
      try {
        const S = await l.listCommands(E);
        w || f(Io(S));
      } catch (S) {
        w || v(Pr(S, "COMMAND_LIST_FAILED"));
      } finally {
        w || m(!1);
      }
    };
    N();
    const k = typeof l.onCommandsChanged == "function" ? l.onCommandsChanged(() => {
      N();
    }) : void 0;
    return () => {
      w = !0, typeof k == "function" && k();
    };
  }, [l, u, C]), {
    commands: u ? r.commands : d,
    loading: p,
    error: g
  };
}
function Oa(r, o) {
  return typeof r != "number" || Number.isNaN(r) || r <= 0 ? o : r;
}
function nv(r) {
  const o = Math.max(0, Number.isInteger(r.itemCount) ? r.itemCount : 0), l = Oa(r.itemHeight, 1), u = Oa(r.viewportHeight, l), d = Math.max(0, typeof r.scrollTop == "number" ? r.scrollTop : 0), f = Math.max(0, Number.isInteger(r.overscan) ? r.overscan : 0);
  if (o === 0)
    return {
      start: 0,
      end: -1,
      paddingStart: 0,
      paddingEnd: 0
    };
  const p = Math.max(1, Math.ceil(u / l)), m = Math.floor(d / l), g = Math.max(0, m - f), v = Math.min(o - 1, m + p + f - 1), E = g * l, C = v >= g ? v - g + 1 : 0, w = Math.max(0, o * l - E - C * l);
  return {
    start: g,
    end: v,
    paddingStart: E,
    paddingEnd: w
  };
}
function rv(r, o) {
  return r === o ? 0 : r == null ? 1 : o == null ? -1 : typeof r == "number" && typeof o == "number" ? r - o : String(r).localeCompare(String(o));
}
function av(r, o) {
  const l = Array.isArray(r) ? [...r] : [];
  if (!o || typeof o.key != "string" || o.key.length === 0)
    return l;
  const u = o.direction === "desc" ? "desc" : "asc";
  return l.sort((d, f) => {
    const p = rv(d?.[o.key], f?.[o.key]);
    return u === "desc" ? p * -1 : p;
  }), l;
}
function ov(r, o) {
  const l = [], u = Array.isArray(r) ? r : [], d = new Set(Array.isArray(o) ? o.map((p) => String(p)) : []), f = (p, m, g) => {
    const v = p.filter((C) => C && typeof C == "object"), E = v.length;
    for (const [C, w] of v.entries()) {
      const N = String(w.id), k = Array.isArray(w.children) ? w.children : [], S = k.length > 0 && d.has(N), b = w.label !== void 0 && w.label !== null ? w.label : N;
      l.push({
        id: N,
        label: b,
        labelText: Vu(b, N),
        depth: m,
        level: m + 1,
        parentId: g,
        disabled: w.disabled === !0,
        hasChildren: k.length > 0,
        expanded: S,
        setSize: E,
        posInSet: C + 1,
        raw: w
      }), S && f(k, m + 1, N);
    }
  };
  return f(u, 0, null), l;
}
function Vu(r, o) {
  return String(typeof r == "string" || typeof r == "number" ? r : o);
}
function lv(r) {
  return !r || typeof r != "object" ? "item" : r.part === "branch" || r.part === "leaf" || r.part === "item" ? r.part : r.hasChildren ? "branch" : "leaf";
}
function Bu(r, o) {
  return o?.disabled ? "disabled" : r;
}
function iv(r, o) {
  const l = Array.isArray(r) ? r : [], u = typeof o == "string" ? o.trim().toLowerCase() : "";
  return u.length === 0 ? l : l.filter((d) => {
    if (!d || typeof d != "object")
      return !1;
    const f = typeof d.label == "string" ? d.label.toLowerCase() : "", p = typeof d.shortcut == "string" ? d.shortcut.toLowerCase() : "", m = Array.isArray(d.keywords) ? d.keywords.filter((g) => typeof g == "string").join(" ").toLowerCase() : "";
    return f.includes(u) || p.includes(u) || m.includes(u);
  });
}
function Cp(r, o = 0.1, l = 0.9) {
  const u = Oa(o, 0.1), d = Oa(l, 0.9), f = Math.max(u, Math.min(d, 0.5)), p = typeof r == "number" && !Number.isNaN(r) ? r : f;
  return Math.max(u, Math.min(d, p));
}
function sv(r, o) {
  const l = {}, u = Array.isArray(r) ? r : [], d = o && typeof o == "object" ? o : {};
  for (const f of u) {
    if (!f || typeof f.id != "string")
      continue;
    const p = d[f.id];
    p === "hidden" || p === "minimized" || p === "active" ? l[f.id] = p : l[f.id] = "active";
  }
  return l;
}
function uv(r, o) {
  const l = new Set(Array.isArray(r) ? r.map((d) => String(d)) : []), u = String(o);
  return l.has(u) ? l.delete(u) : l.add(u), [...l];
}
function Fu(r, o = "message") {
  return Array.isArray(r) ? r.filter((l) => l && typeof l == "object").map((l, u) => {
    const d = l.tone === "error" || l.tone === "success" || l.tone === "warning" ? l.tone : "info";
    return {
      ...l,
      id: typeof l.id == "string" || typeof l.id == "number" ? String(l.id) : `${o}-${u}`,
      tone: d,
      durationMs: typeof l.durationMs == "number" && l.durationMs > 0 ? l.durationMs : null
    };
  }) : [];
}
function sn(r) {
  if (!(!Number.isInteger(r) || r <= 0))
    return r;
}
function Zp(r = {}) {
  const {
    items: o,
    idPrefix: l = "message",
    maxVisible: u = 3,
    defaultDurationMs: d = null
  } = r, f = Fu(o, l), p = sn(u) || 3, m = sn(d);
  return f.slice(0, p).map((g) => ({
    ...g,
    effectiveDurationMs: typeof g.durationMs == "number" && g.durationMs > 0 ? g.durationMs : m || null
  }));
}
function Jp(r, o) {
  const l = String(o);
  return (Array.isArray(r) ? r : []).filter((d) => d && String(d.id) !== l).map((d) => ({
    ...d
  }));
}
class cv extends i.Component {
  constructor(o) {
    super(o), this.state = {
      hasError: !1
    };
  }
  static getDerivedStateFromError() {
    return {
      hasError: !0
    };
  }
  componentDidCatch(o, l) {
    typeof this.props.onCapturedError == "function" && this.props.onCapturedError(o, l);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}
const dv = i.forwardRef((r, o) => {
  const {
    children: l,
    type: u = "button",
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    toggleable: m = !1,
    pressed: g,
    defaultPressed: v = !1,
    onPress: E,
    onPressedChange: C,
    onStateChange: w
  } = r, N = _e(p), k = d || f, { interaction: S, handlers: b } = Oe(k), [_, I] = i.useState(v === !0), D = m ? g !== void 0 ? g : _ : !1, x = Ne({
    disabled: k,
    loading: f,
    error: N,
    interaction: S
  });
  i.useEffect(() => {
    typeof w == "function" && w(x);
  }, [x, w]);
  const R = (O) => {
    if (k) {
      O.preventDefault();
      return;
    }
    if (m) {
      const A = !D;
      g === void 0 && I(A), typeof C == "function" && C(A);
    }
    typeof E == "function" && E(O);
  }, P = (O) => {
    !k && Ut(O.key) && (O.preventDefault(), R(O));
  };
  return i.createElement(
    "button",
    {
      ...y("button", "root", x),
      ...b,
      type: u,
      ref: o,
      "aria-disabled": k ? "true" : void 0,
      "aria-busy": f ? "true" : void 0,
      "aria-pressed": m ? String(D) : void 0,
      "data-pressed": m ? String(D) : void 0,
      disabled: k,
      onClick: Ma(R),
      onKeyDown: Ma(P)
    },
    i.createElement(
      "span",
      y("button", "label", x),
      l
    ),
    f ? i.createElement("span", {
      ...y("button", "spinner", x),
      "aria-hidden": "true"
    }) : null,
    N ? i.createElement(
      "span",
      {
        ...y("button", "status", x),
        ...Re({
          live: "assertive"
        })
      },
      N.message
    ) : null
  );
});
dv.displayName = "ChipsButton";
const fv = i.forwardRef((r, o) => {
  const {
    icon: l,
    descriptor: u,
    type: d = "button",
    disabled: f = !1,
    loading: p = !1,
    error: m = null,
    ariaLabel: g,
    ariaLabelKey: v,
    ariaLabelParams: E,
    fallbackAriaLabel: C,
    i18n: w,
    onPress: N,
    onStateChange: k,
    onDiagnostic: S,
    ...b
  } = r, _ = _e(m), I = f || p, D = Ze({
    value: g || b["aria-label"],
    key: v,
    params: E,
    fallback: C,
    i18n: w,
    onDiagnostic: S
  }), x = Qe(b["aria-labelledby"]) ? b["aria-labelledby"].trim() : void 0;
  if (!D && !x)
    throw new Error("ICON_BUTTON_A11Y_LABEL_REQUIRED");
  const { interaction: R, handlers: P } = Oe(I), O = Ne({
    disabled: I,
    loading: p,
    error: _,
    interaction: R
  });
  i.useEffect(() => {
    typeof k == "function" && k(O);
  }, [O, k]);
  const A = (W) => {
    if (I) {
      W.preventDefault();
      return;
    }
    typeof N == "function" && N(W);
  }, Q = (W) => {
    !I && Ut(W.key) && (W.preventDefault(), A(W));
  }, F = l !== void 0 ? l : u ? i.createElement(Ao, {
    descriptor: {
      ...u,
      decorative: !0
    }
  }) : null;
  return i.createElement(
    "button",
    {
      ...b,
      ...y("icon-button", "root", O),
      ...P,
      type: d,
      ref: o,
      disabled: I,
      "aria-label": D || void 0,
      "aria-labelledby": x,
      "aria-disabled": I ? "true" : void 0,
      "aria-busy": p ? "true" : void 0,
      onClick: Ma(b.onClick, A),
      onKeyDown: Ma(b.onKeyDown, Q)
    },
    i.createElement(
      "span",
      {
        ...y("icon-button", "icon", O),
        "aria-hidden": "true"
      },
      F
    ),
    p ? i.createElement("span", {
      ...y("icon-button", "spinner", O),
      "aria-hidden": "true"
    }) : null,
    _ ? i.createElement(
      "span",
      {
        ...y("icon-button", "status", O),
        ...Re({ live: "assertive" })
      },
      _.message
    ) : null
  );
});
fv.displayName = "ChipsIconButton";
const pv = i.forwardRef((r, o) => {
  const {
    children: l,
    label: u,
    labelKey: d,
    labelParams: f,
    fallbackLabel: p,
    icon: m,
    iconPosition: g = "start",
    type: v = "button",
    disabled: E = !1,
    loading: C = !1,
    error: w = null,
    pressed: N,
    defaultPressed: k = !1,
    i18n: S,
    onPress: b,
    onPressedChange: _,
    onStateChange: I,
    onDiagnostic: D,
    ...x
  } = r, R = _e(w), P = E || C, { interaction: O, handlers: A } = Oe(P), [Q, F] = i.useState(k === !0), W = N !== void 0 ? N === !0 : Q, q = ta({
    children: l,
    value: u,
    key: d,
    params: f,
    fallback: p,
    i18n: S,
    onDiagnostic: D
  }), H = Ne({
    disabled: P,
    loading: C,
    error: R,
    interaction: {
      ...O,
      active: O.active || W
    }
  });
  i.useEffect(() => {
    typeof I == "function" && I(H);
  }, [H, I]);
  const ee = (U) => {
    if (P) {
      U.preventDefault();
      return;
    }
    const V = !W;
    N === void 0 && F(V), typeof _ == "function" && _(V), typeof b == "function" && b(U);
  }, j = (U) => {
    !P && Ut(U.key) && (U.preventDefault(), ee(U));
  }, $ = m !== void 0 ? i.createElement(
    "span",
    {
      ...y("toggle-button", "icon", H),
      "aria-hidden": "true"
    },
    m
  ) : null;
  return i.createElement(
    "button",
    {
      ...x,
      ...y("toggle-button", "root", H),
      ...A,
      type: v,
      ref: o,
      disabled: P,
      "aria-pressed": String(W),
      "aria-disabled": P ? "true" : void 0,
      "aria-busy": C ? "true" : void 0,
      "data-pressed": String(W),
      onClick: Ma(x.onClick, ee),
      onKeyDown: Ma(x.onKeyDown, j)
    },
    g === "start" ? $ : null,
    i.createElement(
      "span",
      y("toggle-button", "label", H),
      q
    ),
    g === "end" ? $ : null,
    C ? i.createElement("span", {
      ...y("toggle-button", "spinner", H),
      "aria-hidden": "true"
    }) : null,
    R ? i.createElement(
      "span",
      {
        ...y("toggle-button", "status", H),
        ...Re({ live: "assertive" })
      },
      R.message
    ) : null
  );
});
pv.displayName = "ChipsToggleButton";
const mv = i.forwardRef((r, o) => {
  const {
    children: l,
    label: u,
    labelKey: d,
    labelParams: f,
    fallbackLabel: p,
    count: m,
    max: g,
    tone: v,
    icon: E,
    decorative: C = !1,
    disabled: w = !1,
    error: N = null,
    i18n: k,
    onStateChange: S,
    onDiagnostic: b,
    ..._
  } = r, I = _e(N), D = Ne({
    disabled: w,
    error: I
  }), x = I ? "error" : Fp(v), R = Dg(m, g), P = ta({
    children: l,
    value: R ?? u,
    key: d,
    params: f,
    fallback: p,
    i18n: k,
    onDiagnostic: b
  }), O = Ze({
    value: _["aria-label"],
    fallback: typeof P == "string" ? P : "",
    i18n: k,
    onDiagnostic: b
  });
  return i.createElement(
    "span",
    {
      ..._,
      ...y("badge", "root", D),
      ref: o,
      "data-tone": x,
      "data-count": R,
      "aria-hidden": C ? "true" : void 0,
      "aria-label": C ? void 0 : O || void 0,
      "aria-disabled": w ? "true" : void 0,
      "aria-invalid": I ? "true" : void 0
    },
    E ? i.createElement(
      "span",
      {
        ...y("badge", "icon", D),
        "aria-hidden": "true"
      },
      E
    ) : null,
    i.createElement(
      "span",
      y("badge", "label", D),
      P
    ),
    I ? i.createElement(
      "span",
      {
        ...y("badge", "status", D),
        ...Re({ live: "assertive" })
      },
      I.message
    ) : null
  );
});
mv.displayName = "ChipsBadge";
const hv = i.forwardRef((r, o) => {
  const {
    children: l,
    label: u,
    labelKey: d,
    labelParams: f,
    fallbackLabel: p,
    icon: m,
    disabled: g = !1,
    loading: v = !1,
    error: E = null,
    removable: C = !1,
    closeLabel: w,
    closeLabelKey: N,
    fallbackCloseLabel: k = "Remove tag",
    i18n: S,
    onRemove: b,
    onStateChange: _,
    onDiagnostic: I,
    ...D
  } = r, x = _e(E), R = g || v, { interaction: P, handlers: O } = Oe(R), A = Ne({
    disabled: R,
    loading: v,
    error: x,
    interaction: P
  }), Q = ta({
    children: l,
    value: u,
    key: d,
    params: f,
    fallback: p,
    i18n: S,
    onDiagnostic: I
  }), F = Ze({
    value: w,
    key: N,
    fallback: k,
    i18n: S,
    onDiagnostic: I
  });
  i.useEffect(() => {
    typeof _ == "function" && _(A);
  }, [A, _]);
  const W = (H) => {
    if (R) {
      H.preventDefault();
      return;
    }
    typeof b == "function" && b(H);
  }, q = (H) => {
    !R && Ut(H.key) && (H.preventDefault(), W(H));
  };
  return i.createElement(
    "span",
    {
      ...D,
      ...y("tag", "root", A),
      ...O,
      ref: o,
      "aria-disabled": R ? "true" : void 0,
      "aria-busy": v ? "true" : void 0,
      "aria-invalid": x ? "true" : void 0,
      "data-removable": String(C === !0)
    },
    m ? i.createElement(
      "span",
      {
        ...y("tag", "icon", A),
        "aria-hidden": "true"
      },
      m
    ) : null,
    i.createElement(
      "span",
      y("tag", "label", A),
      Q
    ),
    C ? i.createElement(
      "button",
      {
        ...y("tag", "close", A),
        type: "button",
        disabled: R,
        "aria-label": F,
        onClick: W,
        onKeyDown: q
      },
      it(void 0, "close")
    ) : null,
    x ? i.createElement(
      "span",
      {
        ...y("tag", "status", A),
        ...Re({ live: "assertive" })
      },
      x.message
    ) : null
  );
});
hv.displayName = "ChipsTag";
const yv = i.forwardRef((r, o) => {
  const {
    name: l,
    nameKey: u,
    nameParams: d,
    fallbackName: f,
    src: p,
    alt: m,
    initials: g,
    shape: v,
    decorative: E = !1,
    loading: C = !1,
    disabled: w = !1,
    error: N = null,
    i18n: k,
    onStateChange: S,
    onDiagnostic: b,
    ..._
  } = r, I = _e(N), D = w || C, x = Ze({
    value: l,
    key: u,
    params: d,
    fallback: f || m,
    i18n: k,
    onDiagnostic: b
  }), R = Ne({
    disabled: D,
    loading: C,
    error: I
  }), P = _g({
    initials: g,
    name: x,
    fallback: "?"
  }), O = E ? "" : m || x;
  if (!E && !x && !O)
    throw new Error("AVATAR_A11Y_LABEL_REQUIRED");
  return i.createElement(
    "span",
    {
      ..._,
      ...y("avatar", "root", R),
      ref: o,
      role: E ? void 0 : "img",
      "aria-label": E ? void 0 : x || O,
      "aria-hidden": E ? "true" : void 0,
      "aria-disabled": D ? "true" : void 0,
      "data-shape": wg(v)
    },
    p && !I ? i.createElement("img", {
      ...y("avatar", "image", R),
      src: p,
      alt: O,
      "aria-hidden": E ? "true" : void 0
    }) : i.createElement(
      "span",
      {
        ...y("avatar", "fallback", R),
        "aria-hidden": "true"
      },
      P
    ),
    I ? i.createElement(
      "span",
      {
        ...y("avatar", "status", R),
        ...Re({ live: "assertive" })
      },
      I.message
    ) : null
  );
});
yv.displayName = "ChipsAvatar";
const gv = i.forwardRef((r, o) => {
  const {
    src: l,
    alt: u,
    decorative: d = !1,
    caption: f,
    captionKey: p,
    captionParams: m,
    fallbackCaption: g,
    fallback: v,
    fit: E = "cover",
    objectPosition: C = "center",
    width: w,
    height: N,
    loading: k = !1,
    loadingStrategy: S,
    decoding: b,
    disabled: _ = !1,
    error: I = null,
    i18n: D,
    onLoad: x,
    onError: R,
    onStateChange: P,
    onDiagnostic: O,
    ...A
  } = r, Q = _e(I), F = Ug({
    src: l,
    alt: u,
    decorative: d,
    fit: E,
    objectPosition: C,
    width: w,
    height: N,
    loading: k,
    loaded: r.loaded === !0,
    disabled: _,
    error: Q
  }), W = F.state, q = ta({
    value: f,
    key: p,
    params: m,
    fallback: g,
    i18n: D,
    onDiagnostic: O
  });
  if (!F.decorative && !F.alt)
    throw new Error("IMAGE_A11Y_ALT_REQUIRED");
  typeof P == "function" && P(W);
  const H = {
    "--chips-image-fit": F.fit,
    "--chips-image-position": F.objectPosition
  };
  F.width !== void 0 && (H["--chips-image-width"] = typeof F.width == "number" ? `${F.width}px` : F.width), F.height !== void 0 && (H["--chips-image-height"] = typeof F.height == "number" ? `${F.height}px` : F.height);
  const ee = (U) => {
    typeof x == "function" && x(U);
  }, j = (U) => {
    const V = {
      code: "IMAGE_LOAD_ERROR",
      message: F.src ? `Image failed to load: ${F.src}` : "Image source is missing"
    };
    typeof R == "function" && R(V, U);
  }, $ = v !== void 0 ? v : F.loading ? "[[component.image.loading]]" : F.error ? F.error.message : "[[component.image.empty]]";
  return i.createElement(
    "figure",
    {
      ...A,
      ...y("image", "root", W),
      ref: o,
      role: F.decorative ? void 0 : "group",
      "aria-label": F.decorative ? void 0 : F.alt,
      "aria-hidden": F.decorative ? "true" : void 0,
      "aria-busy": F.loading ? "true" : void 0,
      "aria-disabled": _ ? "true" : void 0,
      "aria-invalid": F.error ? "true" : void 0,
      "data-fit": F.fit,
      "data-loaded": String(F.loaded),
      "data-has-source": String(F.hasSource)
    },
    F.hasSource && !F.error ? i.createElement("img", {
      ...y("image", "media", W),
      src: F.src,
      alt: F.alt,
      loading: S,
      decoding: b,
      width: F.width,
      height: F.height,
      style: H,
      "aria-hidden": F.decorative ? "true" : void 0,
      onLoad: ee,
      onError: j
    }) : null,
    F.fallbackVisible ? i.createElement(
      "div",
      {
        ...y("image", "fallback", W),
        ...Re({ live: F.error ? "assertive" : "polite" })
      },
      $
    ) : null,
    q ? i.createElement(
      "figcaption",
      y("image", "caption", W),
      q
    ) : null,
    F.error ? i.createElement(
      "span",
      {
        ...y("image", "status", W),
        ...Re({ live: "assertive" })
      },
      F.error.message
    ) : null
  );
});
gv.displayName = "ChipsImage";
const vv = i.forwardRef((r, o) => {
  const {
    kind: l = "generic",
    src: u,
    title: d,
    titleKey: f,
    titleParams: p,
    fallbackTitle: m,
    caption: g,
    captionKey: v,
    captionParams: E,
    fallbackCaption: C,
    poster: w,
    fit: N = "contain",
    objectPosition: k = "center",
    width: S,
    height: b,
    controls: _ = !1,
    controlsContent: I,
    muted: D = !1,
    loop: x = !1,
    autoPlay: R = !1,
    preload: P = "metadata",
    fallback: O,
    disabled: A = !1,
    loading: Q = !1,
    error: F = null,
    i18n: W,
    onLoadStart: q,
    onLoadedMetadata: H,
    onError: ee,
    onStateChange: j,
    onDiagnostic: $,
    children: U,
    ...V
  } = r, Z = Ze({
    value: d,
    key: f,
    params: p,
    fallback: m,
    i18n: W,
    onDiagnostic: $
  }), K = ta({
    value: g,
    key: v,
    params: E,
    fallback: C,
    i18n: W,
    onDiagnostic: $
  }), L = _e(F), M = Kg({
    kind: l,
    src: u,
    title: Z,
    caption: K,
    fit: N,
    objectPosition: k,
    poster: w,
    width: S,
    height: b,
    controls: _,
    muted: D,
    loop: x,
    autoPlay: R,
    disabled: A,
    loading: Q,
    error: L
  }), ne = M.state, te = M.kind === "audio" ? "audio" : M.kind === "video" ? "video" : "div", ce = {
    "--chips-media-fit": M.fit,
    "--chips-media-position": M.objectPosition
  };
  if (M.width !== void 0 && (ce["--chips-media-width"] = typeof M.width == "number" ? `${M.width}px` : M.width), M.height !== void 0 && (ce["--chips-media-height"] = typeof M.height == "number" ? `${M.height}px` : M.height), !Z && M.kind !== "generic")
    throw new Error("MEDIA_A11Y_TITLE_REQUIRED");
  if (M.kind === "generic" && !Z && U === void 0)
    throw new Error("MEDIA_A11Y_TITLE_REQUIRED");
  typeof j == "function" && j(ne);
  const Y = (ie) => {
    const ge = {
      code: "MEDIA_LOAD_ERROR",
      message: M.src ? `Media failed to load: ${M.src}` : "Media source is missing"
    };
    typeof ee == "function" && ee(ge, ie);
  }, ae = M.kind === "generic" ? M.loading || !!M.error || U === void 0 && !M.hasSource : M.fallbackVisible, de = O !== void 0 ? O : M.loading ? "[[component.media.loading]]" : M.error ? M.error.message : "[[component.media.empty]]";
  return i.createElement(
    "figure",
    {
      ...V,
      ...y("media", "root", ne),
      ref: o,
      role: "group",
      "aria-label": Z,
      "aria-busy": M.loading ? "true" : void 0,
      "aria-disabled": A ? "true" : void 0,
      "aria-invalid": M.error ? "true" : void 0,
      "data-kind": M.kind,
      "data-fit": M.fit,
      "data-has-source": String(M.hasSource),
      "data-controls": String(M.controls)
    },
    M.kind === "generic" ? i.createElement(
      "div",
      {
        ...y("media", "content", ne),
        style: ce
      },
      U
    ) : M.hasSource && !M.error ? i.createElement(te, {
      ...y("media", "content", ne),
      src: M.src,
      title: Z,
      poster: M.kind === "video" && M.poster || void 0,
      controls: M.controls,
      muted: M.muted,
      loop: M.loop,
      autoPlay: M.autoPlay,
      preload: P,
      style: ce,
      onLoadStart: q,
      onLoadedMetadata: H,
      onError: Y
    }) : null,
    ae ? i.createElement(
      "div",
      {
        ...y("media", "status", ne),
        ...Re({ live: M.error ? "assertive" : "polite" })
      },
      de
    ) : null,
    I ? i.createElement(
      "div",
      y("media", "controls", ne),
      I
    ) : null,
    K ? i.createElement(
      "figcaption",
      y("media", "caption", ne),
      K
    ) : null,
    M.error ? i.createElement(
      "span",
      {
        ...y("media", "status", ne),
        ...Re({ live: "assertive" })
      },
      M.error.message
    ) : null
  );
});
vv.displayName = "ChipsMedia";
const bv = i.forwardRef((r, o) => {
  const {
    label: l,
    labelKey: u,
    labelParams: d,
    fallbackLabel: f = "Loading",
    decorative: p = !1,
    loading: m = !0,
    disabled: g = !1,
    error: v = null,
    i18n: E,
    onStateChange: C,
    onDiagnostic: w,
    ...N
  } = r, k = _e(v), S = Ne({
    disabled: g,
    loading: m,
    error: k
  }), b = Ze({
    value: l || N["aria-label"],
    key: u,
    params: d,
    fallback: f,
    i18n: E,
    onDiagnostic: w
  });
  if (!p && !b)
    throw new Error("SPINNER_A11Y_LABEL_REQUIRED");
  return i.createElement(
    "span",
    {
      ...N,
      ...y("spinner", "root", S),
      ref: o,
      role: p ? void 0 : "status",
      "aria-label": p ? void 0 : b,
      "aria-hidden": p ? "true" : void 0,
      "aria-busy": p ? void 0 : String(m === !0),
      "aria-disabled": g ? "true" : void 0
    },
    i.createElement("span", {
      ...y("spinner", "track", S),
      "aria-hidden": "true"
    }),
    i.createElement("span", {
      ...y("spinner", "indicator", S),
      "aria-hidden": "true"
    }),
    k ? i.createElement(
      "span",
      {
        ...y("spinner", "status", S),
        ...Re({ live: "assertive" })
      },
      k.message
    ) : null
  );
});
bv.displayName = "ChipsSpinner";
const Uu = i.forwardRef((r, o) => {
  const {
    value: l,
    min: u = 0,
    max: d = 100,
    indeterminate: f = !1,
    label: p,
    labelKey: m,
    labelParams: g,
    fallbackLabel: v,
    showValue: E = !1,
    valueText: C,
    disabled: w = !1,
    loading: N = !1,
    error: k = null,
    i18n: S,
    onStateChange: b,
    onDiagnostic: _,
    ...I
  } = r, D = _e(k), x = $g({ value: l, min: u, max: d, indeterminate: f }), R = Ne({
    disabled: w,
    loading: N || x.indeterminate,
    error: D
  }), P = Ze({
    value: p || I["aria-label"],
    key: m,
    params: g,
    fallback: v,
    i18n: S,
    onDiagnostic: _
  });
  if (!P && !Qe(I["aria-labelledby"]))
    throw new Error("PROGRESS_A11Y_LABEL_REQUIRED");
  const O = Qe(C) ? C.trim() : x.indeterminate ? void 0 : `${Math.round(x.ratio * 100)}%`;
  return i.createElement(
    "div",
    {
      ...I,
      ...y("progress", "root", R),
      ref: o,
      role: "progressbar",
      "aria-label": P || void 0,
      "aria-labelledby": I["aria-labelledby"],
      "aria-valuemin": x.indeterminate ? void 0 : x.min,
      "aria-valuemax": x.indeterminate ? void 0 : x.max,
      "aria-valuenow": x.indeterminate ? void 0 : x.value,
      "aria-valuetext": O,
      "aria-disabled": w ? "true" : void 0,
      "data-mode": x.indeterminate ? "indeterminate" : "determinate",
      "data-value": x.value === void 0 ? void 0 : String(x.value),
      style: {
        "--chips-progress-ratio": x.ratio,
        ...I.style
      }
    },
    P ? i.createElement(
      "span",
      y("progress", "label", R),
      P
    ) : null,
    i.createElement(
      "span",
      y("progress", "track", R),
      i.createElement("span", {
        ...y("progress", "range", R),
        "aria-hidden": "true"
      })
    ),
    E && O ? i.createElement(
      "span",
      y("progress", "value", R),
      O
    ) : null,
    D ? i.createElement(
      "span",
      {
        ...y("progress", "status", R),
        ...Re({ live: "assertive" })
      },
      D.message
    ) : null
  );
});
Uu.displayName = "ChipsProgress";
function Ev(r, o) {
  return {
    name: r === "heart" ? "favorite" : "star",
    decorative: !0,
    fill: o ? 1 : 0,
    wght: o ? 500 : 400
  };
}
function Sv(r) {
  const o = Number(r);
  return Number.isFinite(o) ? Math.min(Math.max(Math.trunc(o), 1), 10) : 5;
}
function Ql(r, o) {
  const l = Number(r);
  return Number.isFinite(l) ? Math.min(Math.max(Math.round(l), 0), o) : 0;
}
const Ku = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u = 0,
    count: d = 5,
    shape: f = "star",
    readOnly: p = !1,
    disabled: m = !1,
    loading: g = !1,
    error: v = null,
    label: E,
    labelKey: C,
    labelParams: w,
    fallbackLabel: N,
    ariaLabel: k,
    ariaLabelledBy: S,
    getItemLabel: b,
    i18n: _,
    onValueChange: I,
    onStateChange: D,
    onDiagnostic: x,
    ...R
  } = r, P = Sv(d), O = Cg(f), [A, Q] = Je({
    value: l === void 0 ? void 0 : Ql(l, P),
    defaultValue: Ql(u, P),
    onChange: I
  }), F = Ql(A, P), W = _e(v), q = m || g, { interaction: H, handlers: ee } = Oe(q), j = Ne({
    disabled: q,
    loading: g,
    error: W,
    interaction: H
  }), $ = Ze({
    value: E || k || R["aria-label"],
    key: C,
    params: w,
    fallback: N,
    i18n: _,
    onDiagnostic: x
  }), U = Qe(S || R["aria-labelledby"]) ? String(S || R["aria-labelledby"]).trim() : void 0;
  if (!$ && !U)
    throw new Error("RATING_A11Y_LABEL_REQUIRED");
  const [V, Z] = i.useState(() => Math.max(F - 1, 0));
  i.useEffect(() => {
    Z(Math.max(F - 1, 0));
  }, [F, P]), i.useEffect(() => {
    typeof D == "function" && D(j);
  }, [j, D]);
  const K = (te, ce) => {
    const Y = Ql(te, P);
    if (q || p) {
      ce?.preventDefault?.();
      return;
    }
    Q(Y);
  }, L = (te, ce) => {
    const Y = Math.min(Math.max(te, 0), P - 1);
    Z(Y), K(Y + 1, ce);
  }, M = (te) => {
    if (!(q || p)) {
      if (te.key === "ArrowRight" || te.key === "ArrowDown") {
        te.preventDefault(), L(V + 1, te);
        return;
      }
      if (te.key === "ArrowLeft" || te.key === "ArrowUp") {
        te.preventDefault(), L(V - 1, te);
        return;
      }
      if (te.key === "Home") {
        te.preventDefault(), L(0, te);
        return;
      }
      te.key === "End" && (te.preventDefault(), L(P - 1, te));
    }
  }, ne = (te, ce) => typeof b == "function" ? b(te, {
    active: ce,
    count: P,
    shape: O
  }) : `${te} / ${P}`;
  return i.createElement(
    "div",
    {
      ...R,
      ...y("rating", "root", j),
      ...ee,
      ref: o,
      role: "radiogroup",
      "aria-label": $ || void 0,
      "aria-labelledby": U,
      "aria-disabled": q ? "true" : void 0,
      "aria-readonly": p ? "true" : void 0,
      "aria-invalid": W ? "true" : void 0,
      "data-value": String(F),
      "data-count": String(P),
      "data-shape": O,
      "data-readonly": String(p),
      onKeyDown: M
    },
    $ ? i.createElement(
      "span",
      y("rating", "label", j),
      $
    ) : null,
    Array.from({ length: P }, (te, ce) => {
      const Y = ce + 1, ae = Y === F, de = Y <= F, ie = q ? "disabled" : ae ? "active" : j, ge = q, se = p ? -1 : ce === V && !ge ? 0 : -1;
      return i.createElement(
        "button",
        {
          ...y("rating", "item", ie),
          key: Y,
          type: "button",
          role: "radio",
          disabled: ge,
          "aria-checked": String(ae),
          "aria-disabled": ge ? "true" : void 0,
          "aria-label": ne(Y, de),
          "data-selected": String(ae),
          "data-active": String(de),
          tabIndex: se,
          onFocus: () => Z(ce),
          onClick: (re) => K(Y, re)
        },
        i.createElement(
          "span",
          {
            ...y("rating", "icon", ie),
            "data-active": String(de)
          },
          i.createElement(Ao, {
            descriptor: Ev(O, de)
          })
        )
      );
    }),
    W ? i.createElement(
      "span",
      {
        ...y("rating", "status", j),
        ...Re({ live: "assertive" })
      },
      W.message
    ) : null
  );
});
Ku.displayName = "ChipsRating";
function Qt(r = {}) {
  const {
    scope: o,
    value: l,
    defaultValue: u,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    readOnly: m = !1,
    required: g = !1,
    label: v,
    labelKey: E,
    labelParams: C,
    fallbackLabel: w,
    description: N,
    descriptionKey: k,
    descriptionParams: S,
    fallbackDescription: b,
    ariaLabel: _,
    ariaLabelKey: I,
    ariaLabelParams: D,
    fallbackAriaLabel: x,
    ariaLabelledBy: R,
    ariaDescribedBy: P,
    i18n: O,
    onDiagnostic: A,
    interaction: Q
  } = r, F = _e(p), W = d || f, q = Ne({
    disabled: W,
    loading: f,
    error: F,
    interaction: Q
  }), H = Ze({
    value: v,
    key: E,
    params: C,
    fallback: w,
    i18n: O,
    onDiagnostic: A
  }), ee = Ze({
    value: N,
    key: k,
    params: S,
    fallback: b,
    i18n: O,
    onDiagnostic: A
  }), j = Ze({
    value: _,
    key: I,
    params: D,
    fallback: x || H,
    i18n: O,
    onDiagnostic: A
  }), $ = Qe(R) ? R.trim() : void 0, U = ee ? `${o}-description` : void 0, V = F ? `${o}-status` : void 0, Z = Tp([
    P,
    U,
    V
  ]);
  return {
    scope: o,
    state: q,
    disabledByState: W,
    normalizedError: F,
    required: g === !0,
    readOnly: m === !0,
    label: H,
    description: ee,
    descriptionId: U,
    statusId: V,
    ariaLabel: j || void 0,
    ariaLabelledBy: $,
    describedBy: Z || void 0,
    controlValueProps: l !== void 0 ? { value: l } : u !== void 0 ? { defaultValue: u } : {},
    hasAccessibleName: !!(j || $)
  };
}
function na(r, o) {
  if (!r.hasAccessibleName)
    throw new Error(o);
}
function Cv(r, o, l, u) {
  return u == null ? null : i.createElement(
    "span",
    {
      ...y(o, r, l),
      "aria-hidden": "true"
    },
    u
  );
}
function Vr(r) {
  return r.description ? i.createElement(
    "span",
    {
      ...y(r.scope, "description", r.state),
      id: r.descriptionId
    },
    r.description
  ) : null;
}
function Br(r) {
  return r.normalizedError ? i.createElement(
    "span",
    {
      ...y(r.scope, "status", r.state),
      id: r.statusId,
      ...Re({ live: "assertive" })
    },
    r.normalizedError.message
  ) : null;
}
function ii(r) {
  const {
    scope: o,
    descriptor: l,
    ref: u,
    placeholder: d,
    name: f,
    autoComplete: p,
    maxLength: m,
    minLength: g,
    inputMode: v,
    pattern: E,
    type: C = "text",
    rows: w,
    resize: N,
    onValueChange: k,
    onEnterPress: S,
    onKeyDown: b,
    onChange: _
  } = r, I = (x) => {
    typeof _ == "function" && _(x), typeof k == "function" && k(x.target.value, x);
  }, D = (x) => {
    x.key === "Enter" && typeof S == "function" && S(x.target.value, x), typeof b == "function" && b(x);
  };
  return {
    ...y(o, "control", l.state),
    ...l.controlValueProps,
    ref: u,
    type: C,
    name: f,
    rows: w,
    disabled: l.disabledByState,
    readOnly: l.readOnly,
    required: l.required,
    placeholder: d,
    autoComplete: p,
    maxLength: m,
    minLength: g,
    inputMode: v,
    pattern: E,
    "aria-label": l.ariaLabel,
    "aria-labelledby": l.ariaLabelledBy,
    "aria-describedby": l.describedBy,
    "aria-invalid": l.normalizedError ? "true" : void 0,
    "aria-disabled": l.disabledByState ? "true" : void 0,
    "aria-required": l.required ? "true" : void 0,
    "aria-readonly": l.readOnly ? "true" : void 0,
    "data-required": String(l.required),
    "data-readonly": String(l.readOnly),
    "data-invalid": l.normalizedError ? "true" : "false",
    "data-resize": N,
    onChange: I,
    onKeyDown: D
  };
}
const wv = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    readOnly: m = !1,
    required: g = !1,
    label: v,
    labelKey: E,
    labelParams: C,
    fallbackLabel: w,
    description: N,
    descriptionKey: k,
    descriptionParams: S,
    fallbackDescription: b,
    ariaLabel: _,
    ariaLabelKey: I,
    ariaLabelParams: D,
    fallbackAriaLabel: x,
    placeholder: R,
    name: P,
    autoComplete: O,
    maxLength: A,
    minLength: Q,
    inputMode: F,
    pattern: W,
    i18n: q,
    onValueChange: H,
    onStateChange: ee,
    onEnterPress: j,
    onChange: $,
    onKeyDown: U,
    onDiagnostic: V,
    ...Z
  } = r, K = {
    scope: "text-field",
    value: l,
    defaultValue: u,
    disabled: d,
    loading: f,
    error: p,
    readOnly: m,
    required: g,
    label: v,
    labelKey: E,
    labelParams: C,
    fallbackLabel: w,
    description: N,
    descriptionKey: k,
    descriptionParams: S,
    fallbackDescription: b,
    ariaLabel: _ || Z["aria-label"],
    ariaLabelKey: I,
    ariaLabelParams: D,
    fallbackAriaLabel: x,
    ariaLabelledBy: Z["aria-labelledby"],
    ariaDescribedBy: Z["aria-describedby"],
    i18n: q,
    onDiagnostic: V
  };
  na(
    Qt(K),
    "TEXT_FIELD_A11Y_LABEL_REQUIRED"
  );
  const L = d || f, { interaction: M, handlers: ne } = Oe(L), te = Qt({
    ...K,
    interaction: M
  });
  i.useEffect(() => {
    typeof ee == "function" && ee(te.state);
  }, [te.state, ee]);
  const ce = ii({
    scope: "text-field",
    descriptor: te,
    ref: o,
    placeholder: R,
    name: P,
    autoComplete: O,
    maxLength: A,
    minLength: Q,
    inputMode: F,
    pattern: W,
    onValueChange: H,
    onEnterPress: j,
    onKeyDown: U,
    onChange: $
  });
  return i.createElement(
    "div",
    {
      ...Z,
      ...y("text-field", "root", te.state),
      ...ne,
      "aria-disabled": te.disabledByState ? "true" : void 0,
      "aria-invalid": te.normalizedError ? "true" : void 0,
      "aria-required": te.required ? "true" : void 0,
      "data-required": String(te.required),
      "data-readonly": String(te.readOnly),
      "data-invalid": te.normalizedError ? "true" : "false"
    },
    te.label ? i.createElement(
      "span",
      y("text-field", "label", te.state),
      te.label
    ) : null,
    i.createElement("input", ce),
    Vr(te),
    Br(te)
  );
});
wv.displayName = "ChipsTextField";
const kv = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    readOnly: m = !1,
    required: g = !1,
    label: v,
    labelKey: E,
    labelParams: C,
    fallbackLabel: w,
    description: N,
    descriptionKey: k,
    descriptionParams: S,
    fallbackDescription: b,
    ariaLabel: _,
    ariaLabelKey: I,
    ariaLabelParams: D,
    fallbackAriaLabel: x,
    placeholder: R,
    name: P,
    rows: O = 3,
    resize: A = "block",
    maxLength: Q,
    minLength: F,
    i18n: W,
    onValueChange: q,
    onStateChange: H,
    onEnterPress: ee,
    onChange: j,
    onKeyDown: $,
    onDiagnostic: U,
    ...V
  } = r, Z = {
    scope: "text-area",
    value: l,
    defaultValue: u,
    disabled: d,
    loading: f,
    error: p,
    readOnly: m,
    required: g,
    label: v,
    labelKey: E,
    labelParams: C,
    fallbackLabel: w,
    description: N,
    descriptionKey: k,
    descriptionParams: S,
    fallbackDescription: b,
    ariaLabel: _ || V["aria-label"],
    ariaLabelKey: I,
    ariaLabelParams: D,
    fallbackAriaLabel: x,
    ariaLabelledBy: V["aria-labelledby"],
    ariaDescribedBy: V["aria-describedby"],
    i18n: W,
    onDiagnostic: U
  };
  na(
    Qt(Z),
    "TEXT_AREA_A11Y_LABEL_REQUIRED"
  );
  const K = d || f, { interaction: L, handlers: M } = Oe(K), ne = Qt({
    ...Z,
    interaction: L
  });
  i.useEffect(() => {
    typeof H == "function" && H(ne.state);
  }, [ne.state, H]);
  const te = ii({
    scope: "text-area",
    descriptor: ne,
    ref: o,
    placeholder: R,
    name: P,
    rows: O,
    resize: A,
    maxLength: Q,
    minLength: F,
    type: void 0,
    onValueChange: q,
    onEnterPress: ee,
    onKeyDown: $,
    onChange: j
  });
  return delete te.type, i.createElement(
    "div",
    {
      ...V,
      ...y("text-area", "root", ne.state),
      ...M,
      "aria-disabled": ne.disabledByState ? "true" : void 0,
      "aria-invalid": ne.normalizedError ? "true" : void 0,
      "aria-required": ne.required ? "true" : void 0,
      "data-required": String(ne.required),
      "data-readonly": String(ne.readOnly),
      "data-invalid": ne.normalizedError ? "true" : "false",
      "data-resize": A
    },
    ne.label ? i.createElement(
      "span",
      y("text-area", "label", ne.state),
      ne.label
    ) : null,
    i.createElement("textarea", te),
    Vr(ne),
    Br(ne)
  );
});
kv.displayName = "ChipsTextArea";
const xv = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    readOnly: m = !1,
    required: g = !1,
    label: v,
    labelKey: E,
    labelParams: C,
    fallbackLabel: w,
    description: N,
    descriptionKey: k,
    descriptionParams: S,
    fallbackDescription: b,
    ariaLabel: _,
    ariaLabelKey: I,
    ariaLabelParams: D,
    fallbackAriaLabel: x,
    placeholder: R,
    name: P,
    searchIcon: O,
    clearLabel: A,
    clearLabelKey: Q,
    fallbackClearLabel: F = "Clear search",
    showClear: W = !0,
    i18n: q,
    onValueChange: H,
    onSearch: ee,
    onEnterPress: j,
    onClear: $,
    onStateChange: U,
    onChange: V,
    onKeyDown: Z,
    onDiagnostic: K,
    ...L
  } = r, M = {
    scope: "search-field",
    value: l,
    defaultValue: u,
    disabled: d,
    loading: f,
    error: p,
    readOnly: m,
    required: g,
    label: v,
    labelKey: E,
    labelParams: C,
    fallbackLabel: w,
    description: N,
    descriptionKey: k,
    descriptionParams: S,
    fallbackDescription: b,
    ariaLabel: _ || L["aria-label"],
    ariaLabelKey: I,
    ariaLabelParams: D,
    fallbackAriaLabel: x,
    ariaLabelledBy: L["aria-labelledby"],
    ariaDescribedBy: L["aria-describedby"],
    i18n: q,
    onDiagnostic: K
  };
  na(
    Qt(M),
    "SEARCH_FIELD_A11Y_LABEL_REQUIRED"
  );
  const [ne, te] = i.useState(u ?? ""), ce = l !== void 0 ? l : ne, Y = d || f, { interaction: ae, handlers: de } = Oe(Y), ie = Qt({
    ...M,
    interaction: ae
  }), ge = Ze({
    value: A,
    key: Q,
    fallback: F,
    i18n: q,
    onDiagnostic: K
  });
  i.useEffect(() => {
    typeof U == "function" && U(ie.state);
  }, [ie.state, U]);
  const se = (Ce, Ae) => {
    l === void 0 && te(Ce), typeof H == "function" && H(Ce, Ae);
  }, re = (Ce, Ae) => {
    typeof ee == "function" && ee(Ce, Ae), typeof j == "function" && j(Ce, Ae);
  }, ye = (Ce) => {
    if (ie.disabledByState || ie.readOnly) {
      Ce.preventDefault();
      return;
    }
    l === void 0 && te(""), typeof H == "function" && H("", Ce), typeof $ == "function" && $(Ce);
  }, De = (Ce) => {
    Ut(Ce.key) && (Ce.preventDefault(), ye(Ce));
  }, Ue = ii({
    scope: "search-field",
    descriptor: {
      ...ie,
      controlValueProps: { value: ce }
    },
    ref: o,
    placeholder: R,
    name: P,
    type: "search",
    onValueChange: se,
    onEnterPress: re,
    onKeyDown: Z,
    onChange: V
  });
  return i.createElement(
    "div",
    {
      ...L,
      ...y("search-field", "root", ie.state),
      ...de,
      role: "search",
      "aria-disabled": ie.disabledByState ? "true" : void 0,
      "aria-invalid": ie.normalizedError ? "true" : void 0,
      "aria-required": ie.required ? "true" : void 0,
      "data-required": String(ie.required),
      "data-readonly": String(ie.readOnly),
      "data-invalid": ie.normalizedError ? "true" : "false"
    },
    ie.label ? i.createElement(
      "span",
      y("search-field", "label", ie.state),
      ie.label
    ) : null,
    Cv(
      "search-icon",
      "search-field",
      ie.state,
      O ?? it(void 0, "search")
    ),
    i.createElement("input", Ue),
    W && ce ? i.createElement(
      "button",
      {
        ...y("search-field", "clear", ie.state),
        type: "button",
        disabled: ie.disabledByState || ie.readOnly,
        "aria-label": ge,
        onClick: ye,
        onKeyDown: De
      },
      it(void 0, "close")
    ) : null,
    Vr(ie),
    Br(ie)
  );
});
xv.displayName = "ChipsSearchField";
const Iv = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    readOnly: m = !1,
    required: g = !1,
    label: v,
    labelKey: E,
    labelParams: C,
    fallbackLabel: w,
    description: N,
    descriptionKey: k,
    descriptionParams: S,
    fallbackDescription: b,
    ariaLabel: _,
    ariaLabelKey: I,
    ariaLabelParams: D,
    fallbackAriaLabel: x,
    placeholder: R,
    name: P,
    autoComplete: O = "current-password",
    revealLabel: A,
    revealLabelKey: Q,
    fallbackRevealLabel: F = "Show password",
    concealLabel: W,
    concealLabelKey: q,
    fallbackConcealLabel: H = "Hide password",
    visible: ee,
    defaultVisible: j = !1,
    i18n: $,
    onValueChange: U,
    onVisibilityChange: V,
    onStateChange: Z,
    onEnterPress: K,
    onChange: L,
    onKeyDown: M,
    onDiagnostic: ne,
    ...te
  } = r, ce = {
    scope: "secure-field",
    value: l,
    defaultValue: u,
    disabled: d,
    loading: f,
    error: p,
    readOnly: m,
    required: g,
    label: v,
    labelKey: E,
    labelParams: C,
    fallbackLabel: w,
    description: N,
    descriptionKey: k,
    descriptionParams: S,
    fallbackDescription: b,
    ariaLabel: _ || te["aria-label"],
    ariaLabelKey: I,
    ariaLabelParams: D,
    fallbackAriaLabel: x,
    ariaLabelledBy: te["aria-labelledby"],
    ariaDescribedBy: te["aria-describedby"],
    i18n: $,
    onDiagnostic: ne
  };
  na(
    Qt(ce),
    "SECURE_FIELD_A11Y_LABEL_REQUIRED"
  );
  const [Y, ae] = i.useState(j === !0), de = ee !== void 0 ? ee === !0 : Y, ie = d || f, { interaction: ge, handlers: se } = Oe(ie), re = Qt({
    ...ce,
    interaction: ge
  }), ye = Ze({
    value: de ? W : A,
    key: de ? q : Q,
    fallback: de ? H : F,
    i18n: $,
    onDiagnostic: ne
  });
  i.useEffect(() => {
    typeof Z == "function" && Z(re.state);
  }, [re.state, Z]);
  const De = (Ae) => {
    if (re.disabledByState || re.readOnly) {
      Ae.preventDefault();
      return;
    }
    const me = !de;
    ee === void 0 && ae(me), typeof V == "function" && V(me, Ae);
  }, Ue = (Ae) => {
    Ut(Ae.key) && (Ae.preventDefault(), De(Ae));
  }, Ce = ii({
    scope: "secure-field",
    descriptor: re,
    ref: o,
    placeholder: R,
    name: P,
    autoComplete: O,
    type: de ? "text" : "password",
    onValueChange: U,
    onEnterPress: K,
    onKeyDown: M,
    onChange: L
  });
  return i.createElement(
    "div",
    {
      ...te,
      ...y("secure-field", "root", re.state),
      ...se,
      "aria-disabled": re.disabledByState ? "true" : void 0,
      "aria-invalid": re.normalizedError ? "true" : void 0,
      "aria-required": re.required ? "true" : void 0,
      "data-required": String(re.required),
      "data-readonly": String(re.readOnly),
      "data-invalid": re.normalizedError ? "true" : "false",
      "data-visible": String(de)
    },
    re.label ? i.createElement(
      "span",
      y("secure-field", "label", re.state),
      re.label
    ) : null,
    i.createElement("input", Ce),
    i.createElement(
      "button",
      {
        ...y("secure-field", "visibility-toggle", re.state),
        type: "button",
        disabled: re.disabledByState || re.readOnly,
        "aria-label": ye,
        "aria-pressed": String(de),
        onClick: De,
        onKeyDown: Ue
      },
      i.createElement(
        "span",
        {
          ...y("secure-field", "visibility-icon", re.state),
          "aria-hidden": "true"
        },
        it(void 0, de ? "visibility-off" : "visibility")
      )
    ),
    Vr(re),
    Br(re)
  );
});
Iv.displayName = "ChipsSecureField";
const Dv = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    readOnly: m = !1,
    placeholder: g,
    onValueChange: v,
    onStateChange: E,
    onEnterPress: C
  } = r, w = _e(p), N = d || f, { interaction: k, handlers: S } = Oe(N), b = Ne({
    disabled: N,
    loading: f,
    error: w,
    interaction: k
  });
  i.useEffect(() => {
    typeof E == "function" && E(b);
  }, [b, E]);
  const _ = (x) => {
    typeof v == "function" && v(x.target.value);
  }, I = (x) => {
    x.key === "Enter" && typeof C == "function" && C(x.target.value);
  }, D = {
    ...y("input", "control", b),
    ref: o,
    disabled: N,
    readOnly: m,
    placeholder: g,
    "aria-invalid": w ? "true" : void 0,
    "aria-disabled": N ? "true" : void 0,
    onChange: _,
    onKeyDown: I,
    onFocus: S.onFocus,
    onBlur: S.onBlur
  };
  return l !== void 0 ? D.value = l : D.defaultValue = u, i.createElement(
    "div",
    {
      ...y("input", "root", b),
      ...S
    },
    i.createElement("input", D),
    w ? i.createElement(
      "span",
      {
        ...y("input", "status", b),
        ...Re({
          live: "assertive"
        })
      },
      w.message
    ) : null
  );
});
Dv.displayName = "ChipsInput";
const _v = i.forwardRef((r, o) => {
  const {
    checked: l,
    defaultChecked: u = !1,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    label: m,
    name: g,
    value: v,
    onCheckedChange: E,
    onStateChange: C
  } = r, w = _e(p), N = d || f, { interaction: k, handlers: S } = Oe(N), b = Ne({
    disabled: N,
    loading: f,
    error: w,
    interaction: k
  });
  i.useEffect(() => {
    typeof C == "function" && C(b);
  }, [b, C]);
  const _ = {
    ...y("checkbox", "control", b),
    ref: o,
    type: "checkbox",
    disabled: N,
    name: g,
    value: v,
    "aria-invalid": w ? "true" : void 0,
    onFocus: S.onFocus,
    onBlur: S.onBlur,
    onChange: (D) => {
      typeof E == "function" && E(D.target.checked);
    }
  };
  l !== void 0 ? _.checked = l : _.defaultChecked = u;
  const I = l !== void 0 ? l : u;
  return i.createElement(
    "label",
    {
      ...y("checkbox", "root", b),
      ...S,
      "data-checked": String(!!I),
      "aria-disabled": N ? "true" : void 0
    },
    i.createElement("input", _),
    i.createElement("span", {
      ...y("checkbox", "indicator", b),
      "aria-hidden": "true"
    }),
    m ? i.createElement(
      "span",
      y("checkbox", "label", b),
      m
    ) : null,
    w ? i.createElement(
      "span",
      {
        ...y("checkbox", "status", b),
        ...Re({
          live: "assertive"
        })
      },
      w.message
    ) : null
  );
});
_v.displayName = "ChipsCheckbox";
const Lv = i.forwardRef((r, o) => {
  const {
    name: l,
    value: u,
    defaultValue: d = "",
    disabled: f = !1,
    loading: p = !1,
    error: m = null,
    options: g = [],
    onValueChange: v,
    onStateChange: E
  } = r, C = _e(m), w = f || p, { interaction: N, handlers: k } = Oe(w), [S, b] = i.useState(d), _ = u !== void 0 ? u : S, I = Ne({
    disabled: w,
    loading: p,
    error: C,
    interaction: N
  });
  i.useEffect(() => {
    typeof E == "function" && E(I);
  }, [I, E]);
  const D = (x) => {
    w || (u === void 0 && b(x), typeof v == "function" && v(x));
  };
  return i.createElement(
    "fieldset",
    {
      ...y("radio", "root", I),
      ...k,
      ref: o,
      disabled: w,
      "aria-disabled": w ? "true" : void 0
    },
    g.map((x, R) => {
      const P = String(x.value), O = w || x.disabled === !0, A = _ === P;
      return i.createElement(
        "label",
        {
          ...y("radio", "item", I),
          key: `${P}-${R}`,
          "data-checked": String(A),
          "aria-disabled": O ? "true" : void 0
        },
        i.createElement("input", {
          ...y("radio", "control", I),
          type: "radio",
          name: l,
          checked: A,
          disabled: O,
          "aria-checked": String(A),
          onFocus: k.onFocus,
          onBlur: k.onBlur,
          onChange: () => D(P)
        }),
        i.createElement("span", {
          ...y("radio", "indicator", I),
          "aria-hidden": "true"
        }),
        i.createElement(
          "span",
          y("radio", "label", I),
          x.label
        )
      );
    }),
    C ? i.createElement(
      "span",
      {
        ...y("radio", "status", I),
        ...Re({
          live: "assertive"
        })
      },
      C.message
    ) : null
  );
});
Lv.displayName = "ChipsRadioGroup";
const Rv = i.forwardRef((r, o) => {
  const {
    checked: l,
    defaultChecked: u = !1,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    label: m,
    onCheckedChange: g,
    onStateChange: v
  } = r, E = _e(p), C = d || f, { interaction: w, handlers: N } = Oe(C), [k, S] = i.useState(u === !0), b = l !== void 0 ? l : k, _ = Ne({
    disabled: C,
    loading: f,
    error: E,
    interaction: w
  });
  i.useEffect(() => {
    typeof v == "function" && v(_);
  }, [_, v]);
  const I = (x) => {
    if (C) {
      x.preventDefault();
      return;
    }
    const R = !b;
    l === void 0 && S(R), typeof g == "function" && g(R);
  }, D = (x) => {
    Ut(x.key) && (x.preventDefault(), I(x));
  };
  return i.createElement(
    "button",
    {
      ...y("switch", "root", _),
      ...N,
      ref: o,
      type: "button",
      role: "switch",
      "aria-checked": String(b),
      "aria-disabled": C ? "true" : void 0,
      "aria-busy": f ? "true" : void 0,
      "data-checked": String(b),
      disabled: C,
      onClick: I,
      onKeyDown: D
    },
    i.createElement(
      "span",
      {
        ...y("switch", "track", _),
        "aria-hidden": "true"
      },
      i.createElement("span", {
        ...y("switch", "thumb", _),
        "aria-hidden": "true"
      })
    ),
    m ? i.createElement(
      "span",
      y("switch", "label", _),
      m
    ) : null,
    E ? i.createElement(
      "span",
      {
        ...y("switch", "status", _),
        ...Re({
          live: "assertive"
        })
      },
      E.message
    ) : null
  );
});
Rv.displayName = "ChipsSwitch";
function em(r, o) {
  const l = r.findIndex((d) => d.value === o.value);
  if (l < 0)
    return [...r, o];
  const u = [...r];
  return u[l] = o, u;
}
function tm(r, o) {
  return r.filter((l) => l.value !== o);
}
function mn(r, o) {
  const l = /* @__PURE__ */ new Map();
  for (const u of o)
    l.set(u.value, u);
  for (const u of r)
    l.set(u.value, u);
  return Array.from(l.values());
}
function Un(r, o) {
  return r.find((l) => l.value === o && l.disabled !== !0) || null;
}
function Ra(r) {
  return r[un(r)] || null;
}
function nm(r) {
  return r[Lt(r, 0, "prev", !0)] || null;
}
function rm(r, o, l = "next", u = !0) {
  const d = r.findIndex((f) => f.value === o);
  return r[Lt(r, d, l, u)] || null;
}
function Kn(r) {
  const o = r?.ref?.current;
  o && typeof o.focus == "function" && o.focus();
}
function wp(r, o) {
  return Un(r, o) || Ra(r);
}
const [Nv, si] = $n("select"), vu = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u = "",
    open: d,
    defaultOpen: f = !1,
    disabled: p = !1,
    loading: m = !1,
    error: g = null,
    placeholder: v = "",
    iconContent: E,
    options: C = [],
    children: w,
    onValueChange: N,
    onOpenChange: k,
    onStateChange: S,
    ...b
  } = r, _ = _e(g), I = p || m, { interaction: D, handlers: x } = Oe(I), R = Mo(C), [P, O] = Je({
    value: l !== void 0 ? String(l) : void 0,
    defaultValue: u !== void 0 ? String(u) : "",
    onChange: N
  }), [A, Q] = Je({
    value: d,
    defaultValue: f === !0,
    onChange: k
  }), [F, W] = i.useState(null), q = i.useRef([]), [H, ee] = i.useState(0), j = i.useRef(null), $ = Ne({
    disabled: I,
    loading: m,
    error: _,
    interaction: D
  });
  i.useEffect(() => {
    typeof S == "function" && S($);
  }, [$, S]);
  const U = i.useId(), V = b.id || U, Z = `${V}-trigger`, K = `${V}-content`, L = i.useMemo(
    () => mn(q.current, R),
    [H, R]
  ), M = L.find((me) => me.value === String(P)) || R.find((me) => me.value === String(P)) || null, ne = Un(L, F), te = i.useMemo(
    () => Tu(L, {
      activeId: F || P
    }),
    [P, F, L]
  ), ce = i.useCallback((me) => (q.current = em(q.current, me), ee((ue) => ue + 1), () => {
    q.current = tm(q.current, me.value), ee((ue) => ue + 1);
  }), []), Y = i.useCallback(
    (me) => {
      I || Q(!!me);
    },
    [I, Q]
  ), ae = i.useCallback(
    (me, ue = {}) => {
      const Me = me === null ? null : Un(q.current, String(me)) || Un(R, String(me));
      W(Me ? Me.value : null), ue.focus && Kn(Me);
    },
    [R]
  ), de = i.useCallback(
    (me = {}) => {
      const ue = wp(
        mn(q.current, R),
        String(P)
      );
      W(ue ? ue.value : null), me.focus && Kn(ue);
    },
    [P, R]
  ), ie = i.useCallback(
    (me = {}) => {
      const ue = Ra(mn(q.current, R));
      W(ue ? ue.value : null), me.focus && Kn(ue);
    },
    [R]
  ), ge = i.useCallback(
    (me = {}) => {
      const ue = nm(mn(q.current, R));
      W(ue ? ue.value : null), me.focus && Kn(ue);
    },
    [R]
  ), se = i.useCallback(
    (me, ue = {}) => {
      const Me = mn(q.current, R), Ke = rm(Me, F, me, !0);
      W(Ke ? Ke.value : null), ue.focus && Kn(Ke);
    },
    [F, R]
  ), re = i.useCallback(
    (me, ue = {}) => {
      const Me = Un(
        mn(q.current, R),
        String(me)
      );
      if (!Me || I) {
        ue.event?.preventDefault?.();
        return;
      }
      O(Me.value), Q(!1), W(Me.value), j.current && typeof j.current.focus == "function" && j.current.focus();
    },
    [I, R, Q, O]
  ), ye = i.useCallback(
    (me = {}) => {
      I || (Q(!0), de(me));
    },
    [I, de, Q]
  ), De = i.useCallback(
    () => {
      I || Q(!1);
    },
    [I, Q]
  ), Ue = i.useCallback((me) => {
    if (I) {
      me?.preventDefault?.();
      return;
    }
    const ue = !A;
    Q(ue), ue && de();
  }, [A, I, de, Q]);
  i.useEffect(() => {
    if (!A)
      return;
    if (!Un(L, F)) {
      const ue = wp(L, String(P));
      W(ue ? ue.value : null);
    }
  }, [A, P, F, L]);
  const Ce = i.useMemo(
    () => ({
      state: $,
      open: !!A,
      disabled: I,
      loading: m,
      error: _,
      value: String(P ?? ""),
      highlightedValue: F,
      selectedOption: M,
      highlightedOption: ne,
      selectableOptions: L,
      rovingModel: te,
      placeholder: v,
      baseId: V,
      triggerId: Z,
      contentId: K,
      triggerRef: j,
      registerOption: ce,
      updateOpen: Y,
      openList: ye,
      closeList: De,
      toggleOpen: Ue,
      highlightValue: ae,
      highlightSelectedOrFirst: de,
      highlightFirst: ie,
      highlightLast: ge,
      highlightNext: se,
      selectValue: re
    }),
    [
      $,
      A,
      I,
      m,
      _,
      P,
      F,
      M,
      ne,
      L,
      te,
      v,
      V,
      Z,
      K,
      ce,
      Y,
      ye,
      De,
      Ue,
      ae,
      de,
      ie,
      ge,
      se,
      re
    ]
  ), Ae = i.createElement(
    i.Fragment,
    null,
    i.createElement(
      ju,
      null,
      i.createElement($u, null),
      i.createElement(
        "span",
        {
          ...y("select", "icon", $),
          "aria-hidden": "true"
        },
        it(E, "chevron-down")
      )
    ),
    i.createElement(
      Hu,
      null,
      R.map(
        (me, ue) => i.createElement(
          qu,
          {
            key: `${me.value}-${ue}`,
            value: me.value,
            disabled: me.disabled,
            textValue: me.textValue,
            index: ue
          },
          me.label
        )
      )
    )
  );
  return i.createElement(
    Nv.Provider,
    { value: Ce },
    i.createElement(
      "div",
      {
        ...b,
        ...y("select", "root", $),
        ...x,
        ref: o,
        "aria-disabled": I ? "true" : void 0,
        "data-open": String(!!A)
      },
      w !== void 0 ? w : Ae,
      _ ? i.createElement(
        "span",
        {
          ...y("select", "status", $),
          ...Re({
            live: "assertive"
          })
        },
        _.message
      ) : null
    )
  );
});
vu.displayName = "ChipsSelect.Root";
const ju = i.forwardRef((r, o) => {
  const { children: l, onClick: u, onKeyDown: d, ...f } = r, p = si("trigger"), m = i.useRef(null);
  i.useImperativeHandle(o, () => m.current), i.useEffect(() => (p.triggerRef.current = m.current, () => {
    p.triggerRef.current === m.current && (p.triggerRef.current = null);
  }), [p.triggerRef]);
  const g = (v) => {
    if (typeof d == "function" && d(v), !(v.defaultPrevented || p.disabled)) {
      if (v.key === "ArrowDown") {
        v.preventDefault(), p.open ? p.highlightNext("next") : p.openList();
        return;
      }
      if (v.key === "ArrowUp") {
        v.preventDefault(), p.open ? p.highlightNext("prev") : (p.updateOpen(!0), p.highlightLast());
        return;
      }
      if (v.key === "Home" && p.open) {
        v.preventDefault(), p.highlightFirst();
        return;
      }
      if (v.key === "End" && p.open) {
        v.preventDefault(), p.highlightLast();
        return;
      }
      if (v.key === "Escape" && p.open) {
        v.preventDefault(), p.closeList();
        return;
      }
      Ut(v.key) && (v.preventDefault(), p.open && p.highlightedValue !== null ? p.selectValue(p.highlightedValue, { source: "keyboard", event: v }) : p.openList());
    }
  };
  return i.createElement(
    "button",
    {
      ...f,
      ...y("select", "trigger", p.state),
      ref: m,
      id: f.id || p.triggerId,
      type: "button",
      role: "button",
      disabled: p.disabled,
      "aria-disabled": p.disabled ? "true" : void 0,
      "aria-haspopup": "listbox",
      "aria-expanded": String(p.open),
      "aria-controls": p.contentId,
      "aria-activedescendant": p.open && p.highlightedOption ? p.highlightedOption.id : void 0,
      onClick: tt(u, p.toggleOpen),
      onKeyDown: g
    },
    l
  );
});
ju.displayName = "ChipsSelect.Trigger";
const $u = i.forwardRef((r, o) => {
  const { children: l, placeholder: u, ...d } = r, f = si("value"), p = u !== void 0 ? u : f.placeholder;
  return i.createElement(
    "span",
    {
      ...d,
      ...y("select", "value", f.state),
      ref: o,
      "data-placeholder": String(!f.selectedOption)
    },
    l !== void 0 ? l : f.selectedOption ? f.selectedOption.label : p
  );
});
$u.displayName = "ChipsSelect.Value";
const Hu = i.forwardRef((r, o) => {
  const { children: l, onKeyDown: u, ...d } = r, f = si("content"), p = (m) => {
    if (typeof u == "function" && u(m), !(m.defaultPrevented || f.disabled)) {
      if (m.key === "Escape") {
        m.preventDefault(), f.closeList();
        return;
      }
      if (m.key === "ArrowDown") {
        m.preventDefault(), f.highlightNext("next", { focus: !0 });
        return;
      }
      if (m.key === "ArrowUp") {
        m.preventDefault(), f.highlightNext("prev", { focus: !0 });
        return;
      }
      if (m.key === "Home") {
        m.preventDefault(), f.highlightFirst({ focus: !0 });
        return;
      }
      if (m.key === "End") {
        m.preventDefault(), f.highlightLast({ focus: !0 });
        return;
      }
      Ut(m.key) && f.highlightedValue !== null && (m.preventDefault(), f.selectValue(f.highlightedValue, { source: "keyboard", event: m }));
    }
  };
  return f.open ? i.createElement(
    "div",
    {
      ...d,
      ...y("select", "content", f.state),
      ref: o,
      id: d.id || f.contentId,
      role: d.role || "listbox",
      "aria-labelledby": d["aria-labelledby"] || f.triggerId,
      tabIndex: d.tabIndex ?? -1,
      onKeyDown: p
    },
    l
  ) : null;
});
Hu.displayName = "ChipsSelect.Content";
const qu = i.forwardRef((r, o) => {
  const {
    children: l,
    value: u,
    disabled: d = !1,
    textValue: f,
    index: p = 0,
    onClick: m,
    onMouseEnter: g,
    onFocus: v,
    ...E
  } = r, C = si("option"), w = String(u), N = Or(w, String(p)), k = E.id || `${C.baseId}-option-${N}`, S = C.disabled || d, b = C.value === w, _ = C.highlightedValue === w, I = ac(C.rovingModel, w), D = S ? "disabled" : b ? "active" : _ ? "hover" : C.state === "disabled" || C.state === "loading" || C.state === "error" ? C.state : "idle", x = i.useRef(null);
  i.useImperativeHandle(o, () => x.current);
  const R = l !== void 0 ? l : f ?? w;
  i.useEffect(
    () => C.registerOption({
      value: w,
      disabled: S,
      label: R,
      textValue: f,
      id: k,
      ref: x
    }),
    [C.registerOption, S, R, k, w, f]
  );
  const P = (A) => {
    if (S) {
      A?.preventDefault?.();
      return;
    }
    C.selectValue(w, { source: "pointer", event: A });
  }, O = (A) => {
    typeof g == "function" && A.type === "mouseenter" && g(A), typeof v == "function" && A.type === "focus" && v(A), !A.defaultPrevented && !S && C.highlightValue(w);
  };
  return i.createElement(
    "div",
    {
      ...E,
      ...y("select", "option", D),
      ref: x,
      id: k,
      role: E.role || "option",
      ...Pu(I || { active: _, disabled: S }, { includeAriaDisabled: !1 }),
      "aria-selected": String(b),
      "aria-disabled": S ? "true" : void 0,
      "data-selected": String(b),
      "data-highlighted": String(_),
      onMouseEnter: O,
      onFocus: O,
      onClick: tt(m, P)
    },
    l
  );
});
qu.displayName = "ChipsSelect.Option";
const Tv = Object.assign(vu, {
  Root: vu,
  Trigger: ju,
  Content: Hu,
  Option: qu,
  Value: $u
});
Tv.displayName = "ChipsSelect";
const am = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u = "",
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    options: m = [],
    ariaLabel: g,
    ariaLabelledBy: v,
    i18n: E,
    onValueChange: C,
    onStateChange: w,
    onDiagnostic: N,
    ...k
  } = r, S = _e(p), b = d || f, { interaction: _, handlers: I } = Oe(b), D = Mo(m), [x, R] = Je({
    value: l,
    defaultValue: u,
    onChange: C
  }), P = D.findIndex((j) => j.value === String(x)), [O, A] = i.useState(
    P >= 0 ? P : un(D)
  );
  i.useEffect(() => {
    const j = D.findIndex(($) => $.value === String(x));
    if (j >= 0 && D[j]?.disabled !== !0) {
      A(j);
      return;
    }
    A(un(D));
  }, [x, D]);
  const Q = Ne({
    disabled: b,
    loading: f,
    error: S,
    interaction: _
  }), F = Ze({
    value: g || k["aria-label"],
    fallback: "",
    i18n: E,
    onDiagnostic: N
  }), W = Qe(v || k["aria-labelledby"]) ? String(v || k["aria-labelledby"]).trim() : void 0;
  if (!F && !W)
    throw new Error("SEGMENTED_CONTROL_A11Y_LABEL_REQUIRED");
  i.useEffect(() => {
    typeof w == "function" && w(Q);
  }, [Q, w]);
  const q = (j, $) => {
    if (b || !j || j.disabled) {
      $ && $.preventDefault();
      return;
    }
    R(j.value);
  }, H = (j, $) => {
    const U = D[j];
    !U || U.disabled || (A(j), q(U, $));
  }, ee = (j) => {
    if (!(b || D.length === 0)) {
      if (j.key === "ArrowRight" || j.key === "ArrowDown") {
        j.preventDefault(), H(Lt(D, O, "next", !0), j);
        return;
      }
      if (j.key === "ArrowLeft" || j.key === "ArrowUp") {
        j.preventDefault(), H(Lt(D, O, "prev", !0), j);
        return;
      }
      if (j.key === "Home") {
        j.preventDefault(), H(un(D), j);
        return;
      }
      j.key === "End" && (j.preventDefault(), H(Lt(D, 0, "prev", !0), j));
    }
  };
  return i.createElement(
    "div",
    {
      ...k,
      ...y("segmented-control", "root", Q),
      ...I,
      ref: o,
      role: "radiogroup",
      "aria-label": F || void 0,
      "aria-labelledby": W,
      "aria-disabled": b ? "true" : void 0,
      "aria-invalid": S ? "true" : void 0,
      "data-value": x !== void 0 ? String(x) : "",
      onKeyDown: ee
    },
    D.map((j, $) => {
      const U = j.value === String(x), V = b || j.disabled, Z = V ? "disabled" : U ? "active" : Q;
      return i.createElement(
        "button",
        {
          ...y("segmented-control", "item", Z),
          key: `${j.value}-${$}`,
          type: "button",
          role: "radio",
          disabled: V,
          "aria-checked": String(U),
          "aria-disabled": V ? "true" : void 0,
          "data-selected": String(U),
          tabIndex: $ === O && !V ? 0 : -1,
          onFocus: () => A($),
          onClick: (K) => q(j, K)
        },
        U ? i.createElement("span", {
          ...y("segmented-control", "indicator", Z),
          "aria-hidden": "true"
        }) : null,
        i.createElement(
          "span",
          y("segmented-control", "label", Z),
          j.label
        )
      );
    }),
    S ? i.createElement(
      "span",
      {
        ...y("segmented-control", "status", Q),
        ...Re({ live: "assertive" })
      },
      S.message
    ) : null
  );
});
am.displayName = "ChipsSegmentedControl";
const Pv = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u = "",
    inputValue: d,
    defaultInputValue: f = "",
    open: p,
    defaultOpen: m = !1,
    disabled: g = !1,
    loading: v = !1,
    error: E = null,
    readOnly: C = !1,
    required: w = !1,
    label: N,
    labelKey: k,
    labelParams: S,
    fallbackLabel: b,
    description: _,
    descriptionKey: I,
    descriptionParams: D,
    fallbackDescription: x,
    ariaLabel: R,
    ariaLabelKey: P,
    ariaLabelParams: O,
    fallbackAriaLabel: A,
    placeholder: Q,
    name: F,
    autoComplete: W = "off",
    options: q = [],
    emptyLabel: H,
    emptyLabelKey: ee,
    fallbackEmptyLabel: j = "No results",
    triggerLabel: $,
    triggerLabelKey: U,
    fallbackTriggerLabel: V = "Toggle options",
    i18n: Z,
    onValueChange: K,
    onInputValueChange: L,
    onOpenChange: M,
    onStateChange: ne,
    onDiagnostic: te,
    onKeyDown: ce,
    onChange: Y,
    ...ae
  } = r, de = {
    scope: "combo-box",
    value: d,
    defaultValue: f,
    disabled: g,
    loading: v,
    error: E,
    readOnly: C,
    required: w,
    label: N,
    labelKey: k,
    labelParams: S,
    fallbackLabel: b,
    description: _,
    descriptionKey: I,
    descriptionParams: D,
    fallbackDescription: x,
    ariaLabel: R || ae["aria-label"],
    ariaLabelKey: P,
    ariaLabelParams: O,
    fallbackAriaLabel: A,
    ariaLabelledBy: ae["aria-labelledby"],
    ariaDescribedBy: ae["aria-describedby"],
    i18n: Z,
    onDiagnostic: te
  };
  na(
    Qt(de),
    "COMBO_BOX_A11Y_LABEL_REQUIRED"
  );
  const ie = Mo(q), [ge, se] = Je({
    value: l,
    defaultValue: u,
    onChange: K
  }), [re, ye] = Je({
    value: d,
    defaultValue: f,
    onChange: L
  }), [De, Ue] = Je({
    value: p,
    defaultValue: m === !0,
    onChange: M
  }), Ce = g || v, { interaction: Ae, handlers: me } = Oe(Ce), ue = Qt({
    ...de,
    value: re,
    defaultValue: void 0,
    interaction: Ae
  }), Me = (() => {
    const he = String(re || "").trim().toLocaleLowerCase();
    return he ? ie.filter(
      (ot) => Sp(ot).toLocaleLowerCase().includes(he) || ot.value.toLocaleLowerCase().includes(he)
    ) : ie;
  })(), Ke = Me.findIndex((he) => he.value === String(ge)), [$e, Ye] = i.useState(
    Ke >= 0 ? Ke : un(Me)
  );
  i.useEffect(() => {
    if (Ke >= 0 && Me[Ke]?.disabled !== !0) {
      Ye(Ke);
      return;
    }
    Ye(un(Me));
  }, [Me, Ke]), i.useEffect(() => {
    typeof ne == "function" && ne(ue.state);
  }, [ue.state, ne]);
  const st = i.useId(), mt = De && $e >= 0 ? Me[$e] : null, bt = mt ? `${st}-option-${mt.value}` : void 0, ht = Ze({
    value: H,
    key: ee,
    fallback: j,
    i18n: Z,
    onDiagnostic: te
  }), ke = Ze({
    value: $,
    key: U,
    fallback: V,
    i18n: Z,
    onDiagnostic: te
  }), Xe = (he) => {
    ue.disabledByState || ue.readOnly || Ue(he);
  }, St = (he, ot) => {
    if (!he || he.disabled || ue.disabledByState || ue.readOnly) {
      ot && ot.preventDefault();
      return;
    }
    se(he.value), ye(Sp(he)), Ue(!1);
  }, Mt = (he) => {
    typeof Y == "function" && Y(he), ye(he.target.value), !De && !ue.disabledByState && !ue.readOnly && Ue(!0);
  }, Kt = (he) => {
    he.key === "Escape" && De ? (he.preventDefault(), Ue(!1)) : he.key === "ArrowDown" ? (he.preventDefault(), De ? Ye(Lt(Me, $e, "next", !0)) : Xe(!0)) : he.key === "ArrowUp" ? (he.preventDefault(), De ? Ye(Lt(Me, $e, "prev", !0)) : Xe(!0)) : he.key === "Home" && De ? (he.preventDefault(), Ye(un(Me))) : he.key === "End" && De ? (he.preventDefault(), Ye(Lt(Me, 0, "prev", !0))) : he.key === "Enter" && De && (he.preventDefault(), St(Me[$e], he)), typeof ce == "function" && ce(he);
  };
  return i.createElement(
    "div",
    {
      ...ae,
      ...y("combo-box", "root", ue.state),
      ...me,
      "aria-disabled": ue.disabledByState ? "true" : void 0,
      "aria-invalid": ue.normalizedError ? "true" : void 0,
      "aria-required": ue.required ? "true" : void 0,
      "data-open": String(De),
      "data-required": String(ue.required),
      "data-readonly": String(ue.readOnly),
      "data-invalid": ue.normalizedError ? "true" : "false"
    },
    ue.label ? i.createElement(
      "span",
      y("combo-box", "label", ue.state),
      ue.label
    ) : null,
    i.createElement("input", {
      ...y("combo-box", "control", ue.state),
      ...ue.controlValueProps,
      ref: o,
      role: "combobox",
      type: "text",
      name: F,
      placeholder: Q,
      autoComplete: W,
      disabled: ue.disabledByState,
      readOnly: ue.readOnly,
      required: ue.required,
      "aria-autocomplete": "list",
      "aria-expanded": String(De),
      "aria-controls": st,
      "aria-activedescendant": bt,
      "aria-label": ue.ariaLabel,
      "aria-labelledby": ue.ariaLabelledBy,
      "aria-describedby": ue.describedBy,
      "aria-invalid": ue.normalizedError ? "true" : void 0,
      "aria-disabled": ue.disabledByState ? "true" : void 0,
      "aria-required": ue.required ? "true" : void 0,
      "aria-readonly": ue.readOnly ? "true" : void 0,
      onFocus: (he) => {
        me.onFocus(he), !ue.disabledByState && !ue.readOnly && Ue(!0);
      },
      onBlur: me.onBlur,
      onChange: Mt,
      onKeyDown: Kt
    }),
    i.createElement(
      "button",
      {
        ...y("combo-box", "trigger", ue.state),
        type: "button",
        disabled: ue.disabledByState || ue.readOnly,
        "aria-label": ke,
        "aria-haspopup": "listbox",
        "aria-expanded": String(De),
        "aria-controls": st,
        onClick: () => Xe(!De)
      },
      it(void 0, "chevron-down")
    ),
    De ? i.createElement(
      "ul",
      {
        ...y("combo-box", "list", ue.state),
        id: st,
        role: "listbox"
      },
      Me.length > 0 ? Me.map((he, ot) => {
        const Fe = he.value === String(ge), nt = ot === $e, wn = he.disabled ? "disabled" : nt ? "active" : ue.state;
        return i.createElement(
          "li",
          {
            ...y("combo-box", "option", wn),
            id: `${st}-option-${he.value}`,
            key: `${he.value}-${ot}`,
            role: "option",
            "aria-selected": String(Fe),
            "aria-disabled": he.disabled ? "true" : void 0,
            "data-highlighted": String(nt),
            "data-selected": String(Fe),
            onMouseEnter: () => {
              he.disabled || Ye(ot);
            },
            onMouseDown: (Wt) => {
              Wt.preventDefault(), St(he, Wt);
            }
          },
          he.label
        );
      }) : i.createElement(
        "li",
        {
          ...y("combo-box", "option", "disabled"),
          role: "option",
          "aria-disabled": "true",
          "aria-selected": "false",
          "data-empty": "true"
        },
        ht
      )
    ) : null,
    Vr(ue),
    Br(ue)
  );
});
Pv.displayName = "ChipsComboBox";
function Qu(r) {
  const { model: o, previousValue: l, source: u, text: d } = r;
  return {
    source: u,
    previousValue: l,
    value: o.value,
    text: d ?? o.text,
    min: o.min,
    max: o.max,
    step: o.step,
    largeStep: o.largeStep,
    atMin: o.atMin,
    atMax: o.atMax,
    empty: o.empty,
    invalid: o.invalid
  };
}
function Av(r) {
  const {
    error: o,
    invalid: l,
    invalidMessage: u,
    invalidMessageKey: d,
    fallbackInvalidMessage: f,
    i18n: p,
    onDiagnostic: m
  } = r, g = _e(o);
  if (g || !l)
    return g;
  const v = Ze({
    value: u,
    key: d,
    fallback: f,
    i18n: p,
    onDiagnostic: m
  });
  return v ? {
    code: "NUMERIC_VALUE_INVALID",
    message: v
  } : null;
}
function Mv(r, o) {
  if (!r.hasAccessibleName)
    throw new Error(o);
}
const bu = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u = null,
    textValue: d,
    defaultTextValue: f,
    min: p,
    max: m,
    step: g,
    largeStep: v,
    disabled: E = !1,
    loading: C = !1,
    error: w = null,
    readOnly: N = !1,
    required: k = !1,
    label: S,
    labelKey: b,
    labelParams: _,
    fallbackLabel: I,
    description: D,
    descriptionKey: x,
    descriptionParams: R,
    fallbackDescription: P,
    ariaLabel: O,
    ariaLabelKey: A,
    ariaLabelParams: Q,
    fallbackAriaLabel: F,
    placeholder: W,
    name: q,
    inputMode: H = "decimal",
    autoComplete: ee,
    valueText: j,
    formatValue: $,
    invalidMessage: U,
    invalidMessageKey: V = "component.numberInput.invalid",
    fallbackInvalidMessage: Z = "Invalid number",
    decrementLabel: K,
    decrementLabelKey: L,
    fallbackDecrementLabel: M = "Decrease value",
    incrementLabel: ne,
    incrementLabelKey: te,
    fallbackIncrementLabel: ce = "Increase value",
    decrementContent: Y,
    incrementContent: ae,
    i18n: de,
    onValueChange: ie,
    onInputChange: ge,
    onStateChange: se,
    onEnterPress: re,
    onKeyDown: ye,
    onChange: De,
    onDiagnostic: Ue,
    ...Ce
  } = r, Ae = {
    scope: "number-input",
    value: d,
    defaultValue: f,
    disabled: E,
    loading: C,
    error: w,
    readOnly: N,
    required: k,
    label: S,
    labelKey: b,
    labelParams: _,
    fallbackLabel: I,
    description: D,
    descriptionKey: x,
    descriptionParams: R,
    fallbackDescription: P,
    ariaLabel: O || Ce["aria-label"],
    ariaLabelKey: A,
    ariaLabelParams: Q,
    fallbackAriaLabel: F,
    ariaLabelledBy: Ce["aria-labelledby"],
    ariaDescribedBy: Ce["aria-describedby"],
    i18n: de,
    onDiagnostic: Ue
  };
  Mv(
    Qt(Ae),
    "NUMBER_INPUT_A11Y_LABEL_REQUIRED"
  );
  const me = ai({ min: p, max: m, step: g, largeStep: v }), ue = Cn(u, me, { align: !1 }), Me = l !== void 0, Ke = d !== void 0, [$e, Ye] = i.useState(ue), [st, mt] = i.useState(() => f !== void 0 ? String(f) : Rr(ue, $)), bt = Me ? Cn(l, me, { align: !1 }) : $e, ht = Ke ? String(d) : st, ke = Aa({
    value: bt,
    text: ht,
    min: p,
    max: m,
    step: g,
    largeStep: v,
    required: k,
    valueText: j,
    formatValue: $,
    align: !1
  }), Xe = Av({
    error: w,
    invalid: ke.invalid,
    invalidMessage: U,
    invalidMessageKey: V,
    fallbackInvalidMessage: Z,
    i18n: de,
    onDiagnostic: Ue
  }), St = E || C, { interaction: Mt, handlers: Kt } = Oe(St), he = Qt({
    ...Ae,
    value: ht,
    defaultValue: void 0,
    error: Xe,
    interaction: Mt
  }), ot = !!Xe || ke.invalid, Fe = ht.trim().length === 0, nt = Ze({
    value: K,
    key: L,
    fallback: M,
    i18n: de,
    onDiagnostic: Ue
  }), wn = Ze({
    value: ne,
    key: te,
    fallback: ce,
    i18n: de,
    onDiagnostic: Ue
  });
  i.useEffect(() => {
    typeof se == "function" && se(he.state);
  }, [he.state, se]), i.useEffect(() => {
    !Ke && Me && mt(Rr(bt, $));
  }, [Ke, Me, bt, $]);
  const Wt = (Be, dt) => {
    Ke || mt(Be), typeof ge == "function" && ge(Be, dt);
  }, zt = (Be, dt, Yt, Le) => {
    const at = Be === null ? null : Cn(Be, me, { align: !0 }), xt = Aa({
      value: at,
      min: p,
      max: m,
      step: g,
      largeStep: v,
      required: k,
      valueText: j,
      formatValue: $
    }), It = Le !== void 0 ? Le : Rr(xt.value, $);
    Me || Ye(xt.value), Ke || mt(It), typeof ie == "function" && ie(
      xt.value,
      Qu({
        model: xt,
        previousValue: bt,
        source: Yt,
        text: It
      }),
      dt
    );
  }, Hn = (Be, dt) => {
    const Yt = hu(ht, me, { required: k, align: !0 });
    return Yt.kind === "invalid" ? !1 : Yt.kind === "empty" ? (zt(null, Be, dt, ""), !0) : (zt(Yt.value, Be, dt), !0);
  }, Ot = (Be, dt, Yt) => {
    if (he.disabledByState || he.readOnly) {
      dt?.preventDefault?.();
      return;
    }
    const Le = hu(ht, me, { required: !1, align: !0 }), at = Le.kind === "valid" ? Le.value : bt, xt = zu(at, me, Be, me.min);
    zt(xt, dt, Yt);
  }, en = (Be) => {
    typeof De == "function" && De(Be), Wt(Be.target.value, Be);
  }, je = (Be) => {
    const dt = Mu(Be.key, me);
    dt !== 0 ? (Be.preventDefault(), Ot(dt, Be, "keyboard")) : Be.key === "Home" ? (Be.preventDefault(), zt(me.min, Be, "keyboard")) : Be.key === "End" ? (Be.preventDefault(), zt(me.max, Be, "keyboard")) : Be.key === "Enter" ? Hn(Be, "commit") && typeof re == "function" && re(ke.value, Be) : Be.key === "Escape" && Wt(Rr(bt, $), Be), typeof ye == "function" && ye(Be);
  }, rt = he.disabledByState || he.readOnly || ke.atMin, kn = he.disabledByState || he.readOnly || ke.atMax;
  return i.createElement(
    "div",
    {
      ...Ce,
      ...y("number-input", "root", he.state),
      ...Kt,
      "aria-disabled": he.disabledByState ? "true" : void 0,
      "aria-invalid": ot ? "true" : void 0,
      "aria-required": he.required ? "true" : void 0,
      "data-required": String(he.required),
      "data-readonly": String(he.readOnly),
      "data-invalid": ot ? "true" : "false",
      "data-empty": Fe ? "true" : "false",
      "data-at-min": ke.atMin ? "true" : "false",
      "data-at-max": ke.atMax ? "true" : "false"
    },
    he.label ? i.createElement(
      "span",
      y("number-input", "label", he.state),
      he.label
    ) : null,
    i.createElement("input", {
      ...y("number-input", "control", he.state),
      ref: o,
      role: "spinbutton",
      type: "text",
      name: q,
      placeholder: W,
      inputMode: H,
      autoComplete: ee,
      disabled: he.disabledByState,
      readOnly: he.readOnly,
      required: he.required,
      value: ht,
      "aria-label": he.ariaLabel,
      "aria-labelledby": he.ariaLabelledBy,
      "aria-describedby": he.describedBy,
      "aria-invalid": ot ? "true" : void 0,
      "aria-disabled": he.disabledByState ? "true" : void 0,
      "aria-required": he.required ? "true" : void 0,
      "aria-readonly": he.readOnly ? "true" : void 0,
      "aria-valuemin": me.min,
      "aria-valuemax": me.max,
      "aria-valuenow": ke.value !== null && !ke.invalid ? ke.value : void 0,
      "aria-valuetext": ke.valueText,
      "data-required": String(he.required),
      "data-readonly": String(he.readOnly),
      "data-invalid": ot ? "true" : "false",
      "data-empty": Fe ? "true" : "false",
      onChange: en,
      onFocus: Kt.onFocus,
      onBlur: (Be) => {
        Kt.onBlur(Be), Hn(Be, "blur");
      },
      onKeyDown: je
    }),
    i.createElement(
      "button",
      {
        ...y("number-input", "decrement", he.state),
        type: "button",
        disabled: rt,
        "aria-label": nt,
        "aria-disabled": rt ? "true" : void 0,
        onClick: (Be) => Ot(-me.step, Be, "decrement")
      },
      it(Y, "collapse")
    ),
    i.createElement(
      "button",
      {
        ...y("number-input", "increment", he.state),
        type: "button",
        disabled: kn,
        "aria-label": wn,
        "aria-disabled": kn ? "true" : void 0,
        onClick: (Be) => Ot(me.step, Be, "increment")
      },
      it(ae, "expand")
    ),
    Vr(he),
    Br(he)
  );
});
bu.displayName = "ChipsNumberInput";
const zv = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u = 0,
    min: d,
    max: f,
    step: p,
    largeStep: m,
    orientation: g = "horizontal",
    disabled: v = !1,
    loading: E = !1,
    error: C = null,
    label: w,
    labelKey: N,
    labelParams: k,
    fallbackLabel: S,
    ariaLabel: b,
    ariaLabelKey: _,
    ariaLabelParams: I,
    fallbackAriaLabel: D,
    ariaLabelledBy: x,
    valueText: R,
    formatValue: P,
    decrementLabel: O,
    decrementLabelKey: A,
    fallbackDecrementLabel: Q = "Decrease value",
    incrementLabel: F,
    incrementLabelKey: W,
    fallbackIncrementLabel: q = "Increase value",
    decrementContent: H,
    incrementContent: ee,
    i18n: j,
    onValueChange: $,
    onStateChange: U,
    onKeyDown: V,
    onDiagnostic: Z,
    ...K
  } = r, L = Ze({
    value: w,
    key: N,
    params: k,
    fallback: S,
    i18n: j,
    onDiagnostic: Z
  }), M = Ze({
    value: b || K["aria-label"],
    key: _,
    params: I,
    fallback: D || L,
    i18n: j,
    onDiagnostic: Z
  }), ne = Qe(x || K["aria-labelledby"]) ? String(x || K["aria-labelledby"]).trim() : void 0;
  if (!M && !ne)
    throw new Error("STEPPER_A11Y_LABEL_REQUIRED");
  const te = ai({ min: d, max: f, step: p, largeStep: m }), ce = Cn(u, te) ?? te.min, [Y, ae] = Je({
    value: l === void 0 ? void 0 : Cn(l, te) ?? te.min,
    defaultValue: ce
  }), de = _e(C), ie = v || E, { interaction: ge, handlers: se } = Oe(ie), re = Ne({
    disabled: ie,
    loading: E,
    error: de,
    interaction: ge
  }), ye = Aa({
    value: Y,
    min: d,
    max: f,
    step: p,
    largeStep: m,
    valueText: R,
    formatValue: P
  }), De = Ze({
    value: O,
    key: A,
    fallback: Q,
    i18n: j,
    onDiagnostic: Z
  }), Ue = Ze({
    value: F,
    key: W,
    fallback: q,
    i18n: j,
    onDiagnostic: Z
  }), Ce = g === "vertical" ? "vertical" : "horizontal";
  i.useEffect(() => {
    typeof U == "function" && U(re);
  }, [re, U]);
  const Ae = ($e, Ye, st) => {
    if (ie) {
      Ye?.preventDefault?.();
      return;
    }
    const mt = Aa({
      value: $e,
      min: d,
      max: f,
      step: p,
      largeStep: m,
      valueText: R,
      formatValue: P
    });
    ae(mt.value), typeof $ == "function" && $(
      mt.value,
      Qu({
        model: mt,
        previousValue: ye.value,
        source: st
      }),
      Ye
    );
  }, me = ($e, Ye, st) => {
    const mt = zu(ye.value, te, $e, te.min);
    Ae(mt, Ye, st);
  }, ue = ($e) => {
    const Ye = Mu($e.key, te);
    Ye !== 0 ? ($e.preventDefault(), me(Ye, $e, "keyboard")) : $e.key === "Home" ? ($e.preventDefault(), Ae(te.min, $e, "keyboard")) : $e.key === "End" && ($e.preventDefault(), Ae(te.max, $e, "keyboard")), typeof V == "function" && V($e);
  }, Me = ie || ye.atMin, Ke = ie || ye.atMax;
  return i.createElement(
    "div",
    {
      ...K,
      ...y("stepper", "root", re),
      ...se,
      ref: o,
      role: "group",
      tabIndex: ie ? void 0 : 0,
      "aria-label": M || void 0,
      "aria-labelledby": ne,
      "aria-disabled": ie ? "true" : void 0,
      "aria-invalid": de ? "true" : void 0,
      "data-orientation": Ce,
      "data-at-min": ye.atMin ? "true" : "false",
      "data-at-max": ye.atMax ? "true" : "false",
      onKeyDown: ue
    },
    L ? i.createElement(
      "span",
      y("stepper", "label", re),
      L
    ) : null,
    i.createElement(
      "button",
      {
        ...y("stepper", "decrement", re),
        type: "button",
        disabled: Me,
        "aria-label": De,
        "aria-disabled": Me ? "true" : void 0,
        onClick: ($e) => me(-te.step, $e, "decrement")
      },
      it(H, "collapse")
    ),
    i.createElement(
      "output",
      {
        ...y("stepper", "value", re),
        "aria-live": "polite",
        "data-value": ye.value !== null ? String(ye.value) : ""
      },
      ye.valueText ?? Rr(ye.value, P)
    ),
    i.createElement(
      "button",
      {
        ...y("stepper", "increment", re),
        type: "button",
        disabled: Ke,
        "aria-label": Ue,
        "aria-disabled": Ke ? "true" : void 0,
        onClick: ($e) => me(te.step, $e, "increment")
      },
      it(ee, "expand")
    ),
    de ? i.createElement(
      "span",
      {
        ...y("stepper", "status", re),
        ...Re({ live: "assertive" })
      },
      de.message
    ) : null
  );
});
zv.displayName = "ChipsStepper";
const Ov = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u = 0,
    min: d,
    max: f,
    step: p,
    largeStep: m,
    orientation: g = "horizontal",
    disabled: v = !1,
    loading: E = !1,
    error: C = null,
    label: w,
    labelKey: N,
    labelParams: k,
    fallbackLabel: S,
    ariaLabel: b,
    ariaLabelKey: _,
    ariaLabelParams: I,
    fallbackAriaLabel: D,
    ariaLabelledBy: x,
    valueText: R,
    formatValue: P,
    showValue: O = !1,
    i18n: A,
    onValueChange: Q,
    onStateChange: F,
    onKeyDown: W,
    onDiagnostic: q,
    ...H
  } = r, ee = Ze({
    value: w,
    key: N,
    params: k,
    fallback: S,
    i18n: A,
    onDiagnostic: q
  }), j = Ze({
    value: b || H["aria-label"],
    key: _,
    params: I,
    fallback: D || ee,
    i18n: A,
    onDiagnostic: q
  }), $ = Qe(x || H["aria-labelledby"]) ? String(x || H["aria-labelledby"]).trim() : void 0;
  if (!j && !$)
    throw new Error("SLIDER_A11Y_LABEL_REQUIRED");
  const U = ai({ min: d, max: f, step: p, largeStep: m }), V = Cn(u, U) ?? U.min, [Z, K] = Je({
    value: l === void 0 ? void 0 : Cn(l, U) ?? U.min,
    defaultValue: V
  }), L = _e(C), M = v || E, { interaction: ne, handlers: te } = Oe(M), ce = Ne({
    disabled: M,
    loading: E,
    error: L,
    interaction: ne
  }), Y = Pg({
    value: Z,
    min: d,
    max: f,
    step: p,
    largeStep: m,
    orientation: g,
    valueText: R,
    formatValue: P
  }), ae = g === "vertical" ? "vertical" : "horizontal", de = Y.ratio, ie = Y.valueText ?? Rr(Y.value, P), ge = i.useRef(null);
  i.useEffect(() => {
    typeof F == "function" && F(ce);
  }, [ce, F]);
  const se = (Ce, Ae, me) => {
    if (M) {
      Ae?.preventDefault?.();
      return;
    }
    const ue = Aa({
      value: Ce,
      min: d,
      max: f,
      step: p,
      largeStep: m,
      valueText: R,
      formatValue: P
    });
    K(ue.value), typeof Q == "function" && Q(
      ue.value,
      Qu({
        model: ue,
        previousValue: Y.value,
        source: me
      }),
      Ae
    );
  }, re = (Ce, Ae, me) => {
    const ue = zu(Y.value, U, Ce, U.min);
    se(ue, Ae, me);
  }, ye = (Ce) => {
    const Ae = Mu(Ce.key, U);
    Ae !== 0 ? (Ce.preventDefault(), re(Ae, Ce, "keyboard")) : Ce.key === "Home" ? (Ce.preventDefault(), se(U.min, Ce, "keyboard")) : Ce.key === "End" && (Ce.preventDefault(), se(U.max, Ce, "keyboard")), typeof W == "function" && W(Ce);
  }, De = (Ce) => {
    if (M) {
      Ce.preventDefault();
      return;
    }
    const Ae = Tg(Ce, U, ae);
    Ae !== null && se(Ae, Ce, "pointer");
  }, Ue = (Ce) => {
    if (M) {
      Ce.preventDefault();
      return;
    }
    const Ae = ge.current;
    if (!Ae)
      return;
    Ce.preventDefault(), Ce.stopPropagation(), Ce.currentTarget.setPointerCapture?.(Ce.pointerId);
    const me = (Me) => {
      const Ke = jp(Ae, Me, U, ae);
      Ke !== null && se(Ke, Me, "pointer");
    }, ue = () => {
      window.removeEventListener("pointermove", me), window.removeEventListener("pointerup", ue), window.removeEventListener("pointercancel", ue);
    };
    window.addEventListener("pointermove", me), window.addEventListener("pointerup", ue), window.addEventListener("pointercancel", ue);
  };
  return i.createElement(
    "div",
    {
      ...H,
      ...y("slider", "root", ce),
      ...te,
      "aria-disabled": M ? "true" : void 0,
      "aria-invalid": L ? "true" : void 0,
      "data-orientation": ae,
      "data-value": Y.value !== null ? String(Y.value) : "",
      "data-ratio": String(de),
      "data-at-min": Y.atMin ? "true" : "false",
      "data-at-max": Y.atMax ? "true" : "false",
      style: {
        "--chips-slider-ratio": de,
        ...H.style
      }
    },
    ee ? i.createElement(
      "span",
      y("slider", "label", ce),
      ee
    ) : null,
    i.createElement(
      "span",
      {
        ...y("slider", "track", ce),
        ref: ge,
        onPointerDown: De
      },
      i.createElement("span", {
        ...y("slider", "range", ce),
        "aria-hidden": "true"
      }),
      i.createElement("button", {
        ...y("slider", "thumb", ce),
        ref: o,
        type: "button",
        role: "slider",
        disabled: M,
        "aria-label": j || void 0,
        "aria-labelledby": $,
        "aria-orientation": ae,
        "aria-valuemin": U.min,
        "aria-valuemax": U.max,
        "aria-valuenow": Y.value ?? U.min,
        "aria-valuetext": ie,
        "aria-disabled": M ? "true" : void 0,
        "aria-invalid": L ? "true" : void 0,
        onPointerDown: Ue,
        onKeyDown: ye
      })
    ),
    O && ie ? i.createElement(
      "output",
      {
        ...y("slider", "value", ce),
        "aria-live": "polite",
        "data-value": Y.value !== null ? String(Y.value) : ""
      },
      ie
    ) : null,
    L ? i.createElement(
      "span",
      {
        ...y("slider", "status", ce),
        ...Re({ live: "assertive" })
      },
      L.message
    ) : null
  );
});
Ov.displayName = "ChipsSlider";
function om(r) {
  return {
    source: r.source,
    previousValue: r.previousValue,
    value: r.value,
    text: r.text,
    invalid: r.invalid === !0
  };
}
function Vv(r, o, l) {
  const u = pt(r) ? r : l.value || l.textValue || Jt({ ...l.month, day: 1 });
  if (o === "ArrowRight")
    return Hl(u, 1);
  if (o === "ArrowLeft")
    return Hl(u, -1);
  if (o === "ArrowDown")
    return Hl(u, 7);
  if (o === "ArrowUp")
    return Hl(u, -7);
  if (o === "Home") {
    const d = pt(u);
    return d ? Jt({ ...d, day: 1 }) : u;
  }
  if (o === "End") {
    const d = pt(u);
    return d ? Jt({
      ...d,
      day: new Date(Date.UTC(d.year, d.month, 0)).getUTCDate()
    }) : u;
  }
  if (o === "PageUp" || o === "PageDown") {
    const d = pt(u);
    if (!d)
      return u;
    const f = yu(d, o === "PageUp" ? -1 : 1), p = new Date(Date.UTC(f.year, f.month, 0)).getUTCDate();
    return Jt({ ...f, day: Math.min(d.day, p) });
  }
  return "";
}
const Bv = i.forwardRef((r, o) => {
  const {
    id: l,
    value: u,
    defaultValue: d = "",
    textValue: f,
    defaultTextValue: p,
    open: m,
    defaultOpen: g = !1,
    min: v,
    max: E,
    defaultMonth: C,
    weekStartsOn: w = 0,
    weekDayLabels: N,
    monthLabels: k,
    disabled: S = !1,
    loading: b = !1,
    error: _ = null,
    readOnly: I = !1,
    required: D = !1,
    label: x,
    labelKey: R,
    labelParams: P,
    fallbackLabel: O,
    description: A,
    descriptionKey: Q,
    descriptionParams: F,
    fallbackDescription: W,
    ariaLabel: q,
    ariaLabelKey: H,
    ariaLabelParams: ee,
    fallbackAriaLabel: j,
    placeholder: $,
    name: U,
    triggerLabel: V,
    triggerLabelKey: Z,
    fallbackTriggerLabel: K = "Open calendar",
    invalidMessage: L,
    invalidMessageKey: M = "component.datePicker.invalid",
    fallbackInvalidMessage: ne = "Invalid date",
    previousLabel: te,
    previousLabelKey: ce,
    fallbackPreviousLabel: Y = "Previous month",
    nextLabel: ae,
    nextLabelKey: de,
    fallbackNextLabel: ie = "Next month",
    triggerContent: ge,
    isDateDisabled: se,
    i18n: re,
    onValueChange: ye,
    onInputChange: De,
    onOpenChange: Ue,
    onMonthChange: Ce,
    onStateChange: Ae,
    onKeyDown: me,
    onChange: ue,
    onDiagnostic: Me,
    ...Ke
  } = r, $e = {
    scope: "date-picker",
    value: f,
    defaultValue: p,
    disabled: S,
    loading: b,
    error: _,
    readOnly: I,
    required: D,
    label: x,
    labelKey: R,
    labelParams: P,
    fallbackLabel: O,
    description: A,
    descriptionKey: Q,
    descriptionParams: F,
    fallbackDescription: W,
    ariaLabel: q || Ke["aria-label"],
    ariaLabelKey: H,
    ariaLabelParams: ee,
    fallbackAriaLabel: j,
    ariaLabelledBy: Ke["aria-labelledby"],
    ariaDescribedBy: Ke["aria-describedby"],
    i18n: re,
    onDiagnostic: Me
  };
  na(
    Qt($e),
    "DATE_PICKER_A11Y_LABEL_REQUIRED"
  );
  const Ye = u !== void 0, st = f !== void 0, mt = m !== void 0, [bt, ht] = i.useState(() => Pn(d, v, E)), [ke, Xe] = i.useState(() => p !== void 0 ? String(p) : Pn(d, v, E)), [St, Mt] = i.useState(g === !0), [Kt, he] = i.useState(
    () => Hp(Pn(d, v, E), C, v, E)
  ), ot = Ye ? Pn(u, v, E) : bt, Fe = st ? String(f) : ke, nt = mt ? m === !0 : St, wn = bp({
    value: ot,
    text: Fe,
    min: v,
    max: E,
    month: Jt({ ...Kt, day: 1 }),
    weekStartsOn: w,
    weekDayLabels: N,
    monthLabels: k,
    isDateDisabled: se
  }), Wt = Ze({
    value: L,
    key: M,
    fallback: ne,
    i18n: re,
    onDiagnostic: Me
  }), zt = _e(_) || (wn.invalid ? { code: "DATE_PICKER_VALUE_INVALID", message: Wt } : null), Hn = S || b, { interaction: Ot, handlers: en } = Oe(Hn), je = Qt({
    ...$e,
    value: Fe,
    defaultValue: void 0,
    error: zt,
    interaction: Ot
  }), rt = bp({
    value: ot,
    text: Fe,
    min: v,
    max: E,
    month: Jt({ ...Kt, day: 1 }),
    weekStartsOn: w,
    weekDayLabels: N,
    monthLabels: k,
    isDateDisabled: se
  }), kn = i.useId(), Be = l || kn, dt = `${Be}-calendar`, Yt = `${dt}-grid`, at = (rt.cells.find((ve) => ve.selected && !ve.disabled) ?? rt.cells.find((ve) => ve.today && !ve.disabled) ?? rt.cells.find((ve) => !ve.outsideMonth && !ve.disabled) ?? rt.cells.find((ve) => !ve.disabled))?.value ?? "", xt = at ? `${dt}-cell-${at}` : void 0, It = Ze({
    value: V,
    key: Z,
    fallback: K,
    i18n: re,
    onDiagnostic: Me
  }), ir = Ze({
    value: te,
    key: ce,
    fallback: Y,
    i18n: re,
    onDiagnostic: Me
  }), Fr = Ze({
    value: ae,
    key: de,
    fallback: ie,
    i18n: re,
    onDiagnostic: Me
  });
  i.useEffect(() => {
    typeof Ae == "function" && Ae(je.state);
  }, [je.state, Ae]);
  const xn = (ve, Ct) => {
    mt || Mt(ve), typeof Ue == "function" && Ue(ve, Ct);
  }, qn = (ve, Ct, Vt) => {
    he(ve), typeof Ce == "function" && Ce(ve, { source: Vt }, Ct);
  }, sr = (ve, Ct, Vt) => {
    if (je.disabledByState || je.readOnly)
      return Ct?.preventDefault?.(), !1;
    const An = Pn(ve, v, E);
    if (!An || xo(An, v, E, se))
      return !1;
    Ye || ht(An), st || Xe(An);
    const aa = pt(An);
    return aa && qn({ year: aa.year, month: aa.month }, Ct, Vt), typeof ye == "function" && ye(
      An,
      om({
        source: Vt,
        previousValue: ot,
        value: An,
        text: An,
        invalid: !1
      }),
      Ct
    ), !0;
  }, mi = (ve, Ct) => {
    const Vt = Pn(Fe, v, E);
    return Vt ? sr(Vt, ve, Ct) : !1;
  }, hi = (ve) => {
    typeof ue == "function" && ue(ve), st || Xe(ve.target.value), typeof De == "function" && De(ve.target.value, ve);
  }, yi = (ve) => {
    if (ve.key === "Enter")
      nt && at ? (ve.preventDefault(), sr(at, ve, "calendar") && xn(!1, ve)) : mi(ve, "commit") && xn(!1, ve);
    else if (ve.key === "Escape")
      ve.preventDefault(), xn(!1, ve), st || Xe(ot);
    else if (ve.key === "ArrowDown" && !nt)
      ve.preventDefault(), xn(!0, ve);
    else {
      const Ct = Vv(rt.value || rt.textValue || at || Fe || ot, ve.key, rt);
      if (Ct) {
        ve.preventDefault();
        const Vt = pt(Ct);
        Vt && (qn({ year: Vt.year, month: Vt.month }, ve, "keyboard"), xo(Ct, v, E, se) || sr(Ct, ve, "keyboard"));
      }
    }
    typeof me == "function" && me(ve);
  };
  return i.createElement(
    "div",
    {
      ...Ke,
      ...y("date-picker", "root", je.state),
      ...en,
      "aria-disabled": je.disabledByState ? "true" : void 0,
      "aria-invalid": rt.invalid ? "true" : void 0,
      "aria-required": je.required ? "true" : void 0,
      "data-open": String(nt),
      "data-required": String(je.required),
      "data-readonly": String(je.readOnly),
      "data-invalid": rt.invalid ? "true" : "false"
    },
    je.label ? i.createElement(
      "label",
      {
        ...y("date-picker", "label", je.state),
        htmlFor: Be
      },
      je.label
    ) : null,
    i.createElement(
      "span",
      y("date-picker", "control", je.state),
      i.createElement("input", {
        ...y("date-picker", "input", je.state),
        ref: o,
        id: Be,
        role: "combobox",
        type: "text",
        name: U,
        placeholder: $,
        inputMode: "numeric",
        autoComplete: "off",
        disabled: je.disabledByState,
        readOnly: je.readOnly,
        required: je.required,
        value: Fe,
        "aria-label": je.ariaLabel,
        "aria-labelledby": je.ariaLabelledBy,
        "aria-describedby": je.describedBy,
        "aria-invalid": rt.invalid ? "true" : void 0,
        "aria-disabled": je.disabledByState ? "true" : void 0,
        "aria-required": je.required ? "true" : void 0,
        "aria-readonly": je.readOnly ? "true" : void 0,
        "aria-expanded": String(nt),
        "aria-controls": dt,
        "aria-activedescendant": nt ? xt : void 0,
        onChange: hi,
        onFocus: en.onFocus,
        onBlur: en.onBlur,
        onKeyDown: yi
      }),
      i.createElement(
        "button",
        {
          ...y("date-picker", "trigger", je.state),
          type: "button",
          disabled: je.disabledByState || je.readOnly,
          "aria-label": It,
          "aria-haspopup": "grid",
          "aria-expanded": String(nt),
          "aria-controls": dt,
          onClick: (ve) => xn(!nt, ve)
        },
        it(ge, "calendar")
      )
    ),
    nt ? i.createElement(
      "div",
      {
        ...y("date-picker", "calendar", je.state),
        id: dt,
        role: "dialog",
        "aria-modal": "false"
      },
      i.createElement(
        "div",
        y("date-picker", "header", je.state),
        i.createElement(
          "button",
          {
            ...y("date-picker", "previous", je.state),
            type: "button",
            "aria-label": ir,
            onClick: (ve) => qn(yu(rt.month, -1), ve, "previous")
          },
          it(void 0, "collapse")
        ),
        i.createElement(
          "span",
          y("date-picker", "title", je.state),
          rt.title
        ),
        i.createElement(
          "button",
          {
            ...y("date-picker", "next", je.state),
            type: "button",
            "aria-label": Fr,
            onClick: (ve) => qn(yu(rt.month, 1), ve, "next")
          },
          it(void 0, "expand")
        )
      ),
      i.createElement(
        "div",
        {
          ...y("date-picker", "grid", je.state),
          id: Yt,
          role: "grid",
          "aria-label": rt.title
        },
        rt.weekDayLabels.map(
          (ve, Ct) => i.createElement(
            "span",
            {
              ...y("date-picker", "week-header", je.state),
              key: `${ve}-${Ct}`,
              role: "columnheader"
            },
            ve
          )
        ),
        rt.cells.map((ve) => {
          const Ct = ve.disabled ? "disabled" : ve.selected ? "active" : je.state;
          return i.createElement(
            "button",
            {
              ...y("date-picker", "cell", Ct),
              id: `${dt}-cell-${ve.value}`,
              key: ve.value,
              type: "button",
              role: "gridcell",
              disabled: ve.disabled,
              tabIndex: ve.selected ? 0 : -1,
              "aria-selected": String(ve.selected),
              "aria-disabled": ve.disabled ? "true" : void 0,
              "data-date": ve.value,
              "data-selected": String(ve.selected),
              "data-today": String(ve.today),
              "data-outside-month": String(ve.outsideMonth),
              onClick: (Vt) => {
                sr(ve.value, Vt, "calendar") && xn(!1, Vt);
              }
            },
            ve.label
          );
        })
      )
    ) : null,
    Vr(je),
    Br(je)
  );
});
Bv.displayName = "ChipsDatePicker";
function Fv(r, o, l) {
  return o === "ArrowUp" || o === "ArrowRight" ? ql(r || l.value || l.min || "00:00", l.step, l) : o === "ArrowDown" || o === "ArrowLeft" ? ql(r || l.value || l.min || "00:00", -l.step, l) : o === "PageUp" ? ql(r || l.value || l.min || "00:00", l.step * 10, l) : o === "PageDown" ? ql(r || l.value || l.min || "00:00", -l.step * 10, l) : o === "Home" ? l.min || l.options.find((u) => !u.disabled)?.value || "00:00" : o === "End" ? l.max || [...l.options].reverse().find((u) => !u.disabled)?.value || "23:59" : "";
}
const Uv = i.forwardRef((r, o) => {
  const {
    id: l,
    value: u,
    defaultValue: d = "",
    textValue: f,
    defaultTextValue: p,
    open: m,
    defaultOpen: g = !1,
    min: v,
    max: E,
    step: C = 60,
    optionStep: w,
    showSeconds: N = !1,
    options: k,
    limitOptionsToRange: S = !0,
    disabled: b = !1,
    loading: _ = !1,
    error: I = null,
    readOnly: D = !1,
    required: x = !1,
    label: R,
    labelKey: P,
    labelParams: O,
    fallbackLabel: A,
    description: Q,
    descriptionKey: F,
    descriptionParams: W,
    fallbackDescription: q,
    ariaLabel: H,
    ariaLabelKey: ee,
    ariaLabelParams: j,
    fallbackAriaLabel: $,
    placeholder: U,
    name: V,
    triggerLabel: Z,
    triggerLabelKey: K,
    fallbackTriggerLabel: L = "Open time list",
    invalidMessage: M,
    invalidMessageKey: ne = "component.timePicker.invalid",
    fallbackInvalidMessage: te = "Invalid time",
    triggerContent: ce,
    isTimeDisabled: Y,
    i18n: ae,
    onValueChange: de,
    onInputChange: ie,
    onOpenChange: ge,
    onStateChange: se,
    onKeyDown: re,
    onChange: ye,
    onDiagnostic: De,
    ...Ue
  } = r, Ce = {
    scope: "time-picker",
    value: f,
    defaultValue: p,
    disabled: b,
    loading: _,
    error: I,
    readOnly: D,
    required: x,
    label: R,
    labelKey: P,
    labelParams: O,
    fallbackLabel: A,
    description: Q,
    descriptionKey: F,
    descriptionParams: W,
    fallbackDescription: q,
    ariaLabel: H || Ue["aria-label"],
    ariaLabelKey: ee,
    ariaLabelParams: j,
    fallbackAriaLabel: $,
    ariaLabelledBy: Ue["aria-labelledby"],
    ariaDescribedBy: Ue["aria-describedby"],
    i18n: ae,
    onDiagnostic: De
  };
  na(
    Qt(Ce),
    "TIME_PICKER_A11Y_LABEL_REQUIRED"
  );
  const Ae = u !== void 0, me = f !== void 0, ue = m !== void 0, [Me, Ke] = i.useState(() => Jr(d, { min: v, max: E, step: C, showSeconds: N, isTimeDisabled: Y })), [$e, Ye] = i.useState(() => p !== void 0 ? String(p) : Jr(d, { min: v, max: E, step: C, showSeconds: N, isTimeDisabled: Y })), [st, mt] = i.useState(g === !0), bt = Ae ? Jr(u, { min: v, max: E, step: C, showSeconds: N, isTimeDisabled: Y }) : Me, ht = me ? String(f) : $e, ke = ue ? m === !0 : st, Xe = Ep({
    value: bt,
    text: ht,
    min: v,
    max: E,
    step: C,
    optionStep: w,
    showSeconds: N,
    options: k,
    limitOptionsToRange: S,
    isTimeDisabled: Y
  }), St = Ze({
    value: M,
    key: ne,
    fallback: te,
    i18n: ae,
    onDiagnostic: De
  }), Mt = _e(I) || (Xe.invalid ? { code: "TIME_PICKER_VALUE_INVALID", message: St } : null), Kt = b || _, { interaction: he, handlers: ot } = Oe(Kt), Fe = Qt({
    ...Ce,
    value: ht,
    defaultValue: void 0,
    error: Mt,
    interaction: he
  }), nt = Ep({
    value: bt,
    text: ht,
    min: v,
    max: E,
    step: C,
    optionStep: w,
    showSeconds: N,
    options: k,
    limitOptionsToRange: S,
    isTimeDisabled: Y
  }), wn = i.useId(), Wt = l || wn, zt = `${Wt}-list`, Ot = (nt.options.find((Le) => Le.value === nt.value && !Le.disabled) ?? nt.options.find((Le) => Le.value === nt.textValue && !Le.disabled) ?? nt.options.find((Le) => !Le.disabled))?.value ?? "", en = Ot ? `${zt}-option-${Ot}` : void 0, je = Ze({
    value: Z,
    key: K,
    fallback: L,
    i18n: ae,
    onDiagnostic: De
  });
  i.useEffect(() => {
    typeof se == "function" && se(Fe.state);
  }, [Fe.state, se]);
  const rt = (Le, at) => {
    ue || mt(Le), typeof ge == "function" && ge(Le, at);
  }, kn = (Le, at, xt) => {
    if (Fe.disabledByState || Fe.readOnly)
      return at?.preventDefault?.(), !1;
    const It = Jr(Le, { min: v, max: E, step: C, showSeconds: N, isTimeDisabled: Y });
    return !It || wo(It, { min: v, max: E, step: C, showSeconds: N, isTimeDisabled: Y }) ? !1 : (Ae || Ke(It), me || Ye(It), typeof de == "function" && de(
      It,
      om({
        source: xt,
        previousValue: bt,
        value: It,
        text: It,
        invalid: !1
      }),
      at
    ), !0);
  }, Be = (Le, at) => {
    const xt = Jr(ht, { min: v, max: E, step: C, showSeconds: N, isTimeDisabled: Y });
    return xt ? kn(xt, Le, at) : !1;
  }, dt = (Le) => {
    typeof ye == "function" && ye(Le), me || Ye(Le.target.value), typeof ie == "function" && ie(Le.target.value, Le);
  }, Yt = (Le) => {
    if (Le.key === "Enter")
      Be(Le, "commit") && rt(!1, Le);
    else if (Le.key === "Escape")
      Le.preventDefault(), rt(!1, Le), me || Ye(bt);
    else if (Le.key === "ArrowDown" && !ke)
      Le.preventDefault(), rt(!0, Le);
    else {
      const at = Fv(Ot || ht || bt, Le.key, nt);
      at && (Le.preventDefault(), kn(at, Le, "keyboard"));
    }
    typeof re == "function" && re(Le);
  };
  return i.createElement(
    "div",
    {
      ...Ue,
      ...y("time-picker", "root", Fe.state),
      ...ot,
      "aria-disabled": Fe.disabledByState ? "true" : void 0,
      "aria-invalid": nt.invalid ? "true" : void 0,
      "aria-required": Fe.required ? "true" : void 0,
      "data-open": String(ke),
      "data-required": String(Fe.required),
      "data-readonly": String(Fe.readOnly),
      "data-invalid": nt.invalid ? "true" : "false"
    },
    Fe.label ? i.createElement(
      "label",
      {
        ...y("time-picker", "label", Fe.state),
        htmlFor: Wt
      },
      Fe.label
    ) : null,
    i.createElement(
      "span",
      y("time-picker", "control", Fe.state),
      i.createElement("input", {
        ...y("time-picker", "input", Fe.state),
        ref: o,
        id: Wt,
        role: "combobox",
        type: "text",
        name: V,
        placeholder: U,
        inputMode: "numeric",
        autoComplete: "off",
        disabled: Fe.disabledByState,
        readOnly: Fe.readOnly,
        required: Fe.required,
        value: ht,
        "aria-label": Fe.ariaLabel,
        "aria-labelledby": Fe.ariaLabelledBy,
        "aria-describedby": Fe.describedBy,
        "aria-invalid": nt.invalid ? "true" : void 0,
        "aria-disabled": Fe.disabledByState ? "true" : void 0,
        "aria-required": Fe.required ? "true" : void 0,
        "aria-readonly": Fe.readOnly ? "true" : void 0,
        "aria-expanded": String(ke),
        "aria-controls": zt,
        "aria-activedescendant": ke ? en : void 0,
        onChange: dt,
        onFocus: ot.onFocus,
        onBlur: ot.onBlur,
        onKeyDown: Yt
      }),
      i.createElement(
        "button",
        {
          ...y("time-picker", "trigger", Fe.state),
          type: "button",
          disabled: Fe.disabledByState || Fe.readOnly,
          "aria-label": je,
          "aria-haspopup": "listbox",
          "aria-expanded": String(ke),
          "aria-controls": zt,
          onClick: (Le) => rt(!ke, Le)
        },
        it(ce, "time")
      )
    ),
    ke ? i.createElement(
      "ul",
      {
        ...y("time-picker", "list", Fe.state),
        id: zt,
        role: "listbox"
      },
      nt.options.map((Le) => {
        const at = Le.value === bt, xt = Le.value === Ot, It = Le.disabled ? "disabled" : xt ? "active" : Fe.state;
        return i.createElement(
          "li",
          {
            ...y("time-picker", "option", It),
            id: `${zt}-option-${Le.value}`,
            key: Le.value,
            role: "option",
            "aria-selected": String(at),
            "aria-disabled": Le.disabled ? "true" : void 0,
            "data-selected": String(at),
            "data-highlighted": String(xt),
            "data-value": Le.value,
            onMouseDown: (ir) => {
              ir.preventDefault(), !Le.disabled && kn(Le.value, ir, "list") && rt(!1, ir);
            }
          },
          Le.label
        );
      })
    ) : null,
    Vr(Fe),
    Br(Fe)
  );
});
Uv.displayName = "ChipsTimePicker";
const [Kv, ui] = $n("dialog"), Eu = i.forwardRef((r, o) => {
  const {
    open: l,
    defaultOpen: u = !1,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    title: m,
    description: g,
    children: v,
    triggerContent: E,
    closeButtonLabel: C,
    closeButtonContent: w,
    closeOnBackdrop: N = !0,
    closeOnEscape: k = !0,
    modal: S = !0,
    labelledBy: b,
    describedBy: _,
    contentId: I,
    onOpenChange: D,
    onStateChange: x,
    onCloseReason: R,
    ...P
  } = r, O = _e(p), A = d || f, { interaction: Q, handlers: F } = Oe(A), [W, q] = Je({
    value: l,
    defaultValue: u === !0,
    onChange: D
  }), H = i.useRef(null), ee = i.useRef(null), j = i.useRef(null), $ = i.useRef(null), U = Ne({
    disabled: A,
    loading: f,
    error: O,
    interaction: Q
  });
  i.useEffect(() => {
    typeof x == "function" && x(U);
  }, [U, x]), i.useEffect(() => {
    W || $.current && ($.current.restore(), $.current = null);
  }, [W]), i.useEffect(() => {
    if (!W || !ee.current)
      return;
    vp(ee.current, {
      restorePoint: $.current
    }).focusFirst() || ee.current.focus?.();
  }, [W]);
  const V = (ae) => {
    A || (q(!1), typeof R == "function" && R(ae));
  }, Z = (ae) => {
    if (A) {
      ae?.preventDefault?.();
      return;
    }
    $.current = Ap(ae?.currentTarget || j.current || H.current), q(!0);
  }, K = (ae) => {
    if (ae.key === "Tab" && S && ee.current) {
      vp(ee.current, {
        restorePoint: $.current
      }).trap(ae);
      return;
    }
    ae.key === "Escape" && k && (ae.preventDefault(), V("escape-key"));
  }, L = i.useId(), M = I || (r.id ? `${r.id}-content` : `${L}-content`), ne = `${M}-header`, te = `${M}-body`, ce = i.useMemo(
    () => ({
      state: U,
      open: !!W,
      disabled: A,
      modal: S,
      contentId: M,
      contentRef: ee,
      triggerRef: j,
      fallbackLabelId: ne,
      fallbackDescriptionId: te,
      labelledBy: b,
      describedBy: _,
      closeOnEscape: k,
      openDialog: Z,
      closeDialog: V,
      handleDialogKeyDown: K
    }),
    [
      U,
      W,
      A,
      S,
      M,
      ee,
      j,
      ne,
      te,
      b,
      _,
      k
    ]
  ), Y = E !== void 0 || m !== void 0 || g !== void 0 || C !== void 0 || w !== void 0;
  return i.createElement(
    Kv.Provider,
    { value: ce },
    i.createElement(
      "div",
      {
        ...P,
        ...y("dialog", "root", U),
        ...F,
        ref: ra(o, H),
        "data-open": String(!!W),
        "aria-disabled": A ? "true" : void 0
      },
      Y && E !== void 0 ? i.createElement(Wu, { "aria-label": P["aria-label"] }, E) : null,
      W ? i.createElement("div", {
        ...y("dialog", "backdrop", U),
        "aria-hidden": "true",
        onClick: N ? () => V("backdrop") : void 0
      }) : null,
      Y ? i.createElement(
        Yu,
        {
          "aria-labelledby": m !== void 0 ? ne : void 0,
          "aria-describedby": g !== void 0 ? te : void 0
        },
        m !== void 0 ? i.createElement(Gu, null, m) : null,
        g !== void 0 ? i.createElement(Xu, null, g) : null,
        v,
        C !== void 0 || w !== void 0 ? i.createElement(Zu, { "aria-label": C }, it(w, "close")) : null
      ) : v,
      O ? i.createElement(
        "span",
        {
          ...y("dialog", "status", U),
          ...Re({ live: "assertive" })
        },
        O.message
      ) : null
    )
  );
});
Eu.displayName = "ChipsDialog.Root";
const Wu = i.forwardRef((r, o) => {
  const { children: l, onClick: u, ...d } = r, f = ui("trigger"), p = i.useRef(null);
  return i.useImperativeHandle(o, () => p.current), i.useEffect(() => (f.triggerRef.current = p.current, () => {
    f.triggerRef.current === p.current && (f.triggerRef.current = null);
  }), [f.triggerRef]), i.createElement(
    "button",
    {
      ...d,
      ...y("dialog", "trigger", f.state),
      ref: p,
      type: d.type || "button",
      disabled: f.disabled,
      role: "button",
      "aria-haspopup": "dialog",
      "aria-expanded": String(f.open),
      "aria-controls": f.contentId,
      onClick: tt(u, f.openDialog)
    },
    l
  );
});
Wu.displayName = "ChipsDialog.Trigger";
const Yu = i.forwardRef((r, o) => {
  const { children: l, onKeyDown: u, ...d } = r, f = ui("content"), p = Ro(l, [Gu]), m = Ro(l, [Xu]), g = d["aria-labelledby"] || f.labelledBy || (p ? f.fallbackLabelId : void 0), v = d["aria-describedby"] || f.describedBy || (m ? f.fallbackDescriptionId : void 0);
  return f.open ? i.createElement(
    "div",
    {
      ...d,
      ...y("dialog", "content", f.state),
      ref: ra(o, f.contentRef),
      id: d.id || f.contentId,
      role: d.role || "dialog",
      "aria-modal": f.modal ? "true" : "false",
      "aria-labelledby": g,
      "aria-describedby": v,
      tabIndex: d.tabIndex ?? -1,
      onKeyDown: tt(u, f.handleDialogKeyDown)
    },
    l
  ) : null;
});
Yu.displayName = "ChipsDialog.Content";
function ci(r, o = "div") {
  const l = i.forwardRef((u, d) => {
    const { as: f = o, children: p, ...m } = u, g = ui(r), v = r === "header" ? g.fallbackLabelId : r === "body" ? g.fallbackDescriptionId : void 0;
    return i.createElement(
      f,
      {
        ...m,
        ...y("dialog", r, g.state),
        ref: d,
        id: m.id || v
      },
      p
    );
  });
  return l.displayName = `ChipsDialog.${r}`, l;
}
const Gu = ci("header", "header"), Xu = ci("body", "section"), jv = ci("footer", "footer"), $v = ci("actions", "div"), Zu = i.forwardRef((r, o) => {
  const { children: l, onClick: u, ...d } = r, f = ui("close");
  return i.createElement(
    "button",
    {
      ...d,
      ...y("dialog", "close", f.state),
      ref: o,
      type: d.type || "button",
      onClick: tt(u, () => f.closeDialog("close-button"))
    },
    l
  );
});
Zu.displayName = "ChipsDialog.Close";
const Hv = Object.assign(Eu, {
  Root: Eu,
  Trigger: Wu,
  Content: Yu,
  Header: Gu,
  Body: Xu,
  Footer: jv,
  Actions: $v,
  Close: Zu
});
Hv.displayName = "ChipsDialog";
const [qv, Ju] = $n("popover"), Su = i.forwardRef((r, o) => {
  const {
    open: l,
    defaultOpen: u = !1,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    triggerContent: m,
    children: g,
    closeOnEscape: v = !0,
    contentId: E,
    onOpenChange: C,
    onStateChange: w,
    ...N
  } = r, k = _e(p), S = d || f, { interaction: b, handlers: _ } = Oe(S), [I, D] = Je({
    value: l,
    defaultValue: u === !0,
    onChange: C
  }), x = Ne({
    disabled: S,
    loading: f,
    error: k,
    interaction: b
  });
  i.useEffect(() => {
    typeof w == "function" && w(x);
  }, [x, w]);
  const R = (q) => {
    if (S) {
      q?.preventDefault?.();
      return;
    }
    D(!I);
  }, P = () => {
    S || D(!1);
  }, O = (q) => {
    q.key === "Escape" && v && (q.preventDefault(), P());
  }, A = i.useId(), Q = E || (r.id ? `${r.id}-content` : `${A}-content`), F = i.useMemo(
    () => ({
      state: x,
      open: !!I,
      disabled: S,
      contentId: Q,
      toggle: R,
      closePopover: P,
      handleContentKeyDown: O
    }),
    [x, I, S, Q]
  ), W = m !== void 0;
  return i.createElement(
    qv.Provider,
    { value: F },
    i.createElement(
      "div",
      {
        ...N,
        ...y("popover", "root", x),
        ..._,
        ref: o,
        "data-open": String(!!I),
        "aria-disabled": S ? "true" : void 0
      },
      W ? i.createElement(ec, null, m) : null,
      W ? i.createElement(tc, null, i.createElement(nc, null), g) : g,
      k ? i.createElement(
        "span",
        {
          ...y("popover", "status", x),
          ...Re({ live: "assertive" })
        },
        k.message
      ) : null
    )
  );
});
Su.displayName = "ChipsPopover.Root";
const ec = i.forwardRef((r, o) => {
  const { children: l, onClick: u, ...d } = r, f = Ju("trigger");
  return i.createElement(
    "button",
    {
      ...d,
      ...y("popover", "trigger", f.state),
      ref: o,
      type: d.type || "button",
      role: "button",
      disabled: f.disabled,
      "aria-haspopup": "dialog",
      "aria-expanded": String(f.open),
      "aria-controls": f.contentId,
      onClick: tt(u, f.toggle)
    },
    l
  );
});
ec.displayName = "ChipsPopover.Trigger";
const tc = i.forwardRef((r, o) => {
  const { children: l, onKeyDown: u, ...d } = r, f = Ju("content");
  return f.open ? i.createElement(
    "div",
    {
      ...d,
      ...y("popover", "content", f.state),
      ref: o,
      id: d.id || f.contentId,
      role: d.role || "dialog",
      "aria-modal": "false",
      tabIndex: d.tabIndex ?? -1,
      onKeyDown: tt(u, f.handleContentKeyDown)
    },
    l
  ) : null;
});
tc.displayName = "ChipsPopover.Content";
const nc = i.forwardRef((r, o) => {
  const l = Ju("arrow");
  return i.createElement("span", {
    ...r,
    ...y("popover", "arrow", l.state),
    ref: o,
    "aria-hidden": "true"
  });
});
nc.displayName = "ChipsPopover.Arrow";
const Qv = Object.assign(Su, {
  Root: Su,
  Trigger: ec,
  Content: tc,
  Arrow: nc
});
Qv.displayName = "ChipsPopover";
const [Wv, rc] = $n("tabs");
function ac(r, o) {
  return r?.items?.find((l) => l.id === String(o)) || null;
}
const Cu = i.forwardRef((r, o) => {
  const {
    value: l,
    defaultValue: u,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    items: m = [],
    orientation: g = "horizontal",
    children: v,
    onValueChange: E,
    onStateChange: C,
    ...w
  } = r, N = _e(p), k = d || f, { interaction: S, handlers: b } = Oe(k), _ = Mo(m), I = u !== void 0 ? String(u) : _[un(_)]?.value, [D, x, R] = Je({
    value: l !== void 0 ? String(l) : void 0,
    defaultValue: I,
    onChange: E
  });
  i.useEffect(() => {
    if (R || _.length === 0)
      return;
    if (!_.some(
      (V) => V.value === D && V.disabled !== !0
    )) {
      const V = un(_);
      V >= 0 && x(_[V].value);
    }
  }, [D, R, _, x]);
  const P = _.findIndex((U) => U.value === D), O = Ne({
    disabled: k,
    loading: f,
    error: N,
    interaction: S
  });
  i.useEffect(() => {
    typeof C == "function" && C(O);
  }, [O, C]);
  const A = i.useId(), Q = i.useRef([]), F = i.useCallback((U) => (Q.current = [
    ...Q.current.filter((V) => V.value !== U.value),
    U
  ], () => {
    Q.current = Q.current.filter((V) => V.value !== U.value);
  }), []), W = i.useCallback(
    (U) => {
      k || x(String(U));
    },
    [k, x]
  ), q = i.useCallback(
    (U, V) => {
      if (k)
        return;
      const Z = Q.current;
      if (Z.length === 0)
        return;
      const K = Z.findIndex((ne) => ne.value === U), L = Lt(Z, K, V, !0), M = Z[L];
      M && (x(M.value), M.ref?.current && typeof M.ref.current.focus == "function" && M.ref.current.focus());
    },
    [k, x]
  ), H = i.useMemo(
    () => Tu(_, {
      activeId: D,
      orientation: g === "vertical" ? "vertical" : "horizontal"
    }),
    [D, _, g]
  ), ee = i.useMemo(
    () => ({
      state: O,
      value: D,
      orientation: g,
      disabled: k,
      baseId: A,
      rovingModel: H,
      selectValue: W,
      registerTrigger: F,
      moveFocus: q
    }),
    [O, D, g, k, A, H, W, F, q]
  ), j = (U) => {
    const V = _[U];
    !V || V.disabled || k || x(V.value);
  }, $ = (U) => {
    if (k || _.length === 0)
      return;
    if (U.key === "Home") {
      U.preventDefault(), j(un(_));
      return;
    }
    if (U.key === "End") {
      U.preventDefault();
      const L = Lt(_, 0, "prev", !0);
      j(L);
      return;
    }
    const V = g !== "vertical", Z = V ? "ArrowRight" : "ArrowDown", K = V ? "ArrowLeft" : "ArrowUp";
    if (U.key === Z) {
      U.preventDefault();
      const L = Lt(_, P, "next", !0);
      j(L);
      return;
    }
    if (U.key === K) {
      U.preventDefault();
      const L = Lt(_, P, "prev", !0);
      j(L);
    }
  };
  return i.createElement(
    Wv.Provider,
    { value: ee },
    i.createElement(
      "div",
      {
        ...w,
        ...y("tabs", "root", O),
        ...b,
        ref: o,
        "aria-disabled": k ? "true" : void 0
      },
      v !== void 0 ? v : i.createElement(
        i.Fragment,
        null,
        i.createElement(
          oc,
          { onKeyDown: $ },
          _.map(
            (U, V) => i.createElement(
              lc,
              {
                key: `${U.value}-${V}`,
                value: U.value,
                disabled: U.disabled,
                index: V
              },
              U.label
            )
          )
        ),
        _.map(
          (U, V) => i.createElement(
            ic,
            {
              key: `${U.value}-${V}`,
              value: U.value,
              index: V
            },
            U.content
          )
        )
      ),
      N ? i.createElement(
        "span",
        {
          ...y("tabs", "status", O),
          ...Re({ live: "assertive" })
        },
        N.message
      ) : null
    )
  );
});
Cu.displayName = "ChipsTabs.Root";
const oc = i.forwardRef((r, o) => {
  const { children: l, onKeyDown: u, ...d } = r, f = rc("list"), p = (m) => {
    !m.defaultPrevented && typeof u == "function" && u(m);
  };
  return i.createElement(
    "div",
    {
      ...d,
      ...y("tabs", "list", f.state),
      ref: o,
      role: "tablist",
      "aria-orientation": f.orientation,
      onKeyDown: p
    },
    l
  );
});
oc.displayName = "ChipsTabs.List";
const lc = i.forwardRef((r, o) => {
  const { children: l, value: u, disabled: d = !1, index: f = 0, onClick: p, onKeyDown: m, ...g } = r, v = rc("trigger"), E = String(u), C = v.value === E, w = Or(E, String(f)), N = g.id || `${v.baseId}-tab-${w}`, k = g["aria-controls"] || `${v.baseId}-panel-${w}`, S = v.disabled || d, b = i.useRef(null);
  i.useImperativeHandle(o, () => b.current), i.useEffect(
    () => v.registerTrigger({
      value: E,
      disabled: S,
      ref: b
    }),
    [v, E, S]
  );
  const _ = (D) => {
    if (S) {
      D?.preventDefault?.();
      return;
    }
    v.selectValue(E);
  }, I = (D) => {
    if (typeof m == "function" && m(D), D.defaultPrevented || v.disabled)
      return;
    const x = v.orientation !== "vertical", R = x ? "ArrowRight" : "ArrowDown", P = x ? "ArrowLeft" : "ArrowUp";
    if (D.key === R) {
      D.preventDefault(), v.moveFocus(E, "next");
      return;
    }
    if (D.key === P) {
      D.preventDefault(), v.moveFocus(E, "prev");
      return;
    }
    if (D.key === "Home") {
      D.preventDefault(), v.moveFocus("", "next");
      return;
    }
    if (D.key === "End") {
      D.preventDefault(), v.moveFocus("", "prev");
      return;
    }
    Ut(D.key) && (D.preventDefault(), _(D));
  };
  return i.createElement(
    "button",
    {
      ...g,
      ...y("tabs", "trigger", C ? "active" : v.state),
      ref: b,
      id: N,
      role: "tab",
      type: g.type || "button",
      ...Pu(
        ac(v.rovingModel, E) || { active: C, disabled: S },
        { includeAriaDisabled: !1 }
      ),
      "aria-selected": String(C),
      "aria-controls": k,
      "aria-disabled": d ? "true" : void 0,
      disabled: S,
      onClick: tt(p, _),
      onKeyDown: I
    },
    l
  );
});
lc.displayName = "ChipsTabs.Trigger";
const ic = i.forwardRef((r, o) => {
  const { children: l, value: u, index: d = 0, ...f } = r, p = rc("panel"), m = String(u), g = p.value === m, v = Or(m, String(d)), E = f.id || `${p.baseId}-panel-${v}`, C = f["aria-labelledby"] || `${p.baseId}-tab-${v}`;
  return i.createElement(
    "div",
    {
      ...f,
      ...y("tabs", "panel", g ? "active" : p.state),
      ref: o,
      id: E,
      role: "tabpanel",
      "aria-labelledby": C,
      hidden: !g
    },
    g ? l : null
  );
});
ic.displayName = "ChipsTabs.Panel";
const Yv = Object.assign(Cu, {
  Root: Cu,
  List: oc,
  Trigger: lc,
  Panel: ic
});
Yv.displayName = "ChipsTabs";
const [Gv, zo] = $n("menu"), wu = i.forwardRef((r, o) => {
  const {
    open: l,
    defaultOpen: u = !1,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    triggerContent: m,
    items: g = [],
    children: v,
    closeOnSelect: E = !0,
    onOpenChange: C,
    onSelect: w,
    onStateChange: N,
    ...k
  } = r, S = _e(p), b = d || f, { interaction: _, handlers: I } = Oe(b), D = Mo(g), [x, R] = Je({
    value: l,
    defaultValue: u === !0,
    onChange: C
  }), [P, O] = i.useState(
    D[un(D)]?.value ?? null
  ), A = i.useRef([]), [Q, F] = i.useState(0), W = i.useRef(null), q = Ne({
    disabled: b,
    loading: f,
    error: S,
    interaction: _
  });
  i.useEffect(() => {
    typeof N == "function" && N(q);
  }, [q, N]);
  const H = i.useId(), ee = k.id || H, j = `${ee}-trigger`, $ = `${ee}-content`, U = i.useMemo(
    () => mn(A.current, D),
    [Q, D]
  ), V = i.useCallback((ge) => (A.current = em(A.current, ge), F((se) => se + 1), () => {
    A.current = tm(A.current, ge.value), F((se) => se + 1);
  }), []), Z = i.useCallback((ge = {}) => {
    if (b)
      return;
    R(!0);
    const se = Ra(mn(A.current, D));
    O(se ? se.value : null), ge.focus && Kn(se);
  }, [b, D, R]), K = i.useCallback(() => {
    b || (R(!1), W.current && typeof W.current.focus == "function" && W.current.focus());
  }, [b, R]), L = i.useCallback(
    (ge, se = {}) => {
      const re = ge === null ? null : Un(A.current, String(ge)) || Un(D, String(ge));
      O(re ? re.value : null), se.focus && Kn(re);
    },
    [D]
  ), M = i.useCallback(
    (ge = {}) => {
      const se = Ra(mn(A.current, D));
      O(se ? se.value : null), ge.focus && Kn(se);
    },
    [D]
  ), ne = i.useCallback(
    (ge = {}) => {
      const se = nm(mn(A.current, D));
      O(se ? se.value : null), ge.focus && Kn(se);
    },
    [D]
  ), te = i.useCallback(
    (ge, se = {}) => {
      const re = mn(A.current, D), ye = rm(re, P, ge, !0);
      O(ye ? ye.value : null), se.focus && Kn(ye);
    },
    [P, D]
  ), ce = i.useCallback((ge, se = {}) => {
    const re = Un(
      mn(A.current, D),
      String(ge)
    );
    if (!re || re.disabled || b) {
      se.event?.preventDefault?.();
      return;
    }
    typeof w == "function" && w(re.value, {
      source: se.source || "programmatic",
      value: re.value
    }), E && K();
  }, [K, E, b, D, w]), Y = i.useCallback((ge) => {
    if (b) {
      ge?.preventDefault?.();
      return;
    }
    const se = !x;
    if (R(se), se) {
      const re = Ra(mn(A.current, D));
      O(re ? re.value : null);
    }
  }, [x, b, D, R]);
  i.useEffect(() => {
    if (!x)
      return;
    if (!Un(U, P)) {
      const se = Ra(U);
      O(se ? se.value : null);
    }
  }, [x, P, U]);
  const ae = i.useMemo(
    () => Tu(U, {
      activeId: P
    }),
    [P, U]
  ), de = i.useMemo(
    () => ({
      state: q,
      open: !!x,
      disabled: b,
      loading: f,
      error: S,
      highlightedValue: P,
      rovingModel: ae,
      baseId: ee,
      triggerId: j,
      contentId: $,
      triggerRef: W,
      closeOnSelect: E,
      registerItem: V,
      openMenu: Z,
      closeMenu: K,
      toggleOpen: Y,
      highlightValue: L,
      highlightFirst: M,
      highlightLast: ne,
      highlightNext: te,
      selectValue: ce
    }),
    [
      q,
      x,
      b,
      f,
      S,
      P,
      ae,
      ee,
      j,
      $,
      E,
      V,
      Z,
      K,
      Y,
      L,
      M,
      ne,
      te,
      ce
    ]
  ), ie = i.createElement(
    i.Fragment,
    null,
    i.createElement(sc, null, m),
    i.createElement(
      uc,
      null,
      D.map(
        (ge, se) => i.createElement(
          cc,
          {
            key: `${ge.value}-${se}`,
            value: ge.value,
            disabled: ge.disabled,
            index: se
          },
          ge.label
        )
      )
    )
  );
  return i.createElement(
    Gv.Provider,
    { value: de },
    i.createElement(
      "div",
      {
        ...k,
        ...y("menu", "root", q),
        ...I,
        ref: o,
        "data-open": String(!!x),
        "aria-disabled": b ? "true" : void 0
      },
      v !== void 0 ? v : ie,
      S ? i.createElement(
        "span",
        {
          ...y("menu", "status", q),
          ...Re({ live: "assertive" })
        },
        S.message
      ) : null
    )
  );
});
wu.displayName = "ChipsMenu.Root";
const sc = i.forwardRef((r, o) => {
  const { children: l, onClick: u, onKeyDown: d, ...f } = r, p = zo("trigger"), m = i.useRef(null);
  i.useImperativeHandle(o, () => m.current), i.useEffect(() => (p.triggerRef.current = m.current, () => {
    p.triggerRef.current === m.current && (p.triggerRef.current = null);
  }), [p.triggerRef]);
  const g = (v) => {
    if (typeof d == "function" && d(v), !(v.defaultPrevented || p.disabled)) {
      if (v.key === "ArrowDown") {
        v.preventDefault(), p.openMenu();
        return;
      }
      if (v.key === "ArrowUp") {
        v.preventDefault(), p.open || p.openMenu(), p.highlightLast();
        return;
      }
      Ut(v.key) && (v.preventDefault(), p.toggleOpen(v));
    }
  };
  return i.createElement(
    "button",
    {
      ...f,
      ...y("menu", "trigger", p.state),
      ref: m,
      id: f.id || p.triggerId,
      type: f.type || "button",
      role: "button",
      disabled: p.disabled,
      "aria-haspopup": "menu",
      "aria-expanded": String(p.open),
      "aria-controls": p.contentId,
      onClick: tt(u, p.toggleOpen),
      onKeyDown: g
    },
    l
  );
});
sc.displayName = "ChipsMenu.Trigger";
const uc = i.forwardRef((r, o) => {
  const { children: l, onKeyDown: u, ...d } = r, f = zo("content"), p = (m) => {
    if (typeof u == "function" && u(m), !(m.defaultPrevented || f.disabled)) {
      if (m.key === "Escape") {
        m.preventDefault(), f.closeMenu();
        return;
      }
      if (m.key === "ArrowDown") {
        m.preventDefault(), f.highlightNext("next", { focus: !0 });
        return;
      }
      if (m.key === "ArrowUp") {
        m.preventDefault(), f.highlightNext("prev", { focus: !0 });
        return;
      }
      if (m.key === "Home") {
        m.preventDefault(), f.highlightFirst({ focus: !0 });
        return;
      }
      if (m.key === "End") {
        m.preventDefault(), f.highlightLast({ focus: !0 });
        return;
      }
      Ut(m.key) && (m.preventDefault(), f.highlightedValue !== null && f.selectValue(f.highlightedValue, { source: "keyboard", event: m }));
    }
  };
  return f.open ? i.createElement(
    "div",
    {
      ...d,
      ...y("menu", "content", f.state),
      ref: o,
      id: d.id || f.contentId,
      role: d.role || "menu",
      "aria-labelledby": d["aria-labelledby"] || f.triggerId,
      tabIndex: d.tabIndex ?? -1,
      onKeyDown: p
    },
    l
  ) : null;
});
uc.displayName = "ChipsMenu.Content";
const cc = i.forwardRef((r, o) => {
  const {
    children: l,
    value: u,
    disabled: d = !1,
    textValue: f,
    index: p = 0,
    onClick: m,
    onMouseEnter: g,
    onFocus: v,
    ...E
  } = r, C = zo("item"), w = String(u), N = Or(w, String(p)), k = E.id || `${C.baseId}-item-${N}`, S = C.disabled || d, b = C.highlightedValue === w, _ = ac(C.rovingModel, w), I = S ? "disabled" : b ? "hover" : C.state === "disabled" || C.state === "loading" || C.state === "error" ? C.state : "idle", D = i.useRef(null);
  i.useImperativeHandle(o, () => D.current);
  const x = l !== void 0 ? l : f ?? w;
  i.useEffect(
    () => C.registerItem({
      value: w,
      disabled: S,
      label: x,
      textValue: f,
      id: k,
      ref: D
    }),
    [C.registerItem, S, k, w, x, f]
  );
  const R = (O) => {
    typeof g == "function" && O.type === "mouseenter" && g(O), typeof v == "function" && O.type === "focus" && v(O), !O.defaultPrevented && !S && C.highlightValue(w);
  }, P = (O) => {
    if (S) {
      O?.preventDefault?.();
      return;
    }
    C.selectValue(w, { source: "pointer", event: O });
  };
  return i.createElement(
    "button",
    {
      ...E,
      ...y("menu", "item", I),
      ref: D,
      id: k,
      type: E.type || "button",
      role: "menuitem",
      ...Pu(_ || { active: b, disabled: S }, { includeAriaDisabled: !1 }),
      disabled: S,
      "aria-disabled": S ? "true" : void 0,
      "data-highlighted": String(b),
      onMouseEnter: R,
      onFocus: R,
      onClick: tt(m, P)
    },
    x
  );
});
cc.displayName = "ChipsMenu.Item";
const lm = i.forwardRef((r, o) => {
  const { children: l, label: u, labelId: d, ...f } = r, p = zo("group"), m = i.useId(), g = d || (u !== void 0 ? `${f.id || m}-label` : void 0);
  return i.createElement(
    "div",
    {
      ...f,
      ...y("menu", "group", p.state),
      ref: o,
      role: f.role || "group",
      "aria-labelledby": f["aria-labelledby"] || g
    },
    u !== void 0 ? i.createElement(
      "div",
      {
        ...y("menu", "group-label", p.state),
        id: g
      },
      u
    ) : null,
    l
  );
});
lm.displayName = "ChipsMenu.Group";
const im = i.forwardRef((r, o) => {
  const l = zo("separator");
  return i.createElement("div", {
    ...r,
    ...y("menu", "separator", l.state),
    ref: o,
    role: r.role || "separator",
    "aria-orientation": r["aria-orientation"] || "horizontal"
  });
});
im.displayName = "ChipsMenu.Separator";
const Xv = Object.assign(wu, {
  Root: wu,
  Trigger: sc,
  Content: uc,
  Item: cc,
  Group: lm,
  Separator: im
});
Xv.displayName = "ChipsMenu";
function sm(r, o, l) {
  return r?.icon ? i.createElement(
    "span",
    {
      ...y(o, "icon", l),
      "aria-hidden": "true"
    },
    i.createElement(Ao, {
      descriptor: {
        ...r.icon,
        decorative: !0
      }
    })
  ) : null;
}
function um(r, o, l) {
  return i.createElement(
    "span",
    y(o, "label", l),
    r.label
  );
}
function cm(r, o, l) {
  return r ? i.createElement(
    "span",
    y(o, "shortcut", l),
    r
  ) : null;
}
function or(r, o) {
  return r.adapter || o?.adapter || null;
}
function di(r, o, l, u, d) {
  if (!(!r || typeof r.invokeCommand != "function"))
    return r.invokeCommand(o.commandId, u, {
      source: l,
      context: d
    });
}
const Zv = i.forwardRef((r, o) => {
  const {
    shortcut: l,
    command: u,
    disabled: d = !1,
    ariaLabel: f,
    separator: p = "+",
    onStateChange: m
  } = r, g = gu(u ? u.shortcut : l), v = g.split("+").map((C) => C.trim()).filter(Boolean), E = d ? "disabled" : "idle";
  return i.useEffect(() => {
    typeof m == "function" && m(E);
  }, [E, m]), i.createElement(
    "kbd",
    {
      ...y("shortcut", "root", E),
      ref: o,
      "aria-label": f || g,
      "aria-disabled": d ? "true" : void 0
    },
    v.map(
      (C, w) => i.createElement(
        i.Fragment,
        { key: `${C}-${w}` },
        w > 0 ? i.createElement(
          "span",
          {
            ...y("shortcut", "separator", E),
            "aria-hidden": "true"
          },
          p
        ) : null,
        i.createElement(
          "span",
          y("shortcut", "key", E),
          C
        )
      )
    )
  );
});
Zv.displayName = "ChipsShortcut";
const dm = i.forwardRef((r, o) => {
  const l = Ua(), {
    command: u,
    adapter: d,
    i18n: f = l?.i18n,
    disabled: p = !1,
    loading: m = !1,
    error: g = null,
    payload: v,
    invocationContext: E,
    visualState: C,
    onCommandInvoke: w,
    onStateChange: N
  } = r, k = Yp(u, { i18n: f }), S = _e(g), b = p || m || !k || k.disabled, { interaction: _, handlers: I } = Oe(b), D = C || Ne({
    disabled: b,
    loading: m,
    error: S,
    interaction: _
  }), x = or({ adapter: d }, l);
  i.useEffect(() => {
    typeof N == "function" && N(D);
  }, [D, N]);
  const R = () => {
    !k || k.disabled || b || (typeof w == "function" && w(k), di(x, k, "toolbar", v, E));
  };
  return i.createElement(
    "button",
    {
      ...y("toolbar", "item", D),
      ...I,
      ref: o,
      type: "button",
      disabled: b,
      "aria-label": k?.ariaLabel,
      "aria-pressed": k?.checked ? "true" : void 0,
      "aria-disabled": k?.disabled ? "true" : void 0,
      "data-command-id": k?.commandId,
      "data-checked": String(!!k?.checked),
      onClick: R
    },
    k ? sm(k, "toolbar", D) : null,
    k ? um(k, "toolbar", D) : null,
    k ? cm(k.shortcutLabel, "toolbar", D) : null
  );
});
dm.displayName = "ChipsToolbarItem";
const Jv = i.forwardRef((r, o) => {
  const l = Ua(), {
    commands: u = l?.commands,
    toolbarId: d,
    groupId: f,
    adapter: p,
    i18n: m = l?.i18n,
    query: g,
    disabled: v = !1,
    loading: E = !1,
    error: C = null,
    ariaLabel: w,
    payload: N,
    invocationContext: k,
    onCommandInvoke: S,
    onStateChange: b
  } = r, { commands: _, loading: I, error: D } = li({
    adapter: or({ adapter: p }, l),
    commands: u,
    query: {
      source: "toolbar",
      ...g
    }
  }), x = _e(C || D), R = v || E || I, { interaction: P, handlers: O } = Oe(R), A = Jg(_, {
    toolbarId: d,
    groupId: f,
    i18n: m
  }), Q = or({ adapter: p }, l), F = Ne({
    disabled: R,
    loading: E || I,
    error: x,
    interaction: P
  });
  i.useEffect(() => {
    typeof b == "function" && b(F);
  }, [F, b]);
  const W = /* @__PURE__ */ new Map();
  for (const q of A)
    W.has(q.groupId) || W.set(q.groupId, []), W.get(q.groupId).push(q);
  return i.createElement(
    "div",
    {
      ...y("toolbar", "root", F),
      ...O,
      ref: o,
      role: "toolbar",
      "aria-label": w,
      "aria-disabled": R ? "true" : void 0
    },
    [...W.entries()].map(
      ([q, H]) => i.createElement(
        "div",
        {
          ...y("toolbar", "group", F),
          key: q,
          role: "group",
          "data-group-id": q
        },
        H.map(
          (ee) => i.createElement(
            dm,
            {
              key: ee.commandId,
              command: ee,
              adapter: Q,
              i18n: m,
              disabled: R,
              payload: N,
              invocationContext: k,
              visualState: F,
              onCommandInvoke: S
            }
          )
        )
      )
    ),
    x ? i.createElement(
      "span",
      {
        ...y("toolbar", "status", F),
        ...Re({ live: "assertive" })
      },
      x.message
    ) : null
  );
});
Jv.displayName = "ChipsToolbar";
function fm(r) {
  const {
    scope: o,
    state: l,
    groups: u,
    disabled: d,
    selectCommand: f
  } = r;
  return u.map(
    (p) => i.createElement(
      "li",
      {
        ...y(o, "group", l),
        key: p.groupId,
        role: "none",
        "data-group-id": p.groupId
      },
      i.createElement(
        "ul",
        { role: "group" },
        p.items.map(
          (m) => i.createElement(
            "li",
            {
              key: m.commandId,
              role: "none"
            },
            i.createElement(
              "button",
              {
                ...y(o, "item", l),
                type: "button",
                role: "menuitem",
                disabled: d || m.disabled,
                "aria-label": m.ariaLabel,
                "aria-disabled": m.disabled ? "true" : void 0,
                "aria-checked": m.checked ? "true" : void 0,
                "data-command-id": m.commandId,
                onClick: () => f(m)
              },
              sm(m, o, l),
              um(m, o, l),
              cm(m.shortcutLabel, o, l)
            )
          )
        )
      )
    )
  );
}
const eb = i.forwardRef((r, o) => {
  const l = Ua(), {
    commands: u = l?.commands,
    adapter: d,
    i18n: f = l?.i18n,
    menus: p = [],
    query: m,
    disabled: g = !1,
    loading: v = !1,
    error: E = null,
    ariaLabel: C,
    payload: w,
    invocationContext: N,
    onCommandInvoke: k,
    onStateChange: S
  } = r, { commands: b, loading: _, error: I } = li({
    adapter: or({ adapter: d }, l),
    commands: u,
    query: {
      source: "menu",
      ...m
    }
  }), D = _e(E || I), x = g || v || _, { interaction: R, handlers: P } = Oe(x), O = or({ adapter: d }, l), A = Ne({
    disabled: x,
    loading: v || _,
    error: D,
    interaction: R
  }), [Q, F] = i.useState(null);
  i.useEffect(() => {
    typeof S == "function" && S(A);
  }, [A, S]);
  const W = Array.isArray(p) && p.length > 0 ? p : [...new Set(
    oi(b, { i18n: f }).flatMap((H) => H.menuPlacement.map((ee) => _t(ee.menuId) || "app"))
  )].map((H) => ({ menuId: H, label: H })), q = (H) => {
    H.disabled || x || (typeof k == "function" && k(H), di(O, H, "menu", w, N), F(null));
  };
  return i.createElement(
    "nav",
    {
      ...y("menu-bar", "root", A),
      ...P,
      ref: o,
      role: "menubar",
      "aria-label": C,
      "aria-disabled": x ? "true" : void 0
    },
    W.map((H) => {
      const ee = _t(H.menuId) || "app", j = Xp(b, {
        menuId: ee,
        i18n: f
      }), $ = Q === ee;
      return i.createElement(
        "div",
        {
          ...y("menu-bar", "menu", A),
          key: ee,
          role: "none",
          "data-menu-id": ee
        },
        i.createElement(
          "button",
          {
            ...y("menu-bar", "menu", A),
            type: "button",
            role: "menuitem",
            disabled: x,
            "aria-haspopup": "menu",
            "aria-expanded": String($),
            onClick: () => F($ ? null : ee)
          },
          H.label || ee
        ),
        $ ? i.createElement(
          "ul",
          {
            ...y("menu-bar", "content", A),
            role: "menu"
          },
          fm({
            scope: "menu-bar",
            state: A,
            groups: j,
            disabled: x,
            selectCommand: q
          })
        ) : null
      );
    }),
    D ? i.createElement(
      "span",
      {
        ...y("menu-bar", "status", A),
        ...Re({ live: "assertive" })
      },
      D.message
    ) : null
  );
});
eb.displayName = "ChipsMenuBar";
const tb = i.forwardRef((r, o) => {
  const l = Ua(), {
    commands: u = l?.commands,
    adapter: d,
    i18n: f = l?.i18n,
    menuId: p,
    query: m,
    disabled: g = !1,
    loading: v = !1,
    error: E = null,
    triggerContent: C,
    children: w,
    payload: N,
    invocationContext: k,
    onCommandInvoke: S,
    onStateChange: b
  } = r, { commands: _, loading: I, error: D } = li({
    adapter: or({ adapter: d }, l),
    commands: u,
    query: {
      source: "context-menu",
      ...m
    }
  }), x = _e(E || D), R = g || v || I, { interaction: P, handlers: O } = Oe(R), [A, Q] = i.useState(!1), F = or({ adapter: d }, l), W = Xp(_, {
    menuId: p,
    i18n: f
  }), q = Ne({
    disabled: R,
    loading: v || I,
    error: x,
    interaction: P
  });
  i.useEffect(() => {
    typeof b == "function" && b(q);
  }, [q, b]);
  const H = (j) => {
    j.disabled || R || (typeof S == "function" && S(j), di(F, j, "context-menu", N, k), Q(!1));
  }, ee = (j) => {
    R || (j.preventDefault(), Q(!0));
  };
  return i.createElement(
    "div",
    {
      ...y("context-menu", "root", q),
      ...O,
      ref: o,
      "data-open": String(A),
      "aria-disabled": R ? "true" : void 0
    },
    i.createElement(
      "button",
      {
        ...y("context-menu", "trigger", q),
        type: "button",
        role: "button",
        disabled: R,
        "aria-haspopup": "menu",
        "aria-expanded": String(A),
        onContextMenu: ee,
        onClick: () => Q(!A)
      },
      C || w
    ),
    A ? i.createElement(
      "ul",
      {
        ...y("context-menu", "content", q),
        role: "menu"
      },
      fm({
        scope: "context-menu",
        state: q,
        groups: W,
        disabled: R,
        selectCommand: H
      })
    ) : null,
    x ? i.createElement(
      "span",
      {
        ...y("context-menu", "status", q),
        ...Re({ live: "assertive" })
      },
      x.message
    ) : null
  );
});
tb.displayName = "ChipsContextMenu";
const nb = i.forwardRef((r, o) => {
  const {
    open: l,
    defaultOpen: u = !1,
    disabled: d = !1,
    loading: f = !1,
    error: p = null,
    triggerContent: m,
    content: g,
    onOpenChange: v,
    onStateChange: E
  } = r, C = _e(p), w = d || f, { interaction: N, handlers: k } = Oe(w), [S, b] = Je({
    value: l,
    defaultValue: u === !0,
    onChange: v
  }), _ = Ne({
    disabled: w,
    loading: f,
    error: C,
    interaction: N
  });
  i.useEffect(() => {
    typeof E == "function" && E(_);
  }, [_, E]);
  const I = i.useId(), D = () => {
    w || b(!0);
  }, x = () => {
    b(!1);
  }, R = (P) => {
    P.key === "Escape" && (P.preventDefault(), x()), Ut(P.key) && D();
  };
  return i.createElement(
    "span",
    {
      ...y("tooltip", "root", _),
      ...k,
      ref: o,
      "data-open": String(!!S),
      "aria-disabled": w ? "true" : void 0
    },
    i.createElement(
      "button",
      {
        ...y("tooltip", "trigger", _),
        type: "button",
        disabled: w,
        "aria-describedby": S ? I : void 0,
        onPointerEnter: D,
        onPointerLeave: x,
        onFocus: D,
        onBlur: x,
        onKeyDown: R
      },
      m
    ),
    S && g ? i.createElement(
      "div",
      {
        ...y("tooltip", "content", _),
        id: I,
        role: "tooltip"
      },
      i.createElement("span", {
        ...y("tooltip", "arrow", _),
        "aria-hidden": "true"
      }),
      g
    ) : null,
    C ? i.createElement(
      "span",
      {
        ...y("tooltip", "status", _),
        ...Re({ live: "assertive" })
      },
      C.message
    ) : null
  );
});
nb.displayName = "ChipsTooltip";
const [ei] = $n("form"), dc = i.createContext(null);
dc.displayName = "form-compound-field-context";
function fi(r) {
  const o = i.useContext(dc);
  if (!o)
    throw new Error(`FORM_COMPOUND_FIELD_CONTEXT_MISSING:${r}`);
  return o;
}
function To(...r) {
  return Tp(
    r.flatMap((o) => typeof o == "string" ? o.split(/\s+/) : []).filter(Boolean)
  );
}
function ra(...r) {
  return (o) => {
    for (const l of r)
      l && (typeof l == "function" ? l(o) : l.current = o);
  };
}
function kp(r) {
  return ["input", "textarea", "select", "button"].includes(r);
}
function rb(r, o = {}) {
  return {
    id: o.id || r.controlId,
    required: o.required ?? r.required,
    disabled: o.disabled ?? r.disabled,
    readOnly: o.readOnly ?? r.readOnly,
    "aria-required": o["aria-required"] ?? (r.required ? "true" : void 0),
    "aria-labelledby": o["aria-labelledby"] ?? r.labelId,
    "aria-invalid": o["aria-invalid"] ?? (r.invalid ? "true" : void 0),
    "aria-describedby": To(o["aria-describedby"], r.describedBy)
  };
}
function xp(r, o = {}, l = {}) {
  return {
    id: o.id || r.controlId,
    required: l.includeNativeRequired === !1 ? o.required : o.required ?? r.required,
    disabled: l.includeDisabled === !1 ? o.disabled : o.disabled ?? r.disabled,
    readOnly: l.includeReadOnly === !1 ? o.readOnly : o.readOnly ?? r.readOnly,
    "aria-required": o["aria-required"] ?? (r.required ? "true" : void 0),
    "aria-invalid": o["aria-invalid"] ?? (r.invalid ? "true" : void 0),
    "aria-describedby": To(o["aria-describedby"], r.describedBy)
  };
}
const ku = i.forwardRef((r, o) => {
  const {
    children: l,
    disabled: u = !1,
    loading: d = !1,
    error: f = null,
    readOnly: p = !1,
    required: m = !1,
    onSubmit: g,
    onStateChange: v,
    ...E
  } = r, C = _e(f), w = u || d, { interaction: N, handlers: k } = Oe(w), S = Ne({
    disabled: w,
    loading: d,
    error: C,
    interaction: N
  });
  i.useEffect(() => {
    typeof v == "function" && v(S);
  }, [S, v]);
  const b = i.useMemo(
    () => ({
      state: S,
      disabled: w,
      loading: d,
      error: C,
      readOnly: p,
      required: m
    }),
    [S, w, d, C, p, m]
  ), _ = (I) => {
    if (w) {
      I.preventDefault();
      return;
    }
    typeof g == "function" && g(I);
  };
  return i.createElement(
    ei.Provider,
    { value: b },
    i.createElement(
      "form",
      {
        ...E,
        ...y("form", "root", S),
        ...k,
        ref: o,
        "aria-disabled": w ? "true" : void 0,
        "aria-invalid": C ? "true" : void 0,
        "data-required": String(m === !0),
        "data-readonly": String(p === !0),
        onSubmit: tt(E.onSubmit, _)
      },
      l,
      C ? i.createElement(
        "span",
        {
          ...y("form", "status", S),
          ...Re({ live: "assertive" })
        },
        C.message
      ) : null
    )
  );
});
ku.displayName = "ChipsForm.Root";
const pm = i.forwardRef((r, o) => {
  const {
    children: l,
    title: u,
    titleId: d,
    description: f,
    descriptionId: p,
    error: m = null,
    disabled: g,
    loading: v,
    required: E,
    readOnly: C,
    onStateChange: w,
    ...N
  } = r, k = i.useContext(ei) ?? {}, S = _e(m) || k.error, b = g ?? k.disabled, _ = v ?? k.loading, I = Ne({
    disabled: b,
    loading: _,
    error: S
  }), D = i.useId(), x = d || (u !== void 0 ? `${N.id || D}-title` : void 0), R = p || (f !== void 0 ? `${N.id || D}-description` : void 0);
  i.useEffect(() => {
    typeof w == "function" && w(I);
  }, [I, w]);
  const P = i.useMemo(
    () => ({
      ...k,
      state: I,
      disabled: b,
      loading: _,
      error: S,
      readOnly: C ?? k.readOnly,
      required: E ?? k.required
    }),
    [k, I, b, _, S, C, E]
  );
  return i.createElement(
    ei.Provider,
    { value: P },
    i.createElement(
      "section",
      {
        ...N,
        ...y("form", "section", I),
        ref: o,
        "aria-labelledby": N["aria-labelledby"] || x,
        "aria-describedby": To(N["aria-describedby"], R),
        "aria-disabled": b ? "true" : void 0,
        "aria-invalid": S ? "true" : void 0
      },
      u !== void 0 ? i.createElement(
        "h3",
        {
          id: x,
          ...y("form", "label", I)
        },
        u
      ) : null,
      f !== void 0 ? i.createElement(
        "p",
        {
          id: R,
          ...y("form", "hint", I)
        },
        f
      ) : null,
      l,
      S ? i.createElement(
        "span",
        {
          ...y("form", "status", I),
          ...Re({ live: "assertive" })
        },
        S.message
      ) : null
    )
  );
});
pm.displayName = "ChipsForm.Section";
const mm = i.forwardRef((r, o) => {
  const {
    children: l,
    id: u,
    name: d,
    required: f,
    disabled: p,
    loading: m,
    error: g = null,
    readOnly: v,
    onStateChange: E,
    ...C
  } = r, w = i.useContext(ei) ?? {}, N = i.useId(), S = Or(u || d || N, "field"), b = _e(g) || w.error, _ = p ?? w.disabled, I = m ?? w.loading, D = f ?? w.required, x = v ?? w.readOnly, R = Ne({
    disabled: _,
    loading: I,
    error: b
  }), P = `${S}-label`, O = `${S}-control`, A = `${S}-hint`, Q = `${S}-error`, F = Ro(l, [pc]), W = Ro(l, [fc]), q = To(
    F ? A : void 0,
    W || b ? Q : void 0
  );
  i.useEffect(() => {
    typeof E == "function" && E(R);
  }, [R, E]);
  const H = i.useMemo(
    () => ({
      state: R,
      disabled: _,
      loading: I,
      error: b,
      invalid: !!b,
      readOnly: x,
      required: D,
      baseId: S,
      labelId: P,
      controlId: O,
      hintId: A,
      errorId: Q,
      describedBy: q
    }),
    [
      R,
      _,
      I,
      b,
      x,
      D,
      S,
      P,
      O,
      A,
      Q,
      q
    ]
  );
  return i.createElement(
    dc.Provider,
    { value: H },
    i.createElement(
      "div",
      {
        ...C,
        ...y("form", "field", R),
        ref: o,
        "aria-disabled": _ ? "true" : void 0,
        "aria-invalid": b ? "true" : void 0,
        "aria-describedby": To(C["aria-describedby"], q),
        "data-required": String(D === !0),
        "data-readonly": String(x === !0)
      },
      l
    )
  );
});
mm.displayName = "ChipsForm.Field";
const hm = i.forwardRef((r, o) => {
  const { children: l, requiredIndicator: u = "*", ...d } = r, f = fi("label");
  return i.createElement(
    "label",
    {
      ...d,
      ...y("form", "label", f.state),
      ref: o,
      id: d.id || f.labelId,
      htmlFor: d.htmlFor || f.controlId
    },
    l,
    f.required ? i.createElement(
      "span",
      {
        ...y("form", "required", f.state),
        "aria-hidden": "true"
      },
      u
    ) : null
  );
});
hm.displayName = "ChipsForm.Label";
const ym = i.forwardRef((r, o) => {
  const { children: l, as: u = "input", ...d } = r, f = fi("control"), p = xp(f, d);
  if (i.isValidElement(l)) {
    const g = kp(l.type) ? xp(f, l.props) : rb(f, l.props);
    return i.cloneElement(l, {
      ...g,
      ref: ra(l.ref, o)
    });
  }
  const m = {
    ...d,
    ...p,
    ref: o
  };
  return kp(u) && Object.assign(m, y("form", "control", f.state)), i.createElement(u, m, l);
});
ym.displayName = "ChipsForm.Control";
const fc = i.forwardRef((r, o) => {
  const { children: l, live: u = "assertive", ...d } = r, f = fi("error"), p = l !== void 0 ? l : f.error?.message;
  return p == null ? null : i.createElement(
    "p",
    {
      ...d,
      ...y("form", "error", f.state),
      ...Re({ live: u }),
      ref: o,
      id: d.id || f.errorId
    },
    p
  );
});
fc.displayName = "ChipsForm.Error";
const pc = i.forwardRef((r, o) => {
  const { children: l, ...u } = r, d = fi("hint");
  return l == null ? null : i.createElement(
    "p",
    {
      ...u,
      ...y("form", "hint", d.state),
      ref: o,
      id: u.id || d.hintId
    },
    l
  );
});
pc.displayName = "ChipsForm.Hint";
const ab = Object.assign(ku, {
  Root: ku,
  Section: pm,
  Field: mm,
  Label: hm,
  Control: ym,
  Error: fc,
  Hint: pc
});
ab.displayName = "ChipsForm";
const ob = i.forwardRef((r, o) => {
  const {
    items: l = [],
    itemHeight: u = 44,
    height: d = 320,
    overscan: f = 3,
    ariaLabel: p,
    disabled: m = !1,
    loading: g = !1,
    error: v = null,
    activeIndex: E,
    defaultActiveIndex: C = -1,
    renderItem: w,
    onActiveIndexChange: N,
    onStateChange: k
  } = r, S = _e(v), b = m || g, { interaction: _, handlers: I } = Oe(b), D = i.useMemo(
    () => (Array.isArray(l) ? l : []).map(($, U) => {
      const V = $ && typeof $ == "object" ? $ : {
        value: String(U),
        label: $ == null ? "" : String($)
      };
      return {
        ...V,
        value: typeof V.value == "string" || typeof V.value == "number" ? String(V.value) : String(U),
        disabled: V.disabled === !0
      };
    }),
    [l]
  ), [x, R] = i.useState(0), [P, O] = Je({
    value: E,
    defaultValue: C,
    onChange: N
  }), A = Ne({
    disabled: b,
    loading: g,
    error: S,
    interaction: _
  });
  i.useEffect(() => {
    typeof k == "function" && k(A);
  }, [A, k]);
  const Q = Oa(d, 320), F = Oa(u, 44), W = i.useMemo(
    () => nv({
      itemCount: D.length,
      itemHeight: F,
      viewportHeight: Q,
      scrollTop: x,
      overscan: f
    }),
    [D.length, F, f, x, Q]
  ), q = i.useMemo(
    () => D.slice(W.start, W.end + 1).map(($, U) => ({ item: $, index: W.start + U })),
    [D, W.end, W.start]
  ), H = D.length * F, ee = ($) => {
    b || $ < 0 || $ >= D.length || D[$].disabled || O($);
  }, j = ($) => {
    if (!(b || D.length === 0)) {
      if ($.key === "Home") {
        $.preventDefault(), ee(un(D));
        return;
      }
      if ($.key === "End") {
        $.preventDefault(), ee(Lt(D, 0, "prev", !0));
        return;
      }
      if ($.key === "ArrowDown") {
        $.preventDefault(), ee(Lt(D, P, "next", !0));
        return;
      }
      $.key === "ArrowUp" && ($.preventDefault(), ee(Lt(D, P, "prev", !0)));
    }
  };
  return i.createElement(
    "div",
    {
      ...y("virtual-list", "root", A),
      ...I,
      ref: o,
      "aria-disabled": b ? "true" : void 0
    },
    i.createElement(
      "div",
      {
        ...y("virtual-list", "viewport", A),
        role: "list",
        "aria-label": p,
        tabIndex: 0,
        style: {
          maxHeight: `${Q}px`,
          overflowY: "auto"
        },
        onScroll: ($) => {
          R($.target.scrollTop);
        },
        onKeyDown: j
      },
      i.createElement(
        "div",
        {
          ...y("virtual-list", "content", A),
          style: {
            height: `${H}px`,
            paddingTop: `${W.paddingStart}px`,
            paddingBottom: `${W.paddingEnd}px`,
            boxSizing: "border-box"
          }
        },
        q.map(
          ({ item: $, index: U }) => i.createElement(
            "div",
            {
              ...y("virtual-list", "item", A),
              key: `${$.value}-${U}`,
              role: "listitem",
              "aria-disabled": $.disabled ? "true" : void 0,
              "data-active": String(U === P),
              "data-index": String(U),
              style: {
                minHeight: `${F}px`
              },
              onMouseDown: () => ee(U)
            },
            typeof w == "function" ? w($, U) : $.label || $.value
          )
        )
      )
    ),
    S ? i.createElement(
      "span",
      {
        ...y("virtual-list", "status", A),
        ...Re({ live: "assertive" })
      },
      S.message
    ) : null
  );
});
ob.displayName = "ChipsVirtualList";
const [lb, Oo] = $n("data-grid");
function ib(r) {
  return r["aria-label"] || r["aria-labelledby"] ? r : {
    ...r,
    "aria-label": r.ariaLabel
  };
}
function gm(r) {
  const o = [];
  return i.Children.forEach(r, (l) => {
    if (i.isValidElement(l) && l.type === i.Fragment) {
      o.push(...gm(l.props.children));
      return;
    }
    l != null && l !== !1 && o.push(l);
  }), o;
}
function sb(r) {
  return r === "desc" ? "descending" : r === "asc" ? "ascending" : "none";
}
const xu = i.forwardRef((r, o) => {
  const {
    children: l,
    columns: u = [],
    rows: d = [],
    sort: f,
    defaultSort: p = null,
    selectedRowIds: m,
    defaultSelectedRowIds: g = [],
    disabled: v = !1,
    loading: E = !1,
    error: C = null,
    ariaLabel: w,
    onSortChange: N,
    onSelectedRowIdsChange: k,
    onStateChange: S,
    ...b
  } = r, _ = _e(C), I = v || E, { interaction: D, handlers: x } = Oe(I), [R, P] = Je({
    value: f,
    defaultValue: p,
    onChange: N
  }), [O, A] = Je({
    value: m,
    defaultValue: g,
    onChange: k
  }), [Q, F] = i.useState(0), W = i.useMemo(
    () => (Array.isArray(u) ? u : []).filter((Y) => Y && typeof Y.key == "string").map((Y) => ({
      key: Y.key,
      label: typeof Y.label == "string" ? Y.label : Y.key,
      sortable: Y.sortable !== !1
    })),
    [u]
  ), q = i.useMemo(
    () => (Array.isArray(d) ? d : []).map((Y, ae) => ({
      ...Y && typeof Y == "object" ? Y : {},
      __rowId: Y && (typeof Y.id == "string" || typeof Y.id == "number") ? String(Y.id) : String(ae)
    })),
    [d]
  ), H = i.useMemo(
    () => av(q, R),
    [q, R]
  );
  i.useEffect(() => {
    Q >= H.length && F(Math.max(0, H.length - 1));
  }, [Q, H.length]);
  const ee = i.useMemo(
    () => new Set((Array.isArray(O) ? O : []).map((Y) => String(Y))),
    [O]
  ), j = Ne({
    disabled: I,
    loading: E,
    error: _,
    interaction: D
  });
  i.useEffect(() => {
    typeof S == "function" && S(j);
  }, [j, S]);
  const $ = ib(b), U = (Y) => {
    if (!I) {
      if (!R || R.key !== Y) {
        P({ key: Y, direction: "asc" });
        return;
      }
      P({
        key: Y,
        direction: R.direction === "asc" ? "desc" : "asc"
      });
    }
  }, V = (Y) => {
    if (I)
      return;
    const ae = String(Y), de = new Set(ee);
    de.has(ae) ? de.delete(ae) : de.add(ae), A([...de]);
  }, Z = (Y) => {
    if (!(I || H.length === 0)) {
      if (Y.key === "Home") {
        Y.preventDefault(), F(0);
        return;
      }
      if (Y.key === "End") {
        Y.preventDefault(), F(H.length - 1);
        return;
      }
      if (Y.key === "ArrowDown") {
        Y.preventDefault(), F((ae) => Math.min(H.length - 1, ae + 1));
        return;
      }
      if (Y.key === "ArrowUp") {
        Y.preventDefault(), F((ae) => Math.max(0, ae - 1));
        return;
      }
      if (Ut(Y.key)) {
        Y.preventDefault();
        const ae = H[Q];
        ae && V(ae.__rowId);
      }
    }
  }, K = (Y) => i.createElement(
    ti,
    {
      as: "th",
      key: Y.key,
      header: !0,
      columnKey: Y.key,
      sortable: Y.sortable,
      sortDirection: R && R.key === Y.key ? R.direction : null,
      onClick: Y.sortable ? () => U(Y.key) : void 0
    },
    Y.label
  ), L = (Y, ae) => {
    const de = ee.has(Y.__rowId), ie = ae === Q;
    return i.createElement(
      yc,
      {
        as: "tr",
        key: Y.__rowId,
        rowId: Y.__rowId,
        selected: de,
        active: ie,
        onMouseDown: () => F(ae),
        onClick: () => V(Y.__rowId)
      },
      W.map(
        (ge) => i.createElement(
          ti,
          {
            as: "td",
            key: `${Y.__rowId}-${ge.key}`,
            columnKey: ge.key
          },
          Y[ge.key]
        )
      )
    );
  }, M = i.useMemo(
    () => ({
      state: j,
      disabled: I,
      loading: E,
      error: _
    }),
    [j, I, E, _]
  ), ne = l != null, te = (Y) => i.createElement(
    "div",
    {
      role: "grid",
      tabIndex: 0,
      "aria-label": $["aria-label"] || w,
      "aria-labelledby": $["aria-labelledby"],
      "aria-disabled": I ? "true" : void 0,
      onKeyDown: Z
    },
    Y
  ), ce = () => {
    const Y = [], ae = [], de = [];
    for (const ie of gm(l)) {
      if (i.isValidElement(ie) && ie.type === mc) {
        Y.push(ie);
        continue;
      }
      if (i.isValidElement(ie) && ie.type === gc) {
        de.push(ie);
        continue;
      }
      ae.push(ie);
    }
    return [
      ...Y,
      ae.length > 0 ? te(ae) : null,
      ...de
    ];
  };
  return i.createElement(
    lb.Provider,
    { value: M },
    i.createElement(
      "div",
      {
        ...b,
        ...y("data-grid", "root", j),
        ...x,
        ref: o,
        role: b.role || "group",
        "aria-label": b["aria-label"] || w,
        "aria-labelledby": b["aria-labelledby"],
        "aria-disabled": I ? "true" : void 0
      },
      ne ? ce() : i.createElement(
        "table",
        {
          role: "grid",
          tabIndex: 0,
          "aria-label": $["aria-label"] || w,
          "aria-labelledby": $["aria-labelledby"],
          "aria-disabled": I ? "true" : void 0,
          onKeyDown: Z
        },
        i.createElement(
          "thead",
          null,
          i.createElement(hc, { as: "tr" }, W.map(K))
        ),
        i.createElement("tbody", null, H.map(L))
      ),
      _ ? i.createElement(
        "span",
        {
          ...y("data-grid", "status", j),
          ...Re({ live: "assertive" })
        },
        _.message
      ) : null
    )
  );
});
xu.displayName = "ChipsDataGrid.Root";
const mc = i.forwardRef((r, o) => {
  const { children: l, ariaLabel: u, ...d } = r, f = Oo("toolbar");
  return i.createElement(
    "div",
    {
      ...d,
      ...y("data-grid", "toolbar", f.state),
      ref: o,
      role: d.role || "toolbar",
      "aria-label": d["aria-label"] || u,
      "aria-labelledby": d["aria-labelledby"]
    },
    l
  );
});
mc.displayName = "ChipsDataGrid.Toolbar";
const hc = i.forwardRef((r, o) => {
  const { children: l, as: u = "div", ...d } = r, f = Oo("header");
  return i.createElement(
    u,
    {
      ...d,
      ...y("data-grid", "header", f.state),
      ref: o,
      role: d.role || "row"
    },
    l
  );
});
hc.displayName = "ChipsDataGrid.Header";
const yc = i.forwardRef((r, o) => {
  const { children: l, rowId: u, selected: d = !1, active: f = !1, as: p = "div", ...m } = r, g = Oo("row");
  return i.createElement(
    p,
    {
      ...m,
      ...y("data-grid", "row", g.state),
      ref: o,
      role: m.role || "row",
      "aria-selected": m["aria-selected"] ?? String(d === !0),
      "data-row-id": u,
      "data-selected": String(d === !0),
      "data-active": String(f === !0)
    },
    l
  );
});
yc.displayName = "ChipsDataGrid.Row";
const ti = i.forwardRef((r, o) => {
  const {
    children: l,
    columnKey: u,
    header: d = !1,
    sortable: f = !1,
    sortDirection: p = null,
    as: m = "div",
    ...g
  } = r, v = Oo("cell"), E = d ? sb(p) : void 0;
  return i.createElement(
    m,
    {
      ...g,
      ...y("data-grid", "cell", v.state),
      ref: o,
      role: g.role || (d ? "columnheader" : "gridcell"),
      "aria-sort": g["aria-sort"] || E,
      "data-column-key": u,
      "data-header": String(d === !0),
      "data-sort": E,
      "data-sortable": d ? String(f === !0) : void 0
    },
    l
  );
});
ti.displayName = "ChipsDataGrid.Cell";
const gc = i.forwardRef((r, o) => {
  const { children: l, page: u, pageCount: d, ariaLabel: f, ...p } = r, m = Oo("pagination");
  return i.createElement(
    "nav",
    {
      ...p,
      ...y("data-grid", "pagination", m.state),
      ref: o,
      role: p.role || "navigation",
      "aria-label": p["aria-label"] || f,
      "aria-labelledby": p["aria-labelledby"],
      "data-page": u === void 0 ? void 0 : String(u),
      "data-page-count": d === void 0 ? void 0 : String(d)
    },
    l
  );
});
gc.displayName = "ChipsDataGrid.Pagination";
const ub = Object.assign(xu, {
  Root: xu,
  Toolbar: mc,
  Header: hc,
  Row: yc,
  Cell: ti,
  Pagination: gc
});
ub.displayName = "ChipsDataGrid";
const [cb, vc] = $n("tree"), Va = i.createContext(null);
Va.displayName = "tree-compound-item-context";
function db(r) {
  const o = i.useContext(Va);
  if (!o)
    throw new Error(`TREE_COMPOUND_ITEM_CONTEXT_MISSING:${r}`);
  return o;
}
function fb(r) {
  return [...r].sort((o, l) => {
    const u = o.ref?.current, d = l.ref?.current;
    if (u && d && u !== d && typeof u.compareDocumentPosition == "function") {
      const f = u.compareDocumentPosition(d);
      if ((f & 4) !== 0)
        return -1;
      if ((f & 2) !== 0)
        return 1;
    }
    return o.order - l.order;
  });
}
function ou(r) {
  const o = un(r);
  return o >= 0 ? r[o] : null;
}
function vm(r, o = 0, l = null) {
  const u = (Array.isArray(r) ? r : []).filter((f) => f && typeof f == "object"), d = u.length;
  return u.map((f, p) => {
    const m = String(f.id), g = Array.isArray(f.children) ? f.children : [], v = f.label !== void 0 && f.label !== null ? f.label : m, E = {
      key: m,
      id: m,
      label: v,
      disabled: f.disabled === !0,
      level: o + 1,
      parentId: l,
      posInSet: p + 1,
      setSize: d
    };
    return g.length > 0 ? i.createElement(
      Ec,
      E,
      vm(g, o + 1, m)
    ) : i.createElement(Sc, E);
  });
}
const Iu = i.forwardRef((r, o) => {
  const {
    children: l,
    nodes: u = [],
    expandedIds: d,
    defaultExpandedIds: f = [],
    selectedId: p,
    defaultSelectedId: m = null,
    disabled: g = !1,
    loading: v = !1,
    error: E = null,
    ariaLabel: C,
    expandIconContent: w,
    collapseIconContent: N,
    onExpandedIdsChange: k,
    onSelectedIdChange: S,
    onStateChange: b,
    ..._
  } = r, I = _e(E), D = g || v, { interaction: x, handlers: R } = Oe(D), P = i.useRef(null), O = i.useRef(/* @__PURE__ */ new Map()), A = i.useRef(0), [Q, F] = i.useState(0), [W, q] = Je({
    value: d,
    defaultValue: f,
    onChange: k
  }), [H, ee] = Je({
    value: p,
    defaultValue: m,
    onChange: S
  }), j = Array.isArray(u) && u.length > 0, $ = l != null, U = $ ? l : vm(u), V = i.useMemo(
    () => $ ? [] : ov(u, W),
    [$, u, W]
  ), Z = i.useMemo(
    () => fb([...O.current.values()]),
    [Q]
  ), K = j && !$ ? V : Z, [L, M] = i.useState(
    () => H || K[0]?.id || null
  ), ne = Ne({
    disabled: D,
    loading: v,
    error: I,
    interaction: x
  });
  i.useEffect(() => {
    typeof b == "function" && b(ne);
  }, [ne, b]);
  const te = i.useMemo(
    () => new Set((Array.isArray(W) ? W : []).map((se) => String(se))),
    [W]
  ), ce = i.useCallback((se) => {
    const re = String(se.id), ye = O.current.get(re), De = ye?.order ?? A.current;
    return ye || (A.current += 1), O.current.set(re, {
      ...se,
      id: re,
      order: De
    }), F((Ue) => Ue + 1), () => {
      O.current.delete(re), F((Ue) => Ue + 1);
    };
  }, []), Y = i.useCallback((se, re) => {
    const ye = String(se), De = new Set(te);
    re ? De.add(ye) : De.delete(ye), q([...De]);
  }, [te, q]), ae = i.useCallback((se) => {
    const re = K.find((ye) => ye.id === String(se));
    !re || re.disabled || D || (ee(re.id), M(re.id));
  }, [D, ee, K]);
  i.useEffect(() => {
    if (K.length === 0) {
      M(null);
      return;
    }
    const se = L || H;
    K.some((ye) => ye.id === se && ye.disabled !== !0) || M(ou(K)?.id ?? null);
  }, [L, H, K]), i.useEffect(() => {
    if (!L || !P.current || typeof document > "u")
      return;
    const se = P.current, re = document.activeElement, ye = O.current.get(L);
    !ye?.ref?.current || !re || !se.contains(re) || re !== ye.ref.current && ye.ref.current.focus();
  }, [L, Q]);
  const de = i.useCallback((se) => {
    const re = K.findIndex((De) => De.id === L), ye = Lt(K, re, se, !0);
    ye >= 0 && K[ye] && M(K[ye].id);
  }, [L, K]), ie = i.useCallback((se) => {
    if (D || K.length === 0)
      return;
    const re = K.findIndex((De) => De.id === L), ye = re >= 0 ? K[re] : ou(K);
    if (ye) {
      if (se.key === "ArrowDown") {
        se.preventDefault(), de("next");
        return;
      }
      if (se.key === "ArrowUp") {
        se.preventDefault(), de("prev");
        return;
      }
      if (se.key === "Home") {
        se.preventDefault(), M(ou(K)?.id ?? null);
        return;
      }
      if (se.key === "End") {
        se.preventDefault();
        const De = Lt(K, 0, "prev", !0);
        De >= 0 && M(K[De].id);
        return;
      }
      if (se.key === "ArrowRight" && ye.hasChildren) {
        se.preventDefault(), te.has(ye.id) ? K[re + 1] && M(K[re + 1].id) : Y(ye.id, !0);
        return;
      }
      if (se.key === "ArrowLeft") {
        if (se.preventDefault(), ye.hasChildren && te.has(ye.id)) {
          Y(ye.id, !1);
          return;
        }
        ye.parentId && M(ye.parentId);
        return;
      }
      Ut(se.key) && (se.preventDefault(), ae(ye.id));
    }
  }, [L, D, te, de, ae, Y, K]), ge = i.useMemo(
    () => ({
      state: ne,
      disabled: D,
      selectedId: H == null ? null : String(H),
      activeId: L,
      expandedSet: te,
      registerItem: ce,
      setActiveId: M,
      selectItem: ae,
      updateExpanded: Y,
      expandIconContent: w,
      collapseIconContent: N
    }),
    [
      L,
      N,
      H,
      D,
      w,
      te,
      ce,
      ae,
      ne,
      Y
    ]
  );
  return i.createElement(
    cb.Provider,
    { value: ge },
    i.createElement(
      "div",
      {
        ..._,
        ...y("tree", "root", ne),
        ref: ra(o, P),
        role: "tree",
        tabIndex: K.length === 0 ? 0 : void 0,
        "aria-label": _["aria-label"] || C,
        "aria-labelledby": _["aria-labelledby"],
        "aria-disabled": D ? "true" : void 0,
        onPointerEnter: tt(_.onPointerEnter, R.onPointerEnter),
        onPointerLeave: tt(_.onPointerLeave, R.onPointerLeave),
        onFocus: tt(_.onFocus, R.onFocus),
        onBlur: tt(_.onBlur, R.onBlur),
        onMouseDown: tt(_.onMouseDown, R.onMouseDown),
        onMouseUp: tt(_.onMouseUp, R.onMouseUp),
        onKeyDown: tt(_.onKeyDown, ie)
      },
      U,
      I ? i.createElement(
        "span",
        {
          ...y("tree", "status", ne),
          ...Re({ live: "assertive" })
        },
        I.message
      ) : null
    )
  );
});
Iu.displayName = "ChipsTree.Root";
const bc = i.forwardRef((r, o) => {
  const {
    as: l = "div",
    children: u,
    id: d,
    label: f,
    textValue: p,
    disabled: m = !1,
    level: g,
    parentId: v,
    posInSet: E,
    setSize: C,
    part: w = "item",
    hasChildren: N = !1,
    controlsId: k,
    onClick: S,
    onMouseDown: b,
    style: _,
    ...I
  } = r, D = vc(w), x = i.useContext(Va), R = i.useId(), P = String(d ?? I.id ?? R), O = typeof g == "number" ? g : (x?.level ?? 0) + 1, A = v === void 0 ? x?.id ?? null : v, Q = m || D.disabled, F = D.expandedSet.has(P), W = D.selectedId === P, q = D.activeId === P, H = u ?? f, ee = Qe(p) ? p.trim() : Vu(H, P), j = i.useRef(null), $ = w === "branch" || w === "leaf" || w === "item" ? w : lv({ part: w, hasChildren: N }), U = Bu(D.state, { disabled: Q }), V = {
    ..._,
    "--chips-tree-level": String(Math.max(1, O))
  };
  i.useEffect(
    () => D.registerItem({
      id: P,
      parentId: A,
      disabled: Q,
      hasChildren: N,
      expanded: F,
      level: O,
      setSize: C,
      posInSet: E,
      part: $,
      labelText: ee,
      ref: j
    }),
    [
      Q,
      F,
      N,
      P,
      O,
      A,
      $,
      ee,
      E,
      C,
      D.registerItem
    ]
  );
  const Z = i.useMemo(
    () => ({
      id: P,
      level: O,
      parentId: A,
      disabled: Q,
      hasChildren: N,
      expanded: F,
      labelText: ee,
      state: U
    }),
    [Q, F, N, P, O, A, U, ee]
  );
  return i.createElement(
    Va.Provider,
    { value: Z },
    i.createElement(
      l,
      {
        ...I,
        ...y("tree", $, U),
        ref: ra(o, j),
        id: I.id || P,
        role: "treeitem",
        tabIndex: q && !Q ? 0 : -1,
        "aria-level": O,
        "aria-setsize": C,
        "aria-posinset": E,
        "aria-expanded": N ? String(F) : void 0,
        "aria-selected": String(W),
        "aria-disabled": Q ? "true" : void 0,
        "aria-controls": N && k ? k : void 0,
        "data-active": String(q),
        "data-selected": String(W),
        "data-expanded": N ? String(F) : void 0,
        "data-level": String(O),
        style: V,
        onMouseDown: tt(b, () => {
          Q || D.setActiveId(P);
        }),
        onClick: tt(S, () => D.selectItem(P))
      },
      i.createElement(
        "span",
        y("tree", "label", U),
        H
      )
    )
  );
});
bc.displayName = "ChipsTree.ItemBase";
const bm = i.forwardRef(
  (r, o) => i.createElement(bc, {
    ...r,
    ref: o,
    part: "item",
    hasChildren: !1
  })
);
bm.displayName = "ChipsTree.Item";
const Do = i.forwardRef((r, o) => {
  const { children: l, onClick: u, ...d } = r, f = vc("disclosure"), p = db("disclosure"), m = f.expandedSet.has(p.id), g = p.disabled || f.disabled, v = Bu(f.state, { disabled: g });
  return i.createElement(
    "button",
    {
      ...d,
      ...y("tree", "disclosure", v),
      ref: o,
      type: "button",
      tabIndex: -1,
      disabled: g,
      "aria-label": d["aria-label"] || p.labelText,
      "aria-expanded": String(m),
      "aria-controls": d["aria-controls"],
      "data-expanded": String(m),
      onClick: tt(u, (E) => {
        E.stopPropagation(), f.updateExpanded(p.id, !m);
      })
    },
    l !== void 0 ? l : m ? it(f.collapseIconContent, "collapse") : it(f.expandIconContent, "expand")
  );
});
Do.displayName = "ChipsTree.Disclosure";
const Ec = i.forwardRef((r, o) => {
  const {
    children: l,
    id: u,
    label: d,
    textValue: f,
    groupId: p,
    as: m = "div",
    disabled: g = !1,
    level: v,
    parentId: E,
    posInSet: C,
    setSize: w,
    onClick: N,
    onMouseDown: k,
    style: S,
    ...b
  } = r, _ = vc("branch"), I = i.useContext(Va), D = i.useId(), x = String(u ?? b.id ?? D), R = typeof v == "number" ? v : (I?.level ?? 0) + 1, P = E === void 0 ? I?.id ?? null : E, O = Or(x, "branch"), A = p || `${O}-group`, Q = _.expandedSet.has(x), F = _.selectedId === x, W = _.activeId === x, q = i.Children.toArray(l), H = q.find((L) => i.isValidElement(L) && L.type === Do), ee = q.filter((L) => !(i.isValidElement(L) && L.type === Do)), j = d ?? x, $ = Qe(f) ? f.trim() : Vu(j, x), U = g || _.disabled, V = Bu(_.state, { disabled: U }), Z = i.useRef(null), K = {
    ...S,
    "--chips-tree-level": String(Math.max(1, R))
  };
  return i.useEffect(
    () => _.registerItem({
      id: x,
      parentId: P,
      disabled: U,
      hasChildren: !0,
      expanded: Q,
      level: R,
      setSize: w,
      posInSet: C,
      part: "branch",
      labelText: $,
      ref: Z
    }),
    [
      U,
      Q,
      x,
      R,
      P,
      $,
      C,
      w,
      _.registerItem
    ]
  ), i.createElement(
    Va.Provider,
    {
      value: {
        id: x,
        level: R,
        parentId: P,
        disabled: U,
        hasChildren: !0,
        expanded: Q,
        labelText: $,
        state: V
      }
    },
    i.createElement(
      m,
      {
        ...b,
        ...y("tree", "branch", V),
        ref: ra(o, Z),
        id: b.id || x,
        role: "treeitem",
        tabIndex: W && !U ? 0 : -1,
        "aria-level": R,
        "aria-setsize": w,
        "aria-posinset": C,
        "aria-expanded": String(Q),
        "aria-selected": String(F),
        "aria-disabled": U ? "true" : void 0,
        "aria-controls": A,
        "data-active": String(W),
        "data-selected": String(F),
        "data-expanded": String(Q),
        "data-level": String(R),
        style: K,
        onMouseDown: tt(k, () => {
          U || _.setActiveId(x);
        }),
        onClick: tt(N, () => _.selectItem(x))
      },
      i.createElement(
        "span",
        y("tree", "label", V),
        H || i.createElement(Do, {
          "aria-controls": A
        }),
        j
      ),
      Q && ee.length > 0 ? i.createElement(
        "div",
        {
          ...y("tree", "group", V),
          id: A,
          role: "group",
          "data-level": String(R + 1)
        },
        ee
      ) : null
    )
  );
});
Ec.displayName = "ChipsTree.Branch";
const Sc = i.forwardRef((r, o) => {
  const { children: l, label: u, textValue: d, ...f } = r;
  return i.createElement(bc, {
    ...f,
    ref: o,
    label: u ?? l,
    textValue: d,
    part: "leaf",
    hasChildren: !1
  });
});
Sc.displayName = "ChipsTree.Leaf";
const pb = Object.assign(Iu, {
  Root: Iu,
  Item: bm,
  Branch: Ec,
  Leaf: Sc,
  Disclosure: Do
});
pb.displayName = "ChipsTree";
const mb = i.forwardRef((r, o) => {
  const {
    id: l,
    label: u,
    ariaLabel: d,
    value: f,
    defaultValue: p = "",
    min: m,
    max: g,
    step: v,
    disabled: E = !1,
    loading: C = !1,
    error: w = null,
    readOnly: N = !1,
    iconContent: k,
    onValueChange: S,
    onStateChange: b
  } = r, _ = _e(w), I = E || C, { interaction: D, handlers: x } = Oe(I), [R, P] = Je({
    value: f,
    defaultValue: p,
    onChange: S
  }), O = Ne({
    disabled: I,
    loading: C,
    error: _,
    interaction: D
  });
  i.useEffect(() => {
    typeof b == "function" && b(O);
  }, [O, b]);
  const A = l || i.useId();
  return i.createElement(
    "div",
    {
      ...y("date-time", "root", O),
      ...x,
      ref: o,
      "aria-disabled": I ? "true" : void 0
    },
    u ? i.createElement(
      "label",
      {
        ...y("date-time", "icon", O),
        htmlFor: A
      },
      u
    ) : null,
    i.createElement("input", {
      ...y("date-time", "input", O),
      id: A,
      type: "datetime-local",
      value: R,
      min: m,
      max: g,
      step: v,
      disabled: I,
      readOnly: N,
      "aria-label": d,
      "aria-invalid": _ ? "true" : void 0,
      onFocus: x.onFocus,
      onBlur: x.onBlur,
      onChange: (Q) => P(Q.target.value)
    }),
    i.createElement(
      "span",
      {
        ...y("date-time", "icon", O),
        "aria-hidden": "true"
      },
      it(k, "calendar")
    ),
    _ ? i.createElement(
      "span",
      {
        ...y("date-time", "status", O),
        ...Re({ live: "assertive" })
      },
      _.message
    ) : null
  );
});
mb.displayName = "ChipsDateTime";
const [hb, pi] = $n("command-palette"), yb = Object.freeze({});
function gb(r) {
  return (Array.isArray(r) ? r : []).filter((o) => o && typeof o == "object").map((o, l) => ({
    ...o,
    id: typeof o.id == "string" || typeof o.id == "number" ? String(o.id) : String(l),
    disabled: o.disabled === !0
  }));
}
function Em(r) {
  return r?.label !== void 0 && r.label !== null ? r.label : r?.title !== void 0 && r.title !== null ? r.title : r?.id ?? r?.commandId ?? "";
}
function vb(r) {
  const o = Em(r);
  return typeof o == "string" || typeof o == "number" ? String(o) : typeof r?.commandId == "string" ? r.commandId : String(r?.id ?? "");
}
function bb(r) {
  return [...r].sort((o, l) => {
    const u = o.ref?.current, d = l.ref?.current;
    if (u && d && u !== d && typeof u.compareDocumentPosition == "function") {
      const f = u.compareDocumentPosition(d);
      if ((f & 4) !== 0)
        return -1;
      if ((f & 2) !== 0)
        return 1;
    }
    return o.order - l.order;
  });
}
function lu(r) {
  const o = un(r);
  return o >= 0 ? r[o]?.id ?? null : null;
}
function Eb(r) {
  return r.map(
    (o) => i.createElement(kc, {
      key: o.id,
      item: o,
      id: o.id,
      disabled: o.disabled
    })
  );
}
const Du = i.forwardRef((r, o) => {
  const l = Ua(), {
    children: u,
    open: d,
    defaultOpen: f = !0,
    query: p,
    defaultQuery: m = "",
    items: g = [],
    commands: v = l?.commands,
    adapter: E,
    i18n: C = l?.i18n,
    commandQuery: w,
    payload: N,
    invocationContext: k,
    disabled: S = !1,
    loading: b = !1,
    error: _ = null,
    inputPlaceholder: I = "",
    ariaLabel: D,
    listId: x,
    role: R,
    onOpenChange: P,
    onQueryChange: O,
    onSelect: A,
    onStateChange: Q,
    ...F
  } = r, { commands: W, loading: q, error: H } = li({
    adapter: or({ adapter: E }, l),
    commands: v,
    query: {
      source: "palette",
      ...w
    }
  }), ee = or({ adapter: E }, l), $ = Array.isArray(v) || !!ee ? ev(W, { i18n: C }) : g, U = _e(_ || H), V = S || b || q, { interaction: Z, handlers: K } = Oe(V), L = i.useRef(/* @__PURE__ */ new Map()), M = i.useRef(0), [ne, te] = i.useState(0), [ce, Y] = Je({
    value: d,
    defaultValue: f === !0,
    onChange: P
  }), [ae, de] = Je({
    value: p,
    defaultValue: m,
    onChange: O
  }), ie = i.useMemo(
    () => gb(iv($, ae)),
    [$, ae]
  ), ge = u != null, se = i.useMemo(
    () => bb([...L.current.values()]),
    [ne]
  ), re = ge ? se : ie, [ye, De] = i.useState(
    () => lu(re)
  );
  i.useEffect(() => {
    re.some((Xe) => Xe.id === ye && Xe.disabled !== !0) || De(lu(re));
  }, [re, ye]);
  const Ue = Ne({
    disabled: V,
    loading: b || q,
    error: U,
    interaction: Z
  });
  i.useEffect(() => {
    typeof Q == "function" && Q(Ue);
  }, [Ue, Q]);
  const Ce = i.useId(), Ae = x || `${Ce}-list`, me = re.find((ke) => ke.id === ye) || null, ue = me ? me.elementId || `${Ae}-item-${Or(me.id)}` : void 0, Me = i.useCallback((ke) => {
    const Xe = String(ke.id), St = L.current.get(Xe), Mt = St?.order ?? M.current;
    return St || (M.current += 1), L.current.set(Xe, {
      ...ke,
      id: Xe,
      order: Mt
    }), te((Kt) => Kt + 1), () => {
      L.current.delete(Xe), te((Kt) => Kt + 1);
    };
  }, []), Ke = i.useCallback((ke) => {
    !ke || ke.disabled || V || (typeof A == "function" && A(ke), ke.command && !ke.disabled && di(ee, ke.command, "palette", N, k), Y(!1));
  }, [ee, V, k, A, N, Y]), $e = i.useCallback((ke) => {
    const Xe = re.find((St) => St.id === String(ke));
    Ke(Xe);
  }, [re, Ke]), Ye = i.useCallback((ke) => {
    const Xe = re[ke];
    De(Xe?.id ?? null);
  }, [re]), st = i.useCallback((ke) => {
    const Xe = re.findIndex((Mt) => Mt.id === ye), St = Lt(re, Xe, ke, !0);
    Ye(St);
  }, [re, ye, Ye]), mt = i.useCallback((ke) => {
    if (!(!ce || re.length === 0)) {
      if (ke.key === "Escape") {
        ke.preventDefault(), Y(!1);
        return;
      }
      if (ke.key === "ArrowDown") {
        ke.preventDefault(), st("next");
        return;
      }
      if (ke.key === "ArrowUp") {
        ke.preventDefault(), st("prev");
        return;
      }
      if (ke.key === "Home") {
        ke.preventDefault(), De(lu(re));
        return;
      }
      if (ke.key === "End") {
        ke.preventDefault();
        const Xe = Lt(re, 0, "prev", !0);
        Ye(Xe);
        return;
      }
      Ut(ke.key) && (ke.preventDefault(), Ke(me));
    }
  }, [
    re,
    ce,
    me,
    st,
    Ke,
    Y,
    Ye
  ]), bt = i.useMemo(
    () => ({
      state: Ue,
      open: !!ce,
      disabled: V,
      query: ae,
      listId: Ae,
      activeDescendantId: ue,
      highlightedId: ye,
      setOpen: Y,
      setQuery: de,
      setHighlightedId: De,
      registerItem: Me,
      selectItem: Ke,
      selectItemById: $e,
      handleInputKeyDown: mt,
      ariaLabel: D,
      inputPlaceholder: I
    }),
    [
      ue,
      D,
      ce,
      ae,
      V,
      ye,
      mt,
      I,
      Ae,
      Me,
      Ke,
      $e,
      Y,
      de,
      Ue
    ]
  ), ht = ge ? u : i.createElement(
    i.Fragment,
    null,
    i.createElement(Cc, {
      placeholder: I,
      "aria-label": D
    }),
    i.createElement(
      wc,
      null,
      Eb(ie)
    )
  );
  return i.createElement(
    hb.Provider,
    { value: bt },
    i.createElement(
      "div",
      {
        ...F,
        ...y("command-palette", "root", Ue),
        ...K,
        ref: o,
        role: R || "group",
        "aria-label": F["aria-label"] || D,
        "data-open": String(!!ce),
        "aria-disabled": V ? "true" : void 0
      },
      ce ? ht : null,
      U ? i.createElement(
        "span",
        {
          ...y("command-palette", "status", Ue),
          ...Re({ live: "assertive" })
        },
        U.message
      ) : null
    )
  );
});
Du.displayName = "ChipsCommandPalette.Root";
const Cc = i.forwardRef((r, o) => {
  const { onChange: l, onKeyDown: u, placeholder: d, ...f } = r, p = pi("input");
  return i.createElement("input", {
    ...f,
    ...y("command-palette", "input", p.state),
    ref: o,
    role: "combobox",
    value: p.query,
    placeholder: d ?? p.inputPlaceholder,
    "aria-label": f["aria-label"] || p.ariaLabel,
    "aria-controls": f["aria-controls"] || p.listId,
    "aria-expanded": String(p.open),
    "aria-activedescendant": p.activeDescendantId,
    disabled: p.disabled || f.disabled === !0,
    onChange: tt(l, (m) => p.setQuery(m.target.value)),
    onKeyDown: tt(u, p.handleInputKeyDown)
  });
});
Cc.displayName = "ChipsCommandPalette.Input";
const wc = i.forwardRef((r, o) => {
  const { children: l, ...u } = r, d = pi("list");
  return i.createElement(
    "ul",
    {
      ...u,
      ...y("command-palette", "list", d.state),
      ref: o,
      id: u.id || d.listId,
      role: u.role || "listbox"
    },
    l
  );
});
wc.displayName = "ChipsCommandPalette.List";
const Sm = i.forwardRef((r, o) => {
  const { children: l, label: u, labelId: d, ...f } = r, p = pi("group"), m = i.useId(), g = d || (u !== void 0 ? `${f.id || m}-label` : void 0);
  return i.createElement(
    "li",
    {
      ...f,
      ...y("command-palette", "group", p.state),
      ref: o,
      role: f.role || "group",
      "aria-labelledby": f["aria-labelledby"] || g
    },
    u !== void 0 ? i.createElement(
      "div",
      {
        ...y("command-palette", "group-label", p.state),
        id: g
      },
      u
    ) : null,
    i.createElement("ul", { role: "presentation" }, l)
  );
});
Sm.displayName = "ChipsCommandPalette.Group";
const kc = i.forwardRef((r, o) => {
  const {
    children: l,
    item: u,
    id: d,
    label: f,
    shortcut: p,
    disabled: m = !1,
    textValue: g,
    onMouseEnter: v,
    onMouseDown: E,
    ...C
  } = r, w = pi("item"), N = i.useId(), k = u && typeof u == "object" ? u : yb, S = String(d ?? k.id ?? N), b = C.id || `${w.listId}-item-${Or(S)}`, _ = w.disabled || m || k.disabled === !0, I = w.highlightedId === S, D = _ ? "disabled" : I ? "active" : w.state === "disabled" || w.state === "loading" || w.state === "error" ? w.state : "idle", x = l ?? f ?? Em(k), R = p ?? k.shortcut, P = i.useMemo(
    () => ({
      ...k,
      id: S,
      label: x,
      shortcut: R,
      disabled: _
    }),
    [_, S, x, k, R]
  ), O = i.useRef(null);
  return i.useEffect(
    () => w.registerItem({
      ...P,
      id: S,
      elementId: b,
      textValue: g || vb(P),
      ref: O
    }),
    [w.registerItem, b, S, P, g]
  ), i.createElement(
    "li",
    {
      ...C,
      ...y("command-palette", "item", D),
      ref: ra(o, O),
      id: b,
      role: C.role || "option",
      "aria-selected": String(I),
      "aria-disabled": _ ? "true" : void 0,
      "data-highlighted": String(I),
      onMouseEnter: tt(v, () => {
        _ || w.setHighlightedId(S);
      }),
      onMouseDown: tt(E, (A) => {
        A.preventDefault(), w.selectItem(P);
      })
    },
    x,
    R ? i.createElement(
      "span",
      y("command-palette", "shortcut", D),
      R
    ) : null
  );
});
kc.displayName = "ChipsCommandPalette.Item";
const Sb = Object.assign(Du, {
  Root: Du,
  Input: Cc,
  List: wc,
  Item: kc,
  Group: Sm
});
Sb.displayName = "ChipsCommandPalette";
const [Cb, wb] = $n("navigation-split-view");
function kb(r) {
  return i.isValidElement(r) ? r.type === Ic ? "sidebar" : r.type === Dc ? "content" : r.type === _c ? "detail" : null : null;
}
function xb(r, o) {
  return i.createElement("div", {
    key: o,
    ...y("navigation-split-view", "divider", r),
    "aria-hidden": "true"
  });
}
function Cm(r) {
  const o = [];
  return i.Children.forEach(r, (l) => {
    if (i.isValidElement(l) && l.type === i.Fragment) {
      o.push(...Cm(l.props.children));
      return;
    }
    o.push(l);
  }), o;
}
function Ib(r, o) {
  const l = Cm(r), u = [];
  let d = null;
  for (const f of l) {
    const p = kb(f);
    d && p && d !== p && u.push(xb(o, `divider-${d}-${p}-${u.length}`)), u.push(f), p && (d = p);
  }
  return u;
}
const _u = i.forwardRef((r, o) => {
  const {
    children: l,
    disabled: u = !1,
    loading: d = !1,
    error: f = null,
    active: p = !1,
    ariaLabel: m,
    ariaLabelledBy: g,
    role: v,
    onStateChange: E,
    onFocus: C,
    onBlur: w,
    ...N
  } = r, k = _e(f), S = u || d, b = Ne({
    disabled: S,
    loading: d,
    error: k,
    interaction: p ? { active: !0 } : null
  }), _ = N["aria-label"] || m, I = N["aria-labelledby"] || g, D = Ib(l, b), x = {
    state: b,
    disabled: S
  };
  return i.createElement(
    Cb.Provider,
    { value: x },
    i.createElement(
      "div",
      {
        ...N,
        ...y("navigation-split-view", "root", b),
        ref: o,
        role: v || "group",
        "aria-label": _,
        "aria-labelledby": I,
        "aria-disabled": S ? "true" : void 0,
        onFocus: tt(C, () => {
          typeof E == "function" && E("focus");
        }),
        onBlur: tt(w, () => {
          typeof E == "function" && E(b);
        })
      },
      D,
      k ? i.createElement(
        "span",
        {
          ...y("navigation-split-view", "status", b),
          ...Re({ live: "assertive" })
        },
        k.message
      ) : null
    )
  );
});
_u.displayName = "ChipsNavigationSplitView.Root";
function xc(r, o, l, u, d) {
  const {
    as: f,
    children: p,
    ariaLabel: m,
    ariaLabelledBy: g,
    role: v,
    ...E
  } = u, C = wb(r), w = f || o, N = E["aria-label"] || m, k = E["aria-labelledby"] || g;
  return i.createElement(
    w,
    {
      ...E,
      ...y("navigation-split-view", r, C.state),
      ref: d,
      role: v || l,
      "aria-label": N,
      "aria-labelledby": k,
      "aria-disabled": C.disabled ? "true" : void 0
    },
    p
  );
}
const Ic = i.forwardRef(
  (r, o) => xc("sidebar", "nav", "navigation", r, o)
);
Ic.displayName = "ChipsNavigationSplitView.Sidebar";
const Dc = i.forwardRef(
  (r, o) => xc("content", "section", "region", r, o)
);
Dc.displayName = "ChipsNavigationSplitView.Content";
const _c = i.forwardRef(
  (r, o) => xc("detail", "section", "region", r, o)
);
_c.displayName = "ChipsNavigationSplitView.Detail";
const Db = Object.assign(_u, {
  Root: _u,
  Sidebar: Ic,
  Content: Dc,
  Detail: _c
});
Db.displayName = "ChipsNavigationSplitView";
const _b = i.forwardRef((r, o) => {
  const {
    orientation: l = "horizontal",
    ratio: u,
    defaultRatio: d = 0.5,
    minRatio: f = 0.1,
    maxRatio: p = 0.9,
    disabled: m = !1,
    loading: g = !1,
    error: v = null,
    ariaLabel: E,
    start: C,
    end: w,
    onRatioChange: N,
    onStateChange: k
  } = r, S = _e(v), b = m || g, { interaction: _, handlers: I } = Oe(b), [D, x] = Je({
    value: u,
    defaultValue: d,
    onChange: N
  }), R = Cp(D, f, p), P = Ne({
    disabled: b,
    loading: g,
    error: S,
    interaction: _
  });
  i.useEffect(() => {
    typeof k == "function" && k(P);
  }, [P, k]);
  const O = (H) => {
    b || x(Cp(H, f, p));
  }, A = (H) => {
    if (b)
      return;
    const ee = H.currentTarget.parentElement;
    if (!ee || typeof ee.getBoundingClientRect != "function")
      return;
    const j = ee.getBoundingClientRect(), $ = l !== "vertical", U = (Z) => {
      const K = $ ? (Z.clientX - j.left) / Math.max(j.width, 1) : (Z.clientY - j.top) / Math.max(j.height, 1);
      O(K);
    }, V = () => {
      window.removeEventListener("mousemove", U), window.removeEventListener("mouseup", V);
    };
    window.addEventListener("mousemove", U), window.addEventListener("mouseup", V);
  }, Q = (H) => {
    if (b)
      return;
    const ee = l !== "vertical", j = ee ? "ArrowLeft" : "ArrowUp", $ = ee ? "ArrowRight" : "ArrowDown";
    if (H.key === j) {
      H.preventDefault(), O(R - 0.05);
      return;
    }
    if (H.key === $) {
      H.preventDefault(), O(R + 0.05);
      return;
    }
    if (H.key === "Home") {
      H.preventDefault(), O(f);
      return;
    }
    H.key === "End" && (H.preventDefault(), O(p));
  }, F = l !== "vertical", W = F ? { width: `${R * 100}%` } : { height: `${R * 100}%` }, q = F ? { width: `${(1 - R) * 100}%` } : { height: `${(1 - R) * 100}%` };
  return i.createElement(
    "div",
    {
      ...y("split-pane", "root", P),
      ...I,
      ref: o,
      role: "group",
      "aria-label": E,
      "aria-orientation": l,
      "aria-disabled": b ? "true" : void 0,
      style: {
        display: "flex",
        flexDirection: F ? "row" : "column"
      }
    },
    i.createElement(
      "div",
      {
        ...y("split-pane", "pane-start", P),
        style: {
          ...W,
          minWidth: F ? 0 : void 0,
          minHeight: F ? void 0 : 0
        }
      },
      C
    ),
    i.createElement("button", {
      ...y("split-pane", "resizer", P),
      type: "button",
      role: "separator",
      tabIndex: 0,
      "aria-label": E,
      "aria-valuemin": String(Math.round(f * 100)),
      "aria-valuemax": String(Math.round(p * 100)),
      "aria-valuenow": String(Math.round(R * 100)),
      "aria-orientation": l,
      onMouseDown: A,
      onKeyDown: Q
    }),
    i.createElement(
      "div",
      {
        ...y("split-pane", "pane-end", P),
        style: {
          ...q,
          minWidth: F ? 0 : void 0,
          minHeight: F ? void 0 : 0
        }
      },
      w
    ),
    S ? i.createElement(
      "span",
      {
        ...y("split-pane", "status", P),
        ...Re({ live: "assertive" })
      },
      S.message
    ) : null
  );
});
_b.displayName = "ChipsSplitPane";
const Lb = i.forwardRef((r, o) => {
  const {
    panels: l = [],
    panelStates: u,
    defaultPanelStates: d = {},
    activePanelId: f,
    defaultActivePanelId: p,
    disabled: m = !1,
    loading: g = !1,
    error: v = null,
    ariaLabel: E,
    onPanelStatesChange: C,
    onActivePanelIdChange: w,
    onStateChange: N
  } = r, k = _e(v), S = m || g, { interaction: b, handlers: _ } = Oe(S), [I, D] = Je({
    value: u,
    defaultValue: d,
    onChange: C
  }), [x, R] = Je({
    value: f,
    defaultValue: p,
    onChange: w
  }), P = i.useMemo(
    () => (Array.isArray(l) ? l : []).filter((q) => q && typeof q.id == "string").map((q) => ({
      ...q,
      title: typeof q.title == "string" ? q.title : q.id
    })),
    [l]
  ), O = i.useMemo(
    () => sv(P, I),
    [P, I]
  );
  i.useEffect(() => {
    if (P.length !== 0 && (!x || !P.some((q) => q.id === x))) {
      const q = P.find(
        (H) => O[H.id] !== "hidden"
      );
      q && R(q.id);
    }
  }, [x, P, O, R]);
  const A = Ne({
    disabled: S,
    loading: g,
    error: k,
    interaction: b
  });
  i.useEffect(() => {
    typeof N == "function" && N(A);
  }, [A, N]);
  const Q = (q, H) => {
    if (S)
      return;
    const ee = { ...O, [q]: H };
    D(ee), R(q);
  }, F = P.filter(
    (q) => O[q.id] !== "hidden"
  ), W = F.find((q) => q.id === x) || F[0];
  return i.createElement(
    "div",
    {
      ...y("dock-panel", "root", A),
      ..._,
      ref: o,
      role: "group",
      "aria-label": E,
      "aria-disabled": S ? "true" : void 0
    },
    i.createElement(
      "div",
      {
        ...y("dock-panel", "tab-list", A),
        role: "tablist",
        "aria-label": E
      },
      P.map((q) => {
        const H = O[q.id], ee = W && W.id === q.id && H !== "hidden", j = `dock-panel-${q.id}`;
        return i.createElement(
          "button",
          {
            ...y("dock-panel", "tab", A),
            key: q.id,
            id: `${j}-tab`,
            type: "button",
            role: "tab",
            tabIndex: ee ? 0 : -1,
            "aria-selected": String(!!ee),
            "aria-controls": j,
            "data-panel-state": H,
            disabled: S,
            onClick: () => Q(q.id, "active")
          },
          q.title
        );
      })
    ),
    W ? i.createElement(
      "section",
      {
        ...y("dock-panel", "content", A),
        id: `dock-panel-${W.id}`,
        role: "tabpanel",
        "aria-labelledby": `dock-panel-${W.id}-tab`
      },
      W.content
    ) : null,
    k ? i.createElement(
      "span",
      {
        ...y("dock-panel", "status", A),
        ...Re({ live: "assertive" })
      },
      k.message
    ) : null
  );
});
Lb.displayName = "ChipsDockPanel";
const Rb = i.forwardRef((r, o) => {
  const {
    sections: l = [],
    openSectionIds: u,
    defaultOpenSectionIds: d = [],
    disabled: f = !1,
    loading: p = !1,
    error: m = null,
    ariaLabel: g,
    onOpenSectionIdsChange: v,
    onStateChange: E
  } = r, C = _e(m), w = f || p, { interaction: N, handlers: k } = Oe(w), [S, b] = Je({
    value: u,
    defaultValue: d,
    onChange: v
  }), [_, I] = i.useState(0), D = i.useMemo(
    () => (Array.isArray(l) ? l : []).filter((A) => A && typeof A.id == "string").map((A) => ({
      ...A,
      title: typeof A.title == "string" ? A.title : A.id
    })),
    [l]
  );
  i.useEffect(() => {
    _ >= D.length && I(Math.max(0, D.length - 1));
  }, [_, D.length]);
  const x = i.useMemo(
    () => new Set((Array.isArray(S) ? S : []).map((A) => String(A))),
    [S]
  ), R = Ne({
    disabled: w,
    loading: p,
    error: C,
    interaction: N
  });
  i.useEffect(() => {
    typeof E == "function" && E(R);
  }, [R, E]);
  const P = (A) => {
    w || b(uv(S, A));
  }, O = (A) => {
    if (!(w || D.length === 0)) {
      if (A.key === "ArrowDown") {
        A.preventDefault(), I((Q) => Math.min(D.length - 1, Q + 1));
        return;
      }
      if (A.key === "ArrowUp") {
        A.preventDefault(), I((Q) => Math.max(0, Q - 1));
        return;
      }
      if (A.key === "Home") {
        A.preventDefault(), I(0);
        return;
      }
      if (A.key === "End") {
        A.preventDefault(), I(D.length - 1);
        return;
      }
      if (Ut(A.key)) {
        A.preventDefault();
        const Q = D[_];
        Q && P(Q.id);
      }
    }
  };
  return i.createElement(
    "aside",
    {
      ...y("inspector", "root", R),
      ...k,
      ref: o,
      role: "complementary",
      tabIndex: 0,
      "aria-label": g,
      "aria-disabled": w ? "true" : void 0,
      onKeyDown: O
    },
    D.map((A, Q) => {
      const F = x.has(A.id), W = `inspector-section-${A.id}`, q = `${W}-header`;
      return i.createElement(
        "section",
        {
          ...y("inspector", "section", R),
          key: A.id,
          id: W
        },
        i.createElement(
          "button",
          {
            ...y("inspector", "header", R),
            id: q,
            type: "button",
            tabIndex: Q === _ ? 0 : -1,
            "aria-expanded": String(F),
            "aria-controls": `${W}-body`,
            onClick: () => P(A.id)
          },
          A.title
        ),
        F ? i.createElement(
          "div",
          {
            ...y("inspector", "body", R),
            id: `${W}-body`,
            role: "region",
            "aria-labelledby": q
          },
          A.content
        ) : null
      );
    }),
    C ? i.createElement(
      "span",
      {
        ...y("inspector", "status", R),
        ...Re({ live: "assertive" })
      },
      C.message
    ) : null
  );
});
Rb.displayName = "ChipsInspector";
const Nb = i.forwardRef((r, o) => {
  const {
    title: l,
    subtitle: u,
    actions: d,
    collapsed: f,
    defaultCollapsed: p = !1,
    collapsible: m = !1,
    closable: g = !1,
    disabled: v = !1,
    loading: E = !1,
    error: C = null,
    ariaLabel: w,
    expandIconContent: N,
    collapseIconContent: k,
    closeIconContent: S,
    onCollapsedChange: b,
    onClose: _,
    onStateChange: I
  } = r, D = _e(C), x = v || E, { interaction: R, handlers: P } = Oe(x), [O, A] = Je({
    value: f,
    defaultValue: p === !0,
    onChange: b
  }), Q = Ne({
    disabled: x,
    loading: E,
    error: D,
    interaction: R
  });
  return i.useEffect(() => {
    typeof I == "function" && I(Q);
  }, [Q, I]), i.createElement(
    "header",
    {
      ...y("panel-header", "root", Q),
      ...P,
      ref: o,
      role: "group",
      "aria-label": w,
      "aria-disabled": x ? "true" : void 0
    },
    i.createElement(
      "div",
      y("panel-header", "title", Q),
      l
    ),
    u ? i.createElement(
      "div",
      y("panel-header", "subtitle", Q),
      u
    ) : null,
    i.createElement(
      "div",
      y("panel-header", "actions", Q),
      d,
      m ? i.createElement(
        "button",
        {
          ...y("panel-header", "toggle", Q),
          type: "button",
          "aria-label": w,
          "aria-pressed": String(O),
          disabled: x,
          onClick: () => A(!O)
        },
        O ? it(N, "expand") : it(k, "collapse")
      ) : null,
      g ? i.createElement(
        "button",
        {
          ...y("panel-header", "close", Q),
          type: "button",
          "aria-label": w,
          disabled: x,
          onClick: _
        },
        it(S, "close")
      ) : null
    ),
    D ? i.createElement(
      "span",
      {
        ...y("panel-header", "status", Q),
        ...Re({ live: "assertive" })
      },
      D.message
    ) : null
  );
});
Nb.displayName = "ChipsPanelHeader";
const Tb = i.forwardRef((r, o) => {
  const {
    title: l,
    toolbar: u,
    footer: d,
    children: f,
    active: p = !1,
    disabled: m = !1,
    loading: g = !1,
    error: v = null,
    ariaLabel: E,
    onStateChange: C
  } = r, w = _e(v), N = m || g, { interaction: k, handlers: S } = Oe(N), b = Ne({
    disabled: N,
    loading: g,
    error: w,
    interaction: {
      ...k,
      active: k.active || p
    }
  });
  return i.useEffect(() => {
    typeof C == "function" && C(b);
  }, [b, C]), i.createElement(
    "article",
    {
      ...y("card-shell", "root", b),
      ...S,
      ref: o,
      role: "article",
      "aria-label": E,
      "aria-disabled": N ? "true" : void 0,
      "data-active": String(p)
    },
    i.createElement(
      "header",
      y("card-shell", "header", b),
      l
    ),
    i.createElement(
      "div",
      y("card-shell", "toolbar", b),
      u
    ),
    i.createElement(
      "section",
      y("card-shell", "content", b),
      f
    ),
    i.createElement(
      "footer",
      y("card-shell", "footer", b),
      d
    ),
    w ? i.createElement(
      "span",
      {
        ...y("card-shell", "status", b),
        ...Re({ live: "assertive" })
      },
      w.message
    ) : null
  );
});
Tb.displayName = "ChipsCardShell";
const Pb = i.forwardRef((r, o) => {
  const {
    title: l,
    open: u,
    defaultOpen: d = !0,
    minimized: f,
    defaultMinimized: p = !1,
    disabled: m = !1,
    loading: g = !1,
    error: v = null,
    ariaLabel: E,
    expandIconContent: C,
    collapseIconContent: w,
    closeIconContent: N,
    children: k,
    onOpenChange: S,
    onMinimizedChange: b,
    onFocus: _,
    onStateChange: I
  } = r, D = _e(v), x = m || g, { interaction: R, handlers: P } = Oe(x), [O, A] = Je({
    value: u,
    defaultValue: d === !0,
    onChange: S
  }), [Q, F] = Je({
    value: f,
    defaultValue: p === !0,
    onChange: b
  }), W = Ne({
    disabled: x,
    loading: g,
    error: D,
    interaction: R
  });
  return i.useEffect(() => {
    typeof I == "function" && I(W);
  }, [W, I]), O ? i.createElement(
    "section",
    {
      ...y("tool-window", "root", W),
      ...P,
      ref: o,
      role: "dialog",
      "aria-label": E,
      "aria-modal": "false",
      "aria-disabled": x ? "true" : void 0,
      "data-minimized": String(!!Q),
      onFocus: _
    },
    i.createElement(
      "header",
      y("tool-window", "header", W),
      l
    ),
    i.createElement(
      "div",
      y("tool-window", "controls", W),
      i.createElement(
        "button",
        {
          ...y("tool-window", "controls", W),
          type: "button",
          disabled: x,
          "aria-label": E,
          onClick: () => F(!Q)
        },
        Q ? it(C, "expand") : it(w, "collapse")
      ),
      i.createElement(
        "button",
        {
          ...y("tool-window", "controls", W),
          type: "button",
          disabled: x,
          "aria-label": E,
          onClick: () => A(!1)
        },
        it(N, "close")
      )
    ),
    Q ? null : i.createElement(
      "div",
      y("tool-window", "body", W),
      k
    ),
    D ? i.createElement(
      "span",
      {
        ...y("tool-window", "status", W),
        ...Re({ live: "assertive" })
      },
      D.message
    ) : null
  ) : null;
});
Pb.displayName = "ChipsToolWindow";
const Ab = i.forwardRef((r, o) => {
  const {
    children: l,
    fallback: u,
    resetKeys: d = [],
    error: f = null,
    disabled: p = !1,
    loading: m = !1,
    title: g,
    titleKey: v = "systemUx.errorBoundary.title",
    description: E,
    descriptionKey: C = "systemUx.errorBoundary.description",
    retryLabel: w,
    retryLabelKey: N = "systemUx.errorBoundary.retry",
    showErrorMessage: k = !0,
    ariaLabel: S,
    i18n: b,
    traceId: _,
    onError: I,
    onRetry: D,
    onStateChange: x,
    onDiagnostic: R
  } = r, P = _e(f), O = P ? Pr(P, "SYSTEM_UX_ERROR_BOUNDARY_INPUT_ERROR") : null, A = p || m, { interaction: Q, handlers: F } = Oe(A), [W, q] = i.useState(null), [H, ee] = i.useState(0), j = W || O, $ = Ne({
    disabled: A,
    loading: m,
    error: j,
    interaction: Q
  });
  i.useEffect(() => {
    typeof x == "function" && x($);
  }, [$, x]);
  const U = i.useMemo(
    () => JSON.stringify(Array.isArray(d) ? d : []),
    [d]
  ), V = i.useRef(U);
  i.useEffect(() => {
    V.current !== U && (V.current = U, W && (q(null), ee((Y) => Y + 1)));
  }, [W, U]);
  const Z = vt({
    i18n: b,
    key: "systemUx.errorBoundary.ariaLabel",
    fallback: S || "[[systemUx.errorBoundary.ariaLabel]]",
    onDiagnostic: R
  }), K = vt({
    i18n: b,
    key: v,
    fallback: g || "[[systemUx.errorBoundary.title]]",
    onDiagnostic: R
  }), L = vt({
    i18n: b,
    key: C,
    fallback: E || "[[systemUx.errorBoundary.description]]",
    onDiagnostic: R
  }), M = vt({
    i18n: b,
    key: N,
    fallback: w || "[[systemUx.errorBoundary.retry]]",
    onDiagnostic: R
  }), ne = () => {
    A || (q(null), ee((Y) => Y + 1), typeof D == "function" && D(j), typeof R == "function" && R(
      No({
        traceId: _,
        component: "error-boundary",
        action: "retry",
        error: j,
        durationMs: 0
      })
    ));
  }, te = (Y, ae) => {
    const de = Date.now(), ie = Pr(Y, "SYSTEM_UX_ERROR_BOUNDARY_CAUGHT");
    q(ie), typeof I == "function" && I(ie, ae), typeof R == "function" && R(
      No({
        traceId: _,
        component: "error-boundary",
        action: "capture",
        error: ie,
        durationMs: Date.now() - de
      })
    );
  }, ce = typeof u == "function" ? u({
    error: j,
    retry: ne,
    state: $,
    title: K,
    description: L,
    retryLabel: M
  }) : u;
  return i.createElement(
    "section",
    {
      ...y("error-boundary", "root", $),
      ...F,
      ref: o,
      role: j ? "alert" : "region",
      "aria-label": Z,
      "aria-disabled": A ? "true" : void 0
    },
    j ? ce || i.createElement(
      i.Fragment,
      null,
      i.createElement(
        "h2",
        y("error-boundary", "title", $),
        K
      ),
      i.createElement(
        "p",
        y("error-boundary", "description", $),
        L
      ),
      k ? i.createElement(
        "p",
        y("error-boundary", "description", $),
        j.message
      ) : null,
      i.createElement(
        "button",
        {
          ...y("error-boundary", "action", $),
          type: "button",
          disabled: A,
          onClick: ne
        },
        M
      )
    ) : i.createElement(
      cv,
      {
        key: String(H),
        onCapturedError: te
      },
      l
    ),
    j ? i.createElement(
      "span",
      {
        ...y("error-boundary", "status", $),
        ...Re({ live: "assertive" })
      },
      j.message
    ) : null
  );
});
Ab.displayName = "ChipsErrorBoundary";
const wm = i.forwardRef((r, o) => {
  const {
    lines: l = 3,
    animated: u = !0,
    shape: d = "line",
    disabled: f = !1,
    loading: p = !1,
    error: m = null,
    ariaLabel: g,
    ariaLabelKey: v = "systemUx.skeleton.ariaLabel",
    i18n: E,
    onStateChange: C,
    onDiagnostic: w
  } = r, N = _e(m), k = f || p, { interaction: S, handlers: b } = Oe(k), _ = Number.isInteger(l) && l > 0 ? l : 3, I = Ne({
    disabled: k,
    loading: p,
    error: N,
    interaction: S
  });
  i.useEffect(() => {
    typeof C == "function" && C(I);
  }, [I, C]);
  const D = vt({
    i18n: E,
    key: v,
    fallback: g || "[[systemUx.skeleton.ariaLabel]]",
    onDiagnostic: w
  });
  return i.createElement(
    "div",
    {
      ...y("skeleton", "root", I),
      ...b,
      ref: o,
      role: "status",
      "aria-label": D,
      "aria-busy": "true",
      "aria-disabled": k ? "true" : void 0,
      "data-shape": d,
      "data-animated": String(u === !0)
    },
    Array.from({ length: _ }).map(
      (x, R) => i.createElement("span", {
        ...y("skeleton", "item", I),
        key: `skeleton-item-${R}`,
        "aria-hidden": "true",
        "data-shape": d
      })
    ),
    N ? i.createElement(
      "span",
      {
        ...y("skeleton", "status", I),
        ...Re({ live: "assertive" })
      },
      N.message
    ) : null
  );
});
wm.displayName = "ChipsSkeleton";
const Mb = i.forwardRef((r, o) => {
  const {
    children: l,
    loading: u = !1,
    delayMs: d,
    skeletonLines: f,
    fallback: p,
    disabled: m = !1,
    error: g = null,
    ariaLabel: v,
    ariaLabelKey: E = "systemUx.loadingBoundary.ariaLabel",
    loadingText: C,
    loadingTextKey: w = "systemUx.loadingBoundary.status",
    i18n: N,
    configSource: k,
    onStateChange: S,
    onDiagnostic: b
  } = r, _ = _e(g), I = m || u, { interaction: D, handlers: x } = Oe(I), [R, P] = i.useState(!1), O = za({
    configSource: k,
    key: "systemUx.loadingBoundary.delayMs",
    defaultValue: sn(d) || 120,
    parser: sn,
    onDiagnostic: b
  }), A = za({
    configSource: k,
    key: "systemUx.loadingBoundary.skeletonLines",
    defaultValue: sn(f) || 3,
    parser: sn,
    onDiagnostic: b
  });
  i.useEffect(() => {
    if (!u) {
      P(!1);
      return;
    }
    if (O <= 0) {
      P(!0);
      return;
    }
    const H = setTimeout(() => {
      P(!0);
    }, O);
    return () => clearTimeout(H);
  }, [u, O]);
  const Q = Ne({
    disabled: I,
    loading: u && R,
    error: _,
    interaction: D
  });
  i.useEffect(() => {
    typeof S == "function" && S(Q);
  }, [Q, S]);
  const F = vt({
    i18n: N,
    key: E,
    fallback: v || "[[systemUx.loadingBoundary.ariaLabel]]",
    onDiagnostic: b
  }), W = vt({
    i18n: N,
    key: w,
    fallback: C || "[[systemUx.loadingBoundary.status]]",
    onDiagnostic: b
  }), q = typeof p == "function" ? p({ state: Q, loading: u && R }) : p;
  return i.createElement(
    "section",
    {
      ...y("loading-boundary", "root", Q),
      ...x,
      ref: o,
      role: "region",
      "aria-label": F,
      "aria-busy": u ? "true" : "false",
      "aria-disabled": I ? "true" : void 0
    },
    u && R ? i.createElement(
      "div",
      y("loading-boundary", "fallback", Q),
      q || i.createElement(wm, {
        lines: A,
        loading: !0,
        i18n: N,
        onDiagnostic: b
      })
    ) : i.createElement(
      "div",
      y("loading-boundary", "content", Q),
      l
    ),
    u ? i.createElement(
      "span",
      {
        ...y("loading-boundary", "status", Q),
        ...Re({ live: "polite" })
      },
      W
    ) : null,
    _ ? i.createElement(
      "span",
      {
        ...y("loading-boundary", "status", Q),
        ...Re({ live: "assertive" })
      },
      _.message
    ) : null
  );
});
Mb.displayName = "ChipsLoadingBoundary";
const zb = i.forwardRef((r, o) => {
  const {
    icon: l,
    title: u,
    titleKey: d = "systemUx.emptyState.title",
    description: f,
    descriptionKey: p = "systemUx.emptyState.description",
    actionLabel: m,
    actionLabelKey: g = "systemUx.emptyState.action",
    children: v,
    disabled: E = !1,
    loading: C = !1,
    error: w = null,
    ariaLabel: N,
    i18n: k,
    onAction: S,
    onStateChange: b,
    onDiagnostic: _
  } = r, I = _e(w), D = E || C, { interaction: x, handlers: R } = Oe(D), P = Ne({
    disabled: D,
    loading: C,
    error: I,
    interaction: x
  });
  i.useEffect(() => {
    typeof b == "function" && b(P);
  }, [P, b]);
  const O = vt({
    i18n: k,
    key: "systemUx.emptyState.ariaLabel",
    fallback: N || "[[systemUx.emptyState.ariaLabel]]",
    onDiagnostic: _
  }), A = vt({
    i18n: k,
    key: d,
    fallback: u || "[[systemUx.emptyState.title]]",
    onDiagnostic: _
  }), Q = vt({
    i18n: k,
    key: p,
    fallback: f || "[[systemUx.emptyState.description]]",
    onDiagnostic: _
  }), F = vt({
    i18n: k,
    key: g,
    fallback: m || "[[systemUx.emptyState.action]]",
    onDiagnostic: _
  });
  return i.createElement(
    "section",
    {
      ...y("empty-state", "root", P),
      ...R,
      ref: o,
      role: "region",
      "aria-label": O,
      "aria-disabled": D ? "true" : void 0
    },
    l ? i.createElement(
      "div",
      y("empty-state", "icon", P),
      l
    ) : null,
    i.createElement(
      "h2",
      y("empty-state", "title", P),
      A
    ),
    i.createElement(
      "p",
      y("empty-state", "description", P),
      Q
    ),
    v ? i.createElement(
      "div",
      y("empty-state", "description", P),
      v
    ) : null,
    typeof S == "function" ? i.createElement(
      "button",
      {
        ...y("empty-state", "action", P),
        type: "button",
        disabled: D,
        onClick: S
      },
      F
    ) : null,
    I ? i.createElement(
      "span",
      {
        ...y("empty-state", "status", P),
        ...Re({ live: "assertive" })
      },
      I.message
    ) : null
  );
});
zb.displayName = "ChipsEmptyState";
const Ob = i.forwardRef((r, o) => {
  const {
    error: l,
    code: u,
    message: d,
    details: f,
    title: p,
    titleKey: m = "systemUx.errorState.title",
    description: g,
    descriptionKey: v = "systemUx.errorState.description",
    actionLabel: E,
    actionLabelKey: C = "systemUx.errorState.action",
    fallbackTitle: w = "Something went wrong",
    fallbackDescription: N,
    fallbackActionLabel: k = "Try again",
    icon: S,
    children: b,
    disabled: _ = !1,
    loading: I = !1,
    retryable: D,
    showDetails: x = !1,
    ariaLabel: R,
    i18n: P,
    traceId: O,
    onAction: A,
    onStateChange: Q,
    onDiagnostic: F,
    ...W
  } = r, q = l || {
    code: Qe(u) ? u.trim() : "ERROR_STATE",
    message: Qe(d) ? d.trim() : N || w,
    details: f
  }, H = jg({
    error: q,
    retryable: D,
    showDetails: x,
    disabled: _,
    loading: I
  }), ee = _ || I, j = Ne({
    disabled: ee,
    loading: I,
    error: H.error
  }), $ = vt({
    i18n: P,
    key: m,
    fallback: p || w,
    onDiagnostic: F
  }), U = vt({
    i18n: P,
    key: v,
    fallback: g || N || H.error.message,
    onDiagnostic: F
  }), V = vt({
    i18n: P,
    key: C,
    fallback: E || k,
    onDiagnostic: F
  }), Z = R || $ || H.error.message, K = f !== void 0 ? f : H.error.details !== void 0 ? H.error.details : H.error.code;
  typeof Q == "function" && Q(j);
  const L = (M) => {
    if (ee) {
      M.preventDefault();
      return;
    }
    typeof A == "function" && A(H.error, M), typeof F == "function" && F(
      No({
        traceId: O,
        component: "error-state",
        action: "action",
        error: H.error,
        durationMs: 0
      })
    );
  };
  return i.createElement(
    "section",
    {
      ...W,
      ...y("error-state", "root", j),
      ref: o,
      role: "alert",
      "aria-label": Z,
      "aria-busy": I ? "true" : void 0,
      "aria-disabled": ee ? "true" : void 0,
      "data-retryable": String(H.retryable),
      "data-error-code": H.error.code
    },
    S ? i.createElement(
      "div",
      y("error-state", "icon", j),
      S
    ) : null,
    i.createElement(
      "h2",
      y("error-state", "title", j),
      $
    ),
    i.createElement(
      "p",
      y("error-state", "description", j),
      U
    ),
    b ? i.createElement(
      "div",
      y("error-state", "description", j),
      b
    ) : null,
    H.showDetails && K !== void 0 ? i.createElement(
      "pre",
      y("error-state", "details", j),
      typeof K == "string" ? K : JSON.stringify(K, null, 2)
    ) : null,
    typeof A == "function" ? i.createElement(
      "button",
      {
        ...y("error-state", "action", j),
        type: "button",
        disabled: ee,
        onClick: L
      },
      V
    ) : null,
    i.createElement(
      "span",
      {
        ...y("error-state", "status", j),
        ...Re({ live: "assertive" })
      },
      H.error.message
    )
  );
});
Ob.displayName = "ChipsErrorState";
const Vb = i.forwardRef((r, o) => {
  const {
    items: l,
    defaultItems: u = [],
    maxVisible: d,
    defaultDurationMs: f,
    closeButtonLabel: p,
    closeButtonLabelKey: m = "systemUx.notification.close",
    closeIconContent: g,
    disabled: v = !1,
    loading: E = !1,
    error: C = null,
    ariaLabel: w,
    i18n: N,
    configSource: k,
    traceId: S,
    onItemsChange: b,
    onDismiss: _,
    onAction: I,
    onStateChange: D,
    onDiagnostic: x
  } = r, R = _e(C), P = v || E, { interaction: O, handlers: A } = Oe(P), [Q, F] = Je({
    value: l,
    defaultValue: u,
    onChange: b
  }), W = za({
    configSource: k,
    key: "systemUx.notification.maxVisible",
    defaultValue: sn(d) || 3,
    parser: sn,
    onDiagnostic: x
  }), q = za({
    configSource: k,
    key: "systemUx.notification.defaultDurationMs",
    defaultValue: sn(f) || 5e3,
    parser: sn,
    onDiagnostic: x
  }), H = i.useMemo(
    () => Fu(Q, "notification"),
    [Q]
  ), ee = i.useMemo(
    () => Zp({
      items: H,
      idPrefix: "notification",
      maxVisible: W,
      defaultDurationMs: q
    }),
    [H, q, W]
  ), j = Ne({
    disabled: P,
    loading: E,
    error: R,
    interaction: O
  });
  i.useEffect(() => {
    typeof D == "function" && D(j);
  }, [j, D]);
  const $ = vt({
    i18n: N,
    key: "systemUx.notification.ariaLabel",
    fallback: w || "[[systemUx.notification.ariaLabel]]",
    onDiagnostic: x
  }), U = vt({
    i18n: N,
    key: m,
    fallback: p || "[[systemUx.notification.close]]",
    onDiagnostic: x
  }), V = i.useCallback(
    (Z, K) => {
      const L = H.find((ne) => ne.id === Z);
      if (!L)
        return;
      const M = Jp(H, Z);
      F(M), typeof _ == "function" && _(L, K), typeof x == "function" && x(
        No({
          traceId: S,
          component: "notification",
          action: K || "dismiss",
          error: null,
          durationMs: 0
        })
      );
    },
    [H, x, _, F, S]
  );
  return i.useEffect(() => {
    if (P || ee.length === 0)
      return;
    const Z = [];
    for (const K of ee) {
      const L = K.effectiveDurationMs;
      if (!L || L <= 0)
        continue;
      const M = setTimeout(() => {
        V(K.id, "timeout");
      }, L);
      Z.push(M);
    }
    return () => {
      for (const K of Z)
        clearTimeout(K);
    };
  }, [P, V, ee]), i.createElement(
    "section",
    {
      ...y("notification", "root", j),
      ...A,
      ref: o,
      role: "region",
      "aria-label": $,
      "aria-disabled": P ? "true" : void 0
    },
    i.createElement(
      "ul",
      y("notification", "list", j),
      ee.map(
        (Z) => i.createElement(
          "li",
          {
            ...y("notification", "item", j),
            key: Z.id,
            role: Z.tone === "error" ? "alert" : "status",
            "data-tone": Z.tone
          },
          Z.title ? i.createElement(
            "div",
            y("notification", "title", j),
            Z.title
          ) : null,
          Z.message ? i.createElement(
            "div",
            y("notification", "message", j),
            Z.message
          ) : null,
          i.createElement(
            "div",
            y("notification", "action", j),
            Z.actionLabel || Z.actionKey ? i.createElement(
              "button",
              {
                ...y("notification", "action", j),
                type: "button",
                disabled: P,
                onClick: () => {
                  typeof I == "function" && I(Z);
                }
              },
              vt({
                i18n: N,
                key: Z.actionKey,
                fallback: Z.actionLabel || "[[systemUx.notification.action]]",
                onDiagnostic: x
              })
            ) : null,
            i.createElement(
              "button",
              {
                ...y("notification", "close", j),
                type: "button",
                "aria-label": U,
                disabled: P,
                onClick: () => V(Z.id, "manual")
              },
              it(g, "close")
            )
          )
        )
      )
    ),
    R ? i.createElement(
      "span",
      {
        ...y("notification", "status", j),
        ...Re({ live: "assertive" })
      },
      R.message
    ) : null
  );
});
Vb.displayName = "ChipsNotification";
const Bb = i.forwardRef((r, o) => {
  const {
    entries: l,
    defaultEntries: u = [],
    maxStack: d,
    defaultDurationMs: f,
    placement: p = "bottom-right",
    closeButtonLabel: m,
    closeButtonLabelKey: g = "systemUx.toast.close",
    closeIconContent: v,
    disabled: E = !1,
    loading: C = !1,
    error: w = null,
    ariaLabel: N,
    i18n: k,
    configSource: S,
    traceId: b,
    onEntriesChange: _,
    onDismiss: I,
    onAction: D,
    onStateChange: x,
    onDiagnostic: R
  } = r, P = _e(w), O = E || C, { interaction: A, handlers: Q } = Oe(O), [F, W] = Je({
    value: l,
    defaultValue: u,
    onChange: _
  }), q = za({
    configSource: S,
    key: "systemUx.toast.maxStack",
    defaultValue: sn(d) || 3,
    parser: sn,
    onDiagnostic: R
  }), H = za({
    configSource: S,
    key: "systemUx.toast.defaultDurationMs",
    defaultValue: sn(f) || 3500,
    parser: sn,
    onDiagnostic: R
  }), ee = i.useMemo(
    () => Fu(F, "toast"),
    [F]
  ), j = i.useMemo(
    () => Zp({
      items: ee,
      idPrefix: "toast",
      maxVisible: q,
      defaultDurationMs: H
    }),
    [ee, H, q]
  ), $ = Ne({
    disabled: O,
    loading: C,
    error: P,
    interaction: A
  });
  i.useEffect(() => {
    typeof x == "function" && x($);
  }, [$, x]);
  const U = vt({
    i18n: k,
    key: "systemUx.toast.ariaLabel",
    fallback: N || "[[systemUx.toast.ariaLabel]]",
    onDiagnostic: R
  }), V = vt({
    i18n: k,
    key: g,
    fallback: m || "[[systemUx.toast.close]]",
    onDiagnostic: R
  }), Z = i.useCallback(
    (K, L) => {
      const M = ee.find((te) => te.id === K);
      if (!M)
        return;
      const ne = Jp(ee, K);
      W(ne), typeof I == "function" && I(M, L), typeof R == "function" && R(
        No({
          traceId: b,
          component: "toast",
          action: L || "dismiss",
          durationMs: 0
        })
      );
    },
    [ee, R, I, W, b]
  );
  return i.useEffect(() => {
    if (O || j.length === 0)
      return;
    const K = [];
    for (const L of j) {
      const M = L.effectiveDurationMs;
      if (!M || M <= 0)
        continue;
      const ne = setTimeout(() => {
        Z(L.id, "timeout");
      }, M);
      K.push(ne);
    }
    return () => {
      for (const L of K)
        clearTimeout(L);
    };
  }, [O, Z, j]), i.createElement(
    "section",
    {
      ...y("toast", "root", $),
      ...Q,
      ref: o,
      role: "status",
      "aria-label": U,
      "aria-disabled": O ? "true" : void 0,
      "data-placement": p
    },
    i.createElement(
      "ul",
      y("toast", "list", $),
      j.map(
        (K) => i.createElement(
          "li",
          {
            ...y("toast", "item", $),
            key: K.id,
            role: K.tone === "error" ? "alert" : "status",
            "data-tone": K.tone
          },
          i.createElement(
            "span",
            y("toast", "message", $),
            K.message || K.title || ""
          ),
          i.createElement(
            "div",
            y("toast", "action", $),
            K.actionLabel || K.actionKey ? i.createElement(
              "button",
              {
                ...y("toast", "action", $),
                type: "button",
                disabled: O,
                onClick: () => {
                  typeof D == "function" && D(K);
                }
              },
              vt({
                i18n: k,
                key: K.actionKey,
                fallback: K.actionLabel || "[[systemUx.toast.action]]",
                onDiagnostic: R
              })
            ) : null,
            i.createElement(
              "button",
              {
                ...y("toast", "close", $),
                type: "button",
                "aria-label": V,
                disabled: O,
                onClick: () => Z(K.id, "manual")
              },
              it(v, "close")
            )
          )
        )
      )
    ),
    P ? i.createElement(
      "span",
      {
        ...y("toast", "status", $),
        ...Re({ live: "assertive" })
      },
      P.message
    ) : null
  );
});
Bb.displayName = "ChipsToast";
Ie({
  name: "ChipsText",
  scope: "text",
  parts: ["root"],
  states: ["idle", "disabled", "error"]
}), Ie({
  name: "ChipsLabel",
  scope: "label",
  parts: ["root", "required-indicator", "status"],
  states: ["idle", "disabled", "error"]
}), Ie({
  name: "ChipsIcon",
  scope: "icon",
  parts: ["root"],
  states: ["idle"]
});
Ie({
  name: "ChipsIconButton",
  scope: "icon-button",
  parts: ["root", "icon", "spinner", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsToggleButton",
  scope: "toggle-button",
  parts: ["root", "icon", "label", "spinner", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsBadge",
  scope: "badge",
  parts: ["root", "icon", "label", "status"],
  states: ["idle", "disabled", "error"]
}), Ie({
  name: "ChipsTag",
  scope: "tag",
  parts: ["root", "icon", "label", "close", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsAvatar",
  scope: "avatar",
  parts: ["root", "image", "fallback", "status"],
  states: Da
}), Ie({
  name: "ChipsSpinner",
  scope: "spinner",
  parts: ["root", "track", "indicator", "status"],
  states: Da
}), Ie({
  name: "ChipsProgress",
  scope: "progress",
  parts: ["root", "track", "range", "label", "value", "status"],
  states: Da
}), Ie({
  name: "ChipsRating",
  scope: "rating",
  parts: ["root", "label", "item", "icon", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsTextField",
  scope: "text-field",
  parts: ["root", "label", "control", "description", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsTextArea",
  scope: "text-area",
  parts: ["root", "label", "control", "description", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsSearchField",
  scope: "search-field",
  parts: ["root", "label", "search-icon", "control", "clear", "description", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsSecureField",
  scope: "secure-field",
  parts: ["root", "label", "control", "visibility-toggle", "visibility-icon", "description", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsSegmentedControl",
  scope: "segmented-control",
  parts: ["root", "item", "indicator", "label", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsComboBox",
  scope: "combo-box",
  parts: ["root", "label", "control", "trigger", "list", "option", "description", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsNumberInput",
  scope: "number-input",
  parts: ["root", "label", "control", "decrement", "increment", "description", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsStepper",
  scope: "stepper",
  parts: ["root", "label", "decrement", "value", "increment", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsSlider",
  scope: "slider",
  parts: ["root", "label", "track", "range", "thumb", "value", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsDatePicker",
  scope: "date-picker",
  parts: [
    "root",
    "label",
    "control",
    "input",
    "trigger",
    "calendar",
    "header",
    "previous",
    "next",
    "title",
    "grid",
    "week-header",
    "cell",
    "description",
    "status"
  ],
  states: [...ze]
}), Ie({
  name: "ChipsTimePicker",
  scope: "time-picker",
  parts: ["root", "label", "control", "input", "trigger", "list", "option", "description", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsImage",
  scope: "image",
  parts: ["root", "media", "fallback", "caption", "status"],
  states: Da
}), Ie({
  name: "ChipsMedia",
  scope: "media",
  parts: ["root", "content", "controls", "control", "caption", "status"],
  states: Da
}), Ie({
  name: "ChipsErrorState",
  scope: "error-state",
  parts: ["root", "icon", "title", "description", "details", "action", "status"],
  states: Da
});
Ie({
  name: "ChipsButton",
  scope: "button",
  parts: ["root", "label", "spinner", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsInput",
  scope: "input",
  parts: ["root", "control", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsCheckbox",
  scope: "checkbox",
  parts: ["root", "control", "indicator", "label", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsRadioGroup",
  scope: "radio",
  parts: ["root", "item", "control", "indicator", "label", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsSwitch",
  scope: "switch",
  parts: ["root", "track", "thumb", "label", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsSelect",
  scope: "select",
  parts: ["root", "trigger", "value", "icon", "content", "option", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsDialog",
  scope: "dialog",
  parts: [
    "root",
    "trigger",
    "backdrop",
    "content",
    "header",
    "body",
    "footer",
    "actions",
    "close",
    "status"
  ],
  states: [...ze]
}), Ie({
  name: "ChipsPopover",
  scope: "popover",
  parts: ["root", "trigger", "content", "arrow", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsTabs",
  scope: "tabs",
  parts: ["root", "list", "trigger", "panel", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsMenu",
  scope: "menu",
  parts: ["root", "trigger", "content", "item", "group", "group-label", "separator", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsToolbar",
  scope: "toolbar",
  parts: ["root", "group", "item", "icon", "label", "shortcut", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsMenuBar",
  scope: "menu-bar",
  parts: ["root", "menu", "content", "group", "item", "shortcut", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsContextMenu",
  scope: "context-menu",
  parts: ["root", "trigger", "content", "group", "item", "shortcut", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsShortcut",
  scope: "shortcut",
  parts: ["root", "key", "separator"],
  states: ["idle", "disabled"]
}), Ie({
  name: "ChipsTooltip",
  scope: "tooltip",
  parts: ["root", "trigger", "content", "arrow", "status"],
  states: [...ze]
});
Ie({
  name: "ChipsForm",
  scope: "form",
  parts: ["root", "section", "field", "label", "required", "control", "error", "hint", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsVirtualList",
  scope: "virtual-list",
  parts: ["root", "viewport", "content", "item", "status"],
  states: [...ze]
});
Ie({
  name: "ChipsDataGrid",
  scope: "data-grid",
  parts: ["root", "toolbar", "header", "row", "cell", "pagination", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsTree",
  scope: "tree",
  parts: ["root", "item", "branch", "leaf", "disclosure", "label", "group", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsDateTime",
  scope: "date-time",
  parts: ["root", "input", "icon", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsCommandPalette",
  scope: "command-palette",
  parts: ["root", "input", "list", "group", "group-label", "item", "shortcut", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsNavigationSplitView",
  scope: "navigation-split-view",
  parts: ["root", "sidebar", "content", "detail", "divider", "status"],
  states: [...ze]
});
Ie({
  name: "ChipsSplitPane",
  scope: "split-pane",
  parts: ["root", "pane-start", "resizer", "pane-end", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsDockPanel",
  scope: "dock-panel",
  parts: ["root", "tab-list", "tab", "content", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsInspector",
  scope: "inspector",
  parts: ["root", "section", "header", "body", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsPanelHeader",
  scope: "panel-header",
  parts: ["root", "title", "subtitle", "actions", "toggle", "close", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsCardShell",
  scope: "card-shell",
  parts: ["root", "header", "toolbar", "content", "footer", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsToolWindow",
  scope: "tool-window",
  parts: ["root", "header", "controls", "body", "status"],
  states: [...ze]
});
Ie({
  name: "ChipsErrorBoundary",
  scope: "error-boundary",
  parts: ["root", "title", "description", "action", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsLoadingBoundary",
  scope: "loading-boundary",
  parts: ["root", "content", "fallback", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsNotification",
  scope: "notification",
  parts: ["root", "list", "item", "title", "message", "action", "close", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsToast",
  scope: "toast",
  parts: ["root", "list", "item", "message", "action", "close", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsEmptyState",
  scope: "empty-state",
  parts: ["root", "icon", "title", "description", "action", "status"],
  states: [...ze]
}), Ie({
  name: "ChipsSkeleton",
  scope: "skeleton",
  parts: ["root", "item", "status"],
  states: [...ze]
});
const Ta = 5, km = 1, ni = 1e5, Lc = [
  "stars",
  "hearts",
  "score",
  "progress"
], Ba = {
  theme: "",
  style: "stars",
  score: 0,
  total_score: Ta,
  locale: "zh-CN"
};
function Ip(r) {
  return typeof r == "string" ? r.trim() : void 0;
}
function xm(r) {
  if (typeof r == "number" && Number.isFinite(r))
    return r;
  if (typeof r == "string" && r.trim().length > 0) {
    const o = Number(r);
    return Number.isFinite(o) ? o : void 0;
  }
}
function Rc(r, o, l) {
  return Math.min(Math.max(r, o), l);
}
function ea(r) {
  return r === "stars" || r === "hearts";
}
function Fb(r) {
  return Lc.includes(r) ? r : Ba.style;
}
function Ub(r, o) {
  return ea(r) ? Ta : Rc(
    xm(o) ?? Ba.total_score,
    km,
    ni
  );
}
function Kb(r, o, l) {
  const u = Rc(xm(o) ?? Ba.score, 0, l);
  return ea(r) ? Math.round(u) : u;
}
function nr(r) {
  const o = r ?? {}, l = Fb(o.style), u = Ub(l, o.total_score), d = Kb(l, o.score, u);
  return {
    card_type: "ScoreCard",
    theme: Ip(o.theme) ?? Ba.theme,
    style: l,
    score: d,
    total_score: u,
    locale: Ip(o.locale) ?? Ba.locale
  };
}
function Im(r) {
  return !Number.isFinite(r.total_score) || r.total_score <= 0 ? 0 : Rc(r.score / r.total_score, 0, 1);
}
function Yl(r) {
  const o = {};
  return r.card_type !== "ScoreCard" && (o.card_type = "score.validation.cardType"), Lc.includes(r.style) || (o.style = "score.validation.style"), (!Number.isFinite(r.total_score) || r.total_score < km) && (o.total_score = "score.validation.totalMin"), r.total_score > ni && (o.total_score = "score.validation.totalMax"), (!Number.isFinite(r.score) || r.score < 0) && (o.score = "score.validation.scoreMin"), Number.isFinite(r.total_score) && r.score > r.total_score && (o.score = "score.validation.scoreMax"), ea(r.style) && (r.total_score !== Ta && (o.total_score = "score.validation.symbolTotal"), Number.isInteger(r.score) || (o.score = "score.validation.symbolInteger")), {
    valid: Object.keys(o).length === 0,
    errors: o
  };
}
const jb = {
  "score.style": "Style",
  "score.style.stars": "Stars",
  "score.style.hearts": "Hearts",
  "score.style.score": "Score",
  "score.style.progress": "Progress",
  "score.earnedScore": "Earned score",
  "score.totalScore": "Total score",
  "score.totalScore.decrement": "Decrease total score",
  "score.totalScore.increment": "Increase total score",
  "score.scoreValue": "Earned score",
  "score.scoreValue.decrement": "Decrease earned score",
  "score.scoreValue.increment": "Increase earned score",
  "score.setScore": "Set to {score}",
  "score.accessible.value": "{score} of {total}",
  "score.rating.item.active": "{score} of {total}, earned",
  "score.rating.item.inactive": "{score} of {total}, not earned",
  "score.separator": "/",
  "score.progress.percent": "{percent}%",
  "score.progressPreview": "Progress preview: {score} of {total}, {percent}%",
  "score.validation.cardType": "Card type must be ScoreCard.",
  "score.validation.style": "Score style must be stars, hearts, score, or progress.",
  "score.validation.totalMin": "Total score must be at least 1.",
  "score.validation.totalMax": "Total score cannot exceed {max}.",
  "score.validation.scoreMin": "Earned score must be at least 0.",
  "score.validation.scoreMax": "Earned score cannot exceed the total score.",
  "score.validation.symbolTotal": "Stars and hearts are fixed to a five-point scale.",
  "score.validation.symbolInteger": "Stars and hearts must use whole-number scores."
}, $b = {
  "score.style": "样式",
  "score.style.stars": "星星",
  "score.style.hearts": "爱心",
  "score.style.score": "分数",
  "score.style.progress": "进度条",
  "score.earnedScore": "获得分数",
  "score.totalScore": "总分多少",
  "score.totalScore.decrement": "减少总分",
  "score.totalScore.increment": "增加总分",
  "score.scoreValue": "获得分数多少",
  "score.scoreValue.decrement": "减少获得分数",
  "score.scoreValue.increment": "增加获得分数",
  "score.setScore": "设置为 {score} 分",
  "score.accessible.value": "{score} / {total} 分",
  "score.rating.item.active": "{score} / {total}，已获得",
  "score.rating.item.inactive": "{score} / {total}，未获得",
  "score.separator": "/",
  "score.progress.percent": "{percent}%",
  "score.progressPreview": "进度预览：{score} / {total}，{percent}%",
  "score.validation.cardType": "卡片类型必须为 ScoreCard。",
  "score.validation.style": "评分样式必须为星星、爱心、分数或进度条。",
  "score.validation.totalMin": "总分必须大于或等于 1。",
  "score.validation.totalMax": "总分不能超过 {max}。",
  "score.validation.scoreMin": "获得分数必须大于或等于 0。",
  "score.validation.scoreMax": "获得分数不能超过总分。",
  "score.validation.symbolTotal": "星星和爱心评分固定为五分制。",
  "score.validation.symbolInteger": "星星和爱心评分必须为整数。"
}, Hb = {
  "zh-CN": $b,
  "en-US": jb
};
function qb(r) {
  const o = (r ?? "").toLowerCase();
  return o === "en" || o === "en-us" || o.startsWith("en-") ? "en-US" : (o === "zh" || o === "zh-cn" || o.startsWith("zh-"), "zh-CN");
}
function Qb(r, o) {
  return o ? r.replace(/\{(\w+)\}/g, (l, u) => String(o[u] ?? "")) : r;
}
function Dm(r) {
  const o = Hb[qb(r)];
  return (l, u) => {
    const d = o[l] ?? l;
    return Qb(d, u);
  };
}
const Wb = `
.chips-score-card {
  width: 100%;
  color: var(--chips-sys-color-on-surface, #0f172a);
  font: 14px/1.5 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
}

.chips-score-card,
.chips-score-card * {
  box-sizing: border-box;
}

.chips-score-card__surface {
  width: 100%;
  min-width: 0;
}

.chips-score-card__surface--symbols {
  display: flex;
  justify-content: center;
}

.chips-score-card__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
  padding: 0;
}

.chips-score-card__rating[data-scope="rating"][data-part="root"] {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--chips-comp-rating-root-gap, var(--chips-layout-gap-xs, 8px));
  min-width: 0;
  width: 100%;
  --chips-comp-rating-item-size: 38px;
}

.chips-score-card__rating[data-scope="rating"][data-part="root"] [data-part="item"] {
  cursor: default;
}

.chips-score-card__rating[data-scope="rating"][data-part="root"] [data-part="item"]:hover {
  background-color: var(--chips-comp-rating-item-surface-idle, transparent);
}

.chips-score-card__rating[data-scope="rating"][data-part="root"] [data-part="item"][data-active="true"],
.chips-score-card__rating[data-scope="rating"][data-part="root"] [data-part="item"][data-state="active"] {
  color: var(--chips-comp-rating-icon-color-active, var(--chips-sys-color-primary, #f59e0b));
}

.chips-score-card__rating[data-scope="rating"][data-part="root"][data-shape="heart"] [data-part="item"][data-active="true"],
.chips-score-card__rating[data-scope="rating"][data-part="root"][data-shape="heart"] [data-part="item"][data-state="active"] {
  color: var(--chips-comp-rating-icon-color-heart-active, var(--chips-sys-color-error, #e11d48));
}

.chips-score-card__numeric {
  display: inline-flex;
  align-items: baseline;
  min-width: 0;
  color: var(--chips-sys-color-on-surface, #0f172a);
}

.chips-score-card__numeric-score[data-scope="text"][data-part="root"] {
  font-size: 42px;
  font-weight: 750;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.chips-score-card__numeric-separator[data-scope="text"][data-part="root"] {
  margin: 0 8px;
  color: var(--chips-sys-color-outline, rgba(15, 23, 42, 0.36));
  font-size: 24px;
  font-weight: 600;
}

.chips-score-card__numeric-total[data-scope="text"][data-part="root"] {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 22px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.chips-score-card__progress {
  display: grid;
  gap: 10px;
  width: 100%;
}

.chips-score-card__progress-control[data-scope="progress"][data-part="root"] {
  display: grid;
  gap: 6px;
  width: 100%;
}

.chips-score-card__progress-control[data-scope="progress"][data-part="root"] [data-part="track"] {
  position: relative;
  display: block;
  width: 100%;
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--chips-comp-progress-track-surface, var(--chips-sys-color-surface-container-highest, rgba(15, 23, 42, 0.12)));
}

.chips-score-card__progress-control[data-scope="progress"][data-part="root"] [data-part="range"] {
  display: block;
  height: 100%;
  width: calc(var(--chips-progress-ratio, 0) * 100%);
  min-width: 0;
  border-radius: inherit;
  background: var(--chips-comp-progress-range-surface, var(--chips-sys-color-primary, #2563eb));
  transition: width 0.18s ease;
}

.chips-score-card__progress-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 13px;
  line-height: 1.3;
}

.chips-score-card__progress-score[data-scope="text"][data-part="root"] {
  color: var(--chips-sys-color-on-surface, #0f172a);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.chips-score-card__progress-percent[data-scope="text"][data-part="root"] {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-variant-numeric: tabular-nums;
}
`;
function iu(r, o) {
  return new Intl.NumberFormat(o ?? "zh-CN", {
    maximumFractionDigits: 2
  }).format(r);
}
function Yb(r) {
  return r.style === "hearts" ? "heart" : "star";
}
function Gb(r, o) {
  return (l, u) => o(u.active ? "score.rating.item.active" : "score.rating.item.inactive", {
    score: l,
    total: u.count
  });
}
function Xb(r, o, l, u) {
  const d = Yb(r);
  return /* @__PURE__ */ qe.jsxs(qe.Fragment, { children: [
    /* @__PURE__ */ qe.jsx("span", { className: "chips-score-card__sr-only", id: l, children: o }),
    /* @__PURE__ */ qe.jsx(
      Ku,
      {
        ariaLabelledBy: l,
        className: "chips-score-card__rating",
        count: r.total_score,
        getItemLabel: Gb(r, u),
        readOnly: !0,
        shape: d,
        value: r.score
      }
    )
  ] });
}
function Zb({ config: r }) {
  const o = Dm(r.locale), l = iu(r.score, r.locale), u = iu(r.total_score, r.locale), d = Im(r), f = iu(d * 100, r.locale), p = o("score.accessible.value", {
    score: l,
    total: u
  }), m = i.useId(), g = i.useId();
  return /* @__PURE__ */ qe.jsx("div", { className: "chips-score-card", "data-card-type": r.card_type, "data-score-style": r.style, children: /* @__PURE__ */ qe.jsxs(
    "div",
    {
      className: [
        "chips-score-card__surface",
        ea(r.style) ? "chips-score-card__surface--symbols" : ""
      ].filter(Boolean).join(" "),
      children: [
        ea(r.style) ? Xb(r, p, g, o) : null,
        r.style === "score" ? /* @__PURE__ */ qe.jsxs("div", { className: "chips-score-card__numeric", role: "img", "aria-label": p, children: [
          /* @__PURE__ */ qe.jsx(tr, { "aria-hidden": "true", as: "span", className: "chips-score-card__numeric-score", children: l }),
          /* @__PURE__ */ qe.jsx(tr, { "aria-hidden": "true", as: "span", className: "chips-score-card__numeric-separator", children: o("score.separator") }),
          /* @__PURE__ */ qe.jsx(tr, { "aria-hidden": "true", as: "span", className: "chips-score-card__numeric-total", children: u })
        ] }) : null,
        r.style === "progress" ? /* @__PURE__ */ qe.jsxs("div", { className: "chips-score-card__progress", children: [
          /* @__PURE__ */ qe.jsx("span", { className: "chips-score-card__sr-only", id: m, children: p }),
          /* @__PURE__ */ qe.jsx(
            Uu,
            {
              "aria-labelledby": m,
              className: "chips-score-card__progress-control",
              max: r.total_score,
              min: 0,
              value: r.score,
              valueText: o("score.progress.percent", { percent: f })
            }
          ),
          /* @__PURE__ */ qe.jsxs("div", { className: "chips-score-card__progress-meta", "aria-hidden": "true", children: [
            /* @__PURE__ */ qe.jsxs(tr, { as: "span", className: "chips-score-card__progress-score", children: [
              l,
              " / ",
              u
            ] }),
            /* @__PURE__ */ qe.jsx(tr, { as: "span", className: "chips-score-card__progress-percent", children: o("score.progress.percent", { percent: f }) })
          ] })
        ] }) : null
      ]
    }
  ) });
}
function Jb(r) {
  const { container: o, config: l, themeCssText: u } = r;
  for (; o.firstChild; )
    o.removeChild(o.firstChild);
  const d = document.createElement("div");
  d.setAttribute("data-chips-basecard-view-root", "true"), d.style.width = "100%", o.appendChild(d);
  const f = {
    root: Rp.createRoot(d)
  };
  return Lp.flushSync(() => {
    f.root.render(
      i.createElement(
        i.Fragment,
        null,
        i.createElement("style", null, `${u ?? ""}
${Wb}`),
        i.createElement(Zb, {
          config: l
        })
      )
    );
  }), () => {
    for (f.root.unmount(); o.firstChild; )
      o.removeChild(o.firstChild);
  };
}
const eE = `
html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--chips-sys-color-surface, #ffffff);
}

.chips-basecard-editor {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  color: var(--chips-sys-color-on-surface, #111827);
  background: var(--chips-sys-color-surface, #ffffff);
  font: 14px/1.6 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
}

.chips-basecard-editor,
.chips-basecard-editor * {
  box-sizing: border-box;
}

.chips-score-editor__group {
  display: grid;
  gap: 10px;
}

.chips-score-editor__label[data-scope="text"][data-part="root"] {
  color: var(--chips-sys-color-on-surface, #111827);
  font-weight: 650;
}

.chips-score-editor__segmented[data-scope="segmented-control"][data-part="root"] {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--chips-layout-gap-xs, 8px);
  width: 100%;
}

.chips-score-editor__segmented[data-scope="segmented-control"][data-part="root"] [data-part="item"] {
  min-height: var(--chips-layout-density-comfortable, 44px);
}

.chips-score-editor__rating[data-scope="rating"][data-part="root"] {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--chips-layout-gap-xs, 8px);
  width: 100%;
  --chips-comp-rating-item-size: var(--chips-layout-density-comfortable, 44px);
}

.chips-score-editor__rating[data-scope="rating"][data-part="root"] [data-part="item"] {
  width: 100%;
}

.chips-score-editor__number-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.chips-score-editor__number-grid [data-scope="number-input"][data-part="root"] {
  display: grid;
  gap: 8px;
}

.chips-score-editor__number-grid [data-scope="number-input"][data-part="control"] {
  width: 100%;
  min-height: var(--chips-layout-density-comfortable, 44px);
}

.chips-score-editor__preview {
  display: grid;
  gap: 8px;
}

.chips-score-editor__preview [data-scope="progress"][data-part="root"] {
  display: grid;
  gap: 6px;
  width: 100%;
}

.chips-score-editor__preview [data-scope="progress"][data-part="track"] {
  position: relative;
  display: block;
  width: 100%;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--chips-comp-progress-track-surface, var(--chips-sys-color-surface-container-highest, rgba(15, 23, 42, 0.12)));
}

.chips-score-editor__preview [data-scope="progress"][data-part="range"] {
  display: block;
  width: calc(var(--chips-progress-ratio, 0) * 100%);
  height: 100%;
  border-radius: inherit;
  background: var(--chips-comp-progress-range-surface, var(--chips-sys-color-primary, #2563eb));
}

.chips-score-editor__preview-value[data-scope="text"][data-part="root"] {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 13px;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}

.chips-score-editor__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
  padding: 0;
}

.chips-basecard-editor__errors {
  min-height: 0;
  color: var(--chips-sys-color-error, #d92d20);
  font-size: 13px;
}

.chips-basecard-editor__errors-list {
  margin: 0;
  padding-left: 18px;
}
`, tE = {
  stars: "score.style.stars",
  hearts: "score.style.hearts",
  score: "score.style.score",
  progress: "score.style.progress"
};
function su(r, o) {
  return new Intl.NumberFormat(o ?? "zh-CN", {
    maximumFractionDigits: 2
  }).format(r);
}
function Dp(r) {
  const o = Number(r);
  return Number.isFinite(o) ? o : 0;
}
function nE(r) {
  return r.style === "hearts" ? "heart" : "star";
}
function rE(r) {
  const [o, l] = _a.useState(() => nr(r.initialConfig)), u = _a.useRef(o), [d, f] = _a.useState(
    () => Yl(nr(r.initialConfig)).errors
  ), p = Dm(o.locale), m = _a.useMemo(() => Im(o), [o]), g = su(o.score, o.locale), v = su(o.total_score, o.locale), E = su(m * 100, o.locale), C = i.useId(), w = i.useId(), N = i.useId();
  _a.useEffect(() => {
    const b = nr(r.initialConfig);
    u.current = b, l(b), f(Yl(b).errors);
  }, [r.initialConfig]);
  function k(b) {
    const _ = nr({
      ...u.current,
      ...b
    }), I = Yl(_);
    u.current = _, l(_), f(I.errors), I.valid && r.onChange(_);
  }
  const S = Lc.map((b) => ({
    value: b,
    label: p(tE[b])
  }));
  return p("score.accessible.value", {
    score: g,
    total: v
  }), /* @__PURE__ */ qe.jsxs("div", { className: "chips-basecard-editor chips-basecard-editor--standard", children: [
    /* @__PURE__ */ qe.jsxs("section", { className: "chips-score-editor__group", "aria-labelledby": C, children: [
      /* @__PURE__ */ qe.jsx(tr, { as: "div", className: "chips-score-editor__label", id: C, children: p("score.style") }),
      /* @__PURE__ */ qe.jsx(
        am,
        {
          ariaLabelledBy: C,
          className: "chips-score-editor__segmented",
          options: S,
          value: o.style,
          onValueChange: (b) => {
            const _ = b;
            k({
              style: _,
              total_score: ea(_) ? Ta : o.total_score
            });
          }
        }
      )
    ] }),
    /* @__PURE__ */ qe.jsxs("section", { className: "chips-score-editor__group", "aria-labelledby": w, children: [
      /* @__PURE__ */ qe.jsx(tr, { as: "div", className: "chips-score-editor__label", id: w, children: p("score.earnedScore") }),
      ea(o.style) ? /* @__PURE__ */ qe.jsx(
        Ku,
        {
          ariaLabelledBy: w,
          className: "chips-score-editor__rating",
          count: Ta,
          getItemLabel: (b) => p("score.setScore", { score: b }),
          shape: nE(o),
          value: o.score,
          onValueChange: (b) => {
            k({ score: b, total_score: Ta });
          }
        }
      ) : /* @__PURE__ */ qe.jsxs("div", { className: "chips-score-editor__number-grid", children: [
        /* @__PURE__ */ qe.jsx(
          bu,
          {
            decrementLabel: p("score.totalScore.decrement"),
            incrementLabel: p("score.totalScore.increment"),
            label: p("score.totalScore"),
            max: ni,
            min: 1,
            step: 0.1,
            value: o.total_score,
            onInputChange: (b) => {
              k({ total_score: Dp(b) });
            },
            onValueChange: (b) => {
              k({ total_score: b ?? 1 });
            }
          }
        ),
        /* @__PURE__ */ qe.jsx(
          bu,
          {
            decrementLabel: p("score.scoreValue.decrement"),
            incrementLabel: p("score.scoreValue.increment"),
            label: p("score.scoreValue"),
            max: o.total_score,
            min: 0,
            step: 0.1,
            value: o.score,
            onInputChange: (b) => {
              k({ score: Dp(b) });
            },
            onValueChange: (b) => {
              k({ score: b ?? 0 });
            }
          }
        )
      ] }),
      o.style === "progress" ? /* @__PURE__ */ qe.jsxs("div", { className: "chips-score-editor__preview", children: [
        /* @__PURE__ */ qe.jsx("span", { className: "chips-score-editor__sr-only", id: N, children: p("score.progressPreview", {
          score: g,
          total: v,
          percent: E
        }) }),
        /* @__PURE__ */ qe.jsx(
          Uu,
          {
            "aria-labelledby": N,
            max: o.total_score,
            min: 0,
            value: o.score,
            valueText: p("score.progress.percent", { percent: E })
          }
        ),
        /* @__PURE__ */ qe.jsxs(tr, { "aria-hidden": "true", as: "div", className: "chips-score-editor__preview-value", children: [
          g,
          " / ",
          v
        ] })
      ] }) : null,
      /* @__PURE__ */ qe.jsx("div", { className: "chips-basecard-editor__errors", children: Object.keys(d).length > 0 ? /* @__PURE__ */ qe.jsx("ul", { className: "chips-basecard-editor__errors-list", children: Object.entries(d).map(([b, _]) => /* @__PURE__ */ qe.jsx("li", { children: p(_, { max: ni }) }, b)) }) : null })
    ] })
  ] });
}
function aE(r) {
  const o = document.createElement("div");
  o.setAttribute("data-chips-basecard-editor-root", "true"), o.style.width = "100%", o.style.height = "100%", o.style.minHeight = "0";
  const l = Rp.createRoot(o);
  return Lp.flushSync(() => {
    l.render(
      /* @__PURE__ */ qe.jsxs(qe.Fragment, { children: [
        /* @__PURE__ */ qe.jsx("style", { children: eE }),
        /* @__PURE__ */ qe.jsx(rE, { ...r })
      ] })
    );
  }), o.__chipsDispose = () => {
    l.unmount();
  }, o;
}
function uu(r) {
  return {
    height: r.style.height,
    minHeight: r.style.minHeight,
    width: r.style.width,
    overflow: r.style.overflow,
    display: r.style.display
  };
}
function cu(r, o) {
  r.style.height = o.height, r.style.minHeight = o.minHeight, r.style.width = o.width, r.style.overflow = o.overflow, r.style.display = o.display;
}
function oE(r) {
  const o = r.container.ownerDocument, l = o.documentElement, u = o.body, d = uu(l), f = uu(u), p = uu(r.container);
  for (l.style.width = "100%", l.style.height = "100%", l.style.minHeight = "0", l.style.overflow = "hidden", u.style.width = "100%", u.style.height = "100%", u.style.minHeight = "0", u.style.overflow = "hidden", r.container.style.display = "flex", r.container.style.width = "100%", r.container.style.height = "100%", r.container.style.minHeight = "0", r.container.style.overflow = "hidden"; r.container.firstChild; )
    r.container.removeChild(r.container.firstChild);
  const m = aE({
    initialConfig: r.initialConfig,
    onChange: r.onChange,
    resolveResourceUrl: r.resolveResourceUrl,
    releaseResourceUrl: r.releaseResourceUrl,
    importResource: r.importResource,
    importArchiveBundle: r.importArchiveBundle,
    deleteResource: r.deleteResource,
    convertTiffToPng: r.convertTiffToPng
  });
  return r.container.appendChild(m), () => {
    for (m.__chipsDispose?.(), cu(l, d), cu(u, f), cu(r.container, p); r.container.firstChild; )
      r.container.removeChild(r.container.firstChild);
  };
}
function lE(r) {
  return Jb(r);
}
function iE(r) {
  return oE(r);
}
const sE = {
  name: "star",
  decorative: !0
}, uE = {
  pluginId: "chips.basecard.score",
  cardType: "base.score",
  displayName: "评分基础卡片",
  description: "用星星、爱心、数字分数或进度条展示评分数据。",
  icon: sE,
  aliases: ["ScoreCard"],
  commitDebounceMs: 260,
  createInitialConfig(r) {
    return nr(
      Ba
    );
  },
  normalizeConfig(r, o) {
    return nr(r);
  },
  validateConfig(r) {
    return Yl(
      nr(r)
    );
  },
  collectResourcePaths(r) {
    return [];
  },
  renderView(r) {
    return lE({
      container: r.container,
      config: nr(r.config),
      themeCssText: r.themeCssText,
      resolveResourceUrl: r.resolveResourceUrl,
      releaseResourceUrl: r.releaseResourceUrl,
      openResource: r.openResource
    });
  },
  renderEditor(r) {
    return iE({
      container: r.container,
      initialConfig: nr(r.initialConfig),
      onChange(o) {
        r.onChange(o);
      },
      resolveResourceUrl: r.resolveResourceUrl,
      releaseResourceUrl: r.releaseResourceUrl,
      importResource: r.importResource,
      importArchiveBundle: r.importArchiveBundle,
      deleteResource: r.deleteResource,
      convertTiffToPng: r.convertTiffToPng
    });
  }
};
export {
  uE as basecardDefinition,
  iE as renderBasecardEditor,
  lE as renderBasecardView
};
