/*jshint node:true*/
var Queue = require('./Queue');

// Class inheritance. 
// Source:http://ejohn.org/blog/simple-javascript-inheritance
var Class = (function(){
    var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\bsuperclass\b/ : /.*/;

    var apply = (function(){

        var toString = Object.prototype.toString,
            obj = '[object Object]';

        return function apply(/* obj1, obj2, obj3 */ ) {
            // take first argument, if its not a boolean
            var i = 0,
                key,
                target = arguments[0],
                len = arguments.length;

            for ( ++i; i < len; ++i ) {
                for (key in arguments[i]) {
                    target[key] = arguments[i][key];
                }
            }
            return target;
        };
    }());
    
    // The base Class implementation (does nothing)
    var Class = function() {};

    // Create a new Class that inherits from this class
    Class.extend = function extend(prop) {
        var superclass = this.prototype;

        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;
        var prototype = new this();
        initializing = false;

        // Copy the properties over onto the new prototype
        for (var name in prop) {
          // Check if we're overwriting an existing function
          prototype[name] = typeof prop[name] == "function" &&
            typeof superclass[name] == "function" && fnTest.test(prop[name]) ?
            (function(name, fn){
              return function() {
                var tmp = this.superclass;
                // Add a new .superclass() method that is the same method
                // but on the super-class
                this.superclass = superclass[name];
                // The method only need to be bound temporarily, so we
                // remove it when we're done executing
                var ret = fn.apply(this, arguments);        
                this.superclass = tmp;
                return ret;
              };
            })(name, prop[name]) :
            prop[name];
        }
        
        // The dummy class constructor
        function Class() {
            // All construction is actually done in the init method
            if (!initializing && this.init) this.init.apply(this, arguments);
        }

        // Populate our constructed prototype object
        Class.prototype = prototype;

        // Enforce the constructor to be what we expect
        Class.prototype.constructor = Class;

        // And make this class extendable
        Class.extend = arguments.callee;
        Class.apply = apply;
        Class.chain = Queue.chain;
        Class.create = function create(args) {
            var Constructor = this;
            var instance = new Constructor(args);
            return instance;
        };
        return Class;
    };
    Class.apply = apply;
    Class.chain = Queue.chain;
    return Class;
})();



var View = Class.extend({

    init: function(conf) {
        Class.apply(this, conf);
        this.then = this.and = this;
    },

    // action members
    getTitle: function(done){ console.log('getTitle'); done(); },

    exists: Class.chain(function(cb) {
    }),

    visible: Class.chain(function(cb) {

        this._validateAndFail(this.cls, this.driver);

        this.driver.isVisible(this.cls, function(err, visible) {
            cb(null, !err && visible); // visible means no 'element not found' error and visible flag is true
        })

    }),

    // launch a specific url
    visit: Class.chain(function(url, done) {

        this._validateAndFail(url, this.driver);

        this.url = url;
        this.driver.url(url, function(err) {
            if(err) {
                throw new Error(err);
            }
            done();
        });
    }),

    wait: Class.chain(function(time, done) {
        setTimeout(done, Number(time) * 1000);
    }),
    
    call: Class.chain(function(cb) { cb(); }),
    
    // validate that the passed parameters are valid
    _validate: function() {
        var me = this,
            failed = 0;
        for(var i = 0, len = arguments.length; i < len; i++) {
            if(arguments[i] === undefined || arguments[i] === null || arguments[i] === '' ) {
                failed++;
            }
        }
        return failed;
    },
    _validateAndFail: function() {
        var failed = this._validate.apply(this, arguments);
        if(failed > 0) {
            throw new Error('Some of the required parameters are missing ');
        }
    }
});

module.exports = View;
