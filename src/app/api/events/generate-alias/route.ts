import { NextResponse } from 'next/server'
import { createSimpleClient } from '@/lib/supabase/server'

/**
 * Generates a random 5-character alphanumeric string (uppercase)
 */
function generateRandomAlias(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generates a unique alias for an event
 * Checks the database to ensure uniqueness
 */
async function generateUniqueAlias(): Promise<string> {
  const supabase = createSimpleClient()
  let alias: string
  let isUnique = false
  let attempts = 0
  const maxAttempts = 10

  while (!isUnique && attempts < maxAttempts) {
    alias = generateRandomAlias()

    const { error } = await supabase
      .from('events')
      .select('id')
      .eq('alias', alias)
      .single()

    if (error && error.code === 'PGRST116') {
      // No rows returned, alias is unique
      isUnique = true
    } else if (error) {
      console.error('Error checking alias uniqueness:', error)
      attempts++
    } else {
      // Alias exists, try again
      attempts++
    }
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique alias after maximum attempts')
  }

  return alias!
}

export async function POST() {
  try {
    const alias = await generateUniqueAlias()
    return NextResponse.json({ alias })
  } catch (error) {
    console.error('Error generating alias:', error)
    return NextResponse.json(
      { error: 'Failed to generate alias' },
      { status: 500 }
    )
  }
} 