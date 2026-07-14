import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('server/.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Testing Supabase Connection...')
console.log('URL:', supabaseUrl)
console.log('Key type:', supabaseKey ? (supabaseKey.startsWith('sb_publishable') ? 'Publishable (Anon) Key' : 'Service Role or custom JWT') : 'MISSING')

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from server/.env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runDiagnostics() {
  console.log('\n--- 1. Testing processed_ops table read ---')
  const { data: selectData, error: selectError } = await supabase
    .from('processed_ops')
    .select('*')
    .limit(1)

  if (selectError) {
    console.error('❌ Select Error:', selectError.message)
    console.error('Details:', selectError.details || 'None')
    console.error('Hint:', selectError.hint || 'None')
  } else {
    console.log('✅ Select Success! Current items count:', selectData.length)
  }

  console.log('\n--- 2. Testing processed_ops table write ---')
  const testOpId = 'diag-' + Math.random().toString(36).substr(2, 9)
  const { error: insertError } = await supabase
    .from('processed_ops')
    .insert({ op_id: testOpId })

  if (insertError) {
    console.error('❌ Insert Error:', insertError.message)
    console.error('Details:', insertError.details || 'None')
    console.error('Hint:', insertError.hint || 'None')
  } else {
    console.log('✅ Insert Success! Wrote test op:', testOpId)
    // Clean up
    await supabase.from('processed_ops').delete().eq('op_id', testOpId)
  }
}

runDiagnostics()
