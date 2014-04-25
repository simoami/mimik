/*jshint node:true*/
/**
 * TestRailReporter
 *
 * Supports reporting using annotations at feature or scenario level.
 *
 * Global configuration:
 * Enable the reporter with the required parameters in a config file:
 * "reporters": [
 *    {
 *         "name": "testrail",
 *         "host": "http://testrail.somesever.com",
 *         "username": "username",
 *         "password": "somepassword"
 *     }
 * ]
 * 
 * Supported Annotations:
 * @TestRailReporter=addResult(test_id). Example: @TestRailReporter=addResult(1234)
 * @TestRailReporter=addResultForCase(run_id,case_id). Example: @TestRailReporter=addResultForCase(12,34)
 * See http://docs.gurock.com/testrail-api2/reference-results for details
 */

var url = require('url'),
    async = require('async'),
    utils = require('../../lib/utils'),
    logger = require('winston').loggers.get('mimik'),
    serverPath = 'index.php?/api/v2';

function Reporter(runner, config) {
    var me = this;
    if (!runner) {
        return;
    }
    me.runner = runner;
    me.options = runner.options;
    me.config = config;
}
Reporter.prototype.process = function(stats, target, callback) {
    var me = this;
    logger.profile('[testrail reporter] update results');
    async.series([
        function(cb) {
            me.reportFeatureResults(stats, cb);
        },
        function(cb) {
            me.reportScenarioResults(stats, cb);
        }
    ], function() {
        logger.profile('[testrail reporter] results updated');
        callback();
    });
};
Reporter.prototype.reportFeatureResults = function (stats, cb) {
    var me = this, tag, tags = [];
    utils.each(stats.results, function(report) {
        tag = report.feature.annotations.TestRailReporter;
        if(tag) {
            tags.push([me.getQueryParameters(tag), me.getFeatureData(report)]);
        }
    });
    async.each(tags, function(data, callback) {
        me.sendRequest(data[0], data[1], callback);
    }, cb);
};
Reporter.prototype.reportScenarioResults = function (stats, cb) {
    var me = this, tag, tags = [];
    utils.each(stats.results, function(report) {
        utils.each(report.scenarios, function(scenario) {
            tag = scenario.scenario.annotations.TestRailReporter;
            // exclude pending scenarios
            if(tag && !scenario.scenario.annotations.pending) {
                tags.push([me.getQueryParameters(tag), me.getScenarioData(scenario)]);
            }
        });
    });
    async.each(tags, function(data, callback) {
        me.sendRequest(data[0], data[1], callback);
    }, cb);
};
Reporter.prototype.getQueryParameters = function(tag) {
    var params = tag.match(/(\w+)\s*(?:\(([^)]+)\))?/), query,
        method = params[1],
        args = params[2] ? params[2].match(/\d+/g) : [];
    // transforms addResultsForCase(37,71) to 'add_result_for_case/37/71'
    switch(method) {
        case 'addResultForCase':
            query = ['add_result_for_case'].concat(args).join('/');
            break;
        case 'addResult':
            query = ['add_result'].concat(args).join('/');
            break;
        default:
            console.error('[testrail reporter] Method ' + method + ' not supported');
            logger.debug('[testrail reporter] Method ' + method + ' not supported');
    }
    return query;
};
Reporter.prototype.getFeatureData = function (report) {
    var me = this,
        status = {
            passed: 1,
            blocked: 2,
            untested: 3,
            retest: 4,
            failed: 5
        },
        comment = ['# Mimik Feature Results #'];

    comment.push('Feature: ' + report.feature.title);
    comment.push('File: ' + report.feature.file);
    comment.push('Duration: ' + me.getDuration(report.stats.duration));
    comment.push('Agent: ' + me.getAgent(report.profile));

    comment.push('\nScenarios: ' + report.scenarios.length);
    comment.push('Tests: ' + report.stats.tests);
    comment.push('Passed: ' + report.stats.passes);
    comment.push('Pending: ' + report.stats.pending);
    comment.push('Failed: ' + report.stats.failures);
    
    var data = {
        "status_id": report.stats.failures ? status.failed : status.passed,
        "comment": comment.join('\n'),
        "elapsed": report.stats.duration < 10 ?  '0' : me.getDuration(report.stats.duration)
    };
    return data;
};
Reporter.prototype.getScenarioData = function (scenario) {
    var me = this,
        status = {
            passed: 1,
            blocked: 2,
            untested: 3,
            retest: 4,
            failed: 5
        },
        report = me.getTopSuite(scenario.suite)._reporterData,
        feature = report.feature,
        comment = ['# Mimik Scenario Results #'];

    comment.push('Scenario: ' + scenario.title);
    comment.push('Feature: ' + feature.title);
    comment.push('File: ' + feature.file);
    comment.push('Duration: ' + me.getDuration(scenario.stats.duration));
    comment.push('Agent: ' + me.getAgent(report.profile));

    comment.push('\nTests: ' + scenario.stats.tests);
    comment.push('Passed: ' + scenario.stats.passes);
    comment.push('Pending: ' + scenario.stats.pending);
    comment.push('Failed: ' + scenario.stats.failures);
    
    var data = {
        'status_id': scenario.stats.failures ? status.failed : status.passed,
        'comment': comment.join('\n'),
        'elapsed': scenario.stats.duration < 10 ?  '0' : me.getDuration(scenario.stats.duration),
        'custom_step_results': []
    };
    utils.each(scenario.steps, function(step) {
        data.custom_step_results.push({
            'content': step.title,
            'expected': !step.success && !step.pending ? step.test.err.expected : null,
            'actual': !step.success && !step.pending ? step.test.err.actual : null,
            'status_id': step.pending ? status.untested : (step.success ? status.passed : status.failed)
        });
    });
    return data;
};

Reporter.prototype.sendRequest = function (query, data, cb) {
    var me = this;
    var options = {
        uri: url.resolve(me.config.host, serverPath + '/' + query),
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        auth: {
            user: me.config.username,
            pass: me.config.password,
            sendImmediately: true
        }         
    };
    options.body = JSON.stringify(data);

    var request = require('request');
    request(options, function (err, response, body) {
      if (err) {
          logger.debug('[testrail reporter] Request failed: %s', err);
          console.error('[testrail reporter] Request failed:', err);
      } else if (response.statusCode !== 200) {
          var error = JSON.parse(body).error;
          logger.debug('[testrail reporter] Request failed: Returned with error code %s', response.statusCode);
          logger.debug(error);
          logger.debug(query);
          console.error('[testrail reporter] Request failed: Returned with error code', response.statusCode);
          console.error('[testrail reporter]', error, query);
      } else {
          logger.info('[testrail reporter] Request successful!  Server responded with:', body);
      }
      cb(err);
    });
    
};
Reporter.prototype.getDuration = function(ms) {
      var parts = [];
      var seconds = Math.round(ms / 10) / 100;
      var h = Math.floor(seconds / 3600);
      var m = Math.floor((seconds - (h * 3600)) / 60);
      var s = seconds - (h * 3600) - (m * 60);
      if (h > 0) { parts.push(h + 'h'); }
      if (m > 0) { parts.push(m + 'm'); }
      if (s > 0 || !parts.length) { parts.push(s + 's'); }
    
      return parts.join(' ');
};
Reporter.prototype.getTopSuite = function(suite) {
    var parent = suite;
    while(parent && !parent.root) {
        parent = parent.parent;
    }
    return parent ? parent.suites[0] : null;
};
Reporter.prototype.getAgent = function(profile) {
    return profile.desiredCapabilities.browserName;
};

exports = module.exports = { name: 'testrail', proto: Reporter };
