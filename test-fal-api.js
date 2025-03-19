// Test script to directly call FAL.ai API
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

async function testFalApi() {
  try {
    console.log('Testing FAL.ai API directly...');
    
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
    
    // FAL.ai endpoint
    const endpoint = 'https://api.fal.ai/models/fal-ai/vidu/start-end-to-video';
    
    // Check if using base64 or URLs
    const isBase64 = typeof startImage === 'string' && startImage.startsWith('data:');
    
    // Create payload
    let payload = {
      prompt: "Show a natural transition between these images",
      seed: Math.floor(Math.random() * 1000000)
    };
    
    if (isBase64) {
      console.log('Using base64 encoded images');
      payload.start_image = startImage;
      payload.end_image = endImage;
    } else {
      console.log('Using image URLs');
      payload.start_image_url = startImage;
      payload.end_image_url = endImage;
    }
    
    console.log('Sending request to FAL.ai API...');
    console.log('API endpoint:', endpoint);
    
    // API call
    const response = await axios({
      method: 'POST',
      url: endpoint,
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${API_KEY}`,
        'Accept': 'application/json'
      },
      timeout: 180000 // 3 minute timeout
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(response.headers, null, 2));
    
    if (response.data && response.data.video && response.data.video.url) {
      console.log('Success! Video URL:', response.data.video.url);
    } else if (response.data && response.data.video_url) {
      console.log('Success! Video URL:', response.data.video_url);
    } else {
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      console.error('Unexpected response format');
    }
  } catch (error) {
    console.error('Error testing FAL.ai API:', error.message);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
  }
}

// Run the test
testFalApi().catch(console.error); 