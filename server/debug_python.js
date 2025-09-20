const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Python debug test...');

const pythonScript = path.join(__dirname, 'utils', 'dicomHelper.py');
const dicomFile = path.join(__dirname, 'uploads', 'PAT_PALAK_57F5AE30', '0002.DCM');

console.log('Python script path:', pythonScript);
console.log('DICOM file path:', dicomFile);

const args = ['extract_slices', dicomFile, 'PNG', '3'];
console.log('Arguments:', args);

const pythonProcess = spawn('python', [pythonScript, ...args]);

let stdout = '';
let stderr = '';

pythonProcess.stdout.on('data', (data) => {
    console.log('STDOUT chunk received:', data.toString().length, 'bytes');
    stdout += data.toString();
});

pythonProcess.stderr.on('data', (data) => {
    console.log('STDERR chunk received:', data.toString());
    stderr += data.toString();
});

pythonProcess.on('close', (code) => {
    console.log('Python process closed with code:', code);
    console.log('Total STDOUT length:', stdout.length);
    console.log('Total STDERR length:', stderr.length);
    
    if (stderr) {
        console.log('STDERR content:', stderr);
    }
    
    if (stdout) {
        console.log('First 500 chars of STDOUT:', stdout.substring(0, 500));
        try {
            const result = JSON.parse(stdout);
            console.log('Parsed result success:', result.success);
            console.log('Total slices extracted:', result.total_slices_extracted);
            console.log('Slices array length:', result.slices ? result.slices.length : 'undefined');
        } catch (error) {
            console.log('JSON parse error:', error.message);
        }
    } else {
        console.log('No STDOUT received!');
    }
});

pythonProcess.on('error', (error) => {
    console.log('Python process error:', error);
});
