/*jshint node: true*/
var Module = require('module'),
    fs = require('fs'),
    path = require('path'),
    wrapper;

function wrapContent(content, cb) {
    if(!wrapper) {
        fs.readFile(path.join(__dirname, 'wrapper.js'), function(err, data) {
            if(err) {
                console.error('Could not load wrapper file');
                console.error(err);
            } else {
                wrapper = data.toString();
                cb(wrapper.replace('/*BODY*/', content));
            }
        });
    } else {
        cb(wrapper.replace('/*BODY*/', content));
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
    var targetModule,
        // Resolve full filename relative to the parent module
        targetPath = path.resolve(process.cwd(), file),
        isCoffee = file.substr(-7) === '.coffee',
        content = stripBOM(fs.readFileSync(targetPath, "utf8"));
    // Process files written in coffee script
    if(isCoffee) {
        var coffee = require("coffee-script");
        content = coffee.compile(content, {
            filename: path.basename(file),
            bare: true
        });
    }
    wrapContent(content, function(newContent) {
        targetModule = new Module(targetPath, module);
        // filename property is needed to resolve local paths in require() properly
        targetModule.filename = targetPath;
        targetModule._compile(newContent, targetPath);
        cb(targetModule.exports);
    });
}

exports.processFile = processFile;
