import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Helper function to delay execution
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadFile(url, filename, retries = 3, backoff = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, { timeout: 10000 }); // Set a timeout of 10 seconds

            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            }

            const dest = fs.createWriteStream(filename);
            response.body.pipe(dest);

            return new Promise((resolve, reject) => {
                dest.on('finish', resolve);
                dest.on('error', reject);
            });
        } catch (error) {
            if (attempt === retries || !['ECONNRESET', 'ECONNABORTED', 'socket hang up', 'ETIMEDOUT'].includes(error.code)) {
                throw error; // Rethrow the error if it's the last attempt or not a retriable error
            }
            console.error(`Attempt ${attempt} failed for ${url} due to ${error.code}. Retrying in ${backoff}ms...`);
            await delay(backoff);
            backoff *= 2; // Exponential backoff
        }
    }
}

export async function downloadAllFiles(urls, downloadFolder) {
    // Ensure the download folder exists
    if (!fs.existsSync(downloadFolder)) {
        fs.mkdirSync(downloadFolder);
    }

    // Function to process a batch of URLs
    const processBatch = async (batch) => {
        const downloadPromises = batch.map(async (url) => {
            const filename = path.basename(url); // Extract filename from URL
            const filePath = path.join(downloadFolder, filename) + '.w3g';

            try {
                await downloadFile(url, filePath);
               // console.log(`Downloaded ${url} to ${filePath}`);
            } catch (error) {
                console.error(`Error downloading ${url}: ${error.message}`);
            }
        });

        await Promise.all(downloadPromises);
    };

    // Process URLs in batches of 250
    const batchSize = 500;
    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        await processBatch(batch);
    }
}