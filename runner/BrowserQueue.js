/**
 * Browser Queue
 * implements a basic serial queue to schedule the next free browser for e-to-e testing
 * Usage:
 *      var bq = new BQ(['one','two','three']);
 *      bq.next(); // returns one
 *      bq.next(); // returns two
 *      bq.release('two'); 
 *      bq.next(); // returns three
 *      bq.next(); // returns two
 *      bq.next(); // returns null
 */
var BQ = function(elements) {
  this.elements = elements;
  this.used = [];
  this.available = Array.prototype.concat([],elements);
};

BQ.prototype.next = function() {
  var b = null;
  if(this.available.length) {
      b = this.available.shift();
      this.used.push(b);
  }
  return b;
};

BQ.prototype.release = function(b) {
   var index = this.used.indexOf(b);
   this.used.splice(index, 1);
   this.available.push(b);
}

BQ.prototype.reset = function() {
  this.used = [];
  this.available = Array.prototype.concat([],elements);
}

exports = module.exports = BQ;
