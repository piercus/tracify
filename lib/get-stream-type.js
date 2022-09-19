module.exports = function(stream){
	if(!stream.pipe){
		throw(new Error("invalid stream instance"))
	}
	if(stream._transform){
		return 'Transform'
	}
	if(stream.read){
		return 'Readable'
	}
	if(stream.write){
		return 'Writable'
	}	
}