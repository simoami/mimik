/*jshint node:true*/
var logger = require('winston').loggers.get('mimik');

function Driver(runner) {
    var me = this;
    if (!runner) {
        return;
    }
    me.client = {};
    me.runner = runner;
}

Driver.prototype.init = function(options) {
    // wd will default to local firefox if no options are specified
    logger.debug('[base driver] client initialized with config:', options);
};
/**
 * Start the web browser
 */
Driver.prototype.start = function(cb) {
    cb();
};
/**
 * Stop the web browser
 */
Driver.prototype.stop = function(cb) {
    cb();
};
/**
 * Return the WD client instance
 */
Driver.prototype.getClient = function() {
    return null;
};
Driver.prototype.getScreenshot = function(cb) {
    cb();
};
Driver.prototype.saveScreenshot = function(path, cb) {
    cb();
};
Driver.prototype.getBrowserName = function() {
    return null;
};
exports = module.exports = { name: 'base', proto: Driver };
