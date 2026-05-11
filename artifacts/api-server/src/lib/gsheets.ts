import { ReplitConnectors } from "@replit/connectors-sdk";

// Google Sheets integration via Replit connectors proxy
// Tokens and auth are handled automatically by the SDK

export async function createSpreadsheet(title: string): Promise<string> {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("google-sheet", "/v4/spreadsheets", {
    method: "POST",
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: "Funnel Stages", index: 0 } }],
    }),
    headers: { "Content-Type": "application/json" },
  });
  const data = (await response.json()) as { spreadsheetId: string };
  return data.spreadsheetId;
}

export async function clearAndWriteSheet(
  spreadsheetId: string,
  rows: (string | number)[][],
): Promise<number> {
  const connectors = new ReplitConnectors();

  await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values/A1:Z1000:clear`,
    { method: "POST", headers: { "Content-Type": "application/json" } },
  );

  const appendResp = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=OVERWRITE`,
    {
      method: "POST",
      body: JSON.stringify({ values: rows }),
      headers: { "Content-Type": "application/json" },
    },
  );

  const result = (await appendResp.json()) as {
    updates?: { updatedRows?: number };
  };
  return result.updates?.updatedRows ?? rows.length;
}

export function sheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
