describe('flat-cache', function () {
  'use strict';
  var expect = require('chai').expect;
  var readJSON = require('read-json-sync');
  var path = require('path');
  var del = require('del');
  var fs = require('fs');
  var flatCache = require('../../cache');

  beforeEach(function () {
    flatCache.clearAll();
    del.sync(path.resolve(__dirname, '../fixtures/.cache/'), {
      force: true
    });
  });

  afterEach(function() {
    flatCache.clearAll();
    del.sync(path.resolve(__dirname, '../fixtures/.cache/'), {
      force: true
    });
  });

  it('should create a cache object if none existed in disc with the given id', function () {
    var cache = flatCache.load('someId');
    expect(cache.keys().length).to.equal(0);
  });

  it('should set a key and persist it', function () {
    var cache = flatCache.load('someId');
    var data = {
      foo: 'foo',
      bar: 'bar'
    };

    cache.setKey('some-key', data);
    expect(cache.getKey('some-key')).to.deep.equal(data);

    cache.save();
    expect(readJSON(path.resolve(__dirname, '../../.cache/someId'))['some-key']).to.deep.equal(data);
  });

  it('should remove a key from the cache object and persist the change', function () {
    var cache = flatCache.load('someId');
    var data = {
      foo: 'foo',
      bar: 'bar'
    };

    cache.setKey('some-key', data);
    expect(cache.getKey('some-key')).to.deep.equal(data);
    cache.save();

    cache.removeKey('some-key');
    expect(readJSON(path.resolve(__dirname, '../../.cache/someId'))['some-key'], 'value is still in the persisted storage').to.deep.equal(data);

    cache.save();
    expect(readJSON(path.resolve(__dirname, '../../.cache/someId'))['some-key']).to.be.undefined
  });

  describe('loading an existing cache', function () {
    beforeEach(function () {
      var cache = flatCache.load('someId');
      cache.setKey('foo', {
        bar: 'baz'
      });
      cache.setKey('bar', {
        foo: 'baz'
      });
      cache.save();
    });

    it('should load an existing cache', function () {
      var cache = flatCache.load('someId');
      expect(readJSON(path.resolve(__dirname, '../../.cache/someId'))).to.deep.equal(cache._persisted);
    });

    it('should return the same structure if load called twice with the same docId', function () {
      var cache = flatCache.load('someId');
      var cache2 = flatCache.load('someId');

      expect(cache._persisted).to.deep.equal(cache2._persisted);

    });

    it('should remove the key and persist the new state', function () {
      var cache = flatCache.load('someId');
      cache.removeKey('foo');
      cache.save();
      expect(readJSON(path.resolve(__dirname, '../../.cache/someId'))).to.deep.equal({
        bar: {
          foo: 'baz'
        }
      });
    });

    it('should clear the cache identified by the given id', function () {
      var cache = flatCache.load('someId');
      cache.save();
      var exists = fs.existsSync(path.resolve(__dirname, '../../.cache/someId'));
      expect(exists).to.be.true;

      var deleted = flatCache.clearCacheById('someId');
      exists = fs.existsSync(path.resolve(__dirname, '../../.cache/someId'));
      expect(deleted).to.be.true;
      expect(exists).to.be.false;

      deleted = flatCache.clearCacheById('someId');
      expect(deleted).to.be.false;
    });

  });

  describe('loading an existing cache custom directory', function () {
    beforeEach(function () {
      var cache = flatCache.load('someId', path.resolve(__dirname, '../fixtures/.cache'));
      cache.setKey('foo', {
        bar: 'baz'
      });
      cache.setKey('bar', {
        foo: 'baz'
      });
      cache.save();
    });

    it('should load an existing cache', function () {
      var cache = flatCache.load('someId', path.resolve(__dirname, '../fixtures/.cache'));
      expect(readJSON(path.resolve(__dirname, '../fixtures/.cache/someId'))).to.deep.equal(cache._persisted);
    });

    it('should return the same structure if load called twice with the same docId', function () {
      var cache = flatCache.load('someId', path.resolve(__dirname, '../fixtures/.cache'));
      var cache2 = flatCache.load('someId', path.resolve(__dirname, '../fixtures/.cache') );

      expect(cache._persisted).to.deep.equal(cache2._persisted);

    });


  });

});