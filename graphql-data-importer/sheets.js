import fs from "fs";
import readline from "readline-sync";
import { google } from "googleapis";

const OAuth2Client = google.auth.OAuth2;

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_FILE = new URL("token.json", import.meta.url);
const CREDENTIALS_FILE = new URL("credentials.json", import.meta.url);

async function readCredentials() {
  try {
    const credentials = await fs.readFileSync(CREDENTIALS_FILE);
    return JSON.parse(credentials);
  } catch (err) {
    console.error("Failed to read credentials file - ", err);
    process.exit(0);
  }
}

export async function getAuthorization() {
  const credentials = await readCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new OAuth2Client(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  let token;
  try {
    token = await fs.readFileSync(TOKEN_FILE);
  } catch {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url: \n\n", authUrl);
    const code = readline.question("\nEnter the code from that page here: ");
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      try {
        await fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens));
        console.log("Token stored to", TOKEN_FILE);
        return oAuth2Client;
      } catch (err) {
        console.error(err);
        process.exit(0);
      }
    } catch (err) {
      console.error(err.message);
      process.exit(0);
    }
  }

  oAuth2Client.setCredentials(JSON.parse(token));
  return oAuth2Client;
}

export async function getSpreadsheetProperites(
  appAuthorization,
  SPREADSHEET_ID
) {
  const spreadsheetRequest = { spreadsheetId: SPREADSHEET_ID };
  const spreadsheetProperties = await appAuthorization.spreadsheets.get(
    spreadsheetRequest
  );

  return spreadsheetProperties;
}

export async function getDataSheetProperties(
  appAuthorization,
  spreadsheetProperties,
  SHEET_NAME,
  timestamp,
  timestampColumn
) {
  const databaseSheetProperites = spreadsheetProperties.data.sheets.find(
    (sheet) => sheet.properties.title === SHEET_NAME
  );

  const databaseSheetId = databaseSheetProperites.properties.sheetId;

  const request = {
    spreadsheetId: spreadsheetProperties.data.spreadsheetId,
    range: SHEET_NAME + "!" + timestampColumn + "1:" + timestampColumn,
  };
  const cellValue = await appAuthorization.spreadsheets.values.get(request);

  const lastRowIndex = cellValue.data.values.length;

  const isTimestampInSheet = cellValue.data.values
    .flat()
    .includes(timestamp.toString());

  return { databaseSheetId, lastRowIndex, isTimestampInSheet };
}

export async function copyPasteNewRows(
  appAuthorization,
  SPREADSHEET_ID,
  databaseSheetId,
  rowToInsert,
  startingAppendRow
) {
  //For this funciton to work correctly at least one blank row at the bottom of the sheet is required
  const copyPasteResource = {
    requests: [
      {
        clearBasicFilter: {
          sheetId: databaseSheetId,
        },
      },
      {
        appendDimension: {
          sheetId: databaseSheetId,
          dimension: "ROWS",
          length: rowToInsert,
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
            startRowIndex: startingAppendRow,
            endRowIndex: startingAppendRow + rowToInsert,
          },
          pasteType: "PASTE_FORMULA",
          pasteOrientation: "NORMAL",
        },
      },
    ],
  };

  const result = await appAuthorization.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: copyPasteResource,
  });
}
