/*jshint node:true*/
'use strict';
var cmd = {};

module.exports = function(program, opts) {

    opts = opts || {};
    opts.name = opts.name || program._name || require('path').basename(process.mainModule.filename);
    program._name = opts.name;
    var didYouMean = require('didyoumean'),
        commands = {};

    function toList(val) {
          return val ? val.split(',') : null;
    }

    function toInt(val, def) {
        return parseInt(val ? val : def, 10);
    }
    // function booleanOrInteger(val) {
    //     return /\d+/.test(val) ? parseInt(val, 10) : (val === 'true');
    // }

    /*
     * COMMAND OPTIONS
     */

    program
        .usage('[options] [command]')
        .option('-c, --config <path>', 'specify an external config file')
        .option('-b, --browsers <names>', 'comma-delimited <names> of local browsers to use (chrome|firefox|ie|safari|phantomjs)', toList)
        .option('-m, --match <pattern>', 'only run features matching <pattern>')
        .option('--match-invert', 'inverts --match results')
        .option('-T, --tags <names>', 'only run feature tests annotated with one of the comma-delimited tag <names>', toList)
        .option('-E, --exclude-tags <names>', 'exclude feature tests annotated with one of the comma-delimited tag <names>', toList)
        .option('-t, --timeout <ms>', 'set per-test timeout in milliseconds [10000]', toInt, 10000)
        .option('-s, --slow <ms>', '"slow" test threshold in milliseconds [5000]', toInt, 5000)
        .option('-f, --failfast', 'stop running tests on the first encoutered failure or timeout')
        //.option('-l, --tunnel <name>', 'The tunneling service provider to use. Currently supports local, localtunnel, browserstack and pagekite')
        //.option('-p, --port <port>', 'The port to run the server on in interactive mode [8123]', 8123)
        .option('--test-strategy <name>', '`test` runs various tests in parallel. `browser` runs each test against mutiple browsers [test]', 'test')
        .option('--reporters <names>', 'comma-delimited report <names> to enable. available options: junit,html', toList)
        .option('--report-path <path>', 'path for the generated reports', '')
        .option('--rerun', 'rerun failed tests recorded in `failed.dat` from the last test run')
        //.option('--concurrency <num> - Maximum number of features which will run in parallel (defaults to 1)', toInt, 1)
        //.option('-m, --max-features <num> - The number of concurrently executing unit test suites (defaults to 5), toInt, 1)
        //.option('--share-session', 'share session between tests by keeping the browser open', '')
        .option('--debug', "enable debug logging")
        //.option('--language <language>', 'The localized language of the feature files [English]', 'English')
        .option('--log <path>', 'output a log file to filename')
        .on('--help', function() {
            console.log('  Run ' + program._name + ' [command] --help to see description and available options for a particular command\n');
        })
        .on('*', function(name) {
            var msgs = ['\n  "' + name + '" is not a known command.'];
            var d = didYouMean(name.toString(), program.commands, "_name");
            if (d) {
                msgs.push('Did you mean: '+ d + ' ?');
            }
            msgs.push('\n\n  See "' + opts.name + ' --help".\n');
            console.error(msgs.join(' '));
            process.exit(1);
        });
    program
        .command('run')
        .usage('[options] [path ...]')
        .description('run feature tests found in the [target] path')
        .action(function(){
            var args = Array.prototype.slice.call(arguments, 0, -1);
            cmd.action = 'run';
            cmd.args = args;
        });
    program
        .command('watch')
        .usage('[options] [path ...]')
        .description('watch for file changes in the [target] path, then run feature tests')
        .option('-d, --watch-delay <ms>', 'Buffers multiple changes into a single run using a delay in milliseconds [500]', toInt, 500)
        .action(function(){
            var args = Array.prototype.slice.call(arguments, 0, -1);
            cmd.action = 'watch';
            cmd.args = args;
        });

    commands.generate = program.command('generate');
    commands.generate
        .usage('<path>')
        .description('generate step definition templates for the specified feature file <path>')
        .action(function(file, options){
            if(!options) {
                options = file;
                file = null;
            }
            cmd.action = 'generate';
            cmd.file = file;
            cmd.options = options;
            cmd.cmd = commands.generate;
        });
    return cmd;
};
