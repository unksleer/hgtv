import { readFileSync, writeFileSync, existsSync } from 'fs';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Wait for iframe to load on the page
 * @param {Page} page - Puppeteer page object
 * @param {number} timeout - Maximum wait time in milliseconds
 * @returns {Promise<Frame>} - The iframe element frame
 */
export async function waitForIframe(page, timeout = 30000) {
    logger.info('Waiting for Wayin iframe to load...');

    try {
        // Wait for the iframe element to exist
        await page.waitForSelector('iframe[id^="ngxFrame"]', { timeout: 10000 });
        logger.info('Found ngxFrame iframe element');

        // Wait for the iframe to load actual content (not about:blank)
        logger.info('Waiting for iframe content to load...');
        const startTime = Date.now();

        let iframe = null;
        while (Date.now() - startTime < timeout) {
            const frames = page.frames();
            iframe = frames.find(frame =>
                frame.url().includes('xd.wayin.com') ||
                frame.url().includes('wayin.com')
            );

            if (iframe) {
                logger.info(`Iframe loaded with URL: ${iframe.url()}`);
                break;
            }

            // Wait a bit before checking again
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!iframe) {
            // Log all frames for debugging
            const frames = page.frames();
            logger.error(`Timeout waiting for Wayin iframe. Found ${frames.length} frames:`);
            frames.forEach((frame, idx) => {
                logger.error(`  Frame ${idx}: ${frame.url()}`);
            });
            throw new Error('Wayin iframe content did not load');
        }

        logger.info('Iframe loaded successfully');
        return iframe;
    } catch (error) {
        logger.error(`Failed to load iframe: ${error.message}`);
        throw error;
    }
}

/**
 * Fill a form field and validate
 * @param {Frame} frame - Puppeteer frame object
 * @param {string} selector - CSS selector or element ID
 * @param {string} value - Value to fill
 * @param {boolean} isSelect - Whether the field is a select dropdown
 */
export async function fillFormField(frame, selector, value, isSelect = false) {
    try {
        // Add # if selector looks like an ID
        const finalSelector = selector.startsWith('#') ? selector : `#${selector}`;

        await frame.waitForSelector(finalSelector, { timeout: 5000 });

        if (isSelect) {
            await frame.select(finalSelector, value);
            logger.info(`Selected "${value}" in ${selector}`);
        } else {
            await frame.type(finalSelector, value, { delay: 50 });
            logger.info(`Filled ${selector} with value`);
        }

        // Small delay for validation
        await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
        logger.warn(`Could not fill ${selector}: ${error.message}`);
    }
}

/**
 * Handle CAPTCHA - pause for manual solving or use API
 * @param {Page} page - Puppeteer page object
 * @param {Frame} frame - Puppeteer frame object
 * @returns {Promise<boolean>} - Whether CAPTCHA was solved
 */
export async function handleCaptcha(page, frame) {
    logger.info('Checking for CAPTCHA...');

    try {
        // Check if reCAPTCHA is present
        const captchaExists = await frame.$('.g-recaptcha, iframe[src*="recaptcha"]');

        if (!captchaExists) {
            logger.info('No CAPTCHA detected');
            return true;
        }

        if (config.captcha.solverApiKey) {
            logger.info('CAPTCHA detected - using solver API (not implemented yet)');
            // TODO: Integrate with 2captcha or similar service
            return false;
        } else {
            logger.warn('⚠️  CAPTCHA detected - Please solve manually');
            logger.warn('⚠️  Waiting 60 seconds for manual CAPTCHA solving...');

            // Wait for user to solve CAPTCHA
            await new Promise(resolve => setTimeout(resolve, 60000));

            logger.info('Continuing after CAPTCHA wait period');
            return true;
        }
    } catch (error) {
        logger.error(`CAPTCHA handling error: ${error.message}`);
        return false;
    }
}

/**
 * Take a screenshot for debugging
 * @param {Page} page - Puppeteer page object
 * @param {string} name - Screenshot name
 */
export async function takeScreenshot(page, name) {
    try {
        if (!existsSync(config.paths.screenshots)) {
            const { mkdirSync } = await import('fs');
            mkdirSync(config.paths.screenshots, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${config.paths.screenshots}/${name}_${timestamp}.png`;

        await page.screenshot({ path: filename, fullPage: true });
        logger.info(`Screenshot saved: ${filename}`);
    } catch (error) {
        logger.warn(`Failed to take screenshot: ${error.message}`);
    }
}

/**
 * Check if we can submit based on rate limiting
 * @param {string} site - Site name (hgtv or foodnetwork)
 * @returns {Promise<boolean>} - Whether submission is allowed
 */
export async function checkRateLimit(site) {
    try {
        if (!existsSync(config.paths.submissions)) {
            return true; // No submissions yet
        }

        const data = readFileSync(config.paths.submissions, 'utf8');
        const submissions = JSON.parse(data);

        // Find last submission for this site
        const lastSubmission = submissions
            .filter(s => s.site === site && s.success)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        if (!lastSubmission) {
            return true; // No previous submissions
        }

        // Get dates in ET timezone to match official contest day rules
        const getETDate = (date) => {
            return new Date(date).toLocaleString('en-US', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            });
        };

        const lastDate = getETDate(lastSubmission.timestamp);
        const todayDate = getETDate(new Date());

        if (lastDate === todayDate) {
            logger.warn(`Rate limit: Already entered ${site} today (${todayDate} ET)`);
            return false;
        }

        return true;
    } catch (error) {
        logger.error(`Error checking rate limit: ${error.message}`);
        return true; // Allow on error
    }
}

/**
 * Save submission record
 * @param {string} site - Site name
 * @param {boolean} success - Whether submission was successful
 * @param {string} error - Error message if failed
 */
export async function saveSubmissionRecord(site, success, error = null) {
    try {
        let submissions = [];

        if (existsSync(config.paths.submissions)) {
            const data = readFileSync(config.paths.submissions, 'utf8');
            submissions = JSON.parse(data);
        }

        submissions.push({
            site,
            success,
            error,
            timestamp: new Date().toISOString()
        });

        // Keep only last 100 submissions
        if (submissions.length > 100) {
            submissions = submissions.slice(-100);
        }

        writeFileSync(config.paths.submissions, JSON.stringify(submissions, null, 2));
        logger.info(`Submission record saved for ${site}`);
    } catch (error) {
        logger.error(`Failed to save submission record: ${error.message}`);
    }
}

/**
 * Click a button and wait for navigation or response
 * @param {Frame} frame - Puppeteer frame object
 * @param {string} selector - Button selector
 * @param {number} waitTime - Time to wait after click (ms)
 */
export async function clickButton(frame, selector, waitTime = 2000) {
    try {
        await frame.waitForSelector(selector, { timeout: 5000 });

        try {
            await frame.click(selector);
            logger.info(`Clicked button: ${selector}`);
        } catch (clickError) {
            logger.warn(`Standard click failed for ${selector}, trying JS click...`);
            await frame.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) el.click();
            }, selector);
            logger.info(`JS Clicked button: ${selector}`);
        }

        await new Promise(resolve => setTimeout(resolve, waitTime));
    } catch (error) {
        logger.warn(`Could not click ${selector}: ${error.message}`);
        throw error;
    }
}
