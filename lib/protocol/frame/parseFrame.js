'use strict';

var assert = require('assert-plus');

var CONSTANTS = require('./../constants');
var ERROR_CODES = CONSTANTS.ERROR_CODES;
//TODO remove this slop
var ERROR_CODE_START = 12;
var HEADER_FLAGS_START = 6;
var HEADER_LENGTH = 12;
var HEADER_LENGTH_START = 0;
var HEADER_STREAM_ID_START = 8;
var HEADER_TYPE_START = 4;
// encoding for meta and data. see: https://tools.ietf.org/html/rfc2045#page-14
var MIME_ENCODING = 'ASCII';
var LOG = require('./../../logger');
var METADATA_LENGTH = CONSTANTS.METADATA_LENGTH;
var TYPES = CONSTANTS.TYPES;


/**
 * Parses a frame given a buffer. Note this API does not automatically decode
 * strings -- it's up to the consumer to read frame.setup.[metadata|data]
 * encoding and decode the metadata and data buffers on their own.
 * @param {Buffer} buf -
 * @param {string} [dataEncoding=null] -
 * @param {string} [metadataEncoding=null] -
 * @param {bool} [lengthOptional=false] Whether the frame length is optional
 * @returns {ReactiveFrame}
 */
function parse(buf, dataEncoding, metadataEncoding, lengthOptional) {
    assert.object(buf, 'buffer');
    assert.optionalString(dataEncoding, 'dataEncoding');
    assert.optionalString(metadataEncoding, 'metadataEncoding');
    assert.optionalBool(lengthOptional, 'lengthOptional');

    LOG.debug({buffer: buf}, 'parse: entering');

    var buffer = {
        buffer: buf,
        offset: 0
    };
    var frame = {
        dataEncoding: dataEncoding,
        metadataEncoding: metadataEncoding
    };

    parseHeader(buffer, frame);

    switch (frame.header.type) {
        case TYPES.SETUP:
            parseSetupFrame(buffer, frame);
            parseMetadata(buffer, frame);
            parseData(buffer, frame);
            break;
        case TYPES.ERROR:
            parseErrorCode(buffer, frame);
            parseMetadata(buffer, frame);
            parseData(buffer, frame);
            break;
        case TYPES.LEASE:
            parseLeaseFrame(buffer, frame);
            break;
        case TYPES.KEEPALIVE:
            parseKeepaliveFrame(buffer, frame);
            break;
        case TYPES.CANCEL:
            parseMetadata(buffer, frame);
            break;
        case TYPES.RESPONSE:
            parseMetadata(buffer, frame);
            parseData(buffer, frame);
            break;
        case TYPES.REQUEST_RESPONSE:
            parseMetadata(buffer, frame);
            parseData(buffer, frame);
            break;
        case TYPES.NEXT:
        case TYPES.COMPLETE:
        case TYPES.NEXT_COMPLETE:
        case TYPES.REQUEST_CHANNEL:
        case TYPES.REQUEST_N:
            throw new Error('frame type not implemented ' + frame.header.type);

        default:
            throw new Error('got unknown type ' + frame.header.type);
    }

    LOG.debug({frame: frame}, 'parse: exiting');
    return frame;
}

module.exports = parse;

// private functions


/**
 * TODO: how do we know if the length is optional?
 * plucks the header length from the header.
 * @private
 * @param {Buffer} buf -
 * @returns {Number}
 * @throws {Error} If the header does not match the length we throw an
 * error.
 */
function parseHeaderLength(buf) {
    var bufLength = buf.length;
    var length = buf.readUInt32BE(HEADER_LENGTH_START);

    if (bufLength !== length) {
        throw new Error('Header length ' + length +
                        ' does not match buffer length ' + bufLength);
    }

    return length;
}

function parseType(buf) {
    return buf.readUInt16BE(HEADER_TYPE_START);
}

function parseFlags(buf) {
    return buf.readUInt16BE(HEADER_FLAGS_START);
}

function parseStreamId(buf) {
    return buf.readUInt32BE(HEADER_STREAM_ID_START);
}

/**
 * @private
 * @param {Buffer} buf The header buffer
 * @param {Object} frame The frame object
 * @returns {Object} header The header object
 */
function parseHeader(buf, frame) {
    frame.header = {
        length: parseHeaderLength(buf.buffer),
        type: parseType(buf.buffer),
        flags: parseFlags(buf.buffer),
        streamId: parseStreamId(buf.buffer)
    };
    buf.offset += HEADER_LENGTH;

    LOG.debug({frame: frame, offset: buf.offset}, 'parsed header');
}

function parseErrorCode(buf, frame) {
    var code = buf.buffer.readUInt32BE(ERROR_CODE_START);
    LOG.debug({code: code}, 'parsing error code');

    switch (code) {
        case ERROR_CODES.INVALID_SETUP:
        case ERROR_CODES.UNSUPPORTED_SETUP:
        case ERROR_CODES.REJECTED_SETUP:
        case ERROR_CODES.CONNECTION_ERROR:
        case ERROR_CODES.APPLICATION_ERROR:
        case ERROR_CODES.REJECTED:
        case ERROR_CODES.CANCELED:
        case ERROR_CODES.INVALID:
        case ERROR_CODES.RESERVED:
            LOG.debug({errCode: code}, 'parsed error code');
            break;
        default:
            // TODO: do we really want to throw an error here? We probably we
            // just ignore an error code that we don't know.
            //throw new Error('got unknown error code ' + code);
            break;
    }
    frame.errorCode = code;
    buf.offset += 4;
    return frame;
}

/*
 * Parses out the setup frame as it has extra data, before the metadata and
 * data.
 */
function parseSetupFrame(b, frame) {
    LOG.debug({
        offset: b.offset,
        frame: frame
    }, 'parseSetupFrame: entering');
    var buffer = b.buffer;
    var version = buffer.readUInt32BE(b.offset);
    b.offset += 4;
    var keepalive = buffer.readUInt32BE(b.offset);
    b.offset += 4;
    var maxLifetime = buffer.readUInt32BE(b.offset);
    // this shouldn't be hard coded could be 20 if there's no length in header
    b.offset += 4;

    var metadataEncodingLength = buffer.readUInt8(b.offset++);
    var metadataEncoding = buffer.slice(b.offset, b.offset +
        metadataEncodingLength)
        .toString(MIME_ENCODING);

    b.offset += metadataEncodingLength;

    var dataEncodingLength = buffer.readUInt8(b.offset++);
    var dataEncoding = buffer.slice(b.offset,
        b.offset + dataEncodingLength)
        .toString(MIME_ENCODING);

    b.offset += dataEncodingLength;

    var lease = false;
    var leaseBit = frame.header.flags & CONSTANTS.FLAGS.LEASE;

    if (leaseBit === CONSTANTS.FLAGS.LEASE) {
        lease = true;
    }

    frame.setup = {
        version: version,
        keepalive: keepalive,
        maxLifetime: maxLifetime,
        lease: lease,
        metadataEncoding: metadataEncoding,
        dataEncoding: dataEncoding
    };
    frame.metadataEncoding = metadataEncoding;
    frame.dataEncoding = dataEncoding;

    // we also attach encoding one the frame itself, since all other frames do
    // not contain a setup peroperty -- and thus use frame.metadatEncoding and
    // frame.dataEncoding as the interface to get encoding.

    LOG.debug({setup: frame.setup, offset: b.offset}, 'parsed setup frame');
}


function parseLeaseFrame(b, frame) {
    frame.ttl = b.buffer.readUInt32BE(b.offset);
    b.offset += 4;
    frame.budget = b.buffer.readUInt32BE(b.offset);
    b.offset += 4;
    parseMetadata(b, frame);
    return frame;
}

function parseKeepaliveFrame(b, frame) {
    var responseFlag = frame.header.flags & CONSTANTS.FLAGS.KEEPALIVE_RESPONSE;
    frame.response = responseFlag === CONSTANTS.FLAGS.KEEPALIVE_RESPONSE;
    parseData(b, frame);
    return frame;
}

function parseMetadata(b, frame) {
    LOG.debug({offset: b.offset, frame: frame}, 'parseMetadata: entering');
    var buffer = b.buffer;
    var hasMetadata = frame.header.flags & CONSTANTS.FLAGS.METADATA;

    if (hasMetadata) {
        // #33 must subtract the length of the metadata length bytes from the
        // length of the metadata field.
        var mdLength = buffer.readUInt32BE(b.offset) - METADATA_LENGTH;
        b.offset += METADATA_LENGTH;
        frame.metadata = buffer.slice(b.offset, b.offset + mdLength)
            .toString(frame.metadataEncoding);
        b.offset += mdLength;
    }

    LOG.debug({frame: frame, offset: b.offset}, 'parseMetadata: exiting');
}

function parseData(b, frame) {
    LOG.debug({offset: b.offset, frame: frame}, 'parseData: entering');
    var buffer = b.buffer;
    frame.data = buffer.slice(b.offset).toString(frame.dataEncoding);
    LOG.debug({data: frame.data, offset: b.offest}, 'parsed data');

    // data is the last part of the frame, so offset is just buf len
    b.offset = buffer.length;
    LOG.debug({offset: b.offset, frame: frame}, 'parseData: exiting');
}
