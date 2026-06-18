import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env') })

function parseStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((part) =>
      part
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter((part) => part.length > 0)
}

async function runStatement(statement: string): Promise<void> {
  const prisma = new PrismaClient()
  try {
    await prisma.$executeRawUnsafe(statement)
  } finally {
    await prisma.$disconnect()
  }
}

async function main(): Promise<void> {
  const sql = readFileSync(resolve(__dirname, '../prisma/init.sql'), 'utf8')
  const statements = parseStatements(sql)

  let applied = 0
  for (const statement of statements) {
    const preview = statement.slice(0, 70).replace(/\s+/g, ' ')
    try {
      await runStatement(statement)
      applied += 1
      console.log('OK:', preview)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('already exists')) {
        console.log('SKIP:', preview)
        continue
      }
      console.error('FAIL:', preview, message)
      throw err
    }
  }
  console.log(`Done (${applied} applied, ${statements.length} total)`)
}

void main().catch((err: Error) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
