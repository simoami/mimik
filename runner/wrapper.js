var path = require('path');
// BEGIN HEADER //
function execute(library, chai, driver, fileProcessor) {
    var origRequire = require;
    require = function(file) {
        var name = path.basename(file);
        if(/Steps?|-steps?/.test(name)) {
            fileProcessor.processFile(path.resolve(__dirname, file), function(stepFile) {
                stepFile.execute(library, chai, driver);
            });
        } else {
            return origRequire(file);
        }
    };
    // Available DSL
    var Given = library.given;
    var When = library.when;
    var Then = library.then;
    var And = global.But = global.I = global.Define = library.define;
    var client = driver.getClient();
    //global.chai = chai.chai;
    var expect = chai.expect;
    var should = chai.should;
    // END OF HEADER //

/*BODY*/

}
// BEGIN FOOTER //
module.exports.execute = execute;
// END OF FOOTER //
