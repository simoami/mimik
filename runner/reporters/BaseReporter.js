/*jshint node:true*/
require('colors');
var utils = require('../../lib/utils');

function buildStep(test) {
    return {
        title: test.title,
        start: test.start,
        stop: null,
        duration: 0,
        success: false,
        pending: false,
        speed: null,
        test: test
    };
}

function getAnnotation(key, value) {

  var type = typeof value,
      txt = '@' + key + (type !== 'boolean' ? '="' + value + '"' : '');

  return {
    key: key,
    value: value,
    type: type,
    txt: txt
  };
}

function getAnnotations(annotations) {
    var arr = [], keys = {};
    utils.each(annotations, function(value,key) {
        // eliminate duplicates
        if(!keys[key.toLowerCase()]) {
            arr.push(getAnnotation(key, value));
            keys[key.toLowerCase()] = true;
        }
    });
    return arr;
}

function Reporter(runner) {
    var me = this,
        stats = this.stats = {
            features: 0,
            scenarios: {
                total: 0,
                passes: 0,
                pending: 0,
                failures: 0
            },
            tests: 0,
            passes: 0,
            pending: 0,
            failures: 0,
            slow: 0,
            medium: 0,
            fast: 0,
            results: []
        },
        failures = [];

    if (!runner) {
        return;
    }
    me.runner = runner;
    me.options = runner.options;

    runner.stats = stats;

    runner.on('start', function() {
        stats.start = new Date();
    }.bind(me));

    runner.on('feature', function(data) {
        stats.features++;
        data.suite._reporterData = {
            annotations: getAnnotations(data.feature.annotations),
            driver: data.driver,
            feature: data.feature,
            profile: data.profile,
            scenarios: [],
            suite: data.suite,
            title: data.feature.title,
            stats: {
                tests: 0,
                start: new Date(),
                scenarios: {
                    total: 0,
                    passes: 0,
                    pending: 0,
                    failures: 0
                },
                end: null,
                duration: 0,
                passes: 0,
                pending: 0,
                failures: 0,
                slow: 0,
                medium: 0,
                fast: 0
            }
        };
    });
    
    runner.on('suite', function(suite) {
        if(!suite._reporterData && !suite.root) {
            var reportData = me.getTopSuite(suite)._reporterData;
            // Add scenario
            stats.scenarios.total++;
            reportData.stats.scenarios.total++;
            var scenario = reportData.feature.scenarios[reportData.scenarios.length];
            reportData.scenarios.push({
                title: scenario.title,
                scenario: scenario,
                annotations: getAnnotations(scenario.annotations),
                steps: [],
                stats: {
                    start: new Date(),
                    end: null,
                    duration: 0,
                    tests: 0,
                    passes: 0,
                    pending: 0,
                    failures: 0,
                    slow: 0,
                    medium: 0,
                    fast: 0
                },
                suite: suite
            });
        }
    });

    runner.on('suite end', function(suite) {
        if(!suite._reporterData && !suite.root) {
            // update current scenario
            var end = new Date(),
                reportData = me.getTopSuite(suite)._reporterData,
                scenario = reportData.scenarios[reportData.scenarios.length-1];
            // Update scenario stats
            scenario.stats.end = end;
            scenario.stats.duration = end - scenario.stats.start;
            if(scenario.stats.failures > 0) {
                reportData.stats.scenarios.failures++;
                stats.scenarios.failures++;
            } else if(scenario.stats.pending === scenario.stats.tests) {
                reportData.stats.scenarios.pending++;
                stats.scenarios.pending++;
            } else {
                reportData.stats.scenarios.passes++;
                stats.scenarios.passes++;
            }
        }
    });
    
    runner.on('test', function(test) {
        test.start = new Date();
    });

    runner.on('fail', function(test, err) {
       failures.push(err);
    });

    runner.on('test end', function(test) {
        var end = new Date(),
            suite = me.getTopSuite(test.parent),
            reportData = suite._reporterData,
            scenario = reportData.scenarios[reportData.scenarios.length-1];

        var step = buildStep(test),
            medium = test.slow() / 2;
        // Update test stats
        stats.tests++;
        scenario.stats.tests++;
        reportData.stats.tests++;
        if(test.state === 'failed') {
            stats.failures++;
            scenario.stats.failures++;
            reportData.stats.failures++;
            step.success = false;
            step.failure = test.err;
        } else if(test.pending) {
            stats.pending++;            
            scenario.stats.pending++;
            reportData.stats.pending++;
            step.success = false;
            step.pending = true;
        } else {
            stats.passes++;            
            scenario.stats.passes++;
            reportData.stats.passes++;
            step.success = true;
            step.start = test.start;
            step.end = end;
            step.duration = step.end - step.start;
            step.speed = step.duration > test.slow() ? 'slow' : step.duration > medium ? 'medium' : 'fast';
            stats[step.speed]++;
            scenario.stats[step.speed]++;
            reportData.stats[step.speed]++;
        }
        scenario.steps.push(step);
    });

    runner.on('feature end', function(data) {
        var end = new Date();
        var reportData = data.suite._reporterData;
        // Update feature stats
        reportData.stats.end = end;
        reportData.stats.duration = end - reportData.stats.start;
        stats.results.push(reportData);
    });

    runner.on('end', function() {
        stats.end = new Date();
        stats.duration = stats.end - stats.start;
    });

    // runner.on('feature end', function(data) {
    //     //data { feature, suite, failures}
    // });
}
Reporter.prototype.process = function(stats, cb) {
    // instantiate
    if(typeof cb === 'function') {
        cb();
    }
};
Reporter.prototype.getTopSuite = function(suite) {
    var parent = suite;
    while(parent && !parent.root) {
        parent = parent.parent;
    }
    return parent ? parent.suites[0] : null;
};
exports = module.exports = { name: 'base', proto: Reporter };
