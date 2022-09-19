const fs = require('fs');
const {PassThrough} = require('stream');
const test = require('ava');
const tracify = require('../lib/index.js');
//
// process.on('uncaughtException', function(err) {
//   console.log(err.stack);
//   throw err;
// });

test('simple usage 2', t => {
	const readStream = tracify(fs.createReadStream('./test/file.txt'), {name: 'readStream'});
	const writeStream = tracify(fs.createWriteStream('./tmp/file.txt'), {name: 'writeStream'});
	let n = 0;
	writeStream.on('trace', info => {
		console.log(info);
		t.is(info.threadId, n);
		t.true((info.latency < 50));
		if (n > 20) {
			t.true((info.throughput > 10));
		}

		t.is(info.markers.length, 4);

		t.is(info.markers[0].streamName, 'readStream');
		t.is(info.markers[0].markerName, 'read');

		t.is(info.markers[1].streamName, 'readStream');
		t.is(info.markers[1].markerName, 'push');

		t.is(info.markers[2].streamName, 'writeStream');
		t.is(info.markers[2].markerName, 'write');

		t.is(info.markers[3].streamName, 'writeStream');
		t.is(info.markers[3].markerName, 'callback');

		n++;
	});

	const outStream = readStream.pipe(writeStream);

	return new Promise((resolve, reject) => {
		outStream.on('error', reject);
		outStream.on('finish', () => {
			t.true(n > 40);
			resolve();
		});
	});
});

test('simple usage with transform', t => {
	const readStream = tracify(fs.createReadStream('./test/file.txt'), {name: 'readStream'});
	const writeStream = tracify(fs.createWriteStream('./tmp/file.txt'), {name: 'writeStream'});
	const pass = tracify(new PassThrough(), {name: 'middle'});
	let n = 0;
	writeStream.on('trace', info => {
		t.is(info.threadId, n + '-0');
		t.true((info.latency < 50));
		if (n > 20) {
			t.true((info.throughput > 10));
		}

		t.is(info.markers.length, 6);

		t.is(info.markers[0].streamName, 'readStream');
		t.is(info.markers[0].markerName, 'read');

		t.is(info.markers[1].streamName, 'readStream');
		t.is(info.markers[1].markerName, 'push');

		t.is(info.markers[2].streamName, 'middle');
		t.is(info.markers[2].markerName, 'transform');

		t.is(info.markers[3].streamName, 'middle');
		t.is(info.markers[3].markerName, 'callback');

		t.is(info.markers[4].streamName, 'writeStream');
		t.is(info.markers[4].markerName, 'write');

		t.is(info.markers[5].streamName, 'writeStream');
		t.is(info.markers[5].markerName, 'callback');

		n++;
	});

	const outStream = readStream.pipe(pass).pipe(writeStream);

	return new Promise((resolve, reject) => {
		outStream.on('error', reject);
		outStream.on('finish', () => {
			t.true(n > 40);
			resolve();
		});
	});
});

