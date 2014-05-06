/*jshint node:true*/ /*global require:true */ 
var path = require('path'), Given, When, Then, Define, expect, should;
var execute = function execute(library, chai, driver, fileProcessor) {
    (function() {
        var origRequire = require;
        require = function(file) {
            var name = path.basename(file);
            if(/Steps?|-steps?|_steps?/.test(name)) {
                fileProcessor.processFile(path.resolve(__dirname, file), function(err,stepFile) {
                    stepFile.execute(library, chai, driver);
                });
            } else {
                return origRequire(file);
            }
        };
        /*jshint unused:false */
        var _define = function(method) {
            return function(signatures, fn, scope) {
                scope = scope || {};
                scope.driver = driver.getClient();
                method(signatures, fn, scope);
            };
        };
        Given = _define(library.given);
        When = _define(library.when);
        Then = _define(library.then);
        Define = _define(library.define);
        expect = chai.expect;
        should = chai.should; /* END OF HEADER */
    })();

/*BODY*/

};
/* BEGIN FOOTER */ module.exports.execute = execute; /* END OF FOOTER */
