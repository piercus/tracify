# Tracify

## Install

`npm install tracify`

## Simple Usage

```js
const fs = require('fs');
const tracify = require('tracify');

const readStream = tracify(fs.createReadStream('file.txt'), {name: 'readStream'});
const writeStream = tracify(fs.createReadStream('file.txt'), {name: 'writeStream'});

writeStream.on('trace', (info) => {
	console.log(info)
});

readStream.pipe(writeStream);
```

will output 

```

```