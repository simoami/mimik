/*jshint node:true*/
/**
 * 
 * utility singleton to make classes and methods chainable
 */

var Queue = {};
(function(Queue) {
    'use strict';
    Queue.isNested = false;
    var nestedPos = 0;

    Queue.handlers = [];

    /**
     * @private
     * @function add
     * This is typically called internally and there's no need to call it explicitly. 
     * Every call to a chained method add itself to the queue and waits until the queue drains and it's the function's turn to execute.
     */
    Queue.add = function(handler, scope) {
        if (handler instanceof Function) {
            handler = {
                fn: handler,
                scope: scope
            };
        }

        if (Queue.isNested) {
            Queue.handlers.splice(nestedPos, 0, handler);
            nestedPos++;
        } else {
            Queue.handlers.push(handler);
        }
        //call done to call the next command
        if (Queue.handlers.length === 1 && !Queue.isNested) {
            process.nextTick(Queue.done);
        }
    };
    /**
     * @function done
     */
    Queue.done = function() {
        var next;
        // TODO: we need to clarify the easing api
        if (Queue.handlers.length ===  0) {
            return;
        }
        next = Queue.handlers.shift();
        nestedPos = 0;
        //call next method
        process.nextTick(function() {
            next.fn.call(
                next.scope, 
                // callback handler
                function() {
                    // mark in callback so the next set of add get added to the front
                    Queue.isNested = true;
                    if(next.callback) {
                        next.callback.apply(next.scope, arguments);
                    }
                    Queue.isNested = false;
                    Queue.done();
                }
            );
       });
    };
    /**
     * @function chain
     * takes a standard sync or async function and wraps it to make it chainable
     * @param {Function} fn The input function to transform. The function needs to have a callback as last parameter. 
     * The callback function needs to be called once the function is ready to exit. The function doesn't need to return anything.
     * @return The new function that wraps the original one.
     */
    Queue.chain = Queue.chainMethod = function(fn) {
        // if the function has already been chained before, return it as is.
        return (/_chained/).test(fn) ? fn : function _chained() {
            var me = this; // instance of a modified target class.
            var args = Array.prototype.slice.call(arguments);
            var origCb = args.length === fn.length ? args.pop() : null;
            var cb = function() {
                if (origCb) {
                    origCb.apply(me, arguments);
                }
            };
            Queue.add({
                fn: function(callback) {
                    var cb = function() {
                        callback.apply(me, arguments);
                    };
                    args.push(cb);
                    fn.apply(me, args);
                },
                callback: cb,
                scope: me
            });
            return me;
        };
    };
    /**
     * @param {Class} cls The prototype / class to make chainable.
     * @param {Mixed} An array or comma separated list of methods to make chainable. (optional) It processes all methods by default.
     */
    Queue.chainClass = function(cls, methods) {
        var proto = cls.prototype;
        methods = typeof methods === 'string' ? methods.split() : (methods || []);
        for(var fn in proto) {
            if(typeof proto[fn] === 'function' && (!methods.length||~methods.indexOf(fn)) ) {
                proto[fn] = Queue.chain(proto[fn]);
            }
        }
        proto.call = proto.call || Queue.chain(function(cb) {
            cb();
        });
        proto.done = proto.done || Queue.chain(function(cb) {
            cb();
        });
    };
})(Queue);

module.exports = Queue;