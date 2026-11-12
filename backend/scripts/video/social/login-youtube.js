#!/usr/bin/env node
require('./cli').run('youtube').then((code) => { process.exitCode = code; });
