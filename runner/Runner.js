/*jshint node:true*/

'use strict';
/**
 * Module dependencies.
 */
var async = require('async'),
    utils = require('../lib/utils'),
    EventEmitter = require('events').EventEmitter,
    logger = require('winston').loggers.get('mimik'),
    ReporterFactory = require('./reporters'),
    BQ = require('./BrowserQueue'),
    Session = require('./Session');

// Expose the View class globally so that loaded test files have access to it
global.View = require('../lib/View');

function Runner(config) {
    var me = this;
    me.state = 'stopped';
    me.reporters = {};
    me.sessions = {};
    EventEmitter.call(me, config);
    me.setConfig(config);
}
// Make Runner an Observable
utils.extend(Runner, EventEmitter);

/**
 * setConfig set runner configuration
 *
 * @param config The configuration object
 */
Runner.prototype.setConfig = function(config) {
    this.config = config || {};
    // process browser profiles
    this.processBrowserProfiles(this.config.browsers);
};
Runner.prototype.getConfig = function() {
    return this.config;
};
Runner.prototype.run = function (cb) {
    var me = this,
        callback = function() {
            cb.call(me, arguments);
        };
    //me.preProcessDrivers();
    me.preProcessReporters();

    me.state = 'started';
    me.emit('start');
    
    if(me.config.testStrategy === 'browser') {
        me.runBrowserStrategy(callback);
    } else {
        // default mode
        me.runTestStrategy(callback);
    }
};
Runner.prototype.runBrowserStrategy = function(cb) {
    var me = this;
    var tasks = [];
    utils.each(me.browserProfiles, function(profile) {
        // prepare  tasks for a single profile
        tasks.push(function(callback) {
            // run features under current profile
            async.eachSeries(
                me.config.featureFiles, 
                function(featureFile, callback) {
                    //console.log('running', featureFile, 'in', profile.desiredCapabilities.browserName);
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
    me.bq = new BQ(me.browserProfiles);
    var concurrency = me.browserProfiles.length;
    var q = async.queue(function(featureFile, callback) {
        var profile = me.bq.next();
        me.runFeatureFile(featureFile, profile, function(err, session) {
            me.bq.release(session.profile);
            callback(err, session);
        });
    }, concurrency);
    q.drain = function() {
        me.postRun(cb);
    };
    q.push(me.config.featureFiles);
};
Runner.prototype.runFeatureFile = function (featureFile, profile, callback) {
    var me = this;
    var session = new Session({
        featureFile: featureFile,
        profile: profile,
        options: me.config // TODO change Session property to config
    });
    me.sessions[session.getId()] = session;
    me.setupListeners(session);
    session.loadFeature(featureFile, function(err) {
        if(err) {
            logger.debug('[runner] An error has occured while loading feature ' + featureFile, err);
            console.error('[runner]', err.message);
            console.error('[runner] Skipping feature ' + featureFile);
            console.log();
            return callback(err, session);
        }
        session.start(function(err) {
            callback(err, session);
        });
    });

};
Runner.prototype.postRun = function(cb) {
    var me = this;
    logger.debug('[runner] Done processing all files');
    me.emit('end', me);
    me.postProcessReporters(function() {
        me.state = 'stopped';
        me.emit('stop', me);
        
        if(typeof cb === 'function') {
            cb(me.stats);
        }
    });
};
Runner.prototype.preProcessReporters = function() {
    var me = this,
        reps = [{ name: 'base'}];
    me.emit('reporter-pre-process', me);
    utils.each(me.config.reporters||['console'], function(reporter) {
        reporter = utils.isObject(reporter) ? reporter : { name: reporter };
        if(reporter.name !== 'base') {
            reps.push(reporter);
        }
    });
    utils.each(reps, function(rep) {
        var Reporter = ReporterFactory.get(rep.name);
        if(Reporter) {
            me.reporters[rep.name] = new Reporter(me, rep);
        }
    });
};

Runner.prototype.postProcessReporters = function(callback) {
    var me = this, series = [];
    me.emit('reporter-post-process', me);
    // process the 'base' reporter first
    series.push(function(cb) {
         me.reporters.base.process(me.stats, cb);
    });
    utils.each(me.reporters, function(reporter, key) {
        if(reporter.process && key !== 'base') {
            series.push(function(cb) {
                reporter.process(me.stats, me.config.reportPath, cb);
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

Runner.prototype.abort = function(cb) {
    var me = this;
    logger.debug('[runner] Aborted execution');
    console.log( '\nStopping Mimik...' );
    me.abortActiveSessions(function() {
        me.state = 'stopped';
        cb();
    });
};

Runner.prototype.abortActiveSessions = function(callback) {
    var me = this;
    async.eachSeries(utils.keys(me.sessions), function(id, cb) {
        var session = me.sessions[id];
        delete me.sessions[id];
        session.abort(cb);
    }, callback);
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
    source.on('stop', function(err, session) {
        if(err) {
            logger.debug('[runner] Session '+ session.id + 'could not be closed', err);
            console.error('[runner] Session '+ session.id + 'could not be closed');
            console.error(err.stack);
            return;
        }
        delete me.sessions[session.id];
        logger.debug('[runner] Closed Client Session Id', session.id);
    });
};

/**
 * Process an array of browser profiles and convert string elements to valid browser profile objects. 
 * Note that string elements automatically use the local browser and webdriver as the selected driver.
 *
 * @param profiles An mixed array of browser profiles. Strings and object elements are supported. 
 * Example: 
 *      'chrome' or 
 *      { 
 *          desiredCapabilities: {
 *              browserName: 'chrome'
 *          },
 *          driver: 'webdriver'
 *      }
 */
Runner.prototype.processBrowserProfiles = function (profiles) {
    var me = this;
    me.browserProfiles = [];
    // default to base driver
    utils.each(profiles||[{ driver: 'base'}], function(profile) {
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

module.exports = Runner;
