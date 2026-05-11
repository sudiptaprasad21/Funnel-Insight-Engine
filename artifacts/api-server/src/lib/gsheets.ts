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
    `/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW&insertDataOption=OVERWRITE`,
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

/** Ensure a named tab exists in the spreadsheet, creating it if absent. */
export async function ensureSheetTab(
  spreadsheetId: string,
  tabTitle: string,
): Promise<void> {
  const connectors = new ReplitConnectors();
  // Fetch existing sheet metadata
  const metaResp = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { method: "GET" },
  );
  const meta = (await metaResp.json()) as {
    sheets?: { properties: { title: string } }[];
  };
  const exists = (meta.sheets ?? []).some((s) => s.properties.title === tabTitle);
  if (!exists) {
    await connectors.proxy(
      "google-sheet",
      `/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: tabTitle } } }],
        }),
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/** Clear a named tab and write rows into it. */
export async function clearAndWriteNamedSheet(
  spreadsheetId: string,
  tabTitle: string,
  rows: (string | number)[][],
): Promise<number> {
  const connectors = new ReplitConnectors();
  const range = `${tabTitle}!A1:Z1000`;

  await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
    { method: "POST", headers: { "Content-Type": "application/json" } },
  );

  const appendResp = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${tabTitle}!A1`)}:append?valueInputOption=RAW&insertDataOption=OVERWRITE`,
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
