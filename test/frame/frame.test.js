'use strict';

var assert = require('chai').assert;

var frame = require('../../lib/protocol/frame');
var getRandomInt = require('../common/getRandomInt');
var getRandomBoolean = require('../common/getRandomBoolean');

var CONSTANTS = require('../../lib/protocol/constants');
var FLAGS = CONSTANTS.FLAGS;
var METADATA_ENCODING = 'utf8';
var DATA_ENCODING = 'binary';

describe('setup', function () {
    it('encode/decode with lease, strict, md and data', function () {
        var seedFrame = {
            flags: FLAGS.LEASE | FLAGS.STRICT,
            keepalive: getRandomInt(0, Math.pow(2, 32)),
            maxLifetime: getRandomInt(0, Math.pow(2, 32)),
            version: CONSTANTS.VERSION,
            metadataEncoding: METADATA_ENCODING,
            dataEncoding: DATA_ENCODING,
            metadata: 'We\'re just two lost souls swimming in a fish bowl',
            data: 'year after year'
        };
        var setupFrame = frame.getSetupFrame(seedFrame);
        var actualFrame = frame.parseFrame(setupFrame);
        assert.isObject(actualFrame.header);
        assert.equal(actualFrame.header.streamId, 0,
                     'setup frame id must be 0');
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.SETUP);
        assert.equal(actualFrame.header.flags,
                     FLAGS.METADATA | seedFrame.flags);
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.SETUP);
        assert.equal(actualFrame.setup.lease, true);
        assert.equal(actualFrame.setup.keepalive, seedFrame.keepalive);
        assert.equal(actualFrame.setup.maxLifetime, seedFrame.maxLifetime);
        assert.equal(actualFrame.setup.version, seedFrame.version);
        assert.equal(actualFrame.setup.metadataEncoding,
            seedFrame.metadataEncoding);
        assert.equal(actualFrame.setup.dataEncoding, seedFrame.dataEncoding);
        assert.deepEqual(actualFrame.metadata, seedFrame.metadata);
        assert.deepEqual(actualFrame.data, seedFrame.data);
    });
    it('encode/decode with lease, strict, and data', function () {
        var seedFrame = {
            flags: FLAGS.LEASE | FLAGS.STRICT,
            keepalive: getRandomInt(0, Math.pow(2, 32)),
            maxLifetime: getRandomInt(0, Math.pow(2, 32)),
            version: CONSTANTS.VERSION,
            metadataEncoding: METADATA_ENCODING,
            dataEncoding: DATA_ENCODING,
            data: 'year after year'
        };
        var actualFrame = frame.parseFrame(frame.getSetupFrame(seedFrame));
        assert.isObject(actualFrame.header);
        assert.equal(actualFrame.header.streamId, 0,
                     'setup frame id must be 0');
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.SETUP);
        assert.equal(actualFrame.header.flags, seedFrame.flags);
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.SETUP);
        assert.equal(actualFrame.setup.lease, true);
        assert.equal(actualFrame.setup.keepalive, seedFrame.keepalive);
        assert.equal(actualFrame.setup.maxLifetime, seedFrame.maxLifetime);
        assert.equal(actualFrame.setup.version, seedFrame.version);
        assert.equal(actualFrame.setup.metadataEncoding,
            seedFrame.metadataEncoding);
        assert.equal(actualFrame.setup.dataEncoding, seedFrame.dataEncoding);
        assert.deepEqual(actualFrame.data, seedFrame.data);
    });
    it('encode/decode with lease, strict, md', function () {
        var seedFrame = {
            flags: FLAGS.LEASE | FLAGS.STRICT,
            keepalive: getRandomInt(0, Math.pow(2, 32)),
            maxLifetime: getRandomInt(0, Math.pow(2, 32)),
            version: CONSTANTS.VERSION,
            metadataEncoding: METADATA_ENCODING,
            dataEncoding: DATA_ENCODING,
            metadata: 'We\'re just two lost souls swimming in a fish bowl'
        };
        var actualFrame = frame.parseFrame(frame.getSetupFrame(seedFrame));
        assert.isObject(actualFrame.header);
        assert.equal(actualFrame.header.streamId, 0,
                     'setup frame id must be 0');
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.SETUP);
        assert.equal(actualFrame.header.flags,
                     FLAGS.METADATA | seedFrame.flags);
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.SETUP);
        assert.equal(actualFrame.setup.lease, true);
        assert.equal(actualFrame.setup.keepalive, seedFrame.keepalive);
        assert.equal(actualFrame.setup.maxLifetime, seedFrame.maxLifetime);
        assert.equal(actualFrame.setup.version, seedFrame.version);
        assert.equal(actualFrame.setup.metadataEncoding,
            seedFrame.metadataEncoding);
        assert.equal(actualFrame.setup.dataEncoding, seedFrame.dataEncoding);
        assert.deepEqual(actualFrame.metadata, seedFrame.metadata);
    });
    it('encode/decode with lease, strict', function () {
        var seedFrame = {
            flags: FLAGS.LEASE | FLAGS.STRICT,
            keepalive: getRandomInt(0, Math.pow(2, 32)),
            maxLifetime: getRandomInt(0, Math.pow(2, 32)),
            version: CONSTANTS.VERSION,
            metadataEncoding: METADATA_ENCODING,
            dataEncoding: DATA_ENCODING
        };
        var actualFrame = frame.parseFrame(frame.getSetupFrame(seedFrame));
        assert.isObject(actualFrame.header);
        assert.equal(actualFrame.header.streamId, 0,
                     'setup frame id must be 0');
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.SETUP);
        assert.equal(actualFrame.header.flags, seedFrame.flags);
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.SETUP);
        assert.equal(actualFrame.setup.lease, true);
        assert.equal(actualFrame.setup.keepalive, seedFrame.keepalive);
        assert.equal(actualFrame.setup.maxLifetime, seedFrame.maxLifetime);
        assert.equal(actualFrame.setup.version, seedFrame.version);
        assert.equal(actualFrame.setup.metadataEncoding,
            seedFrame.metadataEncoding);
        assert.equal(actualFrame.setup.dataEncoding, seedFrame.dataEncoding);
    });
});

describe('error', function () {
    it('encode/decode', function () {
        var seedFrame = {
            streamId: getRandomInt(0, Math.pow(2, 32)),
            errorCode: getRandomInt(0, Math.pow(2, 32)),
            data: 'Running over the same old ground',
            metadata: 'What have we found',
            metadataEncoding: METADATA_ENCODING,
            dataEncoding: DATA_ENCODING
        };

        var actualFrame = frame.parseFrame(frame.getErrorFrame(seedFrame));
        assert.isObject(actualFrame.header);
        assert.equal(actualFrame.header.streamId, seedFrame.streamId);
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.ERROR);
        assert.equal(actualFrame.header.flags, CONSTANTS.FLAGS.METADATA);
        assert.equal(actualFrame.errorCode, seedFrame.errorCode);
        assert.equal(actualFrame.metadata.toString(), seedFrame.metadata);
        assert.equal(actualFrame.data.toString(), seedFrame.data);
    });
});

describe('lease', function () {
    it('encode/decode', function () {
        var seedFrame = {
            ttl: getRandomInt(0, Math.pow(2, 32)),
            budget: getRandomInt(0, Math.pow(2, 32)),
            metadata: 'You can\'t send me more than that!',
            metadataEncoding: METADATA_ENCODING
        };

        var leaseFrame = frame.getLeaseFrame(seedFrame);
        var actualFrame = frame.parseFrame(leaseFrame);
        assert.isObject(actualFrame.header);
        assert.equal(actualFrame.header.streamId, 0);
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.LEASE);
        assert.equal(actualFrame.header.flags, CONSTANTS.FLAGS.METADATA);
        assert.equal(actualFrame.ttl, seedFrame.ttl);
        assert.equal(actualFrame.budget, seedFrame.budget);
        assert.equal(actualFrame.metadata.toString(), seedFrame.metadata);
    });
});

describe('keepalive', function () {
    it('encode/decode', function () {
        var seedFrame = {
            response: getRandomBoolean(),
            data: 'Are you still alive?',
            dataEncoding: DATA_ENCODING
        };

        var keepaliveFrame = frame.getKeepaliveFrame(seedFrame);
        var actualFrame = frame.parseFrame(keepaliveFrame);
        assert.isObject(actualFrame.header);
        assert.equal(actualFrame.header.streamId, 0);
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.KEEPALIVE);
        assert.equal(actualFrame.response, seedFrame.response);
        assert.equal(actualFrame.data.toString(), seedFrame.data);
    });
});

describe('cancel', function () {
    it('encode/decode', function () {
        var seedFrame = {
            streamId: getRandomInt(0, Math.pow(2, 32)),
            metadata: "I don't want it anymore!",
            metadataEncoding: DATA_ENCODING
        };

        var cancelFrame = frame.getCancelFrame(seedFrame);
        var actualFrame = frame.parseFrame(cancelFrame);
        assert.isObject(actualFrame.header);
        assert.equal(actualFrame.header.streamId, seedFrame.streamId);
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.CANCEL);
        assert.equal(actualFrame.response, seedFrame.response);
        assert.equal(actualFrame.metadata.toString(), seedFrame.metadata);
    });
});

describe('request response', function cb() {
    it('encode/decode', function () {
        var seedFrame = {
            metadataEncoding: METADATA_ENCODING,
            dataEncoding: DATA_ENCODING,
            streamId: getRandomInt(0, Math.pow(2, 32)),
            metadata: 'Big Suge in the lolo, bounce and turn',
            data: 'I hit the studio and drop a jewel, hoping it pay'
        };

        var actualFrame = frame.parseFrame(frame.getReqResFrame(seedFrame));
        assert.isObject(actualFrame.header);
        assert.equal(actualFrame.header.streamId, seedFrame.streamId);
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.REQUEST_RESPONSE);
        assert.equal(actualFrame.header.flags, CONSTANTS.FLAGS.METADATA);
        assert.equal(actualFrame.metadata, seedFrame.metadata);
        assert.equal(actualFrame.data, seedFrame.data);

    });
});

describe('response', function () {
    it('encode/decode w/ data, metadata, and complete', function () {
        var seedFrame = {
            metadataEncoding: METADATA_ENCODING,
            dataEncoding: DATA_ENCODING,
            streamId: getRandomInt(0, Math.pow(2, 32)),
            flags: CONSTANTS.FLAGS.COMPLETE,
            metadata: 'I bet you got it twisted you don\'t know who to trust',
            data: 'A five-double-oh - Benz flauntin flashy rings'
        };

        var actualFrame = frame.parseFrame(frame.getResponseFrame(seedFrame));
        assert.isObject(actualFrame.header);
        assert.equal(actualFrame.header.streamId, seedFrame.streamId);
        assert.equal(actualFrame.header.type, CONSTANTS.TYPES.RESPONSE);
        assert.equal(actualFrame.header.flags,
                     CONSTANTS.FLAGS.METADATA | CONSTANTS.FLAGS.COMPLETE);
        assert.equal(actualFrame.metadata, seedFrame.metadata);
        assert.equal(actualFrame.data, seedFrame.data);
    });
});
