/*jshint node:true*/
'use strict';
/**
 * Usage Examples
 *      client.wait.for.element('.test').to.become.visible()
 *
 *      // Getters and Checks
 *      client.get.elements('.row').count()
 *      client.get.element('.row').text()
 *      client.get.element('.row').value()
 *      client.get.element('.row').class()
 *      client.get.element('.row').style('color')
 *      client.get.element('.row').size()
 *      client.get.element('.row').width()
 *      client.get.element('.row').height()
 *      
 *      client.is.element('.test').checked()
 *      client.is.element('.test').unchecked()
 *      client.is.element('.test').selected()
 *      client.is.element('.test').not.selected()
 *      client.is.element('.test').enabled()
 *      client.is.element('.test').disabled()
 *      
 *      client.element('.test').has.class('mask')
 *      client.element('.content').contains.text('Welcome')
 *      
 *      
 *      // Actions
 *      client.visit('www.google.com')
 *      client.upload('.file-input', 'test.xls')
 *      client.element('.test').click() or [ client.click('.test') ] or [ client.click.element('.test') ]
 *      client.scroll.to.element('.footer')
 *      
 *      // Wait syntax
 *      client.wait.for.element('.test').to.become.visible() or [ client.when.element('.test').is.visible() ]
 *      client.wait.for.element('.test').to.exist() or [ client.when.element('.test').exists() ]
 *      client.wait.for.element('.test').to.contain.text('Welcome') or [ client.when.element('.test').contains.text('Welcome') ]
 *      
 *      
 *      // Wait then take action
 *      client.wait.for.element('.loading-mask').to.be.hidden().then.click('.something')
 *      client.when.element('.button').is.visible().then.click()
 *      
 *      
 *      
 *      // Plugins and Configuration
 *      // Loading an extjs3 plugin config:
 *      client.use(extjs3)
 *      
 *      // gives you additional capabilities.
 *      client.extjs3.grid('.salesorders').paginate(2)
 *      client.extjs3.grid('.salesorders').paginate('last')
 *      client.extjs3.grid('.salesorders').selectRow('first')
 *      client.extjs3.grid('.lineitems').edit(row, column)  [column can be a position, 'first' or 'last' keywords, or label of the column]
 *      ...
 *      
 *      // Loading the kung fu plugin:
 *      client.use(kungfu)
 *      
 *      // gives you kung fu skills.
 *      client.kungfu.opponent('.agent-smith').sidekick()
 *      
 *      
 *      
 *      
 *      
 *      
 *      //////
 *      
 *      client.wait.for('.test').to.become.visible()
 *      
 *      
 *      client.get('.row').count()
 *      client.get('.row').text()
 *      
 *      client.is('.test').checked()
 *      client.is('.test').unchecked()
 *      
 *      client.does('.test').have.class('mask')
 *      client.element('.test').has.class('mask')
 *      
 *      client.does/do('.content').contains.text('Welcome')
 *      
 *      client.click('.test') or [ client.click.element('.test') ]
 *      
 *      client.wait.for('.loading-mask').to.be.hidden().then.click('.something')
 *      client.wait.for.element('.loading-mask').to.be.hidden().then.click('.something')
 *      
 */
var utils = require('../../../lib/utils'),
    Queue = require('../../../lib/Queue'),
    //webdriverio = require('webdriverio'),
    wd = require('wd'),
    SPECIAL_KEYS = require('./SpecialKeys');


var Client = {};

Client.SPECIAL_KEYS = SPECIAL_KEYS;

Client.init = function(profile) {
    // wd will default to local firefox if no options are specified
    this.remote = wd.asyncRemote(this.profile);
    this.addCommands();
};

Client.start = function() {
    if(!this.remote) {
        throw new Error('Cannot start client session. Client was not initialized.');
    }
    this.remote.init.apply(this.remote, arguments);
};

Client.stop = function() {
    if(!this.remote) {
        throw new Error('Cannot start client session. Client was not initialized.');
    }
    this.remote.quit.apply(this.remote, arguments);    
};

Client.addCommands = function buildClient() {
    var me = this;
    utils.each(METHOD_MAPPINGS, function(entry) {
        // direct mapping for string entries
        if(typeof entry === 'string') {
            entry = { name: entry, handler: me.remote[entry].bind(me.remote) };
        }
        Client[entry.name] = function() {
            entry.handler.apply(me, arguments);
            return me; // return self for chaining
        };
    });
};

/* MAPPINGS */

var commands = {};

/**
 * WebDriver Methods
 */

/**
 * Enable support for special keys within text messages using [keyname] syntax. e.g. type('mimik[enter]')
 *
 */

commands.type = function(text, cb) {
     var el = flag(this, 'element');
     if(el) {
          text = (text||'').replace(/\[([^\]]+)\]/g, function(tag, key, pos, all) {
              key = key.toLowerCase();
              if(!SPECIAL_KEYS[key]) {
                  throw new Error('Special key \'' + tag + '\' not recognized in text \'' + all + '\''); 
              }
              return SPECIAL_KEYS[key];
          });
          return this.remote.type(el, text, cb);
    }
    cb(new Error('Current element missing'));
};

/**
 * clear(element, cb) -> cb(err)
 * Clears content from the current form element
 *
 */
commands.clear = function(cb) {
    var el = flag(this, 'element');
    if(el) {
        return this.remote.clear(el, cb);
    }
    cb(new Error('Current element missing'));
};

 commands.visit = function (url, options, cb) {
     if(typeof options === 'function') {
         cb = options;
         options = undefined;
     }
     url = utils.normalize(url);
     this.remote.get(url, options, cb);
 };
 
 commands.element = function (selector, cb) {
     var me = this;
     if(!selector) {
         throw new Error('element() expects a parameter'); 
     }
     var wait = flag(this, 'wait');
     var fn = this.remote.elementByCss;
     if(wait) {
         fn = this.remote.waitForElementByCss;
     }
     var callback = function(err, el) {
         if(err) {
             el = null;
         }
         flag(me, 'element', el);
         cb(err);
     };
     fn.call(this.remote, selector, callback);
     return this;
};

/**
 * text(cb) -> cb(err, text)
 * get the visible text of the current element
 *
 */
commands.text = function(cb) {
    var el = flag(this, 'element');
    if(el) {
        return this.remote.text(el, cb);
    }
    cb(new Error('Current element missing'));
};

/**
 * getTagName(cb) -> cb(err, name)
 * Get tag name of current element
 *
 */
commands.getTagName = function(cb) {
    var el = flag(this, 'element');
    if(el) {
        return this.remote.getTagName(el, cb);
    }
    cb(new Error('Current element missing'));
};
    
/**
 * getAttribute(attrName, cb) -> cb(err, value)
 * Get requested attribute of current element
 *
 */
commands.getAttribute = function(attribute, cb) {
    var el = flag(this, 'element');
    if(el) {
        return this.remote.getAttribute(el, attribute, cb);
    }
    cb(new Error('Current element missing'));
};

/**
 * getValue(cb) -> cb(err, value)
 * Get value of current form element (using 'value' attribute)
 *
 */
commands.getValue = function(cb) {
    commands.getAttribute('value', cb);
};

/**
 * getInnerHtml(cb) -> cb(err, value)
 * Get the innerHTML of current element (using 'innerHTML' attribute)
 *
 */
commands.getInnerHtml = function(cb) {
    commands.getAttribute('innerHTML', cb);
};

/**
 * moveTo(xoffset, yoffset, cb) -> cb(err)
 * Move the mouse by an offset of the specificed element. If no element is specified, the move is relative to the current mouse cursor. If an element is provided but no offset, the mouse will be moved to the center of the element. If the element is not visible, it will be scrolled into view.
 * xoffset and y offset are optional.
 */
commands.moveTo = function(xoffset, yoffset, cb) {
    var el = flag(this, 'element');
    this.remote.moveTo(el, xoffset, yoffset, cb);
};

/**
 * buttonDown(button ,cb) -> cb(err)
 * button is optional. defaults to left button
 * @param button 'left', 'middle' or 'right'. or their numeric representation: 0, 1 or 2
 *
 */
commands.buttonDown = function(button, cb) {
    if(utils.isFunction(button)) {
        cb = button;
        button = 'left';
    }
    var buttons = {
        left: 0,
        middle: 1,
        right: 2
    };
    button = typeof buttons[button] !== 'undefined' ? buttons[button] : button;

    this.remote.buttonDown(button, cb);
};

/**
 * buttonUp(button, cb) -> cb(err)
 * button is optional. defaults to left button
 * @param button 'left', 'middle' or 'right'. or their numeric representation: 0, 1 or 2
 *
 */
commands.buttonUp = function(button, cb) {
    if(utils.isFunction(button)) {
        cb = button;
        button = 'left';
    }
    var buttons = {
        left: 0,
        middle: 1,
        right: 2
    };
    button = typeof buttons[button] !== 'undefined' ? buttons[button] : button;

    this.remote.buttonUp(button, cb);
};

/**
 * click(button, cb) -> cb(err)
 * Click on current element if command was preceeded by an element locator. e.g. element(selector).click()
 * otherwise click at the last position by moveTo()
 * 
 * @param button 'left', 'middle' or 'right'. or their numeric representation: 0, 1 or 2
 */
commands.click = function(button, cb) {

    if(utils.isFunction(button)) {
        cb = button;
        button = 'left';
    }
    
    var el = flag(this, 'element');
    if(el) {
        // an element is present. click on the element directly
        return this.remote.clickElement(el, cb);
    }
    var buttons = {
        left: 0,
        middle: 1,
        right: 2
    };
    button = typeof buttons[button] !== 'undefined' ? buttons[button] : button;

    this.remote.click(button, cb);
};

/**
 * doubleclick(cb) -> cb(err)
 *
 */
commands.doubleClick = function(cb) {
    this.remote.doubleclick(cb);
};

/**
 * submit(cb) -> cb(err)
 * Submit a `FORM` element.
 *
 */
commands.submit = function(cb) {
    var el = flag(this, 'element');
    if(el) {
        return this.remote.submit(el, cb);
    }
    cb(new Error('Current element missing'));
};

/**
 * keys(keys, cb) -> cb(err)
 * Press keys (keys may still be down at the end of command).
 *
 */
commands.keys = function(keys, cb) {
    if(!utils.isArray(keys)) {
        keys = [ keys ];
    }
    utils.each(keys, function(key, idx) {
        keys[idx] = (key||'').replace(/\[([^\]]+)\]/g, function(tag, key, pos, all) {
            key = key.toLowerCase();
            if(!SPECIAL_KEYS[key]) {
                throw new Error('Special key \'' + tag + '\' not recognized in text \'' + all + '\''); 
            }
            return SPECIAL_KEYS[key];
        });
    });
    this.remote.keys(keys, cb);
};
/**
 * title(cb) -> cb(err, title)
 * gets the title of the current html page
 *
 */
commands.title = function(cb) {
    this.remote.title(cb);
};

/**
 * source(cb) -> cb(err, source)
 * gets the title of the current html page
 *
 */
commands.source = function(cb) {
    this.remote.source(cb);
};


/**
 * alertText(cb) -> cb(err, text)
 * Gets the text of the currently displayed JavaScript alert(), confirm(), or prompt() dialog.
 *
 */
commands.alertText = function(cb) {
    this.remote.alertText(cb);
};

/**
 * alertKeys(keys, cb) -> cb(err)
 * Sends keystrokes to a JavaScript prompt() dialog.
 */
commands.alertKeys = function(keys, cb) {
    this.remote.alertKeys(keys, cb);
};

/**
 * acceptAlert(cb) -> cb(err)
 * Accepts the currently displayed alert dialog. Usually, this is equivalent to clicking on the 'OK' button in the dialog.
 */
commands.acceptAlert = function(cb) {
    this.remote.acceptAlert(cb);
};

/**
 * dismissAlert(cb) -> cb(err)
 * Dismisses the currently displayed alert dialog. For confirm() and prompt() dialogs, this is equivalent to clicking the 'Cancel' button. For alert() dialogs, this is equivalent to clicking the 'OK' button.
 */
commands.dismissAlert = function(cb) {
    this.remote.dismissAlert(cb);
};

/**
 * url(cb) -> cb(err, url)
 * Gets the url of the current page
 */
commands.url = function(cb) {
    this.remote.url(cb);
};

/**
 * allCookies() -> cb(err, cookies)
 *
 * @jsonWire GET /session/:sessionId/cookie
 */
commands.allCookies = function(cb) {
    this.remote.allCookies(cb);
};

/**
 * setCookie(cookie, cb) -> cb(err)
 * cookie example:
 *  {name:'fruit', value:'apple'}
 * Optional cookie fields:
 *  path, domain, secure, expiry
 *
 */
commands.setCookie = function(cookie, cb) {
    this.remote.setCookie(cookie, cb);
};

/**
 * deleteAllCookies(cb) -> cb(err)
 *
 */
commands.deleteAllCookies = function(cb) {
    this.remote.deleteAllCookies(cb);
};

/**
 * deleteCookie(name, cb) -> cb(err)
 *
 */
commands.deleteCookie = function(name, cb) {
    this.remote.deleteCookie(name, cb);
};

/**
 * getSize(cb) -> cb(err, size)
 * Gets the size of the current element
 *
 */
commands.getSize = function(cb) {
    var el = flag(this, 'element');
    if(el) {
        return this.remote.getSize(el, cb);
    }
    cb(new Error('Current element missing'));
};



var WEB_ELEMENT_FUNCTIONS = [
       'click', 'sendKeys', 'getTagName', 'getCssValue', 'getAttribute', 'getText',
       'getSize', 'getLocation', 'isEnabled', 'isSelected', 'submit', 'clear',
       'isDisplayed', 'getOuterHtml', 'getInnerHtml', 'toWireValue'];

var METHOD_MAPPINGS = [
    //{ name: 'type', handler: commands.type },
    //{ name: 'visit', handler: commands.visit },
    //{ name: 'element', handler: commands.element },
    'elementByCss',
    'elementsByCss',
    'takeScreenshot',
    'saveScreenshot'
    // 'acceptAlert',
   // 'activebehavior',
   // 'alertKeysbehavior',
   // 'alertTextbehavior',
   // 'allCookiesbehavior',
   // 'altSessionCapabilitiesbehavior',
   // 'backbehavior',
   // 'backgroundAppbehavior',
   // 'buttonDownbehavior',
   // 'buttonUpbehavior',
   // 'chainbehavior',
   // 'clearbehavior',
   // 'clearLocalStoragebehavior',
   // 'clickbehavior',
   // 'clickElementbehavior',
   // 'closebehavior',
   // 'closeAppbehavior',
   // 'complexFindbehavior',
   // 'complexFindInAppbehavior',
   // 'configureHttpbehavior',
   // 'contextbehavior',
   // 'contextsbehavior',
   // 'currentContextbehavior',
   // 'deleteAllCookiesbehavior',
   // 'deleteCookiebehavior',
   // 'detachbehavior',
   // 'deviceKeyEventbehavior',
   // 'dismissAlertbehavior',
   // 'displayedbehavior',
   // 'doubleclickbehavior',
   // 'elementbehavior',
   // 'elementByAccessibilityIdbehavior',
   // 'elementByAccessibilityIdIfExistsbehavior',
   // 'elementByAccessibilityIdOrNullbehavior',
   // 'elementByAndroidUIAutomatorbehavior',
   // 'elementByAndroidUIAutomatorIfExistsbehavior',
   // 'elementByAndroidUIAutomatorOrNullbehavior',
   // 'elementByClassNamebehavior',
   // 'elementByClassNameIfExistsbehavior',
   // 'elementByClassNameOrNullbehavior',
   // 'elementByCssbehavior',
   // 'elementByCssIfExistsbehavior',
   // 'elementByCssOrNullbehavior',
   // 'elementByCssSelectorbehavior',
   // 'elementByCssSelectorIfExistsbehavior',
   // 'elementByCssSelectorOrNullbehavior',
   // 'elementByIdbehavior',
   // 'elementByIdIfExistsbehavior',
   // 'elementByIdOrNullbehavior',
   // 'elementByIosUIAutomationbehavior',
   // 'elementByIosUIAutomationIfExistsbehavior',
   // 'elementByIosUIAutomationOrNullbehavior',
   // 'elementByLinkTextbehavior',
   // 'elementByLinkTextIfExistsbehavior',
   // 'elementByLinkTextOrNullbehavior',
   // 'elementByNamebehavior',
   // 'elementByNameIfExistsbehavior',
   // 'elementByNameOrNullbehavior',
   // 'elementByPartialLinkTextbehavior',
   // 'elementByPartialLinkTextIfExistsbehavior',
   // 'elementByPartialLinkTextOrNullbehavior',
   // 'elementByTagNamebehavior',
   // 'elementByTagNameIfExistsbehavior',
   // 'elementByTagNameOrNullbehavior',
   // 'elementByXPathbehavior',
   // 'elementByXPathIfExistsbehavior',
   // 'elementByXPathOrNullbehavior',
   // 'elementIfExistsbehavior',
   // 'elementOrNullbehavior',
   // 'elementsbehavior',
   // 'elementsByAccessibilityIdbehavior',
   // 'elementsByAndroidUIAutomatorbehavior',
   // 'elementsByClassNamebehavior',
   // 'elementsByCssbehavior',
   // 'elementsByCssSelectorbehavior',
   // 'elementsByIdbehavior',
   // 'elementsByIosUIAutomationbehavior',
   // 'elementsByLinkTextbehavior',
   // 'elementsByNamebehavior',
   // 'elementsByPartialLinkTextbehavior',
   // 'elementsByTagNamebehavior',
   // 'elementsByXPathbehavior',
   // 'enabledbehavior',
   // 'endCoveragebehavior',
   // 'endTestCoveragebehavior',
   // 'endTestCoverageForAppbehavior',
   // 'equalsElementbehavior',
   // 'evalbehavior',
   // 'executebehavior',
   // 'executeAsyncbehavior',
   // 'flickbehavior',
   // 'forwardbehavior',
   // 'framebehavior',
   // 'getbehavior',
   // 'getAppStringsbehavior',
   // 'getAttributebehavior',
   // 'getComputedCSSbehavior',
   // 'getComputedCssbehavior',
   // 'getCurrentActivitybehavior',
   // 'getCurrentDeviceActivitybehavior',
   // 'getGeoLocationbehavior',
   // 'getLocalStorageKeybehavior',
   // 'getLocationbehavior',
   // 'getLocationInViewbehavior',
   // 'getNetworkConnectionbehavior',
   // 'getOrientationbehavior',
   // 'getPageIndexbehavior',
   // 'getSessionIDbehavior',
   // 'getSessionIdbehavior',
   // 'getSizebehavior',
   // 'getTagNamebehavior',
   // 'getValuebehavior',
   // 'getWindowPositionbehavior',
   // 'getWindowSizebehavior',
   // 'hasElementbehavior',
   // 'hasElementByAccessibilityIdbehavior',
   // 'hasElementByAndroidUIAutomatorbehavior',
   // 'hasElementByClassNamebehavior',
   // 'hasElementByCssbehavior',
   // 'hasElementByCssSelectorbehavior',
   // 'hasElementByIdbehavior',
   // 'hasElementByIosUIAutomationbehavior',
   // 'hasElementByLinkTextbehavior',
   // 'hasElementByNamebehavior',
   // 'hasElementByPartialLinkTextbehavior',
   // 'hasElementByTagNamebehavior',
   // 'hasElementByXPathbehavior',
   // 'hideDeviceKeyboardbehavior',
   // 'hideKeyboardbehavior',
   // 'initbehavior',
   // 'installAppbehavior',
   // 'installAppOnDevicebehavior',
   // 'isAppInstalledbehavior',
   // 'isAppInstalledOnDevicebehavior',
   // 'isDisplayedbehavior',
   // 'isEnabledbehavior',
   // 'isSelectedbehavior',
   // 'isVisiblebehavior',
   // 'keysbehavior',
   // 'launchAppbehavior',
   // 'lockbehavior',
   // 'lockDevicebehavior',
   // 'logbehavior',
   // 'logTypesbehavior',
   // 'maximizebehavior',
   // 'moveTobehavior',
   // 'newElement',
   // 'newWindowbehavior',
   // 'noopbehavior',
   // 'openNotificationsbehavior',
   // 'performMultiTouchbehavior',
   // 'performMultiTouchActionbehavior',
   // 'performTouchbehavior',
   // 'performTouchActionbehavior',
   // 'pressDeviceKeybehavior',
   // 'pullFilebehavior',
   // 'pullFileFromDevicebehavior',
   // 'pushFilebehavior',
   // 'pushFileToDevicebehavior',
   // 'quitbehavior',
   // 'refreshbehavior',
   // 'removeAppbehavior',
   // 'removeAppFromDevicebehavior',
   // 'removeLocalStorageKeybehavior',
   // 'resetAppbehavior',
   // 'rotatebehavior',
   // 'rotateDevicebehavior',
   // 'safeEvalbehavior',
   // 'safeExecutebehavior',
   // 'safeExecuteAsyncbehavior',
   // 'sauceJobStatusbehavior',
   // 'sauceJobUpdatebehavior',
   // 'scrollbehavior',
   // 'sessionCapabilitiesbehavior',
   // 'sessionsbehavior',
   // 'setAsyncScriptTimeoutbehavior',
   // 'setCommandTimeoutbehavior',
   // 'setCookiebehavior',
   // 'setGeoLocationbehavior',
   // 'setHTTPInactivityTimeoutbehavior',
   // 'setHttpTimeoutbehavior',
   // 'setImmediateValuebehavior',
   // 'setImmediateValueInAppbehavior',
   // 'setImplicitWaitTimeoutbehavior',
   // 'setLocalStorageKeybehavior',
   // 'setNetworkConnectionbehavior',
   // 'setOrientationbehavior',
   // 'setPageLoadTimeoutbehavior',
   // 'setWaitTimeoutbehavior',
   // 'setWindowPositionbehavior',
   // 'setWindowSizebehavior',
   // 'shakebehavior',
   // 'shakeDevicebehavior',
   // 'sleepbehavior',
   // 'sourcebehavior',
   // 'statusbehavior',
   // 'submitbehavior',
   // 'tapElementbehavior',
   // 'textbehavior',
   // 'textPresentbehavior',
   // 'titlebehavior',
   // 'toggleAirplaneModebehavior',
   // 'toggleAirplaneModeOnDevicebehavior',
   // 'toggleDatabehavior',
   // 'toggleDataOnDevicebehavior',
   // 'toggleFlightModebehavior',
   // 'toggleLocationServicesbehavior',
   // 'toggleLocationServicesOnDevicebehavior',
   // 'toggleWiFibehavior',
   // 'toggleWiFiOnDevicebehavior',
   // 'typebehavior',
   // 'uploadFilebehavior',
   // 'urlbehavior',
   // 'waitForbehavior',
   // 'waitForConditionbehavior',
   // 'waitForConditionInBrowserbehavior',
   // 'waitForElementbehavior',
   // 'waitForElementByAccessibilityIdbehavior',
   // 'waitForElementByAndroidUIAutomatorbehavior',
   // 'waitForElementByClassNamebehavior',
   // 'waitForElementByCssbehavior',
   // 'waitForElementByCssSelectorbehavior',
   // 'waitForElementByIdbehavior',
   // 'waitForElementByIosUIAutomationbehavior',
   // 'waitForElementByLinkTextbehavior',
   // 'waitForElementByNamebehavior',
   // 'waitForElementByPartialLinkTextbehavior',
   // 'waitForElementByTagNamebehavior',
   // 'waitForElementByXPathbehavior',
   // 'waitForElementsbehavior',
   // 'waitForElementsByAccessibilityIdbehavior',
   // 'waitForElementsByAndroidUIAutomatorbehavior',
   // 'waitForElementsByClassNamebehavior',
   // 'waitForElementsByCssbehavior',
   // 'waitForElementsByCssSelectorbehavior',
   // 'waitForElementsByIdbehavior',
   // 'waitForElementsByIosUIAutomationbehavior',
   // 'waitForElementsByLinkTextbehavior',
   // 'waitForElementsByNamebehavior',
   // 'waitForElementsByPartialLinkTextbehavior',
   // 'waitForElementsByTagNamebehavior',
   // 'waitForElementsByXPathbehavior',
   // 'waitForJsConditionbehavior',
   // 'waitForVisiblebehavior',
   // 'waitForVisibleByAccessibilityIdbehavior',
   // 'waitForVisibleByAndroidUIAutomatorbehavior',
   // 'waitForVisibleByClassNamebehavior',
   // 'waitForVisibleByCssbehavior',
   // 'waitForVisibleByCssSelectorbehavior',
   // 'waitForVisibleByIdbehavior',
   // 'waitForVisibleByIosUIAutomationbehavior',
   // 'waitForVisibleByLinkTextbehavior',
   // 'waitForVisibleByNamebehavior',
   // 'waitForVisibleByPartialLinkTextbehavior',
   // 'waitForVisibleByTagNamebehavior',
   // 'waitForVisibleByXPathbehavior',
   // 'windowbehavior',
   // 'windowHandlebehavior',
   // 'windowHandlesbehavior',
   // 'windowNamebehavior',
   // 'windowSize'
 ];
 

function flag(obj, key, value) {
  var flags = obj.__flags || (obj.__flags = Object.create(null));
  if (arguments.length === 3) {
    flags[key] = value;
  } else {
    return flags[key];
  }
}
function addProperty(ctx, name, getter) {
  Object.defineProperty(ctx, name,
    { 
        get: function () {
            var result = getter.call(this);
            return result === undefined ? this : result;
        },
        configurable: true
    });
}
function addMethod(ctx, name, method) {
  ctx[name] = function () {
      var result = method.apply(this, arguments);
      return result === undefined ? this : result;
  };
}
function addAsyncMethod(ctx, name, method) {
  ctx[name] = Queue.chain(method);
}

[
  'a', 'an', 'the', 'to', 'be', 'become', 'been',
  'is', 'and', 'has', 'have',
  'with', 'that', 'at',
  'of', 'for', 'then'
].forEach(function(chain) {
    addProperty(Client, chain, function () {
      return this;
    });
});

var not = function () {
    flag(Client, 'reverse', true);
};

var wait = function () {
    flag(Client, 'wait', true);
};

var call = function(cb) {
  if(cb) { cb(); }
};


var visible = function() {
    var reverse = flag(this, 'reverse');
    var el = flag(this, 'element');
    var wait = flag(this, 'wait');
    console.log(wait ? 'waiting for ' + el + ' to ': el + ' is', reverse ? 'not' : '', wait ? 'be':'', 'visible');
};

addProperty(Client, 'not', not);
addProperty(Client, 'wait', wait);

addMethod(Client, 'visible', visible);
addAsyncMethod(Client, 'call', call);

addAsyncMethod(Client, 'element', commands.element);
addAsyncMethod(Client, 'visit', commands.visit);
addAsyncMethod(Client, 'type', commands.type);
addAsyncMethod(Client, 'clear', commands.clear);
addAsyncMethod(Client, 'text', commands.text);
addAsyncMethod(Client, 'getTagName', commands.getTagName);
addAsyncMethod(Client, 'getAttribute', commands.getAttribute);
addAsyncMethod(Client, 'getValue', commands.getValue);
addAsyncMethod(Client, 'getInnerHtml', commands.getInnerHtml);
addAsyncMethod(Client, 'moveTo', commands.moveTo);
addAsyncMethod(Client, 'buttonUp', commands.buttonUp);
addAsyncMethod(Client, 'buttonDown', commands.buttonDown);
addAsyncMethod(Client, 'click', commands.click);
addAsyncMethod(Client, 'doubleClick', commands.doubleClick);
addAsyncMethod(Client, 'submit', commands.submit);
addAsyncMethod(Client, 'keys', commands.keys);
addAsyncMethod(Client, 'title', commands.title);
addAsyncMethod(Client, 'source', commands.source);
addAsyncMethod(Client, 'alertText', commands.alertText);
addAsyncMethod(Client, 'alertKeys', commands.alertKeys);
addAsyncMethod(Client, 'acceptAlert', commands.acceptAlert);
addAsyncMethod(Client, 'dismissAlert', commands.dismissAlert);
addAsyncMethod(Client, 'url', commands.url);
addAsyncMethod(Client, 'allCookies', commands.allCookies);
addAsyncMethod(Client, 'setCookie', commands.setCookie);
addAsyncMethod(Client, 'deleteAllCookies', commands.deleteAllCookies);
addAsyncMethod(Client, 'deleteCookie', commands.deleteCookie);
addAsyncMethod(Client, 'getSize', commands.getSize);


module.exports = Client;
