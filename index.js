#!/usr/bin/env node

import { logger } from './src/logger.js';
import { config } from './src/config.js';
import { submitHGTVEntry } from './src/hgtv-entry.js';
import { submitFoodNetworkEntry } from './src/food-network-entry.js';
import { startScheduler, testScheduler } from './src/scheduler.js';

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
    manual: args.includes('--manual'),
    dryRun: args.includes('--dry-run'),
    testSchedule: args.includes('--test-schedule'),
    site: args.find(arg => arg.startsWith('--site='))?.split('=')[1] || 'both'
};

/**
 * Main entry point
 */
async function main() {
    logger.info('🎯 HGTV/Food Network Sweepstakes Automation');
    logger.info('==========================================\n');

    // Test scheduler configuration
    if (flags.testSchedule) {
        await testScheduler();
        process.exit(0);
    }

    // Manual entry mode
    if (flags.manual || flags.dryRun) {
        const isDryRun = flags.dryRun;

        if (isDryRun) {
            logger.warn('🧪 Running in DRY RUN mode - entries will NOT be submitted\n');
        }

        if (flags.site === 'hgtv' || flags.site === 'both') {
            logger.info('Running HGTV entry...\n');
            const success = await submitHGTVEntry(isDryRun);

            if (success) {
                logger.success('HGTV entry completed!\n');
            } else {
                logger.failure('HGTV entry failed!\n');
            }
        }

        if (flags.site === 'foodnetwork' || flags.site === 'both') {
            logger.info('Running Food Network entry...\n');
            const success = await submitFoodNetworkEntry(isDryRun);

            if (success) {
                logger.success('Food Network entry completed!\n');
            } else {
                logger.failure('Food Network entry failed!\n');
            }
        }

        logger.info('Manual run complete!');
        process.exit(0);
    }

    // Scheduled mode (default)
    logger.info('Starting in SCHEDULED mode...\n');
    startScheduler();

    // Keep process running
    process.on('SIGINT', () => {
        logger.info('\n\n👋 Shutting down scheduler...');
        logger.info('Goodbye!');
        process.exit(0);
    });
}

// Run main function
main().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
});
