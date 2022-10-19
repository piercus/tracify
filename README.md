# Tracify

Ligh-weight profiling tool for Node.js Streams API :
* Total nanoseconds Latency
* Detailed Stream by Stream Latency
* Throughput

## Install

`npm install tracify`

## Simple Usage

```js
const fs = require('fs');
const tracify = require('tracify');

const readStream = tracify(fs.createReadStream('file.txt'), {name: 'readStream'});
const writeStream = tracify(fs.createWriteStream('out.txt'), {name: 'writeStream'});

writeStream.on('trace', (info) => {
	console.log(info)
});

readStream.pipe(writeStream);
```

will output 

```
{
  threadId: 0,
	nanoLatency: 11523856,
  latency: 11,
  markers: [
    {
      markerName: 'read',
      date: '2022-09-19T12:29:00.021Z',
      threadId: 0,
      streamName: 'readStream'
    },
    {
      markerName: 'push',
      date: '2022-09-19T12:29:00.021Z',
      threadId: 0,
      streamName: 'readStream'
    },
    {
      markerName: 'write',
      date: '2022-09-19T12:29:00.025Z',
      threadId: 0,
      streamName: 'writeStream'
    },
    {
      markerName: 'callback',
      date: '2022-09-19T12:29:00.032Z',
      threadId: 0,
      streamName: 'writeStream'
    }
  ],
  throughput: 1
}
...
{
  threadId: 43,
	nanoLatency: 6573235,	
  latency: 6,
  markers: [
    {
      markerName: 'read',
      date: '2022-09-19T12:29:00.224Z',
      threadId: 43,
      streamName: 'readStream'
    },
    {
      markerName: 'push',
      date: '2022-09-19T12:29:00.228Z',
      threadId: 43,
      streamName: 'readStream'
    },
    {
      markerName: 'write',
      date: '2022-09-19T12:29:00.229Z',
      threadId: 43,
      streamName: 'writeStream'
    },
    {
      markerName: 'callback',
      date: '2022-09-19T12:29:00.230Z',
      threadId: 43,
      streamName: 'writeStream'
    }
  ],
  throughput: 44
}
```

## Config

```js
/**
* @typedef {Object} TraceConfig
* @property {String} name the name of the stream
* @property {Boolean} [active=true] set it to false to deactivate tracify
* @property {String} [throughputWindow=1000] the time window used to calculate the throughput (in ms)
* @property {Array} [copyKeys = []] list of keys to copy from source stream to tracified stream (useful for custom stream with custom attributes)
* @property {Boolean} [skipUnwrap = false] set this to true if the input data are not wrapped in a tracified format
**/
```