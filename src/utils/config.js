const { logger } = require("./logger");
const { GoogleSheetsService } = require("../services/googleSheets");
const { COMMANDER_DATABASE, SUPPLY_CELLS } = require("./constants");

/**
 * Extract Google Sheet ID from a URL or return the ID if already provided
 * @param {string} urlOrId - Google Sheets URL or ID
 * @returns {string} - The sheet ID
 */
function extractSheetId(urlOrId) {
  if (!urlOrId) {
    throw new Error("Sheet URL or ID is required");
  }

  // If it's already just an ID (no slashes or special chars), return it
  if (!/[\/\?]/.test(urlOrId)) {
    return urlOrId;
  }

  // Extract from URL: https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  throw new Error(`Invalid Google Sheets URL or ID: ${urlOrId}`);
}

/**
 * Load configuration from Commander Database Google Sheet
 * @returns {Promise<Array>} - Array of sheet configurations
 */
async function loadConfig() {
  try {
    const commanderSheetUrl = process.env.GOOGLE_SHEET_URL;
    
    if (!commanderSheetUrl) {
      throw new Error("GOOGLE_SHEET_URL environment variable is not set");
    }

    // Extract sheet ID from URL
    const commanderSheetId = extractSheetId(commanderSheetUrl);

    logger.info(`Loading configuration from Commander Database (Sheet ID: ${commanderSheetId})`);

    const sheetsService = new GoogleSheetsService();
    await sheetsService.initialize();

    // Read the Commander Database sheet
    const data = await sheetsService.getSheetData(
      commanderSheetId,
      COMMANDER_DATABASE.SHEET_NAME
    );

    if (!data || data.length === 0) {
      throw new Error(`No data found in ${COMMANDER_DATABASE.SHEET_NAME}`);
    }

    // First row should be headers
    const headers = data[0];
    const nameCol = headers.indexOf(COMMANDER_DATABASE.COLUMNS.NAME);
    const armyUrlCol = headers.indexOf(COMMANDER_DATABASE.COLUMNS.ARMY_URL);
    const webhookUrlCol = headers.indexOf(COMMANDER_DATABASE.COLUMNS.WEBHOOK_URL);

    if (nameCol === -1 || armyUrlCol === -1 || webhookUrlCol === -1) {
      throw new Error(
        `Commander Database must have columns: ${COMMANDER_DATABASE.COLUMNS.NAME}, ` +
        `${COMMANDER_DATABASE.COLUMNS.ARMY_URL}, ${COMMANDER_DATABASE.COLUMNS.WEBHOOK_URL}`
      );
    }

    // Parse data rows (skip header)
    const configs = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const name = row[nameCol];
      const armyUrl = row[armyUrlCol];
      const webhookUrl = row[webhookUrlCol];

      // Skip empty rows
      if (!name || !armyUrl || !webhookUrl) {
        logger.debug(`Skipping row ${i + 1} - missing required data`);
        continue;
      }

      try {
        const sheetId = extractSheetId(armyUrl);
        
        configs.push({
          name: name.trim(),
          sheetId: sheetId,
          webhookUrl: webhookUrl.trim(),
          currentSuppliesCell: SUPPLY_CELLS.CURRENT_SUPPLIES,
          dailyConsumptionCell: SUPPLY_CELLS.DAILY_CONSUMPTION,
        });
      } catch (error) {
        logger.warn(`Skipping row ${i + 1} for ${name}: ${error.message}`);
      }
    }

    if (configs.length === 0) {
      throw new Error("No valid army configurations found in Commander Database");
    }

    // Validate all configurations
    validateConfig(configs);

    logger.info(`Loaded ${configs.length} army configurations from Commander Database`);
    return configs;
  } catch (error) {
    logger.error("Failed to load configuration:", error);
    throw new Error(`Configuration loading failed: ${error.message}`);
  }
}

function validateConfig(config) {
  if (!Array.isArray(config)) {
    throw new Error("Configuration must be an array of sheet configurations");
  }

  if (config.length === 0) {
    throw new Error(
      "Configuration must contain at least one sheet configuration"
    );
  }

  config.forEach((sheetConfig, index) => {
    const requiredFields = [
      "name",
      "sheetId",
      "webhookUrl",
      "currentSuppliesCell",
      "dailyConsumptionCell",
    ];

    for (const field of requiredFields) {
      if (!sheetConfig[field]) {
        throw new Error(
          `Sheet configuration ${index} is missing required field: ${field}`
        );
      }
    }

    // Validate webhook URL format
    try {
      new URL(sheetConfig.webhookUrl);
    } catch (error) {
      throw new Error(
        `Sheet configuration ${index} has invalid webhook URL: ${sheetConfig.webhookUrl}`
      );
    }
  });

  logger.info(`Configuration validation passed for ${config.length} sheets`);
}

module.exports = {
  loadConfig,
  validateConfig,
  extractSheetId,
};
