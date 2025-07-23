// ZEDSON WATCHCRAFT - Model Loader Utility
// Prevents mongoose model overwrite errors by checking existing models

const mongoose = require('mongoose');

/**
 * Safe model loader that prevents overwrite errors
 * @param {string} modelName - Name of the model
 * @param {Function} schemaFactory - Function that returns the schema
 * @returns {mongoose.Model} The model
 */
function loadModel(modelName, schemaFactory) {
  // Check if model already exists
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }
  
  // Create and register the model
  const schema = schemaFactory();
  return mongoose.model(modelName, schema);
}

module.exports = { loadModel };