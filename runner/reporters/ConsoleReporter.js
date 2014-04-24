/*jshint node:true*/
require('colors');
var Table = require('cli-table'),
    utils = require('../../lib/utils'),
    tty = require('tty');

function Reporter(runner, config) {
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
        var total = me.options.featureFiles.length;
        stats.start = new Date();
        console.log();
        if(total > 0) {
            console.log(' Found %d %s...', total, pluralize('feature', 'features', total));
        } else {
            console.log(' No features were found.');
        }
        console.log();
    }.bind(me));

    runner.on('feature', function(data) {
        // Run the feature tests
        var len = ("Feature " + data.feature.file).length;
        utils.each(data.feature.scenarios, function(scenario) {
            console.log(scenario);
        });
        console.log(getSeparator(len).grey);
        console.log("Feature %s", data.feature.file.grey);
        console.log("Profile %s", data.profile.desiredCapabilities.file.grey);
    });
    
    runner.on('xsuite', function(suite) {
        if(suite !== me.feature.suite && !suite.root) {
            // Add scenario
            stats.scenarios.total++;
            me.feature.stats.scenarios.total++;
            var scenario = me.feature.feature.scenarios[me.feature.scenarios.length];
            me.feature.scenarios.push({
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

    runner.on('xsuite end', function(suite) {
        if(suite !== me.feature.suite && !suite.root) {
            // update current scenario
            var end = new Date(),
                scenario = me.feature.scenarios[me.feature.scenarios.length-1];
            // Update scenario stats
            scenario.stats.end = end;
            scenario.stats.duration = end - scenario.stats.start;
            if(scenario.stats.failures > 0) {
                me.feature.stats.scenarios.failures++;
                stats.scenarios.failures++;
            } else if(scenario.stats.pending === scenario.stats.tests) {
                me.feature.stats.scenarios.pending++;
                stats.scenarios.pending++;
            } else {
                me.feature.stats.scenarios.passes++;
                stats.scenarios.passes++;
            }
        }
    });
    
    runner.on('xtest', function(test) {
        test.start = new Date();
        test.feature = me.feature;
    });
    
    // runner.on('pass', function(test) {
    // });

    // runner.on('pending', function() {
    // });
    
    runner.on('xfail', function(test, err) {
       failures.push(err);
    });

    runner.on('xtest end', function(test) {
        var end = new Date(),
            scenario = me.feature.scenarios[me.feature.scenarios.length-1];
        var step = buildStep(test),
            medium = test.slow() / 2;
        // Update test stats
        stats.tests++;
        scenario.stats.tests++;
        me.feature.stats.tests++;
        if(test.state === 'failed') {
            stats.failures++;
            scenario.stats.failures++;
            me.feature.stats.failures++;
            step.success = false;
            step.failure = test.err;
        } else if(test.pending) {
            stats.pending++;            
            scenario.stats.pending++;
            me.feature.stats.pending++;
            step.success = false;
            step.pending = true;
        } else {
            stats.passes++;            
            scenario.stats.passes++;
            me.feature.stats.passes++;
            step.success = true;
            step.start = test.start;
            step.end = end;
            step.duration = step.end - step.start;
            step.speed = step.duration > test.slow() ? 'slow' : step.duration > medium ? 'medium' : 'fast';
            stats[step.speed]++;
            scenario.stats[step.speed]++;
            me.feature.stats[step.speed]++;
        }
        scenario.steps.push(step);
    });

    runner.on('xfeature end', function() {
        var end = new Date();
        // Update feature stats
        me.feature.stats.end = end;
        me.feature.stats.duration = end - me.feature.stats.start;
        stats.results.push(me.feature);
    });

    runner.on('xend', function() {
        stats.end = new Date();
        stats.duration = stats.end - stats.start;
    });

    // runner.on('feature end', function(data) {
    //     //data { feature, suite, failures}
    // });
}

Reporter.prototype.process = function(stats, cb) {
    //var browsers = browserProfiles.length,
	var executions = stats.results.length; // * browsers;
    // instantiate
    var table = new Table({
        head: ['Features', 'Scenarios', 'Total Steps', 'Passed', 'Skipped', 'Failed'],
        style: { head: ['white'], border: ['grey']},
        chars: {
            'top': '-' , 'top-mid': ' ' , 'top-left': ' ' , 'top-right': ' ',
            'bottom': ' ' , 'bottom-mid': ' ' , 'bottom-left': '' , 'bottom-right': '',
            'left': ' ' , 'left-mid': ' ' , 'mid': '-' , 'mid-mid': ' ',
            'right': '' , 'right-mid': '' , 'middle': ' '
        }
    });
    
    var tick = '✓ ',
        cross = '✖ ',
        slow =  stats.slow + stats.medium;
    table.push(
        [
            stats.features, 
            stats.scenarios.total, 
            stats.tests, 
            stats.passes > 0 ? String(tick + stats.passes).green + (slow > 0 ? String(' ('+slow+' slow)').yellow : ''): 0, 
            stats.pending > 0 ? String(stats.pending).cyan : 0, 
            stats.failures > 0 ? String(cross + stats.failures).red : 0
            //slow > 0 ? String(slow).yellow : 0, 
        ]
    );

    console.log(table.toString());
    // console.log('Completed %d %s on %d %s (%d %s in total)', 
    console.log('Completed %d %s (%d %s in total)',
        executions,  
        pluralize('test', 'tests', executions),
        executions,
        pluralize('execution', 'executions', executions) );
    console.log('Operation took %s', toSeconds(this.stats.duration));
    console.log();
    if(typeof cb === 'function') {
        cb();
    }
};

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

function toSeconds(d) {
    d = d || 0;
    var i = Math.floor(d/1000),
        f = Math.round((d-i*1000)/10);
    return i + '.' + f + 's';
}

function pluralize(singular, plural, count) {
	return count === 1 ? singular : plural;
}

function getSeparator(len, symbol) {
    symbol = symbol || '-';
    var out = '';
    while(len--) {
        out += symbol;
    }
    return out;
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
exports = module.exports = { name: 'console', proto: Reporter };
