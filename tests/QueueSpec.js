/*jshint node:true*/
/*global describe,it*/
'use strict';
var proxyquire = require('proxyquire').noPreserveCache();
var expect = require('chai').expect;
var stubs = {};
var Queue = proxyquire("../lib/Queue.js", stubs);
describe('Queue', function() {
    describe('chainMethod()', function() {
        it('should call chained method in the correct sequence', function(done) {
            var calls = [];
            var Chainable = function() {};
            Chainable.prototype.asyncFn1 = Queue.chainMethod(function(cb) {
                setTimeout(function() {
                    calls.push('asyncFn1');
                    cb('asyncFn1');
                }, 100);
            });
            Chainable.prototype.asyncFn2 = Queue.chainMethod(function(cb) {
                setTimeout(function() {
                    calls.push('asyncFn2');
                    cb('asyncFn2');
                }, 50);
            });
            Chainable.prototype.syncFn3 = Queue.chainMethod(function(cb) {
                calls.push('syncFn3');
                cb('syncFn3');
            });
            var chain = new Chainable();
            chain.asyncFn1(function() {
                chain.asyncFn2(function() {
                    calls.push('after asyncFn2');
                });
            }).asyncFn2(function() {
                    calls.push('after second asyncFn2');
                }).syncFn3(function() {
                expect(calls).to.eql(['asyncFn1', 'asyncFn2', 'after asyncFn2', 'asyncFn2', 'after second asyncFn2', 'syncFn3']);
                done();
            });
        });
    });
    describe('chainClass()', function() {
        it('should call chained method in the correct sequence', function(done) {
            var calls = [];
            var Chainable = function() {};
            Chainable.prototype.asyncFn1 = function(cb) {
                setTimeout(function() {
                    calls.push('asyncFn1');
                    cb('asyncFn1');
                }, 100);
            };
            Chainable.prototype.asyncFn2 = function(cb) {
                setTimeout(function() {
                    calls.push('asyncFn2');
                    cb('asyncFn2');
                }, 50);
            };
            Chainable.prototype.syncFn3 = function(cb) {
                calls.push('syncFn3');
                cb('syncFn3');
            };
            Queue.chainClass(Chainable);
            
            var chain = new Chainable();
            console.log(chain.asyncFn1.toString());
            
            chain.asyncFn1(function() {
                chain.asyncFn2(function() {
                    calls.push('after asyncFn2');
                });
            }).asyncFn2(function() {
                    calls.push('after second asyncFn2');
                }).syncFn3(function() {
                expect(calls).to.eql(['asyncFn1', 'asyncFn2', 'after asyncFn2', 'asyncFn2', 'after second asyncFn2', 'syncFn3']);
                done();
            });
        });
    });
    describe('done()', function() {
        it('should add', function() {

        });
    });
    describe('chain()', function() {
        it('should add', function() {

        });
    });

});
