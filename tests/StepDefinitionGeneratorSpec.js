var expect = require("chai").expect;
var fs = require('fs');
var StepDefinitionGenerator = require("../lib/StepDefinitionGenerator.js");
var generator;
describe('StepDefinitionGenerator', function() {
    before(function() {
        generator = new StepDefinitionGenerator();
        if (!fs.existsSync('StepDefinitionGenerator.feature')) {
            fs.writeFileSync('StepDefinitionGenerator.feature', '');
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
        it('should return null an invalid GWT step', function() {
            var data = generator.matchStep('This format is not supported');
            expect(data).to.be.null;
        });
    });
    
    describe('matchSteps()', function() {
        
    });
    
    describe('getFeatureSteps()', function() {
        
    });
    
    describe('generate()', function() {
        
    });
    
    describe('generateFromFile()', function() {
        
    });
    
    describe('getMatchingStepFileName()', function() {
        
    });
    
    describe('prompt()', function() {
        
    });
});