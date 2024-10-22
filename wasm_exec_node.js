// Copyright 2021 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

'use strict';

// Comment out the following section that expects command-line arguments and file loading
// if (process.argv.length < 3) {
// 	console.error("usage: go_js_wasm_exec [wasm binary] [arguments]");
// 	process.exit(1);
// }

globalThis.require = require;
globalThis.fs = require('fs');
globalThis.path = require('path');
globalThis.TextEncoder = require('util').TextEncoder;
globalThis.TextDecoder = require('util').TextDecoder;

globalThis.performance ??= require('perf_hooks').performance; // Use `perf_hooks` in Node.js

globalThis.crypto ??= require('crypto'); // Node.js crypto module

require('./wasm_exec.js'); // Load the Go runtime functions

const go = new Go();

// Remove this section that uses `process.argv` and `fs.readFileSync`
// We are now handling wasm loading in TypeScript.
// go.argv = process.argv.slice(2);
// go.env = Object.assign({ TMPDIR: require("os").tmpdir() }, process.env);
// go.exit = process.exit;

// Export `go` object for use in your TypeScript code
module.exports = go;
