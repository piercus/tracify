const {Buffer} = require('buffer');
const {hrtime} = require('process');

const buildShared = {
	postConstructor(options) {
		const {name, stream, throughputWindow = 1000} = options;
		this.name = name;
		this.stream = stream;
		if (this.push) {
			this.stream.push = this.tracePush.bind(this);
		} else if (this.stream.push) {
			throw (new Error('strange'));
		}

		this.lastThreadId = -1;
		this.threadId = null;
		this.threadMarkers = null;
		this.throughputWindow = throughputWindow;
		this.slidingThreads = [];
	},

	_addMarker(markerName) {
		if (this.threadId === null) {
			throw (new TypeError('no thread'));
		}

		const hrDate = hrtime.bigint().toString();
		const marker = {markerName, hrDate, threadId: this.threadId, streamName: this.name};
		this.threadMarkers.push(marker);
		return marker;
	},
	_destroyThreadId() {
		this.threadMarkers = null;
		this.threadId = null;
	},
	_wrapMessage(message, threadId) {
		threadId ||= this.threadId;

		if (threadId === null || typeof (threadId) === 'undefined') {
			throw (new Error('cannot wrap message without threadId in it'));
		}

		const out = {
			msg: message,
			threadId,
			markers: this.threadMarkers,
		};
		if (this.objectMode) {
			return out;
		}

		return Buffer.from(JSON.stringify(out));
	},
	_unwrapMessage(chunk) {
		let object;
		let message;
		if (this.objectMode) {
			object = chunk;
			message = object.msg;
		} else {
			object = JSON.parse(chunk.toString());
			message = Buffer.from(object.msg.data);
		}

		const {threadId, markers} = object;

		if (this.threadId !== null) {
			throw (new Error('cannot unwrap message while thread is on'));
		}

		this.threadId = threadId;

		if (threadId === null || typeof (threadId) === 'undefined') {
			throw (new Error('cannot unwrap message without threadId in it'));
		}

		this.threadMarkers = markers;

		return message;
	},
	_getNanoLatency(markers, lastMarker) {
		// Console.log({markers})
		const firstMarkerHrTimee = markers.find(marker => marker.markerName === 'read').hrDate;
		if (!firstMarkerHrTimee) {
			throw (new Error('cannot find read marker'));
		}

		return BigInt(lastMarker.hrDate) - BigInt(firstMarkerHrTimee);
	},
	_updateThroughput(marker) {
		const time = Number(BigInt(marker.hrDate) / BigInt(1_000_000));
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
			nanoLatency: Number(nanoLatency),
			markers: this.threadMarkers,
			throughput: this.slidingThreads.length,
		});
		this._destroyThreadId();
	},
};

module.exports = buildShared;
