import sourcemaps from "rollup-plugin-sourcemaps";
import resolve from "rollup-plugin-node-resolve";
import babel from "rollup-plugin-babel";
import cjs from "rollup-plugin-commonjs";
import replace from 'rollup-plugin-re';
import { terser } from "rollup-plugin-terser";

const workerReplaceRules = {
    'eval(': '[eval][0](',
    'require("fs")': 'undefined',
    "require('fs')": 'undefined',
    'require("path")': 'undefined',
    "require('path')": 'undefined'
};

const createWorkerReplacePlugin = () => replace({
    include: ['./src/amrnb.js', './src/amrwb.js'],
    replaces: workerReplaceRules
});

export default [
    {
        input: './src/BenzAMRRecorder.js',
        plugins: [
            sourcemaps(),
            resolve({
                jsnext: true,
                browser: true
            }),
            createWorkerReplacePlugin(),
            babel({
                exclude: ['./node_modules/**', './src/amrnb.js', './src/amrwb.js', './src/silk.js']
            }),
            cjs()
        ],
        output: [
            {
                name: 'BenzAMRRecorder',
                file: './BenzAMRRecorder.js',
                format: 'umd',
                strict: false,
                sourcemap: true
            },
            {
                file: './BenzAMRRecorder.mjs',
                format: 'esm',
                sourcemap: false
            },
            {
                file: './BenzAMRRecorder.cjs',
                format: 'cjs',
                strict: false,
                sourcemap: false
            }
        ]
    },
    {
        input: './src/BenzAMRRecorder.js',
        plugins: [
            resolve({
                jsnext: true,
                browser: true
            }),
            createWorkerReplacePlugin(),
            babel({
                exclude: ['./node_modules/benz-recorderjs/**', './src/amrnb.js', './src/amrwb.js', './src/silk.js']
            }),
            cjs(),
            terser({
                compress: {},
                mangle: {
                    safari10: true,
                    properties: {
                        regex: /^_[^_]/
                    }
                },
                ie8: false,
                safari10: true,
                warnings: true
            })
        ],
        output: [
            {
                name: 'BenzAMRRecorder',
                file: './BenzAMRRecorder.min.js',
                format: 'umd',
                strict: false,
                sourcemap: false
            }
        ]
    }
]
