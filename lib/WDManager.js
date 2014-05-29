/*jshint node:true*/
'use strict';

require('colors');

var utils = require('../lib/utils'),
    logger = require('winston').loggers.get('wdlauncher'),
    driverConfig = require('../driverconfig.js'),
    async = require('async'),
    os = require('os'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    http = require('http'),
    fsTools = require('fs-tools'),
    childProcess = require('child_process'),
    stdout = process.stdout;

var DOWNLOAD_DIR = path.resolve(process.cwd(), 'selenium'),
    tick = '  \u2713 ',
    cross = '  \u2716 ';
var Manager = function(config) {
    this.config = config || {};
    this.config.output = this.config.output || DOWNLOAD_DIR;
};
// require('whereis')('java', function searched(err) {
//   if (err) {
//     return console.error('Could not find `java`, make sure it is installed in your $PATH');
//   }
// 
//   require('../index.js')(spawnOptions, seleniumArgs);
// });

Manager.prototype.start = function(cb) {
    if(this.config.autoInstall) {
        this.install(this.doStart.bind(this, cb));
    } else {
        this.doStart(cb);
    }
};

Manager.prototype.doStart = function(cb) {
    var me = this;
    this.checkStatus(function(err, status) {
        if(err) {
            return cb(err);
        }
        if (status.selenium.status !== 'current') {
            return cb(new Error(driverConfig.selenium.name + ' is ' + status.selenium));
        }
        var args = driverConfig.selenium.args(driverConfig.selenium, me.config.output);
        if (me.config.port) {
            args.push('-port', me.config.port);
        }
        utils.each(driverConfig, function(driver, key) {
            // only check drivers that are applicable for the current platform
            if(key !== 'selenium' && driver.applicable() && status[key].status === 'current') {
                args = args.concat(driver.args(driver, me.config.output));
            }
        });
        
        var prc = me.spawnCommand('java', args);
        console.log(('  Starting ' + driverConfig.selenium.name + ' with pid: ' + prc.pid).grey);
        prc.on('exit', function(code) {
            console.log('Selenium Standalone has exited with code ' + code);
            process.exit(code);
        });
        process.stdin.resume();
        cb(null, prc.pid);
    });

 };

Manager.prototype.spawnCommand = function(command, args) {
  var winCommand = isWindows() ? 'cmd' : command;
  var finalArgs = isWindows() ? ['/c'].concat(command, args) : args;

  return childProcess.spawn(winCommand, finalArgs, { stdio: 'inherit' });
};

Manager.prototype.stop = function(cb) {
    cb();
};

Manager.prototype.status = function(cb) {
    this.checkStatus(function(err, status) {
        if(err) {
            return console.error(err.stack);
        }
        utils.each(status, function(value, key) {
            var driver = driverConfig[key];
            if(driver) {
                switch(value.status) {
                    case 'current':
                        console.log(tick.green + driver.name + ' is current');
                        break;
                    case 'outdated':
                        console.log(cross.red + driver.name + ' is outdated. Found ' + value.file);
                        break;
                    case 'missing':
                        console.log(cross.red + driver.name + ' is missing');
                        break;
                }
            }
        });
        
        cb(err);
    });
};

Manager.prototype.checkStatus = function(cb) {
    var status = {}, 
        success = true,
        files = [];
    try { 
        files = fs.readdirSync(this.config.output); 
    } catch(e) {}

    utils.each(driverConfig, function(driver, key) {
        // only check drivers that are applicable for the current platform
        if(driver.applicable()) {
            var driverUrl = driver.url(driver.version);
            var driverName = getDriverFileName(driverUrl);
            if(~files.indexOf(driverName)) {
                status[key] = {
                    status: 'current',
                    file: driverName
                };
            } else {
                success = false;
                status[key] = {
                    status: 'missing',
                    file: null
                };
                files.forEach(function(file) {
                    if(file.match(driver.filePattern)) {
                        status[key] = {
                            status: 'outdated',
                            file: file
                        };
                        
                    }
                });
            }
        }
    });
    status.success = success;
    cb(null, status);
};

Manager.prototype.install = function(cb) {
    var me = this;
    me.checkStatus(function(err, status) {
        if(err) {
            return console.error(err.stack);
        }
        if(!status.success || me.config.overwrite) {
            console.log((status.success ? '  Reinstalling binaries...\n' : '  Installing missing binaries...\n').grey);
            return me.doInstall(status, function(err) {
                console.log();
                cb(err);
            });
        }
        console.log('  All binaries are properly installed'.grey);
        cb(null);
    });
};

Manager.prototype.doInstall = function(status, cb) {
    var me = this;
    var tasks = [function(cb) {
            me.createDirectory(me.config.output, cb);
        }
    ];
    utils.each(driverConfig, function(driver, key) {
        if(driver.applicable() && (me.config.overwrite || (driver.install && status[key].status !== 'current'))) {
            tasks.push(function(cb) {
                me.downloadDriver(driver, me.config.output, function(err, filePath) {
                    if(!err) {
                        logger.debug('Downloaded ' + driver.name + ' to ' + filePath);
                        if(driver.extract) {
                            console.log('    Processing '.grey + driver.name);
                            me.extractTo(filePath, path.resolve(me.config.output, driver.bin));
                            logger.debug('Extracted ' + filePath + ' to ' + me.config.output);
                        }
                    }
                    cb(err);
                });
            });
        }
    });
    async.series(
        tasks,
        cb
    );
};

Manager.prototype.dirExists = function(dir, cb) {
    fs.stat(dir, function (err, stat) { 
        cb(!err && stat.isDirectory());
    });
};

Manager.prototype.createDirectory = function(dir, cb) {
    this.dirExists(dir, function(exists) {
        if(exists) {
            return cb(null, dir);
        }
        fsTools.mkdir(dir, function(err) {
            if (err) {
                logger.error('[wdmanager] could not create directory ' + dir, err);
                console.log('Could not create directory', dir);
                console.error(err);
            }
            cb(err, dir);
        });
    });
};

function getDriverFileName(driverUrl) {
    return url.parse(driverUrl).pathname.split('/').pop();
}

Manager.prototype.downloadDriver = function(driver, target, cb) {
    var me = this,
        driverUrl = driver.url(driver.version),
        options = {
            host: url.parse(driverUrl).host,
            port: 80,
            path: url.parse(driverUrl).pathname
        };

    var driverName = getDriverFileName(driverUrl);
    var filePath = path.resolve(target, driverName);
    var file = fs.openSync(filePath, 'w');
    var progress = 0,
        total = 0;
    me.showDownloadProgress(driver.name, progress, total);

    var request = http.get(options);
    request.on('response', function(res) {
        var status = res.statusCode;
        if (status === 200) {
            total = parseInt(res.headers['content-length'], 10);

            res.on('data', function(chunk) {
                progress += chunk.length;
                me.showDownloadProgress(driver.name, progress, total);
                fs.writeSync(file, chunk, 0, chunk.length, null);
            })
            .on('end', function() {
                fs.closeSync(file);
                cb(null, filePath);
            });
        } else {
            request.abort();
            cb(new Error('Could not download ' + driverUrl + '. Received status: ' + status));
        }
    });

    request.on('error', function(err) {
        me.showDownloadProgress(driver.name, progress, total, 'error');
        cb(err, filePath);
    });
};

Manager.prototype.showDownloadProgress = function(name, current, total, status) {
    var width = 20,
        ratio = total > 0 ? Math.floor(width * current/total) : 0,
        percent = total > 0 ? Math.floor(current/total*100) : 0,
        mark = status === 'error' ? cross.red : (ratio === width ? tick.green : '    ' ),
        nl = (status === 'error' || status === ' done' || ratio === width) ? '\n' : '',
        tpl = mark + 'Downloading '.grey + name + ' {completed}{remaining} ' + '{percent}% ' + nl,
        completed = new Array(ratio+1).join('\u25CF'.grey),
        remaining = new Array(width - ratio+1).join('\u25CB'.grey);
    stdout.clearLine();
    stdout.cursorTo(0);
    stdout.write(utils.format(tpl, {
        completed: completed,
        remaining: remaining,
        percent: percent
    }));
};

Manager.prototype.extractTo = function(source, destination) {
    // reading archives
    var AdmZip = require('adm-zip'),
        zip = new AdmZip(source);
    zip.extractAllTo(path.dirname(destination), /*overwrite*/true);
    this.fixFilePermissions(destination);
};

Manager.prototype.fixFilePermissions = function(file) {
    if(!isWindows()) {
        var stat = fs.statSync(file);
        // S_IXUSR    00100     owner has execute permission
        // Ref: https://github.com/joyent/node/issues/3045
        if (!(stat.mode & parseInt('100', 8))) {
            fs.chmodSync(file, '755');
        }
    }
};

function isWindows() {
    return (/^win/).test(os.platform());
}

module.exports = Manager;
