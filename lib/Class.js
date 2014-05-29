/*jshint node:true*/
var utils = require('./utils'),
    Queue = require('./Queue');

// Class inheritance. 
// Source:http://ejohn.org/blog/simple-javascript-inheritance
var Class = (function(){
    var initializing = false, fnTest = /var xyz/.test(function(){var xyz;}) ? /\b_super\b/ : /.*/;

    // The base Class implementation (does nothing)
    var Class = function() {};

    // Create a new Class that inherits from this class
    Class.extend = function extend(prop) {
        var _super = this.prototype;
        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;
        var prototype = new this();
        initializing = false;
        var closureFn = function(name, fn, _super) {
            return function() {
                var tmp = this._super;
                // Add a new ._super() method that is the same method
                // but on the super-class
                this._super = _super[name];
                // The method only need to be bound temporarily, so we
                // remove it when we're done executing
                var ret = fn.apply(this, arguments);
                this._super = tmp;
                return ret;
            };
        };
        // Copy the properties over onto the new prototype
        for (var name in prop) {
            // Check if we're overwriting an existing function
            prototype[name] = typeof prop[name] === "function" && typeof _super[name] === "function" && fnTest.test(prop[name]) ? closureFn(name, prop[name], _super) : prop[name];
        }

        // The dummy class constructor
        function Class() {
            // All construction is actually done in the init method
            if (!initializing && this.init) {
                this.init.apply(this, arguments);
            }
        }

        // Populate our constructed prototype object
        Class.prototype = prototype;

        // Enforce the constructor to be what we expect
        Class.prototype.constructor = Class;

        // And make this class extendable
        Class.extend = arguments.callee;
        Class.apply = utils.apply;
        Class.chain = Queue.chain;
        Class.create = function create(args) {
            var Constructor = this;
            var instance = new Constructor(args);
            return instance;
        };
        return Class;
    };
    Class.apply = utils.apply;
    Class.chain = Queue.chain;
    return Class;
})();

module.exports = Class;