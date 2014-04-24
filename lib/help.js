/*jshint node:true*/
'use strict';
var cmd = {};

module.exports = function(program, opts) {

    opts = opts || {};
    opts.name = opts.name || program._name || require('path').basename(process.mainModule.filename);
    program._name = opts.name;
    var didYouMean = require('didyoumean');

    function list(val) {
          return val ? val.split(',') : null;
    }

    // function booleanOrInteger(val) {
    //     return /\d+/.test(val) ? parseInt(val, 10) : (val === 'true');
    // }

    /*
     * COMMAND OPTIONS
     */

    program
        .usage('[options] [command]')
        .option('-c, --config <path>', 'specify an alternative config file')
        .option('-b, --browsers <names>', 'comma-delimited <names> of local browsers to use (chrome|firefox|ie|safari|phantomjs)', list)
        .option('-m, --match <pattern>', 'only run features matching <pattern>')
        .option('--match-invert', 'inverts --match results')
        .option('-T, --tags <names>', 'only run feature tests annotated with one of the comma-delimited tag <names>', list)
        .option('-E, --exclude-tags <names>', 'exclude feature tests  annotated with one of the comma-delimited tag <names>', list)
        .option('-t, --timeout <ms>', 'set per-test timeout in milliseconds [10000]', parseInt, 10000)
        .option('-s, --slow <ms>', '"slow" test threshold in milliseconds [5000]', parseInt, 5000)
        .option('-n, --no-bail', "continue running tests even on failure")
        //.option('-l, --tunnel <name>', 'The tunneling service provider to use. Currently supports local, localtunnel, browserstack and pagekite')
        //.option('-p, --port <port>', 'The port to run the server on in interactive mode [8123]', 8123)
        .option('--test-strategy <name>', '"test" runs different tests in parallel. "browser" runs the same test in mutiple browsers [test]', 'test')
        .option('--reporters <names>', 'comma-delimited report <names> to enable. available options: junit,html', list)
        .option('--report-path <path>', 'path for the generated reports', '')
        .option('--rerun <path>', 'path to generate a list of failed features or rerun features from an existing file', '')
        //.option('--share-session', 'share session between tests by keeping the browser open', '')
        .option('--debug', "enable debug logging")
        .option('--log <path>', "path including file name to create a file log")
        .on('*', function(name) {
            console.error('"' + name + '" is not a known command. See "' + opts.name + ' --help".');
            var d = didYouMean(name.toString(), program.commands, "_name");
            if (d) {
                console.log();
                console.info('  Did you mean:', d, '?');
                console.log();
            }
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
        .command('web')
        .description('launch the web interface')
        .action(function(){
            var args = Array.prototype.slice.call(arguments, 0, -1);
            cmd.action = 'web';
            cmd.args = args;
        });

    return cmd;
};
