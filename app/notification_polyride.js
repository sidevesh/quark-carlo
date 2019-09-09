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

const polyRideNotification = `
  class Notification extends EventTarget {
    constructor(title, opts = {}) {
      const {
        body = 'New notification',
        silent = false,
        data = null,
      } = opts;
      super();
      this._uniqueId = Math.random().toString(36).substr(2, 9);
      this._title = title;
      this._body = body;
      this._silent = silent;
      this._data = data;
      this._timestamp = Date.now();
      this._icon = '';
      this._requireInteraction = false;
      this._tag = '';
      this._renotify = false;
      this._actions = [];
      this._image = '';
      this._dir = 'auto';
      this._lang = '';
      this._badge = '';
      this._vibrate = [];
      this._onshow = null;
      this._onclose = null;
      this._onclick = null;
      // this._onclickWrapped = null;
      this._onerror = null;

      Notification.notifyNotificationInstances[this._uniqueId] = this;
      notify(JSON.stringify({
        title: this._title,
        message: this._body,
        sound: !this._silent,
        uniqueId: this._uniqueId,
      }));
    }

    close() {
      // implement closing notification here
    }

    get title() { return this._title; }
    get body() { return this._body; }
    get silent() { return this._silent; }
    get icon() { return this._icon; }
    get timestamp() { return this._timestamp; }
    get data() { return this._data; }
    get requireInteraction() { return this._requireInteraction; }
    get tag() { return this._tag; }
    get renotify() { return this._renotify; }
    get actions() { return this._actions; }
    get image() { return this._image; }
    get dir() { return this._dir; }
    get lang() { return this._lang; }
    get badge() { return this._badge; }
    get vibrate() { return this._vibrate; }

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
    // set onclick(callback) {
    //   const notificationAttachedCallback = null;
    //   if (typeof callback !== 'function') {
    //     notificationAttachedCallback = null;
    //   } else {
    //     notificationAttachedCallback = (e) => {
    //       const notificationAttachedEvent = e;
    //       notificationAttachedCallback.notification = this;
    //       callback(notificationAttachedCallback);
    //     }; 
    //   }
    //   if (typeof this._onclick === 'function') {
    //     this.removeEventListener('click', this._onclickWrapped);
    //   }
    //   this._onclick = callback;
    //   this._onclickWrapped = notificationAttachedCallback;
    //   if (typeof callback === 'function') {
    //     this.addEventListener('click', notificationAttachedCallback);
    //   }
    // }

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

    static get permission() {
      return Notification.PERMISSION_GRANTED;
    }

    static requestPermission(callback = () => {}) {
      callback(Notification.PERMISSION_GRANTED);
      return new Promise((resolve) => resolve(Notification.PERMISSION_GRANTED));
    }

    static getLastNotification() {
      const notifyNotificationInstancesKeys = Object.keys(Notification.notifyNotificationInstances);
      if (notifyNotificationInstancesKeys.length === 0) {
        return null;
      } else {
        return Notification.notifyNotificationInstances[notifyNotificationInstancesKeys[notifyNotificationInstancesKeys.length - 1]];
      }
    }
  }
  Notification.PERMISSION_DEFAULT = 'default';
  Notification.PERMISSION_GRANTED = 'granted';
  Notification.PERMISSION_DENIED = 'denied';
  Notification.notifyNotificationInstances = {};
  window.Notification = Notification;
`;

module.exports = polyRideNotification;
