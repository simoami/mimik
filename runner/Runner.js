/*jshint node:true*/


/**
 * Module dependencies.
 */
var async = require('async'),
    utils = require('../lib/utils'),
    EventEmitter = require('events').EventEmitter,
    logger = require('winston').loggers.get('mimik'),
    reporters = require('./reporters'),
    drivers = require('./drivers'),
    BQ = require('./BrowserQueue'),
    Session = require('./Session');

function Runner(options) {
    var me = this;
    options = options || {};
    me.options = options;
    me.reporters = {};
    me.drivers = {};
    me.sessions = {};
    // process browser profiles
    me.processBrowserProfiles(me.options.browsers);
    EventEmitter.call(me, options);
}
// Make Runner an Observable
utils.extend(Runner, EventEmitter);

Runner.prototype.run = function (cb) {
    var me = this;
    if(me.options.testStrategy === 'browser') {
        me.runBrowserStrategy(cb);
    } else {
        // default mode
        me.runTestStrategy(cb);
    }
}
Runner.prototype.runBrowserStrategy = function(cb) {
    var me = this;
    //me.preProcessDrivers();
    me.preProcessReporters();
    me.emit('start');
    var tasks = [];
    utils.each(me.browserProfiles, function(profile) {
        // prepare  tasks for a single profile
        tasks.push(function(callback) {
            // run features under current profile
            async.eachSeries(
                me.options.featureFiles, 
                function(featureFile, callback) {
                    console.log('running', featureFile, 'in', profile.desiredCapabilities.browserName);
                    me.runFeatureFile(featureFile, profile, callback);
                },
                callback
            );
        });
    });
    // run tasks in parallel across multiple browser profiles
    async.parallel(tasks, function() {
        me.postRun(cb);
    });
};

Runner.prototype.runTestStrategy = function(cb) {
    var me = this;
    //me.preProcessDrivers();
    me.preProcessReporters();
    me.emit('start');
    me.bq = new BQ(me.browserProfiles);
    var concurrency = me.browserProfiles.length;
    var q = async.queue(function(featureFile, callback) {
        var profile = me.bq.next();
        me.runFeatureFile(featureFile, profile, function(err, session) {
            me.bq.release(session.profile);
            callback(err, session.id);
        });
    }, concurrency);
    q.drain = function() {
        me.postRun(cb);
    };
    q.push(me.options.featureFiles);
};
Runner.prototype.runFeatureFile = function (featureFile, profile, callback) {
    var me = this;
    var driver = new drivers[profile.driver](me, me.options);
    driver.init(profile);
    driver.start(function(sessionId) {
        var session = new Session({
            driver: driver,
            featureFile: featureFile,
            profile: profile,
            id: sessionId,
            options: me.options
        });
        me.sessions[sessionId] = session;
        me.setupListeners(session);
        session.start(function(err, session) {
            driver.stop(function() {
                logger.debug('[runner] Closed Client Session Id', session.id);
                if(typeof callback === 'function') {
                    //console.log('CLOSING SESSION', session.id, profile.desiredCapabilities.browserName);
                    callback(null, session);
                }
            });
        });
    });
};
Runner.prototype.postRun = function(cb) {
    var me = this;
    logger.debug('[runner] Done processing all files');
    me.emit('end');
    me.postProcessReporters(function() {
        if(typeof cb === 'function') {
            cb(me.stats);
        }
    });
};
Runner.prototype.preProcessReporters = function() {
    var me = this,
        Reporter,
        reps = [].concat(me.options.reporters||[]),
        baseIndex = reps.indexOf('base');
    // insert of move the base reporter to the beginning of the list to ensure it runs first
    if(baseIndex > -1) {
        reps.splice(baseIndex, 1);
    }
    reps.unshift('base');
    utils.each(reps, function(key) {
        Reporter = reporters[key];
        if(Reporter) {
            me.reporters[key] = new Reporter(me, me.options);
        }
    });
};

Runner.prototype.postProcessReporters = function(callback) {
    var me = this, series = [];
    // process the 'base' reporter first
    series.push(function(cb) {
         me.reporters.base.process(me.stats, cb);
    });
    utils.each(me.reporters, function(reporter, key) {
        if(reporter.process && key !== 'base') {
            series.push(function(cb) {
                reporter.process(me.stats, me.options.reportPath, cb);
            });
        }
    });
    async.series(series, function(err) {
        if(err) {
            throw err;
        }
        if(utils.isFunction(callback)) {
            callback();
        }
    });
};

Runner.prototype.preProcessDrivers = function() {
    var me = this;
    utils.each(drivers, function(Driver, key) {
        me.drivers[key] = new Driver(me, me.options);
    });
};

Runner.prototype.postProcessDrivers = function() {
};
Runner.prototype.setupListeners = function(source) {
    var me = this;
    source.on('feature', function(data) { me.emit('feature', data); });
    source.on('feature end', function(data) { me.emit('feature end', data); });
    source.on('suite', function(suite) { me.emit('suite', suite); });
    source.on('suite end', function(suite) { me.emit('suite end', suite); });
    source.on('test', function(test) { me.emit('test', test); });
    source.on('test end', function(test) { me.emit('test end', test); });
    source.on('pass', function(test) { me.emit('pass', test); });
    source.on('fail', function(test, err) { me.emit('fail', test, err); });
    source.on('pending', function(test) { me.emit('pending', test); });
};
Runner.prototype.processBrowserProfiles = function (profiles) {
    var me = this;
    me.browserProfiles = [];
    // default to firefox and webdriver
    utils.each(profiles||['firefox'], function(profile) {
        if(utils.isString(profile)) {
            profile = {
                desiredCapabilities: {
                    browserName: profile
                },
                driver: 'webdriver'
            };
        }
        me.browserProfiles.push(profile);
    });
};

/**
 * Export Runner
 */

exports = module.exports = Runner;

    /**
     *  These are all the events you can subscribe to:
     *   - `start`  execution started
     *   - `end`  execution complete
     *   - `suite`  (suite) test suite execution started
     *   - `suite end`  (suite) all tests (and sub-suites) have finished
     *   - `test`  (test) test execution started
     *   - `test end`  (test) test completed
     *   - `hook`  (hook) hook execution started
     *   - `hook end`  (hook) hook complete
     *   - `pass`  (test) test passed
     *   - `fail`  (test, err) test failed
     */