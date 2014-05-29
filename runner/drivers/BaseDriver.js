/*jshint node:true*/
'use strict';
var logger = require('winston').loggers.get('mimik'),
    utils = require('../../lib/utils'),
    Class = require('../../lib/Class'),
    Collection = require('../../lib/Collection'),
    EventEmitter = require('events').EventEmitter;
// create a base observable class
var ObservableClass = Class.extend(EventEmitter.prototype);

// inherit from the observable class
var Driver = ObservableClass.extend({
    name: 'base',
    features: [],
    state: 'stopped',
    client: null,
    init: function(config) {
        Class.apply(this, config);
        this.featureCollection = new Collection(function(o) { 
            return o;
        });
        this.featureCollection.addAll(this.features);
        logger.debug('[' + this.name + ' driver] client initialized with config:', config);
    },
    /**
     * Returns whether a feature is supported of not
     */
    supports: function(feature) {
        return !!(this.featureCollection.has(feature) || this[feature]);
    },
    /**
     * Start the web browser
     */
    start: function(cb) {
        cb();
    },
    /**
     * Stop the web browser
     */
    stop: function(cb) {
        cb();
    },
    /**
     * Return the WD client instance
     */
    getClient: function() {
        return null;
    },
    getScreenshot: function(cb) {
        cb();
    },
    saveScreenshot: function(path, cb) {
        cb();
    },
    getBrowserName: function() {
        return null;
    }
});

module.exports = { name: Driver.prototype.name, proto: Driver };
