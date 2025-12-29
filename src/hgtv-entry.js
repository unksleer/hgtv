import puppeteer from 'puppeteer';
import { config } from './config.js';
import { logger } from './logger.js';
import {
    waitForIframe,
    fillFormField,
    handleCaptcha,
    takeScreenshot,
    checkRateLimit,
    saveSubmissionRecord,
    clickButton
} from './utils.js';

/**
 * Submit entry to HGTV sweepstakes
 * @param {boolean} dryRun - If true, don't actually submit
 * @returns {Promise<boolean>} - Success status
 */
export async function submitHGTVEntry(dryRun = false) {
    const site = 'hgtv';
    logger.sweepstakes(site, 'Starting entry process...');

    // Check rate limit
    if (!dryRun && !(await checkRateLimit(site))) {
        return false;
    }

    let browser;
    let success = false;

    try {
        // Launch browser
        logger.info('Launching browser...');

        const launchOptions = {
            headless: config.browser.headless ? 'new' : false,
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled' // Stealth mode
            ],
            ignoreDefaultArgs: ['--enable-automation'] // Hide automation banner
        };

        if (config.browser.executablePath) {
            launchOptions.executablePath = config.browser.executablePath;
        }

        logger.info('Browser launch options configured');
        browser = await puppeteer.launch(launchOptions);
        logger.info('Browser launched successfully');

        const page = await browser.newPage();
        logger.info('New page created');
        await page.setViewport({ width: 1280, height: 800 });

        // Navigate to HGTV sweepstakes page
        logger.sweepstakes(site, `Navigating to ${config.sweepstakes.hgtv.url}`);
        await page.goto(config.sweepstakes.hgtv.url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        logger.info('Page loaded successfully');
        await takeScreenshot(page, 'hgtv-01-landing');


        // Check for and click "Start Entry", "Enter Now" or "Agree" buttons if present
        // This is important as it often triggers the iframe loading or clears overlays
        try {
            const buttonClicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
                // Prioritize "Enter" or "Agree" buttons
                const targetButton = buttons.find(btn => {
                    const text = (btn.textContent || btn.innerText || '').toLowerCase().trim();
                    return text === 'enter' ||
                        text === 'enter now' ||
                        text.includes('start entry') ||
                        text === 'i agree' ||
                        text.includes('complete my entry');
                });

                if (targetButton && targetButton.offsetParent !== null) { // Check visibility
                    targetButton.click();
                    return true;
                }
                return false;
            });

            if (buttonClicked) {
                logger.info('Clicked entry/agree button');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (e) {
            logger.info('No initial interaction button found or needed');
        }

        // Wait for and switch to iframe, with fallback to direct navigation
        let iframe;
        try {
            iframe = await waitForIframe(page);
        } catch (error) {
            logger.warn('Standard iframe loading failed, attempting direct navigation fallback...');

            // Try to get data-src from the iframe element first
            let wayinUrl = await page.evaluate(() => {
                const iframe = document.querySelector('iframe[id^="ngxFrame"]');
                return iframe ? iframe.getAttribute('data-src') : null;
            });

            // If not found via element, check HTML regex
            if (!wayinUrl) {
                const html = await page.content();
                const match = html.match(/data-src="(\/\/xd\.wayin\.com\/[^"]+)"/);
                if (match) wayinUrl = match[1];
            }

            if (wayinUrl) {
                // Add protocol if missing
                if (wayinUrl.startsWith('//')) {
                    wayinUrl = 'https:' + wayinUrl;
                }

                logger.info(`Found direct Wayin URL: ${wayinUrl}`);
                logger.info('Navigating directly to sweepstakes form...');
                await page.goto(wayinUrl, { waitUntil: 'networkidle2' });
                iframe = page.mainFrame(); // The whole page is now the form
            } else {
                // Debug: Save page content
                const html = await page.content();
                const fs = await import('fs');
                fs.writeFileSync(`${config.paths.screenshots}/page_dump.html`, html);
                logger.info(`Saved page content to ${config.paths.screenshots}/page_dump.html`);

                throw new Error('Could not find Wayin URL (data-src) for direct navigation');
            }
        }

        // Step 1: Enter email
        logger.sweepstakes(site, 'Entering email address...');
        await fillFormField(iframe, 'xReturningUserEmail', config.personalInfo.email);
        await clickButton(iframe, '#xCheckUser', 3000);

        await takeScreenshot(page, 'hgtv-02-after-email');

        // Step 2: Fill registration form
        logger.sweepstakes(site, 'Filling registration form...');

        // Check if we need to fill name (new user) or if we're returning
        try {
            await iframe.waitForSelector('#name_Firstname', { timeout: 3000 });

            await fillFormField(iframe, 'name_Firstname', config.personalInfo.firstName);
            await fillFormField(iframe, 'name_Lastname', config.personalInfo.lastName);

            logger.info('New user registration detected');
        } catch (error) {
            logger.info('Returning user detected, skipping name entry');
        }

        // Click Next to proceed if it exists
        try {
            const nextButton = await iframe.$('.xActionNext');
            if (nextButton) {
                const isVisible = await nextButton.boundingBox();
                if (isVisible) {
                    await clickButton(iframe, '.xActionNext', 2000);
                    await takeScreenshot(page, 'hgtv-03-after-registration');
                }
            } else {
                logger.info('No Next button found, checking for Submit button directly');
            }
        } catch (error) {
            logger.info('Skipping Next button step');
        }

        // Step 3: Handle trivia (optional - just click next)
        logger.sweepstakes(site, 'Handling trivia question...');
        try {
            await iframe.waitForSelector('.xActionNext', { timeout: 3000 });
            await clickButton(iframe, '.xActionNext', 2000);
            logger.info('Skipped trivia question');
        } catch (error) {
            logger.info('No trivia question found');
        }

        await takeScreenshot(page, 'hgtv-04-after-trivia');

        // Step 4: Fill address and personal information (for Dream Home)
        logger.sweepstakes(site, 'Filling address and contact information...');

        try {
            // Wait for address fields
            await iframe.waitForSelector('#address_AddressLine1', { timeout: 5000 });

            await fillFormField(iframe, 'address_AddressLine1', config.personalInfo.addressLine1);

            if (config.personalInfo.addressLine2) {
                await fillFormField(iframe, 'address_AddressLine2', config.personalInfo.addressLine2);
            }

            await fillFormField(iframe, 'address_City', config.personalInfo.city);
            await fillFormField(iframe, 'address_State', config.personalInfo.state, true);
            await fillFormField(iframe, 'address_ZipCode', config.personalInfo.zipCode);
            await fillFormField(iframe, 'phone_Phone', config.personalInfo.phone);

            // Date of birth
            await fillFormField(iframe, 'dob_Month', config.personalInfo.dobMonth, true);
            await fillFormField(iframe, 'dob_Day', config.personalInfo.dobDay, true);
            await fillFormField(iframe, 'dob_Year', config.personalInfo.dobYear, true);

            // Gender (optional)
            if (config.personalInfo.gender) {
                await fillFormField(iframe, 'gender', config.personalInfo.gender, true);
            }

            logger.success('Address and contact information filled');
        } catch (error) {
            logger.warn('Address fields not required for this sweepstakes');
        }

        await takeScreenshot(page, 'hgtv-05-before-submit');

        // Step 5: Handle CAPTCHA
        const captchaSolved = await handleCaptcha(page, iframe);

        if (!captchaSolved && !dryRun) {
            logger.failure('CAPTCHA not solved, cannot submit');
            await takeScreenshot(page, 'hgtv-06-captcha-failed');
            return false;
        }

        // Step 6: Submit entry
        if (dryRun) {
            logger.warn('🧪 DRY RUN MODE - Not submitting entry');
            await takeScreenshot(page, 'hgtv-06-dry-run-complete');
            success = true;
        } else {
            logger.sweepstakes(site, 'Submitting entry...');

            try {
                await clickButton(iframe, '.xSubmit', 5000);

                // Wait for confirmation
                await new Promise(resolve => setTimeout(resolve, 3000));
                await takeScreenshot(page, 'hgtv-07-submitted');

                // Check for success message
                const confirmationText = await page.evaluate(() => document.body.innerText);

                if (confirmationText.toLowerCase().includes('thank') ||
                    confirmationText.toLowerCase().includes('entered') ||
                    confirmationText.toLowerCase().includes('success')) {
                    logger.success('Entry submitted successfully!');
                    success = true;
                } else {
                    logger.warn('Submission status unclear, check screenshot');
                    success = true; // Assume success
                }
            } catch (error) {
                logger.failure(`Submission failed: ${error.message}`);
                await takeScreenshot(page, 'hgtv-07-submit-error');
            }
        }

    } catch (error) {
        logger.failure(`HGTV entry failed: ${error.message}`);
        logger.error(error.stack);

        if (browser) {
            const pages = await browser.pages();
            if (pages.length > 0) {
                await takeScreenshot(pages[0], 'hgtv-error');
            }
        }
    } finally {
        if (browser) {
            await browser.close();
            logger.info('Browser closed');
        }

        // Save submission record
        if (!dryRun) {
            await saveSubmissionRecord(site, success, success ? null : 'See logs for details');
        }
    }

    return success;
}
