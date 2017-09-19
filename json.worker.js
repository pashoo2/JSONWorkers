/*global LZString*/
/*global pako*/
/*global MessagePort*/
var _flThisIsWorkerConext = (self.document === undefined)

function pakoCompress(str) {
    return pako.deflate( str, { to: 'string' });    
}

function pakoDecompress(str) {
    return pako.inflate( str, { to: 'string' }); 	//method for compression    
}

if ( _flThisIsWorkerConext === true ) { //if the worker context

    var _ports = []; //all incoming ports
    
    importScripts("/bower_components/pako/dist/pako.min.js");
    
    if (pako) { //if the compression tool is available
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
    
    //on message from the main thread
    
    function onIncomingMessagePort(e) {
        var data = e.data;
        
        if ( data._JA === 0 
             && data.messagePort != null ) {
            
            var port;
            if (e.ports != null 
                && e.ports[0] instanceof MessagePort
                && _ports.indexOf(port) === -1 ) { //if the Message Port is given
                    port = e.ports[0];
                    _ports[_ports.length] = port;
            } else 
                if ( data.messagePort === "" ) { //if this worker must be used instead of a message port 
                    port = self;         
                }
            
            if ( port != null ) {
                setPortLisneres(port);
            }
            
        }
    };
    
    self.onmessage = onIncomingMessagePort;
    
    //set listeners of a messages from the mesage port
    function setPortLisneres(port) {
        
        function messagesListener(e) { //listener of the messages from the port
            var data = e.data;
            if ( data._JA === 0 ) {
                if ( typeof(data.messagePort) === "object"
                    && data.messagePort != null ) {
                        onIncomingMessagePort(e);
                } else 
                    if( data.closed === true ) { 
                        port.onmessage = null;
                        if ( port instanceof MessagePort ) {
                            port.close(); 
                        }
                    }
                else {
                    //new task for the JSON
                    var res = { //the resulted message return back to caller
                        id : data.id
                    };
                    var flCompression = data.flCompression; //if the compression is required
                    var toProcess = data.JSON;
                    try { //realize the method, but in the sync mode
                        
                        if ( flCompression === true ) { //if the compressio required
                            if ( data.method === "parse" ) {
                                res.JSON = JSON.parse(JSON._decompress(toProcess));
                            } else if ( typeof(toProcess) === "string" ) { //if a string is given, compress it and return
                                res.JSON = JSON._compress(toProcess); 
                            } else { //if not string, then stringify it befre compression
                                res.JSON = JSON._compress(JSON.stringify( toProcess ));
                            }
                        } else {
                            if ( typeof(toProcess) === "string"
                                && data.method === "stringify") {
                                   res.JSON = toProcess; 
                            } else {
                                res.JSON = JSON[data.method]( toProcess );
                            }
                        }
                    } catch(e) { //if an error
                        if ( typeof(toProcess) === "string" ) {
                            res.JSON = toProcess;    
                        } else {
                            res.error = e.message;
                        }
                    }
                    res._JA = 0;
                    port.postMessage( res );
                }
            }
        }
        
        port.onmessage = messagesListener;    
    
        //start sending throught the port
        if ( port instanceof MessagePort ) {
            port.start();    
        }
        
    }

}