const fs = require("fs");
const path = require("path");

/**
 * Fully complete serializeFunc.
 *
 * This function reads the preset file from disk based on the module name.
 * Preset files should be located in the "../presets" directory.
 *
 * @param {Object} moduleInfo - An object containing the module name.
 * @param {string} moduleInfo.name - The name of the module, e.g., "DynamicObject".
 * @returns {string} - The content of the preset file.
 * @throws Will throw an error if the file does not exist or cannot be read.
 */
exports.serializeFunc = (moduleInfo) => {
  const presetDir = path.join(__dirname, "..", "presets");
  let fileName;
  switch (moduleInfo.name) {
    case "DynamicObject":
      fileName = "dynamicObject.js";
      break;
    case "StaticObject":
      fileName = "staticObject.js";
      break;
    case "GameObject":
      fileName = "gameObject.js";
      break;
    default:
      throw new Error(`Unknown module name: ${moduleInfo.name}`);
  }
  const filePath = path.join(presetDir, fileName);
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content;
  } catch (error) {
    console.error(`Error reading preset file at ${filePath}:`, error);
    throw error;
  }
};
