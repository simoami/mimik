/*jshint node: true*/
var Module = require('module'),
    fs = require('fs'),
    path = require('path'),
    logger = require('winston').loggers.get('mimik'),
    wrapper;

function wrapContent(content, cb) {
    if(!wrapper) {
        fs.readFile(path.join(__dirname, 'wrapper.js'), function(err, data) {
            if(err) {
                logger.debug('[stepfileprocessor] Could not load wrapper file', err);
                console.error('[stepfileprocessor] Could not load wrapper file');
                console.error(err.stack);
            } else {
                wrapper = data.toString().split(/\r\n|\n/).join('');
                cb(wrapper.replace('/*BODY*/', content + '\n'));
            }
        });
    } else {
        cb(wrapper.replace('/*BODY*/', content + '\n'));
    }
}

/**
 * @see https://github.com/joyent/node/blob/master/lib/module.js
 */
function stripBOM(content) {
    // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
    // because the buffer-to-string conversion in `fs.readFileSync()`
    // translates it to FEFF, the UTF-16 BOM.
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    return content;
}

function processFile(file, cb) {
    if(!file) {
        cb(new Error('processFile: A valid file path must be supplied'));
        return;
    }
    var targetModule,
        // Resolve full filename relative to the parent module
        targetPath = path.resolve(process.cwd(), file),
        isCoffee = file.substr(-7) === '.coffee',
        content = stripBOM(fs.readFileSync(targetPath, "utf8"));
    // Process files written in coffee script
    if(isCoffee) {
        var coffee = require("coffee-script");
        try {
            content = coffee.compile(content, {
                filename: path.basename(file),
                bare: true
            });
        } catch(e) {
            console.log(e.toString());
            return cb(e.toString());
        }
    }
    wrapContent(content, function(newContent) {
        targetModule = new Module(targetPath, module);
        // filename property is needed to resolve local paths in require() properly
        targetModule.filename = targetPath;
        targetModule._compile(newContent, targetPath);
        cb(null, targetModule.exports);
    });
}

exports.processFile = processFile;
