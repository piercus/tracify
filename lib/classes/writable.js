const {Writable: NodeWritable} = require('stream');

const shared = require('../shared.js');

class Writable extends NodeWritable {
	constructor(options) {
		options.objectMode = true;
		super(options);
		shared.postConstructor.call(this, options);
	}

	_write(chunk, encoding, callback) {
		const unwrapped = this._unwrapMessage(chunk);
		this._addMarker('write');
		const wrappingCb = (error, chunk) => {
			const marker = this._addMarker('callback');
			this._closeThread(marker);
			return callback(error, chunk);
		};

		return this.stream._write(unwrapped, encoding, wrappingCb);
	}
}

for (const a of Object.keys(shared)) {
	if (Writable.prototype[a]) {
		throw (new Error('override not implemented'));
	} else {
		Writable.prototype[a] = shared[a];
	}
}

module.exports = Writable;
