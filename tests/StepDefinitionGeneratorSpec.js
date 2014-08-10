/*jshint node:true*/
/*global describe,before,after,it*/
'use strict';
var proxyquire = require('proxyquire').noPreserveCache();
var expect = require("chai").expect;
var fs = require('fs');
var stubs = {};
var StepDefinitionGenerator = proxyquire("../lib/StepDefinitionGenerator.js", stubs);
var stream = require("mock-utf8-stream");
var generator, stdin, stdout, feature, featureContent;
describe('StepDefinitionGenerator', function() {
    before(function() {
        stdin = new stream.MockReadableStream();
        stdout = new stream.MockWritableStream();
        stdout.startCapture();
        generator = new StepDefinitionGenerator({
            stdin: stdin,
            stdout: stdout
        });
        feature = {
            scenarios: [{
                title: 'test scenario 1',
                steps: [
                    'Given a condition',
                    'And another condition',
                    'When an action is performed',
                    'And another action is performed',
                    'Then an outcome is expected',
                    'And another outcome is expected'
                ]
            },
            {
                title: 'test scenario 2',
                steps: []
            }]
        };

        featureContent = 'Feature: test\nScenario: test scenario\n\n    Given a condition\n    When an action is performed\n    Then an outcome is expected\n';
        if (!fs.existsSync('StepDefinitionGenerator.feature')) {
            fs.writeFileSync('StepDefinitionGenerator.feature', featureContent);
        }
    });
    
    after(function() {
        fs.unlinkSync('StepDefinitionGenerator.feature');
    });
    
    describe('matchStep()', function() {
        it('should match a valid GWT step', function() {
            var data = generator.matchStep('Given a test');
            expect(data).to.eql({ type: 'given', keyword: 'Given', step: 'a test', raw: 'Given a test'});
        });
        it('should return null for an invalid GWT step', function() {
            var data = generator.matchStep('A random string');
            expect(data).to.be.null;
        });
    });
    
    describe('matchSteps()', function() {
        it('should return array of matching steps', function() {
            var data = generator.matchSteps(['Given a condition', 'A random string', '', null]);
            expect(data).to.be.an('array').with.length(1);
            expect(data[0]).to.eql({ type: 'given', keyword: 'Given', step: 'a condition', raw: 'Given a condition'});
        });
        it('should return an empty array when the input is null or empty array', function() {
            var data = generator.matchSteps();
            expect(data).to.be.an('array').that.is.empty;
            data = generator.matchSteps([]);
            expect(data).to.be.an('array').that.is.empty;
        });
    });
    
    describe('getFeatureSteps()', function() {
        it('should return valid GWT steps', function() {
            var data = generator.getFeatureSteps(feature);
            expect(data).to.be.an('array').of.length(6);
            expect(data[0]).to.eql({ type: 'given', keyword: 'Given', step: 'a condition', raw: 'Given a condition'});
            expect(data[1]).to.eql({ type: 'given', keyword: 'And', step: 'another condition', raw: 'And another condition'});
            expect(data[2]).to.eql({ type: 'when', keyword: 'When', step: 'an action is performed', raw: 'When an action is performed'});
            expect(data[3]).to.eql({ type: 'when', keyword: 'And', step: 'another action is performed', raw: 'And another action is performed'});
            expect(data[4]).to.eql({ type: 'then', keyword: 'Then', step: 'an outcome is expected', raw: 'Then an outcome is expected'});
            expect(data[5]).to.eql({ type: 'then', keyword: 'And', step: 'another outcome is expected', raw: 'And another outcome is expected'});
        });
        it('should throw an error in case of an invalid argument', function() {
            expect(function() {
                generator.getFeatureSteps();
            }).to.throw();
        });
    });
    
    describe('generate()', function() {
        it('should generate code properly', function() {
            var feature = {
                scenarios: [{
                    title: 'test scenario 1',
                    steps: ['Given a condition']
                }]
            };
            var data = generator.generate(feature, 'English', 'Type: {type}\nKeyword: {keyword}\nStep: {step}\nRaw: {raw}');
            expect(data).to.equal('Type: given\nKeyword: Given\nStep: a condition\nRaw: Given a condition\n');
        });
        it('should handle localization properly', function() {
            var feature = {
                scenarios: [{
                    title: 'Un example',
                    steps: ['Etant donné une function', 'Quand on execute la function', 'Alors on obtient un résulat']
                }]
            };
            var data = generator.generate(feature, 'French', 'Type: {type}\nKeyword: {keyword}');
            generator.matchStep('A random string');
            expect(data).to.equal('Type: given\nKeyword: Etant donné\nType: when\nKeyword: Quand\nType: then\nKeyword: Alors\n');
        });
    });
    
    describe('generateFromFile()', function() {
        it('should generate javascript code properly', function(done) {
            generator.generateFromFile('StepDefinitionGenerator.feature', null, null, null, function(err, output) {
                expect(output).to.equal('// Given a condition\nGiven(/a condition/, function(done) {\n    done();\n});\n\n// When an action is performed\nWhen(/an action is performed/, function(done) {\n    done();\n});\n\n// Then an outcome is expected\nThen(/an outcome is expected/, function(done) {\n    done();\n});\n\n');
                done();
            });
        });
        it('should generate coffeescript code properly', function(done) {
            generator.generateFromFile('StepDefinitionGenerator.feature', 'English', 'coffeescript', null, function(err, output) {
                expect(output).to.equal('# Given a condition\nGiven /a condition/, (done) ->\n    done()\n\n# When an action is performed\nWhen /an action is performed/, (done) ->\n    done()\n\n# Then an outcome is expected\nThen /an outcome is expected/, (done) ->\n    done()\n\n');
                done();
            });
        });
        it('should fail on an invalid file', function(done) {
            generator.generateFromFile('xyz.feature', 'English', 'coffeescript', null, function(err) {
                expect(err).to.be.an.instanceof(Error).with.property('message').that.equals('Could not locate the feature file xyz.feature');
                generator.generateFromFile('', 'English', 'coffeescript', null, function(err) {
                    expect(err).to.be.an.instanceof(Error).with.property('message').that.equals('The supplied feature file is invalid');
                    done();
                });
            });
        });
        it('should generate to an output file', function(done) {
            generator.generateFromFile('StepDefinitionGenerator.feature', 'English', 'coffeescript', '_temp_output.coffee', function(err) {
                expect(fs.existsSync('_temp_output.coffee')).to.be.true;
                var content = fs.readFileSync('_temp_output.coffee');
                expect(content.toString()).to.equal('# Given a condition\nGiven /a condition/, (done) ->\n    done()\n\n# When an action is performed\nWhen /an action is performed/, (done) ->\n    done()\n\n# Then an outcome is expected\nThen /an outcome is expected/, (done) ->\n    done()\n\n');
                fs.unlinkSync('_temp_output.coffee');
                done();
            });
        });
    });
    
    describe('getMatchingStepFileName()', function() {
        it('should generate a step file name for a given feature file', function() {
            var stepFile1 = generator.getMatchingStepFileName('StepDefinitionGenerator.feature');
            var stepFile2 = generator.getMatchingStepFileName('step-definition-generator.feature');
            var stepFile3 = generator.getMatchingStepFileName('StepDefinitionGenerator.feature', 'javascript', 'Steps', true);
            var stepFile4 = generator.getMatchingStepFileName('StepDefinitionGenerator.feature', 'coffeescript');
            expect(stepFile1).to.equal('../steps/StepDefinitionGeneratorSteps.js');
            expect(stepFile2).to.equal('../steps/step-definition-generator-steps.js');
            expect(stepFile3).to.equal('../steps/StepDefinitionGeneratorSteps.js');
            expect(stepFile4).to.equal('../steps/StepDefinitionGeneratorSteps.coffee');
        });
    });

    describe('prompt()', function() {
        it('should prompt the user for options', function(done) {
            generator.prompt('StepDefinitionGenerator.feature', function(res) {
                expect(res).to.be.an('object');
                expect(res).to.eql({
                    language: 'English',
                    type: 'javascript',
                    target: undefined
                });
                done();
            });
            stdin.write(''); // take 'javascript' as default script type
            stdin.write(''); // take 'English' as default language
            stdin.write(''); // take 'Display' output as default output
        });
        it('should generate a camel-cased file when prompted', function(done) {
            generator.prompt('StepDefinitionGenerator.feature', function(res) {
                expect(res).to.be.an('object');
                expect(res).to.eql({
                    language: 'English',
                    type: 'coffeescript',
                    target: '../steps/StepDefinitionGeneratorSteps.coffee'
                });
                done();
            });
            stdin.write('2'); // take 'coffeescript' as default script type
            stdin.write('1'); // take 'English' as default language
            stdin.write('2'); // select 'File' as output
            stdin.write(''); // take 'default' path
        });
        it('should generate a non camel-cased file when prompted', function(done) {
            generator.prompt('step-definition-generator.feature', function(res) {
                expect(res).to.be.an('object');
                expect(res).to.eql({
                    language: 'English',
                    type: 'coffeescript',
                    target: '../steps/step-definition-generator-steps.coffee'
                });
                done();
            });
            stdin.write('2'); // take 'coffeescript' as default script type
            stdin.write('1'); // take 'English' as default language
            stdin.write('2'); // select 'File' as output
            stdin.write(''); // take 'default' path
        });
    });
});