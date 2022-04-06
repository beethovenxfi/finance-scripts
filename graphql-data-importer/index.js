import { google } from "googleapis";
import moment from "moment-timezone";
import { getBlockForTimestamp, getAllPools } from "./graph.js";
import { getAuthorization } from "./sheets.js";

importDataAndWrite();

async function importDataAndWrite() {
  const oAuth2Client = await getAuthorization();
  addSpreadsheetRows(oAuth2Client);
}

async function addSpreadsheetRows(auth) {
  //  const SPREADSHEET_ID = "15q48_JW0HMCWK56qCKZD7M5Kh0rBq5GOcsuMZt9AJYw"; //TEST POOL SHEET

  const SPREADSHEET_ID = "1YGyVDUQuJoQRj2sUMpWnCO-8O_fcVW02-fhdb9Uf2_A"; //LIVE DATA SHEET ADDRESS

  const SHEET_NAME = "Database";

  console.log("create sheets object");
  const sheets = google.sheets({ version: "v4", auth });

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

  const sheetRequest = { spreadsheetId: SPREADSHEET_ID };
  const sheetProperties = await sheets.spreadsheets.get(sheetRequest);
  //  console.log(sheetProperties);
  const databaseSheetProperites = sheetProperties.data.sheets.find(
    (sheet) => sheet.properties.title === SHEET_NAME
  );
  const databaseSheetId = databaseSheetProperites.properties.sheetId;
  console.log(databaseSheetId);
  const endRowIndex = databaseSheetProperites.basicFilter.range.endRowIndex;
  console.log("sheetID, endRow ", databaseSheetId, endRowIndex);

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
            startRowIndex: 1,
            endRowIndex: 2,
            startColumnIndex: 0,
          },
          destination: {
            sheetId: databaseSheetId,
            startRowIndex: endRowIndex,
            endRowIndex: endRowIndex + pools.length,
          },
          pasteType: "PASTE_FORMULA",
          pasteOrientation: "NORMAL",
        },
      },
    ],
  };

  //console.log(copyPasteResource);

  const result = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: copyPasteResource,
  });

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
  const output = await sheets.spreadsheets.values.update(
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
