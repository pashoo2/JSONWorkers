JSONWorkers
===========

 

>   With webpack-like just use\* import \* from “JSONWorkers”\*.

>   With native code use *import \* from “./node_modules/JSONWorker/index.js”*
>   or *\<script src=“./node_modules/JSONWorker/index.js”\>*

**!Does not work with nodejs**

 

**Set the following global JSON API methods:**

### JSON.parseAsync(JSON.parseSync) (str, callback, context, flCompression) parse a given string async/sync with/without a zlib compression

-   str{string} string to parse

    -   callback {Function} when parsed callback({object\|[]\|string\|Error}

    -   context {object} this context will applied for callback.
        callback.call(context, result)

    -   flCompression {boolean} if true, then decompress a string compressed
        with [pako](https://github.com/nodeca/pako)library or

### JSON.stringifyAsync(JSON.stringifySync) (obj, callback, context, flCompression) - stringify a given object async/sync with/without a zlib compression

-   obj {object\|[]\|string} object/array/string to stringify and/or compress
    with zlib

    -   callback {Function} when all done callback({string\|Error}

    -   context {object} this context will applied for callback.
        callback.call(context, result)

    -   flCompression {boolean} if true, then compress the resulted string
