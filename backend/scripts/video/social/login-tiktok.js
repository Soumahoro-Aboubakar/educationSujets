#!/usr/bin/env node
require('./cli').run('tiktok').then((code) => { process.exitCode = code; });
