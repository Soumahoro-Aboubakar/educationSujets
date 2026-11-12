#!/usr/bin/env node
require('./cli').run('publish').then((code) => { process.exitCode = code; });
