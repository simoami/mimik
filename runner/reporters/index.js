// Load all reporters under the current directory as properties
require('fs').readdirSync(__dirname + '/').forEach(function(file) {
    if (file.match(/.+\.js/g) !== null && file !== 'index.js') {
        var name = file.replace('.js', ''),
            obj = require('./' + file);
        exports[obj.name] = obj.proto;
    }
});
