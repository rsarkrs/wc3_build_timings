import {arrayToCSV, arrayToCSV2} from './exportFunction.js';
import fetch from 'node-fetch';
import { downloadAllFiles } from './download.js';
import { saveTableToDatabase } from './database.js';

//################################################ player names ##################################################
async function playerNames() {
    const rApiLink = 'https://website-backend.w3champions.com/api/replays/';
    const pApiLink1 = 'https://website-backend.w3champions.com/api/ladder/'; // last value is league (0 = gm, 1 = masters, etc)
    const pApiLink2 = '?gateWay=20&gameMode=1&season='; // last value is season #

    const sStart = 17;
    const sEnd = 17;
    const seasons = [];
    for (let i = sStart; i <= sEnd; i++) {
        seasons.push(i);
    }

    const lStart = 0;
    const lEnd = 5;
    const leagues = [];
    for (let i = lStart; i <= lEnd; i++) {
        leagues.push(i);
    }
    const headers = ['season', 'league', 'players', 'race'];
    const dict = {
        'N': {'season': [], 'league': [], 'players': [], 'race': []},
        'H': {'season': [], 'league': [], 'players': [], 'race': []},
        'O': {'season': [], 'league': [], 'players': [], 'race': []},
        'U': {'season': [], 'league': [], 'players': [], 'race': []},
        'R': {'season': [], 'league': [], 'players': [], 'race': []}
    };
    const races = ['N', 'H', 'O', 'U', 'R'];

    for (let s of seasons) {
        for (let l of leagues) {
            const url = `${pApiLink1}${l}${pApiLink2}${s}`;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const rawdata = await response.json();
                for (let j = 0; j < rawdata.length; j++) {
                    dict[raceConversion(rawdata[j].race)].season.push(s);
                    dict[raceConversion(rawdata[j].race)].league.push(l);
                    dict[raceConversion(rawdata[j].race)].players.push(rawdata[j].player1Id.replace('#', '%23'));
                    dict[raceConversion(rawdata[j].race)].race.push(raceConversion(rawdata[j].race));
                }
            } catch (error) {
                console.error(`Failed to fetch data for season ${s}, league ${l}:`, error);
                // Optionally continue processing other items even if an error occurs
            }
        }
    }

    // Export to CSV
    arrayToCSV(dict, races, headers, 'players.csv');
    return dict;
}
//################################################ GAME IDS ##################################################
// Utility function to pause execution for a given duration
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to perform fetch with retries
async function fetchWithRetries(url, options = {}, retries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response;
            }
            throw new Error(`Fetch failed with status: ${response.status}`);
        } catch (error) {
            if (attempt < retries) {
                console.warn(`Fetch attempt ${attempt} failed. Retrying in ${delay}ms...`);
                await sleep(delay);
            } else {
                throw error;
            }
        }
    }
}

async function gameIds(dict) {
    const downloadLink = 'https://website-backend.w3champions.com/api/replays/';
    const gApiLink1 = 'https://website-backend.w3champions.com/api/matches/search?playerId=';
    const gApiLink2 = '&gateway=20&offset=';
    const gApiLink3 = '&pageSize=';
    const gApiLink4 = '&season=';
    const races = ['N']; // Adjust as needed
    const headers = ['id', 'season', 'duration', 'player1', 'player1_race', 'player2', 'player2_race', 'replay_link'];
    let gameIdSchema = {
        'id': 'TEXT',
        'match_id': 'TEXT',
        'season': 'TEXT',
        'duration': 'TEXT',
        'map': 'TEXT',
        'mapName': 'TEXT',
        'startTime': 'TEXT',
        'server': 'TEXT',
        'avgPing': 'INTEGER',
        'player': 'TEXT',
        'currentMmr': 'INTEGER',
        'oldMmr': 'INTEGER',
        'race': 'TEXT',
        'rndRace': 'TEXT',
        'won': 'TEXT',
        'replay_link': 'TEXT'
    };
    let gameIdValues = [];
    let replayLinks = [];
    let gameIdSet = new Set();
    const table1Path = './database/gameData_692024.db';

    for (let r of races) {
        for (let i = 0; i < dict[r].players.length; i++) {
            const playerTag = dict[r].players[i];
            const s = dict[r].season[i];
            const promises = [];

        //    if (replayLinks.length > 9000) {
        //        console.log('10k');
        //    }
            try {
                const response = await fetchWithRetries(`${gApiLink1}${playerTag}${gApiLink2}0${gApiLink3}1${gApiLink4}${s}`);
                const rawdata = await response.json();
                const pageSize = rawdata.count;

                for (let offset = 0; offset < pageSize; offset += 100) {
                    const url = `${gApiLink1}${playerTag}${gApiLink2}${offset}${gApiLink3}${pageSize}${gApiLink4}${s}`;
                    promises.push(fetchWithRetries(url).then(async (response) => {
                        const rawdata = await response.json();

                        rawdata.matches.filter(match => match.gameMode == 1).forEach((match) => {
                            if (!gameIdSet.has(match.id) & match.durationInSeconds > 180) {
                                match.teams.forEach((team, k) => {
                                    const player = team.players[0];
                                    gameIdValues.push([
                                        match.id,
                                        match['original-ongoing-match-id'],
                                        match.season,
                                        match.durationInSeconds,
                                        match.map,
                                        match.mapName,
                                        match.startTime,
                                        match.serverInfo.name,
                                        match.serverInfo.playerServerInfos[k].averagePing,
                                        player.battleTag.replace('#', '%23'),
                                        player.currentMmr,
                                        player.oldMmr,
                                        raceConversion(player.race),
                                        raceConversion(player.rndRace),
                                        player.won,
                                        `${downloadLink}${match.id}`
                                    ]);
                                });
                                replayLinks.push(`${downloadLink}${match.id}`)
                                gameIdSet.add(match.id);
                            }
                        });
                    }));
                }
            } catch (error) {
                console.error(`Failed to fetch data for player ${playerTag} in season ${s}:`, error);
            }

            // Await all fetch operations for this player
            await Promise.all(promises);
        }
    }

    // Push all accumulated values to the database at once
    try {
        await saveTableToDatabase(gameIdSchema, gameIdValues, table1Path);
        console.log("All game IDs have been saved to the database.");
    } catch (error) {
        console.error("Failed to save game IDs to the database:", error);
    }

   // arrayToCSV2(filteredGameIds, races, headers, 'gameIds.csv');
    downloadAllFiles(replayLinks, './downloads');
}

function raceConversion(race) {
    switch (race) {
        case 0: return 'R';
        case 1: return 'H';
        case 2: return 'O';
        case 4: return 'N';
        case 8: return 'U';
        default: return -1;
    }
}

const dict = await playerNames();
const gameDict = await gameIds(dict);