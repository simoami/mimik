/*jshint node:true*/
var Queue = {};
(function(Queue) {
    'use strict';
    Queue.isNested = false;
    var nestedPos = 0;

    Queue.handlers = [];

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
     * @function Queue.done
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
    Queue.chain = function(fn) {
        return function() {
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
})(Queue);

module.exports = Queue;