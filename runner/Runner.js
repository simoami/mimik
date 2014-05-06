/*jshint node:true*/


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

function Runner(options) {
    var me = this;
    options = options || {};
    me.options = options;
    me.reporters = {};
    me.sessions = {};
    // process browser profiles
    me.processBrowserProfiles(me.options.browsers);
    EventEmitter.call(me, options);

    // perform graceful shutdown on Ctrl+C
    process.on('SIGINT', function () {
        me.abort(function() {
            process.exit(me.stats.failures > 0 ? 1 : 0);
        });
    });

    // usually called with kill
    process.on('SIGTERM', function () {
        console.log('Parent SIGTERM detected (kill)');
        // exit cleanly
        process.exit(0);
    });
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
};
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
    var session = new Session({
        featureFile: featureFile,
        profile: profile,
        options: me.options
    });
    me.sessions[session.getId()] = session;
    me.setupListeners(session);
    session.loadFeature(featureFile, function(err) {
        if(err) {
            logger.debug('[runner] An error has occured while loading feature file ' + featureFile, err);
            console.error('[runner] An error has occured while loading feature file ' + featureFile);
            console.error(err.stack);
            return;
        }
        session.start(function(err) {
            if(err) {
                logger.debug('[runner] Could not start session', err);
                console.error('[runner] Could not start session');
                console.error(err.stack);
            }
            callback(err, me);
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
        reps = [{ name: 'base'}];
    utils.each(me.options.reporters||[], function(reporter) {
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

Runner.prototype.abort = function(cb) {
    var me = this;
    logger.debug('[runner] Aborted execution');
    console.log( '\nStopping Mimik...' );
    me.abortActiveSessions(cb);
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

module.exports = Runner;
