const {Writable: NodeWritable} = require('stream');

const shared = require('../shared.js');

class Writable extends NodeWritable {
	constructor(opts){
		opts.objectMode = true;		
		super(opts)
		shared.postConstructor.call(this, opts);
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
	if(!Writable.prototype[a]){
		Writable.prototype[a] = shared[a];	
	} else {
		throw(new Error('override not implemented'))
	}
}

module.exports = Writable;
