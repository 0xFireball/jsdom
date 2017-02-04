var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// JSDOM NKX
var Uint8Array = require('typedarray').Uint8Array;
"use strict";
var SymbolTree = require("symbol-tree");
exports.cloningSteps = Symbol("cloning steps");
exports.locationInfo = Symbol("location info");
// TODO: the many underscore-prefixed hooks should move here
// E.g. _attrModified (which maybe should be split into its per-spec variants)
/**
 * This SymbolTree is used to build the tree for all Node in a document
 */
exports.domSymbolTree = new SymbolTree("DOM SymbolTree");
"use strict";
var idlUtils = require("../generated/utils");
var nwmatcher = require("nwmatcher/src/nwmatcher-noqsa");
var domSymbolTree = require("./internal-constants").domSymbolTree;
// Internal method so you don't have to go through the public API
exports.querySelector = function (parentNode, selectors) {
    if (!domSymbolTree.hasChildren(parentNode) ||
        (parentNode === parentNode._ownerDocument && !parentNode.documentElement)) {
        // This allows us to avoid the explosion that occurs if you try to add nwmatcher to a document that is not yet
        // initialized.
        return null;
    }
    return addNwmatcher(parentNode).first(selectors, idlUtils.wrapperForImpl(parentNode));
};
// nwmatcher gets `document.documentElement` at creation-time, so we have to initialize lazily, since in the initial
// stages of Document initialization, there is no documentElement present yet.
function addNwmatcher(parentNode) {
    var document = parentNode._ownerDocument;
    if (!document._nwmatcher) {
        document._nwmatcher = nwmatcher({ document: document });
        document._nwmatcher.configure({ UNIQUE_ID: false });
    }
    return document._nwmatcher;
}
"use strict";
var internalQuerySelector = require("./selectors").querySelector;
var whatwgURL = require("whatwg-url");
exports.documentBaseURL = function (document) {
    // https://html.spec.whatwg.org/multipage/infrastructure.html#document-base-url
    var firstBase = internalQuerySelector(document, "base[href]");
    var fallbackBaseURL = exports.fallbackBaseURL(document);
    if (firstBase === null) {
        return fallbackBaseURL;
    }
    return frozenBaseURL(firstBase, fallbackBaseURL);
};
exports.documentBaseURLSerialized = function (document) {
    return whatwgURL.serializeURL(exports.documentBaseURL(document));
};
exports.fallbackBaseURL = function (document) {
    // https://html.spec.whatwg.org/multipage/infrastructure.html#fallback-base-url
    // Unimplemented: <iframe srcdoc>
    if (document.URL === "about:blank" && document._defaultView &&
        document._defaultView._parent !== document._defaultView) {
        return exports.documentBaseURL(document._defaultView._parent._document);
    }
    return document._URL;
};
exports.parseURLToResultingURLRecord = function (url, document) {
    // https://html.spec.whatwg.org/#resolve-a-url
    // Encoding stuff ignored; always UTF-8 for us, for now.
    var baseURL = exports.documentBaseURL(document);
    return whatwgURL.parseURL(url, { baseURL: baseURL });
    // This returns the resulting URL record; to get the resulting URL string, just serialize it.
};
function frozenBaseURL(baseElement, fallbackBaseURL) {
    // https://html.spec.whatwg.org/multipage/semantics.html#frozen-base-url
    // The spec is eager (setting the frozen base URL when things change); we are lazy (getting it when we need to)
    var baseHrefAttribute = baseElement.getAttribute("href");
    var result = whatwgURL.parseURL(baseHrefAttribute, { baseURL: fallbackBaseURL });
    return result === "failure" ? fallbackBaseURL : result;
}
"use strict";
var path = require("path");
var whatwgURL = require("whatwg-url");
var querystring = require("querystring");
var domSymbolTree = require("./living/helpers/internal-constants").domSymbolTree;
var SYMBOL_TREE_POSITION = require("symbol-tree").TreePosition;
var parseURLToResultingURLRecord = require("./living/helpers/document-base-url").parseURLToResultingURLRecord;
exports.toFileUrl = function (fileName) {
    // Beyond just the `path.resolve`, this is mostly for the benefit of Windows,
    // where we need to convert "\" to "/" and add an extra "/" prefix before the
    // drive letter.
    var pathname = path.resolve(process.cwd(), fileName).replace(/\\/g, "/");
    if (pathname[0] !== "/") {
        pathname = "/" + pathname;
    }
    // path might contain spaces, so convert those to %20
    return "file://" + encodeURI(pathname);
};
/**
 * Define a setter on an object
 *
 * This method replaces any existing setter but leaves getters in place.
 *
 * - `object` {Object} the object to define the setter on
 * - `property` {String} the name of the setter
 * - `setterFn` {Function} the setter
 */
exports.defineSetter = function defineSetter(object, property, setterFn) {
    var descriptor = Object.getOwnPropertyDescriptor(object, property) || {
        configurable: true,
        enumerable: true
    };
    descriptor.set = setterFn;
    Object.defineProperty(object, property, descriptor);
};
/**
 * Define a getter on an object
 *
 * This method replaces any existing getter but leaves setters in place.
 *
 * - `object` {Object} the object to define the getter on
 * - `property` {String} the name of the getter
 * - `getterFn` {Function} the getter
 */
exports.defineGetter = function defineGetter(object, property, getterFn) {
    var descriptor = Object.getOwnPropertyDescriptor(object, property) || {
        configurable: true,
        enumerable: true
    };
    descriptor.get = getterFn;
    Object.defineProperty(object, property, descriptor);
};
/**
 * Define a set of properties on an object, by copying the property descriptors
 * from the original object.
 *
 * - `object` {Object} the target object
 * - `properties` {Object} the source from which to copy property descriptors
 */
exports.define = function define(object, properties) {
    for (var _i = 0, _a = Object.getOwnPropertyNames(properties); _i < _a.length; _i++) {
        var name_1 = _a[_i];
        var propDesc = Object.getOwnPropertyDescriptor(properties, name_1);
        Object.defineProperty(object, name_1, propDesc);
    }
};
/**
 * Define a list of constants on a constructor and its .prototype
 *
 * - `Constructor` {Function} the constructor to define the constants on
 * - `propertyMap` {Object}  key/value map of properties to define
 */
exports.addConstants = function addConstants(Constructor, propertyMap) {
    for (var property in propertyMap) {
        var value = propertyMap[property];
        addConstant(Constructor, property, value);
        addConstant(Constructor.prototype, property, value);
    }
};
function addConstant(object, property, value) {
    Object.defineProperty(object, property, {
        configurable: false,
        enumerable: true,
        writable: false,
        value: value
    });
}
var memoizeQueryTypeCounter = 0;
/**
 * Returns a version of a method that memoizes specific types of calls on the object
 *
 * - `fn` {Function} the method to be memozied
 */
exports.memoizeQuery = function memoizeQuery(fn) {
    // Only memoize query functions with arity <= 2
    if (fn.length > 2) {
        return fn;
    }
    var type = memoizeQueryTypeCounter++;
    return function () {
        if (!this._memoizedQueries) {
            return fn.apply(this, arguments);
        }
        if (!this._memoizedQueries[type]) {
            this._memoizedQueries[type] = Object.create(null);
        }
        var key;
        if (arguments.length === 1 && typeof arguments[0] === "string") {
            key = arguments[0];
        }
        else if (arguments.length === 2 && typeof arguments[0] === "string" && typeof arguments[1] === "string") {
            key = arguments[0] + "::" + arguments[1];
        }
        else {
            return fn.apply(this, arguments);
        }
        if (!(key in this._memoizedQueries[type])) {
            this._memoizedQueries[type][key] = fn.apply(this, arguments);
        }
        return this._memoizedQueries[type][key];
    };
};
exports.reflectURLAttribute = function (elementImpl, contentAttributeName) {
    var attributeValue = elementImpl.getAttribute(contentAttributeName);
    if (attributeValue === null || attributeValue === "") {
        return "";
    }
    var urlRecord = parseURLToResultingURLRecord(attributeValue, elementImpl._ownerDocument);
    if (urlRecord === "failure") {
        return attributeValue;
    }
    return whatwgURL.serializeURL(urlRecord);
};
function isValidAbsoluteURL(str) {
    return whatwgURL.parseURL(str) !== "failure";
}
exports.isValidTargetOrigin = function (str) {
    return str === "*" || str === "/" || isValidAbsoluteURL(str);
};
exports.simultaneousIterators = function* (first, second) {
    for (;;) {
        var firstResult = first.next();
        var secondResult = second.next();
        if (firstResult.done && secondResult.done) {
            return;
        }
        yield [
            firstResult.done ? null : firstResult.value,
            secondResult.done ? null : secondResult.value
        ];
    }
};
exports.treeOrderSorter = function (a, b) {
    var compare = domSymbolTree.compareTreePosition(a, b);
    if (compare & SYMBOL_TREE_POSITION.PRECEDING) {
        return 1;
    }
    if (compare & SYMBOL_TREE_POSITION.FOLLOWING) {
        return -1;
    }
    // disconnected or equal:
    return 0;
};
exports.lengthFromProperties = function (arrayLike) {
    var max = -1;
    var keys = Object.keys(arrayLike);
    var highestKeyIndex = keys.length - 1;
    // Abuses a v8 implementation detail for a very fast case
    // (if this implementation detail changes, this method will still
    //  return correct results)
    /* eslint-disable eqeqeq */
    if (highestKeyIndex == keys[highestKeyIndex]) {
        /* eslint-enable eqeqeq */
        return keys.length;
    }
    for (var i = highestKeyIndex; i >= 0; --i) {
        var asNumber = Number(keys[i]);
        if (!Number.isNaN(asNumber) && asNumber > max) {
            max = asNumber;
        }
    }
    return max + 1;
};
var base64Regexp = /^(?:[A-Z0-9+/]{4})*(?:[A-Z0-9+/]{2}==|[A-Z0-9+/]{3}=|[A-Z0-9+/]{4})$/i;
exports.parseDataUrl = function parseDataUrl(url) {
    var urlParts = url.match(/^data:(.+?)(?:;(base64))?,(.*)$/);
    var buffer;
    if (urlParts[2] === "base64") {
        if (urlParts[3] && !base64Regexp.test(urlParts[3])) {
            throw new Error("Not a base64 string");
        }
        buffer = new Buffer(urlParts[3], "base64");
    }
    else {
        buffer = new Buffer(querystring.unescape(urlParts[3]));
    }
    return { buffer: buffer, type: urlParts[1] };
};
/* eslint-disable global-require */
exports.Canvas = null;
try {
    exports.Canvas = require("canvas");
    if (typeof exports.Canvas !== "function") {
        // In browserify, the require will succeed but return an empty object
        exports.Canvas = null;
    }
}
catch (e) {
    exports.Canvas = null;
}
"use strict";
exports.availableDocumentFeatures = [
    "FetchExternalResources",
    "ProcessExternalResources",
    "SkipExternalResources"
];
exports.defaultDocumentFeatures = {
    FetchExternalResources: ["script", "link"],
    ProcessExternalResources: ["script"],
    SkipExternalResources: false
};
exports.applyDocumentFeatures = function (documentImpl, features) {
    features = features || {};
    for (var i = 0; i < exports.availableDocumentFeatures.length; ++i) {
        var featureName = exports.availableDocumentFeatures[i];
        var featureSource = void 0;
        if (features[featureName] !== undefined) {
            featureSource = features[featureName];
        }
        else if (typeof features[featureName.toLowerCase()] !== "undefined") {
            featureSource = features[featureName.toLowerCase()];
        }
        else if (exports.defaultDocumentFeatures[featureName]) {
            featureSource = exports.defaultDocumentFeatures[featureName];
        }
        else {
            continue;
        }
        var implImpl = documentImpl._implementation;
        implImpl._removeFeature(featureName);
        if (featureSource !== undefined) {
            if (Array.isArray(featureSource)) {
                for (var j = 0; j < featureSource.length; ++j) {
                    implImpl._addFeature(featureName, featureSource[j]);
                }
            }
            else {
                implImpl._addFeature(featureName, featureSource);
            }
        }
    }
};
"use strict";
var idlUtils = require("../living/generated/utils");
// Tree traversing
exports.getFirstChild = function (node) {
    return node.childNodes[0];
};
exports.getChildNodes = function (node) {
    // parse5 treats template elements specially, assuming you return an array whose single item is the document fragment
    var children = node._templateContents ? [node._templateContents] : [];
    if (children.length === 0) {
        for (var i = 0; i < node.childNodes.length; ++i) {
            children.push(idlUtils.implForWrapper(node.childNodes[i]));
        }
    }
    return children;
};
exports.getParentNode = function (node) {
    return node.parentNode;
};
exports.getAttrList = function (node) {
    return node.attributes;
};
// Node data
exports.getTagName = function (element) {
    return element.tagName.toLowerCase();
};
exports.getNamespaceURI = function (element) {
    return element.namespaceURI || "http://www.w3.org/1999/xhtml";
};
exports.getTextNodeContent = function (textNode) {
    return textNode.nodeValue;
};
exports.getCommentNodeContent = function (commentNode) {
    return commentNode.nodeValue;
};
exports.getDocumentTypeNodeName = function (doctypeNode) {
    return doctypeNode.name;
};
exports.getDocumentTypeNodePublicId = function (doctypeNode) {
    return doctypeNode.publicId || null;
};
exports.getDocumentTypeNodeSystemId = function (doctypeNode) {
    return doctypeNode.systemId || null;
};
// Node types
exports.isTextNode = function (node) {
    return node.nodeName === "#text";
};
exports.isCommentNode = function (node) {
    return node.nodeName === "#comment";
};
exports.isDocumentTypeNode = function (node) {
    return node.nodeType === 10;
};
exports.isElementNode = function (node) {
    return Boolean(node.tagName);
};
"use strict";
module.exports = Object.freeze({
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12 // historical
});
"use strict";
var parse5 = require("parse5");
var documentAdapter = require("./documentAdapter");
var NODE_TYPE = require("../living/node-type");
var idlUtils = require("../living/generated/utils");
var serializer = new parse5.TreeSerializer(documentAdapter);
exports.domToHtml = function (iterable) {
    var ret = "";
    for (var _i = 0, iterable_1 = iterable; _i < iterable_1.length; _i++) {
        var node = iterable_1[_i];
        if (node.nodeType === NODE_TYPE.DOCUMENT_NODE) {
            ret += serializer.serialize(node);
        }
        else {
            ret += serializer.serialize({ childNodes: [idlUtils.wrapperForImpl(node)] });
        }
    }
    return ret;
};
"use strict";
module.exports = function (nameForErrorMessage, window) {
    if (!window) {
        // Do nothing for window-less documents.
        return;
    }
    var error = new Error("Not implemented: " + nameForErrorMessage);
    error.type = "not implemented";
    window._virtualConsole.emit("jsdomError", error);
};
"use strict";
var EventEmitter = require("events").EventEmitter;
module.exports = (function (_super) {
    __extends(VirtualConsole, _super);
    function VirtualConsole() {
        var _this = _super.call(this) || this;
        _this.on("error", function () {
            // If "error" event has no listeners,
            // EventEmitter throws an exception
        });
        return _this;
    }
    VirtualConsole.prototype.sendTo = function (anyConsole, options) {
        if (options === undefined) {
            options = {};
        }
        var _loop_1 = function (method) {
            if (typeof anyConsole[method] === "function") {
                function onMethodCall() {
                    anyConsole[method].apply(anyConsole, arguments);
                }
                this_1.on(method, onMethodCall);
            }
        };
        var this_1 = this;
        for (var _i = 0, _a = Object.keys(anyConsole); _i < _a.length; _i++) {
            var method = _a[_i];
            _loop_1(method);
        }
        if (!options.omitJsdomErrors) {
            this.on("jsdomError", function (e) { return anyConsole.error(e.stack, e.detail); });
        }
        return this;
    };
    return VirtualConsole;
}(EventEmitter));
"use strict";
// https://heycam.github.io/webidl/#idl-named-properties
var IS_NAMED_PROPERTY = Symbol();
var TRACKER = Symbol();
/**
 * Create a new NamedPropertiesTracker for the given `object`.
 *
 * Named properties are used in DOM to let you lookup (for example) a Node by accessing a property on another object.
 * For example `window.foo` might resolve to an image element with id "foo".
 *
 * This tracker is a workaround because the ES6 Proxy feature is not yet available.
 *
 * @param {Object} object
 * @param {Function} resolverFunc Each time a property is accessed, this function is called to determine the value of
 *        the property. The function is passed 3 arguments: (object, name, values).
 *        `object` is identical to the `object` parameter of this `create` function.
 *        `name` is the name of the property.
 *        `values` is a function that returns a Set with all the tracked values for this name. The order of these
 *        values is undefined.
 *
 * @returns {NamedPropertiesTracker}
 */
exports.create = function (object, resolverFunc) {
    if (object[TRACKER]) {
        throw Error("A NamedPropertiesTracker has already been created for this object");
    }
    var tracker = new NamedPropertiesTracker(object, resolverFunc);
    object[TRACKER] = tracker;
    return tracker;
};
exports.get = function (object) {
    if (!object) {
        return null;
    }
    return object[TRACKER] || null;
};
function NamedPropertiesTracker(object, resolverFunc) {
    this.object = object;
    this.resolverFunc = resolverFunc;
    this.trackedValues = new Map(); // Map<Set<value>>
}
function newPropertyDescriptor(tracker, name) {
    var emptySet = new Set();
    function getValues() {
        return tracker.trackedValues.get(name) || emptySet;
    }
    var descriptor = {
        enumerable: true,
        configurable: true,
        get: function () {
            return tracker.resolverFunc(tracker.object, name, getValues);
        },
        set: function (value) {
            Object.defineProperty(tracker.object, name, {
                enumerable: true,
                configurable: true,
                writable: true,
                value: value
            });
        }
    };
    descriptor.get[IS_NAMED_PROPERTY] = true;
    descriptor.set[IS_NAMED_PROPERTY] = true;
    return descriptor;
}
/**
 * Track a value (e.g. a Node) for a specified name.
 *
 * Values can be tracked eagerly, which means that not all tracked values *have* to appear in the output. The resolver
 * function that was passed to the output may filter the value.
 *
 * Tracking the same `name` and `value` pair multiple times has no effect
 *
 * @param {String} name
 * @param {*} value
 */
NamedPropertiesTracker.prototype.track = function (name, value) {
    if (name === undefined || name === null || name === "") {
        return;
    }
    var valueSet = this.trackedValues.get(name);
    if (!valueSet) {
        valueSet = new Set();
        this.trackedValues.set(name, valueSet);
    }
    valueSet.add(value);
    if (name in this.object) {
        // already added our getter or it is not a named property (e.g. "addEventListener")
        return;
    }
    var descriptor = newPropertyDescriptor(this, name);
    Object.defineProperty(this.object, name, descriptor);
};
/**
 * Stop tracking a previously tracked `name` & `value` pair, see track().
 *
 * Untracking the same `name` and `value` pair multiple times has no effect
 *
 * @param {String} name
 * @param {*} value
 */
NamedPropertiesTracker.prototype.untrack = function (name, value) {
    if (name === undefined || name === null || name === "") {
        return;
    }
    var valueSet = this.trackedValues.get(name);
    if (!valueSet) {
        // the value is not present
        return;
    }
    if (!valueSet["delete"](value)) {
        // the value was not present
        return;
    }
    if (valueSet.size === 0) {
        this.trackedValues["delete"](name);
    }
    if (valueSet.size > 0) {
        // other values for this name are still present
        return;
    }
    // at this point there are no more values, delete the property
    var descriptor = Object.getOwnPropertyDescriptor(this.object, name);
    if (!descriptor || !descriptor.get || descriptor.get[IS_NAMED_PROPERTY] !== true) {
        // Not defined by NamedPropertyTracker
        return;
    }
    // note: delete puts the object in dictionary mode.
    // if this turns out to be a performance issue, maybe add:
    // https://github.com/petkaantonov/bluebird/blob/3e36fc861ac5795193ba37935333eb6ef3716390/src/util.js#L177
    delete this.object[name];
};
"use strict";
var addConstants = require("../utils").addConstants;
var table = require("./dom-exception-table.json"); // https://heycam.github.io/webidl/#idl-DOMException-error-names
// Precompute some stuff. Mostly unnecessary once we take care of the TODO below.
var namesWithCodes = Object.keys(table).filter(function (name) { return "legacyCodeValue" in table[name]; });
var codesToNames = Object.create(null);
for (var _i = 0, namesWithCodes_1 = namesWithCodes; _i < namesWithCodes_1.length; _i++) {
    var name_2 = namesWithCodes_1[_i];
    codesToNames[table[name_2].legacyCodeValue] = name_2;
}
module.exports = DOMException;
// TODO: update constructor signature to match WebIDL spec
// See also https://github.com/heycam/webidl/pull/22 which isn't merged as of yet
function DOMException(code, message) {
    var name = codesToNames[code];
    if (message === undefined) {
        message = table[name].description;
    }
    Error.call(this, message);
    Object.defineProperty(this, "name", { value: name, writable: true, configurable: true, enumerable: false });
    Object.defineProperty(this, "code", { value: code, writable: true, configurable: true, enumerable: false });
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, DOMException);
    }
}
Object.setPrototypeOf(DOMException, Error);
Object.setPrototypeOf(DOMException.prototype, Error.prototype);
var constants = Object.create(null);
for (var _a = 0, namesWithCodes_2 = namesWithCodes; _a < namesWithCodes_2.length; _a++) {
    var name_3 = namesWithCodes_2[_a];
    constants[table[name_3].legacyCodeName] = table[name_3].legacyCodeValue;
}
addConstants(DOMException, constants);
"use strict";
exports.implementation = (function () {
    function AttrImpl(_, privateData) {
        this._namespace = privateData.namespace !== undefined ? privateData.namespace : null;
        this._namespacePrefix = privateData.namespacePrefix !== undefined ? privateData.namespacePrefix : null;
        this._localName = privateData.localName;
        this._value = privateData.value !== undefined ? privateData.value : "";
        this._element = privateData.element !== undefined ? privateData.element : null;
        this.specified = true;
    }
    Object.defineProperty(AttrImpl.prototype, "namespaceURI", {
        get: function () {
            return this._namespace;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttrImpl.prototype, "prefix", {
        get: function () {
            return this._namespacePrefix;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttrImpl.prototype, "localName", {
        get: function () {
            return this._localName;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttrImpl.prototype, "name", {
        get: function () {
            return exports.getAttrImplQualifiedName(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttrImpl.prototype, "nodeName", {
        // Delegate to name
        get: function () {
            return this.name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttrImpl.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (v) {
            if (this._element === null) {
                this._value = v;
            }
            else {
                exports.changeAttributeImpl(this._element, this, v);
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttrImpl.prototype, "nodeValue", {
        // Delegate to value
        get: function () {
            return this.value;
        },
        set: function (v) {
            this.value = v;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttrImpl.prototype, "textContent", {
        // Delegate to value
        get: function () {
            return this.value;
        },
        set: function (v) {
            this.value = v;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AttrImpl.prototype, "ownerElement", {
        get: function () {
            return this._element;
        },
        enumerable: true,
        configurable: true
    });
    return AttrImpl;
}());
exports.changeAttributeImpl = function (element, attributeImpl, value) {
    // https://dom.spec.whatwg.org/#concept-element-attributes-change
    // TODO mutation observer stuff
    var oldValue = attributeImpl._value;
    attributeImpl._value = value;
    // Run jsdom hooks; roughly correspond to spec's "An attribute is set and an attribute is changed."
    element._attrModified(exports.getAttrImplQualifiedName(attributeImpl), value, oldValue);
};
exports.getAttrImplQualifiedName = function (attributeImpl) {
    // https://dom.spec.whatwg.org/#concept-attribute-qualified-name
    if (attributeImpl._namespacePrefix === null) {
        return attributeImpl._localName;
    }
    return attributeImpl._namespacePrefix + ":" + attributeImpl._localName;
};
"use strict";
var DOMException = require("../web-idl/DOMException");
var defineGetter = require("../utils").defineGetter;
var idlUtils = require("./generated/utils");
var attrGenerated = require("./generated/Attr");
var changeAttributeImpl = require("./attributes/Attr-impl").changeAttributeImpl;
var getAttrImplQualifiedName = require("./attributes/Attr-impl").getAttrImplQualifiedName;
// https://dom.spec.whatwg.org/#namednodemap
var INTERNAL = Symbol("NamedNodeMap internal");
// TODO: use NamedPropertyTracker when https://github.com/tmpvar/jsdom/pull/1116 lands?
// Don't emulate named getters for these properties.
// Compiled later after NamedNodeMap is all set up.
var reservedNames = new Set();
function NamedNodeMap() {
    throw new TypeError("Illegal constructor");
}
defineGetter(NamedNodeMap.prototype, "length", function () {
    return this[INTERNAL].attributeList.length;
});
NamedNodeMap.prototype.item = function (index) {
    if (arguments.length < 1) {
        throw new TypeError("Not enough arguments to NamedNodeMap.prototype.item");
    }
    // Don't bother with full unsigned long long conversion. When we have better WebIDL support generally, revisit.
    index = Number(index);
    return this[index] || null;
};
NamedNodeMap.prototype.getNamedItem = function (name) {
    if (arguments.length < 1) {
        throw new TypeError("Not enough arguments to NamedNodeMap.prototype.getNamedItem");
    }
    name = String(name);
    return idlUtils.wrapperForImpl(exports.getAttributeByName(this[INTERNAL].element, name));
};
NamedNodeMap.prototype.getNamedItemNS = function (namespace, localName) {
    if (arguments.length < 2) {
        throw new TypeError("Not enough arguments to NamedNodeMap.prototype.getNamedItemNS");
    }
    if (namespace === undefined || namespace === null) {
        namespace = null;
    }
    else {
        namespace = String(namespace);
    }
    localName = String(localName);
    return idlUtils.wrapperForImpl(exports.getAttributeByNameNS(this[INTERNAL].element, namespace, localName));
};
NamedNodeMap.prototype.setNamedItem = function (attr) {
    if (!attrGenerated.is(attr)) {
        throw new TypeError("First argument to NamedNodeMap.prototype.setNamedItem must be an Attr");
    }
    return idlUtils.wrapperForImpl(exports.setAttribute(this[INTERNAL].element, idlUtils.implForWrapper(attr)));
};
NamedNodeMap.prototype.setNamedItemNS = function (attr) {
    if (!attrGenerated.is(attr)) {
        throw new TypeError("First argument to NamedNodeMap.prototype.setNamedItemNS must be an Attr");
    }
    return idlUtils.wrapperForImpl(exports.setAttribute(this[INTERNAL].element, idlUtils.implForWrapper(attr)));
};
NamedNodeMap.prototype.removeNamedItem = function (name) {
    if (arguments.length < 1) {
        throw new TypeError("Not enough arguments to NamedNodeMap.prototype.getNamedItem");
    }
    name = String(name);
    var attr = exports.removeAttributeByName(this[INTERNAL].element, name);
    if (attr === null) {
        throw new DOMException(DOMException.NOT_FOUND_ERR, "Tried to remove an attribute that was not present");
    }
    return idlUtils.wrapperForImpl(attr);
};
NamedNodeMap.prototype.removeNamedItemNS = function (namespace, localName) {
    if (arguments.length < 2) {
        throw new TypeError("Not enough arguments to NamedNodeMap.prototype.removeNamedItemNS");
    }
    if (namespace === undefined || namespace === null) {
        namespace = null;
    }
    else {
        namespace = String(namespace);
    }
    localName = String(localName);
    var attr = exports.removeAttributeByNameNS(this[INTERNAL].element, namespace, localName);
    if (attr === null) {
        throw new DOMException(DOMException.NOT_FOUND_ERR, "Tried to remove an attribute that was not present");
    }
    return idlUtils.wrapperForImpl(attr);
};
exports.NamedNodeMap = NamedNodeMap;
{
    var prototype = NamedNodeMap.prototype;
    while (prototype) {
        for (var _i = 0, _a = Object.getOwnPropertyNames(prototype); _i < _a.length; _i++) {
            var name_4 = _a[_i];
            reservedNames.add(name_4);
        }
        prototype = Object.getPrototypeOf(prototype);
    }
}
exports.createNamedNodeMap = function (element) {
    var nnm = Object.create(NamedNodeMap.prototype);
    nnm[INTERNAL] = {
        element: element,
        attributeList: [],
        attributesByNameMap: new Map()
    };
    return nnm;
};
// The following three are for https://dom.spec.whatwg.org/#concept-element-attribute-has. We don't just have a
// predicate tester since removing that kind of flexibility gives us the potential for better future optimizations.
exports.hasAttribute = function (element, A) {
    var attributesNNM = element._attributes;
    var attributeList = attributesNNM[INTERNAL].attributeList;
    return attributeList.indexOf(A) !== -1;
};
exports.hasAttributeByName = function (element, name) {
    var attributesNNM = element._attributes;
    var attributesByNameMap = attributesNNM[INTERNAL].attributesByNameMap;
    return attributesByNameMap.has(name);
};
exports.hasAttributeByNameNS = function (element, namespace, localName) {
    var attributesNNM = element._attributes;
    var attributeList = attributesNNM[INTERNAL].attributeList;
    return attributeList.some(function (attribute) {
        return attribute._localName === localName && attribute._namespace === namespace;
    });
};
exports.changeAttribute = function (element, attribute, value) {
    // https://dom.spec.whatwg.org/#concept-element-attributes-change
    // The partitioning here works around a particularly bad circular require problem. See
    // https://github.com/tmpvar/jsdom/pull/1247#issuecomment-149060470
    changeAttributeImpl(element, attribute, value);
};
exports.appendAttribute = function (element, attribute) {
    // https://dom.spec.whatwg.org/#concept-element-attributes-append
    var attributesNNM = element._attributes;
    var attributeList = attributesNNM[INTERNAL].attributeList;
    // TODO mutation observer stuff
    attributeList.push(attribute);
    attribute._element = element;
    // Sync target indexed properties
    attributesNNM[attributeList.length - 1] = idlUtils.wrapperForImpl(attribute);
    var name = getAttrImplQualifiedName(attribute);
    // Sync target named properties
    if (!reservedNames.has(name) && shouldNameBeInNNMProps(element, name)) {
        Object.defineProperty(attributesNNM, name, {
            configurable: true,
            writable: true,
            enumerable: false,
            value: idlUtils.wrapperForImpl(attribute)
        });
    }
    // Sync name cache
    var cache = attributesNNM[INTERNAL].attributesByNameMap;
    var entry = cache.get(name);
    if (!entry) {
        entry = [];
        cache.set(name, entry);
    }
    entry.push(attribute);
    // Run jsdom hooks; roughly correspond to spec's "An attribute is set and an attribute is added."
    element._attrModified(name, attribute._value, null);
};
exports.removeAttribute = function (element, attribute) {
    // https://dom.spec.whatwg.org/#concept-element-attributes-remove
    var attributesNNM = element._attributes;
    var attributeList = attributesNNM[INTERNAL].attributeList;
    // TODO mutation observer stuff
    for (var i = 0; i < attributeList.length; ++i) {
        if (attributeList[i] === attribute) {
            attributeList.splice(i, 1);
            attribute._element = null;
            // Sync target indexed properties
            for (var j = i; j < attributeList.length; ++j) {
                attributesNNM[j] = idlUtils.wrapperForImpl(attributeList[j]);
            }
            delete attributesNNM[attributeList.length];
            var name_5 = getAttrImplQualifiedName(attribute);
            // Sync target named properties
            if (!reservedNames.has(name_5) && shouldNameBeInNNMProps(element, name_5)) {
                delete attributesNNM[name_5];
            }
            // Sync name cache
            var cache = attributesNNM[INTERNAL].attributesByNameMap;
            var entry = cache.get(name_5);
            entry.splice(entry.indexOf(attribute), 1);
            if (entry.length === 0) {
                cache["delete"](name_5);
            }
            // Run jsdom hooks; roughly correspond to spec's "An attribute is removed."
            element._attrModified(name_5, null, attribute._value);
            return;
        }
    }
};
exports.replaceAttribute = function (element, oldAttr, newAttr) {
    // https://dom.spec.whatwg.org/#concept-element-attributes-replace
    var attributesNNM = element._attributes;
    var attributeList = attributesNNM[INTERNAL].attributeList;
    // TODO mutation observer stuff
    for (var i = 0; i < attributeList.length; ++i) {
        if (attributeList[i] === oldAttr) {
            attributeList.splice(i, 1, newAttr);
            oldAttr._element = null;
            newAttr._element = element;
            // Sync target indexed properties
            attributesNNM[i] = idlUtils.wrapperForImpl(newAttr);
            var name_6 = getAttrImplQualifiedName(newAttr);
            // Sync target named properties
            if (!reservedNames.has(name_6) && shouldNameBeInNNMProps(element, name_6)) {
                attributesNNM[name_6] = newAttr;
            }
            // Sync name cache
            var cache = attributesNNM[INTERNAL].attributesByNameMap;
            var entry = cache.get(name_6);
            if (!entry) {
                entry = [];
                cache.set(name_6, entry);
            }
            entry.splice(entry.indexOf(oldAttr), 1, newAttr);
            // Run jsdom hooks; roughly correspond to spec's "An attribute is set and an attribute is changed."
            element._attrModified(name_6, newAttr._value, oldAttr._value);
            return;
        }
    }
};
exports.getAttributeByName = function (element, name) {
    // https://dom.spec.whatwg.org/#concept-element-attributes-get-by-name
    if (element._namespaceURI === "http://www.w3.org/1999/xhtml" &&
        element._ownerDocument._parsingMode === "html") {
        name = name.toLowerCase();
    }
    var cache = element._attributes[INTERNAL].attributesByNameMap;
    var entry = cache.get(name);
    if (!entry) {
        return null;
    }
    return entry[0];
};
exports.getAttributeValue = function (element, name) {
    var attr = exports.getAttributeByName(element, name);
    if (!attr) {
        return null;
    }
    return attr._value;
};
exports.getAttributeByNameNS = function (element, namespace, localName) {
    // https://dom.spec.whatwg.org/#concept-element-attributes-get-by-namespace
    if (namespace === "") {
        namespace = null;
    }
    var attributeList = element._attributes[INTERNAL].attributeList;
    for (var i = 0; i < attributeList.length; ++i) {
        var attr = attributeList[i];
        if (attr._namespace === namespace && attr._localName === localName) {
            return attr;
        }
    }
    return null;
};
exports.getAttributeValueByNameNS = function (element, namespace, localName) {
    var attr = exports.getAttributeByNameNS(element, namespace, localName);
    if (!attr) {
        return null;
    }
    return attr._value;
};
exports.setAttribute = function (element, attr) {
    // https://dom.spec.whatwg.org/#concept-element-attributes-set
    if (attr._element !== null && attr._element !== element) {
        throw new DOMException(DOMException.INUSE_ATTRIBUTE_ERR);
    }
    var oldAttr = exports.getAttributeByNameNS(element, attr._namespace, attr._localName);
    if (oldAttr === attr) {
        return attr;
    }
    if (oldAttr !== null) {
        exports.replaceAttribute(element, oldAttr, attr);
    }
    else {
        exports.appendAttribute(element, attr);
    }
    return oldAttr;
};
exports.setAttributeValue = function (element, localName, value, prefix, namespace) {
    // https://dom.spec.whatwg.org/#concept-element-attributes-set-value
    if (prefix === undefined) {
        prefix = null;
    }
    if (namespace === undefined) {
        namespace = null;
    }
    var attribute = exports.getAttributeByNameNS(element, namespace, localName);
    if (attribute === null) {
        var newAttribute = attrGenerated.createImpl([], { namespace: namespace, namespacePrefix: prefix, localName: localName, value: value });
        exports.appendAttribute(element, newAttribute);
        return;
    }
    exports.changeAttribute(element, attribute, value);
};
exports.removeAttributeByName = function (element, name) {
    // https://dom.spec.whatwg.org/#concept-element-attributes-remove-by-name
    var attr = exports.getAttributeByName(element, name);
    if (attr !== null) {
        exports.removeAttribute(element, attr);
    }
    return attr;
};
exports.removeAttributeByNameNS = function (element, namespace, localName) {
    // https://dom.spec.whatwg.org/#concept-element-attributes-remove-by-namespace
    var attr = exports.getAttributeByNameNS(element, namespace, localName);
    if (attr !== null) {
        exports.removeAttribute(element, attr);
    }
    return attr;
};
exports.copyAttributeList = function (sourceElement, destElement) {
    // Needed by https://dom.spec.whatwg.org/#concept-node-clone
    for (var _i = 0, _a = sourceElement._attributes[INTERNAL].attributeList; _i < _a.length; _i++) {
        var sourceAttr = _a[_i];
        var destAttr = attrGenerated.createImpl([], {
            namespace: sourceAttr._namespace,
            namespacePrefix: sourceAttr._namespacePrefix,
            localName: sourceAttr._localName,
            value: sourceAttr._value
        });
        exports.appendAttribute(destElement, destAttr);
    }
};
exports.attributeListsEqual = function (elementA, elementB) {
    // Needed by https://dom.spec.whatwg.org/#concept-node-equals
    var listA = elementA._attributes[INTERNAL].attributeList;
    var listB = elementB._attributes[INTERNAL].attributeList;
    if (listA.length !== listB.length) {
        return false;
    }
    var _loop_2 = function (i) {
        var attrA = listA[i];
        if (!listB.some(function (attrB) { return equalsA(attrB); })) {
            return { value: false };
        }
        function equalsA(attrB) {
            return attrA._namespace === attrB._namespace && attrA._localName === attrB._localName &&
                attrA._value === attrB._value;
        }
    };
    for (var i = 0; i < listA.length; ++i) {
        var state_1 = _loop_2(i);
        if (typeof state_1 === "object")
            return state_1.value;
    }
    return true;
};
exports.attributeNames = function (element) {
    // Needed by https://dom.spec.whatwg.org/#dom-element-getattributenames
    return element._attributes[INTERNAL].attributeList.map(getAttrImplQualifiedName);
};
exports.hasAttributes = function (element) {
    // Needed by https://dom.spec.whatwg.org/#dom-element-hasattributes
    return element._attributes[INTERNAL].attributeList.length > 0;
};
function shouldNameBeInNNMProps(element, name) {
    if (element._ownerDocument._parsingMode === "html" && element._namespaceURI === "http://www.w3.org/1999/xhtml") {
        return name.toLowerCase() === name;
    }
    return true;
}
"use strict";
var lengthFromProperties = require("../utils").lengthFromProperties;
var getAttributeValue = require("./attributes").getAttributeValue;
var idlUtils = require("./generated/utils");
var privates = Symbol("HTMLCollection internal slots");
var conflictKeys = new Set(["length", "item", "namedItem"]);
var HTMLCollection = (function () {
    function HTMLCollection(secret, element, query) {
        if (secret !== privates) {
            throw new TypeError("Invalid constructor");
        }
        this[privates] = { element: element, query: query, keys: [], length: 0, version: -1, conflictElements: Object.create(null) };
        updateHTMLCollection(this);
    }
    Object.defineProperty(HTMLCollection.prototype, "length", {
        get: function () {
            updateHTMLCollection(this);
            return this[privates].length;
        },
        enumerable: true,
        configurable: true
    });
    HTMLCollection.prototype.item = function (index) {
        updateHTMLCollection(this);
        return this[index] || null;
    };
    HTMLCollection.prototype.namedItem = function (name) {
        updateHTMLCollection(this);
        if (conflictKeys.has(name)) {
            return this[privates].conflictElements[name] || null;
        }
        if (Object.prototype.hasOwnProperty.call(this, name)) {
            return this[name];
        }
        return null;
    };
    return HTMLCollection;
}());
HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
function updateHTMLCollection(collection) {
    if (collection[privates].version < collection[privates].element._version) {
        resetHTMLCollectionTo(collection, collection[privates].query());
        collection[privates].version = collection[privates].element._version;
    }
}
function resetHTMLCollectionTo(collection, impls) {
    var wrappers = impls.map(idlUtils.wrapperForImpl);
    var startingLength = lengthFromProperties(collection);
    for (var i = 0; i < startingLength; ++i) {
        delete collection[i];
    }
    for (var i = 0; i < wrappers.length; ++i) {
        collection[i] = wrappers[i];
    }
    collection[privates].length = wrappers.length;
    var keys = collection[privates].keys;
    for (var i = 0; i < keys.length; ++i) {
        delete collection[keys[i]];
    }
    keys.length = 0;
    for (var i = 0; i < impls.length; ++i) {
        addIfAttrPresent(impls[i], wrappers[i], "name");
    }
    for (var i = 0; i < impls.length; ++i) {
        addIfAttrPresent(impls[i], wrappers[i], "id");
    }
    function addIfAttrPresent(impl, wrapper, attr) {
        var value = getAttributeValue(impl, attr);
        if (value === null || value === "") {
            return;
        }
        // Don't overwrite numeric indices with named ones.
        var valueAsNumber = Number(value);
        if (!Number.isNaN(valueAsNumber) && valueAsNumber >= 0) {
            return;
        }
        // Don't override existing named ones
        if (keys.indexOf(value) !== -1) {
            return;
        }
        if (conflictKeys.has(value)) {
            collection[privates].conflictElements[value] = wrapper;
        }
        else {
            collection[value] = wrapper;
        }
        keys.push(value);
    }
}
module.exports = function (core) {
    core.HTMLCollection = HTMLCollection;
};
module.exports.create = function (element, query) {
    return new HTMLCollection(privates, element, query);
};
module.exports.update = updateHTMLCollection;
"use strict";
var hasOwnProp = Object.prototype.hasOwnProperty;
var namedPropertiesTracker = require("../named-properties-tracker");
var NODE_TYPE = require("./node-type");
var createHTMLCollection = require("./html-collection").create;
var treeOrderSorter = require("../utils").treeOrderSorter;
var idlUtils = require("./generated/utils");
function isNamedPropertyElement(element) {
    // (for the name attribute)
    // use hasOwnProperty to make sure contentWindow comes from the prototype,
    // and is not set directly on the node by a script.
    if ("contentWindow" in element && !hasOwnProp.call(element, "contentWindow")) {
        return true;
    }
    switch (element.nodeName) {
        case "A":
        case "APPLET":
        case "AREA":
        case "EMBED":
        case "FORM":
        case "FRAMESET":
        case "IMG":
        case "OBJECT":
            return true;
        default:
            return false;
    }
}
function namedPropertyResolver(HTMLCollection, window, name, values) {
    function getResult() {
        var results = [];
        for (var _i = 0, _a = values().keys(); _i < _a.length; _i++) {
            var node = _a[_i];
            if (node.nodeType !== NODE_TYPE.ELEMENT_NODE) {
                continue;
            }
            if (node.getAttribute("id") === name) {
                results.push(node);
            }
            else if (node.getAttribute("name") === name && isNamedPropertyElement(node)) {
                results.push(node);
            }
        }
        results.sort(treeOrderSorter);
        return results;
    }
    var document = window._document;
    var objects = createHTMLCollection(idlUtils.implForWrapper(document.documentElement), getResult);
    var length = objects.length;
    for (var i = 0; i < length; ++i) {
        var node = objects[i];
        if ("contentWindow" in node && !hasOwnProp.call(node, "contentWindow") &&
            node.getAttribute("name") === name) {
            return node.contentWindow;
        }
    }
    if (length === 0) {
        return undefined;
    }
    if (length === 1) {
        return objects[0];
    }
    return objects;
}
exports.initializeWindow = function (window, HTMLCollection) {
    namedPropertiesTracker.create(window, namedPropertyResolver.bind(null, HTMLCollection));
};
exports.elementAttributeModified = function (element, name, value, oldValue) {
    if (!element._attached) {
        return;
    }
    var useName = isNamedPropertyElement(element);
    if (name === "id" || (name === "name" && useName)) {
        var tracker = namedPropertiesTracker.get(element._ownerDocument._global);
        // (tracker will be null if the document has no Window)
        if (tracker) {
            if (name === "id" && (!useName || element.getAttribute("name") !== oldValue)) {
                tracker.untrack(oldValue, element);
            }
            if (name === "name" && element.getAttribute("id") !== oldValue) {
                tracker.untrack(oldValue, element);
            }
            tracker.track(value, element);
        }
    }
};
exports.nodeAttachedToDocument = function (node) {
    if (node.nodeType !== NODE_TYPE.ELEMENT_NODE) {
        return;
    }
    var tracker = namedPropertiesTracker.get(node._ownerDocument._global);
    if (!tracker) {
        return;
    }
    tracker.track(node.getAttribute("id"), node);
    if (isNamedPropertyElement(node)) {
        tracker.track(node.getAttribute("name"), node);
    }
};
exports.nodeDetachedFromDocument = function (node) {
    if (node.nodeType !== NODE_TYPE.ELEMENT_NODE) {
        return;
    }
    var tracker = namedPropertiesTracker.get(node._ownerDocument._global);
    if (!tracker) {
        return;
    }
    tracker.untrack(node.getAttribute("id"), node);
    if (isNamedPropertyElement(node)) {
        tracker.untrack(node.getAttribute("name"), node);
    }
};
"use strict";
var isValidTargetOrigin = require("../utils").isValidTargetOrigin;
var DOMException = require("../web-idl/DOMException");
module.exports = function (message, targetOrigin) {
    var _this = this;
    if (arguments.length < 2) {
        throw new TypeError("'postMessage' requires 2 arguments: 'message' and 'targetOrigin'");
    }
    targetOrigin = String(targetOrigin);
    if (!isValidTargetOrigin(targetOrigin)) {
        throw new DOMException(DOMException.SYNTAX_ERR, "Failed to execute 'postMessage' on 'Window': " +
            "Invalid target origin '" + targetOrigin + "' in a call to 'postMessage'.");
    }
    // TODO: targetOrigin === '/' - requires reference to source window
    // See https://github.com/tmpvar/jsdom/pull/1140#issuecomment-111587499
    if (targetOrigin !== "*" && targetOrigin !== this.origin) {
        return;
    }
    // TODO: event.source - requires reference to source window
    // TODO: event.origin - requires reference to source window
    // TODO: event.ports
    // TODO: event.data - structured clone message - requires cloning DOM nodes
    var event = new this.MessageEvent("message", {
        data: message
    });
    event.initEvent("message", false, false);
    setTimeout(function () {
        _this.dispatchEvent(event);
    }, 0);
};
"use strict";
exports.buffer = Symbol("buffer");
exports.type = Symbol("type");
exports.closed = Symbol("closed");
"use strict";
var whatwgEncoding = require("whatwg-encoding");
var parseContentType = require("content-type-parser");
var querystring = require("querystring");
var DOMException = require("../web-idl/DOMException");
var EventTarget = require("./generated/EventTarget");
var addConstants = require("../utils").addConstants;
var blobSymbols = require("./blob-symbols");
function FileReaderEventTarget() {
    if (!(this instanceof FileReaderEventTarget)) {
        throw new TypeError("DOM object constructor cannot be called as a function.");
    }
    EventTarget.setup(this);
}
FileReaderEventTarget.prototype = Object.create(EventTarget.interface.prototype);
module.exports = function createFileReader(window) {
    var ProgressEvent = window.ProgressEvent;
    var FileReader = (function (_super) {
        __extends(FileReader, _super);
        function FileReader() {
            var _this = _super.call(this) || this;
            _this.error = null;
            _this.readyState = FileReader.EMPTY;
            _this.result = null;
            _this.onloadstart = null;
            _this.onprogress = null;
            _this.onload = null;
            _this.onabort = null;
            _this.onerror = null;
            _this.onloadend = null;
            return _this;
        }
        FileReader.prototype.readAsArrayBuffer = function (file) {
            readFile(this, file, "buffer");
        };
        FileReader.prototype.readAsDataURL = function (file) {
            readFile(this, file, "dataUrl");
        };
        FileReader.prototype.readAsText = function (file, encoding) {
            readFile(this, file, "text", whatwgEncoding.labelToName(encoding) || "UTF-8");
        };
        FileReader.prototype.abort = function () {
            if (this.readyState === this.DONE || this.readyState === this.EMPTY) {
                this.result = null;
                return;
            }
            if (this.readyState === this.LOADING) {
                this.readyState = this.DONE;
            }
            this.dispatchEvent(new ProgressEvent("abort"));
            this.dispatchEvent(new ProgressEvent("loadend"));
        };
        Object.defineProperty(FileReader.prototype, "_ownerDocument", {
            get: function () {
                return window.document;
            },
            enumerable: true,
            configurable: true
        });
        return FileReader;
    }(FileReaderEventTarget));
    addConstants(FileReader, {
        EMPTY: 0,
        LOADING: 1,
        DONE: 2
    });
    function readFile(self, file, format, encoding) {
        if (self.readyState === self.LOADING) {
            throw new DOMException(DOMException.INVALID_STATE_ERR);
        }
        if (file[blobSymbols.closed]) {
            self.error = new DOMException(DOMException.INVALID_STATE_ERR);
            self.dispatchEvent(new ProgressEvent("error"));
        }
        self.readyState = self.LOADING;
        self.dispatchEvent(new ProgressEvent("loadstart"));
        process.nextTick(function () {
            var data = file[blobSymbols.buffer];
            if (!data) {
                data = new Buffer("");
            }
            self.dispatchEvent(new ProgressEvent("progress", {
                lengthComputable: !isNaN(file.size),
                total: file.size,
                loaded: data.length
            }));
            process.nextTick(function () {
                switch (format) {
                    default:
                    case "buffer": {
                        self.result = (new Uint8Array(data)).buffer;
                        break;
                    }
                    case "dataUrl": {
                        var dataUrl = "data:";
                        var contentType = parseContentType(file.type);
                        if (contentType && contentType.isText()) {
                            var fallbackEncoding = whatwgEncoding.getBOMEncoding(data) ||
                                whatwgEncoding.labelToName(contentType.get("charset")) || "UTF-8";
                            var decoded = whatwgEncoding.decode(data, fallbackEncoding);
                            contentType.set("charset", encoding);
                            dataUrl += contentType.toString();
                            dataUrl += ",";
                            dataUrl += querystring.escape(decoded);
                        }
                        else {
                            if (contentType) {
                                dataUrl += contentType.toString();
                            }
                            dataUrl += ";base64,";
                            dataUrl += data.toString("base64");
                        }
                        self.result = dataUrl;
                        break;
                    }
                    case "text": {
                        self.result = whatwgEncoding.decode(data, encoding);
                        break;
                    }
                }
                self.readyState = self.DONE;
                self.dispatchEvent(new ProgressEvent("load"));
                self.dispatchEvent(new ProgressEvent("loadend"));
            });
        });
    }
    return FileReader;
};
"use strict";
exports.flag = Symbol("flag");
exports.properties = Symbol("properties");
"use strict";
var request = require("request");
var EventEmitter = require("events").EventEmitter;
var fs = require("fs");
var URL = require("whatwg-url").URL;
var utils = require("../utils");
var xhrSymbols = require("./xmlhttprequest-symbols");
function wrapCookieJarForRequest(cookieJar) {
    var jarWrapper = request.jar();
    jarWrapper._jar = cookieJar;
    return jarWrapper;
}
function getRequestHeader(requestHeaders, header) {
    var lcHeader = header.toLowerCase();
    var keys = Object.keys(requestHeaders);
    var n = keys.length;
    while (n--) {
        var key = keys[n];
        if (key.toLowerCase() === lcHeader) {
            return requestHeaders[key];
        }
    }
    return null;
}
function updateRequestHeader(requestHeaders, header, newValue) {
    var lcHeader = header.toLowerCase();
    var keys = Object.keys(requestHeaders);
    var n = keys.length;
    while (n--) {
        var key = keys[n];
        if (key.toLowerCase() === lcHeader) {
            requestHeaders[key] = newValue;
        }
    }
}
var simpleMethods = new Set(["GET", "HEAD", "POST"]);
var simpleHeaders = new Set(["accept", "accept-language", "content-language", "content-type"]);
exports.getRequestHeader = getRequestHeader;
exports.updateRequestHeader = updateRequestHeader;
exports.simpleHeaders = simpleHeaders;
// return a "request" client object or an event emitter matching the same behaviour for unsupported protocols
// the callback should be called with a "request" response object or an event emitter matching the same behaviour too
exports.createClient = function createClient(xhr) {
    var flag = xhr[xhrSymbols.flag];
    var properties = xhr[xhrSymbols.properties];
    var urlObj = new URL(flag.uri);
    var uri = urlObj.href;
    var ucMethod = flag.method.toUpperCase();
    var requestManager = flag.requestManager;
    if (urlObj.protocol === "file:") {
        var response_1 = new EventEmitter();
        response_1.statusCode = 200;
        response_1.rawHeaders = [];
        response_1.headers = {};
        response_1.request = { uri: urlObj };
        var filePath = urlObj.pathname
            .replace(/^file:\/\//, "")
            .replace(/^\/([a-z]):\//i, "$1:/")
            .replace(/%20/g, " ");
        var client_1 = new EventEmitter();
        var readableStream_1 = fs.createReadStream(filePath, { encoding: null });
        readableStream_1.on("data", function (chunk) {
            response_1.emit("data", chunk);
            client_1.emit("data", chunk);
        });
        readableStream_1.on("end", function () {
            response_1.emit("end");
            client_1.emit("end");
        });
        readableStream_1.on("error", function (err) {
            response_1.emit("error", err);
            client_1.emit("error", err);
        });
        client_1.abort = function () {
            readableStream_1.destroy();
            client_1.emit("abort");
        };
        if (requestManager) {
            var req = {
                abort: function () {
                    properties.abortError = true;
                    xhr.abort();
                }
            };
            requestManager.add(req);
            var rmReq = requestManager.remove.bind(requestManager, req);
            client_1.on("abort", rmReq);
            client_1.on("error", rmReq);
            client_1.on("end", rmReq);
        }
        process.nextTick(function () { return client_1.emit("response", response_1); });
        return client_1;
    }
    if (urlObj.protocol === "data:") {
        var response_2 = new EventEmitter();
        response_2.request = { uri: urlObj };
        var client_2 = new EventEmitter();
        var buffer_1;
        if (ucMethod === "GET") {
            try {
                var dataUrlContent = utils.parseDataUrl(uri);
                buffer_1 = dataUrlContent.buffer;
                response_2.statusCode = 200;
                response_2.rawHeaders = dataUrlContent.type ? ["Content-Type", dataUrlContent.type] : [];
                response_2.headers = dataUrlContent.type ? { "content-type": dataUrlContent.type } : {};
            }
            catch (err) {
                process.nextTick(function () { return client_2.emit("error", err); });
                return client_2;
            }
        }
        else {
            buffer_1 = new Buffer("");
            response_2.statusCode = 0;
            response_2.rawHeaders = {};
            response_2.headers = {};
        }
        client_2.abort = function () {
            // do nothing
        };
        process.nextTick(function () {
            client_2.emit("response", response_2);
            process.nextTick(function () {
                response_2.emit("data", buffer_1);
                client_2.emit("data", buffer_1);
                response_2.emit("end");
                client_2.emit("end");
            });
        });
        return client_2;
    }
    var requestHeaders = {};
    for (var header in flag.requestHeaders) {
        requestHeaders[header] = flag.requestHeaders[header];
    }
    if (getRequestHeader(flag.requestHeaders, "referer") === null) {
        requestHeaders.Referer = flag.referrer;
    }
    if (getRequestHeader(flag.requestHeaders, "user-agent") === null) {
        requestHeaders["User-Agent"] = flag.userAgent;
    }
    if (getRequestHeader(flag.requestHeaders, "accept-language") === null) {
        requestHeaders["Accept-Language"] = "en";
    }
    if (getRequestHeader(flag.requestHeaders, "accept") === null) {
        requestHeaders.Accept = "*/*";
    }
    var crossOrigin = flag.origin !== urlObj.origin;
    if (crossOrigin) {
        requestHeaders.Origin = flag.origin;
    }
    var options = {
        uri: uri,
        method: flag.method,
        headers: requestHeaders,
        gzip: true,
        maxRedirects: 21,
        followAllRedirects: true,
        encoding: null,
        pool: flag.pool,
        agentOptions: flag.agentOptions,
        strictSSL: flag.strictSSL
    };
    if (flag.auth) {
        options.auth = {
            user: flag.auth.user || "",
            pass: flag.auth.pass || "",
            sendImmediately: false
        };
    }
    if (flag.cookieJar && (!crossOrigin || flag.withCredentials)) {
        options.jar = wrapCookieJarForRequest(flag.cookieJar);
    }
    if (flag.proxy) {
        options.proxy = flag.proxy;
    }
    var body = flag.body;
    var hasBody = body !== undefined &&
        body !== null &&
        body !== "" &&
        !(ucMethod === "HEAD" || ucMethod === "GET");
    if (hasBody && !flag.formData) {
        options.body = body;
    }
    if (hasBody && getRequestHeader(flag.requestHeaders, "content-type") === null) {
        requestHeaders["Content-Type"] = "text/plain;charset=UTF-8";
    }
    function doRequest() {
        try {
            var client_3 = request(options);
            if (hasBody && flag.formData) {
                var form = client_3.form();
                for (var _i = 0, body_1 = body; _i < body_1.length; _i++) {
                    var entry = body_1[_i];
                    form.append(entry.name, entry.value, entry.options);
                }
            }
            return client_3;
        }
        catch (e) {
            var client_4 = new EventEmitter();
            process.nextTick(function () { return client_4.emit("error", e); });
            return client_4;
        }
    }
    var client;
    var nonSimpleHeaders = Object.keys(flag.requestHeaders)
        .filter(function (header) { return !simpleHeaders.has(header.toLowerCase()); });
    if (crossOrigin && (!simpleMethods.has(ucMethod) || nonSimpleHeaders.length > 0)) {
        client = new EventEmitter();
        var preflightRequestHeaders = [];
        for (var header in requestHeaders) {
            preflightRequestHeaders[header] = requestHeaders[header];
        }
        preflightRequestHeaders["Access-Control-Request-Method"] = flag.method;
        if (nonSimpleHeaders.length > 0) {
            preflightRequestHeaders["Access-Control-Request-Headers"] = nonSimpleHeaders.join(", ");
        }
        flag.preflight = true;
        var preflightOptions = {
            uri: uri,
            method: "OPTIONS",
            headers: preflightRequestHeaders,
            followRedirect: false,
            encoding: null,
            pool: flag.pool,
            agentOptions: flag.agentOptions,
            strictSSL: flag.strictSSL
        };
        if (flag.proxy) {
            preflightOptions.proxy = flag.proxy;
        }
        var preflightClient_1 = request(preflightOptions);
        preflightClient_1.on("response", function (resp) {
            if (resp.statusCode >= 200 && resp.statusCode <= 299) {
                var realClient_1 = doRequest();
                realClient_1.on("response", function (res) { return client.emit("response", res); });
                realClient_1.on("data", function (chunk) { return client.emit("data", chunk); });
                realClient_1.on("end", function () { return client.emit("end"); });
                realClient_1.on("abort", function () { return client.emit("abort"); });
                realClient_1.on("request", function (req) {
                    client.headers = realClient_1.headers;
                    client.emit("request", req);
                });
                realClient_1.on("redirect", function () {
                    client.response = realClient_1.response;
                    client.emit("redirect");
                });
                realClient_1.on("error", function (err) { return client.emit("error", err); });
                client.abort = function () {
                    realClient_1.abort();
                };
            }
            else {
                client.emit("error", new Error("Response for preflight has invalid HTTP status code " + resp.statusCode));
            }
        });
        preflightClient_1.on("error", function (err) { return client.emit("error", err); });
        client.abort = function () {
            preflightClient_1.abort();
        };
    }
    else {
        client = doRequest();
    }
    if (requestManager) {
        var req = {
            abort: function () {
                properties.abortError = true;
                xhr.abort();
            }
        };
        requestManager.add(req);
        var rmReq = requestManager.remove.bind(requestManager, req);
        client.on("abort", rmReq);
        client.on("error", rmReq);
        client.on("end", rmReq);
    }
    return client;
};
"use strict";
var HTTP_STATUS_CODES = require("http").STATUS_CODES;
var spawnSync = require("child_process").spawnSync;
var URL = require("whatwg-url").URL;
var whatwgEncoding = require("whatwg-encoding");
var tough = require("tough-cookie");
var parseContentType = require("content-type-parser");
var xhrUtils = require("./xhr-utils");
var DOMException = require("../web-idl/DOMException");
var xhrSymbols = require("./xmlhttprequest-symbols");
var blobSymbols = require("./blob-symbols");
var addConstants = require("../utils").addConstants;
var documentBaseURLSerialized = require("./helpers/document-base-url").documentBaseURLSerialized;
var idlUtils = require("./generated/utils");
var Document = require("./generated/Document");
var domToHtml = require("../browser/domtohtml").domToHtml;
var syncWorkerFile = require.resolve ? require.resolve("./xhr-sync-worker.js") : null;
var tokenRegexp = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
var headerListSeparatorRegexp = /,[ \t]*/;
var fieldValueRegexp = /^[ \t]*(?:[\x21-\x7E\x80-\xFF](?:[ \t][\x21-\x7E\x80-\xFF])?)*[ \t]*$/;
var forbiddenRequestHeaders = new Set([
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "connection",
    "content-length",
    "cookie",
    "cookie2",
    "date",
    "dnt",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "via"
]);
var forbiddenResponseHeaders = new Set([
    "set-cookie",
    "set-cookie2"
]);
var uniqueResponseHeaders = new Set([
    "content-type",
    "content-length",
    "user-agent",
    "referer",
    "host",
    "authorization",
    "proxy-authorization",
    "if-modified-since",
    "if-unmodified-since",
    "from",
    "location",
    "max-forwards"
]);
var corsSafeResponseHeaders = new Set([
    "cache-control",
    "content-language",
    "content-type",
    "expires",
    "last-modified",
    "pragma"
]);
var allowedRequestMethods = new Set(["OPTIONS", "GET", "HEAD", "POST", "PUT", "DELETE"]);
var forbiddenRequestMethods = new Set(["TRACK", "TRACE", "CONNECT"]);
var XMLHttpRequestResponseType = new Set([
    "",
    "arraybuffer",
    "blob",
    "document",
    "json",
    "text"
]);
var simpleHeaders = xhrUtils.simpleHeaders;
var redirectStatuses = new Set([301, 302, 303, 307, 308]);
module.exports = function createXMLHttpRequest(window) {
    var Event = window.Event;
    var ProgressEvent = window.ProgressEvent;
    var Blob = window.Blob;
    var FormData = window.FormData;
    var XMLHttpRequestEventTarget = window.XMLHttpRequestEventTarget;
    var XMLHttpRequestUpload = window.XMLHttpRequestUpload;
    var XMLHttpRequest = (function (_super) {
        __extends(XMLHttpRequest, _super);
        function XMLHttpRequest() {
            var _this = _super.call(this) || this;
            if (!(_this instanceof XMLHttpRequest)) {
                throw new TypeError("DOM object constructor cannot be called as a function.");
            }
            _this.upload = new XMLHttpRequestUpload();
            _this.upload._ownerDocument = window.document;
            _this[xhrSymbols.flag] = {
                synchronous: false,
                withCredentials: false,
                mimeType: null,
                auth: null,
                method: undefined,
                responseType: "",
                requestHeaders: {},
                referrer: _this._ownerDocument.URL,
                uri: "",
                timeout: 0,
                body: undefined,
                formData: false,
                preflight: false,
                requestManager: _this._ownerDocument._requestManager,
                pool: _this._ownerDocument._pool,
                agentOptions: _this._ownerDocument._agentOptions,
                strictSSL: _this._ownerDocument._strictSSL,
                proxy: _this._ownerDocument._proxy,
                cookieJar: _this._ownerDocument._cookieJar,
                encoding: _this._ownerDocument._encoding,
                origin: _this._ownerDocument.origin,
                userAgent: _this._ownerDocument._defaultView.navigator.userAgent
            };
            _this[xhrSymbols.properties] = {
                beforeSend: false,
                send: false,
                timeoutStart: 0,
                timeoutId: 0,
                timeoutFn: null,
                client: null,
                responseHeaders: {},
                filteredResponseHeaders: [],
                responseBuffer: null,
                responseCache: null,
                responseTextCache: null,
                responseXMLCache: null,
                responseURL: "",
                readyState: XMLHttpRequest.UNSENT,
                status: 0,
                statusText: "",
                error: "",
                uploadComplete: true,
                abortError: false,
                cookieJar: _this._ownerDocument._cookieJar
            };
            _this.onreadystatechange = null;
            return _this;
        }
        Object.defineProperty(XMLHttpRequest.prototype, "readyState", {
            get: function () {
                return this[xhrSymbols.properties].readyState;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(XMLHttpRequest.prototype, "status", {
            get: function () {
                return this[xhrSymbols.properties].status;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(XMLHttpRequest.prototype, "statusText", {
            get: function () {
                return this[xhrSymbols.properties].statusText;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(XMLHttpRequest.prototype, "responseType", {
            get: function () {
                return this[xhrSymbols.flag].responseType;
            },
            set: function (responseType) {
                var flag = this[xhrSymbols.flag];
                if (this.readyState === XMLHttpRequest.LOADING || this.readyState === XMLHttpRequest.DONE) {
                    throw new DOMException(DOMException.INVALID_STATE_ERR);
                }
                if (this.readyState === XMLHttpRequest.OPENED && flag.synchronous) {
                    throw new DOMException(DOMException.INVALID_ACCESS_ERR);
                }
                if (!XMLHttpRequestResponseType.has(responseType)) {
                    responseType = "";
                }
                flag.responseType = responseType;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(XMLHttpRequest.prototype, "response", {
            get: function () {
                var flag = this[xhrSymbols.flag];
                var properties = this[xhrSymbols.properties];
                if (properties.responseCache) {
                    return properties.responseCache;
                }
                var res = "";
                switch (this.responseType) {
                    case "":
                    case "text": {
                        res = this.responseText;
                        break;
                    }
                    case "arraybuffer": {
                        if (!properties.responseBuffer) {
                            return null;
                        }
                        res = (new Uint8Array(properties.responseBuffer)).buffer;
                        break;
                    }
                    case "blob": {
                        if (!properties.responseBuffer) {
                            return null;
                        }
                        res = new Blob([(new Uint8Array(properties.responseBuffer)).buffer]);
                        break;
                    }
                    case "document": {
                        res = this.responseXML;
                        break;
                    }
                    case "json": {
                        if (this.readyState !== XMLHttpRequest.DONE || !properties.responseBuffer) {
                            res = null;
                        }
                        var contentType = getContentType(this);
                        var fallbackEncoding = whatwgEncoding.labelToName(contentType && contentType.get("charset") || flag.encoding);
                        var jsonStr = whatwgEncoding.decode(properties.responseBuffer, fallbackEncoding);
                        try {
                            res = JSON.parse(jsonStr);
                        }
                        catch (e) {
                            res = null;
                        }
                        break;
                    }
                }
                properties.responseCache = res;
                return res;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(XMLHttpRequest.prototype, "responseText", {
            get: function () {
                var flag = this[xhrSymbols.flag];
                var properties = this[xhrSymbols.properties];
                if (this.responseType !== "" && this.responseType !== "text") {
                    throw new DOMException(DOMException.INVALID_STATE_ERR);
                }
                if (this.readyState !== XMLHttpRequest.LOADING && this.readyState !== XMLHttpRequest.DONE) {
                    return "";
                }
                if (properties.responseTextCache) {
                    return properties.responseTextCache;
                }
                var responseBuffer = properties.responseBuffer;
                if (!responseBuffer) {
                    return "";
                }
                var contentType = getContentType(this);
                var fallbackEncoding = whatwgEncoding.labelToName(contentType && contentType.get("charset") || flag.encoding);
                var res = whatwgEncoding.decode(responseBuffer, fallbackEncoding);
                properties.responseTextCache = res;
                return res;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(XMLHttpRequest.prototype, "responseXML", {
            get: function () {
                var flag = this[xhrSymbols.flag];
                var properties = this[xhrSymbols.properties];
                if (this.responseType !== "" && this.responseType !== "document") {
                    throw new DOMException(DOMException.INVALID_STATE_ERR);
                }
                if (this.readyState !== XMLHttpRequest.DONE) {
                    return null;
                }
                if (properties.responseXMLCache) {
                    return properties.responseXMLCache;
                }
                var responseBuffer = properties.responseBuffer;
                if (!responseBuffer) {
                    return null;
                }
                var contentType = getContentType(this);
                var isHTML = false;
                var isXML = false;
                if (contentType) {
                    isHTML = contentType.isHTML();
                    isXML = contentType.isXML();
                    if (!isXML && !isHTML) {
                        return null;
                    }
                }
                var encoding = whatwgEncoding.getBOMEncoding(responseBuffer) ||
                    whatwgEncoding.labelToName(contentType && contentType.get("charset") || flag.encoding);
                var resText = whatwgEncoding.decode(responseBuffer, encoding);
                if (!resText) {
                    return null;
                }
                if (this.responseType === "" && isHTML) {
                    return null;
                }
                var res = Document.create([], { core: window._core, options: {
                        url: flag.uri,
                        lastModified: new Date(getResponseHeader(this, "last-modified")),
                        parsingMode: isHTML ? "html" : "xml",
                        cookieJar: { setCookieSync: function () { return undefined; }, getCookieStringSync: function () { return ""; } },
                        encoding: encoding
                    } });
                var resImpl = idlUtils.implForWrapper(res);
                try {
                    resImpl._htmlToDom.appendHtmlToDocument(resText, resImpl);
                }
                catch (e) {
                    properties.responseXMLCache = null;
                    return null;
                }
                res.close();
                properties.responseXMLCache = res;
                return res;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(XMLHttpRequest.prototype, "responseURL", {
            get: function () {
                return this[xhrSymbols.properties].responseURL;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(XMLHttpRequest.prototype, "timeout", {
            get: function () {
                return this[xhrSymbols.flag].timeout;
            },
            set: function (val) {
                var flag = this[xhrSymbols.flag];
                var properties = this[xhrSymbols.properties];
                if (flag.synchronous) {
                    throw new DOMException(DOMException.INVALID_ACCESS_ERR);
                }
                flag.timeout = val;
                clearTimeout(properties.timeoutId);
                if (val > 0 && properties.timeoutFn) {
                    properties.timeoutId = setTimeout(properties.timeoutFn, Math.max(0, val - ((new Date()).getTime() - properties.timeoutStart)));
                }
                else {
                    properties.timeoutFn = null;
                    properties.timeoutStart = 0;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(XMLHttpRequest.prototype, "withCredentials", {
            get: function () {
                return this[xhrSymbols.flag].withCredentials;
            },
            set: function (val) {
                var flag = this[xhrSymbols.flag];
                var properties = this[xhrSymbols.properties];
                if (!(this.readyState === XMLHttpRequest.UNSENT || this.readyState === XMLHttpRequest.OPENED)) {
                    throw new DOMException(DOMException.INVALID_STATE_ERR);
                }
                if (properties.send) {
                    throw new DOMException(DOMException.INVALID_STATE_ERR);
                }
                flag.withCredentials = val;
            },
            enumerable: true,
            configurable: true
        });
        XMLHttpRequest.prototype.abort = function () {
            var flag = this[xhrSymbols.flag];
            var properties = this[xhrSymbols.properties];
            // Terminate the request
            clearTimeout(properties.timeoutId);
            properties.timeoutFn = null;
            properties.timeoutStart = 0;
            var client = properties.client;
            if (client) {
                client.abort();
                properties.client = null;
            }
            if ((this.readyState === XMLHttpRequest.OPENED && properties.send) ||
                this.readyState === XMLHttpRequest.HEADERS_RECEIVED ||
                this.readyState === XMLHttpRequest.LOADING) {
                // Run the request error steps for event abort
                properties.readyState = XMLHttpRequest.DONE;
                properties.send = false;
                properties.status = 0;
                properties.statusText = "";
                properties.responseCache = properties.responseTextCache = properties.responseXMLCache = null;
                if (flag.synchronous) {
                    throw new DOMException(DOMException.ABORT_ERR);
                }
                this.dispatchEvent(new Event("readystatechange"));
                // TODO: spec says this should only be checking upload complete flag?
                if (!(flag.method === "HEAD" || flag.method === "GET")) {
                    properties.uploadComplete = true;
                    // TODO upload listener
                    this.upload.dispatchEvent(new ProgressEvent("abort"));
                    if (properties.abortError) {
                        // TODO document what this is about (here and below)
                        this.upload.dispatchEvent(new ProgressEvent("error"));
                    }
                    this.upload.dispatchEvent(new ProgressEvent("loadend"));
                }
                this.dispatchEvent(new ProgressEvent("abort"));
                if (properties.abortError) {
                    this.dispatchEvent(new ProgressEvent("error"));
                }
                this.dispatchEvent(new ProgressEvent("loadend"));
            }
            if (this.readyState === XMLHttpRequest.DONE) {
                properties.readyState = XMLHttpRequest.UNSENT;
                properties.status = 0;
                properties.statusText = "";
                properties.responseCache = properties.responseTextCache = properties.responseXMLCache = null;
            }
        };
        XMLHttpRequest.prototype.getAllResponseHeaders = function () {
            var properties = this[xhrSymbols.properties];
            var readyState = this.readyState;
            if (readyState === XMLHttpRequest.UNSENT || readyState === XMLHttpRequest.OPENED) {
                return "";
            }
            return Object.keys(properties.responseHeaders)
                .filter(function (key) { return properties.filteredResponseHeaders.indexOf(key) === -1; })
                .map(function (key) { return [key, properties.responseHeaders[key]].join(": "); }).join("\r\n");
        };
        XMLHttpRequest.prototype.getResponseHeader = function (header) {
            var properties = this[xhrSymbols.properties];
            var readyState = this.readyState;
            if (readyState === XMLHttpRequest.UNSENT || readyState === XMLHttpRequest.OPENED) {
                return null;
            }
            var lcHeader = toByteString(header).toLowerCase();
            if (properties.filteredResponseHeaders.find(function (filtered) { return lcHeader === filtered.toLowerCase(); })) {
                return null;
            }
            return getResponseHeader(this, lcHeader);
        };
        XMLHttpRequest.prototype.open = function (method, uri, asynchronous, user, password) {
            if (!this._ownerDocument) {
                throw new DOMException(DOMException.INVALID_STATE_ERR);
            }
            var flag = this[xhrSymbols.flag];
            var properties = this[xhrSymbols.properties];
            var argumentCount = arguments.length;
            if (argumentCount < 2) {
                throw new TypeError("Not enought arguments");
            }
            method = toByteString(method);
            if (!tokenRegexp.test(method)) {
                throw new DOMException(DOMException.SYNTAX_ERR);
            }
            var upperCaseMethod = method.toUpperCase();
            if (forbiddenRequestMethods.has(upperCaseMethod)) {
                throw new DOMException(DOMException.SECURITY_ERR);
            }
            var client = properties.client;
            if (client && typeof client.abort === "function") {
                client.abort();
            }
            if (allowedRequestMethods.has(upperCaseMethod)) {
                method = upperCaseMethod;
            }
            if (typeof asynchronous !== "undefined") {
                flag.synchronous = !asynchronous;
            }
            else {
                flag.synchronous = false;
            }
            if (flag.responseType && flag.synchronous) {
                throw new DOMException(DOMException.INVALID_ACCESS_ERR);
            }
            if (flag.synchronous && flag.timeout) {
                throw new DOMException(DOMException.INVALID_ACCESS_ERR);
            }
            flag.method = method;
            var urlObj;
            try {
                urlObj = new URL(uri, documentBaseURLSerialized(this._ownerDocument));
            }
            catch (e) {
                throw new DOMException(DOMException.SYNTAX_ERR);
            }
            if (user || (password && !urlObj.username)) {
                flag.auth = {
                    user: user,
                    pass: password
                };
                urlObj.username = "";
                urlObj.password = "";
            }
            flag.uri = urlObj.href;
            flag.requestHeaders = {};
            flag.preflight = false;
            properties.send = false;
            properties.requestBuffer = null;
            properties.requestCache = null;
            properties.abortError = false;
            properties.responseURL = "";
            readyStateChange(this, XMLHttpRequest.OPENED);
        };
        XMLHttpRequest.prototype.overrideMimeType = function (mime) {
            var readyState = this.readyState;
            if (readyState === XMLHttpRequest.LOADING || readyState === XMLHttpRequest.DONE) {
                throw new DOMException(DOMException.INVALID_STATE_ERR);
            }
            if (!mime) {
                throw new DOMException(DOMException.SYNTAX_ERR);
            }
            mime = String(mime);
            if (!parseContentType(mime)) {
                throw new DOMException(DOMException.SYNTAX_ERR);
            }
            this[xhrSymbols.flag].mimeType = mime;
        };
        XMLHttpRequest.prototype.send = function (body) {
            var _this = this;
            if (!this._ownerDocument) {
                throw new DOMException(DOMException.INVALID_STATE_ERR);
            }
            var flag = this[xhrSymbols.flag];
            var properties = this[xhrSymbols.properties];
            if (this.readyState !== XMLHttpRequest.OPENED || properties.send) {
                throw new DOMException(DOMException.INVALID_STATE_ERR);
            }
            properties.beforeSend = true;
            try {
                if (!flag.body &&
                    body !== undefined &&
                    body !== null &&
                    body !== "" &&
                    !(flag.method === "HEAD" || flag.method === "GET")) {
                    var contentType = null;
                    var encoding = null;
                    if (body instanceof FormData) {
                        flag.formData = true;
                        var formData = [];
                        for (var _i = 0, _a = idlUtils.implForWrapper(body)._entries; _i < _a.length; _i++) {
                            var entry = _a[_i];
                            var val = void 0;
                            if (entry.value instanceof Blob) {
                                var blob = entry.value;
                                val = {
                                    name: entry.name,
                                    value: blob[blobSymbols.buffer],
                                    options: {
                                        filename: blob.name,
                                        contentType: blob.type,
                                        knownLength: blob.size
                                    }
                                };
                            }
                            else {
                                val = entry;
                            }
                            formData.push(val);
                        }
                        flag.body = formData;
                    }
                    else if (body instanceof Blob) {
                        flag.body = body[blobSymbols.buffer];
                        if (body[blobSymbols.type] !== "") {
                            contentType = body[blobSymbols.type];
                        }
                    }
                    else if (body instanceof ArrayBuffer) {
                        flag.body = new Buffer(new Uint8Array(body));
                    }
                    else if (body instanceof Document.interface) {
                        if (body.childNodes.length === 0) {
                            throw new DOMException(DOMException.INVALID_STATE_ERR);
                        }
                        flag.body = domToHtml([body]);
                        encoding = "UTF-8";
                        var documentBodyParsingMode = idlUtils.implForWrapper(body)._parsingMode;
                        contentType = documentBodyParsingMode === "html" ? "text/html" : "application/xml";
                        contentType += ";charset=UTF-8";
                    }
                    else if (typeof body !== "string") {
                        flag.body = String(body);
                    }
                    else {
                        flag.body = body;
                        contentType = "text/plain;charset=UTF-8";
                        encoding = "UTF-8";
                    }
                    var existingContentType = xhrUtils.getRequestHeader(flag.requestHeaders, "content-type");
                    if (contentType !== null && existingContentType === null) {
                        flag.requestHeaders["Content-Type"] = contentType;
                    }
                    else if (existingContentType !== null && encoding !== null) {
                        var parsed = parseContentType(existingContentType);
                        if (parsed) {
                            parsed.parameterList
                                .filter(function (v) { return v.key && v.key.toLowerCase() === "charset" &&
                                whatwgEncoding.labelToName(v.value) !== "UTF-8"; })
                                .forEach(function (v) {
                                v.value = "UTF-8";
                            });
                            xhrUtils.updateRequestHeader(flag.requestHeaders, "content-type", parsed.toString());
                        }
                    }
                }
            }
            finally {
                if (properties.beforeSend) {
                    properties.beforeSend = false;
                }
                else {
                    throw new DOMException(DOMException.INVALID_STATE_ERR);
                }
            }
            if (flag.synchronous) {
                var flagStr = JSON.stringify(flag, function (k, v) {
                    if (this === flag && k === "requestManager") {
                        return null;
                    }
                    if (this === flag && k === "pool" && v) {
                        return { maxSockets: v.maxSockets };
                    }
                    return v;
                });
                var res = spawnSync(process.execPath, [syncWorkerFile], { input: flagStr });
                if (res.status !== 0) {
                    throw new Error(res.stderr.toString());
                }
                if (res.error) {
                    if (typeof res.error === "string") {
                        res.error = new Error(res.error);
                    }
                    throw res.error;
                }
                var response = JSON.parse(res.stdout.toString(), function (k, v) {
                    if (k === "responseBuffer" && v && v.data) {
                        return new Buffer(v.data);
                    }
                    if (k === "cookieJar" && v) {
                        return tough.CookieJar.deserializeSync(v, _this._ownerDocument._cookieJar.store);
                    }
                    return v;
                });
                response.properties.readyState = XMLHttpRequest.LOADING;
                this[xhrSymbols.properties] = response.properties;
                if (response.properties.error) {
                    dispatchError(this);
                    throw new DOMException(DOMException.NETWORK_ERR, response.properties.error);
                }
                else {
                    var responseBuffer = this[xhrSymbols.properties].responseBuffer;
                    var contentLength = getResponseHeader(this, "content-length") || "0";
                    var bufferLength = parseInt(contentLength) || responseBuffer.length;
                    var progressObj = { lengthComputable: false };
                    if (bufferLength !== 0) {
                        progressObj.total = bufferLength;
                        progressObj.loaded = bufferLength;
                        progressObj.lengthComputable = true;
                    }
                    this.dispatchEvent(new ProgressEvent("progress", progressObj));
                    readyStateChange(this, XMLHttpRequest.DONE);
                    this.dispatchEvent(new ProgressEvent("load", progressObj));
                    this.dispatchEvent(new ProgressEvent("loadend", progressObj));
                }
            }
            else {
                properties.send = true;
                this.dispatchEvent(new ProgressEvent("loadstart"));
                var client_5 = xhrUtils.createClient(this);
                properties.client = client_5;
                properties.origin = flag.origin;
                client_5.on("error", function (err) {
                    client_5.removeAllListeners();
                    properties.error = err;
                    dispatchError(_this);
                });
                client_5.on("response", function (res) { return receiveResponse(_this, res); });
                client_5.on("redirect", function () {
                    if (flag.preflight) {
                        properties.error = "Redirect after preflight forbidden";
                        dispatchError(_this);
                        client_5.abort();
                        return;
                    }
                    var response = client_5.response;
                    var destUrlObj = new URL(response.request.headers.Referer);
                    var urlObj = new URL(response.request.uri.href);
                    if (destUrlObj.origin !== urlObj.origin && destUrlObj.origin !== flag.origin) {
                        properties.origin = "null";
                    }
                    response.request.headers.Origin = properties.origin;
                    if (flag.origin !== destUrlObj.origin &&
                        destUrlObj.protocol !== "data:") {
                        if (!validCORSHeaders(_this, response, flag, properties, flag.origin)) {
                            return;
                        }
                        if (urlObj.username || urlObj.password || response.request.uri.href.match(/^https?:\/\/:@/)) {
                            properties.error = "Userinfo forbidden in cors redirect";
                            dispatchError(_this);
                            return;
                        }
                    }
                });
                if (body !== undefined &&
                    body !== null &&
                    body !== "" &&
                    !(flag.method === "HEAD" || flag.method === "GET")) {
                    properties.uploadComplete = false;
                    setDispatchProgressEvents(this);
                }
                else {
                    properties.uploadComplete = true;
                }
                if (this.timeout > 0) {
                    properties.timeoutStart = (new Date()).getTime();
                    properties.timeoutFn = function () {
                        client_5.abort();
                        if (!(_this.readyState === XMLHttpRequest.UNSENT ||
                            (_this.readyState === XMLHttpRequest.OPENED && !properties.send) ||
                            _this.readyState === XMLHttpRequest.DONE)) {
                            properties.send = false;
                            var stateChanged = false;
                            if (!(flag.method === "HEAD" || flag.method === "GET")) {
                                _this.upload.dispatchEvent(new ProgressEvent("progress"));
                                readyStateChange(_this, XMLHttpRequest.DONE);
                                _this.upload.dispatchEvent(new ProgressEvent("timeout"));
                                _this.upload.dispatchEvent(new ProgressEvent("loadend"));
                                stateChanged = true;
                            }
                            _this.dispatchEvent(new ProgressEvent("progress"));
                            if (!stateChanged) {
                                readyStateChange(_this, XMLHttpRequest.DONE);
                            }
                            _this.dispatchEvent(new ProgressEvent("timeout"));
                            _this.dispatchEvent(new ProgressEvent("loadend"));
                        }
                        properties.readyState = XMLHttpRequest.UNSENT;
                    };
                    properties.timeoutId = setTimeout(properties.timeoutFn, this.timeout);
                }
            }
            flag.body = undefined;
            flag.formData = false;
        };
        XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
            var flag = this[xhrSymbols.flag];
            var properties = this[xhrSymbols.properties];
            if (arguments.length !== 2) {
                throw new TypeError("2 arguments required for setRequestHeader");
            }
            header = toByteString(header);
            value = toByteString(value);
            if (this.readyState !== XMLHttpRequest.OPENED || properties.send) {
                throw new DOMException(DOMException.INVALID_STATE_ERR);
            }
            value = normalizeHeaderValue(value);
            if (!tokenRegexp.test(header) || !fieldValueRegexp.test(value)) {
                throw new DOMException(DOMException.SYNTAX_ERR);
            }
            var lcHeader = header.toLowerCase();
            if (forbiddenRequestHeaders.has(lcHeader) || lcHeader.startsWith("sec-") || lcHeader.startsWith("proxy-")) {
                return;
            }
            var keys = Object.keys(flag.requestHeaders);
            var n = keys.length;
            while (n--) {
                var key = keys[n];
                if (key.toLowerCase() === lcHeader) {
                    flag.requestHeaders[key] += "," + value;
                    return;
                }
            }
            flag.requestHeaders[lcHeader] = value;
        };
        XMLHttpRequest.prototype.toString = function () {
            return "[object XMLHttpRequest]";
        };
        Object.defineProperty(XMLHttpRequest.prototype, "_ownerDocument", {
            get: function () {
                return idlUtils.implForWrapper(window.document);
            },
            enumerable: true,
            configurable: true
        });
        return XMLHttpRequest;
    }(XMLHttpRequestEventTarget));
    addConstants(XMLHttpRequest, {
        UNSENT: 0,
        OPENED: 1,
        HEADERS_RECEIVED: 2,
        LOADING: 3,
        DONE: 4
    });
    function readyStateChange(xhr, readyState) {
        var properties = xhr[xhrSymbols.properties];
        if (properties.readyState === readyState) {
            return;
        }
        properties.readyState = readyState;
        var readyStateChangeEvent = new Event("readystatechange");
        xhr.dispatchEvent(readyStateChangeEvent);
    }
    function receiveResponse(xhr, response) {
        var properties = xhr[xhrSymbols.properties];
        var flag = xhr[xhrSymbols.flag];
        var statusCode = response.statusCode;
        if (flag.preflight && redirectStatuses.has(statusCode)) {
            properties.error = "Redirect after preflight forbidden";
            dispatchError(this);
            return;
        }
        var byteOffset = 0;
        var headers = {};
        var filteredResponseHeaders = [];
        var headerMap = {};
        var rawHeaders = response.rawHeaders;
        var n = Number(rawHeaders.length);
        for (var i = 0; i < n; i += 2) {
            var k = rawHeaders[i];
            var kl = k.toLowerCase();
            var v = rawHeaders[i + 1];
            if (uniqueResponseHeaders.has(kl)) {
                if (headerMap[kl] !== undefined) {
                    delete headers[headerMap[kl]];
                }
                headers[k] = v;
            }
            else if (headerMap[kl] !== undefined) {
                headers[headerMap[kl]] += ", " + v;
            }
            else {
                headers[k] = v;
            }
            headerMap[kl] = k;
        }
        var destUrlObj = new URL(response.request.uri.href);
        if (properties.origin !== destUrlObj.origin &&
            destUrlObj.protocol !== "data:") {
            if (!validCORSHeaders(xhr, response, flag, properties, properties.origin)) {
                return;
            }
            var acehStr = response.headers["access-control-expose-headers"];
            var aceh = new Set(acehStr ? acehStr.trim().toLowerCase().split(headerListSeparatorRegexp) : []);
            for (var header in headers) {
                var lcHeader = header.toLowerCase();
                if (!corsSafeResponseHeaders.has(lcHeader) && !aceh.has(lcHeader)) {
                    filteredResponseHeaders.push(header);
                }
            }
        }
        for (var header in headers) {
            var lcHeader = header.toLowerCase();
            if (forbiddenResponseHeaders.has(lcHeader)) {
                filteredResponseHeaders.push(header);
            }
        }
        properties.responseURL = destUrlObj.href;
        properties.status = statusCode;
        properties.statusText = response.statusMessage || HTTP_STATUS_CODES[statusCode] || "";
        properties.responseHeaders = headers;
        properties.filteredResponseHeaders = filteredResponseHeaders;
        var contentLength = getResponseHeader(xhr, "content-length") || "0";
        var bufferLength = parseInt(contentLength) || 0;
        var progressObj = { lengthComputable: false };
        var lastProgressReported;
        if (bufferLength !== 0) {
            progressObj.total = bufferLength;
            progressObj.loaded = 0;
            progressObj.lengthComputable = true;
        }
        properties.responseBuffer = new Buffer(0);
        properties.responseCache = null;
        properties.responseTextCache = null;
        properties.responseXMLCache = null;
        readyStateChange(xhr, XMLHttpRequest.HEADERS_RECEIVED);
        // Can't use the client since the client gets the post-ungzipping bytes (which can be greater than the
        // Content-Length).
        response.on("data", function (chunk) {
            byteOffset += chunk.length;
            progressObj.loaded = byteOffset;
        });
        properties.client.on("data", function (chunk) {
            properties.responseBuffer = Buffer.concat([properties.responseBuffer, chunk]);
            properties.responseCache = null;
            properties.responseTextCache = null;
            properties.responseXMLCache = null;
            if (properties.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
                properties.readyState = XMLHttpRequest.LOADING;
            }
            xhr.dispatchEvent(new Event("readystatechange"));
            if (progressObj.total !== progressObj.loaded || properties.responseBuffer.length === byteOffset) {
                if (lastProgressReported !== progressObj.loaded) {
                    // This is a necessary check in the gzip case where we can be getting new data from the client, as it
                    // un-gzips, but no new data has been gotten from the response, so we should not fire a progress event.
                    lastProgressReported = progressObj.loaded;
                    xhr.dispatchEvent(new ProgressEvent("progress", progressObj));
                }
            }
        });
        properties.client.on("end", function () {
            clearTimeout(properties.timeoutId);
            properties.timeoutFn = null;
            properties.timeoutStart = 0;
            properties.client = null;
            xhr.dispatchEvent(new ProgressEvent("progress", progressObj));
            readyStateChange(xhr, XMLHttpRequest.DONE);
            xhr.dispatchEvent(new ProgressEvent("load", progressObj));
            xhr.dispatchEvent(new ProgressEvent("loadend", progressObj));
        });
    }
    function setDispatchProgressEvents(xhr) {
        var properties = xhr[xhrSymbols.properties];
        var client = properties.client;
        var upload = xhr.upload;
        var total = 0;
        var lengthComputable = false;
        var length = client.headers && parseInt(xhrUtils.getRequestHeader(client.headers, "content-length"));
        if (length) {
            total = length;
            lengthComputable = true;
        }
        var initProgress = {
            lengthComputable: lengthComputable,
            total: total,
            loaded: 0
        };
        upload.dispatchEvent(new ProgressEvent("loadstart", initProgress));
        client.on("request", function (req) {
            req.on("response", function () {
                properties.uploadComplete = true;
                var progress = {
                    lengthComputable: lengthComputable,
                    total: total,
                    loaded: total
                };
                upload.dispatchEvent(new ProgressEvent("progress", progress));
                upload.dispatchEvent(new ProgressEvent("load", progress));
                upload.dispatchEvent(new ProgressEvent("loadend", progress));
            });
        });
    }
    function dispatchError(xhr) {
        var properties = xhr[xhrSymbols.properties];
        readyStateChange(xhr, XMLHttpRequest.DONE);
        if (!properties.uploadComplete) {
            xhr.upload.dispatchEvent(new ProgressEvent("error"));
            xhr.upload.dispatchEvent(new ProgressEvent("loadend"));
        }
        xhr.dispatchEvent(new ProgressEvent("error"));
        xhr.dispatchEvent(new ProgressEvent("loadend"));
        if (xhr._ownerDocument) {
            var error = new Error(properties.error);
            error.type = "XMLHttpRequest";
            xhr._ownerDocument._defaultView._virtualConsole.emit("jsdomError", error);
        }
    }
    function validCORSHeaders(xhr, response, flag, properties, origin) {
        var acaoStr = response.headers["access-control-allow-origin"];
        var acao = acaoStr ? acaoStr.trim() : null;
        if (acao !== "*" && acao !== origin) {
            properties.error = "Cross origin " + origin + " forbidden";
            dispatchError(xhr);
            return false;
        }
        var acacStr = response.headers["access-control-allow-credentials"];
        var acac = acacStr ? acacStr.trim() : null;
        if (flag.withCredentials && acac !== "true") {
            properties.error = "Credentials forbidden";
            dispatchError(xhr);
            return false;
        }
        var acahStr = response.headers["access-control-allow-headers"];
        var acah = new Set(acahStr ? acahStr.trim().toLowerCase().split(headerListSeparatorRegexp) : []);
        var forbiddenHeaders = Object.keys(flag.requestHeaders).filter(function (header) {
            var lcHeader = header.toLowerCase();
            return !simpleHeaders.has(lcHeader) && !acah.has(lcHeader);
        });
        if (forbiddenHeaders.length > 0) {
            properties.error = "Headers " + forbiddenHeaders + " forbidden";
            dispatchError(xhr);
            return false;
        }
        return true;
    }
    function toByteString(value) {
        value = String(value);
        if (!/^[\0-\xFF]*$/.test(value)) {
            throw new TypeError("invalid ByteString");
        }
        return value;
    }
    function getContentType(xhr) {
        var flag = xhr[xhrSymbols.flag];
        return parseContentType(flag.mimeType || getResponseHeader(xhr, "content-type"));
    }
    function getResponseHeader(xhr, lcHeader) {
        var properties = xhr[xhrSymbols.properties];
        var keys = Object.keys(properties.responseHeaders);
        var n = keys.length;
        while (n--) {
            var key = keys[n];
            if (key.toLowerCase() === lcHeader) {
                return properties.responseHeaders[key];
            }
        }
        return null;
    }
    function normalizeHeaderValue(value) {
        return value.replace(/^[\x09\x0A\x0D\x20]+/, "").replace(/[\x09\x0A\x0D\x20]+$/, "");
    }
    return XMLHttpRequest;
};
"use strict";
var util = require("util");
var ErrorEvent = require("../generated/ErrorEvent");
var errorReportingMode = Symbol("error reporting mode");
// https://html.spec.whatwg.org/multipage/webappapis.html#report-the-error
// Omits script parameter and any check for muted errors; takes error object, message, and location as params, unlike
// the spec. Returns whether the event was handled or not.
function reportAnError(line, col, target, errorObject, message, location) {
    if (target[errorReportingMode]) {
        return false;
    }
    target[errorReportingMode] = true;
    // TODO Events: use constructor directly, once they are no longer tied to a window.
    var event = ErrorEvent.createImpl(["error", {
            bubbles: false,
            cancelable: true,
            message: message,
            filename: location,
            lineno: line,
            colno: col,
            error: errorObject
        }]);
    try {
        target.dispatchEvent(event);
    }
    finally {
        target[errorReportingMode] = false;
        return event.defaultPrevented;
    }
}
module.exports = function reportException(window, error, filenameHint) {
    // This function will give good results on real Error objects with stacks; poor ones otherwise
    var stack = error && error.stack;
    var lines = stack && stack.split("\n");
    // Find the first line that matches; important for multi-line messages
    var pieces;
    if (lines) {
        for (var i = 1; i < lines.length && !pieces; ++i) {
            pieces = lines[i].match(/at (?:(.+)\s+)?\(?(?:(.+?):(\d+):(\d+)|([^)]+))\)?/);
        }
    }
    var fileName = pieces && pieces[2] || filenameHint || window._document.URL;
    var lineNumber = pieces && parseInt(pieces[3]) || 0;
    var columnNumber = pieces && parseInt(pieces[4]) || 0;
    var handled = reportAnError(lineNumber, columnNumber, window, error, error.message, fileName);
    if (!handled) {
        var errorString = shouldBeDisplayedAsError(error) ? "[" + error.name + ": " + error.message + "]" : util.inspect(error);
        var jsdomError = new Error("Uncaught " + errorString);
        jsdomError.detail = error;
        jsdomError.type = "unhandled exception";
        window._virtualConsole.emit("jsdomError", jsdomError);
    }
};
function shouldBeDisplayedAsError(x) {
    return x.name && x.message !== undefined && x.stack;
}
"use strict";
var EventInit = require("../generated/EventInit");
var EventImpl = (function () {
    function EventImpl(args, privateData) {
        var type = args[0]; // TODO: Replace with destructuring
        var eventInitDict = args[1] || EventInit.convert(undefined);
        this.type = type;
        var wrapper = privateData.wrapper;
        for (var key in eventInitDict) {
            if (key in wrapper) {
                this[key] = eventInitDict[key];
            }
        }
        this.target = null;
        this.currentTarget = null;
        this.eventPhase = 0;
        this._initializedFlag = true;
        this._stopPropagationFlag = false;
        this._stopImmediatePropagationFlag = false;
        this._canceledFlag = false;
        this._dispatchFlag = false;
        this.isTrusted = privateData.isTrusted || false;
        this.timeStamp = Date.now();
    }
    Object.defineProperty(EventImpl.prototype, "defaultPrevented", {
        get: function () {
            return this._canceledFlag;
        },
        enumerable: true,
        configurable: true
    });
    EventImpl.prototype.stopPropagation = function () {
        this._stopPropagationFlag = true;
    };
    Object.defineProperty(EventImpl.prototype, "cancelBubble", {
        get: function () {
            return this._stopPropagationFlag;
        },
        set: function (v) {
            if (v) {
                this._stopPropagationFlag = true;
            }
        },
        enumerable: true,
        configurable: true
    });
    EventImpl.prototype.stopImmediatePropagation = function () {
        this._stopPropagationFlag = true;
        this._stopImmediatePropagation = true;
    };
    EventImpl.prototype.preventDefault = function () {
        if (this.cancelable) {
            this._canceledFlag = true;
        }
    };
    EventImpl.prototype._initialize = function (type, bubbles, cancelable) {
        this.type = type;
        this._initializedFlag = true;
        this._stopPropagationFlag = false;
        this._stopImmediatePropagationFlag = false;
        this._canceledFlag = false;
        this.isTrusted = false;
        this.target = null;
        this.bubbles = bubbles;
        this.cancelable = cancelable;
    };
    EventImpl.prototype.initEvent = function (type, bubbles, cancelable) {
        if (this._dispatchFlag) {
            return;
        }
        this._initialize(type, bubbles, cancelable);
    };
    return EventImpl;
}());
module.exports = {
    implementation: EventImpl
};
"use strict";
var DOMException = require("../../web-idl/DOMException");
var reportException = require("../helpers/runtime-script-errors");
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var idlUtils = require("../generated/utils");
var EventImpl = require("./Event-impl").implementation;
var Event = require("../generated/Event").interface;
var EventTargetImpl = (function () {
    function EventTargetImpl() {
        this._eventListeners = Object.create(null);
    }
    EventTargetImpl.prototype.addEventListener = function (type, callback, options) {
        // webidl2js currently can't handle neither optional arguments nor callback interfaces
        if (callback === undefined || callback === null) {
            callback = null;
        }
        else if (typeof callback !== "object" && typeof callback !== "function") {
            throw new TypeError("Only undefined, null, an object, or a function are allowed for the callback parameter");
        }
        options = normalizeEventHandlerOptions(options, ["capture", "once"]);
        if (callback === null) {
            return;
        }
        if (!this._eventListeners[type]) {
            this._eventListeners[type] = [];
        }
        for (var i = 0; i < this._eventListeners[type].length; ++i) {
            var listener = this._eventListeners[type][i];
            if (listener.options.capture === options.capture && listener.callback === callback) {
                return;
            }
        }
        this._eventListeners[type].push({
            callback: callback,
            options: options
        });
    };
    EventTargetImpl.prototype.removeEventListener = function (type, callback, options) {
        if (callback === undefined || callback === null) {
            callback = null;
        }
        else if (typeof callback !== "object" && typeof callback !== "function") {
            throw new TypeError("Only undefined, null, an object, or a function are allowed for the callback parameter");
        }
        options = normalizeEventHandlerOptions(options, ["capture"]);
        if (callback === null) {
            // Optimization, not in the spec.
            return;
        }
        if (!this._eventListeners[type]) {
            return;
        }
        for (var i = 0; i < this._eventListeners[type].length; ++i) {
            var listener = this._eventListeners[type][i];
            if (listener.callback === callback && listener.options.capture === options.capture) {
                this._eventListeners[type].splice(i, 1);
                break;
            }
        }
    };
    EventTargetImpl.prototype.dispatchEvent = function (eventImpl) {
        if (!(eventImpl instanceof EventImpl)) {
            throw new TypeError("Argument to dispatchEvent must be an Event");
        }
        if (eventImpl._dispatchFlag || !eventImpl._initializedFlag) {
            throw new DOMException(DOMException.INVALID_STATE_ERR, "Tried to dispatch an uninitialized event");
        }
        if (eventImpl.eventPhase !== Event.NONE) {
            throw new DOMException(DOMException.INVALID_STATE_ERR, "Tried to dispatch a dispatching event");
        }
        eventImpl.isTrusted = false;
        return this._dispatch(eventImpl);
    };
    EventTargetImpl.prototype._dispatch = function (eventImpl, targetOverride) {
        eventImpl._dispatchFlag = true;
        eventImpl.target = targetOverride || this;
        var eventPath = [];
        var targetParent = domSymbolTree.parent(eventImpl.target);
        var target = eventImpl.target;
        while (targetParent) {
            eventPath.push(targetParent);
            target = targetParent;
            targetParent = domSymbolTree.parent(targetParent);
        }
        if (eventImpl.type !== "load" && target._defaultView) {
            // https://html.spec.whatwg.org/#events-and-the-window-object
            eventPath.push(idlUtils.implForWrapper(target._defaultView));
        }
        eventImpl.eventPhase = Event.CAPTURING_PHASE;
        for (var i = eventPath.length - 1; i >= 0; --i) {
            if (eventImpl._stopPropagationFlag) {
                break;
            }
            var object = eventPath[i];
            var objectImpl = idlUtils.implForWrapper(object) || object; // window :(
            var eventListeners = objectImpl._eventListeners[eventImpl.type];
            invokeEventListeners(eventListeners, object, eventImpl);
        }
        eventImpl.eventPhase = Event.AT_TARGET;
        if (!eventImpl._stopPropagationFlag) {
            invokeInlineListeners(eventImpl.target, eventImpl);
            if (this._eventListeners[eventImpl.type]) {
                var eventListeners = this._eventListeners[eventImpl.type];
                invokeEventListeners(eventListeners, eventImpl.target, eventImpl);
            }
        }
        if (eventImpl.bubbles) {
            eventImpl.eventPhase = Event.BUBBLING_PHASE;
            for (var i = 0; i < eventPath.length; ++i) {
                if (eventImpl._stopPropagationFlag) {
                    break;
                }
                var object = eventPath[i];
                var objectImpl = idlUtils.implForWrapper(object) || object; // window :(
                var eventListeners = objectImpl._eventListeners[eventImpl.type];
                invokeInlineListeners(object, eventImpl);
                invokeEventListeners(eventListeners, object, eventImpl);
            }
        }
        eventImpl._dispatchFlag = false;
        eventImpl._stopPropagationFlag = false;
        eventImpl._stopImmediatePropagationFlag = false;
        eventImpl.eventPhase = Event.NONE;
        eventImpl.currentTarget = null;
        return !eventImpl._canceledFlag;
    };
    return EventTargetImpl;
}());
module.exports = {
    implementation: EventTargetImpl
};
function invokeInlineListeners(object, event) {
    var wrapper = idlUtils.wrapperForImpl(object);
    var inlineListener = getListenerForInlineEventHandler(wrapper, event.type);
    if (inlineListener) {
        var document_1 = object._ownerDocument || (wrapper && (wrapper._document || wrapper._ownerDocument));
        // Will be falsy for windows that have closed
        if (document_1 && (!object.nodeName || document_1.implementation._hasFeature("ProcessExternalResources", "script"))) {
            invokeEventListeners([{
                    callback: inlineListener,
                    options: normalizeEventHandlerOptions(false, ["capture", "once"])
                }], object, event);
        }
    }
}
function invokeEventListeners(listeners, target, eventImpl) {
    var wrapper = idlUtils.wrapperForImpl(target);
    var document = target._ownerDocument || (wrapper && (wrapper._document || wrapper._ownerDocument));
    // Will be falsy for windows that have closed
    if (!document) {
        return;
    }
    // workaround for events emitted on window (window-proxy)
    // the wrapper is the root window instance, but we only want to expose the vm proxy at all times
    if (wrapper._document) {
        target = idlUtils.implForWrapper(wrapper._document)._defaultView;
    }
    eventImpl.currentTarget = target;
    if (!listeners) {
        return;
    }
    var handlers = listeners.slice();
    for (var i = 0; i < handlers.length; ++i) {
        if (eventImpl._stopImmediatePropagationFlag) {
            return;
        }
        var listener = handlers[i];
        var capture = listener.options.capture;
        var once = listener.options.once;
        // const passive = listener.options.passive;
        if (listeners.indexOf(listener) === -1 ||
            (eventImpl.eventPhase === Event.CAPTURING_PHASE && !capture) ||
            (eventImpl.eventPhase === Event.BUBBLING_PHASE && capture)) {
            continue;
        }
        if (once) {
            listeners.splice(listeners.indexOf(listener), 1);
        }
        try {
            if (typeof listener.callback === "object") {
                if (typeof listener.callback.handleEvent === "function") {
                    listener.callback.handleEvent(idlUtils.wrapperForImpl(eventImpl));
                }
            }
            else {
                listener.callback.call(idlUtils.wrapperForImpl(eventImpl.currentTarget), idlUtils.wrapperForImpl(eventImpl));
            }
        }
        catch (e) {
            var window_1 = null;
            if (wrapper && wrapper._document) {
                // Triggered by Window
                window_1 = wrapper;
            }
            else if (target._ownerDocument) {
                // Triggered by most webidl2js'ed instances
                window_1 = target._ownerDocument._defaultView;
            }
            else if (wrapper._ownerDocument) {
                // Currently triggered by XHR and some other non-webidl2js things
                window_1 = wrapper._ownerDocument._defaultView;
            }
            if (window_1) {
                reportException(window_1, e);
            }
        }
    }
}
var wrappedListener = Symbol("inline event listener wrapper");
/**
 * Normalize the event listeners options argument in order to get always a valid options object
 * @param   {Object} options         - user defined options
 * @param   {Array} defaultBoolKeys  - boolean properties that should belong to the options object
 * @returns {Object} object containing at least the "defaultBoolKeys"
 */
function normalizeEventHandlerOptions(options, defaultBoolKeys) {
    var returnValue = {};
    // no need to go further here
    if (typeof options === "boolean" || options === null || typeof options === "undefined") {
        returnValue.capture = Boolean(options);
        return returnValue;
    }
    // non objects options so we typecast its value as "capture" value
    if (typeof options !== "object") {
        returnValue.capture = Boolean(options);
        // at this point we don't need to loop the "capture" key anymore
        defaultBoolKeys = defaultBoolKeys.filter(function (k) { return k !== "capture"; });
    }
    for (var _i = 0, defaultBoolKeys_1 = defaultBoolKeys; _i < defaultBoolKeys_1.length; _i++) {
        var key = defaultBoolKeys_1[_i];
        returnValue[key] = Boolean(options[key]);
    }
    return returnValue;
}
function getListenerForInlineEventHandler(target, type) {
    var callback = target["on" + type];
    if (!callback) {
        return null;
    }
    if (!callback[wrappedListener]) {
        // https://html.spec.whatwg.org/multipage/webappapis.html#the-event-handler-processing-algorithm
        callback[wrappedListener] = function (E) {
            var isWindowError = E.constructor.name === "ErrorEvent" && type === "error"; // TODO branding
            var returnValue;
            if (isWindowError) {
                returnValue = callback.call(E.currentTarget, E.message, E.filename, E.lineno, E.colno, E.error);
            }
            else {
                returnValue = callback.call(E.currentTarget, E);
            }
            if (type === "mouseover" || isWindowError) {
                if (returnValue === true) {
                    E.preventDefault();
                }
            }
            else if (returnValue === false) {
                E.preventDefault();
            }
        };
    }
    return callback[wrappedListener];
}
"use strict";
module.exports = Object.freeze({
    DOCUMENT_POSITION_DISCONNECTED: 1,
    DOCUMENT_POSITION_PRECEDING: 2,
    DOCUMENT_POSITION_FOLLOWING: 4,
    DOCUMENT_POSITION_CONTAINS: 8,
    DOCUMENT_POSITION_CONTAINED_BY: 16,
    DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32
});
"use strict";
var lengthFromProperties = require("../utils").lengthFromProperties;
var idlUtils = require("./generated/utils");
var privates = Symbol("NodeList internal slots");
var NodeList = (function () {
    function NodeList(secret, config) {
        if (secret !== privates) {
            throw new TypeError("Invalid constructor");
        }
        if (config.nodes) {
            this[privates] = {
                isLive: false,
                length: config.nodes.length
            };
            for (var i = 0; i < config.nodes.length; ++i) {
                this[i] = config.nodes[i];
            }
        }
        else {
            this[privates] = {
                isLive: true,
                element: config.element,
                query: config.query,
                snapshot: undefined,
                length: 0,
                version: -1
            };
            updateNodeList(this);
        }
    }
    Object.defineProperty(NodeList.prototype, "length", {
        get: function () {
            updateNodeList(this);
            return this[privates].length;
        },
        enumerable: true,
        configurable: true
    });
    NodeList.prototype.item = function (index) {
        updateNodeList(this);
        return this[index] || null;
    };
    // TODO reimplement this in webidl2js so these become more per-spec
    NodeList.prototype.keys = function* () {
        updateNodeList(this);
        var length = this[privates].length;
        for (var i = 0; i < length; ++i) {
            yield i;
        }
    };
    NodeList.prototype.entries = function* () {
        updateNodeList(this);
        var length = this[privates].length;
        for (var i = 0; i < length; ++i) {
            yield [i, this[i]];
        }
    };
    NodeList.prototype.forEach = function (callback) {
        var thisArg = arguments[1]; // TODO Node v6: use default arguments
        var values = Array.from(this);
        var i = 0;
        while (i < values.length) {
            callback.call(thisArg, values[i], i, this);
            values = Array.from(this);
            ++i;
        }
    };
    return NodeList;
}());
NodeList.prototype[Symbol.iterator] = NodeList.prototype.values = Array.prototype[Symbol.iterator];
function updateNodeList(nodeList) {
    if (nodeList[privates].isLive) {
        if (nodeList[privates].version < nodeList[privates].element._version) {
            nodeList[privates].snapshot = nodeList[privates].query();
            resetNodeListTo(nodeList, nodeList[privates].snapshot);
            nodeList[privates].version = nodeList[privates].element._version;
        }
    }
    else {
        nodeList[privates].length = lengthFromProperties(nodeList);
    }
}
function resetNodeListTo(nodeList, nodes) {
    var startingLength = lengthFromProperties(nodeList);
    for (var i = 0; i < startingLength; ++i) {
        delete nodeList[i];
    }
    for (var i = 0; i < nodes.length; ++i) {
        var wrapper = idlUtils.wrapperForImpl(nodes[i]);
        nodeList[i] = wrapper ? wrapper : nodes[i];
    }
    nodeList[privates].length = nodes.length;
}
module.exports = function (core) {
    core.NodeList = NodeList;
};
module.exports.createLive = function (element, query) {
    return new NodeList(privates, { element: element, query: query });
};
module.exports.createStatic = function (nodes) {
    return new NodeList(privates, { nodes: nodes });
};
module.exports.update = updateNodeList;
"use strict";
module.exports = function orderedSetParser(input) {
    return new Set(input.split(/[\t\n\f\r ]+/).filter(Boolean));
};
"use strict";
var DOMException = require("../web-idl/DOMException");
var orderedSetParser = require("./helpers/ordered-set-parser");
// https://dom.spec.whatwg.org/#domtokenlist
var INTERNAL = Symbol("DOMTokenList internal");
var DOMTokenList = (function () {
    function DOMTokenList() {
        throw new TypeError("Illegal constructor");
    }
    DOMTokenList.prototype.item = function (index) {
        var length = this.length;
        return length <= index || index < 0 ? null : this[index];
    };
    DOMTokenList.prototype.contains = function (token) {
        token = String(token);
        return indexOf(this, token) !== -1;
    };
    DOMTokenList.prototype.replace = function (token, newToken) {
        token = String(token);
        newToken = String(newToken);
        validateTokens(token, newToken);
        var tokenIndex = indexOf(this, token);
        if (tokenIndex === -1) {
            return;
        }
        var newTokenIndex = indexOf(this, newToken);
        if (newTokenIndex !== -1) {
            spliceLite(this, newTokenIndex, 1);
        }
        this[INTERNAL].tokens[tokenIndex] = newToken;
        update(this);
    };
    DOMTokenList.prototype.add = function () {
        for (var i = 0; i < arguments.length; i++) {
            var token = String(arguments[i]);
            validateTokens(token);
            if (indexOf(this, token) === -1) {
                push(this, token);
            }
        }
        update(this);
    };
    DOMTokenList.prototype.remove = function () {
        for (var i = 0; i < arguments.length; i++) {
            var token = String(arguments[i]);
            validateTokens(token);
            var index = indexOf(this, token);
            if (index !== -1) {
                spliceLite(this, index, 1);
            }
        }
        update(this);
    };
    // if force is true, this behaves like add
    // if force is false, this behaves like remove
    // if force is undefined, this behaves as one would expect toggle to
    // always returns whether classList contains token after toggling
    DOMTokenList.prototype.toggle = function (token, force) {
        token = String(token);
        force = force === undefined ? undefined : Boolean(force);
        validateTokens(token);
        var index = indexOf(this, token);
        if (index !== -1) {
            if (force === false || force === undefined) {
                spliceLite(this, index, 1);
                update(this);
                return false;
            }
            return true;
        }
        if (force === false) {
            return false;
        }
        push(this, token);
        update(this);
        return true;
    };
    Object.defineProperty(DOMTokenList.prototype, "length", {
        get: function () {
            return this[INTERNAL].tokens.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DOMTokenList.prototype, "value", {
        get: function () {
            return serialize(this);
        },
        set: function (v) {
            this[INTERNAL].element.setAttribute(this[INTERNAL].attribute, v);
        },
        enumerable: true,
        configurable: true
    });
    DOMTokenList.prototype.toString = function () {
        return serialize(this);
    };
    return DOMTokenList;
}());
function serialize(list) {
    var value = list[INTERNAL].element.getAttribute(list[INTERNAL].attribute);
    return value === null ? "" : value;
}
function validateTokens() {
    for (var i = 0; i < arguments.length; i++) {
        var token = String(arguments[i]);
        if (token === "") {
            throw new DOMException(DOMException.SYNTAX_ERR, "The token provided must not be empty.");
        }
    }
    for (var i = 0; i < arguments.length; i++) {
        var token = String(arguments[i]);
        if (/\s/.test(token)) {
            var whitespaceMsg = "The token provided contains HTML space characters, which are not valid in tokens.";
            throw new DOMException(DOMException.INVALID_CHARACTER_ERR, whitespaceMsg);
        }
    }
}
function update(list) {
    var attribute = list[INTERNAL].attribute;
    list[INTERNAL].element.setAttribute(attribute, list[INTERNAL].tokens.join(" "));
}
// calls indexOf on internal array
function indexOf(dtl, token) {
    return dtl[INTERNAL].tokens.indexOf(token);
}
// calls push on internal array, then manually adds indexed property to dtl
function push(dtl, token) {
    var len = dtl[INTERNAL].tokens.push(token);
    dtl[len - 1] = token;
    return len;
}
// calls splice on internal array then rewrites indexed properties of dtl
// does not allow items to be added, only removed, so splice-lite
function spliceLite(dtl, start, deleteCount) {
    var tokens = dtl[INTERNAL].tokens;
    var removedTokens = tokens.splice(start, deleteCount);
    // remove indexed properties from list
    var re = /^\d+$/;
    for (var prop in dtl) {
        if (re.test(prop)) {
            delete dtl[prop];
        }
    }
    // copy indexed properties from internal array
    var len = tokens.length;
    for (var i = 0; i < len; i++) {
        dtl[i] = tokens[i];
    }
    return removedTokens;
}
exports.DOMTokenList = DOMTokenList;
// set dom token list without running update steps
exports.reset = function resetDOMTokenList(list, value) {
    var tokens = list[INTERNAL].tokens;
    spliceLite(list, 0, tokens.length);
    if (value) {
        for (var _i = 0, _a = orderedSetParser(value); _i < _a.length; _i++) {
            var token = _a[_i];
            push(list, token);
        }
    }
};
exports.create = function createDOMTokenList(element, attribute) {
    var list = Object.create(DOMTokenList.prototype);
    list[INTERNAL] = {
        element: element,
        attribute: attribute,
        tokens: []
    };
    exports.reset(list, element.getAttribute(attribute));
    return list;
};
exports.contains = function domTokenListContains(list, token, options) {
    var caseInsensitive = options && options.caseInsensitive;
    if (!caseInsensitive) {
        return indexOf(list, token) !== -1;
    }
    var tokens = list[INTERNAL].tokens;
    var lowerToken = token.toLowerCase();
    for (var i = 0; i < tokens.length; ++i) {
        if (tokens[i].toLowerCase() === lowerToken) {
            return true;
        }
    }
    return false;
};
"use strict";
var attributes = require("./attributes");
var cloningSteps = require("./helpers/internal-constants").cloningSteps;
var domSymbolTree = require("./helpers/internal-constants").domSymbolTree;
var NODE_TYPE = require("./node-type");
var orderedSetParser = require("./helpers/ordered-set-parser");
var createHTMLCollection = require("./html-collection").create;
var domTokenListContains = require("./dom-token-list").contains;
module.exports.clone = function (core, node, document, cloneChildren) {
    if (document === undefined) {
        document = node._ownerDocument;
    }
    var copy;
    switch (node.nodeType) {
        case NODE_TYPE.DOCUMENT_NODE:
            // TODO: just use Document when we eliminate the difference between Document and HTMLDocument.
            if (node.contentType === "text/html") {
                copy = document.implementation.createHTMLDocument();
                copy.removeChild(copy.documentElement); // ;_;
            }
            else {
                copy = document.implementation.createDocument("", "", null);
            }
            document = copy;
            break;
        case NODE_TYPE.DOCUMENT_TYPE_NODE:
            copy = document.implementation.createDocumentType(node.name, node.publicId, node.systemId);
            break;
        case NODE_TYPE.ELEMENT_NODE:
            copy = document._createElementWithCorrectElementInterface(node._localName, node._namespaceURI);
            copy._namespaceURI = node._namespaceURI;
            copy._prefix = node._prefix;
            copy._localName = node._localName;
            attributes.copyAttributeList(node, copy);
            break;
        case NODE_TYPE.TEXT_NODE:
            copy = document.createTextNode(node._data);
            break;
        case NODE_TYPE.CDATA_SECTION_NODE:
            copy = document.createCDATASection(node._data);
            break;
        case NODE_TYPE.COMMENT_NODE:
            copy = document.createComment(node._data);
            break;
        case NODE_TYPE.PROCESSING_INSTRUCTION_NODE:
            copy = document.createProcessingInstruction(node.target, node._data);
            break;
        case NODE_TYPE.DOCUMENT_FRAGMENT_NODE:
            copy = document.createDocumentFragment();
            break;
    }
    if (node[cloningSteps]) {
        node[cloningSteps](copy, node, document, cloneChildren);
    }
    if (cloneChildren) {
        for (var _i = 0, _a = domSymbolTree.childrenIterator(node); _i < _a.length; _i++) {
            var child = _a[_i];
            var childCopy = module.exports.clone(core, child, document, true);
            copy.appendChild(childCopy);
        }
    }
    return copy;
};
// For the following, memoization is not applied here since the memoized results are stored on `this`.
module.exports.listOfElementsWithClassNames = function (classNames, root) {
    // https://dom.spec.whatwg.org/#concept-getElementsByClassName
    var classes = orderedSetParser(classNames);
    if (classes.size === 0) {
        return createHTMLCollection(root, function () { return []; });
    }
    return createHTMLCollection(root, function () {
        var isQuirksMode = root._ownerDocument.compatMode === "BackCompat";
        return domSymbolTree.treeToArray(root, { filter: function (node) {
                if (node.nodeType !== NODE_TYPE.ELEMENT_NODE || node === root) {
                    return false;
                }
                for (var _i = 0, classes_1 = classes; _i < classes_1.length; _i++) {
                    var className = classes_1[_i];
                    if (!domTokenListContains(node.classList, className, { caseInsensitive: isQuirksMode })) {
                        return false;
                    }
                }
                return true;
            } });
    });
};
module.exports.listOfElementsWithQualifiedName = function (qualifiedName, root) {
    // https://dom.spec.whatwg.org/#concept-getelementsbytagname
    if (qualifiedName === "*") {
        return createHTMLCollection(root, function () {
            return domSymbolTree.treeToArray(root, { filter: function (node) {
                    return node.nodeType === NODE_TYPE.ELEMENT_NODE && node !== root;
                } });
        });
    }
    if (root._ownerDocument._parsingMode === "html") {
        var lowerQualifiedName_1 = qualifiedName.toLowerCase();
        return createHTMLCollection(root, function () {
            return domSymbolTree.treeToArray(root, { filter: function (node) {
                    if (node.nodeType !== NODE_TYPE.ELEMENT_NODE || node === root) {
                        return false;
                    }
                    if (node._namespaceURI === "http://www.w3.org/1999/xhtml") {
                        return node._qualifiedName === lowerQualifiedName_1;
                    }
                    return node._qualifiedName === qualifiedName;
                } });
        });
    }
    return createHTMLCollection(root, function () {
        return domSymbolTree.treeToArray(root, { filter: function (node) {
                if (node.nodeType !== NODE_TYPE.ELEMENT_NODE || node === root) {
                    return false;
                }
                return node._qualifiedName === qualifiedName;
            } });
    });
};
module.exports.listOfElementsWithNamespaceAndLocalName = function (namespace, localName, root) {
    // https://dom.spec.whatwg.org/#concept-getelementsbytagnamens
    if (namespace === "") {
        namespace = null;
    }
    if (namespace === "*" && localName === "*") {
        return createHTMLCollection(root, function () {
            return domSymbolTree.treeToArray(root, { filter: function (node) {
                    return node.nodeType === NODE_TYPE.ELEMENT_NODE && node !== root;
                } });
        });
    }
    if (namespace === "*") {
        return createHTMLCollection(root, function () {
            return domSymbolTree.treeToArray(root, { filter: function (node) {
                    if (node.nodeType !== NODE_TYPE.ELEMENT_NODE || node === root) {
                        return false;
                    }
                    return node._localName === localName;
                } });
        });
    }
    if (localName === "*") {
        return createHTMLCollection(root, function () {
            return domSymbolTree.treeToArray(root, { filter: function (node) {
                    if (node.nodeType !== NODE_TYPE.ELEMENT_NODE || node === root) {
                        return false;
                    }
                    return node._namespaceURI === namespace;
                } });
        });
    }
    return createHTMLCollection(root, function () {
        return domSymbolTree.treeToArray(root, { filter: function (node) {
                if (node.nodeType !== NODE_TYPE.ELEMENT_NODE || node === root) {
                    return false;
                }
                return node._localName === localName && node._namespaceURI === namespace;
            } });
    });
};
"use strict";
var EventTargetImpl = require("../events/EventTarget-impl").implementation;
var idlUtils = require("../generated/utils");
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var simultaneousIterators = require("../../utils").simultaneousIterators;
var DOMException = require("../../web-idl/DOMException");
var NODE_TYPE = require("../node-type");
var NODE_DOCUMENT_POSITION = require("../node-document-position");
var createLiveNodeList = require("../node-list").createLive;
var updateNodeList = require("../node-list").update;
var updateHTMLCollection = require("../html-collection").update;
var documentBaseURLSerialized = require("../helpers/document-base-url").documentBaseURLSerialized;
var cloneNode = require("../node").clone;
var attributes = require("../attributes");
function isObsoleteNodeType(node) {
    return node.nodeType === NODE_TYPE.ENTITY_NODE ||
        node.nodeType === NODE_TYPE.ENTITY_REFERENCE_NODE ||
        node.nodeType === NODE_TYPE.NOTATION_NODE ||
        //  node.nodeType === NODE_TYPE.ATTRIBUTE_NODE ||  // this is missing how do we handle?
        node.nodeType === NODE_TYPE.CDATA_SECTION_NODE;
}
function nodeEquals(a, b) {
    if (a.nodeType !== b.nodeType) {
        return false;
    }
    switch (a.nodeType) {
        case NODE_TYPE.DOCUMENT_TYPE_NODE:
            if (a.name !== b.name || a.publicId !== b.publicId ||
                a.systemId !== b.systemId) {
                return false;
            }
            break;
        case NODE_TYPE.ELEMENT_NODE:
            if (a._namespaceURI !== b._namespaceURI || a._prefix !== b._prefix || a._localName !== b._localName ||
                a._attributes.length !== b._attributes.length) {
                return false;
            }
            break;
        case NODE_TYPE.PROCESSING_INSTRUCTION_NODE:
            if (a._target !== b._target || a._data !== b._data) {
                return false;
            }
            break;
        case NODE_TYPE.TEXT_NODE:
        case NODE_TYPE.COMMENT_NODE:
            if (a._data !== b._data) {
                return false;
            }
            break;
    }
    if (a.nodeType === NODE_TYPE.ELEMENT_NODE && !attributes.attributeListsEqual(a, b)) {
        return false;
    }
    for (var _i = 0, _a = simultaneousIterators(domSymbolTree.childrenIterator(a), domSymbolTree.childrenIterator(b)); _i < _a.length; _i++) {
        var nodes = _a[_i];
        if (!nodes[0] || !nodes[1]) {
            // mismatch in the amount of childNodes
            return false;
        }
        if (!nodeEquals(nodes[0], nodes[1])) {
            return false;
        }
    }
    return true;
}
var NodeImpl = (function (_super) {
    __extends(NodeImpl, _super);
    function NodeImpl(args, privateData) {
        var _this = _super.call(this) || this;
        domSymbolTree.initialize(_this);
        _this._core = privateData.core;
        _this._ownerDocument = privateData.ownerDocument;
        _this._childNodesList = null;
        _this._childrenList = null;
        _this._version = 0;
        _this._memoizedQueries = {};
        return _this;
    }
    Object.defineProperty(NodeImpl.prototype, "nodeValue", {
        get: function () {
            if (this.nodeType === NODE_TYPE.TEXT_NODE ||
                this.nodeType === NODE_TYPE.COMMENT_NODE ||
                this.nodeType === NODE_TYPE.CDATA_SECTION_NODE ||
                this.nodeType === NODE_TYPE.PROCESSING_INSTRUCTION_NODE) {
                return this._data;
            }
            return null;
        },
        set: function (value) {
            if (this.nodeType === NODE_TYPE.TEXT_NODE ||
                this.nodeType === NODE_TYPE.COMMENT_NODE ||
                this.nodeType === NODE_TYPE.CDATA_SECTION_NODE ||
                this.nodeType === NODE_TYPE.PROCESSING_INSTRUCTION_NODE) {
                this.replaceData(0, this.length, value);
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeImpl.prototype, "parentNode", {
        get: function () {
            return domSymbolTree.parent(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeImpl.prototype, "nodeName", {
        get: function () {
            switch (this.nodeType) {
                case NODE_TYPE.ELEMENT_NODE:
                    return this.tagName;
                case NODE_TYPE.TEXT_NODE:
                    return "#text";
                case NODE_TYPE.CDATA_SECTION_NODE:
                    return "#cdata-section";
                case NODE_TYPE.PROCESSING_INSTRUCTION_NODE:
                    return this.target;
                case NODE_TYPE.COMMENT_NODE:
                    return "#comment";
                case NODE_TYPE.DOCUMENT_NODE:
                    return "#document";
                case NODE_TYPE.DOCUMENT_TYPE_NODE:
                    return this.name;
                case NODE_TYPE.DOCUMENT_FRAGMENT_NODE:
                    return "#document-fragment";
            }
            // should never happen
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeImpl.prototype, "firstChild", {
        get: function () {
            return domSymbolTree.firstChild(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeImpl.prototype, "ownerDocument", {
        get: function () {
            return this.nodeType === NODE_TYPE.DOCUMENT_NODE ? null : this._ownerDocument;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeImpl.prototype, "lastChild", {
        get: function () {
            return domSymbolTree.lastChild(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeImpl.prototype, "childNodes", {
        get: function () {
            var _this = this;
            if (!this._childNodesList) {
                this._childNodesList = createLiveNodeList(this, function () { return domSymbolTree.childrenToArray(_this); });
            }
            else {
                updateNodeList(this._childNodesList);
            }
            return this._childNodesList;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeImpl.prototype, "nextSibling", {
        get: function () {
            return domSymbolTree.nextSibling(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeImpl.prototype, "previousSibling", {
        get: function () {
            return domSymbolTree.previousSibling(this);
        },
        enumerable: true,
        configurable: true
    });
    NodeImpl.prototype.insertBefore = function (newChildImpl, refChildImpl) {
        // TODO branding
        if (!newChildImpl || !(newChildImpl instanceof NodeImpl)) {
            throw new TypeError("First argument to Node.prototype.insertBefore must be a Node");
        }
        if (refChildImpl !== null && !(refChildImpl instanceof NodeImpl)) {
            throw new TypeError("Second argument to Node.prototype.insertBefore must be a Node or null or undefined");
        }
        // DocumentType must be implicitly adopted
        if (newChildImpl.nodeType === NODE_TYPE.DOCUMENT_TYPE_NODE) {
            newChildImpl._ownerDocument = this._ownerDocument;
        }
        if (newChildImpl.nodeType && newChildImpl.nodeType === NODE_TYPE.ATTRIBUTE_NODE) {
            throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR);
        }
        if (this._ownerDocument !== newChildImpl._ownerDocument) {
            // adopt the node when it's not in this document
            this._ownerDocument.adoptNode(newChildImpl);
        }
        else {
            // search for parents matching the newChild
            for (var _i = 0, _a = domSymbolTree.ancestorsIterator(this); _i < _a.length; _i++) {
                var ancestor = _a[_i];
                if (ancestor === newChildImpl) {
                    throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR);
                }
            }
        }
        // fragments are merged into the element (except parser-created fragments in <template>)
        if (newChildImpl.nodeType === NODE_TYPE.DOCUMENT_FRAGMENT_NODE) {
            var grandChildImpl = void 0;
            while ((grandChildImpl = domSymbolTree.firstChild(newChildImpl))) {
                newChildImpl.removeChild(grandChildImpl);
                this.insertBefore(grandChildImpl, refChildImpl);
            }
        }
        else if (newChildImpl === refChildImpl) {
            return newChildImpl;
        }
        else {
            var oldParentImpl = domSymbolTree.parent(newChildImpl);
            // if the newChild is already in the tree elsewhere, remove it first
            if (oldParentImpl) {
                oldParentImpl.removeChild(newChildImpl);
            }
            if (refChildImpl === null) {
                domSymbolTree.appendChild(this, newChildImpl);
            }
            else {
                if (domSymbolTree.parent(refChildImpl) !== this) {
                    throw new DOMException(DOMException.NOT_FOUND_ERR);
                }
                domSymbolTree.insertBefore(refChildImpl, newChildImpl);
            }
            this._modified();
            if (this._attached && newChildImpl._attach) {
                newChildImpl._attach();
            }
            this._descendantAdded(this, newChildImpl);
        }
        return newChildImpl;
    }; // raises(DOMException);
    NodeImpl.prototype._modified = function () {
        this._version++;
        for (var _i = 0, _a = domSymbolTree.ancestorsIterator(this); _i < _a.length; _i++) {
            var ancestor = _a[_i];
            ancestor._version++;
        }
        if (this._childrenList) {
            updateHTMLCollection(this._childrenList);
        }
        if (this._childNodesList) {
            updateNodeList(this._childNodesList);
        }
        this._clearMemoizedQueries();
    };
    NodeImpl.prototype._clearMemoizedQueries = function () {
        this._memoizedQueries = {};
        var myParent = domSymbolTree.parent(this);
        if (myParent) {
            myParent._clearMemoizedQueries();
        }
    };
    NodeImpl.prototype._descendantRemoved = function (parent, child) {
        var myParent = domSymbolTree.parent(this);
        if (myParent) {
            myParent._descendantRemoved(parent, child);
        }
    };
    NodeImpl.prototype._descendantAdded = function (parent, child) {
        var myParent = domSymbolTree.parent(this);
        if (myParent) {
            myParent._descendantAdded(parent, child);
        }
    };
    NodeImpl.prototype.replaceChild = function (node, child) {
        if (arguments.length < 2) {
            throw new TypeError("Not enough arguments to Node.prototype.replaceChild");
        }
        // TODO branding
        if (!node || !(node instanceof NodeImpl)) {
            throw new TypeError("First argument to Node.prototype.replaceChild must be a Node");
        }
        if (!child || !(child instanceof NodeImpl)) {
            throw new TypeError("Second argument to Node.prototype.replaceChild must be a Node");
        }
        this.insertBefore(node, child);
        return this.removeChild(child);
    };
    NodeImpl.prototype._attach = function () {
        this._attached = true;
        for (var _i = 0, _a = domSymbolTree.childrenIterator(this); _i < _a.length; _i++) {
            var child = _a[_i];
            if (child._attach) {
                child._attach();
            }
        }
    };
    NodeImpl.prototype._detach = function () {
        this._attached = false;
        if (this._ownerDocument && this._ownerDocument._lastFocusedElement === this) {
            this._ownerDocument._lastFocusedElement = null;
        }
        for (var _i = 0, _a = domSymbolTree.childrenIterator(this); _i < _a.length; _i++) {
            var child = _a[_i];
            if (child._detach) {
                child._detach();
            }
        }
    };
    NodeImpl.prototype.removeChild = function (/* Node */ oldChildImpl) {
        if (!oldChildImpl || domSymbolTree.parent(oldChildImpl) !== this) {
            throw new DOMException(DOMException.NOT_FOUND_ERR);
        }
        var oldPreviousSibling = oldChildImpl.previousSibling;
        domSymbolTree.remove(oldChildImpl);
        this._modified();
        oldChildImpl._detach();
        this._descendantRemoved(this, oldChildImpl);
        if (this._ownerDocument) {
            this._ownerDocument._runRemovingSteps(oldChildImpl, this, oldPreviousSibling);
        }
        return oldChildImpl;
    }; // raises(DOMException);
    NodeImpl.prototype.appendChild = function (newChild) {
        if (!("nodeType" in newChild)) {
            throw new TypeError("First argument to Node.prototype.appendChild must be a Node");
        }
        return this.insertBefore(newChild, null);
    };
    NodeImpl.prototype.hasChildNodes = function () {
        return domSymbolTree.hasChildren(this);
    };
    NodeImpl.prototype.normalize = function () {
        for (var _i = 0, _a = domSymbolTree.childrenIterator(this); _i < _a.length; _i++) {
            var child = _a[_i];
            if (child.normalize) {
                child.normalize();
            }
            if (child.nodeValue === "") {
                this.removeChild(child);
                continue;
            }
            var prevChild = domSymbolTree.previousSibling(child);
            if (prevChild && prevChild.nodeType === NODE_TYPE.TEXT_NODE && child.nodeType === NODE_TYPE.TEXT_NODE) {
                // merge text nodes
                prevChild.appendData(child.nodeValue);
                this.removeChild(child);
            }
        }
    };
    Object.defineProperty(NodeImpl.prototype, "parentElement", {
        get: function () {
            var parentNode = domSymbolTree.parent(this);
            return parentNode !== null && parentNode.nodeType === NODE_TYPE.ELEMENT_NODE ? parentNode : null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeImpl.prototype, "baseURI", {
        get: function () {
            return documentBaseURLSerialized(this._ownerDocument);
        },
        enumerable: true,
        configurable: true
    });
    NodeImpl.prototype.compareDocumentPosition = function (otherImpl) {
        // Let reference be the context object.
        var reference = this;
        if (!(otherImpl instanceof NodeImpl)) {
            throw new Error("Comparing position against non-Node values is not allowed");
        }
        if (isObsoleteNodeType(reference) || isObsoleteNodeType(otherImpl)) {
            throw new Error("Obsolete node type");
        }
        var result = domSymbolTree.compareTreePosition(reference, otherImpl);
        // “If other and reference are not in the same tree, return the result of adding DOCUMENT_POSITION_DISCONNECTED,
        //  DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC, and either DOCUMENT_POSITION_PRECEDING or
        // DOCUMENT_POSITION_FOLLOWING, with the constraint that this is to be consistent, together.”
        if (result === NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_DISCONNECTED) {
            // symbol-tree does not add these bits required by the spec:
            return NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_DISCONNECTED |
                NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC |
                NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_FOLLOWING;
        }
        return result;
    };
    NodeImpl.prototype.contains = function (other) {
        if (!(other instanceof NodeImpl)) {
            return false;
        }
        else if (this === other) {
            return true;
        }
        return Boolean(this.compareDocumentPosition(other) & NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_CONTAINED_BY);
    };
    NodeImpl.prototype.isEqualNode = function (node) {
        if (node === null) {
            return false;
        }
        // Fast-path, not in the spec
        if (this === node) {
            return true;
        }
        return nodeEquals(this, node);
    };
    NodeImpl.prototype.cloneNode = function (deep) {
        deep = Boolean(deep);
        return cloneNode(this._core, this, undefined, deep);
    };
    Object.defineProperty(NodeImpl.prototype, "textContent", {
        get: function () {
            var text;
            switch (this.nodeType) {
                case NODE_TYPE.COMMENT_NODE:
                case NODE_TYPE.CDATA_SECTION_NODE:
                case NODE_TYPE.PROCESSING_INSTRUCTION_NODE:
                case NODE_TYPE.TEXT_NODE:
                    return this.nodeValue;
                case NODE_TYPE.ATTRIBUTE_NODE:
                case NODE_TYPE.DOCUMENT_FRAGMENT_NODE:
                case NODE_TYPE.ELEMENT_NODE:
                    text = "";
                    for (var _i = 0, _a = domSymbolTree.treeIterator(this); _i < _a.length; _i++) {
                        var child = _a[_i];
                        if (child.nodeType === NODE_TYPE.TEXT_NODE || child.nodeType === NODE_TYPE.CDATA_SECTION_NODE) {
                            text += child.nodeValue;
                        }
                    }
                    return text;
                default:
                    return null;
            }
        },
        set: function (txt) {
            switch (this.nodeType) {
                case NODE_TYPE.COMMENT_NODE:
                case NODE_TYPE.CDATA_SECTION_NODE:
                case NODE_TYPE.PROCESSING_INSTRUCTION_NODE:
                case NODE_TYPE.TEXT_NODE:
                    this.nodeValue = String(txt);
                    return;
            }
            var child = domSymbolTree.firstChild(this);
            while (child) {
                this.removeChild(child);
                child = domSymbolTree.firstChild(this);
            }
            if (txt !== "" && txt !== null) {
                this.appendChild(this._ownerDocument.createTextNode(txt));
            }
        },
        enumerable: true,
        configurable: true
    });
    NodeImpl.prototype.toString = function () {
        var wrapper = idlUtils.wrapperForImpl(this);
        return "[object " + wrapper.constructor.name + "]";
    };
    return NodeImpl;
}(EventTargetImpl));
module.exports = {
    implementation: NodeImpl
};
"use strict";
var domSymbolTree = require("./internal-constants").domSymbolTree;
// All these operate on and return impls, not wrappers!
exports.closest = function (e, localName) {
    while (e) {
        if (e.localName === localName) {
            return e;
        }
        e = domSymbolTree.parent(e);
    }
    return null;
};
exports.childrenByHTMLLocalName = function (parent, localName) {
    return domSymbolTree.childrenToArray(parent, { filter: function (node) {
            return node._localName === localName && node._namespaceURI === "http://www.w3.org/1999/xhtml";
        } });
};
exports.descendantsByHTMLLocalName = function (parent, localName) {
    return domSymbolTree.treeToArray(parent, { filter: function (node) {
            return node._localName === localName && node._namespaceURI === "http://www.w3.org/1999/xhtml" && node !== parent;
        } });
};
exports.childrenByHTMLLocalNames = function (parent, localNamesSet) {
    return domSymbolTree.childrenToArray(parent, { filter: function (node) {
            return localNamesSet.has(node._localName) && node._namespaceURI === "http://www.w3.org/1999/xhtml";
        } });
};
exports.descendantsByHTMLLocalNames = function (parent, localNamesSet) {
    return domSymbolTree.treeToArray(parent, { filter: function (node) {
            return localNamesSet.has(node._localName) &&
                node._namespaceURI === "http://www.w3.org/1999/xhtml" &&
                node !== parent;
        } });
};
exports.firstChildWithHTMLLocalName = function (parent, localName) {
    var iterator = domSymbolTree.childrenIterator(parent);
    for (var _i = 0, iterator_1 = iterator; _i < iterator_1.length; _i++) {
        var child = iterator_1[_i];
        if (child._localName === localName && child._namespaceURI === "http://www.w3.org/1999/xhtml") {
            return child;
        }
    }
    return null;
};
exports.firstChildWithHTMLLocalNames = function (parent, localNamesSet) {
    var iterator = domSymbolTree.childrenIterator(parent);
    for (var _i = 0, iterator_2 = iterator; _i < iterator_2.length; _i++) {
        var child = iterator_2[_i];
        if (localNamesSet.has(child._localName) && child._namespaceURI === "http://www.w3.org/1999/xhtml") {
            return child;
        }
    }
    return null;
};
exports.firstDescendantWithHTMLLocalName = function (parent, localName) {
    var iterator = domSymbolTree.treeIterator(parent);
    for (var _i = 0, iterator_3 = iterator; _i < iterator_3.length; _i++) {
        var descendant = iterator_3[_i];
        if (descendant._localName === localName && descendant._namespaceURI === "http://www.w3.org/1999/xhtml") {
            return descendant;
        }
    }
    return null;
};
"use strict";
var parse5 = require("parse5");
var sax = require("sax");
var attributes = require("../living/attributes");
var DocumentType = require("../living/generated/DocumentType");
var locationInfo = require("../living/helpers/internal-constants").locationInfo;
var HtmlToDom = (function () {
    function HtmlToDom(core, parser, parsingMode) {
        if (!parser) {
            if (parsingMode === "xml") {
                parser = sax;
            }
            else {
                parser = parse5;
            }
        }
        this.core = core;
        this.parser = parser;
        this.parsingMode = parsingMode;
        if (parser.DefaultHandler) {
            this.parserType = "htmlparser2";
        }
        else if (parser.Parser && parser.TreeAdapters) {
            this.parserType = "parse5v1";
        }
        else if (parser.moduleName === "HTML5") {
            this.parserType = "html5";
        }
        else if (parser.parser) {
            this.parserType = "sax";
        }
    }
    HtmlToDom.prototype.appendHtmlToElement = function (html, element) {
        if (typeof html !== "string") {
            html = String(html);
        }
        return this["_parseWith" + this.parserType](html, true, element);
    };
    HtmlToDom.prototype.appendHtmlToDocument = function (html, element) {
        if (typeof html !== "string") {
            html = String(html);
        }
        return this["_parseWith" + this.parserType](html, false, element);
    };
    HtmlToDom.prototype._parseWithhtmlparser2 = function (html, fragment, element) {
        var handler = new this.parser.DefaultHandler();
        // Check if document is XML
        var isXML = this.parsingMode === "xml";
        var parserInstance = new this.parser.Parser(handler, {
            xmlMode: isXML,
            lowerCaseTags: !isXML,
            lowerCaseAttributeNames: !isXML,
            decodeEntities: true
        });
        parserInstance.includeLocation = false;
        parserInstance.parseComplete(html);
        var parsed = handler.dom;
        for (var i = 0; i < parsed.length; i++) {
            setChild(this.core, element, parsed[i]);
        }
        return element;
    };
    HtmlToDom.prototype._parseWithparse5v1 = function (html, fragment, element) {
        if (this.parsingMode === "xml") {
            throw new Error("Can't parse XML with parse5, please use htmlparser2 instead.");
        }
        var htmlparser2Adapter = this.parser.TreeAdapters.htmlparser2;
        var dom;
        if (fragment) {
            var instance = new this.parser.Parser(htmlparser2Adapter);
            var parentElement = htmlparser2Adapter.createElement(element.tagName.toLowerCase(), element.namespaceURI, []);
            dom = instance.parseFragment(html, parentElement);
        }
        else {
            var instance = new this.parser.Parser(htmlparser2Adapter, { locationInfo: true });
            dom = instance.parse(html);
        }
        var parsed = dom.children;
        for (var i = 0; i < parsed.length; i++) {
            setChild(this.core, element, parsed[i]);
        }
        return element;
    };
    HtmlToDom.prototype._parseWithhtml5 = function (html, fragment, element) {
        if (element.nodeType === 9) {
            new this.parser.Parser({ document: element }).parse(html);
        }
        else {
            var p = new this.parser.Parser({ document: element.ownerDocument });
            p.parse_fragment(html, element);
        }
    };
    HtmlToDom.prototype._parseWithsax = function (html, fragment, element) {
        var _this = this;
        var SaxParser = this.parser.parser;
        var parser = new SaxParser(/* strict = */ true, { xmlns: true });
        parser.noscript = false;
        parser.looseCase = "toString";
        var openStack = [element];
        parser.ontext = function (text) {
            setChild(_this.core, openStack[openStack.length - 1], {
                type: "text",
                data: text
            });
        };
        parser.onopentag = function (arg) {
            var attrValues = {};
            var attrPrefixes = {};
            var attrNamespaces = {};
            Object.keys(arg.attributes).forEach(function (key) {
                var localName = arg.attributes[key].local;
                attrValues[localName] = arg.attributes[key].value;
                attrPrefixes[localName] = arg.attributes[key].prefix || null;
                attrNamespaces[localName] = arg.attributes[key].uri || null;
            });
            if (arg.local === "script" && arg.uri === "http://www.w3.org/1999/xhtml") {
                openStack.push({
                    type: "tag",
                    name: arg.local,
                    prefix: arg.prefix,
                    namespace: arg.uri,
                    attribs: attrValues,
                    "x-attribsPrefix": attrPrefixes,
                    "x-attribsNamespace": attrNamespaces
                });
            }
            else {
                var elem = setChild(_this.core, openStack[openStack.length - 1], {
                    type: "tag",
                    name: arg.local,
                    prefix: arg.prefix,
                    namespace: arg.uri,
                    attribs: attrValues,
                    "x-attribsPrefix": attrPrefixes,
                    "x-attribsNamespace": attrNamespaces
                });
                openStack.push(elem);
            }
        };
        parser.onclosetag = function () {
            var elem = openStack.pop();
            if (elem.constructor.name === "Object") {
                setChild(_this.core, openStack[openStack.length - 1], elem);
            }
        };
        parser.onscript = function (scriptText) {
            var tag = openStack.pop();
            tag.children = [{ type: "text", data: scriptText }];
            var elem = setChild(_this.core, openStack[openStack.length - 1], tag);
            openStack.push(elem);
        };
        parser.oncomment = function (comment) {
            setChild(_this.core, openStack[openStack.length - 1], {
                type: "comment",
                data: comment
            });
        };
        parser.onprocessinginstruction = function (pi) {
            setChild(_this.core, openStack[openStack.length - 1], {
                type: "directive",
                name: "?" + pi.name,
                data: "?" + pi.name + " " + pi.body + "?"
            });
        };
        parser.ondoctype = function (dt) {
            setChild(_this.core, openStack[openStack.length - 1], {
                type: "directive",
                name: "!doctype",
                data: "!doctype " + dt
            });
            var entityMatcher = /<!ENTITY ([^ ]+) "([^"]+)">/g;
            var result;
            while ((result = entityMatcher.exec(dt))) {
                // TODO Node v6 const [, name, value] = result;
                var name_7 = result[1];
                var value = result[2];
                if (!(name_7 in parser.ENTITIES)) {
                    parser.ENTITIES[name_7] = value;
                }
            }
        };
        parser.onerror = function (err) {
            throw err;
        };
        parser.write(html).close();
    };
    return HtmlToDom;
}());
// utility function for forgiving parser
function setChild(core, parentImpl, node) {
    var currentDocument = parentImpl && parentImpl._ownerDocument || parentImpl;
    var newNode;
    var isTemplateContents = false;
    switch (node.type) {
        case "tag":
        case "script":
        case "style":
            newNode = currentDocument._createElementWithCorrectElementInterface(node.name, node.namespace);
            newNode._prefix = node.prefix || null;
            newNode._namespaceURI = node.namespace || null;
            break;
        case "root":
            // If we are in <template> then add all children to the parent's _templateContents; skip this virtual root node.
            if (parentImpl.tagName === "TEMPLATE" && parentImpl._namespaceURI === "http://www.w3.org/1999/xhtml") {
                newNode = parentImpl._templateContents;
                isTemplateContents = true;
            }
            break;
        case "text":
            // HTML entities should already be decoded by the parser, so no need to decode them
            newNode = currentDocument.createTextNode(node.data);
            break;
        case "comment":
            newNode = currentDocument.createComment(node.data);
            break;
        case "directive":
            if (node.name[0] === "?" && node.name.toLowerCase() !== "?xml") {
                var data = node.data.slice(node.name.length + 1, -1);
                newNode = currentDocument.createProcessingInstruction(node.name.substring(1), data);
            }
            else if (node.name.toLowerCase() === "!doctype") {
                if (node["x-name"] !== undefined) {
                    newNode = createDocumentTypeInternal(core, currentDocument, node["x-name"] || "", node["x-publicId"] || "", node["x-systemId"] || "");
                }
                else {
                    newNode = parseDocType(core, currentDocument, "<" + node.data + ">");
                }
            }
            break;
    }
    if (!newNode) {
        return null;
    }
    newNode[locationInfo] = node.__location;
    if (node.attribs) {
        Object.keys(node.attribs).forEach(function (localName) {
            var value = node.attribs[localName];
            var prefix = node["x-attribsPrefix"] &&
                Object.prototype.hasOwnProperty.call(node["x-attribsPrefix"], localName) &&
                node["x-attribsPrefix"][localName] || null;
            var namespace = node["x-attribsNamespace"] &&
                Object.prototype.hasOwnProperty.call(node["x-attribsNamespace"], localName) &&
                node["x-attribsNamespace"][localName] || null;
            if (prefix === "xmlns" && localName === "") {
                // intended weirdness in node-sax, see https://github.com/isaacs/sax-js/issues/165
                localName = prefix;
                prefix = null;
            }
            attributes.setAttributeValue(newNode, localName, value, prefix, namespace);
        });
    }
    if (node.children) {
        for (var c = 0; c < node.children.length; c++) {
            setChild(core, newNode, node.children[c]);
        }
    }
    if (!isTemplateContents) {
        if (parentImpl._templateContents) {
            // Setting innerHTML on a <template>
            parentImpl._templateContents.appendChild(newNode);
        }
        else {
            parentImpl.appendChild(newNode);
        }
    }
    return newNode;
}
var HTML5_DOCTYPE = /<!doctype html>/i;
var PUBLIC_DOCTYPE = /<!doctype\s+([^\s]+)\s+public\s+"([^"]+)"\s+"([^"]+)"/i;
var SYSTEM_DOCTYPE = /<!doctype\s+([^\s]+)\s+system\s+"([^"]+)"/i;
function parseDocType(core, doc, html) {
    if (HTML5_DOCTYPE.test(html)) {
        return createDocumentTypeInternal(core, doc, "html", "", "");
    }
    var publicPieces = PUBLIC_DOCTYPE.exec(html);
    if (publicPieces) {
        return createDocumentTypeInternal(core, doc, publicPieces[1], publicPieces[2], publicPieces[3]);
    }
    var systemPieces = SYSTEM_DOCTYPE.exec(html);
    if (systemPieces) {
        return createDocumentTypeInternal(core, doc, systemPieces[1], "", systemPieces[2]);
    }
    // Shouldn't get here (the parser shouldn't let us know about invalid doctypes), but our logic likely isn't
    // real-world perfect, so let's fallback.
    return createDocumentTypeInternal(core, doc, "html", "", "");
}
function createDocumentTypeInternal(core, ownerDocument, name, publicId, systemId) {
    return DocumentType.createImpl([], { core: core, ownerDocument: ownerDocument, name: name, publicId: publicId, systemId: systemId });
}
exports.HtmlToDom = HtmlToDom;
"use strict";
var xnv = require("xml-name-validator");
var DOMException = require("../../web-idl/DOMException");
// https://dom.spec.whatwg.org/#validate
exports.name = function (name) {
    var result = xnv.name(name);
    if (!result.success) {
        throw new DOMException(DOMException.INVALID_CHARACTER_ERR, "\"" + name + "\" did not match the Name production: " + result.error);
    }
};
exports.qname = function (qname) {
    exports.name(qname);
    var result = xnv.qname(qname);
    if (!result.success) {
        throw new DOMException(DOMException.NAMESPACE_ERR, "\"" + qname + "\" did not match the QName production: " + result.error);
    }
};
exports.validateAndExtract = function (namespace, qualifiedName) {
    if (namespace === "") {
        namespace = null;
    }
    exports.qname(qualifiedName);
    var prefix = null;
    var localName = qualifiedName;
    var colonIndex = qualifiedName.indexOf(":");
    if (colonIndex !== -1) {
        prefix = qualifiedName.substring(0, colonIndex);
        localName = qualifiedName.substring(colonIndex + 1);
    }
    if (prefix !== null && namespace === null) {
        throw new DOMException(DOMException.NAMESPACE_ERR, "A namespace was given but a prefix was also extracted from the qualifiedName");
    }
    if (prefix === "xml" && namespace !== "http://www.w3.org/XML/1998/namespace") {
        throw new DOMException(DOMException.NAMESPACE_ERR, "A prefix of \"xml\" was given but the namespace was not the XML namespace");
    }
    if ((qualifiedName === "xmlns" || prefix === "xmlns") && namespace !== "http://www.w3.org/2000/xmlns/") {
        throw new DOMException(DOMException.NAMESPACE_ERR, "A prefix or qualifiedName of \"xmlns\" was given but the namespace was not the XMLNS namespace");
    }
    if (namespace === "http://www.w3.org/2000/xmlns/" && qualifiedName !== "xmlns" && prefix !== "xmlns") {
        throw new DOMException(DOMException.NAMESPACE_ERR, "The XMLNS namespace was given but neither the prefix nor qualifiedName was \"xmlns\"");
    }
    return { namespace: namespace, prefix: prefix, localName: localName };
};
"use strict";
var parseContentType = require("content-type-parser");
var sniffHTMLEncoding = require("html-encoding-sniffer");
var whatwgEncoding = require("whatwg-encoding");
var parseDataUrl = require("../utils").parseDataUrl;
var fs = require("fs");
var request = require("request");
var documentBaseURLSerialized = require("../living/helpers/document-base-url").documentBaseURLSerialized;
var NODE_TYPE = require("../living/node-type");
/* eslint-disable no-restricted-modules */
// TODO: stop using the built-in URL in favor of the spec-compliant whatwg-url package
// This legacy usage is in the process of being purged.
var URL = require("url");
/* eslint-enable no-restricted-modules */
var IS_BROWSER = Object.prototype.toString.call(process) !== "[object process]";
function createResourceLoadHandler(element, resourceUrl, document, loadCallback) {
    if (loadCallback === undefined) {
        loadCallback = function () {
            // do nothing
        };
    }
    return function (err, data, response) {
        var ev = document.createEvent("HTMLEvents");
        if (!err) {
            try {
                loadCallback.call(element, data, resourceUrl, response);
                ev.initEvent("load", false, false);
            }
            catch (e) {
                err = e;
            }
        }
        if (err) {
            if (!err.isAbortError) {
                ev.initEvent("error", false, false);
                ev.error = err;
                element.dispatchEvent(ev);
                var error = new Error("Could not load " + element.localName + ": \"" + resourceUrl + "\"");
                error.detail = err;
                error.type = "resource loading";
                document._defaultView._virtualConsole.emit("jsdomError", error);
            }
        }
        else {
            element.dispatchEvent(ev);
        }
    };
}
exports.readFile = function (filePath, options, callback) {
    var readableStream = fs.createReadStream(filePath);
    var data = new Buffer(0);
    readableStream.on("error", callback);
    readableStream.on("data", function (chunk) {
        data = Buffer.concat([data, chunk]);
    });
    var defaultEncoding = options.defaultEncoding;
    var detectMetaCharset = options.detectMetaCharset;
    readableStream.on("end", function () {
        // Not passing default encoding means binary
        if (defaultEncoding) {
            var encoding = detectMetaCharset ? sniffHTMLEncoding(data, { defaultEncoding: defaultEncoding }) :
                whatwgEncoding.getBOMEncoding(data) || defaultEncoding;
            var decoded = whatwgEncoding.decode(data, encoding);
            callback(null, decoded, { headers: { "content-type": "text/plain;charset=" + encoding } });
        }
        else {
            callback(null, data);
        }
    });
    return {
        abort: function () {
            readableStream.destroy();
            var error = new Error("request canceled by user");
            error.isAbortError = true;
            callback(error);
        }
    };
};
function readDataUrl(dataUrl, options, callback) {
    var defaultEncoding = options.defaultEncoding;
    try {
        var data = parseDataUrl(dataUrl);
        // If default encoding does not exist, pass on binary data.
        if (defaultEncoding) {
            var contentType = parseContentType(data.type) || parseContentType("text/plain");
            var sniffOptions = {
                transportLayerEncodingLabel: contentType.get("charset"),
                defaultEncoding: defaultEncoding
            };
            var encoding = options.detectMetaCharset ? sniffHTMLEncoding(data.buffer, sniffOptions) :
                whatwgEncoding.getBOMEncoding(data.buffer) ||
                    whatwgEncoding.labelToName(contentType.get("charset")) || defaultEncoding;
            var decoded = whatwgEncoding.decode(data.buffer, encoding);
            contentType.set("charset", encoding);
            data.type = contentType.toString();
            callback(null, decoded, { headers: { "content-type": data.type } });
        }
        else {
            callback(null, data.buffer, { headers: { "content-type": data.type } });
        }
    }
    catch (err) {
        callback(err, null);
    }
    return null;
}
// NOTE: request wraps tough-cookie cookie jar
// (see: https://github.com/request/request/blob/master/lib/cookies.js).
// Therefore, to pass our cookie jar to the request, we need to create
// request's wrapper and monkey patch it with our jar.
function wrapCookieJarForRequest(cookieJar) {
    var jarWrapper = request.jar();
    jarWrapper._jar = cookieJar;
    return jarWrapper;
}
function fetch(urlObj, options, callback) {
    if (urlObj.protocol === "data:") {
        return readDataUrl(urlObj.href, options, callback);
    }
    else if (urlObj.hostname) {
        return exports.download(urlObj, options, callback);
    }
    var filePath = urlObj.pathname
        .replace(/^file:\/\//, "")
        .replace(/^\/([a-z]):\//i, "$1:/")
        .replace(/%20/g, " ");
    return exports.readFile(filePath, options, callback);
}
exports.enqueue = function (element, resourceUrl, callback) {
    var document = element.nodeType === NODE_TYPE.DOCUMENT_NODE ? element : element._ownerDocument;
    if (document._queue) {
        var loadHandler = createResourceLoadHandler(element, resourceUrl || document.URL, document, callback);
        return document._queue.push(loadHandler);
    }
    return function () {
        // do nothing in queue-less documents
    };
};
exports.download = function (url, options, callback) {
    var requestOptions = {
        pool: options.pool,
        agent: options.agent,
        agentOptions: options.agentOptions,
        agentClass: options.agentClass,
        strictSSL: options.strictSSL,
        gzip: true,
        jar: wrapCookieJarForRequest(options.cookieJar),
        encoding: null,
        headers: {
            "User-Agent": options.userAgent,
            "Accept-Language": "en",
            Accept: options.accept || "*/*"
        }
    };
    if (options.referrer && !IS_BROWSER) {
        requestOptions.headers.referer = options.referrer;
    }
    if (options.proxy) {
        requestOptions.proxy = options.proxy;
    }
    Object.assign(requestOptions.headers, options.headers);
    var defaultEncoding = options.defaultEncoding;
    var detectMetaCharset = options.detectMetaCharset;
    var req = request(url, requestOptions, function (error, response, bufferData) {
        if (!error) {
            // If default encoding does not exist, pass on binary data.
            if (defaultEncoding) {
                var contentType = parseContentType(response.headers["content-type"]) || parseContentType("text/plain");
                var sniffOptions = {
                    transportLayerEncodingLabel: contentType.get("charset"),
                    defaultEncoding: defaultEncoding
                };
                var encoding = detectMetaCharset ? sniffHTMLEncoding(bufferData, sniffOptions) :
                    whatwgEncoding.getBOMEncoding(bufferData) ||
                        whatwgEncoding.labelToName(contentType.get("charset")) || defaultEncoding;
                var decoded = whatwgEncoding.decode(bufferData, encoding);
                contentType.set("charset", encoding);
                response.headers["content-type"] = contentType.toString();
                callback(null, decoded, response);
            }
            else {
                callback(null, bufferData, response);
            }
        }
        else {
            callback(error, null, response);
        }
    });
    return {
        abort: function () {
            req.abort();
            var error = new Error("request canceled by user");
            error.isAbortError = true;
            callback(error);
        }
    };
};
exports.load = function (element, urlString, options, callback) {
    var document = element._ownerDocument;
    var documentImpl = document.implementation;
    if (!documentImpl._hasFeature("FetchExternalResources", element.tagName.toLowerCase())) {
        return;
    }
    if (documentImpl._hasFeature("SkipExternalResources", urlString)) {
        return;
    }
    var urlObj = URL.parse(urlString);
    var enqueued = exports.enqueue(element, urlString, callback);
    var customLoader = document._customResourceLoader;
    var requestManager = document._requestManager;
    var cookieJar = document._cookieJar;
    options.accept = element._accept;
    options.cookieJar = cookieJar;
    options.referrer = document.URL;
    options.pool = document._pool;
    options.agentOptions = document._agentOptions;
    options.strictSSL = document._strictSSL;
    options.proxy = document._proxy;
    options.userAgent = document._defaultView.navigator.userAgent;
    var req = null;
    function wrappedEnqueued() {
        if (req && requestManager) {
            requestManager.remove(req);
        }
        // do not trigger if the window is closed
        if (element._ownerDocument && element._ownerDocument.defaultView.document) {
            enqueued.apply(this, arguments);
        }
    }
    if (typeof customLoader === "function") {
        req = customLoader({
            element: element,
            url: urlObj,
            cookie: cookieJar.getCookieStringSync(urlObj, { http: true }),
            baseUrl: documentBaseURLSerialized(document),
            defaultFetch: function (fetchCallback) {
                return fetch(urlObj, options, fetchCallback);
            }
        }, wrappedEnqueued);
    }
    else {
        req = fetch(urlObj, options, wrappedEnqueued);
    }
    if (req && requestManager) {
        requestManager.add(req);
    }
};
"use strict";
var idlUtils = require("../generated/utils");
var nwmatcher = require("nwmatcher/src/nwmatcher-noqsa");
var DOMException = require("../../web-idl/DOMException");
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var NODE_TYPE = require("../node-type");
var createHTMLCollection = require("../html-collection").create;
var updateHTMLCollection = require("../html-collection").update;
var memoizeQuery = require("../../utils").memoizeQuery;
var createStaticNodeList = require("../node-list").createStatic;
// nwmatcher gets `document.documentElement` at creation-time, so we have to initialize lazily, since in the initial
// stages of Document initialization, there is no documentElement present yet.
function addNwmatcher(parentNode) {
    var document = parentNode._ownerDocument;
    if (!document._nwmatcher) {
        document._nwmatcher = nwmatcher({ document: document });
        document._nwmatcher.configure({ UNIQUE_ID: false });
    }
    return document._nwmatcher;
}
var ParentNodeImpl = (function () {
    function ParentNodeImpl() {
    }
    Object.defineProperty(ParentNodeImpl.prototype, "children", {
        get: function () {
            var _this = this;
            if (!this._childrenList) {
                this._childrenList = createHTMLCollection(this, function () {
                    return domSymbolTree.childrenToArray(_this, { filter: function (node) {
                            return node.nodeType === NODE_TYPE.ELEMENT_NODE;
                        } });
                });
            }
            else {
                updateHTMLCollection(this._childrenList);
            }
            return this._childrenList;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ParentNodeImpl.prototype, "firstElementChild", {
        get: function () {
            for (var _i = 0, _a = domSymbolTree.childrenIterator(this); _i < _a.length; _i++) {
                var child = _a[_i];
                if (child.nodeType === NODE_TYPE.ELEMENT_NODE) {
                    return child;
                }
            }
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ParentNodeImpl.prototype, "lastElementChild", {
        get: function () {
            for (var _i = 0, _a = domSymbolTree.childrenIterator(this, { reverse: true }); _i < _a.length; _i++) {
                var child = _a[_i];
                if (child.nodeType === NODE_TYPE.ELEMENT_NODE) {
                    return child;
                }
            }
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ParentNodeImpl.prototype, "childElementCount", {
        get: function () {
            return this.children.length;
        },
        enumerable: true,
        configurable: true
    });
    return ParentNodeImpl;
}());
ParentNodeImpl.prototype.querySelector = memoizeQuery(function (selectors) {
    var matcher = addNwmatcher(this);
    try {
        return matcher.first(selectors, idlUtils.wrapperForImpl(this));
    }
    catch (e) {
        throw new DOMException(DOMException.SYNTAX_ERR, e.message);
    }
});
ParentNodeImpl.prototype.querySelectorAll = memoizeQuery(function (selectors) {
    var matcher = addNwmatcher(this);
    var list;
    try {
        list = matcher.select(selectors, idlUtils.wrapperForImpl(this));
    }
    catch (e) {
        throw new DOMException(DOMException.SYNTAX_ERR, e.message);
    }
    return createStaticNodeList(list);
});
module.exports = {
    implementation: ParentNodeImpl
};
"use strict";
var CookieJar = require("tough-cookie").CookieJar;
var NodeImpl = require("./Node-impl").implementation;
var isNodeImpl = require("../generated/Node").isImpl;
var NODE_TYPE = require("../node-type");
var memoizeQuery = require("../../utils").memoizeQuery;
var firstChildWithHTMLLocalName = require("../helpers/traversal").firstChildWithHTMLLocalName;
var firstChildWithHTMLLocalNames = require("../helpers/traversal").firstChildWithHTMLLocalNames;
var firstDescendantWithHTMLLocalName = require("../helpers/traversal").firstDescendantWithHTMLLocalName;
var whatwgURL = require("whatwg-url");
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var DOMException = require("../../web-idl/DOMException");
var HtmlToDom = require("../../browser/htmltodom").HtmlToDom;
var History = require("../generated/History");
var Location = require("../generated/Location");
var createHTMLCollection = require("../html-collection").create;
var idlUtils = require("../generated/utils");
var validateName = require("../helpers/validate-names").name;
var validateAndExtract = require("../helpers/validate-names").validateAndExtract;
var resourceLoader = require("../../browser/resource-loader");
var clone = require("../node").clone;
var generatedAttr = require("../generated/Attr");
var listOfElementsWithQualifiedName = require("../node").listOfElementsWithQualifiedName;
var listOfElementsWithNamespaceAndLocalName = require("../node").listOfElementsWithNamespaceAndLocalName;
var listOfElementsWithClassNames = require("../node").listOfElementsWithClassNames;
var Comment = require("../generated/Comment");
var ProcessingInstruction = require("../generated/ProcessingInstruction");
var CDATASection = require("../generated/CDATASection");
var Text = require("../generated/Text");
var DocumentFragment = require("../generated/DocumentFragment");
var DOMImplementation = require("../generated/DOMImplementation");
var ParentNodeImpl = require("./ParentNode-impl").implementation;
var HTMLElement = require("../generated/HTMLElement");
var HTMLUnknownElement = require("../generated/HTMLUnknownElement");
var TreeWalker = require("../generated/TreeWalker");
var CustomEvent = require("../generated/CustomEvent");
var ErrorEvent = require("../generated/ErrorEvent");
var Event = require("../generated/Event");
var FocusEvent = require("../generated/FocusEvent");
var HashChangeEvent = require("../generated/HashChangeEvent");
var KeyboardEvent = require("../generated/KeyboardEvent");
var MessageEvent = require("../generated/MessageEvent");
var MouseEvent = require("../generated/MouseEvent");
var PopStateEvent = require("../generated/PopStateEvent");
var ProgressEvent = require("../generated/ProgressEvent");
var TouchEvent = require("../generated/TouchEvent");
var UIEvent = require("../generated/UIEvent");
function clearChildNodes(node) {
    for (var child = domSymbolTree.firstChild(node); child; child = domSymbolTree.firstChild(node)) {
        node.removeChild(child);
    }
}
function setInnerHTML(document, node, html) {
    // Clear the children first:
    if (node._templateContents) {
        clearChildNodes(node._templateContents);
    }
    else {
        clearChildNodes(node);
    }
    if (html !== "") {
        if (node.nodeName === "#document") {
            document._htmlToDom.appendHtmlToDocument(html, node);
        }
        else {
            document._htmlToDom.appendHtmlToElement(html, node);
        }
    }
}
var ResourceQueue = (function () {
    function ResourceQueue(paused) {
        this.paused = Boolean(paused);
    }
    ResourceQueue.prototype.push = function (callback) {
        var q = this;
        var item = {
            prev: q.tail,
            check: function () {
                if (!q.paused && !this.prev && this.fired) {
                    callback(this.err, this.data, this.response);
                    if (this.next) {
                        this.next.prev = null;
                        this.next.check();
                    }
                    else {
                        q.tail = null;
                    }
                }
            }
        };
        if (q.tail) {
            q.tail.next = item;
        }
        q.tail = item;
        return function (err, data, response) {
            item.fired = 1;
            item.err = err;
            item.data = data;
            item.response = response;
            item.check();
        };
    };
    ResourceQueue.prototype.resume = function () {
        if (!this.paused) {
            return;
        }
        this.paused = false;
        var head = this.tail;
        while (head && head.prev) {
            head = head.prev;
        }
        if (head) {
            head.check();
        }
    };
    return ResourceQueue;
}());
var RequestManager = (function () {
    function RequestManager() {
        this.openedRequests = [];
    }
    RequestManager.prototype.add = function (req) {
        this.openedRequests.push(req);
    };
    RequestManager.prototype.remove = function (req) {
        var idx = this.openedRequests.indexOf(req);
        if (idx !== -1) {
            this.openedRequests.splice(idx, 1);
        }
    };
    RequestManager.prototype.close = function () {
        for (var _i = 0, _a = this.openedRequests; _i < _a.length; _i++) {
            var openedRequest = _a[_i];
            openedRequest.abort();
        }
        this.openedRequests = [];
    };
    RequestManager.prototype.size = function () {
        return this.openedRequests.length;
    };
    return RequestManager;
}());
function pad(number) {
    if (number < 10) {
        return "0" + number;
    }
    return number;
}
function toLastModifiedString(date) {
    return pad(date.getMonth() + 1) +
        "/" + pad(date.getDate()) +
        "/" + date.getFullYear() +
        " " + pad(date.getHours()) +
        ":" + pad(date.getMinutes()) +
        ":" + pad(date.getSeconds());
}
var nonInheritedTags = new Set([
    "article", "section", "nav", "aside", "hgroup", "header", "footer", "address", "dt",
    "dd", "figure", "figcaption", "main", "em", "strong", "small", "s", "cite", "dfn", "abbr",
    "ruby", "rt", "rp", "code", "var", "samp", "kbd", "i", "b", "u", "mark", "bdi", "bdo", "wbr"
]);
var eventInterfaceTable = {
    customevent: CustomEvent,
    errorevent: ErrorEvent,
    event: Event,
    events: Event,
    focusevent: FocusEvent,
    hashchangeevent: HashChangeEvent,
    htmlevents: Event,
    keyboardevent: KeyboardEvent,
    messageevent: MessageEvent,
    mouseevent: MouseEvent,
    mouseevents: MouseEvent,
    popstateevent: PopStateEvent,
    progressevent: ProgressEvent,
    svgevents: Event,
    touchevent: TouchEvent,
    uievent: UIEvent,
    uievents: UIEvent
};
var DocumentImpl = (function (_super) {
    __extends(DocumentImpl, _super);
    function DocumentImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this._ownerDocument = _this;
        _this.nodeType = NODE_TYPE.DOCUMENT_NODE;
        if (!privateData.options) {
            privateData.options = {};
        }
        if (!privateData.options.parsingMode) {
            privateData.options.parsingMode = "xml";
        }
        _this._parsingMode = privateData.options.parsingMode;
        _this._htmlToDom = new HtmlToDom(privateData.core, privateData.options.parser, privateData.options.parsingMode);
        _this._implementation = DOMImplementation.createImpl([], {
            core: _this._core,
            ownerDocument: _this
        });
        _this._defaultView = privateData.options.defaultView || null;
        _this._global = privateData.options.global;
        _this._documentElement = null;
        _this._ids = Object.create(null);
        _this._attached = true;
        _this._currentScript = null;
        _this._cookieJar = privateData.options.cookieJar;
        if (_this._cookieJar === undefined) {
            _this._cookieJar = new CookieJar(null, { looseMode: true });
        }
        _this._contentType = privateData.options.contentType;
        _this._encoding = privateData.options.encoding;
        var urlOption = privateData.options.url === undefined ? "about:blank" : privateData.options.url;
        var parsed = whatwgURL.parseURL(urlOption);
        if (parsed === "failure") {
            throw new TypeError("Could not parse \"" + urlOption + "\" as a URL");
        }
        _this._URL = parsed;
        _this._origin = whatwgURL.serializeURLToUnicodeOrigin(parsed);
        _this._location = Location.createImpl([], { relevantDocument: _this });
        _this._history = History.createImpl([], {
            window: _this._defaultView,
            document: _this,
            actAsIfLocationReloadCalled: function () { return _this._location.reload(); }
        });
        if (privateData.options.cookie) {
            var cookies = Array.isArray(privateData.options.cookie) ?
                privateData.options.cookie : [privateData.options.cookie];
            var document_2 = _this;
            cookies.forEach(function (cookieStr) {
                document_2._cookieJar.setCookieSync(cookieStr, document_2.URL, { ignoreError: true });
            });
        }
        _this._activeNodeIterators = [];
        _this._activeNodeIteratorsMax = privateData.options.concurrentNodeIterators === undefined ?
            10 :
            Number(privateData.options.concurrentNodeIterators);
        if (isNaN(_this._activeNodeIteratorsMax)) {
            throw new TypeError("The 'concurrentNodeIterators' option must be a Number");
        }
        if (_this._activeNodeIteratorsMax < 0) {
            throw new RangeError("The 'concurrentNodeIterators' option must be a non negative Number");
        }
        _this._referrer = privateData.options.referrer || "";
        _this._lastModified = toLastModifiedString(privateData.options.lastModified || new Date());
        _this._queue = new ResourceQueue(privateData.options.deferClose);
        _this._customResourceLoader = privateData.options.resourceLoader;
        _this._pool = privateData.options.pool;
        _this._agentOptions = privateData.options.agentOptions;
        _this._strictSSL = privateData.options.strictSSL;
        _this._proxy = privateData.options.proxy;
        _this._requestManager = new RequestManager();
        _this.readyState = "loading";
        _this._lastFocusedElement = null;
        // Add level2 features
        _this.implementation._addFeature("core", "2.0");
        _this.implementation._addFeature("html", "2.0");
        _this.implementation._addFeature("xhtml", "2.0");
        _this.implementation._addFeature("xml", "2.0");
        return _this;
    }
    DocumentImpl.prototype._defaultElementBuilder = function (document, tagName) {
        if (nonInheritedTags.has(tagName.toLowerCase())) {
            return HTMLElement.create([], {
                core: this._core,
                ownerDocument: this,
                localName: tagName
            });
        }
        return HTMLUnknownElement.create([], {
            core: this._core,
            ownerDocument: this,
            localName: tagName
        });
    };
    Object.defineProperty(DocumentImpl.prototype, "contentType", {
        get: function () {
            return this._contentType || (this._parsingMode === "xml" ? "application/xml" : "text/html");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "compatMode", {
        get: function () {
            return this._parsingMode === "xml" || this.doctype ? "CSS1Compat" : "BackCompat";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "charset", {
        get: function () {
            return this._encoding;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "characterSet", {
        get: function () {
            return this._encoding;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "inputEncoding", {
        get: function () {
            return this._encoding;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "doctype", {
        get: function () {
            for (var _i = 0, _a = domSymbolTree.childrenIterator(this); _i < _a.length; _i++) {
                var childNode = _a[_i];
                if (childNode.nodeType === NODE_TYPE.DOCUMENT_TYPE_NODE) {
                    return childNode;
                }
            }
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "URL", {
        get: function () {
            return whatwgURL.serializeURL(this._URL);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "documentURI", {
        get: function () {
            return whatwgURL.serializeURL(this._URL);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "origin", {
        get: function () {
            return this._origin;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "location", {
        get: function () {
            return this._defaultView ? this._location : null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "documentElement", {
        get: function () {
            if (this._documentElement) {
                return this._documentElement;
            }
            for (var _i = 0, _a = domSymbolTree.childrenIterator(this); _i < _a.length; _i++) {
                var childNode = _a[_i];
                if (childNode.nodeType === NODE_TYPE.ELEMENT_NODE) {
                    this._documentElement = childNode;
                    return childNode;
                }
            }
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "implementation", {
        get: function () {
            return this._implementation;
        },
        set: function (implementation) {
            this._implementation = implementation;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "defaultView", {
        get: function () {
            return this._defaultView;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "currentScript", {
        get: function () {
            return this._currentScript;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "activeElement", {
        get: function () {
            if (this._lastFocusedElement) {
                return this._lastFocusedElement;
            }
            return this.body;
        },
        enumerable: true,
        configurable: true
    });
    DocumentImpl.prototype.hasFocus = function () {
        return Boolean(this._lastFocusedElement);
    };
    DocumentImpl.prototype.toString = function () {
        return "[object HTMLDocument]";
    };
    DocumentImpl.prototype._createElementWithCorrectElementInterface = function (name, namespace) {
        // https://dom.spec.whatwg.org/#concept-element-interface
        // TODO: eventually we should re-write the element-builder system to be namespace aware, but for now it is not.
        var builder = this._elementBuilders[name.toLowerCase()] || this._defaultElementBuilder.bind(this);
        var elem = builder(this, name, namespace);
        return idlUtils.implForWrapper(elem);
    };
    DocumentImpl.prototype.appendChild = function (/* Node */ arg) {
        if (this.documentElement && arg.nodeType === NODE_TYPE.ELEMENT_NODE) {
            throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR);
        }
        return _super.prototype.appendChild.call(this, arg);
    };
    DocumentImpl.prototype.removeChild = function (/* Node */ arg) {
        var ret = _super.prototype.removeChild.call(this, arg);
        if (arg === this._documentElement) {
            this._documentElement = null; // force a recalculation
        }
        return ret;
    };
    DocumentImpl.prototype._descendantRemoved = function (parent, child) {
        if (child.tagName === "STYLE") {
            var index = this.styleSheets.indexOf(child.sheet);
            if (index > -1) {
                this.styleSheets.splice(index, 1);
            }
        }
    };
    DocumentImpl.prototype.write = function () {
        var text = "";
        for (var i = 0; i < arguments.length; ++i) {
            text += String(arguments[i]);
        }
        if (this._parsingMode === "xml") {
            throw new DOMException(DOMException.INVALID_STATE_ERR, "Cannot use document.write on XML documents");
        }
        if (this._writeAfterElement) {
            // If called from an script element directly (during the first tick),
            // the new elements are inserted right after that element.
            var tempDiv = this.createElement("div");
            setInnerHTML(this, tempDiv, text);
            var child = tempDiv.firstChild;
            var previous = this._writeAfterElement;
            var parent_1 = this._writeAfterElement.parentNode;
            while (child) {
                var node = child;
                child = child.nextSibling;
                parent_1.insertBefore(node, previous.nextSibling);
                previous = node;
            }
        }
        else if (this.readyState === "loading") {
            // During page loading, document.write appends to the current element
            // Find the last child that has been added to the document.
            var node = this;
            while (node.lastChild && node.lastChild.nodeType === NODE_TYPE.ELEMENT_NODE) {
                node = node.lastChild;
            }
            setInnerHTML(this, node, text);
        }
        else if (text) {
            setInnerHTML(this, this, text);
        }
    };
    DocumentImpl.prototype.writeln = function () {
        var args = [];
        for (var i = 0; i < arguments.length; ++i) {
            args.push(arguments[i]);
        }
        args.push("\n");
        this.write.apply(this, args);
    };
    DocumentImpl.prototype.getElementById = function (id) {
        // return the first element
        return this._ids[id] && this._ids[id].length > 0 ? this._ids[id][0] : null;
    };
    Object.defineProperty(DocumentImpl.prototype, "referrer", {
        get: function () {
            return this._referrer || "";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "lastModified", {
        get: function () {
            return this._lastModified;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "images", {
        get: function () {
            return this.getElementsByTagName("IMG");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "embeds", {
        get: function () {
            return this.getElementsByTagName("EMBED");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "plugins", {
        get: function () {
            return this.embeds;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "links", {
        get: function () {
            var _this = this;
            return createHTMLCollection(this, function () { return domSymbolTree.treeToArray(_this, { filter: function (node) {
                    return (node._localName === "a" || node._localName === "area") &&
                        node.hasAttribute("href") &&
                        node._namespaceURI === "http://www.w3.org/1999/xhtml";
                } }); });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "forms", {
        get: function () {
            return this.getElementsByTagName("FORM");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "scripts", {
        get: function () {
            return this.getElementsByTagName("SCRIPT");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "anchors", {
        get: function () {
            var _this = this;
            return createHTMLCollection(this, function () { return domSymbolTree.treeToArray(_this, { filter: function (node) {
                    return node._localName === "a" &&
                        node.hasAttribute("name") &&
                        node._namespaceURI === "http://www.w3.org/1999/xhtml";
                } }); });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "applets", {
        get: function () {
            return this.getElementsByTagName("APPLET");
        },
        enumerable: true,
        configurable: true
    });
    DocumentImpl.prototype.open = function () {
        var child = domSymbolTree.firstChild(this);
        while (child) {
            this.removeChild(child);
            child = domSymbolTree.firstChild(this);
        }
        this._documentElement = null;
        this._modified();
        return this;
    };
    DocumentImpl.prototype.close = function () {
        this._queue.resume();
        // Set the readyState to 'complete' once all resources are loaded.
        // As a side-effect the document's load-event will be dispatched.
        resourceLoader.enqueue(this, null, function () {
            this.readyState = "complete";
            var ev = this.createEvent("HTMLEvents");
            ev.initEvent("DOMContentLoaded", false, false);
            this.dispatchEvent(ev);
        })(null, true);
    };
    DocumentImpl.prototype.getElementsByName = function (elementName) {
        var _this = this;
        // TODO: should be NodeList, should be memoized
        return createHTMLCollection(this, function () { return domSymbolTree.treeToArray(_this, { filter: function (node) {
                return node.getAttribute && node.getAttribute("name") === elementName;
            } }); });
    };
    Object.defineProperty(DocumentImpl.prototype, "title", {
        get: function () {
            // TODO SVG
            var titleElement = firstDescendantWithHTMLLocalName(this, "title");
            var value = titleElement !== null ? titleElement.textContent : "";
            value = value.replace(/[ \t\n\f\r]+/g, " ").replace(/^[ \t\n\f\r]+/, "").replace(/[ \t\n\f\r]+$/, "");
            return value;
        },
        set: function (val) {
            // TODO SVG
            var titleElement = firstDescendantWithHTMLLocalName(this, "title");
            var headElement = this.head;
            if (titleElement === null && headElement === null) {
                return;
            }
            var element;
            if (titleElement !== null) {
                element = titleElement;
            }
            else {
                element = this.createElement("title");
                headElement.appendChild(element);
            }
            element.textContent = val;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "head", {
        get: function () {
            return this.documentElement ? firstChildWithHTMLLocalName(this.documentElement, "head") : null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "body", {
        get: function () {
            var documentElement = this.documentElement;
            if (!documentElement || documentElement._localName !== "html" ||
                documentElement._namespaceURI !== "http://www.w3.org/1999/xhtml") {
                return null;
            }
            return firstChildWithHTMLLocalNames(this.documentElement, new Set(["body", "frameset"]));
        },
        set: function (value) {
            if (!HTMLElement.isImpl(value)) {
                throw new TypeError("Argument must be a HTMLElement");
            }
            if (value._namespaceURI !== "http://www.w3.org/1999/xhtml" ||
                (value._localName !== "body" && value._localName !== "frameset")) {
                throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Cannot set the body to a non-body/frameset element");
            }
            var bodyElement = this.body;
            if (value === bodyElement) {
                return;
            }
            if (bodyElement !== null) {
                bodyElement.parentNode.replaceChild(value, bodyElement);
                return;
            }
            var documentElement = this.documentElement;
            if (documentElement === null) {
                throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Cannot set the body when there is no document element");
            }
            documentElement.appendChild(value);
        },
        enumerable: true,
        configurable: true
    });
    DocumentImpl.prototype._runRemovingSteps = function (oldNode, oldParent, oldPreviousSibling) {
        var listeners = DocumentImpl._removingSteps;
        for (var i = 0; i < listeners.length; ++i) {
            listeners[i](this, oldNode, oldParent, oldPreviousSibling);
        }
    };
    DocumentImpl.prototype.createEvent = function (type) {
        var typeLower = type.toLowerCase();
        var eventWrapper = eventInterfaceTable[typeLower] || null;
        if (!eventWrapper) {
            throw new DOMException(DOMException.NOT_SUPPORTED_ERR, "The provided event type (\"" + type + "\") is invalid");
        }
        var impl = eventWrapper.createImpl([""]);
        impl._initializedFlag = false;
        return impl;
    };
    DocumentImpl.prototype.createProcessingInstruction = function (target, data) {
        validateName(target);
        if (data.indexOf("?>") !== -1) {
            throw new DOMException(DOMException.INVALID_CHARACTER_ERR, "Processing instruction data cannot contain the string \"?>\"");
        }
        return ProcessingInstruction.createImpl([], {
            core: this._core,
            ownerDocument: this,
            target: target,
            data: data
        });
    };
    // https://dom.spec.whatwg.org/#dom-document-createcdatasection
    DocumentImpl.prototype.createCDATASection = function (data) {
        if (this._parsingMode === "html") {
            throw new DOMException(DOMException.NOT_SUPPORTED_ERR, "Cannot create CDATA sections in HTML documents");
        }
        if (data.indexOf("]]>") !== -1) {
            throw new DOMException(DOMException.INVALID_CHARACTER_ERR, "CDATA section data cannot contain the string \"]]>\"");
        }
        return CDATASection.createImpl([], {
            core: this._core,
            ownerDocument: this,
            data: data
        });
    };
    DocumentImpl.prototype.createTextNode = function (data) {
        return Text.createImpl([], {
            core: this._core,
            ownerDocument: this,
            data: data
        });
    };
    DocumentImpl.prototype.createComment = function (data) {
        return Comment.createImpl([], {
            core: this._core,
            ownerDocument: this,
            data: data
        });
    };
    DocumentImpl.prototype.createElement = function (localName) {
        validateName(localName);
        if (this._parsingMode === "html") {
            localName = localName.toLowerCase();
        }
        var element = this._createElementWithCorrectElementInterface(localName, "http://www.w3.org/1999/xhtml");
        element._namespaceURI = "http://www.w3.org/1999/xhtml";
        element._localName = localName;
        return element;
    };
    DocumentImpl.prototype.createElementNS = function (namespace, qualifiedName) {
        namespace = namespace !== null ? String(namespace) : namespace;
        var extracted = validateAndExtract(namespace, qualifiedName);
        var element = this._createElementWithCorrectElementInterface(extracted.localName, extracted.namespace);
        element._namespaceURI = extracted.namespace;
        element._prefix = extracted.prefix;
        element._localName = extracted.localName;
        return element;
    };
    DocumentImpl.prototype.createDocumentFragment = function () {
        return DocumentFragment.createImpl([], { ownerDocument: this });
    };
    DocumentImpl.prototype.createAttribute = function (localName) {
        validateName(localName);
        if (this._parsingMode === "html") {
            localName = localName.toLowerCase();
        }
        return generatedAttr.createImpl([], { localName: localName });
    };
    DocumentImpl.prototype.createAttributeNS = function (namespace, name) {
        if (namespace === undefined) {
            namespace = null;
        }
        namespace = namespace !== null ? String(namespace) : namespace;
        var extracted = validateAndExtract(namespace, name);
        return generatedAttr.createImpl([], {
            namespace: extracted.namespace,
            namespacePrefix: extracted.prefix,
            localName: extracted.localName
        });
    };
    // TODO: Add callback interface support to `webidl2js`
    DocumentImpl.prototype.createTreeWalker = function (root, whatToShow, filter) {
        if (!isNodeImpl(root)) {
            throw new TypeError("First argument to createTreeWalker must be a Node");
        }
        return TreeWalker.createImpl([], {
            root: root,
            whatToShow: whatToShow,
            filter: filter
        });
    };
    DocumentImpl.prototype.importNode = function (node, deep) {
        if (!isNodeImpl(node)) {
            throw new TypeError("First argument to importNode must be a Node");
        }
        deep = Boolean(deep);
        if (node.nodeType === NODE_TYPE.DOCUMENT_NODE) {
            throw new DOMException(DOMException.NOT_SUPPORTED_ERR, "Cannot import a document node");
        }
        return clone(this._core, node, this, deep);
    };
    DocumentImpl.prototype.adoptNode = function (node) {
        if (!isNodeImpl(node)) {
            throw new TypeError("First argument to adoptNode must be a Node");
        }
        if (node.nodeType === NODE_TYPE.DOCUMENT_NODE) {
            throw new DOMException(DOMException.NOT_SUPPORTED_ERR, "Cannot adopt a document node");
        }
        // TODO: Determine correct way to detect a shadow root
        // See also https://github.com/w3c/webcomponents/issues/182
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
        node._ownerDocument = this;
        for (var _i = 0, _a = domSymbolTree.treeIterator(node); _i < _a.length; _i++) {
            var descendant = _a[_i];
            descendant._ownerDocument = this;
        }
        return node;
    };
    Object.defineProperty(DocumentImpl.prototype, "cookie", {
        get: function () {
            return this._cookieJar.getCookieStringSync(this.URL, { http: false });
        },
        set: function (cookieStr) {
            cookieStr = String(cookieStr);
            this._cookieJar.setCookieSync(cookieStr, this.URL, {
                http: false,
                ignoreError: true
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "styleSheets", {
        get: function () {
            if (!this._styleSheets) {
                this._styleSheets = new this._core.StyleSheetList();
            }
            // TODO: each style and link element should register its sheet on creation
            // and remove it on removal.
            return this._styleSheets;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "hidden", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentImpl.prototype, "visibilityState", {
        get: function () {
            return "prerender";
        },
        enumerable: true,
        configurable: true
    });
    return DocumentImpl;
}(NodeImpl));
idlUtils.mixin(DocumentImpl.prototype, ParentNodeImpl.prototype);
DocumentImpl._removingSteps = [];
DocumentImpl.prototype._elementBuilders = Object.create(null);
DocumentImpl.prototype.getElementsByTagName = memoizeQuery(function (qualifiedName) {
    return listOfElementsWithQualifiedName(qualifiedName, this);
});
DocumentImpl.prototype.getElementsByTagNameNS = memoizeQuery(function (namespace, localName) {
    return listOfElementsWithNamespaceAndLocalName(namespace, localName, this);
});
DocumentImpl.prototype.getElementsByClassName = memoizeQuery(function getElementsByClassName(classNames) {
    return listOfElementsWithClassNames(classNames, this);
});
module.exports = {
    implementation: DocumentImpl
};
"use strict";
/* eslint global-require: 0 */
var DocumentImpl = require("./nodes/Document-impl.js");
var mappings = {
    HTMLElement: {
        file: require("./generated/HTMLElement.js"),
        tags: []
    },
    HTMLAnchorElement: {
        file: require("./generated/HTMLAnchorElement.js"),
        tags: ["a"]
    },
    HTMLAppletElement: {
        file: require("./generated/HTMLAppletElement.js"),
        tags: ["applet"]
    },
    HTMLAreaElement: {
        file: require("./generated/HTMLAreaElement.js"),
        tags: ["area"]
    },
    HTMLAudioElement: {
        file: require("./generated/HTMLAudioElement.js"),
        tags: ["audio"]
    },
    HTMLBaseElement: {
        file: require("./generated/HTMLBaseElement.js"),
        tags: ["base"]
    },
    HTMLBodyElement: {
        file: require("./generated/HTMLBodyElement.js"),
        tags: ["body"]
    },
    HTMLBRElement: {
        file: require("./generated/HTMLBRElement.js"),
        tags: ["br"]
    },
    HTMLButtonElement: {
        file: require("./generated/HTMLButtonElement.js"),
        tags: ["button"]
    },
    HTMLCanvasElement: {
        file: require("./generated/HTMLCanvasElement.js"),
        tags: ["canvas"]
    },
    HTMLDataElement: {
        file: require("./generated/HTMLDataElement.js"),
        tags: ["data"]
    },
    HTMLDataListElement: {
        file: require("./generated/HTMLDataListElement.js"),
        tags: ["datalist"]
    },
    HTMLDialogElement: {
        file: require("./generated/HTMLDialogElement.js"),
        tags: ["dialog"]
    },
    HTMLDirectoryElement: {
        file: require("./generated/HTMLDirectoryElement.js"),
        tags: ["dir"]
    },
    HTMLDivElement: {
        file: require("./generated/HTMLDivElement.js"),
        tags: ["div"]
    },
    HTMLDListElement: {
        file: require("./generated/HTMLDListElement.js"),
        tags: ["dl"]
    },
    HTMLEmbedElement: {
        file: require("./generated/HTMLEmbedElement.js"),
        tags: ["embed"]
    },
    HTMLFieldSetElement: {
        file: require("./generated/HTMLFieldSetElement.js"),
        tags: ["fieldset"]
    },
    HTMLFontElement: {
        file: require("./generated/HTMLFontElement.js"),
        tags: ["font"]
    },
    HTMLFormElement: {
        file: require("./generated/HTMLFormElement.js"),
        tags: ["form"]
    },
    HTMLFrameElement: {
        file: require("./generated/HTMLFrameElement.js"),
        tags: ["frame"]
    },
    HTMLFrameSetElement: {
        file: require("./generated/HTMLFrameSetElement.js"),
        tags: ["frameset"]
    },
    HTMLHeadingElement: {
        file: require("./generated/HTMLHeadingElement.js"),
        tags: ["h1", "h2", "h3", "h4", "h5", "h6"]
    },
    HTMLHeadElement: {
        file: require("./generated/HTMLHeadElement.js"),
        tags: ["head"]
    },
    HTMLHRElement: {
        file: require("./generated/HTMLHRElement.js"),
        tags: ["hr"]
    },
    HTMLHtmlElement: {
        file: require("./generated/HTMLHtmlElement.js"),
        tags: ["html"]
    },
    HTMLIFrameElement: {
        file: require("./generated/HTMLIFrameElement.js"),
        tags: ["iframe"]
    },
    HTMLImageElement: {
        file: require("./generated/HTMLImageElement.js"),
        tags: ["img"]
    },
    HTMLInputElement: {
        file: require("./generated/HTMLInputElement.js"),
        tags: ["input"]
    },
    HTMLLabelElement: {
        file: require("./generated/HTMLLabelElement.js"),
        tags: ["label"]
    },
    HTMLLegendElement: {
        file: require("./generated/HTMLLegendElement.js"),
        tags: ["legend"]
    },
    HTMLLIElement: {
        file: require("./generated/HTMLLIElement.js"),
        tags: ["li"]
    },
    HTMLLinkElement: {
        file: require("./generated/HTMLLinkElement.js"),
        tags: ["link"]
    },
    HTMLMapElement: {
        file: require("./generated/HTMLMapElement.js"),
        tags: ["map"]
    },
    HTMLMediaElement: {
        file: require("./generated/HTMLMediaElement.js"),
        tags: []
    },
    HTMLMenuElement: {
        file: require("./generated/HTMLMenuElement.js"),
        tags: ["menu"]
    },
    HTMLMetaElement: {
        file: require("./generated/HTMLMetaElement.js"),
        tags: ["meta"]
    },
    HTMLMeterElement: {
        file: require("./generated/HTMLMeterElement.js"),
        tags: ["meter"]
    },
    HTMLModElement: {
        file: require("./generated/HTMLModElement.js"),
        tags: ["del", "ins"]
    },
    HTMLObjectElement: {
        file: require("./generated/HTMLObjectElement.js"),
        tags: ["object"]
    },
    HTMLOListElement: {
        file: require("./generated/HTMLOListElement.js"),
        tags: ["ol"]
    },
    HTMLOptGroupElement: {
        file: require("./generated/HTMLOptGroupElement.js"),
        tags: ["optgroup"]
    },
    HTMLOptionElement: {
        file: require("./generated/HTMLOptionElement.js"),
        tags: ["option"]
    },
    HTMLOutputElement: {
        file: require("./generated/HTMLOutputElement.js"),
        tags: ["output"]
    },
    HTMLParagraphElement: {
        file: require("./generated/HTMLParagraphElement.js"),
        tags: ["p"]
    },
    HTMLParamElement: {
        file: require("./generated/HTMLParamElement.js"),
        tags: ["param"]
    },
    HTMLPreElement: {
        file: require("./generated/HTMLPreElement.js"),
        tags: ["pre"]
    },
    HTMLProgressElement: {
        file: require("./generated/HTMLProgressElement.js"),
        tags: ["progress"]
    },
    HTMLQuoteElement: {
        file: require("./generated/HTMLQuoteElement.js"),
        tags: ["blockquote", "q"]
    },
    HTMLScriptElement: {
        file: require("./generated/HTMLScriptElement.js"),
        tags: ["script"]
    },
    HTMLSelectElement: {
        file: require("./generated/HTMLSelectElement.js"),
        tags: ["select"]
    },
    HTMLSourceElement: {
        file: require("./generated/HTMLSourceElement.js"),
        tags: ["source"]
    },
    HTMLSpanElement: {
        file: require("./generated/HTMLSpanElement.js"),
        tags: ["span"]
    },
    HTMLStyleElement: {
        file: require("./generated/HTMLStyleElement.js"),
        tags: ["style"]
    },
    HTMLTableCaptionElement: {
        file: require("./generated/HTMLTableCaptionElement.js"),
        tags: ["caption"]
    },
    HTMLTableCellElement: {
        file: require("./generated/HTMLTableCellElement.js"),
        tags: []
    },
    HTMLTableColElement: {
        file: require("./generated/HTMLTableColElement.js"),
        tags: ["col", "colgroup"]
    },
    HTMLTableDataCellElement: {
        file: require("./generated/HTMLTableDataCellElement.js"),
        tags: ["td"]
    },
    HTMLTableElement: {
        file: require("./generated/HTMLTableElement.js"),
        tags: ["table"]
    },
    HTMLTableHeaderCellElement: {
        file: require("./generated/HTMLTableHeaderCellElement.js"),
        tags: ["th"]
    },
    HTMLTimeElement: {
        file: require("./generated/HTMLTimeElement.js"),
        tags: ["time"]
    },
    HTMLTitleElement: {
        file: require("./generated/HTMLTitleElement.js"),
        tags: ["title"]
    },
    HTMLTableRowElement: {
        file: require("./generated/HTMLTableRowElement.js"),
        tags: ["tr"]
    },
    HTMLTableSectionElement: {
        file: require("./generated/HTMLTableSectionElement.js"),
        tags: ["thead", "tbody", "tfoot"]
    },
    HTMLTemplateElement: {
        file: require("./generated/HTMLTemplateElement.js"),
        tags: ["template"]
    },
    HTMLTextAreaElement: {
        file: require("./generated/HTMLTextAreaElement.js"),
        tags: ["textarea"]
    },
    HTMLTrackElement: {
        file: require("./generated/HTMLTrackElement.js"),
        tags: ["track"]
    },
    HTMLUListElement: {
        file: require("./generated/HTMLUListElement.js"),
        tags: ["ul"]
    },
    HTMLUnknownElement: {
        file: require("./generated/HTMLUnknownElement.js"),
        tags: []
    },
    HTMLVideoElement: {
        file: require("./generated/HTMLVideoElement.js"),
        tags: ["video"]
    }
};
module.exports = function (core) {
    var _loop_3 = function (interfaceName) {
        var file = mappings[interfaceName].file;
        var tags = mappings[interfaceName].tags;
        core[interfaceName] = file.interface;
        var _loop_4 = function (tagName) {
            DocumentImpl.implementation.prototype._elementBuilders[tagName] = function (document, elName) {
                return file.create([], {
                    core: core,
                    ownerDocument: document,
                    localName: elName || tagName.toUpperCase()
                });
            };
        };
        for (var _i = 0, tags_1 = tags; _i < tags_1.length; _i++) {
            var tagName = tags_1[_i];
            _loop_4(tagName);
        }
    };
    for (var _i = 0, _a = Object.keys(mappings); _i < _a.length; _i++) {
        var interfaceName = _a[_i];
        _loop_3(interfaceName);
    }
};
"use strict";
var cssom = require("cssom");
var cssstyle = require("cssstyle");
module.exports = function (core) {
    // What works now:
    // - Accessing the rules defined in individual stylesheets
    // - Modifications to style content attribute are reflected in style property
    // - Modifications to style property are reflected in style content attribute
    // TODO
    // - Modifications to style element's textContent are reflected in sheet property.
    // - Modifications to style element's sheet property are reflected in textContent.
    // - Modifications to link.href property are reflected in sheet property.
    // - Less-used features of link: disabled
    // - Less-used features of style: disabled, scoped, title
    // - CSSOM-View
    //   - getComputedStyle(): requires default stylesheet, cascading, inheritance,
    //     filtering by @media (screen? print?), layout for widths/heights
    // - Load events are not in the specs, but apparently some browsers
    //   implement something. Should onload only fire after all @imports have been
    //   loaded, or only the primary sheet?
    core.StyleSheet = cssom.StyleSheet;
    core.MediaList = cssom.MediaList;
    core.CSSStyleSheet = cssom.CSSStyleSheet;
    core.CSSRule = cssom.CSSRule;
    core.CSSStyleRule = cssom.CSSStyleRule;
    core.CSSMediaRule = cssom.CSSMediaRule;
    core.CSSImportRule = cssom.CSSImportRule;
    core.CSSStyleDeclaration = cssstyle.CSSStyleDeclaration;
    // Relavant specs
    // http://www.w3.org/TR/DOM-Level-2-Style (2000)
    // http://www.w3.org/TR/cssom-view/ (2008)
    // http://dev.w3.org/csswg/cssom/ (2010) Meant to replace DOM Level 2 Style
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/ HTML5, of course
    // http://dev.w3.org/csswg/css-style-attr/  not sure what's new here
    // Objects that aren't in cssom library but should be:
    //   CSSRuleList  (cssom just uses array)
    //   CSSFontFaceRule
    //   CSSPageRule
    // These rules don't really make sense to implement, so CSSOM draft makes them
    // obsolete.
    //   CSSCharsetRule
    //   CSSUnknownRule
    // These objects are considered obsolete by CSSOM draft, although modern
    // browsers implement them.
    //   CSSValue
    //   CSSPrimitiveValue
    //   CSSValueList
    //   RGBColor
    //   Rect
    //   Counter
    // http://dev.w3.org/csswg/cssom/#stylesheetlist
    function StyleSheetList() { }
    StyleSheetList.prototype.__proto__ = Array.prototype;
    StyleSheetList.prototype.item = function item(i) {
        return Object.prototype.hasOwnProperty.call(this, i) ? this[i] : null;
    };
    core.StyleSheetList = StyleSheetList;
};
/** Here is yet another implementation of XPath 1.0 in Javascript.
 *
 * My goal was to make it relatively compact, but as I fixed all the axis bugs
 * the axes became more and more complicated. :-(.
 *
 * I have not implemented namespaces or case-sensitive axes for XML yet.
 *
 * How to test it in Chrome: You can make a Chrome extension that replaces
 * the WebKit XPath parser with this one. But it takes a bit of effort to
 * get around isolated world and same-origin restrictions:
 * manifest.json:
    {
      "name": "XPathTest",
      "version": "0.1",
      "content_scripts": [{
        "matches": ["http://localhost/*"],  // or wildcard host
        "js": ["xpath.js", "injection.js"],
        "all_frames": true, "run_at": "document_start"
      }]
    }
 * injection.js:
    // goal: give my xpath object to the website's JS context.
    var script = document.createElement('script');
    script.textContent =
        "document.addEventListener('xpathextend', function(e) {\n" +
        "  console.log('extending document with xpath...');\n" +
        "  e.detail(window);" +
        "});";
    document.documentElement.appendChild(script);
    document.documentElement.removeChild(script);
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('xpathextend', true, true, this.xpath.extend);
    document.dispatchEvent(evt);
 */
module.exports = function (core) {
    var xpath = {};
    // Helper function to deal with the migration of Attr to no longer have a nodeName property despite this codebase
    // assuming it does.
    function getNodeName(nodeOrAttr) {
        return nodeOrAttr.constructor.name === 'Attr' ? nodeOrAttr.name : nodeOrAttr.nodeName;
    }
    /***************************************************************************
     *                            Tokenization                                 *
     ***************************************************************************/
    /**
     * The XPath lexer is basically a single regular expression, along with
     * some helper functions to pop different types.
     */
    var Stream = xpath.Stream = function Stream(str) {
        this.original = this.str = str;
        this.peeked = null;
        // TODO: not really needed, but supposedly tokenizer also disambiguates
        // a * b vs. node test *
        this.prev = null; // for debugging
        this.prevprev = null;
    };
    Stream.prototype = {
        peek: function () {
            if (this.peeked)
                return this.peeked;
            var m = this.re.exec(this.str);
            if (!m)
                return null;
            this.str = this.str.substr(m[0].length);
            return this.peeked = m[1];
        },
        /** Peek 2 tokens ahead. */
        peek2: function () {
            this.peek(); // make sure this.peeked is set
            var m = this.re.exec(this.str);
            if (!m)
                return null;
            return m[1];
        },
        pop: function () {
            var r = this.peek();
            this.peeked = null;
            this.prevprev = this.prev;
            this.prev = r;
            return r;
        },
        trypop: function (tokens) {
            var tok = this.peek();
            if (tok === tokens)
                return this.pop();
            if (Array.isArray(tokens)) {
                for (var i = 0; i < tokens.length; ++i) {
                    var t = tokens[i];
                    if (t == tok)
                        return this.pop();
                    ;
                }
            }
        },
        trypopfuncname: function () {
            var tok = this.peek();
            if (!this.isQnameRe.test(tok))
                return null;
            switch (tok) {
                case 'comment':
                case 'text':
                case 'processing-instruction':
                case 'node':
                    return null;
            }
            if ('(' != this.peek2())
                return null;
            return this.pop();
        },
        trypopaxisname: function () {
            var tok = this.peek();
            switch (tok) {
                case 'ancestor':
                case 'ancestor-or-self':
                case 'attribute':
                case 'child':
                case 'descendant':
                case 'descendant-or-self':
                case 'following':
                case 'following-sibling':
                case 'namespace':
                case 'parent':
                case 'preceding':
                case 'preceding-sibling':
                case 'self':
                    if ('::' == this.peek2())
                        return this.pop();
            }
            return null;
        },
        trypopnametest: function () {
            var tok = this.peek();
            if ('*' === tok || this.startsWithNcNameRe.test(tok))
                return this.pop();
            return null;
        },
        trypopliteral: function () {
            var tok = this.peek();
            if (null == tok)
                return null;
            var first = tok.charAt(0);
            var last = tok.charAt(tok.length - 1);
            if ('"' === first && '"' === last ||
                "'" === first && "'" === last) {
                this.pop();
                return tok.substr(1, tok.length - 2);
            }
        },
        trypopnumber: function () {
            var tok = this.peek();
            if (this.isNumberRe.test(tok))
                return parseFloat(this.pop());
            else
                return null;
        },
        trypopvarref: function () {
            var tok = this.peek();
            if (null == tok)
                return null;
            if ('$' === tok.charAt(0))
                return this.pop().substr(1);
            else
                return null;
        },
        position: function () {
            return this.original.length - this.str.length;
        }
    };
    (function () {
        // http://www.w3.org/TR/REC-xml-names/#NT-NCName
        var nameStartCharsExceptColon = 'A-Z_a-z\xc0-\xd6\xd8-\xf6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF' +
            '\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF' +
            '\uFDF0-\uFFFD'; // JS doesn't support [#x10000-#xEFFFF]
        var nameCharExceptColon = nameStartCharsExceptColon +
            '\\-\\.0-9\xb7\u0300-\u036F\u203F-\u2040';
        var ncNameChars = '[' + nameStartCharsExceptColon +
            '][' + nameCharExceptColon + ']*';
        // http://www.w3.org/TR/REC-xml-names/#NT-QName
        var qNameChars = ncNameChars + '(?::' + ncNameChars + ')?';
        var otherChars = '\\.\\.|[\\(\\)\\[\\].@,]|::'; // .. must come before [.]
        var operatorChars = 'and|or|mod|div|' +
            '//|!=|<=|>=|[*/|+\\-=<>]'; // //, !=, <=, >= before individual ones.
        var literal = '"[^"]*"|' + "'[^']*'";
        var numberChars = '[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+';
        var variableReference = '\\$' + qNameChars;
        var nameTestChars = '\\*|' + ncNameChars + ':\\*|' + qNameChars;
        var optionalSpace = '[ \t\r\n]*'; // stricter than regexp \s.
        var nodeType = 'comment|text|processing-instruction|node';
        var re = new RegExp(
        // numberChars before otherChars so that leading-decimal doesn't become .
        '^' + optionalSpace + '(' + numberChars + '|' + otherChars + '|' +
            nameTestChars + '|' + operatorChars + '|' + literal + '|' +
            variableReference + ')');
        Stream.prototype.re = re;
        Stream.prototype.startsWithNcNameRe = new RegExp('^' + ncNameChars);
        Stream.prototype.isQnameRe = new RegExp('^' + qNameChars + '$');
        Stream.prototype.isNumberRe = new RegExp('^' + numberChars + '$');
    })();
    /***************************************************************************
     *                               Parsing                                   *
     ***************************************************************************/
    var parse = xpath.parse = function parse(stream, a) {
        var r = orExpr(stream, a);
        var x, unparsed = [];
        while (x = stream.pop()) {
            unparsed.push(x);
        }
        if (unparsed.length)
            throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                ': Unparsed tokens: ' + unparsed.join(' '));
        return r;
    };
    /**
     * binaryL  ::= subExpr
     *            | binaryL op subExpr
     * so a op b op c becomes ((a op b) op c)
     */
    function binaryL(subExpr, stream, a, ops) {
        var lhs = subExpr(stream, a);
        if (lhs == null)
            return null;
        var op;
        while (op = stream.trypop(ops)) {
            var rhs = subExpr(stream, a);
            if (rhs == null)
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': Expected something after ' + op);
            lhs = a.node(op, lhs, rhs);
        }
        return lhs;
    }
    /**
     * Too bad this is never used. If they made a ** operator (raise to power),
     ( we would use it.
     * binaryR  ::= subExpr
     *            | subExpr op binaryR
     * so a op b op c becomes (a op (b op c))
     */
    function binaryR(subExpr, stream, a, ops) {
        var lhs = subExpr(stream, a);
        if (lhs == null)
            return null;
        var op = stream.trypop(ops);
        if (op) {
            var rhs = binaryR(stream, a);
            if (rhs == null)
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': Expected something after ' + op);
            return a.node(op, lhs, rhs);
        }
        else {
            return lhs; // TODO
        }
    }
    /** [1] LocationPath::= RelativeLocationPath | AbsoluteLocationPath
     * e.g. a, a/b, //a/b
     */
    function locationPath(stream, a) {
        return absoluteLocationPath(stream, a) ||
            relativeLocationPath(null, stream, a);
    }
    /** [2] AbsoluteLocationPath::= '/' RelativeLocationPath? | AbbreviatedAbsoluteLocationPath
     *  [10] AbbreviatedAbsoluteLocationPath::= '//' RelativeLocationPath
     */
    function absoluteLocationPath(stream, a) {
        var op = stream.peek();
        if ('/' === op || '//' === op) {
            var lhs = a.node('Root');
            return relativeLocationPath(lhs, stream, a, true);
        }
        else {
            return null;
        }
    }
    /** [3] RelativeLocationPath::= Step | RelativeLocationPath '/' Step |
     *                            | AbbreviatedRelativeLocationPath
     *  [11] AbbreviatedRelativeLocationPath::= RelativeLocationPath '//' Step
     * e.g. p/a, etc.
     */
    function relativeLocationPath(lhs, stream, a, isOnlyRootOk) {
        if (null == lhs) {
            lhs = step(stream, a);
            if (null == lhs)
                return lhs;
        }
        var op;
        while (op = stream.trypop(['/', '//'])) {
            if ('//' === op) {
                lhs = a.node('/', lhs, a.node('Axis', 'descendant-or-self', 'node', undefined));
            }
            var rhs = step(stream, a);
            if (null == rhs && '/' === op && isOnlyRootOk)
                return lhs;
            else
                isOnlyRootOk = false;
            if (null == rhs)
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': Expected step after ' + op);
            lhs = a.node('/', lhs, rhs);
        }
        return lhs;
    }
    /** [4] Step::= AxisSpecifier NodeTest Predicate* | AbbreviatedStep
     *  [12] AbbreviatedStep::= '.' | '..'
     * e.g. @href, self::p, p, a[@href], ., ..
     */
    function step(stream, a) {
        var abbrStep = stream.trypop(['.', '..']);
        if ('.' === abbrStep)
            return a.node('Axis', 'self', 'node');
        if ('..' === abbrStep)
            return a.node('Axis', 'parent', 'node');
        var axis = axisSpecifier(stream, a);
        var nodeType = nodeTypeTest(stream, a);
        var nodeName;
        if (null == nodeType)
            nodeName = nodeNameTest(stream, a);
        if (null == axis && null == nodeType && null == nodeName)
            return null;
        if (null == nodeType && null == nodeName)
            throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                ': Expected nodeTest after axisSpecifier ' + axis);
        if (null == axis)
            axis = 'child';
        if (null == nodeType) {
            // When there's only a node name, then the node type is forced to be the
            // principal node type of the axis.
            // see http://www.w3.org/TR/xpath/#dt-principal-node-type
            if ('attribute' === axis)
                nodeType = 'attribute';
            else if ('namespace' === axis)
                nodeType = 'namespace';
            else
                nodeType = 'element';
        }
        var lhs = a.node('Axis', axis, nodeType, nodeName);
        var pred;
        while (null != (pred = predicate(lhs, stream, a))) {
            lhs = pred;
        }
        return lhs;
    }
    /** [5] AxisSpecifier::= AxisName '::' | AbbreviatedAxisSpecifier
     *  [6] AxisName::= 'ancestor' | 'ancestor-or-self' | 'attribute' | 'child'
     *                | 'descendant' | 'descendant-or-self' | 'following'
     *                | 'following-sibling' | 'namespace' | 'parent' |
     *                | 'preceding' | 'preceding-sibling' | 'self'
     *  [13] AbbreviatedAxisSpecifier::= '@'?
     */
    function axisSpecifier(stream, a) {
        var attr = stream.trypop('@');
        if (null != attr)
            return 'attribute';
        var axisName = stream.trypopaxisname();
        if (null != axisName) {
            var coloncolon = stream.trypop('::');
            if (null == coloncolon)
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': Should not happen. Should be ::.');
            return axisName;
        }
    }
    /** [7] NodeTest::= NameTest | NodeType '(' ')' | 'processing-instruction' '(' Literal ')'
     *  [38] NodeType::= 'comment' | 'text' | 'processing-instruction' | 'node'
     * I've split nodeTypeTest from nodeNameTest for convenience.
     */
    function nodeTypeTest(stream, a) {
        if ('(' !== stream.peek2()) {
            return null;
        }
        var type = stream.trypop(['comment', 'text', 'processing-instruction', 'node']);
        if (null != type) {
            if (null == stream.trypop('('))
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': Should not happen.');
            var param = undefined;
            if (type == 'processing-instruction') {
                param = stream.trypopliteral();
            }
            if (null == stream.trypop(')'))
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': Expected close parens.');
            return type;
        }
    }
    function nodeNameTest(stream, a) {
        var name = stream.trypopnametest();
        if (name != null)
            return name;
        else
            return null;
    }
    /** [8] Predicate::= '[' PredicateExpr ']'
     *  [9] PredicateExpr::= Expr
     */
    function predicate(lhs, stream, a) {
        if (null == stream.trypop('['))
            return null;
        var expr = orExpr(stream, a);
        if (null == expr)
            throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                ': Expected expression after [');
        if (null == stream.trypop(']'))
            throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                ': Expected ] after expression.');
        return a.node('Predicate', lhs, expr);
    }
    /** [14] Expr::= OrExpr
     */
    /** [15] PrimaryExpr::= VariableReference | '(' Expr ')' | Literal | Number | FunctionCall
     * e.g. $x,  (3+4),  "hi",  32,  f(x)
     */
    function primaryExpr(stream, a) {
        var x = stream.trypopliteral();
        if (null == x)
            x = stream.trypopnumber();
        if (null != x) {
            return x;
        }
        var varRef = stream.trypopvarref();
        if (null != varRef)
            return a.node('VariableReference', varRef);
        var funCall = functionCall(stream, a);
        if (null != funCall) {
            return funCall;
        }
        if (stream.trypop('(')) {
            var e = orExpr(stream, a);
            if (null == e)
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': Expected expression after (.');
            if (null == stream.trypop(')'))
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': Expected ) after expression.');
            return e;
        }
        return null;
    }
    /** [16] FunctionCall::= FunctionName '(' ( Argument ( ',' Argument )* )? ')'
     *  [17] Argument::= Expr
     */
    function functionCall(stream, a) {
        var name = stream.trypopfuncname(stream, a);
        if (null == name)
            return null;
        if (null == stream.trypop('('))
            throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                ': Expected ( ) after function name.');
        var params = [];
        var first = true;
        while (null == stream.trypop(')')) {
            if (!first && null == stream.trypop(','))
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': Expected , between arguments of the function.');
            first = false;
            var param = orExpr(stream, a);
            if (param == null)
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': Expected expression as argument of function.');
            params.push(param);
        }
        return a.node('FunctionCall', name, params);
    }
    /** [18] UnionExpr::= PathExpr | UnionExpr '|' PathExpr
     */
    function unionExpr(stream, a) { return binaryL(pathExpr, stream, a, '|'); }
    /** [19] PathExpr ::= LocationPath
     *                  | FilterExpr
     *                  | FilterExpr '/' RelativeLocationPath
     *                  | FilterExpr '//' RelativeLocationPath
     * Unlike most other nodes, this one always generates a node because
     * at this point all reverse nodesets must turn into a forward nodeset
     */
    function pathExpr(stream, a) {
        // We have to do FilterExpr before LocationPath because otherwise
        // LocationPath will eat up the name from a function call.
        var filter = filterExpr(stream, a);
        if (null == filter) {
            var loc = locationPath(stream, a);
            if (null == loc) {
                throw new Error;
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': The expression shouldn\'t be empty...');
            }
            return a.node('PathExpr', loc);
        }
        var rel = relativeLocationPath(filter, stream, a, false);
        if (filter === rel)
            return rel;
        else
            return a.node('PathExpr', rel);
    }
    /** [20] FilterExpr::= PrimaryExpr | FilterExpr Predicate
     * aka. FilterExpr ::= PrimaryExpr Predicate*
     */
    function filterExpr(stream, a) {
        var primary = primaryExpr(stream, a);
        if (primary == null)
            return null;
        var pred, lhs = primary;
        while (null != (pred = predicate(lhs, stream, a))) {
            lhs = pred;
        }
        return lhs;
    }
    /** [21] OrExpr::= AndExpr | OrExpr 'or' AndExpr
     */
    function orExpr(stream, a) {
        var orig = (stream.peeked || '') + stream.str;
        var r = binaryL(andExpr, stream, a, 'or');
        var now = (stream.peeked || '') + stream.str;
        return r;
    }
    /** [22] AndExpr::= EqualityExpr | AndExpr 'and' EqualityExpr
     */
    function andExpr(stream, a) { return binaryL(equalityExpr, stream, a, 'and'); }
    /** [23] EqualityExpr::= RelationalExpr | EqualityExpr '=' RelationalExpr
     *                     | EqualityExpr '!=' RelationalExpr
     */
    function equalityExpr(stream, a) { return binaryL(relationalExpr, stream, a, ['=', '!=']); }
    /** [24] RelationalExpr::= AdditiveExpr | RelationalExpr '<' AdditiveExpr
     *                       | RelationalExpr '>' AdditiveExpr
     *                       | RelationalExpr '<=' AdditiveExpr
     *                       | RelationalExpr '>=' AdditiveExpr
     */
    function relationalExpr(stream, a) { return binaryL(additiveExpr, stream, a, ['<', '>', '<=', '>=']); }
    /** [25] AdditiveExpr::= MultiplicativeExpr
     *                     | AdditiveExpr '+' MultiplicativeExpr
     *                     | AdditiveExpr '-' MultiplicativeExpr
     */
    function additiveExpr(stream, a) { return binaryL(multiplicativeExpr, stream, a, ['+', '-']); }
    /** [26] MultiplicativeExpr::= UnaryExpr
     *                           | MultiplicativeExpr MultiplyOperator UnaryExpr
     *                           | MultiplicativeExpr 'div' UnaryExpr
     *                           | MultiplicativeExpr 'mod' UnaryExpr
     */
    function multiplicativeExpr(stream, a) { return binaryL(unaryExpr, stream, a, ['*', 'div', 'mod']); }
    /** [27] UnaryExpr::= UnionExpr | '-' UnaryExpr
     */
    function unaryExpr(stream, a) {
        if (stream.trypop('-')) {
            var e = unaryExpr(stream, a);
            if (null == e)
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': Expected unary expression after -');
            return a.node('UnaryMinus', e);
        }
        else
            return unionExpr(stream, a);
    }
    var astFactory = {
        node: function () { return Array.prototype.slice.call(arguments); }
    };
    /***************************************************************************
     *                            Optimizations (TODO)                         *
     ***************************************************************************/
    /**
     * Some things I've been considering:
     * 1) a//b becomes a/descendant::b if there's no predicate that uses
     *    position() or last()
     * 2) axis[pred]: when pred doesn't use position, evaluate it just once per
     *    node in the node-set rather than once per (node, position, last).
     * For more optimizations, look up Gecko's optimizer:
     * http://mxr.mozilla.org/mozilla-central/source/content/xslt/src/xpath/txXPathOptimizer.cpp
     */
    // TODO
    function optimize(ast) {
    }
    /***************************************************************************
     *                           Evaluation: axes                              *
     ***************************************************************************/
    /**
     * Data types: For string, number, boolean, we just use Javascript types.
     * Node-sets have the form
     *    {nodes: [node, ...]}
     * or {nodes: [node, ...], pos: [[1], [2], ...], lasts: [[1], [2], ...]}
     *
     * Most of the time, only the node is used and the position information is
     * discarded. But if you use a predicate, we need to try every value of
     * position and last in case the predicate calls position() or last().
     */
    /**
     * The NodeMultiSet is a helper class to help generate
     * {nodes:[], pos:[], lasts:[]} structures. It is useful for the
     * descendant, descendant-or-self, following-sibling, and
     * preceding-sibling axes for which we can use a stack to organize things.
     */
    function NodeMultiSet(isReverseAxis) {
        this.nodes = [];
        this.pos = [];
        this.lasts = [];
        this.nextPos = [];
        this.seriesIndexes = []; // index within nodes that each series begins.
        this.isReverseAxis = isReverseAxis;
        this._pushToNodes = isReverseAxis ? Array.prototype.unshift : Array.prototype.push;
    }
    NodeMultiSet.prototype = {
        pushSeries: function pushSeries() {
            this.nextPos.push(1);
            this.seriesIndexes.push(this.nodes.length);
        },
        popSeries: function popSeries() {
            console.assert(0 < this.nextPos.length, this.nextPos);
            var last = this.nextPos.pop() - 1, indexInPos = this.nextPos.length, seriesBeginIndex = this.seriesIndexes.pop(), seriesEndIndex = this.nodes.length;
            for (var i = seriesBeginIndex; i < seriesEndIndex; ++i) {
                console.assert(indexInPos < this.lasts[i].length);
                console.assert(undefined === this.lasts[i][indexInPos]);
                this.lasts[i][indexInPos] = last;
            }
        },
        finalize: function () {
            if (null == this.nextPos)
                return this;
            console.assert(0 === this.nextPos.length);
            var lastsJSON = JSON.stringify(this.lasts);
            for (var i = 0; i < this.lasts.length; ++i) {
                for (var j = 0; j < this.lasts[i].length; ++j) {
                    console.assert(null != this.lasts[i][j], i + ',' + j + ':' + lastsJSON);
                }
            }
            this.pushSeries = this.popSeries = this.addNode = function () {
                throw new Error('Already finalized.');
            };
            return this;
        },
        addNode: function addNode(node) {
            console.assert(node);
            this._pushToNodes.call(this.nodes, node);
            this._pushToNodes.call(this.pos, this.nextPos.slice());
            this._pushToNodes.call(this.lasts, new Array(this.nextPos.length));
            for (var i = 0; i < this.nextPos.length; ++i)
                this.nextPos[i]++;
        },
        simplify: function () {
            this.finalize();
            return { nodes: this.nodes, pos: this.pos, lasts: this.lasts };
        }
    };
    function eachContext(nodeMultiSet) {
        var r = [];
        for (var i = 0; i < nodeMultiSet.nodes.length; i++) {
            var node = nodeMultiSet.nodes[i];
            if (!nodeMultiSet.pos) {
                r.push({ nodes: [node], pos: [[i + 1]], lasts: [[nodeMultiSet.nodes.length]] });
            }
            else {
                for (var j = 0; j < nodeMultiSet.pos[i].length; ++j) {
                    r.push({ nodes: [node], pos: [[nodeMultiSet.pos[i][j]]], lasts: [[nodeMultiSet.lasts[i][j]]] });
                }
            }
        }
        return r;
    }
    /** Matcher used in the axes.
     */
    function NodeMatcher(nodeTypeNum, nodeName, shouldLowerCase) {
        this.nodeTypeNum = nodeTypeNum;
        this.nodeName = nodeName;
        this.shouldLowerCase = shouldLowerCase;
        this.nodeNameTest =
            null == nodeName ? this._alwaysTrue :
                shouldLowerCase ? this._nodeNameLowerCaseEquals :
                    this._nodeNameEquals;
    }
    NodeMatcher.prototype = {
        matches: function matches(node) {
            if (0 === this.nodeTypeNum || this._nodeTypeMatches(node)) {
                return this.nodeNameTest(getNodeName(node));
            }
            return false;
        },
        _nodeTypeMatches: function (nodeOrAttr) {
            if (nodeOrAttr.constructor.name === 'Attr' && this.nodeTypeNum === 2) {
                return true;
            }
            return nodeOrAttr.nodeType === this.nodeTypeNum;
        },
        _alwaysTrue: function (name) { return true; },
        _nodeNameEquals: function _nodeNameEquals(name) {
            return this.nodeName === name;
        },
        _nodeNameLowerCaseEquals: function _nodeNameLowerCaseEquals(name) {
            return this.nodeName === name.toLowerCase();
        }
    };
    function followingSiblingHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase, shift, peek, followingNode, andSelf, isReverseAxis) {
        var matcher = new NodeMatcher(nodeTypeNum, nodeName, shouldLowerCase);
        var nodeMultiSet = new NodeMultiSet(isReverseAxis);
        while (0 < nodeList.length) {
            var node = shift.call(nodeList);
            console.assert(node != null);
            node = followingNode(node);
            nodeMultiSet.pushSeries();
            var numPushed = 1;
            while (null != node) {
                if (!andSelf && matcher.matches(node))
                    nodeMultiSet.addNode(node);
                if (node === peek.call(nodeList)) {
                    shift.call(nodeList);
                    nodeMultiSet.pushSeries();
                    numPushed++;
                }
                if (andSelf && matcher.matches(node))
                    nodeMultiSet.addNode(node);
                node = followingNode(node);
            }
            while (0 < numPushed--)
                nodeMultiSet.popSeries();
        }
        return nodeMultiSet;
    }
    /** Returns the next non-descendant node in document order.
     * This is the first node in following::node(), if node is the context.
     */
    function followingNonDescendantNode(node) {
        if (node.ownerElement) {
            if (node.ownerElement.firstChild)
                return node.ownerElement.firstChild;
            node = node.ownerElement;
        }
        do {
            if (node.nextSibling)
                return node.nextSibling;
        } while (node = node.parentNode);
        return null;
    }
    /** Returns the next node in a document-order depth-first search.
     * See the definition of document order[1]:
     *   1) element
     *   2) namespace nodes
     *   3) attributes
     *   4) children
     *   [1]: http://www.w3.org/TR/xpath/#dt-document-order
     */
    function followingNode(node) {
        if (node.ownerElement)
            node = node.ownerElement;
        if (null != node.firstChild)
            return node.firstChild;
        do {
            if (null != node.nextSibling) {
                return node.nextSibling;
            }
            node = node.parentNode;
        } while (node);
        return null;
    }
    /** Returns the previous node in document order (excluding attributes
     * and namespace nodes).
     */
    function precedingNode(node) {
        if (node.ownerElement)
            return node.ownerElement;
        if (null != node.previousSibling) {
            node = node.previousSibling;
            while (null != node.lastChild) {
                node = node.lastChild;
            }
            return node;
        }
        if (null != node.parentNode) {
            return node.parentNode;
        }
        return null;
    }
    /** This axis is inefficient if there are many nodes in the nodeList.
     * But I think it's a pretty useless axis so it's ok. */
    function followingHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
        var matcher = new NodeMatcher(nodeTypeNum, nodeName, shouldLowerCase);
        var nodeMultiSet = new NodeMultiSet(false);
        var cursor = nodeList[0];
        var unorderedFollowingStarts = [];
        for (var i = 0; i < nodeList.length; i++) {
            var node = nodeList[i];
            var start = followingNonDescendantNode(node);
            if (start)
                unorderedFollowingStarts.push(start);
        }
        if (0 === unorderedFollowingStarts.length)
            return { nodes: [] };
        var pos = [], nextPos = [];
        var started = 0;
        while (cursor = followingNode(cursor)) {
            for (var i = unorderedFollowingStarts.length - 1; i >= 0; i--) {
                if (cursor === unorderedFollowingStarts[i]) {
                    nodeMultiSet.pushSeries();
                    unorderedFollowingStarts.splice(i, i + 1);
                    started++;
                }
            }
            if (started && matcher.matches(cursor)) {
                nodeMultiSet.addNode(cursor);
            }
        }
        console.assert(0 === unorderedFollowingStarts.length);
        for (var i = 0; i < started; i++)
            nodeMultiSet.popSeries();
        return nodeMultiSet.finalize();
    }
    function precedingHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
        var matcher = new NodeMatcher(nodeTypeNum, nodeName, shouldLowerCase);
        var cursor = nodeList.pop();
        if (null == cursor)
            return { nodes: {} };
        var r = { nodes: [], pos: [], lasts: [] };
        var nextParents = [cursor.parentNode || cursor.ownerElement], nextPos = [1];
        while (cursor = precedingNode(cursor)) {
            if (cursor === nodeList[nodeList.length - 1]) {
                nextParents.push(nodeList.pop());
                nextPos.push(1);
            }
            var matches = matcher.matches(cursor);
            var pos, someoneUsed = false;
            if (matches)
                pos = nextPos.slice();
            for (var i = 0; i < nextParents.length; ++i) {
                if (cursor === nextParents[i]) {
                    nextParents[i] = cursor.parentNode || cursor.ownerElement;
                    if (matches) {
                        pos[i] = null;
                    }
                }
                else {
                    if (matches) {
                        pos[i] = nextPos[i]++;
                        someoneUsed = true;
                    }
                }
            }
            if (someoneUsed) {
                r.nodes.unshift(cursor);
                r.pos.unshift(pos);
            }
        }
        for (var i = 0; i < r.pos.length; ++i) {
            var lasts = [];
            r.lasts.push(lasts);
            for (var j = r.pos[i].length - 1; j >= 0; j--) {
                if (null == r.pos[i][j]) {
                    r.pos[i].splice(j, j + 1);
                }
                else {
                    lasts.unshift(nextPos[j] - 1);
                }
            }
        }
        return r;
    }
    /** node-set, axis -> node-set */
    function descendantDfs(nodeMultiSet, node, remaining, matcher, andSelf, attrIndices, attrNodes) {
        while (0 < remaining.length && null != remaining[0].ownerElement) {
            var attr = remaining.shift();
            if (andSelf && matcher.matches(attr)) {
                attrNodes.push(attr);
                attrIndices.push(nodeMultiSet.nodes.length);
            }
        }
        if (null != node && !andSelf) {
            if (matcher.matches(node))
                nodeMultiSet.addNode(node);
        }
        var pushed = false;
        if (null == node) {
            if (0 === remaining.length)
                return;
            node = remaining.shift();
            nodeMultiSet.pushSeries();
            pushed = true;
        }
        else if (0 < remaining.length && node === remaining[0]) {
            nodeMultiSet.pushSeries();
            pushed = true;
            remaining.shift();
        }
        if (andSelf) {
            if (matcher.matches(node))
                nodeMultiSet.addNode(node);
        }
        // TODO: use optimization. Also try element.getElementsByTagName
        // var nodeList = 1 === nodeTypeNum && null != node.children ? node.children : node.childNodes;
        var nodeList = node.childNodes;
        for (var j = 0; j < nodeList.length; ++j) {
            var child = nodeList[j];
            descendantDfs(nodeMultiSet, child, remaining, matcher, andSelf, attrIndices, attrNodes);
        }
        if (pushed) {
            nodeMultiSet.popSeries();
        }
    }
    function descenantHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase, andSelf) {
        var matcher = new NodeMatcher(nodeTypeNum, nodeName, shouldLowerCase);
        var nodeMultiSet = new NodeMultiSet(false);
        var attrIndices = [], attrNodes = [];
        while (0 < nodeList.length) {
            // var node = nodeList.shift();
            descendantDfs(nodeMultiSet, null, nodeList, matcher, andSelf, attrIndices, attrNodes);
        }
        nodeMultiSet.finalize();
        for (var i = attrNodes.length - 1; i >= 0; --i) {
            nodeMultiSet.nodes.splice(attrIndices[i], attrIndices[i], attrNodes[i]);
            nodeMultiSet.pos.splice(attrIndices[i], attrIndices[i], [1]);
            nodeMultiSet.lasts.splice(attrIndices[i], attrIndices[i], [1]);
        }
        return nodeMultiSet;
    }
    /**
     */
    function ancestorHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase, andSelf) {
        var matcher = new NodeMatcher(nodeTypeNum, nodeName, shouldLowerCase);
        var ancestors = []; // array of non-empty arrays of matching ancestors
        for (var i = 0; i < nodeList.length; ++i) {
            var node = nodeList[i];
            var isFirst = true;
            var a = [];
            while (null != node) {
                if (!isFirst || andSelf) {
                    if (matcher.matches(node))
                        a.push(node);
                }
                isFirst = false;
                node = node.parentNode || node.ownerElement;
            }
            if (0 < a.length)
                ancestors.push(a);
        }
        var lasts = [];
        for (var i = 0; i < ancestors.length; ++i)
            lasts.push(ancestors[i].length);
        var nodeMultiSet = new NodeMultiSet(true);
        var newCtx = { nodes: [], pos: [], lasts: [] };
        while (0 < ancestors.length) {
            var pos = [ancestors[0].length];
            var last = [lasts[0]];
            var node = ancestors[0].pop();
            for (var i = ancestors.length - 1; i > 0; --i) {
                if (node === ancestors[i][ancestors[i].length - 1]) {
                    pos.push(ancestors[i].length);
                    last.push(lasts[i]);
                    ancestors[i].pop();
                    if (0 === ancestors[i].length) {
                        ancestors.splice(i, i + 1);
                        lasts.splice(i, i + 1);
                    }
                }
            }
            if (0 === ancestors[0].length) {
                ancestors.shift();
                lasts.shift();
            }
            newCtx.nodes.push(node);
            newCtx.pos.push(pos);
            newCtx.lasts.push(last);
        }
        return newCtx;
    }
    /** Helper function for sortDocumentOrder. Returns a list of indices, from the
     * node to the root, of positions within parent.
     * For convenience, the node is the first element of the array.
     */
    function addressVector(node) {
        var r = [node];
        if (null != node.ownerElement) {
            node = node.ownerElement;
            r.push(-1);
        }
        while (null != node) {
            var i = 0;
            while (null != node.previousSibling) {
                node = node.previousSibling;
                i++;
            }
            r.push(i);
            node = node.parentNode;
        }
        return r;
    }
    function addressComparator(a, b) {
        var minlen = Math.min(a.length - 1, b.length - 1), // not including [0]=node
        alen = a.length, blen = b.length;
        if (a[0] === b[0])
            return 0;
        var c;
        for (var i = 0; i < minlen; ++i) {
            c = a[alen - i - 1] - b[blen - i - 1];
            if (0 !== c)
                break;
        }
        if (null == c || 0 === c) {
            // All equal until one of the nodes. The longer one is the descendant.
            c = alen - blen;
        }
        if (0 === c)
            c = getNodeName(a) - getNodeName(b);
        if (0 === c)
            c = 1;
        return c;
    }
    var sortUniqDocumentOrder = xpath.sortUniqDocumentOrder = function (nodes) {
        var a = [];
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var v = addressVector(node);
            a.push(v);
        }
        a.sort(addressComparator);
        var b = [];
        for (var i = 0; i < a.length; i++) {
            if (0 < i && a[i][0] === a[i - 1][0])
                continue;
            b.push(a[i][0]);
        }
        return b;
    };
    /** Sort node multiset. Does not do any de-duping. */
    function sortNodeMultiSet(nodeMultiSet) {
        var a = [];
        for (var i = 0; i < nodeMultiSet.nodes.length; i++) {
            var v = addressVector(nodeMultiSet.nodes[i]);
            a.push({ v: v, n: nodeMultiSet.nodes[i],
                p: nodeMultiSet.pos[i], l: nodeMultiSet.lasts[i] });
        }
        a.sort(compare);
        var r = { nodes: [], pos: [], lasts: [] };
        for (var i = 0; i < a.length; ++i) {
            r.nodes.push(a[i].n);
            r.pos.push(a[i].p);
            r.lasts.push(a[i].l);
        }
        function compare(x, y) {
            return addressComparator(x.v, y.v);
        }
        return r;
    }
    /** Returns an array containing all the ancestors down to a node.
     * The array starts with document.
     */
    function nodeAndAncestors(node) {
        var ancestors = [node];
        var p = node;
        while (p = p.parentNode || p.ownerElement) {
            ancestors.unshift(p);
        }
        return ancestors;
    }
    function compareSiblings(a, b) {
        if (a === b)
            return 0;
        var c = a;
        while (c = c.previousSibling) {
            if (c === b)
                return 1; // b < a
        }
        c = b;
        while (c = c.previousSibling) {
            if (c === a)
                return -1; // a < b
        }
        throw new Error('a and b are not siblings: ' + xpath.stringifyObject(a) + ' vs ' + xpath.stringifyObject(b));
    }
    /** The merge in merge-sort.*/
    function mergeNodeLists(x, y) {
        var a, b, aanc, banc, r = [];
        if ('object' !== typeof x)
            throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Invalid LHS for | operator ' +
                '(expected node-set): ' + x);
        if ('object' !== typeof y)
            throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Invalid LHS for | operator ' +
                '(expected node-set): ' + y);
        while (true) {
            if (null == a) {
                a = x.shift();
                if (null != a)
                    aanc = addressVector(a);
            }
            if (null == b) {
                b = y.shift();
                if (null != b)
                    banc = addressVector(b);
            }
            if (null == a || null == b)
                break;
            var c = addressComparator(aanc, banc);
            if (c < 0) {
                r.push(a);
                a = null;
                aanc = null;
            }
            else if (c > 0) {
                r.push(b);
                b = null;
                banc = null;
            }
            else if (getNodeName(a) < getNodeName(b)) {
                r.push(a);
                a = null;
                aanc = null;
            }
            else if (getNodeName(a) > getNodeName(b)) {
                r.push(b);
                b = null;
                banc = null;
            }
            else if (a !== b) {
                // choose b arbitrarily
                r.push(b);
                b = null;
                banc = null;
            }
            else {
                console.assert(a === b, c);
                // just skip b without pushing it.
                b = null;
                banc = null;
            }
        }
        while (a) {
            r.push(a);
            a = x.shift();
        }
        while (b) {
            r.push(b);
            b = y.shift();
        }
        return r;
    }
    function comparisonHelper(test, x, y, isNumericComparison) {
        var coersion;
        if (isNumericComparison)
            coersion = fn.number;
        else
            coersion =
                'boolean' === typeof x || 'boolean' === typeof y ? fn['boolean'] :
                    'number' === typeof x || 'number' === typeof y ? fn.number :
                        fn.string;
        if ('object' === typeof x && 'object' === typeof y) {
            var aMap = {};
            for (var i = 0; i < x.nodes.length; ++i) {
                var xi = coersion({ nodes: [x.nodes[i]] });
                for (var j = 0; j < y.nodes.length; ++j) {
                    var yj = coersion({ nodes: [y.nodes[j]] });
                    if (test(xi, yj))
                        return true;
                }
            }
            return false;
        }
        else if ('object' === typeof x && x.nodes && x.nodes.length) {
            for (var i = 0; i < x.nodes.length; ++i) {
                var xi = coersion({ nodes: [x.nodes[i]] }), yc = coersion(y);
                if (test(xi, yc))
                    return true;
            }
            return false;
        }
        else if ('object' === typeof y && x.nodes && x.nodes.length) {
            for (var i = 0; i < x.nodes.length; ++i) {
                var yi = coersion({ nodes: [y.nodes[i]] }), xc = coersion(x);
                if (test(xc, yi))
                    return true;
            }
            return false;
        }
        else {
            var xc = coersion(x), yc = coersion(y);
            return test(xc, yc);
        }
    }
    var axes = xpath.axes = {
        'ancestor': function ancestor(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            return ancestorHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase, false);
        },
        'ancestor-or-self': function ancestorOrSelf(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            return ancestorHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase, true);
        },
        'attribute': function attribute(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            // TODO: figure out whether positions should be undefined here.
            var matcher = new NodeMatcher(nodeTypeNum, nodeName, shouldLowerCase);
            var nodeMultiSet = new NodeMultiSet(false);
            if (null != nodeName) {
                // TODO: with namespace
                for (var i = 0; i < nodeList.length; ++i) {
                    var node = nodeList[i];
                    if (null == node.getAttributeNode)
                        continue; // only Element has .getAttributeNode
                    var attr = node.getAttributeNode(nodeName);
                    if (null != attr && matcher.matches(attr)) {
                        nodeMultiSet.pushSeries();
                        nodeMultiSet.addNode(attr);
                        nodeMultiSet.popSeries();
                    }
                }
            }
            else {
                for (var i = 0; i < nodeList.length; ++i) {
                    var node = nodeList[i];
                    if (null != node.attributes) {
                        nodeMultiSet.pushSeries();
                        for (var j = 0; j < node.attributes.length; j++) {
                            var attr = node.attributes[j];
                            if (matcher.matches(attr))
                                nodeMultiSet.addNode(attr);
                        }
                        nodeMultiSet.popSeries();
                    }
                }
            }
            return nodeMultiSet.finalize();
        },
        'child': function child(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            var matcher = new NodeMatcher(nodeTypeNum, nodeName, shouldLowerCase);
            var nodeMultiSet = new NodeMultiSet(false);
            for (var i = 0; i < nodeList.length; ++i) {
                var n = nodeList[i];
                if (n.ownerElement)
                    continue;
                if (n.childNodes) {
                    nodeMultiSet.pushSeries();
                    var childList = 1 === nodeTypeNum && null != n.children ?
                        n.children : n.childNodes;
                    for (var j = 0; j < childList.length; ++j) {
                        var child = childList[j];
                        if (matcher.matches(child)) {
                            nodeMultiSet.addNode(child);
                        }
                    }
                    nodeMultiSet.popSeries();
                }
            }
            nodeMultiSet.finalize();
            return sortNodeMultiSet(nodeMultiSet);
        },
        'descendant': function descenant(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            return descenantHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase, false);
        },
        'descendant-or-self': function descenantOrSelf(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            return descenantHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase, true);
        },
        'following': function following(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            return followingHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase);
        },
        'following-sibling': function followingSibling(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            return followingSiblingHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase, Array.prototype.shift, function () { return this[0]; }, function (node) { return node.nextSibling; });
        },
        'namespace': function namespace(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            // TODO
        },
        'parent': function parent(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            var matcher = new NodeMatcher(nodeTypeNum, nodeName, shouldLowerCase);
            var nodes = [], pos = [];
            for (var i = 0; i < nodeList.length; ++i) {
                var parent = nodeList[i].parentNode || nodeList[i].ownerElement;
                if (null == parent)
                    continue;
                if (!matcher.matches(parent))
                    continue;
                if (nodes.length > 0 && parent === nodes[nodes.length - 1])
                    continue;
                nodes.push(parent);
                pos.push([1]);
            }
            return { nodes: nodes, pos: pos, lasts: pos };
        },
        'preceding': function preceding(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            return precedingHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase);
        },
        'preceding-sibling': function precedingSibling(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            return followingSiblingHelper(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase, Array.prototype.pop, function () { return this[this.length - 1]; }, function (node) { return node.previousSibling; }, false, true);
        },
        'self': function self(nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase) {
            var nodes = [], pos = [];
            var matcher = new NodeMatcher(nodeTypeNum, nodeName, shouldLowerCase);
            for (var i = 0; i < nodeList.length; ++i) {
                if (matcher.matches(nodeList[i])) {
                    nodes.push(nodeList[i]);
                    pos.push([1]);
                }
            }
            return { nodes: nodes, pos: pos, lasts: pos };
        }
    };
    /***************************************************************************
     *                         Evaluation: functions                           *
     ***************************************************************************/
    var fn = {
        'number': function number(optObject) {
            if ('number' === typeof optObject)
                return optObject;
            if ('string' === typeof optObject)
                return parseFloat(optObject); // note: parseFloat(' ') -> NaN, unlike +' ' -> 0.
            if ('boolean' === typeof optObject)
                return +optObject;
            return fn.number(fn.string.call(this, optObject)); // for node-sets
        },
        'string': function string(optObject) {
            if (null == optObject)
                return fn.string(this);
            if ('string' === typeof optObject || 'boolean' === typeof optObject ||
                'number' === typeof optObject)
                return '' + optObject;
            if (0 == optObject.nodes.length)
                return '';
            if (null != optObject.nodes[0].textContent)
                return optObject.nodes[0].textContent;
            return optObject.nodes[0].nodeValue;
        },
        'boolean': function booleanVal(x) {
            return 'object' === typeof x ? x.nodes.length > 0 : !!x;
        },
        'last': function last() {
            console.assert(Array.isArray(this.pos));
            console.assert(Array.isArray(this.lasts));
            console.assert(1 === this.pos.length);
            console.assert(1 === this.lasts.length);
            console.assert(1 === this.lasts[0].length);
            return this.lasts[0][0];
        },
        'position': function position() {
            console.assert(Array.isArray(this.pos));
            console.assert(Array.isArray(this.lasts));
            console.assert(1 === this.pos.length);
            console.assert(1 === this.lasts.length);
            console.assert(1 === this.pos[0].length);
            return this.pos[0][0];
        },
        'count': function count(nodeSet) {
            if ('object' !== typeof nodeSet)
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Position ' + stream.position() +
                    ': Function count(node-set) ' +
                    'got wrong argument type: ' + nodeSet);
            return nodeSet.nodes.length;
        },
        'id': function id(object) {
            var r = { nodes: [] };
            var doc = this.nodes[0].ownerDocument || this.nodes[0];
            console.assert(doc);
            var ids;
            if ('object' === typeof object) {
                // for node-sets, map id over each node value.
                ids = [];
                for (var i = 0; i < object.nodes.length; ++i) {
                    var idNode = object.nodes[i];
                    var idsString = fn.string({ nodes: [idNode] });
                    var a = idsString.split(/[ \t\r\n]+/g);
                    Array.prototype.push.apply(ids, a);
                }
            }
            else {
                var idsString = fn.string(object);
                var a = idsString.split(/[ \t\r\n]+/g);
                ids = a;
            }
            for (var i = 0; i < ids.length; ++i) {
                var id = ids[i];
                if (0 === id.length)
                    continue;
                var node = doc.getElementById(id);
                if (null != node)
                    r.nodes.push(node);
            }
            r.nodes = sortUniqDocumentOrder(r.nodes);
            return r;
        },
        'local-name': function (nodeSet) {
            if (null == nodeSet)
                return fn.name(this);
            if (null == nodeSet.nodes) {
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'argument to name() must be a node-set. got ' + nodeSet);
            }
            // TODO: namespaced version
            return nodeSet.nodes[0].localName;
        },
        'namespace-uri': function (nodeSet) {
            // TODO
            throw new Error('not implemented yet');
        },
        'name': function (nodeSet) {
            if (null == nodeSet)
                return fn.name(this);
            if (null == nodeSet.nodes) {
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'argument to name() must be a node-set. got ' + nodeSet);
            }
            return nodeSet.nodes[0].name;
        },
        'concat': function concat(x) {
            var l = [];
            for (var i = 0; i < arguments.length; ++i) {
                l.push(fn.string(arguments[i]));
            }
            return l.join('');
        },
        'starts-with': function startsWith(a, b) {
            var as = fn.string(a), bs = fn.string(b);
            return as.substr(0, bs.length) === bs;
        },
        'contains': function contains(a, b) {
            var as = fn.string(a), bs = fn.string(b);
            var i = as.indexOf(bs);
            if (-1 === i)
                return false;
            return true;
        },
        'substring-before': function substringBefore(a, b) {
            var as = fn.string(a), bs = fn.string(b);
            var i = as.indexOf(bs);
            if (-1 === i)
                return '';
            return as.substr(0, i);
        },
        'substring-after': function substringBefore(a, b) {
            var as = fn.string(a), bs = fn.string(b);
            var i = as.indexOf(bs);
            if (-1 === i)
                return '';
            return as.substr(i + bs.length);
        },
        'substring': function substring(string, start, optEnd) {
            if (null == string || null == start) {
                throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Must be at least 2 arguments to string()');
            }
            var sString = fn.string(string), iStart = fn.round(start), iEnd = optEnd == null ? null : fn.round(optEnd);
            // Note that xpath string positions user 1-based index
            if (iEnd == null)
                return sString.substr(iStart - 1);
            else
                return sString.substr(iStart - 1, iEnd);
        },
        'string-length': function stringLength(optString) {
            return fn.string.call(this, optString).length;
        },
        'normalize-space': function normalizeSpace(optString) {
            var s = fn.string.call(this, optString);
            return s.replace(/[ \t\r\n]+/g, ' ').replace(/^ | $/g, '');
        },
        'translate': function translate(string, from, to) {
            var sString = fn.string.call(this, string), sFrom = fn.string(from), sTo = fn.string(to);
            var eachCharRe = [];
            var map = {};
            for (var i = 0; i < sFrom.length; ++i) {
                var c = sFrom.charAt(i);
                map[c] = sTo.charAt(i); // returns '' if beyond length of sTo.
                // copied from goog.string.regExpEscape in the Closure library.
                eachCharRe.push(c.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').
                    replace(/\x08/g, '\\x08'));
            }
            var re = new RegExp(eachCharRe.join('|'), 'g');
            return sString.replace(re, function (c) { return map[c]; });
        },
        /// Boolean functions
        'not': function not(x) {
            var bx = fn['boolean'](x);
            return !bx;
        },
        'true': function trueVal() { return true; },
        'false': function falseVal() { return false; },
        // TODO
        'lang': function lang(string) { throw new Error('Not implemented'); },
        'sum': function sum(optNodeSet) {
            if (null == optNodeSet)
                return fn.sum(this);
            // for node-sets, map id over each node value.
            var sum = 0;
            for (var i = 0; i < optNodeSet.nodes.length; ++i) {
                var node = optNodeSet.nodes[i];
                var x = fn.number({ nodes: [node] });
                sum += x;
            }
            return sum;
        },
        'floor': function floor(number) {
            return Math.floor(fn.number(number));
        },
        'ceiling': function ceiling(number) {
            return Math.ceil(fn.number(number));
        },
        'round': function round(number) {
            return Math.round(fn.number(number));
        }
    };
    /***************************************************************************
     *                         Evaluation: operators                           *
     ***************************************************************************/
    var more = {
        UnaryMinus: function (x) { return -fn.number(x); },
        '+': function (x, y) { return fn.number(x) + fn.number(y); },
        '-': function (x, y) { return fn.number(x) - fn.number(y); },
        '*': function (x, y) { return fn.number(x) * fn.number(y); },
        'div': function (x, y) { return fn.number(x) / fn.number(y); },
        'mod': function (x, y) { return fn.number(x) % fn.number(y); },
        '<': function (x, y) {
            return comparisonHelper(function (x, y) { return fn.number(x) < fn.number(y); }, x, y, true);
        },
        '<=': function (x, y) {
            return comparisonHelper(function (x, y) { return fn.number(x) <= fn.number(y); }, x, y, true);
        },
        '>': function (x, y) {
            return comparisonHelper(function (x, y) { return fn.number(x) > fn.number(y); }, x, y, true);
        },
        '>=': function (x, y) {
            return comparisonHelper(function (x, y) { return fn.number(x) >= fn.number(y); }, x, y, true);
        },
        'and': function (x, y) { return fn['boolean'](x) && fn['boolean'](y); },
        'or': function (x, y) { return fn['boolean'](x) || fn['boolean'](y); },
        '|': function (x, y) { return { nodes: mergeNodeLists(x.nodes, y.nodes) }; },
        '=': function (x, y) {
            // optimization for two node-sets case: avoid n^2 comparisons.
            if ('object' === typeof x && 'object' === typeof y) {
                var aMap = {};
                for (var i = 0; i < x.nodes.length; ++i) {
                    var s = fn.string({ nodes: [x.nodes[i]] });
                    aMap[s] = true;
                }
                for (var i = 0; i < y.nodes.length; ++i) {
                    var s = fn.string({ nodes: [y.nodes[i]] });
                    if (aMap[s])
                        return true;
                }
                return false;
            }
            else {
                return comparisonHelper(function (x, y) { return x === y; }, x, y);
            }
        },
        '!=': function (x, y) {
            // optimization for two node-sets case: avoid n^2 comparisons.
            if ('object' === typeof x && 'object' === typeof y) {
                if (0 === x.nodes.length || 0 === y.nodes.length)
                    return false;
                var aMap = {};
                for (var i = 0; i < x.nodes.length; ++i) {
                    var s = fn.string({ nodes: [x.nodes[i]] });
                    aMap[s] = true;
                }
                for (var i = 0; i < y.nodes.length; ++i) {
                    var s = fn.string({ nodes: [y.nodes[i]] });
                    if (!aMap[s])
                        return true;
                }
                return false;
            }
            else {
                return comparisonHelper(function (x, y) { return x !== y; }, x, y);
            }
        }
    };
    var nodeTypes = xpath.nodeTypes = {
        'node': 0,
        'attribute': 2,
        'comment': 8,
        'text': 3,
        'processing-instruction': 7,
        'element': 1 //this.doc.ELEMENT_NODE
    };
    /** For debugging and unit tests: returnjs a stringified version of the
     * argument. */
    var stringifyObject = xpath.stringifyObject = function stringifyObject(ctx) {
        var seenKey = 'seen' + Math.floor(Math.random() * 1000000000);
        return JSON.stringify(helper(ctx));
        function helper(ctx) {
            if (Array.isArray(ctx)) {
                return ctx.map(function (x) { return helper(x); });
            }
            if ('object' !== typeof ctx)
                return ctx;
            if (null == ctx)
                return ctx;
            //  if (ctx.toString) return ctx.toString();
            if (null != ctx.outerHTML)
                return ctx.outerHTML;
            if (null != ctx.nodeValue)
                return ctx.nodeName + '=' + ctx.nodeValue;
            if (ctx[seenKey])
                return '[circular]';
            ctx[seenKey] = true;
            var nicer = {};
            for (var key in ctx) {
                if (seenKey === key)
                    continue;
                try {
                    nicer[key] = helper(ctx[key]);
                }
                catch (e) {
                    nicer[key] = '[exception: ' + e.message + ']';
                }
            }
            delete ctx[seenKey];
            return nicer;
        }
    };
    var Evaluator = xpath.Evaluator = function Evaluator(doc) {
        this.doc = doc;
    };
    Evaluator.prototype = {
        val: function val(ast, ctx) {
            console.assert(ctx.nodes);
            if ('number' === typeof ast || 'string' === typeof ast)
                return ast;
            if (more[ast[0]]) {
                var evaluatedParams = [];
                for (var i = 1; i < ast.length; ++i) {
                    evaluatedParams.push(this.val(ast[i], ctx));
                }
                var r = more[ast[0]].apply(ctx, evaluatedParams);
                return r;
            }
            switch (ast[0]) {
                case 'Root': return { nodes: [this.doc] };
                case 'FunctionCall':
                    var functionName = ast[1], functionParams = ast[2];
                    if (null == fn[functionName])
                        throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, 'Unknown function: ' + functionName);
                    var evaluatedParams = [];
                    for (var i = 0; i < functionParams.length; ++i) {
                        evaluatedParams.push(this.val(functionParams[i], ctx));
                    }
                    var r = fn[functionName].apply(ctx, evaluatedParams);
                    return r;
                case 'Predicate':
                    var lhs = this.val(ast[1], ctx);
                    var ret = { nodes: [] };
                    var contexts = eachContext(lhs);
                    for (var i = 0; i < contexts.length; ++i) {
                        var singleNodeSet = contexts[i];
                        var rhs = this.val(ast[2], singleNodeSet);
                        var success;
                        if ('number' === typeof rhs) {
                            success = rhs === singleNodeSet.pos[0][0];
                        }
                        else {
                            success = fn['boolean'](rhs);
                        }
                        if (success) {
                            var node = singleNodeSet.nodes[0];
                            ret.nodes.push(node);
                            // skip over all the rest of the same node.
                            while (i + 1 < contexts.length && node === contexts[i + 1].nodes[0]) {
                                i++;
                            }
                        }
                    }
                    return ret;
                case 'PathExpr':
                    // turn the path into an expressoin; i.e., remove the position
                    // information of the last axis.
                    var x = this.val(ast[1], ctx);
                    // Make the nodeset a forward-direction-only one.
                    if (x.finalize) {
                        return { nodes: x.nodes };
                    }
                    else {
                        return x;
                    }
                case '/':
                    // TODO: don't generate '/' nodes, just Axis nodes.
                    var lhs = this.val(ast[1], ctx);
                    console.assert(null != lhs);
                    var r = this.val(ast[2], lhs);
                    console.assert(null != r);
                    return r;
                case 'Axis':
                    // All the axis tests from Step. We only get AxisSpecifier NodeTest,
                    // not the predicate (which is applied later)
                    var axis = ast[1], nodeType = ast[2], nodeTypeNum = nodeTypes[nodeType], shouldLowerCase = true, // TODO: give option
                    nodeName = ast[3] && shouldLowerCase ? ast[3].toLowerCase() : ast[3];
                    nodeName = nodeName === '*' ? null : nodeName;
                    if ('object' !== typeof ctx)
                        return { nodes: [], pos: [] };
                    var nodeList = ctx.nodes.slice(); // TODO: is copy needed?
                    var r = axes[axis](nodeList /*destructive!*/, nodeTypeNum, nodeName, shouldLowerCase);
                    return r;
            }
        }
    };
    var evaluate = xpath.evaluate = function evaluate(expr, doc, context) {
        //var astFactory = new AstEvaluatorFactory(doc, context);
        var stream = new Stream(expr);
        var ast = parse(stream, astFactory);
        var val = new Evaluator(doc).val(ast, { nodes: [context] });
        return val;
    };
    /***************************************************************************
     *                           DOM interface                                 *
     ***************************************************************************/
    var XPathException = xpath.XPathException = function XPathException(code, message) {
        var e = new Error(message);
        e.name = 'XPathException';
        e.code = code;
        return e;
    };
    XPathException.INVALID_EXPRESSION_ERR = 51;
    XPathException.TYPE_ERR = 52;
    var XPathEvaluator = xpath.XPathEvaluator = function XPathEvaluator() { };
    XPathEvaluator.prototype = {
        createExpression: function (expression, resolver) {
            return new XPathExpression(expression, resolver);
        },
        createNSResolver: function (nodeResolver) {
            // TODO
        },
        evaluate: function evaluate(expression, contextNode, resolver, type, result) {
            var expr = new XPathExpression(expression, resolver);
            return expr.evaluate(contextNode, type, result);
        }
    };
    var XPathExpression = xpath.XPathExpression = function XPathExpression(expression, resolver, optDoc) {
        var stream = new Stream(expression);
        this._ast = parse(stream, astFactory);
        this._doc = optDoc;
    };
    XPathExpression.prototype = {
        evaluate: function evaluate(contextNode, type, result) {
            if (null == contextNode.nodeType)
                throw new Error('bad argument (expected context node): ' + contextNode);
            var doc = contextNode.ownerDocument || contextNode;
            if (null != this._doc && this._doc !== doc) {
                throw new core.DOMException(core.DOMException.WRONG_DOCUMENT_ERR, 'The document must be the same as the context node\'s document.');
            }
            var evaluator = new Evaluator(doc);
            var value = evaluator.val(this._ast, { nodes: [contextNode] });
            if (XPathResult.NUMBER_TYPE === type)
                value = fn.number(value);
            else if (XPathResult.STRING_TYPE === type)
                value = fn.string(value);
            else if (XPathResult.BOOLEAN_TYPE === type)
                value = fn['boolean'](value);
            else if (XPathResult.ANY_TYPE !== type &&
                XPathResult.UNORDERED_NODE_ITERATOR_TYPE !== type &&
                XPathResult.ORDERED_NODE_ITERATOR_TYPE !== type &&
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE !== type &&
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE !== type &&
                XPathResult.ANY_UNORDERED_NODE_TYPE !== type &&
                XPathResult.FIRST_ORDERED_NODE_TYPE !== type)
                throw new core.DOMException(core.DOMException.NOT_SUPPORTED_ERR, 'You must provide an XPath result type (0=any).');
            else if (XPathResult.ANY_TYPE !== type &&
                'object' !== typeof value)
                throw new XPathException(XPathException.TYPE_ERR, 'Value should be a node-set: ' + value);
            return new XPathResult(doc, value, type);
        }
    };
    var XPathResult = xpath.XPathResult = function XPathResult(doc, value, resultType) {
        this._value = value;
        this._resultType = resultType;
        this._i = 0;
        // TODO: we removed mutation events but didn't take care of this. No tests fail, so that's nice, but eventually we
        // should fix this, preferably by entirely replacing our XPath implementation.
        // this._invalidated = false;
        // if (this.resultType === XPathResult.UNORDERED_NODE_ITERATOR_TYPE ||
        //     this.resultType === XPathResult.ORDERED_NODE_ITERATOR_TYPE) {
        //   doc.addEventListener('DOMSubtreeModified', invalidate, true);
        //   var self = this;
        //   function invalidate() {
        //     self._invalidated = true;
        //     doc.removeEventListener('DOMSubtreeModified', invalidate, true);
        //   }
        // }
    };
    XPathResult.ANY_TYPE = 0;
    XPathResult.NUMBER_TYPE = 1;
    XPathResult.STRING_TYPE = 2;
    XPathResult.BOOLEAN_TYPE = 3;
    XPathResult.UNORDERED_NODE_ITERATOR_TYPE = 4;
    XPathResult.ORDERED_NODE_ITERATOR_TYPE = 5;
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE = 6;
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE = 7;
    XPathResult.ANY_UNORDERED_NODE_TYPE = 8;
    XPathResult.FIRST_ORDERED_NODE_TYPE = 9;
    var proto = {
        // XPathResultType
        get resultType() {
            if (this._resultType)
                return this._resultType;
            switch (typeof this._value) {
                case 'number': return XPathResult.NUMBER_TYPE;
                case 'string': return XPathResult.STRING_TYPE;
                case 'boolean': return XPathResult.BOOLEAN_TYPE;
                default: return XPathResult.UNORDERED_NODE_ITERATOR_TYPE;
            }
        },
        get numberValue() {
            if (XPathResult.NUMBER_TYPE !== this.resultType)
                throw new XPathException(XPathException.TYPE_ERR, 'You should have asked for a NUMBER_TYPE.');
            return this._value;
        },
        get stringValue() {
            if (XPathResult.STRING_TYPE !== this.resultType)
                throw new XPathException(XPathException.TYPE_ERR, 'You should have asked for a STRING_TYPE.');
            return this._value;
        },
        get booleanValue() {
            if (XPathResult.BOOLEAN_TYPE !== this.resultType)
                throw new XPathException(XPathException.TYPE_ERR, 'You should have asked for a BOOLEAN_TYPE.');
            return this._value;
        },
        get singleNodeValue() {
            if (XPathResult.ANY_UNORDERED_NODE_TYPE !== this.resultType &&
                XPathResult.FIRST_ORDERED_NODE_TYPE !== this.resultType)
                throw new XPathException(XPathException.TYPE_ERR, 'You should have asked for a FIRST_ORDERED_NODE_TYPE.');
            return this._value.nodes[0] || null;
        },
        get invalidIteratorState() {
            if (XPathResult.UNORDERED_NODE_ITERATOR_TYPE !== this.resultType &&
                XPathResult.ORDERED_NODE_ITERATOR_TYPE !== this.resultType)
                return false;
            return !!this._invalidated;
        },
        get snapshotLength() {
            if (XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE !== this.resultType &&
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE !== this.resultType)
                throw new XPathException(XPathException.TYPE_ERR, 'You should have asked for a ORDERED_NODE_SNAPSHOT_TYPE.');
            return this._value.nodes.length;
        },
        iterateNext: function iterateNext() {
            if (XPathResult.UNORDERED_NODE_ITERATOR_TYPE !== this.resultType &&
                XPathResult.ORDERED_NODE_ITERATOR_TYPE !== this.resultType)
                throw new XPathException(XPathException.TYPE_ERR, 'You should have asked for a ORDERED_NODE_ITERATOR_TYPE.');
            if (this.invalidIteratorState)
                throw new core.DOMException(core.DOMException.INVALID_STATE_ERR, 'The document has been mutated since the result was returned');
            return this._value.nodes[this._i++] || null;
        },
        snapshotItem: function snapshotItem(index) {
            if (XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE !== this.resultType &&
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE !== this.resultType)
                throw new XPathException(XPathException.TYPE_ERR, 'You should have asked for a ORDERED_NODE_SNAPSHOT_TYPE.');
            return this._value.nodes[index] || null;
        }
    };
    // so you can access ANY_TYPE etc. from the instances:
    XPathResult.prototype = Object.create(XPathResult, Object.keys(proto).reduce(function (descriptors, name) {
        descriptors[name] = Object.getOwnPropertyDescriptor(proto, name);
        return descriptors;
    }, {
        constructor: {
            value: XPathResult,
            writable: true,
            configurable: true
        }
    }));
    core.XPathException = XPathException;
    core.XPathExpression = XPathExpression;
    core.XPathResult = XPathResult;
    core.XPathEvaluator = XPathEvaluator;
    core.Document.prototype.createExpression =
        XPathEvaluator.prototype.createExpression;
    core.Document.prototype.createNSResolver =
        XPathEvaluator.prototype.createNSResolver;
    core.Document.prototype.evaluate = XPathEvaluator.prototype.evaluate;
    return xpath; // for tests
};
"use strict";
var addConstants = require("../utils").addConstants;
module.exports = function (core) {
    // https://dom.spec.whatwg.org/#interface-nodefilter
    core.NodeFilter = function () {
        throw new TypeError("Illegal constructor");
    };
    /**
     * Returns an unsigned short that will be used to tell if a given Node must
     * be accepted or not by the NodeIterator or TreeWalker iteration
     * algorithm. This method is expected to be written by the user of a
     * NodeFilter.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/NodeFilter
     * @interface
     *
     * @param  {Node} node DOM Node
     * @return {FILTER_ACCEPT|FILTER_REJECT|FILTER_SKIP}
     */
    core.NodeFilter.acceptNode = function () {
        throw new Error("This method is expected to be written by the user of a NodeFilter.");
    };
    addConstants(core.NodeFilter, {
        // Constants for whatToShow
        SHOW_ALL: 0xFFFFFFFF,
        SHOW_ELEMENT: 0x00000001,
        SHOW_ATTRIBUTE: 0x00000002,
        SHOW_TEXT: 0x00000004,
        SHOW_CDATA_SECTION: 0x00000008,
        SHOW_ENTITY_REFERENCE: 0x00000010,
        SHOW_ENTITY: 0x00000020,
        SHOW_PROCESSING_INSTRUCTION: 0x00000040,
        SHOW_COMMENT: 0x00000080,
        SHOW_DOCUMENT: 0x00000100,
        SHOW_DOCUMENT_TYPE: 0x00000200,
        SHOW_DOCUMENT_FRAGMENT: 0x00000400,
        SHOW_NOTATION: 0x00000800,
        // Constants returned by acceptNode
        FILTER_ACCEPT: 1,
        FILTER_REJECT: 2,
        FILTER_SKIP: 3
    });
};
"use strict";
var idlUtils = require("./generated/utils");
var domSymbolTree = require("./helpers/internal-constants").domSymbolTree;
var defineGetter = require("../utils").defineGetter;
var INTERNAL = Symbol("NodeIterator internal");
var DocumentImpl = require("./nodes/Document-impl").implementation;
module.exports = function (core) {
    // https://dom.spec.whatwg.org/#interface-nodeiterator
    function NodeIteratorInternal(document, root, whatToShow, filter) {
        this.active = true;
        this.document = document;
        this.root = root;
        this.referenceNode = root;
        this.pointerBeforeReferenceNode = true;
        this.whatToShow = whatToShow;
        this.filter = filter;
    }
    NodeIteratorInternal.prototype.throwIfNotActive = function () {
        // (only thrown for getters/methods that are affected by removing steps)
        if (!this.active) {
            throw Error("This NodeIterator is no longer active. " +
                "More than " + this.document._activeNodeIteratorsMax +
                " iterators are being used concurrently. " +
                "You can increase the 'concurrentNodeIterators' option to " +
                "make this error go away.");
        }
    };
    NodeIteratorInternal.prototype.traverse = function (next) {
        var node = this.referenceNode;
        var beforeNode = this.pointerBeforeReferenceNode;
        do {
            if (next) {
                if (!beforeNode) {
                    node = domSymbolTree.following(node, { root: this.root });
                    if (!node) {
                        return null;
                    }
                }
                beforeNode = false;
            }
            else {
                if (beforeNode) {
                    node = domSymbolTree.preceding(node, { root: this.root });
                    if (!node) {
                        return null;
                    }
                }
                beforeNode = true;
            }
        } while (this.filterNode(node) !== core.NodeFilter.FILTER_ACCEPT);
        this.pointerBeforeReferenceNode = beforeNode;
        this.referenceNode = node;
        return node;
    };
    NodeIteratorInternal.prototype.filterNode = function (node) {
        var n = node.nodeType - 1;
        if (!(this.whatToShow & (1 << n))) {
            return core.NodeFilter.FILTER_SKIP;
        }
        var ret = core.NodeFilter.FILTER_ACCEPT;
        var filter = this.filter;
        if (typeof filter === "function") {
            ret = filter(node);
        }
        else if (filter && typeof filter.acceptNode === "function") {
            ret = filter.acceptNode(node);
        }
        if (ret === true) {
            return core.NodeFilter.FILTER_ACCEPT;
        }
        else if (ret === false) {
            return core.NodeFilter.FILTER_REJECT;
        }
        return ret;
    };
    NodeIteratorInternal.prototype.runRemovingSteps = function (oldNode, oldParent, oldPreviousSibling) {
        if (oldNode.contains(this.root)) {
            return;
        }
        // If oldNode is not an inclusive ancestor of the referenceNode
        // attribute value, terminate these steps.
        if (!oldNode.contains(this.referenceNode)) {
            return;
        }
        if (this.pointerBeforeReferenceNode) {
            // Let nextSibling be oldPreviousSibling’s next sibling, if oldPreviousSibling is non-null,
            // and oldParent’s first child otherwise.
            var nextSibling = oldPreviousSibling ?
                oldPreviousSibling.nextSibling :
                oldParent.firstChild;
            // If nextSibling is non-null, set the referenceNode attribute to nextSibling
            // and terminate these steps.
            if (nextSibling) {
                this.referenceNode = nextSibling;
                return;
            }
            // Let next be the first node following oldParent (excluding any children of oldParent).
            var next = domSymbolTree.following(oldParent, { skipChildren: true });
            // If root is an inclusive ancestor of next, set the referenceNode
            // attribute to next and terminate these steps.
            if (this.root.contains(next)) {
                this.referenceNode = next;
                return;
            }
            // Otherwise, set the pointerBeforeReferenceNode attribute to false.
            this.pointerBeforeReferenceNode = false;
        }
        // Set the referenceNode attribute to the last inclusive descendant in tree order of oldPreviousSibling,
        // if oldPreviousSibling is non-null, and to oldParent otherwise.
        this.referenceNode = oldPreviousSibling ?
            domSymbolTree.lastInclusiveDescendant(oldPreviousSibling) :
            oldParent;
    };
    DocumentImpl._removingSteps.push(function (document, oldNode, oldParent, oldPreviousSibling) {
        for (var i = 0; i < document._activeNodeIterators.length; ++i) {
            var internal = document._activeNodeIterators[i];
            internal.runRemovingSteps(oldNode, oldParent, oldPreviousSibling);
        }
    });
    core.Document.prototype.createNodeIterator = function (root, whatToShow, filter) {
        if (!root) {
            throw new TypeError("Not enough arguments to Document.createNodeIterator.");
        }
        root = idlUtils.implForWrapper(root);
        if (filter === undefined) {
            filter = null;
        }
        if (filter !== null &&
            typeof filter !== "function" &&
            typeof filter.acceptNode !== "function") {
            throw new TypeError("Argument 3 of Document.createNodeIterator should be a function or implement NodeFilter.");
        }
        var document = root._ownerDocument;
        whatToShow = whatToShow === undefined ?
            core.NodeFilter.SHOW_ALL :
            (whatToShow & core.NodeFilter.SHOW_ALL) >>> 0; // >>> makes sure the result is unsigned
        filter = filter || null;
        var it = Object.create(core.NodeIterator.prototype);
        var internal = new NodeIteratorInternal(document, root, whatToShow, filter);
        it[INTERNAL] = internal;
        document._activeNodeIterators.push(internal);
        while (document._activeNodeIterators.length > document._activeNodeIteratorsMax) {
            var internalOther = document._activeNodeIterators.shift();
            internalOther.active = false;
        }
        return it;
    };
    core.NodeIterator = function NodeIterator() {
        throw new TypeError("Illegal constructor");
    };
    defineGetter(core.NodeIterator.prototype, "root", function () {
        return idlUtils.wrapperForImpl(this[INTERNAL].root);
    });
    defineGetter(core.NodeIterator.prototype, "referenceNode", function () {
        var internal = this[INTERNAL];
        internal.throwIfNotActive();
        return idlUtils.wrapperForImpl(internal.referenceNode);
    });
    defineGetter(core.NodeIterator.prototype, "pointerBeforeReferenceNode", function () {
        var internal = this[INTERNAL];
        internal.throwIfNotActive();
        return internal.pointerBeforeReferenceNode;
    });
    defineGetter(core.NodeIterator.prototype, "whatToShow", function () {
        return this[INTERNAL].whatToShow;
    });
    defineGetter(core.NodeIterator.prototype, "filter", function () {
        return this[INTERNAL].filter;
    });
    core.NodeIterator.prototype.previousNode = function () {
        var internal = this[INTERNAL];
        internal.throwIfNotActive();
        return idlUtils.wrapperForImpl(internal.traverse(false));
    };
    core.NodeIterator.prototype.nextNode = function () {
        var internal = this[INTERNAL];
        internal.throwIfNotActive();
        return idlUtils.wrapperForImpl(internal.traverse(true));
    };
    core.NodeIterator.prototype.detach = function () {
        // noop
    };
    core.NodeIterator.prototype.toString = function () {
        return "[object NodeIterator]";
    };
};
"use strict";
var blobSymbols = require("./blob-symbols");
module.exports = (function () {
    function Blob() {
        if (!(this instanceof Blob)) {
            throw new TypeError("DOM object constructor cannot be called as a function.");
        }
        var parts = arguments[0];
        var properties = arguments[1];
        if (arguments.length > 0) {
            if (!parts || typeof parts !== "object" || parts instanceof Date || parts instanceof RegExp) {
                throw new TypeError("Blob parts must be objects that are not Dates or RegExps");
            }
        }
        var buffers = [];
        if (parts) {
            var l = Number(parts.length);
            for (var i = 0; i < l; i++) {
                var part = parts[i];
                var buffer = void 0;
                if (part instanceof ArrayBuffer) {
                    buffer = new Buffer(new Uint8Array(part));
                }
                else if (part instanceof Blob) {
                    buffer = part[blobSymbols.buffer];
                }
                else if (ArrayBuffer.isView(part)) {
                    buffer = new Buffer(new Uint8Array(part.buffer, part.byteOffset, part.byteLength));
                }
                else if (part instanceof Buffer) {
                    buffer = part;
                }
                else {
                    buffer = new Buffer(typeof part === "string" ? part : String(part));
                }
                buffers.push(buffer);
            }
        }
        this[blobSymbols.buffer] = Buffer.concat(buffers);
        this[blobSymbols.type] = properties && properties.type !== undefined ? String(properties.type).toLowerCase() : "";
        if (!this[blobSymbols.type].match(/^[\u0020-\u007E]*$/)) {
            this[blobSymbols.type] = "";
        }
        this[blobSymbols.closed] = false;
    }
    Object.defineProperty(Blob.prototype, "size", {
        get: function () {
            return this[blobSymbols.buffer].length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Blob.prototype, "type", {
        get: function () {
            return this[blobSymbols.type];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Blob.prototype, "isClosed", {
        get: function () {
            return this[blobSymbols.closed];
        },
        enumerable: true,
        configurable: true
    });
    Blob.prototype.slice = function () {
        var buffer = this[blobSymbols.buffer];
        var slicedBuffer = buffer.slice(arguments[0] || 0, arguments[1] || this.size);
        var blob = new Blob([], { type: arguments[2] === undefined ? this.type : String(arguments[2]) });
        blob[blobSymbols.buffer] = slicedBuffer;
        return blob;
    };
    Blob.prototype.close = function () {
        this[blobSymbols.closed] = true;
    };
    Blob.prototype.toString = function () {
        return "[object Blob]";
    };
    return Blob;
}());
"use strict";
exports.lastModified = Symbol("lastModified");
exports.name = Symbol("name");
"use strict";
var fileSymbols = require("./file-symbols");
var Blob = require("./blob");
module.exports = (function (_super) {
    __extends(File, _super);
    function File(fileBits, fileName) {
        var _this = _super.call(this, fileBits, arguments[2]) || this;
        if (!(_this instanceof File)) {
            throw new TypeError("DOM object constructor cannot be called as a function.");
        }
        var options = arguments[2];
        _this[fileSymbols.name] = fileName.replace(/\//g, ":");
        _this[fileSymbols.lastModified] = options && options.lastModified ? options.lastModified : Date.now();
        return _this;
    }
    Object.defineProperty(File.prototype, "name", {
        get: function () {
            return this[fileSymbols.name];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(File.prototype, "lastModified", {
        get: function () {
            return this[fileSymbols.lastModified];
        },
        enumerable: true,
        configurable: true
    });
    return File;
}(Blob));
"use strict";
exports.list = Symbol("list");
"use strict";
var filelistSymbols = require("./filelist-symbols");
module.exports = function (core) {
    var FileList = (function () {
        function FileList() {
            if (!(this instanceof FileList)) {
                throw new TypeError("DOM object constructor cannot be called as a function.");
            }
            this[filelistSymbols.list] = [];
        }
        FileList.prototype.item = function (index) {
            return this[filelistSymbols.list][index] || null;
        };
        Object.defineProperty(FileList.prototype, "length", {
            get: function () {
                return this[filelistSymbols.list].length;
            },
            enumerable: true,
            configurable: true
        });
        return FileList;
    }());
    core.FileList = FileList;
};
"use strict";
var EventTarget = require("./generated/EventTarget");
function XMLHttpRequestEventTarget() {
    if (!(this instanceof XMLHttpRequestEventTarget)) {
        throw new TypeError("DOM object constructor cannot be called as a function.");
    }
    EventTarget.setup(this);
    this.onabort = null;
    this.onerror = null;
    this.onload = null;
    this.onloadend = null;
    this.onloadstart = null;
    this.onprogress = null;
    this.ontimeout = null;
}
XMLHttpRequestEventTarget.prototype = Object.create(EventTarget.interface.prototype);
module.exports = function (core) {
    core.XMLHttpRequestEventTarget = XMLHttpRequestEventTarget;
};
"use strict";
module.exports = function (core) {
    var XMLHttpRequestEventTarget = core.XMLHttpRequestEventTarget;
    var XMLHttpRequestUpload = (function (_super) {
        __extends(XMLHttpRequestUpload, _super);
        function XMLHttpRequestUpload() {
            var _this = _super.call(this) || this;
            if (!(_this instanceof XMLHttpRequestUpload)) {
                throw new TypeError("DOM object constructor cannot be called as a function.");
            }
            return _this;
        }
        return XMLHttpRequestUpload;
    }(XMLHttpRequestEventTarget));
    core.XMLHttpRequestUpload = XMLHttpRequestUpload;
};
"use strict";
exports.DOMException = require("../web-idl/DOMException");
exports.NamedNodeMap = require("./attributes").NamedNodeMap;
exports.Attr = require("./generated/Attr").interface;
exports.Node = require("./generated/Node").interface;
exports.Element = require("./generated/Element").interface;
exports.DocumentFragment = require("./generated/DocumentFragment").interface;
exports.Document = exports.HTMLDocument = require("./generated/Document").interface;
exports.XMLDocument = require("./generated/XMLDocument").interface;
exports.CharacterData = require("./generated/CharacterData").interface;
exports.Text = require("./generated/Text").interface;
exports.CDATASection = require("./generated/CDATASection").interface;
exports.ProcessingInstruction = require("./generated/ProcessingInstruction").interface;
exports.Comment = require("./generated/Comment").interface;
exports.DocumentType = require("./generated/DocumentType").interface;
exports.DOMImplementation = require("./generated/DOMImplementation").interface;
exports.Event = require("./generated/Event").interface;
exports.CustomEvent = require("./generated/CustomEvent").interface;
exports.MessageEvent = require("./generated/MessageEvent").interface;
exports.ErrorEvent = require("./generated/ErrorEvent").interface;
exports.HashChangeEvent = require("./generated/HashChangeEvent").interface;
exports.FocusEvent = require("./generated/FocusEvent").interface;
exports.PopStateEvent = require("./generated/PopStateEvent").interface;
exports.UIEvent = require("./generated/UIEvent").interface;
exports.MouseEvent = require("./generated/MouseEvent").interface;
exports.KeyboardEvent = require("./generated/KeyboardEvent").interface;
exports.TouchEvent = require("./generated/TouchEvent").interface;
exports.ProgressEvent = require("./generated/ProgressEvent").interface;
exports.EventTarget = require("./generated/EventTarget").interface;
exports.Location = require("./generated/Location").interface;
exports.History = require("./generated/History").interface;
exports.DOMParser = require("./generated/DOMParser").interface;
exports.FormData = require("./generated/FormData").interface;
require("./register-elements")(exports);
// These need to be cleaned up...
require("../level2/style")(exports);
require("../level3/xpath")(exports);
// These are OK but need migration to webidl2js eventually.
require("./html-collection")(exports);
require("./node-filter")(exports);
require("./node-iterator")(exports);
require("./node-list")(exports);
exports.Blob = require("./blob");
exports.File = require("./file");
require("./filelist")(exports);
require("./xmlhttprequest-event-target")(exports);
require("./xmlhttprequest-upload")(exports);
exports.DOMTokenList = require("./dom-token-list").DOMTokenList;
exports.URL = require("whatwg-url").URL;
// Ideally, we would use
// https://html.spec.whatwg.org/multipage/rendering.html#the-css-user-agent-style-sheet-and-presentational-hints
// but for now, just use the version from blink. This file is copied from
// https://chromium.googlesource.com/chromium/blink/+/96aa3a280ab7d67178c8f122a04949ce5f8579e0/Source/core/css/html.css
// (removed a line which had octal literals inside since octal literals are not allowed in template strings)
// We use a .js file because otherwise we can't browserify this. (brfs is unusable due to lack of ES2015 support)
module.exports = "\n/*\n * The default style sheet used to render HTML.\n *\n * Copyright (C) 2000 Lars Knoll (knoll@kde.org)\n * Copyright (C) 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011 Apple Inc. All rights reserved.\n *\n * This library is free software; you can redistribute it and/or\n * modify it under the terms of the GNU Library General Public\n * License as published by the Free Software Foundation; either\n * version 2 of the License, or (at your option) any later version.\n *\n * This library is distributed in the hope that it will be useful,\n * but WITHOUT ANY WARRANTY; without even the implied warranty of\n * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU\n * Library General Public License for more details.\n *\n * You should have received a copy of the GNU Library General Public License\n * along with this library; see the file COPYING.LIB.  If not, write to\n * the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor,\n * Boston, MA 02110-1301, USA.\n *\n */\n\n@namespace \"http://www.w3.org/1999/xhtml\";\n\nhtml {\n    display: block\n}\n\n:root {\n    scroll-blocks-on: start-touch wheel-event\n}\n\n/* children of the <head> element all have display:none */\nhead {\n    display: none\n}\n\nmeta {\n    display: none\n}\n\ntitle {\n    display: none\n}\n\nlink {\n    display: none\n}\n\nstyle {\n    display: none\n}\n\nscript {\n    display: none\n}\n\n/* generic block-level elements */\n\nbody {\n    display: block;\n    margin: 8px\n}\n\nbody:-webkit-full-page-media {\n    background-color: rgb(0, 0, 0)\n}\n\np {\n    display: block;\n    -webkit-margin-before: 1__qem;\n    -webkit-margin-after: 1__qem;\n    -webkit-margin-start: 0;\n    -webkit-margin-end: 0;\n}\n\ndiv {\n    display: block\n}\n\nlayer {\n    display: block\n}\n\narticle, aside, footer, header, hgroup, main, nav, section {\n    display: block\n}\n\nmarquee {\n    display: inline-block;\n}\n\naddress {\n    display: block\n}\n\nblockquote {\n    display: block;\n    -webkit-margin-before: 1__qem;\n    -webkit-margin-after: 1em;\n    -webkit-margin-start: 40px;\n    -webkit-margin-end: 40px;\n}\n\nfigcaption {\n    display: block\n}\n\nfigure {\n    display: block;\n    -webkit-margin-before: 1em;\n    -webkit-margin-after: 1em;\n    -webkit-margin-start: 40px;\n    -webkit-margin-end: 40px;\n}\n\nq {\n    display: inline\n}\n\nq:before {\n    content: open-quote;\n}\n\nq:after {\n    content: close-quote;\n}\n\ncenter {\n    display: block;\n    /* special centering to be able to emulate the html4/netscape behaviour */\n    text-align: -webkit-center\n}\n\nhr {\n    display: block;\n    -webkit-margin-before: 0.5em;\n    -webkit-margin-after: 0.5em;\n    -webkit-margin-start: auto;\n    -webkit-margin-end: auto;\n    border-style: inset;\n    border-width: 1px;\n    box-sizing: border-box\n}\n\nmap {\n    display: inline\n}\n\nvideo {\n    object-fit: contain;\n}\n\n/* heading elements */\n\nh1 {\n    display: block;\n    font-size: 2em;\n    -webkit-margin-before: 0.67__qem;\n    -webkit-margin-after: 0.67em;\n    -webkit-margin-start: 0;\n    -webkit-margin-end: 0;\n    font-weight: bold\n}\n\n:-webkit-any(article,aside,nav,section) h1 {\n    font-size: 1.5em;\n    -webkit-margin-before: 0.83__qem;\n    -webkit-margin-after: 0.83em;\n}\n\n:-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) h1 {\n    font-size: 1.17em;\n    -webkit-margin-before: 1__qem;\n    -webkit-margin-after: 1em;\n}\n\n:-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) h1 {\n    font-size: 1.00em;\n    -webkit-margin-before: 1.33__qem;\n    -webkit-margin-after: 1.33em;\n}\n\n:-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) h1 {\n    font-size: .83em;\n    -webkit-margin-before: 1.67__qem;\n    -webkit-margin-after: 1.67em;\n}\n\n:-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) :-webkit-any(article,aside,nav,section) h1 {\n    font-size: .67em;\n    -webkit-margin-before: 2.33__qem;\n    -webkit-margin-after: 2.33em;\n}\n\nh2 {\n    display: block;\n    font-size: 1.5em;\n    -webkit-margin-before: 0.83__qem;\n    -webkit-margin-after: 0.83em;\n    -webkit-margin-start: 0;\n    -webkit-margin-end: 0;\n    font-weight: bold\n}\n\nh3 {\n    display: block;\n    font-size: 1.17em;\n    -webkit-margin-before: 1__qem;\n    -webkit-margin-after: 1em;\n    -webkit-margin-start: 0;\n    -webkit-margin-end: 0;\n    font-weight: bold\n}\n\nh4 {\n    display: block;\n    -webkit-margin-before: 1.33__qem;\n    -webkit-margin-after: 1.33em;\n    -webkit-margin-start: 0;\n    -webkit-margin-end: 0;\n    font-weight: bold\n}\n\nh5 {\n    display: block;\n    font-size: .83em;\n    -webkit-margin-before: 1.67__qem;\n    -webkit-margin-after: 1.67em;\n    -webkit-margin-start: 0;\n    -webkit-margin-end: 0;\n    font-weight: bold\n}\n\nh6 {\n    display: block;\n    font-size: .67em;\n    -webkit-margin-before: 2.33__qem;\n    -webkit-margin-after: 2.33em;\n    -webkit-margin-start: 0;\n    -webkit-margin-end: 0;\n    font-weight: bold\n}\n\n/* tables */\n\ntable {\n    display: table;\n    border-collapse: separate;\n    border-spacing: 2px;\n    border-color: gray\n}\n\nthead {\n    display: table-header-group;\n    vertical-align: middle;\n    border-color: inherit\n}\n\ntbody {\n    display: table-row-group;\n    vertical-align: middle;\n    border-color: inherit\n}\n\ntfoot {\n    display: table-footer-group;\n    vertical-align: middle;\n    border-color: inherit\n}\n\n/* for tables without table section elements (can happen with XHTML or dynamically created tables) */\ntable > tr {\n    vertical-align: middle;\n}\n\ncol {\n    display: table-column\n}\n\ncolgroup {\n    display: table-column-group\n}\n\ntr {\n    display: table-row;\n    vertical-align: inherit;\n    border-color: inherit\n}\n\ntd, th {\n    display: table-cell;\n    vertical-align: inherit\n}\n\nth {\n    font-weight: bold\n}\n\ncaption {\n    display: table-caption;\n    text-align: -webkit-center\n}\n\n/* lists */\n\nul, menu, dir {\n    display: block;\n    list-style-type: disc;\n    -webkit-margin-before: 1__qem;\n    -webkit-margin-after: 1em;\n    -webkit-margin-start: 0;\n    -webkit-margin-end: 0;\n    -webkit-padding-start: 40px\n}\n\nol {\n    display: block;\n    list-style-type: decimal;\n    -webkit-margin-before: 1__qem;\n    -webkit-margin-after: 1em;\n    -webkit-margin-start: 0;\n    -webkit-margin-end: 0;\n    -webkit-padding-start: 40px\n}\n\nli {\n    display: list-item;\n    text-align: -webkit-match-parent;\n}\n\nul ul, ol ul {\n    list-style-type: circle\n}\n\nol ol ul, ol ul ul, ul ol ul, ul ul ul {\n    list-style-type: square\n}\n\ndd {\n    display: block;\n    -webkit-margin-start: 40px\n}\n\ndl {\n    display: block;\n    -webkit-margin-before: 1__qem;\n    -webkit-margin-after: 1em;\n    -webkit-margin-start: 0;\n    -webkit-margin-end: 0;\n}\n\ndt {\n    display: block\n}\n\nol ul, ul ol, ul ul, ol ol {\n    -webkit-margin-before: 0;\n    -webkit-margin-after: 0\n}\n\n/* form elements */\n\nform {\n    display: block;\n    margin-top: 0__qem;\n}\n\nlabel {\n    cursor: default;\n}\n\nlegend {\n    display: block;\n    -webkit-padding-start: 2px;\n    -webkit-padding-end: 2px;\n    border: none\n}\n\nfieldset {\n    display: block;\n    -webkit-margin-start: 2px;\n    -webkit-margin-end: 2px;\n    -webkit-padding-before: 0.35em;\n    -webkit-padding-start: 0.75em;\n    -webkit-padding-end: 0.75em;\n    -webkit-padding-after: 0.625em;\n    border: 2px groove ThreeDFace;\n    min-width: -webkit-min-content;\n}\n\nbutton {\n    -webkit-appearance: button;\n}\n\n/* Form controls don't go vertical. */\ninput, textarea, keygen, select, button, meter, progress {\n    -webkit-writing-mode: horizontal-tb !important;\n}\n\ninput, textarea, keygen, select, button {\n    margin: 0__qem;\n    font: -webkit-small-control;\n    text-rendering: auto; /* FIXME: Remove when tabs work with optimizeLegibility. */\n    color: initial;\n    letter-spacing: normal;\n    word-spacing: normal;\n    line-height: normal;\n    text-transform: none;\n    text-indent: 0;\n    text-shadow: none;\n    display: inline-block;\n    text-align: start;\n}\n\ninput[type=\"hidden\" i] {\n    display: none\n}\n\ninput {\n    -webkit-appearance: textfield;\n    padding: 1px;\n    background-color: white;\n    border: 2px inset;\n    -webkit-rtl-ordering: logical;\n    -webkit-user-select: text;\n    cursor: auto;\n}\n\ninput[type=\"search\" i] {\n    -webkit-appearance: searchfield;\n    box-sizing: border-box;\n}\n\ninput::-webkit-textfield-decoration-container {\n    display: flex;\n    align-items: center;\n    -webkit-user-modify: read-only !important;\n    content: none !important;\n}\n\ninput[type=\"search\" i]::-webkit-textfield-decoration-container {\n    direction: ltr;\n}\n\ninput::-webkit-clear-button {\n    -webkit-appearance: searchfield-cancel-button;\n    display: inline-block;\n    flex: none;\n    -webkit-user-modify: read-only !important;\n    -webkit-margin-start: 2px;\n    opacity: 0;\n    pointer-events: none;\n}\n\ninput:enabled:read-write:-webkit-any(:focus,:hover)::-webkit-clear-button {\n    opacity: 1;\n    pointer-events: auto;\n}\n\ninput[type=\"search\" i]::-webkit-search-cancel-button {\n    -webkit-appearance: searchfield-cancel-button;\n    display: block;\n    flex: none;\n    -webkit-user-modify: read-only !important;\n    -webkit-margin-start: 1px;\n    opacity: 0;\n    pointer-events: none;\n}\n\ninput[type=\"search\" i]:enabled:read-write:-webkit-any(:focus,:hover)::-webkit-search-cancel-button {\n    opacity: 1;\n    pointer-events: auto;\n}\n\ninput[type=\"search\" i]::-webkit-search-decoration {\n    -webkit-appearance: searchfield-decoration;\n    display: block;\n    flex: none;\n    -webkit-user-modify: read-only !important;\n    -webkit-align-self: flex-start;\n    margin: auto 0;\n}\n\ninput[type=\"search\" i]::-webkit-search-results-decoration {\n    -webkit-appearance: searchfield-results-decoration;\n    display: block;\n    flex: none;\n    -webkit-user-modify: read-only !important;\n    -webkit-align-self: flex-start;\n    margin: auto 0;\n}\n\ninput::-webkit-inner-spin-button {\n    -webkit-appearance: inner-spin-button;\n    display: inline-block;\n    cursor: default;\n    flex: none;\n    align-self: stretch;\n    -webkit-user-select: none;\n    -webkit-user-modify: read-only !important;\n    opacity: 0;\n    pointer-events: none;\n}\n\ninput:enabled:read-write:-webkit-any(:focus,:hover)::-webkit-inner-spin-button {\n    opacity: 1;\n    pointer-events: auto;\n}\n\nkeygen, select {\n    border-radius: 5px;\n}\n\nkeygen::-webkit-keygen-select {\n    margin: 0px;\n}\n\ntextarea {\n    -webkit-appearance: textarea;\n    background-color: white;\n    border: 1px solid;\n    -webkit-rtl-ordering: logical;\n    -webkit-user-select: text;\n    flex-direction: column;\n    resize: auto;\n    cursor: auto;\n    padding: 2px;\n    white-space: pre-wrap;\n    word-wrap: break-word;\n}\n\n::-webkit-input-placeholder {\n    -webkit-text-security: none;\n    color: darkGray;\n    display: block !important;\n    pointer-events: none !important;\n}\n\ninput::-webkit-input-placeholder {\n    white-space: pre;\n    word-wrap: normal;\n    overflow: hidden;\n    -webkit-user-modify: read-only !important;\n}\n\ninput[type=\"password\" i] {\n    -webkit-text-security: disc !important;\n}\n\ninput[type=\"hidden\" i], input[type=\"image\" i], input[type=\"file\" i] {\n    -webkit-appearance: initial;\n    padding: initial;\n    background-color: initial;\n    border: initial;\n}\n\ninput[type=\"file\" i] {\n    align-items: baseline;\n    color: inherit;\n    text-align: start !important;\n}\n\ninput:-webkit-autofill, textarea:-webkit-autofill, select:-webkit-autofill {\n    background-color: #FAFFBD !important;\n    background-image:none !important;\n    color: #000000 !important;\n}\n\ninput[type=\"radio\" i], input[type=\"checkbox\" i] {\n    margin: 3px 0.5ex;\n    padding: initial;\n    background-color: initial;\n    border: initial;\n}\n\ninput[type=\"button\" i], input[type=\"submit\" i], input[type=\"reset\" i] {\n    -webkit-appearance: push-button;\n    -webkit-user-select: none;\n    white-space: pre\n}\n\ninput[type=\"file\" i]::-webkit-file-upload-button {\n    -webkit-appearance: push-button;\n    -webkit-user-modify: read-only !important;\n    white-space: nowrap;\n    margin: 0;\n    font-size: inherit;\n}\n\ninput[type=\"button\" i], input[type=\"submit\" i], input[type=\"reset\" i], input[type=\"file\" i]::-webkit-file-upload-button, button {\n    align-items: flex-start;\n    text-align: center;\n    cursor: default;\n    color: ButtonText;\n    padding: 2px 6px 3px 6px;\n    border: 2px outset ButtonFace;\n    background-color: ButtonFace;\n    box-sizing: border-box\n}\n\ninput[type=\"range\" i] {\n    -webkit-appearance: slider-horizontal;\n    padding: initial;\n    border: initial;\n    margin: 2px;\n    color: #909090;\n}\n\ninput[type=\"range\" i]::-webkit-slider-container, input[type=\"range\" i]::-webkit-media-slider-container {\n    flex: 1;\n    min-width: 0;\n    box-sizing: border-box;\n    -webkit-user-modify: read-only !important;\n    display: flex;\n}\n\ninput[type=\"range\" i]::-webkit-slider-runnable-track {\n    flex: 1;\n    min-width: 0;\n    -webkit-align-self: center;\n\n    box-sizing: border-box;\n    -webkit-user-modify: read-only !important;\n    display: block;\n}\n\ninput[type=\"range\" i]::-webkit-slider-thumb, input[type=\"range\" i]::-webkit-media-slider-thumb {\n    -webkit-appearance: sliderthumb-horizontal;\n    box-sizing: border-box;\n    -webkit-user-modify: read-only !important;\n    display: block;\n}\n\ninput[type=\"button\" i]:disabled, input[type=\"submit\" i]:disabled, input[type=\"reset\" i]:disabled,\ninput[type=\"file\" i]:disabled::-webkit-file-upload-button, button:disabled,\nselect:disabled, keygen:disabled, optgroup:disabled, option:disabled,\nselect[disabled]>option {\n    color: GrayText\n}\n\ninput[type=\"button\" i]:active, input[type=\"submit\" i]:active, input[type=\"reset\" i]:active, input[type=\"file\" i]:active::-webkit-file-upload-button, button:active {\n    border-style: inset\n}\n\ninput[type=\"button\" i]:active:disabled, input[type=\"submit\" i]:active:disabled, input[type=\"reset\" i]:active:disabled, input[type=\"file\" i]:active:disabled::-webkit-file-upload-button, button:active:disabled {\n    border-style: outset\n}\n\noption:-internal-spatial-navigation-focus {\n    outline: black dashed 1px;\n    outline-offset: -1px;\n}\n\ndatalist {\n    display: none\n}\n\narea {\n    display: inline;\n    cursor: pointer;\n}\n\nparam {\n    display: none\n}\n\ninput[type=\"checkbox\" i] {\n    -webkit-appearance: checkbox;\n    box-sizing: border-box;\n}\n\ninput[type=\"radio\" i] {\n    -webkit-appearance: radio;\n    box-sizing: border-box;\n}\n\ninput[type=\"color\" i] {\n    -webkit-appearance: square-button;\n    width: 44px;\n    height: 23px;\n    background-color: ButtonFace;\n    /* Same as native_theme_base. */\n    border: 1px #a9a9a9 solid;\n    padding: 1px 2px;\n}\n\ninput[type=\"color\" i]::-webkit-color-swatch-wrapper {\n    display:flex;\n    padding: 4px 2px;\n    box-sizing: border-box;\n    -webkit-user-modify: read-only !important;\n    width: 100%;\n    height: 100%\n}\n\ninput[type=\"color\" i]::-webkit-color-swatch {\n    background-color: #000000;\n    border: 1px solid #777777;\n    flex: 1;\n    min-width: 0;\n    -webkit-user-modify: read-only !important;\n}\n\ninput[type=\"color\" i][list] {\n    -webkit-appearance: menulist;\n    width: 88px;\n    height: 23px\n}\n\ninput[type=\"color\" i][list]::-webkit-color-swatch-wrapper {\n    padding-left: 8px;\n    padding-right: 24px;\n}\n\ninput[type=\"color\" i][list]::-webkit-color-swatch {\n    border-color: #000000;\n}\n\ninput::-webkit-calendar-picker-indicator {\n    display: inline-block;\n    width: 0.66em;\n    height: 0.66em;\n    padding: 0.17em 0.34em;\n    -webkit-user-modify: read-only !important;\n    opacity: 0;\n    pointer-events: none;\n}\n\ninput::-webkit-calendar-picker-indicator:hover {\n    background-color: #eee;\n}\n\ninput:enabled:read-write:-webkit-any(:focus,:hover)::-webkit-calendar-picker-indicator,\ninput::-webkit-calendar-picker-indicator:focus {\n    opacity: 1;\n    pointer-events: auto;\n}\n\ninput[type=\"date\" i]:disabled::-webkit-clear-button,\ninput[type=\"date\" i]:disabled::-webkit-inner-spin-button,\ninput[type=\"datetime-local\" i]:disabled::-webkit-clear-button,\ninput[type=\"datetime-local\" i]:disabled::-webkit-inner-spin-button,\ninput[type=\"month\" i]:disabled::-webkit-clear-button,\ninput[type=\"month\" i]:disabled::-webkit-inner-spin-button,\ninput[type=\"week\" i]:disabled::-webkit-clear-button,\ninput[type=\"week\" i]:disabled::-webkit-inner-spin-button,\ninput:disabled::-webkit-calendar-picker-indicator,\ninput[type=\"date\" i][readonly]::-webkit-clear-button,\ninput[type=\"date\" i][readonly]::-webkit-inner-spin-button,\ninput[type=\"datetime-local\" i][readonly]::-webkit-clear-button,\ninput[type=\"datetime-local\" i][readonly]::-webkit-inner-spin-button,\ninput[type=\"month\" i][readonly]::-webkit-clear-button,\ninput[type=\"month\" i][readonly]::-webkit-inner-spin-button,\ninput[type=\"week\" i][readonly]::-webkit-clear-button,\ninput[type=\"week\" i][readonly]::-webkit-inner-spin-button,\ninput[readonly]::-webkit-calendar-picker-indicator {\n    visibility: hidden;\n}\n\nselect {\n    -webkit-appearance: menulist;\n    box-sizing: border-box;\n    align-items: center;\n    border: 1px solid;\n    white-space: pre;\n    -webkit-rtl-ordering: logical;\n    color: black;\n    background-color: white;\n    cursor: default;\n}\n\nselect:not(:-internal-list-box) {\n    overflow: visible !important;\n}\n\nselect:-internal-list-box {\n    -webkit-appearance: listbox;\n    align-items: flex-start;\n    border: 1px inset gray;\n    border-radius: initial;\n    overflow-x: hidden;\n    overflow-y: scroll;\n    vertical-align: text-bottom;\n    -webkit-user-select: none;\n    white-space: nowrap;\n}\n\noptgroup {\n    font-weight: bolder;\n    display: block;\n}\n\noption {\n    font-weight: normal;\n    display: block;\n    padding: 0 2px 1px 2px;\n    white-space: pre;\n    min-height: 1.2em;\n}\n\nselect:-internal-list-box option,\nselect:-internal-list-box optgroup {\n    line-height: initial !important;\n}\n\nselect:-internal-list-box:focus option:checked {\n    background-color: -internal-active-list-box-selection !important;\n    color: -internal-active-list-box-selection-text !important;\n}\n\nselect:-internal-list-box option:checked {\n    background-color: -internal-inactive-list-box-selection !important;\n    color: -internal-inactive-list-box-selection-text !important;\n}\n\nselect:-internal-list-box:disabled option:checked,\nselect:-internal-list-box option:checked:disabled {\n    color: gray !important;\n}\n\nselect:-internal-list-box hr {\n    border-style: none;\n}\n\noutput {\n    display: inline;\n}\n\n/* meter */\n\nmeter {\n    -webkit-appearance: meter;\n    box-sizing: border-box;\n    display: inline-block;\n    height: 1em;\n    width: 5em;\n    vertical-align: -0.2em;\n}\n\nmeter::-webkit-meter-inner-element {\n    -webkit-appearance: inherit;\n    box-sizing: inherit;\n    -webkit-user-modify: read-only !important;\n    height: 100%;\n    width: 100%;\n}\n\nmeter::-webkit-meter-bar {\n    background: linear-gradient(to bottom, #ddd, #eee 20%, #ccc 45%, #ccc 55%, #ddd);\n    height: 100%;\n    width: 100%;\n    -webkit-user-modify: read-only !important;\n    box-sizing: border-box;\n}\n\nmeter::-webkit-meter-optimum-value {\n    background: linear-gradient(to bottom, #ad7, #cea 20%, #7a3 45%, #7a3 55%, #ad7);\n    height: 100%;\n    -webkit-user-modify: read-only !important;\n    box-sizing: border-box;\n}\n\nmeter::-webkit-meter-suboptimum-value {\n    background: linear-gradient(to bottom, #fe7, #ffc 20%, #db3 45%, #db3 55%, #fe7);\n    height: 100%;\n    -webkit-user-modify: read-only !important;\n    box-sizing: border-box;\n}\n\nmeter::-webkit-meter-even-less-good-value {\n    background: linear-gradient(to bottom, #f77, #fcc 20%, #d44 45%, #d44 55%, #f77);\n    height: 100%;\n    -webkit-user-modify: read-only !important;\n    box-sizing: border-box;\n}\n\n/* progress */\n\nprogress {\n    -webkit-appearance: progress-bar;\n    box-sizing: border-box;\n    display: inline-block;\n    height: 1em;\n    width: 10em;\n    vertical-align: -0.2em;\n}\n\nprogress::-webkit-progress-inner-element {\n    -webkit-appearance: inherit;\n    box-sizing: inherit;\n    -webkit-user-modify: read-only;\n    height: 100%;\n    width: 100%;\n}\n\nprogress::-webkit-progress-bar {\n    background-color: gray;\n    height: 100%;\n    width: 100%;\n    -webkit-user-modify: read-only !important;\n    box-sizing: border-box;\n}\n\nprogress::-webkit-progress-value {\n    background-color: green;\n    height: 100%;\n    width: 50%; /* should be removed later */\n    -webkit-user-modify: read-only !important;\n    box-sizing: border-box;\n}\n\n/* inline elements */\n\nu, ins {\n    text-decoration: underline\n}\n\nstrong, b {\n    font-weight: bold\n}\n\ni, cite, em, var, address, dfn {\n    font-style: italic\n}\n\ntt, code, kbd, samp {\n    font-family: monospace\n}\n\npre, xmp, plaintext, listing {\n    display: block;\n    font-family: monospace;\n    white-space: pre;\n    margin: 1__qem 0\n}\n\nmark {\n    background-color: yellow;\n    color: black\n}\n\nbig {\n    font-size: larger\n}\n\nsmall {\n    font-size: smaller\n}\n\ns, strike, del {\n    text-decoration: line-through\n}\n\nsub {\n    vertical-align: sub;\n    font-size: smaller\n}\n\nsup {\n    vertical-align: super;\n    font-size: smaller\n}\n\nnobr {\n    white-space: nowrap\n}\n\n/* states */\n\n:focus {\n    outline: auto 5px -webkit-focus-ring-color\n}\n\n/* Read-only text fields do not show a focus ring but do still receive focus */\nhtml:focus, body:focus, input[readonly]:focus {\n    outline: none\n}\n\napplet:focus, embed:focus, iframe:focus, object:focus {\n    outline: none\n}\n\ninput:focus, textarea:focus, keygen:focus, select:focus {\n    outline-offset: -2px\n}\n\ninput[type=\"button\" i]:focus,\ninput[type=\"checkbox\" i]:focus,\ninput[type=\"file\" i]:focus,\ninput[type=\"hidden\" i]:focus,\ninput[type=\"image\" i]:focus,\ninput[type=\"radio\" i]:focus,\ninput[type=\"reset\" i]:focus,\ninput[type=\"search\" i]:focus,\ninput[type=\"submit\" i]:focus,\ninput[type=\"file\" i]:focus::-webkit-file-upload-button {\n    outline-offset: 0\n}\n\na:-webkit-any-link {\n    color: -webkit-link;\n    text-decoration: underline;\n    cursor: auto;\n}\n\na:-webkit-any-link:active {\n    color: -webkit-activelink\n}\n\n/* HTML5 ruby elements */\n\nruby, rt {\n    text-indent: 0; /* blocks used for ruby rendering should not trigger this */\n}\n\nrt {\n    line-height: normal;\n    -webkit-text-emphasis: none;\n}\n\nruby > rt {\n    display: block;\n    font-size: 50%;\n    text-align: start;\n}\n\nruby > rp {\n    display: none;\n}\n\n/* other elements */\n\nnoframes {\n    display: none\n}\n\nframeset, frame {\n    display: block\n}\n\nframeset {\n    border-color: inherit\n}\n\niframe {\n    border: 2px inset\n}\n\ndetails {\n    display: block\n}\n\nsummary {\n    display: block\n}\n\nsummary::-webkit-details-marker {\n    display: inline-block;\n    width: 0.66em;\n    height: 0.66em;\n    -webkit-margin-end: 0.4em;\n}\n\ntemplate {\n    display: none\n}\n\nbdi, output {\n    unicode-bidi: -webkit-isolate;\n}\n\nbdo {\n    unicode-bidi: bidi-override;\n}\n\ntextarea[dir=auto i] {\n    unicode-bidi: -webkit-plaintext;\n}\n\ndialog:not([open]) {\n    display: none\n}\n\ndialog {\n    position: absolute;\n    left: 0;\n    right: 0;\n    width: -webkit-fit-content;\n    height: -webkit-fit-content;\n    margin: auto;\n    border: solid;\n    padding: 1em;\n    background: white;\n    color: black\n}\n\ndialog::backdrop {\n    position: fixed;\n    top: 0;\n    right: 0;\n    bottom: 0;\n    left: 0;\n    background: rgba(0,0,0,0.1)\n}\n\n/* page */\n\n@page {\n    /* FIXME: Define the right default values for page properties. */\n    size: auto;\n    margin: auto;\n    padding: 0px;\n    border-width: 0px;\n}\n\n/* noscript is handled internally, as it depends on settings. */\n\n";
"use strict";
var CSSStyleDeclaration = require("cssstyle").CSSStyleDeclaration;
var notImplemented = require("./not-implemented");
var VirtualConsole = require("../virtual-console");
var define = require("../utils").define;
var EventTarget = require("../living/generated/EventTarget");
var namedPropertiesWindow = require("../living/named-properties-window");
var cssom = require("cssom");
var postMessage = require("../living/post-message");
var DOMException = require("../web-idl/DOMException");
var btoa = require("abab").btoa;
var atob = require("abab").atob;
var idlUtils = require("../living/generated/utils");
var createFileReader = require("../living/file-reader");
var createXMLHttpRequest = require("../living/xmlhttprequest");
var Document = require("../living/generated/Document");
var Navigator = require("../living/generated/Navigator");
var reportException = require("../living/helpers/runtime-script-errors");
// NB: the require() must be after assigning `module.exports` because this require() is circular
// TODO: this above note might not even be true anymore... figure out the cycle and document it, or clean up.
module.exports = Window;
var dom = require("../living");
var cssSelectorSplitRE = /((?:[^,"']|"[^"]*"|'[^']*')+)/;
var defaultStyleSheet = cssom.parse(require("./default-stylesheet"));
dom.Window = Window;
// NOTE: per https://heycam.github.io/webidl/#Global, all properties on the Window object must be own-properties.
// That is why we assign everything inside of the constructor, instead of using a shared prototype.
// You can verify this in e.g. Firefox or Internet Explorer, which do a good job with Web IDL compliance.
function Window(options) {
    EventTarget.setup(this);
    var window = this;
    ///// INTERFACES FROM THE DOM
    // TODO: consider a mode of some sort where these are not shared between all DOM instances
    // It'd be very memory-expensive in most cases, though.
    for (var name_8 in dom) {
        Object.defineProperty(window, name_8, {
            enumerable: false,
            configurable: true,
            writable: true,
            value: dom[name_8]
        });
    }
    this._core = dom;
    ///// PRIVATE DATA PROPERTIES
    // vm initialization is defered until script processing is activated (in level1/core)
    this._globalProxy = this;
    this.__timers = Object.create(null);
    // Set up the window as if it's a top level window.
    // If it's not, then references will be corrected by frame/iframe code.
    this._parent = this._top = this._globalProxy;
    this._frameElement = null;
    // List options explicitly to be clear which are passed through
    this._document = Document.create([], {
        core: dom,
        options: {
            parsingMode: options.parsingMode,
            contentType: options.contentType,
            encoding: options.encoding,
            cookieJar: options.cookieJar,
            parser: options.parser,
            url: options.url,
            lastModified: options.lastModified,
            referrer: options.referrer,
            cookie: options.cookie,
            deferClose: options.deferClose,
            resourceLoader: options.resourceLoader,
            concurrentNodeIterators: options.concurrentNodeIterators,
            pool: options.pool,
            agent: options.agent,
            agentClass: options.agentClass,
            agentOptions: options.agentOptions,
            strictSSL: options.strictSSL,
            proxy: options.proxy,
            defaultView: this._globalProxy,
            global: this
        }
    });
    // https://html.spec.whatwg.org/#session-history
    this._sessionHistory = [{
            document: idlUtils.implForWrapper(this._document),
            url: idlUtils.implForWrapper(this._document)._URL,
            stateObject: null
        }];
    this._currentSessionHistoryEntryIndex = 0;
    // This implements window.frames.length, since window.frames returns a
    // self reference to the window object.  This value is incremented in the
    // HTMLFrameElement init function (see: level2/html.js).
    this._length = 0;
    if (options.virtualConsole) {
        if (options.virtualConsole instanceof VirtualConsole) {
            this._virtualConsole = options.virtualConsole;
        }
        else {
            throw new TypeError("options.virtualConsole must be a VirtualConsole (from createVirtualConsole)");
        }
    }
    else {
        this._virtualConsole = new VirtualConsole();
    }
    ///// GETTERS
    var navigator = Navigator.create([], { userAgent: options.userAgent });
    define(this, {
        get length() {
            return window._length;
        },
        get window() {
            return window._globalProxy;
        },
        get frameElement() {
            return window._frameElement;
        },
        get frames() {
            return window._globalProxy;
        },
        get self() {
            return window._globalProxy;
        },
        get parent() {
            return window._parent;
        },
        get top() {
            return window._top;
        },
        get document() {
            return window._document;
        },
        get location() {
            return idlUtils.wrapperForImpl(idlUtils.implForWrapper(window._document)._location);
        },
        get history() {
            return idlUtils.wrapperForImpl(idlUtils.implForWrapper(window._document)._history);
        },
        get navigator() {
            return navigator;
        }
    });
    namedPropertiesWindow.initializeWindow(this, dom.HTMLCollection);
    ///// METHODS for [ImplicitThis] hack
    // See https://lists.w3.org/Archives/Public/public-script-coord/2015JanMar/0109.html
    this.addEventListener = this.addEventListener.bind(this);
    this.removeEventListener = this.removeEventListener.bind(this);
    this.dispatchEvent = this.dispatchEvent.bind(this);
    ///// METHODS
    var latestTimerId = 0;
    this.setTimeout = function (fn, ms) {
        var args = [];
        for (var i = 2; i < arguments.length; ++i) {
            args[i - 2] = arguments[i];
        }
        return startTimer(window, setTimeout, clearTimeout, latestTimerId++, fn, ms, args);
    };
    this.setInterval = function (fn, ms) {
        var args = [];
        for (var i = 2; i < arguments.length; ++i) {
            args[i - 2] = arguments[i];
        }
        return startTimer(window, setInterval, clearInterval, latestTimerId++, fn, ms, args);
    };
    this.clearInterval = stopTimer.bind(this, window);
    this.clearTimeout = stopTimer.bind(this, window);
    this.__stopAllTimers = stopAllTimers.bind(this, window);
    function Image() {
        var img = window._document.createElement("img");
        var impl = idlUtils.implForWrapper(img);
        if (arguments.length > 0) {
            impl.setAttribute("width", String(arguments[0]));
        }
        if (arguments.length > 1) {
            impl.setAttribute("height", String(arguments[1]));
        }
        return img;
    }
    Object.defineProperty(Image, "prototype", {
        value: this.HTMLImageElement.prototype,
        configurable: false,
        enumerable: false,
        writable: false
    });
    Object.defineProperty(window, "Image", {
        value: Image,
        configurable: true,
        enumerable: false,
        writable: true
    });
    function Audio(src) {
        var audio = window._document.createElement("audio");
        var impl = idlUtils.implForWrapper(audio);
        impl.setAttribute("preload", "auto");
        if (src !== undefined) {
            impl.setAttribute("src", String(src));
        }
        return audio;
    }
    Object.defineProperty(Audio, "prototype", {
        value: this.HTMLAudioElement.prototype,
        configurable: false,
        enumerable: false,
        writable: false
    });
    Object.defineProperty(window, "Audio", {
        value: Audio,
        configurable: true,
        enumerable: false,
        writable: true
    });
    function wrapConsoleMethod(method) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            window._virtualConsole.emit.apply(window._virtualConsole, [method].concat(args));
        };
    }
    this.postMessage = postMessage;
    this.atob = function (str) {
        var result = atob(str);
        if (result === null) {
            throw new DOMException(DOMException.INVALID_CHARACTER_ERR, "The string to be decoded contains invalid characters.");
        }
        return result;
    };
    this.btoa = function (str) {
        var result = btoa(str);
        if (result === null) {
            throw new DOMException(DOMException.INVALID_CHARACTER_ERR, "The string to be encoded contains invalid characters.");
        }
        return result;
    };
    this.FileReader = createFileReader(this);
    this.XMLHttpRequest = createXMLHttpRequest(this);
    // TODO: necessary for Blob and FileReader due to different-globals weirdness; investigate how to avoid this.
    this.ArrayBuffer = ArrayBuffer;
    this.Int8Array = Int8Array;
    this.Uint8Array = Uint8Array;
    this.Uint8ClampedArray = Uint8ClampedArray;
    this.Int16Array = Int16Array;
    this.Uint16Array = Uint16Array;
    this.Int32Array = Int32Array;
    this.Uint32Array = Uint32Array;
    this.Float32Array = Float32Array;
    this.Float64Array = Float64Array;
    this.stop = function () {
        var manager = idlUtils.implForWrapper(this._document)._requestManager;
        if (manager) {
            manager.close();
        }
    };
    this.close = function () {
        // Recursively close child frame windows, then ourselves.
        var currentWindow = this;
        (function windowCleaner(windowToClean) {
            for (var i = 0; i < windowToClean.length; i++) {
                windowCleaner(windowToClean[i]);
            }
            // We"re already in our own window.close().
            if (windowToClean !== currentWindow) {
                windowToClean.close();
            }
        }(this));
        // Clear out all listeners. Any in-flight or upcoming events should not get delivered.
        idlUtils.implForWrapper(this)._eventListeners = Object.create(null);
        if (this._document) {
            if (this._document.body) {
                this._document.body.innerHTML = "";
            }
            if (this._document.close) {
                // It's especially important to clear out the listeners here because document.close() causes a "load" event to
                // fire.
                idlUtils.implForWrapper(this._document)._eventListeners = Object.create(null);
                this._document.close();
            }
            var doc = idlUtils.implForWrapper(this._document);
            if (doc._requestManager) {
                doc._requestManager.close();
            }
            delete this._document;
        }
        stopAllTimers(currentWindow);
    };
    this.getComputedStyle = function (node) {
        var s = node.style;
        var cs = new CSSStyleDeclaration();
        var forEach = Array.prototype.forEach;
        function setPropertiesFromRule(rule) {
            if (!rule.selectorText) {
                return;
            }
            var selectors = rule.selectorText.split(cssSelectorSplitRE);
            var matched = false;
            for (var _i = 0, selectors_1 = selectors; _i < selectors_1.length; _i++) {
                var selectorText = selectors_1[_i];
                if (selectorText !== "" && selectorText !== "," && !matched && matchesDontThrow(node, selectorText)) {
                    matched = true;
                    forEach.call(rule.style, function (property) {
                        cs.setProperty(property, rule.style.getPropertyValue(property), rule.style.getPropertyPriority(property));
                    });
                }
            }
        }
        function readStylesFromStyleSheet(sheet) {
            forEach.call(sheet.cssRules, function (rule) {
                if (rule.media) {
                    if (Array.prototype.indexOf.call(rule.media, "screen") !== -1) {
                        forEach.call(rule.cssRules, setPropertiesFromRule);
                    }
                }
                else {
                    setPropertiesFromRule(rule);
                }
            });
        }
        readStylesFromStyleSheet(defaultStyleSheet);
        forEach.call(node.ownerDocument.styleSheets, readStylesFromStyleSheet);
        forEach.call(s, function (property) {
            cs.setProperty(property, s.getPropertyValue(property), s.getPropertyPriority(property));
        });
        return cs;
    };
    ///// PUBLIC DATA PROPERTIES (TODO: should be getters)
    this.console = {
        assert: wrapConsoleMethod("assert"),
        clear: wrapConsoleMethod("clear"),
        count: wrapConsoleMethod("count"),
        debug: wrapConsoleMethod("debug"),
        error: wrapConsoleMethod("error"),
        group: wrapConsoleMethod("group"),
        groupCollapsed: wrapConsoleMethod("groupCollapsed"),
        groupEnd: wrapConsoleMethod("groupEnd"),
        info: wrapConsoleMethod("info"),
        log: wrapConsoleMethod("log"),
        table: wrapConsoleMethod("table"),
        time: wrapConsoleMethod("time"),
        timeEnd: wrapConsoleMethod("timeEnd"),
        trace: wrapConsoleMethod("trace"),
        warn: wrapConsoleMethod("warn")
    };
    function notImplementedMethod(name) {
        return function () {
            notImplemented(name, window);
        };
    }
    define(this, {
        name: "nodejs",
        innerWidth: 1024,
        innerHeight: 768,
        outerWidth: 1024,
        outerHeight: 768,
        pageXOffset: 0,
        pageYOffset: 0,
        screenX: 0,
        screenY: 0,
        screenLeft: 0,
        screenTop: 0,
        scrollX: 0,
        scrollY: 0,
        scrollTop: 0,
        scrollLeft: 0,
        screen: {
            width: 0,
            height: 0
        },
        alert: notImplementedMethod("window.alert"),
        blur: notImplementedMethod("window.blur"),
        confirm: notImplementedMethod("window.confirm"),
        createPopup: notImplementedMethod("window.createPopup"),
        focus: notImplementedMethod("window.focus"),
        moveBy: notImplementedMethod("window.moveBy"),
        moveTo: notImplementedMethod("window.moveTo"),
        open: notImplementedMethod("window.open"),
        print: notImplementedMethod("window.print"),
        prompt: notImplementedMethod("window.prompt"),
        resizeBy: notImplementedMethod("window.resizeBy"),
        resizeTo: notImplementedMethod("window.resizeTo"),
        scroll: notImplementedMethod("window.scroll"),
        scrollBy: notImplementedMethod("window.scrollBy"),
        scrollTo: notImplementedMethod("window.scrollTo"),
        toString: function () {
            return "[object Window]";
        }
    });
    ///// INITIALIZATION
    process.nextTick(function () {
        if (!window.document) {
            return; // window might've been closed already
        }
        if (window.document.readyState === "complete") {
            var ev = window.document.createEvent("HTMLEvents");
            ev.initEvent("load", false, false);
            window.dispatchEvent(ev);
        }
        else {
            window.document.addEventListener("load", function () {
                var ev = window.document.createEvent("HTMLEvents");
                ev.initEvent("load", false, false);
                window.dispatchEvent(ev);
            });
        }
    });
}
Object.setPrototypeOf(Window, EventTarget.interface);
Object.setPrototypeOf(Window.prototype, EventTarget.interface.prototype);
function matchesDontThrow(el, selector) {
    try {
        return el.matches(selector);
    }
    catch (e) {
        return false;
    }
}
function startTimer(window, startFn, stopFn, timerId, callback, ms, args) {
    if (typeof callback !== "function") {
        var code = String(callback);
        callback = window._globalProxy.eval.bind(window, code + ("\n//# sourceURL=" + window.location.href));
    }
    var oldCallback = callback;
    callback = function () {
        try {
            oldCallback.apply(window._globalProxy, args);
        }
        catch (e) {
            reportException(window, e, window.location.href);
        }
    };
    var res = startFn(callback, ms);
    window.__timers[timerId] = [res, stopFn];
    return timerId;
}
function stopTimer(window, id) {
    var timer = window.__timers[id];
    if (timer) {
        timer[1].call(window, timer[0]);
        delete window.__timers[id];
    }
}
function stopAllTimers(window) {
    Object.keys(window.__timers).forEach(function (key) {
        var timer = window.__timers[key];
        timer[1].call(window, timer[0]);
    });
    window.__timers = Object.create(null);
}
"use strict";
/* eslint-disable no-unused-expressions */
(function () { return "jsdom 7.x onward only works on Node.js 4 or newer: https://github.com/tmpvar/jsdom#install"; });
/* eslint-enable no-unused-expressions */
var fs = require("fs");
var path = require("path");
var CookieJar = require("tough-cookie").CookieJar;
var parseContentType = require("content-type-parser");
var toFileUrl = require("./jsdom/utils").toFileUrl;
var documentFeatures = require("./jsdom/browser/documentfeatures");
var domToHtml = require("./jsdom/browser/domtohtml").domToHtml;
var Window = require("./jsdom/browser/Window");
var resourceLoader = require("./jsdom/browser/resource-loader");
var VirtualConsole = require("./jsdom/virtual-console");
var locationInfo = require("./jsdom/living/helpers/internal-constants").locationInfo;
var idlUtils = require("./jsdom/living/generated/utils");
var blobSymbols = require("./jsdom/living/blob-symbols");
var whatwgURL = require("whatwg-url");
require("./jsdom/living"); // Enable living standard features
/* eslint-disable no-restricted-modules */
// TODO: stop using the built-in URL in favor of the spec-compliant whatwg-url package
// This legacy usage is in the process of being purged.
var URL = require("url");
/* eslint-enable no-restricted-modules */
var canReadFilesFromFS = Boolean(fs.readFile); // in a browserify environment, this isn't present
exports.createVirtualConsole = function (options) {
    return new VirtualConsole(options);
};
exports.getVirtualConsole = function (window) {
    return window._virtualConsole;
};
exports.createCookieJar = function () {
    return new CookieJar(null, { looseMode: true });
};
exports.nodeLocation = function (node) {
    return idlUtils.implForWrapper(node)[locationInfo];
};
exports.reconfigureWindow = function (window, newProps) {
    if ("top" in newProps) {
        window._top = newProps.top;
    }
};
exports.changeURL = function (window, urlString) {
    var doc = idlUtils.implForWrapper(window._document);
    var url = whatwgURL.parseURL(urlString);
    if (url === "failure") {
        throw new TypeError("Could not parse \"" + urlString + "\" as a URL");
    }
    doc._URL = url;
    doc._origin = whatwgURL.serializeURLToUnicodeOrigin(doc._URL);
};
// Proxy to features module
Object.defineProperty(exports, "defaultDocumentFeatures", {
    enumerable: true,
    configurable: true,
    get: function () {
        return documentFeatures.defaultDocumentFeatures;
    },
    set: function (v) {
        documentFeatures.defaultDocumentFeatures = v;
    }
});
exports.jsdom = function (html, options) {
    if (options === undefined) {
        options = {};
    }
    if (options.parsingMode === undefined || options.parsingMode === "auto") {
        options.parsingMode = "html";
    }
    if (options.parsingMode !== "html" && options.parsingMode !== "xml") {
        throw new RangeError("Invalid parsingMode option " + JSON.stringify(options.parsingMode) + "; must be either \"html\", " +
            "\"xml\", \"auto\", or undefined");
    }
    options.encoding = options.encoding || "UTF-8";
    setGlobalDefaultConfig(options);
    // Back-compat hack: we have previously suggested nesting these under document, for jsdom.env at least.
    // So we need to support that.
    if (options.document) {
        if (options.document.cookie !== undefined) {
            options.cookie = options.document.cookie;
        }
        if (options.document.referrer !== undefined) {
            options.referrer = options.document.referrer;
        }
    }
    // List options explicitly to be clear which are passed through
    var window = new Window({
        parsingMode: options.parsingMode,
        contentType: options.contentType,
        encoding: options.encoding,
        parser: options.parser,
        url: options.url,
        lastModified: options.lastModified,
        referrer: options.referrer,
        cookieJar: options.cookieJar,
        cookie: options.cookie,
        resourceLoader: options.resourceLoader,
        deferClose: options.deferClose,
        concurrentNodeIterators: options.concurrentNodeIterators,
        virtualConsole: options.virtualConsole,
        pool: options.pool,
        agent: options.agent,
        agentClass: options.agentClass,
        agentOptions: options.agentOptions,
        strictSSL: options.strictSSL,
        proxy: options.proxy,
        userAgent: options.userAgent
    });
    var documentImpl = idlUtils.implForWrapper(window.document);
    documentFeatures.applyDocumentFeatures(documentImpl, options.features);
    if (options.created) {
        options.created(null, window.document.defaultView);
    }
    if (options.parsingMode === "html") {
        if (html === undefined || html === "") {
            html = "<html><head></head><body></body></html>";
        }
        window.document.write(html);
    }
    else if (options.parsingMode === "xml") {
        if (html !== undefined) {
            documentImpl._htmlToDom.appendHtmlToDocument(html, documentImpl);
        }
    }
    if (window.document.close && !options.deferClose) {
        window.document.close();
    }
    return window.document;
};
exports.jQueryify = exports.jsdom.jQueryify = function (window, jqueryUrl, callback) {
    if (!window || !window.document) {
        return;
    }
    var implImpl = idlUtils.implForWrapper(window.document.implementation);
    var features = implImpl._features;
    implImpl._addFeature("FetchExternalResources", ["script"]);
    implImpl._addFeature("ProcessExternalResources", ["script"]);
    var scriptEl = window.document.createElement("script");
    scriptEl.className = "jsdom";
    scriptEl.src = jqueryUrl;
    scriptEl.onload = scriptEl.onerror = function () {
        implImpl._features = features;
        if (callback) {
            callback(window, window.jQuery);
        }
    };
    window.document.body.appendChild(scriptEl);
};
exports.env = exports.jsdom.env = function () {
    var config = getConfigFromArguments(arguments);
    var req = null;
    if (config.file && canReadFilesFromFS) {
        req = resourceLoader.readFile(config.file, { defaultEncoding: config.defaultEncoding, detectMetaCharset: true }, function (err, text, res) {
            if (err) {
                reportInitError(err, config);
                return;
            }
            var contentType = parseContentType(res.headers["content-type"]);
            config.encoding = contentType.get("charset");
            setParsingModeFromExtension(config, config.file);
            config.html = text;
            processHTML(config);
        });
    }
    else if (config.html !== undefined) {
        processHTML(config);
    }
    else if (config.url) {
        req = handleUrl(config);
    }
    else if (config.somethingToAutodetect !== undefined) {
        var url = URL.parse(config.somethingToAutodetect);
        if (url.protocol && url.hostname) {
            config.url = config.somethingToAutodetect;
            req = handleUrl(config.somethingToAutodetect);
        }
        else if (canReadFilesFromFS) {
            req = resourceLoader.readFile(config.somethingToAutodetect, { defaultEncoding: config.defaultEncoding, detectMetaCharset: true }, function (err, text, res) {
                if (err) {
                    if (err.code === "ENOENT" || err.code === "ENAMETOOLONG") {
                        config.html = config.somethingToAutodetect;
                        processHTML(config);
                    }
                    else {
                        reportInitError(err, config);
                    }
                }
                else {
                    var contentType = parseContentType(res.headers["content-type"]);
                    config.encoding = contentType.get("charset");
                    setParsingModeFromExtension(config, config.somethingToAutodetect);
                    config.html = text;
                    config.url = toFileUrl(config.somethingToAutodetect);
                    processHTML(config);
                }
            });
        }
        else {
            config.html = config.somethingToAutodetect;
            processHTML(config);
        }
    }
    function handleUrl() {
        config.cookieJar = config.cookieJar || exports.createCookieJar();
        var options = {
            defaultEncoding: config.defaultEncoding,
            detectMetaCharset: true,
            headers: config.headers,
            pool: config.pool,
            strictSSL: config.strictSSL,
            proxy: config.proxy,
            cookieJar: config.cookieJar,
            userAgent: config.userAgent,
            agent: config.agent,
            agentClass: config.agentClass,
            agentOptions: config.agentOptions
        };
        return resourceLoader.download(config.url, options, function (err, responseText, res) {
            if (err) {
                reportInitError(err, config);
                return;
            }
            // The use of `res.request.uri.href` ensures that `window.location.href`
            // is updated when `request` follows redirects.
            config.html = responseText;
            config.url = res.request.uri.href;
            if (res.headers["last-modified"]) {
                config.lastModified = new Date(res.headers["last-modified"]);
            }
            var contentType = parseContentType(res.headers["content-type"]);
            if (config.parsingMode === "auto") {
                if (contentType.isXML()) {
                    config.parsingMode = "xml";
                }
            }
            config.encoding = contentType.get("charset");
            processHTML(config);
        });
    }
    return req;
};
exports.serializeDocument = function (doc) {
    return domToHtml([doc]);
};
exports.blobToBuffer = function (blob) {
    return blob && blob[blobSymbols.buffer];
};
exports.evalVMScript = function (window, script) {
    return script.runInContext(idlUtils.implForWrapper(window._document)._global);
};
function processHTML(config) {
    var window = exports.jsdom(config.html, config).defaultView;
    var implImpl = idlUtils.implForWrapper(window.document.implementation);
    var features = JSON.parse(JSON.stringify(implImpl._features));
    var docsLoaded = 0;
    var totalDocs = config.scripts.length + config.src.length;
    if (!window || !window.document) {
        reportInitError(new Error("JSDOM: a window object could not be created."), config);
        return;
    }
    function scriptComplete() {
        docsLoaded++;
        if (docsLoaded >= totalDocs) {
            implImpl._features = features;
            process.nextTick(function () {
                if (config.onload) {
                    config.onload(window);
                }
                if (config.done) {
                    config.done(null, window);
                }
            });
        }
    }
    function handleScriptError() {
        // nextTick so that an exception within scriptComplete won't cause
        // another script onerror (which would be an infinite loop)
        process.nextTick(scriptComplete);
    }
    if (config.scripts.length > 0 || config.src.length > 0) {
        implImpl._addFeature("FetchExternalResources", ["script"]);
        implImpl._addFeature("ProcessExternalResources", ["script"]);
        for (var _i = 0, _a = config.scripts; _i < _a.length; _i++) {
            var scriptSrc = _a[_i];
            var script = window.document.createElement("script");
            script.className = "jsdom";
            script.onload = scriptComplete;
            script.onerror = handleScriptError;
            script.src = scriptSrc;
            window.document.body.appendChild(script);
        }
        for (var _b = 0, _c = config.src; _b < _c.length; _b++) {
            var scriptText = _c[_b];
            var script = window.document.createElement("script");
            script.onload = scriptComplete;
            script.onerror = handleScriptError;
            script.text = scriptText;
            window.document.documentElement.appendChild(script);
            window.document.documentElement.removeChild(script);
        }
    }
    else if (window.document.readyState === "complete") {
        scriptComplete();
    }
    else {
        window.addEventListener("load", scriptComplete);
    }
}
function setGlobalDefaultConfig(config) {
    config.pool = config.pool !== undefined ? config.pool : {
        maxSockets: 6
    };
    config.agentOptions = config.agentOptions !== undefined ? config.agentOptions : {
        keepAlive: true,
        keepAliveMsecs: 115 * 1000
    };
    config.strictSSL = config.strictSSL !== undefined ? config.strictSSL : true;
    config.userAgent = config.userAgent ||
        "Node.js (" + process.platform + "; U; rv:" + process.version + ") AppleWebKit/537.36 (KHTML, like Gecko)";
}
function getConfigFromArguments(args) {
    var config = {};
    if (typeof args[0] === "object") {
        Object.assign(config, args[0]);
    }
    else {
        for (var _i = 0, args_1 = args; _i < args_1.length; _i++) {
            var arg = args_1[_i];
            switch (typeof arg) {
                case "string":
                    config.somethingToAutodetect = arg;
                    break;
                case "function":
                    config.done = arg;
                    break;
                case "object":
                    if (Array.isArray(arg)) {
                        config.scripts = arg;
                    }
                    else {
                        Object.assign(config, arg);
                    }
                    break;
            }
        }
    }
    if (!config.done && !config.created && !config.onload) {
        throw new Error("Must pass a \"created\", \"onload\", or \"done\" option, or a callback, to jsdom.env");
    }
    if (config.somethingToAutodetect === undefined &&
        config.html === undefined && !config.file && !config.url) {
        throw new Error("Must pass a \"html\", \"file\", or \"url\" option, or a string, to jsdom.env");
    }
    config.scripts = ensureArray(config.scripts);
    config.src = ensureArray(config.src);
    config.parsingMode = config.parsingMode || "auto";
    config.features = config.features || {
        FetchExternalResources: false,
        ProcessExternalResources: false,
        SkipExternalResources: false
    };
    if (!config.url && config.file) {
        config.url = toFileUrl(config.file);
    }
    config.defaultEncoding = config.defaultEncoding || "windows-1252";
    setGlobalDefaultConfig(config);
    return config;
}
function reportInitError(err, config) {
    if (config.created) {
        config.created(err);
    }
    if (config.done) {
        config.done(err);
    }
}
function ensureArray(value) {
    var array = value || [];
    if (typeof array === "string") {
        array = [array];
    }
    return array;
}
function setParsingModeFromExtension(config, filename) {
    if (config.parsingMode === "auto") {
        var ext = path.extname(filename);
        if (ext === ".xhtml" || ext === ".xml") {
            config.parsingMode = "xml";
        }
    }
}
"use strict";
/* eslint-disable no-new-func */
var acorn = require("acorn");
var findGlobals = require("acorn-globals");
var escodegen = require("escodegen");
// We can't use the default browserify vm shim because it doesn't work in a web worker.
// From ES spec table of contents. Also, don't forget the Annex B additions.
// If someone feels ambitious maybe make this into an npm package.
var builtInConsts = ["Infinity", "NaN", "undefined"];
var otherBuiltIns = ["eval", "isFinite", "isNaN", "parseFloat", "parseInt", "decodeURI", "decodeURIComponent",
    "encodeURI", "encodeURIComponent", "Array", "ArrayBuffer", "Boolean", "DataView", "Date", "Error", "EvalError",
    "Float32Array", "Float64Array", "Function", "Int8Array", "Int16Array", "Int32Array", "Map", "Number", "Object",
    "Proxy", "Promise", "RangeError", "ReferenceError", "RegExp", "Set", "String", "Symbol", "SyntaxError", "TypeError",
    "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array", "URIError", "WeakMap", "WeakSet", "JSON", "Math",
    "Reflect", "escape", "unescape"];
exports.createContext = function (sandbox) {
    Object.defineProperty(sandbox, "__isVMShimContext", {
        value: true,
        writable: true,
        configurable: true,
        enumerable: false
    });
    for (var _i = 0, builtInConsts_1 = builtInConsts; _i < builtInConsts_1.length; _i++) {
        var builtIn = builtInConsts_1[_i];
        Object.defineProperty(sandbox, builtIn, {
            value: global[builtIn],
            writable: false,
            configurable: false,
            enumerable: false
        });
    }
    for (var _a = 0, otherBuiltIns_1 = otherBuiltIns; _a < otherBuiltIns_1.length; _a++) {
        var builtIn = otherBuiltIns_1[_a];
        Object.defineProperty(sandbox, builtIn, {
            value: global[builtIn],
            writable: true,
            configurable: true,
            enumerable: false
        });
    }
};
exports.isContext = function (sandbox) {
    return sandbox.__isVMShimContext;
};
exports.runInContext = function (code, contextifiedSandbox, options) {
    if (code === "this") {
        // Special case for during window creation.
        return contextifiedSandbox;
    }
    if (options === undefined) {
        options = {};
    }
    var comments = [];
    var tokens = [];
    var ast = acorn.parse(code, {
        allowReturnOutsideFunction: true,
        ranges: true,
        // collect comments in Esprima's format
        onComment: comments,
        // collect token ranges
        onToken: tokens
    });
    // make sure we keep comments
    escodegen.attachComments(ast, comments, tokens);
    var globals = findGlobals(ast);
    for (var i = 0; i < globals.length; ++i) {
        if (globals[i].name === "window") {
            continue;
        }
        var nodes = globals[i].nodes;
        for (var j = 0; j < nodes.length; ++j) {
            var type = nodes[j].type;
            var name_9 = nodes[j].name;
            nodes[j].type = "MemberExpression";
            nodes[j].property = { name: name_9, type: type };
            nodes[j].computed = false;
            nodes[j].object = {
                name: "window",
                type: "Identifier"
            };
        }
    }
    var lastNode = ast.body[ast.body.length - 1];
    if (lastNode.type === "ExpressionStatement") {
        lastNode.type = "ReturnStatement";
        lastNode.argument = lastNode.expression;
        delete lastNode.expression;
    }
    var rewrittenCode = escodegen.generate(ast, { comment: true });
    var suffix = options.filename !== undefined ? "\n//# sourceURL=" + options.filename : "";
    return Function("window", rewrittenCode + suffix).bind(contextifiedSandbox)(contextifiedSandbox);
};
"use strict";
exports.formData = Symbol("entries");
"use strict";
/* eslint-disable no-process-exit */
var util = require("util");
var jsdom = require("../../jsdom");
var xhrSymbols = require("./xmlhttprequest-symbols");
var tough = require("tough-cookie");
var doc = jsdom.jsdom();
var xhr = new doc.defaultView.XMLHttpRequest();
var chunks = [];
process.stdin.on("data", function (chunk) {
    chunks.push(chunk);
});
process.stdin.on("end", function () {
    var buffer = Buffer.concat(chunks);
    var flag = JSON.parse(buffer.toString(), function (k, v) {
        if (v && v.type === "Buffer" && v.data) {
            return new Buffer(v.data);
        }
        if (k === "cookieJar" && v) {
            return tough.CookieJar.fromJSON(v);
        }
        return v;
    });
    flag.synchronous = false;
    xhr[xhrSymbols.flag] = flag;
    var properties = xhr[xhrSymbols.properties];
    properties.readyState = doc.defaultView.XMLHttpRequest.OPENED;
    try {
        xhr.addEventListener("loadend", function () {
            if (properties.error) {
                properties.error = properties.error.stack || util.inspect(properties.error);
            }
            process.stdout.write(JSON.stringify({ properties: properties }), function () {
                process.exit(0);
            });
        }, false);
        xhr.send(flag.body);
    }
    catch (error) {
        properties.error += error.stack || util.inspect(error);
        process.stdout.write(JSON.stringify({ properties: properties }), function () {
            process.exit(0);
        });
    }
});
"use strict";
var Document = require("../generated/Document");
var core = require("..");
var applyDocumentFeatures = require("../../browser/documentfeatures").applyDocumentFeatures;
exports.implementation = (function () {
    function DOMParserImpl() {
    }
    DOMParserImpl.prototype.parseFromString = function (string, contentType) {
        switch (String(contentType)) {
            case "text/html": {
                return createScriptingDisabledDocument("html", contentType, string);
            }
            case "text/xml":
            case "application/xml":
            case "application/xhtml+xml":
            case "image/svg+xml": {
                // TODO: use a strict XML parser (sax's strict mode might work?) and create parsererror elements
                try {
                    return createScriptingDisabledDocument("xml", contentType, string);
                }
                catch (error) {
                    var document_3 = createScriptingDisabledDocument("xml", contentType);
                    var element = document_3.createElementNS("http://www.mozilla.org/newlayout/xml/parsererror.xml", "parsererror");
                    element.textContent = error.message;
                    document_3.appendChild(element);
                    return document_3;
                }
            }
            default:
                throw new TypeError("Invalid contentType");
        }
    };
    return DOMParserImpl;
}());
function createScriptingDisabledDocument(parsingMode, contentType, string) {
    var document = Document.createImpl([], {
        core: core,
        options: {
            parsingMode: parsingMode,
            encoding: "UTF-8",
            contentType: contentType
        }
    });
    // "scripting enabled" set to false
    applyDocumentFeatures(document, {
        FetchExternalResources: [],
        ProcessExternalResources: false,
        SkipExternalResources: false
    });
    if (string !== undefined) {
        document._htmlToDom.appendHtmlToDocument(string, document);
    }
    document.close();
    return document;
}
"use strict";
var EventImpl = require("./Event-impl").implementation;
var CustomEventImpl = (function (_super) {
    __extends(CustomEventImpl, _super);
    function CustomEventImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CustomEventImpl.prototype.initCustomEvent = function (type, bubbles, cancelable, detail) {
        if (this._dispatchFlag) {
            return;
        }
        this.initEvent(type, bubbles, cancelable);
        this.detail = detail;
    };
    return CustomEventImpl;
}(EventImpl));
module.exports = {
    implementation: CustomEventImpl
};
"use strict";
var EventImpl = require("./Event-impl").implementation;
var ErrorEventImpl = (function (_super) {
    __extends(ErrorEventImpl, _super);
    function ErrorEventImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ErrorEventImpl;
}(EventImpl));
module.exports = {
    implementation: ErrorEventImpl
};
"use strict";
var EventImpl = require("./Event-impl").implementation;
exports.implementation = (function (_super) {
    __extends(FocusEventImpl, _super);
    function FocusEventImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return FocusEventImpl;
}(EventImpl));
"use strict";
var EventImpl = require("./Event-impl").implementation;
var HashChangeEventImpl = (function (_super) {
    __extends(HashChangeEventImpl, _super);
    function HashChangeEventImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HashChangeEventImpl;
}(EventImpl));
module.exports = {
    implementation: HashChangeEventImpl
};
"use strict";
var EventImpl = require("./Event-impl").implementation;
var UIEventImpl = (function (_super) {
    __extends(UIEventImpl, _super);
    function UIEventImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UIEventImpl.prototype.initUIEvent = function (type, bubbles, cancelable, view, detail) {
        if (this._dispatchFlag) {
            return;
        }
        this.initEvent(type, bubbles, cancelable);
        this.view = view;
        this.detail = detail;
    };
    return UIEventImpl;
}(EventImpl));
module.exports = {
    implementation: UIEventImpl
};
"use strict";
var UIEventImpl = require("./UIEvent-impl").implementation;
var KeyboardEventImpl = (function (_super) {
    __extends(KeyboardEventImpl, _super);
    function KeyboardEventImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    KeyboardEventImpl.prototype.initKeyboardEvent = function (type, bubbles, cancelable, view, key, location, modifiersList, repeat, locale) {
        if (this._dispatchFlag) {
            return;
        }
        this.initUIEvent(type, bubbles, cancelable, view, key);
        this.location = location;
        this.modifiersList = modifiersList;
        this.repeat = repeat;
        this.locale = locale;
    };
    return KeyboardEventImpl;
}(UIEventImpl));
module.exports = {
    implementation: KeyboardEventImpl
};
"use strict";
var EventImpl = require("./Event-impl").implementation;
var MessageEventImpl = (function (_super) {
    __extends(MessageEventImpl, _super);
    function MessageEventImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MessageEventImpl.prototype.initMessageEvent = function (type, bubbles, cancelable, data, origin, lastEventId, source, ports) {
        if (this._dispatchFlag) {
            return;
        }
        this.initEvent(type, bubbles, cancelable);
        this.data = data;
        this.origin = origin;
        this.lastEventId = lastEventId;
        this.source = source;
        this.ports = ports;
    };
    return MessageEventImpl;
}(EventImpl));
module.exports = {
    implementation: MessageEventImpl
};
"use strict";
var UIEventImpl = require("./UIEvent-impl").implementation;
var MouseEventImpl = (function (_super) {
    __extends(MouseEventImpl, _super);
    function MouseEventImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MouseEventImpl.prototype.initMouseEvent = function (type, bubbles, cancelable, view, detail, screenX, screenY, clientX, clientY, ctrlKey, altKey, shiftKey, metaKey, button, relatedTarget) {
        if (this._dispatchFlag) {
            return;
        }
        this.initUIEvent(type, bubbles, cancelable, view, detail);
        this.screenX = screenX;
        this.screenY = screenY;
        this.clientX = clientX;
        this.clientY = clientY;
        this.ctrlKey = ctrlKey;
        this.altKey = altKey;
        this.shiftKey = shiftKey;
        this.metaKey = metaKey;
        this.button = button;
        this.relatedTarget = relatedTarget;
    };
    return MouseEventImpl;
}(UIEventImpl));
module.exports = {
    implementation: MouseEventImpl
};
"use strict";
var EventImpl = require("./Event-impl.js").implementation;
exports.implementation = (function (_super) {
    __extends(PopStateEventImpl, _super);
    function PopStateEventImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return PopStateEventImpl;
}(EventImpl));
"use strict";
var EventImpl = require("./Event-impl").implementation;
var ProgressEventImpl = (function (_super) {
    __extends(ProgressEventImpl, _super);
    function ProgressEventImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ProgressEventImpl;
}(EventImpl));
module.exports = {
    implementation: ProgressEventImpl
};
"use strict";
var UIEventImpl = require("./UIEvent-impl").implementation;
var TouchEventImpl = (function (_super) {
    __extends(TouchEventImpl, _super);
    function TouchEventImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return TouchEventImpl;
}(UIEventImpl));
module.exports = {
    implementation: TouchEventImpl
};
"use strict";
var submittableLocalNames = new Set(["button", "input", "keygen", "object", "select", "textarea"]);
exports.isDisabled = function (formControl) {
    if (formControl.localName === "button" || formControl.localName === "input" || formControl.localName === "select" ||
        formControl.localName === "textarea") {
        if (formControl.hasAttribute("disabled")) {
            return true;
        }
    }
    var e = formControl.parentNode;
    while (e) {
        if (e.localName === "fieldset" && e.hasAttribute("disabled")) {
            var firstLegendElementChild = e.querySelector("legend");
            if (!firstLegendElementChild || !firstLegendElementChild.contains(formControl)) {
                return true;
            }
        }
        e = e.parentNode;
    }
    return false;
};
exports.isSubmittable = function (formControl) {
    // https://html.spec.whatwg.org/multipage/forms.html#category-submit
    return submittableLocalNames.has(formControl.localName);
};
exports.isButton = function (formControl) {
    // https://html.spec.whatwg.org/multipage/forms.html#concept-button
    return formControl.type === "button" || formControl.type === "submit" || formControl.type === "reset" ||
        formControl.type === "image" || formControl.localName === "button";
};
exports.normalizeToCRLF = function (string) {
    return string.replace(/\r([^\n])/g, "\r\n$1")
        .replace(/\r$/, "\r\n")
        .replace(/([^\r])\n/g, "$1\r\n")
        .replace(/^\n/, "\r\n");
};
"use strict";
var nodeType = require("../node-type.js");
var FocusEvent = require("../generated/FocusEvent.js");
var idlUtils = require("../generated/utils.js");
var isDisabled = require("./form-controls.js").isDisabled;
var focusableFormElements = new Set(["input", "select", "textarea", "button"]);
// https://html.spec.whatwg.org/multipage/interaction.html#focusable-area, but also some of
// https://html.spec.whatwg.org/multipage/interaction.html#focusing-steps: e.g., Documents are not actually focusable
// areas, but their viewports are, and the first step of the latter algorithm translates Documents to their viewports.
// And also https://html.spec.whatwg.org/multipage/interaction.html#specially-focusable!
exports.isFocusableAreaElement = function (elImpl) {
    if (!elImpl._ownerDocument._defaultView && !elImpl._defaultView) {
        return false;
    }
    if (elImpl._nodeType === nodeType.DOCUMENT_NODE) {
        return true;
    }
    if (!Number.isNaN(parseInt(elImpl.getAttribute("tabindex")))) {
        return true;
    }
    if (elImpl._namespaceURI === "http://www.w3.org/1999/xhtml") {
        if (elImpl._localName === "iframe") {
            return true;
        }
        if (elImpl._localName === "a" && elImpl.hasAttribute("href")) {
            return true;
        }
        if (focusableFormElements.has(elImpl._localName) && !isDisabled(elImpl)) {
            if (elImpl._localName === "input" && elImpl.type === "hidden") {
                return false;
            }
            return true;
        }
    }
    return false;
};
// https://html.spec.whatwg.org/multipage/interaction.html#fire-a-focus-event plus the steps of
// https://html.spec.whatwg.org/multipage/interaction.html#focus-update-steps that adjust Documents to Windows
exports.fireFocusEventWithTargetAdjustment = function (name, target, relatedTarget) {
    if (target === null) {
        // E.g. firing blur with nothing previously focused.
        return;
    }
    var event = FocusEvent.createImpl([name, {
            bubbles: false,
            cancelable: false,
            relatedTarget: relatedTarget,
            view: target._ownerDocument._defaultView,
            detail: 0
        }], {
        isTrusted: true
    });
    if (target._defaultView) {
        target = idlUtils.implForWrapper(target._defaultView);
    }
    // _dispatch allows setting isTrusted
    target._dispatch(event);
};
"use strict";
// https://html.spec.whatwg.org/multipage/webappapis.html#event-handlers-on-elements,-document-objects,-and-window-objects
module.exports = new Set(["onblur", "onerror", "onfocus", "onload", "onresize", "onscroll", "onafterprint",
    "onbeforeprint", "onbeforeunload", "onhashchange", "onlanguagechange", "onmessage", "onoffline", "ononline",
    "onpagehide", "onpageshow", "onpopstate", "onstorage", "onunload"]);
// level2/html sets up setters/getters on HTMLBodyElement that proxy to the window (setting data properties there)
// level1/core sets up so that modifying the appropriate attributes on body elements will forward to setting on
// the window, with the appropriate `this`.
"use strict";
var cssom = require("cssom");
var whatwgEncoding = require("whatwg-encoding");
var whatwgURL = require("whatwg-url");
var resourceLoader = require("../../browser/resource-loader");
exports.fetchStylesheet = function (elementImpl, urlString, sheet) {
    var parsedURL = whatwgURL.parseURL(urlString);
    return fetchStylesheetInternal(elementImpl, urlString, parsedURL, sheet);
};
exports.evaluateStylesheet = function (elementImpl, data, sheet, baseURL) {
    var newStyleSheet;
    try {
        newStyleSheet = cssom.parse(data);
    }
    catch (e) {
        if (elementImpl._ownerDocument._defaultView) {
            var error = new Error("Could not parse CSS stylesheet");
            error.detail = data;
            error.type = "css parsing";
            elementImpl._ownerDocument._defaultView._virtualConsole.emit("jsdomError", error);
        }
        elementImpl._ownerDocument.styleSheets.push(sheet);
        return;
    }
    var spliceArgs = newStyleSheet.cssRules;
    spliceArgs.unshift(0, sheet.cssRules.length);
    Array.prototype.splice.apply(sheet.cssRules, spliceArgs);
    scanForImportRules(elementImpl, sheet.cssRules, baseURL);
    elementImpl._ownerDocument.styleSheets.push(sheet);
};
function fetchStylesheetInternal(elementImpl, urlString, parsedURL, sheet) {
    var defaultEncoding = elementImpl._ownerDocument._encoding;
    if (elementImpl.localName === "link" && elementImpl.hasAttribute("charset")) {
        defaultEncoding = whatwgEncoding.labelToName(elementImpl.getAttribute("charset"));
    }
    resourceLoader.load(elementImpl, urlString, { defaultEncoding: defaultEncoding }, function (data) {
        // TODO: MIME type checking?
        exports.evaluateStylesheet(elementImpl, data, sheet, parsedURL);
    });
}
function scanForImportRules(elementImpl, cssRules, baseURL) {
    if (!cssRules) {
        return;
    }
    for (var i = 0; i < cssRules.length; ++i) {
        if (cssRules[i].cssRules) {
            // @media rule: keep searching inside it.
            scanForImportRules(elementImpl, cssRules[i].cssRules, baseURL);
        }
        else if (cssRules[i].href) {
            // @import rule: fetch the resource and evaluate it.
            // See http://dev.w3.org/csswg/cssom/#css-import-rule
            //     If loading of the style sheet fails its cssRules list is simply
            //     empty. I.e. an @import rule always has an associated style sheet.
            var parsed = whatwgURL.parseURL(cssRules[i].href, { baseURL: baseURL });
            if (parsed === "failure") {
                var window_2 = elementImpl._ownerDocument._defaultView;
                if (window_2) {
                    var error = new Error("Could not parse CSS @import URL " + cssRules[i].href + " relative to base URL " +
                        ("\"" + whatwgURL.serializeURL(baseURL) + "\""));
                    error.type = "css @import URL parsing";
                    window_2._virtualConsole.emit("jsdomError", error);
                }
            }
            else {
                fetchStylesheetInternal(elementImpl, whatwgURL.serializeURL(parsed), parsed, elementImpl.sheet);
            }
        }
    }
}
"use strict";
exports.implementation = (function () {
    function NavigatorIDImpl() {
    }
    Object.defineProperty(NavigatorIDImpl.prototype, "appCodeName", {
        get: function () {
            return "Mozilla";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigatorIDImpl.prototype, "appName", {
        get: function () {
            return "Netscape";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigatorIDImpl.prototype, "appVersion", {
        get: function () {
            return "4.0";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigatorIDImpl.prototype, "platform", {
        get: function () {
            return "";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigatorIDImpl.prototype, "product", {
        get: function () {
            return "Gecko";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigatorIDImpl.prototype, "productSub", {
        get: function () {
            return "20030107";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigatorIDImpl.prototype, "vendor", {
        // see Navigator constructor for userAgent
        get: function () {
            return "Apple Computer, Inc.";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigatorIDImpl.prototype, "vendorSub", {
        get: function () {
            return "";
        },
        enumerable: true,
        configurable: true
    });
    return NavigatorIDImpl;
}());
"use strict";
exports.implementation = (function () {
    function NavigatorLanguageImpl() {
    }
    Object.defineProperty(NavigatorLanguageImpl.prototype, "language", {
        get: function () {
            return "en-US";
        },
        enumerable: true,
        configurable: true
    });
    return NavigatorLanguageImpl;
}());
"use strict";
exports.implementation = (function () {
    function NavigatorOnLineImpl() {
    }
    Object.defineProperty(NavigatorOnLineImpl.prototype, "onLine", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    return NavigatorOnLineImpl;
}());
"use strict";
exports.implementation = (function () {
    function NavigatorCookiesImpl() {
    }
    Object.defineProperty(NavigatorCookiesImpl.prototype, "cookieEnabled", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    return NavigatorCookiesImpl;
}());
"use strict";
exports.implementation = (function () {
    function NavigatorPluginsImpl() {
    }
    NavigatorPluginsImpl.prototype.javaEnabled = function () {
        return false;
    };
    return NavigatorPluginsImpl;
}());
"use strict";
var os = require("os");
exports.implementation = (function () {
    function NavigatorConcurrentHardwareImpl() {
    }
    Object.defineProperty(NavigatorConcurrentHardwareImpl.prototype, "hardwareConcurrency", {
        get: function () {
            return os.cpus().length;
        },
        enumerable: true,
        configurable: true
    });
    return NavigatorConcurrentHardwareImpl;
}());
"use strict";
var idlUtils = require("../generated/utils");
var NavigatorIDImpl = require("./NavigatorID-impl").implementation;
var NavigatorLanguageImpl = require("./NavigatorLanguage-impl").implementation;
var NavigatorOnLineImpl = require("./NavigatorOnLine-impl").implementation;
var NavigatorCookiesImpl = require("./NavigatorCookies-impl").implementation;
var NavigatorPluginsImpl = require("./NavigatorPlugins-impl").implementation;
var NavigatorConcurrentHardwareImpl = require("./NavigatorConcurrentHardware-impl").implementation;
var NavigatorImpl = (function () {
    function NavigatorImpl(args, privateData) {
        this.userAgent = privateData.userAgent;
        this.languages = Object.freeze(["en-US", "en"]);
    }
    return NavigatorImpl;
}());
idlUtils.mixin(NavigatorImpl.prototype, NavigatorIDImpl.prototype);
idlUtils.mixin(NavigatorImpl.prototype, NavigatorLanguageImpl.prototype);
idlUtils.mixin(NavigatorImpl.prototype, NavigatorOnLineImpl.prototype);
idlUtils.mixin(NavigatorImpl.prototype, NavigatorCookiesImpl.prototype);
idlUtils.mixin(NavigatorImpl.prototype, NavigatorPluginsImpl.prototype);
idlUtils.mixin(NavigatorImpl.prototype, NavigatorConcurrentHardwareImpl.prototype);
exports.implementation = NavigatorImpl;
"use strict";
var ChildNodeImpl = (function () {
    function ChildNodeImpl() {
    }
    ChildNodeImpl.prototype.remove = function () {
        if (!this.parentNode) {
            return;
        }
        this.parentNode.removeChild(this);
    };
    return ChildNodeImpl;
}());
module.exports = {
    implementation: ChildNodeImpl
};
"use strict";
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var NODE_TYPE = require("../node-type");
var NonDocumentTypeChildNodeImpl = (function () {
    function NonDocumentTypeChildNodeImpl() {
    }
    Object.defineProperty(NonDocumentTypeChildNodeImpl.prototype, "nextElementSibling", {
        get: function () {
            for (var _i = 0, _a = domSymbolTree.nextSiblingsIterator(this); _i < _a.length; _i++) {
                var sibling = _a[_i];
                if (sibling.nodeType === NODE_TYPE.ELEMENT_NODE) {
                    return sibling;
                }
            }
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NonDocumentTypeChildNodeImpl.prototype, "previousElementSibling", {
        get: function () {
            for (var _i = 0, _a = domSymbolTree.previousSiblingsIterator(this); _i < _a.length; _i++) {
                var sibling = _a[_i];
                if (sibling.nodeType === NODE_TYPE.ELEMENT_NODE) {
                    return sibling;
                }
            }
            return null;
        },
        enumerable: true,
        configurable: true
    });
    return NonDocumentTypeChildNodeImpl;
}());
module.exports = {
    implementation: NonDocumentTypeChildNodeImpl
};
"use strict";
var idlUtils = require("../generated/utils");
var NodeImpl = require("./Node-impl").implementation;
var ChildNodeImpl = require("./ChildNode-impl").implementation;
var NonDocumentTypeChildNodeImpl = require("./NonDocumentTypeChildNode-impl").implementation;
var DOMException = require("../../web-idl/DOMException");
var CharacterDataImpl = (function (_super) {
    __extends(CharacterDataImpl, _super);
    function CharacterDataImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this._data = privateData.data;
        return _this;
    }
    Object.defineProperty(CharacterDataImpl.prototype, "data", {
        get: function () {
            return this._data;
        },
        set: function (data) {
            this._data = data;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CharacterDataImpl.prototype, "length", {
        get: function () {
            return this._data.length;
        },
        enumerable: true,
        configurable: true
    });
    CharacterDataImpl.prototype.substringData = function (offset, count) {
        var length = this.length;
        if (offset > length) {
            throw new DOMException(DOMException.INDEX_SIZE_ERR);
        }
        if (offset + count > length) {
            return this._data.substring(offset);
        }
        return this._data.substring(offset, offset + count);
    };
    CharacterDataImpl.prototype.appendData = function (data) {
        this.replaceData(this.length, 0, data);
    };
    CharacterDataImpl.prototype.insertData = function (offset, data) {
        this.replaceData(offset, 0, data);
    };
    CharacterDataImpl.prototype.deleteData = function (offset, count) {
        this.replaceData(offset, count, "");
    };
    CharacterDataImpl.prototype.replaceData = function (offset, count, data) {
        var length = this.length;
        if (offset > length) {
            throw new DOMException(DOMException.INDEX_SIZE_ERR);
        }
        if (offset + count > length) {
            count = length - offset;
        }
        var start = this._data.substring(0, offset);
        var end = this._data.substring(offset + count);
        this._data = start + data + end;
        // TODO: range stuff
    };
    return CharacterDataImpl;
}(NodeImpl));
idlUtils.mixin(CharacterDataImpl.prototype, NonDocumentTypeChildNodeImpl.prototype);
idlUtils.mixin(CharacterDataImpl.prototype, ChildNodeImpl.prototype);
module.exports = {
    implementation: CharacterDataImpl
};
"use strict";
var CharacterDataImpl = require("./CharacterData-impl").implementation;
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var DOMException = require("../../web-idl/DOMException");
var NODE_TYPE = require("../node-type");
var TextImpl = (function (_super) {
    __extends(TextImpl, _super);
    function TextImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this.nodeType = NODE_TYPE.TEXT_NODE;
        return _this;
    }
    TextImpl.prototype.splitText = function (offset) {
        offset >>>= 0;
        var length = this.length;
        if (offset > length) {
            throw new DOMException(DOMException.INDEX_SIZE_ERR);
        }
        var count = length - offset;
        var newData = this.substringData(offset, count);
        var newNode = this._ownerDocument.createTextNode(newData);
        var parent = domSymbolTree.parent(this);
        if (parent !== null) {
            parent.insertBefore(newNode, this.nextSibling);
        }
        this.replaceData(offset, count, "");
        return newNode;
        // TODO: range stuff
    };
    Object.defineProperty(TextImpl.prototype, "wholeText", {
        get: function () {
            var wholeText = this.textContent;
            var next;
            var current = this;
            while ((next = domSymbolTree.previousSibling(current)) && next.nodeType === NODE_TYPE.TEXT_NODE) {
                wholeText = next.textContent + wholeText;
                current = next;
            }
            current = this;
            while ((next = domSymbolTree.nextSibling(current)) && next.nodeType === NODE_TYPE.TEXT_NODE) {
                wholeText += next.textContent;
                current = next;
            }
            return wholeText;
        },
        enumerable: true,
        configurable: true
    });
    return TextImpl;
}(CharacterDataImpl));
module.exports = {
    implementation: TextImpl
};
"use strict";
var TextImpl = require("./Text-impl").implementation;
var NODE_TYPE = require("../node-type");
var CDATASectionImpl = (function (_super) {
    __extends(CDATASectionImpl, _super);
    function CDATASectionImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this.nodeType = NODE_TYPE.CDATA_SECTION_NODE;
        return _this;
    }
    return CDATASectionImpl;
}(TextImpl));
module.exports = {
    implementation: CDATASectionImpl
};
"use strict";
var CharacterDataImpl = require("./CharacterData-impl").implementation;
var NODE_TYPE = require("../node-type");
var CommentImpl = (function (_super) {
    __extends(CommentImpl, _super);
    function CommentImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this.nodeType = NODE_TYPE.COMMENT_NODE;
        return _this;
    }
    return CommentImpl;
}(CharacterDataImpl));
module.exports = {
    implementation: CommentImpl
};
"use strict";
var idlUtils = require("../generated/utils");
var NodeImpl = require("./Node-impl").implementation;
var ParentNodeImpl = require("./ParentNode-impl").implementation;
var NODE_TYPE = require("../node-type");
var DocumentFragmentImpl = (function (_super) {
    __extends(DocumentFragmentImpl, _super);
    function DocumentFragmentImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this.nodeType = NODE_TYPE.DOCUMENT_FRAGMENT_NODE;
        return _this;
    }
    return DocumentFragmentImpl;
}(NodeImpl));
idlUtils.mixin(DocumentFragmentImpl.prototype, ParentNodeImpl.prototype);
module.exports = {
    implementation: DocumentFragmentImpl
};
"use strict";
var idlUtils = require("../generated/utils");
var NodeImpl = require("./Node-impl").implementation;
var ChildNodeImpl = require("./ChildNode-impl").implementation;
var NODE_TYPE = require("../node-type");
var DocumentTypeImpl = (function (_super) {
    __extends(DocumentTypeImpl, _super);
    function DocumentTypeImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this.nodeType = NODE_TYPE.DOCUMENT_TYPE_NODE;
        _this.name = privateData.name;
        _this.publicId = privateData.publicId;
        _this.systemId = privateData.systemId;
        return _this;
    }
    return DocumentTypeImpl;
}(NodeImpl));
idlUtils.mixin(DocumentTypeImpl.prototype, ChildNodeImpl.prototype);
module.exports = {
    implementation: DocumentTypeImpl
};
"use strict";
var vm = require("vm");
var validateNames = require("../helpers/validate-names");
var DocumentType = require("../generated/DocumentType");
var Document = require("../generated/Document");
var DOMImplementationImpl = (function () {
    function DOMImplementationImpl(args, privateData) {
        this.core = privateData.core;
        this._ownerDocument = privateData.ownerDocument;
        this._features = Object.create(null);
    }
    DOMImplementationImpl.prototype.hasFeature = function () {
        return true;
    };
    DOMImplementationImpl.prototype.createDocumentType = function (qualifiedName, publicId, systemId) {
        validateNames.qname(qualifiedName);
        return DocumentType.createImpl([], {
            core: this.core,
            ownerDocument: this._ownerDocument,
            name: qualifiedName,
            publicId: publicId,
            systemId: systemId
        });
    };
    DOMImplementationImpl.prototype.createDocument = function (namespace, qualifiedName, doctype) {
        namespace = namespace !== null ? String(namespace) : namespace;
        qualifiedName = qualifiedName === null ? "" : String(qualifiedName);
        if (doctype === undefined) {
            doctype = null;
        }
        var document = Document.createImpl([], {
            core: this.core,
            options: { parsingMode: "xml", encoding: "UTF-8" }
        });
        var element = null;
        if (qualifiedName !== "") {
            element = document.createElementNS(namespace, qualifiedName);
        }
        if (doctype !== null) {
            document.appendChild(doctype);
        }
        if (element !== null) {
            document.appendChild(element);
        }
        return document;
    };
    DOMImplementationImpl.prototype.createHTMLDocument = function (title) {
        // Let doc be a new document that is an HTML document.
        // Set doc's content type to "text/html".
        var document = Document.createImpl([], {
            core: this.core,
            options: { parsingMode: "html", encoding: "UTF-8" }
        });
        // Create a doctype, with "html" as its name and with its node document set
        // to doc. Append the newly created node to doc.
        var doctype = DocumentType.createImpl([], {
            core: this.core,
            ownerDocument: this,
            name: "html",
            publicId: "",
            systemId: ""
        });
        document.appendChild(doctype);
        // Create an html element in the HTML namespace, and append it to doc.
        var htmlElement = document.createElementNS("http://www.w3.org/1999/xhtml", "html");
        document.appendChild(htmlElement);
        // Create a head element in the HTML namespace, and append it to the html
        // element created in the previous step.
        var headElement = document.createElement("head");
        htmlElement.appendChild(headElement);
        // If the title argument is not omitted:
        if (title !== undefined) {
            // Create a title element in the HTML namespace, and append it to the head
            // element created in the previous step.
            var titleElement = document.createElement("title");
            headElement.appendChild(titleElement);
            // Create a Text node, set its data to title (which could be the empty
            // string), and append it to the title element created in the previous step.
            titleElement.appendChild(document.createTextNode(title));
        }
        // Create a body element in the HTML namespace, and append it to the html
        // element created in the earlier step.
        htmlElement.appendChild(document.createElement("body"));
        // doc's origin is an alias to the origin of the context object's associated
        // document, and doc's effective script origin is an alias to the effective
        // script origin of the context object's associated document.
        return document;
    };
    DOMImplementationImpl.prototype._removeFeature = function (feature, version) {
        feature = feature.toLowerCase();
        if (this._features[feature]) {
            if (version) {
                var versions = this._features[feature];
                for (var j = 0; j < versions.length; j++) {
                    if (versions[j] === version) {
                        versions.splice(j, 1);
                        return;
                    }
                }
            }
            else {
                delete this._features[feature];
            }
        }
    };
    DOMImplementationImpl.prototype._addFeature = function (feature, version) {
        feature = feature.toLowerCase();
        if (version) {
            if (!this._features[feature]) {
                this._features[feature] = [];
            }
            if (version instanceof Array) {
                Array.prototype.push.apply(this._features[feature], version);
            }
            else {
                this._features[feature].push(version);
            }
            if (feature === "processexternalresources" &&
                (version === "script" || (version.indexOf && version.indexOf("script") !== -1)) &&
                !vm.isContext(this._ownerDocument._global)) {
                vm.createContext(this._ownerDocument._global);
                this._ownerDocument._defaultView._globalProxy = vm.runInContext("this", this._ownerDocument._global);
                this._ownerDocument._defaultView = this._ownerDocument._defaultView._globalProxy;
            }
        }
    };
    DOMImplementationImpl.prototype._hasFeature = function (feature, version) {
        feature = feature ? feature.toLowerCase() : "";
        var versions = this._features[feature] || false;
        if (!version && versions.length && versions.length > 0) {
            return true;
        }
        else if (typeof versions === "string") {
            return versions === version;
        }
        else if (versions.indexOf && versions.length > 0) {
            for (var i = 0; i < versions.length; i++) {
                var found = versions[i] instanceof RegExp ? versions[i].test(version) : versions[i] === version;
                if (found) {
                    return true;
                }
            }
            return false;
        }
        return false;
    };
    return DOMImplementationImpl;
}());
module.exports = {
    implementation: DOMImplementationImpl
};
"use strict";
var vm = require("vm");
var nwmatcher = require("nwmatcher/src/nwmatcher-noqsa");
var idlUtils = require("../generated/utils");
var NodeImpl = require("./Node-impl").implementation;
var ParentNodeImpl = require("./ParentNode-impl").implementation;
var ChildNodeImpl = require("./ChildNode-impl").implementation;
var attributes = require("../attributes");
var namedPropertiesWindow = require("../named-properties-window");
var NODE_TYPE = require("../node-type");
var domToHtml = require("../../browser/domtohtml").domToHtml;
var memoizeQuery = require("../../utils").memoizeQuery;
var clone = require("../node").clone;
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var resetDOMTokenList = require("../dom-token-list").reset;
var DOMException = require("../../web-idl/DOMException");
var createDOMTokenList = require("../dom-token-list").create;
var attrGenerated = require("../generated/Attr");
var validateNames = require("../helpers/validate-names");
var listOfElementsWithQualifiedName = require("../node").listOfElementsWithQualifiedName;
var listOfElementsWithNamespaceAndLocalName = require("../node").listOfElementsWithNamespaceAndLocalName;
var listOfElementsWithClassNames = require("../node").listOfElementsWithClassNames;
var proxiedWindowEventHandlers = require("../helpers/proxied-window-event-handlers");
var NonDocumentTypeChildNode = require("./NonDocumentTypeChildNode-impl").implementation;
// nwmatcher gets `document.documentElement` at creation-time, so we have to initialize lazily, since in the initial
// stages of Document initialization, there is no documentElement present yet.
function addNwmatcher(parentNode) {
    var document = parentNode._ownerDocument;
    if (!document._nwmatcher) {
        document._nwmatcher = nwmatcher({ document: document });
        document._nwmatcher.configure({ UNIQUE_ID: false });
    }
    return document._nwmatcher;
}
function clearChildNodes(node) {
    for (var child = domSymbolTree.firstChild(node); child; child = domSymbolTree.firstChild(node)) {
        node.removeChild(child);
    }
}
function setInnerHTML(document, node, html) {
    // Clear the children first:
    if (node._templateContents) {
        clearChildNodes(node._templateContents);
    }
    else {
        clearChildNodes(node);
    }
    if (html !== "") {
        if (node.nodeName === "#document") {
            document._htmlToDom.appendHtmlToDocument(html, node);
        }
        else {
            document._htmlToDom.appendHtmlToElement(html, node);
        }
    }
}
function attachId(id, elm, doc) {
    if (id && elm && doc) {
        if (!doc._ids[id]) {
            doc._ids[id] = [];
        }
        doc._ids[id].push(elm);
    }
}
function detachId(id, elm, doc) {
    if (id && elm && doc) {
        if (doc._ids && doc._ids[id]) {
            var elms = doc._ids[id];
            for (var i = 0; i < elms.length; i++) {
                if (elms[i] === elm) {
                    elms.splice(i, 1);
                    --i;
                }
            }
            if (elms.length === 0) {
                delete doc._ids[id];
            }
        }
    }
}
var ElementImpl = (function (_super) {
    __extends(ElementImpl, _super);
    function ElementImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this.nodeType = NODE_TYPE.ELEMENT_NODE;
        _this.scrollTop = 0;
        _this.scrollLeft = 0;
        _this._namespaceURI = null;
        _this._prefix = null;
        _this._localName = privateData.localName;
        _this._attributes = attributes.createNamedNodeMap(_this);
        return _this;
    }
    ElementImpl.prototype._attach = function () {
        namedPropertiesWindow.nodeAttachedToDocument(this);
        var id = this.getAttribute("id");
        if (id) {
            attachId(id, this, this._ownerDocument);
        }
        _super.prototype._attach.call(this);
    };
    ElementImpl.prototype._detach = function () {
        _super.prototype._detach.call(this);
        namedPropertiesWindow.nodeDetachedFromDocument(this);
        var id = this.getAttribute("id");
        if (id) {
            detachId(id, this, this._ownerDocument);
        }
    };
    ElementImpl.prototype._attrModified = function (name, value, oldValue) {
        this._modified();
        namedPropertiesWindow.elementAttributeModified(this, name, value, oldValue);
        if (name === "id" && this._attached) {
            var doc = this._ownerDocument;
            detachId(oldValue, this, doc);
            attachId(value, this, doc);
        }
        var w = this._ownerDocument._global;
        // TODO event handlers:
        // The correct way to do this is lazy, and a bit more complicated; see
        // https://html.spec.whatwg.org/multipage/webappapis.html#event-handler-content-attributes
        // It would only be possible if we had proper getters/setters for every event handler, which we don't right now.
        if (name.length > 2 && name[0] === "o" && name[1] === "n") {
            // If this document does not have a window, set IDL attribute to null
            // step 2: https://html.spec.whatwg.org/multipage/webappapis.html#getting-the-current-value-of-the-event-handler
            if (value && w) {
                var self_1 = proxiedWindowEventHandlers.has(name) && this._localName === "body" ? w : this;
                var vmOptions_1 = { filename: this._ownerDocument.URL, displayErrors: false };
                // The handler code probably refers to functions declared globally on the window, so we need to run it in
                // that context. In fact, it's worse; see
                // https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/bindings/core/v8/V8LazyEventListener.cpp
                // plus the spec, which show how multiple nested scopes are technically required. We won't implement that
                // until someone asks for it, though.
                // https://html.spec.whatwg.org/multipage/webappapis.html#the-event-handler-processing-algorithm
                if (name === "onerror" && self_1 === w) {
                    // https://html.spec.whatwg.org/multipage/webappapis.html#getting-the-current-value-of-the-event-handler
                    // step 10
                    self_1[name] = function (event, source, lineno, colno, error) {
                        w.__tempEventHandlerThis = this;
                        w.__tempEventHandlerEvent = event;
                        w.__tempEventHandlerSource = source;
                        w.__tempEventHandlerLineno = lineno;
                        w.__tempEventHandlerColno = colno;
                        w.__tempEventHandlerError = error;
                        try {
                            return vm.runInContext("\n                (function (event, source, lineno, colno, error) {\n                  " + value + "\n                }).call(__tempEventHandlerThis, __tempEventHandlerEvent, __tempEventHandlerSource,\n                        __tempEventHandlerLineno, __tempEventHandlerColno, __tempEventHandlerError)", w, vmOptions_1);
                        }
                        finally {
                            delete w.__tempEventHandlerThis;
                            delete w.__tempEventHandlerEvent;
                            delete w.__tempEventHandlerSource;
                            delete w.__tempEventHandlerLineno;
                            delete w.__tempEventHandlerColno;
                            delete w.__tempEventHandlerError;
                        }
                    };
                }
                else {
                    self_1[name] = function (event) {
                        w.__tempEventHandlerThis = this;
                        w.__tempEventHandlerEvent = event;
                        try {
                            return vm.runInContext("\n                (function (event) {\n                  " + value + "\n                }).call(__tempEventHandlerThis, __tempEventHandlerEvent)", w, vmOptions_1);
                        }
                        finally {
                            delete w.__tempEventHandlerThis;
                            delete w.__tempEventHandlerEvent;
                        }
                    };
                }
            }
            else {
                this[name] = null;
            }
        }
        // update classList
        if (name === "class") {
            resetDOMTokenList(this.classList, value);
        }
    };
    Object.defineProperty(ElementImpl.prototype, "namespaceURI", {
        get: function () {
            return this._namespaceURI;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElementImpl.prototype, "prefix", {
        get: function () {
            return this._prefix;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElementImpl.prototype, "localName", {
        get: function () {
            return this._localName;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElementImpl.prototype, "_qualifiedName", {
        get: function () {
            return this._prefix !== null ? this._prefix + ":" + this._localName : this._localName;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElementImpl.prototype, "tagName", {
        get: function () {
            var qualifiedName = this._qualifiedName;
            if (this.namespaceURI === "http://www.w3.org/1999/xhtml" && this._ownerDocument._parsingMode === "html") {
                qualifiedName = qualifiedName.toUpperCase();
            }
            return qualifiedName;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElementImpl.prototype, "attributes", {
        get: function () {
            return this._attributes;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElementImpl.prototype, "outerHTML", {
        get: function () {
            return domToHtml([this]);
        },
        set: function (html) {
            if (html === null) {
                html = "";
            }
            var parent = domSymbolTree.parent(this);
            var document = this._ownerDocument;
            if (!parent) {
                return;
            }
            var contextElement;
            if (parent.nodeType === NODE_TYPE.DOCUMENT_NODE) {
                throw new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR, "Modifications are not allowed for this document");
            }
            else if (parent.nodeType === NODE_TYPE.DOCUMENT_FRAGMENT_NODE) {
                contextElement = document.createElementNS("http://www.w3.org/1999/xhtml", "body");
            }
            else if (parent.nodeType === NODE_TYPE.ELEMENT_NODE) {
                contextElement = clone(this._core, parent, undefined, false);
            }
            else {
                throw new TypeError("This should never happen");
            }
            document._htmlToDom.appendHtmlToElement(html, contextElement);
            while (contextElement.firstChild) {
                parent.insertBefore(contextElement.firstChild, this);
            }
            parent.removeChild(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElementImpl.prototype, "innerHTML", {
        get: function () {
            var tagName = this.tagName;
            if (tagName === "SCRIPT" || tagName === "STYLE") {
                var type = this.getAttribute("type");
                if (!type || /^text\//i.test(type) || /\/javascript$/i.test(type)) {
                    return domToHtml(domSymbolTree.childrenIterator(this));
                }
            }
            // In case of <template> we should pass its "template contents" fragment as a serialization root if we have one
            if (this._templateContents) {
                return domToHtml(domSymbolTree.childrenIterator(this._templateContents));
            }
            return domToHtml(domSymbolTree.childrenIterator(this));
        },
        set: function (html) {
            if (html === null) {
                html = "";
            }
            setInnerHTML(this.ownerDocument, this, html);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ElementImpl.prototype, "classList", {
        get: function () {
            if (this._classList === undefined) {
                this._classList = createDOMTokenList(this, "class");
            }
            return this._classList;
        },
        enumerable: true,
        configurable: true
    });
    ElementImpl.prototype.hasAttributes = function () {
        return attributes.hasAttributes(this);
    };
    ElementImpl.prototype.getAttributeNames = function () {
        return attributes.attributeNames(this);
    };
    ElementImpl.prototype.getAttribute = function (name) {
        return attributes.getAttributeValue(this, name);
    };
    ElementImpl.prototype.getAttributeNS = function (namespace, localName) {
        return attributes.getAttributeValueByNameNS(this, namespace, localName);
    };
    ElementImpl.prototype.setAttribute = function (name, value) {
        validateNames.name(name);
        if (this._namespaceURI === "http://www.w3.org/1999/xhtml" && this._ownerDocument._parsingMode === "html") {
            name = name.toLowerCase();
        }
        var attribute = attributes.getAttributeByName(this, name);
        if (attribute === null) {
            var newAttr = attrGenerated.createImpl([], { localName: name, value: value });
            attributes.appendAttribute(this, newAttr);
            return;
        }
        attributes.changeAttribute(this, attribute, value);
    };
    ElementImpl.prototype.setAttributeNS = function (namespace, name, value) {
        var extracted = validateNames.validateAndExtract(namespace, name);
        attributes.setAttributeValue(this, extracted.localName, value, extracted.prefix, extracted.namespace);
    };
    ElementImpl.prototype.removeAttribute = function (name) {
        attributes.removeAttributeByName(this, name);
    };
    ElementImpl.prototype.removeAttributeNS = function (namespace, localName) {
        attributes.removeAttributeByNameNS(this, namespace, localName);
    };
    ElementImpl.prototype.hasAttribute = function (name) {
        if (this._namespaceURI === "http://www.w3.org/1999/xhtml" && this._ownerDocument._parsingMode === "html") {
            name = name.toLowerCase();
        }
        return attributes.hasAttributeByName(this, name);
    };
    ElementImpl.prototype.hasAttributeNS = function (namespace, localName) {
        if (namespace === "") {
            namespace = null;
        }
        return attributes.hasAttributeByNameNS(this, namespace, localName);
    };
    ElementImpl.prototype.getAttributeNode = function (name) {
        return attributes.getAttributeByName(this, name);
    };
    ElementImpl.prototype.getAttributeNodeNS = function (namespace, localName) {
        return attributes.getAttributeByNameNS(this, namespace, localName);
    };
    ElementImpl.prototype.setAttributeNode = function (attr) {
        if (!attrGenerated.isImpl(attr)) {
            throw new TypeError("First argument to Element.prototype.setAttributeNode must be an Attr");
        }
        return attributes.setAttribute(this, attr);
    };
    ElementImpl.prototype.setAttributeNodeNS = function (attr) {
        if (!attrGenerated.isImpl(attr)) {
            throw new TypeError("First argument to Element.prototype.setAttributeNodeNS must be an Attr");
        }
        return attributes.setAttribute(this, attr);
    };
    ElementImpl.prototype.removeAttributeNode = function (attr) {
        if (!attrGenerated.isImpl(attr)) {
            throw new TypeError("First argument to Element.prototype.removeAttributeNode must be an Attr");
        }
        if (!attributes.hasAttribute(this, attr)) {
            throw new DOMException(DOMException.NOT_FOUND_ERR, "Tried to remove an attribute that was not present");
        }
        attributes.removeAttribute(this, attr);
        return attr;
    };
    ElementImpl.prototype.getBoundingClientRect = function () {
        return {
            bottom: 0,
            height: 0,
            left: 0,
            right: 0,
            top: 0,
            width: 0
        };
    };
    ElementImpl.prototype.getClientRects = function () {
        return [{
                bottom: 0,
                height: 0,
                left: 0,
                right: 0,
                top: 0,
                width: 0
            }];
    };
    // https://w3c.github.io/DOM-Parsing/#dom-element-insertadjacenthtml
    ElementImpl.prototype.insertAdjacentHTML = function (position, text) {
        position = position.toLowerCase();
        var context;
        switch (position) {
            case "beforebegin":
            case "afterend": {
                context = this.parentNode;
                if (context === null || context.nodeType === NODE_TYPE.DOCUMENT_NODE) {
                    throw new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR, "Cannot insert HTML adjacent to " +
                        "parent-less nodes or children of document nodes.");
                }
                break;
            }
            case "afterbegin":
            case "beforeend": {
                context = this;
                break;
            }
            default: {
                throw new DOMException(DOMException.SYNTAX_ERR, "Must provide one of \"beforebegin\", \"afterend\", " +
                    "\"afterbegin\", or \"beforeend\".");
            }
        }
        // TODO: use context for parsing instead of a <template>.
        var fragment = this.ownerDocument.createElement("template");
        fragment.innerHTML = text;
        switch (position) {
            case "beforebegin": {
                this.parentNode.insertBefore(fragment.content, this);
                break;
            }
            case "afterbegin": {
                this.insertBefore(fragment.content, this.firstChild);
                break;
            }
            case "beforeend": {
                this.appendChild(fragment.content);
                break;
            }
            case "afterend": {
                this.parentNode.insertBefore(fragment.content, this.nextSibling);
                break;
            }
        }
    };
    return ElementImpl;
}(NodeImpl));
idlUtils.mixin(ElementImpl.prototype, NonDocumentTypeChildNode.prototype);
idlUtils.mixin(ElementImpl.prototype, ParentNodeImpl.prototype);
idlUtils.mixin(ElementImpl.prototype, ChildNodeImpl.prototype);
ElementImpl.prototype.getElementsByTagName = memoizeQuery(function (qualifiedName) {
    return listOfElementsWithQualifiedName(qualifiedName, this);
});
ElementImpl.prototype.getElementsByTagNameNS = memoizeQuery(function (namespace, localName) {
    return listOfElementsWithNamespaceAndLocalName(namespace, localName, this);
});
ElementImpl.prototype.getElementsByClassName = memoizeQuery(function (classNames) {
    return listOfElementsWithClassNames(classNames, this);
});
ElementImpl.prototype.matches = memoizeQuery(function (selectors) {
    var matcher = addNwmatcher(this);
    try {
        return matcher.match(idlUtils.wrapperForImpl(this), selectors);
    }
    catch (e) {
        throw new DOMException(DOMException.SYNTAX_ERR, e.message);
    }
});
ElementImpl.prototype.webkitMatchesSelector = ElementImpl.prototype.matches;
module.exports = {
    implementation: ElementImpl
};
"use strict";
var ElementContentEditableImpl = (function () {
    function ElementContentEditableImpl() {
    }
    return ElementContentEditableImpl;
}());
module.exports = {
    implementation: ElementContentEditableImpl
};
"use strict";
var ElementCSSInlineStyle = (function () {
    function ElementCSSInlineStyle() {
    }
    return ElementCSSInlineStyle;
}());
module.exports = {
    implementation: ElementCSSInlineStyle
};
"use strict";
var GlobalEventHandlersImpl = (function () {
    function GlobalEventHandlersImpl() {
    }
    return GlobalEventHandlersImpl;
}());
module.exports = {
    implementation: GlobalEventHandlersImpl
};
"use strict";
var ElementImpl = require("./Element-impl").implementation;
var MouseEvent = require("../generated/MouseEvent");
var focusing = require("../helpers/focusing.js");
var conversions = require("webidl-conversions");
var isDisabled = require("../helpers/form-controls").isDisabled;
var HTMLElementImpl = (function (_super) {
    __extends(HTMLElementImpl, _super);
    function HTMLElementImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this._tabIndex = 0;
        _this._settingCssText = false;
        _this._clickInProgress = false;
        _this._style = new _this._core.CSSStyleDeclaration(function (newCssText) {
            if (!_this._settingCssText) {
                _this._settingCssText = true;
                _this.setAttribute("style", newCssText);
                _this._settingCssText = false;
            }
        });
        return _this;
    }
    // Add default event behavior (click link to navigate, click button to submit
    // form, etc). We start by wrapping dispatchEvent so we can forward events to
    // the element's default functions (only events that did not incur
    // preventDefault).
    HTMLElementImpl.prototype.dispatchEvent = function (event) {
        if (event.type === "click") {
            callEventBehaviorHook(event, "_preClickActivationSteps", this);
        }
        var outcome = _super.prototype.dispatchEvent.call(this, event);
        if (event.type === "click") {
            if (event.defaultPrevented) {
                callEventBehaviorHook(event, "_canceledActivationSteps");
            }
            else {
                callEventBehaviorHook(event, "_activationBehavior");
            }
        }
        return outcome;
    };
    HTMLElementImpl.prototype.focus = function () {
        if (!focusing.isFocusableAreaElement(this)) {
            return;
        }
        var previous = this._ownerDocument._lastFocusedElement;
        focusing.fireFocusEventWithTargetAdjustment("blur", previous, this);
        this._ownerDocument._lastFocusedElement = this;
        focusing.fireFocusEventWithTargetAdjustment("focus", this, previous);
        if (this._ownerDocument._defaultView._frameElement) {
            this._ownerDocument._defaultView._frameElement.focus();
        }
    };
    HTMLElementImpl.prototype.blur = function () {
        if (this._ownerDocument._lastFocusedElement !== this || !focusing.isFocusableAreaElement(this)) {
            return;
        }
        focusing.fireFocusEventWithTargetAdjustment("blur", this, this._ownerDocument);
        this._ownerDocument._lastFocusedElement = null;
        focusing.fireFocusEventWithTargetAdjustment("focus", this._ownerDocument, this);
    };
    HTMLElementImpl.prototype.click = function () {
        // https://html.spec.whatwg.org/multipage/interaction.html#dom-click
        // https://html.spec.whatwg.org/multipage/interaction.html#run-synthetic-click-activation-steps
        // Not completely spec compliant due to e.g. incomplete implementations of disabled for form controls, or no
        // implementation at all of isTrusted.
        if (this._clickInProgress) {
            return;
        }
        this._clickInProgress = true;
        if (isDisabled(this)) {
            return;
        }
        var event = MouseEvent.createImpl(["click", { bubbles: true, cancelable: true }], {});
        // Run synthetic click activation steps. According to the spec,
        // this should not be calling dispatchEvent, but it matches browser behavior.
        // See: https://www.w3.org/Bugs/Public/show_bug.cgi?id=12230
        // See also: https://github.com/whatwg/html/issues/805
        this.dispatchEvent(event);
        this._clickInProgress = false;
    };
    Object.defineProperty(HTMLElementImpl.prototype, "style", {
        get: function () {
            return this._style;
        },
        set: function (value) {
            this._style.cssText = value;
        },
        enumerable: true,
        configurable: true
    });
    HTMLElementImpl.prototype._attrModified = function (name, value, oldValue) {
        if (name === "style" && value !== oldValue && !this._settingCssText) {
            this._settingCssText = true;
            this._style.cssText = value;
            this._settingCssText = false;
        }
        _super.prototype._attrModified.apply(this, arguments);
    };
    Object.defineProperty(HTMLElementImpl.prototype, "tabIndex", {
        // TODO this should be [Reflect]able if we added default value support to webidl2js's [Reflect]
        get: function () {
            if (!this.hasAttribute("tabindex")) {
                return focusing.isFocusableAreaElement(this) ? 0 : -1;
            }
            return conversions.long(this.getAttribute("tabindex"));
        },
        set: function (value) {
            this.setAttribute("tabIndex", String(value));
        },
        enumerable: true,
        configurable: true
    });
    return HTMLElementImpl;
}(ElementImpl));
function callEventBehaviorHook(event, name, targetOverride) {
    if (event) {
        var target = targetOverride || event.target;
        if (target && typeof target[name] === "function") {
            target[name]();
        }
    }
}
module.exports = {
    implementation: HTMLElementImpl
};
"use strict";
var whatwgURL = require("whatwg-url");
var parseURLToResultingURLRecord = require("../helpers/document-base-url").parseURLToResultingURLRecord;
exports.implementation = (function () {
    function HTMLHyperlinkElementUtilsImpl() {
    }
    HTMLHyperlinkElementUtilsImpl.prototype._htmlHyperlinkElementUtilsSetup = function () {
        this.url = null;
    };
    HTMLHyperlinkElementUtilsImpl.prototype.toString = function () {
        return this.href;
    };
    Object.defineProperty(HTMLHyperlinkElementUtilsImpl.prototype, "href", {
        get: function () {
            setTheURL(this);
            var url = this.url;
            if (url === null) {
                var href = this.getAttribute("href");
                return href === null ? "" : href;
            }
            return whatwgURL.serializeURL(url);
        },
        set: function (v) {
            this.setAttribute("href", v);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLHyperlinkElementUtilsImpl.prototype, "origin", {
        get: function () {
            setTheURL(this);
            if (this.url === null) {
                return "";
            }
            return whatwgURL.serializeURLToUnicodeOrigin(this.url);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLHyperlinkElementUtilsImpl.prototype, "protocol", {
        get: function () {
            setTheURL(this);
            if (this.url === null) {
                return ":";
            }
            return this.url.scheme + ":";
        },
        set: function (v) {
            if (this.url === null) {
                return;
            }
            whatwgURL.basicURLParse(v + ":", { url: this.url, stateOverride: "scheme start" });
            updateHref(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLHyperlinkElementUtilsImpl.prototype, "username", {
        get: function () {
            setTheURL(this);
            if (this.url === null) {
                return "";
            }
            return this.url.username;
        },
        set: function (v) {
            var url = this.url;
            if (url === null || url.host === null || url.cannotBeABaseURL) {
                return;
            }
            whatwgURL.setTheUsername(url, v);
            updateHref(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLHyperlinkElementUtilsImpl.prototype, "password", {
        get: function () {
            setTheURL(this);
            var url = this.url;
            if (url === null || url.password === null) {
                return "";
            }
            return url.password;
        },
        set: function (v) {
            var url = this.url;
            if (url === null || url.host === null || url.cannotBeABaseURL) {
                return;
            }
            whatwgURL.setThePassword(url, v);
            updateHref(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLHyperlinkElementUtilsImpl.prototype, "host", {
        get: function () {
            setTheURL(this);
            var url = this.url;
            if (url === null || url.host === null) {
                return "";
            }
            if (url.port === null) {
                return whatwgURL.serializeHost(url.host);
            }
            return whatwgURL.serializeHost(url.host) + ":" + whatwgURL.serializeInteger(url.port);
        },
        set: function (v) {
            setTheURL(this);
            var url = this.url;
            if (url === null || url.cannotBeABaseURL) {
                return;
            }
            whatwgURL.basicURLParse(v, { url: url, stateOverride: "host" });
            updateHref(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLHyperlinkElementUtilsImpl.prototype, "hostname", {
        get: function () {
            setTheURL(this);
            var url = this.url;
            if (url === null || url.host === null) {
                return "";
            }
            return whatwgURL.serializeHost(url.host);
        },
        set: function (v) {
            setTheURL(this);
            var url = this.url;
            if (url === null || url.cannotBeABaseURL) {
                return;
            }
            whatwgURL.basicURLParse(v, { url: url, stateOverride: "hostname" });
            updateHref(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLHyperlinkElementUtilsImpl.prototype, "port", {
        get: function () {
            setTheURL(this);
            var url = this.url;
            if (url === null || url.port === null) {
                return "";
            }
            return whatwgURL.serializeInteger(url.port);
        },
        set: function (v) {
            setTheURL(this);
            var url = this.url;
            if (url === null || url.host === null || url.cannotBeABaseURL || url.scheme === "file") {
                return;
            }
            whatwgURL.basicURLParse(v, { url: url, stateOverride: "port" });
            updateHref(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLHyperlinkElementUtilsImpl.prototype, "pathname", {
        get: function () {
            setTheURL(this);
            var url = this.url;
            if (url === null) {
                return "";
            }
            if (url.cannotBeABaseURL) {
                return url.path[0];
            }
            return "/" + url.path.join("/");
        },
        set: function (v) {
            setTheURL(this);
            var url = this.url;
            if (url === null || url.cannotBeABaseURL) {
                return;
            }
            url.path = [];
            whatwgURL.basicURLParse(v, { url: url, stateOverride: "path start" });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLHyperlinkElementUtilsImpl.prototype, "search", {
        get: function () {
            setTheURL(this);
            var url = this.url;
            if (url === null || url.query === null || url.query === "") {
                return "";
            }
            return "?" + url.query;
        },
        set: function (v) {
            setTheURL(this);
            var url = this.url;
            if (url === null) {
                return;
            }
            if (v === "") {
                url.query = null;
            }
            else {
                var input = v[0] === "?" ? v.substring(1) : v;
                url.query = "";
                whatwgURL.basicURLParse(input, { url: url, stateOverride: "query" });
            }
            updateHref(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLHyperlinkElementUtilsImpl.prototype, "hash", {
        get: function () {
            setTheURL(this);
            var url = this.url;
            if (url === null || url.fragment === null || url.fragment === "") {
                return "";
            }
            return "#" + url.fragment;
        },
        set: function (v) {
            setTheURL(this);
            var url = this.url;
            if (url === null || url.scheme === "javascript") {
                return;
            }
            if (v === "") {
                url.fragment = null;
            }
            else {
                var input = v[0] === "#" ? v.substring(1) : v;
                url.fragment = "";
                whatwgURL.basicURLParse(input, { url: url, stateOverride: "fragment" });
            }
            updateHref(this);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLHyperlinkElementUtilsImpl;
}());
function setTheURL(hheu) {
    var href = hheu.getAttribute("href");
    if (href === null) {
        hheu.url = null;
        return;
    }
    var parsed = parseURLToResultingURLRecord(href, hheu._ownerDocument);
    hheu.url = parsed === "failure" ? null : parsed;
}
function updateHref(hheu) {
    hheu.setAttribute("href", whatwgURL.serializeURL(hheu.url));
}
"use strict";
var idlUtils = require("../generated/utils");
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLHyperlinkElementUtilsImpl = require("./HTMLHyperlinkElementUtils-impl").implementation;
var HTMLAnchorElementImpl = (function (_super) {
    __extends(HTMLAnchorElementImpl, _super);
    function HTMLAnchorElementImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this._htmlHyperlinkElementUtilsSetup();
        return _this;
    }
    Object.defineProperty(HTMLAnchorElementImpl.prototype, "text", {
        get: function () {
            return this.textContent;
        },
        set: function (v) {
            this.textContent = v;
        },
        enumerable: true,
        configurable: true
    });
    return HTMLAnchorElementImpl;
}(HTMLElementImpl));
idlUtils.mixin(HTMLAnchorElementImpl.prototype, HTMLHyperlinkElementUtilsImpl.prototype);
module.exports = {
    implementation: HTMLAnchorElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var reflectURLAttribute = require("../../utils").reflectURLAttribute;
var HTMLAppletElementImpl = (function (_super) {
    __extends(HTMLAppletElementImpl, _super);
    function HTMLAppletElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLAppletElementImpl.prototype, "object", {
        get: function () {
            return reflectURLAttribute(this, "object");
        },
        set: function (V) {
            this.setAttribute("object", V);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLAppletElementImpl.prototype, "codeBase", {
        get: function () {
            return reflectURLAttribute(this, "codebase");
        },
        set: function (V) {
            this.setAttribute("codebase", V);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLAppletElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLAppletElementImpl
};
"use strict";
var idlUtils = require("../generated/utils");
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLHyperlinkElementUtilsImpl = require("./HTMLHyperlinkElementUtils-impl").implementation;
var HTMLAreaElementImpl = (function (_super) {
    __extends(HTMLAreaElementImpl, _super);
    function HTMLAreaElementImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this._htmlHyperlinkElementUtilsSetup();
        return _this;
    }
    return HTMLAreaElementImpl;
}(HTMLElementImpl));
idlUtils.mixin(HTMLAreaElementImpl.prototype, HTMLHyperlinkElementUtilsImpl.prototype);
module.exports = {
    implementation: HTMLAreaElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var notImplemented = require("../../browser/not-implemented");
var reflectURLAttribute = require("../../utils").reflectURLAttribute;
var DOMException = require("../../web-idl/DOMException");
function getTimeRangeDummy() {
    return {
        length: 0,
        start: function () {
            return 0;
        },
        end: function () {
            return 0;
        }
    };
}
var HTMLMediaElementImpl = (function (_super) {
    __extends(HTMLMediaElementImpl, _super);
    function HTMLMediaElementImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this._muted = false;
        _this._volume = 1.0;
        _this.readyState = 0;
        _this.networkState = 0;
        _this.currentTime = 0;
        _this.currentSrc = "";
        _this.buffered = getTimeRangeDummy();
        _this.seeking = false;
        _this.duration = 0;
        _this.paused = true;
        _this.played = getTimeRangeDummy();
        _this.seekable = getTimeRangeDummy();
        _this.ended = false;
        _this.audioTracks = [];
        _this.videoTracks = [];
        _this.textTracks = [];
        return _this;
    }
    Object.defineProperty(HTMLMediaElementImpl.prototype, "defaultPlaybackRate", {
        get: function () {
            if (this._defaultPlaybackRate === undefined) {
                return 1.0;
            }
            return this._defaultPlaybackRate;
        },
        // Implemented accoring to W3C Draft 22 August 2012
        set: function (v) {
            if (v === 0.0) {
                throw new DOMException(DOMException.NOT_SUPPORTED_ERR);
            }
            if (this._defaultPlaybackRate !== v) {
                this._defaultPlaybackRate = v;
                this._dispatchRateChange();
            }
        },
        enumerable: true,
        configurable: true
    });
    HTMLMediaElementImpl.prototype._dispatchRateChange = function () {
        var ev = this._ownerDocument.createEvent("HTMLEvents");
        ev.initEvent("ratechange", false, false);
        this.dispatchEvent(ev);
    };
    Object.defineProperty(HTMLMediaElementImpl.prototype, "playbackRate", {
        get: function () {
            if (this._playbackRate === undefined) {
                return 1.0;
            }
            return this._playbackRate;
        },
        set: function (v) {
            if (v !== this._playbackRate) {
                this._playbackRate = v;
                this._dispatchRateChange();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLMediaElementImpl.prototype, "muted", {
        get: function () {
            return this._muted;
        },
        set: function (v) {
            if (v !== this._muted) {
                this._muted = v;
                this._dispatchVolumeChange();
            }
        },
        enumerable: true,
        configurable: true
    });
    HTMLMediaElementImpl.prototype._dispatchVolumeChange = function () {
        var ev = this._ownerDocument.createEvent("HTMLEvents");
        ev.initEvent("volumechange", false, false);
        this.dispatchEvent(ev);
    };
    Object.defineProperty(HTMLMediaElementImpl.prototype, "defaultMuted", {
        get: function () {
            return this.getAttribute("muted") !== null;
        },
        set: function (v) {
            if (v) {
                this.setAttribute("muted", v);
            }
            else {
                this.removeAttribute("muted");
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLMediaElementImpl.prototype, "volume", {
        get: function () {
            return this._volume;
        },
        set: function (v) {
            if (v < 0 || v > 1) {
                throw new DOMException(DOMException.INDEX_SIZE_ERR);
            }
            if (this._volume !== v) {
                this._volume = v;
                this._dispatchVolumeChange();
            }
        },
        enumerable: true,
        configurable: true
    });
    // Not (yet) implemented according to spec
    // Should return sane default values
    HTMLMediaElementImpl.prototype.load = function () {
        notImplemented("HTMLMediaElement.prototype.load", this._ownerDocument._defaultView);
    };
    HTMLMediaElementImpl.prototype.canPlayType = function () {
        return "";
    };
    HTMLMediaElementImpl.prototype.play = function () {
        notImplemented("HTMLMediaElement.prototype.play", this._ownerDocument._defaultView);
    };
    HTMLMediaElementImpl.prototype.pause = function () {
        notImplemented("HTMLMediaElement.prototype.pause", this._ownerDocument._defaultView);
    };
    HTMLMediaElementImpl.prototype.addTextTrack = function () {
        notImplemented("HTMLMediaElement.prototype.addNextTrack", this._ownerDocument._defaultView);
    };
    Object.defineProperty(HTMLMediaElementImpl.prototype, "src", {
        get: function () {
            return reflectURLAttribute(this, "src");
        },
        set: function (value) {
            this.setAttribute("src", value);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLMediaElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLMediaElementImpl
};
"use strict";
var HTMLMediaElementImpl = require("./HTMLMediaElement-impl").implementation;
var HTMLAudioElementImpl = (function (_super) {
    __extends(HTMLAudioElementImpl, _super);
    function HTMLAudioElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLAudioElementImpl;
}(HTMLMediaElementImpl));
module.exports = {
    implementation: HTMLAudioElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var whatwgURL = require("whatwg-url");
var fallbackBaseURL = require("../helpers/document-base-url").fallbackBaseURL;
var HTMLBaseElement = (function (_super) {
    __extends(HTMLBaseElement, _super);
    function HTMLBaseElement() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLBaseElement.prototype, "href", {
        get: function () {
            var document = this._ownerDocument;
            var url = this.hasAttribute("href") ? this.getAttribute("href") : "";
            var parsed = whatwgURL.parseURL(url, { baseURL: fallbackBaseURL(document) });
            if (parsed === "failure") {
                return url;
            }
            return whatwgURL.serializeURL(parsed);
        },
        set: function (value) {
            this.setAttribute("href", value);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLBaseElement;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLBaseElement
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var defineGetter = require("../../utils").defineGetter;
var defineSetter = require("../../utils").defineSetter;
var proxiedWindowEventHandlers = require("../helpers/proxied-window-event-handlers");
var HTMLBodyElementImpl = (function (_super) {
    __extends(HTMLBodyElementImpl, _super);
    function HTMLBodyElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLBodyElementImpl;
}(HTMLElementImpl));
(function () {
    proxiedWindowEventHandlers.forEach(function (name) {
        defineSetter(HTMLBodyElementImpl.prototype, name, function (handler) {
            var window = this._ownerDocument._defaultView;
            if (window) {
                window[name] = handler;
            }
        });
        defineGetter(HTMLBodyElementImpl.prototype, name, function () {
            var window = this._ownerDocument._defaultView;
            return window ? window[name] : null;
        });
    });
}());
module.exports = {
    implementation: HTMLBodyElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLBRElementImpl = (function (_super) {
    __extends(HTMLBRElementImpl, _super);
    function HTMLBRElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLBRElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLBRElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var closest = require("../helpers/traversal").closest;
var isDisabled = require("../helpers/form-controls").isDisabled;
var HTMLButtonElementImpl = (function (_super) {
    __extends(HTMLButtonElementImpl, _super);
    function HTMLButtonElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HTMLButtonElementImpl.prototype._activationBehavior = function () {
        var form = this.form;
        if (form) {
            if (this.type === "submit" && !isDisabled(this)) {
                form._dispatchSubmitEvent();
            }
        }
    };
    HTMLButtonElementImpl.prototype._getValue = function () {
        var valueAttr = this.getAttribute("value");
        return valueAttr === null ? "" : valueAttr;
    };
    Object.defineProperty(HTMLButtonElementImpl.prototype, "form", {
        get: function () {
            return closest(this, "form");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLButtonElementImpl.prototype, "type", {
        get: function () {
            var typeAttr = (this.getAttribute("type") || "").toLowerCase();
            switch (typeAttr) {
                case "submit":
                case "reset":
                case "button":
                case "menu":
                    return typeAttr;
                default:
                    return "submit";
            }
        },
        set: function (v) {
            v = String(v).toLowerCase();
            switch (v) {
                case "submit":
                case "reset":
                case "button":
                case "menu":
                    this.setAttribute("type", v);
                    break;
                default:
                    this.setAttribute("type", "submit");
                    break;
            }
        },
        enumerable: true,
        configurable: true
    });
    return HTMLButtonElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLButtonElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var notImplemented = require("../../browser/not-implemented");
var idlUtils = require("../generated/utils");
var Canvas = require("../../utils").Canvas;
var HTMLCanvasElementImpl = (function (_super) {
    __extends(HTMLCanvasElementImpl, _super);
    function HTMLCanvasElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HTMLCanvasElementImpl.prototype._attrModified = function (name, value) {
        if (this._canvas && (name === "width" || name === "height")) {
            this._canvas[name] = parseInt(value);
        }
        return _super.prototype._attrModified.apply(this, arguments);
    };
    HTMLCanvasElementImpl.prototype._getCanvas = function () {
        if (Canvas && !this._canvas) {
            this._canvas = new Canvas(this.width, this.height);
        }
        return this._canvas;
    };
    HTMLCanvasElementImpl.prototype.getContext = function (contextId) {
        var canvas = this._getCanvas();
        if (canvas) {
            if (!this._context) {
                this._context = canvas.getContext(contextId) || null;
                if (this._context) {
                    // Override the native canvas reference with our wrapper. This is the
                    // reason why we need to locally cache _context, since each call to
                    // canvas.getContext(contextId) would replace this reference again.
                    // Perhaps in the longer term, a better solution would be to create a
                    // full wrapper for the Context object as well.
                    this._context.canvas = idlUtils.wrapperForImpl(this);
                    wrapNodeCanvasMethod(this._context, "createPattern");
                    wrapNodeCanvasMethod(this._context, "drawImage");
                }
            }
            return this._context;
        }
        notImplemented("HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)", this._ownerDocument._defaultView);
        return null;
    };
    HTMLCanvasElementImpl.prototype.probablySupportsContext = function (contextId) {
        var canvas = this._getCanvas();
        return canvas ? contextId === "2d" : false;
    };
    HTMLCanvasElementImpl.prototype.setContext = function () {
        notImplemented("HTMLCanvasElement.prototype.setContext");
    };
    HTMLCanvasElementImpl.prototype.toDataURL = function () {
        var canvas = this._getCanvas();
        if (canvas) {
            return canvas.toDataURL.apply(this._canvas, arguments);
        }
        notImplemented("HTMLCanvasElement.prototype.toDataURL (without installing the canvas npm package)", this._ownerDocument._defaultView);
        return null;
    };
    HTMLCanvasElementImpl.prototype.toBlob = function (callback, type, qualityArgument) {
        var window = this._ownerDocument._defaultView;
        var canvas = this._getCanvas();
        if (canvas) {
            var stream = void 0;
            switch (type) {
                case "image/jpg":
                case "image/jpeg":
                    stream = canvas.createJPEGStream({
                        quality: Math.min(0, Math.max(1, qualityArgument)) * 100
                    });
                    break;
                default:
                    // TODO: Patch node-canvas to receive qualityArgument for PNG stream
                    type = "image/png";
                    stream = canvas.createPNGStream();
            }
            var buffers_1 = [];
            stream.on("data", function (chunk) {
                buffers_1.push(chunk);
            });
            stream.on("end", function () {
                callback(new window.Blob(buffers_1, { type: type }));
            });
        }
        else {
            notImplemented("HTMLCanvasElement.prototype.toBlob (without installing the canvas npm package)", window);
        }
    };
    Object.defineProperty(HTMLCanvasElementImpl.prototype, "width", {
        get: function () {
            var parsed = parseInt(this.getAttribute("width"));
            return isNaN(parsed) || parsed < 0 || parsed > 2147483647 ? 300 : parsed;
        },
        set: function (v) {
            v = v > 2147483647 ? 300 : v;
            this.setAttribute("width", String(v));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLCanvasElementImpl.prototype, "height", {
        get: function () {
            var parsed = parseInt(this.getAttribute("height"));
            return isNaN(parsed) || parsed < 0 || parsed > 2147483647 ? 150 : parsed;
        },
        set: function (v) {
            v = v > 2147483647 ? 150 : v;
            this.setAttribute("height", String(v));
        },
        enumerable: true,
        configurable: true
    });
    return HTMLCanvasElementImpl;
}(HTMLElementImpl));
// We need to wrap the methods that receive an image or canvas object
// (luckily, always as the first argument), so that these objects can be
// unwrapped an the expected types passed.
function wrapNodeCanvasMethod(ctx, name) {
    var prev = ctx[name];
    ctx[name] = function (image) {
        var impl = idlUtils.implForWrapper(image);
        if (impl) {
            arguments[0] = impl._image || impl._canvas;
        }
        return prev.apply(ctx, arguments);
    };
}
module.exports = {
    implementation: HTMLCanvasElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLDataElementImpl = (function (_super) {
    __extends(HTMLDataElementImpl, _super);
    function HTMLDataElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLDataElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLDataElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLDataListElementImpl = (function (_super) {
    __extends(HTMLDataListElementImpl, _super);
    function HTMLDataListElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLDataListElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLDataListElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLDialogElementImpl = (function (_super) {
    __extends(HTMLDialogElementImpl, _super);
    function HTMLDialogElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLDialogElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLDialogElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLDirectoryElementImpl = (function (_super) {
    __extends(HTMLDirectoryElementImpl, _super);
    function HTMLDirectoryElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLDirectoryElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLDirectoryElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLDivElementImpl = (function (_super) {
    __extends(HTMLDivElementImpl, _super);
    function HTMLDivElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLDivElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLDivElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLDListElementImpl = (function (_super) {
    __extends(HTMLDListElementImpl, _super);
    function HTMLDListElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLDListElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLDListElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var reflectURLAttribute = require("../../utils").reflectURLAttribute;
var HTMLEmbedElementImpl = (function (_super) {
    __extends(HTMLEmbedElementImpl, _super);
    function HTMLEmbedElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLEmbedElementImpl.prototype, "src", {
        get: function () {
            return reflectURLAttribute(this, "src");
        },
        set: function (value) {
            this.setAttribute("src", value);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLEmbedElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLEmbedElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var closest = require("../helpers/traversal").closest;
var HTMLFieldSetElementImpl = (function (_super) {
    __extends(HTMLFieldSetElementImpl, _super);
    function HTMLFieldSetElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLFieldSetElementImpl.prototype, "form", {
        get: function () {
            return closest(this, "form");
        },
        enumerable: true,
        configurable: true
    });
    return HTMLFieldSetElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLFieldSetElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLFontElementImpl = (function (_super) {
    __extends(HTMLFontElementImpl, _super);
    function HTMLFontElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLFontElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLFontElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var idlUtils = require("../generated/utils");
var descendantsByHTMLLocalNames = require("../helpers/traversal").descendantsByHTMLLocalNames;
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var createHTMLCollection = require("../../living/html-collection").create;
var notImplemented = require("../../browser/not-implemented");
var reflectURLAttribute = require("../../utils").reflectURLAttribute;
// http://www.whatwg.org/specs/web-apps/current-work/#category-listed
var listedElements = new Set(["button", "fieldset", "input", "keygen", "object", "select", "textarea"]);
var encTypes = new Set([
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "text/plain"
]);
var methods = new Set([
    "get",
    "post",
    "dialog"
]);
var HTMLFormElementImpl = (function (_super) {
    __extends(HTMLFormElementImpl, _super);
    function HTMLFormElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HTMLFormElementImpl.prototype._descendantAdded = function (parent, child) {
        var form = this;
        for (var _i = 0, _a = domSymbolTree.treeIterator(child); _i < _a.length; _i++) {
            var el = _a[_i];
            if (typeof el._changedFormOwner === "function") {
                el._changedFormOwner(form);
            }
        }
        _super.prototype._descendantAdded.apply(this, arguments);
    };
    HTMLFormElementImpl.prototype._descendantRemoved = function (parent, child) {
        for (var _i = 0, _a = domSymbolTree.treeIterator(child); _i < _a.length; _i++) {
            var el = _a[_i];
            if (typeof el._changedFormOwner === "function") {
                el._changedFormOwner(null);
            }
        }
        _super.prototype._descendantRemoved.apply(this, arguments);
    };
    Object.defineProperty(HTMLFormElementImpl.prototype, "elements", {
        get: function () {
            var _this = this;
            return createHTMLCollection(this, function () { return descendantsByHTMLLocalNames(_this, listedElements); });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLFormElementImpl.prototype, "length", {
        get: function () {
            return this.elements.length;
        },
        enumerable: true,
        configurable: true
    });
    HTMLFormElementImpl.prototype._dispatchSubmitEvent = function () {
        var ev = this._ownerDocument.createEvent("HTMLEvents");
        ev.initEvent("submit", true, true);
        if (this.dispatchEvent(ev)) {
            this.submit();
        }
    };
    HTMLFormElementImpl.prototype.submit = function () {
        notImplemented("HTMLFormElement.prototype.submit", this._ownerDocument._defaultView);
    };
    HTMLFormElementImpl.prototype.reset = function () {
        Array.prototype.forEach.call(this.elements, function (el) {
            el = idlUtils.implForWrapper(el);
            if (typeof el._formReset === "function") {
                el._formReset();
            }
        });
    };
    Object.defineProperty(HTMLFormElementImpl.prototype, "method", {
        get: function () {
            var method = this.getAttribute("method");
            if (method) {
                method = method.toLowerCase();
            }
            if (methods.has(method)) {
                return method;
            }
            return "get";
        },
        set: function (V) {
            this.setAttribute("method", V);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLFormElementImpl.prototype, "enctype", {
        get: function () {
            var type = this.getAttribute("enctype");
            if (type) {
                type = type.toLowerCase();
            }
            if (encTypes.has(type)) {
                return type;
            }
            return "application/x-www-form-urlencoded";
        },
        set: function (V) {
            this.setAttribute("enctype", V);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLFormElementImpl.prototype, "action", {
        get: function () {
            var attributeValue = this.getAttribute("action");
            if (attributeValue === null || attributeValue === "") {
                return this._ownerDocument.URL;
            }
            return reflectURLAttribute(this, "action");
        },
        set: function (V) {
            this.setAttribute("action", V);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLFormElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLFormElementImpl
};
"use strict";
var parseContentType = require("content-type-parser");
var URL = require("whatwg-url").URL;
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var applyDocumentFeatures = require("../../browser/documentfeatures").applyDocumentFeatures;
var resourceLoader = require("../../browser/resource-loader");
var defineGetter = require("../../utils").defineGetter;
var documentBaseURLSerialized = require("../helpers/document-base-url").documentBaseURLSerialized;
var getAttributeValue = require("../attributes").getAttributeValue;
var idlUtils = require("../generated/utils");
var reflectURLAttribute = require("../../utils").reflectURLAttribute;
function loadFrame(frame) {
    if (frame._contentDocument) {
        if (frame._contentDocument._defaultView) {
            // close calls delete on its document.
            frame._contentDocument._defaultView.close();
        }
        else {
            delete frame._contentDocument;
        }
    }
    var parentDoc = frame._ownerDocument;
    // https://html.spec.whatwg.org/#process-the-iframe-attributes
    var url;
    var srcAttribute = getAttributeValue(frame, "src");
    if (srcAttribute === null || srcAttribute === "") {
        url = new URL("about:blank");
    }
    else {
        try {
            url = new URL(srcAttribute, documentBaseURLSerialized(parentDoc));
        }
        catch (e) {
            url = new URL("about:blank");
        }
    }
    // This is not great, but prevents a require cycle during webidl2js generation
    var wnd = new parentDoc._defaultView.constructor({
        parsingMode: "html",
        url: url.protocol === "javascript:" || url.href === "about:blank" ? parentDoc.URL : url.href,
        resourceLoader: parentDoc._customResourceLoader,
        userAgent: parentDoc._defaultView.navigator.userAgent,
        referrer: parentDoc.URL,
        cookieJar: parentDoc._cookieJar,
        pool: parentDoc._pool,
        encoding: parentDoc._encoding,
        agentOptions: parentDoc._agentOptions,
        strictSSL: parentDoc._strictSSL,
        proxy: parentDoc._proxy
    });
    var contentDoc = frame._contentDocument = idlUtils.implForWrapper(wnd._document);
    applyDocumentFeatures(contentDoc, parentDoc._implementation._features);
    var parent = parentDoc._defaultView;
    var contentWindow = contentDoc._defaultView;
    contentWindow._parent = parent;
    contentWindow._top = parent.top;
    contentWindow._frameElement = frame;
    contentWindow._virtualConsole = parent._virtualConsole;
    // Handle about:blank with a simulated load of an empty document.
    if (url.href === "about:blank") {
        // Cannot be done inside the enqueued callback; the documentElement etc. need to be immediately available.
        contentDoc.write("<html><head></head><body></body></html>");
        contentDoc.close();
        resourceLoader.enqueue(frame)(); // to fire the load event
    }
    else if (url.protocol === "javascript:") {
        // Cannot be done inside the enqueued callback; the documentElement etc. need to be immediately available.
        contentDoc.write("<html><head></head><body></body></html>");
        contentDoc.close();
        contentWindow.eval(url.pathname);
        resourceLoader.enqueue(frame)(); // to fire the load event
    }
    else {
        resourceLoader.load(frame, url.href, { defaultEncoding: parentDoc._encoding, detectMetaCharset: true }, function (html, responseURL, response) {
            if (response) {
                var contentType = parseContentType(response.headers["content-type"]);
                if (contentType) {
                    if (contentType.isXML()) {
                        contentDoc._parsingMode = "xml";
                    }
                    contentDoc._encoding = contentType.get("charset");
                }
            }
            contentDoc.write(html);
            contentDoc.close();
        });
    }
}
function refreshAccessors(document) {
    var window = document._defaultView;
    if (!window) {
        return;
    }
    var frames = document.querySelectorAll("iframe,frame");
    // delete accessors for all frames
    for (var i = 0; i < window._length; ++i) {
        delete window[i];
    }
    window._length = frames.length;
    Array.prototype.forEach.call(frames, function (frame, i) {
        defineGetter(window, i, function () { return frame.contentWindow; });
    });
}
var HTMLFrameElementImpl = (function (_super) {
    __extends(HTMLFrameElementImpl, _super);
    function HTMLFrameElementImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this._contentDocument = null;
        return _this;
    }
    HTMLFrameElementImpl.prototype._attrModified = function (name, value, oldVal) {
        _super.prototype._attrModified.call(this, name, value, oldVal);
        if (name === "src") {
            // iframe should never load in a document without a Window
            // (e.g. implementation.createHTMLDocument)
            if (this._attached && this._ownerDocument._defaultView) {
                loadFrame(this);
            }
        }
    };
    HTMLFrameElementImpl.prototype._detach = function () {
        _super.prototype._detach.call(this);
        if (this.contentWindow) {
            this.contentWindow.close();
        }
        refreshAccessors(this._ownerDocument);
    };
    HTMLFrameElementImpl.prototype._attach = function () {
        _super.prototype._attach.call(this);
        if (this._ownerDocument._defaultView) {
            loadFrame(this);
        }
        refreshAccessors(this._ownerDocument);
    };
    Object.defineProperty(HTMLFrameElementImpl.prototype, "contentDocument", {
        get: function () {
            return this._contentDocument;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLFrameElementImpl.prototype, "contentWindow", {
        get: function () {
            return this.contentDocument ? this.contentDocument._defaultView : null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLFrameElementImpl.prototype, "src", {
        get: function () {
            return reflectURLAttribute(this, "src");
        },
        set: function (value) {
            this.setAttribute("src", value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLFrameElementImpl.prototype, "longDesc", {
        get: function () {
            return reflectURLAttribute(this, "longdesc");
        },
        set: function (value) {
            this.setAttribute("longdesc", value);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLFrameElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLFrameElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLFramesetElementImpl = (function (_super) {
    __extends(HTMLFramesetElementImpl, _super);
    function HTMLFramesetElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLFramesetElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLFramesetElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLHeadElementImpl = (function (_super) {
    __extends(HTMLHeadElementImpl, _super);
    function HTMLHeadElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLHeadElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLHeadElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLHeadingElementImpl = (function (_super) {
    __extends(HTMLHeadingElementImpl, _super);
    function HTMLHeadingElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLHeadingElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLHeadingElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLHRElementImpl = (function (_super) {
    __extends(HTMLHRElementImpl, _super);
    function HTMLHRElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLHRElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLHRElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLHtmlElementImpl = (function (_super) {
    __extends(HTMLHtmlElementImpl, _super);
    function HTMLHtmlElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLHtmlElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLHtmlElementImpl
};
"use strict";
var HTMLFrameElementImpl = require("./HTMLFrameElement-impl").implementation;
var HTMLIFrameElementImpl = (function (_super) {
    __extends(HTMLIFrameElementImpl, _super);
    function HTMLIFrameElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLIFrameElementImpl;
}(HTMLFrameElementImpl));
module.exports = {
    implementation: HTMLIFrameElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var resourceLoader = require("../../browser/resource-loader");
var conversions = require("webidl-conversions");
var Canvas = require("../../utils").Canvas;
var reflectURLAttribute = require("../../utils").reflectURLAttribute;
var HTMLImageElementImpl = (function (_super) {
    __extends(HTMLImageElementImpl, _super);
    function HTMLImageElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HTMLImageElementImpl.prototype._attrModified = function (name, value, oldVal) {
        var _this = this;
        if (name === "src" && value !== oldVal) {
            var document_4 = this._ownerDocument;
            if (Canvas && document_4.implementation._hasFeature("FetchExternalResources", "img")) {
                var error_1;
                if (!this._image) {
                    this._image = new Canvas.Image();
                    // Install an error handler that just remembers the error. It is then
                    // thrown in the callback of resourceLoader.load() below.
                    this._image.onerror = function (err) {
                        error_1 = err;
                    };
                }
                this._currentSrc = null;
                resourceLoader.load(this, this.src, {}, function (data, url, response) {
                    if (response && response.statusCode !== undefined && response.statusCode !== 200) {
                        throw new Error("Status code: " + response.statusCode);
                    }
                    error_1 = null;
                    _this._image.source = data;
                    if (error_1) {
                        throw new Error(error_1);
                    }
                    _this._currentSrc = value;
                });
            }
            else {
                resourceLoader.enqueue(this)();
            }
        }
        _super.prototype._attrModified.call(this, name, value, oldVal);
    };
    Object.defineProperty(HTMLImageElementImpl.prototype, "_accept", {
        get: function () {
            return "image/png,image/*;q=0.8,*/*;q=0.5";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLImageElementImpl.prototype, "src", {
        get: function () {
            return reflectURLAttribute(this, "src");
        },
        set: function (value) {
            this.setAttribute("src", value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLImageElementImpl.prototype, "height", {
        get: function () {
            // Just like on browsers, if no width / height is defined, we fall back on the
            // dimensions of the internal image data.
            return this.hasAttribute("height") ?
                conversions["unsigned long"](this.getAttribute("height")) : this.naturalHeight;
        },
        set: function (V) {
            this.setAttribute("height", String(V));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLImageElementImpl.prototype, "width", {
        get: function () {
            return this.hasAttribute("width") ?
                conversions["unsigned long"](this.getAttribute("width")) : this.naturalWidth;
        },
        set: function (V) {
            this.setAttribute("width", String(V));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLImageElementImpl.prototype, "naturalHeight", {
        get: function () {
            return this._image ? this._image.height : 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLImageElementImpl.prototype, "naturalWidth", {
        get: function () {
            return this._image ? this._image.width : 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLImageElementImpl.prototype, "complete", {
        get: function () {
            return Boolean(this._image && this._image.complete);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLImageElementImpl.prototype, "currentSrc", {
        get: function () {
            return this._currentSrc || "";
        },
        enumerable: true,
        configurable: true
    });
    return HTMLImageElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLImageElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var idlUtils = require("../generated/utils");
var Event = require("../generated/Event");
var DOMException = require("../../web-idl/DOMException");
var internalConstants = require("../helpers/internal-constants");
var domSymbolTree = internalConstants.domSymbolTree;
var cloningSteps = internalConstants.cloningSteps;
var closest = require("../helpers/traversal").closest;
var isDisabled = require("../helpers/form-controls").isDisabled;
var filesSymbol = Symbol("files");
var selectAllowedTypes = new Set(["text", "search", "tel", "url", "password", "email", "date", "month", "week",
    "time", "datetime-local", "color", "file", "number"]);
var variableLengthSelectionAllowedTypes = new Set(["text", "search", "tel", "url", "password"]);
function allowSelect(type) {
    return selectAllowedTypes.has(type.toLowerCase());
}
function allowVariableLengthSelection(type) {
    return variableLengthSelectionAllowedTypes.has(type.toLowerCase());
}
var HTMLInputElementImpl = (function (_super) {
    __extends(HTMLInputElementImpl, _super);
    function HTMLInputElementImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        if (!_this.type) {
            _this.type = "text";
        }
        _this._selectionStart = _this._selectionEnd = 0;
        _this._selectionDirection = "none";
        _this._value = null;
        _this._dirtyValue = false;
        _this._checkedness = false;
        _this._dirtyCheckedness = false;
        // This is used to implement the canceled activation steps for radio inputs:
        // "The canceled activation steps consist of setting the checkedness and the element's indeterminate IDL
        // attribute back to the values they had before the pre-click activation steps were run."
        _this._preCancelState = null;
        return _this;
    }
    HTMLInputElementImpl.prototype._getValue = function () {
        return this._value;
    };
    HTMLInputElementImpl.prototype._preClickActivationSteps = function () {
        if (this.type === "checkbox") {
            this.checked = !this.checked;
        }
        else if (this.type === "radio") {
            this._preCancelState = this.checked;
            this.checked = true;
        }
    };
    HTMLInputElementImpl.prototype._canceledActivationSteps = function () {
        if (this.type === "checkbox") {
            this.checked = !this.checked;
        }
        else if (this.type === "radio") {
            if (this._preCancelState !== null) {
                this.checked = this._preCancelState;
                this._preCancelState = null;
            }
        }
    };
    HTMLInputElementImpl.prototype._activationBehavior = function () {
        if (isDisabled(this)) {
            return;
        }
        if (this.type === "checkbox") {
            var inputEvent = Event.createImpl(["input", { bubbles: true, cancelable: true }], {});
            this.dispatchEvent(inputEvent);
            var changeEvent = Event.createImpl(["change", { bubbles: true, cancelable: true }], {});
            this.dispatchEvent(changeEvent);
        }
        else if (this.type === "submit") {
            var form = this.form;
            if (form) {
                form._dispatchSubmitEvent();
            }
        }
    };
    HTMLInputElementImpl.prototype._attrModified = function (name) {
        var wrapper = idlUtils.wrapperForImpl(this);
        if (!this._dirtyValue && name === "value") {
            this._value = wrapper.defaultValue;
        }
        if (!this._dirtyCheckedness && name === "checked") {
            this._checkedness = wrapper.defaultChecked;
            if (this._checkedness) {
                this._removeOtherRadioCheckedness();
            }
        }
        if (name === "name" || name === "type") {
            if (this._checkedness) {
                this._removeOtherRadioCheckedness();
            }
        }
        _super.prototype._attrModified.apply(this, arguments);
    };
    HTMLInputElementImpl.prototype._formReset = function () {
        var wrapper = idlUtils.wrapperForImpl(this);
        this._value = wrapper.defaultValue;
        this._dirtyValue = false;
        this._checkedness = wrapper.defaultChecked;
        this._dirtyCheckedness = false;
        if (this._checkedness) {
            this._removeOtherRadioCheckedness();
        }
    };
    HTMLInputElementImpl.prototype._changedFormOwner = function () {
        if (this._checkedness) {
            this._removeOtherRadioCheckedness();
        }
    };
    HTMLInputElementImpl.prototype._removeOtherRadioCheckedness = function () {
        var wrapper = idlUtils.wrapperForImpl(this);
        var root = this._radioButtonGroupRoot;
        if (!root) {
            return;
        }
        var name = wrapper.name.toLowerCase();
        var descendants = domSymbolTree.treeIterator(root);
        for (var _i = 0, descendants_1 = descendants; _i < descendants_1.length; _i++) {
            var candidate = descendants_1[_i];
            if (candidate._radioButtonGroupRoot !== root) {
                continue;
            }
            var candidateWrapper = idlUtils.wrapperForImpl(candidate);
            if (!candidateWrapper.name || candidateWrapper.name.toLowerCase() !== name) {
                continue;
            }
            if (candidate !== this) {
                candidate._checkedness = false;
            }
        }
    };
    Object.defineProperty(HTMLInputElementImpl.prototype, "_radioButtonGroupRoot", {
        get: function () {
            var wrapper = idlUtils.wrapperForImpl(this);
            if (this.type !== "radio" || !wrapper.name) {
                return null;
            }
            var e = domSymbolTree.parent(this);
            while (e) {
                // root node of this home sub tree
                // or the form element we belong to
                if (!domSymbolTree.parent(e) || e.nodeName.toUpperCase() === "FORM") {
                    return e;
                }
                e = domSymbolTree.parent(e);
            }
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLInputElementImpl.prototype, "form", {
        get: function () {
            return closest(this, "form");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLInputElementImpl.prototype, "checked", {
        get: function () {
            return this._checkedness;
        },
        set: function (checked) {
            this._checkedness = Boolean(checked);
            this._dirtyCheckedness = true;
            if (this._checkedness) {
                this._removeOtherRadioCheckedness();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLInputElementImpl.prototype, "value", {
        get: function () {
            if (this._value === null) {
                return "";
            }
            return this._value;
        },
        set: function (val) {
            this._dirtyValue = true;
            if (val === null) {
                this._value = null;
            }
            else {
                this._value = String(val);
            }
            this._selectionStart = 0;
            this._selectionEnd = 0;
            this._selectionDirection = "none";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLInputElementImpl.prototype, "files", {
        get: function () {
            if (this.type === "file") {
                this[filesSymbol] = this[filesSymbol] || new this._core.FileList();
            }
            else {
                this[filesSymbol] = null;
            }
            return this[filesSymbol];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLInputElementImpl.prototype, "type", {
        get: function () {
            var type = this.getAttribute("type");
            return type ? type.toLowerCase() : "text";
        },
        set: function (type) {
            this.setAttribute("type", type);
        },
        enumerable: true,
        configurable: true
    });
    HTMLInputElementImpl.prototype._dispatchSelectEvent = function () {
        var event = this._ownerDocument.createEvent("HTMLEvents");
        event.initEvent("select", true, true);
        this.dispatchEvent(event);
    };
    HTMLInputElementImpl.prototype._getValueLength = function () {
        return typeof this.value === "string" ? this.value.length : 0;
    };
    HTMLInputElementImpl.prototype.select = function () {
        if (!allowSelect(this.type)) {
            throw new DOMException(DOMException.INVALID_STATE_ERR);
        }
        this._selectionStart = 0;
        this._selectionEnd = this._getValueLength();
        this._selectionDirection = "none";
        this._dispatchSelectEvent();
    };
    Object.defineProperty(HTMLInputElementImpl.prototype, "selectionStart", {
        get: function () {
            if (!allowVariableLengthSelection(this.type)) {
                return null;
            }
            return this._selectionStart;
        },
        set: function (start) {
            if (!allowVariableLengthSelection(this.type)) {
                throw new DOMException(DOMException.INVALID_STATE_ERR);
            }
            this.setSelectionRange(start, Math.max(start, this._selectionEnd), this._selectionDirection);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLInputElementImpl.prototype, "selectionEnd", {
        get: function () {
            if (!allowVariableLengthSelection(this.type)) {
                return null;
            }
            return this._selectionEnd;
        },
        set: function (end) {
            if (!allowVariableLengthSelection(this.type)) {
                throw new DOMException(DOMException.INVALID_STATE_ERR);
            }
            this.setSelectionRange(this._selectionStart, end, this._selectionDirection);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLInputElementImpl.prototype, "selectionDirection", {
        get: function () {
            if (!allowVariableLengthSelection(this.type)) {
                return null;
            }
            return this._selectionDirection;
        },
        set: function (dir) {
            if (!allowVariableLengthSelection(this.type)) {
                throw new DOMException(DOMException.INVALID_STATE_ERR);
            }
            this.setSelectionRange(this._selectionStart, this._selectionEnd, dir);
        },
        enumerable: true,
        configurable: true
    });
    HTMLInputElementImpl.prototype.setSelectionRange = function (start, end, dir) {
        if (!allowVariableLengthSelection(this.type)) {
            throw new DOMException(DOMException.INVALID_STATE_ERR);
        }
        this._selectionEnd = Math.min(end, this._getValueLength());
        this._selectionStart = Math.min(start, this._selectionEnd);
        this._selectionDirection = dir === "forward" || dir === "backward" ? dir : "none";
        this._dispatchSelectEvent();
    };
    HTMLInputElementImpl.prototype.setRangeText = function (repl, start, end, selectionMode) {
        if (!allowVariableLengthSelection(this.type)) {
            throw new DOMException(DOMException.INVALID_STATE_ERR);
        }
        if (arguments.length < 2) {
            start = this._selectionStart;
            end = this._selectionEnd;
        }
        else if (start > end) {
            throw new DOMException(DOMException.INDEX_SIZE_ERR);
        }
        start = Math.min(start, this._getValueLength());
        end = Math.min(end, this._getValueLength());
        var val = this.value;
        var selStart = this._selectionStart;
        var selEnd = this._selectionEnd;
        this.value = val.slice(0, start) + repl + val.slice(end);
        var newEnd = start + this.value.length;
        if (selectionMode === "select") {
            this.setSelectionRange(start, newEnd);
        }
        else if (selectionMode === "start") {
            this.setSelectionRange(start, start);
        }
        else if (selectionMode === "end") {
            this.setSelectionRange(newEnd, newEnd);
        }
        else {
            var delta = repl.length - (end - start);
            if (selStart > end) {
                selStart += delta;
            }
            else if (selStart > start) {
                selStart = start;
            }
            if (selEnd > end) {
                selEnd += delta;
            }
            else if (selEnd > start) {
                selEnd = newEnd;
            }
            this.setSelectionRange(selStart, selEnd);
        }
    };
    Object.defineProperty(HTMLInputElementImpl.prototype, "maxLength", {
        get: function () {
            if (!this.hasAttribute("maxlength")) {
                return 524288; // stole this from chrome
            }
            return parseInt(this.getAttribute("maxlength"));
        },
        set: function (value) {
            if (value < 0) {
                throw new DOMException(DOMException.INDEX_SIZE_ERR);
            }
            this.setAttribute("maxlength", String(value));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLInputElementImpl.prototype, "minLength", {
        get: function () {
            if (!this.hasAttribute("minlength")) {
                return 0;
            }
            return parseInt(this.getAttribute("minlength"));
        },
        set: function (value) {
            if (value < 0) {
                throw new DOMException(DOMException.INDEX_SIZE_ERR);
            }
            this.setAttribute("minlength", String(value));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLInputElementImpl.prototype, "size", {
        get: function () {
            if (!this.hasAttribute("size")) {
                return 20;
            }
            return parseInt(this.getAttribute("size"));
        },
        set: function (value) {
            if (value <= 0) {
                throw new DOMException(DOMException.INDEX_SIZE_ERR);
            }
            this.setAttribute("size", String(value));
        },
        enumerable: true,
        configurable: true
    });
    HTMLInputElementImpl.prototype[cloningSteps] = function (copy, node) {
        copy._value = node._value;
        copy._checkedness = node._checkedness;
        copy._dirtyValue = node._dirtyValue;
        copy._dirtyCheckedness = node._dirtyCheckedness;
    };
    return HTMLInputElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLInputElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var MouseEvent = require("../generated/MouseEvent");
var closest = require("../helpers/traversal").closest;
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
function isLabelable(node) {
    // labelable logic defined at: https://html.spec.whatwg.org/multipage/forms.html#category-label
    if (node.nodeType !== 1) {
        return false;
    }
    switch (node.tagName) {
        case "BUTTON":
        case "KEYGEN":
        case "METER":
        case "OUTPUT":
        case "PROGRESS":
        case "SELECT":
        case "TEXTAREA":
            return true;
        case "INPUT":
            return node.type !== "hidden";
    }
    return false;
}
function sendClickToAssociatedNode(node) {
    node.dispatchEvent(MouseEvent.createImpl(["click", {
            bubbles: true,
            cancelable: true,
            view: node.ownerDocument ? node.ownerDocument.defaultView : null,
            screenX: 0,
            screenY: 0,
            clientX: 0,
            clientY: 0,
            button: 0,
            detail: 1,
            relatedTarget: null
        }]));
}
var HTMLLabelElementImpl = (function (_super) {
    __extends(HTMLLabelElementImpl, _super);
    function HTMLLabelElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HTMLLabelElementImpl.prototype._activationBehavior = function () {
        if (this.hasAttribute("for")) {
            var node = this.ownerDocument.getElementById(this.getAttribute("for"));
            if (node && isLabelable(node)) {
                sendClickToAssociatedNode(node);
            }
        }
        else {
            for (var _i = 0, _a = domSymbolTree.treeIterator(this); _i < _a.length; _i++) {
                var descendant = _a[_i];
                if (isLabelable(descendant)) {
                    sendClickToAssociatedNode(descendant);
                    break;
                }
            }
        }
    };
    Object.defineProperty(HTMLLabelElementImpl.prototype, "form", {
        get: function () {
            return closest(this, "form");
        },
        enumerable: true,
        configurable: true
    });
    return HTMLLabelElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLLabelElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var closest = require("../helpers/traversal").closest;
var HTMLLegendElementImpl = (function (_super) {
    __extends(HTMLLegendElementImpl, _super);
    function HTMLLegendElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLLegendElementImpl.prototype, "form", {
        get: function () {
            return closest(this, "form");
        },
        enumerable: true,
        configurable: true
    });
    return HTMLLegendElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLLegendElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLLIElementImpl = (function (_super) {
    __extends(HTMLLIElementImpl, _super);
    function HTMLLIElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLLIElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLLIElementImpl
};
"use strict";
var cssom = require("cssom");
var LinkStyleImpl = (function () {
    function LinkStyleImpl() {
    }
    Object.defineProperty(LinkStyleImpl.prototype, "sheet", {
        get: function () {
            if (!this._cssStyleSheet) {
                this._cssStyleSheet = new cssom.CSSStyleSheet();
            }
            return this._cssStyleSheet;
        },
        enumerable: true,
        configurable: true
    });
    return LinkStyleImpl;
}());
module.exports = {
    implementation: LinkStyleImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var LinkStyleImpl = require("./LinkStyle-impl").implementation;
var idlUtils = require("../generated/utils");
var reflectURLAttribute = require("../../utils").reflectURLAttribute;
var fetchStylesheet = require("../helpers/stylesheets").fetchStylesheet;
var parseURLToResultingURLRecord = require("../helpers/document-base-url").parseURLToResultingURLRecord;
var whatwgURL = require("whatwg-url");
// Important reading: "appropriate times to obtain the resource" in
// https://html.spec.whatwg.org/multipage/semantics.html#link-type-stylesheet
var HTMLLinkElementImpl = (function (_super) {
    __extends(HTMLLinkElementImpl, _super);
    function HTMLLinkElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HTMLLinkElementImpl.prototype._attach = function () {
        _super.prototype._attach.call(this);
        if (isExternalResourceLink(this)) {
            obtainTheResource(this);
        }
    };
    HTMLLinkElementImpl.prototype._attrModified = function (name, value, oldValue) {
        _super.prototype._attrModified.call(this, name, value, oldValue);
        if (name === "href" && this._attached && isExternalResourceLink(this)) {
            obtainTheResource(this);
        }
    };
    Object.defineProperty(HTMLLinkElementImpl.prototype, "_accept", {
        get: function () {
            return "text/css,*/*;q=0.1";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLLinkElementImpl.prototype, "href", {
        get: function () {
            return reflectURLAttribute(this, "href");
        },
        set: function (value) {
            this.setAttribute("href", value);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLLinkElementImpl;
}(HTMLElementImpl));
idlUtils.mixin(HTMLLinkElementImpl.prototype, LinkStyleImpl.prototype);
module.exports = {
    implementation: HTMLLinkElementImpl
};
function obtainTheResource(el) {
    var href = el.getAttribute("href");
    if (href === null || href === "") {
        return;
    }
    var url = parseURLToResultingURLRecord(href, el._ownerDocument);
    if (url === "failure") {
        return;
    }
    var serialized = whatwgURL.serializeURL(url);
    fetchStylesheet(el, serialized, el.sheet);
}
function isExternalResourceLink(el) {
    // for our purposes, only stylesheets can be external resource links
    var wrapper = idlUtils.wrapperForImpl(el);
    if (!/(?:[ \t\n\r\f]|^)stylesheet(?:[ \t\n\r\f]|$)/i.test(wrapper.rel)) {
        // rel is a space-separated list of tokens, and the original rel types
        // are case-insensitive.
        return false;
    }
    return Boolean(el.href);
}
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLMapElementImpl = (function (_super) {
    __extends(HTMLMapElementImpl, _super);
    function HTMLMapElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLMapElementImpl.prototype, "areas", {
        get: function () {
            return this.getElementsByTagName("AREA");
        },
        enumerable: true,
        configurable: true
    });
    return HTMLMapElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLMapElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLMenuElementImpl = (function (_super) {
    __extends(HTMLMenuElementImpl, _super);
    function HTMLMenuElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLMenuElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLMenuElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLMetaElementImpl = (function (_super) {
    __extends(HTMLMetaElementImpl, _super);
    function HTMLMetaElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLMetaElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLMetaElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLMeterElementImpl = (function (_super) {
    __extends(HTMLMeterElementImpl, _super);
    function HTMLMeterElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLMeterElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLMeterElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLModElementImpl = (function (_super) {
    __extends(HTMLModElementImpl, _super);
    function HTMLModElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLModElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLModElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var reflectURLAttribute = require("../../utils").reflectURLAttribute;
var closest = require("../helpers/traversal").closest;
var HTMLObjectElementImpl = (function (_super) {
    __extends(HTMLObjectElementImpl, _super);
    function HTMLObjectElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLObjectElementImpl.prototype, "form", {
        get: function () {
            return closest(this, "form");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLObjectElementImpl.prototype, "contentDocument", {
        get: function () {
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLObjectElementImpl.prototype, "data", {
        get: function () {
            return reflectURLAttribute(this, "data");
        },
        set: function (V) {
            this.setAttribute("data", V);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLObjectElementImpl.prototype, "codeBase", {
        get: function () {
            return reflectURLAttribute(this, "codebase");
        },
        set: function (V) {
            this.setAttribute("codebase", V);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLObjectElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLObjectElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLOListElementImpl = (function (_super) {
    __extends(HTMLOListElementImpl, _super);
    function HTMLOListElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLOListElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLOListElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLOptGroupElementImpl = (function (_super) {
    __extends(HTMLOptGroupElementImpl, _super);
    function HTMLOptGroupElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLOptGroupElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLOptGroupElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var idlUtils = require("../generated/utils");
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var closest = require("../helpers/traversal").closest;
var HTMLOptionElementImpl = (function (_super) {
    __extends(HTMLOptionElementImpl, _super);
    function HTMLOptionElementImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        // whenever selectedness is set to true, make sure all
        // other options set selectedness to false
        _this._selectedness = false;
        _this._dirtyness = false;
        return _this;
    }
    HTMLOptionElementImpl.prototype._removeOtherSelectedness = function () {
        // Remove the selectedness flag from all other options in this select
        var select = this._selectNode;
        if (select && !select.hasAttribute("multiple")) {
            var o = select.options;
            for (var i = 0; i < o.length; i++) {
                var option = idlUtils.implForWrapper(o[i]);
                if (option !== this) {
                    option._selectedness = false;
                }
            }
        }
    };
    HTMLOptionElementImpl.prototype._askForAReset = function () {
        var select = this._selectNode;
        if (select) {
            select._askedForAReset();
        }
    };
    HTMLOptionElementImpl.prototype._attrModified = function (name) {
        if (!this._dirtyness && name === "selected") {
            var wrapper = idlUtils.wrapperForImpl(this);
            this._selectedness = wrapper.defaultSelected;
            if (this._selectedness) {
                this._removeOtherSelectedness();
            }
            this._askForAReset();
        }
        _super.prototype._attrModified.apply(this, arguments);
    };
    Object.defineProperty(HTMLOptionElementImpl.prototype, "_selectNode", {
        get: function () {
            var select = domSymbolTree.parent(this);
            if (!select) {
                return null;
            }
            if (select.nodeName.toUpperCase() !== "SELECT") {
                select = domSymbolTree.parent(select);
                if (!select || select.nodeName.toUpperCase() !== "SELECT") {
                    return null;
                }
            }
            return select;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLOptionElementImpl.prototype, "form", {
        get: function () {
            return closest(this, "form");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLOptionElementImpl.prototype, "text", {
        get: function () {
            // TODO this is wrong
            return this.innerHTML;
        },
        set: function (V) {
            this.textContent = V;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLOptionElementImpl.prototype, "value", {
        get: function () {
            // TODO fallback is wrong
            return this.hasAttribute("value") ? this.getAttribute("value") : this.innerHTML;
        },
        set: function (val) {
            this.setAttribute("value", val);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLOptionElementImpl.prototype, "index", {
        get: function () {
            var select = closest(this, "select");
            if (select === null) {
                return 0;
            }
            return Array.prototype.indexOf.call(select.options, idlUtils.wrapperForImpl(this));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLOptionElementImpl.prototype, "selected", {
        get: function () {
            return this._selectedness;
        },
        set: function (s) {
            this._dirtyness = true;
            this._selectedness = Boolean(s);
            if (this._selectedness) {
                this._removeOtherSelectedness();
            }
            this._askForAReset();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLOptionElementImpl.prototype, "label", {
        // TODO this is quite wrong
        get: function () {
            if (this.hasAttribute("label")) {
                return this.getAttribute("label");
            }
            var select = this._selectNode;
            if (select) {
                return select.getAttribute("label");
            }
            return null;
        },
        set: function (V) {
            var select = this._selectNode;
            if (select) {
                select.setAttribute("label", V);
            }
        },
        enumerable: true,
        configurable: true
    });
    return HTMLOptionElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLOptionElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLOutputElementImpl = (function (_super) {
    __extends(HTMLOutputElementImpl, _super);
    function HTMLOutputElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLOutputElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLOutputElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLParagraphElementImpl = (function (_super) {
    __extends(HTMLParagraphElementImpl, _super);
    function HTMLParagraphElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLParagraphElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLParagraphElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLParamElementImpl = (function (_super) {
    __extends(HTMLParamElementImpl, _super);
    function HTMLParamElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLParamElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLParamElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLPreElementImpl = (function (_super) {
    __extends(HTMLPreElementImpl, _super);
    function HTMLPreElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLPreElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLPreElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLProgressElementImpl = (function (_super) {
    __extends(HTMLProgressElementImpl, _super);
    function HTMLProgressElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLProgressElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLProgressElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLQuoteElementImpl = (function (_super) {
    __extends(HTMLQuoteElementImpl, _super);
    function HTMLQuoteElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLQuoteElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLQuoteElementImpl
};
"use strict";
var vm = require("vm");
var whatwgEncoding = require("whatwg-encoding");
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var reflectURLAttribute = require("../../utils").reflectURLAttribute;
var resourceLoader = require("../../browser/resource-loader");
var reportException = require("../helpers/runtime-script-errors");
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var nodeTypes = require("../node-type");
var jsMIMETypes = new Set([
    "application/ecmascript",
    "application/javascript",
    "application/x-ecmascript",
    "application/x-javascript",
    "text/ecmascript",
    "text/javascript",
    "text/javascript1.0",
    "text/javascript1.1",
    "text/javascript1.2",
    "text/javascript1.3",
    "text/javascript1.4",
    "text/javascript1.5",
    "text/jscript",
    "text/livescript",
    "text/x-ecmascript",
    "text/x-javascript"
]);
var HTMLScriptElementImpl = (function (_super) {
    __extends(HTMLScriptElementImpl, _super);
    function HTMLScriptElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HTMLScriptElementImpl.prototype._attach = function () {
        _super.prototype._attach.call(this);
        if (this.src) {
            resourceLoader.load(this, this.src, { defaultEncoding: whatwgEncoding.labelToName(this.getAttribute("charset")) || this._ownerDocument._encoding }, this._eval);
        }
        else if (this.text.trim().length > 0) {
            resourceLoader.enqueue(this, this._ownerDocument.URL, this._eval)(null, this.text);
        }
    };
    HTMLScriptElementImpl.prototype._attrModified = function (name, value, oldValue) {
        _super.prototype._attrModified.call(this, name, value, oldValue);
        if (this._attached && name === "src" && oldValue === null && value !== null) {
            resourceLoader.load(this, this.src, { defaultEncoding: whatwgEncoding.labelToName(this.getAttribute("charset")) || this._ownerDocument._encoding }, this._eval);
        }
    };
    HTMLScriptElementImpl.prototype._eval = function (text, filename) {
        var typeString = this._getTypeString();
        if (this._ownerDocument.implementation._hasFeature("ProcessExternalResources", "script") &&
            jsMIMETypes.has(typeString.toLowerCase())) {
            this._ownerDocument._writeAfterElement = this;
            processJavaScript(this, text, filename);
            delete this._ownerDocument._writeAfterElement;
        }
    };
    HTMLScriptElementImpl.prototype._getTypeString = function () {
        var typeAttr = this.getAttribute("type");
        var langAttr = this.getAttribute("language");
        if (typeAttr === "") {
            return "text/javascript";
        }
        if (typeAttr === null && langAttr === "") {
            return "text/javascript";
        }
        if (typeAttr === null && langAttr === null) {
            return "text/javascript";
        }
        if (typeAttr !== null) {
            return typeAttr.trim();
        }
        if (langAttr !== null) {
            return "text/" + langAttr;
        }
        return null;
    };
    Object.defineProperty(HTMLScriptElementImpl.prototype, "text", {
        get: function () {
            var text = "";
            for (var _i = 0, _a = domSymbolTree.childrenIterator(this); _i < _a.length; _i++) {
                var child = _a[_i];
                if (child.nodeType === nodeTypes.TEXT_NODE) {
                    text += child.nodeValue;
                }
            }
            return text;
        },
        set: function (text) {
            this.textContent = text;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLScriptElementImpl.prototype, "src", {
        get: function () {
            return reflectURLAttribute(this, "src");
        },
        set: function (V) {
            this.setAttribute("src", V);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLScriptElementImpl;
}(HTMLElementImpl));
function processJavaScript(element, code, filename) {
    var document = element.ownerDocument;
    var window = document && document._global;
    if (window) {
        document._currentScript = element;
        try {
            vm.runInContext(code, window, { filename: filename, displayErrors: false });
        }
        catch (e) {
            reportException(window, e, filename);
        }
        finally {
            document._currentScript = null;
        }
    }
}
module.exports = {
    implementation: HTMLScriptElementImpl
};
"use strict";
var conversions = require("webidl-conversions");
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var idlUtils = require("../generated/utils");
var NODE_TYPE = require("../node-type");
var createHTMLCollection = require("../html-collection").create;
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var descendantsByHTMLLocalName = require("../helpers/traversal").descendantsByHTMLLocalName;
var closest = require("../helpers/traversal").closest;
var HTMLSelectElementImpl = (function (_super) {
    __extends(HTMLSelectElementImpl, _super);
    function HTMLSelectElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HTMLSelectElementImpl.prototype._formReset = function () {
        Array.prototype.forEach.call(this.options, function (option) {
            var optionImpl = idlUtils.implForWrapper(option);
            optionImpl._selectedness = option.defaultSelected;
            optionImpl._dirtyness = false;
        });
        this._askedForAReset();
    };
    HTMLSelectElementImpl.prototype._askedForAReset = function () {
        if (this.hasAttribute("multiple")) {
            return;
        }
        var selected = Array.prototype.filter.call(this.options, function (option) {
            option = idlUtils.implForWrapper(option);
            return option._selectedness;
        });
        // size = 1 is default if not multiple
        if ((!this.size || this.size === 1) && !selected.length) {
            // select the first option that is not disabled
            for (var i = 0; i < this.options.length; ++i) {
                var option = idlUtils.implForWrapper(this.options[i]);
                var disabled = this.options[i].disabled;
                var parentNode = domSymbolTree.parent(option);
                if (parentNode &&
                    parentNode.nodeName.toUpperCase() === "OPTGROUP" &&
                    idlUtils.wrapperForImpl(parentNode).disabled) {
                    disabled = true;
                }
                if (!disabled) {
                    // (do not set dirty)
                    option._selectedness = true;
                    break;
                }
            }
        }
        else if (selected.length >= 2) {
            // select the last selected option
            selected.forEach(function (option, index) {
                option = idlUtils.implForWrapper(option);
                option._selectedness = index === selected.length - 1;
            });
        }
    };
    HTMLSelectElementImpl.prototype._descendantAdded = function (parent, child) {
        if (child.nodeType === NODE_TYPE.ELEMENT_NODE) {
            this._askedForAReset();
        }
        _super.prototype._descendantAdded.apply(this, arguments);
    };
    HTMLSelectElementImpl.prototype._descendantRemoved = function (parent, child) {
        if (child.nodeType === NODE_TYPE.ELEMENT_NODE) {
            this._askedForAReset();
        }
        _super.prototype._descendantRemoved.apply(this, arguments);
    };
    HTMLSelectElementImpl.prototype._attrModified = function (name) {
        if (name === "multiple" || name === "size") {
            this._askedForAReset();
        }
        _super.prototype._attrModified.apply(this, arguments);
    };
    Object.defineProperty(HTMLSelectElementImpl.prototype, "options", {
        get: function () {
            var _this = this;
            // TODO: implement HTMLOptionsCollection
            return createHTMLCollection(this, function () { return descendantsByHTMLLocalName(_this, "option"); });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLSelectElementImpl.prototype, "length", {
        get: function () {
            return this.options.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLSelectElementImpl.prototype, "selectedIndex", {
        get: function () {
            return Array.prototype.reduceRight.call(this.options, function (prev, option, i) {
                option = idlUtils.implForWrapper(option);
                return option.selected ? i : prev;
            }, -1);
        },
        set: function (index) {
            Array.prototype.forEach.call(this.options, function (option, i) {
                option = idlUtils.implForWrapper(option);
                option.selected = i === index;
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLSelectElementImpl.prototype, "value", {
        get: function () {
            var i = this.selectedIndex;
            if (this.options.length && (i === -1)) {
                i = 0;
            }
            if (i === -1) {
                return "";
            }
            return this.options[i].value;
        },
        set: function (val) {
            var self = this;
            Array.prototype.forEach.call(this.options, function (option) {
                option = idlUtils.implForWrapper(option);
                if (option.value === val) {
                    option.selected = true;
                }
                else if (!self.hasAttribute("multiple")) {
                    // Remove the selected bit from all other options in this group
                    // if the multiple attr is not present on the select
                    option.selected = false;
                }
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLSelectElementImpl.prototype, "form", {
        get: function () {
            return closest(this, "form");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLSelectElementImpl.prototype, "type", {
        get: function () {
            return this.hasAttribute("multiple") ? "select-multiple" : "select-one";
        },
        enumerable: true,
        configurable: true
    });
    HTMLSelectElementImpl.prototype.add = function (opt, before) {
        if (before) {
            this.insertBefore(opt, before);
        }
        else {
            this.appendChild(opt);
        }
    };
    HTMLSelectElementImpl.prototype.remove = function (index) {
        var opts = this.options;
        if (index >= 0 && index < opts.length) {
            var el = idlUtils.implForWrapper(opts[index]);
            domSymbolTree.parent(el).removeChild(el);
        }
    };
    Object.defineProperty(HTMLSelectElementImpl.prototype, "size", {
        get: function () {
            if (!this.hasAttribute("size")) {
                return 0;
            }
            var size = conversions["unsigned long"](this.getAttribute("size"));
            if (isNaN(size)) {
                return 0;
            }
            return size;
        },
        set: function (V) {
            this.setAttribute("size", V);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLSelectElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLSelectElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var reflectURLAttribute = require("../../utils").reflectURLAttribute;
var HTMLSourceElementImpl = (function (_super) {
    __extends(HTMLSourceElementImpl, _super);
    function HTMLSourceElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLSourceElementImpl.prototype, "src", {
        get: function () {
            return reflectURLAttribute(this, "src");
        },
        set: function (value) {
            this.setAttribute("src", value);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLSourceElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLSourceElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLSpanElementImpl = (function (_super) {
    __extends(HTMLSpanElementImpl, _super);
    function HTMLSpanElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLSpanElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLSpanElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var LinkStyleImpl = require("./LinkStyle-impl").implementation;
var idlUtils = require("../generated/utils");
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var NODE_TYPE = require("../node-type");
var evaluateStylesheet = require("../helpers/stylesheets").evaluateStylesheet;
var documentBaseURL = require("../helpers/document-base-url").documentBaseURL;
var HTMLStyleElementImpl = (function (_super) {
    __extends(HTMLStyleElementImpl, _super);
    function HTMLStyleElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HTMLStyleElementImpl.prototype._attach = function () {
        if (this.type && this.type !== "text/css") {
            return;
        }
        var content = "";
        for (var _i = 0, _a = domSymbolTree.childrenIterator(this); _i < _a.length; _i++) {
            var child = _a[_i];
            if (child.nodeType === NODE_TYPE.TEXT_NODE) {
                content += child.nodeValue;
            }
        }
        evaluateStylesheet(this, content, this.sheet, documentBaseURL(this._ownerDocument));
        _super.prototype._attach.call(this);
    };
    return HTMLStyleElementImpl;
}(HTMLElementImpl));
idlUtils.mixin(HTMLStyleElementImpl.prototype, LinkStyleImpl.prototype);
module.exports = {
    implementation: HTMLStyleElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLTableCaptionElementImpl = (function (_super) {
    __extends(HTMLTableCaptionElementImpl, _super);
    function HTMLTableCaptionElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLTableCaptionElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLTableCaptionElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var idlUtils = require("../generated/utils");
var closest = require("../helpers/traversal").closest;
var createDOMTokenList = require("../dom-token-list").create;
var resetDOMTokenList = require("../dom-token-list").reset;
var HTMLTableCellImpl = (function (_super) {
    __extends(HTMLTableCellImpl, _super);
    function HTMLTableCellImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLTableCellImpl.prototype, "headers", {
        get: function () {
            if (this._headers === undefined) {
                this._headers = createDOMTokenList(this, "headers");
            }
            return this._headers;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTableCellImpl.prototype, "cellIndex", {
        get: function () {
            var tr = closest(this, "tr");
            if (tr === null) {
                return -1;
            }
            return Array.prototype.indexOf.call(tr.cells, idlUtils.wrapperForImpl(this));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTableCellImpl.prototype, "colSpan", {
        get: function () {
            var value = this.getAttribute("colspan");
            return value === null ? 1 : value;
        },
        set: function (V) {
            this.setAttribute("colspan", String(V));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTableCellImpl.prototype, "rowSpan", {
        get: function () {
            var value = this.getAttribute("rowspan");
            return value === null ? 1 : value;
        },
        set: function (V) {
            this.setAttribute("rowspan", String(V));
        },
        enumerable: true,
        configurable: true
    });
    HTMLTableCellImpl.prototype._attrModified = function (name, value, oldValue) {
        if (name === "headers" && this._headers) {
            resetDOMTokenList(this._headers, value);
        }
        _super.prototype._attrModified.call(this, name, value, oldValue);
    };
    return HTMLTableCellImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLTableCellImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLTableColElementImpl = (function (_super) {
    __extends(HTMLTableColElementImpl, _super);
    function HTMLTableColElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLTableColElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLTableColElementImpl
};
"use strict";
var HTMLTableCellElementImpl = require("./HTMLTableCellElement-impl").implementation;
var HTMLTableDataCellElementImpl = (function (_super) {
    __extends(HTMLTableDataCellElementImpl, _super);
    function HTMLTableDataCellElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLTableDataCellElementImpl;
}(HTMLTableCellElementImpl));
module.exports = {
    implementation: HTMLTableDataCellElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var firstChildWithHTMLLocalName = require("../helpers/traversal").firstChildWithHTMLLocalName;
var childrenByHTMLLocalName = require("../helpers/traversal").childrenByHTMLLocalName;
var createHTMLCollection = require("../../living/html-collection").create;
var DOMException = require("../../web-idl/DOMException");
var idlUtils = require("../generated/utils");
var HTMLTableElementImpl = (function (_super) {
    __extends(HTMLTableElementImpl, _super);
    function HTMLTableElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLTableElementImpl.prototype, "caption", {
        get: function () {
            return firstChildWithHTMLLocalName(this, "caption");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTableElementImpl.prototype, "tHead", {
        get: function () {
            return firstChildWithHTMLLocalName(this, "thead");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTableElementImpl.prototype, "tFoot", {
        get: function () {
            return firstChildWithHTMLLocalName(this, "tfoot");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTableElementImpl.prototype, "rows", {
        get: function () {
            var _this = this;
            if (!this._rows) {
                this._rows = createHTMLCollection(this, function () {
                    var sections = [];
                    if (_this.tHead) {
                        sections.push(_this.tHead);
                    }
                    sections.push.apply(sections, childrenByHTMLLocalName(_this, "tbody"));
                    if (_this.tFoot) {
                        sections.push(_this.tFoot);
                    }
                    if (sections.length === 0) {
                        return childrenByHTMLLocalName(_this, "tr");
                    }
                    var rows = [];
                    for (var _i = 0, sections_1 = sections; _i < sections_1.length; _i++) {
                        var s = sections_1[_i];
                        rows.push.apply(rows, childrenByHTMLLocalName(s, "tr"));
                    }
                    return rows;
                });
            }
            return this._rows;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTableElementImpl.prototype, "tBodies", {
        get: function () {
            var _this = this;
            if (!this._tBodies) {
                this._tBodies = createHTMLCollection(this, function () { return childrenByHTMLLocalName(_this, "tbody"); });
            }
            return this._tBodies;
        },
        enumerable: true,
        configurable: true
    });
    HTMLTableElementImpl.prototype.createTHead = function () {
        var el = this.tHead;
        if (!el) {
            el = this._ownerDocument.createElement("THEAD");
            this.appendChild(el);
        }
        return el;
    };
    HTMLTableElementImpl.prototype.deleteTHead = function () {
        var el = this.tHead;
        if (el) {
            el.parentNode.removeChild(el);
        }
    };
    HTMLTableElementImpl.prototype.createTFoot = function () {
        var el = this.tFoot;
        if (!el) {
            el = this._ownerDocument.createElement("TFOOT");
            this.appendChild(el);
        }
        return el;
    };
    HTMLTableElementImpl.prototype.deleteTFoot = function () {
        var el = this.tFoot;
        if (el) {
            el.parentNode.removeChild(el);
        }
    };
    HTMLTableElementImpl.prototype.createCaption = function () {
        var el = this.caption;
        if (!el) {
            el = this._ownerDocument.createElement("CAPTION");
            this.appendChild(el);
        }
        return el;
    };
    HTMLTableElementImpl.prototype.deleteCaption = function () {
        var c = this.caption;
        if (c) {
            c.parentNode.removeChild(c);
        }
    };
    HTMLTableElementImpl.prototype.insertRow = function (index) {
        if (index < -1 || index > this.rows.length) {
            throw new DOMException(DOMException.INDEX_SIZE_ERR, "Cannot insert a row at an index that is less than -1 or greater than the number of existing rows");
        }
        var tr = this._ownerDocument.createElement("tr");
        if (this.rows.length === 0 && this.tBodies.length === 0) {
            var tBody = this._ownerDocument.createElement("tbody");
            tBody.appendChild(tr);
            this.appendChild(tBody);
        }
        else if (this.rows.length === 0) {
            var tBody = idlUtils.implForWrapper(this.tBodies[this.tBodies.length - 1]);
            tBody.appendChild(tr);
        }
        else if (index === -1 || index === this.rows.length) {
            var tSection = idlUtils.implForWrapper(this.rows[this.rows.length - 1]).parentNode;
            tSection.appendChild(tr);
        }
        else {
            var beforeTR = idlUtils.implForWrapper(this.rows[index]);
            var tSection = beforeTR.parentNode;
            tSection.insertBefore(tr, beforeTR);
        }
        return tr;
    };
    HTMLTableElementImpl.prototype.deleteRow = function (index) {
        if (index === -1) {
            index = this.rows.length - 1;
        }
        if (index < 0 || index >= this.rows.length) {
            throw new DOMException(DOMException.INDEX_SIZE_ERR, "Cannot delete a row at index " + index + ", where no row exists");
        }
        var tr = idlUtils.implForWrapper(this.rows[index]);
        tr.parentNode.removeChild(tr);
    };
    return HTMLTableElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLTableElementImpl
};
"use strict";
var HTMLTableCellElementImpl = require("./HTMLTableCellElement-impl").implementation;
var HTMLTableHeaderCellElementImpl = (function (_super) {
    __extends(HTMLTableHeaderCellElementImpl, _super);
    function HTMLTableHeaderCellElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLTableHeaderCellElementImpl;
}(HTMLTableCellElementImpl));
module.exports = {
    implementation: HTMLTableHeaderCellElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var idlUtils = require("../generated/utils");
var createHTMLCollection = require("../../living/html-collection").create;
var childrenByHTMLLocalNames = require("../helpers/traversal").childrenByHTMLLocalNames;
var DOMException = require("../../web-idl/DOMException");
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var closest = require("../helpers/traversal").closest;
var cellLocalNames = new Set(["td", "th"]);
var HTMLTableRowElementImpl = (function (_super) {
    __extends(HTMLTableRowElementImpl, _super);
    function HTMLTableRowElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLTableRowElementImpl.prototype, "cells", {
        get: function () {
            var _this = this;
            if (!this._cells) {
                this._cells = createHTMLCollection(this, function () { return childrenByHTMLLocalNames(_this, cellLocalNames); });
            }
            return this._cells;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTableRowElementImpl.prototype, "rowIndex", {
        get: function () {
            var table = closest(this, "table");
            return table ? Array.prototype.indexOf.call(table.rows, idlUtils.wrapperForImpl(this)) : -1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTableRowElementImpl.prototype, "sectionRowIndex", {
        get: function () {
            var parent = domSymbolTree.parent(this);
            if (parent === null) {
                return -1;
            }
            var rows = parent.rows;
            if (!rows) {
                return -1;
            }
            return Array.prototype.indexOf.call(rows, idlUtils.wrapperForImpl(this));
        },
        enumerable: true,
        configurable: true
    });
    HTMLTableRowElementImpl.prototype.insertCell = function (index) {
        var td = this._ownerDocument.createElement("TD");
        var cells = this.cells;
        if (index < -1 || index > cells.length) {
            throw new DOMException(DOMException.INDEX_SIZE_ERR);
        }
        if (index === -1 || index === cells.length) {
            this.appendChild(td);
        }
        else {
            var ref = idlUtils.implForWrapper(cells[index]);
            this.insertBefore(td, ref);
        }
        return td;
    };
    HTMLTableRowElementImpl.prototype.deleteCell = function (index) {
        var cells = this.cells;
        if (index === -1) {
            index = cells.length - 1;
        }
        if (index < 0 || index >= cells.length) {
            throw new DOMException(DOMException.INDEX_SIZE_ERR);
        }
        var td = idlUtils.implForWrapper(cells[index]);
        this.removeChild(td);
    };
    return HTMLTableRowElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLTableRowElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var idlUtils = require("../generated/utils");
var childrenByHTMLLocalName = require("../helpers/traversal").childrenByHTMLLocalName;
var createHTMLCollection = require("../../living/html-collection").create;
var DOMException = require("../../web-idl/DOMException");
var HTMLTableSectionElementImpl = (function (_super) {
    __extends(HTMLTableSectionElementImpl, _super);
    function HTMLTableSectionElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLTableSectionElementImpl.prototype, "rows", {
        get: function () {
            var _this = this;
            if (!this._rows) {
                this._rows = createHTMLCollection(this, function () { return childrenByHTMLLocalName(_this, "tr"); });
            }
            return this._rows;
        },
        enumerable: true,
        configurable: true
    });
    HTMLTableSectionElementImpl.prototype.insertRow = function (index) {
        if (index < -1 || index > this.rows.length) {
            throw new DOMException(DOMException.INDEX_SIZE_ERR, "Cannot insert a row at an index that is less than -1 or greater than the number of existing rows");
        }
        var tr = this._ownerDocument.createElement("tr");
        if (index === -1 || index === this.rows.length) {
            this.appendChild(tr);
        }
        else {
            var beforeTR = idlUtils.implForWrapper(this.rows[index]);
            this.insertBefore(tr, beforeTR);
        }
        return tr;
    };
    HTMLTableSectionElementImpl.prototype.deleteRow = function (index) {
        if (index < -1 || index >= this.rows.length) {
            throw new DOMException(DOMException.INDEX_SIZE_ERR, "Cannot delete a row at index " + index + ", where no row exists");
        }
        if (index === -1) {
            if (this.rows.length > 0) {
                var tr = idlUtils.implForWrapper(this.rows[this.rows.length - 1]);
                this.removeChild(tr);
            }
        }
        else {
            var tr = idlUtils.implForWrapper(this.rows[index]);
            this.removeChild(tr);
        }
    };
    return HTMLTableSectionElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLTableSectionElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var cloningSteps = require("../helpers/internal-constants").cloningSteps;
var clone = require("../node").clone;
var domSymbolTree = require("../helpers/internal-constants").domSymbolTree;
var HTMLTemplateElementImpl = (function (_super) {
    __extends(HTMLTemplateElementImpl, _super);
    function HTMLTemplateElementImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this._templateContents = _this._ownerDocument.createDocumentFragment();
        return _this;
    }
    Object.defineProperty(HTMLTemplateElementImpl.prototype, "content", {
        get: function () {
            return this._templateContents;
        },
        enumerable: true,
        configurable: true
    });
    HTMLTemplateElementImpl.prototype[cloningSteps] = function (copy, node, document, cloneChildren) {
        if (!cloneChildren) {
            return;
        }
        for (var _i = 0, _a = domSymbolTree.childrenIterator(node._templateContents); _i < _a.length; _i++) {
            var child = _a[_i];
            var childCopy = clone(this._core, child, copy._templateContents._ownerDocument, true);
            copy._templateContents.appendChild(childCopy);
        }
    };
    return HTMLTemplateElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLTemplateElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var DOMException = require("../../web-idl/DOMException");
var closest = require("../helpers/traversal").closest;
var normalizeToCRLF = require("../helpers/form-controls").normalizeToCRLF;
var HTMLTextAreaElement = (function (_super) {
    __extends(HTMLTextAreaElement, _super);
    function HTMLTextAreaElement(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this._rawValue = "";
        _this._dirtyValue = false;
        return _this;
    }
    HTMLTextAreaElement.prototype._formReset = function () {
        this._rawValue = this.textContent;
        this._dirtyValue = false;
    };
    HTMLTextAreaElement.prototype._getAPIValue = function () {
        return this._rawValue.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    };
    HTMLTextAreaElement.prototype._getValue = function () {
        // Hard-wrapping omitted, for now.
        return normalizeToCRLF(this._rawValue);
    };
    HTMLTextAreaElement.prototype._modified = function () {
        _super.prototype._modified.call(this);
        if (this._dirtyValue === false) {
            this._rawValue = this.textContent;
        }
    };
    Object.defineProperty(HTMLTextAreaElement.prototype, "form", {
        get: function () {
            return closest(this, "form");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTextAreaElement.prototype, "defaultValue", {
        get: function () {
            return this.textContent;
        },
        set: function (val) {
            this.textContent = val;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTextAreaElement.prototype, "value", {
        get: function () {
            return this._getAPIValue();
        },
        set: function (val) {
            this._rawValue = val;
            this._dirtyValue = true;
            this._selectionStart = 0;
            this._selectionEnd = 0;
            this._selectionDirection = "none";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTextAreaElement.prototype, "textLength", {
        get: function () {
            return this.value.length; // code unit length (16 bit)
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTextAreaElement.prototype, "type", {
        get: function () {
            return "textarea";
        },
        enumerable: true,
        configurable: true
    });
    HTMLTextAreaElement.prototype._dispatchSelectEvent = function () {
        var event = this._ownerDocument.createEvent("HTMLEvents");
        event.initEvent("select", true, true);
        this.dispatchEvent(event);
    };
    HTMLTextAreaElement.prototype._getValueLength = function () {
        return typeof this.value === "string" ? this.value.length : 0;
    };
    HTMLTextAreaElement.prototype.select = function () {
        this._selectionStart = 0;
        this._selectionEnd = this._getValueLength();
        this._selectionDirection = "none";
        this._dispatchSelectEvent();
    };
    Object.defineProperty(HTMLTextAreaElement.prototype, "selectionStart", {
        get: function () {
            return this._selectionStart;
        },
        set: function (start) {
            this.setSelectionRange(start, Math.max(start, this._selectionEnd), this._selectionDirection);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTextAreaElement.prototype, "selectionEnd", {
        get: function () {
            return this._selectionEnd;
        },
        set: function (end) {
            this.setSelectionRange(this._selectionStart, end, this._selectionDirection);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTextAreaElement.prototype, "selectionDirection", {
        get: function () {
            return this._selectionDirection;
        },
        set: function (dir) {
            this.setSelectionRange(this._selectionStart, this._selectionEnd, dir);
        },
        enumerable: true,
        configurable: true
    });
    HTMLTextAreaElement.prototype.setSelectionRange = function (start, end, dir) {
        this._selectionEnd = Math.min(end, this._getValueLength());
        this._selectionStart = Math.min(start, this._selectionEnd);
        this._selectionDirection = dir === "forward" || dir === "backward" ? dir : "none";
        this._dispatchSelectEvent();
    };
    HTMLTextAreaElement.prototype.setRangeText = function (repl, start, end, selectionMode) {
        if (arguments.length < 2) {
            start = this._selectionStart;
            end = this._selectionEnd;
        }
        else if (start > end) {
            throw new DOMException(DOMException.INDEX_SIZE_ERR);
        }
        start = Math.min(start, this._getValueLength());
        end = Math.min(end, this._getValueLength());
        var val = this.value;
        var selStart = this._selectionStart;
        var selEnd = this._selectionEnd;
        this.value = val.slice(0, start) + repl + val.slice(end);
        var newEnd = start + this.value.length;
        if (selectionMode === "select") {
            this.setSelectionRange(start, newEnd);
        }
        else if (selectionMode === "start") {
            this.setSelectionRange(start, start);
        }
        else if (selectionMode === "end") {
            this.setSelectionRange(newEnd, newEnd);
        }
        else {
            var delta = repl.length - (end - start);
            if (selStart > end) {
                selStart += delta;
            }
            else if (selStart > start) {
                selStart = start;
            }
            if (selEnd > end) {
                selEnd += delta;
            }
            else if (selEnd > start) {
                selEnd = newEnd;
            }
            this.setSelectionRange(selStart, selEnd);
        }
    };
    Object.defineProperty(HTMLTextAreaElement.prototype, "cols", {
        get: function () {
            if (!this.hasAttribute("cols")) {
                return 20;
            }
            return parseInt(this.getAttribute("cols"));
        },
        set: function (value) {
            if (value <= 0) {
                throw new DOMException(DOMException.INDEX_SIZE_ERR);
            }
            this.setAttribute("cols", String(value));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTextAreaElement.prototype, "rows", {
        get: function () {
            if (!this.hasAttribute("rows")) {
                return 2;
            }
            return parseInt(this.getAttribute("rows"));
        },
        set: function (value) {
            if (value <= 0) {
                throw new DOMException(DOMException.INDEX_SIZE_ERR);
            }
            this.setAttribute("rows", String(value));
        },
        enumerable: true,
        configurable: true
    });
    return HTMLTextAreaElement;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLTextAreaElement
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLTimeElementImpl = (function (_super) {
    __extends(HTMLTimeElementImpl, _super);
    function HTMLTimeElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLTimeElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLTimeElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLTitleElementImpl = (function (_super) {
    __extends(HTMLTitleElementImpl, _super);
    function HTMLTitleElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLTitleElementImpl.prototype, "text", {
        get: function () {
            // TODO this is quite incorrect
            return this.innerHTML;
        },
        set: function (s) {
            this.textContent = s;
        },
        enumerable: true,
        configurable: true
    });
    return HTMLTitleElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLTitleElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var reflectURLAttribute = require("../../utils").reflectURLAttribute;
var HTMLTrackElementImpl = (function (_super) {
    __extends(HTMLTrackElementImpl, _super);
    function HTMLTrackElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLTrackElementImpl.prototype, "readyState", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLTrackElementImpl.prototype, "src", {
        get: function () {
            return reflectURLAttribute(this, "src");
        },
        set: function (value) {
            this.setAttribute("src", value);
        },
        enumerable: true,
        configurable: true
    });
    return HTMLTrackElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLTrackElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLUListElementImpl = (function (_super) {
    __extends(HTMLUListElementImpl, _super);
    function HTMLUListElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLUListElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLUListElementImpl
};
"use strict";
var HTMLElementImpl = require("./HTMLElement-impl").implementation;
var HTMLUnknownElementImpl = (function (_super) {
    __extends(HTMLUnknownElementImpl, _super);
    function HTMLUnknownElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return HTMLUnknownElementImpl;
}(HTMLElementImpl));
module.exports = {
    implementation: HTMLUnknownElementImpl
};
"use strict";
var HTMLMediaElementImpl = require("./HTMLMediaElement-impl").implementation;
var reflectURLAttribute = require("../../utils").reflectURLAttribute;
var HTMLVideoElementImpl = (function (_super) {
    __extends(HTMLVideoElementImpl, _super);
    function HTMLVideoElementImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(HTMLVideoElementImpl.prototype, "poster", {
        get: function () {
            return reflectURLAttribute(this, "poster");
        },
        set: function (value) {
            this.setAttribute("poster", value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLVideoElementImpl.prototype, "videoWidth", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HTMLVideoElementImpl.prototype, "videoHeight", {
        get: function () {
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    return HTMLVideoElementImpl;
}(HTMLMediaElementImpl));
module.exports = {
    implementation: HTMLVideoElementImpl
};
"use strict";
var NonElementParentNodeImpl = (function () {
    function NonElementParentNodeImpl() {
    }
    return NonElementParentNodeImpl;
}());
module.exports = {
    implementation: NonElementParentNodeImpl
};
"use strict";
var CharacterDataImpl = require("./CharacterData-impl").implementation;
var NODE_TYPE = require("../node-type");
var ProcessingInstructionImpl = (function (_super) {
    __extends(ProcessingInstructionImpl, _super);
    function ProcessingInstructionImpl(args, privateData) {
        var _this = _super.call(this, args, privateData) || this;
        _this.nodeType = NODE_TYPE.PROCESSING_INSTRUCTION_NODE;
        _this._target = privateData.target;
        return _this;
    }
    Object.defineProperty(ProcessingInstructionImpl.prototype, "target", {
        get: function () {
            return this._target;
        },
        enumerable: true,
        configurable: true
    });
    return ProcessingInstructionImpl;
}(CharacterDataImpl));
module.exports = {
    implementation: ProcessingInstructionImpl
};
"use strict";
var WindowEventHandlersImpl = (function () {
    function WindowEventHandlersImpl() {
    }
    return WindowEventHandlersImpl;
}());
module.exports = {
    implementation: WindowEventHandlersImpl
};
"use strict";
var DocumentImpl = require("./Document-impl").implementation;
exports.implementation = (function (_super) {
    __extends(XMLDocumentImpl, _super);
    function XMLDocumentImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return XMLDocumentImpl;
}(DocumentImpl));
"use strict";
var DOMException = require("../../web-idl/DOMException");
var idlUtils = require("../generated/utils");
var conversions = require("webidl-conversions");
// FIXME: Once NodeFilter is ported to IDL method, uncomment these.
var FILTER_ACCEPT = 1; // NodeFilter.FILTER_ACCEPT;
var FILTER_REJECT = 2; // NodeFilter.FILTER_REJECT;
var FILTER_SKIP = 3; // NodeFilter.FILTER_SKIP;
var FIRST = false;
var LAST = true;
var NEXT = false;
var PREVIOUS = true;
function isNull(o) {
    return o === null || typeof o === "undefined";
}
var TreeWalkerImpl = (function () {
    function TreeWalkerImpl(args, privateData) {
        this.root = privateData.root;
        this.whatToShow = privateData.whatToShow;
        this.filter = privateData.filter;
        this.currentNode = this.root;
    }
    Object.defineProperty(TreeWalkerImpl.prototype, "currentNode", {
        get: function () {
            return this._currentNode;
        },
        set: function (node) {
            if (isNull(node)) {
                throw new DOMException(DOMException.NOT_SUPPORTED_ERR, "Cannot set currentNode to null");
            }
            this._currentNode = node;
        },
        enumerable: true,
        configurable: true
    });
    TreeWalkerImpl.prototype.parentNode = function () {
        var node = this._currentNode;
        while (!isNull(node) && node !== this.root) {
            node = node.parentNode;
            if (!isNull(node) && this._filterNode(node) === FILTER_ACCEPT) {
                return (this._currentNode = node);
            }
        }
        return null;
    };
    TreeWalkerImpl.prototype.firstChild = function () {
        return this._traverseChildren(FIRST);
    };
    TreeWalkerImpl.prototype.lastChild = function () {
        return this._traverseChildren(LAST);
    };
    TreeWalkerImpl.prototype.previousSibling = function () {
        return this._traverseSiblings(PREVIOUS);
    };
    TreeWalkerImpl.prototype.nextSibling = function () {
        return this._traverseSiblings(NEXT);
    };
    TreeWalkerImpl.prototype.previousNode = function () {
        var node = this._currentNode;
        while (node !== this.root) {
            var sibling = node.previousSibling;
            while (!isNull(sibling)) {
                node = sibling;
                var result = this._filterNode(node);
                while (result !== FILTER_REJECT && node.hasChildNodes()) {
                    node = node.lastChild;
                    result = this._filterNode(node);
                }
                if (result === FILTER_ACCEPT) {
                    return (this._currentNode = node);
                }
                sibling = node.previousSibling;
            }
            if (node === this.root || isNull(node.parentNode)) {
                return null;
            }
            node = node.parentNode;
            if (this._filterNode(node) === FILTER_ACCEPT) {
                return (this._currentNode = node);
            }
        }
        return null;
    };
    TreeWalkerImpl.prototype.nextNode = function () {
        var node = this._currentNode;
        var result = FILTER_ACCEPT;
        for (;;) {
            while (result !== FILTER_REJECT && node.hasChildNodes()) {
                node = node.firstChild;
                result = this._filterNode(node);
                if (result === FILTER_ACCEPT) {
                    return (this._currentNode = node);
                }
            }
            do {
                if (node === this.root) {
                    return null;
                }
                var sibling = node.nextSibling;
                if (!isNull(sibling)) {
                    node = sibling;
                    break;
                }
                node = node.parentNode;
            } while (!isNull(node));
            if (isNull(node)) {
                return null;
            }
            result = this._filterNode(node);
            if (result === FILTER_ACCEPT) {
                return (this._currentNode = node);
            }
        }
    };
    TreeWalkerImpl.prototype.toString = function () {
        return "[object TreeWalker]";
    };
    TreeWalkerImpl.prototype._filterNode = function (node) {
        var n = node.nodeType - 1;
        if (!((1 << n) & this.whatToShow)) {
            return FILTER_SKIP;
        }
        var filter = this.filter;
        if (isNull(filter)) {
            return FILTER_ACCEPT;
        }
        var result;
        if (typeof filter === "function") {
            result = filter(idlUtils.wrapperForImpl(node));
        }
        else {
            result = filter.acceptNode(idlUtils.wrapperForImpl(node));
        }
        result = conversions["unsigned short"](result);
        return result;
    };
    TreeWalkerImpl.prototype._traverseChildren = function (type) {
        var node = this._currentNode;
        node = type === FIRST ? node.firstChild : node.lastChild;
        if (isNull(node)) {
            return null;
        }
        main: for (;;) {
            var result = this._filterNode(node);
            if (result === FILTER_ACCEPT) {
                return (this._currentNode = node);
            }
            if (result === FILTER_SKIP) {
                var child = type === FIRST ? node.firstChild : node.lastChild;
                if (!isNull(child)) {
                    node = child;
                    continue;
                }
            }
            for (;;) {
                var sibling = type === FIRST ? node.nextSibling : node.previousSibling;
                if (!isNull(sibling)) {
                    node = sibling;
                    continue main;
                }
                var parent_2 = node.parentNode;
                if (isNull(parent_2) || parent_2 === this.root || parent_2 === this._currentNode) {
                    return null;
                }
                node = parent_2;
            }
        }
    };
    TreeWalkerImpl.prototype._traverseSiblings = function (type) {
        var node = this._currentNode;
        if (node === this.root) {
            return null;
        }
        for (;;) {
            var sibling = type === NEXT ? node.nextSibling : node.previousSibling;
            while (!isNull(sibling)) {
                node = sibling;
                var result = this._filterNode(node);
                if (result === FILTER_ACCEPT) {
                    return (this._currentNode = node);
                }
                sibling = type === NEXT ? node.firstChild : node.lastChild;
                if (result === FILTER_REJECT || isNull(sibling)) {
                    sibling = type === NEXT ? node.nextSibling : node.previousSibling;
                }
            }
            node = node.parentNode;
            if (isNull(node) || node === this.root) {
                return null;
            }
            if (this._filterNode(node) === FILTER_ACCEPT) {
                return null;
            }
        }
    };
    return TreeWalkerImpl;
}());
module.exports = {
    implementation: TreeWalkerImpl
};
"use strict";
var whatwgURL = require("whatwg-url");
var arrayEqual = require("array-equal");
var notImplemented = require("../../browser/not-implemented.js");
var HashChangeEvent = require("../generated/HashChangeEvent.js");
var PopStateEvent = require("../generated/PopStateEvent.js");
var idlUtils = require("../generated/utils");
exports.traverseHistory = function (window, specifiedEntry, flags) {
    // Not spec compliant, just minimal. Lots of missing steps.
    if (flags === undefined) {
        flags = {};
    }
    var nonBlockingEvents = Boolean(flags.nonBlockingEvents);
    var document = idlUtils.implForWrapper(window._document);
    var currentEntry = window._sessionHistory[window._currentSessionHistoryEntryIndex];
    if (currentEntry.title === undefined) {
        currentEntry.title = document.title;
    }
    document._URL = specifiedEntry.url;
    var hashChanged = false;
    var oldURL;
    var newURL;
    if (specifiedEntry.url.fragment !== currentEntry.url.fragment) {
        hashChanged = true;
        oldURL = currentEntry.url;
        newURL = specifiedEntry.url;
    }
    var state = specifiedEntry.stateObject; // TODO structured clone
    document._history._state = state;
    var stateChanged = specifiedEntry.document._history._latestEntry !== specifiedEntry;
    specifiedEntry.document._history._latestEntry = specifiedEntry;
    if (nonBlockingEvents) {
        window.setTimeout(fireEvents, 0);
    }
    else {
        fireEvents();
    }
    function fireEvents() {
        if (stateChanged) {
            window.dispatchEvent(PopStateEvent.create(["popstate", {
                    bubbles: true,
                    cancelable: false,
                    state: state
                }]));
        }
        if (hashChanged) {
            window.dispatchEvent(HashChangeEvent.create(["hashchange", {
                    bubbles: true,
                    cancelable: false,
                    oldURL: whatwgURL.serializeURL(oldURL),
                    newURL: whatwgURL.serializeURL(newURL)
                }]));
        }
    }
    window._currentSessionHistoryEntryIndex = window._sessionHistory.indexOf(specifiedEntry);
};
exports.navigate = function (window, newURL) {
    // This is NOT a spec-compliant implementation of navigation in any way. It implements a few selective steps that
    // are nice for jsdom users, regarding hash changes. We could maybe implement javascript: URLs in the future, but
    // the rest is too hard.
    var document = idlUtils.implForWrapper(window._document);
    var currentURL = document._URL;
    if (newURL.scheme !== currentURL.scheme ||
        newURL.username !== currentURL.username ||
        newURL.password !== currentURL.password ||
        newURL.host !== currentURL.host ||
        newURL.port !== currentURL.port ||
        !arrayEqual(newURL.path, currentURL.path) ||
        newURL.query !== currentURL.query ||
        // Omitted per spec: url.fragment !== this._url.fragment ||
        newURL.cannotBeABaseURL !== currentURL.cannotBeABaseURL) {
        notImplemented("navigation (except hash changes)", window);
        return;
    }
    if (newURL.fragment !== currentURL.fragment) {
        // https://html.spec.whatwg.org/#scroll-to-fragid
        window._sessionHistory.splice(window._currentSessionHistoryEntryIndex + 1, Infinity);
        document._history._clearHistoryTraversalTasks();
        var newEntry = { document: document, url: newURL };
        window._sessionHistory.push(newEntry);
        exports.traverseHistory(window, newEntry, { nonBlockingEvents: true });
    }
};
"use strict";
var DOMException = require("../../web-idl/DOMException.js");
var documentBaseURLSerialized = require("../helpers/document-base-url.js").documentBaseURLSerialized;
var parseURLToResultingURLRecord = require("../helpers/document-base-url.js").parseURLToResultingURLRecord;
var traverseHistory = require("./navigation.js").traverseHistory;
exports.implementation = (function () {
    function HistoryImpl(args, privateData) {
        this._window = privateData.window;
        this._document = privateData.document;
        this._actAsIfLocationReloadCalled = privateData.actAsIfLocationReloadCalled;
        this._state = null;
        this._latestEntry = null;
        this._historyTraversalQueue = new Set();
    }
    HistoryImpl.prototype._guardAgainstInactiveDocuments = function () {
        if (!this._window) {
            throw new DOMException(DOMException.SECURITY_ERR, "History object is associated with a document that is not fully active.");
        }
    };
    Object.defineProperty(HistoryImpl.prototype, "length", {
        get: function () {
            this._guardAgainstInactiveDocuments();
            return this._window._sessionHistory.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HistoryImpl.prototype, "state", {
        get: function () {
            this._guardAgainstInactiveDocuments();
            return this._state;
        },
        enumerable: true,
        configurable: true
    });
    HistoryImpl.prototype.go = function (delta) {
        var _this = this;
        this._guardAgainstInactiveDocuments();
        if (delta === 0) {
            this._actAsIfLocationReloadCalled();
        }
        else {
            this._queueHistoryTraversalTask(function () {
                var newIndex = _this._window._currentSessionHistoryEntryIndex + delta;
                if (newIndex < 0 || newIndex >= _this._window._sessionHistory.length) {
                    return;
                }
                var specifiedEntry = _this._window._sessionHistory[newIndex];
                // Not implemented: unload a document guard
                // Not clear that this should be queued. html/browsers/history/the-history-interface/004.html can be fixed
                // by removing the queue, but doing so breaks some tests in history.js that also pass in browsers.
                _this._queueHistoryTraversalTask(function () { return traverseHistory(_this._window, specifiedEntry); });
            });
        }
    };
    HistoryImpl.prototype.back = function () {
        this.go(-1);
    };
    HistoryImpl.prototype.forward = function () {
        this.go(+1);
    };
    HistoryImpl.prototype.pushState = function (data, title, url) {
        this._sharedPushAndReplaceState(data, title, url, "pushState");
    };
    HistoryImpl.prototype.replaceState = function (data, title, url) {
        this._sharedPushAndReplaceState(data, title, url, "replaceState");
    };
    HistoryImpl.prototype._sharedPushAndReplaceState = function (data, title, url, methodName) {
        this._guardAgainstInactiveDocuments();
        // TODO structured clone data
        var newURL;
        if (url !== null) {
            // Not implemented: use of entry settings object's API base URL. Instead we just use the document base URL. The
            // difference matters in the case of cross-frame calls.
            newURL = parseURLToResultingURLRecord(url, this._document);
            if (newURL === "failure") {
                throw new DOMException(DOMException.SECURITY_ERR, "Could not parse url argument \"" + url + "\" to " + methodName + " " +
                    ("against base URL \"" + documentBaseURLSerialized(this._document) + "\"."));
            }
            if (newURL.scheme !== this._document._URL.scheme ||
                newURL.username !== this._document._URL.username ||
                newURL.password !== this._document._URL.password ||
                newURL.host !== this._document._URL.host ||
                newURL.port !== this._document._URL.port ||
                newURL.cannotBeABaseURL !== this._document._URL.cannotBeABaseURL) {
                throw new DOMException(DOMException.SECURITY_ERR, methodName + " cannot update history to a URL which " +
                    "differs in components other than in path, query, or fragment.");
            }
        }
        else {
            newURL = this._window._sessionHistory[this._window._currentSessionHistoryEntryIndex].url;
        }
        if (methodName === "pushState") {
            this._window._sessionHistory.splice(this._window._currentSessionHistoryEntryIndex + 1, Infinity);
            this._clearHistoryTraversalTasks();
            this._window._sessionHistory.push({
                document: this._document,
                stateObject: data,
                title: title,
                url: newURL
            });
            this._window._currentSessionHistoryEntryIndex = this._window._sessionHistory.length - 1;
        }
        else {
            var currentEntry = this._window._sessionHistory[this._window._currentSessionHistoryEntryIndex];
            currentEntry.stateObject = data;
            currentEntry.title = title;
            currentEntry.url = newURL;
        }
        this._document._URL = newURL;
        this._state = data; // TODO clone again!! O_o
        this._latestEntry = this._window._sessionHistory[this._window._currentSessionHistoryEntryIndex];
    };
    HistoryImpl.prototype._queueHistoryTraversalTask = function (fn) {
        var _this = this;
        var timeoutId = this._window.setTimeout(function () {
            _this._historyTraversalQueue["delete"](timeoutId);
            fn();
        }, 0);
        this._historyTraversalQueue.add(timeoutId);
    };
    HistoryImpl.prototype._clearHistoryTraversalTasks = function () {
        for (var _i = 0, _a = this._historyTraversalQueue; _i < _a.length; _i++) {
            var timeoutId = _a[_i];
            this._window.clearTimeout(timeoutId);
        }
        this._historyTraversalQueue.clear();
    };
    return HistoryImpl;
}());
"use strict";
var whatwgURL = require("whatwg-url");
var documentBaseURL = require("../helpers/document-base-url.js").documentBaseURL;
var parseURLToResultingURLRecord = require("../helpers/document-base-url.js").parseURLToResultingURLRecord;
var DOMException = require("../../web-idl/DOMException.js");
var notImplemented = require("../../browser/not-implemented.js");
var navigate = require("./navigation.js").navigate;
// Not implemented: use of entry settings object's API base URL in href setter, assign, and replace. Instead we just
// use the document base URL. The difference matters in the case of cross-frame calls.
exports.implementation = (function () {
    function LocationImpl(args, privateData) {
        this._relevantDocument = privateData.relevantDocument;
        this.url = null;
    }
    Object.defineProperty(LocationImpl.prototype, "_url", {
        get: function () {
            return this._relevantDocument._URL;
        },
        enumerable: true,
        configurable: true
    });
    LocationImpl.prototype._locationObjectSetterNavigate = function (url) {
        // Not implemented: extra steps here to determine replacement flag, since they are not applicable to our
        // rudimentary "navigation" implementation.
        return this._locationObjectNavigate(url);
    };
    LocationImpl.prototype._locationObjectNavigate = function (url /* , { replacement = false } = {} */) {
        // Not implemented: the setup for calling navigate, which doesn't apply to our stub navigate anyway.
        // Not implemented: using the replacement flag.
        navigate(this._relevantDocument._defaultView, url);
    };
    LocationImpl.prototype.toString = function () {
        return this.href;
    };
    Object.defineProperty(LocationImpl.prototype, "href", {
        get: function () {
            return whatwgURL.serializeURL(this._url);
        },
        set: function (v) {
            var newURL = whatwgURL.parseURL(v, { baseURL: documentBaseURL(this._relevantDocument) });
            if (newURL === "failure") {
                throw new TypeError("Could not parse \"" + v + "\" as a URL");
            }
            this._locationObjectSetterNavigate(newURL);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LocationImpl.prototype, "origin", {
        get: function () {
            return whatwgURL.serializeURLToUnicodeOrigin(this._url);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LocationImpl.prototype, "protocol", {
        get: function () {
            return this._url.scheme + ":";
        },
        set: function (v) {
            var copyURL = Object.assign({}, this._url);
            var possibleFailure = whatwgURL.basicURLParse(v + ":", { url: copyURL, stateOverride: "scheme start" });
            if (possibleFailure === "failure") {
                throw new TypeError("Could not parse the URL after setting the procol to \"" + v + "\"");
            }
            if (copyURL.scheme !== "http" && copyURL.scheme !== "https") {
                return;
            }
            this._locationObjectSetterNavigate(copyURL);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LocationImpl.prototype, "host", {
        get: function () {
            var url = this._url;
            if (url.host === null) {
                return "";
            }
            if (url.port === null) {
                return whatwgURL.serializeHost(url.host);
            }
            return whatwgURL.serializeHost(url.host) + ":" + whatwgURL.serializeInteger(url.port);
        },
        set: function (v) {
            var copyURL = Object.assign({}, this._url);
            if (copyURL.cannotBeABaseURL) {
                return;
            }
            whatwgURL.basicURLParse(v, { url: copyURL, stateOverride: "host" });
            this._locationObjectSetterNavigate(copyURL);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LocationImpl.prototype, "hostname", {
        get: function () {
            if (this._url.host === null) {
                return "";
            }
            return whatwgURL.serializeHost(this._url.host);
        },
        set: function (v) {
            var copyURL = Object.assign({}, this._url);
            if (copyURL.cannotBeABaseURL) {
                return;
            }
            whatwgURL.basicURLParse(v, { url: copyURL, stateOverride: "hostname" });
            this._locationObjectSetterNavigate(copyURL);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LocationImpl.prototype, "port", {
        get: function () {
            if (this._url.port === null) {
                return "";
            }
            return whatwgURL.serializeInteger(this._url.port);
        },
        set: function (v) {
            var copyURL = Object.assign({}, this._url);
            if (copyURL.host === null || copyURL.cannotBeABaseURL || copyURL.scheme === "file") {
                return;
            }
            whatwgURL.basicURLParse(v, { url: copyURL, stateOverride: "port" });
            this._locationObjectSetterNavigate(copyURL);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LocationImpl.prototype, "pathname", {
        get: function () {
            var url = this._url;
            if (url.cannotBeABaseURL) {
                return url.path[0];
            }
            return "/" + url.path.join("/");
        },
        set: function (v) {
            var copyURL = Object.assign({}, this._url);
            if (copyURL.cannotBeABaseURL) {
                return;
            }
            copyURL.path = [];
            whatwgURL.basicURLParse(v, { url: copyURL, stateOverride: "path start" });
            this._locationObjectSetterNavigate(copyURL);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LocationImpl.prototype, "search", {
        get: function () {
            if (this._url.query === null || this._url.query === "") {
                return "";
            }
            return "?" + this._url.query;
        },
        set: function (v) {
            var copyURL = Object.assign({}, this._url);
            if (v === "") {
                copyURL.query = null;
            }
            else {
                var input = v[0] === "?" ? v.substring(1) : v;
                copyURL.query = "";
                whatwgURL.basicURLParse(input, {
                    url: copyURL,
                    stateOverride: "query",
                    encodingOverride: this._relevantDocument.charset
                });
            }
            this._locationObjectSetterNavigate(copyURL);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LocationImpl.prototype, "hash", {
        get: function () {
            if (this._url.fragment === null || this._url.fragment === "") {
                return "";
            }
            return "#" + this._url.fragment;
        },
        set: function (v) {
            var copyURL = Object.assign({}, this._url);
            if (copyURL.scheme === "javascript") {
                return;
            }
            if (v === "") {
                copyURL.fragment = null;
            }
            else {
                var input = v[0] === "#" ? v.substring(1) : v;
                copyURL.fragment = "";
                whatwgURL.basicURLParse(input, { url: copyURL, stateOverride: "fragment" });
            }
            this._locationObjectSetterNavigate(copyURL);
        },
        enumerable: true,
        configurable: true
    });
    LocationImpl.prototype.assign = function (url) {
        // Should be entry settings object; oh well
        var parsedURL = parseURLToResultingURLRecord(url, this._relevantDocument);
        if (parsedURL === "failure") {
            throw new DOMException(DOMException.SYNTAX_ERR, "Could not resolve the given string \"" + url + "\" relative to the " +
                ("base URL \"" + this._relevantDocument.URL + "\""));
        }
        this._locationObjectNavigate(parsedURL);
    };
    LocationImpl.prototype.replace = function (url) {
        // Should be entry settings object; oh well
        var parsedURL = parseURLToResultingURLRecord(url, this._relevantDocument);
        if (parsedURL === "failure") {
            throw new DOMException(DOMException.SYNTAX_ERR, "Could not resolve the given string \"" + url + "\" relative to the " +
                ("base URL \"" + this._relevantDocument.URL + "\""));
        }
        this._locationObjectNavigate(parsedURL, { replacement: true });
    };
    LocationImpl.prototype.reload = function () {
        notImplemented("location.reload()", this._relevantDocument._defaultView);
    };
    return LocationImpl;
}());
"use strict";
var idlUtils = require("../generated/utils");
var isFormElement = require("../generated/HTMLFormElement").isImpl;
var closest = require("../helpers/traversal").closest;
var isDisabled = require("../helpers/form-controls").isDisabled;
var isSubmittable = require("../helpers/form-controls").isSubmittable;
var isButton = require("../helpers/form-controls").isButton;
var normalizeToCRLF = require("../helpers/form-controls").normalizeToCRLF;
var File = require("../file");
var blobSymbols = require("../blob-symbols");
var fileSymbols = require("../file-symbols");
var conversions = require("webidl-conversions");
exports.implementation = (function () {
    function FormDataImpl(args) {
        this._entries = [];
        if (args[0] !== undefined) {
            if (!isFormElement(args[0])) {
                throw new TypeError("First argument must undefined or a HTMLFormElement");
            }
            this._entries = constructTheFormDataSet(args[0]);
        }
    }
    FormDataImpl.prototype.append = function (name, value, filename) {
        // Handling this manually for now: https://github.com/jsdom/webidl2js/issues/29
        if (!isBlob(value)) {
            value = conversions.USVString(value);
        }
        var entry = createAnEntry(name, value, filename);
        this._entries.push(entry);
    };
    FormDataImpl.prototype["delete"] = function (name) {
        this._entries = this._entries.filter(function (entry) { return entry.name !== name; });
    };
    FormDataImpl.prototype.get = function (name) {
        var foundEntry = this._entries.find(function (entry) { return entry.name === name; });
        return foundEntry !== undefined ? foundEntry.value : null;
    };
    FormDataImpl.prototype.getAll = function (name) {
        return this._entries.filter(function (entry) { return entry.name === name; }).map(function (entry) { return entry.value; });
    };
    FormDataImpl.prototype.has = function (name) {
        return this._entries.findIndex(function (entry) { return entry.name === name; }) !== -1;
    };
    FormDataImpl.prototype.set = function (name, value, filename) {
        // Handling this manually for now: https://github.com/jsdom/webidl2js/issues/29
        if (!isBlob(value)) {
            value = conversions.USVString(value);
        }
        var entry = createAnEntry(name, value, filename);
        var foundIndex = this._entries.findIndex(function (e) { return e.name === name; });
        if (foundIndex !== -1) {
            this._entries[foundIndex] = entry;
            this._entries = this._entries.filter(function (e, i) { return e.name !== name || i === foundIndex; });
        }
        else {
            this._entries.push(entry);
        }
    };
    return FormDataImpl;
}());
function createAnEntry(name, value, filename) {
    var entry = { name: name };
    // https://github.com/whatwg/xhr/issues/75
    if (isBlob(value) && !isFile(value)) {
        var oldType = value[blobSymbols.type];
        value = new File([value], "blob");
        value[blobSymbols.type] = oldType;
    }
    if (isFile(value) && filename !== undefined) {
        var oldType = value[blobSymbols.type];
        value = new File([value], filename);
        value[blobSymbols.type] = oldType;
    }
    entry.value = value;
    return entry;
}
function constructTheFormDataSet(form, submitter) {
    // https://html.spec.whatwg.org/multipage/forms.html#constructing-form-data-set
    var controls = Array.prototype.filter.call(form.elements, isSubmittable); // submittable is a subset of listed
    var formDataSet = [];
    for (var _i = 0, controls_1 = controls; _i < controls_1.length; _i++) {
        var fieldWrapper = controls_1[_i];
        var field = idlUtils.implForWrapper(fieldWrapper);
        if (closest(field, "datalist") !== null) {
            continue;
        }
        if (isDisabled(field)) {
            continue;
        }
        if (isButton(field) && field !== submitter) {
            continue;
        }
        if (field.type === "checkbox" && field._checkedness === false) {
            continue;
        }
        if (field.type === "radio" && field._checkedness === false) {
            continue;
        }
        if (field.type !== "image" && (!field.hasAttribute("name") || field.getAttribute("name") === "")) {
            continue;
        }
        if (field.localName === "object") {
            continue;
        }
        var type = field.type;
        // Omit special processing of <input type="image"> since so far we don't actually ever pass submitter
        var nameAttr = field.getAttribute("name");
        var name_10 = nameAttr === null ? "" : nameAttr;
        if (field.localName === "select") {
            for (var i = 0; i < field.options.length; ++i) {
                var option = idlUtils.implForWrapper(field.options[i]);
                if (option._selectedness === true && !isDisabled(field)) {
                    formDataSet.push({ name: name_10, value: option.value, type: type });
                }
            }
        }
        else if (field.localName === "input" && (type === "checkbox" || type === "radio")) {
            var value = field.hasAttribute("value") ? field.getAttribute("value") : "on";
            formDataSet.push({ name: name_10, value: value, type: type });
        }
        else if (type === "file") {
            for (var i = 0; i < field.files.length; ++i) {
                formDataSet.push({ name: name_10, value: field.files.item(i), type: type });
            }
            if (field.files.length === 0) {
                formDataSet.push({ name: name_10, value: "", type: "application/octet-stream" });
            }
        } /* skip plugins */
        else {
            formDataSet.push({ name: name_10, value: field._getValue(), type: type });
        }
        var dirname = field.getAttribute("dirname");
        if (dirname !== null && dirname !== "") {
            var dir = "ltr"; // jsdom does not (yet?) implement actual directionality
            formDataSet.push({ name: dirname, value: dir, type: "direction" });
        }
    }
    for (var _a = 0, formDataSet_1 = formDataSet; _a < formDataSet_1.length; _a++) {
        var entry = formDataSet_1[_a];
        entry.name = conversions.USVString(normalizeToCRLF(entry.name));
        if (entry.type !== "file" && entry.type !== "textarea") {
            entry.value = normalizeToCRLF(entry.value);
        }
        if (entry.type !== "file") {
            entry.value = conversions.USVString(entry.value);
        }
    }
    return formDataSet;
}
function isBlob(obj) {
    return obj !== null && typeof obj === "object" && blobSymbols.buffer in obj;
}
function isFile(obj) {
    return obj !== null && typeof obj === "object" && fileSymbols.name in obj;
}
