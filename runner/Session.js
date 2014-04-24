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
    this.id = config.id;
    this.driver = config.driver;
    this.featureFile = config.featureFile;
    this.profile = config.profile;
    this.testRunner = null,
    this.feature = null;
    this.options = config.options;
};
// Make Session an Observable
utils.extend(Session, EventEmitter);

Session.prototype.start = function(cb) {
    var me = this;
    logger.debug('[session] Processing ' + me.featureFile + ' on ' + me.profile.desiredCapabilities.browserName);
    logger.debug('[session] Client Session Id', me.id);
    // execute features after the browser is launched
    me.executeFeature(function(err) {
        if(err) {
            logger.error('[session] An error has occurred during execution', err);
            console.error('[session]  An error has occurred during execution', err);
        }
        logger.debug('[session] Done processing file ', me.featureFile);
        if(typeof cb === 'function') {
            cb(err, me);
        }
    });
    
};
Session.prototype.stop = function(){
    
};
Session.prototype.executeFeature = function(callback) {
    var me = this;

    var testRunner = new Mocha({
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
    var runnerContext = {};
    // workaround to export describe, before, after handlers globally
    testRunner.suite.emit('pre-require', runnerContext, null, testRunner);
    
    Yadda.plugins.mocha.AsyncStepLevelPlugin.init({
        container: runnerContext
    });
    
    async.series([
        //startBrowser,
        function(cb) {
            runnerContext.featureFile(me.featureFile, function(feature) {
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
                stepFileProcessor.processFile(stepFile, function(file) {
                    // TODO enable language support
                    var dictionary = new Yadda.Dictionary().define('NUM', /(\d+)/),
                        library = English.library(dictionary);
                    file.execute(library, chai, me.driver, stepFileProcessor);
                    var yadda = new Yadda.Yadda(library);

                    runnerContext.scenarios(feature.scenarios, function(scenario) {
                        //yadda.yadda(scenario.steps);
                        runnerContext.steps(scenario.steps, function(step, done) {
                            yadda.yadda(step, done);
                        });
                    });
                    cb(null, feature);
                });
            });
        }], 
        function(err, results) {
            
            var feature = results[0];
            var runner = testRunner.run(function(failures) {
                var suite = testRunner.suite.suites[0];
                var data = { 
                    feature: feature,
                    suite: suite,
                    failures: failures
                };
                me.emit('feature end', data);
                callback(null, data);
                // process.on('exit', function   () {
                //     process.exit(failures);
                // });
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

Session.prototype.getFeatureRequires = function(feature) {
    var require = feature.annotations.require;
    return require ? require.split(',').reduce(this.loadFile, []) : [];
};

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
