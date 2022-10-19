const getStreamType = require('./get-stream-type.js');
const classes = require('./classes/index.js');
/**
* @typedef {Object} TraceConfig
* @property {String} name the name of the stream
* @property {Boolean} [active=true] set it to false to deactivate tracify
* @property {String} [throughputWindow=1000] the time window used to calculate the throughput (in ms)
* @property {Array} [copyKeys = []] list of keys to copy from source stream to tracified stream (useful for custom stream with custom attributes)
* @property {Boolean} [skipUnwrap = false] set this to true if the input data are not wrapped in a tracified format
**/

/**
* @param {Stream} stream to change
* @param {TraceConfig} - config
* @returns {TracableStream}
**/

module.exports = function (stream, config) {
	const {active = true} = config;
	if (active === false) {
		return stream;
	}

	const type = getStreamType(stream);

	const TracableCstr = classes[type];
	switch (type) {
		case 'Transform': {
			config.readableObjectMode = stream.readableObjectMode;
			config.writableObjectMode = stream.writableObjectMode;
			config.readableHighWaterMark = stream.readableHighWaterMark;
			config.writableHighWaterMark = stream.writableHighWaterMark;
			break;
		}

		case 'Readable': {
			config.objectMode = stream.readableObjectMode;
			config.readableHighWaterMark = stream.readableHighWaterMark;
			break;
		}

		case 'Writable': {
			config.objectMode = stream.writableObjectMode;
			config.writableHighWaterMark = stream.writableHighWaterMark;
			break;
		}

		default: {
			throw (new Error(`unknown type ${type}`));
		}
	}

	const inst = new TracableCstr(Object.assign({stream}, config));
	return inst;
};
