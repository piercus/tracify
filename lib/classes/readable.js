const {Readable: NodeReadable} = require('stream');

const shared = require('../shared.js');

class Readable extends NodeReadable {
	constructor(options) {
		super(options);
		shared.postConstructor.call(this, options);
	}

	tracePush(chunk) {
		const marker = this._addMarker('push');
		if (chunk === null) {
			this._closeThread(marker);
			return this.push(chunk);
		}

		// This is the maindifference with transform,
		// we do not expect the read stream  push method to be called multiple time in the same function
		// this is not true for transform function, where callback is used to close the thread
		const wrapped = this._wrapMessage(chunk);
		this._closeThread(marker);
		return this.push(wrapped);
	}

	_read(size) {
		this._buildThreadId();
		this._addMarker('read');
		this.stream._read.call(this.stream, size); // eslint-disable-line no-useless-call
	}

	_buildThreadId() {
		if (this.threadId !== null) {
			console.log(this.threadId);
			throw (new TypeError('parallel processing'));
		}

		this.lastThreadId++;
		this.threadMarkers = [];
		this.threadId = this.lastThreadId;
	}
}

for (const a of Object.keys(shared)) {
	if (Readable.prototype[a]) {
		throw (new Error('override not implemented'));
	} else {
		Readable.prototype[a] = shared[a];
	}
}

module.exports = Readable;
