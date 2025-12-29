import puppeteer from 'puppeteer';

console.log('Testing Puppeteer browser launch...');

try {
    const browser = await puppeteer.launch({
        headless: false,
        pipe: true, // Use pipe instead of WebSocket (fixes Node.js v25 issue)
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        dumpio: false
    });

    console.log('✅ Browser launched successfully!');

    const page = await browser.newPage();
    console.log('✅ New page created!');

    await page.goto('https://example.com', { timeout: 60000 });
    console.log('✅ Page loaded!');

    await new Promise(resolve => setTimeout(resolve, 2000));

    await browser.close();
    console.log('✅ Browser closed!');

    console.log('\n🎉 Test passed! Puppeteer is working correctly.');
} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
}
