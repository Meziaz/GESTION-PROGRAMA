import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputFile = path.join(__dirname, '..', 'proyecto_export.sql');

const knownPaths = [
  'C:/Program Files/PostgreSQL/16/bin/psql.exe',
  'C:/Program Files/PostgreSQL/15/bin/psql.exe',
  'C:/Program Files/PostgreSQL/14/bin/psql.exe',
];
const psql = knownPaths.find((bin) => existsSync(bin)) ?? 'psql';

if (!existsSync(inputFile)) {
  console.error(`❌ No se encontró ${inputFile}. Pide a tu compañero el archivo proyecto_export.sql y colócalo en la raíz del proyecto.`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL en .env.local');
  process.exit(1);
}

console.log('📥 Importando proyecto_export.sql en tu base de datos local ...');
const result = spawnSync(psql, ['-f', inputFile, '-d', process.env.DATABASE_URL], { stdio: 'inherit' });

if (result.status !== 0) {
  console.error('❌ No se pudo importar. Verifica que PostgreSQL (psql) esté instalado, corriendo, y que la base de datos exista (ejecuta primero: npm run db:init).');
  process.exit(result.status ?? 1);
}

console.log('✅ Importado correctamente. Ya puedes abrir la app y ver los mismos proyectos.');
