#!/usr/bin/env node
require('./cli').run('facebook').then((code) => { process.exitCode = code; });
