/*jshint node:true*/
// Load all reporters under the current directory as properties
require('fs').readdirSync(__dirname + '/').forEach(function(file) {
    if (file.match(/.+\.js/g) !== null && file !== 'index.js') {
        file.replace('.js', '');
        var obj = require('./' + file);
        exports[obj.name] = obj.proto;
    }
});
exports.get = function(type) {
    return exports[type];
};