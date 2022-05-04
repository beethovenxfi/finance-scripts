import e from "express";
import { google } from "googleapis";
import {
  getBlockForDate,
  getBlockForCurrentDate,
  getEmissionsData,
  getTokenData,
  getBeetsPerBlock,
} from "./graph.js";
import {
  getAuthorization,
  getSpreadsheetProperites,
  getDataSheetProperties,
  copyPasteNewRows,
} from "./sheets.js";

importEmissions();

async function importEmissions() {
  const oAuth2Client = await getAuthorization();
  addEmissionsDatabaseRows(oAuth2Client);
}

async function addEmissionsDatabaseRows(auth) {
  const SPREADSHEET_ID = "11TTW4_yXFGuhw6H22PQ7fdE3VF00Q3rt3WNzI2O52Lo"; //TEST EMISSIONS SHEET

  //const SPREADSHEET_ID = "1YGyVDUQuJoQRj2sUMpWnCO-8O_fcVW02-fhdb9Uf2_A"; //LIVE DATA SHEET ADDRESS

  const SHEET_NAME = "EmissionsData";

  console.log("\nStart Emissions Import");
  const appAuthorization = google.sheets({ version: "v4", auth });

  /*  RUN FOR DATE ENTERED  */
  //   const { blockNumber, timestamp, runDateUTC } = await getBlockForDate(
  //     new Date(2022, 4, 3) //(YYYY, MM-1, DD)
  //   );

  /* RUN FOR CURRENT DATE */
  const { blockNumber, timestamp, runDateUTC } = await getBlockForCurrentDate();

  let databaseSheetId = 0;
  let lastRowIndex = 0;
  let isTimestampInSheet = false;

  const spreadsheetProperties = await getSpreadsheetProperites(
    appAuthorization,
    SPREADSHEET_ID
  );

  ({ databaseSheetId, lastRowIndex, isTimestampInSheet } =
    await getDataSheetProperties(
      appAuthorization,
      spreadsheetProperties,
      SHEET_NAME,
      timestamp,
      "D"
    ));

  if (!isTimestampInSheet) {
    const emissions = await getEmissionsData(blockNumber);

    const values = emissions
      .reduce((prev, curr) => {
        if (curr.rewarder.rewardTokens.length === 0) {
          const newobj = {
            date: runDateUTC.format("MM/DD/YYYY"),
            blockNumber: blockNumber,
            timeStamp: timestamp.toString(),
            allocPoint: curr.allocPoint,
            pooladdress: curr.pair,
            rewardPerSecond: "",
            rewardSymbol: "",
            rewardtokenaddress: "",
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

    await copyPasteNewRows(
      appAuthorization,
      SPREADSHEET_ID,
      databaseSheetId,
      values.length,
      lastRowIndex
    );

    const output = await appAuthorization.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME + "!B" + (lastRowIndex + 1).toString(),
      valueInputOption: "USER_ENTERED",
      resource: { values },
    });
  } else console.log("EmissionsData already in spreadsheet for timestamp");

  /********** tokens *************/

  const TOKEN_SHEET_NAME = "Tokens List";

  ({ databaseSheetId, lastRowIndex, isTimestampInSheet } =
    await getDataSheetProperties(
      appAuthorization,
      spreadsheetProperties,
      TOKEN_SHEET_NAME,
      timestamp,
      "D"
    ));

  if (!isTimestampInSheet) {
    const tokens = await getTokenData(blockNumber);

    const values = tokens
      .map((token, index) => {
        const priceUSD = token.latestPrice ? token.latestPrice.priceUSD : "";
        const tokenObject = {
          date: runDateUTC.format("MM/DD/YYYY"),
          blockNumber: blockNumber,
          timeStamp: timestamp.toString(),
          address: token.address,
          decimals: token.decimals,
          priceUSD: priceUSD,
          name: token.name,
          symbol: token.symbol,
        };
        return tokenObject;
      })
      .map((item) => Object.values(item));

    await copyPasteNewRows(
      appAuthorization,
      SPREADSHEET_ID,
      databaseSheetId,
      values.length,
      lastRowIndex
    );

    const tokenOutput = await appAuthorization.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: TOKEN_SHEET_NAME + "!B" + (lastRowIndex + 1).toString(),
      valueInputOption: "USER_ENTERED",
      resource: { values },
    });
  } else console.log("Token List already in spreadsheet for timestamp");

  /************* beets per block */

  const BEETS_PER_BLOCK_SHEET = "Beets Per Block";

  ({ databaseSheetId, lastRowIndex, isTimestampInSheet } =
    await getDataSheetProperties(
      appAuthorization,
      spreadsheetProperties,
      BEETS_PER_BLOCK_SHEET,
      timestamp,
      "C"
    ));

  if (!isTimestampInSheet) {
    const beetsPerBlock = await getBeetsPerBlock(blockNumber);

    const values = [
      {
        date: runDateUTC.format("MM/DD/YYYY"),
        blockNumber: blockNumber,
        timeStamp: timestamp.toString(),
        beetsPerBlock: beetsPerBlock[0].beetsPerBlock,
      },
    ].map((item) => Object.values(item));

    await copyPasteNewRows(
      appAuthorization,
      SPREADSHEET_ID,
      databaseSheetId,
      1,
      lastRowIndex
    );

    await appAuthorization.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: BEETS_PER_BLOCK_SHEET + "!A" + (lastRowIndex + 1).toString(),
      valueInputOption: "USER_ENTERED",
      resource: { values },
    });
  } else console.log("Beets Per Block already in spreadsheet for timestamp");

  console.log("Emissions Import Sucessful");
}
