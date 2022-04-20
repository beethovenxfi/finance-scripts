import { google } from "googleapis";
import moment from "moment-timezone";
import { getBlockForTimestamp, getAllPools } from "./graph.js";
import { getAuthorization, getBottomRowIndex } from "./sheets.js";

importDataAndWrite();

async function importDataAndWrite() {
  const oAuth2Client = await getAuthorization();
  addSpreadsheetRows(oAuth2Client);
}

async function addSpreadsheetRows(auth) {
  const SPREADSHEET_ID = "16T1WK89Q1fxXYkJ79cz7NCGatVKKgZUCkOmGUyQ5YZQ"; //TEST POOL SHEET

  //const SPREADSHEET_ID = "1YGyVDUQuJoQRj2sUMpWnCO-8O_fcVW02-fhdb9Uf2_A"; //LIVE DATA SHEET ADDRESS

  const SHEET_NAME = "Database";

  console.log("create sheets object");
  const appAuthorization = google.sheets({ version: "v4", auth });

  // RUN FOR DATE ENTERED
  //const startDate = new Date(2022, 3, 1);

  // RUN FOR CURRENT DATE
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 1);
  let timestamp = 0;

  // const endDate = moment.tz(new Date(2022, 2, 31), "GMT").startOf("day").unix();
  // while (timestamp <= endDate) {

  // startDate is set to the perivous date
  // runDateGMT is the what is displayed in the output
  // timestamp is the runDate one day in the futute, this is what the actual report data is based on
  const runDateGMT = moment.tz(startDate, "GMT").startOf("day");
  startDate.setDate(startDate.getDate() + 1);
  timestamp = moment.tz(startDate, "GMT").startOf("day").unix();

  const blockNumber = await getBlockForTimestamp(timestamp);
  console.log("import run:%s, %i", runDateGMT.format(), timestamp, blockNumber);

  const pools = await getAllPools(blockNumber);

  const spreadsheetRequest = { spreadsheetId: SPREADSHEET_ID };
  const spreadsheetProperties = await appAuthorization.spreadsheets.get(
    spreadsheetRequest
  );
  //console.log(spreadsheetProperties);

  const databaseSheetProperites = spreadsheetProperties.data.sheets.find(
    (sheet) => sheet.properties.title === SHEET_NAME
  );
  //  console.log(databaseSheetProperites);

  const databaseSheetId = databaseSheetProperites.properties.sheetId;

  const endRowIndex =
    databaseSheetProperites.properties.gridProperties.rowCount;
  console.log("sheetID, endRow ", databaseSheetId, endRowIndex);

  const startingAppendRow = await getBottomRowIndex(
    appAuthorization,
    SPREADSHEET_ID,
    SHEET_NAME,
    endRowIndex
  );
  console.log("startingAppendRow ", startingAppendRow);

  //For this funciton to work correctly at least one blank row at the bottom of the sheet is required
  const copyPasteResource = {
    requests: [
      {
        appendDimension: {
          sheetId: databaseSheetId,
          dimension: "ROWS",
          length: pools.length,
        },
      },
      {
        copyPaste: {
          source: {
            sheetId: databaseSheetId,
            startRowIndex: startingAppendRow - 1,
            endRowIndex: startingAppendRow,
            startColumnIndex: 0,
          },
          destination: {
            sheetId: databaseSheetId,
            startRowIndex: startingAppendRow + 1,
            endRowIndex: startingAppendRow + 1 + pools.length,
          },
          pasteType: "PASTE_FORMULA",
          pasteOrientation: "NORMAL",
        },
      },
    ],
  };

  console.table(copyPasteResource);

  const result = await appAuthorization.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: copyPasteResource,
  });

  process.exit(0);

  const completePools = pools.map((pool, index) => {
    const orderedPool = {
      rank: (index + 1).toString(),
      date: runDateGMT.format("MM/DD/YYYY"),
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

    return { ...orderedPool };
  });

  const values = [];
  completePools.forEach((pool) => values.push(Object.values(pool)));

  //console.log(values);
  const resource = { values };

  //  console.log(values);
  const output = await appAuthorization.spreadsheets.values.update(
    {
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME + "!C" + (endRowIndex + 1).toString(),
      valueInputOption: "USER_ENTERED",
      resource: resource,
    },
    (err) => {
      if (err) return console.log("The API returned an error: " + err);
      //      console.log(data);
    }
  );
}
//}
