
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('h1').textContent = '2';
}, false);

function downloadIndex() {
    //const data = 'Hello, world!';
    const data = localStorage.getItem('test-key');
    const blob = new Blob([data], { type: 'text/plain' });
    const fileURL = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = fileURL;
    downloadLink.download = 'example.txt';
    document.body.appendChild(downloadLink);
    downloadLink.click();
}