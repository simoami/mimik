/*jshint node:true*/

'use strict';
var Collection = function(keyFn) {
    this.items = [];
    this.map = {};
    this.length = 0;
    if(keyFn) {
        this.getKey = keyFn;
    }
};

Collection.prototype.getKey = function(item) {
    return item.id;
};

Collection.prototype.add = function(key, item) {
    if(typeof item === 'undefined') {
        item = key;
        key = this.getKey(item);
    }
    if(typeof this.map[key] !== 'undefined') {
        return this.replace(key, item);
    }
    this.map[key] = item;
    this.items.push(item);
    this.length++;
    return item;
};

Collection.prototype.addAll = function(items) {
    if(arguments.length > 1 || Array.isArray(items)){
        var args = arguments.length > 1 ? arguments : items;
        for(var i = 0, len = args.length; i < len; i++){
            this.add(args[i]);
        }
    } else {
        for(var key in items){
            if(typeof items[key] !== 'function'){
                this.add(key, items[key]);
            }
        }
    }
};

Collection.prototype.each = function(fn, scope) {
    var items = [].concat(this.items); // creates a copy to guarantee unchanged collection
    for(var i = 0, len = items.length; i < len; i++){
        if(fn.call(scope || items[i], items[i], i, len) === false){
            break;
        }
    }
};

Collection.prototype.find = function(fn, scope) {
    var item, key;
    for(var i = 0, len = this.items.length; i < len; i++){
        item = this.items[i];
        key = this.getKey(item);
        if(fn.call(scope || item, item, key)){
            return this.items[i];
        }
    }
    return null;
};

Collection.prototype.insert = function() {

};

Collection.prototype.remove = function(item) {
    this.removeAt(this.indexOf(item));
};

Collection.prototype.removeAt = function(idx) {
    if(idx >= 0 && idx < this.length){
        var item = this.items[idx];
        this.items.splice(idx, 1);
        var key = this.getKey(item);
        if(typeof key !== 'undefined'){
            delete this.map[key];
        }
        this.length--;
        return item;
    }
    return false;
};

Collection.prototype.getCount = function() {
    return this.length;
};

Collection.prototype.indexOf = function(item) {
    return this.items.indexOf(item);
};

Collection.prototype.get = function(key) {
    if(typeof key === 'number' || !isNaN(+key)) {
        return this.items[+key];
    }
    return this.map[key];
};

Collection.prototype.has = function(item) {
    var key = this.getKey(item);
    return key ? !!this.get(key) : this.contains(item);
};

Collection.prototype.getAt = function(idx) {
    return this.items[idx];
};

Collection.prototype.contains = function(item) {
    return !!~this.indexOf(item);
};

Collection.prototype.clear = function() {
    this.items = [];
    this.map = {};
    this.length = 0;
};

Collection.prototype.first = function() {
    return this.items[0];
};

Collection.prototype.last = function() {
    return this.items[this.length -1];
};

Collection.prototype.filter = function() {

};

Collection.prototype.filterBy = function() {

};
Collection.prototype.findIndexBy = function(fn, scope) {
    var item;
    for(var i = 0, len = this.items.length; i < len; i++){
        item = this.items[i];
        if(fn.call(scope || item, item, this.getKey(item), i)){
            return i;
        }
    }
    return -1;
};

Collection.prototype.replace = function(key, item) {
    if(typeof item === 'undefined') {
        item = key;
        key = this.getKey(item);
    }
    if(typeof this.map[key] === 'undefined') {
        return this.add(key, item);
    }
    var idx = this.indexOfKey(key);
    this.items[idx] = item;
    this.map[key] = item;
    return item;
};

module.exports = Collection;
