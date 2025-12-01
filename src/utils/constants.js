/**
 * Application constants
 * Centralized location for hardcoded values that may need future modification
 */

// Cell addresses for supply data in army spreadsheets
const SUPPLY_CELLS = {
  CURRENT_SUPPLIES: "C9",
  DAILY_CONSUMPTION: "C11",
};

// Commander Database sheet configuration
const COMMANDER_DATABASE = {
  SHEET_NAME: "Commander Database",
  COLUMNS: {
    NAME: "Name",
    ARMY_URL: "Army URL",
    WEBHOOK_URL: "Webhook URL",
  },
};

module.exports = {
  SUPPLY_CELLS,
  COMMANDER_DATABASE,
};
