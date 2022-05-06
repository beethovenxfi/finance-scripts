import { google } from "googleapis";
import {
  getBlockForDate,
  getBlockForCurrentDate,
  getAllPools,
} from "./graph.js";
import {
  getAuthorization,
  getSpreadsheetProperites,
  getDataSheetProperties,
  copyPasteNewRows,
} from "./sheets.js";

importPools();

async function importPools() {
  const oAuth2Client = await getAuthorization();
  addPoolDatabaseRows(oAuth2Client);
}

async function addPoolDatabaseRows(auth) {
  console.log("\nStart Pool Import", new Date());

  //  const SPREADSHEET_ID = "16T1WK89Q1fxXYkJ79cz7NCGatVKKgZUCkOmGUyQ5YZQ"; //TEST POOL SHEET

  const SPREADSHEET_ID = "1YGyVDUQuJoQRj2sUMpWnCO-8O_fcVW02-fhdb9Uf2_A"; //LIVE DATA SHEET ADDRESS

  const SHEET_NAME = "Database";

  const appAuthorization = google.sheets({ version: "v4", auth });

  /*  RUN FOR DATE ENTERED  */
  // const { blockNumber, timestamp, runDateUTC } = await getBlockForDate(
  //   new Date(2022, 2, 2) //(YYYY, MM-1, DD)
  // );

  /* RUN FOR CURRENT DATE */
  const { blockNumber, timestamp, runDateUTC } = await getBlockForCurrentDate();

  const spreadsheetProperties = await getSpreadsheetProperites(
    appAuthorization,
    SPREADSHEET_ID
  );

  const { databaseSheetId, lastRowIndex, isTimestampInSheet } =
    await getDataSheetProperties(
      appAuthorization,
      spreadsheetProperties,
      SHEET_NAME,
      timestamp,
      "F"
    );

  if (!isTimestampInSheet) {
    const pools = await getAllPools(blockNumber);

    const completePools = pools.map((pool, index) => {
      const orderedPool = {
        rank: (index + 1).toString(),
        date: runDateUTC.format("MM/DD/YYYY"),
        blockNumber: blockNumber,
        timeStamp: timestamp.toString(),
        address: pool.address,
        poolType: pool.poolType,
        name: pool.name,
        swapFee: pool.swapFee,
        swapsCount: pool.swapsCount,
        symbol: pool.symbol,
        totalLiquidity: pool.totalLiquidity,
        totalShares: pool.totalShares,
        totalSwapFee: pool.totalSwapFee,
        totalSwapVolume: pool.totalSwapVolume,
      };

      return orderedPool;
    });

    const values = completePools.map((pool) => Object.values(pool));

    await copyPasteNewRows(
      appAuthorization,
      SPREADSHEET_ID,
      databaseSheetId,
      pools.length,
      lastRowIndex
    );

    const output = await appAuthorization.spreadsheets.values.update(
      {
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_NAME + "!C" + (lastRowIndex + 1).toString(),
        valueInputOption: "USER_ENTERED",
        resource: { values },
      },
      (err) => {
        if (err) return console.log("The API returned an error: " + err);
      }
    );
  } else console.log("Pool Database already in spreadsheet for timestamp");

  console.log("Pool Import Sucessful");
}
