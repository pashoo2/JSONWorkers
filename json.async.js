import pako from './node_modules/pako/index.js';

var _flThisIsWorkerConext = (self.document === undefined);

if (!!pako) { //if the compression tool is available
	function pakoCompress(str) {
	    return pako.deflate( str, { to: 'string' });    
	}
	
	function pakoDecompress(str) {
	    return pako.inflate( str, { to: 'string' }); 	//method for compression    
	}
	JSON._compress   = pakoCompress; 	//method for compression
    JSON._decompress = pakoDecompress; //method for decompression

} else { //if the compression tool does not available
	
	console.log(new Error("JSON.async. Compression library was not found. Compression is unavailable."));
	
	function withoutCompression(arg){ //return without compression
		return arg;	
	}
	
	JSON._compress   = withoutCompression;
	JSON._decompress = withoutCompression;
}

JSON._flStartSharedWorker = false; //self != null && self.SharedWorker != null; //if Shared worker is available start it insted of Worker

//start worker and return message port for it
JSON._startWorker = function() {
	var objWorker = Worker;

	if ( this._flStartSharedWorker === true ) {
		if ( _flThisIsWorkerConext === true ) { //if the SharedWorkers are available, then tha main thread must start it and send the messagePort for this Worker side
			return null;
		}
		objWorker = SharedWorker;	
	}
				
	//var prefixForPath = window.location.pathname === "/" ? "." : "..";  //if not the root path, then try to upside to get json.worker relative path
	var worker = new objWorker( '/libJS/JSONWebWorker/json.worker.js' ); //create it
	JSON["_worker"] = worker;
	
	var messagePort = JSON._createNewMessagePort(worker); //create a new message port
	JSON._setMessagePort(messagePort); //set as the default message port

	worker.onerror = function(e){
		console.log(e.error);
	};
	return messagePort;
};

//set the given message port as the default port for handling
JSON._setMessagePort = function(messagePort){
	JSON["_messagePort"] = messagePort;
 	messagePort.onmessage = onMessage;
	
	if ( this._flStartSharedWorker === true ) { //if it is necessary to start messsage port
		messagePort.start();
	}
	
	if ( _flThisIsWorkerConext !== true
			&& this._flStartSharedWorker === true ) {
				JSON._sendQueuedMessagePorts(); //send all the queued message ports to the shared worker for handling it
	}
	
};

JSON._putToListCreatedPort = function(port) {
	if ( JSON._queueMessagePorts == null ) { //put to the list of created ports
		JSON._createdMessagePorts = [port];
	} else {
		JSON._createdMessagePorts[JSON._queueMessagePorts.length] = port;
	}	
};

//create a new message channel and send it's port1 to the JSON shared worker for handling
//return port2 of the created message channel
JSON._createNewMessagePort = function( worker ){
	
	if ( JSON._flStartSharedWorker === false ) { //if a SharedWorkers unavailable
		if ( worker instanceof Worker ) { //if the worker is given
			
			if ( JSON["_worker"] == null ) {
				JSON["_worker"] = worker;
			}
			
			JSON["_worker"].postMessage({ //send a message to the worker that the message port is the worker itself (istead of a MessagePort instance)
				_JA : 0,
				messagePort : ""
			});
			
			JSON._putToListCreatedPort(worker);
			return worker;	
		}
	} else {
		var msgChannel = new MessageChannel();
		if ( JSON["_worker"] != null ) { //if the worker for json is exists, send the first port to the worker. When it receives a message port, it can handle messages from the port
			
			JSON["_worker"].postMessage({
				_JA : 0,
				messagePort : msgChannel.port2
			}, [msgChannel.port2]);
					
			JSON._putToListCreatedPort(msgChannel.port2);
			
		} else { //put the to the ports, waiting for opening. They will be sent to the shared worker after it will has been opened
			if ( JSON._queueMessagePorts == null ) {
				JSON._queuedMessagePorts = [msgChannel.port1];
			} else {
				JSON._queuedMessagePorts[JSON._queueMessagePorts.length] = msgChannel.port2;
			}
		}
		JSON._putToListCreatedPort(msgChannel.port1); //put the port2 to the list of created ports
		return msgChannel.port1;
	}
};

//close all created mesage ports from the list JSON._createdMessagePorts
JSON._closeCreatedMessagePorts = function() {
	if ( Array.isArray(JSON._createdMessagePorts) === true ) {
		var closingMsg = {_JA:0, closed : true};
		for( var i =0, len = JSON._createdMessagePorts.length; i < len; i++ ) {
			var port = JSON._createdMessagePorts[i];
			if ( this._flStartSharedWorker === true ) {
				port.postMessage(closingMsg); //send the message to the JSON shared worker , that the port was closed
			}
			port.close();
		}
	}
};

//send to the JSON shared worker all ports from the list JSON._queuedMessagePorts
JSON._sendQueuedMessagePorts = function() {
	if ( JSON["_worker"] != null
			&& Array.isArray(JSON._queuedMessagePorts) === true ) {
				for( var i =0, len = JSON._queuedMessagePorts.length; i < len; i++ ) {
					var port = JSON._queuedMessagePorts[i];
					JSON["_worker"].postMessage({ //send to the shared worker message port for handling
						_JA : 0,
						messagePort : port
					}, [port]);
				}
		JSON._queuedMessagePorts = []; //clear all
	}
};

//put callback function to the queue of JSON strings to parse and return unique ID of the callback into the queue
function putCallbackToQueue(callback, context) {
  var currID;
  if ( JSON["_callbacksQueue"] === undefined ) {
    JSON["_callbacksQueue"] = []; //queue of the JSON strings to parse = [JSONID : callback]  
    currID = JSON["_callbacksQueueCurrentID"] = 0;  //an ID for the current callback
  } else if ( JSON["_callbacksQueueCurrentID"] > 400 ) { //reset the id
    currID = JSON["_callbacksQueueCurrentID"] = 0;
  } else {
    currID = ++JSON["_callbacksQueueCurrentID"];  
  }
  if ( context != null ) {
    JSON["_callbacksQueue"][currID] = [callback, context];
  } else {
    JSON["_callbacksQueue"][currID] = callback;
  }
  return currID;
}

function onMessage(e) {
	var incomingObj = e.data; //={messageID,JSON} messageID - id of the message in the queue, JSON - parsed JSON
	if ( incomingObj._JA !== 0 ) {
		return;	
	}
	if ( incomingObj.error === undefined ) { //message has sucessfully parsed
	  var json = incomingObj.JSON;  //the resule - is parsed json object
	} else {
	  json = new Error(incomingObj.error); //the result is an error, that was reached into the worker
	}
	var callbackID = incomingObj.id;
	if ( callbackID != null ) {
	  var _callback = JSON["_callbacksQueue"][callbackID];
	  if ( typeof(_callback) === "function" ) { //without a context
	    _callback( json );
	  } else 
		  if ( _callback != null && typeof(_callback[0]) === "function" ) { //with a context
		  	_callback[0].call( _callback[1], json );
		  }
	  JSON["_callbacksQueue"][callbackID] = null; //clear the reference to the callback into the queu
	}
}

//send a necessary method = "parse, stringify" to the worker to realize the async mode for these methods
JSON["_async"] = function(method, JSONToDo, callback, context, flCompression) {
  var messagePort, json;
  
  if ( JSON["_messagePort"] == null
  		&& ( _flThisIsWorkerConext === false //into the main thread
  			|| JSON._flStartSharedWorker === false ) ) { //if the shared workers are unavailable
 				messagePort = JSON._startWorker();
 	} else {
  		messagePort = JSON["_messagePort"];
 	}
 	
	if ( messagePort != null ) { //workers supported
	  var data = {
	    JSON        	: JSONToDo, //string to parse or object to stringisy
	    method      	: method, //string = "stringify","parse"
	    flCompression	: flCompression, //true/false - if the compression is required
	    id          	: putCallbackToQueue(callback, context), //id of the callback
	    _JA 				: 0 //special
	  };
	  try {
	    messagePort.postMessage( data );
	  } catch (e) {
	    JSON["_callbacksQueue"][data.id] = null; //delete frim queue
	    json = JSON[method]( JSONToDo ); //the result of JSON method
	    if ( context == null ) {
	      callback(json);
	    } else {
	      callback.call(context, json);  
	    }
	  }
	} else	{ //message port for shared worker does not available therefor an async methods are not available too    
    try {
      json = JSON[method]( JSONToDo ); //realize the method, but in the sync mode
    } catch(e) {
      json = e;//if an error
    }
    if ( context == null ) {
      callback( json );
    } else {
      callback.call(context, json);  
    }
  }  
};

/*
	flCompression - then JSON compressed string
*/
JSON.parseSync = function parceSync(JSONString, callback, context, flCompression) {
	var res;
	
	if ( flCompression === true ) {
		res = JSON.parse(JSON._decompress(JSONString));
	} else {
		res = JSON.parse(JSONString);
	}
	
	if ( typeof(callback) === "function" ) {
		if ( context != null ) {
			callback.call(context, res);	
		} else {
			callback(res);
		}
	} else {
		return Promise.resolve(res);	
	}
};

/*
	flCompression - then JSON compressed string
	context - context for callback
*/
JSON.parseAsync = function(JSONString, callback, context, flCompression) {
  
  if ( typeof(context) === "boolean" ) { //the compression flag is given instead of the context
  	flCompression = context;
  	context = null;
  }
  
  if ( typeof(callback) === "boolean" ) { //the compression flag is given instead of the context
  	flCompression = callback;
  	callback = null;
  	context = null;
  }
  
  if ( _flThisIsWorkerConext === true
  		&& JSON._flStartSharedWorker === false ) { //if the Worker instance is not available
  			JSON.parseAsync = JSON.parseSync;
  } else { //if the Worker instance is available
  	if ( typeof(JSONString) === "string" ) {
	    if ( typeof(callback) !== "function" ) { //if callback is not defined, return a Promise, resolved when callback will be called
	    	return new Promise(
		    		function(resolve, reject){
		    			var timeout = setTimeout(
		    				function(){
				    			reject(new Error("Timeout"));				
				    		}, 
				    		JSON["_messagePort"] == null ? 5000 : 200 //set timeout time depending on if the Worker has been started already
				    	);
		    			JSON["_async"]("parse", JSONString, 
		    				function(res) {
		    					clearTimeout(timeout);
		    					resolve(res);	
		    				}
		    				, context, flCompression);
		    		}	
	    	);
	    } else {
	    	JSON["_async"]("parse", JSONString, callback, context, flCompression);  
	    }
	  } else {
	    var err = new Error("Only a strings can be parsed"); 
	    if ( typeof(callback) === "function" ) {
	        callback(err);    
	    }
	    return err;
	  }
	 }

};

/*
	flCompression - then the resulted string must be compressed
	context - context for callback
*/
JSON.stringifySync = function parceSync(objToStringify, callback, context, flCompression) {
	
	var res;
	if ( flCompression === true ) {
		res = JSON._compress(JSON.stringify(objToStringify));	
	} else {
		res = JSON.stringify(objToStringify);	
	}
	
	if ( typeof(callback) === "function" ) {
		if ( context != null ) {
			callback.call(context, res);	
		} else {
			callback(res);
		}
	} else {
		return Promise.resolve(res);	
	}
};

/*
	flCompression - then the resulted string must be compressed
	context - context for callback
*/
JSON.stringifyAsync = function(objToStringify, callback, context, flCompression) {
  
  if ( typeof(context) === "boolean" ) { //the compression flag is given instead of the context
  	flCompression = context;
  	context = null;
  }
  
  if ( typeof(callback) === "boolean" ) { //the compression flag is given instead of the context
  	flCompression = callback;
  	callback = null;
  	context = null;
  }
  
  if ( _flThisIsWorkerConext === true
  		&& JSON._flStartSharedWorker === false ) { //if the Worker instance is not available
  			JSON.stringifyAsync = JSON.stringifySync;
  } else { //if the Worker instance is available
  	if ( typeof(callback) !== "function" ) { //if callback is not defined, return a Promise, resolved when callback will be called
	    	return new Promise(
		    		function(resolve, reject){
		    			var timeout = setTimeout(
		    					function(){
				    				reject(new Error("Timeout"));				
				    			}, 
				    			JSON["_messagePort"] == null ? 5000 : 200 //set timeout time depending on if the Worker has been started already
				    		);
		    			JSON["_async"]("stringify", objToStringify, 
		    				function(res) {
		    					clearTimeout(timeout);
		    					resolve(res);	
		    				}
		    				, context, flCompression);
		    		}	
	    	);
	    } else {
  			JSON["_async"]("stringify", objToStringify, callback, context, flCompression);
	    }
  }
  
};

if ( _flThisIsWorkerConext !== true ) { //when the main window will have been closing, close all messages ports
	 window.addEventListener("beforeunload", JSON._closeCreatedMessagePorts.bind(JSON));
}