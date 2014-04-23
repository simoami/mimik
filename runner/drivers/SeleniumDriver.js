/*jshint node:true*/
var webdriverjs = require('webdriverjs'),
    logger = require('winston').loggers.get('mimik');

function Driver(runner) {
    var me = this;

    if (!runner) {
        return;
    }
    me.client = {};
    me.runner = runner;
    runner.on('start', function() {
    });
    runner.on('feature', function() {
    });
    runner.on('step end', function() {
    });

    runner.on('pass', function() {
    });

    runner.on('fail', function() {
    });

    runner.on('end', function() {
    });

    runner.on('pending', function() {
    });
}

Driver.prototype.init = function(options) {
    // wd will default to local firefox if no options are specified
    this.options = options || {};
    this.client = webdriverjs.remote(options);
    logger.debug('[selenium driver] client initialized with config:', options);
    this.client.on('end', function() {
        logger.debug('[selenium driver] client event "end"', arguments);
    });
    this.client.on('init', function(e) {
        logger.debug('[selenium driver] client event "init"', e);
    });
    this.client.on('error', function(e) {
        logger.debug('[selenium driver] client event "error"', e.err);
    });
    this.client.on('command', function(e) {
        logger.debug('[selenium driver] client event "command"', e.method, e.uri, e.data);
    });
    this.client.on('result', function(e) {
        logger.debug('[selenium driver] client event "result"',e.body.status, e.body.sessionId);
    });

};
/**
 * Start the web browser
 */
Driver.prototype.start = function(cb) {
    var callback = function(err, body) {
        if(err) {
            if(typeof cb === 'function') {
                logger.debug('[selenium driver] could not start browser', err);
                console.log('could not start browser');
                console.log(err);
                cb(err);
            }
        } else {
            logger.debug('[selenium driver] browser launched with configuration:', body);
            if(typeof cb === 'function') {
                cb(body.sessionId);
            }
        }
    };
    logger.debug('[selenium driver] browser starting...');   
    this.client.init(callback);
};
/**
 * Stop the web browser
 */
Driver.prototype.stop = function(cb) {
    var callback = function() {
        logger.debug('[selenium driver] browser closed');
        if(typeof cb === 'function') {
            cb();
        }
    };
    logger.debug('[selenium driver] browser closing...');
    //this.client.pause(500).end(callback);
    this.client.end(callback);
};
/**
 * Return the WD client instance
 */
Driver.prototype.getClient = function() {
    return this.client;
};
Driver.prototype.getScreenshot = function(cb) {
    this.client.screenshot(function(err, image) {
        if(err) {
            logger.error('[selenium driver] could not capture a screenshot');
        }
        cb(err, image);
    });
};
Driver.prototype.saveScreenshot = function(path, cb) {
    this.driver.saveScreenshot(path, function(err, image) {
        if(err) {
            logger.error('[selenium driver] could not save a screenshot at the given path: %s', path);
        }
        cb(err, path, image);
    });
};
exports = module.exports = { name: 'webdriver', proto: Driver };
