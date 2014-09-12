/*jshint node: true*/
'use strict';

var utils = require('./lib/utils'),
    path = require('path'),
    os = require('os');

var DriverConfig = {
    selenium: {
        name: 'Selenium Standalone',
        bin: null,
        url: getSeleniumStandaloneUrl,
        version: '2.43.1',
        filePattern: 'selenium-server-standalone-.*[.]jar',
        install: true,
        applicable: function() { return true; },
        args: function(driver, dir) {
            return ['-jar', path.resolve(dir, getDriverFileName(driver.url(driver.version)))];
        }
    },
    chrome: {
        name: 'Chrome Driver',
        bin: 'chromedriver',
        url: getChromeDriverUrl,
        version: '2.10',
        filePattern: 'chromedriver_mac32[.]zip',
        install: true,
        extract: true,
        applicable: function() { return true; },
        args: function(driver, dir) {
            return ['-Dwebdriver.chrome.driver=' + path.resolve(dir, getDriverExecutable(driver.bin))];
        }
    },
    ie: {
        name: 'IE Driver',
        bin: 'IEDriverServer',
        url: getIEDriverUrl,
        version: '2.43.0',
        filePattern: 'IEDriverServer_.*[.]zip',
        install: true,
        extract: true,
        applicable: function() {
            return (/^win/).test(os.platform());
        },
        args: function(driver, dir) {
            return ['-Dwebdriver.ie.driver=' + path.resolve(dir, getDriverExecutable(driver.bin))];
        }
    }
};

function getSeleniumStandaloneUrl(version) {
    // Example output: http://selenium-release.storage.googleapis.com/2.41/selenium-server-standalone-2.41.0.jar
    var tpl = 'http://selenium-release.storage.googleapis.com/{version}/selenium-server-standalone-{patch}.jar';
    var patch = version;
    version = version.split('.').slice(0,2).join('.');
    return utils.format(tpl, {
        version: version,
        patch: patch
    });
}

function getChromeDriverUrl(version) {
    // Example output: http://chromedriver.storage.googleapis.com/2.10/chromedriver_mac32.zip
    var tpl = 'http://chromedriver.storage.googleapis.com/{version}/chromedriver_{platform}.zip';
    var platform = '';
    if (os.platform() === 'linux') {
        platform = 'linux' + (os.arch() === 'x64' ? '64' : '32');
    } else if (os.platform() === 'darwin') {
        platform = 'mac32';
    } else if (os.platform() === 'win32') {
        platform = 'win32';
    } else {
        return null;
    }
    return utils.format(tpl, {
        version: version,
        platform: platform
    });
}

function getIEDriverUrl(version) {
    // Example output: http://selenium-release.storage.googleapis.com/2.41/IEDriverServer_x64_2.41.0.zip
    // Example output: http://selenium-release.storage.googleapis.com/2.41/IEDriverServer_Win32_2.41.0.zip
    // versioning: major.minor.build.revision. e.g. v2.41.0.2
    var tpl = 'http://selenium-release.storage.googleapis.com/{version}/IEDriverServer_{platform}_{patch}.zip';
    var platform = os.arch() === 'x64' ? 'x64' : 'Win32';
    var patch = version;
    version = version.split('.').slice(0,2).join('.');
    return utils.format(tpl, {
        version: version,
        patch: patch,
        platform: platform
    });
}

function getDriverFileName(driverUrl) {
    return require('url').parse(driverUrl).pathname.split('/').pop();
}

function getDriverExecutable(driverUrl) {
    var file = require('url').parse(driverUrl).pathname.split('/').pop();
    return file + (isWindows() ? '.exe' : '');
}

function isWindows() {
    return (/^win/).test(os.platform());
}

module.exports = DriverConfig;