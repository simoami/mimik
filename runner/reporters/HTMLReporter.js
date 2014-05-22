/*jshint node:true*/
var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    utils = require('../../lib/utils'),
    fsTools = require('fs-tools'),
    moment = require('moment'),
    logger = require('winston').loggers.get('mimik'),
    dot = require('dot');

function Reporter(runner) {
    var me = this;
    if (!runner) {
        return;
    }
    me.runner = runner;
    me.options = runner.options;
    me.screenshots = [];
    runner.on('fail', function(test) {
       me.getScreenshot(test);
    });
}
Reporter.prototype.process = function(stats, target, callback) {
    var me = this;
    logger.profile('[html reporter] process');
    dot.templateSettings.strip = false;
    // generate html file names
    utils.each(stats.results, function(featureReport, index) {
        featureReport.htmlFile = me.getFileName(featureReport.title, index+1);
    });
    async.waterfall([
        function(cb) {
            me.createDirectory(target, cb);
        },
        me.copyBase,
        function(dir, cb) {
            me.linkScreenshots(dir, cb);
        },
        function(dir, cb) {
            me.createFeatureListPage(dir, stats, cb);
        },
        function(dir, cb) {
            me.createFeaturePages(dir, stats, cb);
        },
        function(dir, cb) {
            me.createParamsPage(dir, cb);
        },
        function(dir, cb) {
            me.createTagPage(dir, stats, cb);
        }
        ],
        function(err, dir){
            if(err) {
                console.log('Could not generate html reports');
                console.error(err);
                logger.info('[html reporter] Could not generate html reports');                
            } else {
                logger.profile('[html reporter] feature list page (index.html) generated.');
                logger.info('[html reporter] generated html report at %s', dir);
            }
            if(typeof callback === 'function') {
                callback();
            }
        }
    );
};

Reporter.prototype.createDirectory = function(target, cb) {
    var dir = path.resolve(process.cwd(), target, 'reports/html');
    fsTools.remove(dir, function(err) {
        if (err) {
            logger.error('[html reporter] could not prepare path', dir);
            console.log('Could not prepare path %s for write', dir);
            console.error(err);
            cb(err, dir);
            return;
        }
        fsTools.mkdir(dir, function(err) {
            if (err) {
                logger.error('[html reporter] Can\'t create directory ', dir);
                console.log('Could not create directory', dir);
                console.error(err);
            }
            cb(err, dir);
        });
    });
};

Reporter.prototype.copyBase = function(dir, cb) {
    var src = path.join(__dirname, 'html/base');
    fsTools.copy(src, dir, function(err) {
        if(err) {
            logger.error('[html reporter] Failed copying ' + src + ' into ' + dir);
            console.log('Failed copying ' + src + ' into ' + dir);
            console.error(err);
        }
        cb(err, dir);
    });
};
Reporter.prototype.linkScreenshots = function(dir, cb) {
    var index = 1;
    async.each(this.screenshots, function(data, callback) {
        var file = path.join(dir, 'screenshots', 'screenshot_' + (index++) + '_' + data.test.title.replace(/\W+/g, '_').toLowerCase() + '.png');
        data.test.screenshotFile = file;
        fs.writeFile(file, data.screenshot, "base64", function(err) {
            callback(err);
        });
    },
    function(err){
        if(err) {
            logger.error('[html reporter] Failed processing screenshots');
            console.log('Failed processing screenshots');
            console.error(err);
        }
        cb(err, dir);
    });
};
Reporter.prototype.createFeatureListPage = function(dir, stats, cb) {
    var me = this;
    var featuresTpl = me.loadTemplate(path.join(__dirname, '/html/tpl/features.html'));
    var baseTpl = me.loadTemplate(path.join(__dirname, 'html/tpl/base.html'));
    var tpl = dot.template(baseTpl, null, {
        body: featuresTpl
    });
    var output = tpl({
        title: 'Test Results',
        stats: stats,
        profiles: me.getProfiles(me.runner.browserProfiles),
        fn: {
            duration: me.getDuration,
            date: moment
        }
    });
    me.writeTemplate(path.join(dir, 'index.html'), output, function(err) {
        cb(err, dir);
    });
};
Reporter.prototype.createFeaturePages = function(dir, stats, cb) {
    var me = this;
    var featureTpl = me.loadTemplate(path.join(__dirname, '/html/tpl/feature.html'));
    var baseTpl = me.loadTemplate(path.join(__dirname, 'html/tpl/base.html'));
    var tpl = dot.template(baseTpl, null, {
        body: featureTpl
    });
    
    // loop through each feature result
    async.each(stats.results, function(featureReport, callback) {
        var output = tpl({
            title: 'Test Results',
            back: 'index.html',
            feature: featureReport,
            fn: {
                duration: me.getDuration,
                date: moment
            }
        });
        me.writeTemplate(path.join(dir, featureReport.htmlFile), output, function(err) {
            callback(err, dir);
        });
    },
    function(err) {
        cb(err, dir);
    });
};
Reporter.prototype.createParamsPage = function(dir, cb) {
    var me = this;
    var parametersTpl = me.loadTemplate(path.join(__dirname, '/html/tpl/parameters.html'));
    var baseTpl = me.loadTemplate(path.join(__dirname, 'html/tpl/base.html'));
    var tpl = dot.template(baseTpl, null, {
        body: parametersTpl
    });
    var options = me.runner.options;    
    var output = tpl({
        title: 'Test Parameters',
        options: me.getOptions(options),
        profiles: me.getProfiles(options),
        featureFiles: options.featureFiles,
        stepFiles: options.stepFiles,
        sourceFiles: options.sourceFiles,
        fn: {
            utils: utils,
            fileType: me.getFileType,
            duration: me.getDuration,
            date: moment
        }
    });
    me.writeTemplate(path.join(dir, 'parameters.html'), output, function(err) {
        cb(err, dir);
    });
};
Reporter.prototype.createTagPage = function(dir, stats, cb) {
    var me = this;
    var parametersTpl = me.loadTemplate(path.join(__dirname, '/html/tpl/tag_usage.html'));
    var baseTpl = me.loadTemplate(path.join(__dirname, 'html/tpl/base.html'));
    var tpl = dot.template(baseTpl, null, {
        body: parametersTpl
    });
    var output = tpl({
        title: 'Tag Usage',
        stats: stats,
        tagStats: me.getTagStats(stats),
        fn: {
            utils: utils,
            fileType: me.getFileType,
            duration: me.getDuration,
            date: moment
        }
    });
    me.writeTemplate(path.join(dir, 'tag_usage.html'), output, function(err) {
        cb(err, dir);
    });
};
Reporter.prototype.loadTemplate = function(path) {
    var str = fs.readFileSync(path);
    return str.toString();
};
Reporter.prototype.writeTemplate = function(path, tpl, cb) {
    fs.writeFile(path, tpl, function(err) {
        if(err) {
            logger.error('[html reporter] Failed writing file ' + path );
            console.log('Failed writing file ' + path);
            console.error(err);
        }
        cb();
    });
};
Reporter.prototype.getDuration = function(ms) {
      var parts = [];
      var seconds = Math.round(ms / 10) / 100;
      var h = Math.floor(seconds / 3600);
      var m = Math.floor((seconds - (h * 3600)) / 60);
      var s = seconds - (h * 3600) - (m * 60);
      if (h > 0) { parts.push(h + 'h'); }
      if (m > 0) { parts.push(m + 'm'); }
      if (s > 0 || !parts.length) { parts.push(s + 's'); }
    
      return parts.join(' ');
};
Reporter.prototype.getFileName = function(feature, index) {
    return 'feature_' + index + '_' + (feature||'').toLowerCase().replace(/ /g,'_').replace(/[^a-zA-Z0-9\_\-]/g,'') + '.html';
};
Reporter.prototype.getOptions = function(options) {
    var output = [],
        exclusions = ['featureFiles', 'stepFiles', 'sourceFiles', 'browsers'];
    utils.each(options, function(value, key) {
        if(exclusions.indexOf(key) < 0) {
            output.push({
                key: key,
                value: value
            });
        }
    });
    return output;
};
Reporter.prototype.getProfiles = function(profiles) {
    return profiles;
};
Reporter.prototype.getFileType = function(file) {
    var types = {
        coffee: 'Coffeescript',
        coffeescript: 'Coffeescript',
        js: 'Javascript',
        feature: 'Feature'
    };
    var ext = path.extname(file);
    return ext ? types[ext.substr(1)] || '' : '';
};
Reporter.prototype.getTagStats = function(stats) {
    var featureTags = [], tagMap = {};
    utils.each(stats.results, function(feature) {
        utils.each(feature.annotations, function(annotation) {
            if(!tagMap[annotation.txt]) {
                // new tag entry
                tagMap[annotation.txt] = {
                    annotation: annotation,
                    stats: {
                        features: 1,
                        scenarios: feature.stats.scenarios.total,
                        duration: feature.stats.duration,
                        steps: feature.stats.tests,
                        passes: feature.stats.passes,
                        failures: feature.stats.failures,
                        pending: feature.stats.pending
                    },
                    features: [feature]
                };
                featureTags.push(tagMap[annotation.txt]);
            } else {
                // update
                tagMap[annotation.txt].stats.features++;
                tagMap[annotation.txt].stats.scenarios += feature.stats.scenarios.total;
                tagMap[annotation.txt].stats.duration += feature.stats.duration;
                tagMap[annotation.txt].stats.steps += feature.stats.tests;
                tagMap[annotation.txt].stats.passes += feature.stats.passes;
                tagMap[annotation.txt].stats.failures += feature.stats.failures;
                tagMap[annotation.txt].stats.pending += feature.stats.pending;
                tagMap[annotation.txt].features.push(feature);
            }
        });
    });
    return featureTags;
};
Reporter.prototype.getScreenshot = function(test) { 
    var me = this,
        reporterData = me.getTopSuite(test.parent)._reporterData;
    reporterData.driver.getScreenshot(function(err, image) {
        if(!err) {
            me.screenshots.push({
                test: test,
                feature: test.feature,
                screenshot: image
            });
        }
    });
};
Reporter.prototype.getTopSuite = function(suite) {
    var parent = suite;
    while(parent && !parent.root) {
        parent = parent.parent;
    }
    return parent ? parent.suites[0] : null;
};

exports = module.exports = { name: 'html', proto: Reporter };
