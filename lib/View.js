/*jshint node:true*/
var Class = require('./Class');

var View = Class.extend({

    init: function(conf) {
        Class.apply(this, conf);
        this.then = this.and = this;
    },

    // action members
    getTitle: function(done){ console.log('getTitle'); done(); },

    exists: Class.chain(function(done) {
        done();
    }),

    visible: Class.chain(function(done) {

        this._validateAndFail(this.cls, this.driver);

        this.driver.isVisible(this.cls, function(err, visible) {
            done(null, !err && visible); // visible means no 'element not found' error and visible flag is true
        });

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
        var failed = 0;
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
