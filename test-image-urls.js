// Simple test to check if images are accessible
const testUrls = [
    'http://localhost:8080/img/products/c4-1.png',
    'http://localhost:8080/img/products/c4-2.png',
    'http://localhost:8080/img/products/c5-1.png'
];

console.log('Testing image URLs...');
testUrls.forEach(url => {
    fetch(url)
        .then(response => {
            console.log(`${url}: ${response.status} ${response.ok ? 'OK' : 'FAILED'}`);
        })
        .catch(error => {
            console.log(`${url}: ERROR - ${error.message}`);
        });
});
