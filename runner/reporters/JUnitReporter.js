/*jshint node:true*/
var fs = require('fs'),
    path = require('path'),
    utils = require('../../lib/utils'),
    logger = require('winston').loggers.get('mimik'),
    dot = require('dot');

function Reporter(runner, options) {
    var me = this;
    if (!runner) {
        return;
    }
    me.runner = runner;
    me.options = options;
}

Reporter.prototype.process = function(stats, targetPath, callback) {
    var me = this;
    var tplFile = path.join(__dirname, '/junit.tpl');
    logger.profile('[junit reporter] process');
    fs.readFile(tplFile, function(err, data) {
        if (err) {
            logger.error('[junit reporter] could not read template file', tplFile);
            throw err;
        }
        me.createDirectory(targetPath, function(dir) {
            dot.templateSettings.strip = false;
            var tpl = dot.template(data.toString());
            // loop through each feature result
            utils.each(stats.results, function(result) {
                var output = tpl(result);
                var filename = path.join(dir, result.title + '.xml');
                fs.writeFile(filename, output, callback);
                logger.profile('[junit reporter] render');
            });
            logger.info('[junit reporter] generated junit report at %s', dir);
        });
    });
};

Reporter.prototype.createDirectory = function(target, cb) {
    var dir = path.resolve(process.cwd(), target, 'reports/junit');
    var tools = require('fs-tools');
    tools.remove(dir, function(err) {
        if (err) {
            logger.error('[junit reporter] could not clean path', dir);
            console.log('Could not prepare path %s for write', dir);
            console.error(err);
            //process.exit(1);
            return;
        }
        tools.mkdir(dir, function(err) {
            if (err) {
                logger.error('[junit reporter] Can\'t create directory ', dir);
                console.log('Could not create directory', dir);
                console.error(err);
                //process.exit(1);
                return;
            }
            cb(dir);
        });
    });
    return dir;
};

exports = module.exports = { name: 'junit', proto: Reporter };
