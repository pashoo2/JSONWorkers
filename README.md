JSONWorkers
===========

 

**Set the following global JSON API methods:**

1.  JSON.parseAsync(JSON.parseSync) (str, callback, context, flCompression) -
    parse a given string async/sync with/without a zlib compression

    -   str{string} string to parse

    -   callback {Function} when parsed callback({object\|[]\|string\|Error}

    -   context {object} this context will applied for callback.
        callback.call(context, result)

    -   flCompression {boolean} if true, then decompress a string compressed
        with [pako ](https://github.com/nodeca/pako)library or

2.  JSON.stringifyAsync(JSON.stringifySync) (obj, callback, context,
    flCompression) - stringify a given object async/sync with/without a zlib
    compression

    -   obj {object\|[]\|string} object/array/string to stringify and/or
        compress with zlib

    -   callback {Function} when all done callback({string\|Error}

    -   context {object} this context will applied for callback.
        callback.call(context, result)

    -   flCompression {boolean} if true, then compress the resulted string
