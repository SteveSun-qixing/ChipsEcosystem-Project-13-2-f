function bf(a) {
  return a && a.__esModule && Object.prototype.hasOwnProperty.call(a, "default") ? a.default : a;
}
var Li = { exports: {} }, F = {};
var Ia;
function ed() {
  if (Ia) return F;
  Ia = 1;
  var a = /* @__PURE__ */ Symbol.for("react.element"), v = /* @__PURE__ */ Symbol.for("react.portal"), m = /* @__PURE__ */ Symbol.for("react.fragment"), D = /* @__PURE__ */ Symbol.for("react.strict_mode"), V = /* @__PURE__ */ Symbol.for("react.profiler"), Z = /* @__PURE__ */ Symbol.for("react.provider"), Q = /* @__PURE__ */ Symbol.for("react.context"), le = /* @__PURE__ */ Symbol.for("react.forward_ref"), $ = /* @__PURE__ */ Symbol.for("react.suspense"), ye = /* @__PURE__ */ Symbol.for("react.memo"), he = /* @__PURE__ */ Symbol.for("react.lazy"), X = Symbol.iterator;
  function O(f) {
    return f === null || typeof f != "object" ? null : (f = X && f[X] || f["@@iterator"], typeof f == "function" ? f : null);
  }
  var ae = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, ce = Object.assign, J = {};
  function G(f, g, I) {
    this.props = f, this.context = g, this.refs = J, this.updater = I || ae;
  }
  G.prototype.isReactComponent = {}, G.prototype.setState = function(f, g) {
    if (typeof f != "object" && typeof f != "function" && f != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, f, g, "setState");
  }, G.prototype.forceUpdate = function(f) {
    this.updater.enqueueForceUpdate(this, f, "forceUpdate");
  };
  function vt() {
  }
  vt.prototype = G.prototype;
  function st(f, g, I) {
    this.props = f, this.context = g, this.refs = J, this.updater = I || ae;
  }
  var qe = st.prototype = new vt();
  qe.constructor = st, ce(qe, G.prototype), qe.isPureReactComponent = !0;
  var xe = Array.isArray, be = Object.prototype.hasOwnProperty, Pe = { current: null }, Le = { key: !0, ref: !0, __self: !0, __source: !0 };
  function $e(f, g, I) {
    var U, A = {}, H = null, q = null;
    if (g != null) for (U in g.ref !== void 0 && (q = g.ref), g.key !== void 0 && (H = "" + g.key), g) be.call(g, U) && !Le.hasOwnProperty(U) && (A[U] = g[U]);
    var K = arguments.length - 2;
    if (K === 1) A.children = I;
    else if (1 < K) {
      for (var ne = Array(K), Ve = 0; Ve < K; Ve++) ne[Ve] = arguments[Ve + 2];
      A.children = ne;
    }
    if (f && f.defaultProps) for (U in K = f.defaultProps, K) A[U] === void 0 && (A[U] = K[U]);
    return { $$typeof: a, type: f, key: H, ref: q, props: A, _owner: Pe.current };
  }
  function zt(f, g) {
    return { $$typeof: a, type: f.type, key: g, ref: f.ref, props: f.props, _owner: f._owner };
  }
  function yt(f) {
    return typeof f == "object" && f !== null && f.$$typeof === a;
  }
  function Yt(f) {
    var g = { "=": "=0", ":": "=2" };
    return "$" + f.replace(/[=:]/g, function(I) {
      return g[I];
    });
  }
  var at = /\/+/g;
  function Be(f, g) {
    return typeof f == "object" && f !== null && f.key != null ? Yt("" + f.key) : g.toString(36);
  }
  function et(f, g, I, U, A) {
    var H = typeof f;
    (H === "undefined" || H === "boolean") && (f = null);
    var q = !1;
    if (f === null) q = !0;
    else switch (H) {
      case "string":
      case "number":
        q = !0;
        break;
      case "object":
        switch (f.$$typeof) {
          case a:
          case v:
            q = !0;
        }
    }
    if (q) return q = f, A = A(q), f = U === "" ? "." + Be(q, 0) : U, xe(A) ? (I = "", f != null && (I = f.replace(at, "$&/") + "/"), et(A, g, I, "", function(Ve) {
      return Ve;
    })) : A != null && (yt(A) && (A = zt(A, I + (!A.key || q && q.key === A.key ? "" : ("" + A.key).replace(at, "$&/") + "/") + f)), g.push(A)), 1;
    if (q = 0, U = U === "" ? "." : U + ":", xe(f)) for (var K = 0; K < f.length; K++) {
      H = f[K];
      var ne = U + Be(H, K);
      q += et(H, g, I, ne, A);
    }
    else if (ne = O(f), typeof ne == "function") for (f = ne.call(f), K = 0; !(H = f.next()).done; ) H = H.value, ne = U + Be(H, K++), q += et(H, g, I, ne, A);
    else if (H === "object") throw g = String(f), Error("Objects are not valid as a React child (found: " + (g === "[object Object]" ? "object with keys {" + Object.keys(f).join(", ") + "}" : g) + "). If you meant to render a collection of children, use an array instead.");
    return q;
  }
  function ct(f, g, I) {
    if (f == null) return f;
    var U = [], A = 0;
    return et(f, U, "", "", function(H) {
      return g.call(I, H, A++);
    }), U;
  }
  function je(f) {
    if (f._status === -1) {
      var g = f._result;
      g = g(), g.then(function(I) {
        (f._status === 0 || f._status === -1) && (f._status = 1, f._result = I);
      }, function(I) {
        (f._status === 0 || f._status === -1) && (f._status = 2, f._result = I);
      }), f._status === -1 && (f._status = 0, f._result = g);
    }
    if (f._status === 1) return f._result.default;
    throw f._result;
  }
  var ue = { current: null }, k = { transition: null }, L = { ReactCurrentDispatcher: ue, ReactCurrentBatchConfig: k, ReactCurrentOwner: Pe };
  function C() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return F.Children = { map: ct, forEach: function(f, g, I) {
    ct(f, function() {
      g.apply(this, arguments);
    }, I);
  }, count: function(f) {
    var g = 0;
    return ct(f, function() {
      g++;
    }), g;
  }, toArray: function(f) {
    return ct(f, function(g) {
      return g;
    }) || [];
  }, only: function(f) {
    if (!yt(f)) throw Error("React.Children.only expected to receive a single React element child.");
    return f;
  } }, F.Component = G, F.Fragment = m, F.Profiler = V, F.PureComponent = st, F.StrictMode = D, F.Suspense = $, F.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = L, F.act = C, F.cloneElement = function(f, g, I) {
    if (f == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + f + ".");
    var U = ce({}, f.props), A = f.key, H = f.ref, q = f._owner;
    if (g != null) {
      if (g.ref !== void 0 && (H = g.ref, q = Pe.current), g.key !== void 0 && (A = "" + g.key), f.type && f.type.defaultProps) var K = f.type.defaultProps;
      for (ne in g) be.call(g, ne) && !Le.hasOwnProperty(ne) && (U[ne] = g[ne] === void 0 && K !== void 0 ? K[ne] : g[ne]);
    }
    var ne = arguments.length - 2;
    if (ne === 1) U.children = I;
    else if (1 < ne) {
      K = Array(ne);
      for (var Ve = 0; Ve < ne; Ve++) K[Ve] = arguments[Ve + 2];
      U.children = K;
    }
    return { $$typeof: a, type: f.type, key: A, ref: H, props: U, _owner: q };
  }, F.createContext = function(f) {
    return f = { $$typeof: Q, _currentValue: f, _currentValue2: f, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, f.Provider = { $$typeof: Z, _context: f }, f.Consumer = f;
  }, F.createElement = $e, F.createFactory = function(f) {
    var g = $e.bind(null, f);
    return g.type = f, g;
  }, F.createRef = function() {
    return { current: null };
  }, F.forwardRef = function(f) {
    return { $$typeof: le, render: f };
  }, F.isValidElement = yt, F.lazy = function(f) {
    return { $$typeof: he, _payload: { _status: -1, _result: f }, _init: je };
  }, F.memo = function(f, g) {
    return { $$typeof: ye, type: f, compare: g === void 0 ? null : g };
  }, F.startTransition = function(f) {
    var g = k.transition;
    k.transition = {};
    try {
      f();
    } finally {
      k.transition = g;
    }
  }, F.unstable_act = C, F.useCallback = function(f, g) {
    return ue.current.useCallback(f, g);
  }, F.useContext = function(f) {
    return ue.current.useContext(f);
  }, F.useDebugValue = function() {
  }, F.useDeferredValue = function(f) {
    return ue.current.useDeferredValue(f);
  }, F.useEffect = function(f, g) {
    return ue.current.useEffect(f, g);
  }, F.useId = function() {
    return ue.current.useId();
  }, F.useImperativeHandle = function(f, g, I) {
    return ue.current.useImperativeHandle(f, g, I);
  }, F.useInsertionEffect = function(f, g) {
    return ue.current.useInsertionEffect(f, g);
  }, F.useLayoutEffect = function(f, g) {
    return ue.current.useLayoutEffect(f, g);
  }, F.useMemo = function(f, g) {
    return ue.current.useMemo(f, g);
  }, F.useReducer = function(f, g, I) {
    return ue.current.useReducer(f, g, I);
  }, F.useRef = function(f) {
    return ue.current.useRef(f);
  }, F.useState = function(f) {
    return ue.current.useState(f);
  }, F.useSyncExternalStore = function(f, g, I) {
    return ue.current.useSyncExternalStore(f, g, I);
  }, F.useTransition = function() {
    return ue.current.useTransition();
  }, F.version = "18.3.1", F;
}
var Fa;
function Bi() {
  return Fa || (Fa = 1, Li.exports = ed()), Li.exports;
}
var On = Bi();
const Ml = /* @__PURE__ */ bf(On);
var ji = { exports: {} }, Ue = {}, Mi = { exports: {} }, Oi = {};
var Ua;
function td() {
  return Ua || (Ua = 1, (function(a) {
    function v(k, L) {
      var C = k.length;
      k.push(L);
      e: for (; 0 < C; ) {
        var f = C - 1 >>> 1, g = k[f];
        if (0 < V(g, L)) k[f] = L, k[C] = g, C = f;
        else break e;
      }
    }
    function m(k) {
      return k.length === 0 ? null : k[0];
    }
    function D(k) {
      if (k.length === 0) return null;
      var L = k[0], C = k.pop();
      if (C !== L) {
        k[0] = C;
        e: for (var f = 0, g = k.length, I = g >>> 1; f < I; ) {
          var U = 2 * (f + 1) - 1, A = k[U], H = U + 1, q = k[H];
          if (0 > V(A, C)) H < g && 0 > V(q, A) ? (k[f] = q, k[H] = C, f = H) : (k[f] = A, k[U] = C, f = U);
          else if (H < g && 0 > V(q, C)) k[f] = q, k[H] = C, f = H;
          else break e;
        }
      }
      return L;
    }
    function V(k, L) {
      var C = k.sortIndex - L.sortIndex;
      return C !== 0 ? C : k.id - L.id;
    }
    if (typeof performance == "object" && typeof performance.now == "function") {
      var Z = performance;
      a.unstable_now = function() {
        return Z.now();
      };
    } else {
      var Q = Date, le = Q.now();
      a.unstable_now = function() {
        return Q.now() - le;
      };
    }
    var $ = [], ye = [], he = 1, X = null, O = 3, ae = !1, ce = !1, J = !1, G = typeof setTimeout == "function" ? setTimeout : null, vt = typeof clearTimeout == "function" ? clearTimeout : null, st = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function qe(k) {
      for (var L = m(ye); L !== null; ) {
        if (L.callback === null) D(ye);
        else if (L.startTime <= k) D(ye), L.sortIndex = L.expirationTime, v($, L);
        else break;
        L = m(ye);
      }
    }
    function xe(k) {
      if (J = !1, qe(k), !ce) if (m($) !== null) ce = !0, je(be);
      else {
        var L = m(ye);
        L !== null && ue(xe, L.startTime - k);
      }
    }
    function be(k, L) {
      ce = !1, J && (J = !1, vt($e), $e = -1), ae = !0;
      var C = O;
      try {
        for (qe(L), X = m($); X !== null && (!(X.expirationTime > L) || k && !Yt()); ) {
          var f = X.callback;
          if (typeof f == "function") {
            X.callback = null, O = X.priorityLevel;
            var g = f(X.expirationTime <= L);
            L = a.unstable_now(), typeof g == "function" ? X.callback = g : X === m($) && D($), qe(L);
          } else D($);
          X = m($);
        }
        if (X !== null) var I = !0;
        else {
          var U = m(ye);
          U !== null && ue(xe, U.startTime - L), I = !1;
        }
        return I;
      } finally {
        X = null, O = C, ae = !1;
      }
    }
    var Pe = !1, Le = null, $e = -1, zt = 5, yt = -1;
    function Yt() {
      return !(a.unstable_now() - yt < zt);
    }
    function at() {
      if (Le !== null) {
        var k = a.unstable_now();
        yt = k;
        var L = !0;
        try {
          L = Le(!0, k);
        } finally {
          L ? Be() : (Pe = !1, Le = null);
        }
      } else Pe = !1;
    }
    var Be;
    if (typeof st == "function") Be = function() {
      st(at);
    };
    else if (typeof MessageChannel < "u") {
      var et = new MessageChannel(), ct = et.port2;
      et.port1.onmessage = at, Be = function() {
        ct.postMessage(null);
      };
    } else Be = function() {
      G(at, 0);
    };
    function je(k) {
      Le = k, Pe || (Pe = !0, Be());
    }
    function ue(k, L) {
      $e = G(function() {
        k(a.unstable_now());
      }, L);
    }
    a.unstable_IdlePriority = 5, a.unstable_ImmediatePriority = 1, a.unstable_LowPriority = 4, a.unstable_NormalPriority = 3, a.unstable_Profiling = null, a.unstable_UserBlockingPriority = 2, a.unstable_cancelCallback = function(k) {
      k.callback = null;
    }, a.unstable_continueExecution = function() {
      ce || ae || (ce = !0, je(be));
    }, a.unstable_forceFrameRate = function(k) {
      0 > k || 125 < k ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : zt = 0 < k ? Math.floor(1e3 / k) : 5;
    }, a.unstable_getCurrentPriorityLevel = function() {
      return O;
    }, a.unstable_getFirstCallbackNode = function() {
      return m($);
    }, a.unstable_next = function(k) {
      switch (O) {
        case 1:
        case 2:
        case 3:
          var L = 3;
          break;
        default:
          L = O;
      }
      var C = O;
      O = L;
      try {
        return k();
      } finally {
        O = C;
      }
    }, a.unstable_pauseExecution = function() {
    }, a.unstable_requestPaint = function() {
    }, a.unstable_runWithPriority = function(k, L) {
      switch (k) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          k = 3;
      }
      var C = O;
      O = k;
      try {
        return L();
      } finally {
        O = C;
      }
    }, a.unstable_scheduleCallback = function(k, L, C) {
      var f = a.unstable_now();
      switch (typeof C == "object" && C !== null ? (C = C.delay, C = typeof C == "number" && 0 < C ? f + C : f) : C = f, k) {
        case 1:
          var g = -1;
          break;
        case 2:
          g = 250;
          break;
        case 5:
          g = 1073741823;
          break;
        case 4:
          g = 1e4;
          break;
        default:
          g = 5e3;
      }
      return g = C + g, k = { id: he++, callback: L, priorityLevel: k, startTime: C, expirationTime: g, sortIndex: -1 }, C > f ? (k.sortIndex = C, v(ye, k), m($) === null && k === m(ye) && (J ? (vt($e), $e = -1) : J = !0, ue(xe, C - f))) : (k.sortIndex = g, v($, k), ce || ae || (ce = !0, je(be))), k;
    }, a.unstable_shouldYield = Yt, a.unstable_wrapCallback = function(k) {
      var L = O;
      return function() {
        var C = O;
        O = L;
        try {
          return k.apply(this, arguments);
        } finally {
          O = C;
        }
      };
    };
  })(Oi)), Oi;
}
var Ba;
function nd() {
  return Ba || (Ba = 1, Mi.exports = td()), Mi.exports;
}
var Va;
function rd() {
  if (Va) return Ue;
  Va = 1;
  var a = Bi(), v = nd();
  function m(e) {
    for (var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, n = 1; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
    return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  var D = /* @__PURE__ */ new Set(), V = {};
  function Z(e, t) {
    Q(e, t), Q(e + "Capture", t);
  }
  function Q(e, t) {
    for (V[e] = t, e = 0; e < t.length; e++) D.add(t[e]);
  }
  var le = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), $ = Object.prototype.hasOwnProperty, ye = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, he = {}, X = {};
  function O(e) {
    return $.call(X, e) ? !0 : $.call(he, e) ? !1 : ye.test(e) ? X[e] = !0 : (he[e] = !0, !1);
  }
  function ae(e, t, n, r) {
    if (n !== null && n.type === 0) return !1;
    switch (typeof t) {
      case "function":
      case "symbol":
        return !0;
      case "boolean":
        return r ? !1 : n !== null ? !n.acceptsBooleans : (e = e.toLowerCase().slice(0, 5), e !== "data-" && e !== "aria-");
      default:
        return !1;
    }
  }
  function ce(e, t, n, r) {
    if (t === null || typeof t > "u" || ae(e, t, n, r)) return !0;
    if (r) return !1;
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
  function J(e, t, n, r, l, o, i) {
    this.acceptsBooleans = t === 2 || t === 3 || t === 4, this.attributeName = r, this.attributeNamespace = l, this.mustUseProperty = n, this.propertyName = e, this.type = t, this.sanitizeURL = o, this.removeEmptyString = i;
  }
  var G = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e) {
    G[e] = new J(e, 0, !1, e, null, !1, !1);
  }), [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(e) {
    var t = e[0];
    G[t] = new J(t, 1, !1, e[1], null, !1, !1);
  }), ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(e) {
    G[e] = new J(e, 2, !1, e.toLowerCase(), null, !1, !1);
  }), ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(e) {
    G[e] = new J(e, 2, !1, e, null, !1, !1);
  }), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e) {
    G[e] = new J(e, 3, !1, e.toLowerCase(), null, !1, !1);
  }), ["checked", "multiple", "muted", "selected"].forEach(function(e) {
    G[e] = new J(e, 3, !0, e, null, !1, !1);
  }), ["capture", "download"].forEach(function(e) {
    G[e] = new J(e, 4, !1, e, null, !1, !1);
  }), ["cols", "rows", "size", "span"].forEach(function(e) {
    G[e] = new J(e, 6, !1, e, null, !1, !1);
  }), ["rowSpan", "start"].forEach(function(e) {
    G[e] = new J(e, 5, !1, e.toLowerCase(), null, !1, !1);
  });
  var vt = /[\-:]([a-z])/g;
  function st(e) {
    return e[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e) {
    var t = e.replace(
      vt,
      st
    );
    G[t] = new J(t, 1, !1, e, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e) {
    var t = e.replace(vt, st);
    G[t] = new J(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(e) {
    var t = e.replace(vt, st);
    G[t] = new J(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(e) {
    G[e] = new J(e, 1, !1, e.toLowerCase(), null, !1, !1);
  }), G.xlinkHref = new J("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(e) {
    G[e] = new J(e, 1, !1, e.toLowerCase(), null, !0, !0);
  });
  function qe(e, t, n, r) {
    var l = G.hasOwnProperty(t) ? G[t] : null;
    (l !== null ? l.type !== 0 : r || !(2 < t.length) || t[0] !== "o" && t[0] !== "O" || t[1] !== "n" && t[1] !== "N") && (ce(t, n, l, r) && (n = null), r || l === null ? O(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n)) : l.mustUseProperty ? e[l.propertyName] = n === null ? l.type === 3 ? !1 : "" : n : (t = l.attributeName, r = l.attributeNamespace, n === null ? e.removeAttribute(t) : (l = l.type, n = l === 3 || l === 4 && n === !0 ? "" : "" + n, r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
  }
  var xe = a.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, be = /* @__PURE__ */ Symbol.for("react.element"), Pe = /* @__PURE__ */ Symbol.for("react.portal"), Le = /* @__PURE__ */ Symbol.for("react.fragment"), $e = /* @__PURE__ */ Symbol.for("react.strict_mode"), zt = /* @__PURE__ */ Symbol.for("react.profiler"), yt = /* @__PURE__ */ Symbol.for("react.provider"), Yt = /* @__PURE__ */ Symbol.for("react.context"), at = /* @__PURE__ */ Symbol.for("react.forward_ref"), Be = /* @__PURE__ */ Symbol.for("react.suspense"), et = /* @__PURE__ */ Symbol.for("react.suspense_list"), ct = /* @__PURE__ */ Symbol.for("react.memo"), je = /* @__PURE__ */ Symbol.for("react.lazy"), ue = /* @__PURE__ */ Symbol.for("react.offscreen"), k = Symbol.iterator;
  function L(e) {
    return e === null || typeof e != "object" ? null : (e = k && e[k] || e["@@iterator"], typeof e == "function" ? e : null);
  }
  var C = Object.assign, f;
  function g(e) {
    if (f === void 0) try {
      throw Error();
    } catch (n) {
      var t = n.stack.trim().match(/\n( *(at )?)/);
      f = t && t[1] || "";
    }
    return `
` + f + e;
  }
  var I = !1;
  function U(e, t) {
    if (!e || I) return "";
    I = !0;
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
        } catch (h) {
          var r = h;
        }
        Reflect.construct(e, [], t);
      } else {
        try {
          t.call();
        } catch (h) {
          r = h;
        }
        e.call(t.prototype);
      }
      else {
        try {
          throw Error();
        } catch (h) {
          r = h;
        }
        e();
      }
    } catch (h) {
      if (h && r && typeof h.stack == "string") {
        for (var l = h.stack.split(`
`), o = r.stack.split(`
`), i = l.length - 1, u = o.length - 1; 1 <= i && 0 <= u && l[i] !== o[u]; ) u--;
        for (; 1 <= i && 0 <= u; i--, u--) if (l[i] !== o[u]) {
          if (i !== 1 || u !== 1)
            do
              if (i--, u--, 0 > u || l[i] !== o[u]) {
                var s = `
` + l[i].replace(" at new ", " at ");
                return e.displayName && s.includes("<anonymous>") && (s = s.replace("<anonymous>", e.displayName)), s;
              }
            while (1 <= i && 0 <= u);
          break;
        }
      }
    } finally {
      I = !1, Error.prepareStackTrace = n;
    }
    return (e = e ? e.displayName || e.name : "") ? g(e) : "";
  }
  function A(e) {
    switch (e.tag) {
      case 5:
        return g(e.type);
      case 16:
        return g("Lazy");
      case 13:
        return g("Suspense");
      case 19:
        return g("SuspenseList");
      case 0:
      case 2:
      case 15:
        return e = U(e.type, !1), e;
      case 11:
        return e = U(e.type.render, !1), e;
      case 1:
        return e = U(e.type, !0), e;
      default:
        return "";
    }
  }
  function H(e) {
    if (e == null) return null;
    if (typeof e == "function") return e.displayName || e.name || null;
    if (typeof e == "string") return e;
    switch (e) {
      case Le:
        return "Fragment";
      case Pe:
        return "Portal";
      case zt:
        return "Profiler";
      case $e:
        return "StrictMode";
      case Be:
        return "Suspense";
      case et:
        return "SuspenseList";
    }
    if (typeof e == "object") switch (e.$$typeof) {
      case Yt:
        return (e.displayName || "Context") + ".Consumer";
      case yt:
        return (e._context.displayName || "Context") + ".Provider";
      case at:
        var t = e.render;
        return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
      case ct:
        return t = e.displayName || null, t !== null ? t : H(e.type) || "Memo";
      case je:
        t = e._payload, e = e._init;
        try {
          return H(e(t));
        } catch {
        }
    }
    return null;
  }
  function q(e) {
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
        return H(t);
      case 8:
        return t === $e ? "StrictMode" : "Mode";
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
  function K(e) {
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
  function ne(e) {
    var t = e.type;
    return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function Ve(e) {
    var t = ne(e) ? "checked" : "value", n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t), r = "" + e[t];
    if (!e.hasOwnProperty(t) && typeof n < "u" && typeof n.get == "function" && typeof n.set == "function") {
      var l = n.get, o = n.set;
      return Object.defineProperty(e, t, { configurable: !0, get: function() {
        return l.call(this);
      }, set: function(i) {
        r = "" + i, o.call(this, i);
      } }), Object.defineProperty(e, t, { enumerable: n.enumerable }), { getValue: function() {
        return r;
      }, setValue: function(i) {
        r = "" + i;
      }, stopTracking: function() {
        e._valueTracker = null, delete e[t];
      } };
    }
  }
  function xr(e) {
    e._valueTracker || (e._valueTracker = Ve(e));
  }
  function Hi(e) {
    if (!e) return !1;
    var t = e._valueTracker;
    if (!t) return !0;
    var n = t.getValue(), r = "";
    return e && (r = ne(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n ? (t.setValue(e), !0) : !1;
  }
  function Er(e) {
    if (e = e || (typeof document < "u" ? document : void 0), typeof e > "u") return null;
    try {
      return e.activeElement || e.body;
    } catch {
      return e.body;
    }
  }
  function Fl(e, t) {
    var n = t.checked;
    return C({}, t, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: n ?? e._wrapperState.initialChecked });
  }
  function Wi(e, t) {
    var n = t.defaultValue == null ? "" : t.defaultValue, r = t.checked != null ? t.checked : t.defaultChecked;
    n = K(t.value != null ? t.value : n), e._wrapperState = { initialChecked: r, initialValue: n, controlled: t.type === "checkbox" || t.type === "radio" ? t.checked != null : t.value != null };
  }
  function Qi(e, t) {
    t = t.checked, t != null && qe(e, "checked", t, !1);
  }
  function Ul(e, t) {
    Qi(e, t);
    var n = K(t.value), r = t.type;
    if (n != null) r === "number" ? (n === 0 && e.value === "" || e.value != n) && (e.value = "" + n) : e.value !== "" + n && (e.value = "" + n);
    else if (r === "submit" || r === "reset") {
      e.removeAttribute("value");
      return;
    }
    t.hasOwnProperty("value") ? Bl(e, t.type, n) : t.hasOwnProperty("defaultValue") && Bl(e, t.type, K(t.defaultValue)), t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
  }
  function $i(e, t, n) {
    if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
      var r = t.type;
      if (!(r !== "submit" && r !== "reset" || t.value !== void 0 && t.value !== null)) return;
      t = "" + e._wrapperState.initialValue, n || t === e.value || (e.value = t), e.defaultValue = t;
    }
    n = e.name, n !== "" && (e.name = ""), e.defaultChecked = !!e._wrapperState.initialChecked, n !== "" && (e.name = n);
  }
  function Bl(e, t, n) {
    (t !== "number" || Er(e.ownerDocument) !== e) && (n == null ? e.defaultValue = "" + e._wrapperState.initialValue : e.defaultValue !== "" + n && (e.defaultValue = "" + n));
  }
  var Fn = Array.isArray;
  function an(e, t, n, r) {
    if (e = e.options, t) {
      t = {};
      for (var l = 0; l < n.length; l++) t["$" + n[l]] = !0;
      for (n = 0; n < e.length; n++) l = t.hasOwnProperty("$" + e[n].value), e[n].selected !== l && (e[n].selected = l), l && r && (e[n].defaultSelected = !0);
    } else {
      for (n = "" + K(n), t = null, l = 0; l < e.length; l++) {
        if (e[l].value === n) {
          e[l].selected = !0, r && (e[l].defaultSelected = !0);
          return;
        }
        t !== null || e[l].disabled || (t = e[l]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function Vl(e, t) {
    if (t.dangerouslySetInnerHTML != null) throw Error(m(91));
    return C({}, t, { value: void 0, defaultValue: void 0, children: "" + e._wrapperState.initialValue });
  }
  function Ki(e, t) {
    var n = t.value;
    if (n == null) {
      if (n = t.children, t = t.defaultValue, n != null) {
        if (t != null) throw Error(m(92));
        if (Fn(n)) {
          if (1 < n.length) throw Error(m(93));
          n = n[0];
        }
        t = n;
      }
      t == null && (t = ""), n = t;
    }
    e._wrapperState = { initialValue: K(n) };
  }
  function Yi(e, t) {
    var n = K(t.value), r = K(t.defaultValue);
    n != null && (n = "" + n, n !== e.value && (e.value = n), t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)), r != null && (e.defaultValue = "" + r);
  }
  function Xi(e) {
    var t = e.textContent;
    t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
  }
  function Gi(e) {
    switch (e) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function Al(e, t) {
    return e == null || e === "http://www.w3.org/1999/xhtml" ? Gi(t) : e === "http://www.w3.org/2000/svg" && t === "foreignObject" ? "http://www.w3.org/1999/xhtml" : e;
  }
  var Cr, Zi = (function(e) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(t, n, r, l) {
      MSApp.execUnsafeLocalFunction(function() {
        return e(t, n, r, l);
      });
    } : e;
  })(function(e, t) {
    if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e) e.innerHTML = t;
    else {
      for (Cr = Cr || document.createElement("div"), Cr.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>", t = Cr.firstChild; e.firstChild; ) e.removeChild(e.firstChild);
      for (; t.firstChild; ) e.appendChild(t.firstChild);
    }
  });
  function Un(e, t) {
    if (t) {
      var n = e.firstChild;
      if (n && n === e.lastChild && n.nodeType === 3) {
        n.nodeValue = t;
        return;
      }
    }
    e.textContent = t;
  }
  var Bn = {
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
  }, nc = ["Webkit", "ms", "Moz", "O"];
  Object.keys(Bn).forEach(function(e) {
    nc.forEach(function(t) {
      t = t + e.charAt(0).toUpperCase() + e.substring(1), Bn[t] = Bn[e];
    });
  });
  function Ji(e, t, n) {
    return t == null || typeof t == "boolean" || t === "" ? "" : n || typeof t != "number" || t === 0 || Bn.hasOwnProperty(e) && Bn[e] ? ("" + t).trim() : t + "px";
  }
  function qi(e, t) {
    e = e.style;
    for (var n in t) if (t.hasOwnProperty(n)) {
      var r = n.indexOf("--") === 0, l = Ji(n, t[n], r);
      n === "float" && (n = "cssFloat"), r ? e.setProperty(n, l) : e[n] = l;
    }
  }
  var rc = C({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function Hl(e, t) {
    if (t) {
      if (rc[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(m(137, e));
      if (t.dangerouslySetInnerHTML != null) {
        if (t.children != null) throw Error(m(60));
        if (typeof t.dangerouslySetInnerHTML != "object" || !("__html" in t.dangerouslySetInnerHTML)) throw Error(m(61));
      }
      if (t.style != null && typeof t.style != "object") throw Error(m(62));
    }
  }
  function Wl(e, t) {
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
  var Ql = null;
  function $l(e) {
    return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
  }
  var Kl = null, cn = null, fn = null;
  function bi(e) {
    if (e = ur(e)) {
      if (typeof Kl != "function") throw Error(m(280));
      var t = e.stateNode;
      t && (t = Xr(t), Kl(e.stateNode, e.type, t));
    }
  }
  function eu(e) {
    cn ? fn ? fn.push(e) : fn = [e] : cn = e;
  }
  function tu() {
    if (cn) {
      var e = cn, t = fn;
      if (fn = cn = null, bi(e), t) for (e = 0; e < t.length; e++) bi(t[e]);
    }
  }
  function nu(e, t) {
    return e(t);
  }
  function ru() {
  }
  var Yl = !1;
  function lu(e, t, n) {
    if (Yl) return e(t, n);
    Yl = !0;
    try {
      return nu(e, t, n);
    } finally {
      Yl = !1, (cn !== null || fn !== null) && (ru(), tu());
    }
  }
  function Vn(e, t) {
    var n = e.stateNode;
    if (n === null) return null;
    var r = Xr(n);
    if (r === null) return null;
    n = r[t];
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
        (r = !r.disabled) || (e = e.type, r = !(e === "button" || e === "input" || e === "select" || e === "textarea")), e = !r;
        break e;
      default:
        e = !1;
    }
    if (e) return null;
    if (n && typeof n != "function") throw Error(m(231, t, typeof n));
    return n;
  }
  var Xl = !1;
  if (le) try {
    var An = {};
    Object.defineProperty(An, "passive", { get: function() {
      Xl = !0;
    } }), window.addEventListener("test", An, An), window.removeEventListener("test", An, An);
  } catch {
    Xl = !1;
  }
  function lc(e, t, n, r, l, o, i, u, s) {
    var h = Array.prototype.slice.call(arguments, 3);
    try {
      t.apply(n, h);
    } catch (w) {
      this.onError(w);
    }
  }
  var Hn = !1, Nr = null, zr = !1, Gl = null, oc = { onError: function(e) {
    Hn = !0, Nr = e;
  } };
  function ic(e, t, n, r, l, o, i, u, s) {
    Hn = !1, Nr = null, lc.apply(oc, arguments);
  }
  function uc(e, t, n, r, l, o, i, u, s) {
    if (ic.apply(this, arguments), Hn) {
      if (Hn) {
        var h = Nr;
        Hn = !1, Nr = null;
      } else throw Error(m(198));
      zr || (zr = !0, Gl = h);
    }
  }
  function Xt(e) {
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
  function ou(e) {
    if (e.tag === 13) {
      var t = e.memoizedState;
      if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function iu(e) {
    if (Xt(e) !== e) throw Error(m(188));
  }
  function sc(e) {
    var t = e.alternate;
    if (!t) {
      if (t = Xt(e), t === null) throw Error(m(188));
      return t !== e ? null : e;
    }
    for (var n = e, r = t; ; ) {
      var l = n.return;
      if (l === null) break;
      var o = l.alternate;
      if (o === null) {
        if (r = l.return, r !== null) {
          n = r;
          continue;
        }
        break;
      }
      if (l.child === o.child) {
        for (o = l.child; o; ) {
          if (o === n) return iu(l), e;
          if (o === r) return iu(l), t;
          o = o.sibling;
        }
        throw Error(m(188));
      }
      if (n.return !== r.return) n = l, r = o;
      else {
        for (var i = !1, u = l.child; u; ) {
          if (u === n) {
            i = !0, n = l, r = o;
            break;
          }
          if (u === r) {
            i = !0, r = l, n = o;
            break;
          }
          u = u.sibling;
        }
        if (!i) {
          for (u = o.child; u; ) {
            if (u === n) {
              i = !0, n = o, r = l;
              break;
            }
            if (u === r) {
              i = !0, r = o, n = l;
              break;
            }
            u = u.sibling;
          }
          if (!i) throw Error(m(189));
        }
      }
      if (n.alternate !== r) throw Error(m(190));
    }
    if (n.tag !== 3) throw Error(m(188));
    return n.stateNode.current === n ? e : t;
  }
  function uu(e) {
    return e = sc(e), e !== null ? su(e) : null;
  }
  function su(e) {
    if (e.tag === 5 || e.tag === 6) return e;
    for (e = e.child; e !== null; ) {
      var t = su(e);
      if (t !== null) return t;
      e = e.sibling;
    }
    return null;
  }
  var au = v.unstable_scheduleCallback, cu = v.unstable_cancelCallback, ac = v.unstable_shouldYield, cc = v.unstable_requestPaint, fe = v.unstable_now, fc = v.unstable_getCurrentPriorityLevel, Zl = v.unstable_ImmediatePriority, fu = v.unstable_UserBlockingPriority, Pr = v.unstable_NormalPriority, dc = v.unstable_LowPriority, du = v.unstable_IdlePriority, Tr = null, ft = null;
  function pc(e) {
    if (ft && typeof ft.onCommitFiberRoot == "function") try {
      ft.onCommitFiberRoot(Tr, e, void 0, (e.current.flags & 128) === 128);
    } catch {
    }
  }
  var tt = Math.clz32 ? Math.clz32 : vc, hc = Math.log, mc = Math.LN2;
  function vc(e) {
    return e >>>= 0, e === 0 ? 32 : 31 - (hc(e) / mc | 0) | 0;
  }
  var Rr = 64, Lr = 4194304;
  function Wn(e) {
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
  function jr(e, t) {
    var n = e.pendingLanes;
    if (n === 0) return 0;
    var r = 0, l = e.suspendedLanes, o = e.pingedLanes, i = n & 268435455;
    if (i !== 0) {
      var u = i & ~l;
      u !== 0 ? r = Wn(u) : (o &= i, o !== 0 && (r = Wn(o)));
    } else i = n & ~l, i !== 0 ? r = Wn(i) : o !== 0 && (r = Wn(o));
    if (r === 0) return 0;
    if (t !== 0 && t !== r && (t & l) === 0 && (l = r & -r, o = t & -t, l >= o || l === 16 && (o & 4194240) !== 0)) return t;
    if ((r & 4) !== 0 && (r |= n & 16), t = e.entangledLanes, t !== 0) for (e = e.entanglements, t &= r; 0 < t; ) n = 31 - tt(t), l = 1 << n, r |= e[n], t &= ~l;
    return r;
  }
  function yc(e, t) {
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
  function gc(e, t) {
    for (var n = e.suspendedLanes, r = e.pingedLanes, l = e.expirationTimes, o = e.pendingLanes; 0 < o; ) {
      var i = 31 - tt(o), u = 1 << i, s = l[i];
      s === -1 ? ((u & n) === 0 || (u & r) !== 0) && (l[i] = yc(u, t)) : s <= t && (e.expiredLanes |= u), o &= ~u;
    }
  }
  function Jl(e) {
    return e = e.pendingLanes & -1073741825, e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
  }
  function pu() {
    var e = Rr;
    return Rr <<= 1, (Rr & 4194240) === 0 && (Rr = 64), e;
  }
  function ql(e) {
    for (var t = [], n = 0; 31 > n; n++) t.push(e);
    return t;
  }
  function Qn(e, t, n) {
    e.pendingLanes |= t, t !== 536870912 && (e.suspendedLanes = 0, e.pingedLanes = 0), e = e.eventTimes, t = 31 - tt(t), e[t] = n;
  }
  function wc(e, t) {
    var n = e.pendingLanes & ~t;
    e.pendingLanes = t, e.suspendedLanes = 0, e.pingedLanes = 0, e.expiredLanes &= t, e.mutableReadLanes &= t, e.entangledLanes &= t, t = e.entanglements;
    var r = e.eventTimes;
    for (e = e.expirationTimes; 0 < n; ) {
      var l = 31 - tt(n), o = 1 << l;
      t[l] = 0, r[l] = -1, e[l] = -1, n &= ~o;
    }
  }
  function bl(e, t) {
    var n = e.entangledLanes |= t;
    for (e = e.entanglements; n; ) {
      var r = 31 - tt(n), l = 1 << r;
      l & t | e[r] & t && (e[r] |= t), n &= ~l;
    }
  }
  var Y = 0;
  function hu(e) {
    return e &= -e, 1 < e ? 4 < e ? (e & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var mu, eo, vu, yu, gu, to = !1, Mr = [], Pt = null, Tt = null, Rt = null, $n = /* @__PURE__ */ new Map(), Kn = /* @__PURE__ */ new Map(), Lt = [], _c = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function wu(e, t) {
    switch (e) {
      case "focusin":
      case "focusout":
        Pt = null;
        break;
      case "dragenter":
      case "dragleave":
        Tt = null;
        break;
      case "mouseover":
      case "mouseout":
        Rt = null;
        break;
      case "pointerover":
      case "pointerout":
        $n.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Kn.delete(t.pointerId);
    }
  }
  function Yn(e, t, n, r, l, o) {
    return e === null || e.nativeEvent !== o ? (e = { blockedOn: t, domEventName: n, eventSystemFlags: r, nativeEvent: o, targetContainers: [l] }, t !== null && (t = ur(t), t !== null && eo(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, l !== null && t.indexOf(l) === -1 && t.push(l), e);
  }
  function Sc(e, t, n, r, l) {
    switch (t) {
      case "focusin":
        return Pt = Yn(Pt, e, t, n, r, l), !0;
      case "dragenter":
        return Tt = Yn(Tt, e, t, n, r, l), !0;
      case "mouseover":
        return Rt = Yn(Rt, e, t, n, r, l), !0;
      case "pointerover":
        var o = l.pointerId;
        return $n.set(o, Yn($n.get(o) || null, e, t, n, r, l)), !0;
      case "gotpointercapture":
        return o = l.pointerId, Kn.set(o, Yn(Kn.get(o) || null, e, t, n, r, l)), !0;
    }
    return !1;
  }
  function _u(e) {
    var t = Gt(e.target);
    if (t !== null) {
      var n = Xt(t);
      if (n !== null) {
        if (t = n.tag, t === 13) {
          if (t = ou(n), t !== null) {
            e.blockedOn = t, gu(e.priority, function() {
              vu(n);
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
  function Or(e) {
    if (e.blockedOn !== null) return !1;
    for (var t = e.targetContainers; 0 < t.length; ) {
      var n = ro(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
      if (n === null) {
        n = e.nativeEvent;
        var r = new n.constructor(n.type, n);
        Ql = r, n.target.dispatchEvent(r), Ql = null;
      } else return t = ur(n), t !== null && eo(t), e.blockedOn = n, !1;
      t.shift();
    }
    return !0;
  }
  function Su(e, t, n) {
    Or(e) && n.delete(t);
  }
  function kc() {
    to = !1, Pt !== null && Or(Pt) && (Pt = null), Tt !== null && Or(Tt) && (Tt = null), Rt !== null && Or(Rt) && (Rt = null), $n.forEach(Su), Kn.forEach(Su);
  }
  function Xn(e, t) {
    e.blockedOn === t && (e.blockedOn = null, to || (to = !0, v.unstable_scheduleCallback(v.unstable_NormalPriority, kc)));
  }
  function Gn(e) {
    function t(l) {
      return Xn(l, e);
    }
    if (0 < Mr.length) {
      Xn(Mr[0], e);
      for (var n = 1; n < Mr.length; n++) {
        var r = Mr[n];
        r.blockedOn === e && (r.blockedOn = null);
      }
    }
    for (Pt !== null && Xn(Pt, e), Tt !== null && Xn(Tt, e), Rt !== null && Xn(Rt, e), $n.forEach(t), Kn.forEach(t), n = 0; n < Lt.length; n++) r = Lt[n], r.blockedOn === e && (r.blockedOn = null);
    for (; 0 < Lt.length && (n = Lt[0], n.blockedOn === null); ) _u(n), n.blockedOn === null && Lt.shift();
  }
  var dn = xe.ReactCurrentBatchConfig, Dr = !0;
  function xc(e, t, n, r) {
    var l = Y, o = dn.transition;
    dn.transition = null;
    try {
      Y = 1, no(e, t, n, r);
    } finally {
      Y = l, dn.transition = o;
    }
  }
  function Ec(e, t, n, r) {
    var l = Y, o = dn.transition;
    dn.transition = null;
    try {
      Y = 4, no(e, t, n, r);
    } finally {
      Y = l, dn.transition = o;
    }
  }
  function no(e, t, n, r) {
    if (Dr) {
      var l = ro(e, t, n, r);
      if (l === null) So(e, t, r, Ir, n), wu(e, r);
      else if (Sc(l, e, t, n, r)) r.stopPropagation();
      else if (wu(e, r), t & 4 && -1 < _c.indexOf(e)) {
        for (; l !== null; ) {
          var o = ur(l);
          if (o !== null && mu(o), o = ro(e, t, n, r), o === null && So(e, t, r, Ir, n), o === l) break;
          l = o;
        }
        l !== null && r.stopPropagation();
      } else So(e, t, r, null, n);
    }
  }
  var Ir = null;
  function ro(e, t, n, r) {
    if (Ir = null, e = $l(r), e = Gt(e), e !== null) if (t = Xt(e), t === null) e = null;
    else if (n = t.tag, n === 13) {
      if (e = ou(t), e !== null) return e;
      e = null;
    } else if (n === 3) {
      if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
      e = null;
    } else t !== e && (e = null);
    return Ir = e, null;
  }
  function ku(e) {
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
        switch (fc()) {
          case Zl:
            return 1;
          case fu:
            return 4;
          case Pr:
          case dc:
            return 16;
          case du:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var jt = null, lo = null, Fr = null;
  function xu() {
    if (Fr) return Fr;
    var e, t = lo, n = t.length, r, l = "value" in jt ? jt.value : jt.textContent, o = l.length;
    for (e = 0; e < n && t[e] === l[e]; e++) ;
    var i = n - e;
    for (r = 1; r <= i && t[n - r] === l[o - r]; r++) ;
    return Fr = l.slice(e, 1 < r ? 1 - r : void 0);
  }
  function Ur(e) {
    var t = e.keyCode;
    return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
  }
  function Br() {
    return !0;
  }
  function Eu() {
    return !1;
  }
  function Ae(e) {
    function t(n, r, l, o, i) {
      this._reactName = n, this._targetInst = l, this.type = r, this.nativeEvent = o, this.target = i, this.currentTarget = null;
      for (var u in e) e.hasOwnProperty(u) && (n = e[u], this[u] = n ? n(o) : o[u]);
      return this.isDefaultPrevented = (o.defaultPrevented != null ? o.defaultPrevented : o.returnValue === !1) ? Br : Eu, this.isPropagationStopped = Eu, this;
    }
    return C(t.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var n = this.nativeEvent;
      n && (n.preventDefault ? n.preventDefault() : typeof n.returnValue != "unknown" && (n.returnValue = !1), this.isDefaultPrevented = Br);
    }, stopPropagation: function() {
      var n = this.nativeEvent;
      n && (n.stopPropagation ? n.stopPropagation() : typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0), this.isPropagationStopped = Br);
    }, persist: function() {
    }, isPersistent: Br }), t;
  }
  var pn = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(e) {
    return e.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, oo = Ae(pn), Zn = C({}, pn, { view: 0, detail: 0 }), Cc = Ae(Zn), io, uo, Jn, Vr = C({}, Zn, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: ao, button: 0, buttons: 0, relatedTarget: function(e) {
    return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
  }, movementX: function(e) {
    return "movementX" in e ? e.movementX : (e !== Jn && (Jn && e.type === "mousemove" ? (io = e.screenX - Jn.screenX, uo = e.screenY - Jn.screenY) : uo = io = 0, Jn = e), io);
  }, movementY: function(e) {
    return "movementY" in e ? e.movementY : uo;
  } }), Cu = Ae(Vr), Nc = C({}, Vr, { dataTransfer: 0 }), zc = Ae(Nc), Pc = C({}, Zn, { relatedTarget: 0 }), so = Ae(Pc), Tc = C({}, pn, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Rc = Ae(Tc), Lc = C({}, pn, { clipboardData: function(e) {
    return "clipboardData" in e ? e.clipboardData : window.clipboardData;
  } }), jc = Ae(Lc), Mc = C({}, pn, { data: 0 }), Nu = Ae(Mc), Oc = {
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
  }, Dc = {
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
  }, Ic = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function Fc(e) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(e) : (e = Ic[e]) ? !!t[e] : !1;
  }
  function ao() {
    return Fc;
  }
  var Uc = C({}, Zn, { key: function(e) {
    if (e.key) {
      var t = Oc[e.key] || e.key;
      if (t !== "Unidentified") return t;
    }
    return e.type === "keypress" ? (e = Ur(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Dc[e.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: ao, charCode: function(e) {
    return e.type === "keypress" ? Ur(e) : 0;
  }, keyCode: function(e) {
    return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
  }, which: function(e) {
    return e.type === "keypress" ? Ur(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
  } }), Bc = Ae(Uc), Vc = C({}, Vr, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), zu = Ae(Vc), Ac = C({}, Zn, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: ao }), Hc = Ae(Ac), Wc = C({}, pn, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Qc = Ae(Wc), $c = C({}, Vr, {
    deltaX: function(e) {
      return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
    },
    deltaY: function(e) {
      return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Kc = Ae($c), Yc = [9, 13, 27, 32], co = le && "CompositionEvent" in window, qn = null;
  le && "documentMode" in document && (qn = document.documentMode);
  var Xc = le && "TextEvent" in window && !qn, Pu = le && (!co || qn && 8 < qn && 11 >= qn), Tu = " ", Ru = !1;
  function Lu(e, t) {
    switch (e) {
      case "keyup":
        return Yc.indexOf(t.keyCode) !== -1;
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
  function ju(e) {
    return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
  }
  var hn = !1;
  function Gc(e, t) {
    switch (e) {
      case "compositionend":
        return ju(t);
      case "keypress":
        return t.which !== 32 ? null : (Ru = !0, Tu);
      case "textInput":
        return e = t.data, e === Tu && Ru ? null : e;
      default:
        return null;
    }
  }
  function Zc(e, t) {
    if (hn) return e === "compositionend" || !co && Lu(e, t) ? (e = xu(), Fr = lo = jt = null, hn = !1, e) : null;
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
        return Pu && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var Jc = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function Mu(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t === "input" ? !!Jc[e.type] : t === "textarea";
  }
  function Ou(e, t, n, r) {
    eu(r), t = $r(t, "onChange"), 0 < t.length && (n = new oo("onChange", "change", null, n, r), e.push({ event: n, listeners: t }));
  }
  var bn = null, er = null;
  function qc(e) {
    qu(e, 0);
  }
  function Ar(e) {
    var t = wn(e);
    if (Hi(t)) return e;
  }
  function bc(e, t) {
    if (e === "change") return t;
  }
  var Du = !1;
  if (le) {
    var fo;
    if (le) {
      var po = "oninput" in document;
      if (!po) {
        var Iu = document.createElement("div");
        Iu.setAttribute("oninput", "return;"), po = typeof Iu.oninput == "function";
      }
      fo = po;
    } else fo = !1;
    Du = fo && (!document.documentMode || 9 < document.documentMode);
  }
  function Fu() {
    bn && (bn.detachEvent("onpropertychange", Uu), er = bn = null);
  }
  function Uu(e) {
    if (e.propertyName === "value" && Ar(er)) {
      var t = [];
      Ou(t, er, e, $l(e)), lu(qc, t);
    }
  }
  function ef(e, t, n) {
    e === "focusin" ? (Fu(), bn = t, er = n, bn.attachEvent("onpropertychange", Uu)) : e === "focusout" && Fu();
  }
  function tf(e) {
    if (e === "selectionchange" || e === "keyup" || e === "keydown") return Ar(er);
  }
  function nf(e, t) {
    if (e === "click") return Ar(t);
  }
  function rf(e, t) {
    if (e === "input" || e === "change") return Ar(t);
  }
  function lf(e, t) {
    return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
  }
  var nt = typeof Object.is == "function" ? Object.is : lf;
  function tr(e, t) {
    if (nt(e, t)) return !0;
    if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
    var n = Object.keys(e), r = Object.keys(t);
    if (n.length !== r.length) return !1;
    for (r = 0; r < n.length; r++) {
      var l = n[r];
      if (!$.call(t, l) || !nt(e[l], t[l])) return !1;
    }
    return !0;
  }
  function Bu(e) {
    for (; e && e.firstChild; ) e = e.firstChild;
    return e;
  }
  function Vu(e, t) {
    var n = Bu(e);
    e = 0;
    for (var r; n; ) {
      if (n.nodeType === 3) {
        if (r = e + n.textContent.length, e <= t && r >= t) return { node: n, offset: t - e };
        e = r;
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
      n = Bu(n);
    }
  }
  function Au(e, t) {
    return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Au(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function Hu() {
    for (var e = window, t = Er(); t instanceof e.HTMLIFrameElement; ) {
      try {
        var n = typeof t.contentWindow.location.href == "string";
      } catch {
        n = !1;
      }
      if (n) e = t.contentWindow;
      else break;
      t = Er(e.document);
    }
    return t;
  }
  function ho(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
  }
  function of(e) {
    var t = Hu(), n = e.focusedElem, r = e.selectionRange;
    if (t !== n && n && n.ownerDocument && Au(n.ownerDocument.documentElement, n)) {
      if (r !== null && ho(n)) {
        if (t = r.start, e = r.end, e === void 0 && (e = t), "selectionStart" in n) n.selectionStart = t, n.selectionEnd = Math.min(e, n.value.length);
        else if (e = (t = n.ownerDocument || document) && t.defaultView || window, e.getSelection) {
          e = e.getSelection();
          var l = n.textContent.length, o = Math.min(r.start, l);
          r = r.end === void 0 ? o : Math.min(r.end, l), !e.extend && o > r && (l = r, r = o, o = l), l = Vu(n, o);
          var i = Vu(
            n,
            r
          );
          l && i && (e.rangeCount !== 1 || e.anchorNode !== l.node || e.anchorOffset !== l.offset || e.focusNode !== i.node || e.focusOffset !== i.offset) && (t = t.createRange(), t.setStart(l.node, l.offset), e.removeAllRanges(), o > r ? (e.addRange(t), e.extend(i.node, i.offset)) : (t.setEnd(i.node, i.offset), e.addRange(t)));
        }
      }
      for (t = [], e = n; e = e.parentNode; ) e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
      for (typeof n.focus == "function" && n.focus(), n = 0; n < t.length; n++) e = t[n], e.element.scrollLeft = e.left, e.element.scrollTop = e.top;
    }
  }
  var uf = le && "documentMode" in document && 11 >= document.documentMode, mn = null, mo = null, nr = null, vo = !1;
  function Wu(e, t, n) {
    var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
    vo || mn == null || mn !== Er(r) || (r = mn, "selectionStart" in r && ho(r) ? r = { start: r.selectionStart, end: r.selectionEnd } : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = { anchorNode: r.anchorNode, anchorOffset: r.anchorOffset, focusNode: r.focusNode, focusOffset: r.focusOffset }), nr && tr(nr, r) || (nr = r, r = $r(mo, "onSelect"), 0 < r.length && (t = new oo("onSelect", "select", null, t, n), e.push({ event: t, listeners: r }), t.target = mn)));
  }
  function Hr(e, t) {
    var n = {};
    return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
  }
  var vn = { animationend: Hr("Animation", "AnimationEnd"), animationiteration: Hr("Animation", "AnimationIteration"), animationstart: Hr("Animation", "AnimationStart"), transitionend: Hr("Transition", "TransitionEnd") }, yo = {}, Qu = {};
  le && (Qu = document.createElement("div").style, "AnimationEvent" in window || (delete vn.animationend.animation, delete vn.animationiteration.animation, delete vn.animationstart.animation), "TransitionEvent" in window || delete vn.transitionend.transition);
  function Wr(e) {
    if (yo[e]) return yo[e];
    if (!vn[e]) return e;
    var t = vn[e], n;
    for (n in t) if (t.hasOwnProperty(n) && n in Qu) return yo[e] = t[n];
    return e;
  }
  var $u = Wr("animationend"), Ku = Wr("animationiteration"), Yu = Wr("animationstart"), Xu = Wr("transitionend"), Gu = /* @__PURE__ */ new Map(), Zu = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function Mt(e, t) {
    Gu.set(e, t), Z(t, [e]);
  }
  for (var go = 0; go < Zu.length; go++) {
    var wo = Zu[go], sf = wo.toLowerCase(), af = wo[0].toUpperCase() + wo.slice(1);
    Mt(sf, "on" + af);
  }
  Mt($u, "onAnimationEnd"), Mt(Ku, "onAnimationIteration"), Mt(Yu, "onAnimationStart"), Mt("dblclick", "onDoubleClick"), Mt("focusin", "onFocus"), Mt("focusout", "onBlur"), Mt(Xu, "onTransitionEnd"), Q("onMouseEnter", ["mouseout", "mouseover"]), Q("onMouseLeave", ["mouseout", "mouseover"]), Q("onPointerEnter", ["pointerout", "pointerover"]), Q("onPointerLeave", ["pointerout", "pointerover"]), Z("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), Z("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), Z("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), Z("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), Z("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), Z("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var rr = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), cf = new Set("cancel close invalid load scroll toggle".split(" ").concat(rr));
  function Ju(e, t, n) {
    var r = e.type || "unknown-event";
    e.currentTarget = n, uc(r, t, void 0, e), e.currentTarget = null;
  }
  function qu(e, t) {
    t = (t & 4) !== 0;
    for (var n = 0; n < e.length; n++) {
      var r = e[n], l = r.event;
      r = r.listeners;
      e: {
        var o = void 0;
        if (t) for (var i = r.length - 1; 0 <= i; i--) {
          var u = r[i], s = u.instance, h = u.currentTarget;
          if (u = u.listener, s !== o && l.isPropagationStopped()) break e;
          Ju(l, u, h), o = s;
        }
        else for (i = 0; i < r.length; i++) {
          if (u = r[i], s = u.instance, h = u.currentTarget, u = u.listener, s !== o && l.isPropagationStopped()) break e;
          Ju(l, u, h), o = s;
        }
      }
    }
    if (zr) throw e = Gl, zr = !1, Gl = null, e;
  }
  function ee(e, t) {
    var n = t[zo];
    n === void 0 && (n = t[zo] = /* @__PURE__ */ new Set());
    var r = e + "__bubble";
    n.has(r) || (bu(t, e, 2, !1), n.add(r));
  }
  function _o(e, t, n) {
    var r = 0;
    t && (r |= 4), bu(n, e, r, t);
  }
  var Qr = "_reactListening" + Math.random().toString(36).slice(2);
  function lr(e) {
    if (!e[Qr]) {
      e[Qr] = !0, D.forEach(function(n) {
        n !== "selectionchange" && (cf.has(n) || _o(n, !1, e), _o(n, !0, e));
      });
      var t = e.nodeType === 9 ? e : e.ownerDocument;
      t === null || t[Qr] || (t[Qr] = !0, _o("selectionchange", !1, t));
    }
  }
  function bu(e, t, n, r) {
    switch (ku(t)) {
      case 1:
        var l = xc;
        break;
      case 4:
        l = Ec;
        break;
      default:
        l = no;
    }
    n = l.bind(null, t, n, e), l = void 0, !Xl || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (l = !0), r ? l !== void 0 ? e.addEventListener(t, n, { capture: !0, passive: l }) : e.addEventListener(t, n, !0) : l !== void 0 ? e.addEventListener(t, n, { passive: l }) : e.addEventListener(t, n, !1);
  }
  function So(e, t, n, r, l) {
    var o = r;
    if ((t & 1) === 0 && (t & 2) === 0 && r !== null) e: for (; ; ) {
      if (r === null) return;
      var i = r.tag;
      if (i === 3 || i === 4) {
        var u = r.stateNode.containerInfo;
        if (u === l || u.nodeType === 8 && u.parentNode === l) break;
        if (i === 4) for (i = r.return; i !== null; ) {
          var s = i.tag;
          if ((s === 3 || s === 4) && (s = i.stateNode.containerInfo, s === l || s.nodeType === 8 && s.parentNode === l)) return;
          i = i.return;
        }
        for (; u !== null; ) {
          if (i = Gt(u), i === null) return;
          if (s = i.tag, s === 5 || s === 6) {
            r = o = i;
            continue e;
          }
          u = u.parentNode;
        }
      }
      r = r.return;
    }
    lu(function() {
      var h = o, w = $l(n), _ = [];
      e: {
        var y = Gu.get(e);
        if (y !== void 0) {
          var x = oo, N = e;
          switch (e) {
            case "keypress":
              if (Ur(n) === 0) break e;
            case "keydown":
            case "keyup":
              x = Bc;
              break;
            case "focusin":
              N = "focus", x = so;
              break;
            case "focusout":
              N = "blur", x = so;
              break;
            case "beforeblur":
            case "afterblur":
              x = so;
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
              x = Cu;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              x = zc;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              x = Hc;
              break;
            case $u:
            case Ku:
            case Yu:
              x = Rc;
              break;
            case Xu:
              x = Qc;
              break;
            case "scroll":
              x = Cc;
              break;
            case "wheel":
              x = Kc;
              break;
            case "copy":
            case "cut":
            case "paste":
              x = jc;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              x = zu;
          }
          var z = (t & 4) !== 0, de = !z && e === "scroll", d = z ? y !== null ? y + "Capture" : null : y;
          z = [];
          for (var c = h, p; c !== null; ) {
            p = c;
            var S = p.stateNode;
            if (p.tag === 5 && S !== null && (p = S, d !== null && (S = Vn(c, d), S != null && z.push(or(c, S, p)))), de) break;
            c = c.return;
          }
          0 < z.length && (y = new x(y, N, null, n, w), _.push({ event: y, listeners: z }));
        }
      }
      if ((t & 7) === 0) {
        e: {
          if (y = e === "mouseover" || e === "pointerover", x = e === "mouseout" || e === "pointerout", y && n !== Ql && (N = n.relatedTarget || n.fromElement) && (Gt(N) || N[gt])) break e;
          if ((x || y) && (y = w.window === w ? w : (y = w.ownerDocument) ? y.defaultView || y.parentWindow : window, x ? (N = n.relatedTarget || n.toElement, x = h, N = N ? Gt(N) : null, N !== null && (de = Xt(N), N !== de || N.tag !== 5 && N.tag !== 6) && (N = null)) : (x = null, N = h), x !== N)) {
            if (z = Cu, S = "onMouseLeave", d = "onMouseEnter", c = "mouse", (e === "pointerout" || e === "pointerover") && (z = zu, S = "onPointerLeave", d = "onPointerEnter", c = "pointer"), de = x == null ? y : wn(x), p = N == null ? y : wn(N), y = new z(S, c + "leave", x, n, w), y.target = de, y.relatedTarget = p, S = null, Gt(w) === h && (z = new z(d, c + "enter", N, n, w), z.target = p, z.relatedTarget = de, S = z), de = S, x && N) t: {
              for (z = x, d = N, c = 0, p = z; p; p = yn(p)) c++;
              for (p = 0, S = d; S; S = yn(S)) p++;
              for (; 0 < c - p; ) z = yn(z), c--;
              for (; 0 < p - c; ) d = yn(d), p--;
              for (; c--; ) {
                if (z === d || d !== null && z === d.alternate) break t;
                z = yn(z), d = yn(d);
              }
              z = null;
            }
            else z = null;
            x !== null && es(_, y, x, z, !1), N !== null && de !== null && es(_, de, N, z, !0);
          }
        }
        e: {
          if (y = h ? wn(h) : window, x = y.nodeName && y.nodeName.toLowerCase(), x === "select" || x === "input" && y.type === "file") var P = bc;
          else if (Mu(y)) if (Du) P = rf;
          else {
            P = tf;
            var T = ef;
          }
          else (x = y.nodeName) && x.toLowerCase() === "input" && (y.type === "checkbox" || y.type === "radio") && (P = nf);
          if (P && (P = P(e, h))) {
            Ou(_, P, n, w);
            break e;
          }
          T && T(e, y, h), e === "focusout" && (T = y._wrapperState) && T.controlled && y.type === "number" && Bl(y, "number", y.value);
        }
        switch (T = h ? wn(h) : window, e) {
          case "focusin":
            (Mu(T) || T.contentEditable === "true") && (mn = T, mo = h, nr = null);
            break;
          case "focusout":
            nr = mo = mn = null;
            break;
          case "mousedown":
            vo = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            vo = !1, Wu(_, n, w);
            break;
          case "selectionchange":
            if (uf) break;
          case "keydown":
          case "keyup":
            Wu(_, n, w);
        }
        var R;
        if (co) e: {
          switch (e) {
            case "compositionstart":
              var j = "onCompositionStart";
              break e;
            case "compositionend":
              j = "onCompositionEnd";
              break e;
            case "compositionupdate":
              j = "onCompositionUpdate";
              break e;
          }
          j = void 0;
        }
        else hn ? Lu(e, n) && (j = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (j = "onCompositionStart");
        j && (Pu && n.locale !== "ko" && (hn || j !== "onCompositionStart" ? j === "onCompositionEnd" && hn && (R = xu()) : (jt = w, lo = "value" in jt ? jt.value : jt.textContent, hn = !0)), T = $r(h, j), 0 < T.length && (j = new Nu(j, e, null, n, w), _.push({ event: j, listeners: T }), R ? j.data = R : (R = ju(n), R !== null && (j.data = R)))), (R = Xc ? Gc(e, n) : Zc(e, n)) && (h = $r(h, "onBeforeInput"), 0 < h.length && (w = new Nu("onBeforeInput", "beforeinput", null, n, w), _.push({ event: w, listeners: h }), w.data = R));
      }
      qu(_, t);
    });
  }
  function or(e, t, n) {
    return { instance: e, listener: t, currentTarget: n };
  }
  function $r(e, t) {
    for (var n = t + "Capture", r = []; e !== null; ) {
      var l = e, o = l.stateNode;
      l.tag === 5 && o !== null && (l = o, o = Vn(e, n), o != null && r.unshift(or(e, o, l)), o = Vn(e, t), o != null && r.push(or(e, o, l))), e = e.return;
    }
    return r;
  }
  function yn(e) {
    if (e === null) return null;
    do
      e = e.return;
    while (e && e.tag !== 5);
    return e || null;
  }
  function es(e, t, n, r, l) {
    for (var o = t._reactName, i = []; n !== null && n !== r; ) {
      var u = n, s = u.alternate, h = u.stateNode;
      if (s !== null && s === r) break;
      u.tag === 5 && h !== null && (u = h, l ? (s = Vn(n, o), s != null && i.unshift(or(n, s, u))) : l || (s = Vn(n, o), s != null && i.push(or(n, s, u)))), n = n.return;
    }
    i.length !== 0 && e.push({ event: t, listeners: i });
  }
  var ff = /\r\n?/g, df = /\u0000|\uFFFD/g;
  function ts(e) {
    return (typeof e == "string" ? e : "" + e).replace(ff, `
`).replace(df, "");
  }
  function Kr(e, t, n) {
    if (t = ts(t), ts(e) !== t && n) throw Error(m(425));
  }
  function Yr() {
  }
  var ko = null, xo = null;
  function Eo(e, t) {
    return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var Co = typeof setTimeout == "function" ? setTimeout : void 0, pf = typeof clearTimeout == "function" ? clearTimeout : void 0, ns = typeof Promise == "function" ? Promise : void 0, hf = typeof queueMicrotask == "function" ? queueMicrotask : typeof ns < "u" ? function(e) {
    return ns.resolve(null).then(e).catch(mf);
  } : Co;
  function mf(e) {
    setTimeout(function() {
      throw e;
    });
  }
  function No(e, t) {
    var n = t, r = 0;
    do {
      var l = n.nextSibling;
      if (e.removeChild(n), l && l.nodeType === 8) if (n = l.data, n === "/$") {
        if (r === 0) {
          e.removeChild(l), Gn(t);
          return;
        }
        r--;
      } else n !== "$" && n !== "$?" && n !== "$!" || r++;
      n = l;
    } while (n);
    Gn(t);
  }
  function Ot(e) {
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
  function rs(e) {
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
  var gn = Math.random().toString(36).slice(2), dt = "__reactFiber$" + gn, ir = "__reactProps$" + gn, gt = "__reactContainer$" + gn, zo = "__reactEvents$" + gn, vf = "__reactListeners$" + gn, yf = "__reactHandles$" + gn;
  function Gt(e) {
    var t = e[dt];
    if (t) return t;
    for (var n = e.parentNode; n; ) {
      if (t = n[gt] || n[dt]) {
        if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = rs(e); e !== null; ) {
          if (n = e[dt]) return n;
          e = rs(e);
        }
        return t;
      }
      e = n, n = e.parentNode;
    }
    return null;
  }
  function ur(e) {
    return e = e[dt] || e[gt], !e || e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3 ? null : e;
  }
  function wn(e) {
    if (e.tag === 5 || e.tag === 6) return e.stateNode;
    throw Error(m(33));
  }
  function Xr(e) {
    return e[ir] || null;
  }
  var Po = [], _n = -1;
  function Dt(e) {
    return { current: e };
  }
  function te(e) {
    0 > _n || (e.current = Po[_n], Po[_n] = null, _n--);
  }
  function b(e, t) {
    _n++, Po[_n] = e.current, e.current = t;
  }
  var It = {}, Ee = Dt(It), Me = Dt(!1), Zt = It;
  function Sn(e, t) {
    var n = e.type.contextTypes;
    if (!n) return It;
    var r = e.stateNode;
    if (r && r.__reactInternalMemoizedUnmaskedChildContext === t) return r.__reactInternalMemoizedMaskedChildContext;
    var l = {}, o;
    for (o in n) l[o] = t[o];
    return r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = t, e.__reactInternalMemoizedMaskedChildContext = l), l;
  }
  function Oe(e) {
    return e = e.childContextTypes, e != null;
  }
  function Gr() {
    te(Me), te(Ee);
  }
  function ls(e, t, n) {
    if (Ee.current !== It) throw Error(m(168));
    b(Ee, t), b(Me, n);
  }
  function os(e, t, n) {
    var r = e.stateNode;
    if (t = t.childContextTypes, typeof r.getChildContext != "function") return n;
    r = r.getChildContext();
    for (var l in r) if (!(l in t)) throw Error(m(108, q(e) || "Unknown", l));
    return C({}, n, r);
  }
  function Zr(e) {
    return e = (e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext || It, Zt = Ee.current, b(Ee, e), b(Me, Me.current), !0;
  }
  function is(e, t, n) {
    var r = e.stateNode;
    if (!r) throw Error(m(169));
    n ? (e = os(e, t, Zt), r.__reactInternalMemoizedMergedChildContext = e, te(Me), te(Ee), b(Ee, e)) : te(Me), b(Me, n);
  }
  var wt = null, Jr = !1, To = !1;
  function us(e) {
    wt === null ? wt = [e] : wt.push(e);
  }
  function gf(e) {
    Jr = !0, us(e);
  }
  function Ft() {
    if (!To && wt !== null) {
      To = !0;
      var e = 0, t = Y;
      try {
        var n = wt;
        for (Y = 1; e < n.length; e++) {
          var r = n[e];
          do
            r = r(!0);
          while (r !== null);
        }
        wt = null, Jr = !1;
      } catch (l) {
        throw wt !== null && (wt = wt.slice(e + 1)), au(Zl, Ft), l;
      } finally {
        Y = t, To = !1;
      }
    }
    return null;
  }
  var kn = [], xn = 0, qr = null, br = 0, Ke = [], Ye = 0, Jt = null, _t = 1, St = "";
  function qt(e, t) {
    kn[xn++] = br, kn[xn++] = qr, qr = e, br = t;
  }
  function ss(e, t, n) {
    Ke[Ye++] = _t, Ke[Ye++] = St, Ke[Ye++] = Jt, Jt = e;
    var r = _t;
    e = St;
    var l = 32 - tt(r) - 1;
    r &= ~(1 << l), n += 1;
    var o = 32 - tt(t) + l;
    if (30 < o) {
      var i = l - l % 5;
      o = (r & (1 << i) - 1).toString(32), r >>= i, l -= i, _t = 1 << 32 - tt(t) + l | n << l | r, St = o + e;
    } else _t = 1 << o | n << l | r, St = e;
  }
  function Ro(e) {
    e.return !== null && (qt(e, 1), ss(e, 1, 0));
  }
  function Lo(e) {
    for (; e === qr; ) qr = kn[--xn], kn[xn] = null, br = kn[--xn], kn[xn] = null;
    for (; e === Jt; ) Jt = Ke[--Ye], Ke[Ye] = null, St = Ke[--Ye], Ke[Ye] = null, _t = Ke[--Ye], Ke[Ye] = null;
  }
  var He = null, We = null, re = !1, rt = null;
  function as(e, t) {
    var n = Je(5, null, null, 0);
    n.elementType = "DELETED", n.stateNode = t, n.return = e, t = e.deletions, t === null ? (e.deletions = [n], e.flags |= 16) : t.push(n);
  }
  function cs(e, t) {
    switch (e.tag) {
      case 5:
        var n = e.type;
        return t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t, t !== null ? (e.stateNode = t, He = e, We = Ot(t.firstChild), !0) : !1;
      case 6:
        return t = e.pendingProps === "" || t.nodeType !== 3 ? null : t, t !== null ? (e.stateNode = t, He = e, We = null, !0) : !1;
      case 13:
        return t = t.nodeType !== 8 ? null : t, t !== null ? (n = Jt !== null ? { id: _t, overflow: St } : null, e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }, n = Je(18, null, null, 0), n.stateNode = t, n.return = e, e.child = n, He = e, We = null, !0) : !1;
      default:
        return !1;
    }
  }
  function jo(e) {
    return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
  }
  function Mo(e) {
    if (re) {
      var t = We;
      if (t) {
        var n = t;
        if (!cs(e, t)) {
          if (jo(e)) throw Error(m(418));
          t = Ot(n.nextSibling);
          var r = He;
          t && cs(e, t) ? as(r, n) : (e.flags = e.flags & -4097 | 2, re = !1, He = e);
        }
      } else {
        if (jo(e)) throw Error(m(418));
        e.flags = e.flags & -4097 | 2, re = !1, He = e;
      }
    }
  }
  function fs(e) {
    for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
    He = e;
  }
  function el(e) {
    if (e !== He) return !1;
    if (!re) return fs(e), re = !0, !1;
    var t;
    if ((t = e.tag !== 3) && !(t = e.tag !== 5) && (t = e.type, t = t !== "head" && t !== "body" && !Eo(e.type, e.memoizedProps)), t && (t = We)) {
      if (jo(e)) throw ds(), Error(m(418));
      for (; t; ) as(e, t), t = Ot(t.nextSibling);
    }
    if (fs(e), e.tag === 13) {
      if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(m(317));
      e: {
        for (e = e.nextSibling, t = 0; e; ) {
          if (e.nodeType === 8) {
            var n = e.data;
            if (n === "/$") {
              if (t === 0) {
                We = Ot(e.nextSibling);
                break e;
              }
              t--;
            } else n !== "$" && n !== "$!" && n !== "$?" || t++;
          }
          e = e.nextSibling;
        }
        We = null;
      }
    } else We = He ? Ot(e.stateNode.nextSibling) : null;
    return !0;
  }
  function ds() {
    for (var e = We; e; ) e = Ot(e.nextSibling);
  }
  function En() {
    We = He = null, re = !1;
  }
  function Oo(e) {
    rt === null ? rt = [e] : rt.push(e);
  }
  var wf = xe.ReactCurrentBatchConfig;
  function sr(e, t, n) {
    if (e = n.ref, e !== null && typeof e != "function" && typeof e != "object") {
      if (n._owner) {
        if (n = n._owner, n) {
          if (n.tag !== 1) throw Error(m(309));
          var r = n.stateNode;
        }
        if (!r) throw Error(m(147, e));
        var l = r, o = "" + e;
        return t !== null && t.ref !== null && typeof t.ref == "function" && t.ref._stringRef === o ? t.ref : (t = function(i) {
          var u = l.refs;
          i === null ? delete u[o] : u[o] = i;
        }, t._stringRef = o, t);
      }
      if (typeof e != "string") throw Error(m(284));
      if (!n._owner) throw Error(m(290, e));
    }
    return e;
  }
  function tl(e, t) {
    throw e = Object.prototype.toString.call(t), Error(m(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e));
  }
  function ps(e) {
    var t = e._init;
    return t(e._payload);
  }
  function hs(e) {
    function t(d, c) {
      if (e) {
        var p = d.deletions;
        p === null ? (d.deletions = [c], d.flags |= 16) : p.push(c);
      }
    }
    function n(d, c) {
      if (!e) return null;
      for (; c !== null; ) t(d, c), c = c.sibling;
      return null;
    }
    function r(d, c) {
      for (d = /* @__PURE__ */ new Map(); c !== null; ) c.key !== null ? d.set(c.key, c) : d.set(c.index, c), c = c.sibling;
      return d;
    }
    function l(d, c) {
      return d = $t(d, c), d.index = 0, d.sibling = null, d;
    }
    function o(d, c, p) {
      return d.index = p, e ? (p = d.alternate, p !== null ? (p = p.index, p < c ? (d.flags |= 2, c) : p) : (d.flags |= 2, c)) : (d.flags |= 1048576, c);
    }
    function i(d) {
      return e && d.alternate === null && (d.flags |= 2), d;
    }
    function u(d, c, p, S) {
      return c === null || c.tag !== 6 ? (c = Ci(p, d.mode, S), c.return = d, c) : (c = l(c, p), c.return = d, c);
    }
    function s(d, c, p, S) {
      var P = p.type;
      return P === Le ? w(d, c, p.props.children, S, p.key) : c !== null && (c.elementType === P || typeof P == "object" && P !== null && P.$$typeof === je && ps(P) === c.type) ? (S = l(c, p.props), S.ref = sr(d, c, p), S.return = d, S) : (S = Cl(p.type, p.key, p.props, null, d.mode, S), S.ref = sr(d, c, p), S.return = d, S);
    }
    function h(d, c, p, S) {
      return c === null || c.tag !== 4 || c.stateNode.containerInfo !== p.containerInfo || c.stateNode.implementation !== p.implementation ? (c = Ni(p, d.mode, S), c.return = d, c) : (c = l(c, p.children || []), c.return = d, c);
    }
    function w(d, c, p, S, P) {
      return c === null || c.tag !== 7 ? (c = un(p, d.mode, S, P), c.return = d, c) : (c = l(c, p), c.return = d, c);
    }
    function _(d, c, p) {
      if (typeof c == "string" && c !== "" || typeof c == "number") return c = Ci("" + c, d.mode, p), c.return = d, c;
      if (typeof c == "object" && c !== null) {
        switch (c.$$typeof) {
          case be:
            return p = Cl(c.type, c.key, c.props, null, d.mode, p), p.ref = sr(d, null, c), p.return = d, p;
          case Pe:
            return c = Ni(c, d.mode, p), c.return = d, c;
          case je:
            var S = c._init;
            return _(d, S(c._payload), p);
        }
        if (Fn(c) || L(c)) return c = un(c, d.mode, p, null), c.return = d, c;
        tl(d, c);
      }
      return null;
    }
    function y(d, c, p, S) {
      var P = c !== null ? c.key : null;
      if (typeof p == "string" && p !== "" || typeof p == "number") return P !== null ? null : u(d, c, "" + p, S);
      if (typeof p == "object" && p !== null) {
        switch (p.$$typeof) {
          case be:
            return p.key === P ? s(d, c, p, S) : null;
          case Pe:
            return p.key === P ? h(d, c, p, S) : null;
          case je:
            return P = p._init, y(
              d,
              c,
              P(p._payload),
              S
            );
        }
        if (Fn(p) || L(p)) return P !== null ? null : w(d, c, p, S, null);
        tl(d, p);
      }
      return null;
    }
    function x(d, c, p, S, P) {
      if (typeof S == "string" && S !== "" || typeof S == "number") return d = d.get(p) || null, u(c, d, "" + S, P);
      if (typeof S == "object" && S !== null) {
        switch (S.$$typeof) {
          case be:
            return d = d.get(S.key === null ? p : S.key) || null, s(c, d, S, P);
          case Pe:
            return d = d.get(S.key === null ? p : S.key) || null, h(c, d, S, P);
          case je:
            var T = S._init;
            return x(d, c, p, T(S._payload), P);
        }
        if (Fn(S) || L(S)) return d = d.get(p) || null, w(c, d, S, P, null);
        tl(c, S);
      }
      return null;
    }
    function N(d, c, p, S) {
      for (var P = null, T = null, R = c, j = c = 0, _e = null; R !== null && j < p.length; j++) {
        R.index > j ? (_e = R, R = null) : _e = R.sibling;
        var W = y(d, R, p[j], S);
        if (W === null) {
          R === null && (R = _e);
          break;
        }
        e && R && W.alternate === null && t(d, R), c = o(W, c, j), T === null ? P = W : T.sibling = W, T = W, R = _e;
      }
      if (j === p.length) return n(d, R), re && qt(d, j), P;
      if (R === null) {
        for (; j < p.length; j++) R = _(d, p[j], S), R !== null && (c = o(R, c, j), T === null ? P = R : T.sibling = R, T = R);
        return re && qt(d, j), P;
      }
      for (R = r(d, R); j < p.length; j++) _e = x(R, d, j, p[j], S), _e !== null && (e && _e.alternate !== null && R.delete(_e.key === null ? j : _e.key), c = o(_e, c, j), T === null ? P = _e : T.sibling = _e, T = _e);
      return e && R.forEach(function(Kt) {
        return t(d, Kt);
      }), re && qt(d, j), P;
    }
    function z(d, c, p, S) {
      var P = L(p);
      if (typeof P != "function") throw Error(m(150));
      if (p = P.call(p), p == null) throw Error(m(151));
      for (var T = P = null, R = c, j = c = 0, _e = null, W = p.next(); R !== null && !W.done; j++, W = p.next()) {
        R.index > j ? (_e = R, R = null) : _e = R.sibling;
        var Kt = y(d, R, W.value, S);
        if (Kt === null) {
          R === null && (R = _e);
          break;
        }
        e && R && Kt.alternate === null && t(d, R), c = o(Kt, c, j), T === null ? P = Kt : T.sibling = Kt, T = Kt, R = _e;
      }
      if (W.done) return n(
        d,
        R
      ), re && qt(d, j), P;
      if (R === null) {
        for (; !W.done; j++, W = p.next()) W = _(d, W.value, S), W !== null && (c = o(W, c, j), T === null ? P = W : T.sibling = W, T = W);
        return re && qt(d, j), P;
      }
      for (R = r(d, R); !W.done; j++, W = p.next()) W = x(R, d, j, W.value, S), W !== null && (e && W.alternate !== null && R.delete(W.key === null ? j : W.key), c = o(W, c, j), T === null ? P = W : T.sibling = W, T = W);
      return e && R.forEach(function(qf) {
        return t(d, qf);
      }), re && qt(d, j), P;
    }
    function de(d, c, p, S) {
      if (typeof p == "object" && p !== null && p.type === Le && p.key === null && (p = p.props.children), typeof p == "object" && p !== null) {
        switch (p.$$typeof) {
          case be:
            e: {
              for (var P = p.key, T = c; T !== null; ) {
                if (T.key === P) {
                  if (P = p.type, P === Le) {
                    if (T.tag === 7) {
                      n(d, T.sibling), c = l(T, p.props.children), c.return = d, d = c;
                      break e;
                    }
                  } else if (T.elementType === P || typeof P == "object" && P !== null && P.$$typeof === je && ps(P) === T.type) {
                    n(d, T.sibling), c = l(T, p.props), c.ref = sr(d, T, p), c.return = d, d = c;
                    break e;
                  }
                  n(d, T);
                  break;
                } else t(d, T);
                T = T.sibling;
              }
              p.type === Le ? (c = un(p.props.children, d.mode, S, p.key), c.return = d, d = c) : (S = Cl(p.type, p.key, p.props, null, d.mode, S), S.ref = sr(d, c, p), S.return = d, d = S);
            }
            return i(d);
          case Pe:
            e: {
              for (T = p.key; c !== null; ) {
                if (c.key === T) if (c.tag === 4 && c.stateNode.containerInfo === p.containerInfo && c.stateNode.implementation === p.implementation) {
                  n(d, c.sibling), c = l(c, p.children || []), c.return = d, d = c;
                  break e;
                } else {
                  n(d, c);
                  break;
                }
                else t(d, c);
                c = c.sibling;
              }
              c = Ni(p, d.mode, S), c.return = d, d = c;
            }
            return i(d);
          case je:
            return T = p._init, de(d, c, T(p._payload), S);
        }
        if (Fn(p)) return N(d, c, p, S);
        if (L(p)) return z(d, c, p, S);
        tl(d, p);
      }
      return typeof p == "string" && p !== "" || typeof p == "number" ? (p = "" + p, c !== null && c.tag === 6 ? (n(d, c.sibling), c = l(c, p), c.return = d, d = c) : (n(d, c), c = Ci(p, d.mode, S), c.return = d, d = c), i(d)) : n(d, c);
    }
    return de;
  }
  var Cn = hs(!0), ms = hs(!1), nl = Dt(null), rl = null, Nn = null, Do = null;
  function Io() {
    Do = Nn = rl = null;
  }
  function Fo(e) {
    var t = nl.current;
    te(nl), e._currentValue = t;
  }
  function Uo(e, t, n) {
    for (; e !== null; ) {
      var r = e.alternate;
      if ((e.childLanes & t) !== t ? (e.childLanes |= t, r !== null && (r.childLanes |= t)) : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t), e === n) break;
      e = e.return;
    }
  }
  function zn(e, t) {
    rl = e, Do = Nn = null, e = e.dependencies, e !== null && e.firstContext !== null && ((e.lanes & t) !== 0 && (De = !0), e.firstContext = null);
  }
  function Xe(e) {
    var t = e._currentValue;
    if (Do !== e) if (e = { context: e, memoizedValue: t, next: null }, Nn === null) {
      if (rl === null) throw Error(m(308));
      Nn = e, rl.dependencies = { lanes: 0, firstContext: e };
    } else Nn = Nn.next = e;
    return t;
  }
  var bt = null;
  function Bo(e) {
    bt === null ? bt = [e] : bt.push(e);
  }
  function vs(e, t, n, r) {
    var l = t.interleaved;
    return l === null ? (n.next = n, Bo(t)) : (n.next = l.next, l.next = n), t.interleaved = n, kt(e, r);
  }
  function kt(e, t) {
    e.lanes |= t;
    var n = e.alternate;
    for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; ) e.childLanes |= t, n = e.alternate, n !== null && (n.childLanes |= t), n = e, e = e.return;
    return n.tag === 3 ? n.stateNode : null;
  }
  var Ut = !1;
  function Vo(e) {
    e.updateQueue = { baseState: e.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function ys(e, t) {
    e = e.updateQueue, t.updateQueue === e && (t.updateQueue = { baseState: e.baseState, firstBaseUpdate: e.firstBaseUpdate, lastBaseUpdate: e.lastBaseUpdate, shared: e.shared, effects: e.effects });
  }
  function xt(e, t) {
    return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
  }
  function Bt(e, t, n) {
    var r = e.updateQueue;
    if (r === null) return null;
    if (r = r.shared, (B & 2) !== 0) {
      var l = r.pending;
      return l === null ? t.next = t : (t.next = l.next, l.next = t), r.pending = t, kt(e, n);
    }
    return l = r.interleaved, l === null ? (t.next = t, Bo(r)) : (t.next = l.next, l.next = t), r.interleaved = t, kt(e, n);
  }
  function ll(e, t, n) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194240) !== 0)) {
      var r = t.lanes;
      r &= e.pendingLanes, n |= r, t.lanes = n, bl(e, n);
    }
  }
  function gs(e, t) {
    var n = e.updateQueue, r = e.alternate;
    if (r !== null && (r = r.updateQueue, n === r)) {
      var l = null, o = null;
      if (n = n.firstBaseUpdate, n !== null) {
        do {
          var i = { eventTime: n.eventTime, lane: n.lane, tag: n.tag, payload: n.payload, callback: n.callback, next: null };
          o === null ? l = o = i : o = o.next = i, n = n.next;
        } while (n !== null);
        o === null ? l = o = t : o = o.next = t;
      } else l = o = t;
      n = { baseState: r.baseState, firstBaseUpdate: l, lastBaseUpdate: o, shared: r.shared, effects: r.effects }, e.updateQueue = n;
      return;
    }
    e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
  }
  function ol(e, t, n, r) {
    var l = e.updateQueue;
    Ut = !1;
    var o = l.firstBaseUpdate, i = l.lastBaseUpdate, u = l.shared.pending;
    if (u !== null) {
      l.shared.pending = null;
      var s = u, h = s.next;
      s.next = null, i === null ? o = h : i.next = h, i = s;
      var w = e.alternate;
      w !== null && (w = w.updateQueue, u = w.lastBaseUpdate, u !== i && (u === null ? w.firstBaseUpdate = h : u.next = h, w.lastBaseUpdate = s));
    }
    if (o !== null) {
      var _ = l.baseState;
      i = 0, w = h = s = null, u = o;
      do {
        var y = u.lane, x = u.eventTime;
        if ((r & y) === y) {
          w !== null && (w = w.next = {
            eventTime: x,
            lane: 0,
            tag: u.tag,
            payload: u.payload,
            callback: u.callback,
            next: null
          });
          e: {
            var N = e, z = u;
            switch (y = t, x = n, z.tag) {
              case 1:
                if (N = z.payload, typeof N == "function") {
                  _ = N.call(x, _, y);
                  break e;
                }
                _ = N;
                break e;
              case 3:
                N.flags = N.flags & -65537 | 128;
              case 0:
                if (N = z.payload, y = typeof N == "function" ? N.call(x, _, y) : N, y == null) break e;
                _ = C({}, _, y);
                break e;
              case 2:
                Ut = !0;
            }
          }
          u.callback !== null && u.lane !== 0 && (e.flags |= 64, y = l.effects, y === null ? l.effects = [u] : y.push(u));
        } else x = { eventTime: x, lane: y, tag: u.tag, payload: u.payload, callback: u.callback, next: null }, w === null ? (h = w = x, s = _) : w = w.next = x, i |= y;
        if (u = u.next, u === null) {
          if (u = l.shared.pending, u === null) break;
          y = u, u = y.next, y.next = null, l.lastBaseUpdate = y, l.shared.pending = null;
        }
      } while (!0);
      if (w === null && (s = _), l.baseState = s, l.firstBaseUpdate = h, l.lastBaseUpdate = w, t = l.shared.interleaved, t !== null) {
        l = t;
        do
          i |= l.lane, l = l.next;
        while (l !== t);
      } else o === null && (l.shared.lanes = 0);
      nn |= i, e.lanes = i, e.memoizedState = _;
    }
  }
  function ws(e, t, n) {
    if (e = t.effects, t.effects = null, e !== null) for (t = 0; t < e.length; t++) {
      var r = e[t], l = r.callback;
      if (l !== null) {
        if (r.callback = null, r = n, typeof l != "function") throw Error(m(191, l));
        l.call(r);
      }
    }
  }
  var ar = {}, pt = Dt(ar), cr = Dt(ar), fr = Dt(ar);
  function en(e) {
    if (e === ar) throw Error(m(174));
    return e;
  }
  function Ao(e, t) {
    switch (b(fr, t), b(cr, e), b(pt, ar), e = t.nodeType, e) {
      case 9:
      case 11:
        t = (t = t.documentElement) ? t.namespaceURI : Al(null, "");
        break;
      default:
        e = e === 8 ? t.parentNode : t, t = e.namespaceURI || null, e = e.tagName, t = Al(t, e);
    }
    te(pt), b(pt, t);
  }
  function Pn() {
    te(pt), te(cr), te(fr);
  }
  function _s(e) {
    en(fr.current);
    var t = en(pt.current), n = Al(t, e.type);
    t !== n && (b(cr, e), b(pt, n));
  }
  function Ho(e) {
    cr.current === e && (te(pt), te(cr));
  }
  var oe = Dt(0);
  function il(e) {
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
  var Wo = [];
  function Qo() {
    for (var e = 0; e < Wo.length; e++) Wo[e]._workInProgressVersionPrimary = null;
    Wo.length = 0;
  }
  var ul = xe.ReactCurrentDispatcher, $o = xe.ReactCurrentBatchConfig, tn = 0, ie = null, me = null, ge = null, sl = !1, dr = !1, pr = 0, _f = 0;
  function Ce() {
    throw Error(m(321));
  }
  function Ko(e, t) {
    if (t === null) return !1;
    for (var n = 0; n < t.length && n < e.length; n++) if (!nt(e[n], t[n])) return !1;
    return !0;
  }
  function Yo(e, t, n, r, l, o) {
    if (tn = o, ie = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, ul.current = e === null || e.memoizedState === null ? Ef : Cf, e = n(r, l), dr) {
      o = 0;
      do {
        if (dr = !1, pr = 0, 25 <= o) throw Error(m(301));
        o += 1, ge = me = null, t.updateQueue = null, ul.current = Nf, e = n(r, l);
      } while (dr);
    }
    if (ul.current = fl, t = me !== null && me.next !== null, tn = 0, ge = me = ie = null, sl = !1, t) throw Error(m(300));
    return e;
  }
  function Xo() {
    var e = pr !== 0;
    return pr = 0, e;
  }
  function ht() {
    var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return ge === null ? ie.memoizedState = ge = e : ge = ge.next = e, ge;
  }
  function Ge() {
    if (me === null) {
      var e = ie.alternate;
      e = e !== null ? e.memoizedState : null;
    } else e = me.next;
    var t = ge === null ? ie.memoizedState : ge.next;
    if (t !== null) ge = t, me = e;
    else {
      if (e === null) throw Error(m(310));
      me = e, e = { memoizedState: me.memoizedState, baseState: me.baseState, baseQueue: me.baseQueue, queue: me.queue, next: null }, ge === null ? ie.memoizedState = ge = e : ge = ge.next = e;
    }
    return ge;
  }
  function hr(e, t) {
    return typeof t == "function" ? t(e) : t;
  }
  function Go(e) {
    var t = Ge(), n = t.queue;
    if (n === null) throw Error(m(311));
    n.lastRenderedReducer = e;
    var r = me, l = r.baseQueue, o = n.pending;
    if (o !== null) {
      if (l !== null) {
        var i = l.next;
        l.next = o.next, o.next = i;
      }
      r.baseQueue = l = o, n.pending = null;
    }
    if (l !== null) {
      o = l.next, r = r.baseState;
      var u = i = null, s = null, h = o;
      do {
        var w = h.lane;
        if ((tn & w) === w) s !== null && (s = s.next = { lane: 0, action: h.action, hasEagerState: h.hasEagerState, eagerState: h.eagerState, next: null }), r = h.hasEagerState ? h.eagerState : e(r, h.action);
        else {
          var _ = {
            lane: w,
            action: h.action,
            hasEagerState: h.hasEagerState,
            eagerState: h.eagerState,
            next: null
          };
          s === null ? (u = s = _, i = r) : s = s.next = _, ie.lanes |= w, nn |= w;
        }
        h = h.next;
      } while (h !== null && h !== o);
      s === null ? i = r : s.next = u, nt(r, t.memoizedState) || (De = !0), t.memoizedState = r, t.baseState = i, t.baseQueue = s, n.lastRenderedState = r;
    }
    if (e = n.interleaved, e !== null) {
      l = e;
      do
        o = l.lane, ie.lanes |= o, nn |= o, l = l.next;
      while (l !== e);
    } else l === null && (n.lanes = 0);
    return [t.memoizedState, n.dispatch];
  }
  function Zo(e) {
    var t = Ge(), n = t.queue;
    if (n === null) throw Error(m(311));
    n.lastRenderedReducer = e;
    var r = n.dispatch, l = n.pending, o = t.memoizedState;
    if (l !== null) {
      n.pending = null;
      var i = l = l.next;
      do
        o = e(o, i.action), i = i.next;
      while (i !== l);
      nt(o, t.memoizedState) || (De = !0), t.memoizedState = o, t.baseQueue === null && (t.baseState = o), n.lastRenderedState = o;
    }
    return [o, r];
  }
  function Ss() {
  }
  function ks(e, t) {
    var n = ie, r = Ge(), l = t(), o = !nt(r.memoizedState, l);
    if (o && (r.memoizedState = l, De = !0), r = r.queue, Jo(Cs.bind(null, n, r, e), [e]), r.getSnapshot !== t || o || ge !== null && ge.memoizedState.tag & 1) {
      if (n.flags |= 2048, mr(9, Es.bind(null, n, r, l, t), void 0, null), we === null) throw Error(m(349));
      (tn & 30) !== 0 || xs(n, t, l);
    }
    return l;
  }
  function xs(e, t, n) {
    e.flags |= 16384, e = { getSnapshot: t, value: n }, t = ie.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, ie.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
  }
  function Es(e, t, n, r) {
    t.value = n, t.getSnapshot = r, Ns(t) && zs(e);
  }
  function Cs(e, t, n) {
    return n(function() {
      Ns(t) && zs(e);
    });
  }
  function Ns(e) {
    var t = e.getSnapshot;
    e = e.value;
    try {
      var n = t();
      return !nt(e, n);
    } catch {
      return !0;
    }
  }
  function zs(e) {
    var t = kt(e, 1);
    t !== null && ut(t, e, 1, -1);
  }
  function Ps(e) {
    var t = ht();
    return typeof e == "function" && (e = e()), t.memoizedState = t.baseState = e, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: hr, lastRenderedState: e }, t.queue = e, e = e.dispatch = xf.bind(null, ie, e), [t.memoizedState, e];
  }
  function mr(e, t, n, r) {
    return e = { tag: e, create: t, destroy: n, deps: r, next: null }, t = ie.updateQueue, t === null ? (t = { lastEffect: null, stores: null }, ie.updateQueue = t, t.lastEffect = e.next = e) : (n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e)), e;
  }
  function Ts() {
    return Ge().memoizedState;
  }
  function al(e, t, n, r) {
    var l = ht();
    ie.flags |= e, l.memoizedState = mr(1 | t, n, void 0, r === void 0 ? null : r);
  }
  function cl(e, t, n, r) {
    var l = Ge();
    r = r === void 0 ? null : r;
    var o = void 0;
    if (me !== null) {
      var i = me.memoizedState;
      if (o = i.destroy, r !== null && Ko(r, i.deps)) {
        l.memoizedState = mr(t, n, o, r);
        return;
      }
    }
    ie.flags |= e, l.memoizedState = mr(1 | t, n, o, r);
  }
  function Rs(e, t) {
    return al(8390656, 8, e, t);
  }
  function Jo(e, t) {
    return cl(2048, 8, e, t);
  }
  function Ls(e, t) {
    return cl(4, 2, e, t);
  }
  function js(e, t) {
    return cl(4, 4, e, t);
  }
  function Ms(e, t) {
    if (typeof t == "function") return e = e(), t(e), function() {
      t(null);
    };
    if (t != null) return e = e(), t.current = e, function() {
      t.current = null;
    };
  }
  function Os(e, t, n) {
    return n = n != null ? n.concat([e]) : null, cl(4, 4, Ms.bind(null, t, e), n);
  }
  function qo() {
  }
  function Ds(e, t) {
    var n = Ge();
    t = t === void 0 ? null : t;
    var r = n.memoizedState;
    return r !== null && t !== null && Ko(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
  }
  function Is(e, t) {
    var n = Ge();
    t = t === void 0 ? null : t;
    var r = n.memoizedState;
    return r !== null && t !== null && Ko(t, r[1]) ? r[0] : (e = e(), n.memoizedState = [e, t], e);
  }
  function Fs(e, t, n) {
    return (tn & 21) === 0 ? (e.baseState && (e.baseState = !1, De = !0), e.memoizedState = n) : (nt(n, t) || (n = pu(), ie.lanes |= n, nn |= n, e.baseState = !0), t);
  }
  function Sf(e, t) {
    var n = Y;
    Y = n !== 0 && 4 > n ? n : 4, e(!0);
    var r = $o.transition;
    $o.transition = {};
    try {
      e(!1), t();
    } finally {
      Y = n, $o.transition = r;
    }
  }
  function Us() {
    return Ge().memoizedState;
  }
  function kf(e, t, n) {
    var r = Wt(e);
    if (n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }, Bs(e)) Vs(t, n);
    else if (n = vs(e, t, n, r), n !== null) {
      var l = Re();
      ut(n, e, r, l), As(n, t, r);
    }
  }
  function xf(e, t, n) {
    var r = Wt(e), l = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
    if (Bs(e)) Vs(t, l);
    else {
      var o = e.alternate;
      if (e.lanes === 0 && (o === null || o.lanes === 0) && (o = t.lastRenderedReducer, o !== null)) try {
        var i = t.lastRenderedState, u = o(i, n);
        if (l.hasEagerState = !0, l.eagerState = u, nt(u, i)) {
          var s = t.interleaved;
          s === null ? (l.next = l, Bo(t)) : (l.next = s.next, s.next = l), t.interleaved = l;
          return;
        }
      } catch {
      }
      n = vs(e, t, l, r), n !== null && (l = Re(), ut(n, e, r, l), As(n, t, r));
    }
  }
  function Bs(e) {
    var t = e.alternate;
    return e === ie || t !== null && t === ie;
  }
  function Vs(e, t) {
    dr = sl = !0;
    var n = e.pending;
    n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
  }
  function As(e, t, n) {
    if ((n & 4194240) !== 0) {
      var r = t.lanes;
      r &= e.pendingLanes, n |= r, t.lanes = n, bl(e, n);
    }
  }
  var fl = { readContext: Xe, useCallback: Ce, useContext: Ce, useEffect: Ce, useImperativeHandle: Ce, useInsertionEffect: Ce, useLayoutEffect: Ce, useMemo: Ce, useReducer: Ce, useRef: Ce, useState: Ce, useDebugValue: Ce, useDeferredValue: Ce, useTransition: Ce, useMutableSource: Ce, useSyncExternalStore: Ce, useId: Ce, unstable_isNewReconciler: !1 }, Ef = { readContext: Xe, useCallback: function(e, t) {
    return ht().memoizedState = [e, t === void 0 ? null : t], e;
  }, useContext: Xe, useEffect: Rs, useImperativeHandle: function(e, t, n) {
    return n = n != null ? n.concat([e]) : null, al(
      4194308,
      4,
      Ms.bind(null, t, e),
      n
    );
  }, useLayoutEffect: function(e, t) {
    return al(4194308, 4, e, t);
  }, useInsertionEffect: function(e, t) {
    return al(4, 2, e, t);
  }, useMemo: function(e, t) {
    var n = ht();
    return t = t === void 0 ? null : t, e = e(), n.memoizedState = [e, t], e;
  }, useReducer: function(e, t, n) {
    var r = ht();
    return t = n !== void 0 ? n(t) : t, r.memoizedState = r.baseState = t, e = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: e, lastRenderedState: t }, r.queue = e, e = e.dispatch = kf.bind(null, ie, e), [r.memoizedState, e];
  }, useRef: function(e) {
    var t = ht();
    return e = { current: e }, t.memoizedState = e;
  }, useState: Ps, useDebugValue: qo, useDeferredValue: function(e) {
    return ht().memoizedState = e;
  }, useTransition: function() {
    var e = Ps(!1), t = e[0];
    return e = Sf.bind(null, e[1]), ht().memoizedState = e, [t, e];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(e, t, n) {
    var r = ie, l = ht();
    if (re) {
      if (n === void 0) throw Error(m(407));
      n = n();
    } else {
      if (n = t(), we === null) throw Error(m(349));
      (tn & 30) !== 0 || xs(r, t, n);
    }
    l.memoizedState = n;
    var o = { value: n, getSnapshot: t };
    return l.queue = o, Rs(Cs.bind(
      null,
      r,
      o,
      e
    ), [e]), r.flags |= 2048, mr(9, Es.bind(null, r, o, n, t), void 0, null), n;
  }, useId: function() {
    var e = ht(), t = we.identifierPrefix;
    if (re) {
      var n = St, r = _t;
      n = (r & ~(1 << 32 - tt(r) - 1)).toString(32) + n, t = ":" + t + "R" + n, n = pr++, 0 < n && (t += "H" + n.toString(32)), t += ":";
    } else n = _f++, t = ":" + t + "r" + n.toString(32) + ":";
    return e.memoizedState = t;
  }, unstable_isNewReconciler: !1 }, Cf = {
    readContext: Xe,
    useCallback: Ds,
    useContext: Xe,
    useEffect: Jo,
    useImperativeHandle: Os,
    useInsertionEffect: Ls,
    useLayoutEffect: js,
    useMemo: Is,
    useReducer: Go,
    useRef: Ts,
    useState: function() {
      return Go(hr);
    },
    useDebugValue: qo,
    useDeferredValue: function(e) {
      var t = Ge();
      return Fs(t, me.memoizedState, e);
    },
    useTransition: function() {
      var e = Go(hr)[0], t = Ge().memoizedState;
      return [e, t];
    },
    useMutableSource: Ss,
    useSyncExternalStore: ks,
    useId: Us,
    unstable_isNewReconciler: !1
  }, Nf = { readContext: Xe, useCallback: Ds, useContext: Xe, useEffect: Jo, useImperativeHandle: Os, useInsertionEffect: Ls, useLayoutEffect: js, useMemo: Is, useReducer: Zo, useRef: Ts, useState: function() {
    return Zo(hr);
  }, useDebugValue: qo, useDeferredValue: function(e) {
    var t = Ge();
    return me === null ? t.memoizedState = e : Fs(t, me.memoizedState, e);
  }, useTransition: function() {
    var e = Zo(hr)[0], t = Ge().memoizedState;
    return [e, t];
  }, useMutableSource: Ss, useSyncExternalStore: ks, useId: Us, unstable_isNewReconciler: !1 };
  function lt(e, t) {
    if (e && e.defaultProps) {
      t = C({}, t), e = e.defaultProps;
      for (var n in e) t[n] === void 0 && (t[n] = e[n]);
      return t;
    }
    return t;
  }
  function bo(e, t, n, r) {
    t = e.memoizedState, n = n(r, t), n = n == null ? t : C({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
  }
  var dl = { isMounted: function(e) {
    return (e = e._reactInternals) ? Xt(e) === e : !1;
  }, enqueueSetState: function(e, t, n) {
    e = e._reactInternals;
    var r = Re(), l = Wt(e), o = xt(r, l);
    o.payload = t, n != null && (o.callback = n), t = Bt(e, o, l), t !== null && (ut(t, e, l, r), ll(t, e, l));
  }, enqueueReplaceState: function(e, t, n) {
    e = e._reactInternals;
    var r = Re(), l = Wt(e), o = xt(r, l);
    o.tag = 1, o.payload = t, n != null && (o.callback = n), t = Bt(e, o, l), t !== null && (ut(t, e, l, r), ll(t, e, l));
  }, enqueueForceUpdate: function(e, t) {
    e = e._reactInternals;
    var n = Re(), r = Wt(e), l = xt(n, r);
    l.tag = 2, t != null && (l.callback = t), t = Bt(e, l, r), t !== null && (ut(t, e, r, n), ll(t, e, r));
  } };
  function Hs(e, t, n, r, l, o, i) {
    return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, o, i) : t.prototype && t.prototype.isPureReactComponent ? !tr(n, r) || !tr(l, o) : !0;
  }
  function Ws(e, t, n) {
    var r = !1, l = It, o = t.contextType;
    return typeof o == "object" && o !== null ? o = Xe(o) : (l = Oe(t) ? Zt : Ee.current, r = t.contextTypes, o = (r = r != null) ? Sn(e, l) : It), t = new t(n, o), e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null, t.updater = dl, e.stateNode = t, t._reactInternals = e, r && (e = e.stateNode, e.__reactInternalMemoizedUnmaskedChildContext = l, e.__reactInternalMemoizedMaskedChildContext = o), t;
  }
  function Qs(e, t, n, r) {
    e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && dl.enqueueReplaceState(t, t.state, null);
  }
  function ei(e, t, n, r) {
    var l = e.stateNode;
    l.props = n, l.state = e.memoizedState, l.refs = {}, Vo(e);
    var o = t.contextType;
    typeof o == "object" && o !== null ? l.context = Xe(o) : (o = Oe(t) ? Zt : Ee.current, l.context = Sn(e, o)), l.state = e.memoizedState, o = t.getDerivedStateFromProps, typeof o == "function" && (bo(e, t, o, n), l.state = e.memoizedState), typeof t.getDerivedStateFromProps == "function" || typeof l.getSnapshotBeforeUpdate == "function" || typeof l.UNSAFE_componentWillMount != "function" && typeof l.componentWillMount != "function" || (t = l.state, typeof l.componentWillMount == "function" && l.componentWillMount(), typeof l.UNSAFE_componentWillMount == "function" && l.UNSAFE_componentWillMount(), t !== l.state && dl.enqueueReplaceState(l, l.state, null), ol(e, n, l, r), l.state = e.memoizedState), typeof l.componentDidMount == "function" && (e.flags |= 4194308);
  }
  function Tn(e, t) {
    try {
      var n = "", r = t;
      do
        n += A(r), r = r.return;
      while (r);
      var l = n;
    } catch (o) {
      l = `
Error generating stack: ` + o.message + `
` + o.stack;
    }
    return { value: e, source: t, stack: l, digest: null };
  }
  function ti(e, t, n) {
    return { value: e, source: null, stack: n ?? null, digest: t ?? null };
  }
  function ni(e, t) {
    try {
      console.error(t.value);
    } catch (n) {
      setTimeout(function() {
        throw n;
      });
    }
  }
  var zf = typeof WeakMap == "function" ? WeakMap : Map;
  function $s(e, t, n) {
    n = xt(-1, n), n.tag = 3, n.payload = { element: null };
    var r = t.value;
    return n.callback = function() {
      wl || (wl = !0, yi = r), ni(e, t);
    }, n;
  }
  function Ks(e, t, n) {
    n = xt(-1, n), n.tag = 3;
    var r = e.type.getDerivedStateFromError;
    if (typeof r == "function") {
      var l = t.value;
      n.payload = function() {
        return r(l);
      }, n.callback = function() {
        ni(e, t);
      };
    }
    var o = e.stateNode;
    return o !== null && typeof o.componentDidCatch == "function" && (n.callback = function() {
      ni(e, t), typeof r != "function" && (At === null ? At = /* @__PURE__ */ new Set([this]) : At.add(this));
      var i = t.stack;
      this.componentDidCatch(t.value, { componentStack: i !== null ? i : "" });
    }), n;
  }
  function Ys(e, t, n) {
    var r = e.pingCache;
    if (r === null) {
      r = e.pingCache = new zf();
      var l = /* @__PURE__ */ new Set();
      r.set(t, l);
    } else l = r.get(t), l === void 0 && (l = /* @__PURE__ */ new Set(), r.set(t, l));
    l.has(n) || (l.add(n), e = Af.bind(null, e, t, n), t.then(e, e));
  }
  function Xs(e) {
    do {
      var t;
      if ((t = e.tag === 13) && (t = e.memoizedState, t = t !== null ? t.dehydrated !== null : !0), t) return e;
      e = e.return;
    } while (e !== null);
    return null;
  }
  function Gs(e, t, n, r, l) {
    return (e.mode & 1) === 0 ? (e === t ? e.flags |= 65536 : (e.flags |= 128, n.flags |= 131072, n.flags &= -52805, n.tag === 1 && (n.alternate === null ? n.tag = 17 : (t = xt(-1, 1), t.tag = 2, Bt(n, t, 1))), n.lanes |= 1), e) : (e.flags |= 65536, e.lanes = l, e);
  }
  var Pf = xe.ReactCurrentOwner, De = !1;
  function Te(e, t, n, r) {
    t.child = e === null ? ms(t, null, n, r) : Cn(t, e.child, n, r);
  }
  function Zs(e, t, n, r, l) {
    n = n.render;
    var o = t.ref;
    return zn(t, l), r = Yo(e, t, n, r, o, l), n = Xo(), e !== null && !De ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~l, Et(e, t, l)) : (re && n && Ro(t), t.flags |= 1, Te(e, t, r, l), t.child);
  }
  function Js(e, t, n, r, l) {
    if (e === null) {
      var o = n.type;
      return typeof o == "function" && !Ei(o) && o.defaultProps === void 0 && n.compare === null && n.defaultProps === void 0 ? (t.tag = 15, t.type = o, qs(e, t, o, r, l)) : (e = Cl(n.type, null, r, t, t.mode, l), e.ref = t.ref, e.return = t, t.child = e);
    }
    if (o = e.child, (e.lanes & l) === 0) {
      var i = o.memoizedProps;
      if (n = n.compare, n = n !== null ? n : tr, n(i, r) && e.ref === t.ref) return Et(e, t, l);
    }
    return t.flags |= 1, e = $t(o, r), e.ref = t.ref, e.return = t, t.child = e;
  }
  function qs(e, t, n, r, l) {
    if (e !== null) {
      var o = e.memoizedProps;
      if (tr(o, r) && e.ref === t.ref) if (De = !1, t.pendingProps = r = o, (e.lanes & l) !== 0) (e.flags & 131072) !== 0 && (De = !0);
      else return t.lanes = e.lanes, Et(e, t, l);
    }
    return ri(e, t, n, r, l);
  }
  function bs(e, t, n) {
    var r = t.pendingProps, l = r.children, o = e !== null ? e.memoizedState : null;
    if (r.mode === "hidden") if ((t.mode & 1) === 0) t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, b(Ln, Qe), Qe |= n;
    else {
      if ((n & 1073741824) === 0) return e = o !== null ? o.baseLanes | n : n, t.lanes = t.childLanes = 1073741824, t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }, t.updateQueue = null, b(Ln, Qe), Qe |= e, null;
      t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, r = o !== null ? o.baseLanes : n, b(Ln, Qe), Qe |= r;
    }
    else o !== null ? (r = o.baseLanes | n, t.memoizedState = null) : r = n, b(Ln, Qe), Qe |= r;
    return Te(e, t, l, n), t.child;
  }
  function ea(e, t) {
    var n = t.ref;
    (e === null && n !== null || e !== null && e.ref !== n) && (t.flags |= 512, t.flags |= 2097152);
  }
  function ri(e, t, n, r, l) {
    var o = Oe(n) ? Zt : Ee.current;
    return o = Sn(t, o), zn(t, l), n = Yo(e, t, n, r, o, l), r = Xo(), e !== null && !De ? (t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~l, Et(e, t, l)) : (re && r && Ro(t), t.flags |= 1, Te(e, t, n, l), t.child);
  }
  function ta(e, t, n, r, l) {
    if (Oe(n)) {
      var o = !0;
      Zr(t);
    } else o = !1;
    if (zn(t, l), t.stateNode === null) hl(e, t), Ws(t, n, r), ei(t, n, r, l), r = !0;
    else if (e === null) {
      var i = t.stateNode, u = t.memoizedProps;
      i.props = u;
      var s = i.context, h = n.contextType;
      typeof h == "object" && h !== null ? h = Xe(h) : (h = Oe(n) ? Zt : Ee.current, h = Sn(t, h));
      var w = n.getDerivedStateFromProps, _ = typeof w == "function" || typeof i.getSnapshotBeforeUpdate == "function";
      _ || typeof i.UNSAFE_componentWillReceiveProps != "function" && typeof i.componentWillReceiveProps != "function" || (u !== r || s !== h) && Qs(t, i, r, h), Ut = !1;
      var y = t.memoizedState;
      i.state = y, ol(t, r, i, l), s = t.memoizedState, u !== r || y !== s || Me.current || Ut ? (typeof w == "function" && (bo(t, n, w, r), s = t.memoizedState), (u = Ut || Hs(t, n, u, r, y, s, h)) ? (_ || typeof i.UNSAFE_componentWillMount != "function" && typeof i.componentWillMount != "function" || (typeof i.componentWillMount == "function" && i.componentWillMount(), typeof i.UNSAFE_componentWillMount == "function" && i.UNSAFE_componentWillMount()), typeof i.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof i.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = s), i.props = r, i.state = s, i.context = h, r = u) : (typeof i.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
    } else {
      i = t.stateNode, ys(e, t), u = t.memoizedProps, h = t.type === t.elementType ? u : lt(t.type, u), i.props = h, _ = t.pendingProps, y = i.context, s = n.contextType, typeof s == "object" && s !== null ? s = Xe(s) : (s = Oe(n) ? Zt : Ee.current, s = Sn(t, s));
      var x = n.getDerivedStateFromProps;
      (w = typeof x == "function" || typeof i.getSnapshotBeforeUpdate == "function") || typeof i.UNSAFE_componentWillReceiveProps != "function" && typeof i.componentWillReceiveProps != "function" || (u !== _ || y !== s) && Qs(t, i, r, s), Ut = !1, y = t.memoizedState, i.state = y, ol(t, r, i, l);
      var N = t.memoizedState;
      u !== _ || y !== N || Me.current || Ut ? (typeof x == "function" && (bo(t, n, x, r), N = t.memoizedState), (h = Ut || Hs(t, n, h, r, y, N, s) || !1) ? (w || typeof i.UNSAFE_componentWillUpdate != "function" && typeof i.componentWillUpdate != "function" || (typeof i.componentWillUpdate == "function" && i.componentWillUpdate(r, N, s), typeof i.UNSAFE_componentWillUpdate == "function" && i.UNSAFE_componentWillUpdate(r, N, s)), typeof i.componentDidUpdate == "function" && (t.flags |= 4), typeof i.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof i.componentDidUpdate != "function" || u === e.memoizedProps && y === e.memoizedState || (t.flags |= 4), typeof i.getSnapshotBeforeUpdate != "function" || u === e.memoizedProps && y === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = N), i.props = r, i.state = N, i.context = s, r = h) : (typeof i.componentDidUpdate != "function" || u === e.memoizedProps && y === e.memoizedState || (t.flags |= 4), typeof i.getSnapshotBeforeUpdate != "function" || u === e.memoizedProps && y === e.memoizedState || (t.flags |= 1024), r = !1);
    }
    return li(e, t, n, r, o, l);
  }
  function li(e, t, n, r, l, o) {
    ea(e, t);
    var i = (t.flags & 128) !== 0;
    if (!r && !i) return l && is(t, n, !1), Et(e, t, o);
    r = t.stateNode, Pf.current = t;
    var u = i && typeof n.getDerivedStateFromError != "function" ? null : r.render();
    return t.flags |= 1, e !== null && i ? (t.child = Cn(t, e.child, null, o), t.child = Cn(t, null, u, o)) : Te(e, t, u, o), t.memoizedState = r.state, l && is(t, n, !0), t.child;
  }
  function na(e) {
    var t = e.stateNode;
    t.pendingContext ? ls(e, t.pendingContext, t.pendingContext !== t.context) : t.context && ls(e, t.context, !1), Ao(e, t.containerInfo);
  }
  function ra(e, t, n, r, l) {
    return En(), Oo(l), t.flags |= 256, Te(e, t, n, r), t.child;
  }
  var oi = { dehydrated: null, treeContext: null, retryLane: 0 };
  function ii(e) {
    return { baseLanes: e, cachePool: null, transitions: null };
  }
  function la(e, t, n) {
    var r = t.pendingProps, l = oe.current, o = !1, i = (t.flags & 128) !== 0, u;
    if ((u = i) || (u = e !== null && e.memoizedState === null ? !1 : (l & 2) !== 0), u ? (o = !0, t.flags &= -129) : (e === null || e.memoizedState !== null) && (l |= 1), b(oe, l & 1), e === null)
      return Mo(t), e = t.memoizedState, e !== null && (e = e.dehydrated, e !== null) ? ((t.mode & 1) === 0 ? t.lanes = 1 : e.data === "$!" ? t.lanes = 8 : t.lanes = 1073741824, null) : (i = r.children, e = r.fallback, o ? (r = t.mode, o = t.child, i = { mode: "hidden", children: i }, (r & 1) === 0 && o !== null ? (o.childLanes = 0, o.pendingProps = i) : o = Nl(i, r, 0, null), e = un(e, r, n, null), o.return = t, e.return = t, o.sibling = e, t.child = o, t.child.memoizedState = ii(n), t.memoizedState = oi, e) : ui(t, i));
    if (l = e.memoizedState, l !== null && (u = l.dehydrated, u !== null)) return Tf(e, t, i, r, u, l, n);
    if (o) {
      o = r.fallback, i = t.mode, l = e.child, u = l.sibling;
      var s = { mode: "hidden", children: r.children };
      return (i & 1) === 0 && t.child !== l ? (r = t.child, r.childLanes = 0, r.pendingProps = s, t.deletions = null) : (r = $t(l, s), r.subtreeFlags = l.subtreeFlags & 14680064), u !== null ? o = $t(u, o) : (o = un(o, i, n, null), o.flags |= 2), o.return = t, r.return = t, r.sibling = o, t.child = r, r = o, o = t.child, i = e.child.memoizedState, i = i === null ? ii(n) : { baseLanes: i.baseLanes | n, cachePool: null, transitions: i.transitions }, o.memoizedState = i, o.childLanes = e.childLanes & ~n, t.memoizedState = oi, r;
    }
    return o = e.child, e = o.sibling, r = $t(o, { mode: "visible", children: r.children }), (t.mode & 1) === 0 && (r.lanes = n), r.return = t, r.sibling = null, e !== null && (n = t.deletions, n === null ? (t.deletions = [e], t.flags |= 16) : n.push(e)), t.child = r, t.memoizedState = null, r;
  }
  function ui(e, t) {
    return t = Nl({ mode: "visible", children: t }, e.mode, 0, null), t.return = e, e.child = t;
  }
  function pl(e, t, n, r) {
    return r !== null && Oo(r), Cn(t, e.child, null, n), e = ui(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
  }
  function Tf(e, t, n, r, l, o, i) {
    if (n)
      return t.flags & 256 ? (t.flags &= -257, r = ti(Error(m(422))), pl(e, t, i, r)) : t.memoizedState !== null ? (t.child = e.child, t.flags |= 128, null) : (o = r.fallback, l = t.mode, r = Nl({ mode: "visible", children: r.children }, l, 0, null), o = un(o, l, i, null), o.flags |= 2, r.return = t, o.return = t, r.sibling = o, t.child = r, (t.mode & 1) !== 0 && Cn(t, e.child, null, i), t.child.memoizedState = ii(i), t.memoizedState = oi, o);
    if ((t.mode & 1) === 0) return pl(e, t, i, null);
    if (l.data === "$!") {
      if (r = l.nextSibling && l.nextSibling.dataset, r) var u = r.dgst;
      return r = u, o = Error(m(419)), r = ti(o, r, void 0), pl(e, t, i, r);
    }
    if (u = (i & e.childLanes) !== 0, De || u) {
      if (r = we, r !== null) {
        switch (i & -i) {
          case 4:
            l = 2;
            break;
          case 16:
            l = 8;
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
            l = 32;
            break;
          case 536870912:
            l = 268435456;
            break;
          default:
            l = 0;
        }
        l = (l & (r.suspendedLanes | i)) !== 0 ? 0 : l, l !== 0 && l !== o.retryLane && (o.retryLane = l, kt(e, l), ut(r, e, l, -1));
      }
      return xi(), r = ti(Error(m(421))), pl(e, t, i, r);
    }
    return l.data === "$?" ? (t.flags |= 128, t.child = e.child, t = Hf.bind(null, e), l._reactRetry = t, null) : (e = o.treeContext, We = Ot(l.nextSibling), He = t, re = !0, rt = null, e !== null && (Ke[Ye++] = _t, Ke[Ye++] = St, Ke[Ye++] = Jt, _t = e.id, St = e.overflow, Jt = t), t = ui(t, r.children), t.flags |= 4096, t);
  }
  function oa(e, t, n) {
    e.lanes |= t;
    var r = e.alternate;
    r !== null && (r.lanes |= t), Uo(e.return, t, n);
  }
  function si(e, t, n, r, l) {
    var o = e.memoizedState;
    o === null ? e.memoizedState = { isBackwards: t, rendering: null, renderingStartTime: 0, last: r, tail: n, tailMode: l } : (o.isBackwards = t, o.rendering = null, o.renderingStartTime = 0, o.last = r, o.tail = n, o.tailMode = l);
  }
  function ia(e, t, n) {
    var r = t.pendingProps, l = r.revealOrder, o = r.tail;
    if (Te(e, t, r.children, n), r = oe.current, (r & 2) !== 0) r = r & 1 | 2, t.flags |= 128;
    else {
      if (e !== null && (e.flags & 128) !== 0) e: for (e = t.child; e !== null; ) {
        if (e.tag === 13) e.memoizedState !== null && oa(e, n, t);
        else if (e.tag === 19) oa(e, n, t);
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
      r &= 1;
    }
    if (b(oe, r), (t.mode & 1) === 0) t.memoizedState = null;
    else switch (l) {
      case "forwards":
        for (n = t.child, l = null; n !== null; ) e = n.alternate, e !== null && il(e) === null && (l = n), n = n.sibling;
        n = l, n === null ? (l = t.child, t.child = null) : (l = n.sibling, n.sibling = null), si(t, !1, l, n, o);
        break;
      case "backwards":
        for (n = null, l = t.child, t.child = null; l !== null; ) {
          if (e = l.alternate, e !== null && il(e) === null) {
            t.child = l;
            break;
          }
          e = l.sibling, l.sibling = n, n = l, l = e;
        }
        si(t, !0, n, null, o);
        break;
      case "together":
        si(t, !1, null, null, void 0);
        break;
      default:
        t.memoizedState = null;
    }
    return t.child;
  }
  function hl(e, t) {
    (t.mode & 1) === 0 && e !== null && (e.alternate = null, t.alternate = null, t.flags |= 2);
  }
  function Et(e, t, n) {
    if (e !== null && (t.dependencies = e.dependencies), nn |= t.lanes, (n & t.childLanes) === 0) return null;
    if (e !== null && t.child !== e.child) throw Error(m(153));
    if (t.child !== null) {
      for (e = t.child, n = $t(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; ) e = e.sibling, n = n.sibling = $t(e, e.pendingProps), n.return = t;
      n.sibling = null;
    }
    return t.child;
  }
  function Rf(e, t, n) {
    switch (t.tag) {
      case 3:
        na(t), En();
        break;
      case 5:
        _s(t);
        break;
      case 1:
        Oe(t.type) && Zr(t);
        break;
      case 4:
        Ao(t, t.stateNode.containerInfo);
        break;
      case 10:
        var r = t.type._context, l = t.memoizedProps.value;
        b(nl, r._currentValue), r._currentValue = l;
        break;
      case 13:
        if (r = t.memoizedState, r !== null)
          return r.dehydrated !== null ? (b(oe, oe.current & 1), t.flags |= 128, null) : (n & t.child.childLanes) !== 0 ? la(e, t, n) : (b(oe, oe.current & 1), e = Et(e, t, n), e !== null ? e.sibling : null);
        b(oe, oe.current & 1);
        break;
      case 19:
        if (r = (n & t.childLanes) !== 0, (e.flags & 128) !== 0) {
          if (r) return ia(e, t, n);
          t.flags |= 128;
        }
        if (l = t.memoizedState, l !== null && (l.rendering = null, l.tail = null, l.lastEffect = null), b(oe, oe.current), r) break;
        return null;
      case 22:
      case 23:
        return t.lanes = 0, bs(e, t, n);
    }
    return Et(e, t, n);
  }
  var ua, ai, sa, aa;
  ua = function(e, t) {
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
  }, ai = function() {
  }, sa = function(e, t, n, r) {
    var l = e.memoizedProps;
    if (l !== r) {
      e = t.stateNode, en(pt.current);
      var o = null;
      switch (n) {
        case "input":
          l = Fl(e, l), r = Fl(e, r), o = [];
          break;
        case "select":
          l = C({}, l, { value: void 0 }), r = C({}, r, { value: void 0 }), o = [];
          break;
        case "textarea":
          l = Vl(e, l), r = Vl(e, r), o = [];
          break;
        default:
          typeof l.onClick != "function" && typeof r.onClick == "function" && (e.onclick = Yr);
      }
      Hl(n, r);
      var i;
      n = null;
      for (h in l) if (!r.hasOwnProperty(h) && l.hasOwnProperty(h) && l[h] != null) if (h === "style") {
        var u = l[h];
        for (i in u) u.hasOwnProperty(i) && (n || (n = {}), n[i] = "");
      } else h !== "dangerouslySetInnerHTML" && h !== "children" && h !== "suppressContentEditableWarning" && h !== "suppressHydrationWarning" && h !== "autoFocus" && (V.hasOwnProperty(h) ? o || (o = []) : (o = o || []).push(h, null));
      for (h in r) {
        var s = r[h];
        if (u = l?.[h], r.hasOwnProperty(h) && s !== u && (s != null || u != null)) if (h === "style") if (u) {
          for (i in u) !u.hasOwnProperty(i) || s && s.hasOwnProperty(i) || (n || (n = {}), n[i] = "");
          for (i in s) s.hasOwnProperty(i) && u[i] !== s[i] && (n || (n = {}), n[i] = s[i]);
        } else n || (o || (o = []), o.push(
          h,
          n
        )), n = s;
        else h === "dangerouslySetInnerHTML" ? (s = s ? s.__html : void 0, u = u ? u.__html : void 0, s != null && u !== s && (o = o || []).push(h, s)) : h === "children" ? typeof s != "string" && typeof s != "number" || (o = o || []).push(h, "" + s) : h !== "suppressContentEditableWarning" && h !== "suppressHydrationWarning" && (V.hasOwnProperty(h) ? (s != null && h === "onScroll" && ee("scroll", e), o || u === s || (o = [])) : (o = o || []).push(h, s));
      }
      n && (o = o || []).push("style", n);
      var h = o;
      (t.updateQueue = h) && (t.flags |= 4);
    }
  }, aa = function(e, t, n, r) {
    n !== r && (t.flags |= 4);
  };
  function vr(e, t) {
    if (!re) switch (e.tailMode) {
      case "hidden":
        t = e.tail;
        for (var n = null; t !== null; ) t.alternate !== null && (n = t), t = t.sibling;
        n === null ? e.tail = null : n.sibling = null;
        break;
      case "collapsed":
        n = e.tail;
        for (var r = null; n !== null; ) n.alternate !== null && (r = n), n = n.sibling;
        r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
    }
  }
  function Ne(e) {
    var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
    if (t) for (var l = e.child; l !== null; ) n |= l.lanes | l.childLanes, r |= l.subtreeFlags & 14680064, r |= l.flags & 14680064, l.return = e, l = l.sibling;
    else for (l = e.child; l !== null; ) n |= l.lanes | l.childLanes, r |= l.subtreeFlags, r |= l.flags, l.return = e, l = l.sibling;
    return e.subtreeFlags |= r, e.childLanes = n, t;
  }
  function Lf(e, t, n) {
    var r = t.pendingProps;
    switch (Lo(t), t.tag) {
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
        return Ne(t), null;
      case 1:
        return Oe(t.type) && Gr(), Ne(t), null;
      case 3:
        return r = t.stateNode, Pn(), te(Me), te(Ee), Qo(), r.pendingContext && (r.context = r.pendingContext, r.pendingContext = null), (e === null || e.child === null) && (el(t) ? t.flags |= 4 : e === null || e.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, rt !== null && (_i(rt), rt = null))), ai(e, t), Ne(t), null;
      case 5:
        Ho(t);
        var l = en(fr.current);
        if (n = t.type, e !== null && t.stateNode != null) sa(e, t, n, r, l), e.ref !== t.ref && (t.flags |= 512, t.flags |= 2097152);
        else {
          if (!r) {
            if (t.stateNode === null) throw Error(m(166));
            return Ne(t), null;
          }
          if (e = en(pt.current), el(t)) {
            r = t.stateNode, n = t.type;
            var o = t.memoizedProps;
            switch (r[dt] = t, r[ir] = o, e = (t.mode & 1) !== 0, n) {
              case "dialog":
                ee("cancel", r), ee("close", r);
                break;
              case "iframe":
              case "object":
              case "embed":
                ee("load", r);
                break;
              case "video":
              case "audio":
                for (l = 0; l < rr.length; l++) ee(rr[l], r);
                break;
              case "source":
                ee("error", r);
                break;
              case "img":
              case "image":
              case "link":
                ee(
                  "error",
                  r
                ), ee("load", r);
                break;
              case "details":
                ee("toggle", r);
                break;
              case "input":
                Wi(r, o), ee("invalid", r);
                break;
              case "select":
                r._wrapperState = { wasMultiple: !!o.multiple }, ee("invalid", r);
                break;
              case "textarea":
                Ki(r, o), ee("invalid", r);
            }
            Hl(n, o), l = null;
            for (var i in o) if (o.hasOwnProperty(i)) {
              var u = o[i];
              i === "children" ? typeof u == "string" ? r.textContent !== u && (o.suppressHydrationWarning !== !0 && Kr(r.textContent, u, e), l = ["children", u]) : typeof u == "number" && r.textContent !== "" + u && (o.suppressHydrationWarning !== !0 && Kr(
                r.textContent,
                u,
                e
              ), l = ["children", "" + u]) : V.hasOwnProperty(i) && u != null && i === "onScroll" && ee("scroll", r);
            }
            switch (n) {
              case "input":
                xr(r), $i(r, o, !0);
                break;
              case "textarea":
                xr(r), Xi(r);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof o.onClick == "function" && (r.onclick = Yr);
            }
            r = l, t.updateQueue = r, r !== null && (t.flags |= 4);
          } else {
            i = l.nodeType === 9 ? l : l.ownerDocument, e === "http://www.w3.org/1999/xhtml" && (e = Gi(n)), e === "http://www.w3.org/1999/xhtml" ? n === "script" ? (e = i.createElement("div"), e.innerHTML = "<script><\/script>", e = e.removeChild(e.firstChild)) : typeof r.is == "string" ? e = i.createElement(n, { is: r.is }) : (e = i.createElement(n), n === "select" && (i = e, r.multiple ? i.multiple = !0 : r.size && (i.size = r.size))) : e = i.createElementNS(e, n), e[dt] = t, e[ir] = r, ua(e, t, !1, !1), t.stateNode = e;
            e: {
              switch (i = Wl(n, r), n) {
                case "dialog":
                  ee("cancel", e), ee("close", e), l = r;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  ee("load", e), l = r;
                  break;
                case "video":
                case "audio":
                  for (l = 0; l < rr.length; l++) ee(rr[l], e);
                  l = r;
                  break;
                case "source":
                  ee("error", e), l = r;
                  break;
                case "img":
                case "image":
                case "link":
                  ee(
                    "error",
                    e
                  ), ee("load", e), l = r;
                  break;
                case "details":
                  ee("toggle", e), l = r;
                  break;
                case "input":
                  Wi(e, r), l = Fl(e, r), ee("invalid", e);
                  break;
                case "option":
                  l = r;
                  break;
                case "select":
                  e._wrapperState = { wasMultiple: !!r.multiple }, l = C({}, r, { value: void 0 }), ee("invalid", e);
                  break;
                case "textarea":
                  Ki(e, r), l = Vl(e, r), ee("invalid", e);
                  break;
                default:
                  l = r;
              }
              Hl(n, l), u = l;
              for (o in u) if (u.hasOwnProperty(o)) {
                var s = u[o];
                o === "style" ? qi(e, s) : o === "dangerouslySetInnerHTML" ? (s = s ? s.__html : void 0, s != null && Zi(e, s)) : o === "children" ? typeof s == "string" ? (n !== "textarea" || s !== "") && Un(e, s) : typeof s == "number" && Un(e, "" + s) : o !== "suppressContentEditableWarning" && o !== "suppressHydrationWarning" && o !== "autoFocus" && (V.hasOwnProperty(o) ? s != null && o === "onScroll" && ee("scroll", e) : s != null && qe(e, o, s, i));
              }
              switch (n) {
                case "input":
                  xr(e), $i(e, r, !1);
                  break;
                case "textarea":
                  xr(e), Xi(e);
                  break;
                case "option":
                  r.value != null && e.setAttribute("value", "" + K(r.value));
                  break;
                case "select":
                  e.multiple = !!r.multiple, o = r.value, o != null ? an(e, !!r.multiple, o, !1) : r.defaultValue != null && an(
                    e,
                    !!r.multiple,
                    r.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof l.onClick == "function" && (e.onclick = Yr);
              }
              switch (n) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  r = !!r.autoFocus;
                  break e;
                case "img":
                  r = !0;
                  break e;
                default:
                  r = !1;
              }
            }
            r && (t.flags |= 4);
          }
          t.ref !== null && (t.flags |= 512, t.flags |= 2097152);
        }
        return Ne(t), null;
      case 6:
        if (e && t.stateNode != null) aa(e, t, e.memoizedProps, r);
        else {
          if (typeof r != "string" && t.stateNode === null) throw Error(m(166));
          if (n = en(fr.current), en(pt.current), el(t)) {
            if (r = t.stateNode, n = t.memoizedProps, r[dt] = t, (o = r.nodeValue !== n) && (e = He, e !== null)) switch (e.tag) {
              case 3:
                Kr(r.nodeValue, n, (e.mode & 1) !== 0);
                break;
              case 5:
                e.memoizedProps.suppressHydrationWarning !== !0 && Kr(r.nodeValue, n, (e.mode & 1) !== 0);
            }
            o && (t.flags |= 4);
          } else r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r), r[dt] = t, t.stateNode = r;
        }
        return Ne(t), null;
      case 13:
        if (te(oe), r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
          if (re && We !== null && (t.mode & 1) !== 0 && (t.flags & 128) === 0) ds(), En(), t.flags |= 98560, o = !1;
          else if (o = el(t), r !== null && r.dehydrated !== null) {
            if (e === null) {
              if (!o) throw Error(m(318));
              if (o = t.memoizedState, o = o !== null ? o.dehydrated : null, !o) throw Error(m(317));
              o[dt] = t;
            } else En(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Ne(t), o = !1;
          } else rt !== null && (_i(rt), rt = null), o = !0;
          if (!o) return t.flags & 65536 ? t : null;
        }
        return (t.flags & 128) !== 0 ? (t.lanes = n, t) : (r = r !== null, r !== (e !== null && e.memoizedState !== null) && r && (t.child.flags |= 8192, (t.mode & 1) !== 0 && (e === null || (oe.current & 1) !== 0 ? ve === 0 && (ve = 3) : xi())), t.updateQueue !== null && (t.flags |= 4), Ne(t), null);
      case 4:
        return Pn(), ai(e, t), e === null && lr(t.stateNode.containerInfo), Ne(t), null;
      case 10:
        return Fo(t.type._context), Ne(t), null;
      case 17:
        return Oe(t.type) && Gr(), Ne(t), null;
      case 19:
        if (te(oe), o = t.memoizedState, o === null) return Ne(t), null;
        if (r = (t.flags & 128) !== 0, i = o.rendering, i === null) if (r) vr(o, !1);
        else {
          if (ve !== 0 || e !== null && (e.flags & 128) !== 0) for (e = t.child; e !== null; ) {
            if (i = il(e), i !== null) {
              for (t.flags |= 128, vr(o, !1), r = i.updateQueue, r !== null && (t.updateQueue = r, t.flags |= 4), t.subtreeFlags = 0, r = n, n = t.child; n !== null; ) o = n, e = r, o.flags &= 14680066, i = o.alternate, i === null ? (o.childLanes = 0, o.lanes = e, o.child = null, o.subtreeFlags = 0, o.memoizedProps = null, o.memoizedState = null, o.updateQueue = null, o.dependencies = null, o.stateNode = null) : (o.childLanes = i.childLanes, o.lanes = i.lanes, o.child = i.child, o.subtreeFlags = 0, o.deletions = null, o.memoizedProps = i.memoizedProps, o.memoizedState = i.memoizedState, o.updateQueue = i.updateQueue, o.type = i.type, e = i.dependencies, o.dependencies = e === null ? null : { lanes: e.lanes, firstContext: e.firstContext }), n = n.sibling;
              return b(oe, oe.current & 1 | 2), t.child;
            }
            e = e.sibling;
          }
          o.tail !== null && fe() > jn && (t.flags |= 128, r = !0, vr(o, !1), t.lanes = 4194304);
        }
        else {
          if (!r) if (e = il(i), e !== null) {
            if (t.flags |= 128, r = !0, n = e.updateQueue, n !== null && (t.updateQueue = n, t.flags |= 4), vr(o, !0), o.tail === null && o.tailMode === "hidden" && !i.alternate && !re) return Ne(t), null;
          } else 2 * fe() - o.renderingStartTime > jn && n !== 1073741824 && (t.flags |= 128, r = !0, vr(o, !1), t.lanes = 4194304);
          o.isBackwards ? (i.sibling = t.child, t.child = i) : (n = o.last, n !== null ? n.sibling = i : t.child = i, o.last = i);
        }
        return o.tail !== null ? (t = o.tail, o.rendering = t, o.tail = t.sibling, o.renderingStartTime = fe(), t.sibling = null, n = oe.current, b(oe, r ? n & 1 | 2 : n & 1), t) : (Ne(t), null);
      case 22:
      case 23:
        return ki(), r = t.memoizedState !== null, e !== null && e.memoizedState !== null !== r && (t.flags |= 8192), r && (t.mode & 1) !== 0 ? (Qe & 1073741824) !== 0 && (Ne(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Ne(t), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(m(156, t.tag));
  }
  function jf(e, t) {
    switch (Lo(t), t.tag) {
      case 1:
        return Oe(t.type) && Gr(), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 3:
        return Pn(), te(Me), te(Ee), Qo(), e = t.flags, (e & 65536) !== 0 && (e & 128) === 0 ? (t.flags = e & -65537 | 128, t) : null;
      case 5:
        return Ho(t), null;
      case 13:
        if (te(oe), e = t.memoizedState, e !== null && e.dehydrated !== null) {
          if (t.alternate === null) throw Error(m(340));
          En();
        }
        return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
      case 19:
        return te(oe), null;
      case 4:
        return Pn(), null;
      case 10:
        return Fo(t.type._context), null;
      case 22:
      case 23:
        return ki(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var ml = !1, ze = !1, Mf = typeof WeakSet == "function" ? WeakSet : Set, E = null;
  function Rn(e, t) {
    var n = e.ref;
    if (n !== null) if (typeof n == "function") try {
      n(null);
    } catch (r) {
      se(e, t, r);
    }
    else n.current = null;
  }
  function ci(e, t, n) {
    try {
      n();
    } catch (r) {
      se(e, t, r);
    }
  }
  var ca = !1;
  function Of(e, t) {
    if (ko = Dr, e = Hu(), ho(e)) {
      if ("selectionStart" in e) var n = { start: e.selectionStart, end: e.selectionEnd };
      else e: {
        n = (n = e.ownerDocument) && n.defaultView || window;
        var r = n.getSelection && n.getSelection();
        if (r && r.rangeCount !== 0) {
          n = r.anchorNode;
          var l = r.anchorOffset, o = r.focusNode;
          r = r.focusOffset;
          try {
            n.nodeType, o.nodeType;
          } catch {
            n = null;
            break e;
          }
          var i = 0, u = -1, s = -1, h = 0, w = 0, _ = e, y = null;
          t: for (; ; ) {
            for (var x; _ !== n || l !== 0 && _.nodeType !== 3 || (u = i + l), _ !== o || r !== 0 && _.nodeType !== 3 || (s = i + r), _.nodeType === 3 && (i += _.nodeValue.length), (x = _.firstChild) !== null; )
              y = _, _ = x;
            for (; ; ) {
              if (_ === e) break t;
              if (y === n && ++h === l && (u = i), y === o && ++w === r && (s = i), (x = _.nextSibling) !== null) break;
              _ = y, y = _.parentNode;
            }
            _ = x;
          }
          n = u === -1 || s === -1 ? null : { start: u, end: s };
        } else n = null;
      }
      n = n || { start: 0, end: 0 };
    } else n = null;
    for (xo = { focusedElem: e, selectionRange: n }, Dr = !1, E = t; E !== null; ) if (t = E, e = t.child, (t.subtreeFlags & 1028) !== 0 && e !== null) e.return = t, E = e;
    else for (; E !== null; ) {
      t = E;
      try {
        var N = t.alternate;
        if ((t.flags & 1024) !== 0) switch (t.tag) {
          case 0:
          case 11:
          case 15:
            break;
          case 1:
            if (N !== null) {
              var z = N.memoizedProps, de = N.memoizedState, d = t.stateNode, c = d.getSnapshotBeforeUpdate(t.elementType === t.type ? z : lt(t.type, z), de);
              d.__reactInternalSnapshotBeforeUpdate = c;
            }
            break;
          case 3:
            var p = t.stateNode.containerInfo;
            p.nodeType === 1 ? p.textContent = "" : p.nodeType === 9 && p.documentElement && p.removeChild(p.documentElement);
            break;
          case 5:
          case 6:
          case 4:
          case 17:
            break;
          default:
            throw Error(m(163));
        }
      } catch (S) {
        se(t, t.return, S);
      }
      if (e = t.sibling, e !== null) {
        e.return = t.return, E = e;
        break;
      }
      E = t.return;
    }
    return N = ca, ca = !1, N;
  }
  function yr(e, t, n) {
    var r = t.updateQueue;
    if (r = r !== null ? r.lastEffect : null, r !== null) {
      var l = r = r.next;
      do {
        if ((l.tag & e) === e) {
          var o = l.destroy;
          l.destroy = void 0, o !== void 0 && ci(t, n, o);
        }
        l = l.next;
      } while (l !== r);
    }
  }
  function vl(e, t) {
    if (t = t.updateQueue, t = t !== null ? t.lastEffect : null, t !== null) {
      var n = t = t.next;
      do {
        if ((n.tag & e) === e) {
          var r = n.create;
          n.destroy = r();
        }
        n = n.next;
      } while (n !== t);
    }
  }
  function fi(e) {
    var t = e.ref;
    if (t !== null) {
      var n = e.stateNode;
      e.tag, e = n, typeof t == "function" ? t(e) : t.current = e;
    }
  }
  function fa(e) {
    var t = e.alternate;
    t !== null && (e.alternate = null, fa(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && (delete t[dt], delete t[ir], delete t[zo], delete t[vf], delete t[yf])), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
  }
  function da(e) {
    return e.tag === 5 || e.tag === 3 || e.tag === 4;
  }
  function pa(e) {
    e: for (; ; ) {
      for (; e.sibling === null; ) {
        if (e.return === null || da(e.return)) return null;
        e = e.return;
      }
      for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
        if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
        e.child.return = e, e = e.child;
      }
      if (!(e.flags & 2)) return e.stateNode;
    }
  }
  function di(e, t, n) {
    var r = e.tag;
    if (r === 5 || r === 6) e = e.stateNode, t ? n.nodeType === 8 ? n.parentNode.insertBefore(e, t) : n.insertBefore(e, t) : (n.nodeType === 8 ? (t = n.parentNode, t.insertBefore(e, n)) : (t = n, t.appendChild(e)), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = Yr));
    else if (r !== 4 && (e = e.child, e !== null)) for (di(e, t, n), e = e.sibling; e !== null; ) di(e, t, n), e = e.sibling;
  }
  function pi(e, t, n) {
    var r = e.tag;
    if (r === 5 || r === 6) e = e.stateNode, t ? n.insertBefore(e, t) : n.appendChild(e);
    else if (r !== 4 && (e = e.child, e !== null)) for (pi(e, t, n), e = e.sibling; e !== null; ) pi(e, t, n), e = e.sibling;
  }
  var Se = null, ot = !1;
  function Vt(e, t, n) {
    for (n = n.child; n !== null; ) ha(e, t, n), n = n.sibling;
  }
  function ha(e, t, n) {
    if (ft && typeof ft.onCommitFiberUnmount == "function") try {
      ft.onCommitFiberUnmount(Tr, n);
    } catch {
    }
    switch (n.tag) {
      case 5:
        ze || Rn(n, t);
      case 6:
        var r = Se, l = ot;
        Se = null, Vt(e, t, n), Se = r, ot = l, Se !== null && (ot ? (e = Se, n = n.stateNode, e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n)) : Se.removeChild(n.stateNode));
        break;
      case 18:
        Se !== null && (ot ? (e = Se, n = n.stateNode, e.nodeType === 8 ? No(e.parentNode, n) : e.nodeType === 1 && No(e, n), Gn(e)) : No(Se, n.stateNode));
        break;
      case 4:
        r = Se, l = ot, Se = n.stateNode.containerInfo, ot = !0, Vt(e, t, n), Se = r, ot = l;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!ze && (r = n.updateQueue, r !== null && (r = r.lastEffect, r !== null))) {
          l = r = r.next;
          do {
            var o = l, i = o.destroy;
            o = o.tag, i !== void 0 && ((o & 2) !== 0 || (o & 4) !== 0) && ci(n, t, i), l = l.next;
          } while (l !== r);
        }
        Vt(e, t, n);
        break;
      case 1:
        if (!ze && (Rn(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function")) try {
          r.props = n.memoizedProps, r.state = n.memoizedState, r.componentWillUnmount();
        } catch (u) {
          se(n, t, u);
        }
        Vt(e, t, n);
        break;
      case 21:
        Vt(e, t, n);
        break;
      case 22:
        n.mode & 1 ? (ze = (r = ze) || n.memoizedState !== null, Vt(e, t, n), ze = r) : Vt(e, t, n);
        break;
      default:
        Vt(e, t, n);
    }
  }
  function ma(e) {
    var t = e.updateQueue;
    if (t !== null) {
      e.updateQueue = null;
      var n = e.stateNode;
      n === null && (n = e.stateNode = new Mf()), t.forEach(function(r) {
        var l = Wf.bind(null, e, r);
        n.has(r) || (n.add(r), r.then(l, l));
      });
    }
  }
  function it(e, t) {
    var n = t.deletions;
    if (n !== null) for (var r = 0; r < n.length; r++) {
      var l = n[r];
      try {
        var o = e, i = t, u = i;
        e: for (; u !== null; ) {
          switch (u.tag) {
            case 5:
              Se = u.stateNode, ot = !1;
              break e;
            case 3:
              Se = u.stateNode.containerInfo, ot = !0;
              break e;
            case 4:
              Se = u.stateNode.containerInfo, ot = !0;
              break e;
          }
          u = u.return;
        }
        if (Se === null) throw Error(m(160));
        ha(o, i, l), Se = null, ot = !1;
        var s = l.alternate;
        s !== null && (s.return = null), l.return = null;
      } catch (h) {
        se(l, t, h);
      }
    }
    if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) va(t, e), t = t.sibling;
  }
  function va(e, t) {
    var n = e.alternate, r = e.flags;
    switch (e.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (it(t, e), mt(e), r & 4) {
          try {
            yr(3, e, e.return), vl(3, e);
          } catch (z) {
            se(e, e.return, z);
          }
          try {
            yr(5, e, e.return);
          } catch (z) {
            se(e, e.return, z);
          }
        }
        break;
      case 1:
        it(t, e), mt(e), r & 512 && n !== null && Rn(n, n.return);
        break;
      case 5:
        if (it(t, e), mt(e), r & 512 && n !== null && Rn(n, n.return), e.flags & 32) {
          var l = e.stateNode;
          try {
            Un(l, "");
          } catch (z) {
            se(e, e.return, z);
          }
        }
        if (r & 4 && (l = e.stateNode, l != null)) {
          var o = e.memoizedProps, i = n !== null ? n.memoizedProps : o, u = e.type, s = e.updateQueue;
          if (e.updateQueue = null, s !== null) try {
            u === "input" && o.type === "radio" && o.name != null && Qi(l, o), Wl(u, i);
            var h = Wl(u, o);
            for (i = 0; i < s.length; i += 2) {
              var w = s[i], _ = s[i + 1];
              w === "style" ? qi(l, _) : w === "dangerouslySetInnerHTML" ? Zi(l, _) : w === "children" ? Un(l, _) : qe(l, w, _, h);
            }
            switch (u) {
              case "input":
                Ul(l, o);
                break;
              case "textarea":
                Yi(l, o);
                break;
              case "select":
                var y = l._wrapperState.wasMultiple;
                l._wrapperState.wasMultiple = !!o.multiple;
                var x = o.value;
                x != null ? an(l, !!o.multiple, x, !1) : y !== !!o.multiple && (o.defaultValue != null ? an(
                  l,
                  !!o.multiple,
                  o.defaultValue,
                  !0
                ) : an(l, !!o.multiple, o.multiple ? [] : "", !1));
            }
            l[ir] = o;
          } catch (z) {
            se(e, e.return, z);
          }
        }
        break;
      case 6:
        if (it(t, e), mt(e), r & 4) {
          if (e.stateNode === null) throw Error(m(162));
          l = e.stateNode, o = e.memoizedProps;
          try {
            l.nodeValue = o;
          } catch (z) {
            se(e, e.return, z);
          }
        }
        break;
      case 3:
        if (it(t, e), mt(e), r & 4 && n !== null && n.memoizedState.isDehydrated) try {
          Gn(t.containerInfo);
        } catch (z) {
          se(e, e.return, z);
        }
        break;
      case 4:
        it(t, e), mt(e);
        break;
      case 13:
        it(t, e), mt(e), l = e.child, l.flags & 8192 && (o = l.memoizedState !== null, l.stateNode.isHidden = o, !o || l.alternate !== null && l.alternate.memoizedState !== null || (vi = fe())), r & 4 && ma(e);
        break;
      case 22:
        if (w = n !== null && n.memoizedState !== null, e.mode & 1 ? (ze = (h = ze) || w, it(t, e), ze = h) : it(t, e), mt(e), r & 8192) {
          if (h = e.memoizedState !== null, (e.stateNode.isHidden = h) && !w && (e.mode & 1) !== 0) for (E = e, w = e.child; w !== null; ) {
            for (_ = E = w; E !== null; ) {
              switch (y = E, x = y.child, y.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  yr(4, y, y.return);
                  break;
                case 1:
                  Rn(y, y.return);
                  var N = y.stateNode;
                  if (typeof N.componentWillUnmount == "function") {
                    r = y, n = y.return;
                    try {
                      t = r, N.props = t.memoizedProps, N.state = t.memoizedState, N.componentWillUnmount();
                    } catch (z) {
                      se(r, n, z);
                    }
                  }
                  break;
                case 5:
                  Rn(y, y.return);
                  break;
                case 22:
                  if (y.memoizedState !== null) {
                    wa(_);
                    continue;
                  }
              }
              x !== null ? (x.return = y, E = x) : wa(_);
            }
            w = w.sibling;
          }
          e: for (w = null, _ = e; ; ) {
            if (_.tag === 5) {
              if (w === null) {
                w = _;
                try {
                  l = _.stateNode, h ? (o = l.style, typeof o.setProperty == "function" ? o.setProperty("display", "none", "important") : o.display = "none") : (u = _.stateNode, s = _.memoizedProps.style, i = s != null && s.hasOwnProperty("display") ? s.display : null, u.style.display = Ji("display", i));
                } catch (z) {
                  se(e, e.return, z);
                }
              }
            } else if (_.tag === 6) {
              if (w === null) try {
                _.stateNode.nodeValue = h ? "" : _.memoizedProps;
              } catch (z) {
                se(e, e.return, z);
              }
            } else if ((_.tag !== 22 && _.tag !== 23 || _.memoizedState === null || _ === e) && _.child !== null) {
              _.child.return = _, _ = _.child;
              continue;
            }
            if (_ === e) break e;
            for (; _.sibling === null; ) {
              if (_.return === null || _.return === e) break e;
              w === _ && (w = null), _ = _.return;
            }
            w === _ && (w = null), _.sibling.return = _.return, _ = _.sibling;
          }
        }
        break;
      case 19:
        it(t, e), mt(e), r & 4 && ma(e);
        break;
      case 21:
        break;
      default:
        it(
          t,
          e
        ), mt(e);
    }
  }
  function mt(e) {
    var t = e.flags;
    if (t & 2) {
      try {
        e: {
          for (var n = e.return; n !== null; ) {
            if (da(n)) {
              var r = n;
              break e;
            }
            n = n.return;
          }
          throw Error(m(160));
        }
        switch (r.tag) {
          case 5:
            var l = r.stateNode;
            r.flags & 32 && (Un(l, ""), r.flags &= -33);
            var o = pa(e);
            pi(e, o, l);
            break;
          case 3:
          case 4:
            var i = r.stateNode.containerInfo, u = pa(e);
            di(e, u, i);
            break;
          default:
            throw Error(m(161));
        }
      } catch (s) {
        se(e, e.return, s);
      }
      e.flags &= -3;
    }
    t & 4096 && (e.flags &= -4097);
  }
  function Df(e, t, n) {
    E = e, ya(e);
  }
  function ya(e, t, n) {
    for (var r = (e.mode & 1) !== 0; E !== null; ) {
      var l = E, o = l.child;
      if (l.tag === 22 && r) {
        var i = l.memoizedState !== null || ml;
        if (!i) {
          var u = l.alternate, s = u !== null && u.memoizedState !== null || ze;
          u = ml;
          var h = ze;
          if (ml = i, (ze = s) && !h) for (E = l; E !== null; ) i = E, s = i.child, i.tag === 22 && i.memoizedState !== null ? _a(l) : s !== null ? (s.return = i, E = s) : _a(l);
          for (; o !== null; ) E = o, ya(o), o = o.sibling;
          E = l, ml = u, ze = h;
        }
        ga(e);
      } else (l.subtreeFlags & 8772) !== 0 && o !== null ? (o.return = l, E = o) : ga(e);
    }
  }
  function ga(e) {
    for (; E !== null; ) {
      var t = E;
      if ((t.flags & 8772) !== 0) {
        var n = t.alternate;
        try {
          if ((t.flags & 8772) !== 0) switch (t.tag) {
            case 0:
            case 11:
            case 15:
              ze || vl(5, t);
              break;
            case 1:
              var r = t.stateNode;
              if (t.flags & 4 && !ze) if (n === null) r.componentDidMount();
              else {
                var l = t.elementType === t.type ? n.memoizedProps : lt(t.type, n.memoizedProps);
                r.componentDidUpdate(l, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
              }
              var o = t.updateQueue;
              o !== null && ws(t, o, r);
              break;
            case 3:
              var i = t.updateQueue;
              if (i !== null) {
                if (n = null, t.child !== null) switch (t.child.tag) {
                  case 5:
                    n = t.child.stateNode;
                    break;
                  case 1:
                    n = t.child.stateNode;
                }
                ws(t, i, n);
              }
              break;
            case 5:
              var u = t.stateNode;
              if (n === null && t.flags & 4) {
                n = u;
                var s = t.memoizedProps;
                switch (t.type) {
                  case "button":
                  case "input":
                  case "select":
                  case "textarea":
                    s.autoFocus && n.focus();
                    break;
                  case "img":
                    s.src && (n.src = s.src);
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
                var h = t.alternate;
                if (h !== null) {
                  var w = h.memoizedState;
                  if (w !== null) {
                    var _ = w.dehydrated;
                    _ !== null && Gn(_);
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
              throw Error(m(163));
          }
          ze || t.flags & 512 && fi(t);
        } catch (y) {
          se(t, t.return, y);
        }
      }
      if (t === e) {
        E = null;
        break;
      }
      if (n = t.sibling, n !== null) {
        n.return = t.return, E = n;
        break;
      }
      E = t.return;
    }
  }
  function wa(e) {
    for (; E !== null; ) {
      var t = E;
      if (t === e) {
        E = null;
        break;
      }
      var n = t.sibling;
      if (n !== null) {
        n.return = t.return, E = n;
        break;
      }
      E = t.return;
    }
  }
  function _a(e) {
    for (; E !== null; ) {
      var t = E;
      try {
        switch (t.tag) {
          case 0:
          case 11:
          case 15:
            var n = t.return;
            try {
              vl(4, t);
            } catch (s) {
              se(t, n, s);
            }
            break;
          case 1:
            var r = t.stateNode;
            if (typeof r.componentDidMount == "function") {
              var l = t.return;
              try {
                r.componentDidMount();
              } catch (s) {
                se(t, l, s);
              }
            }
            var o = t.return;
            try {
              fi(t);
            } catch (s) {
              se(t, o, s);
            }
            break;
          case 5:
            var i = t.return;
            try {
              fi(t);
            } catch (s) {
              se(t, i, s);
            }
        }
      } catch (s) {
        se(t, t.return, s);
      }
      if (t === e) {
        E = null;
        break;
      }
      var u = t.sibling;
      if (u !== null) {
        u.return = t.return, E = u;
        break;
      }
      E = t.return;
    }
  }
  var If = Math.ceil, yl = xe.ReactCurrentDispatcher, hi = xe.ReactCurrentOwner, Ze = xe.ReactCurrentBatchConfig, B = 0, we = null, pe = null, ke = 0, Qe = 0, Ln = Dt(0), ve = 0, gr = null, nn = 0, gl = 0, mi = 0, wr = null, Ie = null, vi = 0, jn = 1 / 0, Ct = null, wl = !1, yi = null, At = null, _l = !1, Ht = null, Sl = 0, _r = 0, gi = null, kl = -1, xl = 0;
  function Re() {
    return (B & 6) !== 0 ? fe() : kl !== -1 ? kl : kl = fe();
  }
  function Wt(e) {
    return (e.mode & 1) === 0 ? 1 : (B & 2) !== 0 && ke !== 0 ? ke & -ke : wf.transition !== null ? (xl === 0 && (xl = pu()), xl) : (e = Y, e !== 0 || (e = window.event, e = e === void 0 ? 16 : ku(e.type)), e);
  }
  function ut(e, t, n, r) {
    if (50 < _r) throw _r = 0, gi = null, Error(m(185));
    Qn(e, n, r), ((B & 2) === 0 || e !== we) && (e === we && ((B & 2) === 0 && (gl |= n), ve === 4 && Qt(e, ke)), Fe(e, r), n === 1 && B === 0 && (t.mode & 1) === 0 && (jn = fe() + 500, Jr && Ft()));
  }
  function Fe(e, t) {
    var n = e.callbackNode;
    gc(e, t);
    var r = jr(e, e === we ? ke : 0);
    if (r === 0) n !== null && cu(n), e.callbackNode = null, e.callbackPriority = 0;
    else if (t = r & -r, e.callbackPriority !== t) {
      if (n != null && cu(n), t === 1) e.tag === 0 ? gf(ka.bind(null, e)) : us(ka.bind(null, e)), hf(function() {
        (B & 6) === 0 && Ft();
      }), n = null;
      else {
        switch (hu(r)) {
          case 1:
            n = Zl;
            break;
          case 4:
            n = fu;
            break;
          case 16:
            n = Pr;
            break;
          case 536870912:
            n = du;
            break;
          default:
            n = Pr;
        }
        n = Ra(n, Sa.bind(null, e));
      }
      e.callbackPriority = t, e.callbackNode = n;
    }
  }
  function Sa(e, t) {
    if (kl = -1, xl = 0, (B & 6) !== 0) throw Error(m(327));
    var n = e.callbackNode;
    if (Mn() && e.callbackNode !== n) return null;
    var r = jr(e, e === we ? ke : 0);
    if (r === 0) return null;
    if ((r & 30) !== 0 || (r & e.expiredLanes) !== 0 || t) t = El(e, r);
    else {
      t = r;
      var l = B;
      B |= 2;
      var o = Ea();
      (we !== e || ke !== t) && (Ct = null, jn = fe() + 500, ln(e, t));
      do
        try {
          Bf();
          break;
        } catch (u) {
          xa(e, u);
        }
      while (!0);
      Io(), yl.current = o, B = l, pe !== null ? t = 0 : (we = null, ke = 0, t = ve);
    }
    if (t !== 0) {
      if (t === 2 && (l = Jl(e), l !== 0 && (r = l, t = wi(e, l))), t === 1) throw n = gr, ln(e, 0), Qt(e, r), Fe(e, fe()), n;
      if (t === 6) Qt(e, r);
      else {
        if (l = e.current.alternate, (r & 30) === 0 && !Ff(l) && (t = El(e, r), t === 2 && (o = Jl(e), o !== 0 && (r = o, t = wi(e, o))), t === 1)) throw n = gr, ln(e, 0), Qt(e, r), Fe(e, fe()), n;
        switch (e.finishedWork = l, e.finishedLanes = r, t) {
          case 0:
          case 1:
            throw Error(m(345));
          case 2:
            on(e, Ie, Ct);
            break;
          case 3:
            if (Qt(e, r), (r & 130023424) === r && (t = vi + 500 - fe(), 10 < t)) {
              if (jr(e, 0) !== 0) break;
              if (l = e.suspendedLanes, (l & r) !== r) {
                Re(), e.pingedLanes |= e.suspendedLanes & l;
                break;
              }
              e.timeoutHandle = Co(on.bind(null, e, Ie, Ct), t);
              break;
            }
            on(e, Ie, Ct);
            break;
          case 4:
            if (Qt(e, r), (r & 4194240) === r) break;
            for (t = e.eventTimes, l = -1; 0 < r; ) {
              var i = 31 - tt(r);
              o = 1 << i, i = t[i], i > l && (l = i), r &= ~o;
            }
            if (r = l, r = fe() - r, r = (120 > r ? 120 : 480 > r ? 480 : 1080 > r ? 1080 : 1920 > r ? 1920 : 3e3 > r ? 3e3 : 4320 > r ? 4320 : 1960 * If(r / 1960)) - r, 10 < r) {
              e.timeoutHandle = Co(on.bind(null, e, Ie, Ct), r);
              break;
            }
            on(e, Ie, Ct);
            break;
          case 5:
            on(e, Ie, Ct);
            break;
          default:
            throw Error(m(329));
        }
      }
    }
    return Fe(e, fe()), e.callbackNode === n ? Sa.bind(null, e) : null;
  }
  function wi(e, t) {
    var n = wr;
    return e.current.memoizedState.isDehydrated && (ln(e, t).flags |= 256), e = El(e, t), e !== 2 && (t = Ie, Ie = n, t !== null && _i(t)), e;
  }
  function _i(e) {
    Ie === null ? Ie = e : Ie.push.apply(Ie, e);
  }
  function Ff(e) {
    for (var t = e; ; ) {
      if (t.flags & 16384) {
        var n = t.updateQueue;
        if (n !== null && (n = n.stores, n !== null)) for (var r = 0; r < n.length; r++) {
          var l = n[r], o = l.getSnapshot;
          l = l.value;
          try {
            if (!nt(o(), l)) return !1;
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
  function Qt(e, t) {
    for (t &= ~mi, t &= ~gl, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes; 0 < t; ) {
      var n = 31 - tt(t), r = 1 << n;
      e[n] = -1, t &= ~r;
    }
  }
  function ka(e) {
    if ((B & 6) !== 0) throw Error(m(327));
    Mn();
    var t = jr(e, 0);
    if ((t & 1) === 0) return Fe(e, fe()), null;
    var n = El(e, t);
    if (e.tag !== 0 && n === 2) {
      var r = Jl(e);
      r !== 0 && (t = r, n = wi(e, r));
    }
    if (n === 1) throw n = gr, ln(e, 0), Qt(e, t), Fe(e, fe()), n;
    if (n === 6) throw Error(m(345));
    return e.finishedWork = e.current.alternate, e.finishedLanes = t, on(e, Ie, Ct), Fe(e, fe()), null;
  }
  function Si(e, t) {
    var n = B;
    B |= 1;
    try {
      return e(t);
    } finally {
      B = n, B === 0 && (jn = fe() + 500, Jr && Ft());
    }
  }
  function rn(e) {
    Ht !== null && Ht.tag === 0 && (B & 6) === 0 && Mn();
    var t = B;
    B |= 1;
    var n = Ze.transition, r = Y;
    try {
      if (Ze.transition = null, Y = 1, e) return e();
    } finally {
      Y = r, Ze.transition = n, B = t, (B & 6) === 0 && Ft();
    }
  }
  function ki() {
    Qe = Ln.current, te(Ln);
  }
  function ln(e, t) {
    e.finishedWork = null, e.finishedLanes = 0;
    var n = e.timeoutHandle;
    if (n !== -1 && (e.timeoutHandle = -1, pf(n)), pe !== null) for (n = pe.return; n !== null; ) {
      var r = n;
      switch (Lo(r), r.tag) {
        case 1:
          r = r.type.childContextTypes, r != null && Gr();
          break;
        case 3:
          Pn(), te(Me), te(Ee), Qo();
          break;
        case 5:
          Ho(r);
          break;
        case 4:
          Pn();
          break;
        case 13:
          te(oe);
          break;
        case 19:
          te(oe);
          break;
        case 10:
          Fo(r.type._context);
          break;
        case 22:
        case 23:
          ki();
      }
      n = n.return;
    }
    if (we = e, pe = e = $t(e.current, null), ke = Qe = t, ve = 0, gr = null, mi = gl = nn = 0, Ie = wr = null, bt !== null) {
      for (t = 0; t < bt.length; t++) if (n = bt[t], r = n.interleaved, r !== null) {
        n.interleaved = null;
        var l = r.next, o = n.pending;
        if (o !== null) {
          var i = o.next;
          o.next = l, r.next = i;
        }
        n.pending = r;
      }
      bt = null;
    }
    return e;
  }
  function xa(e, t) {
    do {
      var n = pe;
      try {
        if (Io(), ul.current = fl, sl) {
          for (var r = ie.memoizedState; r !== null; ) {
            var l = r.queue;
            l !== null && (l.pending = null), r = r.next;
          }
          sl = !1;
        }
        if (tn = 0, ge = me = ie = null, dr = !1, pr = 0, hi.current = null, n === null || n.return === null) {
          ve = 1, gr = t, pe = null;
          break;
        }
        e: {
          var o = e, i = n.return, u = n, s = t;
          if (t = ke, u.flags |= 32768, s !== null && typeof s == "object" && typeof s.then == "function") {
            var h = s, w = u, _ = w.tag;
            if ((w.mode & 1) === 0 && (_ === 0 || _ === 11 || _ === 15)) {
              var y = w.alternate;
              y ? (w.updateQueue = y.updateQueue, w.memoizedState = y.memoizedState, w.lanes = y.lanes) : (w.updateQueue = null, w.memoizedState = null);
            }
            var x = Xs(i);
            if (x !== null) {
              x.flags &= -257, Gs(x, i, u, o, t), x.mode & 1 && Ys(o, h, t), t = x, s = h;
              var N = t.updateQueue;
              if (N === null) {
                var z = /* @__PURE__ */ new Set();
                z.add(s), t.updateQueue = z;
              } else N.add(s);
              break e;
            } else {
              if ((t & 1) === 0) {
                Ys(o, h, t), xi();
                break e;
              }
              s = Error(m(426));
            }
          } else if (re && u.mode & 1) {
            var de = Xs(i);
            if (de !== null) {
              (de.flags & 65536) === 0 && (de.flags |= 256), Gs(de, i, u, o, t), Oo(Tn(s, u));
              break e;
            }
          }
          o = s = Tn(s, u), ve !== 4 && (ve = 2), wr === null ? wr = [o] : wr.push(o), o = i;
          do {
            switch (o.tag) {
              case 3:
                o.flags |= 65536, t &= -t, o.lanes |= t;
                var d = $s(o, s, t);
                gs(o, d);
                break e;
              case 1:
                u = s;
                var c = o.type, p = o.stateNode;
                if ((o.flags & 128) === 0 && (typeof c.getDerivedStateFromError == "function" || p !== null && typeof p.componentDidCatch == "function" && (At === null || !At.has(p)))) {
                  o.flags |= 65536, t &= -t, o.lanes |= t;
                  var S = Ks(o, u, t);
                  gs(o, S);
                  break e;
                }
            }
            o = o.return;
          } while (o !== null);
        }
        Na(n);
      } catch (P) {
        t = P, pe === n && n !== null && (pe = n = n.return);
        continue;
      }
      break;
    } while (!0);
  }
  function Ea() {
    var e = yl.current;
    return yl.current = fl, e === null ? fl : e;
  }
  function xi() {
    (ve === 0 || ve === 3 || ve === 2) && (ve = 4), we === null || (nn & 268435455) === 0 && (gl & 268435455) === 0 || Qt(we, ke);
  }
  function El(e, t) {
    var n = B;
    B |= 2;
    var r = Ea();
    (we !== e || ke !== t) && (Ct = null, ln(e, t));
    do
      try {
        Uf();
        break;
      } catch (l) {
        xa(e, l);
      }
    while (!0);
    if (Io(), B = n, yl.current = r, pe !== null) throw Error(m(261));
    return we = null, ke = 0, ve;
  }
  function Uf() {
    for (; pe !== null; ) Ca(pe);
  }
  function Bf() {
    for (; pe !== null && !ac(); ) Ca(pe);
  }
  function Ca(e) {
    var t = Ta(e.alternate, e, Qe);
    e.memoizedProps = e.pendingProps, t === null ? Na(e) : pe = t, hi.current = null;
  }
  function Na(e) {
    var t = e;
    do {
      var n = t.alternate;
      if (e = t.return, (t.flags & 32768) === 0) {
        if (n = Lf(n, t, Qe), n !== null) {
          pe = n;
          return;
        }
      } else {
        if (n = jf(n, t), n !== null) {
          n.flags &= 32767, pe = n;
          return;
        }
        if (e !== null) e.flags |= 32768, e.subtreeFlags = 0, e.deletions = null;
        else {
          ve = 6, pe = null;
          return;
        }
      }
      if (t = t.sibling, t !== null) {
        pe = t;
        return;
      }
      pe = t = e;
    } while (t !== null);
    ve === 0 && (ve = 5);
  }
  function on(e, t, n) {
    var r = Y, l = Ze.transition;
    try {
      Ze.transition = null, Y = 1, Vf(e, t, n, r);
    } finally {
      Ze.transition = l, Y = r;
    }
    return null;
  }
  function Vf(e, t, n, r) {
    do
      Mn();
    while (Ht !== null);
    if ((B & 6) !== 0) throw Error(m(327));
    n = e.finishedWork;
    var l = e.finishedLanes;
    if (n === null) return null;
    if (e.finishedWork = null, e.finishedLanes = 0, n === e.current) throw Error(m(177));
    e.callbackNode = null, e.callbackPriority = 0;
    var o = n.lanes | n.childLanes;
    if (wc(e, o), e === we && (pe = we = null, ke = 0), (n.subtreeFlags & 2064) === 0 && (n.flags & 2064) === 0 || _l || (_l = !0, Ra(Pr, function() {
      return Mn(), null;
    })), o = (n.flags & 15990) !== 0, (n.subtreeFlags & 15990) !== 0 || o) {
      o = Ze.transition, Ze.transition = null;
      var i = Y;
      Y = 1;
      var u = B;
      B |= 4, hi.current = null, Of(e, n), va(n, e), of(xo), Dr = !!ko, xo = ko = null, e.current = n, Df(n), cc(), B = u, Y = i, Ze.transition = o;
    } else e.current = n;
    if (_l && (_l = !1, Ht = e, Sl = l), o = e.pendingLanes, o === 0 && (At = null), pc(n.stateNode), Fe(e, fe()), t !== null) for (r = e.onRecoverableError, n = 0; n < t.length; n++) l = t[n], r(l.value, { componentStack: l.stack, digest: l.digest });
    if (wl) throw wl = !1, e = yi, yi = null, e;
    return (Sl & 1) !== 0 && e.tag !== 0 && Mn(), o = e.pendingLanes, (o & 1) !== 0 ? e === gi ? _r++ : (_r = 0, gi = e) : _r = 0, Ft(), null;
  }
  function Mn() {
    if (Ht !== null) {
      var e = hu(Sl), t = Ze.transition, n = Y;
      try {
        if (Ze.transition = null, Y = 16 > e ? 16 : e, Ht === null) var r = !1;
        else {
          if (e = Ht, Ht = null, Sl = 0, (B & 6) !== 0) throw Error(m(331));
          var l = B;
          for (B |= 4, E = e.current; E !== null; ) {
            var o = E, i = o.child;
            if ((E.flags & 16) !== 0) {
              var u = o.deletions;
              if (u !== null) {
                for (var s = 0; s < u.length; s++) {
                  var h = u[s];
                  for (E = h; E !== null; ) {
                    var w = E;
                    switch (w.tag) {
                      case 0:
                      case 11:
                      case 15:
                        yr(8, w, o);
                    }
                    var _ = w.child;
                    if (_ !== null) _.return = w, E = _;
                    else for (; E !== null; ) {
                      w = E;
                      var y = w.sibling, x = w.return;
                      if (fa(w), w === h) {
                        E = null;
                        break;
                      }
                      if (y !== null) {
                        y.return = x, E = y;
                        break;
                      }
                      E = x;
                    }
                  }
                }
                var N = o.alternate;
                if (N !== null) {
                  var z = N.child;
                  if (z !== null) {
                    N.child = null;
                    do {
                      var de = z.sibling;
                      z.sibling = null, z = de;
                    } while (z !== null);
                  }
                }
                E = o;
              }
            }
            if ((o.subtreeFlags & 2064) !== 0 && i !== null) i.return = o, E = i;
            else e: for (; E !== null; ) {
              if (o = E, (o.flags & 2048) !== 0) switch (o.tag) {
                case 0:
                case 11:
                case 15:
                  yr(9, o, o.return);
              }
              var d = o.sibling;
              if (d !== null) {
                d.return = o.return, E = d;
                break e;
              }
              E = o.return;
            }
          }
          var c = e.current;
          for (E = c; E !== null; ) {
            i = E;
            var p = i.child;
            if ((i.subtreeFlags & 2064) !== 0 && p !== null) p.return = i, E = p;
            else e: for (i = c; E !== null; ) {
              if (u = E, (u.flags & 2048) !== 0) try {
                switch (u.tag) {
                  case 0:
                  case 11:
                  case 15:
                    vl(9, u);
                }
              } catch (P) {
                se(u, u.return, P);
              }
              if (u === i) {
                E = null;
                break e;
              }
              var S = u.sibling;
              if (S !== null) {
                S.return = u.return, E = S;
                break e;
              }
              E = u.return;
            }
          }
          if (B = l, Ft(), ft && typeof ft.onPostCommitFiberRoot == "function") try {
            ft.onPostCommitFiberRoot(Tr, e);
          } catch {
          }
          r = !0;
        }
        return r;
      } finally {
        Y = n, Ze.transition = t;
      }
    }
    return !1;
  }
  function za(e, t, n) {
    t = Tn(n, t), t = $s(e, t, 1), e = Bt(e, t, 1), t = Re(), e !== null && (Qn(e, 1, t), Fe(e, t));
  }
  function se(e, t, n) {
    if (e.tag === 3) za(e, e, n);
    else for (; t !== null; ) {
      if (t.tag === 3) {
        za(t, e, n);
        break;
      } else if (t.tag === 1) {
        var r = t.stateNode;
        if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (At === null || !At.has(r))) {
          e = Tn(n, e), e = Ks(t, e, 1), t = Bt(t, e, 1), e = Re(), t !== null && (Qn(t, 1, e), Fe(t, e));
          break;
        }
      }
      t = t.return;
    }
  }
  function Af(e, t, n) {
    var r = e.pingCache;
    r !== null && r.delete(t), t = Re(), e.pingedLanes |= e.suspendedLanes & n, we === e && (ke & n) === n && (ve === 4 || ve === 3 && (ke & 130023424) === ke && 500 > fe() - vi ? ln(e, 0) : mi |= n), Fe(e, t);
  }
  function Pa(e, t) {
    t === 0 && ((e.mode & 1) === 0 ? t = 1 : (t = Lr, Lr <<= 1, (Lr & 130023424) === 0 && (Lr = 4194304)));
    var n = Re();
    e = kt(e, t), e !== null && (Qn(e, t, n), Fe(e, n));
  }
  function Hf(e) {
    var t = e.memoizedState, n = 0;
    t !== null && (n = t.retryLane), Pa(e, n);
  }
  function Wf(e, t) {
    var n = 0;
    switch (e.tag) {
      case 13:
        var r = e.stateNode, l = e.memoizedState;
        l !== null && (n = l.retryLane);
        break;
      case 19:
        r = e.stateNode;
        break;
      default:
        throw Error(m(314));
    }
    r !== null && r.delete(t), Pa(e, n);
  }
  var Ta;
  Ta = function(e, t, n) {
    if (e !== null) if (e.memoizedProps !== t.pendingProps || Me.current) De = !0;
    else {
      if ((e.lanes & n) === 0 && (t.flags & 128) === 0) return De = !1, Rf(e, t, n);
      De = (e.flags & 131072) !== 0;
    }
    else De = !1, re && (t.flags & 1048576) !== 0 && ss(t, br, t.index);
    switch (t.lanes = 0, t.tag) {
      case 2:
        var r = t.type;
        hl(e, t), e = t.pendingProps;
        var l = Sn(t, Ee.current);
        zn(t, n), l = Yo(null, t, r, e, l, n);
        var o = Xo();
        return t.flags |= 1, typeof l == "object" && l !== null && typeof l.render == "function" && l.$$typeof === void 0 ? (t.tag = 1, t.memoizedState = null, t.updateQueue = null, Oe(r) ? (o = !0, Zr(t)) : o = !1, t.memoizedState = l.state !== null && l.state !== void 0 ? l.state : null, Vo(t), l.updater = dl, t.stateNode = l, l._reactInternals = t, ei(t, r, e, n), t = li(null, t, r, !0, o, n)) : (t.tag = 0, re && o && Ro(t), Te(null, t, l, n), t = t.child), t;
      case 16:
        r = t.elementType;
        e: {
          switch (hl(e, t), e = t.pendingProps, l = r._init, r = l(r._payload), t.type = r, l = t.tag = $f(r), e = lt(r, e), l) {
            case 0:
              t = ri(null, t, r, e, n);
              break e;
            case 1:
              t = ta(null, t, r, e, n);
              break e;
            case 11:
              t = Zs(null, t, r, e, n);
              break e;
            case 14:
              t = Js(null, t, r, lt(r.type, e), n);
              break e;
          }
          throw Error(m(
            306,
            r,
            ""
          ));
        }
        return t;
      case 0:
        return r = t.type, l = t.pendingProps, l = t.elementType === r ? l : lt(r, l), ri(e, t, r, l, n);
      case 1:
        return r = t.type, l = t.pendingProps, l = t.elementType === r ? l : lt(r, l), ta(e, t, r, l, n);
      case 3:
        e: {
          if (na(t), e === null) throw Error(m(387));
          r = t.pendingProps, o = t.memoizedState, l = o.element, ys(e, t), ol(t, r, null, n);
          var i = t.memoizedState;
          if (r = i.element, o.isDehydrated) if (o = { element: r, isDehydrated: !1, cache: i.cache, pendingSuspenseBoundaries: i.pendingSuspenseBoundaries, transitions: i.transitions }, t.updateQueue.baseState = o, t.memoizedState = o, t.flags & 256) {
            l = Tn(Error(m(423)), t), t = ra(e, t, r, n, l);
            break e;
          } else if (r !== l) {
            l = Tn(Error(m(424)), t), t = ra(e, t, r, n, l);
            break e;
          } else for (We = Ot(t.stateNode.containerInfo.firstChild), He = t, re = !0, rt = null, n = ms(t, null, r, n), t.child = n; n; ) n.flags = n.flags & -3 | 4096, n = n.sibling;
          else {
            if (En(), r === l) {
              t = Et(e, t, n);
              break e;
            }
            Te(e, t, r, n);
          }
          t = t.child;
        }
        return t;
      case 5:
        return _s(t), e === null && Mo(t), r = t.type, l = t.pendingProps, o = e !== null ? e.memoizedProps : null, i = l.children, Eo(r, l) ? i = null : o !== null && Eo(r, o) && (t.flags |= 32), ea(e, t), Te(e, t, i, n), t.child;
      case 6:
        return e === null && Mo(t), null;
      case 13:
        return la(e, t, n);
      case 4:
        return Ao(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = Cn(t, null, r, n) : Te(e, t, r, n), t.child;
      case 11:
        return r = t.type, l = t.pendingProps, l = t.elementType === r ? l : lt(r, l), Zs(e, t, r, l, n);
      case 7:
        return Te(e, t, t.pendingProps, n), t.child;
      case 8:
        return Te(e, t, t.pendingProps.children, n), t.child;
      case 12:
        return Te(e, t, t.pendingProps.children, n), t.child;
      case 10:
        e: {
          if (r = t.type._context, l = t.pendingProps, o = t.memoizedProps, i = l.value, b(nl, r._currentValue), r._currentValue = i, o !== null) if (nt(o.value, i)) {
            if (o.children === l.children && !Me.current) {
              t = Et(e, t, n);
              break e;
            }
          } else for (o = t.child, o !== null && (o.return = t); o !== null; ) {
            var u = o.dependencies;
            if (u !== null) {
              i = o.child;
              for (var s = u.firstContext; s !== null; ) {
                if (s.context === r) {
                  if (o.tag === 1) {
                    s = xt(-1, n & -n), s.tag = 2;
                    var h = o.updateQueue;
                    if (h !== null) {
                      h = h.shared;
                      var w = h.pending;
                      w === null ? s.next = s : (s.next = w.next, w.next = s), h.pending = s;
                    }
                  }
                  o.lanes |= n, s = o.alternate, s !== null && (s.lanes |= n), Uo(
                    o.return,
                    n,
                    t
                  ), u.lanes |= n;
                  break;
                }
                s = s.next;
              }
            } else if (o.tag === 10) i = o.type === t.type ? null : o.child;
            else if (o.tag === 18) {
              if (i = o.return, i === null) throw Error(m(341));
              i.lanes |= n, u = i.alternate, u !== null && (u.lanes |= n), Uo(i, n, t), i = o.sibling;
            } else i = o.child;
            if (i !== null) i.return = o;
            else for (i = o; i !== null; ) {
              if (i === t) {
                i = null;
                break;
              }
              if (o = i.sibling, o !== null) {
                o.return = i.return, i = o;
                break;
              }
              i = i.return;
            }
            o = i;
          }
          Te(e, t, l.children, n), t = t.child;
        }
        return t;
      case 9:
        return l = t.type, r = t.pendingProps.children, zn(t, n), l = Xe(l), r = r(l), t.flags |= 1, Te(e, t, r, n), t.child;
      case 14:
        return r = t.type, l = lt(r, t.pendingProps), l = lt(r.type, l), Js(e, t, r, l, n);
      case 15:
        return qs(e, t, t.type, t.pendingProps, n);
      case 17:
        return r = t.type, l = t.pendingProps, l = t.elementType === r ? l : lt(r, l), hl(e, t), t.tag = 1, Oe(r) ? (e = !0, Zr(t)) : e = !1, zn(t, n), Ws(t, r, l), ei(t, r, l, n), li(null, t, r, !0, e, n);
      case 19:
        return ia(e, t, n);
      case 22:
        return bs(e, t, n);
    }
    throw Error(m(156, t.tag));
  };
  function Ra(e, t) {
    return au(e, t);
  }
  function Qf(e, t, n, r) {
    this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Je(e, t, n, r) {
    return new Qf(e, t, n, r);
  }
  function Ei(e) {
    return e = e.prototype, !(!e || !e.isReactComponent);
  }
  function $f(e) {
    if (typeof e == "function") return Ei(e) ? 1 : 0;
    if (e != null) {
      if (e = e.$$typeof, e === at) return 11;
      if (e === ct) return 14;
    }
    return 2;
  }
  function $t(e, t) {
    var n = e.alternate;
    return n === null ? (n = Je(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 14680064, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n;
  }
  function Cl(e, t, n, r, l, o) {
    var i = 2;
    if (r = e, typeof e == "function") Ei(e) && (i = 1);
    else if (typeof e == "string") i = 5;
    else e: switch (e) {
      case Le:
        return un(n.children, l, o, t);
      case $e:
        i = 8, l |= 8;
        break;
      case zt:
        return e = Je(12, n, t, l | 2), e.elementType = zt, e.lanes = o, e;
      case Be:
        return e = Je(13, n, t, l), e.elementType = Be, e.lanes = o, e;
      case et:
        return e = Je(19, n, t, l), e.elementType = et, e.lanes = o, e;
      case ue:
        return Nl(n, l, o, t);
      default:
        if (typeof e == "object" && e !== null) switch (e.$$typeof) {
          case yt:
            i = 10;
            break e;
          case Yt:
            i = 9;
            break e;
          case at:
            i = 11;
            break e;
          case ct:
            i = 14;
            break e;
          case je:
            i = 16, r = null;
            break e;
        }
        throw Error(m(130, e == null ? e : typeof e, ""));
    }
    return t = Je(i, n, t, l), t.elementType = e, t.type = r, t.lanes = o, t;
  }
  function un(e, t, n, r) {
    return e = Je(7, e, r, t), e.lanes = n, e;
  }
  function Nl(e, t, n, r) {
    return e = Je(22, e, r, t), e.elementType = ue, e.lanes = n, e.stateNode = { isHidden: !1 }, e;
  }
  function Ci(e, t, n) {
    return e = Je(6, e, null, t), e.lanes = n, e;
  }
  function Ni(e, t, n) {
    return t = Je(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = { containerInfo: e.containerInfo, pendingChildren: null, implementation: e.implementation }, t;
  }
  function Kf(e, t, n, r, l) {
    this.tag = t, this.containerInfo = e, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = ql(0), this.expirationTimes = ql(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = ql(0), this.identifierPrefix = r, this.onRecoverableError = l, this.mutableSourceEagerHydrationData = null;
  }
  function zi(e, t, n, r, l, o, i, u, s) {
    return e = new Kf(e, t, n, u, s), t === 1 ? (t = 1, o === !0 && (t |= 8)) : t = 0, o = Je(3, null, null, t), e.current = o, o.stateNode = e, o.memoizedState = { element: r, isDehydrated: n, cache: null, transitions: null, pendingSuspenseBoundaries: null }, Vo(o), e;
  }
  function Yf(e, t, n) {
    var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: Pe, key: r == null ? null : "" + r, children: e, containerInfo: t, implementation: n };
  }
  function La(e) {
    if (!e) return It;
    e = e._reactInternals;
    e: {
      if (Xt(e) !== e || e.tag !== 1) throw Error(m(170));
      var t = e;
      do {
        switch (t.tag) {
          case 3:
            t = t.stateNode.context;
            break e;
          case 1:
            if (Oe(t.type)) {
              t = t.stateNode.__reactInternalMemoizedMergedChildContext;
              break e;
            }
        }
        t = t.return;
      } while (t !== null);
      throw Error(m(171));
    }
    if (e.tag === 1) {
      var n = e.type;
      if (Oe(n)) return os(e, n, t);
    }
    return t;
  }
  function ja(e, t, n, r, l, o, i, u, s) {
    return e = zi(n, r, !0, e, l, o, i, u, s), e.context = La(null), n = e.current, r = Re(), l = Wt(n), o = xt(r, l), o.callback = t ?? null, Bt(n, o, l), e.current.lanes = l, Qn(e, l, r), Fe(e, r), e;
  }
  function zl(e, t, n, r) {
    var l = t.current, o = Re(), i = Wt(l);
    return n = La(n), t.context === null ? t.context = n : t.pendingContext = n, t = xt(o, i), t.payload = { element: e }, r = r === void 0 ? null : r, r !== null && (t.callback = r), e = Bt(l, t, i), e !== null && (ut(e, l, i, o), ll(e, l, i)), i;
  }
  function Pl(e) {
    return e = e.current, e.child ? (e.child.tag === 5, e.child.stateNode) : null;
  }
  function Ma(e, t) {
    if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
      var n = e.retryLane;
      e.retryLane = n !== 0 && n < t ? n : t;
    }
  }
  function Pi(e, t) {
    Ma(e, t), (e = e.alternate) && Ma(e, t);
  }
  function Xf() {
    return null;
  }
  var Oa = typeof reportError == "function" ? reportError : function(e) {
    console.error(e);
  };
  function Ti(e) {
    this._internalRoot = e;
  }
  Tl.prototype.render = Ti.prototype.render = function(e) {
    var t = this._internalRoot;
    if (t === null) throw Error(m(409));
    zl(e, t, null, null);
  }, Tl.prototype.unmount = Ti.prototype.unmount = function() {
    var e = this._internalRoot;
    if (e !== null) {
      this._internalRoot = null;
      var t = e.containerInfo;
      rn(function() {
        zl(null, e, null, null);
      }), t[gt] = null;
    }
  };
  function Tl(e) {
    this._internalRoot = e;
  }
  Tl.prototype.unstable_scheduleHydration = function(e) {
    if (e) {
      var t = yu();
      e = { blockedOn: null, target: e, priority: t };
      for (var n = 0; n < Lt.length && t !== 0 && t < Lt[n].priority; n++) ;
      Lt.splice(n, 0, e), n === 0 && _u(e);
    }
  };
  function Ri(e) {
    return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
  }
  function Rl(e) {
    return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11 && (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "));
  }
  function Da() {
  }
  function Gf(e, t, n, r, l) {
    if (l) {
      if (typeof r == "function") {
        var o = r;
        r = function() {
          var h = Pl(i);
          o.call(h);
        };
      }
      var i = ja(t, r, e, 0, null, !1, !1, "", Da);
      return e._reactRootContainer = i, e[gt] = i.current, lr(e.nodeType === 8 ? e.parentNode : e), rn(), i;
    }
    for (; l = e.lastChild; ) e.removeChild(l);
    if (typeof r == "function") {
      var u = r;
      r = function() {
        var h = Pl(s);
        u.call(h);
      };
    }
    var s = zi(e, 0, !1, null, null, !1, !1, "", Da);
    return e._reactRootContainer = s, e[gt] = s.current, lr(e.nodeType === 8 ? e.parentNode : e), rn(function() {
      zl(t, s, n, r);
    }), s;
  }
  function Ll(e, t, n, r, l) {
    var o = n._reactRootContainer;
    if (o) {
      var i = o;
      if (typeof l == "function") {
        var u = l;
        l = function() {
          var s = Pl(i);
          u.call(s);
        };
      }
      zl(t, i, e, l);
    } else i = Gf(n, t, e, l, r);
    return Pl(i);
  }
  mu = function(e) {
    switch (e.tag) {
      case 3:
        var t = e.stateNode;
        if (t.current.memoizedState.isDehydrated) {
          var n = Wn(t.pendingLanes);
          n !== 0 && (bl(t, n | 1), Fe(t, fe()), (B & 6) === 0 && (jn = fe() + 500, Ft()));
        }
        break;
      case 13:
        rn(function() {
          var r = kt(e, 1);
          if (r !== null) {
            var l = Re();
            ut(r, e, 1, l);
          }
        }), Pi(e, 1);
    }
  }, eo = function(e) {
    if (e.tag === 13) {
      var t = kt(e, 134217728);
      if (t !== null) {
        var n = Re();
        ut(t, e, 134217728, n);
      }
      Pi(e, 134217728);
    }
  }, vu = function(e) {
    if (e.tag === 13) {
      var t = Wt(e), n = kt(e, t);
      if (n !== null) {
        var r = Re();
        ut(n, e, t, r);
      }
      Pi(e, t);
    }
  }, yu = function() {
    return Y;
  }, gu = function(e, t) {
    var n = Y;
    try {
      return Y = e, t();
    } finally {
      Y = n;
    }
  }, Kl = function(e, t, n) {
    switch (t) {
      case "input":
        if (Ul(e, n), t = n.name, n.type === "radio" && t != null) {
          for (n = e; n.parentNode; ) n = n.parentNode;
          for (n = n.querySelectorAll("input[name=" + JSON.stringify("" + t) + '][type="radio"]'), t = 0; t < n.length; t++) {
            var r = n[t];
            if (r !== e && r.form === e.form) {
              var l = Xr(r);
              if (!l) throw Error(m(90));
              Hi(r), Ul(r, l);
            }
          }
        }
        break;
      case "textarea":
        Yi(e, n);
        break;
      case "select":
        t = n.value, t != null && an(e, !!n.multiple, t, !1);
    }
  }, nu = Si, ru = rn;
  var Zf = { usingClientEntryPoint: !1, Events: [ur, wn, Xr, eu, tu, Si] }, Sr = { findFiberByHostInstance: Gt, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, Jf = { bundleType: Sr.bundleType, version: Sr.version, rendererPackageName: Sr.rendererPackageName, rendererConfig: Sr.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: xe.ReactCurrentDispatcher, findHostInstanceByFiber: function(e) {
    return e = uu(e), e === null ? null : e.stateNode;
  }, findFiberByHostInstance: Sr.findFiberByHostInstance || Xf, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var jl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!jl.isDisabled && jl.supportsFiber) try {
      Tr = jl.inject(Jf), ft = jl;
    } catch {
    }
  }
  return Ue.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Zf, Ue.createPortal = function(e, t) {
    var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!Ri(t)) throw Error(m(200));
    return Yf(e, t, null, n);
  }, Ue.createRoot = function(e, t) {
    if (!Ri(e)) throw Error(m(299));
    var n = !1, r = "", l = Oa;
    return t != null && (t.unstable_strictMode === !0 && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onRecoverableError !== void 0 && (l = t.onRecoverableError)), t = zi(e, 1, !1, null, null, n, !1, r, l), e[gt] = t.current, lr(e.nodeType === 8 ? e.parentNode : e), new Ti(t);
  }, Ue.findDOMNode = function(e) {
    if (e == null) return null;
    if (e.nodeType === 1) return e;
    var t = e._reactInternals;
    if (t === void 0)
      throw typeof e.render == "function" ? Error(m(188)) : (e = Object.keys(e).join(","), Error(m(268, e)));
    return e = uu(t), e = e === null ? null : e.stateNode, e;
  }, Ue.flushSync = function(e) {
    return rn(e);
  }, Ue.hydrate = function(e, t, n) {
    if (!Rl(t)) throw Error(m(200));
    return Ll(null, e, t, !0, n);
  }, Ue.hydrateRoot = function(e, t, n) {
    if (!Ri(e)) throw Error(m(405));
    var r = n != null && n.hydratedSources || null, l = !1, o = "", i = Oa;
    if (n != null && (n.unstable_strictMode === !0 && (l = !0), n.identifierPrefix !== void 0 && (o = n.identifierPrefix), n.onRecoverableError !== void 0 && (i = n.onRecoverableError)), t = ja(t, null, e, 1, n ?? null, l, !1, o, i), e[gt] = t.current, lr(e), r) for (e = 0; e < r.length; e++) n = r[e], l = n._getVersion, l = l(n._source), t.mutableSourceEagerHydrationData == null ? t.mutableSourceEagerHydrationData = [n, l] : t.mutableSourceEagerHydrationData.push(
      n,
      l
    );
    return new Tl(t);
  }, Ue.render = function(e, t, n) {
    if (!Rl(t)) throw Error(m(200));
    return Ll(null, e, t, !1, n);
  }, Ue.unmountComponentAtNode = function(e) {
    if (!Rl(e)) throw Error(m(40));
    return e._reactRootContainer ? (rn(function() {
      Ll(null, null, e, !1, function() {
        e._reactRootContainer = null, e[gt] = null;
      });
    }), !0) : !1;
  }, Ue.unstable_batchedUpdates = Si, Ue.unstable_renderSubtreeIntoContainer = function(e, t, n, r) {
    if (!Rl(n)) throw Error(m(200));
    if (e == null || e._reactInternals === void 0) throw Error(m(38));
    return Ll(e, t, n, !1, r);
  }, Ue.version = "18.3.1-next-f1338f8080-20240426", Ue;
}
var Aa;
function Xa() {
  if (Aa) return ji.exports;
  Aa = 1;
  function a() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(a);
      } catch (v) {
        console.error(v);
      }
  }
  return a(), ji.exports = rd(), ji.exports;
}
var Ga = Xa(), Ol = {}, Ha;
function ld() {
  if (Ha) return Ol;
  Ha = 1;
  var a = Xa();
  return Ol.createRoot = a.createRoot, Ol.hydrateRoot = a.hydrateRoot, Ol;
}
var Za = ld(), Di = { exports: {} }, kr = {};
var Wa;
function od() {
  if (Wa) return kr;
  Wa = 1;
  var a = Bi(), v = /* @__PURE__ */ Symbol.for("react.element"), m = /* @__PURE__ */ Symbol.for("react.fragment"), D = Object.prototype.hasOwnProperty, V = a.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, Z = { key: !0, ref: !0, __self: !0, __source: !0 };
  function Q(le, $, ye) {
    var he, X = {}, O = null, ae = null;
    ye !== void 0 && (O = "" + ye), $.key !== void 0 && (O = "" + $.key), $.ref !== void 0 && (ae = $.ref);
    for (he in $) D.call($, he) && !Z.hasOwnProperty(he) && (X[he] = $[he]);
    if (le && le.defaultProps) for (he in $ = le.defaultProps, $) X[he] === void 0 && (X[he] = $[he]);
    return { $$typeof: v, type: le, key: O, ref: ae, props: X, _owner: V.current };
  }
  return kr.Fragment = m, kr.jsx = Q, kr.jsxs = Q, kr;
}
var Qa;
function id() {
  return Qa || (Qa = 1, Di.exports = od()), Di.exports;
}
var M = id();
const Dn = 5, Ja = 1, Il = 1e5, Vi = [
  "stars",
  "hearts",
  "score",
  "progress"
], In = {
  theme: "",
  style: "stars",
  score: 0,
  total_score: Dn,
  locale: "zh-CN"
};
function $a(a) {
  return typeof a == "string" ? a.trim() : void 0;
}
function qa(a) {
  if (typeof a == "number" && Number.isFinite(a))
    return a;
  if (typeof a == "string" && a.trim().length > 0) {
    const v = Number(a);
    return Number.isFinite(v) ? v : void 0;
  }
}
function Ai(a, v, m) {
  return Math.min(Math.max(a, v), m);
}
function sn(a) {
  return a === "stars" || a === "hearts";
}
function ud(a) {
  return Vi.includes(a) ? a : In.style;
}
function sd(a, v) {
  return sn(a) ? Dn : Ai(
    qa(v) ?? In.total_score,
    Ja,
    Il
  );
}
function ad(a, v, m) {
  const D = Ai(qa(v) ?? In.score, 0, m);
  return sn(a) ? Math.round(D) : D;
}
function Nt(a) {
  const v = a ?? {}, m = ud(v.style), D = sd(m, v.total_score), V = ad(m, v.score, D);
  return {
    card_type: "ScoreCard",
    theme: $a(v.theme) ?? In.theme,
    style: m,
    score: V,
    total_score: D,
    locale: $a(v.locale) ?? In.locale
  };
}
function ba(a) {
  return !Number.isFinite(a.total_score) || a.total_score <= 0 ? 0 : Ai(a.score / a.total_score, 0, 1);
}
function Dl(a) {
  const v = {};
  return a.card_type !== "ScoreCard" && (v.card_type = "score.validation.cardType"), Vi.includes(a.style) || (v.style = "score.validation.style"), (!Number.isFinite(a.total_score) || a.total_score < Ja) && (v.total_score = "score.validation.totalMin"), a.total_score > Il && (v.total_score = "score.validation.totalMax"), (!Number.isFinite(a.score) || a.score < 0) && (v.score = "score.validation.scoreMin"), Number.isFinite(a.total_score) && a.score > a.total_score && (v.score = "score.validation.scoreMax"), sn(a.style) && (a.total_score !== Dn && (v.total_score = "score.validation.symbolTotal"), Number.isInteger(a.score) || (v.score = "score.validation.symbolInteger")), {
    valid: Object.keys(v).length === 0,
    errors: v
  };
}
const cd = {
  "score.style": "Style",
  "score.style.stars": "Stars",
  "score.style.hearts": "Hearts",
  "score.style.score": "Score",
  "score.style.progress": "Progress",
  "score.earnedScore": "Earned score",
  "score.totalScore": "Total score",
  "score.scoreValue": "Earned score",
  "score.setScore": "Set to {score}",
  "score.accessible.value": "{score} of {total}",
  "score.validation.cardType": "Card type must be ScoreCard.",
  "score.validation.style": "Score style must be stars, hearts, score, or progress.",
  "score.validation.totalMin": "Total score must be at least 1.",
  "score.validation.totalMax": "Total score cannot exceed {max}.",
  "score.validation.scoreMin": "Earned score must be at least 0.",
  "score.validation.scoreMax": "Earned score cannot exceed the total score.",
  "score.validation.symbolTotal": "Stars and hearts are fixed to a five-point scale.",
  "score.validation.symbolInteger": "Stars and hearts must use whole-number scores."
}, fd = {
  "score.style": "样式",
  "score.style.stars": "星星",
  "score.style.hearts": "爱心",
  "score.style.score": "分数",
  "score.style.progress": "进度条",
  "score.earnedScore": "获得分数",
  "score.totalScore": "总分多少",
  "score.scoreValue": "获得分数多少",
  "score.setScore": "设置为 {score} 分",
  "score.accessible.value": "{score} / {total} 分",
  "score.validation.cardType": "卡片类型必须为 ScoreCard。",
  "score.validation.style": "评分样式必须为星星、爱心、分数或进度条。",
  "score.validation.totalMin": "总分必须大于或等于 1。",
  "score.validation.totalMax": "总分不能超过 {max}。",
  "score.validation.scoreMin": "获得分数必须大于或等于 0。",
  "score.validation.scoreMax": "获得分数不能超过总分。",
  "score.validation.symbolTotal": "星星和爱心评分固定为五分制。",
  "score.validation.symbolInteger": "星星和爱心评分必须为整数。"
}, dd = {
  "zh-CN": fd,
  "en-US": cd
};
function pd(a) {
  const v = (a ?? "").toLowerCase();
  return v === "en" || v === "en-us" || v.startsWith("en-") ? "en-US" : (v === "zh" || v === "zh-cn" || v.startsWith("zh-"), "zh-CN");
}
function hd(a, v) {
  return v ? a.replace(/\{(\w+)\}/g, (m, D) => String(v[D] ?? "")) : a;
}
function ec(a) {
  const v = dd[pd(a)];
  return (m, D) => {
    const V = v[m] ?? m;
    return hd(V, D);
  };
}
function tc({ kind: a, className: v }) {
  return a === "heart" ? /* @__PURE__ */ M.jsx(
    "svg",
    {
      "aria-hidden": "true",
      className: v,
      focusable: "false",
      viewBox: "0 0 24 24",
      children: /* @__PURE__ */ M.jsx(
        "path",
        {
          d: "M12 20.2C7.2 16.62 4 13.72 4 9.78 4 7.08 6.08 5 8.72 5c1.42 0 2.72.66 3.28 1.68C12.56 5.66 13.86 5 15.28 5 17.92 5 20 7.08 20 9.78c0 3.94-3.2 6.84-8 10.42Z",
          fill: "currentColor",
          stroke: "currentColor",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: "1.4"
        }
      )
    }
  ) : /* @__PURE__ */ M.jsx(
    "svg",
    {
      "aria-hidden": "true",
      className: v,
      focusable: "false",
      viewBox: "0 0 24 24",
      children: /* @__PURE__ */ M.jsx(
        "path",
        {
          d: "M12 3.2c.46 0 .86.27 1.04.69l1.55 3.55 3.82.36c.45.04.84.34 1 .77.15.43.04.91-.3 1.22l-2.86 2.58.84 3.75c.1.44-.08.9-.45 1.17-.37.27-.86.31-1.27.08L12 15.42l-3.33 1.97c-.4.23-.9.19-1.27-.08-.37-.27-.55-.73-.45-1.17l.84-3.75-2.86-2.58c-.34-.31-.45-.79-.3-1.22.16-.43.55-.73 1-.77l3.82-.36 1.55-3.55c.18-.42.58-.69 1.04-.69Z",
          fill: "currentColor",
          stroke: "currentColor",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: "1.5"
        }
      )
    }
  );
}
const md = `
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

.chips-score-card__symbols {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
  line-height: 1;
}

.chips-score-card__symbol {
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: var(--chips-sys-color-outline-variant, rgba(15, 23, 42, 0.24));
  line-height: 1;
  transition: color 0.16s ease, transform 0.16s ease;
}

.chips-score-card__symbol-icon {
  display: block;
  width: 34px;
  height: 34px;
}

.chips-score-card__symbol--active {
  color: var(--chips-sys-color-primary, #f59e0b);
}

.chips-score-card__symbol--heart.chips-score-card__symbol--active {
  color: var(--chips-sys-color-error, #e11d48);
}

.chips-score-card__numeric {
  display: inline-flex;
  align-items: baseline;
  min-width: 0;
  color: var(--chips-sys-color-on-surface, #0f172a);
}

.chips-score-card__numeric-score {
  font-size: 42px;
  font-weight: 750;
  line-height: 1;
}

.chips-score-card__numeric-separator {
  margin: 0 8px;
  color: var(--chips-sys-color-outline, rgba(15, 23, 42, 0.36));
  font-size: 24px;
  font-weight: 600;
}

.chips-score-card__numeric-total {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 22px;
  font-weight: 650;
}

.chips-score-card__progress {
  display: grid;
  gap: 10px;
  width: 100%;
}

.chips-score-card__progress-track {
  width: 100%;
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--chips-sys-color-surface-container-highest, rgba(15, 23, 42, 0.12));
}

.chips-score-card__progress-fill {
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  background: var(--chips-sys-color-primary, #2563eb);
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

.chips-score-card__progress-score {
  color: var(--chips-sys-color-on-surface, #0f172a);
  font-weight: 650;
}
`;
function Ii(a, v) {
  return new Intl.NumberFormat(v ?? "zh-CN", {
    maximumFractionDigits: 2
  }).format(a);
}
function vd(a, v) {
  const m = a.style === "hearts" ? "heart" : "star", D = Math.round(a.score);
  return /* @__PURE__ */ M.jsx("div", { className: "chips-score-card__symbols", role: "img", "aria-label": v, children: Array.from({ length: a.total_score }, (V, Z) => {
    const Q = Z < D;
    return /* @__PURE__ */ M.jsx(
      "span",
      {
        className: [
          "chips-score-card__symbol",
          a.style === "hearts" ? "chips-score-card__symbol--heart" : "",
          Q ? "chips-score-card__symbol--active" : ""
        ].filter(Boolean).join(" "),
        "aria-hidden": "true",
        children: /* @__PURE__ */ M.jsx(tc, { className: "chips-score-card__symbol-icon", kind: m })
      },
      Z
    );
  }) });
}
function yd({ config: a }) {
  const v = ec(a.locale), m = Ii(a.score, a.locale), D = Ii(a.total_score, a.locale), V = ba(a), Z = Ii(V * 100, a.locale), Q = v("score.accessible.value", {
    score: m,
    total: D
  });
  return /* @__PURE__ */ M.jsx("div", { className: "chips-score-card", "data-card-type": a.card_type, "data-score-style": a.style, children: /* @__PURE__ */ M.jsxs(
    "div",
    {
      className: [
        "chips-score-card__surface",
        sn(a.style) ? "chips-score-card__surface--symbols" : ""
      ].filter(Boolean).join(" "),
      children: [
        sn(a.style) ? vd(a, Q) : null,
        a.style === "score" ? /* @__PURE__ */ M.jsxs("div", { className: "chips-score-card__numeric", role: "img", "aria-label": Q, children: [
          /* @__PURE__ */ M.jsx("span", { className: "chips-score-card__numeric-score", children: m }),
          /* @__PURE__ */ M.jsx("span", { className: "chips-score-card__numeric-separator", children: "/" }),
          /* @__PURE__ */ M.jsx("span", { className: "chips-score-card__numeric-total", children: D })
        ] }) : null,
        a.style === "progress" ? /* @__PURE__ */ M.jsxs("div", { className: "chips-score-card__progress", role: "img", "aria-label": Q, children: [
          /* @__PURE__ */ M.jsx("div", { className: "chips-score-card__progress-track", "aria-hidden": "true", children: /* @__PURE__ */ M.jsx(
            "div",
            {
              className: "chips-score-card__progress-fill",
              style: { width: `${V * 100}%` }
            }
          ) }),
          /* @__PURE__ */ M.jsxs("div", { className: "chips-score-card__progress-meta", "aria-hidden": "true", children: [
            /* @__PURE__ */ M.jsxs("span", { className: "chips-score-card__progress-score", children: [
              m,
              " / ",
              D
            ] }),
            /* @__PURE__ */ M.jsxs("span", { children: [
              Z,
              "%"
            ] })
          ] })
        ] }) : null
      ]
    }
  ) });
}
function gd(a) {
  const { container: v, config: m, themeCssText: D } = a;
  for (; v.firstChild; )
    v.removeChild(v.firstChild);
  const V = document.createElement("div");
  V.setAttribute("data-chips-basecard-view-root", "true"), V.style.width = "100%", v.appendChild(V);
  const Z = {
    root: Za.createRoot(V)
  };
  return Ga.flushSync(() => {
    Z.root.render(
      Ml.createElement(
        Ml.Fragment,
        null,
        Ml.createElement("style", null, `${D ?? ""}
${md}`),
        Ml.createElement(yd, {
          config: m
        })
      )
    );
  }), () => {
    for (Z.root.unmount(); v.firstChild; )
      v.removeChild(v.firstChild);
  };
}
const wd = `
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

.chips-score-editor__label {
  color: var(--chips-sys-color-on-surface, #111827);
  font-weight: 600;
}

.chips-score-editor__segmented {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.chips-score-editor__segment,
.chips-score-editor__rating-button {
  min-height: 44px;
  border: 1px solid var(--chips-comp-button-border-color, rgba(15, 23, 42, 0.12));
  border-radius: 10px;
  background: var(--chips-comp-button-container-color, var(--chips-sys-color-surface-container-low, #f8fafc));
  color: var(--chips-comp-button-label-color, var(--chips-sys-color-on-surface, #111827));
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.chips-score-editor__segment:hover,
.chips-score-editor__rating-button:hover,
.chips-score-editor__segment:focus-visible,
.chips-score-editor__rating-button:focus-visible {
  border-color: var(--chips-sys-color-primary, #2563eb);
  outline: none;
  transform: translateY(-1px);
}

.chips-score-editor__segment--active,
.chips-score-editor__rating-button--active {
  border-color: var(--chips-sys-color-primary, #2563eb);
  background: var(--chips-sys-color-primary-container, rgba(37, 99, 235, 0.10));
  color: var(--chips-sys-color-primary, #2563eb);
}

.chips-score-editor__rating {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.chips-score-editor__rating-button {
  display: grid;
  place-items: center;
  padding: 0;
  color: var(--chips-sys-color-outline, rgba(15, 23, 42, 0.38));
  line-height: 1;
}

.chips-score-editor__rating-icon {
  display: block;
  width: 26px;
  height: 26px;
}

.chips-score-editor__rating-button--active {
  color: var(--chips-sys-color-primary, #f59e0b);
}

.chips-score-editor__rating-button--heart.chips-score-editor__rating-button--active {
  color: var(--chips-sys-color-error, #e11d48);
}

.chips-score-editor__number-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.chips-score-editor__field {
  display: grid;
  gap: 8px;
}

.chips-score-editor__input {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--chips-comp-input-border-color, rgba(15, 23, 42, 0.16));
  border-radius: 10px;
  background: var(--chips-comp-input-container-color, var(--chips-sys-color-surface, #ffffff));
  color: inherit;
  font: inherit;
  padding: 0 12px;
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.chips-score-editor__input:hover,
.chips-score-editor__input:focus {
  border-color: var(--chips-sys-color-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.chips-score-editor__preview {
  display: grid;
  gap: 8px;
}

.chips-score-editor__progress-track {
  width: 100%;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--chips-sys-color-surface-container-highest, rgba(15, 23, 42, 0.12));
}

.chips-score-editor__progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--chips-sys-color-primary, #2563eb);
}

.chips-score-editor__preview-value {
  color: var(--chips-sys-color-on-surface-variant, #64748b);
  font-size: 13px;
  line-height: 1.3;
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
`, _d = {
  stars: "score.style.stars",
  hearts: "score.style.hearts",
  score: "score.style.score",
  progress: "score.style.progress"
};
function Ka(a, v) {
  return new Intl.NumberFormat(v ?? "zh-CN", {
    maximumFractionDigits: 2
  }).format(a);
}
function Ya(a) {
  const v = Number(a);
  return Number.isFinite(v) ? v : 0;
}
function Sd(a) {
  const [v, m] = On.useState(() => Nt(a.initialConfig)), D = On.useRef(v), [V, Z] = On.useState(
    () => Dl(Nt(a.initialConfig)).errors
  ), Q = ec(v.locale), le = v.style === "hearts" ? "heart" : "star", $ = On.useMemo(() => ba(v), [v]), ye = Ka(v.score, v.locale), he = Ka(v.total_score, v.locale);
  On.useEffect(() => {
    const O = Nt(a.initialConfig);
    D.current = O, m(O), Z(Dl(O).errors);
  }, [a.initialConfig]);
  function X(O) {
    const ae = Nt({
      ...D.current,
      ...O
    }), ce = Dl(ae);
    D.current = ae, m(ae), Z(ce.errors), ce.valid && a.onChange(ae);
  }
  return /* @__PURE__ */ M.jsxs("div", { className: "chips-basecard-editor chips-basecard-editor--standard", children: [
    /* @__PURE__ */ M.jsxs("section", { className: "chips-score-editor__group", "aria-labelledby": "chips-score-style-label", children: [
      /* @__PURE__ */ M.jsx("div", { className: "chips-score-editor__label", id: "chips-score-style-label", children: Q("score.style") }),
      /* @__PURE__ */ M.jsx("div", { className: "chips-score-editor__segmented", role: "radiogroup", "aria-labelledby": "chips-score-style-label", children: Vi.map((O) => /* @__PURE__ */ M.jsx(
        "button",
        {
          type: "button",
          className: [
            "chips-score-editor__segment",
            O === v.style ? "chips-score-editor__segment--active" : ""
          ].filter(Boolean).join(" "),
          "aria-checked": O === v.style,
          role: "radio",
          onClick: () => {
            X({
              style: O,
              total_score: sn(O) ? Dn : v.total_score
            });
          },
          children: Q(_d[O])
        },
        O
      )) })
    ] }),
    /* @__PURE__ */ M.jsxs("section", { className: "chips-score-editor__group", "aria-labelledby": "chips-score-value-label", children: [
      /* @__PURE__ */ M.jsx("div", { className: "chips-score-editor__label", id: "chips-score-value-label", children: Q("score.earnedScore") }),
      sn(v.style) ? /* @__PURE__ */ M.jsx("div", { className: "chips-score-editor__rating", role: "radiogroup", "aria-labelledby": "chips-score-value-label", children: Array.from({ length: Dn }, (O, ae) => {
        const ce = ae + 1, J = ce <= v.score;
        return /* @__PURE__ */ M.jsx(
          "button",
          {
            type: "button",
            className: [
              "chips-score-editor__rating-button",
              v.style === "hearts" ? "chips-score-editor__rating-button--heart" : "",
              J ? "chips-score-editor__rating-button--active" : ""
            ].filter(Boolean).join(" "),
            "aria-checked": ce === v.score,
            "aria-label": Q("score.setScore", { score: ce }),
            role: "radio",
            onClick: () => {
              X({ score: ce, total_score: Dn });
            },
            children: /* @__PURE__ */ M.jsx(tc, { className: "chips-score-editor__rating-icon", kind: le })
          },
          ce
        );
      }) }) : /* @__PURE__ */ M.jsxs("div", { className: "chips-score-editor__number-grid", children: [
        /* @__PURE__ */ M.jsxs("label", { className: "chips-score-editor__field", children: [
          /* @__PURE__ */ M.jsx("span", { className: "chips-score-editor__label", children: Q("score.totalScore") }),
          /* @__PURE__ */ M.jsx(
            "input",
            {
              type: "number",
              className: "chips-score-editor__input chips-score-editor__input--total",
              min: "1",
              max: Il,
              step: "0.1",
              value: v.total_score,
              onInput: (O) => {
                X({ total_score: Ya(O.currentTarget.value) });
              }
            }
          )
        ] }),
        /* @__PURE__ */ M.jsxs("label", { className: "chips-score-editor__field", children: [
          /* @__PURE__ */ M.jsx("span", { className: "chips-score-editor__label", children: Q("score.scoreValue") }),
          /* @__PURE__ */ M.jsx(
            "input",
            {
              type: "number",
              className: "chips-score-editor__input chips-score-editor__input--score",
              min: "0",
              max: v.total_score,
              step: "0.1",
              value: v.score,
              onInput: (O) => {
                X({ score: Ya(O.currentTarget.value) });
              }
            }
          )
        ] })
      ] }),
      v.style === "progress" ? /* @__PURE__ */ M.jsxs("div", { className: "chips-score-editor__preview", "aria-label": Q("score.accessible.value", {
        score: ye,
        total: he
      }), children: [
        /* @__PURE__ */ M.jsx("div", { className: "chips-score-editor__progress-track", "aria-hidden": "true", children: /* @__PURE__ */ M.jsx(
          "div",
          {
            className: "chips-score-editor__progress-fill",
            style: { width: `${$ * 100}%` }
          }
        ) }),
        /* @__PURE__ */ M.jsxs("div", { className: "chips-score-editor__preview-value", "aria-hidden": "true", children: [
          ye,
          " / ",
          he
        ] })
      ] }) : null,
      /* @__PURE__ */ M.jsx("div", { className: "chips-basecard-editor__errors", children: Object.keys(V).length > 0 ? /* @__PURE__ */ M.jsx("ul", { className: "chips-basecard-editor__errors-list", children: Object.entries(V).map(([O, ae]) => /* @__PURE__ */ M.jsx("li", { children: Q(ae, { max: Il }) }, O)) }) : null })
    ] })
  ] });
}
function kd(a) {
  const v = document.createElement("div");
  v.setAttribute("data-chips-basecard-editor-root", "true"), v.style.width = "100%", v.style.height = "100%", v.style.minHeight = "0";
  const m = Za.createRoot(v);
  return Ga.flushSync(() => {
    m.render(
      /* @__PURE__ */ M.jsxs(M.Fragment, { children: [
        /* @__PURE__ */ M.jsx("style", { children: wd }),
        /* @__PURE__ */ M.jsx(Sd, { ...a })
      ] })
    );
  }), v.__chipsDispose = () => {
    m.unmount();
  }, v;
}
function Fi(a) {
  return {
    height: a.style.height,
    minHeight: a.style.minHeight,
    width: a.style.width,
    overflow: a.style.overflow,
    display: a.style.display
  };
}
function Ui(a, v) {
  a.style.height = v.height, a.style.minHeight = v.minHeight, a.style.width = v.width, a.style.overflow = v.overflow, a.style.display = v.display;
}
function xd(a) {
  const v = a.container.ownerDocument, m = v.documentElement, D = v.body, V = Fi(m), Z = Fi(D), Q = Fi(a.container);
  for (m.style.width = "100%", m.style.height = "100%", m.style.minHeight = "0", m.style.overflow = "hidden", D.style.width = "100%", D.style.height = "100%", D.style.minHeight = "0", D.style.overflow = "hidden", a.container.style.display = "flex", a.container.style.width = "100%", a.container.style.height = "100%", a.container.style.minHeight = "0", a.container.style.overflow = "hidden"; a.container.firstChild; )
    a.container.removeChild(a.container.firstChild);
  const le = kd({
    initialConfig: a.initialConfig,
    onChange: a.onChange,
    resolveResourceUrl: a.resolveResourceUrl,
    releaseResourceUrl: a.releaseResourceUrl,
    importResource: a.importResource,
    deleteResource: a.deleteResource
  });
  return a.container.appendChild(le), () => {
    for (le.__chipsDispose?.(), Ui(m, V), Ui(D, Z), Ui(a.container, Q); a.container.firstChild; )
      a.container.removeChild(a.container.firstChild);
  };
}
function Ed(a) {
  return gd(a);
}
function Cd(a) {
  return xd(a);
}
const Nd = {
  name: "star",
  decorative: !0
}, zd = {
  pluginId: "chips.basecard.score",
  cardType: "base.score",
  displayName: "评分基础卡片",
  description: "用星星、爱心、数字分数或进度条展示评分数据。",
  icon: Nd,
  aliases: ["ScoreCard"],
  commitDebounceMs: 260,
  createInitialConfig(a) {
    return Nt(
      In
    );
  },
  normalizeConfig(a, v) {
    return Nt(a);
  },
  validateConfig(a) {
    return Dl(
      Nt(a)
    );
  },
  collectResourcePaths(a) {
    return [];
  },
  renderView(a) {
    return Ed({
      container: a.container,
      config: Nt(a.config),
      themeCssText: a.themeCssText,
      resolveResourceUrl: a.resolveResourceUrl,
      releaseResourceUrl: a.releaseResourceUrl,
      openResource: a.openResource
    });
  },
  renderEditor(a) {
    return Cd({
      container: a.container,
      initialConfig: Nt(a.initialConfig),
      onChange(v) {
        a.onChange(v);
      },
      resolveResourceUrl: a.resolveResourceUrl,
      releaseResourceUrl: a.releaseResourceUrl,
      importResource: a.importResource,
      deleteResource: a.deleteResource
    });
  }
};
export {
  zd as basecardDefinition,
  Cd as renderBasecardEditor,
  Ed as renderBasecardView
};
