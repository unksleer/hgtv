import cron from 'node-cron';
import { config } from './config.js';
import { logger } from './logger.js';
import { submitHGTVEntry } from './hgtv-entry.js';
import { submitFoodNetworkEntry } from './food-network-entry.js';

/**
 * Start the scheduled sweepstakes entries
 */
export function startScheduler() {
    logger.info('🚀 Starting sweepstakes scheduler...');

    // Schedule HGTV entries
    if (config.sweepstakes.hgtv.enabled) {
        const hgtvSchedule = config.sweepstakes.hgtv.schedule;
        logger.info(`📅 HGTV scheduled: ${hgtvSchedule}`);

        cron.schedule(hgtvSchedule, async () => {
            logger.info('⏰ HGTV scheduled entry triggered');
            await submitHGTVEntry(false);
        }, {
            timezone: 'America/New_York' // HGTV is based in Eastern Time
        });
    } else {
        logger.info('⏭️  HGTV entries disabled');
    }

    // Schedule Food Network entries
    if (config.sweepstakes.foodNetwork.enabled) {
        const fnSchedule = config.sweepstakes.foodNetwork.schedule;
        logger.info(`📅 Food Network scheduled: ${fnSchedule}`);

        cron.schedule(fnSchedule, async () => {
            logger.info('⏰ Food Network scheduled entry triggered');
            await submitFoodNetworkEntry(false);
        }, {
            timezone: 'America/New_York'
        });
    } else {
        logger.info('⏭️  Food Network entries disabled');
    }

    logger.success('Scheduler started successfully!');
    logger.info('Press Ctrl+C to stop the scheduler');
}

/**
 * Test the scheduler configuration without waiting
 */
export async function testScheduler() {
    logger.info('🧪 Testing scheduler configuration...');

    if (config.sweepstakes.hgtv.enabled) {
        logger.info(`✅ HGTV enabled - Schedule: ${config.sweepstakes.hgtv.schedule}`);

        // Validate cron expression
        if (cron.validate(config.sweepstakes.hgtv.schedule)) {
            logger.success('HGTV schedule is valid');
        } else {
            logger.failure('HGTV schedule is INVALID');
        }
    }

    if (config.sweepstakes.foodNetwork.enabled) {
        logger.info(`✅ Food Network enabled - Schedule: ${config.sweepstakes.foodNetwork.schedule}`);

        // Validate cron expression
        if (cron.validate(config.sweepstakes.foodNetwork.schedule)) {
            logger.success('Food Network schedule is valid');
        } else {
            logger.failure('Food Network schedule is INVALID');
        }
    }

    logger.info('\n📋 Next scheduled runs:');
    logger.info('HGTV: Check your cron schedule');
    logger.info('Food Network: Check your cron schedule');
    logger.info('\nScheduler test complete!');
}
