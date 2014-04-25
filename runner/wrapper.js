/*jshint node:true*/ /*global require:true */ var path = require('path');
function execute(library, chai, driver, fileProcessor) {
    var origRequire = require;
    require = function(file) {
        var name = path.basename(file);
        if(/Steps?|-steps?|_steps?/.test(name)) {
            fileProcessor.processFile(path.resolve(__dirname, file), function(stepFile) {
                stepFile.execute(library, chai, driver);
            });
        } else {
            return origRequire(file);
        }
    };
    // Available DSL
    /*jshint unused:false */
    var Given = library.given, When = library.when, Then = library.then, And = global.But = global.I = global.Define = library.define, client = driver.getClient(), expect = chai.expect, should = chai.should; /* END OF HEADER */

/*BODY*/

}
/* BEGIN FOOTER */ module.exports.execute = execute; /* END OF FOOTER */
