import e from "express";
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
    new Date(2022, 4, 1) //(YYYY, MM-1, DD)
  );

  /* RUN FOR CURRENT DATE */
  // const { blockNumber, timestamp, runDateUTC } = await getBlockForCurrentDate();

  const emmisions = await getEmmisionsData(blockNumber);

  const values = emmisions
    .reduce((prev, curr) => {
      if (curr.rewarder.rewardTokens.length === 0) {
        const newobj = {
          date: runDateUTC.format("MM/DD/YYYY"),
          blockNumber: blockNumber,
          timeStamp: timestamp.toString(),
          allocPoint: curr.allocPoint,
          pooladdress: curr.pair,
          rewardPerSecond: "NA",
          rewardSymbol: "NA",
          rewardtokenaddress: "NA",
        };
        prev.push(newobj);
      } else {
        curr.rewarder.rewardTokens.map((item) => {
          const newobj = {
            date: runDateUTC.format("MM/DD/YYYY"),
            blockNumber: blockNumber,
            timeStamp: timestamp.toString(),
            allocPoint: curr.allocPoint,
            pooladdress: curr.pair,
            rewardPerSecond: item.rewardPerSecond,
            rewardSymbol: item.symbol,
            rewardtokenaddress: item.token,
          };
          prev.push(newobj);
        });
      }
      return prev;
    }, [])
    .map((item) => Object.values(item));

  const resource = { values };

  const { databaseSheetId, lastRowIndex: startingAppendRow } =
    await getDataSheetProperties(appAuthorization, SPREADSHEET_ID, SHEET_NAME);

  await copyPasteNewRows(
    appAuthorization,
    SPREADSHEET_ID,
    databaseSheetId,
    values.length,
    startingAppendRow
  );

  const output = await appAuthorization.spreadsheets.values.update(
    {
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME + "!B" + (startingAppendRow + 1).toString(),
      valueInputOption: "USER_ENTERED",
      resource: resource,
    },
    (err) => {
      if (err) return console.log("The API returned an error: " + err);
    }
  );
}
