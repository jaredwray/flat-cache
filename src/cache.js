var path = require('path');
var fs = require('fs');
var utils = require('./utils');
var del = require('./del');
var writeJSON = utils.writeJSON;

class Cache {
  /**
   * Load a cache identified by the given Id. If the element does not exists, then initialize an empty
   * cache storage. If specified `cacheDir` will be used as the directory to persist the data to. If omitted
   * then the cache module directory `./cache` will be used instead
   *
   * @method load
   * @param {String} docId - The id of the cache, would also be used as the name of the file cache
   * @param {String} [cacheDir] - Directory for the cache entry
   */
  load(docId, cacheDir) {
    var me = this;

    me._visited = {};
    me._persisted = {};
    me._pathToFile = cacheDir ? path.resolve(cacheDir, docId) : path.resolve(__dirname, '../.cache/', docId);

    if (fs.existsSync(me._pathToFile)) {
      me._persisted = utils.tryParse(me._pathToFile, {});
    }
  }

  /**
   * Load the cache from the provided file
   * @method loadFile
   * @param  {String} pathToFile - The path to the file containing the info for the cache
   */
  loadFile(pathToFile) {
    var me = this;
    var dir = path.dirname(pathToFile);
    var fName = path.basename(pathToFile);

    me.load(fName, dir);
  }

  /**
   * Returns the entire persisted object
   * @method all
   * @returns {*}
   */
  all() {
    return this._persisted;
  }

  keys() {
    return Object.keys(this._persisted);
  }

  /**
   * sets a key to a given value
   * @method setKey
   * @param {string} key - The key to set
   * @param {object} value - The value of the key. Could be any object that can be serialized with JSON.stringify
   */
  setKey(key, value) {
    this._visited[key] = true;
    this._persisted[key] = value;
  }

  /**
   * remove a given key from the cache
   * @method removeKey
   * @param {String} - Key the key to remove from the object
   */
  removeKey(key) {
    delete this._visited[key]; // esfmt-ignore-line
    delete this._persisted[key]; // esfmt-ignore-line
  }

  /**
   * Return the value of the provided key
   * @method getKey
   * @param {String} - Key the name of the key to retrieve
   * @returns {*} - The value from the key
   */
  getKey(key) {
    this._visited[key] = true;
    return this._persisted[key];
  }

  /**
   * Remove keys that were not accessed/set since the
   * last time the `prune` method was called.
   * @method _prune
   * @private
   */
  _prune() {
    var me = this;
    var obj = {};

    var keys = Object.keys(me._visited);

    // no keys visited for either get or set value
    if (keys.length === 0) {
      return;
    }

    keys.forEach(function (key) {
      obj[key] = me._persisted[key];
    });

    me._visited = {};
    me._persisted = obj;
  }

  /**
   * Save the state of the cache identified by the docId to disk
   * as a JSON structure
   * @param {Boolean} [noPrune=false] - Whether to remove from cache the non visited files
   * @method save
   */
  save(noPrune = false) {
    var me = this;

    !noPrune && me._prune();
    writeJSON(me._pathToFile, me._persisted);
  }

  /**
   * remove the file where the cache is persisted
   * @method removeCacheFile
   * @return {Boolean} - True or false if the file was successfully deleted
   */
  removeCacheFile() {
    return del(this._pathToFile);
  }

  /**
   * Destroy the file cache and cache content.
   * @method destroy
   */
  destroy() {
    var me = this;
    me._visited = {};
    me._persisted = {};

    me.removeCacheFile();
  }
}

module.exports = {
  /**
   * Alias for create. Should be considered depreacted. Will be removed in next releases
   *
   * @method load
   * @param {String} docId - The id of the cache, would also be used as the name of the file cache
   * @param {String} [cacheDir] - Directory for the cache entry
   * @returns {Cache} - cache instance
   */
  load: function (docId, cacheDir) {
    return this.create(docId, cacheDir);
  },

  /**
   * Load a cache identified by the given Id. If the element does not exists, then initialize an empty
   * cache storage.
   *
   * @method create
   * @param {String} docId - The id of the cache, would also be used as the name of the file cache
   * @param {String} [cacheDir] - Directory for the cache entry
   * @returns {Cache} - cache instance
   */
  create: function (docId, cacheDir) {
    var obj = new Cache();
    obj.load(docId, cacheDir);
    return obj;
  },

  createFromFile: function (filePath) {
    var obj = new Cache();
    obj.loadFile(filePath);
    return obj;
  },
  
  /**
   * Clear the cache identified by the given id. Caches stored in a different cache directory can be deleted directly
   *
   * @method clearCache
   * @param {String} docId - The id of the cache, would also be used as the name of the file cache
   * @param {String} cacheDir - The directory where the cache file was written
   * @returns {Boolean} - True if the cache folder was deleted. False otherwise
   */
  clearCacheById: function (docId, cacheDir) {
    var filePath = cacheDir ? path.resolve(cacheDir, docId) : path.resolve(__dirname, '../.cache/', docId);
    return del(filePath);
  },
  
  /**
   * Remove all cache stored in the cache directory
   * @method clearAll
   * @returns {Boolean} - True if the cache folder was deleted. False otherwise
   */
  clearAll: function (cacheDir) {
    var filePath = cacheDir ? path.resolve(cacheDir) : path.resolve(__dirname, '../.cache/');
    return del(filePath);
  },
};
