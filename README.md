# HGTV/Food Network Sweepstakes Automation

Automated daily entry system for HGTV Dream Home and Food Network sweepstakes using the Wayin platform.

## ⚠️ Important Disclaimers

- **Terms of Service**: Automated entry may violate sweepstakes terms of service. This tool is for educational purposes. Review official rules before use.
- **CAPTCHA**: Forms use Google reCAPTCHA which may require manual solving. The script will pause for 60 seconds when CAPTCHA is detected.
- **Rate Limiting**: Entries are limited to once per day per email address per site.

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

## Installation

1. **Clone or download this project**

2. **Install dependencies**:
   ```bash
   cd hgtv
   npm install
   ```

3. **Configure your information**:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` with your personal information:
   - Name, email, address, phone
   - Date of birth (must be 21+)
   - Schedule preferences

## Usage

### Manual Entry (Recommended for First Run)

Test with a dry run first (won't submit):
```bash
npm run dry-run:hgtv
```

Submit a manual entry to HGTV:
```bash
npm run manual:hgtv
```

Submit a manual entry to Food Network:
```bash
npm run manual:foodnetwork
```

### Scheduled Automatic Entries

Start the scheduler to run entries automatically:
```bash
npm start
```

The scheduler will:
- Run HGTV entry at 9:00 AM ET daily (configurable in `.env`)
- Run Food Network entry at 9:30 AM ET daily (configurable in `.env`)
- Keep running until you press Ctrl+C

### Test Scheduler Configuration

Verify your cron schedule is valid:
```bash
npm run test-schedule
```

## Configuration

Edit `.env` to customize:

### Personal Information
All fields are required except `ADDRESS_LINE2` and `GENDER`:
```env
FIRST_NAME=John
LAST_NAME=Doe
EMAIL=your.email@example.com
# ... etc
```

### Schedule (Cron Format)
```env
HGTV_SCHEDULE=0 9 * * *        # 9:00 AM daily
FOODNETWORK_SCHEDULE=30 9 * * * # 9:30 AM daily
```

Cron format: `minute hour day month dayOfWeek`
- `0 9 * * *` = 9:00 AM every day
- `30 14 * * 1-5` = 2:30 PM Monday-Friday

### Browser Options
```env
HEADLESS=false  # Set to true to hide browser window
SLOW_MO=100     # Delay between actions (ms)
```

## CAPTCHA Handling

The forms use Google reCAPTCHA. When detected:

1. **Manual Solving** (default): The script pauses for 60 seconds. Solve the CAPTCHA in the browser window.

2. **CAPTCHA Solver Service** (optional): Set `CAPTCHA_SOLVER_API_KEY` in `.env` to use a service like 2captcha (not yet implemented).

## Logs and Screenshots

- **Logs**: Check `logs/combined.log` for all activity
- **Error Logs**: Check `logs/error.log` for errors only
- **Screenshots**: Saved to `screenshots/` directory at each step
- **Submission History**: Tracked in `data/submissions.json`

## Troubleshooting

### "Missing required environment variables"
- Make sure you copied `.env.example` to `.env`
- Fill in all required fields in `.env`

### "You must be at least 21 years old"
- Check your `DOB_YEAR` in `.env`
- Sweepstakes require age 21+

### "Rate limit: Last entry was X hours ago"
- You can only enter once per 24 hours per site
- Wait the specified time before trying again

### CAPTCHA not solving
- Make sure `HEADLESS=false` so you can see the browser
- The script waits 60 seconds - solve it manually
- Consider using a CAPTCHA solver service

### Form fields not filling
- Check screenshots in `screenshots/` directory
- The sweepstakes form may have changed
- Check logs for specific errors

### Sweepstakes not active
- HGTV Dream Home typically runs December-February
- Food Network has various sweepstakes throughout the year
- Update URLs in `src/config.js` if needed

## Project Structure

```
hgtv/
├── index.js                    # Main entry point
├── package.json                # Dependencies
├── .env                        # Your configuration (not in git)
├── .env.example                # Configuration template
├── src/
│   ├── config.js              # Configuration loader
│   ├── logger.js              # Logging setup
│   ├── utils.js               # Shared utilities
│   ├── hgtv-entry.js          # HGTV automation
│   ├── food-network-entry.js  # Food Network automation
│   └── scheduler.js           # Cron scheduler
├── data/
│   └── submissions.json       # Submission history
├── logs/                      # Log files
└── screenshots/               # Debug screenshots
```

## Legal & Ethical Use

This tool is provided for **educational purposes only**. 

- Always review the official sweepstakes rules
- Automated entry may violate terms of service
- Use responsibly and at your own risk
- The authors are not responsible for any consequences

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs in `logs/combined.log`
3. Check screenshots in `screenshots/` directory

## License

MIT License - See LICENSE file for details
