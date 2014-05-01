/*jshint node:true*/
var async = require('async'),
    path = require('path'),
    utils = require('../lib/utils'),
    EventEmitter = require('events').EventEmitter,
    logger = require('winston').loggers.get('mimik'),
    stepFileProcessor = require('./StepFileProcessor'),
    Mocha = require('mocha'),
    Yadda = require('yadda'),
    English = Yadda.localisation.English,
    chai = require('chai');


var Session = function(config) {
    var me = this;
    this.id = config.id;
    this.driver = config.driver;
    this.featureFile = config.featureFile;
    this.profile = config.profile;
    this.testRunner = null;
    this.feature = null;
    this.options = config.options;
    this.context = {};
    me.init();
};
// Make Session an Observable
utils.extend(Session, EventEmitter);

Session.prototype.init = function () {
    var me = this,
        testRunner = new Mocha({
            ui: 'bdd',
            //reporter: 'base',
            reporter: 'spec',
            useInlineDiffs: true,
            //asyncOnly: true,
            timeout: me.options.timeout,
            bail: me.options.bail,
            slow: me.options.slow
        });
    me.testRunner = testRunner;
    // workaround to export describe, before, after handlers globally
    testRunner.suite.emit('pre-require', me.context, null, testRunner);
    
    Yadda.plugins.mocha.AsyncStepLevelPlugin.init({
        container: me.context
    });
};

Session.prototype.loadFeature = function(featureFile, cb) {
    var me = this;
    try {
        me.context.featureFile(me.featureFile, function(feature) {
            me.feature = feature;
            feature.file = me.featureFile;
            var data = { 
                feature: feature,
                suite: me.testRunner.suite.suites[0],
                driver: me.driver,
                profile: me.profile
            };
            me.emit('feature', data);
            //var libraries = me.getFeatureRequires(feature);
            cb(null, feature);
        });
    } catch(err) {
        logger.debug('[session] %s in %s', err.message, featureFile);
        console.error('[session] %s in %s', err.message, featureFile);
        cb(err);
    }
};

Session.prototype.start = function(cb) {
    var me = this;
    logger.debug('[session] Processing ' + me.featureFile + ' on ' + me.profile.desiredCapabilities.browserName);
    logger.debug('[session] Client Session Id', me.id);
    // execute features after the browser is launched
    me.executeFeature(function(err) {
        if(!err) {
            logger.debug('[session] Done processing file ', me.featureFile);
        }
        if(typeof cb === 'function') {
            cb(err, me);
        }
    });
    
};
Session.prototype.stop = function(){
    
};
Session.prototype.executeFeature = function(callback) {
    var me = this;
    async.series([
        function(cb) {
            me.parseFeature(me.testRunner, cb);
        }
        ],
        function(err, results) {
            if(err) {
                callback(err);
                return;
            }
            var feature = results[0];
            var runner = me.testRunner.run(function(failures) {
                var suite = me.testRunner.suite.suites[0];
                var data = { 
                    feature: feature,
                    suite: suite,
                    failures: failures
                };
                me.emit('feature end', data);
                callback(null, data);
            });
            runner.on('suite', function(suite) { me.emit('suite', suite); });
            runner.on('suite end', function(suite) { me.emit('suite end', suite); });
            runner.on('test', function(test) { me.emit('test', test); });
            runner.on('test end', function(test) { me.emit('test end', test); });
            runner.on('pass', function(test) { me.emit('pass', test); });
            runner.on('fail', function(test, err) { me.emit('fail', test, err); });
            runner.on('pending', function(test) { me.emit('pending', test); });
        }
    );
};

Session.prototype.parseFeature = function(testRunner, cb) {
    var me = this;
    try {
        me.context.featureFile(me.featureFile, function(feature) {
            var suite = testRunner.suite.suites[0];
            suite.feature = feature;
            //feature.suite = suite; // cross-reference
            me.feature = feature;
            feature.file = me.featureFile;
            var data = { 
                feature: feature,
                suite: suite,
                driver: me.driver,
                profile: me.profile
            };
            me.emit('feature', data);
            var stepFile = me.getStepFile(me.featureFile);
            //var libraries = me.getFeatureRequires(feature);
            if(!stepFile) {
                var err = new Error('No corresponding step definitions were found for feature "' +  path.basename(me.featureFile) + '"');
                logger.debug('[session] %s', err.message);
                console.error('[session] %s', err.message);
                cb(err);
                return;
            }

            stepFileProcessor.processFile(stepFile, function(err, file) {
                if(err) {
                    logger.debug('[session] %s', err.message);
                    console.error('[session] %s', err.message);
                    cb(err);
                    return;
                }
                try {
                // TODO enable language support
                var dictionary = new Yadda.Dictionary().define('NUM', /(\d+)/),
                    library = English.library(dictionary);
                    file.execute(library, chai, me.driver, stepFileProcessor);
                var yadda = new Yadda.Yadda(library);

                me.context.scenarios(feature.scenarios, function(scenario) {
                    //yadda.yadda(scenario.steps);
                    me.context.steps(scenario.steps, function(step, done) {
                        yadda.yadda(step, done);
                    });
                });
                } catch(err) {
                    logger.debug('[session] %s', err.stack);
                    console.error('[session] %s', err.stack);
                    cb(err);
                    return;
                }
                cb(null, feature);
            });
        });
    } catch(err) {
        logger.debug('[session] %s', err.message);
        console.error('[session] %s', err.message);
        cb(err);
    }
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
