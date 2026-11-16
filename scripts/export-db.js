import { spawnSync } from 'child_process';
import { existsSync, writeFileSync, appendFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputFile = path.join(__dirname, '..', 'proyecto_export.sql');

const knownPaths = [
  'C:/Program Files/PostgreSQL/16/bin/pg_dump.exe',
  'C:/Program Files/PostgreSQL/15/bin/pg_dump.exe',
  'C:/Program Files/PostgreSQL/14/bin/pg_dump.exe',
];
const pgDump = knownPaths.find((bin) => existsSync(bin)) ?? 'pg_dump';

if (!process.env.DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL en .env.local');
  process.exit(1);
}

console.log('📦 Exportando solo los datos (la estructura la crea "npm run db:init") ...');

// TRUNCATE al inicio: al importar, reemplaza los datos existentes en vez de duplicarlos.
writeFileSync(outputFile, 'TRUNCATE TABLE projects;\n');

const result = spawnSync(pgDump, ['--data-only', '--no-owner', '--no-privileges', '-t', 'projects', '-d', process.env.DATABASE_URL], {
  encoding: 'utf-8',
});

if (result.status !== 0) {
  console.error('❌ No se pudo exportar. Verifica que PostgreSQL (pg_dump) esté instalado y corriendo.');
  console.error(result.stderr);
  process.exit(result.status ?? 1);
}

appendFileSync(outputFile, result.stdout);

console.log(`✅ Exportado correctamente: ${outputFile}`);
console.log('   Comparte este archivo .sql con tu equipo. Ellos, tras ejecutar "npm run db:init" una vez, lo importan con: npm run db:import');
