// utils/geocode.js
const axios = require('axios');

module.exports = async (query) => {
  if (!query || typeof query !== 'string' || !query.trim()) return null;

  try {
    const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
      params: {
        key: process.env.OPENCAGE_API_KEY,
        q: query.trim(),
        limit: 1,
        no_annotations: 1,
      },
    });

    const result = response.data.results?.[0];
    if (result && result.geometry) {
      return {
        lat: result.geometry.lat,
        lng: result.geometry.lng,
        address: result.formatted,
      };
    }
  } catch (err) {
    console.error('Geocoding error:', err.message);
  }
  return null;
};