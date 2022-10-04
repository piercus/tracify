const getStreamType = require('./get-stream-type.js');
const classes = require('./classes/index.js');
/**
* @struct {Object} TraceConfig
* @property {String} name
* @property {String} [throughputWindow=1000]
**/

/**
* @param {Stream} stream to change
* @param {TraceConfig} - config
* @returns {TracableStream}
**/

module.exports = function (stream, config) {
	const type = getStreamType(stream);

	const TracableCstr = classes[type];
	switch (type) {
		case 'Transform': {
			config.readableObjectMode = stream.readableObjectMode;
			config.writableObjectMode = stream.writableObjectMode;

			break;
		}

		case 'Readable': {
			config.objectMode = stream.readableObjectMode;

			break;
		}

		case 'Writable': {
			config.objectMode = stream.writableObjectMode;

			break;
		}

		default: {
			throw (new Error(`unknown type ${type}`));
		}
	}

	const inst = new TracableCstr(Object.assign({stream}, config));
	return inst;
};
