const buildShared = {
	postConstructor(options) {
		const {name, stream, throughputWindow = 1000} = options;
		this.name = name;
		this.stream = stream;
		if(this.push){
			this.stream.push = this.tracePush.bind(this)
		} else if(this.stream.push){
			throw(new Error('strange'))
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

		const date = new Date().toISOString();
		const marker = {markerName, date, threadId: this.threadId, streamName: this.name};
		this.threadMarkers.push(marker);
		return marker;
	},
	_destroyThreadId() {
		this.threadMarkers = null;
		this.threadId = null;
	},
	_wrapMessage(message, threadId) {
		threadId ||= this.threadId;
		
		if (threadId === null || typeof(threadId) === 'undefined') {
			throw (new Error('cannot wrap message without threadId in it'));
		}		
		const out = {
			msg: message,
			threadId,
			markers: this.threadMarkers,
		};
		if(this.objectMode){
			return out
		} else {
			return Buffer.from(JSON.stringify(out))
		}
	},
	_unwrapMessage(chunk) {
		
		let obj;
		let msg;
		if(this.objectMode){
			obj = chunk
			msg = obj.msg
		} else {
			obj = JSON.parse(chunk.toString());
			msg = Buffer.from(obj.msg.data)
		}
		
		const {threadId, markers} = obj;
		
		if (this.threadId !== null) {
			throw (new Error('cannot unwrap message while thread is on'));
		}
		this.threadId = threadId;
		
		if (threadId === null || typeof(threadId) === 'undefined') {
			throw (new Error('cannot unwrap message without threadId in it'));
		}
		
		this.threadMarkers = markers;
		
		return msg;
	},
	_getLatency(markers, lastMarker) {
		// console.log({markers})
		const firstMarkerDate = new Date(markers.find(marker => marker.markerName === 'read').date).getTime();
		if (!firstMarkerDate) {
			throw (new Error('cannot find read marker'));
		}
		return new Date(lastMarker.date).getTime() - firstMarkerDate;
	},
	_updateThroughput(marker) {
		const time = new Date(marker.date).getTime()
		this.slidingThreads = this.slidingThreads.filter(ev => ev >= (time - this.throughputWindow));
		this.slidingThreads.push(time);
	},
	_construct(callback){
		if(this.stream._construct){
			this.stream._construct.call(this.stream, callback)
		} else {
			callback()
		}
	},
	_closeThread(lastMarker) {
		this._updateThroughput(lastMarker);
		const latency = this._getLatency(this.threadMarkers, lastMarker);
		this.emit('trace', {
			threadId: this.threadId,
			latency,
			markers: this.threadMarkers,
			throughput: this.slidingThreads.length
		});
		this._destroyThreadId();
	},
};

module.exports = buildShared;
