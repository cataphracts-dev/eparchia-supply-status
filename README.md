# Cataphracts Supply Status Monitor

Automated supply tracking for Cataphracts campaigns. Monitors Google Sheets for army supply levels and sends daily Discord notifications.

## What it does

- Reads army configurations from a central Commander Database spreadsheet
- Reads current supplies and daily consumption from each army's Google Sheet
- Subtracts daily consumption from current supplies
- Updates the sheets with new supply levels
- Sends Discord alerts when supplies are low
- Runs automatically once per day (configurable - see below)

## Setup

### 1. Google Cloud Setup

Create a Google Cloud project (free):

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create new project
3. Enable Google Sheets API (APIs & Services > Library)
4. Create Service Account (APIs & Services > Credentials)
5. Download the JSON key file
6. Share your Google Sheets with the service account email (Editor permissions)
   - Share the Commander Database spreadsheet
   - Share all army spreadsheets

### 2. Commander Database Setup

Create a Google Sheet with a tab named **"Commander Database"** containing:

| Name | Army URL | Webhook URL |
|------|----------|-------------|
| Saraian 1st Army | https://docs.google.com/spreadsheets/d/1AbCdEf... | https://discord.com/api/webhooks/123/abc... |
| Keltic Raiders | https://docs.google.com/spreadsheets/d/1ZyXwVu... | https://discord.com/api/webhooks/456/def... |

**Required columns:**
- **Name**: Army name for notifications
- **Army URL**: Full Google Sheets URL or just the sheet ID
- **Webhook URL**: Discord webhook URL (with optional `?thread_id=` parameter)

The system will extract the sheet ID from the Army URL automatically.

### 3. Army Sheets Format

Each army's Google Sheet must have these cells:

- **Cell C9**: Current Supplies (a number, e.g., `150`)
- **Cell C11**: Daily Consumption (a number, e.g., `5`)

Example layout:

```
A9: Current Supplies        C9: 150
A11: Daily Consumption      C11: 5
```

**Note:** Cell addresses (C9/C11) are hardcoded but can be easily changed in `src/utils/constants.js`.

### 4. Discord Webhooks

Create webhooks for notifications:

**Channel webhook:**
```
https://discord.com/api/webhooks/{webhook_id}/{token}
```

**Thread webhook:**
```
https://discord.com/api/webhooks/{webhook_id}/{token}?thread_id={thread_id}
```

To create: Right-click channel > Edit Channel > Integrations > Create Webhook > Copy URL

To get thread id:
1. User Settings > Advanced > Enable Developer Mode
2. Right-click thread > Copy Thread ID

### 5. GitHub Repository

1. Fork this repository
2. Add these secrets (Settings > Secrets and variables > Actions):
   - `GOOGLE_SERVICE_ACCOUNT_KEY`: Base64-encoded service account JSON
   - `GOOGLE_SHEET_URL`: The URL of your Commander Database spreadsheet

#### Encoding the Service Account Key

**On Windows (PowerShell):**
```powershell
$bytes = [System.IO.File]::ReadAllBytes("path\to\service-account.json")
$base64 = [System.Convert]::ToBase64String($bytes)
$base64 | Set-Clipboard
```

**On Mac/Linux:**
```bash
base64 -i service-account.json | pbcopy
```

#### Getting the Sheet URL

Copy the full URL of your Commander Database spreadsheet:
```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890/edit
```

You can paste the full URL or just the sheet ID - both work!

## Timing Configuration

The system runs daily at **midnight EST** (5 AM UTC). To change this:

1. Edit `.github/workflows/supply-monitor.yml`
2. Modify the cron schedule: `- cron: "0 5 * * *"`

**Cron format:** `minute hour day month weekday`

- `0 5 * * *` = 5 AM UTC daily (midnight EST)
- `0 12 * * *` = noon UTC daily
- `0 0 * * 1` = midnight UTC every Monday

**Time zones:** GitHub Actions runs in UTC. Calculate your local time offset.

## Example Output

The bot sends Discord embeds with supply status:

### Normal Status (15+ days remaining)

```
✅ Supply Status: Saraian 1st Army

📅 Current Day: Monday, June 25th
📦 Current Supplies: 150
📉 Daily Consumption: 5
⏰ Days Remaining: 30 days
🚨 Zero Supplies Date: Wednesday, July 25th
```

### Warning (4-7 days remaining)

```
⚠️ **WARNING**: Saraian 1st Army supplies are running low. 5 days remaining.

⚠️ Supply Status: Saraian 1st Army

📅 Current Day: Monday, June 25th
📦 Current Supplies: 25
📉 Daily Consumption: 5
⏰ Days Remaining: 5 days
🚨 Zero Supplies Date: Saturday, June 30th
```

### Critical (1-3 days remaining)

```
🚨 **URGENT**: Saraian 1st Army supplies are critically low! Only 2 days remaining.

🚨 Supply Status: Saraian 1st Army

📅 Current Day: Monday, June 25th
📦 Current Supplies: 10
📉 Daily Consumption: 5
⏰ Days Remaining: 2 days
🚨 Zero Supplies Date: Wednesday, June 27th
```

### Zero Supplies

```
🚨 **CRITICAL**: Saraian 1st Army supplies have reached ZERO today! Immediate restocking required.

🚨 ZERO SUPPLIES ALERT: Saraian 1st Army

📅 Current Day: Monday, June 25th
📦 Current Supplies: 0 (OUT OF STOCK)
📉 Daily Consumption: 5
⏰ Days Remaining: 0 days - IMMEDIATE ACTION REQUIRED
🚨 Status: Supplies have just been depleted today
```

## Alert Thresholds

- **Green** (✅): 15+ days remaining
- **Yellow** (⚡): 8-14 days remaining
- **Orange** (⚠️): 4-7 days remaining
- **Red** (🚨): 1-3 days remaining
- **Critical** (🚨): 0 days remaining

## Customization

### Changing Supply Cell Locations

If your army sheets use different cells for supply data, edit `src/utils/constants.js`:

```javascript
const SUPPLY_CELLS = {
  CURRENT_SUPPLIES: "C9",  // Change this
  DAILY_CONSUMPTION: "C11", // Change this
};
```

## Security & Privacy

This project uses **targeted private logging** to protect sensitive supply data and tactical intelligence while maintaining full debugging capabilities.

### What's Protected in Public Logs

- 🔒 **Supply numbers**: Actual amounts replaced with "X"
- 🔒 **Tactical status**: "Critically low supplies" → "Supply status updated"
- 🔒 **Operational intelligence**: Army readiness alerts sanitized
- 🔒 **Discord webhook URLs**: Authentication tokens hidden
- 🔒 **Service account details**: Credentials sanitized

### What's Fully Visible in Public Logs

- ✅ **Sheet names**: "Processing sheet: Saraian 1st Army"
- ✅ **Complete error messages**: Full stack traces and debugging details
- ✅ **Operation status**: Success/failure, timing, progress
- ✅ **Configuration issues**: Validation errors, API failures

### Example Comparison

**Local Development:**

```
[WARN] Saraian 1st Army supplies are critically low
[ERROR] Saraian 3rd Army supplies have reached zero! Immediate restocking required
[ERROR] Authentication failed for Google Sheets API
```

**GitHub Actions (Tactical Intelligence Sanitized):**

```
[WARN] Saraian 1st Army supply status updated
[ERROR] Saraian 3rd Army supply status updated! action required
[ERROR] Authentication failed for Google Sheets API
```

This approach protects **operational security and tactical intelligence** while maintaining **full transparency for debugging** errors and system status.

See [Private Logging Documentation](docs/PRIVATE_LOGGING.md) for complete details.

## Testing

Run locally (requires `.env` file - see below):

```bash
npm install
npm start
```

Manual GitHub Actions run: Go to Actions tab > Supply Status Monitor > Run workflow

## Local Development

Create a `.env` file:

```bash
# Service account for Google Sheets API
GOOGLE_SERVICE_ACCOUNT_PATH=./config/service-account.json

# Commander Database spreadsheet URL (or just the ID)
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890/edit
```

## Troubleshooting

**"No data found in Commander Database"**: Verify sheet name is exactly "Commander Database", check columns are "Name", "Army URL", "Webhook URL"

**"Invalid Google Sheets URL or ID"**: Make sure Army URL column contains full Google Sheets URLs or valid sheet IDs

**"Authentication failed"**: Re-encode service account JSON to Base64, check Google Sheets API is enabled, verify service account has access to all sheets

**"Discord webhook failed"**: Verify webhook URL, check if webhook was deleted

**Wrong timing**: Modify cron schedule in `.github/workflows/supply-monitor.yml`

**Wrong cell addresses**: Edit `SUPPLY_CELLS` in `src/utils/constants.js`

## License

MIT
