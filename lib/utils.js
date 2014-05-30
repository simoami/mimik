/*jshint node:true*/
'use strict';

var nativeForEach = Array.prototype.forEach,
    nativeIsArray = Array.isArray,
    toString = Object.prototype.toString,
    formatRe = new RegExp('({[^}]+})', 'g'),
    breaker = {},
    utils;

function each(obj, iterator, scope) {
    var i, len;
    // inspired from underscore.js
    if (obj === null || obj === undefined) {
        return;
    }
    if (nativeForEach && obj.forEach === nativeForEach) {
        obj.forEach(iterator, scope);
    } else if (obj.length === +obj.length) {
        for (i = 0, len = obj.length; i < len; i++) {
            if (iterator.call(scope, obj[i], i, obj) === breaker) {
                return;
            }
        }
    } else {
        var keys = utils.keys(obj);
        for (i = 0, len = keys.length; i < len; i++) {
            if (iterator.call(scope, obj[keys[i]], keys[i], obj) === breaker) {
                return;
            }
        }
    }
}

function isNodeReference(text) {
    return text.indexOf('(module.js:') !== -1 ||
           text.indexOf('(node.js:') !== -1;
}

function isExternalModule(text) {
    return ~text.indexOf('node_modules');
}

function getFormatElement(key, args) {
    if(!isNaN(parseInt(key, 10))) {
        if(args[parseInt(key, 10)] === undefined) {
            throw new Error('Parameter "{' + key + '}" not supplied.');
        }
        return args[parseInt(key, 10)];
    } else {
        if(args[0] === undefined || args[0][key] === undefined) {
            throw new Error('Parameter "{' + key + '}" not supplied.');
        }
        return args[0][key] !== undefined ? args[0][key] : '';
    }
}

utils = {
    has: function(obj, key) {
        return obj && obj.hasOwnProperty(key);
    },
    keys: Object.keys || function(obj) {
        // inspired from underscore.js
        if (obj !== Object(obj)) {
            throw new TypeError('Invalid object');
        }
        var keys = [];
        for (var key in obj) {
            if (utils.has(obj, key)) {
                keys.push(key);
            }
        }
        return keys;
    },
    each : each,
    isArray: nativeIsArray || function(obj) {
        return toString.call(obj) === '[object Array]';
    },
    isBoolean: function(obj) {
        return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
    },
    isDate: function(obj) {
        return toString.call(obj) === '[object Date]';
    },
    isEmpty: function(obj) {
        if (obj === null || obj === undefined) {
            return true;
        }
        if (utils.isArray(obj) || utils.isString(obj)) {
            return obj.length === 0;
        }
        if(utils.isObject(obj)) {
            for (var key in obj) {
                if (utils.has(obj, key)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    },
    isFunction: function(fn) {
        return typeof fn === 'function';
    },
    isNaN: function(obj) {
        return utils.isNumber(obj) && obj !== +obj;
    },
    isNull: function(obj) {
        return obj === null;
    },
    isNumber: function(obj) {
        return toString.call(obj) === '[object Number]';
    },
    isObject: function(obj) {
        return obj === Object(obj);
    },
    isString: function(s) {
        return typeof s === 'string';
    },
    isUndefined: function(obj) {
        return obj === void 0;
    },
    isError: function(obj) {
        return toString.call(obj) === '[object Error]';
    },
    /**
     * Merge objects to the first one
     * @param {Boolean|Object} deep if set true, deep merge will be done
     * @param {Object}  obj
     * @return {Object}
     */
    apply: (function(){

        var toString = Object.prototype.toString,
            obj = '[object Object]';

        return function apply( deep /*, obj1, obj2, obj3 */ ) {
            // take first argument, if its not a boolean
            var args = arguments,
                i = deep === true ? 1 : 0,
                key,
                target = args[i];

            for ( ++i; i < args.length; ++i ) {
                for (key in args[i]) {
                    if (deep === true &&  target[key] && 
                        // if not doing this check you may end in
                        // endless loop if using deep option
                        toString.call(args[i][key]) === obj &&
                        toString.call(target[key]) === obj ) {

                        utils.extend(target[key], args[i][key]);
                    } else {
                        target[key] = args[i][key];
                    }            
                }
            }  

            return target;    
        };
    }()),
    extend: function extend(ctor, superCtor) {
      ctor.superclass = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    },
    copyTo: function copyTo(dest, source, props){
        if(typeof props === 'string'){
            props = props.split(/[,;\s]/);
        }
        each(props, function(prop){
            if(source.hasOwnProperty(prop)){
                dest[prop] = source[prop];
            }
        }, this);
        return dest;
    },
    filterStacktrace: function filterStacktrace(stack, relativePath) {
        // cut off the first line, since it only contains the error message
        var message = stack.substring(0, stack.indexOf('\n'));
        var lines = stack.substring(stack.indexOf('\n') + 1).split('\n');
        var filtered = [message];
        var fn = function(match) {
            var filePath = require('path').relative(relativePath, match.substr(1));
            return '(' + filePath;
        };
        for (var i = 0; i < lines.length; ++i) {
            var line = lines[i];
            if (line && !isNodeReference(line) && !isExternalModule(line)) {
                if(relativePath) {
                    line = line.replace(/\([^:]+/, fn);
                }
                filtered.push(line);
            }
        }
        return filtered.join('\n');
    },
    format: function format(tpl) {
        var str = arguments[0], out = str, args = Array.prototype.splice.call(arguments, 1);
        if(typeof str === 'string' && str.indexOf('{') > -1) {
            out = (str||'').replace(formatRe, function(param, $1) {
                var key = $1.substr(1, $1.length-2);
                return getFormatElement(key, args);
            });
        }
        return typeof out === 'string' ? out.replace('\\{', '{') : out;
    },
    color: function(key, value) {
        var color = { 
            red:'\u001b[31m',
            green:'\u001b[32m', 
            yellow:'\u001b[33m',
            blue:'\u001b[34m', 
            magenta:'\u001b[35m',
            cyan:'\u001b[36m',
            white:'\u001b[37m',
            grey:'\u001b[90m',
            bgred:'\u001b[41m',
            bggreen:'\u001b[42m', 
            bgyellow:'\u001b[43m',
            bgblue:'\u001b[44m', 
            bgmagenta:'\u001b[45m',
            bgcyan:'\u001b[46m',
            bgwhite:'\u001b[47m',
            reset: '\u001b[0m'
        };
        color.ok = color.pass = color.passed = color.green;
        color.error = color.err = color.fail = color.failed = color.red;
        color.warning = color.slow = color.yellow;
        color.pending = color.cyan;
        return value && color[key] ? color[key] + value + color.reset : value;
    }
};

module.exports = utils;