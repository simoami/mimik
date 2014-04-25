/*jshint node:true*/
var nativeForEach = Array.prototype.forEach,
    nativeIsArray = Array.isArray,
    toString = Object.prototype.toString,
    breaker = {},
    utils,
    each = function each(obj, iterator, scope) {
        var i, len;
        // inspired from underscore.js
        if (obj == null) {
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
    };

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
        if (obj == null) {
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
                    if ( deep === true && 
                         target[key] && 
                         // if not doing this check you may end in
                         // endless loop if using deep option
                         toString.call(args[i][key]) === obj &&
                         toString.call(target[key]) === obj ) {

                        utils.extend( deep, target[key], args[i][key] );    
                    } else {
                        target[key] = args[i][key];
                    }            
                }
            }  

            return target;    
        };
    }()),
    extend: function(ctor, superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    },
    copyTo: function(dest, source, props){
        if(typeof props === 'string'){
            props = props.split(/[,;\s]/);
        }
        each(props, function(prop){
            if(source.hasOwnProperty(prop)){
                dest[prop] = source[prop];
            }
        }, this);
        return dest;
    }
};
module.exports = utils;