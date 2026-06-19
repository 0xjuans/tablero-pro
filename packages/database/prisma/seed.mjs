/**
 * Seed de desarrollo: crea usuarios, workspace, proyecto y columnas iniciales.
 * Ejecutar con: node prisma/seed.mjs
 */

import { PrismaClient } from '../generated/client/index.js';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Genera un hash bcrypt simple usando una alternativa sin dependencias nativas.
// En producción se usa bcryptjs en el auth-service; aquí usamos un hash sha256
// prefijado para que el auth-service pueda comparar. PERO como el auth-service
// usa bcryptjs.compare, necesitamos que los hashes sean compatibles.
// La solución: usamos el endpoint de registro para crear usuarios correctamente.

async function registrarUsuario(email, password, name) {
  const res = await fetch('http://localhost:4001/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  if (res.ok) {
    const data = await res.json();
    return data.data?.user;
  }
  // Si ya existe, intentar obtenerlo
  const err = await res.json();
  if (err.error?.includes('ya está') || err.error?.includes('already')) {
    return null; // ya existe, está bien
  }
  throw new Error(`Error registrando ${email}: ${JSON.stringify(err)}`);
}

async function main() {
  console.log('🌱 Iniciando seed...');

  // ─── Usuarios ────────────────────────────────────────────────────────────────
  console.log('   Creando usuarios...');

  await registrarUsuario('juan@test.com', 'Test1234!', 'Juan Test');
  await registrarUsuario('owner_e2e@test.com', 'E2eTest123!', 'Owner E2E');
  await registrarUsuario('member_e2e@test.com', 'E2eTest123!', 'Member E2E');

  // Obtener usuarios creados
  const juan = await prisma.user.findUnique({ where: { email: 'juan@test.com' } });
  const owner = await prisma.user.findUnique({ where: { email: 'owner_e2e@test.com' } });
  const member = await prisma.user.findUnique({ where: { email: 'member_e2e@test.com' } });

  if (!juan || !owner || !member) {
    throw new Error(
      'No se pudieron crear todos los usuarios — ¿está corriendo el auth-service en :4001?'
    );
  }

  console.log(`   ✓ juan@test.com      → ${juan.id}`);
  console.log(`   ✓ owner_e2e@test.com → ${owner.id}`);
  console.log(`   ✓ member_e2e@test.com→ ${member.id}`);

  // ─── Workspace ───────────────────────────────────────────────────────────────
  console.log('   Creando workspace...');
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'equipo-principal' },
    update: {},
    create: {
      name: 'Equipo Principal',
      slug: 'equipo-principal',
      members: {
        create: [
          { userId: juan.id, role: 'OWNER' },
          { userId: owner.id, role: 'ADMIN' },
          { userId: member.id, role: 'MEMBER' },
        ],
      },
    },
  });
  console.log(`   ✓ Workspace: ${workspace.name} (${workspace.id})`);

  // ─── Proyecto ────────────────────────────────────────────────────────────────
  console.log('   Creando proyecto...');
  const proyecto = await prisma.project.upsert({
    where: { id: workspace.id + '_demo' },
    update: {},
    create: {
      name: 'Proyecto Demo',
      description: 'Proyecto de demostración para el tablero Kanban',
      workspaceId: workspace.id,
      members: {
        create: [
          { userId: juan.id, role: 'OWNER' },
          { userId: owner.id, role: 'ADMIN' },
          { userId: member.id, role: 'MEMBER' },
        ],
      },
    },
  });
  console.log(`   ✓ Proyecto: ${proyecto.name} (${proyecto.id})`);

  // ─── Columnas ────────────────────────────────────────────────────────────────
  console.log('   Creando columnas...');
  const columnasExistentes = await prisma.column.count({ where: { projectId: proyecto.id } });

  if (columnasExistentes === 0) {
    await prisma.column.createMany({
      data: [
        { name: 'Por hacer', projectId: proyecto.id, order: 0 },
        { name: 'En progreso', projectId: proyecto.id, order: 1 },
        { name: 'En revisión', projectId: proyecto.id, order: 2 },
        { name: 'Completado', projectId: proyecto.id, order: 3 },
      ],
    });
    console.log('   ✓ 4 columnas creadas');
  } else {
    console.log(`   ✓ Ya existen ${columnasExistentes} columnas`);
  }

  console.log('\n✅ Seed completado.');
  console.log('\n   Credenciales de acceso:');
  console.log('   Email:      juan@test.com');
  console.log('   Contraseña: Test1234!');
  console.log(`\n   URL del proyecto: http://localhost:3000/projects/${proyecto.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
