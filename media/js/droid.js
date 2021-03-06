// Copyright The Android Open Source Project
// All Rights Reserved.

/**
 * @fileoverview Droid Web UI library. 
 *
 * NOTE(dart) This library only supports firefox/mozilla.
 *
 * MochiKit is used here. <http://www.mochikit.com/> 
 *
 * @author dart@google.com (Keith Dart)
 */



/**
 * Places object as sole object in some content div.
 *
 * @param {String} id ID of element to place object into.
 * @param {Node} obj The DOM node to be placed. If you pass a null value
 * it is the same as removing content from the content object.
 */
function placeContent(id, obj) {
  var content = document.getElementById(id);
  if (content.hasChildNodes()) {
    if (obj) {
      content.replaceChild(obj, content.lastChild);
    } else {
      content.removeChild(content.lastChild);
    };
  } else {
    if (obj) {
      content.appendChild(obj);
    };
  };
};

/**
 * Append an Node object to the element, given the ID.
 * @param {String} id The ID of the node to append to.
 * @param {Element} obj The Element to append.
 */
function appendContent(id, obj) {
  var content = document.getElementById(id);
  content.appendChild(obj);
};

function insertContent(id, obj, /* optional */ pos) {
  pos = pos || 0;
  var content = document.getElementById(id);
  var refnode = content.childNodes[pos];
  content.insertBefore(obj, refnode);
};

/**
 * General purpose table row constructor.
 * @param {Array} row List of objects to place into row cells.
 * @return {Element} tr a TR node filled with TD.
 */
function rowDisplay(row) {
  return TR(null, map(partial(TD, null), row));
};

function headDisplay(row) {
  return TR(null, map(partial(TH, null), row));
};

/**
 * Load an application into the content space. The application should have
 * a root attribute that has the root element (usually a DIV) containing
 * the application.
 *
 * @param {Object} The application object to load. 
 *
 * Sets the global "currentapp" name to the application.
 */
function loadApp(appobject) {
  if (window.currentapp === appobject) {
    window.currentapp.reload();
  } else {
    unloadApp();
    placeContent("extra", null); // remove any menu old app might have placed.
    var app = new appobject();
    placeContent("content", app.root); // All Apps should have a root element.
    window.currentapp = app;
  };
};

/**
 * Remove any loaded applet.
 */
function unloadApp() {
  if (typeof(window.currentapp) != "undefined") {
    var app = window.currentapp;
    delete window.currentapp;
    app.destroy();
  };
  placeContent("content", null);
  placeContent("extra", null);
};



/**
 * Button handler to confirm selection and call url. Display good or bad result.
 * This is a generalized confirmation dialog with outcome reported. It
 * corresponds to the AddAskConfirmationAndGet method on the client side.
 * @param {String} question The question to present to user in confirm dialog.
 * @param {String} url The URL to fetch (JSON) if answer is yes.
 * @param {String} goodmsg Message to present to user if operation successful.
 * @param {String} badmsg Message to present to user if operation NOT successful.
 * @param {Object} mevent MochiKit event object from button callback.
 */
function askConfirmationAndGet(question, url, goodmsg, badmsg, mevent) {
  if (window.confirm(question)) {
    var d = loadJSONDoc(url);
    d.addCallback(partial(notifyResult, goodmsg, badmsg));
  };
};

/**
 * Works with askConfirmationAndGet to provide the go/nogo feedback to user.
 */
function notifyResult(goodmsg, badmsg, result) {
  if (result) {
    window.alert(goodmsg);
    window.opener.location.href = window.opener.location.href; /* force reload */
  } else {
    window.alert(badmsg);
  };
};


/**
 * Editable makes any text node editable.
 * Instantiate with original text, and a callback function that's called
 * when the text is edited.
 *
 * The callback is called with this editable and the new text as
 * parameters. It is the callback's responsibility to decide to call the
 * editable "finish" method, or the "revert" method (allows it to validate the
 * entry). It may also alter the text, and supplies it to the finish
 * method.
 *
 * @param {String} text The text to be displayed, and default value when editing.
 * @param {Function} callback A callback that will be called when user
 * edits the text.
 */

function Editable(text, callback) {
  this._callback = callback;
  this.element = SPAN({class: "editable"}, text);
  connect(this.element, "onclick", bind(this._editableHandler, this));
};

Editable.prototype.__dom__ = function() {
  return this.element;
};

/**
 * Transform the text area into an editable form.
 * Use this if your script wants to explicitly set it to editable.
 * Normally, this happens when the user clicks on the editable text area.
 */
Editable.prototype.makeEditable = function () {
  var text = scrapeText(this.element);
  var inp = INPUT({name: "currentedit", 
                   maxlength: "255", 
                   size: "80", 
                   value: text});
  var frm = FORM({method: "post", action: "."},  // bogus values, but required.
                inp);
  swapDOM(this.element, frm);
  connect(frm, "onsubmit", bind(this._editableSubmitHandler, this));
  inp.focus();
  disconnectAll(this.element);
  this.element = frm;
  this._oldvalue = text;
  return frm;
};

/**
 * Callback should call this with the new value of the text. This finishes
 * the edit and reverts back to non-edit mode.
 *
 * @param {String} newvalue, the new value for the text area.
 */
Editable.prototype.finish = function(newvalue) {
  var sp = SPAN({class: "editable"}, newvalue);
  connect(sp, "onclick", bind(this._editableHandler, this));
  disconnectAll(this.element);
  swapDOM(this.element, sp);
  this.element = sp;
  delete this._oldvalue;
};

/**
 * Callback should call this if new text is unacceptable, or some
 * operation with it could not performed. Reverts text to original value.
 */
Editable.prototype.revert = function() {
  this.finish(this._oldvalue);
};

Editable.prototype._editableSubmitHandler = function(ev) {
  ev.stop();
  var contents = formContents(this.element);
  var newvalue = contents[1][0]; // first value, the INPUT field.
  if (newvalue != this._oldvalue) {
    this._callback(this, newvalue);
  } else {
    this.revert();
  };
  return false;
};

Editable.prototype._editableHandler = function(ev) {
  this.makeEditable();
};


/**
 * Allow text inside an Element node to be editable. Sets the text node
 * inside the given node to be controlled by an Editable instance.
 *
 * @param {Element} node, The node that should contain one Text node as its
 * immediate child.
 * @param {Function} callback, The callback that will be called when text
 * is edited.
 */
function setEditable(node, callback) {
  var text = scrapeText(node);
  var editable = new Editable(text, callback);
  replaceChildNodes(node, editable);
  return editable;
};


