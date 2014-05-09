/*jshint node:true*/
/**
 * Generate step definitions from a feature object
 *
 * Usage:
 *     var generator = new StepDefinitionGenerator();
 *     generator.generate(feature, '{keyword}(\/{step}\/, function(done) {\n    done();\n});\n');
 *
 */
var Yadda = require('yadda');
var StepDefinitionGenerator = function(language) {
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
StepDefinitionGenerator.prototype.generateFromFile = function(file, language, script, cb) {
    var me = this,
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
    var tpl = script === 'coffeescript' ? 
        '# {raw}\n{keyword} \/{step}\/, (done) ->\n  done()\n' : 
        '// {raw}\n{keyword}(\/{step}\/, function(done) {\n    done();\n});\n';
    context.featureFile(file, function(feature) {
        var output = me.generate(feature, language, tpl);
        cb(null, output);
    });
};
StepDefinitionGenerator.prototype.prompt = function(cb) {
    var step = 0,
        script, language;

    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    showStep1();

    function showStep1() {
        console.log('\nChoose output:'.note);
        console.log('  1. javascript (default)');
        console.log('  2. coffeescript');
        process.stdin.write('  › ');
    }

    function showStep2() {
        console.log('\nChoose language:'.note);
        console.log('  1. English (default)');
        console.log('  2. French');
        console.log('  3. Norwegian');
        console.log('  4. Polish');
        console.log('  5. Spanish');
        process.stdin.write('  › ');
    }

    process.stdin.on('data', function(text) {
        text = text.substr(0, text.length - 1).trim();
        process.stdin.write('\u001B[1A  › \u001B[K');
        switch (step) {
            case 0:
                if (~ ['1', '2', ''].indexOf(text)) {
                    script = text === '2' ? 'coffeescript' : 'javascript';
                    console.log(script.success);
                    step++;
                    showStep2();
                }
                break;
            case 1:
                if (~ ['1', '2', '3', '4', '5', ''].indexOf(text)) {
                    language = ['English', 'French', 'Norwegian', 'Polish', 'Spanish'][text === '' ? 0 : +text - 1];
                    console.log(language.success + '\n');
                    step++;
                }
                break;
        }
        if (step === 2) {
            if(typeof cb === 'function') {
                cb({
                    language: language,
                    script: script
                });
            }
        }
    });
    
};

module.exports = StepDefinitionGenerator;
