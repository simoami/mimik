/*jshint node:true*/
'use strict';
var webdriverjs = require('webdriverjs'),
    wd = require('wd'),
    logger = require('winston').loggers.get('mimik'),
    BaseDriver = require('./BaseDriver').proto;

var Driver = BaseDriver.extend({
    name: 'webdriver',
    features: ['screenshot'], // use singular form
    options: {},
    init: function(config) {
        this._super.call(this, config);
        // wd will default to local firefox if no options are specified
        this.client = wd.promiseChainRemote(this.profile); //wd.remote(this.profile);
        this.client.on('status', function(info) {
            logger.debug('[selenium driver] client event "status"', info);
        });
        this.client.on('http', function(meth, path) {
            logger.debug('[selenium driver] client event "http"', meth, path);
        });
        this.client.on('command', function(eventType, command) {
            logger.debug('[selenium driver] client event "command"', eventType, command);
        });
        this.client.on('error', function() {
            logger.debug('[selenium driver] client event "error"', arguments);
        });
    /*
        // webdriverjs events
        this.client.on('end', function() {
            logger.debug('[selenium driver] client event "end"', arguments);
        });
        this.client.on('init', function(e) {
            logger.debug('[selenium driver] client event "init"', e);
        });
        this.client.on('error', function(e) {
            logger.debug('[selenium driver] client event "error"', e.err);
        });
        this.client.on('result', function(e) {
            logger.debug('[selenium driver] client event "result"');
        });
    */
    },
    /**
     * Start the web browser
     */
    start: function(cb) {
        var me = this;
        if(me.state === 'started' || me.state === 'starting') {
            process.nextTick(cb);
            return;
        }
        var callback = function(err, body) {
            if(err) {
                me.state = 'stopped';
                if(typeof cb === 'function') {
                    logger.debug('[selenium driver] could not start browser ' + err.message, err);
                    console.error('[selenium driver] ' + err.message);
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
        this.client.init(me.profile.desiredCapabilities, callback);
    },
    /**
     * Stop the web browser
     */
    stop: function(cb) {
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
        me.client.quit(callback);
    },
    /**
     * Return the WD client instance
     */
    getClient: function() {
        return this.client;
    },
    getScreenshot: function(cb) {
        this.client.takeScreenshot(function(err, image) {
            if(err) {
                logger.error('[selenium driver] could not capture a screenshot');
            }
            cb(err, image);
        });
    },
    saveScreenshot: function(path, cb) {
        this.driver.saveScreenshot(path, function(err, image) {
            if(err) {
                logger.error('[selenium driver] could not save a screenshot at the given path: %s', path);
            }
            cb(err, path, image);
        });
    },
    getBrowserName: function() {
        return this.profile.desiredCapabilities.browserName;
    }
});

/* chaining words
to
be
been
is
that
and
have
with
at
of
same
a
an
*/
module.exports = { name: Driver.prototype.name, proto: Driver };
