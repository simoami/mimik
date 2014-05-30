/*jshint node:true*/
'use strict';

var utils = require('../lib/utils'),
    logger = require('winston').loggers.get('wdlauncher'),
    driverConfig = require('../wdconfig.js'),
    async = require('async'),
    os = require('os'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    http = require('http'),
    fsTools = require('fs-tools'),
    stdout = process.stdout,
    DOWNLOAD_DIR = path.resolve(process.cwd(), 'selenium'),
    symbols = {
        tick: utils.color('green', isWindows() ? '  \u221A ' : '  \u2713 '),
        cross: utils.color('red', isWindows() ? '  \u00D7 ' : '  \u2716 '),
        disc: utils.color('grey', isWindows() ? '\u2022' : '\u25CF'),
        circle: utils.color('grey', '\u25CB')
    };

var Manager = function(config) {
    this.config = config || {};
    this.config.output = this.config.output || DOWNLOAD_DIR;
};

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
            return cb(new Error(driverConfig.selenium.name + ' is ' + status.selenium.status+ '. Use --auto-install to automatically install missing binaries'));
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

        console.log(utils.color('grey', '  Starting ' + driverConfig.selenium.name + '. Press Ctrl+C to abort.'));

        me.proc = me.exec('java', args);
        // error event not emitted on windows. For Windows, use the spawn's stdin configuration to show the error directly
        me.proc.once('error', function(err) {
            if(err) {
                if(err.code === 'ENOENT') {
                    console.error('"java" command not found. Java JDK is required to run ' + driverConfig.selenium.name);
                } else {
                    console.error(err);
                }
            }
            process.exit(err ? 1 : 0);
        });
        me.proc.once('exit', function(code) {
            if(code !== 0) {
                console.log(driverConfig.selenium.name + ' has exited with code ' + code);
            }
            process.exit(code);
        });
        cb(null);
    });

};

Manager.prototype.exec = function(command, args) {
    var spawn = require('child_process').spawn,
        options = {
            stdio: [process.stdin, process.stdout, null]
        };

    if (isWindows()) {
        // see https://github.com/joyent/node/issues/2318
        args = ['/c', command].concat(args);
        command = 'cmd';
        // Since the error event not emitted on windows, we rely on the spawn's stdin configuration to show the error directly
        options = {
            stdio: [process.stdin, process.stdout, process.stderr]
        };
    }
    return spawn(command, args, options);
};

Manager.prototype.stop = function() {
    if(this.proc) {
        this.proc.kill('SIGINT');
    }
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
                        console.log(symbols.tick + driver.name + ' is current');
                        break;
                    case 'outdated':
                        console.log(symbols.cross + driver.name + ' is outdated. Found ' + value.file);
                        break;
                    case 'missing':
                        console.log(symbols.cross + driver.name + ' is missing');
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
    
    // if(!java) {
    //     return console.error('Could not find `java`, make sure it is installed in your $PATH');
    // });
    
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
            console.log(utils.color('grey', status.success ? '  Reinstalling binaries...\n' : '  Installing missing binaries...\n'));
            return me.doInstall(status, function(err) {
                console.log();
                cb(err);
            });
        }
        console.log(utils.color('grey', '  All binaries are properly installed'));
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
                            console.log(utils.color('grey', '    Processing ') + driver.name);
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
        isWin = isWindows(),
        percent = total > 0 ? Math.floor(100 * current/total) : 0,
        ratio = total > 0 ? Math.floor(width * current/total) : 0,
        mark = status === 'error' ? symbols.cross : (ratio === width ? symbols.tick : '    ' ),
        nl = (status === 'error' || status === ' done' || ratio === width) ? '\n' : '',
        tpl = mark + utils.color('grey', 'Downloading ') + name + (isWin ? '' : ' {completed}{remaining}') + ' {percent}% ' + nl,
        completed = new Array(ratio+1).join(symbols.disc),
        remaining = new Array(width - ratio+1).join(symbols.circle);
    if(!isWin || percent % 2 === 0) {
        stdout.clearLine();
        stdout.cursorTo(0);
        stdout.write(utils.format(tpl, {
            completed: completed,
            remaining: remaining,
            percent: percent
        }));
    }
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
        // Ref: https://github.com/joyent/node/issues/3045
        // S_IXUSR 00100 owner has execute permission
        if (!(stat.mode & parseInt('100', 8))) {
            fs.chmodSync(file, '755');
        }
    }
};

function isWindows() {
    return (/^win/).test(os.platform());
}

module.exports = Manager;
