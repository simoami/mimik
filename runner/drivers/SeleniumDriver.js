/*jshint node:true*/
var webdriverjs = require('webdriverjs'),
    logger = require('winston').loggers.get('mimik');

function Driver(runner) {
    var me = this;
    
    me.state = 'stopped';

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
        logger.debug('[selenium driver] client event "result"');
    });

};
/**
 * Start the web browser
 */
Driver.prototype.start = function(cb) {
    var me = this;
    if(me.state === 'started' || me.state === 'starting') {
        process.nextTick(cb);
        return;
    }
    var callback = function(err, body) {
        if(err) {
            me.state = 'stopped';
            if(typeof cb === 'function') {
                logger.debug('[selenium driver] could not start browser ' + err.orgStatusMessage, err);
                console.error('[selenium driver] ' + err.orgStatusMessage);
            }
        } else {
            me.state = 'started';
            logger.debug('[selenium driver] browser launched with configuration:', body);
            if(typeof cb === 'function') {
                me.sessionId = body.sessionId;
                cb(body.sessionId);
            }
        }
    };
    me.state = 'starting';
    logger.debug('[selenium driver] browser starting...');   
    this.client.init(callback);
};
/**
 * Stop the web browser
 */
Driver.prototype.stop = function(cb) {
    var me = this;
    if(me.sessionId && (me.state === 'stopped' || me.state === 'stopping')) {
        process.nextTick(cb);
        return;
    }
    var callback = function() {
        me.state = 'stopped';
        logger.debug('[selenium driver] browser closed');
        if(typeof cb === 'function') {
            cb();
        }
    };
    logger.debug('[selenium driver] browser closing...');
    me.state = 'stopping';
    me.client.end(callback);
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
