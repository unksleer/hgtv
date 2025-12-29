import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Validate required fields
const requiredFields = [
    'FIRST_NAME',
    'LAST_NAME',
    'EMAIL',
    'ADDRESS_LINE1',
    'CITY',
    'STATE',
    'ZIP_CODE',
    'PHONE',
    'DOB_MONTH',
    'DOB_DAY',
    'DOB_YEAR'
];

const missingFields = requiredFields.filter(field => !process.env[field]);

if (missingFields.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingFields.forEach(field => console.error(`   - ${field}`));
    console.error('\nPlease copy .env.example to .env and fill in your information.');
    process.exit(1);
}

// Validate age (must be 21+)
const birthYear = parseInt(process.env.DOB_YEAR);
const currentYear = new Date().getFullYear();
const age = currentYear - birthYear;

if (age < 21) {
    console.error('❌ You must be at least 21 years old to enter these sweepstakes.');
    process.exit(1);
}

export const config = {
    // Personal Information
    personalInfo: {
        firstName: process.env.FIRST_NAME,
        lastName: process.env.LAST_NAME,
        email: process.env.EMAIL,
        addressLine1: process.env.ADDRESS_LINE1,
        addressLine2: process.env.ADDRESS_LINE2 || '',
        city: process.env.CITY,
        state: process.env.STATE,
        zipCode: process.env.ZIP_CODE,
        phone: process.env.PHONE,
        dobMonth: process.env.DOB_MONTH,
        dobDay: process.env.DOB_DAY,
        dobYear: process.env.DOB_YEAR,
        gender: process.env.GENDER || ''
    },

    // Sweepstakes Configuration
    sweepstakes: {
        hgtv: {
            enabled: process.env.HGTV_ENABLED !== 'false',
            url: 'https://www.hgtv.com/sweepstakes/hgtv-dream-home/sweepstakes',
            schedule: process.env.HGTV_SCHEDULE || '0 9 * * *'
        },
        foodNetwork: {
            enabled: process.env.FOODNETWORK_ENABLED !== 'false',
            url: 'https://www.foodnetwork.com/sweepstakes',
            schedule: process.env.FOODNETWORK_SCHEDULE || '30 9 * * *'
        }
    },

    // CAPTCHA Configuration
    captcha: {
        solverApiKey: process.env.CAPTCHA_SOLVER_API_KEY || null
    },

    // Browser Options
    browser: {
        headless: process.env.HEADLESS === 'true',
        slowMo: parseInt(process.env.SLOW_MO) || 100
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    },

    // Paths
    paths: {
        root: join(__dirname, '..'),
        logs: join(__dirname, '..', 'logs'),
        screenshots: join(__dirname, '..', 'screenshots'),
        data: join(__dirname, '..', 'data'),
        submissions: join(__dirname, '..', 'data', 'submissions.json')
    }
};
