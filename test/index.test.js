import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

const { readJSON } = require('../src/utils');
const path = require('path');
const { sync: rimraf } = require('rimraf');
const fs = require('fs');
const flatCache = require('../src/cache');
const write = require('write');
const { del } = require('../src/del');

describe('flat-cache', function () {
  beforeEach(function () {
    flatCache.clearAll();
    rimraf(path.resolve(__dirname, './fixtures/.cache/'));
    rimraf(path.resolve(__dirname, './fixtures/.cache2/'));
  });

  afterEach(function () {
    flatCache.clearAll();
    rimraf(path.resolve(__dirname, './fixtures/.cache/'));
    rimraf(path.resolve(__dirname, './fixtures/.cache2/'));
  });

  test('should not crash if the cache file exists but it is an empty string', function () {
    const cachePath = path.resolve(__dirname, './fixtures/.cache2');
    write.sync(path.join(cachePath, 'someId'), '');

    expect(function () {
      const cache = flatCache.load('someId', cachePath);
      expect(cache._persisted).toStrictEqual({});
    }).not.toThrowError();
  });

  test('should not crash if the cache file exists but it is an invalid JSON string', function () {
    const cachePath = path.resolve(__dirname, './fixtures/.cache2');
    write.sync(path.join(cachePath, 'someId'), '{ "foo": "fookey", "bar" ');

    expect(function () {
      const cache = flatCache.load('someId', cachePath);
      expect(cache._persisted).toStrictEqual({});
    }).not.toThrowError();
  });

  test('should create a cache object if none existed in disc with the given id', function () {
    const cache = flatCache.load('someId');
    expect(cache.keys().length).toBe(0);
  });

  test('should set a key and persist it', function () {
    const cache = flatCache.load('someId');
    const data = {
      foo: 'foo',
      bar: 'bar',
    };

    cache.setKey('some-key', data);
    expect(cache.getKey('some-key')).toStrictEqual(data);

    cache.save();
    expect(readJSON(path.resolve(__dirname, '../.cache/someId'))['some-key']).toStrictEqual(data);
  });

  test('should remove a key from the cache object and persist the change', function () {
    const cache = flatCache.load('someId');
    const data = {
      foo: 'foo',
      bar: 'bar',
    };

    cache.setKey('some-key', data);
    expect(cache.getKey('some-key')).toStrictEqual(data);
    cache.save();

    cache.removeKey('some-key');
    expect(readJSON(path.resolve(__dirname, '../.cache/someId'))['some-key']).toStrictEqual(data);

    cache.save();
    expect(readJSON(path.resolve(__dirname, '../.cache/someId'))['some-key']).toBeUndefined();
  });

  describe('loading an existing cache', function () {
    beforeEach(function () {
      const cache = flatCache.load('someId');
      cache.setKey('foo', {
        bar: 'baz',
      });
      cache.setKey('bar', {
        foo: 'baz',
      });
      cache.save();
    });

    test('should load an existing cache', function () {
      const cache = flatCache.load('someId');
      expect(readJSON(path.resolve(__dirname, '../.cache/someId'))).toStrictEqual(cache._persisted);
    });

    test('should return the same structure if load called twice with the same docId', function () {
      const cache = flatCache.load('someId');
      const cache2 = flatCache.load('someId');

      expect(cache._persisted).toStrictEqual(cache2._persisted);
    });

    test('should remove the key and persist the new state', function () {
      const cache = flatCache.load('someId');
      cache.removeKey('foo');
      cache.save();
      expect(readJSON(path.resolve(__dirname, '../.cache/someId'))).toStrictEqual({
        bar: {
          foo: 'baz',
        },
      });
    });

    test('should clear the cache identified by the given id', function () {
      const cache = flatCache.load('someId');
      cache.save();
      let exists = fs.existsSync(path.resolve(__dirname, '../.cache/someId'));
      expect(exists).toBe(true);

      let deleted = flatCache.clearCacheById('someId');
      exists = fs.existsSync(path.resolve(__dirname, '../.cache/someId'));
      expect(deleted).toBe(true);
      expect(exists).toBe(false);

      deleted = flatCache.clearCacheById('someId');
      expect(deleted).toBe(false);
    });
  });

  describe('loading an existing cache custom directory', function () {
    beforeEach(function () {
      const cache = flatCache.load('someId', path.resolve(__dirname, './fixtures/.cache2'));
      cache.setKey('foo', {
        bar: 'baz',
      });
      cache.setKey('bar', {
        foo: 'baz',
      });
      cache.save();
    });

    test('should load an existing cache', function () {
      const cache = flatCache.load('someId', path.resolve(__dirname, './fixtures/.cache2'));
      expect(readJSON(path.resolve(__dirname, './fixtures/.cache2/someId'))).toStrictEqual(cache._persisted);
    });

    test('should return the same structure if load called twice with the same docId', function () {
      const cache = flatCache.load('someId', path.resolve(__dirname, './fixtures/.cache2'));
      const cache2 = flatCache.load('someId', path.resolve(__dirname, './fixtures/.cache2'));

      expect(cache._persisted).toStrictEqual(cache2._persisted);
    });

    test('should remove the cache file from disk using flatCache.clearCacheById', function () {
      const cache = flatCache.load('someId', path.resolve(__dirname, './fixtures/.cache2'));
      cache.save();
      expect(fs.existsSync(path.resolve(__dirname, './fixtures/.cache2/someId'))).toBe(true);
      flatCache.clearCacheById('someId', path.resolve(__dirname, './fixtures/.cache2'));
      expect(fs.existsSync(path.resolve(__dirname, './fixtures/.cache2/someId'))).toBe(false);
    });

    test('should remove the cache file from disk using removeCacheFile', function () {
      const cache = flatCache.load('someId', path.resolve(__dirname, './fixtures/.cache2'));
      cache.save();
      expect(fs.existsSync(path.resolve(__dirname, './fixtures/.cache2/someId'))).toBe(true);
      cache.removeCacheFile();
      expect(fs.existsSync(path.resolve(__dirname, './fixtures/.cache2/someId'))).toBe(false);
    });
  });

  describe('del', function () {
    afterEach(function () {
      vi.restoreAllMocks();
    });

    test('should catch and log an error when deletion fails', function () {
      // Arrange
      const fakePath = '/path/to/fake/dir';
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => true });
      vi.spyOn(fs, 'readdirSync').mockReturnValue(['file1', 'file2']);
      vi.spyOn(path, 'join').mockReturnValue(fakePath);
      const error = new Error('Fake error');
      vi.spyOn(fs, 'unlinkSync').mockReturnValue(() => {
        throw error;
      });

      const consoleLog = console.error;
      console.error = function () {};

      try {
        del(fakePath);
      } catch (err) {
        expect(err).toContain('/path/to/fake/dir');
      }

      console.error = consoleLog;
    });
  });

  describe('loading a cache using a filePath directly', function () {
    let file;
    beforeEach(function () {
      file = path.resolve(__dirname, './fixtures/.cache2/mycache-file.cache');
      rimraf(file);
    });

    test('should create the file if it does not exists before', function () {
      const cache = flatCache.createFromFile(file);
      cache.setKey('foo', {
        bar: 'baz',
      });
      cache.setKey('bar', {
        foo: 'baz',
      });

      expect(fs.existsSync(file)).toBe(false);
      cache.save();
      expect(fs.existsSync(file)).toBe(true);
    });

    test('should delete the cache file using removeCacheFile', function () {
      const cache = flatCache.createFromFile(file);
      cache.setKey('foo', {
        bar: 'baz',
      });
      cache.setKey('bar', {
        foo: 'baz',
      });

      expect(fs.existsSync(file)).toBe(false);
      cache.save();
      expect(fs.existsSync(file)).toBe(true);
      cache.removeCacheFile();

      expect(cache.getKey('foo')).toStrictEqual({
        bar: 'baz',
      });

      expect(fs.existsSync(file)).toBe(false);
    });

    test('should delete the cache file using destroy', function () {
      const cache = flatCache.createFromFile(file);
      cache.setKey('foo', {
        bar: 'baz',
      });
      cache.setKey('bar', {
        foo: 'baz',
      });

      expect(fs.existsSync(file)).toBe(false);
      cache.save();
      expect(fs.existsSync(file)).toBe(true);
      cache.destroy();

      expect(cache.getKey('foo')).toBeUndefined();

      expect(fs.existsSync(file)).toBe(false);
    });

    test('should remove non "visited" entries', function () {
      // a visited entry is one that was either queried
      // using getKey or updated with setKey
      let cache = flatCache.createFromFile(file);

      cache.setKey('foo', {
        bar: 'baz',
      });
      cache.setKey('bar', {
        foo: 'baz',
      });

      cache.save();

      let expectedResult = {
        bar: {
          foo: 'baz',
        },
        foo: {
          bar: 'baz',
        },
      };

      // first we expect to see both keys being persisted
      expect(expectedResult).toStrictEqual(readJSON(file));

      // then we create the load the cache again
      cache = flatCache.createFromFile(file);

      // we query one key (visit)
      const res = cache.getKey('foo');

      // then we check the value is what we stored
      expect(res).toStrictEqual({
        bar: 'baz',
      });

      cache.save();

      expectedResult = {
        foo: {
          bar: 'baz',
        },
      };

      expect(expectedResult).toStrictEqual(readJSON(file));
    });

    test('should keep non "visited" entries if noProne is set to true', function () {
      // a visited entry is one that was either queried
      // using getKey or updated with setKey
      let cache = flatCache.createFromFile(file);

      cache.setKey('foo', {
        bar: 'baz',
      });
      cache.setKey('bar', {
        foo: 'baz',
      });

      // first time noPrune will have no effect,
      // because all keys were visited
      cache.save();

      const expectedResult = {
        bar: {
          foo: 'baz',
        },
        foo: {
          bar: 'baz',
        },
      };

      // first we expect to see both keys being persisted
      expect(expectedResult).toStrictEqual(readJSON(file));

      // then we create the load the cache again
      cache = flatCache.createFromFile(file);

      // we query one key (visit)
      const res = cache.getKey('foo');

      // then we check the value is what we stored
      expect(res).toStrictEqual({
        bar: 'baz',
      });

      cache.save(true /* noPrune */);

      expect(expectedResult).toStrictEqual(readJSON(file));
    });
  });

  test('should serialize and deserialize properly circular reference', function () {
    const cache = flatCache.load('someId');

    const data = {
      foo: 'foo',
      bar: 'bar',
    };

    data.circular = data;

    cache.setKey('some-key', data);
    expect(cache.getKey('some-key')).toStrictEqual(data);

    cache.save();
    expect(readJSON(path.resolve(__dirname, '../.cache/someId'))['some-key']).toStrictEqual(data);
  });

  test('should return the entire persisted object', function () {
    const cache = flatCache.load('someId');
    const data = {
      foo: 'foo',
      bar: true,
      x: ['0', '1'],
    };

    cache.setKey('some-key', data);

    const data2 = {
      key: 9,
      z: {
        x: [true, false],
      },
    };

    cache.setKey('some-second-key', data2);

    const data3 = true;

    cache.setKey('some-third-key', data3);

    expect(cache.all()).toStrictEqual({
      'some-key': data,
      'some-second-key': data2,
      'some-third-key': data3,
    });
  });
});
