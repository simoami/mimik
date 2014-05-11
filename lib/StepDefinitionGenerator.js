/*jshint node:true*/
/**
 * Generate step definitions from a feature object
 *
 * Usage:
 *     var generator = new StepDefinitionGenerator();
 *     generator.generate(feature, '{keyword}(\/{step}\/, function(done) {\n    done();\n});\n');
 *
 */

'use strict';
var Yadda = require('yadda'),
    path = require('path'),
    prompt = '\u203A',
    StepDefinitionGenerator = function(language) {
    this.language = language || 'English';
};
StepDefinitionGenerator.prototype.matchStep = function(step) {
    var prefix = '^(',
        suffix = ')\\s+(.+)$',
        keyword,
        _steps = ['given', 'when', 'then'];

    for(var i = 0, len = _steps.length; i < len; i++) {
        keyword = _steps[i];
        var re = new RegExp(prefix + Yadda.localisation[this.language].localise(keyword) + suffix);
        var match = re.exec(step);
        if(match) {
            return { type: keyword, keyword: match[1], step: match[2], raw: step};
        }
    }
    return null;
};
StepDefinitionGenerator.prototype.matchSteps = function(steps) {
    var me = this,
        matches = [];
    (steps||[]).forEach(function(step) {
        var match = me.matchStep(step);
        if(match) {
            matches.push(match);
        }
    });
    return matches;
};
StepDefinitionGenerator.prototype.getFeatureSteps = function(feature) {
    var me = this,
        steps = [];
    feature.scenarios.forEach(function(scenario) {
        steps = steps.concat(me.matchSteps(scenario.steps));
    });
    return steps;
};
StepDefinitionGenerator.prototype.generate = function(feature, language, stepTemplate) {
    var me = this,
        steps = me.getFeatureSteps(feature),
        output = '';
    if(language) {
        this.language = language;
    }
    steps.forEach(function(step) {
        output += stepTemplate.replace('{type}', step.type).replace('{keyword}', step.keyword).replace('{step}', step.step).replace('{raw}', step.raw) + '\n';
    });
    return output;
};
/**
 * Generate step definitions and return output.
 * @param {String} file The feature file to generate steps for.
 * @param {String} language The language that the feature file is written in. Defaults to English.
 * @param {String} type The output type. Available options are javascript, coffeescript. Defaults to javascript.
 * @param {String} target A file path (optional). Save to a file if a target path is supplied.
 * @param {Function} cb The callback function returned after processing output. The callback signature is cb(err, output).
 */
StepDefinitionGenerator.prototype.generateFromFile = function(file, language, type, target, cb) {
    var me = this,
        jsTpl = '// {raw}\n{keyword}(\/{step}\/, function(done) {\n    done();\n});\n',
        coffeeTpl = '# {raw}\n{keyword} \/{step}\/, (done) ->\n    done()\n',
        context = {
            describe: function(text, next) {
                next();
            }
        };
    if(!file || !~file.indexOf('.feature')) {
        return cb(new Error('The supplied feature file is invalid'));
    }
    Yadda.plugins.mocha.AsyncStepLevelPlugin.init({
        container: context
    });
    var tpl = type === 'coffeescript' ? coffeeTpl : jsTpl;

    context.featureFile(file, function(feature) {
        var output = me.generate(feature, language, tpl);
        if(target) {
            var fs = require('fs'),
                fsTools = require('fs-tools');
            fsTools.mkdir(path.dirname(target), function(err) {
                if(err) {
                    return cb(err, output);
                }
                fs.writeFile(target, output, function(err) {
                    cb(err, output);
                });
            });
        } else {
            cb(null, output);
        }
    });
};
StepDefinitionGenerator.prototype.getMatchingStepFileName = function(file, type, suffix, relative) {
    var basename = path.basename(file).split('.'), 
        types = { 
            'javascript': 'js', 
            'coffeescript': 'coffee'
        },
        target;
    basename.pop();
    suffix = suffix || '-steps.' + (types[type] || 'js');
    target = path.join(path.dirname(file), '..', 'steps', basename.join('.') + suffix);
    return relative === true ? path.relative(process.cwd(), target) : target;
};
StepDefinitionGenerator.prototype.prompt = function(file, cb) {
    var me = this,
        step = 0,
        type, language, outputType, target;

    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    showStep1();

    function showStep1() {
        console.log('Feature file:'.note, file);
        console.log('Press Ctrl+C to abort'.note);
        console.log('\nChoose output'.note);
        console.log('  1. javascript (default)');
        console.log('  2. coffeescript');
        process.stdin.write('  ' + prompt + ' ');
    }

    function showStep2() {
        console.log('Specify the feature file language'.note);
        console.log('  1. English (default)');
        console.log('  2. French');
        console.log('  3. Norwegian');
        console.log('  4. Polish');
        console.log('  5. Spanish');
        process.stdin.write('  ' + prompt + ' ');
    }

    function showStep3() {
        console.log('Generate output'.note);
        console.log('  1. Display output (default)');
        console.log('  2. Save to a file');
        process.stdin.write('  ' + prompt + ' ');
    }

    function showStep4() {
        console.log('Specify a path:'.note);
        console.log(' ', me.getMatchingStepFileName(file, type, null, true), '(default)');
        process.stdin.write('  ' + prompt + ' ');
    }

    process.stdin.on('data', function(text) {
        text = text.substr(0, text.length - 1).trim();
        process.stdin.write('\u001B[1A  ' + prompt + ' \u001B[K');
        switch (step) {
            case 0:
                if (~ ['1', '2', ''].indexOf(text)) {
                    type = text === '2' ? 'coffeescript' : 'javascript';
                    console.log('', type.success);
                    console.log();
                    showStep2();
                    step++;
                }
                break;
            case 1:
                if (~ ['1', '2', '3', '4', '5', ''].indexOf(text)) {
                    language = ['English', 'French', 'Norwegian', 'Polish', 'Spanish'][text === '' ? 0 : +text - 1];
                    console.log('', language.success);
                    console.log();
                    showStep3();
                    step++;
                }
                break;
            case 2:
                if (~ ['1', '2', ''].indexOf(text)) {
                    outputType = text === '2' ? 'file' : 'display';
                    var outputTypeText = {'display': 'Display output', 'file': 'Save to a file'}[outputType];
                    console.log('', outputTypeText.success);
                    console.log();
                    if(outputType === 'file') {
                        showStep4();
                    }
                    step++;
                }
                break;
            case 3:
                if(outputType === 'file') {
                    target = text ? text : me.getMatchingStepFileName(file, type, null, true);
                    console.log('Saving to'.note, target.success);
                    console.log();
                    step++;
                }
                break;
        }
        if ((outputType === 'display' && step === 3) || step === 4) {
            if(typeof cb === 'function') {
                cb({
                    language: language,
                    type: type,
                    target: target
                });
            }
        }
    });
    
};

module.exports = StepDefinitionGenerator;
