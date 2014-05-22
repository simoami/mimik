/*jshint node:true*/
'use strict';

require('colors');
var Table = require('cli-table'),
    utils = require('../../lib/utils'),
    diff = require('diff'),
    tty = require('tty'),
    tick = '✓ ',
    cross = '✖ ',
    bullet = '◦ ';

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

function Reporter(runner, config) {
    var me = this,
        failures = [];

    if (!runner) {
        return;
    }
    me.runner = runner;
    me.options = runner.options;

    runner.on('start', function() {
        var total = me.options.featureFiles.length;
        console.log();
        if(total > 0) {
            console.log(' Found %d %s', total, pluralize('feature', 'features', total));
        } else {
            console.log(' No features were found.\n');
        }
    }.bind(me));

    runner.on('feature end', function(data) {
        // Run the feature tests
        me.displayFeature(data);
    });

}
Reporter.prototype.displayFeature = function(data) {
    var me = this,
        errorCount = 0,
        feature = '  Feature: ' + data.feature.title + ('  # ' + data.feature.file).grey;
    console.log(getSeparator(feature.length).grey);
    console.log(feature);
    var browserName = data.driver.getBrowserName();
    if(browserName) {
        console.log("  Tested in %s\n".grey, browserName);        
    }
    data.suite.suites.forEach(function(scenario) {
        console.log('\n    Scenario:', scenario.title);
        scenario.tests.forEach(function(test) {
            console.log(
                '      ', 
                (test.state === 'passed' ? tick.green : (test.state === 'failed' ? cross.red : bullet.cyan)) + 
                test.title.grey
            );
            if(test.err) {
                me.displayError(test.err, errorCount++);
            }
        });
        
    });
};
Reporter.prototype.displayError = function(error, count) {
        // format
        var tpl = '\n         %s'.red + '\n%s\n'.grey;

        // msg
        var message = error.message || '',
            stack = error.stack || message,
            index = stack.indexOf(message) + message.length,
            msg = stack.slice(0, index),
            actual = error.actual,
            expected = error.expected,
            escape = true;

        // uncaught
        if (error.uncaught) {
          msg = 'Uncaught ' + msg;
        }

        // indent stack trace without msg
        stack = stack.slice(index ? index + 1 : index)
          .replace(/^/gm, '       ');

        console.error(tpl, msg, stack);
}
Reporter.prototype.process = function(stats, cb) {
    //var browsers = browserProfiles.length,
	var total = stats.results.length; // * browsers;
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
    
    var slow =  stats.slow + stats.medium;
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

    console.log('\n' + table.toString());
    console.log('  Completed %d %s in %s',
        total,  
        pluralize('feature', 'features', total),
        toSeconds(stats.duration)
    );
    console.log();
    if(typeof cb === 'function') {
        cb();
    }
};

exports = module.exports = { name: 'console', proto: Reporter };
