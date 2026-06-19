/**
 * Tests E2E: Sincronización en tiempo real vía SSE
 *
 * Qué prueba: que cuando el usuario A hace un cambio en el tablero,
 * el usuario B (en otra pestaña/sesión) ve ese cambio SIN recargar la página.
 *
 * Usuarios de prueba (ya creados en la DB):
 *   owner_e2e@test.com  — rol ADMIN en el workspace
 *   member_e2e@test.com — rol MEMBER en el workspace
 *
 * Los tokens se generan directamente con el JWT_SECRET para evitar el rate
 * limiter del auth-service durante las pruebas automatizadas.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import jwt from 'jsonwebtoken';

// ─── Configuración ────────────────────────────────────────────────────────────
const BASE = 'http://localhost:3000';
const TASKS_URL = 'http://localhost:4003';
const JWT_SECRET = 'dev_jwt_secret_minimo_32_caracteres_aqui';
const PROJECT_ID = 'cmqk8pjys0006138z4q26scsx'; // Proyecto Demo

const OWNER_E2E = {
  id: 'cmqk8pjpz0003uibpjq0iee0j',
  email: 'owner_e2e@test.com',
  password: 'E2eTest123!',
  name: 'Owner E2E',
};
const MEMBER_E2E = {
  id: 'cmqk8pjx50006uibpyloupq1h',
  email: 'member_e2e@test.com',
  password: 'E2eTest123!',
  name: 'Member E2E',
};

// Genera un JWT válido sin pasar por el auth-service (evita el rate limiter)
function generarToken(user: typeof OWNER_E2E): string {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: '1h',
  });
}

// Llama al tasks-service directo con el token generado
async function apiTasks(method: string, path: string, token: string, body?: object) {
  const res = await fetch(`${TASKS_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

// Inyecta la sesión de NextAuth en el contexto del browser vía cookies/localStorage.
// Como los tokens los generamos nosotros con el mismo secret, NextAuth los acepta.
async function injectSession(ctx: BrowserContext, user: typeof OWNER_E2E) {
  const accessToken = generarToken(user);

  // NextAuth v5 guarda la sesión cifrada en la cookie authjs.session-token.
  // En lugar de descifrarla, hacemos login real por el formulario web.
  // Si el rate limiter bloquea, seteamos la cookie de sesión manualmente.
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);

  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);

  const [_response] = await Promise.all([
    page.waitForNavigation({ timeout: 8000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);

  const url = page.url();
  if (url.includes('/login')) {
    throw new Error(`Login fallido para ${user.email} — ¿rate limit activo?`);
  }

  await page.close();
  return accessToken; // retornamos el token para llamadas API directas
}

// Navega al tablero del proyecto en una página ya autenticada
async function irAlTablero(page: Page) {
  await page.goto(`${BASE}/projects/${PROJECT_ID}`);
  // Esperar a que al menos una columna cargue
  await page
    .waitForSelector('[class*="kanban"], [class*="Kanban"], .group\\/col', { timeout: 8000 })
    .catch(() => page.waitForTimeout(3000));
  // Tiempo adicional para que SSE conecte
  await page.waitForTimeout(2000);
}

// ─── Test 1: eliminar columna se propaga en tiempo real ──────────────────────
test('eliminar columna se refleja en tiempo real en otra sesión', async ({ browser }) => {
  test.setTimeout(30000);

  // Crear columna de prueba antes del test
  const ownerToken = generarToken(OWNER_E2E);
  const colName = `E2E-Del-${Date.now()}`;
  const createRes = await apiTasks('POST', '/columns', ownerToken, {
    name: colName,
    projectId: PROJECT_ID,
  });
  expect(createRes.status).toBe(201);
  const colData = (await createRes.json()) as { data: { id: string } };
  const colId = colData.data.id;

  // Abrir dos contextos independientes (= dos usuarios distintos)
  const ctxOwner = await browser.newContext();
  const ctxMember = await browser.newContext();

  const ownerToken2 = await injectSession(ctxOwner, OWNER_E2E);
  const memberToken2 = await injectSession(ctxMember, MEMBER_E2E);
  void memberToken2; // no lo usamos directamente aquí

  const pageOwner = await ctxOwner.newPage();
  const pageMember = await ctxMember.newPage();

  await irAlTablero(pageOwner);
  await irAlTablero(pageMember);

  // La columna debe ser visible en AMBAS sesiones antes de eliminar
  await expect(pageMember.locator(`text="${colName}"`).first()).toBeVisible({ timeout: 5000 });
  console.log(`✅ Columna "${colName}" visible en sesión member`);

  // Owner elimina la columna via API directa (lo mismo que si hiciera clic en el UI)
  const delRes = await apiTasks('DELETE', `/columns/${colId}`, ownerToken2);
  expect(delRes.status).toBe(200);
  console.log(`   Columna eliminada (DELETE /columns/${colId})`);

  // El member debe ver la columna desaparecer sin recargar (SSE)
  await expect(pageMember.locator(`text="${colName}"`)).toHaveCount(0, { timeout: 6000 });
  console.log(`✅ Columna desapareció de la sesión member en tiempo real`);

  await ctxOwner.close();
  await ctxMember.close();
});

// ─── Test 2: crear columna se propaga en tiempo real ─────────────────────────
test('crear columna se refleja en tiempo real en otra sesión', async ({ browser }) => {
  test.setTimeout(30000);

  const ctxOwner = await browser.newContext();
  const ctxMember = await browser.newContext();

  const ownerToken = await injectSession(ctxOwner, OWNER_E2E);
  await injectSession(ctxMember, MEMBER_E2E);

  const pageOwner = await ctxOwner.newPage();
  const pageMember = await ctxMember.newPage();

  await irAlTablero(pageOwner);
  await irAlTablero(pageMember);

  // Crear la columna DESPUÉS de que ambas sesiones están en el tablero
  const colName = `E2E-New-${Date.now()}`;
  const createRes = await apiTasks('POST', '/columns', ownerToken, {
    name: colName,
    projectId: PROJECT_ID,
  });
  expect(createRes.status).toBe(201);
  const colData = (await createRes.json()) as { data: { id: string } };
  console.log(`   Columna creada: "${colName}"`);

  // El member debe ver la columna aparecer sin recargar
  await expect(pageMember.locator(`text="${colName}"`).first()).toBeVisible({ timeout: 6000 });
  console.log(`✅ Nueva columna visible en sesión member en tiempo real`);

  // Limpieza
  await apiTasks('DELETE', `/columns/${colData.data.id}`, ownerToken);

  await ctxOwner.close();
  await ctxMember.close();
});

// ─── Test 3: actualizar tarea se propaga en tiempo real ───────────────────────
test('actualizar tarea se refleja en tiempo real en otra sesión', async ({ browser }) => {
  test.setTimeout(30000);

  const ownerToken = generarToken(OWNER_E2E);

  // Obtener primera columna del proyecto
  const colsRes = await apiTasks('GET', `/columns?projectId=${PROJECT_ID}`, ownerToken);
  const colsData = (await colsRes.json()) as { data: Array<{ id: string }> };
  const columnId = colsData.data[0]?.id;
  expect(columnId).toBeTruthy();

  // Crear tarea de prueba
  const taskTitle = `E2E-Task-${Date.now()}`;
  const taskRes = await apiTasks('POST', '/tasks', ownerToken, {
    title: taskTitle,
    columnId,
    projectId: PROJECT_ID,
  });
  expect(taskRes.status).toBe(201);
  const taskData = (await taskRes.json()) as { data: { id: string } };
  const taskId = taskData.data.id;
  console.log(`   Tarea creada: "${taskTitle}" (${taskId})`);

  const ctxOwner = await browser.newContext();
  const ctxMember = await browser.newContext();

  const ownerToken2 = await injectSession(ctxOwner, OWNER_E2E);
  await injectSession(ctxMember, MEMBER_E2E);

  const pageOwner = await ctxOwner.newPage();
  const pageMember = await ctxMember.newPage();

  await irAlTablero(pageOwner);
  await irAlTablero(pageMember);

  // Tarea visible en member
  await expect(pageMember.locator(`text="${taskTitle}"`).first()).toBeVisible({ timeout: 5000 });

  // Owner actualiza el título
  const nuevoTitulo = `${taskTitle}-UPDATED`;
  const updateRes = await apiTasks('PATCH', `/tasks/${taskId}`, ownerToken2, {
    title: nuevoTitulo,
  });
  expect(updateRes.status).toBe(200);
  console.log(`   Tarea actualizada: "${nuevoTitulo}"`);

  // Member ve el nuevo título sin recargar
  await expect(pageMember.locator(`text="${nuevoTitulo}"`).first()).toBeVisible({ timeout: 6000 });
  console.log(`✅ Actualización de tarea visible en sesión member en tiempo real`);

  // Limpieza
  await apiTasks('DELETE', `/tasks/${taskId}`, ownerToken2);

  await ctxOwner.close();
  await ctxMember.close();
});
