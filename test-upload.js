const FormData = require('form-data');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testImageUpload() {
    console.log('Testing image upload endpoint...');
    
    try {
        // Create a test image file
        const testImagePath = 'test-upload.jpg';
        const testContent = Buffer.from('fake-image-content');
        fs.writeFileSync(testImagePath, testContent);
        
        // Create form data
        const form = new FormData();
        form.append('file', fs.createReadStream(testImagePath));
        
        // Send request to upload endpoint
        const response = await fetch('http://localhost:5000/api/images/upload', {
            method: 'POST',
            body: form
        });
        
        const result = await response.json();
        console.log('Upload response:', response.status, result);
        
        // Clean up test file
        fs.unlinkSync(testImagePath);
        
    } catch (error) {
        console.error('Upload test failed:', error);
    }
}

testImageUpload();
