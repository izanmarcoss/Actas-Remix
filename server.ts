import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { parseCSV, rowsToObjects } from './src/utils/csvParser.js';

// Node 18+ includes native fetch. We can use it directly.

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route - Fetch Spreadsheet Data
  app.get('/api/sheet-data', async (req, res) => {
    const sheetUrl = req.query.url as string;
    
    if (!sheetUrl) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, proporciona un enlace de Google Sheets válido.',
      });
    }

    try {
      // Robust Google Sheet URL Parsing
      // E.g., https://docs.google.com/spreadsheets/d/1Y1mptmnYZqXvMQkXyWKyWKyFRtxKowCDEMoy_IRoT5nHyw/edit?gid=20#gid=20
      const spreadsheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]{40,})\b/);
      if (!spreadsheetIdMatch) {
         return res.status(400).json({
           success: false,
           errorType: 'invalid_url',
           message: 'El enlace proporcionado no parece ser un enlace válido de Google Sheets. Asegúrate de incluir el ID del documento (debe empezar por /d/)',
         });
      }

      const spreadsheetId = spreadsheetIdMatch[1];
      
      // Parse gid (worksheet tab ID)
      const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';

      // Build export CSV URL
      const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
      
      console.log(`Fetching spreadsheet data from Google: ID=${spreadsheetId}, GID=${gid}`);
      
      const response = await fetch(exportUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({
            success: false,
            errorType: 'not_found',
            message: 'La hoja de cálculo no se encontró o no es pública (código de estado 404). Por favor, asegúrate de que el ID del documento es correcto y que la hoja está compartida de forma pública ("Cualquier persona con el enlace puede ver").',
            details: `Google returned 404 for ID=${spreadsheetId}, GID=${gid}`
          });
        }
        if (response.status === 403) {
          return res.status(403).json({
            success: false,
            errorType: 'forbidden',
            message: 'La hoja de cálculo elegida es privada o requiere iniciar sesión (código de estado 403). Por favor, cámbiala en Google Sheets para que cualquier persona con el enlace pueda verla.',
            details: `Google returned 403 for ID=${spreadsheetId}, GID=${gid}`
          });
        }
        return res.status(response.status).json({
          success: false,
          errorType: 'google_response_error',
          message: `La solicitud a Google Sheets falló con el código de estado ${response.status}.`,
          details: `Google returned status ${response.status}`
        });
      }

      const contentText = await response.text();

      // Check if Google Sheet returned dynamic sign-in HTML instead of raw CSV
      // This happens when the sheet is not public (requires sign-in / private spreadsheet)
      if (contentText.includes('<!DOCTYPE html') || contentText.includes('<html') || contentText.startsWith('<script')) {
        return res.status(403).json({
          success: false,
          errorType: 'unauthorized',
          message: 'La hoja de cálculo seleccionada es privada o requiere iniciar sesión. Por favor, cámbiala en Google Sheets para que "Cualquier persona con el enlace pueda ver" (público) o "Publicar en la Web".',
        });
      }

      // Parse CSV contents
      const rawRows = parseCSV(contentText);
      if (rawRows.length === 0) {
        return res.status(422).json({
          success: false,
          errorType: 'empty_sheet',
          message: 'La hoja de cálculo se leyó correctamente pero no contiene datos o está vacía.',
        });
      }

      const records = rowsToObjects(rawRows);
      
      return res.json({
        success: true,
        spreadsheetId,
        gid,
        updatedAt: new Date().toISOString(),
        data: records,
        rowCount: records.length,
      });

    } catch (error: any) {
      console.error('Error fetching google sheet:', error);
      return res.status(500).json({
        success: false,
        errorType: 'network_error',
        message: 'No pudimos conectarnos con los servidores de Google Sheets. Verifica tu enlace o tu conexión a internet.',
        details: error.message || String(error)
      });
    }
  });

  // Serve static files / Vite dev server integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server loaded and listening on http://localhost:${PORT}`);
  });
}

startServer();
