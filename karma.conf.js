var babel = require('rollup-plugin-babel');

module.exports = function (config) {
    'use strict';

    config.set({
        frameworks: ['jasmine'],

        basePath: '',

        files: [
            'node_modules/babel-polyfill/dist/polyfill.js',
            'specs/helpers/**/*.js',
            'specs/**/*-spec.js'
        ],

        exclude: [],

        preprocessors: {
            'specs/**/*.js': ['rollup']
        },

        rollupPreprocessor: {
            plugins: [
                babel({
                    // only transpile our source code
                    exclude: 'node_modules/**'
                })
            ],

            // will help to prevent conflicts between different tests entries
            format: 'iife',
            sourceMap: 'inline'
        },

        reporters: ['dots'],

        port: 9876,

        colors: true,

        logLevel: config.LOG_INFO,

        autoWatch: true,

        browsers: ['IE', 'Chrome', 'Firefox'],

        customLaunchers: {
            IE_no_addons: {
                base: 'IE',
                flags: ['-extoff']
            }
        }
    });
};
