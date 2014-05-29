#!/usr/bin/env node
/*jshint node:true*/
var program = require('commander'),
    Manager = require('../lib/WDManager'),
    didYouMean = require('didyoumean'),
    path = require('path'),
    utils = require('../lib/utils'),
    winston = require('winston');

var name = program._name || require('path').basename(process.mainModule.filename);
var DOWNLOAD_DIR = path.resolve(process.cwd(), 'selenium');
var cmd = {}, logger, manager;


program._name = name;

// Init logger

function getLogger(config) {
    var isatty = require('tty').isatty(process.stdout.fd),
        levels = {
            debug: 1,
            info: 2,
            warn: 3,
            error: 4
        },
        colors = {
            info: 'cyan',
            debug: 'grey',
            warn: 'yellow',
            error: 'red'
        };
    var options = {
        console: utils.apply({
            //handleExceptions: true,
            json: false,
            level: 'error',
            colorize:  isatty, /* patch: do not colorize file and pipe output */
            exitOnError: false
        }, options)
    };

    if (config.log) {
        options.file = {
            filename: config.log,
            level: 'debug',
            json: false
        };
    }

    // share logger config
    winston.addColors(colors);
    winston.loggers.add('wdlauncher', options);

    var logger = winston.loggers.get('wdlauncher');
    logger.setLevels(levels);

    if (config.debug) {
        logger.transports.console.level = 'debug';
        logger.debug('[wdlauncher] debug logging is ON');
    }
    return logger;
}

function start(cb) {
    manager.start(cb);
}

function status(cb) {
    manager.status(cb);
}

function install(cb) {
    manager.install(function(err) {
        if(err) {
            console.error('The install process was interruped. Reason:', err.message);
            logger.error('[wdlauncher] The install process was interruped. Reason:', err);
        }
        cb(err);
    });
}

function init() {
    program
        .command('start')
        .description('start the selenium standalone server')
        .action(function(){
            var args = Array.prototype.slice.call(arguments, 0, -1);
            cmd.action = 'start';
            cmd.args = args;
        });
    program
        .command('install')
        .description('install or update missing selenium driver binaries')
        .action(function(){
            var args = Array.prototype.slice.call(arguments, 0, -1);
            cmd.action = 'install';
            cmd.args = args;
        });
    program
        .command('status')
        .description('display the current available driver binaries')
        .action(function(){
            var args = Array.prototype.slice.call(arguments, 0, -1);
            cmd.action = 'status';
            cmd.args = args;
        });
    program
        .usage('[command]')
        .option('--output <path>', 'path to the location of the binaries', DOWNLOAD_DIR)
        .option('-p,--port <num>', 'optional port for the selenium standalone server')
        .option('--auto-install', 'auto install missing binaries before starting the selenium server', false)
        .option('--overwrite', 'force download existing binaries', false)
        .option('--debug', "enable debug logging")
        .option('--log <path>', "path including file name to create a file log")
        .on('*', function(name) {
            var msgs = ['\n  "' + name + '" is not a known command.'];
            var d = didYouMean(name.toString(), program.commands, "_name");
            if (d) {
                msgs.push('Did you mean: '+ d + ' ?');
            }
            msgs.push('\n\n  See "' + program._name + ' --help".\n');
            console.error(msgs.join(' '));
            process.exit(1);
        });
    // parse args
    program.parse(process.argv);
    
    logger = getLogger(utils.copyTo({}, program, 'debug,log'));

    processCommand(cmd);
}


function processCommand(cmd) {
    var config = utils.copyTo({}, program, 'output,port,autoInstall,overwrite,debug,log');
    manager = new Manager(config);
    console.log('');
    if(cmd.action === 'start') {
        start(function(err) {
            if(err) {
                console.error(err.message);
                process.exit(1);
            }
            console.log('');
            process.stdin.resume();
        });
    } else if(cmd.action === 'status') {
        status(function(err) {
            if(err) {
                console.error(err.stack);
            }
            console.log('');
            process.exit(err ? 1: 0);
        });
    } else if(cmd.action === 'install') {
        install(function(err) {
            if(err) {
                console.error(err.stack);
            }
            console.log('');
            process.exit(err ? 1: 0);
        });
    } else {
        console.log('  No command specified.');
        console.log('  ---------------------');
        program.help();
    }
    
    // perform graceful shutdown on Ctrl+C
    process.on('SIGINT', function () {
        manager.stop();
    });
}

init();