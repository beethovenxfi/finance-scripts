import fs from "fs";
import readline from "readline-sync";
import { google } from "googleapis";

const OAuth2Client = google.auth.OAuth2;

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "./token.json";

async function readCredentials() {
  try {
    const credentials = await fs.readFileSync("./credentials.json");
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
    token = await fs.readFileSync(TOKEN_PATH);
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
        await fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log("Token stored to", TOKEN_PATH);
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

export async function getBottomRowIndex(
  appAuthorization,
  SPREADSHEET_ID,
  SHEET_NAME,
  endRowIndex
) {
  let value;
  // do {
  //   const request = {
  //     spreadsheetId: SPREADSHEET_ID,
  //     range: SHEET_NAME + "!A" + --endRowIndex,
  //   };
  //   console.log(request, endRowIndex);
  //   const cellValue = await appAuthorization.spreadsheets.values.get(request);
  //   value = cellValue.data.values;
  // } while (!value);

  const request1 = {
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME + "!A1:A",
  };
  //console.log(request1, endRowIndex);
  const cellValue1 = await appAuthorization.spreadsheets.values.get(request1);
  //  console.table(cellValue1.data.values);

  //find the 1st non-blank cell starting at the bottom of the sheet
  //  let isCellEmpty = true;
  //  while (isCellEmpty) {}

  return cellValue1.data.values.length;
}
