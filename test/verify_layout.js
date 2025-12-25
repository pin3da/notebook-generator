const spawn = require('child_process').spawn;
const fs = require('fs');
const path = require('path');

const bin = path.resolve(__dirname, '../bin/notebookgen');
const src = path.resolve(__dirname, 'dummy_src');

function run(args, name) {
    return new Promise((resolve, reject) => {
        console.log(`Running test: ${name}`);
        const child = spawn('node', [bin, src, ...args], { stdio: 'inherit' });
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`Test ${name} passed`);
                resolve();
            } else {
                console.error(`Test ${name} failed with code ${code}`);
                reject(code);
            }
        });
    });
}

async function main() {
    try {
        // Test 1: Single column, portrait
        await run(['-c', '1', '-O', 'portrait', '-o', 'test/output_portrait_1col.pdf'], 'Portrait 1 Col');

        // Test 2: Default (Portrait, 1 col)
        // We expect this to act like the new default
        await run(['-o', 'test/output_default.pdf'], 'Default (Portrait/1col)');

        console.log('All tests passed!');
    } catch (e) {
        console.error('Verification failed');
        process.exit(1);
    }
}

main();
