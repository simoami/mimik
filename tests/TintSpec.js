'use strict';
var expect = require("chai").expect;
var tint = require('../lib/tint');
var stubs = { 
    process: {
        env: {
            TERM: 'screen'
        },
        stdout: {
            isTTY: false
        }
    }
};
var origs = {
    isTTY: process.stdout.isTTY,
    platform: process.platform,
    term: process.env.TERM,
    colorTerm: 'COLORTERM' in process.env
};

before(function() {
    process.stdout.isTTY = true;
    process.env.TERM = 'screen';
});
after(function() {
    process.stdout.isTTY = origs.isTTY;
    process.env.TERM = origs.term;
    process.platform = origs.platform;
    if(!origs.colorTerm) {
        delete process.env.COLORTERM;
    }
});
describe('tint', function() {
    it('should style string', function() {
        expect(tint.underline('foo')).to.equal('\x1B[4mfoo\x1B[24m');
        expect(tint.red('foo')).to.equal('\x1B[31mfoo\x1B[39m');
        expect(tint.bgRed('foo')).to.equal('\x1B[41mfoo\x1B[49m');
    });

    it('should support nesting styles', function() {
        expect(
        tint.red('foo' + tint.underline('bar') + '!')).to.equal('\x1B[31mfoo\x1B[4mbar\x1B[24m!\x1B[39m');
    });

    it('should support nesting styles of the same type (color, underline, bg)', function() {
        expect(
        tint.red('a' + tint.blue('b' + tint.green('c') + 'b') + 'c')).to.equal('\x1B[31ma\x1B[34mb\x1B[32mc\x1B[34mb\x1B[31mc\x1B[39m');
    });

    it('should reset all styles with `.reset()`', function() {
        expect(tint.reset(tint.red('foo') + 'foo')).to.equal('\x1B[0m\x1B[31mfoo\x1B[39mfoo\x1B[0m');
    });

    it('should alias gray to grey', function() {
        expect(tint.grey('foo')).to.equal('\x1B[90mfoo\x1B[39m');
    });

    it('should support falsy values', function() {
        expect(tint.red(0)).to.equal('\x1B[31m0\x1B[39m');
    });

    it('don\'t output escape codes if the input is empty', function() {
        expect(tint.red()).to.equal('');
    });
});

describe('tint.disable()', function() {
    it('should not output colors when manually disabled', function() {
        tint.disable();
        expect(tint.red('foo')).to.equal('foo');
        tint.enable();
    });
});

describe('tint.styles', function() {
    it('should expose the styles as ANSI escape codes', function() {
        expect(tint.styles.red._open).to.equal('\x1B[31m');
    });
});

describe('tint terminal color support', function() {
    it('should detect terminal support for colors', function() {
        expect(tint.canColor()).to.be.true;
        process.stdout.isTTY = false;
        expect(tint.canColor()).to.be.false;
        process.stdout.isTTY = true;
        process.env.TERM = 'fake';
        expect(tint.canColor()).to.be.false;
        process.env.COLORTERM = true;
        expect(tint.canColor()).to.be.true;
        process.platform = 'win32';
        expect(tint.canColor()).to.be.true;
        
    });
});