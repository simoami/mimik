/*jshint node:true*/
var fs = require('fs'),
    path = require('path'),
    utils = require('../lib/utils'),
    EventEmitter = require('events').EventEmitter,
    logger = require('winston').loggers.get('mimik'),
    stepFileProcessor = require('./StepFileProcessor'),
    DriverFactory = require('./drivers'),
    Mocha = require('mocha'),
    Yadda = require('yadda'),
    English = Yadda.localisation.English,
    chai = require('chai');


var Session = function(config) {
    var me = this;
    me.id = config.id;
    var Driver = DriverFactory.get(config.profile.driver);
    me.driver = new Driver(me, config.options);
    me.featureFile = config.featureFile;
    me.profile = config.profile;
    me.testRunner = null;
    me.feature = null;
    me.options = config.options;
    me.context = {};
    me.aborted = false;
    me.init();
};
// Make Session an Observable
utils.extend(Session, EventEmitter);

Session.prototype.init = function () {
    var me = this,
        mocha = new Mocha({
            ui: 'bdd',
            //reporter: 'base',
            reporter: 'spec',
            useInlineDiffs: true,
            //asyncOnly: true,
            timeout: me.options.timeout,
            bail: me.options.bail,
            slow: me.options.slow
        });
    me.mocha = mocha;
    // workaround to export describe, before, after handlers globally
    mocha.suite.emit('pre-require', me.context, null, mocha);
    
    Yadda.plugins.mocha.AsyncStepLevelPlugin.init({
        container: me.context
    });
    me.driver.init(me.profile);
};

Session.prototype.start = function(cb) {
    var me = this;
    me.emit('start', me);
    me.driver.start(function(sessionId) {
        me.id = sessionId;
        logger.debug('[session] Started session ' + me.id + ' on ' + me.profile.desiredCapabilities.browserName);    
    
        // execute features after the browser is launched
        me.executeFeature(me.feature, function(err, me) {
            if(!err) {
                logger.debug('[session] feature testing started', me.featureFile);
            }
            if(typeof cb === 'function') {
                cb.apply(me, arguments);
            }
        });
    });
};

/**
 * Called upon execution completion to stop the driver and emit a stop event
 */
Session.prototype.stop = function(cb){
    var me = this;
    me.driver.stop(function(err) {
        if(!err) {
            logger.debug('[session] feature testing completed', me.featureFile);
        }
        me.emit('stop', err, me);
        if(typeof cb === 'function') {
            cb.call(me, err, me);
        }
    });
};

/**
 * aborts execution prematuraly
 */
Session.prototype.abort = function(cb){
    // 1. halt test execution first
    // TODO
    this.aborted = true;
    if(this.testRunner) {
        this.testRunner.abort();
    }
    // 2. stop driver
    this.stop(cb);
};

Session.prototype.executeFeature = function(feature, callback) {
    var me = this;
    if(!feature) {
        process.nextTick(function() {
            var err = new Error('feature is a required argument for execution');
            callback(err, me);
        });
    }
    
    stepFileProcessor.processFile(me.stepFile, function(err, file) {
        if(err) {
            return callback(err);
        }
        try {
            // TODO enable language support
            var dictionary = new Yadda.Dictionary()
                    .define('NUM', /(\d+)/)
                    .define('STRING', /([^'"]*)/),
                library = English.library(dictionary);
            file.execute(library, chai, me.driver, stepFileProcessor);
            var yadda = new Yadda.Yadda(library);
            // TODO replace me.context.scenarios with me.context.features when Yadda gets patched
            me.context.scenarios(feature, function(feature) {

                me.context.scenarios(feature.scenarios, function(scenario) {
                    //yadda.yadda(scenario.steps);
                    me.context.steps(scenario.steps, function(step, done) {
                        yadda.yadda(step, done);
                    });
                });
            
            });

            //var libraries = me.getFeatureRequires(feature);
            var suite = me.mocha.suite.suites[0];
            var data = { 
                feature: feature,
                suite: suite,
                driver: me.driver,
                profile: me.profile
            };
            me.emit('feature', data);
            
            var testRunner = me.mocha.run(function(failures) {
                data.failures = failures;
                me.emit('feature end', data);
                me.stop(callback);
            });

            me.testRunner = testRunner;
            me.setupListeners(testRunner);
            
        } catch(err) {
            logger.debug('[session] %s', err.stack);
            console.error('[session] %s', err.stack);
            console.error(err.stack);
            callback(err);
        }
    });

};

Session.prototype.parseFeature = function(text) {
    var parser = new Yadda.parsers.FeatureParser();
    return parser.parse(text);
};

Session.prototype.loadFeature = function(featureFile, cb) {
    var me = this;
    fs.readFile(featureFile, 'utf8', function(err, text) {
        if(err) {
            return cb(err);
        }
        var feature = me.parseFeature(text.toString());
        var stepFile = me.getStepFile(featureFile);
        //var libraries = me.getFeatureRequires(feature);
        if(!stepFile) {
            err = new Error('No corresponding step definitions were found for feature "' +  path.basename(me.featureFile) + '"');
            return cb(err, feature);
        }
        me.feature = feature;
        me.stepFile = stepFile;
        cb(err, feature);
    });

};

Session.prototype.setupListeners = function(source) {
    var me = this;
    source.on('suite', function(suite) { me.emit('suite', suite); });
    source.on('suite end', function(suite) { me.emit('suite end', suite); });
    source.on('test', function(test) { me.emit('test', test); });
    source.on('test end', function(test) { me.emit('test end', test); });
    source.on('pass', function(test) { me.emit('pass', test); });
    source.on('fail', function(test, err) { me.emit('fail', test, err); });
    source.on('pending', function(test) { me.emit('pending', test); });
};

// TODO enable support for feature import "@GivenFeature"
/*
Session.prototype.getFeatureRequires = function(feature) {
    var GivenFeature = feature.annotations.GivenFeature;
    return GivenFeature ? GivenFeature.split(',').reduce(this.loadFile, []) : [];
};
*/
Session.prototype.getStepFile = function(file) {
    var basename = path.basename(file, '.feature'),
        re = new RegExp('^' + basename + '(Steps?|-steps?|_steps?)'),
        stepFile;
    this.options.stepFiles.every(function(file) {
        var name = path.basename(file);
        if(re.test(name)) {
            stepFile = file;
            return false;
        }
        return true;
    });
    return stepFile;
};


module.exports = Session;
