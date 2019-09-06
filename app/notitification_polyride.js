/*
Nativefier's implementation:
https://github.com/jiahaog/nativefier/blob/master/app/src/static/preload.js
function setNotificationCallback(createCallback, clickCallback) {
  const OldNotify = window.Notification;
  const newNotify = (title, opt) => {
    createCallback(title, opt);
    const instance = new OldNotify(title, opt);
    instance.addEventListener('click', clickCallback);
    return instance;
  };
  newNotify.requestPermission = OldNotify.requestPermission.bind(OldNotify);
  Object.defineProperty(newNotify, 'permission', {
    get: () => OldNotify.permission,
  });

  window.Notification = newNotify;
}
*/

const PERMISSION_GRANTED = 'granted';
const PERMISSION_DENIED = 'denied';

const noop = () => {};

class Notification extends EventTarget {
  constructor(title, opts) {
    super();
    this._title = title;
    this._tag = opts.tag;
    this._badge = opts.badge;
    this._lang = opts.lang;
    this._body = opts.body;
    this._data = opts.data;
    this._dir = opts.dir;
    this._icon = opts.icon;
    this._image = opts.image;
    this._vibrate = opts.vibrate;
    this.renotify = opts.renotify;
    this._requireInteraction = opts.requireInteraction;
    this._silent = opts.silent;
    this._actions = opts.actions;
    this._timestamp = Date.now();

    this._onclick = null;
    this._onerror = null;
    this._onshow = null;
    this._onclose = null;
    // implement showing notification here
    // this.emit('show/close/click/error') in after showing notification lifecycle stages
  }

  close() {
    // implement closing notification here
  }

  get title() {
    return _title;
  }
  get tag() {
    return _tag;
  }
  get badge() {
    return _badge;
  }
  get lang() {
    return _lang;
  }
  get body() {
    return _body;
  }
  get data() {
    return _data;
  }
  get dir() {
    return _dir;
  }
  get icon() {
    return _icon;
  }
  get timestamp() {
    return _timestamp;
  }
  get image() {
    return _image;
  }
  get vibrate() {
    return _vibrate;
  }
  get renotify() {
    return _renotify;
  }
  get requireInteraction() {
    return _requireInteraction;
  }
  get silent() {
    return _silent;
  }
  get actions() {
    return _actions;
  }

  get onclick() {
    return this._onclick;
  }

  set onclick(callback) {
    if (typeof callback !== 'function') {
      callback = null;
    }
    if (typeof this._onclick === 'function') {
      this.removeEventListener('click', this._onclick);
    }
    this._onclick = callback;
    if (typeof callback === 'function') {
      this.addEventListener('click', callback);
    }
  }

  get onerror() {
    return this._onerror;
  }

  set onerror(callback) {
    if (typeof callback !== 'function') {
      callback = null;
    }
    if (typeof this._onerror === 'function') {
      this.removeEventListener('error', this._onerror);
    }
    this._onerror = callback;
    if (typeof callback === 'function') {
      this.addEventListener('error', callback);
    }
  }

  get onshow() {
    return this._onshow;
  }

  set onshow(callback) {
    if (typeof callback !== 'function') {
      callback = null;
    }
    if (typeof this._onshow === 'function') {
      this.removeEventListener('show', this._onshow);
    }
    this._onshow = callback;
    if (typeof callback === 'function') {
      this.addEventListener('show', callback);
    }
  }

  get onclose() {
    return this._onclose;
  }

  set onclose(callback) {
    if (typeof callback !== 'function') {
      callback = null;
    }
    if (typeof this._onclose === 'function') {
      this.removeEventListener('close', this._onclose);
    }
    this._onclose = callback;
    if (typeof callback === 'function') {
      this.addEventListener('close', callback);
    }
  }

  static get permission() {
    return PERMISSION_GRANTED;
  }

  static requestPermission(callback = noop) {
    callback(PERMISSION_GRANTED);
    return new Promise((resolve) => resolve(PERMISSION_GRANTED));
  }
}
