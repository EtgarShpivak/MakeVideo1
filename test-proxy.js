// Test script for the local proxy API
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Replace with your actual FAL.ai API key
const API_KEY = process.env.FAL_API_KEY || 'your_api_key_here';

// Function to convert an image file to base64
function imageFileToBase64(filePath) {
  const fileData = fs.readFileSync(filePath);
  const fileExt = path.extname(filePath).toLowerCase();
  let mimeType = 'image/jpeg';
  
  if (fileExt === '.png') {
    mimeType = 'image/png';
  } else if (fileExt === '.jpg' || fileExt === '.jpeg') {
    mimeType = 'image/jpeg';
  }
  
  return `data:${mimeType};base64,${fileData.toString('base64')}`;
}

async function testProxyAPI() {
  try {
    console.log('Testing our proxy API...');
    
    // Test images (replace with paths to your actual test images)
    const startImagePath = './test-image-1.jpg'; // Replace with your test image path
    const endImagePath = './test-image-2.jpg';   // Replace with your test image path
    
    let startImage, endImage;
    
    // Check if test images exist, if not, use text placeholders for debugging
    if (fs.existsSync(startImagePath) && fs.existsSync(endImagePath)) {
      console.log('Using local test images');
      startImage = imageFileToBase64(startImagePath);
      endImage = imageFileToBase64(endImagePath);
    } else {
      console.log('No test images found, using placeholder URLs');
      // Use placeholder URLs for testing
      // In a real test, these would point to publicly accessible images
      startImage = 'https://example.com/test-image-1.jpg';
      endImage = 'https://example.com/test-image-2.jpg';
    }
    
    // Your proxy API endpoint - if testing locally, use localhost
    // If testing with Vercel, use your production URL
    const proxyEndpoint = process.env.PROXY_URL || 'http://localhost:3000/api/fal';
    
    console.log('Sending request to proxy API:', proxyEndpoint);
    
    // API call
    const response = await axios({
      method: 'POST',
      url: proxyEndpoint,
      data: {
        images: [startImage, endImage],
        apiKey: API_KEY
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 180000 // 3 minute timeout
    });
    
    console.log('Response status:', response.status);
    
    if (response.data && response.data.output && response.data.output.video) {
      console.log('Success! Video URL:', response.data.output.video);
    } else {
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      console.error('Unexpected response format');
    }
  } catch (error) {
    console.error('Error testing proxy API:', error.message);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received - request details:');
      console.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
  }
}

// Run the test
testProxyAPI().catch(console.error); 