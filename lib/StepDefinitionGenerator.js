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
StepDefinitionGenerator.prototype.generate = function(feature, stepTemplate) {
    var me = this,
        steps = me.getFeatureSteps(feature),
        output = '';
    steps.forEach(function(step) {
        output += stepTemplate.replace('{type}', step.type).replace('{keyword}', step.keyword).replace('{step}', step.step).replace('{raw}', step.raw) + '\n';
    });
    return output;
};

module.exports = StepDefinitionGenerator;
