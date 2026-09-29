import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Cargar .env.local
dotenv.config({ path: '.env.local' });

const { Client } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, 'schema.sql');
const databaseName = process.env.DB_NAME || (() => {
  try {
    return new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '') || 'evm_projects_db';
  } catch {
    return 'evm_projects_db';
  }
})();

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseName)) {
  throw new Error('DB_NAME no es un identificador de base de datos válido');
}

const getClientConfig = (database) => process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, database }
  : {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database,
    };

async function initializeDatabase() {
  console.log('🔧 Inicializando base de datos PostgreSQL...\n');

  // First, connect to default postgres database to create the new database
  const adminClient = new Client(getClientConfig('postgres'));

  try {
    await adminClient.connect();
    console.log('✅ Conectado a PostgreSQL (base de datos por defecto)\n');

    // Check if database exists
    const dbExists = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [databaseName]
    );

    if (!dbExists.rows.length) {
      console.log(`📦 Creando base de datos: ${databaseName}...`);
      await adminClient.query(`CREATE DATABASE "${databaseName}"`);
      console.log(`✅ Base de datos creada\n`);
    } else {
      console.log(`✅ Base de datos ${databaseName} ya existe\n`);
    }

    await adminClient.end();

    // Now connect to the new database to run schema
    const client = new Client(getClientConfig(databaseName));

    await client.connect();
    console.log(`✅ Conectado a base de datos: ${databaseName}\n`);

    // Read and execute schema
    console.log('📝 Leyendo schema.sql...');
    let schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Remove problematic parts for pg client
    // PostgreSQL doesn't support CREATE DATABASE IF NOT EXISTS with regular client
    schema = schema
      .replace(/CREATE DATABASE IF NOT EXISTS.*?;/gi, '')
      .replace(/^\\c.*?;?$/gm, '');

    console.log('🔄 Ejecutando migraciones...\n');
    await client.query(schema);
    console.log('✅ Migraciones completadas exitosamente\n');

    // Verify tables exist
    const tables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log('📊 Tablas creadas:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.tablename}`);
    });

    // Count records in each table
    console.log('\n📈 Datos de ejemplo:');
    const projectCount = await client.query('SELECT COUNT(*) FROM projects');
    const phaseCount = await client.query('SELECT COUNT(*) FROM wbs_phases');
    const activityCount = await client.query('SELECT COUNT(*) FROM wbs_activities');
    const teamCount = await client.query('SELECT COUNT(*) FROM team_members');
    const cutDateCount = await client.query('SELECT COUNT(*) FROM cut_dates');

    console.log(`   ✓ Proyectos: ${projectCount.rows[0].count}`);
    console.log(`   ✓ Fases WBS: ${phaseCount.rows[0].count}`);
    console.log(`   ✓ Actividades: ${activityCount.rows[0].count}`);
    console.log(`   ✓ Miembros de equipo: ${teamCount.rows[0].count}`);
    console.log(`   ✓ Fechas de corte: ${cutDateCount.rows[0].count}`);

    await client.end();
    console.log('\n✅ Base de datos inicializada correctamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
}

// Run if executed directly
initializeDatabase();
