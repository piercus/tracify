const {Transform: NodeTransform} = require('stream');

const shared = require('../shared.js');

class Transform extends NodeTransform {
	constructor(options) {
		super(options);
		shared.postConstructor.call(this, options);
	}

	_transform(chunk, encoding, callback) {
		const unwrapped = this._unwrapMessage(chunk);
		this._addMarker('transform', this._getChunkInfo(chunk));
		this.subThreadId = 0;
		const wrappingCb = (error, chunk) => {
			const marker = this._addMarker('callback', this._getChunkInfo(chunk));
			const wrapped = this._wrapMessage(chunk, this.threadId + '-' + this.subThreadId);
			this._closeThread(marker);
			return callback(error, wrapped);
		};

		return this.stream._transform(unwrapped, encoding, wrappingCb);
	}

	tracePush(chunk) {
		const marker = this._addMarker('push', this._getChunkInfo(chunk));
		if (chunk === null) {
			this._closeThread(marker);
			return this.stream.push(chunk);
		}

		const result = this.push(this._wrapMessage(chunk, this.threadId + '-' + this.subThreadId));
		this.subThreadId++;
		return result;
	}
}

for (const a of Object.keys(shared)) {
	if (Transform.prototype[a]) {
		throw (new Error('override not implemented'));
	} else {
		Transform.prototype[a] = shared[a];
	}
}

module.exports = Transform;
