import fs from 'fs';

// Function to export array to CSV
export function arrayToCSV(dataArray, races, headers, filePath) {
    const csvRows = [];

    // Get the headers
    csvRows.push(headers.join(','));

    // Loop through the rows
    for (const raceVar of races) {
        for (let i = 0; i < dataArray[raceVar].league.length; i++) {
        csvRows.push([dataArray[raceVar].season[i], dataArray[raceVar].league[i], dataArray[raceVar].players[i], dataArray[raceVar].race[i]].join(','));
        }
    }

    // Create the CSV file content
    const csvContent = csvRows.join('\n');

    // Write the CSV content to a file
    fs.writeFileSync(filePath, csvContent);
    console.log(`CSV file has been written to ${filePath}`);
}

export function arrayToCSV2(dataArray, races, headers, filePath) {
    const csvRows = [];

    // Get the headers
    csvRows.push(headers.join(','));

    // Loop through the rows
    for (let i = 0; i < dataArray.id.length; i++) {
        csvRows.push([dataArray.id[i], dataArray.season[i], dataArray.duration[i], dataArray.player1[i], dataArray.player1_race[i], dataArray.player2[i], dataArray.player2_race[i], dataArray.replay_link[i]].join(','));
    }

    // Create the CSV file content
    const csvContent = csvRows.join('\n');

    // Write the CSV content to a file
    fs.writeFileSync(filePath, csvContent);
    console.log(`CSV file has been written to ${filePath}`);
}