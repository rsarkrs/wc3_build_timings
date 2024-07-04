const sqlite3 = require('sqlite3').verbose();
const W3GReplay = require("w3gjs").default;
const parser = new W3GReplay();
const fs = require('fs');
const parse = require('csv-parse').parse; // Ensure to import correctly
const saveTableToDatabase = require('./database');
const csvToDictionary = require('./csvParser');
const { geteuid } = require('process');
const path = require('path');

let temp;
var table1Path = './database/6-22-2024/gameSummary_6-22-2024.db';
var table2Path = './database/6-22-2024/actionSummary_6-22-2024.db';
var table3Path = './database/6-22-2024/prodOrder_6-22-2024.db';
var table4Path = './database/6-22-2024/prodSummary_6-22-2024.db';

//game summary
let table1Schema = {
    'game_name': 'TEXT',
    'game_id': 'TEXT',
    'version': 'TEXT', 
    'map': 'TEXT',
    'mode': 'TEXT',
    'duration': 'INTEGER',
    'player': 'TEXT',
    'result': 'TEXT',
    'apm': 'INTEGER',
    'race': 'TEXT',
    'race_detected': 'TEXT',
    'hero_one': 'TEXT',
    'hero_two': 'TEXT',
    'hero_three': 'TEXT',
    'color': 'TEXT'
  };

//action summary
let table2Schema = {
    'game_id': 'TEXT',
    'player': 'TEXT',
    'ability': 'INTEGER',
    'assigngroup': 'INTEGER',
    'basic': 'INTEGER',
    'buildtrain': 'INTEGER',
    'esc': 'INTEGER',
    'item': 'INTEGER',
    'removeunit': 'INTEGER',
    'rightclick': 'INTEGER',
    'selectkey': 'INTEGER',
    'selecthotkey': 'INTEGER',
    'subgroup': 'INTEGER'
}

let table3Schema = {
    'game_id': 'TEXT',
    'player': 'TEXT',
    'prod_group': 'TEXT',
    'prod_name': 'TEXT',
    'ms': 'INTEGER'
}

//production summary
let table4Schema = {
    'game_id': 'TEXT',
    'player': 'TEXT',
    'prod_group': 'TEXT',
    'prod_name': 'TEXT',
    'count': 'INTEGER'
}

// Storage arrays for batch processing
let table1Batch = [];
let table2Batch = [];
let table3Batch = [];
let table4Batch = [];

function msToTime(duration) {
    let milliseconds = parseInt((duration % 1000) / 100),
        seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds;
}

function handleParsedResult(result, idToNameDict) {
    let gName = result.gamename;
    let gId = result.id;
    let gVersion = result.version;
    let gMap = result.map.file;
    let gMode = result.type;
    let gDuration = result.duration;

    if (((gMode == '1on1') & (gDuration > 180000)) || !(result.players[i].heroes[0] == null) || !(result.players[1].heroes[0] == null)) {
        for (let i = 0; i < result.players.length; i++) {
            let gPlayer = result.players[i].name;
            let gResult = result.winningTeamId == i ? 'won' : 'loss';
            let gApm = result.players[i].apm;
            let gRace = result.players[i].race;
            let gRaceDetected = result.players[i].raceDetected;
            let gHero1 = result.players[i].heroes[0] ? idToNameDict[result.players[i].heroes[0].id] : null;
            let gHero2 = result.players[i].heroes[1] ? idToNameDict[result.players[i].heroes[1].id] : null;
            let gHero3 = result.players[i].heroes[2] ? idToNameDict[result.players[i].heroes[2].id] : null;
            let gColor = result.players[i].color;

            let gAbility = result.players[i].actions.ability;
            let gAssignGroup = result.players[i].actions.assigngroup;
            let gBasic = result.players[i].actions.basic;
            let gBuildTrain = result.players[i].actions.buildtrain;
            let gEsc = result.players[i].actions.esc;
            let gItem = result.players[i].actions.item;
            let gRemoveUnit = result.players[i].actions.removeunit;
            let gRightClick = result.players[i].actions.rightclick;
            let gSelect = result.players[i].actions.select;
            let gSelectHotkey = result.players[i].actions.selecthotkey;
            let gSubGroupd = result.players[i].actions.subgroup;

            let table1Values = [
                gName,
                gId,
                gVersion,
                gMap,
                gMode,
                gDuration,
                gPlayer,
                gResult,
                gApm,
                gRace,
                gRaceDetected,
                gHero1,
                gHero2,
                gHero3,
                gColor
            ];

            let table2Values = [
                gId,
                gPlayer,
                gAbility,
                gAssignGroup,
                gBasic,
                gBuildTrain,
                gEsc,
                gItem,
                gRemoveUnit,
                gRightClick,
                gSelect,
                gSelectHotkey,
                gSubGroupd
            ];

            // Store data in batch arrays
            table1Batch.push(table1Values);
            table2Batch.push(table2Values);

            // Buildings
            for (let j of result.players[i].buildings.order) {
                let gBuildingName = idToNameDict[j.id];
                let gBuildingTimes = j.ms;
                let gProdGroup = 'Building';

                let table3Values = [
                    gId,
                    gPlayer,
                    gProdGroup,
                    gBuildingName,
                    gBuildingTimes
                ];

                table3Batch.push(table3Values);
            }

            for (let k in result.players[i].buildings.summary) {
                let gBuildingNameSummary = idToNameDict[k];
                let gBuildingCountSummary = result.players[i].buildings.summary[k];
                let gProdGroupSummary = 'Building';

                let table4Values = [
                    gId,
                    gPlayer,
                    gProdGroupSummary,
                    gBuildingNameSummary,
                    gBuildingCountSummary
                ];

                table4Batch.push(table4Values);
            }

            // Units
            for (let j of result.players[i].units.order) {
                let gUnitName = idToNameDict[j.id];
                let gUnitTimes = j.ms;
                let gProdGroup = 'Units';

                let table3Values = [
                    gId,
                    gPlayer,
                    gProdGroup,
                    gUnitName,
                    gUnitTimes
                ];

                table3Batch.push(table3Values);
            }
            for (let k in result.players[i].actions.pause.order) {
                let gPauseMS = result.players[i].actions.pause.order[k];

                let table3Values = [
                    gId,
                    gPlayer,
                    "Action",
                    "Pause",
                    gPauseMS
                ];

                table3Batch.push(table3Values);
            }

            for (let k in result.players[i].actions.unpause.order) {
                let gUnpauseMS = result.players[i].actions.unpause.order[k];

                let table3Values = [
                    gId,
                    gPlayer,
                    "Action",
                    "Unpause",
                    gUnpauseMS
                ];

                table3Batch.push(table3Values);
            }

            for (let k in result.players[i].units.summary) {
                let gUnitNameSummary = idToNameDict[k];
                let gUnitCountSummary = result.players[i].buildings.summary[k];
                let gProdGroupSummary = 'Units';

                let table4Values = [
                    gId,
                    gPlayer,
                    gProdGroupSummary,
                    gUnitNameSummary,
                    gUnitCountSummary
                ];

                table4Batch.push(table4Values);
            }

            // Upgrades
            for (let j of result.players[i].upgrades.order) {
                let gUpgName = idToNameDict[j.id];
                let gUpgTimes = j.ms;
                let gProdGroup = 'Upgrades';

                let table3Values = [
                    gId,
                    gPlayer,
                    gProdGroup,
                    gUpgName,
                    gUpgTimes
                ];

                table3Batch.push(table3Values);
            }

            for (let k in result.players[i].upgrades.summary) {
                let gUpgNameSummary = idToNameDict[k];
                let gUpgCountSummary = result.players[i].upgrades.summary[k];
                let gProdGroupSummary = 'Upgrades';

                let table4Values = [
                    gId,
                    gPlayer,
                    gProdGroupSummary,
                    gUpgNameSummary,
                    gUpgCountSummary
                ];

                table4Batch.push(table4Values);
            }

            // Items
            for (let j of result.players[i].items.order) {
                let gItemName = idToNameDict[j.id];
                let gItemTimes = j.ms;
                let gProdGroup = 'Upgrades';

                let table3Values = [
                    gId,
                    gPlayer,
                    gProdGroup,
                    gItemName,
                    gItemTimes
                ];

                table3Batch.push(table3Values);
            }

            for (let k in result.players[i].items.summary) {
                let gItemgNameSummary = idToNameDict[k];
                let gItemCountSummary = result.players[i].upgrades.summary[k];
                let gProdGroupSummary = 'Items';

                let table4Values = [
                    gId,
                    gPlayer,
                    gProdGroupSummary,
                    gItemgNameSummary,
                    gItemCountSummary
                ];

                table4Batch.push(table4Values);
            }

            // Heroes
            for (let j of result.players[i].heroes) {
                for (let z of j.abilityOrder) {
                    let gAbilityName = idToNameDict[z.value];
                    let gAbilityTime = z.time;
                    let gProdGroup = 'Ability';

                    let table3Values = [
                        gId,
                        gPlayer,
                        gProdGroup,
                        gAbilityName,
                        gAbilityTime
                    ];

                    table3Batch.push(table3Values);
                }

                for (let k in j.abilities) {
                    let gAbilityNameSummary = idToNameDict[k];
                    let gAbilityCountSummary = j.abilities[k];
                    let gProdGroupSummary = 'Ability';

                    let table4Values = [
                        gId,
                        gPlayer,
                        gProdGroupSummary,
                        gAbilityNameSummary,
                        gAbilityCountSummary
                    ];

                    table4Batch.push(table4Values);
                }
            }
        }
    } else {
        return;
    }
}

const filePath = './wc3_ids.csv'; // Replace with the path to your CSV file
const folderName = 'downloads'; // Name of the folder you want to parse
const folderPath = path.join(__dirname, folderName); // Construct absolute path to the folder

console.time('Total Processing Time');

// Function to process a batch of files
const processBatch = async (batch) => {
    const promises = batch.map((file) => {
        return csvToDictionary(filePath)
            .then((idToNameDict) => {
                const fPath = path.join(folderPath, file); // Construct full file path
                const parser = new W3GReplay(); // Instantiate the parser
                return parser.parse(fPath)
                    .then((result) => {
                    //    console.log(result);
                        handleParsedResult(result, idToNameDict);
                        const dictstring = JSON.stringify(result);
                        return new Promise((resolve, reject) => {
                            fs.writeFile("thing.json", dictstring, function(err) {
                                if (err) reject(err);
                                else resolve();
                            });
                        });
                    })
                    .catch(console.error);
            })
            .catch(console.error);
    });

    // Wait for all promises in the current batch to resolve
    await Promise.all(promises);

    // Save accumulated data to the database
    saveTableToDatabase(table1Schema, table1Batch, table1Path, (err) => {
        if (err) {
            console.error("Failed to save batch to table 1:", err);
        } else {
            console.log("Batch saved successfully to table 1.");
        }
    });

    saveTableToDatabase(table2Schema, table2Batch, table2Path, (err) => {
        if (err) {
            console.error("Failed to save batch to table 2:", err);
        } else {
            console.log("Batch saved successfully to table 2.");
        }
    });

    saveTableToDatabase(table3Schema, table3Batch, table3Path, (err) => {
        if (err) {
            console.error("Failed to save batch to table 3:", err);
        } else {
            console.log("Batch saved successfully to table 3.");
        }
    });

    saveTableToDatabase(table4Schema, table4Batch, table4Path, (err) => {
        if (err) {
            console.error("Failed to save batch to table 4:", err);
        } else {
            console.log("Batch saved successfully to table 4.");
        }
    });

    // Clear the storage arrays after saving
    table1Batch = [];
    table2Batch = [];
    table3Batch = [];
    table4Batch = [];
};

// Function to process all batches sequentially
const processAllBatches = async (files) => {
    const batchSize = 8;

    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1}`);
        await processBatch(batch); // Wait for the current batch to complete
    }

    console.log('All batches processed successfully');
    console.timeEnd('Total Processing Time');
};

// Read the directory and start processing in batches
fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        return;
    }

    processAllBatches(files)
        .catch((error) => {
            console.error('Error processing batches:', error);
        });
});