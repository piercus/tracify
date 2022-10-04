const {Buffer} = require('buffer');
const {hrtime} = require('process');

const buildShared = {
	postConstructor(options) {
		const {name, stream, throughputWindow = 1000, copyKeys = [], skipUnwrap = false} = options;
		this.name = name;
		this.stream = stream;
		if (this.push) {
			this.stream.push = this.tracePush.bind(this);
		} else if (this.stream.push) {
			throw (new Error('strange'));
		}

		this.lastThreadIndex = -1;

		this.threadId = null;
		this.threadMarkers = null;
		this.threadIndex = null;

		this.throughputWindow = throughputWindow;
		this.slidingThreads = [];
		this.skipUnwrap = skipUnwrap;
		for (const key of copyKeys) {
			this[key] = this.stream[key];
		}
	},
	_getChunkInfo(chunk) {
		if (Buffer.isBuffer(chunk)) {
			return {
				l: Buffer.length(chunk),
			};
		}

		if (Array.isArray(chunk)) {
			return {
				l: chunk.length,
			};
		}

		if (typeof (chunk) === 'object') {
			return {
				keys: Object.keys(chunk),
			};
		}

		return null;
	},
	_setThreadId(value, markers) {
		if (this.threadId !== null) {
			throw (new Error('cannot unwrap message while thread is on'));
		}

		if (value === null || typeof (value) === 'undefined' || !Array.isArray(markers)) {
			throw (new Error(`Cannot unwrap message ${value} without threadId in it (writableObjectMode: ${this.writableObjectMode})`));
		}

		this.threadId = value;
		this.threadIndex = this.lastThreadIndex++;
		this.threadMarkers = markers;
	},
	_addMarker(markerName, info) {
		if (this.threadId === null) {
			throw (new TypeError('no thread'));
		}

		const hrTime = hrtime.bigint().toString();
		const date = new Date().toISOString();
		const marker = {markerName, hrTime, date, threadId: this.threadId, streamName: this.name};
		if (info) {
			marker.info = info;
		}

		this.threadMarkers.push(marker);
		return marker;
	},
	_destroyThreadId() {
		this.threadMarkers = null;
		this.threadId = null;
		this.threadIndex = null;
	},
	_wrapMessage(message, threadId) {
		if (typeof (message) === 'undefined') {
			return message;
		}

		threadId ||= this.threadId;

		if (threadId === null || typeof (threadId) === 'undefined') {
			throw (new Error('cannot wrap message without threadId in it'));
		}

		const out = {
			msg: message,
			threadId,
			markers: this.threadMarkers,
		};
		if (this.readableObjectMode) {
			return out;
		}

		return Buffer.from(JSON.stringify(out));
	},
	_unwrapMessage(chunk) {
		let object;
		let message;
		if (this.writableObjectMode) {
			if (Buffer.isBuffer(chunk)) {
				throw (new TypeError(`${this.name} input is a buffer while writableObjectMode, please check previous stream`));
			}

			object = chunk;
			message = object.msg;
		} else {
			object = JSON.parse(chunk.toString());
			message = Buffer.from(object.msg.data);
		}

		const {threadId, markers} = object;

		this._setThreadId(threadId, markers);

		if (typeof (message) === 'undefined') {
			throw (new TypeError('undefined message'));
		}

		if (this.skipUnwrap) {
			return chunk;
		}

		return message;
	},
	_getNanoLatency(markers, lastMarker) {
		// Console.log({markers})
		const firstMarkerHrTimee = markers.find(marker => marker.markerName === 'read').hrTime;
		if (!firstMarkerHrTimee) {
			throw (new Error('cannot find read marker'));
		}

		return BigInt(lastMarker.hrTime) - BigInt(firstMarkerHrTimee);
	},
	_updateThroughput(marker) {
		const time = Number(BigInt(marker.hrTime) / BigInt(1_000_000));
		this.slidingThreads = this.slidingThreads.filter(ev => ev >= (time - this.throughputWindow));
		this.slidingThreads.push(time);
	},
	_construct(callback) {
		if (this.stream._construct) {
			this.stream._construct.call(this.stream, callback); // eslint-disable-line no-useless-call
		} else {
			callback();
		}
	},
	_closeThread(lastMarker) {
		this._updateThroughput(lastMarker);
		const nanoLatency = this._getNanoLatency(this.threadMarkers, lastMarker);
		const latency = Number(nanoLatency / BigInt(1_000_000));
		this.emit('trace', {
			threadId: this.threadId,
			latency,
			threadIndex: this.threadIndex,
			streamName: this.name,
			nanoLatency: Number(nanoLatency),
			markers: this.threadMarkers,
			throughput: this.slidingThreads.length,
		});
		this._destroyThreadId();
	},
};

module.exports = buildShared;