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
	const inst = new TracableCstr(Object.assign({stream}, config));
	return inst;
};
