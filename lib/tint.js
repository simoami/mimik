/*jshint node:true*/
/**
 * Terminal string coloring and styling
 */

'use strict';

var canColor = function() {
    if(process.stdout && !process.stdout.isTTY) {
        return false;
    }
    if (process.platform === 'win32') {
        return true;
    }
    if ('COLORTERM' in process.env) {
        return true;
    }    
    return (/^screen|^xterm|^vt100|color|ansi|cygwin|linux/i).test(process.env.TERM);
}();

var tint = module.exports;

var codes = {
    reset: [0, 0],

    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29],

    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    gray: [90, 39],

    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49]
};
// add aliases
codes.grey = codes.gray;
var styles = tint.styles = {};
var props = {};

function applyColor(key, args) {
    var style = tint.styles[key];
    if(!args.length) {
        return '';
    }
    var str = String(args[0]);
    // process any existing ansi code in the input string by reopening closing codes.
    return canColor && tint.enabled ? style._open + str.replace(style._reopenRE, style._open) + style._close : str;
}

(function init() {
    Object.keys(codes).forEach(function (key) {
        var val = codes[key];
        styles[key] = {
            _open: '\x1B[' + val[0] + 'm',
            _close: '\x1B[' + val[1] + 'm',
            _reopenRE: new RegExp('\\x1B\\[' + val[1] + 'm', 'g')
        };

        props[key] = {
            get: function() {
                return function tint() {
                    return applyColor.call(this, key, arguments);
                };
            }
        };
    });
    Object.defineProperties(tint, props);
    tint.canColor = canColor;
    tint.enabled = true;
})();