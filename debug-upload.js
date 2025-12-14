// Simple debug script to check admin panel image upload
console.log('=== Admin Panel Image Upload Debug ===');

// Check if elements exist
const uploadBtn = document.getElementById('p_imageUploadBtn');
const fileInput = document.getElementById('p_imageFile');
const imagePathInput = document.getElementById('p_imagePath');
const preview = document.getElementById('p_imagePreview');

console.log('Upload button exists:', !!uploadBtn);
console.log('File input exists:', !!fileInput);
console.log('Image path input exists:', !!imagePathInput);
console.log('Preview exists:', !!preview);

// Check if event listeners are attached
if (uploadBtn) {
    console.log('Upload button found, adding click test');
    uploadBtn.addEventListener('click', function(e) {
        console.log('Upload button clicked!', e);
        if (fileInput) {
            fileInput.click();
        } else {
            console.error('File input not found!');
        }
    });
}

if (fileInput) {
    console.log('File input found, adding change test');
    fileInput.addEventListener('change', function(e) {
        console.log('File input changed!', e);
        console.log('Files selected:', e.target.files);
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            console.log('File details:', {
                name: file.name,
                type: file.type,
                size: file.size
            });
            
            // Test upload function
            uploadImage(file).then(result => {
                console.log('Upload successful:', result);
                if (imagePathInput) {
                    imagePathInput.value = result.url;
                }
                if (preview) {
                    preview.src = result.url;
                    preview.style.display = 'block';
                }
            }).catch(error => {
                console.error('Upload failed:', error);
            });
        }
    });
} else {
    console.error('File input not found!');
}

// Test upload function directly
async function uploadImage(file) {
    console.log('Testing upload with file:', file);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('http://localhost:5000/api/images/upload', {
            method: 'POST',
            body: formData
        });
        
        console.log('Upload response status:', response.status);
        const result = await response.json();
        console.log('Upload response data:', result);
        
        return result;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

console.log('=== Debug script loaded ===');
