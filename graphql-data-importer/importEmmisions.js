import { google } from "googleapis";
import {
  getBlockForDate,
  getBlockForCurrentDate,
  getEmmisionsData,
} from "./graph.js";
import {
  getAuthorization,
  getDataSheetProperties,
  copyPasteNewRows,
} from "./sheets.js";

importEmmisions();

async function importEmmisions() {
  const oAuth2Client = await getAuthorization();
  addEmmisionsDatabaseRows(oAuth2Client);
}

async function addEmmisionsDatabaseRows(auth) {
  const SPREADSHEET_ID = "11TTW4_yXFGuhw6H22PQ7fdE3VF00Q3rt3WNzI2O52Lo"; //TEST EMMISIONS SHEET

  //const SPREADSHEET_ID = "1YGyVDUQuJoQRj2sUMpWnCO-8O_fcVW02-fhdb9Uf2_A"; //LIVE DATA SHEET ADDRESS

  const SHEET_NAME = "EmissionsData";

  console.log("create sheets object");
  const appAuthorization = google.sheets({ version: "v4", auth });

  /*  RUN FOR DATE ENTERED  */
  const { blockNumber, timestamp, runDateUTC } = await getBlockForDate(
    new Date(2022, 3, 30) //(YYYY, MM-1, DD)
  );

  /* RUN FOR CURRENT DATE */
  // const { blockNumber, timestamp, runDateUTC } = await getBlockForCurrentDate();

  const pools = await getEmmisionsData(blockNumber);

  const { databaseSheetId, lastRowIndex: startingAppendRow } =
    await getDataSheetProperties(appAuthorization, SPREADSHEET_ID, SHEET_NAME);

  await copyPasteNewRows(
    appAuthorization,
    SPREADSHEET_ID,
    databaseSheetId,
    pools.length,
    startingAppendRow
  );
}
