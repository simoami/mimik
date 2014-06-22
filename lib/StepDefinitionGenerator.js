/*jshint node:true*/
/**
 * Generate step definitions from a feature object or file
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
    StepDefinitionGenerator = function(config) {
        config = config || {};
        this.stdin = config.stdin || process.stdin;
        this.stdout = config.stdout || process.stdout;
        this.language = config.language || 'English';
    };
StepDefinitionGenerator.prototype.matchStep = function(step, previous, language) {
    var prefix = '^(',
        suffix = ')\\s+(.+)$',
        keyword,
        matchSequence = {
            given: ['given', 'when', 'then'], // used by default or when previous step resolves to a given
            when: ['when', 'then', 'given'], // use when previous step resolves to a when
            then: ['then', 'given', 'when'] // use when previous step resolve to a then
        },
        _steps = matchSequence[previous || 'given'];

    for(var i = 0, len = _steps.length; i < len; i++) {
        keyword = _steps[i];
        var re = new RegExp(prefix + Yadda.localisation[language || this.language].localise(keyword) + suffix);
        var match = re.exec(step);
        if(match) {
            return { type: keyword, keyword: match[1], step: match[2], raw: step};
        }
    }
    return null;
};
StepDefinitionGenerator.prototype.matchSteps = function(steps, language) {
    var me = this,
        matches = [], previous;
    (steps||[]).forEach(function(step) {
        var match = me.matchStep(step, previous, language);
        if(match) {
            matches.push(match);
            previous = match.type;
        }
    });
    return matches;
};
StepDefinitionGenerator.prototype.getFeatureSteps = function(feature, language) {
    var me = this,
        steps = [];
    if(!feature) {
        throw new Error('StepDefinitionGenerator: getFeatureSteps() requires a valid argument.');
    }
    feature.scenarios.forEach(function(scenario) {
        steps = steps.concat(me.matchSteps(scenario.steps, language));
    });
    return steps;
};
StepDefinitionGenerator.prototype.generate = function(feature, language, stepTemplate) {
    var me = this,
        steps = me.getFeatureSteps(feature, language),
        output = '';

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
        fs = require('fs'),
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
    var tpl = type === 'coffeescript' ? coffeeTpl : jsTpl;
    fs.exists(file, function(exists) {
        if(!exists) {
            return cb(new Error('Could not locate the feature file ' + file));
        }
        Yadda.plugins.mocha.AsyncStepLevelPlugin.init({
            container: context
        });
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
    suffix = (suffix || '-steps') + '.' + (types[type] || 'js');
    target = path.join(path.dirname(file), '..', 'steps', basename.join('.') + suffix);
    return relative === true ? path.relative(process.cwd(), target) : target;
};
StepDefinitionGenerator.prototype.prompt = function(file, cb) {
    var me = this,
        callback = function(data) {
            me.stdin.removeListener('data', onData);
            cb(data);
        },
        onData = me.onData.bind(me, file, callback);
    me.step = 0;
    me.stdin.resume();
    me.stdin.setEncoding('utf8');
    me.showStep1(file);
    me.stdin.on('data', onData);
};
StepDefinitionGenerator.prototype.onData = function(file, cb, text) {
    var me = this;
    text = text.trim().replace(/\r\n|\n/, '');
    me.stdout.write('\u001B[1A  ' + prompt + ' \u001B[K');
    switch (me.step) {
        case 0:
            if (~ ['1', '2', ''].indexOf(text)) {
                me._type = text === '2' ? 'coffeescript' : 'javascript';
                me.stdout.write(' ' + me._type.success + '\n\n');
                me.showStep2();
                me.step++;
            }
            break;
        case 1:
            if (~ ['1', '2', '3', '4', '5', ''].indexOf(text)) {
                me._language = ['English', 'French', 'Norwegian', 'Polish', 'Spanish'][text === '' ? 0 : +text - 1];
                me.stdout.write(' ' + me._language.success + '\n\n');
                me.showStep3();
                me.step++;
            }
            break;
        case 2:
            if (~ ['1', '2', ''].indexOf(text)) {
                me._outputType = text === '2' ? 'file' : 'display';
                var outputTypeText = {'display': 'Display output', 'file': 'Save to a file'}[me._outputType];
                me.stdout.write(' ' + outputTypeText.success + '\n\n');
                if(me._outputType === 'file') {
                    me.showStep4(file, me._type);
                }
                me.step++;
            }
            break;
        case 3:
            if(me._outputType === 'file') {
                me._target = text ? text : me.getMatchingStepFileName(file, me._type, null, true);
                me.stdout.write('Saving to'.note + ' ' + me._target.success + '\n\n');
                me.step++;
            }
            break;
    }
    if ((me._outputType === 'display' && me.step === 3) || me.step === 4) {
        if(typeof cb === 'function') {
            cb({
                language: me._language,
                type: me._type,
                target: me._target
            });
        }
        delete me._language;
        delete me._type;
        delete me._outputType;
        delete me._target;
    }
};
StepDefinitionGenerator.prototype.showStep1 = function(file) {
    this.stdout.write('Feature file: '.note + file + '\n');
    this.stdout.write('Press Ctrl+C to abort'.note + '\n');
    this.stdout.write('\nChoose output'.note + '\n');
    this.stdout.write('  1. javascript (default)\n');
    this.stdout.write('  2. coffeescript\n');
    this.stdout.write('  ' + prompt + ' ');
};

StepDefinitionGenerator.prototype.showStep2 = function() {
    this.stdout.write('Specify the feature file language'.note + '\n');
    this.stdout.write('  1. English (default)\n');
    this.stdout.write('  2. French\n');
    this.stdout.write('  3. Norwegian\n');
    this.stdout.write('  4. Polish\n');
    this.stdout.write('  5. Spanish\n');
    this.stdout.write('  ' + prompt + ' ');
};

StepDefinitionGenerator.prototype.showStep3 = function() {
    this.stdout.write('Generate output'.note + '\n');
    this.stdout.write('  1. Display output (default)\n');
    this.stdout.write('  2. Save to a file\n');
    this.stdout.write('  ' + prompt + ' ');
};

StepDefinitionGenerator.prototype.showStep4 = function(file, type) {
    this.stdout.write('Specify a path:'.note + '\n');
    this.stdout.write('  ' + this.getMatchingStepFileName(file, type, null, true) + ' (default)\n');
    this.stdout.write('  ' + prompt + ' ');
};
module.exports = StepDefinitionGenerator;
