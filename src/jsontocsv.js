import fs from 'fs';
import path from 'path';
import json2csv from 'json2csv';

// Cartella contenente i file JSON
const folderPath = 'storage/output';

// Leggi tutti i file nella cartella

// Leggi tutti i file nella cartella
fs.readdir(folderPath, async (err, files) => {
  if (err) {
    console.error('Errore nella lettura della cartella:', err);
    return;
  }

  // Inizializza un oggetto per raggruppare i dati per "CodRazza"
  const dataByCodRazza = {};

  // Loop attraverso ciascun file
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(folderPath, file);

      try {
        // Leggi il contenuto del file JSON
        const jsonData = JSON.parse(await fs.promises.readFile(filePath, 'utf-8'));

        // Estrai il valore "CodRazza" dal nome del file
        const match = file.match(/output_(\d+)_(\d+)_(\d+).json/);
        if (match) {
          const codRazza = match[1];
          
          // Aggiungi l'oggetto JSON al gruppo corrispondente
          if (!dataByCodRazza[codRazza]) {
            dataByCodRazza[codRazza] = [];
          }
          dataByCodRazza[codRazza].push(jsonData);
        }
      } catch (error) {
        console.error('Errore nella lettura del file JSON:', error);
      }
    }
  }

  // Loop attraverso i gruppi e convertili in CSV
  for (const codRazza in dataByCodRazza) {
    const data = dataByCodRazza[codRazza];
    const json2csvParser = new json2csv.Parser();
    const csv = json2csvParser.parse(data);

    // Scrivi il CSV in un file
    const outputFileName = `output_${codRazza}.csv`;
    await fs.promises.writeFile(outputFileName, csv);
    console.log(`Creato il file ${outputFileName}`);
  }
});